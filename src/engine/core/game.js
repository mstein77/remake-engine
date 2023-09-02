import { STATE, RENDERER_STATE, FILTER } from "core/const"
import { Config } from "core/config"
import { clamp, ucfirst, toKeys, toPairs, d, without, getCanvasObjForDim } from "helper/helper"
import { setStyleConstByKey, getCssPxValue } from "helper/css"
import { getResourcesAndCallback, ResourceResolver } from "./resources"
import { div } from "helper/dom"
import { ResourceRequest } from "core/classes"
import { Model, ModelFactory, SubModelFactory } from "./model"
import { validated } from "helper/validate"
import { ScreenRegistry } from "./screen"
import { BlendTransition, FadeInOutTransition, LoadingTransition, PushInTransition, TransitionRegistry } from "./transition"
import { BrowserStorageHandler, StorageManager } from "./storage"
import inst from "core/instances"

class Game {

    /**
     * Instantiates a new game instance (or throws an error if there is already a running instance) with the given
     * config
     *
     * @param {object|GameConfig} input
     * @param {function|undefined} initHandler
     */
    constructor(input, initHandler) {

        this.currState = STATE.CONSTRUCT

        inst.setGame(this)
        this.game = this
        const { system, renderPlugin, touchControlsPlugin, plugins } = inst
        this.system = system

        const SM = new StorageManager(BrowserStorageHandler(localStorage), (IS_DIST ? '' : 'dev.') + GAME_ID)
        inst.setRL(BASE_URL + '/', SM, new StorageManager(BrowserStorageHandler(sessionStorage)), ResourceResolver)
        this.engineStorage = new StorageManager(BrowserStorageHandler(localStorage), 'remake-engine.')

        // TODO get from plugin-registry
        this.plugins = plugins;
        for(const plugin of plugins) plugin.link(this, system)

        this.renderPlugin = renderPlugin
        this.touchControlsPlugin = touchControlsPlugin

        // overwrite body with essential parent div containers
        document.body.classList.toggle('no-touch-actions', true)
        document.body.replaceChildren(
            div({id: 'game-div', class: 'full-v'}),
            div({id: 'game-overlay-div', class: 'full-v full-h pos-0 fixed no-events'})
        )

        // registration (only construct)
        this.input = input
        this.keysDown = {}
        this.keys = {}
        this.gamepads = []
        this.modals = []
        this.listeners = []
        this.domLoaded = false
        this.deactivateAutoZoom = false
        this.audio = new AudioPlayer()
        this.fpsTracker = new FpsTracker()

        this.cssConstants = {
            ...this.renderPlugin.getCssConstantsValues()
        }
        const style = document.body.style;
        for (let [ key, value ] of Object.entries(this.cssConstants)) {
            setStyleConstByKey(style, key, value)
        }
        this.registerListeners([
            {
                type: 'visibilitychange',
                handler: () => {
                    if (document.hidden) {
                        this.before.running = this.running
                        if (!this.running) return
                        this.running = false
                        return
                    }
                    this.running = this.before.running === undefined || this.before.running
                }
            },
            {
                type: 'keydown',
                handler: e => {
                    const { key } = e
                    if (this.tempKeyActions) {
                        if (Object.keys(this.tempKeyActions).includes(key)) {
                            if (this.tempKeyActions[key](e)) return
                        }
                    }
                    if (this.keyActions) {
                        if (Object.keys(this.keyActions).includes(key)) {
                            if (this.keyActions[key](e)) return
                        }
                    }
                    if (key === EDITOR_KEY && this.hasEditor) {
                        e.preventDefault()
                        this.openEditorMode()
                        return
                    }
                    this.keysDown[key] = key
                }
            },
            {
                type: 'keyup',
                handler: e => {
                    const { key } = e
                    if (key in this.keysDown) {
                        delete this.keysDown[key]
                        this.keys[key] = key
                    }
                }
            },
            {
                type: 'gamepadconnected',
                elem: window,
                handler: e => {
                    this.gamepads.push({
                        index: e.gamepad.index,
                        pressed: []
                    })
                }
            }
        ])
        if (system.supportsFullscreen) {
            this.registerListener({
                type: system.fullscreenChangeEvent,
                handler: () => {
                    this.isFullscreen = system.isFullscreen()
                }
            })
        }
        if (system.supportsOrientation) {
            this.registerListener({
                elem: system.orientationEventElem,
                type: system.orientationChangeEvent,
                handler: () => {
                    this.syncOrientation()
                }
            })
        }
        if (system.supportsTouch) {
            document.body.append(
                div({id: 'touch-div', class: 'transparent full-v full-h pos-0 fixed no-events'})
            )
        }
        for(const plugin of this.plugins) plugin.registerListeners()

        // TODO register listeners from plugins
        this.addListeners()
        document.body.append(
            div({id: 'modals-div', class: 'transparent full-v full-h pos-0 fixed'}),
            div({id: 'offscreen-div', class: 'hidden'}),
            div({id: 'editor-div', class: 'full-v hidden'})
        )

        if (!initHandler) return

        this.setInitHandler(initHandler)
        this.init()
    }

    /**
     * Initializes a (re-)start of the game
     */
    init() {
        this.setState(STATE.INIT);

        this.warnings = []
        this.elems = {}
        this.props = {}
        this.domQueue = []
        this.viewportBounds = null
        this.globalsResolver = null
        this.trackFps = true
        this.tempKeyActions = null
        this.keyActions = null
        this.running = false
        this.before = {}
        this.globals = getNewStateObj()
        this.skipTransition = true
        this.paneTreeRenderers = {
            screen: null,
            transition: null,
            temp: null
        }
        this.currRendererType = null
        this.activeTransition = null
        this.cancelRequestId = null
        this.nextGoto = null
        this.lastGoto = null
        this.controlsActive = false
        this.controlsIndex = 0
        this.preview = false

        inst.RL.clear()
        inst.autoIds.clearAllIds()

        this.hideElem('game-overlay-div', 'modals-div')

        if (!this.initHandler) return

        if (this.domLoaded) {
            // wait for the next frame in case of a reset
            requestAnimationFrame(() => this.connectAndBoot())
            return
        }
        document.addEventListener(
            'DOMContentLoaded',
            () => {
                this.domLoaded = true
                this.connectAndBoot()
            },
            {once: true}
        )
    }

    applyConfig() {
        const config = this.gameProps.config
        this.gameProps.applyTo(this.props)

        this.fixOrientation = null
        const system = this.system
        if (system.isMobile) {
            this.gameProps.mobile.applyTo(this.props)

            if (system.supportsOrientation) {
                if (props.screenOrientation === 'max') {
                    this.fixOrientation = this.width >= this.height ? 'landscape' : 'portrait'
                } else if (props.screenOrientation !== 'free') {
                    this.fixOrientation = props.screenOrientation
                }
            }
        }
        this.props.audioBlocked = false
        this.props.maxAvailZoom = this.maxZoom
        this.props.isFullscreen = this.system.isFullscreen()
        Config.storeInModel = this.hasEditor

        this.syncOrientation()
        this.deactivateAutoZoom = true
        this.trackFps = this.showFpsByUser || this.showFps
        const skipChecks = {
            autoZoom: this.autoZoomByUser,
            stepZoom: this.stepZoomByUser,
            showFps: this.showFpsByUser
        }
        // overwrite with persisted values
        for (let [ prop, type ] of Object.entries(persistedProps2type)) {
            if (prop in skipChecks && !skipChecks[prop]) continue
            let value = this.engineStorage.getJson(prop)
            if (value === undefined || value === null) continue
            if (prop === 'muted') {
                this.audio.setMuted(value)
            } else if (prop === 'masterVolume') {
                this.audio.setMasterVolume(value)
            } else {
                try {
                    let mismatch = false
                    switch(type) {

                        case 'bool':
                            mismatch = typeof value !== 'boolean'
                            break

                        case 'float':
                            mismatch = typeof value !== 'number'
                            break
                    }
                    if (mismatch)
                        throw Error(`Persisted value for ${prop} expected to be type of ${type} but got ${typeof value}`)

                    const validator = 'getValidated' + ucfirst(prop);
                    if (config[validator]) value = config[validator](value)
                } catch (e) {
                    console.log(e)
                    this.addWarning(`There was a problem with the persisted value for "${prop}", falling back to default value`)
                    const defaults = config.getDefaults();
                    value = defaults[prop]
                    this.engineStorage.deleteJson(prop)
                }
                this.props[prop] = value
            }
        }
    }

    /**
     * Tries to connect to the backend and boots the game if this was successful
     */
    connectAndBoot() {
        this.setState(STATE.CONNECT)

        // TODO remove timeout...
        setTimeout(() => {
            inst.RL.addJson('game', this.input)
            inst.RL.loadPermanentScope('game').then(
                () => {
                    try {
                        this.gameProps = GameProps(inst.RL.getJson('game'))
                        this.applyConfig()
                        this.boot()
                    } catch (e) {
                        console.error(e)
                        this.setState(STATE.PREBOOT_ERROR, {message: e.message, error: e})
                    }
                }
            )

        }, 1000)
    }

    /**
     * Boots and starts the game
     */
    boot() {
        this.setState(STATE.BOOT)
        this.log(`Booting game "${GAME_ID}"...`)
        // build game dom structure

        this.registerDefaultTransitions()
        const { game, globals } = this
        let startScreen = this.initHandler({ game, globals })

        try {
            this.notify('main')

            TransitionRegistry.lock()
            ScreenRegistry.lock()
            this.syncScreen()
            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(
                    entries => {
                        if (this.autoZoom || this.restrictZoomByWindow) this.syncScreen()
                    }
                )
                this.startObserver()
            }
            this.showElem('game-overlay-div')

            if (!startScreen) {
                // TODO add welcome screen
            }
            this.log(`...booting done!`)

            this.running = document.hidden !== true
            if (!this.running) {
                this.before.running = true
            }
            this.gotoScreen(startScreen)
            this.waitForNextFrame()
        } catch (e) {
            this.handleError(e)
        }
    }

    registerDefaultTransitions() {
        TransitionRegistry.clear()
        TransitionRegistry.addAll({
            'default': LoadingTransition,
            'blend': BlendTransition,
            'fade': FadeInOutTransition,
            'push-in': PushInTransition
        })
    }

    // game control

    /**
     * Resets the game
     */
    reset() {
        this.running = false
        const clearElemIds = ['screen-overlay-div', 'game-div', 'game-overlay-div'];
        if (this.system.supportsTouch) clearElemIds.push('touch-div')
        for (let id of clearElemIds) this.getMandatoryElem(id).replaceChildren()
        inst.RL.invalidatePermanentScope('globals')
        inst.RL.invalidatePermanentScope('game')
        this.init()
    }

    restart() {
        if (this.running || !this.hasEditor) {
            return;
        }
        if (this.hasEditor) this.hideElem('editor-div')
        this.showElem('game-overlay-div', 'game-div')
        this.running = this.before.running
        this.addListeners()
    }

    startPreview() {
        this.preview = true
        inst.RL.invalidatePermanentScope('globals')
        this.skipTransition = true
    }

    reloadScreen(stack) {
        if (this.globalsResolver) {
            inst.autoIds.clearAllIds()
            // TODO game?
            inst.RL.invalidatePermanentScope('globals')
            inst.RL.clearTemporary()
        }
        this.globals = this.lastGlobals
        this.skipTransition = true
        this.gotoScreen( ...this.lastGoto )
        if (stack) {
            this.switchToEditor(stack)
        } else {
            this.restart()
        }
    }

    switchToEditor(stack) {
    /*
        inst.RL.loadPermanentResources()
            .then(() => {

     */
                this.hideElem('game-div', 'game-overlay-div')
                this.showElem('editor-div')
                this.editor = new gameEditor.GameEditor(this, stack)
        /*
            })
            .catch(
                e => d('Error: ', e)
            );

         */
    }

    openEditorMode() {
        if (!this.hasEditor) {
            this.addWarning('NO GAME EDITOR found!')
            return
        }
        this.log('OPEN EDITOR MODE for Screen "' + this.getActiveScreenRenderer().scope + '"')

        this.before.running = this.running
        this.running = false
        this.removeListeners()
        this.switchToEditor()
    }

    openFullscreenMode() {
        this.system.requestFullscreen(document.body)
            .then(
                () => {
                    if (this.fixOrientation) {
                        return this.system.lockOrientation(this.fixOrientation)
                    }
                }
            ).catch(
            e => this.addWarning('Browser denied fullscreen mode with message: ' + e.message)
        )
    }

    exitFullscreenMode() {
        this.system.exitFullscreen(document).then(
            () => this.system.unlockOrientation()
        )
    }

    openModal(elem) {
        const modalsDiv = this.getMandatoryElem('modals-div')
        if (!modalsDiv.childElementCount) {
            this.removeListeners()
            this.showElem('modals-div')
        }
        modalsDiv.append(
            div({class: 'full-v full-h pos-0 fixed modal-overlay'}, elem)
        )
    }

    closeModal() {
        const elem = this.getMandatoryElem('modals-div')
        elem.lastElementChild.remove()
        if (!elem.childElementCount) {
            this.hideElem('modals-div')
            this.addListeners()
        }
    }

    addTouchDiv(elem) {
        this.getMandatoryElem('touch-div').append(elem)
    }

    syncOrientation() {
        if (this.fixOrientation === null) return

        const system = this.system
        const fixOrientation = system.getScreenOrientation().split('-')[0] !== this.fixOrientation
        const doFix = !(this.isFullscreen && system.supportsOrientationLock) && fixOrientation
        document.documentElement.classList.toggle('fix-orientation', doFix)
    }

    resolveGlobals() {
        if (inst.RL.hasPermanentScope('globals')) return Promise.resolve()

        const loaders = []
        const transLoader = TransitionRegistry.getLoader()
        if (!transLoader.isEmpty())
            loaders.push(transLoader)

        let responseHandler = () => {}
        if (this.globalsResolver) {
            const { loader, callback } = this.globalsResolver
            if (!loader.isEmpty()) {
                loaders.push(loader)
                responseHandler = () => {
                    const resources = inst.RL.resources
                    const { globals, game } = this
                    globals.unlock()
                    inst.autoIds.startContext('globals')
                    callback({ ...resources, globals, game })
                    inst.autoIds.endContext()
                    globals.lock()
                }
            }
        } else if (!loaders.length) return Promise.resolve()

        for (const loader of loaders) {
            loader.resolve()
        }
        return inst.RL.loadPermanentScope('globals').then(
            responseHandler
        )
    }

    // internal methods

    setState(state, props = {}) {
        this.log(`Setting state "${state2name[state]}" (${state})`)
        this.notify('state:' + state, { from: this.currState, ...props })
        this.currState = state
    }

    getMandatoryElem(id) {
        const elem = document.getElementById(id)
        if (elem) return elem
        throw Error(`Required dom element with id "${id}" not found!`)
    }

    hideElem( ...ids ) {
        for (const id of ids) this.getMandatoryElem(id).classList.toggle('hidden', true)
    }

    showElem( ...ids ) {
        for (const id of ids) this.getMandatoryElem(id).classList.toggle('hidden', false)
    }

    resetFps() {
        if (!this.trackFps) return

        const names = this.fpsTracker.reset()
        for (const name of names) {
            this.notify('change', {name, value: this.fpsTracker[name]})
        }
    }

    notify(action, props) {
        for (const plugin of this.plugins) {
            const changes = plugin.notify(action, props)
            if (changes) this.processPluginChanges(plugin, action, changes)
        }
    }

    processPluginChanges(plugin, action, changes) {
        if (!Array.isArray(changes)) changes = [changes]

        for (const { id, nodes, html, nextFrame, subId } of changes) {
            if (!(nodes || html)) continue;

            const elem = this.getMandatoryElem(id);
            if (subId) {
                let found = false
                for (const child of elem.children) {
                    if (child.id !== subId) continue
                    child.replaceWith(nodes)
                    found = true
                }
                if (!found) elem.append(nodes)
            } else {
                if (nodes) {
                    while (elem.firstChild) {
                        elem.firstChild.remove();
                    }
                    elem.append(nodes)
                } else {
                    elem.innerHTML = html
                }
            }
            if (nextFrame) requestAnimationFrame(nextFrame)
        }
        plugin.processedChanges(action)
    }

    syncScreen() {
        let calcZoom = this.zoom
        const { width, height } = this.getAvailableViewport()
        const availZoom =
            clamp(
                this.minZoom,
                Math.min(
                    this.stepZoom ? Math.floor(width / this.width) : width / this.width,
                    this.stepZoom ? Math.floor(height / this.height) : height / this.height
                ),
                this.maxZoom
            )
        if (this.autoZoom) {
            calcZoom = availZoom
        } else if (this.stepZoom) {
            calcZoom = Math.round(calcZoom)
        }
        this.maxAvailZoom = this.restrictZoomByWindow ? availZoom : this.maxZoom
        calcZoom = clamp(this.minZoom, calcZoom, this.maxAvailZoom)

        if (calcZoom !== this.zoom) {
            this.deactivateAutoZoom = false
            this.zoom = calcZoom
            this.deactivateAutoZoom = true
            return
        }
        this.screenOverlaysDiv.style.transform =  'scale(' + calcZoom +')'
        const style = this.screenDiv.style
        style.width = '' + (this.width * calcZoom) + 'px'
        style.height = '' + (this.height * calcZoom) + 'px'
    }

    persistProp(name, value, notify = false) {
        this.engineStorage.storeJson(name, value)
        if (notify) this.notify('change', {name, value})
    }

    getAvailableViewport() {
        if (!this.viewportBounds) {
            const gameDiv = this.getMandatoryElem('game-div')
            let elem = this.getMandatoryElem('screen-div')
            while (!elem.classList.contains('screen-bounds') && elem !== gameDiv) {
                elem = elem.parentNode
            }
            const style = window.getComputedStyle(elem)
            const paddings = []
            for (const dir of ['Left', 'Right', 'Top', 'Bottom']) {
                paddings.push(getCssPxValue(style['padding' + dir], 0))
            }
            const [ left, right, top, bottom ] = paddings
            const paddingH = left + right
            const paddingV = top + bottom

            this.viewportBounds = {
                elem,
                paddingH,
                paddingV
            }
        }
        const { width, height } = this.viewportBounds.elem.getBoundingClientRect()
        const fix = document.documentElement.classList.contains('fix-orientation')
        return {
            width: (fix ? height : width) - this.viewportBounds.paddingH,
            height: (fix ? width: height) - this.viewportBounds.paddingV
        }
    }

    getEditableResources() {
        const resources = [];

        const extractConfigureablesFromArea = areas => {
            if (!Array.isArray(areas)) return

            for (let area of areas) {
                const panes = area.panes
                if (panes) {
                    for (let pane of panes) {
                        resources.push(pane.getEditorResources())
                    }
                }
                extractConfigureablesFromArea(Array.isArray(area) ? area : area.areas)
            }
        }
        const renderer = this.getActiveScreenRenderer()
        extractConfigureablesFromArea(renderer.paneTree.areas)

        resources.push({type: 'filters', data: filterer})
        return resources;
    }

    getActiveScreenRenderer() {
        const renderer = this.paneTreeRenderers.temp
        return renderer && renderer.isBuild() ? renderer : this.paneTreeRenderers.screen
    }

    getCurrentPaneTree() {
        if (this.paneTreeRenderers['screen'] !== null)
            return this.paneTreeRenderers['screen'].paneTree

        if (this.paneTreeRenderers['temp'] !== null)
            return this.paneTreeRenderers['temp'].paneTree

        return null
    }

    updateDom() {
        while (this.domQueue.length > 0) {
            const next = this.domQueue.shift()
            switch(next.op) {

                case 'set':
                    const parts = next.key.split('.')
                    let elem = next.elem
                    while (parts.length > 1) {
                        elem = elem[parts.shift()]
                    }
                    elem[parts[0]] = next.value
                    break

                case 'add':
                    next.target.appendChild(next.child)
                    break

                case 'clear':
                    next.elem.replaceChildren()
                    break
            }
        }
    }

    addDomOp(elem, key, value) {
        this.domQueue.push({op: 'set', elem, key, value})
    }

    clearDomOp(elem) {
        this.domQueue.push({op: 'clear', elem})
    }

    addDomChild(target, child) {
        this.domQueue.push({op: 'add', target, child})
    }

    endActiveTransition() {
        this.activeTransition = null
    }

    updateGamepads() {
        if (!this.gamepads.length) return

        const buttonPressed = {}
        const gamepads = navigator.getGamepads()
        for (let gamepad of gamepads) {
            if (gamepad === null) continue

            const pressed = []
            let i = 0
            for (let button of gamepad.buttons) {
                if (button.pressed) {
                    pressed.push(i)
                }
                i++
            }
            buttonPressed[gamepad.index] = pressed
        }
        for (let gamepad of this.gamepads) {
            gamepad.pressed =
                buttonPressed[gamepad.index] !== undefined ? buttonPressed[gamepad.index] : []
        }
    }

    updateRendererFrames(renderers) {
        this.updateDom()
        if (!renderers.length) return

        this.keys = {}
        if (this.running) {
            if (this.showFps) {
                const changed = this.fpsTracker.track()
                for (const name of changed) {
                    this.notify('change', {name, value: this.fpsTracker[name]})
                }
            }
            for (const { renderer, type } of renderers) {
                this.currRendererType = type
                renderer.render()
            }
            for (const { renderer, type } of renderers) {
                this.currRendererType = type
                if (this.controlsIndex === controlsOrder.indexOf(type)) this.controlsActive = true
                renderer.handleNextFrame()
                this.controlsActive = false
            }
            this.currRendererType = null
        }
        this.updateGamepads()
    }

    resetOverlayAttributes(elem) {
        elem.className = ''
        elem.style = this.getDimAttributes() + 'position: absolute; background-color: transparent'
    }

    getRendererElem(type) {
        switch (type) {
            case 'screen':
                return false && this.preview ? 'preview-overlay-div' : this.screenOverlayDiv

            case 'trans':
                return this.transOverlayDiv

            case 'temp':
                return this.tempOverlayDiv
        }
        throw Error(`Unknown renderer type "${type}" given`)
    }

    setRenderer(type, renderer) {
        const currRenderer = this.paneTreeRenderers[type]
        this.paneTreeRenderers[type] = renderer
        const elem = this.getRendererElem(type)
        if (renderer) {
            renderer.setElem(elem)
            return
        }
        // delete element
        this.resetOverlayAttributes(elem)
        switch (type) {

            case 'trans':
                this.endActiveTransition()
                currRenderer.clear()
                this.setRenderer('temp', null)
                break

            case 'temp':
                const screenRenderer = this.paneTreeRenderers['screen']
                const toParent = this.getRendererElem('screen')
                toParent.replaceChildren()
                while (elem.childNodes.length)
                    toParent.appendChild(elem.childNodes[0])
                this.resetOverlayAttributes(toParent)
                toParent.style.display = 'block'
                if (screenRenderer) screenRenderer.triggerEnd()
                this.setRenderer('screen', currRenderer)
                this.controlsIndex = 0
                break
        }
        elem.style.display = 'none'
    }

    waitForNextFrame() {
        try {
            if (this.nextGoto && !this.activeTransition) {
                const params = this.nextGoto
                this.nextGoto = null
                this.doGotoScreen( ...params )
            }
            const updateRenderers = []
            for (const [ type, renderer ] of toPairs(this.paneTreeRenderers)) {

                if (!renderer) continue

                let doRender = false
                switch (renderer.state) {

                    case RENDERER_STATE.WAIT_LOADING:
                        renderer.loadResources(
                            renderer.loader ? this.resolveGlobals() : Promise.resolve()
                        )
                        break

                    case RENDERER_STATE.WAIT_BUILD:
                        this.currRendererType = type
                        renderer.buildTree(this.width, this.height)
                        this.currRendererType = null
                        this.tempKeyActions = null // TODO check
                        break

                    case RENDERER_STATE.WAIT_DESTROY:
                        renderer.triggerEnd()
                        this.setRenderer(type, null)
                        break

                    case RENDERER_STATE.WAIT_HANDLING:
                        this.frames = 0
                        renderer.startHandling()

                    case RENDERER_STATE.HANDLING:
                        doRender = true
                        break;
                }
                if (doRender) updateRenderers.push({type, renderer})
            }

            if (this.cancelRequestId) cancelAnimationFrame(this.cancelRequestId)

            this.cancelRequestId = requestAnimationFrame(() => {
                this.cancelRequestId = null
                this.updateRendererFrames(updateRenderers)
                this.waitForNextFrame()
            })

        } catch (e) {
            this.handleError(e)
            throw e
        }
    }

    gotoScreen(screenId, params = {}, transId = 'default') {
        if (this.preview) {
            this.skipTransition = true
            this.nextGoto = [ ...this.lastGoto ]
            return
        }

        if (this.activeTransition || this.nextGoto) return
        this.nextGoto = [ screenId, params, transId ]
    }

    doGotoScreen(screenId, params, transId) {
        const screen = ScreenRegistry.get(screenId)
        if (!screen)
            throw Error(`Unknown screen id "${screenId}" given in gotoScreen!`)

        if (!this.preview) {
            this.lastGoto = [ screenId, params, transId ]
        } else {
            inst.RL.invalidatePermanentScope('globals')
            // this.globals = this.lastGlobals
        }

        const screenRenderer = screen.getPaneTreeRenderer(screenId)
        screenRenderer.setPrepareBuildCallback(
            () => {
                if (this.preview) {
                    this.globals = this.lastGlobals.getClone()
                }
                this.globals = Object.assign(this.globals, params)
                if (!this.preview) {
                    this.lastGlobals = this.hasEditor ? this.globals.getClone() : null
                }
                inst.autoIds.clearScreenIds()
                this.resetFps()
            }
        )
        let transObj = null
        if (transId !== null) {
            transObj = TransitionRegistry.get(transId)
        }
        if (this.skipTransition || transObj === null || transObj.transition === null) {
            this.setRenderer('screen', screenRenderer)
            screenRenderer.forwardTo(RENDERER_STATE.HANDLING)
            this.skipTransition = false
            this.log(`Goto screen "${screenId}"`)
            return
        }

        // transition
        const { transition, id, options } = transObj
        this.setRenderer('temp', screenRenderer)
        const transRenderer = transition.getPaneTreeRenderer(this.paneTreeRenderers['screen'], screenRenderer, options)
        this.setRenderer('trans', transRenderer)
        transRenderer.forwardTo(RENDERER_STATE.HANDLING)
        this.activeTransition = screenId
        this.log(`Goto screen "${screenId}" with transition "${id}"`)

        // if (screenId === 'mario') this.preview = true
    }

    // public methods

    /**
     * Sets the given initHandler and triggers an initialization when the autoInit-flag was set
     *
     * @param {function} initHandler
     * @param {bool} autoInit
     */
    setInitHandler(initHandler, autoInit = false) {
        if (!initHandler) return
        this.initHandler = initHandler
        if (autoInit) this.init()
    }

    /**
     *
     * @param resourcesAndCallback
     */
    setGlobalsResolver( ...resourcesAndCallback ) {
        const { callback, resources } = getResourcesAndCallback( ...resourcesAndCallback )

        if (!callback) return

        const loader = new ResourceRequest(resources)
        this.globalsResolver = { loader, callback }
    }

    addScreen(id, screen) {
        ScreenRegistry.set(id, screen)
    }

    addKeyDownAction(key, handler) {
        if (!this.keyActions) this.keyActions = {}
        this.keyActions[key] = handler
    }

    addTempKeyDownAction(key, handler) {
        if (!this.tempKeyActions) this.tempKeyActions = {}
        this.tempKeyActions[key] = handler
    }

    /**
     *
     *
     * @param elem
     * @param type
     * @param handler
     * @param options
     */
    registerListener({ elem = document, type, handler, options = false }) {
        this.listeners.push({
            elem,
            type,
            handler: ( ...args ) => {
                try {
                    handler( ...args )
                } catch (e) {
                    e.message = `Event handler "${type}": ${e.message}`
                    this.handleError(e)
                }
            },
            options
        })
    }

    registerListeners(listeners) {
        for (let listener of listeners) {
            this.registerListener(listener)
        }
    }

    startObserver() {
        if (!this.resizeObserver) return

        const elem = document.getElementsByClassName('screen-bounds').item(0);
        this.resizeObserver.observe(
            elem ? elem : document.body
        )
    }

    addListeners() {
        this.startObserver()
        for (let { elem, type, handler, options } of this.listeners) {
            elem.addEventListener(type, handler, options)
        }
    }

    removeListeners() {
        this.resizeObserver.disconnect()
        for (let { elem, type, handler, options } of this.listeners) {
            elem.removeEventListener(type, handler, options)
        }
    }

    getGamepadPressed(no) {
        if (no >= this.gamepads.length) return []

        return this.gamepads[no].pressed;
    }

    log(msg) {
        console.log(msg);
    }

    indexOfWarning(value) {
        let index = 0
        for (const { msg } of this.warnings) {
            if (msg === value) return index
            index++
        }
        return -1
    }

    addWarning(msgOrObject) {
        if (typeof msgOrObject === 'string') {
            msgOrObject = {msg: msgOrObject}
        }
        if (this.indexOfWarning(msgOrObject.msg) !== -1) return
        this.warnings.push(msgOrObject)
        this.notify('change', {name: 'warnings', value: this.warnings})
    }

    clearWarnings(msg = null) {
        if (!this.warnings.length) return
        if (msg) {
            const index = this.indexOfWarning(msg)
            if (index === -1) return
            this.warnings.splice(index, 1)
        } else {
            this.warnings = []
        }
        this.notify('change', {name: 'warnings', value: this.warnings})
    }

    handleError(err) {
        this.notify('error', err)
    }

    getCurrEvents() {
        if (!this.currRendererType)
            throw Error(`No renderer currently active`)

        const renderer = this.paneTreeRenderers[this.currRendererType]
        if (!renderer) return {}
        return renderer.events
    }

    addFrameEvent(type, event) {
        const frameEvents = this.getCurrEvents()
        if (frameEvents[type] === undefined) {
            frameEvents[type] = [];
        }
        frameEvents[type].push(event);
    }

    getEvents(type) {
        const frameEvents = this.getCurrEvents()
        if (!frameEvents[type]) {
            return [];
        }
        const events = frameEvents[type];
        delete frameEvents[type];
        return events;
    }

    getNextEvent(type) {
        const frameEvents = this.getCurrEvents()
        const events = frameEvents[type];
        if (events === undefined) {
            return null;
        }
        const event = events.shift();
        if (events.length === 0) {
            delete frameEvents[type];
        }
        return event;
    }

    requestControlsForRenderer(renderer) {
        for (const [ type, typeRenderer ] of toPairs(this.paneTreeRenderers)) {
            if (renderer !== typeRenderer) continue
            const index = controlsOrder.indexOf(type)
            if (this.controlsIndex < index) {
                this.controlsIndex = index
                return true
            } else {
                return false
            }
        }
        return false
    }

    // check flags

    get hasEditor() {
        return window.gameEditor !== undefined && !this.system.isMobile
    }

    supportsTouch() {
        return 'ontouchstart' in document.documentElement
    }

    // --------------------------------------------
    //  Props
    // --------------------------------------------

    get id() {
        return GAME_ID
    }

    get currentScreen() {
        return this.getActiveScreenRenderer().scope
    }

    get running() {
        return this.props.running
    }

    set running(value) {
        if (value === this.running) return

        this.props.running = value
        if (value) {
            this.keys = {}
            this.keysDown = {}
            this.audio.continueAll()
            const msg = 'Warning! The current screen is using resources from the local storage!'
            if (inst.RL.hasBrowserResources()) {
                this.addWarning({
                    msg,
                    actions: [
                        {
                            action: 'Clear local storage',
                            click: () => {
                                this.getResourceLoader().clearBrowserResources()
                                if (!inst.RL.hasBrowserResources()) this.clearWarnings(msg)
                                this.reloadScreen()
                            }
                        }
                    ]
                })
            } else this.clearWarnings(msg)
        } else {
            this.resetFps()
            this.audio.pauseAll()
        }
        this.notify('change', {name: 'running', value})
    }

    get masterVolume() {
        return this.audio.masterVolume
    }

    set masterVolume(value) {
        value = clamp(0, value, 100)
        if (this.masterVolume === value) return

        this.audio.setMasterVolume(value);
        this.persistProp('masterVolume', value, true)
        this.muted = false
    }

    get muted() {
        return this.audio.muted
    }

    set muted(value) {
        if (this.audio.muted === value) return

        this.audio.setMuted(value)
        if (value && this.audioBlocked) {
            this.audio.pauseAll()
            this.audio.continueAll()
        }
        this.persistProp('muted', value, true)
    }

    get zoom() {
        return this.props.zoom
    }

    set zoom(value) {
        value = clamp(this.minZoom, value, this.maxZoom)
        if (value === this.zoom) return

        if (this.deactivateAutoZoom && this.autoZoomByUser) this.autoZoom = false

        this.props.zoom = value
        this.syncScreen()
        this.persistProp('zoom', value, true)
        this.resetFps()
    }

    get minZoom() {
        return this.props.minZoom
    }

    set minZoom(value) {
        if (value === this.minZoom) return
        this.props.minZoom = value
        this.notfiy('change', {name: 'minZoom', value})
    }

    get maxZoom() {
        return this.props.maxZoom
    }

    set maxZoom(value) {
        if (value === this.maxZoom) return
        this.props.maxZoom = value
        this.notify('change', {name: 'maxZoom', value})
    }

    get restrictZoomByWindow() {
        return this.props.restrictZoomByWindow
    }

    get maxAvailZoom() {
        return this.props.maxAvailZoom
    }

    set maxAvailZoom(value) {
        if (value === this.maxAvailZoom) return
        this.props.maxAvailZoom = value
        this.notify('change', {name: 'maxAvailZoom', value})
    }

    get stepZoom() {
        return this.props.stepZoom
    }

    set stepZoom(value) {
        if (value === this.stepZoom) return
        this.props.stepZoom = value
        this.syncScreen()
        this.persistProp('stepZoom', value, true)
    }

    get stepZoomByUser() {
        return this.props.stepZoomByUser
    }

    get autoZoom() {
        return this.props.autoZoom
    }

    set autoZoom(value) {
        if (value === this.autoZoom) return
        this.props.autoZoom = value
        this.syncScreen()
        this.persistProp('autoZoom', value, true)
    }

    get autoZoomByUser() {
        return this.props.autoZoomByUser
    }

    get pixelated() {
        return this.props.pixelated
    }

    get width() {
        return this.props.width
    }

    set width(value) {
        value = clamp(1, value, 1000)

        if (this.width === value) return
        this.props.width = value
    }

    get height() {
        return this.props.height
    }

    set height(value) {
        value = clamp(1, value, 1000)

        if (this.height === value) return
        this.props.height = value
    }

    get fps() {
        return this.fpsTracker.fps
    }

    get minFps() {
        return this.fpsTracker.minFps
    }

    get maxFps() {
        return this.fpsTracker.maxFps
    }

    get avgFps() {
        return this.fpsTracker.avgFps
    }

    get fpsHistory() {
        return this.fpsTracker.history
    }

    get showFps() {
        return this.props.showFps
    }

    set showFps(value) {
        if (value === this.showFps) return

        this.props.showFps = value
        this.persistProp('showFps', value, true)

        this.resetFps()
    }

    get showFpsByUser() {
        return this.props.showFpsByUser
    }

    get isFullscreen() {
        return this.props.isFullscreen
    }

    set isFullscreen(value) {
        if (value === this.isFullscreen) return

        this.props.isFullscreen = value
        this.notify('change', {name: 'isFullscreen', value})
    }

    getDimAttributes(zoomed = false) {
        const zoom = zoomed ? this.zoom : 1
        return "width: " + (this.width * zoom) + 'px; height: ' + (this.height * zoom) + 'px;'
    }

    get screenDiv() {
        if (!this.elems.screenDiv) {
            this.elems.screenDiv = div(
                {
                    id: "screen-div",
                    style: this.getDimAttributes(true)
                },
                this.screenOverlaysDiv
            )
        }
        return this.elems.screenDiv
    }

    get screenOverlaysDiv() {
        if(!this.elems.screenOverlaysDiv) {
            this.elems.screenOverlaysDiv = div(
                {
                    id: 'screen-overlays-div',
                    style: this.getDimAttributes() + "position: relative"
                },
                this.screenOverlayDiv,
                this.tempOverlayDiv,
                this.transOverlayDiv
            )
        }
        return this.elems.screenOverlaysDiv
    }

    get transOverlayDiv() {
        if (!this.elems.transOverlayDiv) {
            this.elems.transOverlayDiv = div(
                {
                    id: "trans-overlay-div",
                    style: this.getDimAttributes() + "background-color: transparent; position: absolute"
                }
            )
        }
        return this.elems.transOverlayDiv
    }

    get tempOverlayDiv() {
        if (!this.elems.tempOverlayDiv) {
            this.elems.tempOverlayDiv = div(
                {
                    id: "temp-overlay-div",
                    style: this.getDimAttributes() + "background-color: transparent; position: absolute"
                }
            )
        }
        return this.elems.tempOverlayDiv
    }

    get screenOverlayDiv() {
        if (!this.elems.screenOverlayDiv) {
            this.elems.screenOverlayDiv = div(
                {
                    id: "screen-overlay-div",
                    style: this.getDimAttributes() + "background-color: transparent; position: absolute"
                }
            )
        }
        return this.elems.screenOverlayDiv
    }

    get audioBlocked() {
        return this.props.audioBlocked
    }

    set audioBlocked(value) {
        if (value === this.audioBlocked) return

        this.props.audioBlocked = value
        const msg = 'Audio playback is blocked by your browser. Click here to retry:'
        if (value) {
            this.addWarning(
                {
                    msg,
                    actions: [{
                        action: 'Unblock',
                        click: () => {
                            this.audio.pauseAll()
                            this.audio.continueAll()
                        }
                    }]
                }
            )
        } else {
            this.clearWarnings(msg)
        }
    }

    get touchInputs() {
        if (!this.touchControlsPlugin) return []
        return this.touchControlsPlugin.inputs
    }
    // TODO make real getters

    getResourceLoader() {
        return inst.RL;
    }
}

class GamePropsInst extends Model {

    getDependentModels() {
        return [ this.mobile ]
    }

    applyTo(obj) {
        const keys = without(toKeys(this.config.getDefaults()), ['id', 'mobile'])
        for (const key of keys) {
            if (this[key] !== undefined) obj[key] = this[key]
        }
    }

    addRebuildProps(obj, deep) {
        obj.mobile = this.getRebuildModel(this.mobile, deep)
        obj.width = this.width
        obj.height = this.height
        obj.zoom = this.zoom
        obj.gpu = this.gpu
        obj.pixelated = this.pixelated
        obj.minZoom = this.minZoom
        obj.maxZoom = this.maxZoom
        obj.restrictZoomByWindow = this.restrictZoomByWindow
        obj.stepZoom = this.stepZoom
        obj.stepZoomByUser = this.stepZoomByUser
        obj.autoZoom = this.autoZoom
        obj.autoZoomByUser = this.autoZoomByUser
        obj.showFps = this.showFps
        obj.showFpsByUser = this.showFpsByUser
        obj.screenOrientation = this.screenOrientation
    }
}

/**
 * A config object for the game instance
 */
class GameConfig extends Config {

    getNewAutoId() {
        return 'game'
    }

    setId(value) {
        return this.getNewAutoId()
    }

    /**
     * Sets a fix width of the game in pixel
     *
     * @param {number} value An integer value for the width
     */
    setWidth(value) {
        this.width = validated.int(value, this.getFieldProp('dim'))
    }

    /**
     * Sets a fix height of the game in pixel
     *
     * @param {number} value An integer value for the height
     */
    setHeight(value) {
        this.height = validated.int(value, this.getFieldProp('dim'))
    }

    /**
     * Sets a zoom factor for the game
     *
     * @param {number} value A float value for the zoom factor
     */
    setZoom(value) {
        this.zoom = this.getValidatedZoom(value)
    }

    getValidatedZoom(value) {
        const zoom = validated.float(value, this.getFieldProp('zoom'))
        if (this.minZoom > zoom)
            throw Error(`Cannot set the value ${zoom} because it's smaller than the minZoom ${this.minZoom}`)

        if (this.maxZoom < zoom)
            throw Error(`Cannot set the value ${zoom} because it's bigger than the maxZoom ${this.maxZoom}`)

        return zoom
    }

    /**
     * Sets a zoom factor for the game
     *
     * @param {number} value A float value for the zoom factor
     */
    setMinZoom(value) {
        this.minZoom = validated.float(value, this.getFieldProp('zoom'))
    }

    /**
     * Sets a maximum zoom factor for the game
     *
     * @param {number} value A float value for the zoom factor
     */
    setMaxZoom(value) {
        const maxZoom = validated.float(value, this.getFieldProp('zoom'))
        if (this.minZoom > maxZoom)
            throw Error(`Cannot set the value ${maxZoom} because it's smaller than the minZoom of ${this.minZoom}`)

        this.maxZoom = maxZoom
    }

    /**
     * Sets whether the maximum available zoom should be dependent on the current window size or not
     *
     * @param {boolean} value
     */
    setRestrictZoomByWindow(value) {
        this.restrictZoomByWindow = validated.bool(value)
    }

    /**
     * Sets whether the zoom factor should be calculated automatically or not
     *
     * @param value
     */
    setAutoZoom(value) {
        this.autoZoom = validated.bool(value)
    }

    /**
     * Sets whether the user should be able to change the auto zoom or not
     *
     * @param {boolean} value
     */
    setAutoZoomByUser(value) {
        this.autoZoomByUser = validated.bool(value)
    }

    /**
     * Sets whether the zoom factor should be integer steps or not
     *
     * @param {boolean} value
     */
    setStepZoom(value) {
        this.stepZoom = validated.bool(value)
    }

    /**
     * Sets whether the user should be able to change the auto zoom or not
     *
     * @param {boolean} value
     */
    setStepZoomByUser(value) {
        this.stepZoomByUser = validated.bool(value)
    }

    /**
     * Indicates whether the Frame-Per-Second should be shown or not
     *
     * @param {boolean} value
     */
    setShowFps(value) {
        this.showFps = validated.bool(value)
    }

    /**
     * Sets whether the user should be able to have FPS controls or not
     *
     * @param value
     */
    setShowFpsByUser(value) {
        this.showFpsByUser = validated.bool(value)
    }

    setScreenOrientation(value) {
        this.screenOrientation = validated.string(value, this.getFieldProp('screenOrientation'))
    }

    setGpu(value) {
        this.gpu = validated.string(value, this.getFieldProp('gpu'))
    }

    setPixelated(value) {
        this.pixelated = validated.bool(value)
    }

    setMobile(value) {
        this.mobile = validated.config(MobileGameProps, value)
    }

    /**
     * @inheritDoc
     */
    getFieldProps() {
        return {
            dim: {min: 1, max: 9999},
            zoom: {min: 0, max: 10},
            screenOrientation: {values: ['free', 'max', 'landscape', 'portrait']},
            gpu: {values: ['prefer', 'required', 'ignore']}
        };
    }

    getJsonsToParse(json) {
        const { minZoom, maxZoom, ...props } = json
        return [
            { minZoom },
            { maxZoom },
            props
        ];
    }

    /**
     * @inheritDoc
     */
    getDefaults() {
        return {
            id: '',
            mobile: {},
            width: 320,
            height: 200,
            zoom: 2,
            gpu: 'prefer',
            pixelated: false,
            minZoom: 1,
            maxZoom: 5,
            restrictZoomByWindow: true,
            stepZoom: true,
            stepZoomByUser: true,
            autoZoom: false,
            autoZoomByUser: true,
            showFps: false,
            showFpsByUser: true,
            screenOrientation: 'free'
        }
    }

    /**
     * @inheritDoc
     */
    applyPropsTo(obj) {
        this.applyDefaultKeysTo(obj)
    }
}

const controlsOrder = ['screen', 'trans', 'temp']

const GameProps =
    ModelFactory(
        'Game',
        GameConfig
    )
    .addImplementation(GamePropsInst)


class MobileGamePropsInst extends Model {}

class MobileGameConfig extends GameConfig {

    getNewAutoId() {
        return 'mobile-id'
    }

    getDefaults() {
        return {
            id: '',
            zoom: 2,
            minZoom: 0,
            maxZoom: 5,
            restrictZoomByWindow: true,
            stepZoom: false,
            stepZoomByUser: false,
            autoZoom: true,
            autoZoomByUser: false,
            screenOrientation: 'max'
        }
    }

    /**
     * @inheritDoc
     */
    applyPropsTo(obj) {
        this.applyDefaultKeysTo(obj)
        if (this.showFps !== undefined) obj.showFps = this.showFps
        if (this.showFpsByUser !== undefined) obj.showFpsByUser = this.showFpsByUser
    }
}

const MobileGameProps =
    SubModelFactory(
    'MobileGame',
        MobileGameConfig
    )
    .addImplementation(MobileGamePropsInst)

class FpsTracker {

    constructor() {
        this.fpsSet = new Set()
        this.reset()
    }

    reset() {
        const { fps, minFps, maxFps, avgFps } = this

        this.frames = 0
        this.lastStart = null

        this.fps = null
        this.minFps = null
        this.maxFps = null
        this.avgFps = null
        this.fpsSet.clear()
        this.totalFrames = 0
        this.totalSeconds = 0
        this.history = []

        const changed = [];
        if (fps !== this.fps) changed.push('fps')
        if (minFps !== this.minFps) changed.push('minFps')
        if (maxFps !== this.maxFps) changed.push('maxFps')
        if (avgFps !== this.avgFps) changed.push('avgFps')

        return changed
    }

    track() {
        const now = performance.now()
        if (!this.lastStart) {
            this.lastStart = now
            this.frames++;
            this.history.length = 0
            return ['fpsHistory']
        }
        const time = now - this.lastStart;
        if (time >= 1000) {
            const currFps = this.frames
            const { fps, minFps, maxFps, avgFps } = this
            this.fps = currFps
            if (!this.fpsSet.has(currFps)) {
                this.fpsSet.add(currFps)
                const setItems = [ ...this.fpsSet.keys() ]
                this.minFps = setItems.length ? Math.min( ...setItems ) : null
                this.maxFps = setItems.length ? Math.max( ...setItems ) : null
            }
            this.totalFrames += currFps
            this.totalSeconds++
            this.avgFps = this.totalFrames / this.totalSeconds
            this.frames = 0
            this.lastStart = now
            const changed = []
            if (fps !== this.fps) changed.push('fps')
            if (minFps !== this.minFps) changed.push('minFps')
            if (maxFps !== this.maxFps) changed.push('maxFps')
            if (avgFps !== this.avgFps) changed.push('avgFps')
            if (fps !== null) {
                this.history.unshift(currFps)
                if (this.history.length > 30) this.history.pop()
                changed.push('fpsHistory')
            }
            return changed
        }
        this.frames++
        return []
    }
}

class AudioPlayer {

    constructor() {
        this.audio = {}
        this.channels = {}
        this.paused = []
        this.masterVolume = 100
        this.muted = false
    }

    addChannel(id) {
        this.channels[id] = null
    }

    addAudioResources(obj) {
        this.audio = Object.assign(this.audio, obj)
    }

    setMasterVolume(value) {
        this.masterVolume = value
        for (let audio of Object.values(this.audio)) {
            audio.updateVolume()
        }
    }

    play(id, channel = null) {
        this.paused = []
        const audio = this.audio[id];
        if (channel !== null) {
            if (this.channels[channel] !== undefined) {
                if (this.channels[channel] !== null && this.channels[channel].isPlaying()) {
                    this.channels[channel].reset();
                    this.channels[channel].pause();
                }
            }
            this.channels[channel] = audio;
        } else {
            if (audio.isPlaying()) {
                audio.reset();
            }
        }
        audio.volume = 1
        audio.setMuted(this.muted)
        audio.setLoop(false);
        audio.play().then(
            () => {
                if (inst.game.audioBlocked) {
                    inst.game.audioBlocked = false
                }
                audio.updateVolume()
            }
        ).catch(
            e => {
                inst.game.audioBlocked = true
            }
        )
        return audio;
    }

    loop(id, channel = null) {
        const audio = this.play(id, channel);
        audio.setLoop(true);
    }

    setMuted(value) {
        this.muted = value
        for (let id in this.audio) {
            this.audio[id].setMuted(this.muted)
        }
    }

    pause() {
        for (let id in this.audio) {
            this.audio[id].pause();
        }
    }

    isPlaying(id) {
        return this.audio[id].isPlaying();
    }

    continue() {
        // TODO we only want to restart what was paused
    }

    pauseAll() {
        this.paused = [];
        for (let id in this.channels) {
            if (this.channels[id] && this.channels[id].isPlaying()) {
                this.pauseChannel(id);
                this.paused.push(id);
            }
        }
    }

    continueAll() {
        for (let id of this.paused) {
            this.continueChannel(id);
        }
        this.paused = [];
    }

    pauseChannel(id) {
        const channel = this.channels[id];
        if (channel !== null && channel.isPlaying()) {
            channel.pause();
        }
    }

    continueChannel(id, speed = null) {
        const channel = this.channels[id];
        if (speed !== null && channel !== null) {
            channel.defaultPlaybackRate = speed;
        }
        if (channel !== null && !channel.isPlaying()) {
            channel.continue();
        }
    }

    reset() {
        this.resetChannels()
        this.audio = {}
    }

    resetChannel(id) {
        const channel = this.channels[id];
        if (channel !== null) {
            channel.reset();
            channel.pause();
            this.channels[id] = null
        }
    }

    resetChannels() {
        for (let id in this.channels) {
            this.resetChannel(id);
        }
    }

    pauseChannels() {
        for (let id in this.channels) {
            this.pauseChannel(id);
        }
    }
}

const persistedProps2type = {
    zoom: 'float',
    autoZoom: 'bool',
    stepZoom: 'bool',
    masterVolume: 'int',
    muted: 'bool',
    showFps: 'bool'
}

const state2name = [
    'construct', 'init', 'connect', 'preboot_error', 'boot', 'running', 'stopped', 'edit'
]

function getNewStateObj() {
    const globState = {
//        getClone: () => {}
    };
    const stateProxy = new Proxy(globState, new stateProxyHandler());
    stateProxy.self = stateProxy;
    return stateProxy;
}

/**
 * This handler allows to lock the target object, which prevents that configureable objects
 * (=objects wich store a config instance under the key "config") are stored somewhere in
 * the value of a key.
 *
 * Configureable objects would allow a JSON-Resource "id" in the constructor and thus require
 * an asynchronous request to the backend, if the Resource-Loader has not resolved the resource id yet.
 *
 * We cannot allow configureables in the loader-phase, only in the init-phase of a state-build.
 *
 *   globalsBuild: -> resourceRegistration => initialization
 *
 */
class stateProxyHandler {

    constructor() {
        this.lazyKeys = [];
        this.locked = false;
    }

    hasConfigureableValue(value) {
        if (value === null) {
            return false;
        }
        if (Array.isArray(value)) {
            for (let item of value) {
                if (this.hasConfigureableValue(item)) {
                    return true;
                }
            }
        } else if (typeof value === 'object') {
            if (value.config && value.config instanceof Config) {
                return true;
            }
            for (let subValue of Object.values(value)) {
                if (this.hasConfigureableValue(subValue)) {
                    return true;
                }
            }
        }
        return false;
    }

    defineProperty(target, key, descriptor) {
        if (this.locked && this.hasConfigureableValue(descriptor.value)) {
            throw new Error(`Tried to write a configureable object to the state object as key "${key}" !`);
        }
        if (this.locked && typeof descriptor.value === 'function') {
            throw new Error(`Tried to write a function to the state object as key "${key}" !`);
        } else {
            target[key] = descriptor.value;
        }

        return true;
    }

    get(target, prop, receiver) {
        if (prop === 'lock') {
            this.locked = true;
            return () => null
        } else if (prop === 'unlock') {
            this.locked = false;
            return () => null
        } else if (prop === 'getClone') {
            // TODO welchen Sinn haben die lazy keys, wenn diese nirgendwo gesetzt werden?
            // als lazy festgelegte keys werden nicht in den clone geschrieben
            const lazyKeys = Object.keys(this.lazyKeys);
            const keys = Object.keys(target).filter(key => !lazyKeys.includes(key));
            const clone = getNewStateObj();
            for (let key of keys) {
                clone[key] = target[key];
            }
            return () => clone;
        } else if (prop === 'dump') {
            d(target)
            return () => target
        }
        return Reflect.get(...arguments);
    }
}

// ####################################
//    Bitmap Filter
// ####################################

const filterer = inst.filterer

filterer.addFilter(
    'clear-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        if (params.pixels > 0) {
            newCanvas.ctx.clearRect(0, 0, data[3], params.pixels);
        } else if (params.pixels < 0) {
            params.pixels = Math.abs(params.pixels);
            newCanvas.ctx.clearRect(0, data[4] - params.pixels, data[3], params.pixels);
        }
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);

filterer.addFilter(
    'flip-x',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        newCanvas.ctx.translate(data[3], 0);
        newCanvas.ctx.scale(-1, 1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'flip-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        newCanvas.ctx.translate(0, data[4]);
        newCanvas.ctx.scale(1, -1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'flip-xy',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        newCanvas.ctx.translate(data[3], data[4]);
        newCanvas.ctx.scale(-1, -1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'shift-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        const shiftedSize = data[4] - Math.abs(params.pixels);
        let sourceY = data[2];
        if (params.pixels < 0) {
            sourceY -= params.pixels;
        }
        const targetY = params.pixels < 0 ? 0 : params.pixels;
        newCanvas.ctx.drawImage(data[0].elem, data[1], sourceY, data[3], shiftedSize, 0, targetY, data[3], shiftedSize);
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);


filterer.addFilter(
    'shift-x',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = getCanvasObjForDim(data[3], data[4]);
        const shiftedSize = data[3] - Math.abs(params.pixels);
        let sourceX = data[1];
        if (params.pixels < 0) {
            sourceX -= params.pixels;
        }
        const targetX = params.pixels < 0 ? 0 : params.pixels;
        newCanvas.ctx.drawImage(data[0].elem, sourceX, data[2], shiftedSize, data[4], targetX, 0, shiftedSize, data[4]);
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);

filterer.addFilter(
    'monochrome',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = i << 2;
            if (rgba[pos] > 0 || rgba[pos+1] > 0 || rgba[pos+2] > 0) {
                rgba[pos] = params.color.r;
                rgba[pos+1] = params.color.g;
                rgba[pos+2] = params.color.b;
            }
        }
        return imageData;
    },
    [
        {type: FILTER.PARAM.COLOR, key: 'color', default: '#ffffff'}
    ]
);

filterer.addFilter(
    'opacity',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = (i << 2) + 3;
            rgba[pos] = rgba[pos] * params.opacity;
        };
        return imageData;
    },
    [
        {key: 'opacity', type: FILTER.PARAM.FLOAT, min: 0, max: 1, step: 0.01, decimals: 2, default: 1}
    ]
);

function getRgbFromHexColor(hex) {
    const result = [];
    result.push(parseInt(hex.substr(1, 2), 16));
    result.push(parseInt(hex.substr(3, 2), 16));
    result.push(parseInt(hex.substr(5, 2), 16));
    return result;
}

filterer.addFilter(
    'color-replace',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const colors = [];
        for (let find in params.replace) {
            colors.push([getRgbFromHexColor(find), getRgbFromHexColor(params.replace[find])]);
        };
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = i << 2;
            for (let s of colors) {
                if (s[0][0] === rgba[pos] && s[0][1] === rgba[pos+1] && s[0][2] === rgba[pos+2]) {
                    rgba[pos] = s[1][0];
                    rgba[pos+1] = s[1][1];
                    rgba[pos+2] = s[1][2];
                    break;
                }
            }
        };
        return imageData;
    },
    [
        {key: 'replace', type: FILTER.PARAM.MAPPING}
    ]
);

export {
    Game
}