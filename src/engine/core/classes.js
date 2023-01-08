import inst from "./instances"
import { INPUT, PATH, DEGREE_90 } from "core/const"
import {d, isValidResourceId, BitmapPlayer, getConfigFromInput} from "helper/helper"
import { getResourcesAndCallback } from "./resources.js";

class Configurable {

    constructor(input) {
        const config = getConfigFromInput(this.constructor.Config, input);
        config.applyTo(this);
        this.config = inst.game.hasEditor ? config : null;
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
        for (let touchId of inst.game.touchInputs.values()) {
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
            if (this.lastAction === 'pause' || !inst.game.running) {
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

class ResourceRequest {

    constructor(resources, permanent = false) {
        this.resources = resources
        this.permament = permanent
    }

    resolve() {
        if (!this.resources) return
        const { image, audio, json } = this.resources

        if (image) {
            for(const [ id, content ] of Object.entries(image)) {
                inst.RL.addImage(
                    this.permament, id, typeof content === 'function' ? content() : content
                )
            }
        }
        if (audio) {
            for(const [ id, content ] of Object.entries(audio)) {
                inst.RL.addAudio(
                    this.permament, id, typeof content === 'function' ? content() : content
                )
            }
        }
        if (json) {
            for(const [ id, content ] of Object.entries(json)) {
                inst.RL.addJson(
                    this.permament, id, typeof content === 'function' ? content() : content
                )
            }
        }
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

// ########################################
//       S c r e e n
// ########################################

class Screen {

    constructor(id, ...params) {
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

        this.setInitHandler(...params)
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
        if (this.initHandler) {
/*
            const game = inst.game
            const globals = game.globals
*/
            this.state = 'INIT';

            const { loader, callback } = this.initHandler
            loader.resolve()
            // const build = this.initHandler({ game, globals, screen: this })
            inst.RL.load(this.id).then(res => {
                this.hasDependencies = true
            })
            return callback
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

    setInitHandler( ...args ) {
        const { resources, callback } = getResourcesAndCallback( ...args )
        if (!callback) return

        const loader = new ResourceRequest(resources)
        this.initHandler = {
            loader, callback
        }
/*
        obj => {
            loader.resolve()
            const resources = inst.RL.getResources()
            callback({ ...obj, ...resources })
        }

 */
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
    Screen,
    ImageResource,
    AudioResource,
    InputController,
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
    ResourceRequest,
    Gravity,
    SpriteAndTilesCollider,
    ObjectController,
    Configurable
}