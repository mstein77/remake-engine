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

    getNewOverlayCanvas(dimX, dimY) {
        return this.getNewCanvas('overlay', dimX, dimY);
    }

    getNewOffscreenCanvas(dimX, dimY) {
        return this.getNewCanvas('offscreen', dimX, dimY);
    }

    getNewCanvas(type, dimX, dimY) {
        const id = type + '_' + this.canvasElems.length;
        const parentElem = type === 'offscreen' ? this.getOffscreenElem() : this.getOverlayElem();
        const elem = document.createElement('canvas');
        elem.id = id;
        elem.setAttribute('width', dimX);
        elem.setAttribute('height', dimY);
        if (type === 'overlay') {
            elem.setAttribute('style', 'position: absolute; top: 0px; left: 0px');
        }
        parentElem.appendChild(elem);
        const canvas = {id, type, elem, ctx: elem.getContext('2d'), width: dimX, height: dimY};
        this.canvasElems.push(canvas);

        return canvas;
    }
}

const OCM = new CanvasManager();

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
            elem.pane.render(elem.canvas.ctx);
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

    render(target) {}
}

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

class PatternPane {

    constructor(pattern, repeat) {
        this.canvas = null;
        this.pattern = pattern;
        this.repeat = repeat;
    }

    init(width, height) {
        this.patternDimX = this.pattern.width;
        this.patternDimY = this.pattern.height;
        var dimX = width + this.patternDimX;
        var dimY = height + this.patternDimY;
        this.canvas = OCM.getNewOffscreenCanvas(dimX, dimY);

        this.canvas.ctx.clearRect(0, 0, dimX, dimY);

        // opaque pattern
        var pattern = this.canvas.ctx.createPattern(this.pattern, this.repeat);
        this.canvas.ctx.fillStyle = pattern;
        this.canvas.ctx.fillRect(0, 0, dimX, dimY);
        this.width = width;
        this.height = height;
        this.image = null;
        this.scrollX = 0;
        this.scrollY = 0;
    }

    getImage() {
        if (this.image === null) {
            this.image =
                this.canvas.ctx.getImageData(0, 0, this.width + this.patternDimX, this.height);
        }
        return this.image;
    }

    render(target) {
        target.putImageData(this.getImage(), 0 - this.scrollX, 0 - this.scrollY);
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

    init() {
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

    constructor(ctx, bits) {
        const len = 1 << (bits - 1);
        const sprite = ctx.createImageData(len, len);
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

function getNewSpriteMap(ctx, bits) {
    return new SpriteMap(ctx, bits);
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
    EmptyPane,
    StackedPane,
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


