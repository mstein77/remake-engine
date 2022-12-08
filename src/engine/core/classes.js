import inst from "./instances"
import { FILTER, INPUT, PATH, DEGREE_90 } from "core/const"
import { d, isValidResourceId, getConfigFromInput, ucfirst, clamp, Storage, BitmapPlayer } from "helper/helper"
import { BackgroundPane } from "../panes/BackgroundPane/pane"
import { TextPane } from "../panes/TextPane/pane"
import { CanvasPane } from "../panes/CanvasPane/pane"
import { SpritePane } from "../panes/SpritePane/pane"
import { LinearGradientPane } from "../panes/LinearGradientPane/pane"
import { setStyleConstByKey, getCssPxValue } from "helper/css"
import { TilesMap } from "../panes/BufferedTilesPane/classes"
import { BitmapScrollPane } from "../panes/BitmapScrollPane/pane"
import { PatternPane } from "../panes/PatternPane/pane"
import { Config } from "./config"

/**
 * A config object for the game instance
 */
class GameConfig extends Config {

    setId() {
        this.id = 'game';
    }

    /**
     * Sets a fix width of the game in pixel
     *
     * @param {number} value An integer value for the width
     */
    setWidth(value) {
        this.width = this.validateInt(value, this.getFieldProp('dim'))
    }

    /**
     * Sets a fix height of the game in pixel
     *
     * @param {number} value An integer value for the height
     */
    setHeight(value) {
        this.height = this.validateInt(value, this.getFieldProp('dim'))
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
        const zoom = this.validateFloat(value, this.getFieldProp('zoom'))
        if (this.minZoom > zoom) throw Error(`Cannot set the value ${zoom} because it's smaller than the minZoom ${this.minZoom}`)
        if (this.maxZoom < zoom) throw Error(`Cannot set the value ${zoom} because it's bigger than the maxZoom ${this.maxZoom}`)
        return zoom
    }

    /**
     * Sets a zoom factor for the game
     *
     * @param {number} value A float value for the zoom factor
     */
    setMinZoom(value) {
        this.minZoom = this.validateFloat(value, this.getFieldProp('zoom'))
    }

    /**
     * Sets a maximum zoom factor for the game
     *
     * @param {number} value A float value for the zoom factor
     */
    setMaxZoom(value) {
        const maxZoom = this.validateFloat(value, this.getFieldProp('zoom'))
        if (this.minZoom > maxZoom) throw Error(`Cannot set the value ${maxZoom} because it's smaller than the minZoom of ${this.minZoom}`)
        this.maxZoom = maxZoom
    }

    /**
     * Sets whether the maximum available zoom should be dependant on the current window size or not
     *
     * @param {boolean} value
     */
    setRestrictZoomByWindow(value) {
        this.restrictZoomByWindow = this.validateBool(value)
    }

    /**
     * Sets whether the zoom factor should be calculated automatically or not
     *
     * @param value
     */
    setAutoZoom(value) {
        this.autoZoom = this.validateBool(value)
    }

    /**
     * Sets whether the user should be able to change the auto zoom or not
     *
     * @param {boolean} value
     */
    setAutoZoomByUser(value) {
        this.autoZoomByUser = this.validateBool(value)
    }

    /**
     * Sets whether the zoom factor should be integer steps or not
     *
     * @param {boolean} value
     */
    setStepZoom(value) {
        this.stepZoom = this.validateBool(value)
    }

    /**
     * Sets whether the user should be able to change the auto zoom or not
     *
     * @param {boolean} value
     */
    setStepZoomByUser(value) {
        this.stepZoomByUser = this.validateBool(value)
    }

    /**
     * Indicates whether the Frame-Per-Second should be shown or not
     *
     * @param {boolean} value
     */
    setShowFps(value) {
        this.showFps = this.validateBool(value)
    }

    /**
     * Sets whether the user should be able to have FPS controls or not
     *
     * @param value
     */
    setShowFpsByUser(value) {
        this.showFpsByUser = this.validateBool(value)
    }

    setScreenOrientation(value) {
        this.screenOrientation = this.validateString(value, this.getFieldProp('screenOrientation'))
    }

    setMobile(value) {
        this.mobile = this.validateConfig(MobileGameConfig, value)
    }

    /**
     * @inheritDoc
     */
    getFieldProps() {
        return {
            dim: {min: 1, max: 9999},
            zoom: {min: 0, max: 10},
            screenOrientation: {values: ['free', 'max', 'landscape', 'portrait']}
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
            mobile: {},
            width: 320,
            height: 200,
            zoom: 2,
            minZoom: 1,
            maxZoom: 5,
            restrictZoomByWindow: true,
            stepZoom: true,
            stepZoomByUser: true,
            autoZoom: false,
            autoZoomByUser: true,
            showFps: false,
            showFpsByUser: true,
            screenOrientation: 'max'

        }
    }

    /**
     * @inheritDoc
     */
    applyTo(obj) {
        super.applyTo(obj);
        obj.width = this.width
        obj.height = this.height
        obj.zoom = this.zoom
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
        obj.mobile = this.mobile
        return obj
    }
}

class MobileGameConfig extends GameConfig {

    getDefaults() {
        return {
            id: 'mobile-game-config',
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
    applyTo(obj) {
        obj.zoom = this.zoom
        obj.minZoom = this.minZoom
        obj.maxZoom = this.maxZoom
        obj.restrictZoomByWindow = this.restrictZoomByWindow
        obj.stepZoom = this.stepZoom
        obj.stepZoomByUser = this.stepZoomByUser
        obj.autoZoom = this.autoZoom
        obj.autoZoomByUser = this.autoZoomByUser
        obj.screenOrientation = this.screenOrientation
        if (this.showFps !== undefined) obj.showFps = this.showFps
        if (this.showFpsByUser !== undefined) obj.showFpsByUser = this.showFpsByUser
        return obj
    }
}
MobileGameConfig.Config = MobileGameConfig

const persistedProps2type = {
    zoom: 'float',
    autoZoom: 'bool',
    stepZoom: 'bool',
    masterVolume: 'int',
    muted: 'bool',
    showFps: 'bool'
}

const STATE = {
    CONSTRUCT: 0,
    INIT: 1,
    CONNECT: 2,
    PREBOOT_ERROR: 3,
    BOOT: 4,
    RUNNING: 5,
    STOPPED: 6,
    EDIT: 7
}
const state2name = [
    'construct', 'init', 'connect', 'preboot_error', 'boot', 'running', 'stopped', 'edit'
]

class Game {

    /**
     * Instantiates a new game instance (or throws an error if there is already a running instance) with the given
     * config
     *
     * @param {object|GameConfig} input
     * @param {function|undefined} initHandler
     */
    constructor(input, initHandler) {

        this.states = STATE
        this.currState = STATE.CONSTRUCT

        inst.setGame(this)
        this.game = this
        const system = inst.system
        this.system = system
        inst.setSM(localStorage, GAME_ID)
        inst.setRL(BASE_URL + '/', inst.SM)
        this.engineStorage = new Storage(localStorage, 'remake-engine.')

        this.renderPlugin = inst.renderPlugin
        this.renderPlugin.setGame(this)
        this.renderPlugin.setSystem(system)

        // overwrite body with essential parent div containers
        document.body.replaceChildren(
            div({id: 'game-div', class: 'full-v no-touch-actions'}),
            div({id: 'game-overlay-div', class: 'full-v pos-0 fixed'})
        )

        // registration (only construct)
        this.input = input
        this.keysDown = {}
        this.keys = {}
        this.gamepads = []
        this.modals = []
        this.touchInputs = []
        this.lastTouches = {}
        this.screens = {}
        this.listeners = []
        this.domLoaded = false
        this.deactivateAutoZoom = false
        this.audio = new AudioPlayer()
        this.fpsTracker = new FpsTracker()

        this.cssConstants = {
            editorBgRgb: SCREEN_BG_RGB,
            ...this.renderPlugin.getCssConstantsValues()
        }
        const style = document.body.style;
        for (let [ key, value ] of Object.entries(this.cssConstants)) {
            setStyleConstByKey(style, key, value)
        }

        this.resizeObserver = new ResizeObserver(
            entries => {
                if (this.autoZoom || this.restrictZoomByWindow) this.syncScreen()
            }
        )
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
                div({id: 'touch-div', class: 'transparent full-v full-h pos-0 fixed no-touch-actions no-events'})
            )
            const elem = this.getMandatoryElem('touch-div')
            this.registerListeners([
                {
                    elem,
                    type: 'touchstart',
                    handler: e => {
                        this.syncEventTouches(e.touches)
                        e.preventDefault()
                    }
                },
                {
                    elem,
                    type: 'touchmove',
                    handler: e => {
                        this.syncEventTouches(e.changedTouches)
                        e.preventDefault()
                    }
                },
                {
                    elem,
                    type: 'touchcancel',
                    handler: e => {
                        this.syncEventTouches(e.changedTouches, true)
                        e.preventDefault()
                    }
                },
                {
                    elem,
                    type: 'touchend',
                    handler: e => {
                        this.syncEventTouches(e.changedTouches, true)
                        e.preventDefault()
                    }
                }
            ])
        }
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
        this.warningActions = []
        this.currentScreen = null
        this.elems = {}
        this.props = {}
        this.domQueue = []
        this.viewportBounds = null
        this.globalsResolver = null
        this.areGlobalsResolved = true
        this.trackFps = true
        this.tempKeyActions = null
        this.keyActions = null
        this.frameEvents = {}
        this.running = false
        this.before = {}

        inst.RL.clear()
        inst.OCM.clear()
        this.globals = getNewStateObj()

        this.hideElem('game-overlay-div', 'modals-div')

        if (!this.initHandler) return

        if (this.domLoaded) {
            this.connectAndBoot()
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

    /**
     * Tries to connect to the backend and boots the game if this was successful
     */
    connectAndBoot() {
        this.setState(STATE.CONNECT)
        // TODO: load game.json
        setTimeout(() => {
            try {
                // apply input to this
                const config = getConfigFromInput(GameConfig, this.input, 'game')
                config.applyTo(this.props)
                this.fixOrientation = null
                const system = this.system

                if (system.isMobile) {
                    config.mobile.applyTo(this.props)

                    if (system.supportsOrientation) {
                        if (this.props.screenOrientation === 'max') {
                            this.fixOrientation = this.width >= this.height ? 'landscape' : 'portrait'
                        } else if (this.props.screenOrientation !== 'free') {
                            this.fixOrientation = this.props.screenOrientation
                        }
                    }
                }
                this.props.audioBlocked = false
                this.props.maxAvailZoom = this.maxZoom
                this.props.isFullscreen = this.system.isFullscreen()

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
                            if (mismatch) throw Error(`Persisted value for ${prop} expected to be type of ${type} but got ${typeof value}`)
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
                this.boot()
            } catch (e) {
                console.error(e)
                this.setState(STATE.PREBOOT_ERROR, {message: e.message, error: e})
            }
        }, 2000)
    }

    /**
     * Boots and starts the game
     */
    boot() {
        this.setState(STATE.BOOT)
        this.log(`Booting game "${GAME_ID}"...`)
        // build game dom structure

        const { game, globals } = this
        let startScreen = this.initHandler({ game, globals })

        try {
            this.notify('main')
            this.syncScreen()
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

    // game control

    restart(enableKeys = false) {
        // this.keyHandling = enableKeys;
        if (this.running || !this.hasEditor) {
            return;
        }
        if (this.hasEditor) this.hideElem('editor-div')
        this.showElem('game-overlay-div', 'game-div')
        this.running = this.before.running

        this.addListeners()
//        this.gotoScreen(this.currentScreen);
    }

    /**
     * Resets the game
     */
    reset() {
        this.running = false
        const clearElemIds = ['screen-overlay-div', 'game-div', 'game-overlay-div'];
        if (this.system.supportsTouch) clearElemIds.push('touch-div')
        for (let id of clearElemIds) this.getMandatoryElem(id).replaceChildren()
        this.init()
    }

    reloadScreen(restartEditorWithId = null) {
        if (this.globalsResolver) {
            this.areGlobalsResolved = false
            inst.RL.invalidatePermanentResources()
        }
        this.globals = this.lastGlobals
        this.gotoScreen(this.currentScreen, true)
        this.restart()
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

    openEditorMode() {
        if (!this.hasEditor) {
            this.addWarning('NO GAME EDITOR found!')
            return
        }
        this.log('OPEN EDITOR MODE for Screen "' + this.currentScreen + '"')
        // this.editorRun++;

        this.before.running = this.running
        this.running = false
        this.removeListeners()

        // this.keyHandling = false;
        inst.RL.loadPermanentResources().then(() => {
            this.hideElem('game-div', 'game-overlay-div')
            this.showElem('editor-div')
            // TODO crap
            const stack = this.activeResource
            this.activeResource = undefined
            this.editor = new gameEditor.GameEditor(this, stack)
        });

        this.log('EDITOR-MODE');
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

    syncEventTouches(touches, del = false) {
        const id2elems = {}
        for (let touch of touches) {
            const id = touch.identifier
            let lastElem = this.lastTouches[id];
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!del && elem !== null && elem.classList.contains('touch-dir-cell')) {
                elem.classList.toggle('touching', true);
                elem.classList.toggle('transparent', false)
                const parts = elem.id.substr(10).split('_');
                for (let part of parts) {
                    if (this.touchInputs.indexOf(part) === -1) {
                        this.touchInputs.push(part);
                    }
                }
                lastElem = this.lastTouches[id]
                this.lastTouches[id] = elem;

                if (!lastElem || lastElem === elem) continue
            }

            if (lastElem !== undefined) {
                lastElem.classList.toggle('touching', false);
                lastElem.classList.toggle('transparent', true)
                const parts = lastElem.id.substr(10).split('_');
                for (let part of parts) {
                    this.touchInputs.splice(this.touchInputs.indexOf(part), 1);
                }
                delete this.lastTouches[touch.id];
            }
        }
    };

    syncOrientation() {
        if (this.fixOrientation === null) return

        const system = this.system
        const fixOrientation = system.getScreenOrientation().split('-')[0] !== this.fixOrientation
        const doFix = !(this.isFullscreen && system.supportsOrientationLock) && fixOrientation
        document.documentElement.classList.toggle('fix-orientation', doFix)
    }

    gotoScreen(screenId, params = {}) {
        this.log(`Goto screen "${screenId}"`)

        inst.OCM.clear() // TODO: clear should remove all children of overlay via DomOp
        this.getMandatoryElem('screen-overlay-div').replaceChildren()
        this.frameEvents = {}
        const screen = this.screens[screenId]

        try {
            if (!screen) throw Error(`Unknown screen id "${screenId}" given in gotoScreen!`)
            this.currentScreen = screenId
            this.globals = Object.assign(this.globals, params)
            this.lastGlobals = this.hasEditor ? this.globals.getClone() : null
            // inst.RL.clearResources()

            const { globals, game } = this
            this.build = screen.init({ globals, game, screen })
            this.resetFps()
        } catch (e) {
            this.handleError(e)
            throw e
        }
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
        let changes = this.renderPlugin.notify(action, props)
        if (!changes) return

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
        this.renderPlugin.cleanupWatchers()
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
        this.screenOverlayDiv.style.transform =  'scale(' + calcZoom +')'
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

        function extractEditablesFromAreas(areas) {
            if (!Array.isArray(areas)) {
                return;
            }
            for (let area of areas) {
                if (area.panes !== undefined) {
                    for (let pane of area.panes) {
                        if (pane.tilesMap) {
                            resources.push(
                                {
                                    type: 'TilesMap',
                                    id: pane.tilesMap.id,
                                    pane,
                                    config: TilesMap.Config,
                                    cls: TilesMap,
                                    data: pane.tilesMap.config,
                                    elem: pane.getPreview ? pane.getPreview() : null,
                                    dim: pane.viewPortDim
                                }
                            )
                        } else if (pane instanceof TextPane) {
                            const blocks = [];
                            for (let id in pane.blocks) {
                                blocks.push(
                                    {...pane.blocks[id].config.getJson()}
                                );
                            }
                            resources.push(
                                {
                                    type: 'TextPane',
                                    id: pane.id,
                                    pane,
                                    config: TextPane.Config,
                                    cls: TextPane,
                                    elem: pane.getPreview(),
                                    data: pane.config,
                                    dim: pane.viewPortDim,
                                    blocks
                                });
                        } else if (pane instanceof BackgroundPane) {
                            resources.push({
                                type: 'BackgroundPane',
                                id: pane.id,
                                pane,
                                config: BackgroundPane.Config,
                                cls: BackgroundPane,
                                elem: pane.getPreview(),
                                data: pane.config,
                                dim: pane.viewPortDim,

                            })
                        } else if (pane instanceof CanvasPane) {
                            resources.push(
                                {
                                    elem: pane.getPreview(),
                                    dim: pane.viewPortDim,
                                    pane,
                                    type: 'canvasPane'
                                }
                            )
                        } else if (pane instanceof LinearGradientPane) {
                            resources.push(
                                {
                                    elem: pane.getPreview(),
                                    dim: pane.viewPortDim,
                                    pane,
                                    type: 'linearGradientPane'
                                }
                            )
                        } else if (pane instanceof SpritePane) {
                            const blocks = [];
                            for (let { id, x, y } of Object.values(pane.sprites)) {
                                blocks.push({ id, x, y });
                            }
                            resources.push(
                                {
                                    elem: pane.getPreview ? pane.getPreview() : null,
                                    dim: pane.viewPortDim,
                                    pane,
                                    type: 'spriteSheet',
                                    data: pane.spriteSheet
                                }
                            );
                        } else if (pane instanceof BitmapScrollPane) {
                            resources.push(
                                {
                                    elem: pane.getPreview(),
                                    dim: pane.viewPortDim,
                                    pane,
                                    type: 'bitmapScrollPane'
                                }
                            )
                        } else if (pane instanceof PatternPane) {
                            resources.push(
                                {
                                    elem: pane.getPreview(),
                                    dim: pane.viewPortDim,
                                    pane,
                                    type: 'patternPane'
                                }
                            )
                        }
                    }
                }
                if (Array.isArray(area)) {
                    extractEditablesFromAreas(area)
                } else if (area.areas !== undefined) {
                    extractEditablesFromAreas(area.areas)
                }
            }
        }
        extractEditablesFromAreas(this.getCurrentScreen().areas)

        resources.push({type: 'filters', data: filterer})
        return resources;
    }

    getCurrentScreen() {
        return this.screens[this.currentScreen]
    }

    render(force = false) {
        try {
            if (this.currentScreen !== null && this.screens[this.currentScreen].getState() === 'READY') {
                this.screens[this.currentScreen].render(force);
            }
        } catch (e) {
            this.handleError(e)
        }
    }

    updateDom() {
        while (this.domQueue.length > 0) {
            const next = this.domQueue.shift()
            switch(next.op) {
                case 'set':
                    const parts = next.key.split('.')
                    let elem = next.elem;
                    while (parts.length > 1) {
                        elem = elem[parts.shift()]
                    }
                    elem[parts[0]] = next.value
                    break

                case 'add':
                    next.target.appendChild(next.child)
                    break
            }
        }
    }

    addDomOp(elem, key, value) {
        this.domQueue.push({op: 'set', elem, key, value})
    }

    addDomChild(target, child) {
        this.domQueue.push({op: 'add', target, child})
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

    updateFrame() {
        if (!this.currentScreen) return

        const screen = this.screens[this.currentScreen]
        if (screen.getState() === 'READY') {
            this.updateDom();
            this.keys = {};
            if (this.running) {
                if (this.showFps) {
                    const changed = this.fpsTracker.track()
                    for (const name of changed) {
                        this.notify('change', {name, value: this.fpsTracker[name]})
                    }
                }
                this.render()
                if (screen.frameHandler !== null) {
                    const { globals, game, frames } = this
                    screen.frameHandler({ screen, globals, game, frames })
                }
                this.frames++
            }
            this.updateGamepads()
            /*
            if (this.restartEditorWithId !== null) {
                this.activeResource = this.restartEditorWithId;
                this.restartEditorWithId = null;
                this.openEditorMode();
            }
             */
        }
        this.waitForNextFrame()
    }

    waitForNextFrame() {
        const screen = this.screens[this.currentScreen];
        if (screen.getState() !== 'READY') {
            if (!screen.hasAllDependencies()) {
                requestAnimationFrame(() => this.waitForNextFrame())
                return
            }
            const { globals, game } = this;
            const resources = inst.RL.getResources();
            if (!this.areGlobalsResolved) {
                globals.unlock();
                this.globalsResolver({ ...resources, globals, game });
                globals.lock();
                this.areGlobalsResolved = true;
            }
            try {
                this.tempKeyActions = null
                const frameHandler = this.build({ ...resources, globals, game, screen })
                if (frameHandler) screen.setFrameHandler(frameHandler)
                screen.setDimension(this.width, this.height)
                screen.render(true)
                this.frames = 0
            } catch (e) {
                this.handleError(e)
            }
        }
        requestAnimationFrame(() => this.updateFrame());
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

    setGlobalsResolver(resolver) {
        const game = this.game
        const globals = this.globals
        const loader = new ResourceRequest(true)
        this.globalsResolver = resolver({ loader, game, globals })
        this.areGlobalsResolved = false
    }

    addScreen(screen) {
        this.screens[screen.id] = screen;
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

    addListeners() {
        this.resizeObserver.observe(document.body)
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

    addFrameEvent(type, event) {
        if (this.frameEvents[type] === undefined) {
            this.frameEvents[type] = [];
        }
        this.frameEvents[type].push(event);
    }

    getEvents(type) {
        if (this.frameEvents[type] === undefined) {
            return [];
        }
        const events = this.frameEvents[type];
        delete this.frameEvents[type];
        return events;
    }

    getNextEvent(type) {
        const events = this.frameEvents[type];
        if (events === undefined) {
            return null;
        }
        const event = events.shift();
        if (events.length === 0) {
            delete this.frameEvents[type];
        }
        return event;
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

    get running() {
        return this.props.running
    }

    set running(value) {
        if (value === this.running) return
        this.props.running = value
        if (value) {
            this.keys = {}
            this.keysDown = {}
            this.touchInputs = []
            this.lastTouches = {}
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
            }
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

    get screenDiv() {
        if (!this.elems.screenDiv) {
            this.elems.screenDiv = div(
                {
                    id: "screen-div",
                    style: "width: " + (this.width * this.zoom) + 'px; height: ' + (this.height * this.zoom) + 'px'
                },
                this.screenOverlayDiv
            )
        }
        return this.elems.screenDiv
    }

    get screenOverlayDiv() {
        if (!this.elems.screenOverlayDiv) {
            this.elems.screenOverlayDiv = div(
                {
                    id: "screen-overlay-div",
                    style: "width: " + this.width + 'px; height: ' + this.height + 'px'
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

    // TODO make real getters

    getResourceLoader() {
        return inst.RL;
    }

    getStorageManager() {
        return inst.SM;
    }
}
/**
 * @type {GameConfig}
 */
Game.Config = GameConfig


const div = ( ...args ) => {
    const elem = document.createElement('div')
    const propsOrChildren = args.shift();
    if (typeof propsOrChildren === 'string') {
        elem.append(propsOrChildren)
    } else if (typeof propsOrChildren === 'object') {
        if (propsOrChildren instanceof Node) {
            elem.append(propsOrChildren)
        } else {
            const pairs = Object.entries(propsOrChildren)
            for (let [prop, value] of pairs) {
                    const parsed = value
                    if (typeof parsed === 'boolean') {
                        elem[prop] = parsed
                    } else {
                        elem.setAttribute(prop, parsed)
                    }
            }
        }
    }
    while (args.length) {
        const item = args.shift()
        if (!item) continue
        elem.append(item)
    }
    return elem;
}

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
            return []
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
            const changed = [];
            if (fps !== this.fps) changed.push('fps')
            if (minFps !== this.minFps) changed.push('minFps')
            if (maxFps !== this.maxFps) changed.push('maxFps')
            if (avgFps !== this.avgFps) changed.push('avgFps')
            return changed
        }
        this.frames++
        return []
    }
}

class InputController {

    constructor() {
        this.xDir = 0;
        this.yDir = 0;
        this.inputs = {};
        this.forced = null;
        this.dirInputsKeyboard = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.dirInputsGamepad = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.dirInputsTouch = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.touchPressed = [];
        this.gamepadNo = 0;
    }

    assignGamepadNo(value) {
        this.gamepadNo = value;
    }

    setDirInputsKeyboard(up, down, left, right) {
        this.dirInputsKeyboard['up'] = (up !== undefined) ? up : null;
        this.dirInputsKeyboard['down'] = (down !== undefined) ? down : null;
        this.dirInputsKeyboard['left'] = (left !== undefined) ? left : null;
        this.dirInputsKeyboard['right'] = (right !== undefined) ? right : null;
    }

    setDirInputsGamepad(up, down, left, right) {
        this.dirInputsGamepad['up'] = (up !== undefined) ? up : null;
        this.dirInputsGamepad['down'] = (down !== undefined) ? down : null;
        this.dirInputsGamepad['left'] = (left !== undefined) ? left : null;
        this.dirInputsGamepad['right'] = (right !== undefined) ? right : null;
    }

    setDirInputsTouch(up, down, left, right) {
        this.dirInputsTouch['up'] = (up !== undefined) ? up : null;
        this.dirInputsTouch['down'] = (down !== undefined) ? down : null;
        this.dirInputsTouch['left'] = (left !== undefined) ? left : null;
        this.dirInputsTouch['right'] = (right !== undefined) ? right : null;
    }

    isForced() {
        return this.forced !== null;
    }

    getDirKeys() {
        return this.dirInputsKeyboard;
    }

    setForcedInputs(keysDown) {
        if (keysDown === null) {
            this.forced = null;
        } else {
            this.forced = {};
            for (let key of keysDown) {
                this.forced[key] = key;
            }
        }
    }

    getKeysDown() {
        if (this.forced !== null) {
            return this.forced;
        }
        return inst.game.keysDown
    }

    getGamepadPressed() {
        if (this.forced !== null) {
            return [];
        }
        return inst.game.getGamepadPressed(this.gamepadNo);
    }

    getTouchPressed() {
        if (this.forced !== null) {
            return [];
        }
        return this.touchPressed;
    }

    hasDirInput(dir) {
        const keysDown = this.getKeysDown();
        let key = this.dirInputsKeyboard[dir];
        if (key !== null && keysDown[key]) {
            return true;
        }
        const gamepadPressed = this.getGamepadPressed();
        let button = this.dirInputsGamepad[dir];
        if (button !== null && gamepadPressed.indexOf(button) !== -1) {
            return true;
        }
        const touchId = this.dirInputsTouch[dir];
        const touchPressed = this.getTouchPressed();
        if (touchId !== null && touchPressed.indexOf(touchId) !== -1) {
            return true;
        }
        return false;
    }

    getDirVector() {
        return {x: this.xDir, y: this.yDir};
    }

    updateTouchInputs() {
        const touchPressed = [];
        for (let touchId of inst.game.touchInputs) {
            if (touchPressed.indexOf(touchId) === -1) {
                touchPressed.push(touchId);
            }
        }
        this.touchPressed = touchPressed;
    }

    update() {
        this.updateTouchInputs();

        this.yDir = 0;
        if (this.hasDirInput('up')) {
            this.yDir--;
        }
        if (this.hasDirInput('down')) {
            this.yDir++;
        }
        this.xDir = 0;
        if (this.hasDirInput('left')) {
            this.xDir--;
        }
        if (this.hasDirInput('right')) {
            this.xDir++;
        }

        for (let name in this.inputs) {
            const input = this.inputs[name];
            const keyDown = this.isPressed(name);

            switch(input.type) {
                case INPUT.TYPE.PRESSED_DOWN:
                    input.state = keyDown ? INPUT.STATE.PRESSED : INPUT.STATE.NOTPRESSED;
                    break;

                case INPUT.TYPE.PRESS_AND_RELEASE:
                    switch(input.state) {
                        case INPUT.STATE.AWAIT_NOTPRESSED:
                            if (!keyDown) {
                                input.state = INPUT.STATE.AWAIT_PRESSED;
                            }
                            break;

                        case INPUT.STATE.AWAIT_PRESSED:
                            if (keyDown) {
                                input.state = INPUT.STATE.PRESSED;
                            }
                            break;

                        case INPUT.STATE.PRESSED:
                            if (!keyDown) {
                                input.state = INPUT.STATE.NOTPRESSED;
                            }
                    }
                    break;
            }
        }
    }

    isPressed(name) {
        const input = this.inputs[name];
        const keysDown = this.getKeysDown();
        if (input.map.key !== null && keysDown[input.map.key] === input.map.key) {
            return true;
        }
        const buttonPressed = this.getGamepadPressed();
        if (input.map.button !== null && buttonPressed.indexOf(input.map.button) !== -1) {
            return true;
        }

        const touchPressed = this.getTouchPressed();
        if (input.map.touch !== null && touchPressed.indexOf(input.map.touch) !== -1) {
            return true;
        }

        return false;
    }

    hasInput(name) {
        return this.inputs[name].state === INPUT.STATE.PRESSED;
    }

    awaitInput(name) {
        const input = this.inputs[name];
        if (input.type === INPUT.TYPE.PRESS_AND_RELEASE) {
            if (input.state === INPUT.STATE.NOTPRESSED || input.state === INPUT.STATE.PRESSED) {
                input.state = INPUT.STATE.AWAIT_NOTPRESSED;
            }
        }
    }

    addInput(name, type = INPUT.TYPE.PRESSED_DOWN) {
        this.inputs[name] =
            {
                map:
                    {'key': null, 'button': null, 'touch': null},
                type,
                state:
                INPUT.STATE.NOTPRESSED
            };
    }

    assignKeyToInput(name, key) {
        this.inputs[name].map.key = key;
    }

    assignButtonToInput(name, button) {
        this.inputs[name].map.button = button;
    }

    assignTouchToInput(name, touchId) {
        this.inputs[name].map.touch = touchId;
    }

    noXDir() {
        return this.xDir === 0
    }

    noYDir() {
        return this.yDir === 0
    }

    noDir() {
        return this.xDir === 0 && this.yDir === 0;
    }

    isDownDir() {
        return this.yDir === 1;
    }

    isUpDir() {
        return this.yDir === -1;
    }

    isRightDir() {
        return this.xDir === 1;
    }

    isLeftDir() {
        return this.xDir === -1;
    }

    isDown() {
        return this.yDir === 1 && this.xDir === 0;
    }

    isUp() {
        return this.yDir === -1 && this.xDir === 0;
    }

    isLeft() {
        return this.yDir === 0 && this.xDir === -1;
    }

    isRight() {
        return this.yDir === 0 && this.xDir === 1;
    }
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
        }
        return Reflect.get(...arguments);
    }
}

function getNewStateObj() {
    const globState = {
//        getClone: () => {}
    };
    const stateProxy = new Proxy(globState, new stateProxyHandler());
    stateProxy.self = stateProxy;
    return stateProxy;
}

class ResourceRequest {

    constructor(permanent = false) {
        this.permament = permanent;
    }

    addImageResource(id, data) {
        if (Array.isArray(data)) {
            if (!isValidResourceId('image', id)) {
                throw Error('TODO');
            }
            for (let index = 0; index < data.length; index++) {
                const parts = id.split('.');
                inst.RL.addImage(this.permament,parts[0] + '_' + index + '.' + parts[1], data[index]);
            }
        } else {
            inst.RL.addImage(this.permament, id, data);
        }
    }

    addImageResources(dataObj) {
        for (let id in dataObj) {
            this.addImageResource(id, dataObj[id]);
        }
    }

    addAudioResource(id, url) {
        inst.RL.addAudio(this.permament, id, url);
    }

    addAudioResources(dataObj) {
        for (let id in dataObj) {
            inst.RL.addAudio(this.permament, id, dataObj[id]);
        }
    }

    addJsonResource(id, json) {
        inst.RL.addJson(this.permament, id, json);
    }
}

class AudioResource {

    constructor(url, readyCallback = null) {
        this.audio = null
        this.id = null
        this.volume = 1
        this.promise = new Promise(resolve => {
            if (typeof Audio == 'undefined') {
                this.audio = {}
                resolve()
            } else {
                this.audio = new Audio(url)
                this.audio.oncanplaythrough = () => {
                    resolve()
                    if (readyCallback) {
                        readyCallback()
                    }
                }
                this.audio.onplaying = () => {
                    if (!inst.game.audioBlocked) return
                    inst.game.audioBlocked = false
                }
            }
        })
        this.lastAction = null
    }

    setId(id) {
        this.id = id;
    }

    getId() {
        return this.id;
    }

    setVolume(value) {
        this.volume = value
        this.updateVolume()
    }

    updateVolume() {
        this.audio.volume = (inst.game.masterVolume / 100) * this.volume
    }

    play(volume = 1, restart = true) {
        this.volume = 1
        if (restart && this.isPlaying()) {
            this.rewind()
        }
        this.updateVolume()
        this.lastAction = 'load'
        return this.audio.play().then(() => {
            if (this.lastAction === 'pause') {
                this.audio.pause();
            } else {
                this.lastAction = 'play';
            }
        })
    }

    continue() {
        if (this.lastAction === 'pause') {
            this.lastAction = 'play';
            this.play(1, false);
        }
    }

    rewind() {
        this.audio.currentTime = 0
    }

    setLoop(value) {
        this.audio.loop = value
    }

    setMuted(value) {
        this.audio.muted = value
    }

    pause() {
        if (this.lastAction === 'play') {
            this.audio.pause();
        }
        this.lastAction = 'pause';
    }

    reset() {
        this.rewind();
    }

    isPlaying() {
        return !(this.audio.ended || this.lastAction === 'pause');
    }

    isLooping() {
        return this.audio.loop;
    }

    getNewLoadingPromise() {
        return this.promise;
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
        this.paused = [];
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
        this.audio = {}
        this.resetChannels()
    }

    resetChannel(id) {
        const channel = this.channels[id];
        if (channel !== null) {
            channel.reset();
            channel.pause();
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

// ########################################
//       A r e a s
// ########################################

class Area {

    constructor() {
        this.panes = [];
    }

    addPane(pane) {
        this.panes.push(pane);
    }

    addViewNodesToTree(tree, dimX, dimY, offX = 0, offY = 0) {
        const areaNode = {
            type: 'area',
            dim: {
                x: dimX,
                y: dimY
            },
            offset: {
                x: offX,
                y: offY
            },
            children: []
        };
        for (let i = 0; i < this.panes.length; i++) {
            const pane = this.panes[i];
            if (this.firstArea === true && i === 0) {
                pane.opaque = true;
            }
            const node = {
                type: 'pane',
                pane,
                container: pane.init(dimX, dimY),
                children: []
            };
            areaNode.children.push(node);
            if (node.container) {
                node.container.setViewPort(dimX, dimY, offX, offY);
            }
        }
        tree.children.push(areaNode);
    }
}

class SplitArea {

    constructor(axis, areaSizes) {
        this.axis = axis;
        this.areaSizes = areaSizes;
        this.areaLength = 0;
        this.areas = [];
        this.scrollElem = null;
        this.scrollPos = 0;
        this.maxScrollPos = 0;
        let i = 0;
        while (i < areaSizes.length) {
            this.areaLength += this.areaSizes[i];
            this.areas.push([]);
            i++;
        }
    }

    scrollBy(sx, sy) {
        if (!this.scrollElem) {
            return {
                x: 0,
                y: 0,
                unscrolled: {
                    x: sx,
                    y: sy
                }
            };
        }
        const move = this.axis === 'X' ? sx : sy;
        const old = this.scrollPos;
        this.scrollPos += move;
        if (this.scrollPos < 0) {
            this.scrollPos = 0;
        } else if (this.scrollPos > this.maxScrollPos) {
            this.scrollPos = this.maxScrollPos;
        }
        const unscrolled = old + move - this.scrollPos;

        inst.game.addDomOp(this.scrollElem, 'style.' + (this.axis === 'X' ? 'left' : 'top'), -this.scrollPos + 'px');
        return {
            x: (this.axis === 'X') ? this.scrollPos - old : 0,
            y: (this.axis !== 'X') ? this.scrollPos - old : 0,
            unscrolled: {
                x: (this.axis === 'X') ? unscrolled : sx,
                y: (this.axis !== 'X') ? unscrolled : sy
            }
        };
    }

    addArea(area, pos = null) {
        if (pos === null) {
            pos = 0;
            while (pos < this.areas.length && this.areas[pos].length !== 0) {
                pos++;
            }
            if (pos === this.areas.length) {
                throw new Error('No free area slot found!');
            }
        }
        if (pos >= this.areas.length) {
            return;
        }
        this.areas[pos].push(area);
    }

    addPane(pane, pos = null) {
        const area = new Area();
        area.addPane(pane);
        this.addArea(area, pos);
    }

    addViewNodesToTree(tree, dimX, dimY, offX = 0, offY = 0) {
        const areaNode = {
            type: 'area',
            dim: {
                x: dimX,
                y: dimY
            },
            offset: {
                x: offX,
                y: offY
            },
            children: []
        };
        const oversize = (this.axis === 'X') ? (dimX < this.areaLength) : (dimY < this.areaLength);
        if (oversize) {
            const container = inst.OCM.getContainerElem(dimX, dimY, offX, offY);
            this.scrollElem = document.createElement('div');
            this.scrollElem.setAttribute(
                'style',
                'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' +
                (this.axis === 'X' ? this.areaLength : dimX) + 'px; height: ' +
                (this.axis !== 'X' ? this.areaLength : dimY) + 'px; top: 0px; left: 0px;'
            );
            container.appendChild(this.scrollElem);
            areaNode.parents = [container, this.scrollElem];
            offX = 0;
            offY = 0;
            this.maxScrollPos = this.areaLength - (this.axis === 'X' ? dimX : dimY);
        }
        let pos = 0;
        for (let i = 0; i < this.areas.length; i++) {
            // TODO check
            /*
                        if (this.areas[i].length === 0) {
                            continue;
                        }

             */
            const size = this.areaSizes[i];
            let x = (this.axis === 'X') ? size : dimX;
            let y = (this.axis !== 'X') ? size : dimY;
            pos += size;
            let firstArea = (this.firstArea === true);
            for (let area of this.areas[i]) {
                if (firstArea) {
                    area.firstArea = true;
                    firstArea = false;
                }
                area.addViewNodesToTree(areaNode, x, y, offX, offY);
            }
            if (this.axis === 'X') {
                offX += size;
            } else {
                offY += size;
            }
        }
        tree.children.push(areaNode);
    }
}

// ########################################
//       S c r e e n
// ########################################

class Screen {

    constructor(id, initHandler = null) {
        this.id = id;
        this.areas = [];
        this.keyHandler = null;
        this.initHandler = null;
        this.resources = {};
        this.frameHandler = null;
        this.tree = null;
        this.audio = null;
        this.hasDependencies = false;
        this.state = 'NEW';

        if (initHandler) this.setInitHandler(initHandler)
    }

    getState() {
        return this.state;
    }

    addArea(area) {
        if (this.areas.length === 0) {
            area.firstArea = true;
        }
        this.areas.push(area);
    }

    addPane(pane) {
        const area = new Area();
        area.addPane(pane);
        this.addArea(area);
    }

    setDimension(dimX, dimY) {
        this.tree = {
            type: 'screen',
            dim: {x: dimX, y: dimY},
            children: []
        };

        for (let i = 0; i < this.areas.length; i++) {
            this.areas[i].addViewNodesToTree(this.tree, dimX, dimY);
        }

        function buildNodeDom(node, containerParent) {
            let parent = containerParent;
            if (node.parents)  {
                parent = node.parents[node.parents.length - 1];
            }

            if (node.container) {
                node.container.buildDom(parent);
            }
            for (let child of node.children) {
                buildNodeDom(child, parent);
            }
            if (parent !== containerParent) {
                inst.game.addDomChild(containerParent, node.parents[0]);
            }
        }
        buildNodeDom(this.tree, inst.game.getMandatoryElem('screen-overlay-div'));
    }

    hasAllDependencies() {
        const hasAll = this.hasDependencies;
        if (this.state === 'INIT' && hasAll) {
            this.state = 'READY';
        }
        return hasAll;
    }

    init(params) {
        this.hasDependencies = false;
        inst.RL.clearResources();
        this.resources = {};
        this.areas = [];
        if (this.initHandler !== null) {

            const loader = new ResourceRequest()
            const game = inst.game
            const globals = game.globals
            const initHandler = () => this.initHandler({ loader, game, globals, screen: this });

            this.state = 'INIT';
            const build = initHandler(params);
            inst.RL.load(this.id).then(res => {
                this.hasDependencies = true
            })
            return build
        }
        this.hasDependencies = true;
        this.state = 'READY';
    }

    render(force = false) {
        function renderPanes(tree) {
            for (let child of tree.children) {
                if (child.type === 'pane' && child.pane !== null) {
                    const isDirty = !(child.pane.dirty === false);
                    if (force || isDirty) {
                        child.pane.render();
                    }
                }
                renderPanes(child);
            }
        }
        renderPanes(this.tree);
    }

    setKeyHandler(handler) {
        this.keyHandler = handler.bind(inst.game);
    }

    setFrameHandler(handler) {
        this.frameHandler = handler;
    }

    addImageResource(id, data) {
        if (Array.isArray(data)) {
            for (let index = 0; index < data.length; index++) {
                inst.RL.addImage(id + '_' + index, data[index]);
            }
        } else {
            inst.RL.addImage(id, data);
        }
    }

    addImageResources(dataObj) {
        for (let id in dataObj) {
            this.addImageResource(id, dataObj[id]);
        }
    }

    addAudioResource(id, url) {
        inst.RL.addAudio(id, url);
        /*
        this.dependencies++;
        const resource = new AudioResource(url, () => {
            this.dependencies--;
        });
        this.resources[id] = resource;

         */
    }

    addAudioResources(dataObj) {
        for (let id in dataObj) {
            inst.RL.addAudio(id, dataObj[id]);
        }
    }

    addJsonResource(id, json) {
        inst.RL.addJson(id, json);
    }

    setInitHandler(handler) {
        this.initHandler = handler
    }

    addAudio(src) {
//        this.audio = src;
    }
}

// #####################################
//   DOM Container
// #####################################

class DivContainer {
    constructor(child = null) {
        this.child = child;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = inst.OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        if (this.child !== null) {
            this.containerElem.appendChild(this.child);
        }
        inst.game.addDomChild(parent, this.containerElem);
    }

    getChild() {
        return this.child;
    }

    setBackgroundColor(color) {
        inst.game.addDomOp(this.containerElem, 'style.backgroundColor', color);
    }

    setBackgroundImages(dataElems, pos) {
        const urls = [];
        const noRepeats = [];
        for (let data of dataElems) {
            urls.push('url(' + data + ')');
            noRepeats.push('no-repeat');
        }
        inst.game.addDomOp(this.containerElem, 'style.background-image', urls.join(', '))
        inst.game.addDomOp(this.containerElem, 'style.background-repeat', noRepeats.join(', '))
        inst.game.addDomOp(this.containerElem, 'style.image-rendering', 'pixelated')
    }

    setBackgroundImage(data, posX, posY) {
        this.setBackgroundImages([data]);
        inst.game.addDomOp(this.containerElem, 'style.background-image', 'url(' + data + ')' )
        inst.game.addDomOp(this.containerElem, 'style.background-repeat', 'no-repeat')
        inst.game.addDomOp(this.containerElem, 'style.image-rendering', 'pixelated')
    }

    setBackgroundPositions(positions) {
        const pos = [];
        for (let position of positions) {
            pos.push(position.x + 'px ' + position.y + 'px');
        }
        inst.game.addDomOp(this.containerElem, 'style.background-position', pos.join(', '));
    }

    setBackgroundPosition(posX, posY) {
        this.setBackgroundPositions([{x: posX, y: posY}]);
    }

    setViewPortOffset(x, y) {
    }
}

class ImageContainer {
    constructor(dimX, dimY) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.image = new Image();
        this.image.style.left = 0;
        this.image.style.right = 0;
        this.image.style.position = 'absolute';
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = inst.OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        this.containerElem.appendChild(this.image);
        inst.game.addDomChild(parent, this.containerElem);
    }

    setImageData(data) {
        inst.game.updateDom(this.image, 'src', data);
    }

    getImageElem() {
        return this.image;
    }

    setViewPortOffset(x, y) {
        inst.game.addDomOp(this.image, 'style.left', x + 'px');
        inst.game.addDomOp(this.image, 'style.right', y + 'px');
    }
}

class BufferedCanvasContainer {

    constructor(dimX, dimY, opaque) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.active = 1;
        this.opaque = opaque;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = inst.OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        this.buffers = [
            inst.OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque),
            inst.OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque)
        ];
        this.containerElem.appendChild(this.buffers[0].elem);
        this.containerElem.appendChild(this.buffers[1].elem);
        inst.game.addDomChild(parent, this.containerElem);
    }

    setViewPortOffset(x, y) {
        const activeElem = this.getActiveElem();
        inst.game.addDomOp(activeElem, 'style.left', x + 'px');
        inst.game.addDomOp(activeElem, 'style.right', y + 'px');
    }

    getBufferCtx() {
        return this.buffers[this.active === 1 ? 0 : 1].ctx;
    }

    getActiveCtx() {
        return this.buffers[this.active].ctx;
    }

    getBufferElem() {
        return this.buffers[this.active === 1 ? 0 : 1].elem;
    }

    getActiveElem() {
        return this.buffers[this.active].elem;
    }

    getActiveIndex() {
        return this.active;
    }

    switchBuffer() {
        inst.game.addDomOp(this.getBufferElem(), 'style.display', 'block');
        this.active = this.active === 1 ? 0 : 1;
        inst.game.addDomOp(this.getBufferElem(), 'style.display', 'none');
    }
}

class CanvasContainer {

    constructor(dimX, dimY, opaque) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.opaque = opaque;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        };
        this.canvas = inst.OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque);
        this.elem = null;

        if ((this.dim.x !== this.viewPortDim.x) || (this.dim.y !== this.viewPortDim.y)) {
            this.elem = inst.OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, offsetX, offsetY);
        } else {
            this.canvas.elem.style.left = offsetX + 'px';
            this.canvas.elem.style.top = offsetY + 'px';
        }
    }

    buildDom(parent) {
        if (this.elem) {
            this.elem.appendChild(this.canvas.elem);
            inst.game.addDomChild(parent, this.elem);
        } else {
            inst.game.addDomChild(parent, this.canvas.elem);
        }
    }

    setViewPortOffset(x, y) {
    }

    getCanvasCtx() {
        return this.canvas.ctx;
    }

    getCanvasElem() {
        return this.canvas.elem;
    }
}

class ImageResource {

    constructor(data) {
        this.id = null;
        this.image = typeof Image != 'undefined' ? new Image() : {width: 100, height: 100, decode: () => Promise.resolve()};
        this.canvas = null;
        if (typeof HTMLCanvasElement != 'undefined' && (data instanceof HTMLCanvasElement)) {
            this.canvas = {elem: data, ctx: data.getContext('2d')};
            data = this.getDataUrl();
        }
        this.image.src = data;
        this.resolved = false;
    }

    setId(id) {
        this.id = id;
    }

    getId() {
        return this.id;
    }

    get width() {
        if (!this.resolved) return null
        if (this.image)  return this.image.width
        return this.canvas.width
    }

    get height() {
        if (!this.resolved) return null
        if (this.image)  return this.image.height
        return this.canvas.height
    }

    getCanvas(asClone = false) {
        if (this.canvas === null) {
            this.canvas = inst.OCM.getNewOffscreenCanvas(this.image.width, this.image.height);
            this.canvas.ctx.drawImage(this.image, 0, 0);
        }
        if (asClone) {
            const canvas = inst.OCM.getNewOffscreenCanvas(this.image.width, this.image.height)
            canvas.ctx.drawImage(this.image, 0, 0)
            return canvas
        }
        return this.canvas;
    }

    getCanvasElem(asClone = false) {
        return this.getCanvas(asClone).elem;
    }

    getNewDecodePromise() {
        return this.image.decode().then(result => {this.resolved = true; return result});
    }

    getDataUrl(format = 'png') {
        return this.getCanvasElem().toDataURL('image/' + format);
    }

    getImage() {
        return this.image;
    }

    isResolved() {
        return this.resolved;
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = inst.OCM.getNewOffscreenCanvas(data[3], data[4]);
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

class AxisPath {

    constructor(start = 0) {
        this.points = [start];
        this.position = 0;
        return this;
    }

    static new(start = 0) {
        const path = new AxisPath(start);
        return path;
    }

    getLastPoint() {
        return this.points[this.points.length - 1];
    }

    addAbsolutePoint(point) {
        this.points.push(point);
        return this;
    }

    addRelativePoint(point) {
        const lastPoint = this.getLastPoint();
        this.points.push(lastPoint + point);
        return this;
    }

    addRelativePoints(points) {
        for (let point of points) {
            this.addRelativePoint(point);
        }
        return this;
    }

    round() {
        const rounded = [];
        for (let point of this.points) {
            rounded.push(Math.round(point));
        }
        this.points = rounded;
        return this;
    }

    getPoints() {
        return this.points;
    }

    throw(v0, maxHeight) {
        const gravity = v0 * v0 / (2 * maxHeight);
        let v = v0;
        let i = 0;
        let iMax = Math.round(v0 / gravity);
        while (i !== (iMax * 2 + 1)) {
            v = v0 - gravity * i;
            i++;
            this.addRelativePoint(v);
        }
        return this;
    }

    fall(v0, maxHeight) {
        const gravity = v0 * v0 / (2 * maxHeight);
        let v = v0;
        let i = 0;
        let iMax = Math.round(v0 / gravity);
        while (i !== (iMax * 2)) {
            v = v0 - gravity * (iMax - i);
            i++;
            this.addRelativePoint(v);
        }
        return this;
    }

    addTarget(target, steps, type = PATH.TYPE.STRAIGHT) {
        let point = this.getLastPoint();
        const dist = target - point;
        const size = dist / steps;
        let rad, start;

        switch(type) {
            case PATH.TYPE.STRAIGHT:
                for (let i = 1; i <= steps; i++) {
                    point += size;
                    this.points.push(point);
                }
                break;

            case PATH.TYPE.DAMPED:
                start = point;
                rad = DEGREE_90 / steps;
                for (let i = 1; i <= steps; i++) {
                    point = start + Math.sin(rad * i) * dist;
                    this.points.push(point);
                }
                break;

            case PATH.TYPE.ACCELERATED:
                start = point;
                rad = DEGREE_90 / steps;
                for (let i = 1; i <= steps; i++) {
                    point = start + (1 - Math.cos(rad * i)) * dist;
                    this.points.push(point);
                }
                break;

            default:
                throw Error('Unknown type ' + type + ' given!');
        }
        return this;
    }

    applyFactor(factor) {
        const points = [];
        for (let point of this.points) {
            points.push(point * factor);
        }
        this.points = points;
        return this;
    }

    getCount() {
        return this.points.length;
    }

    isStart() {
        return this.position === 0;
    }

    isEnd() {
        return this.position === this.points.length - 1;
    }

    getCurrentPoint() {
        return this.points[this.position];
    }

    forward(points = 1) {
        let startPos = this.getCurrentPoint();
        while (points > 0) {
            if (!this.isEnd()) {
                this.position++;
            }
            points--;
        }
        return this.getCurrentPoint() - startPos;
    }

    forwardFrom(from, steps = 1) {
        const lastIndex = this.getCount() - 1;
        if (from >= lastIndex) {
            return null;
        }
        const fromPos = this.points[from];
        while (steps > 0) {
            if (from < lastIndex) {
                from++;
            } else {
                return null;
            }
            steps--;
        }
        return this.points[from] - fromPos;
    }

    backward(points = 1) {
        let startPos = this.getCurrentPoint();
        while (points > 0) {
            if (!this.isStart()) {
                this.position--;
            }
            points--;
        }
        return this.getCurrentPoint() - startPos;
    }

    backwardFrom(from, steps = 1) {
        if (from <= 0) {
            return null;
        }
        const fromPos = this.points[from];
        while (steps > 0) {
            if (from > 0) {
                from--;
            } else {
                return null;
            }
            steps--;
        }
        return this.points[from] - fromPos;
    }

    rewind() {
        this.position = 0;
    }

    getDist(from, to) {
        const max = this.getCount() - 1;
        if (from > max || to > max) {
            return null;
        }
        return this.points[to] - this.points[from];
    }

    getMaxDist(from = 0, to = null) {
        let max = this.getCount() - 1;
        if (to === null) {
            to = max;
        }
        if (from > max || to > max) {
            return null;
        }
        let min = this.points[from];
        max = this.points[from];
        for (let i = from; i <= to; i++) {
            min = Math.min(min, this.points[i]);
            max = Math.max(max, this.points[i]);
        }
        return max - min;
    }

    getRelativePath(offset = 0) {
        this.rewind();
        const relPath = [];
        while (!this.isEnd()) {
            let value = 0;
            if (this.isStart()) {
                value = offset;
            }
            value += this.forward();
            relPath.push(value);
        }
        this.rewind();
        return relPath;
    }

    limitToFirst(num) {
        const points = [];
        for(let i = 1; i <= num; i++) {
            points.push(this.points[i]);
        }
        this.points = points;
    }
}

class EmptyPane {
    constructor() {}

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
    }

    render() {
        this.dirty = false;
    }
}

class BoundsScrollHandler {

    constructor(spritePane, scroller, boundsSize, maxOut = {}) {
        this.spritePane = spritePane;
        this.scroller = scroller;
        this.usePushback = false;
        const bounds = {
            left: null,
            right: null,
            top: null,
            bottom: null
        };
        this.maxOut = Object.assign({top: 0, bottom: 0, left: 0, right: 0}, maxOut);
        if (boundsSize.x !== undefined) {
            bounds.left = boundsSize.x;
            bounds.right = boundsSize.x;
        }
        if (boundsSize.y !== undefined) {
            bounds.top = boundsSize.y;
            bounds.bottom = boundsSize.y;
        }
        if (boundsSize.left !== undefined) {
            bounds.left = boundsSize.left;
        }
        if (boundsSize.right !== undefined) {
            bounds.right = boundsSize.right;
        }
        if (boundsSize.top !== undefined) {
            bounds.top = boundsSize.top;
        }
        if (boundsSize.bottom !== undefined) {
            bounds.bottom = boundsSize.bottom;
        }
        this.bounds = bounds;
    }

    setUsePushback(value) {
        this.usePushback = value === true;
    }

    setMaxOut(maxOut) {
        this.maxOut = Object.assign(this.maxOut, maxOut);
    }

    moveActor(moveX = 0, moveY = 0, forceScrollX = false, forceScrollY = false) {
        const actor = this.spritePane.getActorId();
        if (actor === null) {
            return;
        }
        const sprite = this.spritePane.getSpritePos(actor);

        let move = false;
        let scrollX = 0;
        if (moveX !== 0) {
            // let's assume there is no scroll problem
            let pos = sprite.x + moveX;
            // the minimal position of the player sprite on the left
            const min = -this.maxOut.left;
            if (this.bounds.left === null) {
                // no scrollbound on left side
                if (pos < min) {
                    // player pos below allowed minimum => set to minimum
                    pos = min;
                }
            } else if (pos < this.bounds.left) {
                if (this.usePushback) {
                    if (pos < min) {
                        pos = min;
                    }
                    scrollX = -Math.abs(Math.min(this.bounds.left, sprite.x) - pos);
                } else {
                    // new position is left of scrollbounds
                    if (sprite.x >= this.bounds.left) {
                        scrollX = -Math.abs(this.bounds.left - pos);
                        pos = this.bounds.left;
                    } else if (pos < min) {
                        // player pos below allowed minimum => set to minimum
                        pos = min;
                    }

                }
            }

            const max = this.spritePane.viewPortDim.x - 1 - sprite.dim.x + this.maxOut.right;
            const rightScrollBound = (this.bounds.right === null) ? null : max - this.bounds.right;

            if (rightScrollBound === null) {
                if (pos > max) {
                    pos = max;
                }
            } else if (forceScrollX) {
                pos = sprite.x;
                if (pos > max) {
                    pos = max;
                }
                scrollX = moveX;
            } else if (pos > rightScrollBound) {
                if (this.usePushback) {
                    if (pos > max) {
                        pos = max;
                    }
                    scrollX = Math.abs(pos - rightScrollBound);
                } else {
                    if (sprite.x <= rightScrollBound) {
                        scrollX = Math.abs(pos - rightScrollBound);
                        pos = rightScrollBound;
                    } else if (pos > max) {
                        pos = max;
                    }
                }
            }
            sprite.x = pos;
            move = true;
        }

        let scrollY = 0;
        if (moveY !== 0) {
            let pos = sprite.y + moveY;
            const min = -this.maxOut.top;
            if (this.bounds.top === null) {
                if (pos < min) {
                    pos = min;
                }
            } else if (pos < this.bounds.top) {
                if (sprite.y >= this.bounds.top) {
                    scrollY = -Math.abs(this.bounds.top - pos);
                    pos = this.bounds.top;
                } else if (pos < min) {
                    pos = min;
                }
            }
            const max = this.spritePane.viewPortDim.y - 1 - sprite.dim.y + this.maxOut.bottom;
            const bottomScrollBound = (this.bounds.bottom === null) ? null : max - this.bounds.bottom;
            if (bottomScrollBound === null) {
                if (pos > max) {
                    pos = max;
                }
            } else if (pos > bottomScrollBound) {
                if (sprite.y <= bottomScrollBound) {
                    scrollY = Math.abs(pos - bottomScrollBound);
                    pos = bottomScrollBound;
                } else if (pos > max) {
                    pos = max;
                }
            }
            sprite.y = pos;
            move = true;
        }

        const scrolled = this.scroller.scrollBy(scrollX, scrollY);
        if (this.usePushback) {
            move = true;
            if (scrollX < 0) {
                sprite.x += scrolled.x;
            } else if (scrollX > 0) {
                sprite.x -= scrolled.x;
            }

            if (scrollY < 0) {
                sprite.y += scrolled.y;
            } else if (scrollY > 0) {
                sprite.y -= scrolled.y;
            }

            //move = (scrollY !== 0 || scrollX !== 0);
        } else {
            const unscrolled = scrolled.unscrolled;
            if (unscrolled.x !== 0) {
                sprite.x += unscrolled.x;
                move = true;
            }
            if (unscrolled.y !== 0) {
                sprite.y += unscrolled.y;
                move = true;
            }
        }

        if (move) {
            this.spritePane.setSpritePos(actor, sprite.x, sprite.y);
        }
    }
}

class MasterSlavesScrollHandler {

    constructor(master) {
        this.master = master;
        this.slaves = [];
        this.spriteSlaves = [];
    }

    addSlave(slave, factorX = 0, factorY = 0) {
        this.slaves.push([slave, factorX, factorY]);
    }

    addSpriteSlave(slave, factorX = 0, factorY = 0) {
        this.spriteSlaves.push([slave, factorX, factorY]);
    }

    scrollBy(sx, sy) {
        const scrolled = this.master.scrollBy(sx, sy);
        if (scrolled.x !== 0 || scrolled.y !== 0) {
            for (let slave of this.slaves) {
                slave[0].scrollBy(scrolled.x * slave[1], scrolled.y * slave[2]);
            }
            for (let slave of this.spriteSlaves) {
                slave[0].moveSpritesAttachedTo(this.master, scrolled.x * slave[1], scrolled.y * slave[2]);
            }

        }
        return scrolled;
    }
}

/**
 * TODO:
 *   - MasterStates (?)
 */
class States {

    constructor(states) {
        if (states.length === 0) {
            throw Error("No states given!");
        }
        this.states = {};
        this.transitions = [];
        this.currState = states[0];
        this.eventPrios = [];
        this.possibleEvents = null;
        for (let state of states) {
            this.states[state] = {};
        }
    }

    assertExists(state) {
        if (this.states[state] === undefined) {
            throw Error('State "' + state + '" does not exist in machine!');
        }
    }

    getPossibleEvents() {
        if (this.possibleEvents === null) {
            const keys = Object.keys(this.states[this.currState]);
            const events = [];
            for (let event of this.eventPrios) {
                if (keys.indexOf(event) !== -1) {
                    events.push(event);
                }
            }
            this.possibleEvents = events;
        }
        return this.possibleEvents;
    }

    hasPossibleEvent() {
        const events = this.getPossibleEvents();
        for(let event of arguments) {
            if (events.indexOf(event) !== -1) {
                return true;
            }
        }
        return false;
    }

    addTransition(from, events, to) {
        this.assertExists(from);
        this.assertExists(to);
        if (!Array.isArray(events)) {
            events = [events];
        }
        for (let event of events) {
            this.states[from][event] = to;
        }
    }

    cloneStatesAndTransitions(postfix, states) {
        for (let state of states) {
            const newState = state + '_' + postfix;
            this.states[newState] = {};
            const transitions = this.states[state];
            for (let event in transitions) {
                const targetState = transitions[event];
                if (states.indexOf(targetState) !== -1) {
                    this.states[newState][event] = targetState + '_' + postfix;
                }
            }
        }
    }

    replaceEventForStates(states, event, newEvent) {
        if (!Array.isArray(states)) {
            states = [states];
        }
        for (let state of states) {
            const target = this.states[state][event];
            if (target !== undefined) {
                this.states[state][newEvent] = target;
                delete this.states[state][event];
            }
        }
    }

    setEventPrios(events) {
        this.eventPrios = events;
    }

    doEvent(event) {
        const newState = this.states[this.currState][event];
        if (newState === undefined || newState === null) {
            return;
        }
        this.possibleEvents = null;
        this.transitions.push({event, from: this.currState, to: newState});
        this.currState = newState;
    }

    popTransitions() {
        const popped = this.transitions;
        this.transitions = [];
        return popped;
    }

    getState() {
        return this.currState;
    }

    setState(state) {
        this.assertExists(state);
        this.popTransitions();
        this.possibleEvents = null;
        this.currState = state;
    }
}

class PlayerProxy {

    constructor() {
        this.players = [
            null, // non-synchronous player
            null  // synchronous player
        ];
        this.active = 0;
    }

    setPlayer(player) {
        this.active = 1;
        this.players[1] = player;
    }

    isSynchronous() {
        return this.active === 1;
    }

    loadAnimation(frames, end, dir, speed) {
        this.active = 0;
        if (this.players[0] === null) {
            this.players[0] = new BitmapPlayer();
        }
        this.players[0].loadAnimation(frames, end, dir, speed);
        this.players[1] = null;
    }

    getFrame() {
        return this.players[this.active].getFrame();
    }

    setSpeed(speed) {
        this.players[this.active].setSpeed(speed);
    }

    getState() {
        return this.players[this.active].getState();
    }

    nextStep() {
        this.players[this.active].nextStep();
    }

    isDirty() {
        return this.players[this.active].isDirty();
    }

    pause() {
        this.players[this.active].pause();
    }

    continue() {
        this.players[this.active].continue();
    }

    reverse() {
        this.players[this.active].reverse();
    }
}

class Position {

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    setMaxDist(xMin = null, xMax = null, yMin = null, yMax = null) {
        const pos = this.getRounded();
        this.xMin = xMin !== null ? pos - xMin : null;
        this.xMax = xMax !== null ? pos + xMax : null;
        this.yMin = yMin !== null ? pos - yMin : null;
        this.yMax = yMax !== null ? pos + yMax : null;
    }

    move(x, y) {
        const oldX = this.x;
        this.x += x;
        if (this.xMin !== null && this.x < this.xMin) {
            this.x = this.xMin;
        }
        if (this.xMax !== null && this.x > this.xMax) {
            this.x = this.xMax;
        }
        const oldY = this.y;
        this.y += y;
        if (this.yMin !== null && this.y < this.yMin) {
            this.y = this.yMin;
        }
        if (this.yMax !== null && this.y > this.yMax) {
            this.y = this.yMax;
        }

        return {x: Math.round(this.x) - Math.round(oldX), y: Math.round(this.y) - Math.round(oldY)};
    }

    setFrom(obj) {
        this.x = obj.x;
        this.y = obj.y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    getRounded() {
        return {x: Math.round(this.x), y: Math.round(this.y)}
    }
}

class Force {

    constructor(v0, height, drag = 0) {
        this.v0 = v0;
        this.drag = drag;
        this.gravity = Math.abs(v0 * v0 / (2 * height));
        this.peakTime = Math.round(Math.abs(v0 / this.gravity));
    }

    getMoveForTimeVector(vector, lowerBound = null, upperBound = null) {
        if (vector[0] === null) {
            return 0;
        }
        let move = this.v0 + (this.v0 < 0 ? 1 : -1) * (this.gravity * vector[0]);
        if (vector[1] !== null) {
            move -= vector[1] * this.drag;
        }
        if (lowerBound !== null && move < 0) {
            return -Math.min(-move, lowerBound);
        } else if (upperBound !== null && move >= 0) {
            return Math.min(move, upperBound);
        }
        return move;
    }

    incVector(vector) {
        if (vector[0] !== null) {
            vector[0]++;
            if (vector[1] !== null) {
                vector[1]++;
            }
        }
    }

    isTimeVectorAtPeak(vector) {
        return vector[0] === this.peakTime;
    }

    getPeakTime() {
        return this.peakTime;
    }
}

class SpriteAndTilesCollider {

    static defaultCheck(tile) {
        return (tile.obj !== null && tile.obj.block);
    }

    constructor(spriteId, spritePane, tilesPane, collides) {
        this.spriteId = spriteId;
        this.spritePane = spritePane;
        this.tilesPane = tilesPane;
        this.collides = {};
        for (let id in collides) {
            this.addCollide(id, collides[id]);
        }
        this.spriteOffset = {x: 0, y: 0};
        this.tileSize = tilesPane.tilesMap.tileSize;
    }

    addCollide(id, collide) {
        if (collide.dir === undefined || ['up', 'down', 'left', 'right', 'center'].indexOf(collide.dir) === -1) {
            throw Error(`Collide "${id}" must have dir property with an allowed value!`)
        }
        const margin = collide.dir === 'center' ?
            {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            } :
            {
                dir: 0,
                start: 0,
                end: 0
            };
        if (collide.margin) {
            Object.assign(margin, collide.margin);
        }
        collide.margin = margin;
        if (collide.check === undefined) {
            collide.check = SpriteAndTilesCollider.defaultCheck
        }
        this.collides[id] = collide;
    }

    setSpriteOffset(x, y) {
        this.spriteOffset = {x, y};
    }

    getCollideLines() {
        const pos = this.spritePane.getSpritePos(this.spriteId);
        pos.x += this.spriteOffset.x;
        pos.y += this.spriteOffset.y;

        const lines = {};
        for (let collideId in this.collides) {
            const collide = this.collides[collideId];
            if (collide.dir === 'center') {
                /*
                                const xStart = pos.x + collide.margin.left;
                                const yStart = pos.y + collide.margin.top;
                                lines[collideId] = [
                                    xStart,
                                    yStart,
                                    pos.x + pos.dim.x - 1 - collide.margin.right - xStart,
                                    pos.y + pos.dim.y - 1 - collide.margin.bottom - yStart
                                ];

                 */
            } else {
                let first = 0;
                let dir = 1;
                let axis = 'x';
                switch (collide.dir) {
                    case 'down':
                        dir = -1;
                        first = pos.dim.y - 1;
                    case 'up':
                        break;

                    case 'right':
                        dir = -1;
                        first = pos.dim.x - 1;
                    case 'left':
                        axis = 'y';
                        break;
                }
                const oppAxis = axis === 'x' ? 'y' : 'x';
                first += pos[oppAxis] + dir * collide.margin.dir;
                const dStart = pos[axis] + collide.margin.start;
                const dEnd = pos[axis] + pos.dim[axis] - collide.margin.end - 1;

                lines[collideId] = (axis === 'x' ?
                        [dStart, first, dEnd - dStart, 1] :
                        [first, dStart, 1, dEnd - dStart]
                );
            }
        }
        return lines;
    }

    getCollides(collideIds, obstacleSprites = []) {
        const result = {};
        const pos = this.spritePane.getSpritePos(this.spriteId);

        pos.x += this.spriteOffset.x;
        pos.y += this.spriteOffset.y;

        // pos hat die gerundete Position des Sprites inklusive eines möglichen Offsets

        for (let collideId of collideIds) {
            const collide = this.collides[collideId];
            const obj = {};

            if (collide.dir !== 'center') {
                let dist = collide.lookahead;
                let first = 0; //
                let dir = 1;
                let axis = 'x';
                switch(collide.dir) {
                    case 'down':
                        dir  = -1;
                        first = pos.dim.y - 1;
                    case 'up':
                        break;

                    case 'right':
                        dir = -1;
                        first = pos.dim.x - 1;
                    case 'left':
                        axis = 'y';
                        break;
                }
                const oppAxis = axis === 'x' ? 'y' : 'x';
                first += pos[oppAxis] + dir * collide.margin.dir;
                const dStart = pos[axis] + collide.margin.start;
                const dEnd = pos[axis] + pos.dim[axis] - 1 - collide.margin.end - 1;

                let tiles = axis === 'x' ?
                    this.tilesPane.getTilesInXLine(first, dStart, dEnd) :
                    this.tilesPane.getTilesInYLine(first, dStart, dEnd);
                let obstDist = collide.lookahead;
                obj.obstacles = [];
                for (let sprite of obstacleSprites) {
                    const obstPos = this.spritePane.getSpritePos(sprite);
                    obstPos.x += this.spriteOffset.x;
                    obstPos.y += this.spriteOffset.y;

                    if (this.spritePane.isAxisCollide(dStart, dEnd, obstPos[axis], obstPos[axis] + obstPos.dim[axis] - 1)) {
                        let dist = collide.lookahead;
                        switch (collide.dir) {
                            case 'down':
                            case 'right':
                                dist = obstPos[oppAxis] - first;
                                break;

                            case 'up':
                            case 'left':
                                dist = first - (obstPos[oppAxis] + obstPos.dim[oppAxis] - 1);
                                break;

                        }
                        if (dist > -collide.lookahead && dist <= obstDist) {
                            if (dist <= 0 && obstDist >= dist) {
                                obj.obstacles.push(sprite);
                            } else {
                                obj.obstacles = [];
                            }
                            obstDist = dist;
                        }
                    }
                }

                for(let tile of tiles) {
                    // auf der line liegen block-tiles, d.h. wir haben hier ein Collision und damit
                    // ist die distance hier gleich 0
                    if (collide.check(tile)) {
                        dist = 0;
                        break;
                    }
                }
                if (dist > 0) {
                    const pos = first + this.tilesPane.scrollPos[oppAxis];
                    let blockDist;
                    if (dir === -1) {
                        blockDist = Math.min(
                            collide.lookahead,
                            pos >= 0 ?
                                this.tileSize - 1 - (pos % this.tileSize) + 1 :
                                Math.min(Math.abs(pos) - 1 + 1)
                        );
                    } else {
                        blockDist = Math.min(
                            collide.lookahead,
                            pos >= 0 ?
                                pos % this.tileSize + 1:
                                this.tileSize - Math.abs(pos % this.tileSize) + 1
                        );
                    }

                    if (blockDist < collide.lookahead) {
                        const newFirst = first - dir * this.tileSize;
                        const tiles = axis === 'x' ?
                            this.tilesPane.getTilesInXLine(newFirst, dStart, dEnd) :
                            this.tilesPane.getTilesInYLine(newFirst, dStart, dEnd);
                        for (let tile of tiles) {
                            if (collide.check(tile)) {
                                dist = blockDist;
                                break;
                            }
                        }
                    }
                }

                if (dist === 0 && collide.saveContacts) {
                    obj.tiles = tiles;
                }

                obj.dist = Math.min(dist, obstDist);
                if (obj.dist <= 0 && obj.tiles === undefined) {
                    obj.tiles = [];
                }

            } else {
                const tiles = this.tilesPane.getTilesInRect(
                    pos.x + collide.margin.left,
                    pos.y + collide.margin.top,
                    pos.x + pos.dim.x - collide.margin.right - 1,
                    pos.y + pos.dim.y - collide.margin.bottom - 1
                );

                for (let tile of tiles) {
                    if (collide.check(tile)) {
                        inst.game.addFrameEvent('collide', tile);
                    }
                }
                obj.tiles = tiles;
            }
            result[collideId] = obj;
        }
        return result;
    }
}

class ObjectController {

    constructor(spritePane, eventType = 'object') {
        this.spritePane = spritePane;
        this.uid = 0;
        this.eventType = eventType;
        this.activeObjects = [];
        this.classes = {};
        this.removeMargin = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
    }

    setRemoveMargin(key, value) {
        this.removeMargin[key] = value;
    }

    addClass(name, handler, state = {}) {
        this.classes[name] = {
            handler,
            state
        };
    }

    getObjectWithSpriteId(id) {
        for (let obj of this.activeObjects) {
            if (obj.sprites.indexOf(id) !== -1) {
                return obj;
            }
        }
        return null;
    }

    getSpriteIdsForClass(cls) {
        let result = [];
        for (let obj of this.activeObjects) {
            if (obj.class === cls) {
                result = result.concat(obj.sprites);
            }
        }
        return result;
    }

    getObjectsForClass(cls) {
        let result = [];
        for (let obj of this.activeObjects) {
            if (obj.class === cls) {
                result.push(obj);
            }
        }
        return result;
    }

    deleteObjectsOfClass(cls) {
        if (!Array.isArray(cls)) {
            cls = [cls];
        }
        for (let obj of this.activeObjects) {
            if (cls.indexOf(obj.class) !== -1) {
                obj.deleted = true;
            }
        }
    }

    getObjectIdFromIdParts(idParts, obj) {
        let subIds = [];
        for (let part of idParts) {
            let id = '';
            if (Array.isArray(part)) {
                let curr = obj;
                for (let key of part) {
                    curr = curr[key];
                }
                id = curr;
            } else {
                id = obj[part];
            }
            subIds.push(id);
        }
        return obj.class + '_' + subIds.join('_');
    }

    hasActiveObject(id) {
        for (let obj of this.activeObjects) {
            if (obj.id === id && obj.deleted !== true) {
                return true;
            }
        }
        return false;
    }

    getClassParts(id) {
        const parts = id.split('.', 2);
        return {
            main: parts[0],
            variant: (parts.length === 2 ? parts[1] : null)
        }
    }

    addObject(clsId, state = {}) {
        const cls = this.getClassParts(clsId);
        if (this.classes[cls.main] === undefined) {
            throw Error('No class with name "' + cls.main + '" found!');
        }
        const classState = this.classes[cls.main].state;
        let varState = {};
        if (cls.variant !== null) {
            if (classState.variants[cls.variant] === undefined) {
                throw Error('Class "' + cls.main + '" does not have variant "' + cls.variant +  '"!');
            }
            Object.assign(varState, {variant: cls.variant}, classState.variants[cls.variant]);
        }
        const obj = Object.assign({autoRemove: true}, classState, varState, state);
        obj.class = cls.main;
        const id = Array.isArray(obj.idParts) ? this.getObjectIdFromIdParts(obj.idParts, obj) : this.getUid(cls.main);
        if (this.hasActiveObject(id)) {
            return;
        }
        obj.id = id;
        obj.frame = 0;
        obj.sprites = [];
        this.activeObjects.push(obj);
        return obj;
    }

    getUid(name) {
        name += '_' + this.uid;
        this.uid++;
        return name;
    }

    handleObjects(onlyClasses = null) {
        while (true) {
            const event = inst.game.getNextEvent(this.eventType);
            if (event === null) {
                break;
            }
            this.addObject(event.object, {event})
        }

        let i = 0;
        const survivedObjects = [];
        while (i < this.activeObjects.length) {
            const obj = this.activeObjects[i];
            const cls = this.classes[obj.class];
            let remove = obj.deleted === true;
            if (!remove && (onlyClasses === null || onlyClasses.indexOf(obj.class) !== -1)) {
                remove = cls.handler(obj) === false;
                if (!remove) {
                    if (obj.autoRemove === true) {
                        remove = false;
                        for (let spriteId of obj.sprites) {
                            if (this.spritePane.isSpriteInBounds(spriteId, this.removeMargin.top, this.removeMargin.bottom, this.removeMargin.left, this.removeMargin.right)) {
                                remove = false;
                                break;
                            } else {
                                remove = true;
                            }
                        }
                    };
                    if (!remove) {
                        obj.frame++;
                    }
                }
            }
            if (remove) {
                this.spritePane.removeSprites(obj.sprites);
            } else {
                survivedObjects.push(obj);
            }
            i++;
        }
        this.activeObjects = survivedObjects;
    }
}

class Gravity {

    constructor(gravity = null, round = true) {
        this.time = 0;
        this.gravity = gravity;
        this.v0 = null;
        this.currHeight = 0;
        this.maxHeight = null;
        this.round = round;
        this.dragTime = 0;
        this.drag = null;
    }

    setSpeed(v0) {
        this.v0 = v0;
    }

    setSpeedByHeight(targetHeight) {
        if (this.gravity === null) {
            throw Error('No gravity given!');
        }
        const height = targetHeight - this.currHeight;
        this.speed = Math.sqrt(this.gravity * 2 * height);
    }

    reset() {
        this.time = 0;
    }

    getMaxHeight() {
        if (this.gravity === null || this.v0 === null) {
            return null;
        }
        return this.v0 * this.v0 * this.gravity / 2;
    }

    setGravity(gravity) {
        this.gravity = Math.abs(gravity);
    }

    setGravityByHeightAndSpeed(v0, height) {
        this.setGravity(v0 * v0 / (2 * height));
    }

    getCurrentHeight() {
        if (this.round) {
            return Math.round(this.currHeight);
        }
        return this.currHeight;
    }

    setMaxHeight(height) {
        this.maxHeight = height;
    }

    getTimeUntilMax() {
        const tMax = Math.round(Math.abs(this.v0 / this.gravity));
        return tMax;
    }

    setDrag(value) {
        this.dragTime = this.time;
        this.drag = value;
    }

    move() {
        this.lastSpeed =  this.v0 + (this.v0 < 0 ? 1 : -1) * (this.gravity * this.time);
        if (this.drag !== null) {
            const dragTime = this.time - this.dragTime;
            this.lastSpeed -= dragTime * this.drag;
        }
        this.currHeight += this.lastSpeed;
        const move = this.round ? Math.round(this.lastSpeed) : this.lastSpeed;

        if (this.maxHeight !== null && Math.abs(this.currHeight) >= this.maxHeight) {
            this.currHeight = null;
            this.lastSpeed = null;
            return null;
        } else {
            this.time++;
        }
        return move;
    }

    getAllMovements(from = 0, to = null) {
        if (this.maxHeight === null) {
            return [];
        }
        this.reset();
        const result = [];
        let i = 0;
        while (true) {
            const move = this.move();
            if (move === null) {
                break;
            }
            if (to !== null && i > to) {
                break;
            }
            if (from <= i) {
                result.push(move);
            }
            i++;
        }
        return result;
    }
}

export {
    inst,
    Game,
    Screen,
    ImageResource,
    AudioResource,
    InputController,
    INPUT,
    CanvasContainer,
    BufferedCanvasContainer,
    ImageContainer,
    DivContainer,
    AxisPath,
    EmptyPane,
    BoundsScrollHandler,
    MasterSlavesScrollHandler,
    SplitArea,
    States,
    PlayerProxy,
    Position,
    Force,
    Gravity,
    SpriteAndTilesCollider,
    ObjectController
}