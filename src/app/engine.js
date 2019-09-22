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
        if (this.currentScreen !== null) {
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
        OCM.clear(); // TODO: clear should remove all children of overlay via DomOp
        this.currentScreen = screenId;
        const screen = this.screens[screenId];

        screen.setDimension(this.width, this.height);
        screen.render(true);
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
            const screen = this.screens[this.currentScreen];
            if (screen.frameHandler !== null) {
                screen.frameHandler();
            }
        }
        this.waitForNextFrame();
    }

    waitForNextFrame() {
        this.lastAnimationFrame = requestAnimationFrame(this.updateFrame.bind(this));
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
        this.frameHandler = null;
        this.tree = null;
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

class ColorPane {
    constructor(color) {
        this.color = color;
        this.dirty = true;
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
        this.dirty = false;
    }
}

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


class BufferedTilesPane {

    constructor(tilesMap, config) {
        this.tilesMap = tilesMap;

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

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
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

class SpritePane {

    constructor() {
        this.sprites = [];
        this.actor = null;
        this.activePixels = 0;
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.totalPixels = viewPortDimX * viewPortDimY;
        this.pixelLimit = Math.round(this.totalPixels * 0.4);
        this.paneDim = this.viewPortDim;
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    setActor(id) {
        if (!this.sprites[id]) {
            throw Error('Sprite Actor "' + id + "' not found!");
        }
        this.actor = id;
    }

    getActor() {
        return this.actor;
    }

    addSprite(id, img,  x, y) {
        this.sprites[id] = {id, img, x, y};
        this.activePixels += x * y;
        this.dirty = true;
    }

    getSpritePos(id) {
        const sprite = this.sprites[id];
        return {x: sprite.x, y: sprite.y, len: sprite.img.width};
    }

    setSpritePos(id, x, y) {
        const sprite = this.sprites[id];
        sprite.lastX = sprite.x;
        sprite.lastY = sprite.y;
        sprite.x = x;
        sprite.y = y;
        this.dirty = true;
    }

    render() {
        const target = this.container.getCanvasCtx();
        if (this.activePixels >= this.pixelLimit) {
            target.clearRect(0, 0, this.viewPortDim.x, this.viewPortDim.y);
        } else {
            for (let id in this.sprites) {
                const sprite = this.sprites[id];
                target.clearRect(sprite.lastX, sprite.lastY, sprite.img.width, sprite.img.height);
            }
        }

        for (let id in this.sprites) {
            const sprite = this.sprites[id];
            target.drawImage(sprite.img, sprite.x, sprite.y);
            sprite.lastX = null;
            sprite.lastY = null;
        }
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
        console.log(gradient);
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
    }

    addSlave(slave, factorX = 0, factorY = 0) {
        this.slaves.push([slave, factorX, factorY]);
    }

    scrollBy(sx, sy) {
        const scrolled = this.master.scrollBy(sx, sy);
        if (scrolled.x !== 0 || scrolled.y !== 0) {
            for (let slave of this.slaves) {
                slave[0].scrollBy(scrolled.x * slave[1], scrolled.y * slave[2]);
            }
        }
        return scrolled;
    }
}


class BoundsScrollHandler {

    constructor(spritePane, scroller, boundsSize) {
        this.spritePane = spritePane;
        this.scroller = scroller;
        this.boundsSize = boundsSize;
    }

    moveActor(moveX = 0, moveY = 0) {
        const scrollBoundsTop = {x: this.boundsSize.x, y: this.boundsSize.y};
        const scrollBoundsBottom = {x: this.boundsSize.x, y: this.boundsSize.y};

        const actor = this.spritePane.getActor();
        if (actor === null) {
            return;
        }
        const sprite = this.spritePane.getSpritePos(actor);

        let move = false;
        let scrollX = 0;
        if (moveX !== 0) {
            let pos = sprite.x + moveX;
            if (pos < scrollBoundsTop.x) {
                // new position is left of scrollbounds
                if (sprite.x >= scrollBoundsTop.x) {
                    scrollX = -Math.abs(scrollBoundsTop.x - pos);
                    pos = scrollBoundsTop.x;
                } else if (pos < 0) {
                    pos = 0;
                }
            }

            let max = this.spritePane.viewPortDim.x - 1 - sprite.len;
            let rightScrollBound = max - scrollBoundsBottom.x;
            if (pos > rightScrollBound) {
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
            if (pos < scrollBoundsTop.y) {

                if (sprite.y >= scrollBoundsTop.y) {
                    scrollY = -Math.abs(scrollBoundsTop.y - pos);
                    pos = scrollBoundsTop.y;
                } else if (pos < 0) {
                    pos = 0;
                }
            }
            let max = this.spritePane.viewPortDim.y - 1 - sprite.len;
            let bottomScrollBound = max - scrollBoundsBottom.y;
            if (pos > bottomScrollBound) {
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
//
// ####################################

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

class SpriteMap {

    static getCtx() {
        if (SpriteMap.ctx === undefined) {
            const canvas = OCM.getNewOffscreenCanvas(1, 1);
            SpriteMap.ctx = canvas.ctx;
        }
        return SpriteMap.ctx;
    }

    constructor(bits) {
        const len = 1 << (bits - 1);
        const sprite = SpriteMap.getCtx().createImageData(len, len);
        this.im = sprite;
        this.len = len;
        this.bits = bits;
        this.row = len << 2;
        this.cols = [];
    }

    makeTransparent() {
        let i = 3;
        var d = this.im.data;
        let i_max = d.length;
        while(i < i_max) {
            d[i] = 0;
            i += 4;
        }
    }

    addCol(r, g, b, a) {
        this.cols.push([r, g, b, a]);
    }

    set(x, y, col) {
        let i = y * this.row + (x << 2);
        const c = this.cols[col];
        const d = this.im.data;
        d[i] = c[0];
        d[++i] = c[1];
        d[++i] = c[2];
        d[++i] = c[3];
    }
}

class TilesMap {

    constructor(tileBits, tiles, map) {
        this.tiles = tiles;
        this.map = map;
        this.tileBits = tileBits;
        this.tileSize = 1 << tileBits;
        if (this.map.length === 0 || this.map[0].length === 0) {
            throw Error('Map cannot be empty!');
        }
        this.mapTiles = {
            x: this.map[0].length,
            y: this.map.length
        };
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
                const tile = this.map[y][x];
                if (tile === 0) {
                    continue;
                }
                target.drawImage(
                    this.tiles,
                    tile << this.tileBits,
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

function getNewSpriteMap(bits) {
    return new SpriteMap(bits);
}

function getNewSprite(mapKey, x, y) {
    if (spriteMaps[mapKey] === undefined) {
        throw Error('Unknown SpriteMap key ' + mapKey);
    }
    return {im: spriteMaps[mapKey].im, x: x, y: y, len: spriteMaps[mapKey].len};
}

const OCM = new CanvasManager();
let debugElem = null;
let debugs = [];
var spriteMaps = [];

module.exports = {
    Game,
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    SpritePane,
    ColorPane,
    PatternPane,
    PatternPane2,
    TilesPane,
    BufferedTilesPane,
    LinearGradientPane,
    MasterSlavesScrollHandler,
    BoundsScrollHandler,
    d,
    SpriteMap,
    getNewSpriteMap,
    getNewSprite,
    spriteMaps,
    TilesMap,
    TILE,
    OCM
};