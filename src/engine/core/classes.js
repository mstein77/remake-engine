import inst from "./instances.js"
import { d, isValidResourceId, getConfigFromInput, ucfirst, clamp, Storage } from "helper/helper.js"
import { BackgroundPane } from "../panes/BackgroundPane/pane.js"
import { setStyleConstByKey, getCssPxValue } from "helper/css.js"
import { Config } from "./config.js"

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

    /**
     * @inheritDoc
     */
    getFieldProps() {
        return {
            dim: {min: 1, max: 9999},
            zoom: {min: 0, max: 10}
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
            showFpsByUser: true
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
        return obj
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

        // overwrite body with essential parent div containers
        document.body.replaceChildren(
            div({id: 'game-div', class: 'full-v'}),
            div({id: 'game-overlay-div', class: 'full-v pos-0 fixed'}),
            div({id: 'modals-div', class: 'transparent full-v full-h pos-0 fixed'}),
            div({id: 'offscreen-div', class: 'hidden'}),
            div({id: 'editor-div', class: 'full-v hidden'})
        )

        // registration (only construct)
        this.input = input
        this.keysDown = {}
        this.keys = {}
        this.gamepads = []
        this.modals = []
        this.touchInputs = []
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
                    this.running = this.before.running
                }
            },
            {
                type: 'keydown',
                handler: e => {
                    const { key } = e
                    this.keysDown[key] = key
                }
            },
            {
                type: 'keyup',
                handler: e => {
                    const { key } = e
                    delete this.keysDown[key]
                    this.keys[key] = key
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
        if (system.supportsFullScreen) {
            this.registerListener({
                type: system.fullscreenChangeEvent,
                handler: () => {
                    this.isFullscreen = system.isFullScreen()
                }
            })
        }
        if (this.supportsTouch()) {
            document.body.append(
                div({id: 'touch-div', class: 'transparent full-v full-h pos-0 fixed no-events'})
            )
            this.registerListener({
                elem: screen.orientation,
                type: 'change',
                handler: () => {
                    d('orientation change...', this.orientation)
                }
            })
        }

        // TODO register listeners from plugins
        this.addListeners()

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
        this.buildState = null
        this.hasBuildState = true
        this.trackFps = true
        this.running = false
        this.before = {}

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
                this.props.audioBlocked = false
                this.props.maxAvailZoom = this.maxZoom
                this.props.isFullscreen = this.system.isFullScreen()
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
            const { width, height } = this
            this.notify('main',{ width, height })
            this.syncScreen()
            this.showElem('game-overlay-div')

            if (!startScreen) {
                // TODO add welcome screen
            }
            this.log(`...booting done!`)

            this.running = true
            this.gotoScreen(startScreen)
            this.waitForNextFrame()
        } catch (e) {
            this.handleError(e)
        }
    }

    // game control

    restart(enableKeys = false) {
        // this.keyHandling = enableKeys;
        if (this.running || !this.hasEditor()) {
            return;
        }
        this.hideElem('editor-div')
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
        this.init()
    }

    openFullScreenMode() {
        this.system.requestFullScreen(document.body).catch(
            e => this.addWarning('Browser denied fullscreen mode with message: ' + e.message)
        )
    }

    exitFullScreenMode() {
        this.system.exitFullScreen()
    }

    openEditorMode() {
        if (!this.hasEditor()) {
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

    gotoScreen(screenId, params = {}) {
        this.log(`Goto screen "${screenId}"`)

        inst.OCM.clear() // TODO: clear should remove all children of overlay via DomOp
        this.frameEvents = {}

        this.currentScreen = screenId
        const screen = this.screens[screenId]
        this.globals = Object.assign(this.globals, params)

        this.lastState = this.globals.getClone()
        inst.RL.clearResources()

        const { globals, game } = this
        this.build = screen.init({ globals, game, screen })
        this.resetFps()
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
        return {
            width: width - this.viewportBounds.paddingH,
            height: height - this.viewportBounds.paddingV
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
                        /*
                                                if (pane.tilesMap) {
                                                    resources.push(
                                                        {
                                                            type: 'TilesMap',
                                                            id: pane.tilesMap.id,
                                                            pane,
                                                            config: TilesMapConfig,
                                                            cls: TilesMap,
                                                            data: pane.tilesMap.config,
                                                            elem: pane.getPreview ? pane.getPreview() : null,
                                                            dim: pane.viewPortDim
                                                        }
                                                    );
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
                                                            config: TextPaneConfig,
                                                            cls: TextPane,
                                                            elem: pane.getPreview(),
                                                            data: pane.config,
                                                            dim: pane.viewPortDim,
                                                            blocks
                                                        });
                                                } else
                         */
                        if (pane instanceof BackgroundPane) {
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
                        }
                        /*
                                                 else if (pane instanceof SpritePane) {
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
                         */
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
        if (this.currentScreen !== null && this.screens[this.currentScreen].getState() === 'READY') {
            this.screens[this.currentScreen].render(force);
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

    handleKeys() {}

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
            this.handleKeys();
            if (this.running) {
                if (this.showFps) {
                    const changed = this.fpsTracker.track()
                    for (const name of changed) {
                        this.notify('change', {name, value: this.fpsTracker[name]})
                    }
                }
                this.render()
                if (screen.frameHandler !== null) {
                    const { globals, game } = this
                    screen.frameHandler({ screen, globals, game })
                }
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
            if (!this.hasBuildState) {
                const state = this.globals;
                state.unlock();
                this.buildState({ resources, globals, game });
                state.lock();
                this.hasBuildState = true;
            }
            const { image, json, audio } = resources
            const frameHandler = this.build({ image, audio, json, resources, globals, game, screen })
            if (frameHandler) screen.setFrameHandler(frameHandler)
            screen.setDimension(this.width, this.height)
            screen.render(true)
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

    setStateInitHandler(handler) {
        const game = this.game;
        const globals = this.globals;
        const loader = new ResourceRequest(true)
        this.buildState = handler({ loader, game, globals })
        this.hasBuildState = false;
    }

    addScreen(screen) {
        this.screens[screen.id] = screen;
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

    // check flags

    hasEditor() {
        return window.gameEditor !== undefined && !this.system.isMobile
    }

    supportsTouch() {
        return true
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
            this.audio.continueAll()
            if (inst.RL.hasBrowserResources()) {
                this.addWarning('Warning! The current screen is using resources from the local storage!')
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

    get orientation() {
        if (screen.orientation && screen.orientation.type) {
            return screen.orientation.type.split('-')[0]
        } else if (window.orientation !== undefined) {
            return [0, 180].includes(window.orientation) ? 'landscape' : 'portrait'
        }
        return
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


// CSS helper

class Game2 {

    constructor(width, height, config, init) {
        // analyse the element?
        if (Game.instance) {
            throw new Error('There is already a running game instance!');
        }
        Game.instance = this;
        inst.setSM(localStorage, 'demo2');
        inst.setRL(BASE_URL + '/', inst.SM);

        this.id = GAME_ID;
        this.width = width;
        this.height = height;
        this.init = init.bind(this);
        this.screens = {};
        this.currentScreen = null;
        this.globalKeyHandlers = [];
        this.timers = {};
        this.frameEvents = {};
        this.durations = {};
        this.frames = 0;
        this.zoom = config.zoom;
        this.elems = {};
        this.minFps = 100;
        this.logs = [];
        this.domQueue = [];
        this.audioPlaying = [];
        this.globals = getNewStateObj();
        this.touchInputs = [];
        this.gamepads = [];
        this.audio = new AudioPlayer();
        this.lastTouches = {};
        this.hasTouch = false;
        this.buildState = null;
        this.hasBuildState = true;
        this.editorRun = 0;
        this.restartEditorWithId = null;
        this.lastState = null;
        this.editor = null;
        this.keyHandling = true;

        document.addEventListener('DOMContentLoaded', function(event) {
            Game.instance.boot();
        });
    }

    getId() {
        return this.id
    }

    setStateInitHandler(handler) {
        this.buildState = handler.bind(new ResourceRequest(true))();
        this.hasBuildState = false;
    }

    getResourceLoader() {
        return inst.RL;
    }

    getStorageManager() {
        return inst.SM;
    }

    updateDom() {
        while (this.domQueue.length > 0) {
            const next = this.domQueue.shift();
            switch(next.op) {
                case 'set':
                    const parts = next.key.split('.');
                    let elem = next.elem;
                    while (parts.length > 1) {
                        elem = elem[parts.shift()];
                    }
                    elem[parts[0]] = next.value;
                    break;

                case 'add':
                    next.target.appendChild(next.child);
                    break;
            }
        }
    }

    addDomOp(elem, key, value) {
        this.domQueue.push({op: 'set', elem, key, value});
    }

    addDomChild(target, child) {
        this.domQueue.push({op: 'add', target, child});
    }

    getDomElem(id) {
        if (this.elems[id] === undefined) {
            const elem = document.getElementById(id);
            if (elem === null) {
                throw Error('Required element with ID "' + id + '" not found in DOM!');
            }
            this.elems[id] = elem;
        }
        return this.elems[id];
    }

    log() {
        if (arguments.length === 0) {
            return;
        }
        const values = [];
        for (let i = 0; i < arguments.length; i++) {
            values.push('' + arguments[i]);
        }
        this.logs.push(values.join(' '));
    }

    setZoom(value, force = false) {
        if (value < this.minZoom || value > this.maxZoom || (!force && this.zoom === value)) {
            return;
        }
        this.zoom = value;
        const overlay = this.getDomElem('overlay');
        overlay.style.transform =  'scale(' + this.zoom +')';
        overlay.style.transformOrigin = 'top left';
        const elem = this.getDomElem('screen-div');
        elem.style.width = '' + this.width * this.zoom;
        elem.style.height = '' + this.height * this.zoom;
        this.resetFps();
    }

    addGlobalKeyHandler(handler) {
        this.globalKeyHandlers.push(handler.bind(this));
    }

    render(force = false) {
        if (this.currentScreen !== null && this.screens[this.currentScreen].getState() === 'READY') {
            this.screens[this.currentScreen].render(force);
        }
    }

    startTimer(name) {
        this.timers[name] = performance.now();
    }

    addTimerDuration(name) {
        const delta = performance.now() - this.timers[name];
        if (this.durations[name] === undefined) {
            this.durations[name] = 0;
        }
        this.durations[name] += delta;
        return delta;
    }

    resetTimers(names) {
        for (let name of names) {
            this.timers[name] = 0;
            this.durations[name] = 0;
        }
    }

    addScreen(screen) {
        this.screens[screen.id] = screen;
    }

    reloadScreen(restartEditorWithId = null) {
        this.restartEditorWithId = restartEditorWithId;
        this.hasBuildState = false;
        inst.RL.invalidatePermanentResources();
        this.globals = this.lastState;
        this.gotoScreen(this.currentScreen);
        this.restart(restartEditorWithId !== null);
    }

    gotoScreen(screenId, params = {}) {
        d('GOTO', screenId, params);
        this.stopAllAudio();
        inst.OCM.clear(); // TODO: clear should remove all children of overlay via DomOp
        this.frameEvents = {};
        this.currentScreen = screenId;
        const screen = this.screens[screenId];
        this.globals = Object.assign(this.globals, params);
        this.lastState = this.globals.getClone();
        inst.RL.clearResources();
        const callback = screen.init(this.globals);
        this.build = callback.bind(this);
    }

    stopAllAudio() {
        for (let audio of this.audioPlaying) {
            audio.pause();
        }
        this.audioPlaying = [];
    }

    getGamepadPressed(no) {
        if (no >= this.gamepads.length) {
            return [];
        }
        return this.gamepads[no].pressed;
    }

    resetFps() {
        this.resetTimers(['game', 'render']);
        this.startTimer('game');
        this.frames = 0;
        this.minFps = 100;
    }

    openEditorMode() {
        if (gameEditor === null) {
            console.log('NO GAME EDITOR found!');
            return;
        }
        console.log('OPEN EDITOR MODE for Screen "' + this.currentScreen + '"');
        this.editorRun++;

        this.setRunning(false);
        this.keyHandling = false;
        inst.RL.loadPermanentResources().then(() => {
            this.getDomElem('game').style.display = 'none';
            this.getDomElem('editor').style.display = 'block';
            // TODO crap
            const stack = this.activeResource;
            this.activeResource = undefined;
            this.editor = new gameEditor.GameEditor(this, stack)
        });
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
/*
                        if (pane.tilesMap) {
                            resources.push(
                                {
                                    type: 'TilesMap',
                                    id: pane.tilesMap.id,
                                    pane,
                                    config: TilesMapConfig,
                                    cls: TilesMap,
                                    data: pane.tilesMap.config,
                                    elem: pane.getPreview ? pane.getPreview() : null,
                                    dim: pane.viewPortDim
                                }
                            );
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
                                    config: TextPaneConfig,
                                    cls: TextPane,
                                    elem: pane.getPreview(),
                                    data: pane.config,
                                    dim: pane.viewPortDim,
                                    blocks
                                });
                        } else
 */
                         if (pane instanceof BackgroundPane) {
                            resources.push({
                                type: 'BackgroundPane',
                                id: pane.id,
                                pane,
                                config: BackgroundPane.Config,
                                cls: BackgroundPane,
                                elem: pane.getPreview(),
                                data: pane.config,
                                dim: pane.viewPortDim,

                            });
                        }
/*
                         else if (pane instanceof SpritePane) {
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
 */
                    }
                }
                if (Array.isArray(area)) {
                    extractEditablesFromAreas(area);
                } else if (area.areas !== undefined) {
                    extractEditablesFromAreas(area.areas);
                }
            }
        }
        extractEditablesFromAreas(this.getCurrentScreen().areas);

        resources.push({type: 'filters', data: filterer});
        return resources;
    }

    getCurrentScreen() {
        return this.screens[this.currentScreen];
    }

    restart(enableKeys = false) {
        this.keyHandling = enableKeys;
        if (this.running || gameEditor === null) {
            return;
        }
        this.getDomElem('editor').style.display = 'none';
        this.getDomElem('game').style.display = 'inline';
        this.setRunning(true);
//        this.gotoScreen(this.currentScreen);
    }

    handleKeys() {
        if (!this.keyHandling) return;

        if (this.keys[EDITOR_KEY]) {
            this.openEditorMode();
        } else {
            for (let handler of this.globalKeyHandlers) {
                const stop = handler();
                if (stop) {
                    this.keys = {};
                    return;
                }
            }

            if (this.running) {
                const screen = this.screens[this.currentScreen];
                if (screen.keyHandler !== null) {
                    screen.keyHandler();
                }
            }
        }
        this.keys = {};
    }

    getRounded(value, decimals) {
        let f = 1;
        while(decimals > 0) {
            f *= 10;
            decimals--;
        }
        return Math.round(value * f) / f;
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

    updateGamepads() {
        if (this.gamepads.length === 0) {
            return;
        }
        const buttonPressed = {};
        const gamepads = navigator.getGamepads();
        for (let gamepad of gamepads) {
            if (gamepad !== null) {
                const pressed = [];
                let i = 0;
                for (let button of gamepad.buttons) {
                    if (button.pressed) {
                        pressed.push(i);
                    }
                    i++;
                }
                buttonPressed[gamepad.index] = pressed;
            }
        }

        for (let gamepad of this.gamepads) {
            gamepad.pressed =
                buttonPressed[gamepad.index] !== undefined ? buttonPressed[gamepad.index] : [];
        }
    }

    updateFrame() {
        const screen = this.screens[this.currentScreen];
        if (screen.getState() === 'READY') {
            this.updateDom();
            this.handleKeys();
            if (this.running) {
                this.startTimer('render');
                this.render();
                this.addTimerDuration('render');
                this.frames++;
                if (screen.frameHandler !== null) {
                    screen.frameHandler();
                }
            }
            this.updateGamepads();
            if (this.restartEditorWithId !== null) {
                this.activeResource = this.restartEditorWithId;
                this.restartEditorWithId = null;
                this.openEditorMode();
            }
        }
        this.waitForNextFrame();
    }

    waitForNextFrame() {
        const screen = this.screens[this.currentScreen];
        if (screen.getState() !== 'READY') {
            if (!screen.hasAllDependencies()) {
                requestAnimationFrame(this.waitForNextFrame.bind(this));
                return;
            }
            document.getElementById('tmp-resources-warning').classList.toggle('hidden', !inst.RL.hasBrowserResources())
            const resources = inst.RL.getResources();
            if (!this.hasBuildState) {
                const state = Game.instance.globals;
                state.unlock();
                this.buildState(resources, state);
                state.lock();
                this.hasBuildState = true;
            }
            this.build(resources, Game.instance.globals);
            screen.setDimension(this.width, this.height);
            screen.render(true);
            /*
            if (this.sound && screen.audio !== null) {
                const audio = new Audio(screen.audio);
                audio.addEventListener('canplaythrough', event => {
                    this.playAudio(audio);
                });
                audio.addEventListener('ended', event => {
                    for (let i = 0; i < this.audioPlaying.length; i++) {
                        if (this.audioPlaying[i] === audio) {
                            this.audioPlaying.splice(i, 1);
                            break;
                        }
                    }
                });
            }
             */
        }
        requestAnimationFrame(this.updateFrame.bind(this));
    }

    setRunning(value) {
        this.log('setRunning', value);
        this.running = value;
        if (value) {
            this.resetFps();
            this.audio.continueAll();
        } else {
            this.audio.pauseAll();
            this.addTimerDuration('game');
        }
    }

    enableTouchInputs() {
        const touchDirs = document.getElementById('touch-input-dir');
        touchDirs.style.display = 'grid';

        const syncEventTouches = (touches, del = false) => {
            for(let touch of touches) {
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!del && elem !== null && elem.classList.contains('touch-dir-cell') && !elem.classList.contains('touch-dir-middle')) {
                    elem.classList.toggle('touching', true);
                    const parts = elem.id.substr(10).split('_');
                    for (let part of parts) {
                        if (this.touchInputs.indexOf(part) === -1) {
                            this.touchInputs.push(part);
                        }
                    }
                    this.lastTouches[touch.identifier] = elem;
                } else {
                    const lastElem = this.lastTouches[touch.identifier];
                    if (lastElem !== undefined) {
                        lastElem.classList.toggle('touching', false);
                        const parts = lastElem.id.substr(10).split('_');
                        for (let part of parts) {
                            this.touchInputs.splice(this.touchInputs.indexOf(part), 1);
                        }
                        delete this.lastTouches[touch.identifier];
                    }
                }
            }
        };

        const onTouchStartHandler = (e) => {
            syncEventTouches(e.touches);
            e.preventDefault();
        };

        const onTouchMoveHandler = (e) => {
            syncEventTouches(e.changedTouches);
            e.preventDefault();
        };

        const onTouchCancelHandler = (e) => {
            syncEventTouches(e.changedTouches, true);
            e.preventDefault();
        };

        const onTouchEndHandler = (e) => {
            syncEventTouches(e.changedTouches, true);
            e.preventDefault();
        };

        let dirElem = touchDirs;
        dirElem.ontouchstart = onTouchStartHandler;
        dirElem.ontouchmove = onTouchMoveHandler;
        dirElem.ontouchcancel = onTouchCancelHandler;
        dirElem.ontouchend = onTouchEndHandler;

        const touchButtons = document.getElementById('touch-input-buttons');
        touchButtons.style.display = 'grid';

        let buttonElem = touchButtons;
        buttonElem.ontouchstart = onTouchStartHandler;
        buttonElem.ontouchmove = onTouchMoveHandler;
        buttonElem.ontouchcancel = onTouchCancelHandler;
        buttonElem.ontouchend = onTouchEndHandler;
    }

    boot() {
        this.startTimer('boot');
        this.log(`Boot game engine for "${this.id}"...`);
        this.keysDown = {};
        this.keys = {};

        if (window.gameEditor !== undefined) {
            gameEditor = window.gameEditor;
        }

        this.hasTouch = ('ontouchstart' in document.documentElement);

        // register key handlers
        const keyDownHandler = (e) => {
            this.keysDown[e.key] = e.key;
        };
        document.onkeydown = keyDownHandler;

        const keyUpHandler = (e) => {
            delete this.keysDown[e.key];
            this.keys[e.key] = e.key;
        };
        document.onkeyup = keyUpHandler;

        const gamepadConnectHandler = (e) => {
            this.gamepads.push({
                index: e.gamepad.index,
                pressed: []
            });
        };
        window.addEventListener('gamepadconnected', gamepadConnectHandler);

        // set screen background
        document.body.style.setProperty('--game-bg-rgb', SCREEN_BG_RGB);
        document.body.classList.add('game-bg-rgb');

        document.body.innerHTML =
            '<div id="game">' +

            '<div style="display: flex; justify-content: center; margin-top: 20px">' +
            '<div id="screen-div" style="flex-shrink: 0; margin: 0 15px 0px 15px; padding: 0; width: ' + this.width + 'px; height: ' + this.height + 'px">' +
            '           <div id="overlay" style="position: relative; padding: 0px; margin: 0; width: ' + this.width + 'px; height: ' + this.height + 'px">' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div id="tmp-resources-warning" class="hidden stack-h inner-space-h">' +
            '<div class="flex">Warning! The current screen is using resources from the local storage!</div>' +
            '<div>' +
            '<button id="clear-tmp-resources">Clear</button>' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div id="offscreen" style="display: none"></div>' +

            '<div id="react-editor"></div>' +

            '<div id="editor" class="full-v" style="display: none">Editor</div>' +
            (this.hasTouch ?
                    '<div id="touch-input-dir" style="display: none">' +
                    '<div id="touch_btn_left_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_right_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_left" class="touch-dir-cell"></div>' +
                    '<div class="touch-dir-cell touch-dir-middle"></div>' +
                    '<div id="touch_btn_right" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_left_down" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_down" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_right_down" class="touch-dir-cell"></div>' +
                    '</div>' +
                    '<div id="touch-input-buttons" style="display: none">' +
                    '<div id="touch_btn_1" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_2" class="touch-dir-cell"></div>' +
                    '<div class="touch-dir-cell touch-dir-middle"></div>' +
                    '<div id="touch_btn_3" class="touch-dir-cell"></div>' +
                    '</div>'
                    : ''
            )
        ;

        if (this.zoom !== 1) {
            this.setZoom(this.zoom, true);
        }

        if (this.hasTouch) {
            this.enableTouchInputs();
        }

        const clearBtn = document.getElementById('clear-tmp-resources');
        clearBtn.addEventListener('click', () => {
            this.getResourceLoader().clearBrowserResources();
            this.reloadScreen();
        }, {capture: false});

        const startScreen = this.init();
        this.addTimerDuration('boot');
        this.gotoScreen(startScreen);
        this.setRunning(true);
        this.log('...booting done');
        this.waitForNextFrame();
    }
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

const INPUT = {
    TYPE: {
        PRESSED_DOWN: 0,
        PRESS_AND_RELEASE: 1
    },
    STATE: {
        NOTPRESSED: 0,
        PRESSED: 1,
        AWAIT_NOTPRESSED: 2,
        AWAIT_PRESSED: 3
    }
};

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
        return inst.game.keysDown;
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
            const lazyKeys = Object.keys(this.lazyKeys);
            const keys = Object.keys(target).filter(x => lazyKeys.indexOf(x) === -1);
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
        getClone: () => {}
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

        inst.game.addDomOp(this.scrollElem, 'style.' + (this.axis === 'X' ? 'left' : 'top'), -this.scrollPos);
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
            this.state = 'INIT';
            const build = this.initHandler(params);
            inst.RL.load(this.id).then((res) => {
                this.hasDependencies = true;
            });
            return build;
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
        const loader = new ResourceRequest()
        const game = inst.game
        const globals = game.globals
        this.initHandler = () => handler({ loader, game, globals, screen: this });
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
        inst.game.addDomOp(this.image, 'style.left', x);
        inst.game.addDomOp(this.image, 'style.right', y);
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
        inst.game.addDomOp(activeElem, 'style.left', x);
        inst.game.addDomOp(activeElem, 'style.right', y);
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
            this.canvas.elem.style.left = offsetX;
            this.canvas.elem.style.top = offsetY;
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

    getCanvas() {
        if (this.canvas === null) {
            this.canvas = inst.OCM.getNewOffscreenCanvas(this.image.width, this.image.height);
            this.canvas.ctx.drawImage(this.image, 0, 0);
        }
        return this.canvas;
    }

    getCanvasElem() {
        return this.getCanvas().elem;
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

const FILTER = {
    TYPE: {
        CANVAS: 0,
        IMAGEDATA: 1
    },
    PARAM: {
        STRING: 0,
        FLOAT: 1,
        COLOR: 2,
        MAPPING: 3,
        INT: 4
    }
};

class BitmapFilterer {

    constructor() {
        this.filters = {};
    }

    getFilters() {
        return this.filters;
    }

    addFilter(id, type, callback, params = []) {
        const paramClosures = [];
        let minParams = 0;
        let isMandatory = true;
        for (let index = 0; index < params.length; index++) {
            if (isMandatory) {
                if (params.default === undefined) {
                    minParams++;
                } else {
                    isMandatory = false;
                }
            }
            const param = params[index];
            let parser = null;
            switch(param.type) {

                case FILTER.PARAM.COLOR:
                    parser = function(rawValue) {
                        const color = {};
                        // TODO use helper function
                        if (rawValue[0] === '#') {
                            if (rawValue.length === 7) {
                                color.r = parseInt(rawValue.substr(1, 2), 16);
                                color.g = parseInt(rawValue.substr(3, 2), 16);
                                color.b = parseInt(rawValue.substr(5, 2), 16);
                                return color;
                            }
                        }
                        return null;
                    };
                    break;

                case FILTER.PARAM.INT:
                    parser = function(rawValue) {
                        return parseInt(rawValue, 10);
                    };
                    break;

                case FILTER.PARAM.FLOAT:
                    parser = function(rawValue) {
                        return parseFloat(rawValue);
                    };
                    break;

                case FILTER.PARAM.STRING:
                    parser = function(rawValue) {
                        return rawValue;
                    };
                    break;

                case FILTER.PARAM.MAPPING:
                    parser = function(rawValue) {
                        const result = {};
                        const assigns = rawValue.split(';');
                        for(let assign of assigns) {
                            const parts = assign.split(':', 2);
                            result[parts[0]] = parts[1];
                        }
                        return result;
                    };
                    break;

            }

            paramClosures.push(
                function(rawValue, params) {
                    params[param.key] = (rawValue === '') ? param.default : parser(rawValue);
                }
            );
        }

        this.filters[id] = {
            type,
            callback,
            minParams,
            paramDefs: params,
            params: paramClosures
        }
    }

    /**
     * Returns either the original canvas or a new one with the filters applied on the original one
     *
     * @param filters
     * @param canvas
     * @param offX
     * @param offY
     * @param width
     * @param height
     * @return {*[]}
     */
    getCanvasWithFiltersApplied(filters, canvas, offX, offY, width, height) {
        let data = [canvas, offX, offY, width, height];
        let lastType = FILTER.TYPE.CANVAS;
        let imageData = null;
        let isSourceCanvas = true;

        const filterParts = filters.split('|');
        for (let filterPart of filterParts) {
            let rawParams = [];
            if (filterPart[filterPart.length - 1] === ')') {
                const subExpr = filterPart.slice(0, -1).split('(', 2);
                filterPart = subExpr[0];
                rawParams = subExpr[1].split(',');
            }
            if (filterPart === '') {
                continue;
            }
            const filter = this.filters[filterPart];
            const filterParams = {};
            if (rawParams.length < filter.minParams) {
                throw Error(`Filter "${filterPart}" requires ${filter.minParams} parameters but got ${rawParams.length}!`);
            }
            for (let i = 0; i < filter.params.length; i++) {
                if (i < rawParams.length) {
                    filter.params[i](rawParams[i], filterParams);
                } else {
                    filterParams[filter.key] = filter.default;
                }
            }

            switch(filter.type) {

                case FILTER.TYPE.CANVAS:
                    if (lastType === FILTER.TYPE.IMAGEDATA) {
                        if (isSourceCanvas) {
                            data = [OCM.getNewOffscreenCanvas(data[3], data[4]), 0, 0, data[3], data[4]];
                            isSourceCanvas = false;
                        }
                        data[0].ctx.putImageData(imageData, 0, 0);
                    }
                    data = filter.callback(data, filterParams);
                    break;

                case FILTER.TYPE.IMAGEDATA:
                    if (lastType === FILTER.TYPE.CANVAS) {
                        imageData = data[0].ctx.getImageData(data[1], data[2], data[3], data[4]);
                    }
                    imageData = filter.callback(imageData, filterParams);
                    break;

                default:
                    throw Error(`Unknown filter type ${filter.type} given!`);
            }
            lastType = filter.type;
        }

        if (lastType === FILTER.TYPE.IMAGEDATA) {
            if (isSourceCanvas) {
                data = [OCM.getNewOffscreenCanvas(data[3], data[4]), 0, 0, data[3], data[4]];
            }
            data[0].ctx.putImageData(imageData, 0, 0);
        }
        return data;
    }
}

const filterer = new BitmapFilterer();

filterer.addFilter(
    'clear-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
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
    DivContainer
}