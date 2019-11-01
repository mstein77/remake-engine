const TILE = {
    DIM_1x1: 0,
    DIM_2x2: 1,
    DIM_4x4: 2,
    DIM_8x8: 3,
    DIM_16x16: 4,
    DIM_32x32: 5,
    DIM_64x64: 6,
    DIM_128x128: 7,
    DIM_256x256: 8
};

class Game {

    constructor(width, height, config, init) {
        // analyse the element?
        if (Game.instance) {
            throw new Error('There is already a running game instance!');
        }
        Game.instance = this;
        this.width = width;
        this.height = height;
        this.init = init.bind(this);
        this.screens = {};
        this.currentScreen = null;
        this.debug = config.debug === true;
        this.globalKeyHandlers = [];
        this.timers = {};
        this.durations = {};
        this.frames = 0;
        this.zoom = config.zoom;
        this.elems = {};
        this.minFps = 100;
        this.logs = [];
        this.domQueue = [];
        this.sound = true;
        this.audioPlaying = [];

        document.addEventListener('DOMContentLoaded', function(event) {
            Game.instance.boot();
        });
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
        this.log('setZoom', value);
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

    gotoScreen(screenId) {
        this.log('gotoScreen', screenId);
        this.stopAllAudio();
        OCM.clear(); // TODO: clear should remove all children of overlay via DomOp
        this.currentScreen = screenId;
        const screen = this.screens[screenId];
        const callback = screen.init();
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
            this.build(screen.resources);
            screen.setDimension(this.width, this.height);
            screen.render(true);
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
        }
        requestAnimationFrame(this.updateFrame.bind(this));
    }

    setRunning(value) {
        this.log('setRunning', value);
        this.running = value;
        if (value) {
            this.resetFps();
        } else {
            this.addTimerDuration('game');
        }
    }

    boot() {
        this.startTimer('boot');
        this.log('Boot game engine...');
        this.keysDown = {};
        this.keys = {};

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

        document.body.innerHTML =
            '<div style="display: flex; justify-content: center; margin-top: 20px">' +

                '<div id="log-div" style="display: none; width: 400px; overflow: auto; flex-shrink: 1; color: #A0A0A0">' +
                    '<pre id="log" style="float: right; margin: 0">' + this.line() + " Log\n" + this.line() + '</pre>' +
                '</div>' +

                '<div id="screen-div" style="flex-shrink: 0; margin: 0 15px 0px 15px; padding: 0; width: ' + this.width + 'px; height: ' + this.height + 'px"><div id="overlay" style="position: relative; padding: 0px; margin: 0; width: ' + this.width + 'px; height: ' + this.height + 'px"></div>' +
                '</div>' +

                '<div id="debugs" style="display: none; width: 400px; overflow: auto; flex-shrink: 1; color: #A0A0A0"><pre id="d" style="margin: 0"></pre>' +
                '</div>' +
            '</div>' +

            '<div id="offscreen" style="display: none"></div>';

        if (this.zoom !== 1) {
            this.setZoom(this.zoom, true);
        }

        debugElem = document.getElementById('d');
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

// ###############################
//         M a n a g e r
// ###############################

class CanvasManager {

    constructor() {
        this.overlayElem = null;
        this.offscreenElem = null;
        this.canvasElems = [];
    }

    getCanvasElem(dimX, dimY, opaque) {
        const elem = document.createElement('canvas');
        elem.id = 'canvas_' + this.canvasElems.length;
        elem.setAttribute('width', dimX);
        elem.setAttribute('height', dimY);
        elem.setAttribute('style', 'position: absolute; left: 0px; top: 0px');

        const ctx = elem.getContext('2d', {alpha: !opaque});
        ctx.imageSmoothingEnabled = false;
        const canvas = {elem, ctx};
        this.canvasElems.push(canvas);
        return canvas;
    }

    getOverlayElem() {
        if (this.overlayElem === null) {
            this.overlayElem = document.getElementById('overlay');
        }
        return this.overlayElem;
    }

    getOffscreenElem() {
        if (this.offscreenElem === null) {
            this.offscreenElem = document.getElementById('offscreen');
        }
        return this.offscreenElem;
    }

    getContainerElem(viewPortX, viewPortY, offX, offY) {
        const elem = document.createElement('div');
        elem.setAttribute('style', 'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortX + 'px; height: ' + viewPortY + 'px; top: ' + offY + 'px; left: ' + offX + 'px; overflow: hidden');
        return elem;
    }

    getNewOffscreenCanvas(dimX, dimY) {
        return this.getNewCanvas('offscreen', dimX, dimY);
    }

    getNewCanvas(type, dimX, dimY, offX = 0, offY = 0, opaque = false) {
        const id = type + '_' + this.canvasElems.length;
        const parentElem = type === 'offscreen' ? this.getOffscreenElem() : this.getOverlayElem();
        const elem = document.createElement('canvas');
        elem.id = id;
        elem.setAttribute('width', dimX);
        elem.setAttribute('height', dimY);
        if (type === 'overlay') {
            elem.setAttribute('style', 'position: absolute; top: ' + offY + 'px; left: ' + offX + 'px');
        }
        parentElem.appendChild(elem);
        const ctx = elem.getContext('2d', {alpha: !opaque});
        ctx.imageSmoothingEnabled = false;
        const canvas = {id, type, elem, ctx, width: dimX, height: dimY};
        this.canvasElems.push(canvas);

        return canvas;
    }

    discard(canvas) {
        canvas.elem.parentNode.removeChild(canvas.elem);
        canvas.elem = null;
        const index = this.canvasElems.indexOf(canvas);
        if (index !== -1) {
            this.canvasElems.splice(index, 1);
        }
    }

    removeChildren(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    clear() {
        this.canvasElems = [];
        this.removeChildren(this.getOffscreenElem());
        this.removeChildren(this.getOverlayElem());
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
            const container = OCM.getContainerElem(dimX, dimY, offX, offY);
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
        this.dependencies = 0;
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
        const hasAll = (this.dependencies === 0);
        if (this.state === 'INIT' && hasAll) {
            this.state = 'READY';
        }
        return hasAll;
    }

    init() {
        if (this.initHandler !== null) {
            this.state = 'INIT';
            return this.initHandler();
        }
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
            const resources = [];
            for (let item of data) {
                this.dependencies++;
                const resource = new ImageResource(item);
                resources.push(resource);
                resource.getNewDecodePromise().then(() => {this.dependencies--});
            }
            this.resources[id] = resources;
        } else {
            this.dependencies++;
            const resource = new ImageResource(data);
            this.resources[id] = resource;
            resource.getNewDecodePromise().then(() => {this.dependencies--});
        }
    }

    addImageResources(dataObj) {
        for (let id in dataObj) {
            this.addImageResource(id, dataObj[id]);
        }
    }

    setInitHandler(handler) {
        this.initHandler = handler.bind(this);
    }

    addAudio(src) {
        this.audio = src;
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
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
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
        for (data of dataElems) {
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
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
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
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        this.buffers = [
            OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque),
            OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque)
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
        this.canvas = OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque);
        this.elem = null;

        if ((this.dim.x !== this.viewPortDim.x) || (this.dim.y !== this.viewPortDim.y)) {
            this.elem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, offsetX, offsetY);
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

// #############################################
//      P a n e s
// #############################################

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

class CanvasPane {
    constructor() {
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        this.dirty = false;
        return this.container;
    }

    render() {
    }

    getCtx() {
        return this.container.getCanvasCtx();
    }
}

class ColorPane {
    constructor(color) {
        this.color = color;
        this.images = [];
        this.imgPos = [];
        this.dirty = true;
    }

    addImage(image, posX, posY) {
        this.images.push(image);
        this.imgPos.push({x: posX, y: posY});
        this.dirty = false;
    }

    setImagePosition(index, posX, posY) {
        const pos = this.imgPos[index];
        pos.x = posX;
        pos.y = posY;
        this.dirty = true;
    }

    getImagePosition(index) {
        const pos = this.imgPos[index];
        return {x: pos.x, y: pos.y};
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
        this.container = new DivContainer();
        return this.container;
    }

    render() {
        this.container.setBackgroundColor(this.color);
        if (this.images.length > 0) {
            this.container.setBackgroundImages(this.images);
            this.container.setBackgroundPositions(this.imgPos);
        }
        this.dirty = false;
    }
}

/**
 * TODO:
 *   - Multi-Font
 *   - Monochrome + Color
 *   - CaseInsensitive
 *   - Scrolling (Buffering?)
 *   - Proper Dirty-Handling (update)
 */
class TextPane {

    constructor(font) {
        this.font = font;
        this.blocks = {};
        this.lineSpacing = 0;
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    drawTextBlockToCtx(ctx, block) {
        let parts = block.text.split("\n");
        let y = 0;
        for (let part of parts) {
            this.font.drawTextLine(ctx, part, 0, y);
            y += this.font.height + block.lineSpacing;
        }
    }

    addTextBlock(id, posX, posY, text, lineSpacing = 0) {
        let width = 0;
        let height = 0;
        const lines = text.split('\n');
        for (let line of lines) {
            width = Math.max(width, line.length);
            height += this.font.height;
        }
        width *= this.font.width;
        height += lineSpacing * lines.length;

        const canvas = OCM.getNewOffscreenCanvas(width, height);
        const block = {x: posX, y: posY, filter: '', height, width, text, lineSpacing, canvas};
        this.drawTextBlockToCtx(canvas.ctx, block);
        this.blocks[id] = block;
    }

    setTextBlockFilter(id, filter) {
        this.blocks[id].filter = filter;
        this.dirty = true;
    }

    updateTextBlock(id, text) {
        const block = this.blocks[id];
        block.text = text;
        block.canvas = OCM.getNewOffscreenCanvas(block.width, block.height);
        this.drawTextBlockToCtx(block.canvas.ctx, block);
        this.dirty = true;
    }

    render() {
        const ctx = this.container.getCanvasCtx();
        ctx.clearRect(0, 0, this.paneDim.x, this.paneDim.y);
        for (let id in this.blocks) {
            const block = this.blocks[id];
            if (block.filter === '') {
                ctx.drawImage(block.canvas.elem, 0, 0, block.width, block.height, block.x, block.y, block.width, block.height);
            } else {
                const result = filterer.getCanvasWithFiltersApplied(block.filter, block.canvas, 0, 0, block.width, block.height);
                ctx.drawImage(result[0].elem, 0, 0, block.width, block.height, block.x, block.y, block.width, block.height);
            }
        }
        this.dirty = false;
    }

    static padStart(value, char, len) {
        value = '' + value;
        while (value.length < len) {
            value = char + value;
        }
        return value;
    }
}

/**
 * TODO:
 *   - Y-Scrolling
 *   - Endless-Scrolling
 *   - Events
 *   - Rastering
 *   - Oversize/Scrolling
 *   - Z-Ordering / MultiBitmaps
 */
class BitmapScrollPane {

    constructor(spriteSheet, axis, map, min, max) {
        this.spriteSheet = spriteSheet;
        this.axis = axis;
        this.min = min;
        this.max = max;
        this.maxState = 0;
        this.pos = 0;
        this.map = map;
        this.state = -1;
        this.maxSpeed = 2;
        this.bufferSpace = 32;
        this.scrollPos = 0;
        this.isScrolling = false;
        this.dirty = true;
        this.bufferPos = 0;
        this.scrollJump = 0;
        this.scrollPos = 0;
        this.scrollDim = (axis === 'X') ? 'x' : 'y';
        this.offsetDim = (axis === 'X') ? 'y' : 'x';
        for (let entry of map) {
            entry.dim = spriteSheet.getSpriteDim(entry.bitmap);
        }
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {x: viewPortDimX, y: viewPortDimY};
        this.paneDim = {
            x: viewPortDimX + (this.axis === 'X' ? 3 * this.bufferSpace : 0),
            y: viewPortDimY + (this.axis !== 'X' ? 3 * this.bufferSpace : 0)
        };
        this.scrollPosOffset = {
            x: (this.axis === 'X' ? this.bufferSpace : 0),
            y: (this.axis !== 'X' ? this.bufferSpace : 0)
        };
        this.stateSizes = [];
        const maxSize = (this.axis === 'X') ? this.paneDim.x : this.paneDim.y;
        this.maxState = Math.ceil(this.bufferSpace / this.maxSpeed);
        let copySize = Math.ceil(maxSize / this.maxState);
        let size = 0;
        while (size < maxSize) {
            const newSize = size + copySize;
            this.stateSizes.push(newSize > maxSize ? newSize - maxSize : copySize);
            size = newSize;
        }
        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    getBitmapsInRange(minPos, maxPos) {
        let maxIndex = this.map.length;
        const result = [];
        for (let index = 0; index < maxIndex; index++) {
            const start = this.map[index][this.scrollDim];
            if (start >= maxPos) {
                break;
            }
            const width = this.map[index].dim[this.scrollDim];
            const end = start + width;
            if ((minPos <= start && start < maxPos) ||
                (minPos <= end && end < maxPos) ||
                (minPos >= start && end >= maxPos)
            ) {
                result.push({
                    index,
                    width: Math.min(end, maxPos) - Math.max(start, minPos),
                    offset: Math.max(start, minPos) - start
                });
            }
        }
        return result;
    }

    renderRange(ctx, startPos, endPos, offX = 0, offY = 0) {
        const draws = this.getBitmapsInRange(startPos, endPos);
        ctx.clearRect(
            offX, offY,
            this.axis === 'X' ? endPos - startPos : this.viewPortDim.x,
            this.axis !== 'X' ? endPos - startPos : this.viewPortDim.y
        );
        for (let draw of draws) {
            const bitmap = this.map[draw.index];
            const posX = this.axis === 'X' ? (bitmap.x + draw.offset - this.bufferPos) : bitmap.x;
            const posY = this.axis === 'X' ? bitmap.y : (bitmap.y + draw.offset - this.bufferPos);
            const width = this.axis === 'X' ? draw.width : bitmap.dim.x;
            const height = this.axis !== 'X' ? draw.height : bitmap.dim.y;
            this.spriteSheet.drawSpritePart(
                ctx, bitmap.bitmap,
                posX, posY,
                width, height,
                this.axis === 'X' ? draw.offset : 0,
                this.axis !== 'X' ? draw.offset : 0
            );
        }
    }

    switchBuffer() {
        this.pos = this.bufferPos;
        this.scrollPos += this.scrollJump;
        this.buffers.switchBuffer();
        this.state = 0;
    }

    render() {
        const target = this.buffers.getBufferCtx();
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderRange(target, this.bufferPos, this.bufferPos + this.paneDim.x, 0, 0);
                this.switchBuffer();
                break;

            default:
                if (this.isScrolling) {
                    const offset = (this.state - 1) * this.stateSizes[0];
                    const width = this.stateSizes[this.state - 1];
                    this.renderRange(target, this.bufferPos + offset, this.bufferPos + offset + width, offset, 0);
                    if (this.state === this.maxState) {
                        this.switchBuffer();
                    } else {
                        this.state++;
                    }
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const scrollPosX = (this.axis === 'X' ? this.scrollPos : 0);
        const scrollPosY = (this.axis !== 'X' ? this.scrollPos : 0);

        const posLeft = -(this.scrollPosOffset.x + scrollPosX) + 'px';
        const posTop = -(this.scrollPosOffset.y + scrollPosY) + 'px';

        if (elemStyle.left !== posLeft) {
            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }

    }

    scrollBy(sx, sy) {
        if (Math.max(this.maxSpeed, (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))) > this.maxSpeed) {
            throw Error('Unallowed scroll speed ' + (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))  + ' above ' + this.maxSpeed);
        }
        this.isScrolling = false;
        const oldPos = this.scrollPos;
        if (sx !== 0) {
            if (this.axis === 'X') {
                this.scrollPos += sx;
            }
        }
        if (sy !== 0) {
            if (this.axis !== 'X') {
                this.scrollPos += sy;
            }
        }
        if (this.pos + this.scrollPos > this.max) {
            this.scrollPos = this.max - this.pos;
        } else if (this.pos + this.scrollPos < this.min - this.bufferSpace) {
            this.scrollPos = this.min - this.pos - this.bufferSpace;
        }
        const scrolled = {x: (this.axis === 'X' ? this.scrollPos - oldPos : 0), y: (this.axis !== 'X' ? this.scrollPos - oldPos : 0)};
        scrolled.unscrolled = {x: sx - scrolled.x, y: sy - scrolled.y};

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        if (this.scrollPos >= 0 && this.scrollPos < this.bufferSpace) {
            this.state = 0;
        } else {
            if (this.state === 0)  {
                let startCopy = true;
                if (this.scrollPos < 0) {
                    this.bufferPos = this.pos - this.bufferSpace;
                    this.scrollJump = this.bufferSpace;
                    startCopy = (this.bufferPos > this.min);
                } else {
                    this.bufferPos = this.pos + this.bufferSpace;
                    this.scrollJump = -this.bufferSpace;
                }
                if (startCopy) {
                    this.state = 1;
                }
            }
        }
        return scrolled;
    }
}

/**
 * TODO:
 *   - Filters
 *   - Events
 *   - Animated Tiles
 */
class TilesPane {

    constructor(tilesMap, config = {}) {

        this.tilesMap = tilesMap;

        this.endless = {
            x: (config.endless && config.endless.x === true),
            y: (config.endless && config.endless.y === true)
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.mapTilePos = {
            x: 0,
            y: 0
        };

    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };

        this.canvasTiles = {
            x: viewPortTiles.x + 1,
            y: viewPortTiles.y + 1
        };
        this.paneDim = {
            x: this.canvasTiles.x * this.tilesMap.tileSize,
            y: this.canvasTiles.y * this.tilesMap.tileSize
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollStop = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };
        this.dirty = true;
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.container;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
    }

    render() {
        const target = this.container.getCanvasCtx();
        this.tilesMap.render(
            target,
            {
                x: 0,
                y: 0
            },
            {
                width: this.canvasTiles.x,
                height: this.canvasTiles.y,
                pos: {
                    x: this.mapTilePos.x,
                    y: this.mapTilePos.y
                },
                endless: this.endless
            }
        );

        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

        this.scrollPos.x += Sx;
        if (this.scrollStop.left !== null) {
            this.scrollPos.x = Math.max(this.scrollPos.x, this.scrollStop.left);
        }
        if (this.scrollStop.right !== null) {
            this.scrollPos.x = Math.min(this.scrollPos.x, this.scrollStop.right);
        }
        if (this.scrollPos.x <= -this.tilesMap.tileSize) {
            this.scrollPos.x = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.x >= (this.paneDim.x - this.viewPortDim.x)) {
            this.scrollPos.x = this.paneDim.x - this.viewPortDim.x;
        }

        this.scrollPos.y += Sy;
        if (this.scrollStop.top !== null) {
            this.scrollPos.y = Math.max(this.scrollPos.y, this.scrollStop.top);
        }
        if (this.scrollStop.bottom !== null) {
            this.scrollPos.y = Math.min(this.scrollPos.y, this.scrollStop.bottom);
        }

        if (this.scrollPos.y <= -this.tilesMap.tileSize) {
            this.scrollPos.y = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.y >= (this.paneDim.y - this.viewPortDim.y)) {
            this.scrollPos.y = this.paneDim.y - this.viewPortDim.y;
        }

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        if (scrolled.x === 0 && scrolled.y === 0) {
            return scrolled;
        }

        const mapVector = {
            x: 0, y: 0
        };
        if (this.scrollPos.x < 0) {
            mapVector.x = -1;
            this.scrollPos.x += this.tilesMap.tileSize;
        } else if (this.scrollPos.x >= this.tilesMap.tileSize) {
            mapVector.x = 1;
            this.scrollPos.x -= this.tilesMap.tileSize;
        }
        if (this.scrollPos.y < 0) {
            mapVector.y = -1;
            this.scrollPos.y += this.tilesMap.tileSize;
        } else if (this.scrollPos.y >= this.tilesMap.tileSize) {
            mapVector.y = 1;
            this.scrollPos.y -= this.tilesMap.tileSize;
        }

        if (mapVector.x !== 0 || mapVector.y !== 0) {
            this.mapTilePos.x += mapVector.x;
            this.mapTilePos.y += mapVector.y;

            // set scroll blocks
            if (!this.endless.x) {
                this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
                this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
            }
            if (!this.endless.y) {
                this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
                this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
            }
            this.dirty = true;
        }

        const elemStyle = this.container.getCanvasElem().style;
        const posLeft = -this.scrollPos.x + 'px';
        const posTop = -this.scrollPos.y + 'px';

        if (elemStyle.left !== posLeft) {
            elemStyle.left = posLeft;
//            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            elemStyle.top = posTop;
//            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }

        return scrolled;
    }
}


/**
 * TODO:
 *   - Filters
 *   - Events
 */
class BufferedTilesPane {

    constructor(tilesMap, config) {
        this.tilesMap = tilesMap;
        this.defaultTile = null;
        this.state = -1;
        // mandatory
        this.maxSpeed = config.maxSpeed;
        this.maxState = Math.floor(this.tilesMap.tileSize / this.maxSpeed);
        this.endless = {
            x: (config.endless !== undefined && config.endless.x !== undefined) ? config.endless.x : false,
            y: (config.endless !== undefined && config.endless.y !== undefined) ? config.endless.y : false,
        };
        // scrolling is always relative to the scrollPosOffset (=top left corner of the neutral quadrant)
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.mapTilePos = {
            x: 0,
            y: 0
        };
        this.dirty = true;
    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };

        // 3 tiles are required in each direction for scrolling around the neutral quadrant
        this.canvasTiles = {
            x: viewPortTiles.x + 3,
            y: viewPortTiles.y + 3
        };
        this.paneDim = {
            x: (this.canvasTiles.x + 2) * this.tilesMap.tileSize,
            y: (this.canvasTiles.y + 2) * this.tilesMap.tileSize
        };

        this.scrollAreaDim = {
            x: this.paneDim.x - 2 * this.tilesMap.tileSize,
            y: this.paneDim.y - 2 * this.tilesMap.tileSize
        };

        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.scrollStop = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };

        // this is where the scrollArea starts
        this.canvasTileOffset = {
            x: 1,
            y: 1
        };

        this.bufferTileOffset = {
            x: 1,
            y: 1
        };

        this.tileMoveVector = {
            x: 0,
            y: 0
        };

        this.scrollPosOffset = {
            x: (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize,
            y: (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize
        };

        this.scrollAreaTileRows = Math.ceil(this.scrollAreaDim.y / this.tilesMap.tileSize);
        const tileSteps = this.scrollAreaTileRows / (this.maxState - 1);

        this.copyRowsInState = [];
        let sum = 0;
        let remRows = viewPortTiles.y + 3;
        while(remRows > 0) {
            const pos = Math.round(tileSteps * (this.copyRowsInState.length + 1));
            const rows = pos - sum;
            this.copyRowsInState.push(rows);
            sum += rows;
            remRows -= rows;
        }
        this.bufferTilePos = {
            x: this.mapTilePos.x,
            y: this.mapTilePos.y
        };
        this.copiedHeight = 0;

        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    hasBufferSwitchInNextFrame() {
        return (this.state === -1 || this.state === this.maxState);
    }

    replaceTile(x, y, newTile) {
        this.tilesMap.replaceTile(x, y, newTile);
        this.renderTile(x, y, this.state === -1, this.hasBufferSwitchInNextFrame());
    }

    updateAnimatedTiles() {
        const animTiles = this.tilesMap.getAnimatedTiles(this.mapTilePos.x, this.mapTilePos.y, this.canvasTiles.x, this.canvasTiles.y);
        for (let tilePos of animTiles) {
            this.renderTile(tilePos[0], tilePos[1], this.hasBufferSwitchInNextFrame());
        }
    }

    getTilesInXLine(y, x1, x2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = x1 + this.scrollPos.x;
        const realEnd = x2 + this.scrollPos.x;
        const relPos = {
            x1: realStart >> this.tilesMap.tileBits,
            x2: realEnd >> this.tilesMap.tileBits,
            y: (y + this.scrollPos.y) >> this.tilesMap.tileBits
        };
        let touchStart = realStart % this.tilesMap.tileSize;
        touchStart = (touchStart === 0 ? this.tilesMap.tileSize : this.tilesMap.tileSize - touchStart);
        let touchEnd = realEnd % this.tilesMap.tileSize;
        touchEnd = (touchEnd === 0 ? this.tilesMap.tileSize : touchEnd);

        const mapY = origin.y + relPos.y;
        const start = origin.x + relPos.x1;
        const end = origin.x + relPos.x2;
        const lineTiles = this.tilesMap.getTilesAtXLine(mapY, start, end);
        const result = [];
        let i = 0;
        for (let x = start; x <= end; x++) {
            let touch = this.tilesMap.tileSize;
            if (x === start) {
                touch = touchStart;
            } else if (x === end) {
                touch = touchEnd;
            }
            result.push({x, y: mapY, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    getTilesInYLine(x, y1, y2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = y1 + this.scrollPos.y;
        const realEnd = y2 + this.scrollPos.y;
        const relPos = {
            x: (x + this.scrollPos.x) >> this.tilesMap.tileBits,
            y1: realStart >> this.tilesMap.tileBits,
            y2: realEnd >> this.tilesMap.tileBits
        };
        let touchStart = realStart % this.tilesMap.tileSize;
        touchStart = (touchStart === 0 ? this.tilesMap.tileSize : this.tilesMap.tileSize - touchStart);
        let touchEnd = realEnd % this.tilesMap.tileSize;
        touchEnd = (touchEnd === 0 ? this.tilesMap.tileSize : touchEnd);

        const mapX = origin.x + relPos.x;
        const start = origin.y + relPos.y1;
        const end = origin.y + relPos.y2;
        const lineTiles = this.tilesMap.getTilesAtYLine(mapX, start, end);
        const result = [];
        let i = 0;
        for (let y = start; y <= end; y++) {
            let touch = this.tilesMap.tileSize;
            if (y === start) {
                touch = touchStart;
            } else if (y === end) {
                touch = touchEnd;
            }
            result.push({x: mapX, y, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
        this.state = -1;
        this.dirty = true;
    }

    renderAll(target) {
        this.tilesMap.render(
            target,
            {
                x: this.canvasTileOffset.x * this.tilesMap.tileSize,
                y: this.canvasTileOffset.y * this.tilesMap.tileSize
            },
            {
                width: this.canvasTiles.x,
                height: this.canvasTiles.y,
                pos: {
                    x: this.mapTilePos.x,
                    y: this.mapTilePos.y
                },
                endless: this.endless
            }
        );
    }

    renderTile(x, y, onlyInBuffer = false) {
        const targets = [];
        if (!onlyInBuffer) {
            targets.push({
                ctx: this.buffers.getActiveCtx(),
                offX: this.canvasTileOffset.x + x - this.mapTilePos.x,
                offY: this.canvasTileOffset.y + y - this.mapTilePos.y
            });
        };
        if (this.state > 0) {
            targets.push(
                {
                    ctx: this.buffers.getBufferCtx(),
                    offX: this.bufferTileOffset.x + x  - this.mapTilePos.x,
                    offY: this.bufferTileOffset.y + y - this.mapTilePos.y
                }
            );
        }

        for(let target of targets) {
            this.tilesMap.render(
                target.ctx,
                {
                    x: target.offX * this.tilesMap.tileSize,
                    y: target.offY * this.tilesMap.tileSize
                },
                {
                    width: 1,
                    height: 1,
                    pos: {
                        x,
                        y
                    },
                    endless: this.endless
                }
            );
        }
    }

    copyViewRows(source, target) {
        const copyRows = this.copyRowsInState[this.state - 1];
        if (copyRows > 0) {
            const copyHeight = copyRows * this.tilesMap.tileSize;
            const srcImg = source.getImageData(
                this.canvasTileOffset.x * this.tilesMap.tileSize,
                this.copiedHeight + (this.canvasTileOffset.y * this.tilesMap.tileSize),
                this.scrollAreaDim.x,
                copyHeight
            );
            target.putImageData(srcImg,
                this.bufferTileOffset.x * this.tilesMap.tileSize,
                this.bufferTileOffset.y * this.tilesMap.tileSize + this.copiedHeight
            );
            this.copiedHeight += copyHeight;
        }
    }

    renderNewTiles(target) {
        let addLen = 0;
        let offX = 0;

        if (this.tileMoveVector.x !== 0) {
            if (this.tileMoveVector.x < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: ((this.bufferTileOffset.x - 1) * this.tilesMap.tileSize),
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize)
                    },
                    {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: this.bufferTilePos.x - 1,
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
                offX -= 1;
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: this.bufferTileOffset.x * this.tilesMap.tileSize + this.scrollAreaDim.x,
                        y: this.bufferTileOffset.y * this.tilesMap.tileSize,
                    }, {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: (this.bufferTilePos.x + this.canvasTiles.x),
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
            }
            addLen++;
        }

        if (this.tileMoveVector.y !== 0) {
            if (this.tileMoveVector.y < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y - 1) * this.tilesMap.tileSize
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y - 1
                        },
                        endless: this.endless
                    }
                );
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize) + this.scrollAreaDim.y
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y + this.canvasTiles.y
                        },
                        endless: this.endless
                    }
                );
            }
        }
        this.bufferTilePos.x += this.tileMoveVector.x;
        this.bufferTilePos.y += this.tileMoveVector.y;
    }

    switchBuffer() {

        this.scrollPos.x -= this.tileMoveVector.x * this.tilesMap.tileSize;
        this.scrollPos.y -= this.tileMoveVector.y * this.tilesMap.tileSize;

        this.canvasTileOffset.x = this.bufferTileOffset.x + this.tileMoveVector.x;
        this.canvasTileOffset.y = this.bufferTileOffset.y + this.tileMoveVector.y;

        this.scrollPosOffset.x = (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize;
        this.scrollPosOffset.y = (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize;

        this.mapTilePos.x = this.bufferTilePos.x;
        this.mapTilePos.y = this.bufferTilePos.y;
        this.copiedHeight = 0;

        // set scroll blocks
        if (!this.endless.x) {
            this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
            this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
        }
        if (!this.endless.y) {
            this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
            this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
        }

        this.buffers.switchBuffer();
        this.state = 0;
    }

    getQuadrantMoveVector(fromQuadrant, toQuadrant) {
        const relDist = toQuadrant - fromQuadrant;
        const dist = Math.abs(relDist);
        switch(dist) {
            case 0:
                return {x: 0, y: 0};

            case 1:
                return {x: relDist, y: 0};

            case 2:
                if (relDist < 0) {
                    return {x: 1, y: -1};
                }
                return {x: -1, y: 1};

            case 3:
                return {x: 0, y: (relDist < 0 ? -1 : 1)};

            case 4:
                if (relDist < 0) {
                    return {x: -1, y: -1};
                }
                return {x: 1, y: 1};

            default:
                throw 'Quadrant distance ' + dist + ' not supported';
        }
    }

    getCurrentQuadrant() {
        const qx = Math.floor((this.scrollPos.x + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        const qy = Math.floor((this.scrollPos.y + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        return qy * 3 + qx;
    }

    scrollBy(Sx, Sy) {
        if (Math.max(this.maxSpeed, Math.abs(Sx), Math.abs(Sy)) > this.maxSpeed) {
            throw Error('Unallowed scroll speed above ' + this.maxSpeed);
        }
        const oldQuad = this.getCurrentQuadrant();

        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

        this.scrollPos.x += Sx;
        if (this.scrollStop.left !== null) {
            this.scrollPos.x = Math.max(this.scrollPos.x, this.scrollStop.left);
        }
        if (this.scrollStop.right !== null) {
            this.scrollPos.x = Math.min(this.scrollPos.x, this.scrollStop.right);
        }
        if (this.scrollPos.x <= -this.tilesMap.tileSize) {
            this.scrollPos.x = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.x >= (this.paneDim.x - this.viewPortDim.x)) {
            this.scrollPos.x = this.paneDim.x - this.viewPortDim.x;
        }

        this.scrollPos.y += Sy;
        if (this.scrollStop.top !== null) {
            this.scrollPos.y = Math.max(this.scrollPos.y, this.scrollStop.top);
        }
        if (this.scrollStop.bottom !== null) {
            this.scrollPos.y = Math.min(this.scrollPos.y, this.scrollStop.bottom);
        }

        if (this.scrollPos.y <= -this.tilesMap.tileSize) {
            this.scrollPos.y = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.y >= (this.paneDim.y - this.viewPortDim.y)) {
            this.scrollPos.y = this.paneDim.y - this.viewPortDim.y;
        }

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        const newQuad = this.getCurrentQuadrant();
        if (oldQuad === newQuad) {
            return scrolled;
        }

        if (newQuad === 4) {
            this.state = 0;
        } else {
            const moveVector = this.getQuadrantMoveVector(oldQuad, newQuad);
            if (this.state === 0)  {
                this.bufferTilePos.x = this.mapTilePos.x;
                if (this.endless.x) {
                    if (this.mapTilePos.x === -this.canvasTiles.x) {
                        this.bufferTilePos.x += this.tilesMap.mapTiles.x;
                    } else if (this.mapTilePos.x === this.tilesMap.mapTiles.x) {
                        this.bufferTilePos.x = 0;
                    }

                }
                this.bufferTilePos.y = this.mapTilePos.y;
                if (this.endless.y) {
                    if (this.mapTilePos.y === -this.canvasTiles.y) {
                        this.bufferTilePos.y += this.tilesMap.mapTiles.y;
                    } else if (this.mapTilePos.y === this.tilesMap.mapTiles.y) {
                        this.bufferTilePos.y = 0;
                    }
                }
                this.tileMoveVector.x = moveVector.x;
                this.tileMoveVector.y = moveVector.y;
                this.bufferTileOffset.x = 1 - moveVector.x;
                this.bufferTileOffset.y = 1 - moveVector.y;
                this.copiedHeight = 0;
                this.state = 1;
            } else {
                this.tileMoveVector.x += moveVector.x;
                this.tileMoveVector.y += moveVector.y;
            }
        }
        return scrolled;
    }

    render() {

        const target = this.buffers.getBufferCtx();
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderAll(target);
                this.switchBuffer();
                break;

            case this.maxState:
                if (this.isScrolling) {
                    this.renderNewTiles(target);
                    this.switchBuffer();
                }
                break;

            default:
                if (this.isScrolling) {
                    this.copyViewRows(this.buffers.getActiveCtx(), target);
                    this.state++;
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const posLeft = -(this.scrollPosOffset.x + this.scrollPos.x) + 'px';
        const posTop = -(this.scrollPosOffset.y + this.scrollPos.y) + 'px';

        if (elemStyle.left !== posLeft) {
            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }
    }
}

/**
 * TODO:
 *  - addFilter, removeFilter, clearFilter
 */
class SpritePane {

    constructor(spriteSheet) {
        this.spriteSheet = spriteSheet;
        this.sprites = {};
        this.actorId = null;
        this.groups = {};
        this.bufferClearRects = {
            0: [],
            1: []
        };
        this.uid = 0;
        this.zOrdering = false;
        this.attachDefault = null;
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.totalPixels = viewPortDimX * viewPortDimY;
        this.pixelLimit = Math.round(this.totalPixels * 0.25);

        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.container = new BufferedCanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    setAttachDefault(value) {
        this.attachDefault = value;
    }

    setActorId(id) {
        if (!this.sprites[id]) {
            throw Error('Sprite Actor "' + id + "' not found!");
        }
        this.actorId = id;
    }

    getActorId() {
        return this.actorId;
    }

    hasSprite(id) {
        return (this.sprites[id] !== undefined);
    }

    addSprite(id, name,  x = 0, y = 0, z = 0) {
        if (!this.zOrdering && z !== 0) {
            this.zOrdering = true;
        }
        const sprite = {id, x, y, z, animSpeed: 1, filterDuration: -1, attached: this.attachDefault, filters: '', hidden: false};
        this.sprites[id] = this.initSpriteObj(sprite, name);
        this.dirty = true;
    }

    hideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === false;
            }
            sprite.hidden = true;
        }
    }

    unhideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === true;
            }
            sprite.hidden = false;
        }
    }

    toggleSpriteVisiblity(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.hidden = !sprite.hidden;
            this.dirty = true;
        }
    }

    isHidden(id) {
        const sprite = this.getSprite(id);
        return sprite.hidden;
    }

    hasSprite(id) {
        return !(this.sprites[id] === undefined);
    }

    setAnimationSpeed(id, speed) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.animSpeed = speed;
            if (sprite.isAnimation) {
                sprite.animation.setSpeed(speed);
            }
        }
    }

    getSpritesById(id) {
        return id[0] === ':' ? this.getGroupSprites(id) : [this.getSprite(id)];
    }

    getSprite(id) {
        return this.sprites[id];
    }

    initSpriteObj(obj, sheetId) {
        const isAni = sheetId !== null && this.spriteSheet.isAnimation(sheetId);
        obj.name = sheetId;
        obj.isAnimation = isAni;
        obj.dim = this.spriteSheet.getSpriteDim(sheetId);
        if (isAni) {
            if (obj.animation === undefined) {
                obj.animation = new PlayerProxy();
            }
            this.spriteSheet.loadAnimationToProxy(sheetId, obj.animation);
            obj.animation.setSpeed(obj.animSpeed);
        }
        return obj;
    }

    assignSprite(id, sheetId) {
        const sprite = this.sprites[id];
        this.initSpriteObj(sprite, sheetId);
        this.dirty = true;
    }

    updateFrames() {
        const synced = [];
        for (let id in this.sprites) {
            const sprite = this.sprites[id];
            if (sprite.filterDuration !== -1) {
                if (sprite.filterDuration === 0) {
                    sprite.filters = '';
                    if (!sprite.hidden) {
                        this.dirty = true;
                    }
                }
                sprite.filterDuration--;
            }
            if (sprite.isAnimation) {
                const ani = sprite.animation;
                if (ani.isSynchronous()) {
                    if (synced.indexOf(sprite.name) === -1) {
                        ani.nextStep();
                        synced.push(sprite.name);
                    } else {
                        continue;
                    }
                } else {
                    ani.nextStep();
                }
                if (!this.dirty && ani.isDirty()) {
                    this.dirty = true;
                }
            }
        }
    }

    getSpritePos(id) {
        const sprite = this.sprites[id];
        return {id, x: sprite.x, y: sprite.y, z: sprite.z, dim: sprite.dim};
    }

    getAllSpritePos(match) {
        const result = [];
        const matchLen = match.length;
        for(let sprite in this.sprites) {
            if (sprite.substr(0, matchLen) === match) {
                result.push(this.sprites[sprite]);
            }
        }
        return result;
    }

    getUid(name) {
        this.uid++;
        return name + '.' + this.uid;
    }

    removeSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            delete this.sprites[sprite.id];
            this.dirty = true;
        }
    }

    moveSpritesAttachedTo(attached, moveX, moveY) {
        for(let id in this.sprites) {
            const sprite = this.sprites[id];
            if (attached === sprite.attached) {
                this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
            }
        }
    }

    attachSpriteTo(id, attach) {
        const sprites = this.getSpritesById(id);
        for (let spriteId of sprites) {
            const sprite = this.getSprite(spriteId);
            sprite.attached = attach;
        }
    }

    setSpritePos(id, x, y, z = null) {
        const sprite = this.sprites[id];
        if (!this.dirty) {
            this.dirty = (sprite.x !== x || sprite.y !== y);
        }
        sprite.x = x;
        sprite.y = y;
        if (z !== null) {
            this.zOrdering = true;
            if (!this.dirty) {
                this.dirty = sprite.z !== z;
            }
            sprite.z = z;
        }
    }

    addGroup(id, spriteIds) {
        this.groups[':' + id] = spriteIds;
    }

    deleteGroup(id) {
        delete this.groups[':' + id];
    }

    getGroupSprites(id) {
        const result = [];
        if (this.groups[id]) {
            for (let sprite of this.groups[id]) {
                if (this.hasSprite(sprite)) {
                    result.push(this.getSprite(sprite));
                }
            }
        }
        return result;
    }

    setSpriteFilters(id, filters, duration = -1) {

        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.filters = filters;
            sprite.filterDuration = duration;
        }
        this.dirty = true;
    }

    moveSprite(id, moveX, moveY) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
        }
    }

    render() {
        const target = this.container.getBufferCtx();
        const clearRects = this.bufferClearRects[this.container.getActiveIndex()];
        if (clearRects.length === 0) {
            target.clearRect(0, 0, this.paneDim.x, this.paneDim.y);
        } else {
            for (let rect of clearRects) {
                target.clearRect(rect.x, rect.y, rect.width, rect.height);
            }
        }

        const drawRects = [];
        let pixels = 0;

        const ids = Object.keys(this.sprites);
        if (this.zOrdering) {
            ids.sort((id1, id2) => {
                const z1 = this.sprites[id1].z;
                const z2 = this.sprites[id2].z;
                if (z1 < z2) {
                    return -1;
                } else if (z1 > z2) {
                    return 1;
                }
                return 0;
            });
        }

        for (let id of ids) {
            const sprite = this.sprites[id];
            if (sprite.name !== null && !sprite.hidden && sprite.x < this.paneDim.x && sprite.x > -sprite.dim.x && sprite.y < this.paneDim.y && sprite.y > -sprite.dim.y) {
                let clearRect;
                if (sprite.isAnimation) {
                    const frameSprite = sprite.animation.getFrame();
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, frameSprite.id, sprite.filters, sprite.x, sprite.y, frameSprite.padding.x, frameSprite.padding.y, sprite.filters
                    );
                } else {
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, sprite.name, sprite.filters, sprite.x, sprite.y, 0, 0, sprite.filters
                    );
                }
                drawRects.push(clearRect);
                pixels += clearRect.width * clearRect.height;
            }
        }
        this.bufferClearRects[this.container.getActiveIndex()] = (pixels <= this.pixelLimit) ? drawRects : [];
        this.container.switchBuffer();
        this.dirty = false;
    }
}

class PatternPane2 {

    constructor(pattern, repeat) {
        this.canvas = null;
        this.pattern = pattern;
        this.repeat = repeat;
        this.repeatX = ([null, '', 'repeat', 'repeat-x'].indexOf(repeat) !== -1);
        this.repeatY = ([null, '', 'repeat', 'repeat-y'].indexOf(repeat) !== -1);
    }

    init(viewPortDimX, viewPortDimY) {
        this.patternDim = {
            x: this.pattern.width,
            y: this.pattern.height
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.paneDim = {
            x: this.repeatX ? viewPortDimX + this.patternDim.x - 1 : viewPortDimX,
            y: this.repeatY ? viewPortDimY + this.patternDim.y - 1 : viewPortDimY
        };
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y, this.opaque);
        return this.container;
    }

    render() {
        const target = this.container.getCanvasCtx();
        target.fillStyle = target.createPattern(this.pattern, this.repeat);
        target.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        if (this.repeatX) {
            this.scrollPos.x += Sx;
        }
        if (this.scrollPos.x < 0) {
            this.scrollPos.x += this.patternDim.x;
        } else if (this.scrollPos.x >= this.patternDim.x) {
            this.scrollPos.x -= this.patternDim.x;
        }
        if (this.repeatY) {
            this.scrollPos.y += Sy;
        }
        if (this.scrollPos.y < 0) {
            this.scrollPos.y += this.patternDim.y;
        } else if (this.scrollPos.y >= this.patternDim.y) {
            this.scrollPos.y -= this.patternDim.y;
        }
        const elem = this.container.getCanvasElem();
        if (elem) {
            if (Sx !== 0) {
                Game.instance.addDomOp(elem, 'style.left', -this.scrollPos.x);
            }
            if (Sy !== 0) {
                Game.instance.addDomOp(elem, 'style.top', -this.scrollPos.y);
            }
        }
    }
}


class PatternPane {

    constructor(pattern, repeat) {
        this.pattern = pattern.getImage();
        this.repeat = repeat;
        this.repeatX = ([null, '', 'repeat', 'repeat-x'].indexOf(repeat) !== -1);
        this.repeatY = ([null, '', 'repeat', 'repeat-y'].indexOf(repeat) !== -1);
    }

    init(viewPortDimX, viewPortDimY) {
        this.patternDim = {
            x: this.pattern.width,
            y: this.pattern.height
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.paneDim = {
            x: this.repeatX ? viewPortDimX + this.patternDim.x - 1 : viewPortDimX,
            y: this.repeatY ? viewPortDimY + this.patternDim.y - 1 : viewPortDimY
        };

        this.container = new ImageContainer(this.paneDim.x, this.paneDim.y);
        const tmpCanvas = OCM.getNewOffscreenCanvas(this.paneDim.x, this.paneDim.y);
        tmpCanvas.ctx.fillStyle = tmpCanvas.ctx.createPattern(this.pattern, this.repeat);
        tmpCanvas.ctx.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
        this.container.getImageElem().src = tmpCanvas.elem.toDataURL('image/png');
        OCM.discard(tmpCanvas);
        return this.container;
    }

    render() {
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        if (this.repeatX) {
            this.scrollPos.x += Sx;
        }
        if (this.scrollPos.x < 0) {
            this.scrollPos.x += this.patternDim.x;
        } else if (this.scrollPos.x >= this.patternDim.x) {
            this.scrollPos.x -= this.patternDim.x;
        }
        if (this.repeatY) {
            this.scrollPos.y += Sy;
        }
        if (this.scrollPos.y < 0) {
            this.scrollPos.y += this.patternDim.y;
        } else if (this.scrollPos.y >= this.patternDim.y) {
            this.scrollPos.y -= this.patternDim.y;
        }
        const elem = this.container.getImageElem();
        if (elem) {
            if (Sx !== 0) {
                Game.instance.addDomOp(elem, 'style.left', -this.scrollPos.x);
            }
            if (Sy !== 0) {
                Game.instance.addDomOp(elem, 'style.top', -this.scrollPos.y);
            }
        }
        return {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: 0,
                y: 0
            }
        };
    }
}


class LinearGradientPane2 {

    constructor(axis, colorStops) {
        if (colorStops.length % 2 == 0) {
            throw Error('ColorStops need to be in the format: [<color>, <len>, <color>, ..., <len>, <color>]');
        }
        this.colorStops = [];
        for (let i = 0; i < colorStops.length; i += 2) {
            this.colorStops.push([colorStops[i], (i === colorStops.length - 1) ? 0 : colorStops[i + 1]]);
        }
        this.colorStopIndex = null;
        this.colorStopPosition = null;
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.isHorizontal = (axis === 'X');
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.colorStopIndex = 0;
        this.colorStopPosition = 0;
        this.viewPosition = 0;
        let totalSize = 0;
        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewSize = this.isHorizontal ? viewPortDimX : viewPortDimY;
        this.viewPositionMax = totalSize - (this.viewSize + 1);
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y, this.opaque);
        return this.container;
    }

    render() {
        const target = this.container.getCanvasCtx();
        this.dirty = false;

        let i = this.colorStopIndex;
        const i_max = this.colorStops.length;
        let pos = this.colorStopPosition - this.viewPosition;
        const posStart = pos;
        const posMax = this.viewPosition + this.viewSize - 1;

        let len = 0;
        // wir suche jetzt den letzten relevanten ColorStop für den View
        while (pos < posMax && i < i_max) {
            const stop = this.colorStops[i];
            pos += stop[1];
            len += stop[1];
            i++;
        }

        if (len === 0) {
            return;
        }

        const gradient = this.isHorizontal ?
            target.createLinearGradient(posStart, 0, pos, 0) :
            target.createLinearGradient(0, posStart, 0, pos);

        const factor = 1 / len;
        pos = 0;
        for (let j = this.colorStopIndex; j <= i; j++) {
            if (j >= i_max) {
                break;
            }
            const stop = this.colorStops[j];
            gradient.addColorStop(pos, stop[0]);
            pos += stop[1] * factor;
        }
        target.fillStyle = gradient;
        target.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
    }

    scrollBy(speedX, speedY) {
        const speed = this.isHorizontal ? speedX : speedY;

        if (speed === 0) {
            return;
        }
        let newPos = this.viewPosition + speed;
        if (speed > 0) {
            if (newPos > this.viewPositionMax) {
                newPos = this.viewPositionMax;
            }
            if (newPos !== this.viewPosition) {
                var posEnd = this.colorStopPosition + this.colorStops[this.colorStopIndex][1];
                while(posEnd < newPos) {
                    this.colorStopPosition = posEnd;
                    this.colorStopIndex++;
                    posEnd += this.colorStops[this.colorStopIndex][1];
                }
            }
        } else {
            if (newPos < 0) {
                newPos = 0;
            }

            if (newPos !== this.viewPosition) {
                while (this.colorStopPosition > newPos) {
                    this.colorStopIndex--;
                    this.colorStopPosition -= this.colorStops[this.colorStopIndex][1]
                }
            }

        }
        this.viewPosition = newPos;
        if (speed !== 0) {
            this.dirty = true;
        }
    }
}

/**
 * TODO:
 *   - endless Scrolling
 *   - Use CSS Background-Property?
 */
class LinearGradientPane {

    constructor(axis, colorStops) {
        if (colorStops.length % 2 == 0) {
            throw Error('ColorStops need to be in the format: [<color>, <len>, <color>, ..., <len>, <color>]');
        }
        this.colorStops = [];
        for (let i = 0; i < colorStops.length; i += 2) {
            this.colorStops.push([colorStops[i], (i === colorStops.length - 1) ? 0 : colorStops[i + 1]]);
        }
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.isHorizontal = (axis === 'X');
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.lowerBoundPos = 0;
        this.upperBoundPos = 0;
        this.viewPosition = 0;
        let totalSize = 0;
        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewSize = this.isHorizontal ? viewPortDimX : viewPortDimY;
        this.viewPositionMax = Math.max(totalSize - this.viewSize, 0);
        this.divPosition = 0;
        this.fadeDiv = document.createElement('div');
        this.fadeDiv.setAttribute(
            'style',
            'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortDimX + 'px; height: ' + viewPortDimY + 'px; top: 0px; left: 0px'
        );
        this.container = new DivContainer(this.fadeDiv);
        return this.container;
    }

    render() {
        let currPos = 0;
        let currColorIndex = 0;

        while (currPos + this.colorStops[currColorIndex][1] <= this.viewPosition) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
        }
        const startIndex = currColorIndex;
        this.divPosition = currPos;

        const top = Math.abs(currPos - this.viewPosition);
        this.lowerBoundPos = currPos;
        this.upperBoundPos = currPos + this.colorStops[currColorIndex][1];

        const endPos = this.viewPosition + this.viewSize;
        while (currPos + this.colorStops[currColorIndex][1] <= endPos) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
            if (currColorIndex === this.colorStops.length) {
                currPos = endPos;
                break;
            }
        }
        let lastIndex = currColorIndex;
        const lastIndexPos =
            1 - this.viewSize + (currPos === endPos ? currPos : currPos + this.colorStops[currColorIndex][1]);
        this.upperBoundPos = Math.min(this.upperBoundPos, lastIndexPos);
        this.lowerBoundPos = Math.max(this.lowerBoundPos, currPos - this.viewSize);

        let bottom = 0;
        if (currPos !== endPos) {
            bottom = currPos + this.colorStops[currColorIndex][1] - endPos;
            lastIndex++;
        }

        let gradient = 'to ' + (this.isHorizontal ? 'right' : 'bottom');
        let pos = 0;
        for (let i = startIndex; i <= lastIndex; i++) {
            if (i === this.colorStops.length) {
                gradient += ', ' + this.colorStops[i - 1][0];
                break;
            }
            const stop = this.colorStops[i];
            gradient += ', ' + stop[0];
            if (pos > 0 && i < lastIndex) {
                gradient += ' ' + pos + 'px';
            }
            pos += stop[1];
        }

        const div = this.container.getChild();
        Game.instance.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'width' : 'height'),
            top + this.viewSize + bottom
        );
        Game.instance.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'left' : 'top'),
            -top
        );
        Game.instance.addDomOp(
            div,
            'style.background',
            'linear-gradient(' + gradient + ')'
        );
        this.dirty = false;
    }

    scrollBy(speedX, speedY) {
        const speed = this.isHorizontal ? speedX : speedY;

        if (speed === 0) {
            return;
        }
        let newPos = this.viewPosition + speed;
        if (newPos > this.viewPositionMax) {
            newPos = this.viewPositionMax;
        } else if (newPos < 0) {
            newPos = 0;
        }

        if (this.viewPosition !== newPos) {
            this.viewPosition = newPos;
            if (newPos < this.lowerBoundPos || newPos > this.upperBoundPos) {
                this.dirty = true;
            } else {
                Game.instance.addDomOp(
                    this.container.getChild(),
                    'style.' + (this.isHorizontal ? 'left' : 'top'),
                    this.divPosition - newPos
                );
            }
        }
    }
}

// #################################
//    Scroll Handler
// #################################

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


class BoundsScrollHandler {

    constructor(spritePane, scroller, boundsSize, maxOut = {}) {
        this.spritePane = spritePane;
        this.scroller = scroller;
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

    setMaxOut(maxOut) {
        this.maxOut = Object.assign(this.maxOut, maxOut);
    }

    moveActor(moveX = 0, moveY = 0) {
        const actor = this.spritePane.getActorId();
        if (actor === null) {
            return;
        }
        const sprite = this.spritePane.getSpritePos(actor);

        let move = false;
        let scrollX = 0;
        if (moveX !== 0) {
            let pos = sprite.x + moveX;
            const min = -this.maxOut.left;
            if (this.bounds.left === null) {
                if (pos < min) {
                    pos = min;
                }
            } else if (pos < this.bounds.left) {
                // new position is left of scrollbounds
                if (sprite.x >= this.bounds.left) {
                    scrollX = -Math.abs(this.bounds.left - pos);
                    pos = this.bounds.left;
                } else if (pos < min) {
                    pos = min;
                }
            }

            const max = this.spritePane.viewPortDim.x - 1 - sprite.dim.x + this.maxOut.right;
            const rightScrollBound = (this.bounds.right === null) ? null : max - this.bounds.right;
            if (rightScrollBound === null) {
                if (pos > max) {
                    pos = max;
                }
            } else if (pos > rightScrollBound) {
                if (sprite.x <= rightScrollBound) {
                    scrollX = Math.abs(pos - rightScrollBound);
                    pos = rightScrollBound;
                } else if (pos > max) {
                    pos = max;
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

        const unscrolled = this.scroller.scrollBy(scrollX, scrollY).unscrolled;
        if (unscrolled.x !== 0) {
            sprite.x += unscrolled.x;
            move = true;
        }
        if (unscrolled.y !== 0) {
            sprite.y += unscrolled.y;
            move = true;
        }

        if (move) {
            this.spritePane.setSpritePos(actor, sprite.x, sprite.y);
        }
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
       COLOR: 2
    }
};

class BitmapFilterer {

    constructor() {
        this.filters = {};
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

                case FILTER.PARAM.FLOAT:
                    parser = function(rawValue) {
                        return parseFloat(rawValue);
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
        {type: FILTER.PARAM.COLOR, key: 'color'}
    ]
);

filterer.addFilter(
    'transparent',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = (i << 2) + 3;
            rgba[pos] = rgba[pos] * params.factor;
        };
        return imageData;
    },
    [
        {key: 'factor', type: FILTER.PARAM.FLOAT, min: 0, max: 1, default: 0.5}
    ]
);

// @TODO: colorReplace-Filter

// ####################################
//    Sheets
// ####################################

class SpriteSheet {

    constructor(imageRsrc) {
        this.sheet = imageRsrc.getCanvas();
        this.sprites = {};
        this.animations = {};
        this.customImages = [];
        this.players = {};
    }

    assertSprite(id) {
        if (!this.sprites[id]) {
            throw Error('No sprite with id "' + id + '" found in spritesheet!');
        }
    }

    assertAnimation(id) {
        if (!this.animations[id]) {
            throw Error('No animation with id "' + id + '" found in spritesheet!');
        }
    }

    addTransformedSprite(id, base, transformers) {
        this.assertSprite(base);
        this.customImages.push({
            id,
            base,
            transformers
        });
    }

    addTransformedSprites(postfix, baseIds, transformers) {
        for (let id of baseIds) {
            this.addTransformedSprite(id + postfix, id, transformers);
        }
    }

    addTransformedAnimation(id, base, transformers, synchronous = false) {
        this.assertAnimation(base);
        const baseAnimation = this.animations[base];
        const newFrames = [];
        for (let i = 0; i < baseAnimation.frames.length; i++) {
            const frame = baseAnimation.frames[i];
            const newId = id + '_' + i;
            this.addTransformedSprite(newId, frame.id, transformers);
            newFrames.push({
                id: newId, duration: frame.duration, padding: {x: frame.padding.x, y: frame.padding.y}
            });
        }
        const animation = {
            synchronous,
            dim: {x: baseAnimation.dim.x, y: baseAnimation.dim.y},
            frames: newFrames,
            dir: baseAnimation.dir,
            end: baseAnimation.end
        };
        this.animations[id] = animation;
        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, animation.end, animation.dir);
            this.players[id] = player;
        }
    }

    build() {
        for (let image of this.customImages) {
            let base = this.getSprite(image.base);
            const trans = filterer.getCanvasWithFiltersApplied(image.transformers, this.sheet, base.off.x, base.off.y, base.dim.x, base.dim.y);
            const sprite = this.addSprite(image.id, 0, 0, base.dim.x, base.dim.y);
            sprite.img = trans[0];
        }
    }

    addSprite(name, offX, offY, width, height) {
        const sprite = {
            off: {x: offX, y: offY},
            dim: {x: width, y: height}
        };
        this.sprites[name] = sprite;
        return sprite;
    }

    addSpriteSeq(name, offX, offY, width, height, length, spacing = 0) {
        for (let i = 1; i <= length; i++) {
            this.addSprite(name + i, offX, offY, width, height);
            offX += width + spacing;
        }
    }

    addAnimation(name, frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD, synchronous = false) {
        let maxX = 0;
        let maxY = 0;
        let sameSize = true;
        let dims = [];
        const frameDetails = [];
        for (let rawFrame of frames) {
            const frame = (typeof rawFrame === 'string' || rawFrame instanceof String) ?
                {
                    duration: 1,
                    id: rawFrame,
                    padding: {x: 0, y: 0}
                } : rawFrame;

            const dim = this.getSpriteDim(frame.id);
            maxX = Math.max(maxX, dim.x);
            maxY = Math.max(maxY, dim.y);
            sameSize = sameSize && (maxX === dim.x || maxY === dim.y);
            dims.push(dim);
            frameDetails.push(frame);
        }

        const animation = {
            synchronous,
            dim: {x: maxX, y: maxY},
            frames: frameDetails,
            dir,
            end
        };

        if (!sameSize) {
            for (let i = 0; i < dims.length; i++) {
                const frame = animation.frames[i];
                const dim = dims[i];
                // TODO multiple auto padding strategies per axis
                // (V-CENTERING, V-TOP, V-BOTTOM, H-CENTERING, H-LEFT, H-RIGHT)
                const offX = (maxX - dim.x) >> 1;
                const offY = (maxY - dim.y) >> 1;
                frame.padding = {x: offX, y: offY};
            }
        }

        this.animations[name] = animation;

        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, end, dir);
            this.players[name] = player;
        }
    }

    isAnimation(name) {
        return !(this.animations[name] === undefined);
    };

    getSpriteDim(name) {
        if (name === null) {
            return {x: 0, y: 0};
        }
        if (this.isAnimation(name)) {
            return this.animations[name].dim;
        }
        const sprite = this.getSprite(name);
        return sprite.dim;
    }

    getSprite(name) {
        this.assertSprite(name);
        return this.sprites[name];
    }

    loadAnimationToProxy(name, proxy) {
        this.assertAnimation(name);
        let animation = this.animations[name];
        if (animation.synchronous) {
            proxy.setPlayer(this.players[name]);
        } else {
            // creates a new player by lazy loading in the proxy
            proxy.loadAnimation(animation.frames, animation.end, animation.dir);
        }
    }

    drawSprite(ctx, name, posX, posY, paddX = 0, paddY = 0) {
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        ctx.drawImage(
            sprite.img === undefined ?
                this.sheet.elem : sprite.img.elem,
            sprite.off.x, sprite.off.y,
            sprite.dim.x, sprite.dim.y,
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawFilteredSprite(ctx, name, filters, posX, posY, paddX = 0, paddY = 0) {
        if (filters === '') {
            return this.drawSprite(ctx, name, posX, posY, paddX, paddY);
        }
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        const transformed = filterer.getCanvasWithFiltersApplied(
            filters,
            sprite.img === undefined ? this.sheet : sprite.img,
            sprite.off.x, sprite.off.y,
            draw.width, draw.height
        );
        ctx.drawImage(
            transformed[0].elem,
            transformed[1], transformed[2],
            transformed[3], transformed[4],
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawSpritePart(ctx, name, posX, posY, width, height, offX = 0, offY = 0) {
        const sprite = this.getSprite(name);
        width = Math.min(offX + sprite.dim.x, width);
        height = Math.min(offY + sprite.dim.y, height);
        if (width === 0 || height === 0) {
            return;
        }
        ctx.drawImage(
            sprite.img === undefined ? this.sheet.elem : sprite.img.elem,
            sprite.off.x + offX, sprite.off.y + offY,
            width, height,
            posX, posY,
            width, height
        );
    };
}

class SpriteAndTilesCollider {

    static defaultCheck(tile) {
        return (tile.obj === null || tile.obj.block);
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
        const margin = {
            dir: 0,
            start: 0,
            end: 0
        };
        if (collide.margin) {
            Object.assign(margin, collide.margin);
        };
        if (collide.check === undefined) {
            collide.check = SpriteAndTilesCollider.defaultCheck
        }
        collide.margin = margin;
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
            let dist = collide.lookahead;
            let first = 0;
            let dir = 1;
            let axis = 'x';
            switch (collide.dir) {
                case 'down':
                    dir = -1;
                    first = pos.dim.y;
                case 'up':
                    break;

                case 'right':
                    dir = -1;
                    first = pos.dim.x;
                case 'left':
                    axis = 'y';
                    break;
            }
            const oppAxis = axis === 'x' ? 'y' : 'x';
            first += pos[oppAxis] + dir * collide.margin.dir;
            const dStart = pos[axis] + collide.margin.start;
            const dEnd = pos[axis] + pos.dim[axis] - collide.margin.end;

            lines[collideId] = (axis === 'x' ?
                [dStart, first, dEnd - dStart, 1] :
                [first, dStart, 1, dEnd - dStart]
            );
        }
        return lines;
    }

    getCollides(collideIds) {
        const result = {};
        const pos = this.spritePane.getSpritePos(this.spriteId);
        pos.x += this.spriteOffset.x;
        pos.y += this.spriteOffset.y;

        for (let collideId of collideIds) {
            const collide = this.collides[collideId];
            let dist = collide.lookahead;
            let first = 0;
            let dir = 1;
            let axis = 'x';
            switch(collide.dir) {
                case 'down':
                    dir  = -1;
                    first = pos.dim.y;
                case 'up':
                    break;

                case 'right':
                    dir = -1;
                    first = pos.dim.x;
                case 'left':
                    axis = 'y';
                    break;
            }
            const oppAxis = axis === 'x' ? 'y' : 'x';
            first += pos[oppAxis] + dir * collide.margin.dir;
            const dStart = pos[axis] + collide.margin.start;
            const dEnd = pos[axis] + pos.dim[axis] - collide.margin.end;

            let tiles = axis === 'x' ?
                this.tilesPane.getTilesInXLine(first, dStart, dEnd) :
                this.tilesPane.getTilesInYLine(first, dStart, dEnd);

            for(let tile of tiles) {
                if (collide.check(tile)) {
                    dist = 0;

                    break;
                }
            }
            if (dist > 0) {
                const remBlock = (this.tileSize - (first % this.tileSize)) - collide.lookahead;
                if (remBlock < 0) {
                    first -= dir * this.tileSize;
                    tiles = axis === 'x' ?
                        this.tilesPane.getTilesInXLine(first, dStart, dEnd) :
                        this.tilesPane.getTilesInYLine(first, dStart, dEnd);
                    for (let tile of tiles) {
                        if (collide.check(tile)) {
                            dist = collide.lookahead + remBlock;
                            break;
                        }
                    }
                }
            }
            const obj = {
                dist: dist
            };
            if (dist === 0 && collide.saveContacts) {
                obj.tiles = tiles;
            }
            result[collideId] = obj;
        }
        return result;
    }
}

class TilesMap {

    constructor(tileBits, imageResource, tiles, map, defaultTile = null) {
        this.tileBits = tileBits;
        this.tileSize = 1 << tileBits;

        const srcCanvas = imageResource.getCanvas();
        const tilesPerLine = Math.floor(srcCanvas.elem.width / this.tileSize);
        const lines = Math.floor(srcCanvas.elem.height / this.tileSize);
        const tgtCanvas = OCM.getNewOffscreenCanvas((tilesPerLine * lines) * this.tileSize, this.tileSize);
        for (let i = 0; i < lines; i++) {
            const width = tilesPerLine * this.tileSize;
            tgtCanvas.ctx.drawImage(srcCanvas.elem, 0, i*this.tileSize, width, this.tileSize, i*width, 0, width, this.tileSize);
        }
        this.tilesImg = tgtCanvas;

        this.map = map;
        if (this.map.length === 0 || this.map[0].length === 0) {
            throw Error('Map cannot be empty!');
        }
        this.mapTiles = {
            x: this.map[0].length,
            y: this.map.length
        };
        this.tiles = tiles;
        this.animatedIndices = [];
        this.players = {};
        this.defaultTile = defaultTile;
    }

    getTileObj(x, y) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return null;
        }
        const tile = this.map[y][x];
        let obj = this.tiles[tile];
        if (obj === undefined) {
            if (this.defaultTile === null) {

                throw new Error('Unknown tile "' + tile + '" given in map at position (' + x + ', ' + y + ')!');
            }
            obj = this.defaultTile;
        }
        obj.index = tile;
        return obj;
    }

    replaceTile(x, y, newTile) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return;
        }
        this.map[y][x] = newTile;
    }

    getTileAtPos(x, y) {
        return this.getTileObj(x, y);
    }

    getTilesAtXLine(y, x1, x2) {
        const tiles = [];
        for (let x = x1; x <= x2; x++) {
            tiles.push(this.getTileObj(x, y));
        }
        return tiles;
    }

    getTilesAtYLine(x, y1, y2) {
        const tiles = [];
        for (let y = y1; y <= y2; y++) {
            tiles.push(this.getTileObj(x, y));
        }
        return tiles;
    }

    getTileIndex(x, y) {
        const tile = this.getTileObj(x, y);
        if (tile.animation === undefined) {
            return tile.index;
        }
        if (tile.animation.synchronous === true) {
            if (this.players[tile.index] === undefined) {
                const player = new BitmapPlayer();
                player.loadAnimation(tile.animation.frames, tile.animation.end, tile.animation.dir);
                this.players[tile.index] = player;
                this.animatedIndices.push(tile.index);
            }
            const frame = this.players[tile.index].getFrame();
            return frame.id;
        }
        throw Error('NOT YET IMPLEMENTED');
    }

    updateFrames() {
        for (let index in this.players) {
            this.players[index].nextStep();
        }
    }

    getAnimatedTiles(posX, posY, width, height) {
        const result = [];
        if (this.animatedIndices.length > 0) {
            const x_min = Math.max(posX, 0);
            const y_min = Math.max(posY, 0);
            const x_max = Math.min(posX + width, this.map[0].length);
            const y_max = Math.min(posY + height, this.map.length);
            for (let y = y_min; y < y_max; y++) {
                for (let x = x_min; x < x_max; x++) {
                    if (this.animatedIndices.indexOf(this.map[y][x]) !== -1) {
                        result.push([x, y]);
                    }
                }
            }
        }
        return result;
    }

    render(target, offset, dim = {}) {
        // TODO refactor dim
        const startTileX = dim.pos.x;
        const endTileX = startTileX + dim.width;
        const startTileY = dim.pos.y;
        const endTileY = startTileY + dim.height;

        target.clearRect(offset.x, offset.y, dim.width * this.tileSize, dim.height * this.tileSize);

        const xIndices = [];
        for(let x = startTileX; x <= endTileX; x++) {
            let index = x;
            if (index >= this.mapTiles.x) {
                if (dim.endless.x) {
                    while (index >= this.mapTiles.x) {
                        index -= this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.x) {
                    while (index < 0) {
                        index += this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            }
            xIndices.push(index);
        }

        const yIndices = [];
        for(let y = startTileY; y <= endTileY; y++) {
            let index = y;
            if (index >= this.mapTiles.y) {
                if (dim.endless.y) {
                    while (index >= this.mapTiles.y) {
                        index -= this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.y) {
                    while (index < 0) {
                        index += this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            }
            yIndices.push(index);
        }

        for (let j = 0; j < yIndices.length; j++) {
            const y = yIndices[j];
            if (y === null) {
                continue;
            }
            for (let i = 0; i < xIndices.length; i++) {
                const x = xIndices[i];
                if (x === null) {
                    continue;
                }
                const index = this.getTileIndex(x, y);
                if (index === 0) {
                    continue;
                }
                target.drawImage(
                    this.tilesImg.elem,
                    index << this.tileBits,
                    0,
                    this.tileSize,
                    this.tileSize,
                    offset.x + (i << this.tileBits),
                    offset.y + (j << this.tileBits),
                    this.tileSize,
                    this.tileSize
                );
            }
        }
    }
}

class FontMap {

    constructor(imageRsrc, width, height) {
        this.image = imageRsrc.getCanvasElem();
        this.width = width;
        this.height = height;
        this.map = [];
    }

    addChar(posX, posY, char) {
        this.map[char] = {x: posX, y: posY};
    }

    addRange(posX, posY, from, to) {
        for (let i = from.charCodeAt(0); i <= to.charCodeAt(0); i++) {
            this.addChar(posX, posY, String.fromCharCode(i));
            posX += this.width;
        }
    }

    drawTextLine(ctx, text, posX, posY) {
        for (let i = 0; i <= text.length; i++) {
            const char = this.map[text[i]];
            if (char !== undefined) {
                ctx.drawImage(this.image, char.x, char.y, this.width, this.height, posX, posY, this.width, this.height);
            }
            posX += this.width;
        }
    }
}


/**
 *  BitmapPlayer-Modes
 * ----------------------------
 *
 *   DIR: forward, backwards, forward-backward, backward-forward
 *   END: loop, stop, delete
 *
 * ----------------------------
 *
 */

const ANIMATION = {
    DIR: {
        FORWARD: 0,
        BACKWARD: 1,
        FORWARD_BACKWARD: 2,
        BACKWARD_FORWARD: 3
    },
    END: {
        LOOP: 0,
        STOP: 1,
        DELETE: 2
    },
    STATE: {
        EMPTY: -1,
        WAITING: 0,
        RUNNING: 1,
        DONE: 2,
        DESTROYED: 3,
        PAUSED: 4
    }
};

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

    loadAnimation(frames, end, dir) {
        this.active = 0;
        if (this.players[0] === null) {
            this.players[0] = new BitmapPlayer();
        }
        this.players[0].loadAnimation(frames, end, dir);
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

class BitmapPlayer {

    constructor() {
        this.speed = 1;
        this.state = ANIMATION.STATE.EMPTY;
        this.frameNo = null;
        this.pauseState = null;
        this.dirty = false;
    }

    loadAnimation(frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD) {
        this.frames = frames;
        this.direction = dir;
        this.end = end;
        this.isForward = (dir === ANIMATION.DIR.FORWARD || dir === ANIMATION.DIR.FORWARD_BACKWARD);
        this.step = 0;
        this.frameNo = this.isForward ? 0 : frames.length - 1;
        this.state = ANIMATION.STATE.WAITING;
        this.dirty = true;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    getState() {
        return this.state;
    }

    handleForward() {
        let frame = this.getFrame();
        while (this.step >= frame.duration) {
            this.step -= frame.duration;
            this.frameNo++;
            if (this.frameNo === this.frames.length) {
                this.frameNo--;
                if (this.direction === ANIMATION.DIR.FORWARD_BACKWARD) {
                    this.frameNo--;
                    this.isForward = false;
                } else {
                    if (this.end === ANIMATION.END.DELETE) {
                        this.state = ANIMATION.STATE.DESTROYED;
                        this.frameNo = null;
                    } else if (this.end === ANIMATION.END.LOOP) {
                        if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                            this.isForward = false;
                        } else {
                            this.frameNo = 0;
                        }
                    } else {
                        this.state = ANIMATION.STATE.DONE;
                    }
                }
                break;
            }
            frame = this.getFrame();
        }
    }

    handleBackward() {
        let frame = this.getFrame();
        while (this.step >= frame.duration) {
            this.step -= frame.duration;
            this.frameNo--;
            if (this.frameNo < 0) {
                this.frameNo = 0;
                if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                    this.frameNo++;
                    this.isForward = true;
                } else {
                    if (this.end === ANIMATION.END.DELETE) {
                        this.state = ANIMATION.STATE.DESTROYED;
                        this.frameNo = null;
                    } else if (this.end === ANIMATION.END.LOOP) {
                        if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                            this.isForward = false;
                        } else {
                            this.frameNo = this.frames.length - 1;
                        }
                    } else {
                        this.state = ANIMATION.STATE.DONE;
                    }
                }
                break;
            }
            frame = this.getFrame();
        }
    }

    nextStep() {
        if (this.frameNo === null || this.state === ANIMATION.STATE.PAUSED) {
            this.dirty = false;
            return;
        }
        const oldFrameNo = this.frameNo;
        this.state = ANIMATION.STATE.RUNNING;
        this.step += this.speed;
        if (this.isForward) {
            this.handleForward();
            if (!this.isForward) {
                this.handleBackward();
            }
        } else {
            this.handleBackward();
            if (this.isForward) {
                this.handleForward();
            }
        }
        this.dirty = (oldFrameNo !== this.frameNo);
    }

    getFrame() {
        if (this.frameNo === null) {
            return null;
        }
        return this.frames[this.frameNo];
    }

    pause() {
        this.pauseState = this.state;
        this.state = ANIMATION.STATE.PAUSED;
        this.dirty = false;
    }

    continue() {
        if (this.state === ANIMATION.STATE.PAUSED) {
            this.state = this.pauseState;
        }
    }

    reverse() {
        switch(this.dir) {
            case ANIMATION.DIR.FORWARD:
                this.dir = ANIMATION.DIR.BACKWARD;
                break;
            case ANIMATION.DIR.BACKWARD:
                this.dir = ANIMATION.DIR.FORWARD;
                break;
        }
        if (this.state === ANIMATION.STATE.DONE) {
            this.state = ANIMATION.STATE.WAITING;
        }
        this.isForward = !this.isForward;
    }

    isDirty() {
        return this.dirty;
    }
}

/**
 * TODO:
 *   - MasterStates
 *   - CloneStates
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

class ImageResource {

    constructor(data) {
        this.image = new Image();
        this.image.src = data;
        this.canvas = null;
    }

    getCanvas() {
        if (this.canvas === null) {
            this.canvas = OCM.getNewOffscreenCanvas(this.image.width, this.image.height);
            this.canvas.ctx.drawImage(this.image, 0, 0);
        }
        return this.canvas;
    }

    getCanvasElem() {
        return this.getCanvas().elem;
    }

    getNewDecodePromise() {
        return this.image.decode();
    }

    getImage() {
        return this.image;
    }
}

function d() {
    if (arguments.length === 0) {
        return;
    }
    const key = arguments[0];
    const values = [];
    for (let i = 1; i < arguments.length; i++) {
        values.push('' + arguments[i]);
    }
    debugs[key] = values.join(' ');
}

const OCM = new CanvasManager();
// let debugElem = null;
let debugs = [];
var spriteMaps = [];

module.exports = {
    Game,
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    CanvasPane,
    BitmapScrollPane,
    SpritePane,
    ColorPane,
    TextPane,
    PatternPane,
    PatternPane2,
    TilesPane,
    BufferedTilesPane,
    LinearGradientPane,
    MasterSlavesScrollHandler,
    BoundsScrollHandler,
    SpriteAndTilesCollider,
    Animation: BitmapPlayer,
    d,
    FontMap,
    SpriteSheet,
    spriteMaps,
    TilesMap,
    States,
    TILE,
    ANIMATION,
    OCM
};