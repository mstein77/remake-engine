import inst from "./instances.js";
import { d, isValidResourceId } from "../helper/helper.js";
import { BackgroundPane } from "../panes/BackgroundPane/pane.js";

console.log('WAIT 4', EDITOR_KEY);

class Game {

    constructor(width, height, config, init) {
        // analyse the element?
        if (Game.instance) {
            throw new Error('There is already a running game instance!');
        }
        Game.instance = this;
        inst.setSM(localStorage, 'demo2');
        inst.setRL(BASE_URL + '/', inst.SM);

        this.id = 'TODO';
        this.width = width;
        this.height = height;
        this.init = init.bind(this);
        this.screens = {};
        this.currentScreen = null;
        this.debug = config.debug === true;
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
        if (value < 1 || value > 4 || (!force && this.zoom === value)) {
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

    playAudio(audio) {
        if (audio.readyState >= 2) {
            this.audioPlaying.push(audio);
            audio.play();
        }
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

    setDebug(value) {
        this.debug = (value === true);
        this.getDomElem('log-div').style.display = this.debug ? 'block' : 'none';
        this.getDomElem('debugs').style.display = this.debug ? 'block' : 'none';
    }

    line() {
        return "=================================================\n";
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

    printDebugs() {
        if (this.debug) {
            const gameDuration = this.running ? this.addTimerDuration('game') : this.durations['game'];
            const frameTime = this.getRounded(this.durations['render'] / this.frames, 2);
            const fps = this.frames === 0 ? '-' : Math.round((1000 / (gameDuration / this.frames)));
            this.minFps = Math.min(fps, this.minFps);
            const perfKpis =
                this.line() +
                " Performance\n" +
                this.line() +
                "FPS: " + fps + " - Min: " + this.minFps + "\n" +
                "Rendering: " + frameTime + "ms\n" +
                "Boot-Time: " + this.getRounded(this.durations['boot'], 2) + "ms\n\n";
            ;
            const out = [];
            out.push(this.line() + " Debug\n" + this.line());
            for (let k in debugs) {
                out.push(k + ': ' + debugs[k])
            }
            this.addDomOp(this.getDomElem('d'), 'innerHTML', perfKpis + out.join("\n"));

            if (this.logs.length > 0) {
//                this.getDomElem('log').innerHTML += this.logs.join("\n") + "\n";
                this.logs = [];
            }
        }
        debugs = [];
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
            if (this.debug) {
                this.printDebugs();
            }
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
        this.log('Boot game engine...');
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

        const debugElem = document.getElementById('d');
        const startScreen = this.init();
        this.addTimerDuration('boot');
        this.gotoScreen(startScreen);
        this.setRunning(true);
        if (this.debug) {
            this.setDebug(true);
        }
        this.log('...booting done');
        this.waitForNextFrame();
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

class AudioPlayer {

    constructor() {
        this.audio = {};
        this.channels = {};
        this.masterVolume = 1;
        this.paused = [];
    }

    addChannel(id) {
        this.channels[id] = null;
    }

    addAudioResources(obj) {
        this.audio = Object.assign(this.audio, obj);
    }

    setMasterVolume(volume) {
        this.masterVolume = volume;
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
        audio.setLoop(false);
        audio.play();

        return audio;
    }

    loop(id, channel = null) {
        const audio = this.play(id, channel);
        audio.setLoop(true);
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

        Game.instance.addDomOp(this.scrollElem, 'style.' + (this.axis === 'X' ? 'left' : 'top'), -this.scrollPos);
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

    constructor(id) {
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
                Game.instance.addDomChild(containerParent, node.parents[0]);
            }
        }
        buildNodeDom(this.tree, Game.instance.getDomElem('overlay'));
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
        this.keyHandler = handler.bind(Game.instance);
    }

    setFrameHandler(handler) {
        this.frameHandler = handler.bind(Game.instance);
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
        this.initHandler = handler.bind(new ResourceRequest());
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
        Game.instance.addDomChild(parent, this.containerElem);
    }

    getChild() {
        return this.child;
    }

    setBackgroundColor(color) {
        Game.instance.addDomOp(this.containerElem, 'style.backgroundColor', color);
    }

    setBackgroundImages(dataElems, pos) {
        const urls = [];
        const noRepeats = [];
        for (let data of dataElems) {
            urls.push('url(' + data + ')');
            noRepeats.push('no-repeat');
        }
        Game.instance.addDomOp(this.containerElem, 'style.background-image', urls.join(', '));
        Game.instance.addDomOp(this.containerElem, 'style.background-repeat', noRepeats.join(', '));
    }

    setBackgroundImage(data, posX, posY) {
        this.setBackgroundImages([data]);
        Game.instance.addDomOp(this.containerElem, 'style.background-image', 'url(' + data + ')' );
        Game.instance.addDomOp(this.containerElem, 'style.background-repeat', 'no-repeat');
    }

    setBackgroundPositions(positions) {
        const pos = [];
        for (let position of positions) {
            pos.push(position.x + 'px ' + position.y + 'px');
        }
        Game.instance.addDomOp(this.containerElem, 'style.background-position', pos.join(', '));
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
        Game.instance.addDomChild(parent, this.containerElem);
    }

    setImageData(data) {
        Game.instance.updateDom(this.image, 'src', data);
    }

    getImageElem() {
        return this.image;
    }

    setViewPortOffset(x, y) {
        Game.instance.addDomOp(this.image, 'style.left', x);
        Game.instance.addDomOp(this.image, 'style.right', y);
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
        Game.instance.addDomChild(parent, this.containerElem);
    }

    setViewPortOffset(x, y) {
        const activeElem = this.getActiveElem();
        Game.instance.addDomOp(activeElem, 'style.left', x);
        Game.instance.addDomOp(activeElem, 'style.right', y);
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
        Game.instance.addDomOp(this.getBufferElem(), 'style.display', 'block');
        this.active = this.active === 1 ? 0 : 1;
        Game.instance.addDomOp(this.getBufferElem(), 'style.display', 'none');
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
            Game.instance.addDomChild(parent, this.elem);
        } else {
            Game.instance.addDomChild(parent, this.canvas.elem);
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
    Game,
    Screen,
    ImageResource,
    CanvasContainer,
    BufferedCanvasContainer,
    ImageContainer,
    DivContainer
}