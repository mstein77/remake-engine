import { d } from '../../helper/helper.js';
import { CellSelection, CellProvider } from "../classes.js"

class TilesMapCellProvider extends CellProvider {

    constructor(model) {
        super(model.tileSize);
        this.model = model;

        this.map = this.model.map;

        this.data = true;
        this.imgContext = null;
        this.cellsPerLine = null;

        this.cache = {};
        this.cacheZoom = 0;
        this.maxIndex = null;
    }

    hasData() {
        return this.data === null;
    }

    load(callback) {
        if (!this.hasData()) {
            const canvas = this.model.tilesImg;
            this.cellsPerLine = canvas.elem.width / this.size;
            this.maxIndex = (canvas.elem.height / this.size) * this.cellsPerLine;
            this.imgContext = canvas.elem.getContext('2d');
            this.data = null;
            callback();
            return;
        }
    }

    getImageContext() {
        return this.imgContext;
    }

    getCellType() {
        return 'bitmap';
    }

    getAliases() {
        const aliases = [];
        for (let alias in this.model.tiles) {
            if (this.model.tiles[alias].index !== undefined && alias != this.model.tiles[alias].index) {
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

    overwriteCell(x, y, value) {
        if (!Array.isArray(value) && Array.isArray(this.model.map[y][x])) {
            this.model.map[y][x][0] = value;
        } else {
            this.model.map[y][x] = value;
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
            if (!this.model.tiles[index] === undefined) {
                throw Error('No index found for tile alias "' + index + '"');
            }
            const tile = this.model.tiles[index];
            if (tile.animation && this.model.animations[tile.animation] !== undefined) {
                index = this.model.animations[tile.animation].frames[0].id;
            } else if (tile.index !== undefined) {
                index = this.model.tiles[index].index;
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

    drawBitmapForValue(target, value, x, y, zoom) {
        this.provider.drawBitmapForIndex(target, this.index, x, y, zoom);
    }

    getBitmapForValue(value, zoom, writeCache) {
        return this.provider.getBitmapForIndex(this.index, zoom, false);
    }
}

export {
    TilesCellProvider,
    BitmapCellProvider,
    TilesMapCellProvider,
    MapSelectionCellProvider,
    MapValueCellProvider,
    FontIndexCellProvider
};