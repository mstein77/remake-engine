import {CellSelection} from "./CellProvider";

const {d} = require('../helper/helper');

class Grid {

    constructor() {}

    hasEvents() {
        return false;
    }

    getWidth() {
        return this.map.length === 0 ? 0 : this.map[0].length;
    }

    getHeight() {
        return this.map.length;
    }

    getCellSizeX() {
        return 1;
    }

    getCellSizeY() {
        return 1;
    }

    getGridDim(width, height, grid, zoom) {
        const tileX = this.getCellSizeX() * zoom;
        const tileXPlusBorder = tileX + grid;
        const tileY = this.getCellSizeY() * zoom;
        const tileYPlusBorder = tileY + grid;
        return {
            width: (tileXPlusBorder * width + grid) ,
            height: (tileYPlusBorder * height + grid)
        }
    }

    drawCellValue(ctx, value, x, y, zoom) {};

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
            for (let x = 0; x < viewX; x++) {
                const index = this.map[posY + y][posX + x];
                this.drawCellValue(ctx, index, currX, currY, zoom);
                currX += tileXPlusBorder;
            }
            currY += tileYPlusBorder;
        }
    }

    getClonedValue(value, raw = false) {
        return value;
    }

    // cell methods

    getEmptyCell() {
        return null;
    }

    overwriteCell(x, y, value) {
        this.map[y][x] = value;
    }

    getCellValue(posX, posY, raw = false) {
        const rect = this.getRect(posX, posY, 1, 1, raw);
        if (Array.isArray(rect) && rect.length > 0) {
            return rect[0][0];
        }
        return null;
    }

    // row methods

    getEmptyRow() {
        const row = [];
        let i = this.map[0].length;
        while (i > 0) {
            row.push(this.getEmptyCell());
            i--;
        }
        return row;
    }

    addRows(start, no) {
        if (no == 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                if (start) {
                    this.map.unshift(this.getEmptyRow());
                } else {
                    this.map.push(this.getEmptyRow());
                }
                no--;
            }
            return added;
        } else {
            if (this.map.length + no < 1) {
                no = -this.map.length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map.length + no;
            this.map.splice(pos, -no);
            return -no;
        }
    }

    insertRowsAt(index, no) {
        const rows = [];
        while (no > 0) {
            rows.push(this.getEmptyRow());
            no--;
        }
        this.map.splice.call(this.map, index, 0, ...rows);
    }

    deleteRows(index, no) {
        this.map.splice(index, no);
    }

    getClonedRow(row, raw = false) {
        const result = [];
        for (let cell of row) {
            result.push(this.getClonedValue(cell, raw));
        }
        return result;
    }

    // column methods
    addColumns(start, no) {
        if (no === 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                    if (start) {
                        this.map[i].unshift(this.getEmptyCell());
                    } else {
                        this.map[i].push(this.getEmptyCell());
                    }
                }
                no--;
            }
            return added;
        } else {
            if (this.map[0].length + no < 1) {
                no = -this.map[0].length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map[0].length + no;
            for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                this.map[i].splice(pos, -no);
            }
            return -no;
        }
    }

    insertColumnsAt(index, no) {
        const columns = [];
        while (no > 0) {
            columns.push(this.getEmptyCell());
            no--;
        }
        for (let column of this.map) {
            column.splice.call(column, index, 0, ...columns);
        }
    }

    deleteColumns(index, no) {
        for (let row of this.map) {
            row.splice(index, no);
        }
    }

    // rect methods

    getRect(posX, posY, width, height, raw = false) {
        const slice = this.map.slice(posY, posY + height);
        const rowSlices = [];
        for (let row of slice) {
            rowSlices.push(this.getClonedRow(row.slice(posX, posX + width), raw));
        }
        return rowSlices;
    }

    fillRect(posX, posY, width, height, elem) {
        for (let y = posY, yMax = posY + height; y < yMax; y++) {
            for (let x = posX, xMax = posX + width; x < xMax; x++) {
                this.overwriteCell(x, y, this.getClonedValue(elem))
            }
        }
    }

    reduceToRect(posX, posY, width, height) {
        // TODO also set in model.key
        this.map = this.getRect(posX, posY, width, height, true);
    }

    // path methods

    writePath(path) {
        for (let key in path) {
            const pos = key.split(' ');
            this.overwriteCell(pos[0], pos[1], this.getClonedValue(path[key]));
        }
    }

    // selection methods

    getEmptySelection() {
        return new CellSelection('rect', [[this.getEmptyCell()]]);
    }

    getSelection(posX, posY, width, height, raw = false) {
        return new CellSelection('rect', this.getRect(posX, posY, width, height, raw));
    }

    getRawSelection(posX, posY, width, height) {
        return this.getSelection(posX, posY, width, height, true);
    }

    writeSelection(posX, posY, selection, overwrite = null, writeEmpty = true) {
        let i = 0;
        let xMax = Math.min(selection.getWidth(), this.getWidth() - posX);
        let iMax = Math.min(selection.getHeight(), this.getHeight() - posY);
        let row;
        const result = {
            old: {},
            new: {}
        };

        const empty = this.getEmptyCell();
        while (i < iMax) {
            row = selection.getRow(i);
            for (let x = 0; x < xMax; x++) {
                const value = overwrite !== null ? overwrite : row[x];
                if (writeEmpty || (!writeEmpty && value !== empty)) {
                    const key = (posX + x) + ' ' + posY;
                    result.old[key] = this.getClonedValue(this.map[posY][posX + x]);
                    this.overwriteCell(posX + x, posY, this.getClonedValue(value));
                    result.new[key] = this.getClonedValue(value);
                }
            }
            posY++;
            i++;
        }
        return result;
    }

    fillRectWithSelection(posX, posY, width, height, selection, raw = false) {
        for (let y = 0; y < height; y++) {
            const row = selection.getRow(y, width);
            for (let x = 0; x < width; x++) {
                this.overwriteCell(posX + x, posY + y, this.getClonedValue(row[x], raw));
            }
        }
    }

    fillRectWithRawSelection(posX, posY, width, height, selection) {
        this.fillRectWithSelection(posX, posY, width, height, selection, true);
    }

    importSelection(selection, raw = false) {
        this.map = [];
        const iMax = selection.getHeight();
        let i = 0;
        while (i < iMax) {
            this.map.push(this.getClonedRow(selection.getRow(i), raw));
            i++;
        }
    }

    importRawSelection(selection) {
        this.importSelection(selection, true);
    }
}

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

    getEmptyCell() {
        return 0;
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

class TilesGrid extends IndexGrid {
    constructor(tilesIndex, model, key = 'map') {
        super(tilesIndex, model, key);
    }

    hasEvents() {
        return true;
    }

    getAliases() {
        const aliases = [];
        for (let key in this.index.model.tiles) {
            if (this.index.model.tiles[key].index !== undefined && key != this.index.model.tiles[key].index) {
                aliases.push(key);
            }
        }
        return aliases;
    }

    getIndexForTile(tile) {
        const obj = this.index.model.tiles[tile];
        if (!obj || obj.index === undefined) {
            return tile;
        }
        return obj.index;
    }

    drawEvent(ctx, value, x, y, zoom) {
        const event = this.index.model.events && this.index.model.events[value];
        if (!event || !event.width) {
            return false;
        }
        const pos = this.index.model.pos[value];
        ctx.drawImage(this.index.model.eventsImg, pos.x, pos.y, event.width, event.height, x  + (event.offsetX * zoom), y + (event.offsetY * zoom), event.width * zoom, event.height * zoom);
        return true;
    }

    drawCellValue(ctx, value, x, y, zoom) {
        let events = [];
        if (Array.isArray(value)) {
            events = value.slice(1);
            value = value[0];
        }
        const alias = typeof(value) === 'string' ? value : null;
        value = this.getIndexForTile(value);
        const obj = this.index.model.tiles[value];
        if (obj && obj.animation) {
            value = this.index.model.animations[obj.animation].frames[0].id;
        }
        super.drawCellValue(ctx, value, x, y, zoom);
        if (events.length) {
            let hasNoImage = true;
            if (this.index.model.events) {
                for (let event of events) {
                    if (this.index.model.events[event]) {
                        hasNoImage = false;
                        break;
                    }
                }
            }
        }
        if (alias) {
            const size = this.getCellSizeX() * zoom;
            ctx.fillStyle = '#00000088';
            ctx.fillRect(x, y, size, 12);
            ctx.font = '10px';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('' + alias, x + 2, y + 10, size - 4);
        }
    }
}

class WrappingIndexGrid extends IndexGrid {

    constructor(tilesIndex, base = null, players = null) {
        super(tilesIndex, {map: []});
        this.base = base;
        this.mapping = tilesIndex.getView(0, tilesIndex.getLength(), [null, base]);
        this.wrapWidth = this.mapping.count;
        this.players = players;
    }

    setMatch(match) {
        this.mapping = this.index.getView(0, this.index.getLength(), [match, this.base]);
        this.wrapWidth = this.mapping.count;
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
        const indices = [];
        const viewX = Math.min(width, this.getWidth());
        const viewY = Math.min(height, this.getHeight());
        for (let y = 0; y < viewY; y++) {
            let currIndex = (posY + y) * this.wrapWidth;
            for (let x = 0; x < viewX; x++) {
                indices.push(currIndex);
                currIndex++;
            }
        }
        this.players.setIndices(indices);
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
    }

    getEmptyCell() {
        return '#00000000';
    }

    getCellSizeX() {
        return 10;
    }

    getCellSizeY() {
        return 10;
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
    TilesGrid,
    BitmapGrid
}