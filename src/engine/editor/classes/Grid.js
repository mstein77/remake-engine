import { CellValue, Grid, CellRawValue } from "../classes.js";

CellValue.color = new CellRawValue('color', '#00000000');
CellValue.index = new CellRawValue('index', 0);

class EmptyGrid extends Grid {

    constructor(width, height, cellSize, color = '#00000000') {
        super();
        this.cellSizeX = cellSize;
        this.cellSizeY = cellSize;
        this.map = [];
        this.color = color;
        if (this.color.length === 7) {
            this.color += 'ff';
        }
        this.opacity = this.color.substr(7, 2).toLowerCase();
        for (let j = 0; j < height; j++) {
            const row = [];
            for (let i = 0; i < width; i++) {
                row.push(null);
            }
            this.map.push(row);
        }
    }

    getCellSizeX() {
        return this.cellSizeX;
    }

    getCellSizeY() {
        return this.cellSizeY;
    }

    drawGrid(ctx, posX, posY, width, height, grid = 0, zoom = 1, players = null) {
        super.drawGrid(ctx, Math.max(posX, 0), Math.max(posY, 0), width, height, grid, zoom, players);
    }

    drawCellValue(ctx, value, x, y, zoom) {
        if (this.opacity === '00') {
            return;
        }
        if (this.opacity !== 'ff') {
            ctx.clearRect(x, y, this.cellSizeX * zoom, this.cellSizeY * zoom);
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.cellSizeX * zoom, this.cellSizeY * zoom);
    }
}

class IndexGrid extends Grid {

    constructor(tilesIndex, model, key = 'map') {
        super();
        this.index = tilesIndex;
        this.model = model;
        this.key = key;
        this.map = model[key];
    }

    getCellSizeX() {
        return this.index.getSizeX();
    }

    getCellSizeY() {
        return this.index.getSizeY();
    }

    drawCellValue(ctx, value, x, y, zoomOrAvail, players = null) {
        this.index.drawEntity(ctx, value, x, y, zoomOrAvail, players);
    }
}

class WrappingIndexGrid extends IndexGrid {

    constructor(tilesIndex, base = null, players = null) {
        super(tilesIndex, {map: []});
        this.base = base;
        this.mapping = tilesIndex.getView(0, tilesIndex.getLength(), [null, base]);
        this.wrapWidth = Math.max(this.mapping.count, 1);
        this.players = players;
        this.hasAnimationProp = players && tilesIndex.hasEntityProp('animation');
    }

    getLength() {
        return this.index.getLength()
    }

    setMatch(match) {
        this.mapping = this.index.getView(0, this.index.getLength(), [match, this.base]);
    }

    setWrapWidth(value) {
        this.wrapWidth = value;
    }

    getWidth() {
        return Math.min(this.wrapWidth, this.mapping.count);
    }

    getHeight() {
        return Math.ceil(this.mapping.count / this.wrapWidth);
    }

    getCellValue(x, y, raw = false) {
        const index = y * this.wrapWidth + x;
        if (index >= this.mapping.count) {
            return null;
        }
        return this.mapping.matches[index];
    }

    updatePlayers(posY, width, height) {
        if (!this.players) {
            return;
        }
        const animations = [];
        const viewX = Math.min(width, this.getWidth());
        const viewY = Math.min(height, this.getHeight());
        for (let y = 0; y < viewY; y++) {
            let currIndex = (posY + y) * this.wrapWidth;
            for (let x = 0; x < viewX; x++) {
                const animation =
                    this.hasAnimationProp ?
                        this.index.getEntityPropValue(
                            this.mapping.matches[currIndex],
                            'animation'
                        ) :
                        this.index.getEntityValue(this.mapping.matches[currIndex]);
                if (animation != '') {
                    animations.push(animation);
                }
                currIndex++;
            }
        }
        this.players.setAnimations(animations)
    }

    drawCellValue(ctx, value, x, y, zoomOrAvail) {
        super.drawCellValue(ctx, this.mapping.matches[value], x, y, zoomOrAvail, this.players);
    }

    drawGrid(ctx, posX, posY, width, height, grid = 0, zoom = 1) {
        const viewX = Math.min(width, this.getWidth());
        const viewY = Math.min(height, this.getHeight());
        const tileX = this.getCellSizeX() * zoom;
        const tileXPlusBorder = tileX + grid;
        const tileY = this.getCellSizeY() * zoom;
        const tileYPlusBorder = tileY + grid;
        ctx.clearRect(0, 0, width * tileX, height * tileY);

        ctx.fillStyle = '#C0C0C0'; // context.contentTextColor;

        const gridHeight = viewY * tileYPlusBorder + grid;
        const gridWidth = viewX * tileXPlusBorder + grid;
        let curr = 0;
        if (grid > 0) {
            for (let x = 0; x <= viewX; x++) {
                ctx.fillRect(curr, 0, grid, gridHeight);
                curr += tileXPlusBorder;
            }
            curr = 0;
            for (let y = 0; y <= viewY; y++) {
                ctx.fillRect(0, curr, gridWidth, grid);
                curr += tileYPlusBorder;
            }
        }
        let currY = grid;
        for (let y = 0; y < viewY; y++) {
            let currX = grid;
            let currIndex = (posY + y) * this.wrapWidth;
            for (let x = 0; x < viewX; x++) {
                this.drawCellValue(ctx, currIndex, currX, currY, {width: tileX, height: tileY}, this.players);
                currX += tileXPlusBorder;
                currIndex++;
            }
            currY += tileYPlusBorder;
        }
    }
}

class BitmapGrid extends Grid {

    constructor(model, key = 'image') {
        super();
        this.model = model;
        this.key = key;
        this.map = this.getColorMapFromImageData(model[key]);
        this.baseCellValue = CellValue.color;
    }

    getCellSizeX() {
        return 5;
    }

    getCellSizeY() {
        return 5;
    }

    drawCellValue(ctx, value, x, y, zoom) {
        ctx.fillStyle = value;
        ctx.fillRect(x, y, this.getCellSizeX() * zoom, this.getCellSizeY() * zoom);
    }

    getColorMapFromImageData(data) {
        const map = [];
        const toHex = function (value) {
            return  ('0' + (value & 0xFF).toString(16)).slice(-2);
        };

        let pos = 0;
        for (let y = 0; y < data.height; y++) {
            const row = [];
            for (let x = 0; x < data.width; x++) {
                row.push(
                    '#'
                    + toHex(data.data[pos])
                    + toHex(data.data[pos + 1])
                    + toHex(data.data[pos + 2])
                    + toHex(data.data[pos + 3])
                );
                pos += 4;
            }
            map.push(row);
        }
        return map;
    }

    getImageData() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = this.getWidth();
        const height = this.getHeight();
        const img = ctx.createImageData(width, height);

        let pos = 0;
        for (let y = 0, yMax = height; y < yMax; y++) {
            for (let x = 0, xMax = width; x < xMax; x++) {
                const hex = this.map[y][x];
                img.data[pos] = parseInt(hex.substr(1, 2), 16);
                img.data[pos + 1] = parseInt(hex.substr(3, 2), 16);
                img.data[pos + 2] = parseInt(hex.substr(5, 2), 16);
                img.data[pos + 3] = parseInt(hex.substr(7, 2), 16);
                pos += 4;
            }
        }
        return img;
    }
}

export {
    EmptyGrid,
    IndexGrid,
    WrappingIndexGrid,
    BitmapGrid
}