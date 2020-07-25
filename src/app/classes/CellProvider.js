import {d} from '../helper/helper';

class CellSelection {
    constructor(type = 'none', cells = [[]]) {
        this.type = type;
        if (type === 'multi') {
            this.cells = cells.rect;
            this.gapX = cells.gapX;
            this.gapY = cells.gapY;
            this.baseX = cells.baseX;
            this.baseY = cells.baseY;
        } else {
            this.cells = type === 'none' ? [[]] : cells;
        }
    }

    getWidth() {
        return this.cells[0].length;
    }

    getHeight() {
        return this.cells.length;
    }

    getRow(index, length = null) {
        if (length === null) {
            if (index > this.cells.length) {
                return null;
            }
            return this.cells[index];
        }
        const result = [];
        const row = this.cells[index % this.cells.length];
        let pos = 0;
        while(length > 0) {
            result.push(row[pos]);
            pos++;
            pos %= row.length;
            length--;
        }
        return result;
    }

    getBaseRect(x, y) {
        const cells = [];
        const pos = y;
        while(cells.length < this.baseY) {
            cells.push(this.cells[y].slice(x, x + this.baseX));
            y++;
        }
        return cells;
    }

    getBaseCells() {
        const baseCells = [];
        const xDist = this.baseX + this.gapX;
        const yDist = this.baseY + this.gapY;
        let y = 0;
        const yMax = this.getHeight();
        const xMax = this.getWidth();
        while (y < yMax) {
            let x = 0;
            while (x < xMax) {
                baseCells.push(this.getBaseRect(x, y));
                x += xDist;
            }
            y += yDist;
        }
        return baseCells;
    };

    getCells() {
        return this.cells;
    }

    getCell(x = 0, y = 0) {
        if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
            return null;
        }
        return this.cells[y][x];
    }

    getType() {
        return this.type;
    }

    isRect() {
        return this.type === 'rect';
    }

    isRows() {
        return this.type === 'rows';
    }

    isColumns() {
        return this.type === 'columns';
    }

    isBitmap() {
        return this.type === 'bitmap';
    }

    getMatchMatrix(value, offset = null, length = null) {
        const rows = [];
        const xMin = !this.isRows() || offset === null ? 0 : offset;
        const xMax = this.isRows() && length !== null ? xMin + length : this.cells[0].length;
        const yMin = !this.isColumns() || offset === null ? 0 : offset;
        const yMax = this.isColumns() && length !== null ? yMin + length : this.cells.length;

        for (let y = yMin; y < yMax; y++) {
            const row = [];
            for (let x = xMin; x < xMax; x++) {
                row.push(this.cells[y][x] === value);
            }
            rows.push(row);
        }
        return rows;
    }
}

class CellProvider {

    constructor(size) {
        this.size = size;
    }

    hasAutoWidth() {
        return false;
    }

    getCellType() {
        throw Error('Implement');
    }

    isResizeable() {
        throw Error('Implement');
    }

    getEmptyCell() {
        throw Error('Implement');
    }

    getEmptySelection() {
        return new CellSelection('rect', [[this.getEmptyCell()]]);
    }

    overwriteCell(x, y, value) {
        this.map[y][x] = value;
    }

    convertURIToImageData(URI) {
        return new Promise(function(resolve, reject) {
            if (URI == null) return reject();
            const canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                image = new Image();

            image.addEventListener('load', function() {
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve({
                    context,
                    imgData: context.getImageData(0, 0, canvas.width, canvas.height)
                });
            }, false);
            image.src = URI;
        });
    }

    getClonedValue(value, raw = false) {
        return value;
    }

    getClonedRow(row, raw = false) {
        const result = [];
        for (let cell of row) {
            result.push(this.getClonedValue(cell, raw));
        }
        return result;
    }

    getSize() {
        return this.size;
    }

    getWidth() {
        return this.map[0].length;
    }

    getHeight() {
        return this.map.length;
    }

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

    fillRect(posX, posY, width, height, elem) {
        for (let y = posY, yMax = posY + height; y < yMax; y++) {
            for (let x = posX, xMax = posX + width; x < xMax; x++) {
                this.overwriteCell(x, y, this.getClonedValue(elem))
            }
        }
    }

    writePath(path) {
        for (let key in path) {
            const pos = key.split(' ');
            this.overwriteCell(pos[0], pos[1], this.getClonedValue(path[key]));
        }
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

    reduceToRect(posX, posY, width, height) {
        this.map = this.getRect(posX, posY, width, height, true);
    }

    getRect(posX, posY, width, height, raw = false) {
        const slice = this.map.slice(posY, posY + height);
        const rowSlices = [];
        for (let row of slice) {
            rowSlices.push(this.getClonedRow(row.slice(posX, posX + width), raw));
        }
        return rowSlices;
    }

    getCellValue(posX, posY, raw = false) {
        const rect = this.getRect(posX, posY, 1, 1, raw);
        if (Array.isArray(rect) && rect.length > 0) {
            return rect[0][0];
        }
        return null;
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

    getSelection(posX, posY, width, height, raw = false) {
        return new CellSelection('rect', this.getRect(posX, posY, width, height, raw));
    }

    getRawSelection(posX, posY, width, height) {
        return this.getSelection(posX, posY, width, height, true);
    }
}

class TilesMapCellProvider extends CellProvider {

    constructor(size, tilesImage, tiles, animations, map) {
        super(size);
        this.data = tilesImage;
        this.imgContext = null;
        this.cellsPerLine = null;
        this.cache = {};
        this.cacheZoom = 0;
        this.tiles = tiles;
        this.animations = animations;
        this.map = map;
        this.maxIndex = null;
    }

    load(callback) {
        if (this.hasData()) {
            callback();
            return;
        }
        this.convertURIToImageData(this.data).then(
            (img) => {
                this.data = null;
                this.imgContext = img.context;
                this.cellsPerLine = img.imgData.width / this.size;
                this.maxIndex = (img.imgData.height / this.size) * this.cellsPerLine;
                callback();
            }
        );
    }

    getImageContext() {
        return this.imgContext;
    }

    getCellType() {
        return 'bitmap';
    }

    getAliases() {
        const aliases = [];
        for (let alias in this.tiles) {
            if (this.tiles[alias].index !== undefined && alias != this.tiles[alias].index) {
                aliases.push(alias);
            }
        }
        return aliases;
    }

    isResizeable() {
        return true;
    }

    getEmptyCell() {
        return 0;
    }

    hasData() {
        return this.data === null;
    }

    overwriteCell(x, y, value) {
        if (!Array.isArray(value) && Array.isArray(this.map[y][x])) {
            this.map[y][x][0] = value;
        } else {
            this.map[y][x] = value;
        }
    }

    getClonedValue(value, raw = false) {
        if (Array.isArray(value)) {
            return raw ? value.concat() : value[0];
        }
        return value;
    }

    getEventCount(value) {
        if (!Array.isArray(value)) {
            return null;
        }
        return value.length - 1;
    }

    getTileForValue(value) {
        return Array.isArray(value) ? value[0] : value;
    }

    getIndexForValue(value) {
        return this.getIndexForTile(this.getTileForValue(value));
    }

    getIndexForTile(value) {
        let index = value;
        if (typeof(index) === 'string') {
            if (!this.tiles[index] === undefined) {
                throw Error('No index found for tile alias "' + index + '"');
            }
            const tile = this.tiles[index];
            if (tile.animation && this.animations[tile.animation] !== undefined) {
                index = this.animations[tile.animation].getFrame().id;
            } else if (tile.index !== undefined) {
                index = this.tiles[index].index;
            }
        }
        return index;
    }

    getMaxIndex() {
        return this.maxIndex;
    }

    getPositionOfIndex(index) {
        return {
            x: index % this.cellsPerLine * this.size,
            y: Math.floor(index / this.cellsPerLine) * this.size
        }
    }

    setBitmapForValue(value, imageData) {
        const index = this.getIndexForValue(value);
        const pos = this.getPositionOfIndex(index);
        this.getImageContext().putImageData(imageData, pos.x, pos.y);
        this.cache = {};
    }

    getImageDataForValue(value) {
        const index = this.getIndexForValue(value);
        const pos = this.getPositionOfIndex(index);
        return this.getImageContext().getImageData(pos.x, pos.y, this.size, this.size);
    }

    getBitmapForValue(value, zoom, writeCache = true, bgColor = null) {
        if (!this.getImageContext()) {
            return null;
        }

        if (writeCache && zoom !== this.cacheZoom) {
            this.cacheZoom = zoom;
            this.cache = {};
        }

        value = this.getTileForValue(value);
        if (this.cache[value] !== undefined) {
            if (writeCache || this.cacheZoom === zoom) {
                return this.cache[value];
            }
        }

        const index = this.getIndexForTile(value);
        const start = this.getPositionOfIndex(index);
        const img = this.getImageContext().getImageData(start.x, start.y, this.size, this.size);
        const target = this.getImageContext().createImageData(img.width * zoom, img.height * zoom);
        let targetPos = 0;
        let sourceStart = 0;
        for(let y = 0; y < img.height; y++) {

            for (let w = 0; w < zoom; w++) {
                let sourcePos = sourceStart;
                let pos = targetPos;
                for(let x = 0; x < img.width; x++) {
                    for (let z = 0; z < zoom; z++) {
                        target.data[pos] = img.data[sourcePos];
                        target.data[pos + 1] = img.data[sourcePos + 1];
                        target.data[pos + 2] = img.data[sourcePos + 2];
                        target.data[pos + 3] = img.data[sourcePos + 3];
                        pos += 4;
                    }
                    sourcePos += 4;
                }
                targetPos += target.width << 2;
            }
            sourceStart += img.width << 2;
        }
        let canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(target, 0, 0);
        if (bgColor !== null) {
            const canvas2 = document.createElement('canvas');
            canvas2.width = target.width;
            canvas2.height = target.height;
            const ctx2 = canvas2.getContext('2d');
            ctx2.fillStyle = bgColor;
            ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
            ctx2.drawImage(canvas, 0, 0);
            canvas = canvas2;
        }

        if (writeCache) {
            this.cache[value] = canvas;
        }
        return canvas;
    }
}

class MapSelectionCellProvider extends TilesMapCellProvider {
    constructor(provider, selection) {
        // TODO improve handling
        super(provider.size, 'foo', provider.tiles, provider.animations, selection.getCells());
        this.provider = provider;
        this.load(() => {});
    }

    getImageContext() {
        return this.provider.getImageContext();
    }

    load(callback) {
        this.provider.load(() => {
            this.data = null;
            this.cellsPerLine = this.provider.cellsPerLine;
            this.maxIndex = this.provider.maxIndex;
            callback();
        });
    }
}

class MapValueCellProvider extends MapSelectionCellProvider {
    constructor(provider, value) {
        super(provider, new CellSelection('rect', [[value]]))
    }
}

class BitmapCellProvider extends CellProvider {

    constructor(size, data = null) {
        super(size);
        this.data = data;
        this.map = [[this.getEmptyCell()]];
    }

    setMap(map) {
        this.map = map;
    }

    load(callback) {
        if (this.hasData()) {
            callback();
            return;
        }

        this.convertURIToImageData(this.data).then(
            (img) => {
                const data = img.imgData;
                this.map = [];
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
                    this.map.push(row);
                }
                this.data = null;
                callback();
            }
        );
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

    getCellType() {
        return 'color';
    }

    isResizeable() {
        return true;
    }

    getEmptyCell() {
        return '#00000000';
    }

    hasData() {
        return this.data === null;
    }
}

class TilesCellProvider extends CellProvider {

    constructor(size, tilesImage) {
        super(size);
        this.data = tilesImage;
        this.imgContext = null;
        this.cellsPerLine = null;
        this.maxIndex = 0;
        this.cache = {};
        this.map = [[0]];
        this.width = null;
        this.cacheZoom = 0;
    }

    hasAutoWidth() {
        return true;
    }

    setWidth(width) {
        width = Math.min(width, this.maxIndex);
        this.width = width;
        this.height = width === null ? null : Math.ceil(this.maxIndex / width);
        this.map = [];
        let index = 0;
        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(index);
                index++;
            }
            this.map.push(row);
        }
    }

    getWidth() {
        return this.width === null ? 1 : this.width;
    }

    getHeight() {
        return this.width === null ? 1 : this.height;
    }

    getMaxIndex() {
        return this.maxIndex;
    }

    load(callback) {
        if (this.hasData()) {
            callback();
            return;
        }
        this.convertURIToImageData(this.data).then(
            (img) => {
                this.data = null;
                const indexCanvas = document.createElement('canvas');
                this.imgContext = indexCanvas.getContext('2d');

                this.cellsPerLine = img.imgData.width / this.size;
                const lines = (img.imgData.height / this.size);
                this.maxIndex =  lines * this.cellsPerLine;
                indexCanvas.width = this.maxIndex * this.size;
                indexCanvas.height = this.size;

                for (let i = 0; i < lines; i++) {
                    this.imgContext.putImageData(img.context.getImageData(0, i * this.size, img.imgData.width, this.size), i * img.imgData.width, 0);
                }
                callback();
            }
        );
    }

    getEventCount() {
        return null;
    }

    getCellType() {
        return 'bitmap';
    }

    isResizeable() {
        return false;
    }

    getEmptyCell() {
        return 0;
    }

    hasData() {
        return this.data === null;
    }

    getPositionOfIndex(index) {
        return {
            x: index * this.size,
            y: 0
        };
    }

    setBitmapForValue(index, imageData) {
        const pos = this.getPositionOfIndex(index);
        this.imgContext.putImageData(imageData, pos.x, pos.y);
        this.cache = {};
    }

    getBitmapForValue(value, zoom, writeCache = true) {
        if (!this.imgContext) {
            return null;
        }

        if (writeCache && zoom !== this.cacheZoom) {
            this.cacheZoom = zoom;
            this.cache = {};
        }

        if (this.cache[value] !== undefined) {
            if (writeCache || this.cacheZoom === zoom) {
                return this.cache[value];
            }
        }

        const index = value;
        const start = this.getPositionOfIndex(index);
        const img = this.imgContext.getImageData(start.x, start.y, this.size, this.size);
        const target = this.imgContext.createImageData(img.width * zoom, img.height * zoom);
        let targetPos = 0;
        let sourceStart = 0;
        for(let y = 0; y < img.height; y++) {

            for (let w = 0; w < zoom; w++) {
                let sourcePos = sourceStart;
                let pos = targetPos;
                for(let x = 0; x < img.width; x++) {
                    for (let z = 0; z < zoom; z++) {
                        target.data[pos] = img.data[sourcePos];
                        target.data[pos + 1] = img.data[sourcePos + 1];
                        target.data[pos + 2] = img.data[sourcePos + 2];
                        target.data[pos + 3] = img.data[sourcePos + 3];
                        pos += 4;
                    }
                    sourcePos += 4;
                }
                targetPos += target.width << 2;
            }
            sourceStart += img.width << 2;
        }
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(target, 0, 0);
        if (writeCache) {
            this.cache[value] = canvas;
        }
        return canvas;
    }
}

class FontCharIndexProvider extends CellProvider {

    constructor(fontMap) {
        const size = Math.max(fontMap.width, fontMap.height);
        super(size);
        this.cache = {};
        this.cacheZoom = 0;
        this.dims = fontMap.map;
        this.mapping = {};
        this.codes = [];
        this.width = null;
        this.height = 1;
        this.charSize = {x: fontMap.width, y: fontMap.height};
        this.data = fontMap.image ? fontMap.image.toDataURL('image/png') : null;
    }

    hasData() {
        return this.data === null;
    }

    load(callback) {
        if (this.hasData()) {
            callback();
            return;
        }
        this.convertURIToImageData(this.data).then(
            (img) => {
                if (this.data === null) {
                    callback(this.codes);
                    return;
                }
                this.data = null;
                const newMap = {};
                const codes = [];
                this.map = [];
                let index = 0;
                let row = [];
                for (let code in this.dims) {
                    const dim = this.dims[code];
                    const charCanvas = document.createElement('canvas');
                    charCanvas.width = this.charSize.x;
                    charCanvas.height = this.charSize.y;
                    const ctx = charCanvas.getContext('2d');
                    ctx.putImageData(img.context.getImageData(dim.x, dim.y, this.charSize.x, this.charSize.y), 0, 0);
                    newMap[code] = charCanvas;
                    codes.push(code);
                    row.push(index);
                    index++;
                }
                this.codes = codes;
                this.codes.sort();
                this.map.push(codes);
                this.mapping = newMap;
                this.width = codes.length;
                this.dims = null;

                callback(codes);
            }
        );
    }

    getCharSize() {
        return this.charSize;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getMaxIndex() {
        return this.codes.length;
    }

    getEventCount() {
        return null;
    }

    getCellType() {
        return 'pure-bitmap';
    }

    isResizeable() {
        return false;
    }

    getEmptyCell() {
        return ' ';
    }

    getCharAt(index) {
        const value = this.codes[index];
        return {
            char: value,
            code: value.charCodeAt(0)
        };
    }

    getCharAtIndex(index) {
        return this.getCharAt(index).char;
    }

    hasCode(code) {
        return this.codes.indexOf(code) !== -1;
    }

    deleteIndex(index) {
        this.deleteChar(this.codes[index]);
    }

    deleteChar(code) {
        if (this.mapping[code] === undefined) {
            return;
        }
        this.mapping[code] = undefined;
        this.codes.splice(this.codes.indexOf(code), 1);
        this.map = [this.codes];
        this.width--;
    }

    addCharCode(code) {
        if (this.codes.indexOf(code) !== -1) {
            return;
        }
        this.codes.push(code);
        this.codes.sort();

        this.map = [this.codes];
        this.width++;
        const canvas = document.createElement('canvas');
        canvas.width = this.charSize.x;
        canvas.height = this.charSize.y;
        this.mapping[code] = canvas;
    }

    getBitmapForIndex(index, zoom, writeCache = true) {
        if (index > this.getMaxIndex()) {
            return null;
        }
        const value = this.codes[index];
        return this.getBitmapForValue(value, zoom, writeCache);
    }

    setBitmapForIndex(index, bitmap) {
        const value = this.codes[index];
        const ctx = this.mapping[value].getContext('2d');
        ctx.putImageData(bitmap, 0, 0);
    }

    setBitmapForValue(value, bitmap) {
        const index = this.codes.indexOf(value);
        if (index !== -1) {
            this.setBitmapForIndex(index, bitmap);
        }
    }

    getBitmapForValue(value, zoom, writeCache = true) {
        if (!this.hasData()) {
            return null;
        }
        if (writeCache && zoom !== this.cacheZoom) {
            this.cacheZoom = zoom;
            this.cache = {};
        }

        if (this.cache[value] !== undefined) {
            if (writeCache || this.cacheZoom === zoom) {
                return this.cache[value];
            }
        }

        const canvas = document.createElement('canvas');
        const targetSize = this.charSize * zoom;
        canvas.width = this.charSize.x * zoom;
        canvas.height = this.charSize.y * zoom;
        const charImg = this.mapping[value];
        if (!charImg) {
            return canvas;
        }

        const charCtx = charImg.getContext('2d');
        const img = charCtx.getImageData(0, 0, this.charSize.x, this.charSize.y);

        const target = charCtx.createImageData(canvas.width, canvas.height);
        let targetPos = 0;
        let sourceStart = 0;
        for(let y = 0; y < img.height; y++) {

            for (let w = 0; w < zoom; w++) {
                let sourcePos = sourceStart;
                let pos = targetPos;
                for(let x = 0; x < img.width; x++) {
                    for (let z = 0; z < zoom; z++) {
                        target.data[pos] = img.data[sourcePos];
                        target.data[pos + 1] = img.data[sourcePos + 1];
                        target.data[pos + 2] = img.data[sourcePos + 2];
                        target.data[pos + 3] = img.data[sourcePos + 3];
                        pos += 4;
                    }
                    sourcePos += 4;
                }
                targetPos += target.width << 2;
            }
            sourceStart += img.width << 2;
        }
        const ctx = canvas.getContext('2d');
        ctx.putImageData(target, 0, 0);
        if (writeCache) {
            this.cache[value] = canvas;
        }
        return canvas;
    }
}

class FontIndexCellProvider extends CellProvider {
    constructor(provider, index) {
        super(provider.size);
        this.provider = provider;
        this.index = index;
        this.map = [[index]];
    }

    load(callback) {
        return this.provider.load(callback);
    }

    hasData() {
        return this.provider.hasData();
    }

    getCellType() {
        return this.provider.getCellType();
    }

    getRect(posX, posY, width, height, raw = false) {
        return this.map;
    }

    getBitmapForValue(value, zoom, writeCache) {
        return this.provider.getBitmapForIndex(this.index, zoom, false);
    }
}

export {
    CellSelection,
    TilesCellProvider,
    BitmapCellProvider,
    TilesMapCellProvider,
    MapSelectionCellProvider,
    MapValueCellProvider,
    FontCharIndexProvider,
    FontIndexCellProvider
};