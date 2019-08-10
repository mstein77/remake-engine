
class Game {

    constructor(width, height, zoom, init) {
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
        this.debug = false;
        this.globalKeyHandlers = [];
        this.timers = {};
        this.durations = {};
        this.frames = 0;
        this.zoom = zoom;
        this.elems = {};
        this.minFps = 100;
        this.logs = [];

        document.addEventListener('DOMContentLoaded', function(event) {
            Game.instance.boot();
        });
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

    setZoom(value) {
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
        OCM.clear();
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
            this.getDomElem('d').innerHTML = perfKpis + out.join("\n");

            if (this.logs.length > 0) {
                this.getDomElem('log').innerHTML += this.logs.join("\n") + "\n";
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
        this.handleKeys();
        if (this.running) {
            this.startTimer('render');
            this.render();
            this.addTimerDuration('render');
            this.frames++;
        }
        if (this.debug) {
            this.printDebugs();
        }
        if (this.running) {
            if (screen.frameHandler !== null) {
                screen.frameHandler();
            }
        }
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
            this.setZoom(this.zoom);
        }

        debugElem = document.getElementById('d');
        const startScreen = this.init();
        this.addTimerDuration('boot');
        this.gotoScreen(startScreen);
        this.setRunning(true);
        this.updateFrame();
        this.log('...booting done');
    }
}

class CanvasManager {

    constructor() {
        this.overlayElem = null;
        this.offscreenElem = null;
        this.canvasElems = [];
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


    getNewOverlayCanvas(dimX, dimY, offX, offY, opaque = false) {
        return this.getNewCanvas('overlay', dimX, dimY, offX, offY, opaque);
    }

    getNewOffscreenCanvas(dimX, dimY) {
        return this.getNewCanvas('offscreen', dimX, dimY);
    }

    getNewScrollCanvas(dimX, dimY, sizeX, sizeY, offX, offY, opaque = false) {
        const id = 'scroll_' + this.canvasElems.length;
        const parentElem = this.getOverlayElem();
        const container = document.createElement('div');
        container.setAttribute('style', 'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + dimX + 'px; height: ' + dimY + 'px; top: ' + offY + 'px; left: ' + offX + 'px; overflow: hidden');
        const elem = document.createElement('canvas');
        elem.id = id;
        elem.setAttribute('width', sizeX);
        elem.setAttribute('height', sizeY);
        elem.setAttribute('style', 'position: absolute; left: 0px; top: 0px');
        container.appendChild(elem);
        parentElem.appendChild(container);

        const ctx = elem.getContext('2d', {alpha: !opaque});
        ctx.imageSmoothingEnabled = false;
        const canvas = {id, type: 'scroll', elem, ctx, width: sizeX, height: sizeY};
        this.canvasElems.push(canvas);

        return canvas;
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

class Area {

    constructor() {
        this.panes = [];
        this.dimX = null;
        this.dimY = null;
    }

    addPane(pane) {
        this.panes.push(pane);
    }

    setDimension(dimX, dimY, offX, offY, dims) {
        this.dimX = dimX;
        this.dimY = dimY;
        for (let i = 0; i < this.panes.length; i++) {
            const pane = this.panes[i];
            if (this.firstArea === true && i === 0) {
                pane.opaque = true;
            }
            pane.init(dimX, dimY);
            const sizeX = pane.oversize ? pane.sizeX : dimX;
            const sizeY = pane.oversize ? pane.sizeY : dimY;
            dims.push({
                pane,
                off: {x: offX, y: offY},
                dim: {x: dimX, y: dimY},
                size: {x: sizeX, y: sizeY}
            });
        }
        return dims;
    }
}

class SplitArea {

    constructor(axis, areaSizes) {
        this.axis = axis;
        this.areaSizes = areaSizes;
        this.areas = [];
        let i = 0;
        while (i < areaSizes.length) {
            this.areas.push(null);
            i++;
        }
    }

    addArea(area, pos = null) {
        if (pos === null) {
            pos = 0;
            while (pos < this.areas.length && this.areas[pos] !== null) {
                pos++;
            }
            if (pos === this.areas.length) {
                throw new Error('No free area slot found!');
            }
        }
        if (pos >= this.areas.length) {
            return;
        }
        this.areas[pos] = area;
    }

    addPane(pane, pos = null) {
        const area = new Area();
        area.addPane(pane);
        this.addArea(area, pos);
    }

    setDimension(dimX, dimY, offX, offY, dims) {

        let pos = 0;
        let pos_max = (this.axis === 'X') ? dimX : dimY;

        for (let i = 0; i < this.areas.length; i++) {
            if (this.areas[i] === null) {
                continue;
            }
            const size = this.areaSizes[i];
            let x = (this.axis === 'X') ? size : dimX;
            let y = (this.axis !== 'X') ? size : dimY;
            const oldPos = pos;
            pos += size;
            if (pos > pos_max) {
                if (this.axis === 'X') {
                    x = pos_max - oldPos;
                } else {
                    y = pos_max - oldPos;
                }
            }
            if (this.firstArea === true) {
                this.areas[i].firstArea = true;
            }
            this.areas[i].setDimension(x, y, offX, offY, dims);
            if (pos >= pos_max) {
                break;
            }
            if (this.axis === 'X') {
                offX += size;
            } else {
                offY += size;
            }
        }
    }
}

class Screen {
    constructor(id) {
        this.id = id;
        this.areas = [];
        this.dimX = null;
        this.dimY = null;
        this.keyHandler = null;
        this.frameHandler = null;
    }

    addArea(area) {
        if (this.areas.length === 0) {
            area.firstArea = true;
        }
        this.areas.push(area);
    }

    setDimension(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
        const dims = [];
        for (let i = 0; i < this.areas.length; i++) {
            this.areas[i].setDimension(dimX, dimY, 0, 0, dims);
        }

        for(let elem of dims) {
            const oversize = (elem.dim.y !== elem.size.y || elem.dim.x !== elem.size.x);
            elem.canvas = oversize ?
                OCM.getNewScrollCanvas(elem.dim.x, elem.dim.y, elem.size.x, elem.size.y, elem.off.x, elem.off.y, elem.pane.opaque === true) :
                OCM.getNewOverlayCanvas(elem.dim.x, elem.dim.y, elem.off.x, elem.off.y, elem.pane.opaque === true);
            if (oversize) {
                elem.pane.setScrollElem(elem.canvas.elem);
            }
        }
        this.elems = dims;
    }

    render(force = false) {
        for(let elem of this.elems) {
            const isDirty = !(elem.pane.dirty === false);
            if (force || isDirty) {
                elem.pane.render(elem.canvas.ctx);
            }
        }
    }

    setKeyHandler(handler) {
        this.keyHandler = handler.bind(Game.instance);
    }

    setFrameHandler(handler) {
        this.frameHandler = handler.bind(Game.instance);
    }
}


// #############################################
//      P a n e s
// #############################################

class EmptyPane {
    constructor() {}

    init(dimX, dimY) {}

    render(target) {
        this.dirty = false;
    }
}

class ColorPane {
    constructor(color) {
        this.color = color;
        this.dimX = null;
        this.dimY = null;
    }

    init(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
    }

    render(target) {
        target.fillStyle = this.color;
        target.fillRect(0, 0, this.dimX, this.dimY);
        this.dirty = false;
    }
}

/*
class StackedPane {

    constructor(axis, panes, len) {
        this.isHorizontal = (axis === 'X');
        this.panes = panes;
        this.len = len;
        this.subCanvas = [];
    }

    init(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
        const subCanvas = [];

        let pos = 0;
        if (this.isHorizontal) {
            let i = 0;
            while(i < this.panes.length && pos < this.dimX) {
                const width = this.len[i];
                this.panes[i].init(width, this.dimY);
                subCanvas.push(OCM.getNewOffscreenCanvas(width, this.dimY));
                pos += width;
                i++;
            }
        } else {
            let i = 0;
            while(i < this.panes.length && pos < this.dimY) {
                const height = this.len[i];
                this.panes[i].init(this.dimX, height);
                subCanvas.push(OCM.getNewOffscreenCanvas(this.dimX, height));
                pos += height;
                i++;
            }
        }
        this.subCanvas = subCanvas;
    }

    render(target) {
        target.clearRect(0, 0, this.dimX, this.dimY);
        let x = 0;
        let y = 0;
        const i_max = this.subCanvas.length;
        for (let i = 0; i < i_max; i++) {
            const pane = this.panes[i];
            const c = this.subCanvas[i];
            pane.render(c.ctx);
            target.drawImage(c.elem, 0, 0, c.width, c.height, x, y, c.width, c.height);
            if (this.isHorizontal) {
                x += this.len[i];
            } else {
                y += this.len[i];
            }
        }
    }
}
*/

class SpritePane {
    constructor() {
        this.sprites = [];
    }

    addSprite(id, img,  x, y) {
        this.sprites[id] = {id, img, x, y};
        this.dirty = true;
    }

    getSpritePos(id) {
        const sprite = this.sprites[id];
        return {x: sprite.x, y: sprite.y, len: sprite.img.width};
    }

    setSpritePos(id, x, y) {
        const sprite = this.sprites[id];
        sprite.x = x;
        sprite.y = y;
        this.dirty = true;
    }

    init(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
    }

    render(target) {
        target.clearRect(0, 0, this.dimX, this.dimY);

        for (let id in this.sprites) {
            const sprite = this.sprites[id];
            target.drawImage(sprite.img, sprite.x, sprite.y);
        }
        this.dirty = false;
    }
}

class PatternPane {

    constructor(pattern, repeat) {
        this.canvas = null;
        this.pattern = pattern;
        this.repeat = repeat;
        this.oversize = true;
    }

    init(width, height) {
        this.patternDimX = this.pattern.width;
        this.patternDimY = this.pattern.height;
        const dimX = width + this.patternDimX;
        const dimY = height + this.patternDimY;
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = 0;
        this.sizeX = dimX;
        this.sizeY = dimY;
    }

    setScrollElem(elem) {
        this.scrollElem = elem;
    }

    render(target) {
        target.fillStyle = target.createPattern(this.pattern, this.repeat);;
        target.fillRect(0, 0, this.sizeX, this.sizeY);
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        this.scrollX += Sx;
        if (this.scrollX < 0) {
            this.scrollX += this.patternDimX;
        } else if (this.scrollX >= this.patternDimX) {
            this.scrollX -= this.patternDimX;
        }
        this.scrollY += Sy;
        if (this.scrollY < 0) {
            this.scrollY += this.patternDimY;
        } else if (this.scrollY >= this.patternDimY) {
            this.scrollY -= this.patternDimY;
        }
        if (this.scrollElem) {
            if (Sx > 0) {
                this.scrollElem.style.left = -this.scrollX;
            }
            if (Sy > 0) {
                this.scrollElem.style.top = -this.scrollY;
            }
        }
    }
}

class WorldPane {

    constructor(tb, tiles, world, bgPane) {
        this.tb = tb;
        this.tl = 1 << tb;
        this.spriteSheet = tiles;
        this.world = world;
        this.worldX = 0;
        this.worldY = 0;
        this.VOy = 0;
        this.VOx = 0;
        this.bgPane = bgPane;
        this.canvas = null;
    }

    init(width, height, offscreen) {
        this.dimX = width;
        this.dimY = height;
        this.viewWidth = Math.ceil(width / this.tl);
        this.viewHeight = Math.ceil(height / this.tl);
        this.worldMaxY = Math.max(this.world.length - this.viewHeight, 0);
        this.worldMaxX = Math.max(this.world[0].length - this.viewWidth, 0);
        this.VOMaxY = height % this.tl;
        this.VOMaxX = width % this.tl;
        this.offCanvas = (offscreen === true) ? OCM.getNewOffscreenCanvas(width, height) : null;
        this.dirty = true;
    }

    render(drawTarget) {
        var target = this.offCanvas !== null ? this.offCanvas.ctx : drawTarget;
        if (this.bgPane !== undefined) {
            this.bgPane.render(target);
            target.fillRect(0, 0, this.dimX, this.dimY);
        } else {
            target.clearRect(0, 0, this.dimX, this.dimY);
        }

        var x_max = Math.min(this.worldX + this.viewWidth + 1, this.world[0].length);
        var y_max = Math.min(this.worldY + this.viewHeight + 1, this.world.length);
        d('View-Size', this.viewWidth, 'x', this.viewHeight);
        d('VOMaxY', this.VOMaxY);
        d('View-Offset', this.VOx, '/', this.VOy);
        d('World-Size', this.world[0].length, 'x', this.world.length);
        d('WorldMaxY', this.worldMaxY);
        d('World-Pos', this.worldX, '/', this.worldY);

        j = 0;
        for (y = this.worldY; y < y_max; y++) {
            i = 0;
            for (x = this.worldX; x < x_max; x++) {
                var tile = this.world[y][x];
                if (tile === 0) {
                    i++;
                    continue;
                }
                target.drawImage(
                    this.spriteSheet,
                    tile << this.tb,
                    0,
                    this.tl,
                    this.tl,
                    -this.VOx + (i << this.tb),
                    -this.VOy + (j << this.tb),
                    this.tl,
                    this.tl
                );
                i++
            }
            j++;
        }

        if (this.offCanvas !== null) {
            var im = target.getImageData(0, 0, this.dimX, this.dimY);
            drawTarget.putImageData(im, 0, 0);
        }
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        var unscrolled = {
            x: 0,
            y: 0
        };
        if (Sy > 0) {
            // scroll down
            this.VOy += Sy;

            if (this.VOy >= this.tl) {
                this.VOy -= this.tl;
                if (this.worldY < this.worldMaxY) {
                    this.worldY++;
                }
            }

            if (this.worldY === this.worldMaxY) {
                if (this.VOy > this.VOMaxY) {
                    unscrolled.y = Math.abs(this.VOy - this.VOMaxY);
                    this.VOy = this.VOMaxY;
                }
            }

        } else if (Sy < 0) {
            // scroll up
            this.VOy += Sy;

            if (this.VOy < 0) {
                if (this.worldY > 0) {
                    this.worldY--;
                    this.VOy += this.tl;
                } else {
                    unscrolled.y = this.VOy;
                    this.VOy = 0;
                }
            }
        }

        if (Sx > 0) {
            // scroll right
            this.VOx += Sx;

            if (this.VOx >= this.tl) {
                this.VOx -= this.tl;
                if (this.worldX < this.worldMaxX) {
                    this.worldX++;
                }
            }

            if (this.worldX === this.worldMaxX) {
                if (this.VOx > this.VOMaxX) {
                    unscrolled.x = this.VOx - this.VOMaxX;
                    this.VOx = this.VOMaxX;
                }
            }

        } else if (Sx < 0) {
            // scroll left
            this.VOx += Sx;

            if (this.VOx < 0) {
                if (this.worldX > 0) {
                    this.worldX--;
                    this.VOx += this.tl;
                } else {
                    unscrolled.x = this.VOx;
                    this.VOx = 0;
                }
            }
        }
        if (Sx !== 0 || Sy !== 0) {
            this.dirty = true;
        }

        return unscrolled;
    }
}

class LinearGradientPane {

    constructor(axis, pViewSize) {
        this.colorStops = [];
        this.colorStopIndex = null;
        this.colorStopPosition = null;
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.viewSize = pViewSize;
        this.isHorizontal = (axis === 'X');
    }

    addColorStop(color, size) {
        this.colorStops.push([color, size]);
    }

    init(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
        this.colorStopIndex = 0;
        this.colorStopPosition = 0;
        this.viewPosition = 0;
        let totalSize = 0;

        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewPositionMax = totalSize - (this.viewSize + 1);
    }

    render(target) {
        this.dirty = false;
        d('Index', this.colorStopIndex, '| Position', this.colorStopPosition);
        d('View: ', this.viewPosition, ' of ', this.viewPositionMax);

        var i = this.colorStopIndex;
        var i_max = this.colorStops.length;
        var pos = this.colorStopPosition - this.viewPosition;
        var posStart = pos;
        var posMax = this.viewPosition + this.viewSize - 1;

        var len = 0;
        // wir suche jetzt den letzten relevanten ColorStop für den View
        while (pos < posMax && i < i_max) {
            var stop = this.colorStops[i];
            pos += stop[1];
            len += stop[1];
            i++;
        }

        if (len === 0) {
            return;
        }

        var gradient = this.isHorizontal ?
            target.createLinearGradient(posStart, 0, pos, 0) :
            target.createLinearGradient(0, posStart, 0, pos);

        var faktor = 1 / len;
        pos = 0;
        for (var j = this.colorStopIndex; j <= i; j++) {
            if (j >= i_max) {
                break;
            }
            var stop = this.colorStops[j];
            gradient.addColorStop(pos, stop[0]);
            pos += stop[1] * faktor;
        }

        target.fillStyle = gradient;
        target.fillRect(0, 0, this.dimX, this.dimY);
    }

    scrollBy(speed) {
        if (speed === 0) {
            return;
        }
        var newPos = this.viewPosition + speed;
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
        i_max = d.length;
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
    WorldPane,
    LinearGradientPane,
    d,
    SpriteMap,
    getNewSpriteMap,
    getNewSprite,
    spriteMaps
};