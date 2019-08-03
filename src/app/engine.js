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

        const canvas = {id, type: 'scroll', elem, ctx: elem.getContext('2d', {alpha: !opaque}), width: sizeX, height: sizeY};
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
        const canvas = {id, type, elem, ctx: elem.getContext('2d', {alpha: !opaque}), width: dimX, height: dimY};
        this.canvasElems.push(canvas);

        return canvas;
    }
}

const OCM = new CanvasManager();

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
    constructor() {
        this.areas = [];
        this.dimX = null;
        this.dimY = null;
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

    render() {
        for(let elem of this.elems) {
            const isDirty = !(elem.pane.dirty === false);
            if (isDirty) {
                elem.pane.render(elem.canvas.ctx);
            }
        }
    }
}

/**
 * The screen manager holds all possible screens of the game and allows transitions to a new screen by deleting and
 * creating overlay canvases of the current view.
 *
 * A screen can either be a Area (=overlays of different panes with the same dimension) or a
 * Split-Area which divides the screen in different subAreas along one axis (where each subArea can also be a Area or Split-Area).
 *
 * An area will create a canvas for each pane with the same dimension:
 *
 *   Area1:
 *     a) colorPane (=fix background color, opaque, no repaints)
 *     b) MapPane (=scrollable World, canvas will be bigger than the viewPort for css-scrolling, transparent, repaints on worldPos change)
 *     c) SpritePane (transparent, repaints)
 *
 *   Turrican:
 *
 *     Y230-Area1:
 *        a) GradientPane (opaque, repaint on scroll)
 *        b) MapPane (transparent, repaints on worldPos change)
 *        c) SpritePane (transparent, repaints)
 *
 *     Y20-Area1:
 *        a) backgroundPane (opaque, no repaints)
 *        b) textPane (transparent, repaint on status-update)
 *
 *    => Areas:
 *     A1.1 [0, 0, 320, 230] -> GradientPane, MapPane, SpritePane
 *     A1.2 [0, 230, 320, 20] -> backgroundPane, textPane
 *
 *
 *
 *
 *   Shadow of the Beast:
 *
 *    Area 1:
 *     Y150-Area:
 *       a) GradientPane
 *     Y100-Area:
 *       a) EmptyPane
 *
 *    Area 2:
 *     Y20-Area: PatternPane (opaque, scrollable, no repaints)
 *     Y40-Area: PatternPane
 *     Y30-Area: PatternPane
 *     Y50...
 *
 *    Area 3:
 *     Y200-Area: MapPane, SpritePane
 *     Y50-Area: PatternPane
 *
 *
 *    => Areas:
 *      A1.1 [0, 0, 320, 150] -> GradientPane
 *      A1.2 [0, 150, 320, 100] -> EmptyPane
 *      A2.1 [0, 0, 320, 20] -> PatternPane
 *      A2.2 [0, 20, 320, 40] -> PatternPane
 *      A2.3 [0, 60, 320, 30] -> PatternPane
 *      ..
 *      A3.1 [0, 0, 320, 200] -> MapPane, SpritePane
 *      A3.2 [0, 200, 320, 250] -> PatternPane
 *
 *
 *
 * Ein Screen besteht aus einer Folge von Areas, die alle mit der gleichen Dimension initialisiert werden
 * Liegt eine Splitarea vor, dann werden die darunterliegenden Areas entlang der SplitAxis auf einen vorgegebenen Wert gesetzt
 *
 * Für jede Area wird ein Canvas erzeugt, sofern es keine SplitArea ist
 *
 *
 *
 */
class ScreenManager {

    constructor(id) {
        let elem = document.getElementById(id);
        this.dimX = elem.width;
        this.dimY = elem.height;
        elem = elem.parentNode;
        elem.innerHTML =
            '<div id="overlay" style="position: relative"></div>' +
            '<center><pre id="d"></pre></center>' +
            '<div id="offscreen" style="display: none"></div>';

        this.screens = {};
        this.view = null;
        debugElem = document.getElementById('d');
    }

    addScreen(id, panes) {
        this.screens[id] = {
            panes
        };
    }

    gotoScreen(id) {
        if (this.screens[id] === undefined) {
            throw Error('Unknown screen id ' + id);
        }
        if (this.view !== null) {
            // TODO destroy current screen
        }

        const view = [];
        const screen = this.screens[id];

        // TODO go backwards to find first opaque pane
        for(let pane of screen.panes) {
            pane.init(this.dimX, this.dimY);
            view.push({
                canvas: OCM.getNewOverlayCanvas(this.dimX, this.dimY),
                pane
            });
        }
        this.view = view;
    }

    renderScreen() {
        if (this.view === null) {
            return;
        }
        for (let elem of this.view) {
            const isDirty = !(elem.pane.dirty === false);
            if (isDirty) {
                elem.pane.render(elem.canvas.ctx);
            }
        }
    }

    getMainCanvas() {
        if (this.view === null) {
            return;
        }
        return this.view[this.view.length - 1].canvas;
    }
}


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
    constructor(sprite, sprites) {
        this.sprite = sprite;
        this.sprites = sprites;
    }

    init(dimX, dimY) {
        this.dimX = dimX;
        this.dimY = dimY;
    }

    render(target) {
        target.clearRect(0, 0, this.dimX, this.dimY);

        for (let sprite of this.sprites) {
            target.drawImage(this.sprite, sprite.x, sprite.y);
        }
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
        var dimX = width + this.patternDimX;
        var dimY = height + this.patternDimY;
        this.width = width;
        this.height = height;
        this.image = null;
        this.scrollX = 0;
        this.scrollY = 0;
        this.sizeX = dimX;
        this.sizeY = dimY;
    }

    setScrollElem(elem) {
        this.scrollElem = elem;
    }

    getImage() {
        if (this.image === null) {
            this.image =
                this.canvas.ctx.getImageData(0, 0, this.width + this.patternDimX, this.height + this.patternDimY);
        }
        return this.image;
    }

    render(target) {
        var pattern = target.createPattern(this.pattern, this.repeat);
        target.fillStyle = pattern;
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

class LinearGradientBackground {

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

    render(bgCtx) {
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
            bgCtx.createLinearGradient(posStart, 0, pos, 0) :
            bgCtx.createLinearGradient(0, posStart, 0, pos);

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

        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, this.dimX, this.dimY);
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

function printDebugs() {
    const out = [];
    out.push("Debug:");
    out.push("===============================================");
    for (let k in debugs) {
        out.push(k + ': ' + debugs[k])
    }
    debugElem.innerHTML = out.join("\n");
    debugs = [];
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

var debugElem = null;
var debugs = [];
var spriteMaps = [];

module.exports = {
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    SpritePane,
    ColorPane,
 //   StackedPane,
    PatternPane,
    WorldPane,
    LinearGradientBackground,
    printDebugs,
    d,
    SpriteMap,
    getNewSpriteMap,
    getNewSprite,
    spriteMaps,
    ScreenManager
};


