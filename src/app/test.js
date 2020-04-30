import React, {Component, Fragment, useState, useContext, useEffect, useRef, useCallback, useMemo} from "react";
import ReactDOM from 'react-dom';
import './components/base.css';

const CssContext = React.createContext();

class CellSelection {
    constructor(type, cells) {
        this.type = type;
        this.cells = cells;
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
            if (tile.index !== undefined) {
                index = this.tiles[index].index;
            } else if (tile.animation && this.animations[tile.animation] !== undefined) {
                // TODO: index = this.animations[obj.animation].getFrame().id;
                index = this.animations[tile.animation].frames[0].id;
            } else {
                console.log('WTF?', index, tile);
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
        this.imgContext.putImageData(imageData, pos.x, pos.y);
        this.cache = {};
    }

    getImageDataForValue(value) {
        const index = this.getIndexForValue(value);
        const pos = this.getPositionOfIndex(index);
        return this.imgContext.getImageData(pos.x, pos.y, this.size, this.size);
    }

    getBitmapForValue(value, zoom, writeCache = true, bgColor = null) {
        if (!this.imgContext) {
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

class BitmapCellProvider extends CellProvider {

    constructor(size, data) {
        super(size);
        this.data = data;
        this.map = [[this.getEmptyCell()]];
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

function getWindowEventManager() {
    let windowListeners = [];

    const removeListener = (event, listener, options) => {
        const remainingListeners = [];
        for (let item of windowListeners) {
            let match = false;
            if (item.event === event) {
                match = JSON.stringify(options) === JSON.stringify(item.options);
            }
            if (match) {
                window.removeEventListener(event, listener, options);
            } else {
                remainingListeners.push(item);
            }
        }
        windowListeners = remainingListeners;
    };

    const addListener = (event, listener, options) => {
        removeListener(event, listener, options);
        window.addEventListener(event, listener, options);
        windowListeners.push({event, listener, options});
    };

    const clearListeners = () => {
        while(windowListeners.length > 0) {
            const item = windowListeners.pop();
            window.removeEventListener(item.event, item.listener, item.options);
        }
    };

    return {
        addListener,
        removeListener,
        clearListeners
    };
}

class Raster extends React.Component {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.hRulerRef = React.createRef();
        this.vRulerRef = React.createRef();

        this.windowEvents = getWindowEventManager();

        const resize = props.resize !== undefined ? props.resize : true;

        this.state = {
            border: props.border || 0,
            zoom: props.zoom || 1,
            posX: 0,
            posY: 0,
            rulers: props.rulers,
            viewX: props.cellProvider.getWidth(),
            viewY: props.cellProvider.getHeight(),
            resize: props.cellProvider.isResizeable() && resize,
            maxX: props.maxX && !props.full ? props.maxX : null,
            maxY: props.maxY && !props.full ? props.maxY : null,
            writeTransparent: false,
            selection: null,
            markerPosX: null,
            markerPosY: null,
            markerWidth: 1,
            markerHeight: 1,
            toolbars: props.toolbars !== undefined ? props.toolbars : true,
            markerMode: props.markerMode || 'display',
            highlight: false,
            past: [],
            future: []
        };

        this.addPage = this.props.page || 10;

        this.rulerFontSize = 10;
        this.rulerFontWidth = 8;
        this.rulerPadding = 6;
        this.rulerDist = 5;

        this.setBorder = this.setBorder.bind(this);
        this.setBgOpacity = this.setBgOpacity.bind(this);
        this.setBgColor = this.setBgColor.bind(this);
        this.getCanvasSizeForDim = this.getCanvasSizeForDim.bind(this);
        this.redrawCanvas = this.redrawCanvas.bind(this);
        this.renderOverlays = this.renderOverlays.bind(this);
        this.setSelection = this.setSelection.bind(this);
    }

    setBgOpacity(bgOpacity) {
        this.context.setBgOpacity(bgOpacity);
        this.redrawCanvas();
    }

    setBgColor(bgColor) {
        this.context.setBgColor(bgColor);
        this.redrawCanvas();
    }

    setBorder(border) {
        this.setState({
            border
        });
        this.updateDims({border});
    }

    setSelection(selection) {
        this.setState({selection});
        if (this.props.selector) {
            this.props.selector(selection);
        }
    }

    doAction(doAction, undoAction) {
        const action = {doAction, undoAction};
        const past = this.state.past.concat();
        const future = [];
        if (past.length > 10) {
            past.shift();
        }
        past.push(action);
        this.setState({
            past,
            future
        });
        action.doAction();
    };

    undoAction() {
        if (this.state.past.length === 0) {
            return;
        }
        const past = this.state.past.concat();
        const future = this.state.future.concat();
        const action = past.pop();
        future.push(action);
        this.setState({
            past,
            future
        });
        action.undoAction();
    };

    redoAction() {
        if (this.state.future.length === 0) {
            return;
        }
        const past = this.state.past.concat();
        const future = this.state.future.concat();
        const action = future.pop();
        past.push(action);
        this.setState({
            past,
            future
        });
        action.doAction();
    };

    drawRaster(canvas, cellProvider, border, zoom) {
        if (canvas === null) {
            return;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (this.context.bgOpacity) {
            ctx.fillStyle = this.context.bgColor + (Math.min(this.context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const spaceX = canvas.width - border;
        const spaceY = canvas.height - border;
        const size = cellProvider.getSize() * zoom;
        const cellSize = size + border;
        const cellsX = spaceX / cellSize;
        const cellsY = spaceY / cellSize;

        ctx.fillStyle = '#FFFFFF';

        let pos = 0;
        for (let x = 0; x <= cellsX; x++) {
            ctx.fillRect(pos, 0, border, canvas.height);
            pos += cellSize;
        }
        pos = 0;
        for (let y = 0; y <= cellsY; y++) {
            ctx.fillRect(0, pos, canvas.width, border);
            pos += cellSize;
        }

        pos = border;
        const rows = cellProvider.getRect(this.state.posX, this.state.posY, cellsX, cellsY, true);
        const render = (cellProvider.getCellType() === 'color') ?
            (x, y, cell) => {
                ctx.fillStyle = cell;
                ctx.fillRect(x, y, size, size);
            } :
            (x, y, cell) => {
                const img = cellProvider.getBitmapForValue(cell, zoom);
                if (img) {
                    ctx.drawImage(img, x, y);
                }
                const events = cellProvider.getEventCount(cell);
                if (events === null) {
                    if (typeof(cell) === 'string') {
                        ctx.fillStyle = '#00000088';
                        ctx.fillRect(x, y, size, 12);
                        ctx.font = '10px';
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText('' + cell, x + 2, y + 10, size - 4);
                    }
                }

                if (events !== null) {
                    ctx.fillStyle = '#00FF0088';
                    ctx.fillRect(x + 2, y + 2, 12, 12);
                    ctx.strokeStyle = '#000000';
                    ctx.strokeRect(x + 2, y + 2, 12, 12);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '10px';
                    ctx.fillText('' + events, x + 6, y + 12, 12);
                }
            };

        for (let row of rows) {
            for (let x = 0; x < cellsX; x++) {
                render(border + x * cellSize, pos, row[x]);
            }
            pos += cellSize;
        }
    }

    redrawCanvas() {
        if (!this.renderId) {
            this.renderId = requestAnimationFrame(() => {
                if (!this._isMounted) {
                    return;
                }
                const canvas = this.getCanvas();
                this.drawRaster(canvas, this.props.cellProvider, this.state.border, this.state.zoom);

                const fullWidth = 13;
                const smallWidth = 3;
                const padding = this.rulerPadding;
                const fontSize = this.rulerFontSize;
                const border = 1;
                const charWidth = this.rulerFontWidth;
                const cellSize = this.state.zoom * this.props.cellProvider.getSize() + this.state.border;

                const getRulerContext = (rulerCanvas) => {
                    const ctx = rulerCanvas.getContext('2d');
                    ctx.clearRect(0, 0, rulerCanvas.width, rulerCanvas.height);
                    ctx.fillStyle = this.context.contentTextColor;
                    ctx.text = fontSize + 'px Monospace';
                    return ctx;
                };

                if (this.hRulerRef.current) {
                    const hRuler = this.hRulerRef.current;
                    const ctx = getRulerContext(hRuler);
                    ctx.fillRect(0, hRuler.height - border, hRuler.width, border);
                    const maxDigits = ('' + this.props.cellProvider.getWidth()).length;
                    const dist = Math.ceil((maxDigits * charWidth + 2 * padding) / cellSize);
                    for (let i = 0; i < this.state.viewX; i++) {
                        if (i % dist === 0) {
                            if (i + dist - 1 < this.state.viewX) {
                                ctx.fillText('' + (this.state.posX + i), cellSize * i + padding, fontSize);
                            }
                            ctx.fillRect(cellSize * i, hRuler.height - fullWidth, border, fullWidth);
                        } else {
                            ctx.fillRect(cellSize * i, hRuler.height - smallWidth, border, smallWidth);
                        }
                    }
                }

                if (this.vRulerRef.current) {
                    const vRuler = this.vRulerRef.current;
                    const ctx = getRulerContext(vRuler);
                    ctx.fillRect(vRuler.width - border, 0, 1, vRuler.height);
                    const dist = Math.ceil((fontSize + 2 * padding) / cellSize);
                    for (let i = 0; i < this.state.viewY; i++) {
                        if (i % dist === 0) {
                            if (i + dist - 1 < this.state.viewY) {
                                const text = '' + (this.state.posY + i);
                                const width = ctx.measureText(text).width;
                                ctx.fillText(
                                    text,
                                    vRuler.width - padding - width,
                                    cellSize * i + fontSize + (padding >> 1)
                                );
                            }
                            ctx.fillRect(vRuler.width - fullWidth,cellSize * i, fullWidth, border);
                        } else {
                            ctx.fillRect(vRuler.width - smallWidth, cellSize * i, smallWidth, border);
                        }
                    }
                }
                this.renderId = null;
            });
        }
    }

    getCanvas() {
        if (this.props.full) {
            return this.canvasRef.current;
        }
        return (this.canvasRef.current === null) ? null : this.canvasRef.current.getCanvas();
    }

    updateDims(newDims) {
        if (!this._isMounted) {
            return;
        }
        const props = this.props;
        const width = props.cellProvider.getWidth();
        const height = props.cellProvider.getHeight();
        if (this.props.full) {
            this.setState({posX: 0, posY: 0, viewX: width, viewY: height});
            return;
        }
        const _viewX = newDims.viewX !== undefined ? newDims.viewX : this.state.viewX;
        const _viewY = newDims.viewY !== undefined ? newDims.viewY : this.state.viewY;

        const _posX = newDims.posX !== undefined ? newDims.posX : this.state.posX;
        const _posY = newDims.posY !== undefined ? newDims.posY : this.state.posY;

        const _hiddenX = Math.max(width - _viewX, 0);
        const _hiddenY = Math.max(height - _viewY, 0);

        const set = {};

        set.viewX = _viewX;
        if (_posX >= _hiddenX || newDims.endX) {
            set.posX = _hiddenX;
        } else {
            set.posX = _posX;
        }
        set.viewY = _viewY;
        if (_posY >= _hiddenY || newDims.endY) {
            set.posY = _hiddenY;
        } else {
            set.posY = _posY;
        }

        let markerReset = false;

        if (this.state.markerPosX >= width) {
            markerReset = true;
        } else if (this.state.markerPosX + this.state.markerWidth > width) {
            set.markerWidth = width - this.state.markerPosX;
        }
        if (this.state.markerPosY >= height) {
            markerReset = true;
        } else if (this.state.markerPosY + this.state.markerHeight > height) {
            set.markerHeight = height - this.state.markerPosY;
        }

        if (this.state.markerMode === 'row-gap') {
            if (width === 1 || this.state.markerPosX === width - 1) {
                markerReset = true;
            }
        } else if (this.state.markerMode === 'column-gap') {
            if (height === 1 || this.state.markerPosY === height - 1) {
                markerReset = true;
            }
        }

        if (this.state.selection) {
            let selectionReset = (this.state.selection.getWidth() > width || this.state.selection.getHeight() > height);

            if (this.state.selection.getType() === 'rows' && this.state.selection.getWidth() !== width) {
                selectionReset = true;
            }
            if (this.state.selection.getType() === 'columns' && this.state.selection.getHeight() !== height) {
                selectionReset = true;
            }
            if (selectionReset) {
                set.selection = null;
                if (this.props.selector) {
                    this.props.selector(null);
                }
                markerReset = true;
            }
        }

        if (markerReset) {
            set.markerPosX = null;
            set.markerPosY = null;
            set.markerWidth = 1;
            set.markerHeight = 1;
            set.markerMode = this.props.markerMode;
        }
        this.setState(set);
    };

    getRulerSpaceDims() {
        return {
            x: this.rulerFontSize + this.rulerPadding + this.rulerDist + this.context.defaultPadding,
            y: this.rulerFontWidth * ('' + this.props.cellProvider.getHeight()).length + this.rulerPadding + this.rulerDist + this.context.defaultPadding
        };
    }

    getCanvasSizeForDim(width, height, updateViewDim = false) {
        const props = this.props;
        const padding = 20;

        let spaceX = width - (padding * 2) - this.state.border;
        let spaceY = height - (padding * 2) - this.state.border;

        if (this.state.rulers) {
            const rulerSpaceDim = this.getRulerSpaceDims();
            spaceX -= rulerSpaceDim.x;
            spaceY -= rulerSpaceDim.y;
        }
        const cellSize = this.state.zoom * props.cellProvider.getSize() + this.state.border;
        let viewX = props.full ? props.cellProvider.getWidth() : Math.floor(spaceX / cellSize);
        let viewY = props.full ? props.cellProvider.getHeight() : Math.floor(spaceY / cellSize);

        if (updateViewDim && props.cellProvider.hasAutoWidth()) {
            props.cellProvider.setWidth(viewX);
        }

        if (!props.full) {
            viewX = Math.min(viewX, props.cellProvider.getWidth());
            if (this.state.maxX !== null) {
                viewX = Math.min(this.state.maxX, viewX);
            }
            viewY = Math.min(viewY, props.cellProvider.getHeight());
            if (this.state.maxY !== null) {
                viewY = Math.min(this.state.maxY, viewY);
            }
        }

        if (updateViewDim) {
            this.updateDims({
                viewX,
                viewY
            });
        }

        return {
            width: viewX * cellSize + this.state.border,
            height: viewY * cellSize + this.state.border
        }
    }

    getBoundingRect() {
        const canvas = this.getCanvas();
        if (!canvas) {
            return null;
        }
        return canvas.getBoundingClientRect();
    }

    switchToMode(markerMode, data) {
        const set = {
            markerMode
        };
        const resetMarker = (data) => {
            set.markerWidth = 1;
            set.markerHeight = 1;
            set.markerPosX = data && data.x !== undefined ? data.x : null;
            set.markerPosY = data && data.y !== undefined ? data.y : null;
        };

        switch(markerMode) {
            case 'write':
                if (data && data.selection) {
                    set.markerWidth = data.selection.getWidth();
                    set.markerHeight = data.selection.getHeight();
                    set.markerPosX = null;
                    set.markerPosY = null;
                    set.selection = data.selection;
                    if (this.props.selector) {
                        this.props.selector(data.selection);
                    }
                } else {
                    resetMarker(data);
                }
                break;

            case 'rows-select':
            case 'columns-select':
            case 'rect-select':
            case 'row-gap-select':
            case 'column-gap-select':
            case 'pick':
                resetMarker();
                break;

            case 'rows':
            case 'columns':
            case 'rect':
                if (this.state.markerMode === markerMode + '-select') {
                    this.modeSwitchData = data;
                }
                break;

            case 'row-gap':
            case 'column-gap':
                break;

            default:
                console.error('Unknown marker mode given: ', markerMode);
                return;
        }
        this.windowEvents.clearListeners();
        this.setState(set);
    }

    getRasterPosFromEvent(e, outside = false, isGap = false) {
        return this.getRasterPosFromClient({x: e.clientX, y: e.clientY}, outside, isGap);
    }

    getRasterPosFromClient(client, outside = false, gap = false) {
        const rect = this.getBoundingRect();
        if (!rect) {return null}

        const cellsize = this.props.cellProvider.getSize() * this.state.zoom  + this.state.border;
        const rasterPos = {
            x: Math.floor(Math.round(client.x - rect.left)/cellsize),
            y: Math.floor(Math.round(client.y - rect.top)/cellsize),
        };
        const min = gap ? 1 : 0;
        let maxX = this.state.viewX;
        let maxY = this.state.viewY;

        rasterPos.rawX = rasterPos.x;
        rasterPos.rawY = rasterPos.y;
        if (!outside) {
            if (rasterPos.x < min) {
                rasterPos.x = min;
            } else if (rasterPos.x >= maxX) {
                rasterPos.x = maxX - 1;
            }
            if (rasterPos.y < min) {
                rasterPos.y = min;
            } else if (rasterPos.y >= maxY) {
                rasterPos.y = maxY - 1;
            }
        }
        return rasterPos;
    }

    renderOverlays(width, height) {
        let marker = '';
        let markerType = 'rect';
        let mouseMoveCanvas = null;
        let mouseLeaveCanvas = null;
        let mouseDownCanvas = null;
        let highlight = false;
        let showMarker = true && (this.state.markerPosX !== null && this.state.markerPosY !== null);

        let initResize = undefined;
        let initMove = undefined;
        let dblClick = undefined;
        let click = undefined;

        if (!this.lastRasterPos) {
            this.lastRasterPos = {x: null, y: null};
        }

        const initPositionTracking = (clickHandler, trackHandler) => {
            const trackX = (markerType === 'rect' || markerType.startsWith('column'));
            const trackY = (markerType === 'rect' || markerType.startsWith('row'));
            const isGap = (markerType === 'column-gap' || markerType === 'row-gap');

            const mouseTrack = (e, force = false) => {
                const lastRasterPos = this.lastRasterPos;
                const currRasterPos = this.getRasterPosFromEvent(e, false , isGap);
                if (!trackX) {
                    currRasterPos.x = 0;
                }
                if (!trackY) {
                    currRasterPos.y = 0;
                }
                if (force || currRasterPos.x !== lastRasterPos.x || currRasterPos.y !== lastRasterPos.y) {
                    this.lastRasterPos = currRasterPos;
                    const markerPosX = trackX ? this.state.posX + currRasterPos.x : 0;
                    const markerPosY = trackY ? this.state.posY + currRasterPos.y : 0;
                    this.setState({
                        markerPosX,
                        markerPosY
                    });
                    if (trackHandler) {
                        trackHandler(markerPosX, markerPosY);
                    }
                }
            };

            mouseDownCanvas = (e) => {
                clickHandler(e);
                e.preventDefault();
                e.stopPropagation();
            };

            mouseMoveCanvas = (e) => {
                mouseTrack(e);
                e.preventDefault();
                e.stopPropagation();
            };

            mouseLeaveCanvas = (e) => {
                this.lastRasterPos = undefined;
                this.setState({markerPosX: null, markerPosY: null});
                if (this.props.tracker) {
                    this.props.tracker(null, null, 1, 1);
                }
                e.preventDefault();
                e.stopPropagation();
            };
        };

        const initSelectionTracking = (targetMode) => {
            initPositionTracking((e) => {
                this.switchToMode(targetMode, {clientX: e.clientX, clientY: e.clientY});
            });
        };

        const initResizeMoveTracking = (trackAxis) => {
            highlight = true;
            const trackX = trackAxis.indexOf('x') !== -1;
            const trackY = trackAxis.indexOf('y') !== -1;
            const isGap = (markerType === 'column-gap' || markerType === 'row-gap');

            dblClick = (e) => {
                if (this.copyAction) {
                    this.copyAction();
                    e.preventDefault();
                    e.stopPropagation();
                }
            };

            const handleAutoScroll = () => {
                if (!this.autoScroll || !(this.autoScrollX || this.autoScrollY)) {
                    this.autoScroll = undefined;
                    return;
                }
                const dims = {};
                const marker = {};
                if (this.autoScrollX) {
                    const maxPosX = this.props.cellProvider.getWidth() - this.state.viewX;
                    const posX =
                        Math.min(Math.max(this.state.posX + this.autoScrollX, 0), maxPosX);

                    if (this.autoScrollMarker && this.autoScrollMarker.resizeX) {
                        const anchorX = this.autoScrollMarker.anchorPos.x;

                        if (this.autoScrollX < 0) {
                            marker.markerPosX = Math.min(posX, anchorX);
                            marker.markerWidth = Math.abs(posX - anchorX) + 1;
                        } else {
                            const posEndX = posX + this.state.viewX;
                            marker.markerPosX = posEndX < anchorX ? posEndX - 1 : anchorX;
                            marker.markerWidth = Math.abs(posEndX - anchorX) + 1;
                        }
                    } else {
                        marker.markerPosX =
                            Math.min(Math.max(this.state.markerPosX + this.autoScrollX, 0),
                                this.props.cellProvider.getWidth() - this.state.markerWidth);
                    }
                    dims.posX = posX;
                }

                if (this.autoScrollY) {
                    const maxPosY = this.props.cellProvider.getHeight() - this.state.viewY;
                    const posY =
                        Math.min(Math.max(this.state.posY + this.autoScrollY, 0), maxPosY);

                    if (this.autoScrollMarker && this.autoScrollMarker.resizeY) {
                        const anchorY = this.autoScrollMarker.anchorPos.y;

                        if (this.autoScrollY < 0) {
                            marker.markerPosY = Math.min(posY, anchorY);
                            marker.markerHeight = Math.abs(posY - anchorY) + 1;
                        } else {
                            const posEndY = posY + this.state.viewY;
                            marker.markerPosY = posEndY < anchorY ? posEndY - 1 : anchorY;
                            marker.markerHeight = Math.abs(posEndY - anchorY) + 1;
                        }
                    } else {
                        marker.markerPosY =
                            Math.min(Math.max(this.state.markerPosY + this.autoScrollY, 0),
                                this.props.cellProvider.getHeight() - this.state.markerHeight);

                    }
                    dims.posY = posY;
                }
                this.setState(marker);
                this.updateDims(dims);
                initAutoScroll();
            };

            const initAutoScroll = () => {
                this.autoScroll = setTimeout(
                    handleAutoScroll, 100
                );
            };

            const resetAutoScroll = () => {
                if (this.autoScroll) {
                    clearTimeout(this.autoScroll);
                    this.autoScroll = undefined;
                }
                this.autoScrollMarker = false;
                this.autoScrollX = null;
                this.autoScrollY = null;
            };

            const updateAutoScroll = (newRasterPos, autoScrollMarker = null) => {
                if (newRasterPos.rawX < 0 || newRasterPos.rawX > this.state.viewX) {
                    this.autoScrollX = newRasterPos.rawX < 0 ? newRasterPos.rawX : newRasterPos.rawX - this.state.viewX;
                } else {
                    this.autoScrollX = null;
                }
                if (newRasterPos.rawY < 0 || newRasterPos.rawY > this.state.viewY) {
                    this.autoScrollY = newRasterPos.rawY < 0 ? newRasterPos.rawY : newRasterPos.rawY - this.state.viewY;
                } else {
                    this.autoScrollY = null;
                }
                this.autoScrollMarker = autoScrollMarker;
                if (this.autoScrollX || this.autoScrollY) {
                    if (!this.autoScroll) {
                        initAutoScroll();
                    }
                } else {
                    this.autoScroll = undefined;
                }
            };

            initResize = isGap ? null : (e, axis, startX, startY) => {
                const anchorPos = {
                    x: this.state.markerPosX + (!startX ? 0 : this.state.markerWidth - 1),
                    y: this.state.markerPosY + (!startY ? 0 : this.state.markerHeight - 1)
                };
                const resizeX = trackX && axis.indexOf('x') !== -1;
                const resizeY = trackY && axis.indexOf('y') !== -1;

                let lastRasterPos = this.getRasterPosFromEvent(e, true);

                const checkWithLastRasterPos = (e) => {
                    const newRasterPos = this.getRasterPosFromEvent(e, true);
                    updateAutoScroll(newRasterPos, {anchorPos, resizeX, resizeY});

                    // relative width/height from anchorPos
                    const absWidth = newRasterPos.x + this.state.posX - anchorPos.x;
                    const absHeight = newRasterPos.y + this.state.posY - anchorPos.y;

                    // width/height not 0 and within raster?
                    const validX = (resizeX && absWidth !== 0 && newRasterPos.x + 1 >= 0 && newRasterPos.x <= this.state.viewX);
                    const validY = (resizeY && absHeight !== 0 && newRasterPos.y + 1  >= 0 && newRasterPos.y <= this.state.viewY);

                    // rasterPos has changed and has at least one valid raster position?
                    const hasChanged =
                        (newRasterPos.x !== lastRasterPos.x || newRasterPos.y !== lastRasterPos.y) &&
                        (validX || validY);

                    if (hasChanged) {
                        lastRasterPos = newRasterPos;
                        const change = {};

                        if (validX) {
                            if (absWidth > 0) {
                                // grow right => inc width
                                change.markerWidth = absWidth;
                            } else {
                                // grow left => set new width and set position left of anchor
                                change.markerWidth = -absWidth;
                                change.markerPosX = anchorPos.x + absWidth + 1;
                            }
                        }
                        if (validY) {
                            if (absHeight > 0) {
                                change.markerHeight = absHeight;
                            } else {
                                change.markerHeight = -absHeight;
                                change.markerPosY = anchorPos.y + absHeight + 1;
                            }
                        }
                        this.setState(change);
                    }
                };

                const mouseMove = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                };
                this.windowEvents.addListener('mousemove', mouseMove, false);

                this.windowEvents.addListener(
                    'mouseup',
                    (e) => {
                        checkWithLastRasterPos(e);
                        resetAutoScroll();
                        this.windowEvents.removeListener('mousemove', mouseMove, false);
                        e.stopPropagation();
                        e.preventDefault();
                    },
                    {capture: false, once: true}
                );
            };

            initMove = (e) => {
                let lastRasterPos = this.getRasterPosFromEvent(e, false, isGap);
                if (!trackX) {
                    lastRasterPos.x = 0;
                }
                if (!trackY) {
                    lastRasterPos.y = 0;
                }

                const offPos = {
                    x: isGap ? 0 : lastRasterPos.x - (this.state.markerPosX - this.state.posX),
                    y: isGap ? 0 : lastRasterPos.y - (this.state.markerPosY - this.state.posY)
                };

                const checkWithLastRasterPos = (e) => {
                    const newRasterPos = this.getRasterPosFromEvent(e, false, isGap);
                    if (!trackX) {
                        newRasterPos.x = 0;
                    }
                    if (!trackY) {
                        newRasterPos.y = 0;
                    }
                    const xStart = newRasterPos.x - offPos.x;
                    const yStart = newRasterPos.y - offPos.y;

                    let markerPosX = this.state.posX + xStart;
                    let markerPosY = this.state.posY + yStart;

                    const hasChangedX = trackX && newRasterPos.x !== lastRasterPos.x;
                    const hasChangedY = trackY && newRasterPos.y !== lastRasterPos.y;

                    updateAutoScroll(newRasterPos);

                    if (hasChangedX || hasChangedY) {
                        const set = {};
                        if (hasChangedX) {
                            if (markerPosX < 0) {
                                markerPosX = 0;
                            } else if (markerPosX + this.state.markerWidth > this.props.cellProvider.getWidth()) {
                                markerPosX = this.props.cellProvider.getWidth() - this.state.markerWidth;
                            }
                            lastRasterPos.x = newRasterPos.x;
                            set.markerPosX = markerPosX;
                        }
                        if (hasChangedY) {
                            if (markerPosY < 0) {
                                markerPosY = 0;
                            } else if (markerPosY + this.state.markerHeight > this.props.cellProvider.getHeight()) {
                                markerPosY = this.props.cellProvider.getHeight() - this.state.markerHeight;
                            }
                            lastRasterPos.y = newRasterPos.y;
                            set.markerPosY = markerPosY;
                        }
                        this.setState(set);
                    }
                };

                const mouseMove = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                };
                this.windowEvents.addListener('mousemove', mouseMove, false);

                this.windowEvents.addListener(
                    'mouseup',
                    (e) => {
                        checkWithLastRasterPos(e);
                        resetAutoScroll();
                        this.windowEvents.removeListener('mousemove', mouseMove, false);
                        e.stopPropagation();
                        e.preventDefault();
                    },
                    {capture: false, once: true}
                );

            };

            if (this.modeSwitchData !== undefined) {
                initResize(this.modeSwitchData, trackAxis, false, false);
                this.modeSwitchData = undefined;
            }
        };

        const writeSelection = (x, y, clear = false) => {
            if (!this.writePath) {
                this.writePath = {
                    new: {},
                    old: {}
                };
            }
            let type = markerType;
            if (this.state.selection) {
                type = this.state.selection.getType();
            }
            if (type === 'rows') {
                x = 0;
            } else if (type === 'columns') {
                y = 0;
            }

            let segment = null;
            if (this.state.selection) {
                if (clear) {
                    segment = this.props.cellProvider.writeSelection(x, y, this.state.selection, this.props.cellProvider.getEmptyCell(), true);
                } else {
                    segment = this.props.cellProvider.writeSelection(x, y, this.state.selection, null, this.state.writeTransparent);
                }
            } else {
                const old = this.props.cellProvider.getRect(x, y, 1, 1)[0][0];
                this.props.cellProvider.fillRect(x, y, 1, 1, this.props.cellProvider.getEmptyCell());
                const key = x + ' ' + y;
                segment = {
                    old: {[key]: old},
                    new: {[key]: this.props.cellProvider.getEmptyCell()}
                }
            }
            Object.assign(this.writePath.new, segment.new);
            for(let key in segment.old) {
                if (this.writePath.old[key] === undefined) {
                    this.writePath.old[key] = segment.old[key];
                }
            }
        };

        switch (this.state.markerMode) {

            case 'display':
                break;

            case 'pick':
                initPositionTracking((e) => {
                    const rasterPos = this.getRasterPosFromEvent(e);
                    const selection = this.props.cellProvider.getSelection(
                        this.state.posX + rasterPos.x,
                        this.state.posY + rasterPos.y,
                        1,
                        1
                    );
                    if (this.props.selector) {
                        this.props.selector(selection);
                    }
                    this.setState({
                        selection
                    });
                });
                break;

            case 'write':
                if (this.state.selection) {
                    markerType = this.state.selection.getType();
                }
                highlight = this.isDown;

                const trackEventPosition = (x, y) => {
                    if (this.props.tracker) {
                        this.props.tracker(
                            x, y,
                            this.state.selection ? this.state.selection.getWidth() : 1,
                            this.state.selection ? this.state.selection.getHeight() : 1
                        );
                    }
                    if (!this.isDown) {
                        return;
                    }
                    writeSelection(x, y, false);
                };

                initPositionTracking((e) => {
                    this.isDown = true;
                    const currRasterPos = this.getRasterPosFromEvent(e);
                    const markerPosX = this.state.posX + currRasterPos.x;
                    const markerPosY = this.state.posY + currRasterPos.y;
                    trackEventPosition(markerPosX, markerPosY);
                    this.setState({highlight: !this.state.highlight});
                    this.windowEvents.addListener('mouseup', (e) => {
                        this.isDown = false;
                        if (this.writePath) {
                            const doPath = this.writePath.new;
                            const undoPath = this.writePath.old;
                            const doAction = () => {
                                this.props.cellProvider.writePath(doPath);
                                this.redrawCanvas();
                            };
                            const undoAction = () => {
                                this.props.cellProvider.writePath(undoPath);
                                this.redrawCanvas();
                            };
                            this.doAction(
                                doAction, undoAction
                            );
                        }
                        this.writePath = undefined;
                        this.setState({highlight: !this.state.highlight});
                        e.preventDefault();
                        e.stopPropagation();
                    }, {once: true, capture: false});
                }, trackEventPosition);
                break;

            case 'rows-select':
                markerType = 'rows';
                initSelectionTracking('rows');
                break;

            case 'rows':
                markerType = 'rows';
                initResizeMoveTracking('y');
                break;

            case 'columns-select':
                markerType = 'columns';
                initSelectionTracking('columns');
                break;

            case 'columns':
                markerType = 'columns';
                initResizeMoveTracking('x');
                break;

            case 'row-gap-select':
                markerType = 'row-gap';
                initSelectionTracking('row-gap');
                break;

            case 'row-gap':
                markerType = 'row-gap';
                initResizeMoveTracking('y');
                break;

            case 'column-gap-select':
                markerType = 'column-gap';
                initSelectionTracking('column-gap');
                break;

            case 'column-gap':
                markerType = 'column-gap';
                initResizeMoveTracking('x');
                break;

            case 'rect-select':
                initSelectionTracking('rect');
                break;

            case 'rect':
                initResizeMoveTracking('xy');
                break;
        }

        if (showMarker) {
            let offX = null;
            let offWidth = null;
            let hasLeft = false;
            let hasRight = false;
            let offY = null;
            let offHeight = null;
            let hasTop = false;
            let hasBottom = false;

            const markerEndX = this.state.markerPosX + this.state.markerWidth - 1;
            const viewEndX = this.state.posX + this.state.viewX - 1;
            if (this.state.posX <= markerEndX && this.state.markerPosX <= viewEndX) {
                const lastX = Math.min(markerEndX, viewEndX);
                offX = Math.max(this.state.posX, this.state.markerPosX);
                offWidth = Math.min(this.state.markerWidth, lastX - offX + 1);
                hasLeft = (this.state.markerPosX === offX);
                hasRight = (lastX === markerEndX);
                offX -= this.state.posX;
            }
            const markerEndY = this.state.markerPosY + this.state.markerHeight - 1;
            const viewEndY = this.state.posY + this.state.viewY - 1;
            if (this.state.posY <= markerEndY && this.state.markerPosY <= viewEndY) {
                const lastY = Math.min(markerEndY, viewEndY);
                offY = Math.max(this.state.posY, this.state.markerPosY);
                offHeight = Math.min(this.state.markerHeight, lastY - offY + 1);
                hasTop = (this.state.markerPosY === offY);
                hasBottom = (lastY === markerEndY);
                offY -= this.state.posY;
            }

            if (markerType === 'columns') {
                offY = 0;
                offHeight = this.state.viewY;
                hasTop = false;
                hasBottom = false;
            } else if (markerType === 'rows') {
                offX = 0;
                offWidth = this.state.viewX;
                hasLeft = false;
                hasRight = false;
            } else if (markerType === 'row-gap') {
                offX = 0;
                offWidth = this.state.viewX;
                hasTop = false;
                hasBottom = false;
                hasLeft = false;
                hasRight = false;
            }  else if (markerType === 'column-gap') {
                offY = 0;
                offHeight = this.state.viewY;
                hasTop = false;
                hasBottom = false;
                hasLeft = false;
                hasRight = false;
            }

            marker = <CellMarker
                initMove={initMove}
                initResize={initResize}
                dblClick={dblClick}
                click={click}
                blink
                size={this.props.cellProvider.getSize()}
                border={this.state.border}
                zoom={this.state.zoom}
                type={markerType}
                highlight={highlight}
                posX={offX} posY={offY}
                width={offWidth} height={offHeight}
                top={hasTop} bottom={hasBottom} left={hasLeft} right={hasRight}
            />;
        }
        let rulers = '';
        if (this.state.rulers) {
            const hRulerHeight = this.rulerFontSize + this.rulerPadding;
            const vRulerWidth = this.rulerFontWidth * ('' + this.props.cellProvider.getHeight()).length + this.rulerPadding;
            rulers =
                <Fragment>
                    <div style={{width, height: hRulerHeight, top: -(hRulerHeight + this.rulerDist + 5), left: 0, position: 'absolute'}}>
                        <canvas ref={this.hRulerRef} width={width} height={hRulerHeight}></canvas>
                    </div>
                    <div style={{width: vRulerWidth, height, top: 0, left: -(vRulerWidth + this.rulerDist + 5), position: 'absolute'}}>
                        <canvas ref={this.vRulerRef} width={vRulerWidth} height={height}></canvas>
                    </div>
                </Fragment>;
        }
        const cancel = (e) => {
            const pos = this.getRasterPosFromEvent(e);
            if (this.state.markerMode !== 'write') {
                this.switchToMode('write', pos);
            } else {
                const posX = this.state.posX + pos.x;
                const posY = this.state.posY + pos.y;
                writeSelection(posX, posY, true);
                const doPath = this.writePath.new;
                const undoPath = this.writePath.old;
                const doAction = () => {
                    this.props.cellProvider.writePath(doPath);
                    this.redrawCanvas();
                };
                const undoAction = () => {
                    this.props.cellProvider.writePath(undoPath);
                    this.redrawCanvas();
                };
                this.doAction(doAction, undoAction);
                this.writePath = undefined;
            }
            e.preventDefault();
        };

        return (
            <Fragment>
            <div
                onContextMenu={cancel}
                onMouseMove={mouseMoveCanvas}
                onMouseLeave={mouseLeaveCanvas}
                onMouseDown={mouseDownCanvas}
                style={{width, height, top: 0, left: 0, position: 'absolute'}}
            >
                {marker}
            </div>
                {rulers}
            </Fragment>
        );
    }

    render() {
        const props = this.props;

        let canvas = '';
        if (props.full) {
            const cellSize = props.cellProvider.getSize() * this.state.zoom  + this.state.border;
            const width = cellSize * props.cellProvider.getWidth() + this.state.border;
            const height = cellSize * props.cellProvider.getHeight() + this.state.border;
            const style = {};
            if (this.state.rulers) {
                const rulerSpaceDims = this.getRulerSpaceDims();
                style.paddingLeft = rulerSpaceDims.x;
                style.paddingTop = rulerSpaceDims.y;
            }

            canvas =
                <div className="auto-scroll" style={style}>
                    <div className="rel-canvas marker-space">
                        <canvas ref={this.canvasRef} width={width} height={height} />
                        {this.renderOverlays(width, height)}
                    </div>
                </div>
        } else {
            canvas = <FitCanvas ref={this.canvasRef} renderOverlays={this.renderOverlays} getCanvasSizeForDim={this.getCanvasSizeForDim} redrawCanvas={this.redrawCanvas} />
        }

        const setZoom = zoom => {
            this.setState({zoom});
            requestAnimationFrame(() => {
                if (this.canvasRef.current && this.canvasRef.current.trigger) {
                    // prevent state update problems
                    this.canvasRef.current.trigger();
                }
            });
        };
        const setPosX = posX => {this.setState({posX})};
        const setPosY = posY => {this.setState({posY})};
        const setMarkerPosX = markerPosX => {this.setState({markerPosX})};
        const setMarkerPosY = markerPosY => {this.setState({markerPosY})};
        const setMarkerWidth = markerWidth => {this.setState({markerWidth})};
        const setMarkerHeight = markerHeight => {this.setState({markerHeight})};

        const cellsX = props.cellProvider.getWidth();
        const cellsY = props.cellProvider.getHeight();
        const hiddenX = cellsX - this.state.viewX;
        const hiddenY = cellsY - this.state.viewY;

        const addRows = (no, start) => {
            let added = null;
            let oldPosY = this.state.posY;
            let undoSelection = null;
            let min = Math.min(Math.abs(no), props.cellProvider.getHeight() - 1);

            const doAction = () => {
                if (no < 0) {
                    undoSelection = this.props.cellProvider.getRawSelection(
                        0, start ? 0 : props.cellProvider.getHeight() - min,
                        props.cellProvider.getWidth(), min
                    );
                }
                added = props.cellProvider.addRows(start, no);
                if (no < 0) {
                    added *= -1;
                }
                const _posY = start ? 0 : Math.max(0, oldPosY + added);
                this.updateDims({posY: _posY, endY: !start});
            };

            const undoAction = () => {
                props.cellProvider.addRows(start, -added);
                if (undoSelection) {
                    this.props.cellProvider.fillRectWithRawSelection(
                        0, start ? 0 : props.cellProvider.getHeight() + added,
                        props.cellProvider.getWidth(), -added,
                        undoSelection
                    );
                }
                this.updateDims({posY: oldPosY, endY: !start});
            };
            this.doAction(doAction, undoAction);
        };

        const addColumns = (no, start) => {
            let added = null;
            let oldPosX = this.state.posX;
            let undoSelection = null;
            let min = Math.min(Math.abs(no), props.cellProvider.getWidth() - 1);

            const doAction = () => {
                if (no < 0) {
                    undoSelection = this.props.cellProvider.getRawSelection(
                        start ? 0 : props.cellProvider.getWidth() - min, 0,
                        min, props.cellProvider.getHeight()
                    );
                }
                added = props.cellProvider.addColumns(start, no);
                if (no < 0) {
                    added *= -1;
                }
                const _posX = start ? 0 : Math.max(0, oldPosX + added);
                this.updateDims({posX: _posX, endX: !start});
            };

            const undoAction = () => {
                props.cellProvider.addColumns(start, -added);
                if (undoSelection) {
                    this.props.cellProvider.fillRectWithRawSelection(
                        start ? 0 : props.cellProvider.getWidth() + added, 0,
                        -added, props.cellProvider.getHeight(),
                        undoSelection
                    );
                }
                this.updateDims({posX: oldPosX, endX: !start});
            };

            this.doAction(doAction, undoAction);
        };

        const getSizeButtons = (start, vertical) => {
            const callback = vertical ? addRows : addColumns;
            const pos = vertical ? this.state.posY : this.state.posX;
            const height = props.cellProvider.getHeight();
            const width = props.cellProvider.getWidth();
            const maxPos = vertical ? height - this.state.viewY : width - this.state.viewX;
            const max = vertical ? height : width;
            const btnAdd1Attr = {};
            const btnAddPageAttr = {};
            const btnSub1Attr = {};
            const btnSubPageAttr = {};
            const btnJumpAttr = {};
            const jumpChar = (start ? 'first' : 'last') + '_page';
            const materialCls = ['material-icons md-18'];
            if (vertical) {
                materialCls.push('rotate-90');
            }

            if (pos !== (start ? 0 : maxPos)) {
                btnAdd1Attr.disabled = 'disabled';
                btnSub1Attr.disabled = 'disabled';
                btnAddPageAttr.disabled = 'disabled';
                btnSubPageAttr.disabled = 'disabled';
                btnJumpAttr.onClick = () => {
                    const target = {};
                    target[vertical ? 'posY' : 'posX'] = start ? 0 : maxPos;
                    this.updateDims(target);
                };
            } else {
                btnJumpAttr.disabled = 'disabled';
                btnAdd1Attr.onClick = () => {
                    callback(1, start);
                };
                btnAddPageAttr.onClick = () => {
                    callback(this.addPage, start);
                };
                if (max === 1) {
                    btnSub1Attr.disabled = 'disabled';
                    btnSubPageAttr.disabled = 'disabled';
                } else {
                    btnSub1Attr.onClick = () => {
                        callback(-1, start);
                    };
                    btnSubPageAttr.onClick = () => {
                        callback(-this.addPage, start);
                    }
                }
            }
            const jumpBtn =  props.full ? '' : <button {...btnJumpAttr}><i className={materialCls.join(' ')}>{jumpChar}</i></button>;

            const br = vertical ? '' : <br />;
            return (<div>
                <button {...btnSubPageAttr}>--</button>{br}
                <button {...btnSub1Attr}>-</button>{br}
                {jumpBtn}
                <button {...btnAdd1Attr}>+</button>{br}
                <button {...btnAddPageAttr}>++</button>
            </div>)
        };

        const getNavButton = (startX, startY, rotate) => {
            if (props.full) {
                return '';
            }
            const jumpChar = (startX ? 'first' : 'last') + '_page';
            const materialCls = ['material-icons md-18'];
            const endX = this.props.cellProvider.getWidth() - this.state.viewX;
            const endY = this.props.cellProvider.getHeight() - this.state.viewY;
            const btnAttr = {
                onClick: () => {
                    this.updateDims({
                        posX: startX ? 0 : endX,
                        posY: startY ? 0 : endY
                    });
                }
            };
            if (((startX && this.state.posX === 0) || (!startX && this.state.posX === endX)) && (
                ((startY && this.state.posY === 0) || (!startY && this.state.posY === endY))
            )) {
                btnAttr.disabled = 'disabled';
            };
            return (
                <button {...btnAttr}>
                    <i className={materialCls.join(' ')} style={{transform: 'rotate(' + rotate + 'deg)'}}>{jumpChar}</i>
                </button>
            );
        };
        const gridCls = ['full-v'];
        let topRow = '';
        let leftMidCell = '';
        let leftBottomCell = '';
        let rightBottomCell = '';
        const fixed = !this.state.resize;
        if (fixed) {
            gridCls.push('grid-2x2');
        } else {
            gridCls.push('grid-3x3');
            const topButtons = getSizeButtons(true, true);
            topRow =
                <Fragment>
                    <div>{getNavButton(true, true, 45)}</div>
                    <div>
                        <Stack dir="y" center>{topButtons}</Stack>
                    </div>
                    <div className="align-right">{getNavButton(false, true, -45)}</div>
                </Fragment>;
            rightBottomCell = getNavButton(false, false, 45);

            const leftButtons = getSizeButtons(true, false);
            leftMidCell =
                <div>
                    <Stack dir="x" center full>
                        {leftButtons}
                    </Stack>
                </div>;

            leftBottomCell = <div className="align-bottom">{getNavButton(true, false, -45)}</div>;
        }
        const rightButtons = fixed ? '' : getSizeButtons(false, false);
        const bottomButtons = fixed ? '' : getSizeButtons(false, true);

        let topToolbar = '';
        let bottomToolbar = '';

        if (this.state.toolbars) {
            const posSize = props.full ? '' :
                <Fragment>
                    <Dim name="Size:" x={cellsX} y={cellsY} maxX={cellsX} maxY={cellsY} min="1" readOnly/>
                    <Dim name="Position:" buttons x={this.state.posX} setX={setPosX} y={this.state.posY} setY={setPosY}
                         maxX={hiddenX} maxY={hiddenY} min="0" readOnly/>
                </Fragment>;
            const zoomInput = props.maxZoom !== 1 ?
                <Int name="Zoom:" readOnly min="1" max={props.maxZoom} set={setZoom} value={this.state.zoom}
                     buttons/> : '';

            let bottomTools = [];
            const bottomActions = [];
            this.copyAction = undefined;
            if (['rect', 'columns', 'rows', 'column-gap', 'row-gap'].indexOf(this.state.markerMode) !== -1) {
                bottomActions.push(
                    <button key="goto" onClick={() => {
                        let posX = this.state.markerPosX;
                        if (this.state.markerMode === 'column-gap' && posX > 0) {
                            posX--;
                        }
                        let posY = this.state.markerPosY;
                        if (this.state.markerMode === 'row-gap' && posY > 0) {
                            posY--;
                        }
                        this.updateDims({posX, posY})
                    }}>
                        Goto
                    </button>
                );
            }

            if (['rect', 'columns', 'rows'].indexOf(this.state.markerMode) !== -1) {
                bottomActions.push(
                    <button key="clear" onClick={() => {
                        const markerPosX = this.state.markerPosX;
                        const markerPosY = this.state.markerPosY;
                        const markerMode = this.state.markerMode;
                        const width = markerMode === 'rows' ? props.cellProvider.getWidth() : this.state.markerWidth;
                        const height = markerMode === 'columns' ? props.cellProvider.getHeight() : this.state.markerHeight;
                        const undoSelection = props.cellProvider.getSelection(
                            markerPosX,
                            markerPosY,
                            width,
                            height
                        );
                        const doAction = () => {
                            props.cellProvider.fillRect(
                                markerPosX,
                                markerPosY,
                                width,
                                height,
                                props.cellProvider.getEmptyCell()
                            );
                            this.redrawCanvas();
                        };
                        const undoAction = () => {
                            props.cellProvider.fillRectWithSelection(
                                markerPosX,
                                markerPosY,
                                width,
                                height,
                                undoSelection
                            );
                            this.redrawCanvas();
                        };
                        this.doAction(doAction, undoAction);
                    }}>Clear</button>
                );
                if (this.state.markerMode === 'rect') {
                    bottomTools.push(
                        <Dim key="pos" name="Position:" buttons x={this.state.markerPosX} setX={setMarkerPosX}
                             y={this.state.markerPosY} setY={setMarkerPosY} maxX={cellsX - this.state.markerWidth}
                             maxY={cellsY - this.state.markerHeight} min="0" readOnly/>
                    );
                    if (this.state.resize) {
                        bottomActions.push(
                            <button key="cutout" onClick={() => {
                                const markerPosX = this.state.markerPosX;
                                const markerPosY = this.state.markerPosY;
                                const markerWidth = this.state.markerWidth;
                                const markerHeight = this.state.markerHeight;
                                const oldWidth = props.cellProvider.getWidth();
                                const oldHeight = props.cellProvider.getHeight();
                                const undoSelection = props.cellProvider.getRawSelection(
                                    0, 0, oldWidth, oldHeight
                                );

                                const doAction = () => {
                                    props.cellProvider.reduceToRect(
                                        markerPosX,
                                        markerPosY,
                                        markerWidth,
                                        markerHeight
                                    );
                                    this.updateDims({});
                                    this.switchToMode('write');
                                };

                                const undoAction = () => {
                                    props.cellProvider.importRawSelection(undoSelection);
                                    this.updateDims({});
                                    this.switchToMode('write');
                                };
                                this.doAction(doAction, undoAction);

                            }}>Cut-Out</button>
                        );
                    }
                    this.copyAction = () => {
                        const rect = props.cellProvider.getRect(
                            this.state.markerPosX,
                            this.state.markerPosY,
                            this.state.markerWidth,
                            this.state.markerHeight
                        );
                        this.switchToMode('write', {selection: new CellSelection('rect', rect)});
                    };
                    bottomActions.push(
                        <button key="copy" onClick={this.copyAction}>Copy</button>
                    );
                } else if (this.state.markerMode !== 'write') {
                    bottomTools.push(
                        <Int key="pos" name="Position:" buttons min="0"
                             value={this.state[this.state.markerMode === 'rows' ? 'markerPosY' : 'markerPosX']}
                             set={this.state.markerMode === 'rows' ? setMarkerPosY : setMarkerPosX}
                             max={this.state.markerMode === 'rows' ? cellsY - this.state.markerHeight : cellsX - this.state.markerWidth}
                        />
                    );
                    if (this.state.resize) {
                        const disabled =
                            (
                                this.state.markerMode === 'rows' ?
                                    props.cellProvider.getHeight() === this.state.markerHeight :
                                    props.cellProvider.getWidth() === this.state.markerWidth
                            );
                        bottomActions.push(
                            <button key="del" onClick={() => {
                                const markerMode = this.state.markerMode;
                                const markerPosY = this.state.markerPosY;
                                const markerPosX = this.state.markerPosX;
                                const markerWidth = this.state.markerWidth;
                                const markerHeight = this.state.markerHeight;
                                const undoSelection = props.cellProvider.getRawSelection(0, 0, cellsX, cellsY);
                                const doAction = () => {
                                    if (markerMode === 'rows') {
                                        props.cellProvider.deleteRows(markerPosY, markerHeight);
                                    } else {
                                        props.cellProvider.deleteColumns(markerPosX, markerWidth);
                                    }
                                    this.updateDims({});
                                    this.switchToMode('write');
                                };
                                const undoAction = () => {
                                    props.cellProvider.importRawSelection(undoSelection);
                                    this.updateDims({});
                                };
                                this.doAction(doAction, undoAction);
                            }} disabled={disabled}>Delete</button>
                        );

                        bottomActions.push(
                            <button key="cutout" onClick={() => {
                                const markerMode = this.state.markerMode;
                                const markerPosY = this.state.markerPosY;
                                const markerPosX = this.state.markerPosX;
                                const markerWidth = this.state.markerWidth;
                                const markerHeight = this.state.markerHeight;
                                const undoSelection = props.cellProvider.getRawSelection(0, 0, cellsX, cellsY);

                                const doAction = () => {
                                    if (markerMode === 'rows') {
                                        props.cellProvider.reduceToRect(
                                            0,
                                            markerPosY,
                                            props.cellProvider.getWidth(),
                                            markerHeight
                                        );
                                    } else {
                                        props.cellProvider.reduceToRect(
                                            markerPosX,
                                            0,
                                            markerWidth,
                                            props.cellProvider.getHeight()
                                        );
                                    }
                                    this.updateDims({});
                                    this.switchToMode('write');
                                };
                                const undoAction = () => {
                                    props.cellProvider.importRawSelection(undoSelection);
                                    this.updateDims({});
                                };
                                this.doAction(doAction, undoAction);
                            }}>Cut-Out</button>
                        );
                    }
                    this.copyAction = () => {
                        const rect = props.cellProvider.getRect(
                            this.state.markerPosX,
                            this.state.markerPosY,
                            this.state.markerMode === 'rows' ? this.props.cellProvider.getWidth() : this.state.markerWidth,
                            this.state.markerMode === 'columns' ? this.props.cellProvider.getHeight() : this.state.markerHeight
                        );
                        this.switchToMode('write', {selection: new CellSelection(this.state.markerMode, rect)});
                    };
                    bottomActions.push(
                        <button key="copy" onClick={this.copyAction}>Copy</button>
                    );
                }
                bottomActions.push(
                    <button key="fill" onClick={() => {
                        const markerPosX = this.state.markerPosX;
                        const markerPosY = this.state.markerPosY;
                        const width = this.state.markerMode === 'rows' ? props.cellProvider.getWidth() : this.state.markerWidth;
                        const height = this.state.markerMode === 'columns' ? props.cellProvider.getHeight() : this.state.markerHeight;
                        const doSelection = this.state.selection;
                        const undoSelection = props.cellProvider.getSelection(
                            markerPosX,
                            markerPosY,
                            width,
                            height
                        );
                        const doAction = () => {
                            props.cellProvider.fillRectWithSelection(
                                markerPosX,
                                markerPosY,
                                width,
                                height,
                                doSelection
                            );
                            this.redrawCanvas();
                        };
                        const undoAction = () => {
                            props.cellProvider.fillRectWithSelection(
                                markerPosX,
                                markerPosY,
                                width,
                                height,
                                undoSelection
                            );
                        };
                        this.doAction(doAction, undoAction);
                    }}>Fill</button>
                );
            } else if (['row-gap', 'column-gap'].indexOf(this.state.markerMode) !== -1) {
                bottomTools.push(
                    <Int key="pos" name="Position:" buttons min="1"
                         value={this.state[this.state.markerMode === 'row-gap' ? 'markerPosY' : 'markerPosX']}
                         set={this.state.markerMode === 'row-gap' ? setMarkerPosY : setMarkerPosX}
                         max={this.state.markerMode === 'row-gap' ? cellsY - this.state.markerHeight : cellsX - this.state.markerWidth}
                    />
                );
                const insertGap = (no) => {
                    if (this.state.markerMode === 'row-gap') {
                        const oldMarkerPosY = this.state.markerPosY;
                        const doAction = () => {
                            props.cellProvider.insertRowsAt(oldMarkerPosY, no);
                            this.setState({markerPosY: oldMarkerPosY + no});
                            this.updateDims({});
                        };
                        const undoAction = () => {
                            props.cellProvider.deleteRows(oldMarkerPosY, no);
                            this.setState({markerPosY: oldMarkerPosY});
                            this.updateDims({});
                        };
                        this.doAction(doAction, undoAction);
                    } else {
                        const oldMarkerPosX = this.state.markerPosX;
                        const doAction = () => {
                            props.cellProvider.insertColumnsAt(oldMarkerPosX, no);
                            this.setState({markerPosX: oldMarkerPosX + no});
                            this.updateDims({});
                        };
                        const undoAction = () => {
                            props.cellProvider.deleteColumns(oldMarkerPosX, no);
                            this.setState({markerPosX: oldMarkerPosX});
                            this.updateDims({});
                        };
                        this.doAction(doAction, undoAction);
                    }
                };

                this.copyAction = () => {
                    insertGap(1);
                };

                bottomActions.push(
                    <button key="add1" onClick={() => {
                        insertGap(1);
                    }}>+</button>
                );
                bottomActions.push(
                    <button key="add10" onClick={() => {
                        insertGap(this.addPage);
                    }}>++</button>
                );
            }

            if (['rect', 'columns', 'rows'].indexOf(this.state.markerMode) !== -1) {
                if (this.state.markerMode === 'rect') {
                    bottomTools.push(
                        <Dim key="size" name="Size:" buttons x={this.state.markerWidth} setX={setMarkerWidth}
                             y={this.state.markerHeight} setY={setMarkerHeight}
                             maxX={cellsX - this.state.markerPosX} maxY={cellsY - this.state.markerPosY} min="1"
                             readOnly/>
                    );
                } else {
                    bottomTools.push(
                        <Int key="size" name={this.state.markerMode === 'rows' ? 'Rows:' : 'Columns'} buttons min="1"
                             value={this.state[this.state.markerMode === 'rows' ? 'markerHeight' : 'markerWidth']}
                             set={this.state.markerMode === 'rows' ? setMarkerHeight : setMarkerWidth}
                             max={this.state.markerMode === 'rows' ? cellsY - this.state.markerPosY : cellsX - this.state.markerPosX}
                        />
                    );
                }
            }
            if (['rect', 'columns', 'rows', 'row-gap', 'column-gap'].indexOf(this.state.markerMode) !== -1) {
                bottomActions.push(
                    <button key="abort" onClick={() => {
                        this.switchToMode('write')
                    }}>X</button>
                );
            } else if (this.state.markerMode === 'write') {
                bottomActions.push(
                    <SwitchButton key="writeTransparent" enabled={this.state.writeTransparent}
                                  switch={(writeTransparent) => {
                                      this.setState({writeTransparent})
                                  }}>Transparent</SwitchButton>
                );
            }
            bottomToolbar =
                <Toolbar>
                    <div>Mode: {this.state.markerMode}</div>
                    {bottomTools}
                    {bottomActions}
                </Toolbar>;

            const undoAttr = {
                onClick: () => {
                    this.undoAction()
                }
            };
            if (this.state.past.length === 0) {
                undoAttr.disabled = 'disabled'
            }
            const redoAttr = {
                onClick: () => {
                    this.redoAction();
                }
            };
            if (this.state.future.length === 0) {
                redoAttr.disabled = 'disabled'
            }

            const gapButtons = this.state.resize ?
                <Fragment>
                    <SwitchButton enabled={this.state.markerMode.startsWith('row-gap')} switch={(enabled) => {
                        this.switchToMode(enabled ? 'row-gap-select' : 'write')
                    }}>Row Gap</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('column-gap')} switch={(enabled) => {
                        this.switchToMode(enabled ? 'column-gap-select' : 'write')
                    }}>Column Gap</SwitchButton>
                </Fragment>
                : '';
            topToolbar = <Toolbar>
                <div>
                    <button {...undoAttr}>Undo</button>
                    <button {...redoAttr}>Redo</button>
                </div>
                <Stack dir="x">
                    <SwitchButton enabled={this.state.markerMode === 'pick'} switch={(enabled) => {this.switchToMode(enabled ? 'pick' : 'write')}}>Pick</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rect')} switch={(enabled) => {this.switchToMode(enabled ? 'rect-select' : 'write')}}>Rect</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rows')} switch={(enabled) => {this.switchToMode(enabled ? 'rows-select' : 'write')}}>Rows</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('columns')} switch={(enabled) => {this.switchToMode(enabled ? 'columns-select' : 'write')}}>Columns</SwitchButton>
                    {gapButtons}
                </Stack>
                {posSize}
                {zoomInput}
                <Int name="Border:" readOnly min="0" max="5" set={this.setBorder} value={this.state.border} buttons />
                <Checkbox name="Rulers" value={this.state.rulers} set={(rulers) => {
                    this.setState({rulers});
                }} />
                <Int name="Background:" readOnly min="0" max="26" set={this.setBgOpacity} value={this.context.bgOpacity} buttons />
                <Color value={this.context.bgColor} set={this.setBgColor} />
            </Toolbar>;
        }
        return (
            <Stack dir="y" border full>
                {topToolbar}
                <div className="padded flex">
                    <div className={gridCls.join(' ')}>
                        {topRow}

                        {leftMidCell}
                        <div style={{display: 'inline-block'}}>
                            {canvas}
                        </div>

                        <div>
                            <Stack dir="x" center full>
                                <Scrollbar vertical auto set={(value) => {this.updateDims({posY: value})}} max={this.props.cellProvider.getHeight()} pos={this.state.posY} page={this.state.viewY} />
                                {rightButtons}
                            </Stack>
                        </div>

                        {leftBottomCell}
                        <div>
                            <Stack dir="y" center>
                                <Scrollbar auto set={(value) => {this.updateDims({posX: value})}} max={this.props.cellProvider.getWidth()} pos={this.state.posX} page={this.state.viewX} />
                                {bottomButtons}
                            </Stack>
                        </div>
                        <div className="align-right align-bottom">{rightBottomCell}</div>
                    </div>
                </div>

                {bottomToolbar}
            </Stack>
        );
    }

    componentDidMount() {
        this._isMounted = true;
        this.props.cellProvider.load(() => {
            this.updateDims({});
        });
    }

    componentDidUpdate() {
        this.redrawCanvas();
    }

    componentWillUnmount() {
        this._isMounted = false;
        if (this.renderId !== null) {
            cancelAnimationFrame(this.renderId);
        }
    }
}
Raster.contextType = CssContext;
Raster._isMounted = false;

class FitCanvas extends React.Component {

    constructor(props) {
        super(props);
        this.divRef = React.createRef();
        this.canvasRef = React.createRef();
        this.state = {
            width: null,
            height: null
        };
    }

    getCanvas() {
        return this.canvasRef.current;
    }

    render() {
        let overlays = this.props.renderOverlays !== undefined ?
            this.props.renderOverlays(this.state.width, this.state.height) : null;

        const cls = ['rel-canvas marker-space checkboard-bg'];
        const canvas = (this.state.width && this.state.height) ?
            <div className={cls.join(' ')}>
                <canvas ref={this.canvasRef} width={this.state.width} height={this.state.height} />
                {overlays}
            </div> : '';

        return(
            <div ref={this.divRef} className="full-v stack-h centered items-centered">
                {canvas}
            </div>
        )
    }

    trigger() {
        if (this.divRef.current === null) {
            return null;
        }
        this.updateSize();
        this.props.redrawCanvas();
    }

    updateSize() {
        if (this.divRef.current === null) {
            return;
        }
        const sizes = this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight, true);
        this.setState(
            {width: sizes.width, height: sizes.height}
        );
    }

    getSnapshotBeforeUpdate() {
        return this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight, false);
    }

    componentDidUpdate(a, b, snapshot) {
        if (snapshot !== null) {
            if (snapshot.width !== this.state.width || snapshot.height !== this.state.height) {
                this.updateSize();
                return;
            }
        }
        this.props.redrawCanvas();
    }

    componentDidMount() {
        this.updateSize();
        const resizeObserver = new ResizeObserver(entries => {
            this.updateSize();
        });
        resizeObserver.observe(this.divRef.current);
    }
}

function CellMarker(props) {
    if (props.posX === null || props.posY === null) {
        return '';
    }

    const hasResize = props.initResize !== undefined && !props.click;
    const hasMove = props.initMove !== undefined;

    const size = props.size * props.zoom;

    const offset = {
        top: props.border + (size + props.border) * props.posY  - 8,
        left: props.border + (size + props.border) * props.posX - 8,
        width: 'min-content',
        height: 'min-content'
    };
    if (props.type === 'row-gap') {
        const baseline = Math.round(props.border / 2) + props.posY * (size + props.border) - 8;
        offset.top =  baseline - 8 - props.border;
        offset.left = -8;
    } else if (props.type === 'column-gap') {
        const baseline = Math.round(props.border / 2) + props.posX * (size + props.border) - 8;
        offset.left =  baseline - 8 - props.border;
        offset.top = -8;
    }

    const width = props.width || 1;
    const height = props.height || 1;
    const centerStyle = {
        width: (props.type === 'column-gap' ? 16  : size * width + (width - 1) * props.border),
        height: (props.type === 'row-gap' ? 16 : size * height + (height - 1) * props.border)
    };

    const markerCls = 'marker-cell' + (props.highlight ? '-highlight' : '');
    const cls = ['marker-grid'];

    const clsCenter = [];
    if (['rows', 'columns', 'row-gap', 'column-gap'].indexOf(props.type) !== -1) {
        clsCenter.push(markerCls);
    }
    let centerClickHandler = null;
    if (hasMove) {
        clsCenter.push('cursor-move');
        centerClickHandler = (e) => {
            props.initMove(e);
        };
    }

    const clsRight = [];
    let rightClickHandler = null;
    if (props.right) {
        clsRight.push(markerCls);
        if (hasResize) {
            clsRight.push('cursor-hresize');
            rightClickHandler  = (e) => {
                props.initResize(e, 'x', false);
            };
        }
    }
    const clsTopLeft = [];
    let topLeftClickHandler = null;
    if (props.left && props.top) {
        clsTopLeft.push(markerCls);
        if (hasResize) {
            clsTopLeft.push('cursor-nwseresize');
            topLeftClickHandler  = (e) => {
                props.initResize(e, 'xy', true, true);
            };
        }
    }
    const clsTopRight = [];
    let topRightClickHandler = null;
    if (props.right && props.top) {
        clsTopRight.push(markerCls);
        if (hasResize) {
            clsTopRight.push('cursor-neswresize');
            topRightClickHandler  = (e) => {
                props.initResize(e, 'xy', false, true);
            };
        }
    }
    const clsLeft = [];
    let leftClickHandler = null;
    if (props.left) {
        clsLeft.push(markerCls);
        if (hasResize) {
            clsLeft.push('cursor-hresize');
            leftClickHandler  = (e) => {
                props.initResize(e, 'x', true);
            };
        }
    }
    const clsTop = [];
    let topClickHandler = null;
    if (props.top) {
        clsTop.push(markerCls);
        if (hasResize) {
            clsTop.push('cursor-vresize');
            topClickHandler  = (e) => {
                props.initResize(e, 'y', null, true);
            };
        }
    }
    const clsBottom = [];
    let bottomClickHandler = null;
    if (props.bottom) {
        clsBottom.push(markerCls);
        if (hasResize) {
            clsBottom.push('cursor-vresize');
            bottomClickHandler  = (e) => {
                props.initResize(e, 'y', null, false);
            };
        }
    }
    const clsBottomLeft = [];
    let bottomLeftClickHandler = null;
    if (props.left && props.bottom) {
        clsBottomLeft.push(markerCls);
        if (hasResize) {
            clsBottomLeft.push('cursor-neswresize');
            bottomLeftClickHandler  = (e) => {
                props.initResize(e, 'xy', true, false);
            };
        }
    }
    const clsBottomRight = [];
    let bottomRightClickHandler = null;
    if (props.right && props.bottom) {
        clsBottomRight.push(markerCls);
        if (hasResize) {
            clsBottomRight.push('cursor-nwseresize');
            bottomRightClickHandler  = (e) => {
                props.initResize(e, 'xy', false, false);
            };
        }
    }

    if (props.blink) {
        cls.push('blink');
    }
    const divAttr = {
        style: offset,
        className: cls.join(' ')
    };
    if (props.dblClick) {
        divAttr.onDoubleClick = props.dblClick;
    } else if (props.click) {
        divAttr.onClick = props.click;
    }

    return (
        <div {...divAttr}>
            <div className={clsTopLeft.join(' ')} onMouseDown={topLeftClickHandler}></div>
            <div className={clsTop.join(' ')} onMouseDown={topClickHandler}></div>
            <div className={clsTopRight.join(' ')} onMouseDown={topRightClickHandler}></div>

            <div className={clsLeft.join(' ')} onMouseDown={leftClickHandler}></div>
            <div className={clsCenter.join(' ')} onMouseDown={centerClickHandler} style={centerStyle}></div>
            <div className={clsRight.join(' ')} onMouseDown={rightClickHandler}></div>

            <div className={clsBottomLeft.join(' ')} onMouseDown={bottomLeftClickHandler}></div>
            <div className={clsBottom.join(' ')} onMouseDown={bottomClickHandler}></div>
            <div className={clsBottomRight.join(' ')} onMouseDown={bottomRightClickHandler}></div>
        </div>
    )
}

function Scrollbar(props) {

    const divRef = useRef(null);
    const windowEvents = getWindowEventManager();

    const pagePerc = Math.round(props.page / props.max * 100);
    if (props.auto && pagePerc === 100) {
        return '';
    }

    const space = 15;

    const spacePerc = 100 - pagePerc;
    const maxSteps = props.max - props.page;
    const minPerc = maxSteps === 0 ? 0 : props.pos * (spacePerc / maxSteps);
    const maxPerc = 100 - (pagePerc + minPerc);

    const axis = props.vertical ? 'y' : 'x';
    const axisKey = props.vertical ? 'height' : 'width';
    const oppAxisKey = props.vertical ? 'width' : 'height';
    const client = 'client' + axis.toUpperCase();
    const dirKey = (axis === 'x' ? 'h' : 'v');

    const dimMin = {
        [axisKey]: minPerc + '%',
        [oppAxisKey]: space
    };
    const dimMax = {
        [axisKey]: maxPerc + '%',
        [oppAxisKey]: space
    };

    const mouseDown = (e) => {
        const rect = divRef.current.getBoundingClientRect();
        const anchorPos =  e[client];
        const pixelSteps = rect[axisKey] / props.max;
        const maxDistRight = (maxSteps - props.pos) * pixelSteps;
        const minDistLeft = -props.pos * pixelSteps;

        const getOffset = (value) => {
            const dist = value - anchorPos;
            const relPos = Math.max(Math.min(dist, maxDistRight), minDistLeft);
            return Math.round(relPos / pixelSteps);
        };
        let lastPos = 0;

        const trackMouse = (e) => {
            const relPos = getOffset(e[client]);
            if (relPos !== lastPos) {
                lastPos = relPos;
                props.set(props.set(props.pos + relPos));
            }
            e.stopPropagation();
            e.preventDefault();
        };
        windowEvents.addListener('mousemove', trackMouse, false);

        windowEvents.addListener('mouseup', (e) => {
            windowEvents.removeListener('mousemove', trackMouse, false);
            e.stopPropagation();
            e.preventDefault();
        }, {capture: false, once: true});

        e.preventDefault();
        e.stopPropagation();
    };

    const setMouseDown = (e) => {
        const rect = divRef.current.getBoundingClientRect();
        const pixelSteps = rect[axisKey] / props.max;
        const pageSize = Math.round(props.page * pixelSteps / 2);
        const offPos = Math.max(0, Math.min(Math.round((e[client] - rect[axis] - pageSize) / pixelSteps), props.max));
        props.set(offPos);
        e.preventDefault();
        e.stopPropagation();
    };
    const cls = ['scrollbar-div'];
    const dim = {[oppAxisKey]: space};
    if (props.size) {
        dim[axisKey] = props.size;
    } else {
        cls.push('full-' + dirKey);
    }

    const handleCls = ['scrollbar-handle flex cursor-' + dirKey + 'resize'];
    const stackCls = ['stack-' + dirKey];
    if (props.vertical) {
        stackCls.push('full-v');
    }

    return (
        <div style={dim} ref={divRef} className={cls.join(' ')}>
            <div className={stackCls.join(' ')}>
                <div onMouseDown={setMouseDown} style={dimMin}></div>
                <div onMouseDown={mouseDown} className={handleCls.join(' ')}></div>
                <div onMouseDown={setMouseDown} style={dimMax}></div>
            </div>
        </div>
    );
}

function Color(props) {
    return (
        <div>
            <input type="color" value={props.value} onChange={(e) => { props.set(e.target.value); }} />
        </div>
    );
}

function SwitchButton(props) {
    const cls = ['switch-div switch-button' + (props.enabled ? '-enabled' : '')];
    return (
        <div>
        <div onClick={() => {props.switch(!props.enabled)}} className={cls.join(' ')}>
            {props.children}
        </div>
        </div>
    );
}

function Checkbox(props) {
    return (
        <div className="stack-h">
            <div>{props.name}</div>
            <div><input onChange={(e) => {
                props.set(e.target.checked);
            }} type="checkbox" checked={!!props.value} /></div>
        </div>
    );
}

function Stack(props) {
    const dir = (props.dir === 'x') ? 'h' : 'v';
    const cls = ['stack-' + dir];
    cls.push('inner-' + (props.border ? 'border' : 'space') + '-' + dir);
    if (props.full) {
        cls.push('full-v');
    }
    if (props.center) {
        cls.push('items-centered');
    }
    if (props.wrap) {
        cls.push('wrap');
    }

    return (
        <div className={cls.join(' ')}>
            {props.children}
        </div>
    );
}

function TabAccordion(props) {
    const [active, setActive] = useState(props.active !== undefined ? props.active : 0);
    const items = [];
    let current = 0;
    for (let child of props.children) {
        const isActive = (current === active);
        const cls = ['padded'];
        cls.push('title-area-' + (isActive ? 'active' : 'inactive'));
        const itemNo = current;

        items.push(
                <div key={current} onClick={() => {setActive(itemNo)}} className={cls.join(' ')}>{child.props.name}</div>
        );
        if (isActive) {
            items.push(<div key="-1" className="flex">{child}</div>);
        }
        current++;
    }
    const cls = [
        'stack-v inner-border-v boxed full-v'
    ];
    return (
        <div className={cls.join(' ')}>
            {items}
        </div>
    );
}

function Toolbar(props) {
    return (
        <div className="toolbar-div">
            {props.children}
        </div>
    );
}

function IntField(props) {
    const attr = {};
    if (props.readOnly) {
        attr.readOnly = 'readOnly';
    }
    if (props.size) {
        attr.size = props.size;
    } else if (props.max !== undefined) {
        attr.size = ('' + props.max).length;
    } else {
        attr.size = 3;
    }

    const value = props.value !== undefined ? props.value : 0;
    attr.value = value;
    attr.type = 'text';
    attr.onChange = (e) => {
        props.set(e.target.value);
    };

    const incValue = () => {
        props.set(parseInt(value, 10) + 1);
    };

    const decValue = () => {
        props.set(parseInt(value, 10) - 1);
    };

    let buttonPrev = '';
    let buttonNext = '';
    if (props.buttons) {
        const nextAttr = {
            onClick: incValue
        };
        if (props.max !== undefined && parseInt(value, 10) >= parseInt(props.max, 10)) {
            nextAttr.disabled = 'disabled';
        }
        const prevAttr = {
            onClick: decValue
        };
        if (props.min !== undefined && parseInt(value, 10) <= parseInt(props.min, 10)) {
            prevAttr.disabled = 'disabled';
        }
        buttonPrev =
            <React.Fragment>
                <button {...prevAttr}>-</button>
            </React.Fragment>;

        buttonNext =
            <React.Fragment>
                <button {...nextAttr}>+</button>
            </React.Fragment>;
    }

    return (
        <React.Fragment>
            <div>{props.name}</div>
            <div className="stack-h items-centered">
                {buttonPrev}
                <input {...attr} />
                {buttonNext}
            </div>
        </React.Fragment>
    );
}

function Int(props) {
    return (
        <Stack dir="x">
            <IntField {...props} />
        </Stack>
    );
}

function Dim(props) {
    const maxX = props.max !== undefined ? props.max : props.maxX;
    const maxY = props.max !== undefined ? props.max : props.maxY;
    const minX = props.min !== undefined ? props.min : props.minX;
    const minY = props.min !== undefined ? props.min : props.minY;
    const sizeX = props.size !== undefined ? props.size : props.sizeX;
    const sizeY = props.size !== undefined ? props.size : props.sizeY;

    const xAttr = {
        name: props.name,
        value: props.x,
        min: minX,
        max: maxX,
        size: sizeX,
        set: props.setX,
        readOnly: props.readOnly,
        buttons: props.buttons
    };
    const yAttr = {
        name: '/',
        value: props.y,
        min: minY,
        max: maxY,
        size: sizeY,
        set: props.setY,
        readOnly: props.readOnly,
        buttons: props.buttons
    };

    return (
        <Stack dir="x" center>
            <IntField {...xAttr} />
            <IntField {...yAttr} />
        </Stack>
    );
}

function Tab(props) {
    return (
        <React.Fragment>{props.children}</React.Fragment>
    );
}

function Tabs(props) {

    const tabs = [];
    const contents = [];
    const [active, setActiveTab] = useState(props.active !== undefined ? props.active : 0);
    const maxTabs = props.maxTabs !== undefined ? props.maxTabs : null;
    const [tabPos, setTabPos] = useState(0);
    let tabNo = 0;

    const dir = props.vertical ? 'v' : 'h';
    const oppDir = dir === 'v' ? 'h' : 'v';

    const getTabFromChild = (no, child, isActive) => {
        const cls = [
            'stack-' + dir + ' inner-space-' + dir + ' padded'
        ];
        if (props.vertical) {
            cls.push('no-border-' + (props.reverse ? 'left' : 'right'));
        } else {
            cls.push('no-border-' + (props.reverse ? 'top' : 'bottom'));
        }
        if (isActive) {
            cls.push('tab-active boxed title-area-active');
        } else {
            cls.push('sub-boxed title-area-inactive');
        }
        let close = '';
        if (props.closeCallback !== undefined) {
            const closeHandler = (e) => {
                props.closeCallback(no);
                e.stopPropagation();
            };
            close = <div className="action-box" onClick={closeHandler}><i className="material-icons md-18">close</i></div>;
        }

        const itemCls = ['nowrap'];
        if (props.vertical) {
            itemCls.push('text-v');
        }

        return (
            <div key={no} className={cls.join(' ')} onClick={() => setActiveTab(no)}>
                <div className={itemCls.join(' ')}>{child.props.name}</div>
                {close}
            </div>);
    };

    const getContentFromChild = (no, child, isActive) => {
        const childCls = [];
        childCls.push('content-area');
        if (!isActive) {
            childCls.push('hidden');
        }
        return(
            <div key={tabNo} className={childCls.join(' ')}>{child}</div>
        );
    };

    let hasActive = false;
    let lastChild = null;
    for (let child of props.children) {
        if (child.type.name !== 'Tab') {
            continue;
        }
        lastChild = child;
        const isActive = (tabNo === active);
        if (isActive) {
            hasActive = true;
        }
        if (maxTabs === null || (tabNo >= tabPos && tabNo < (tabPos + maxTabs))) {
            tabs.push(getTabFromChild(tabNo, child, isActive));
        }
        contents.push(getContentFromChild(tabNo, child, isActive));
        tabNo++;
    }
    if (!hasActive && lastChild !== null) {
        tabNo--;
        if (maxTabs === null || (tabNo >= tabPos && tabNo < (tabPos + maxTabs))) {
            tabs[tabs.length - 1] = getTabFromChild(tabNo, lastChild, true);
        }
        contents[contents.length - 1] = getContentFromChild(tabNo, lastChild, true);
    }

    const contentCls = [
        'content-area flex boxed'
    ];

    let navPre = '';
    let navNext = '';
    if (maxTabs !== null && contents.length > maxTabs) {
        const preCls = [
            'sub-boxed title-area-inactive padded no-border-bottom'
        ];
        if (props.vertical) {
            preCls.push('text-v');
        }
        if (tabPos === 0) {
            preCls.push('inactive');
        }
        navPre = <div className={preCls.join(' ')} onClick={() => {setTabPos(tabPos - 1)}}>&lt;</div>;

        const nextCls = [
            'sub-boxed title-area-inactive padded no-border-bottom'
        ];
        if (tabPos + maxTabs >= contentCls.length) {
            nextCls.push('inactive');
        }
        if (props.vertical) {
            nextCls.push('text-v');
        }
        navNext = <div className={nextCls.join(' ')} onClick={() => {setTabPos(tabPos + 1)}}>&gt;</div>;
    }

    const tabsCls = [
        'stack-' + dir + ' inner-space-' + dir + ' items-bottom'
    ];
    if (props.fromEnd) {
        tabsCls.push('from-end');
    }

    const cls = ['stack-' + oppDir];
    if (props.reverse) {
        cls.push('reverse-' + oppDir);
    }

    const style = {};
    if (props.height) {
        style.height = props.height;
    }

    return (
        <div style={style} className={cls.join(' ')}>
            <div className={tabsCls.join(' ')}>
                {navPre}
                {tabs}
                {navNext}
            </div>

            <div className={contentCls.join(' ')}>
                {contents}
            </div>
        </div>
    )
}

class Section extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            collapsed: false,
            collapse: (props.collapse && ['h', 'v'].indexOf(props.collapse) !== -1 ? props.collapse : null)
        };
        this.toggleCollapse = this.toggleCollapse.bind(this);
    }

    toggleCollapse(e) {
        this.setState({collapsed: !this.state.collapsed});
    };

    render() {
        const props = this.props;
        const cls = [
            'section-div stack-v'
        ];
        if (!props.raw) {
            cls.push('boxed  inner-border-v');
        }
        if (props.flex) {
            cls.push('flex');
        }
        if (this.state.collapsed && props.collapse !== null) {
            cls.push('collapsed-' + props.collapse);
        }

        const actions = [];
        if (props.collapse) {
            const icon = this.state.collapsed ? 'call_made' : 'call_received';
            actions.push(<div key="collapse-h" className="action-box action-collapse-h" onClick={this.toggleCollapse}><i className="material-icons md-18">{icon}</i></div>);
            if (!this.state.collapsed) {
                // additional actions
            }
        }
        const actionsDiv = actions.length > 0 ?
            <div className="section-actions stack-h inner-space-h">{actions}</div> : '';

        const contentCls = ['flex'];
        if (!props.raw) {
            contentCls.push('content-area');
        }
        const contentDiv = this.state.collapsed ?
            '' :
            <div className={contentCls.join(' ')}>
                {props.children}
            </div>;

        const titleCls = [
            'title-area-active stack-h inner-space-h items-centered'
        ];
        if (!(this.state.collapsed && props.collapse === 'h')) {
            titleCls.push('padded');
        }

        const nameCls = ['flex'];
        if (this.state.collapsed && props.collapse === 'h') {
            nameCls.push('text-v');
        }

        return (
            <div className={cls.join(' ')}>
                <div className={titleCls.join(' ')}>
                    <div className={nameCls.join(' ')}>{props.name}</div>
                    {actionsDiv}
                </div>
                {contentDiv}
            </div>
        );
    }
}

function closeModals(e) {
    ReactDOM.unmountComponentAtNode(document.getElementById('modals-container'));
}

function Modal(props) {

    const cls = [
        'modal-centered stack-v boxed inner-border-v'
    ];

    const modal = <Themed><div className={cls.join(' ')}>
        <div className="title-area-active padded stack-h inner-space-h">
            <div className="flex">{props.name}</div>
            <div className="action-box" onClick={(e) => {
                closeModals();
                e.stopPropagation();
            }}><i className="material-icons md-18">close</i></div>
        </div>
        <div className="content-area flex">{props.children}</div>
    </div></Themed>;

    if (props.closeable) {
        return (<div className="modal-click-area" onClick={(e) => {
            let target = e.target;
            while(target.classList !== undefined) {
                if (target.classList.contains('modal-centered')) {
                   return;
                }
                target = target.parentNode;
            }
            closeModals();
        }}>{modal}</div>);
    }

    return modal;
}

function TileTracker(props) {
    const context = useContext(CssContext);

    const style = {
        width: 180
    };
    if (props.x === null) {
        return <div style={style}></div>;
    }

    const selection = props.cellProvider.getRawSelection(props.x, props.y, 1, 1);
    const tile = selection.getRow(0)[0];
    const index = Array.isArray(tile) ? tile[0] : tile;
    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
    const img = props.cellProvider.getBitmapForValue(index, 5, false, bgColor);
    let src = '';
    if (img !== null) {
        src = img.toDataURL('image/png');
    }

    return (
        <div style={style}>
            <div className="align-center checkboard-bg padded">
                <img className="boxed" src={src} />
            </div>
            <div>Position: <kbd>{props.x}x{props.y}</kbd></div>
            <div>Tile: <kbd>{index}</kbd></div>
        </div>
    );
}

function ActiveTile(props) {

    const [refresh, setRefresh] = useState(0);
    const context = useContext(CssContext);

    const style = {width: 180};
    const width = props.selection ? props.selection.getWidth() : 1;
    const height = props.selection ? props.selection.getHeight() : 1;
    const type = (width !== 1 || height !== 1) ? props.selection.getType() : 'cell';
    let index = null;
    if (type === 'cell') {
        index = props.selection ? props.selection.getRow(0)[0] : 0;
    }
    let img = null;
    if (index !== null) {
        const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
        img = props.cellProvider.getBitmapForValue(index, 5, false, bgColor);
    }
    let src = '';
    if (img !== null) {
        src = img.toDataURL('image/png');
    }

    const editTile = () => {

        const save = (provider) => {
            const raster = props.raster.current;
            const indexRef = props.index.current;
            const doImage = provider.getImageData();
            const actionIndex = index;
            const undoImage = props.cellProvider.getImageDataForValue(actionIndex);
            raster.doAction(() => {
                props.cellProvider.setBitmapForValue(actionIndex, doImage);
                raster.redrawCanvas();
                setRefresh(refresh + 1);
                indexRef.setBitmapForTile(actionIndex, doImage);
            }, () => {
                props.cellProvider.setBitmapForValue(actionIndex, undoImage);
                raster.redrawCanvas();
                setRefresh(refresh + 1);
                indexRef.setBitmapForTile(actionIndex, undoImage);
            });
            closeModals();
        };

        ReactDOM.render(
            <Modal name="Edit" closeable>
                <div style={{height: 600}}>
                <BitmapEditor
                    resize={false}
                    zoom="5"
                    border="1"
                    cancelHandler={() => {closeModals()}}
                    saveHandler={save}
                    bitmap={props.cellProvider.getBitmapForValue(index, 1, false).toDataURL('image/png')} />
                </div>
            </Modal>,
            document.getElementById('modals-container')
        );
    };

    return <div style={style}>
        <div>Type: {type}</div>
        <div className="align-center checkboard-bg padded">
            <img className="boxed" src={src} />
        </div>
        <button disabled={img === null} onClick={editTile}>Edit</button>
        <div>Index: {index}</div>
        <div>Width: {width}</div>
        <div>Height: {height}</div>
    </div>;
}

function ActiveAliasSelection(props) {
    const [isReady, setIsReady] = useState(false);
    const context = useContext(CssContext);
    const mounted = useRef(false);
    const aliases = props.cellProvider.getAliases();
    const selection = [];
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false
        }
    }, []);

    if (!isReady) {
        props.cellProvider.load(() => {
            if (mounted.current) {
                setIsReady(true);
            }
        });
        return '';
    }

    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');

    const setActive = (name) => {
        props.raster.current.setSelection(new CellSelection('rect', [[name]]));
    };

    for (let alias of aliases) {
        const index = props.cellProvider.getIndexForTile(alias);
        let imgData = props.cellProvider.getBitmapForValue(index, 2, false, bgColor).toDataURL('image/png');
        selection.push(
            <div key={alias} className="thin-boxed" onClick={(e) => {
                setActive(alias);
                e.preventDefault();
                e.stopPropagation();
            }}>
                <Stack dir="x">
                    <div className="padded checkboard-bg">
                        <img className="thin-boxed" src={imgData} />
                    </div>
                    <div className="padded"><kbd>{alias}</kbd><br />Index: <kbd>{index}</kbd></div>
                </Stack>
            </div>
        );
    }
    return (
        <div className="padded">
            <Stack dir="x" wrap>{selection}</Stack>
        </div>
    );
}

class ActiveTileSelection extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            ready: false,
            rulers: true,
            zoom: props.zoom || 2
        };
        this.tilesRef = React.createRef();
        this.setRulers = this.setRulers.bind(this);
    }

    setRulers(rulers) {
        this.setState({rulers});
        this.tilesRef.current.setState({rulers});
        this.tilesRef.current.redrawCanvas();
    }

    componentDidMount() {
        this._isMounted = true;
        this.props.cellProvider.load(() => {
            if (this._isMounted) {
                this.setState({ready: true});
            }
        });
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    setBitmapForTile(index, bitmap) {
        if (this.tilesRef.current) {
            this.props.cellProvider.setBitmapForValue(index, bitmap);
            this.tilesRef.current.redrawCanvas();
        }
    }

    render() {
        if (!this.state.ready) return <div></div>;

        const selector = (selection) => {
            this.props.raster.current.setSelection(selection);
        };

        const setZoom = (zoom) => {
            this.setState({zoom});
            this.tilesRef.current.setState({zoom});
            this.tilesRef.current.updateDims({});
        };

        return (
            <Stack dir="x" full border>
                <div className="padded">
                    <div>Tiles: {this.props.cellProvider.getMaxIndex()}</div>
                    <div><Int min={1} max={4} value={this.state.zoom} set={setZoom} buttons /></div>
                    <div><Checkbox value={this.state.rulers} set={this.setRulers} name="Rulers" /></div>
                    <div><button>Import</button></div>
                    <div><button>Export</button></div>
                </div>
                <div className="flex">
                    <Raster ref={this.tilesRef} markerMode="pick" selector={selector} rulers={this.state.rulers} cellProvider={this.props.cellProvider} zoom={this.state.zoom} border={1} toolbars={false} />
                </div>
                <div className="padded">
                    <div className="padded">
                        <SwitchButton enabled={true}>All</SwitchButton>
                    </div>
                    <div className="padded">
                        <SwitchButton enabled={false}>Most used</SwitchButton>
                    </div>
                    <div className="padded">
                        <SwitchButton enabled={false}>Last used</SwitchButton>
                    </div>
                </div>
            </Stack>
        );
    }
}
ActiveTileSelection._isMounted = false;

function BitmapEditor(props) {

    const cellProvider = useMemo(() => {
        return new BitmapCellProvider(4,
            props.bitmap
        );
    }, []);

    const buttons = [];
    if (props.saveHandler) {
        buttons.push(
            <button key="save" onClick={() => {
                props.saveHandler(cellProvider);
            }}>Save</button>
        );
    }
    if (props.cancelHandler) {
        buttons.push(
            <button key="cancel" onClick={() => {
                props.cancelHandler();
            }}>Cancel</button>
        );
    }
    const buttonDiv = buttons.length === 0 ?
        '' :
        <div className="padded">
            {buttons}
        </div>;

    const zoom = props.zoom ? parseInt(props.zoom, 10) : 1;
    const border = props.border ? parseInt(props.border, 10) : 0;
    const resize = props.resize !== undefined ? props.resize : true;

    return (
        <Stack dir="y" border full>
            <Stack dir="x" border full>
                <div className="">Palette goes here</div>
                <div className="flex full-v">
                    <Raster markerMode="pick" resize={resize} maxZoom={9} border={border} zoom={zoom} cellProvider={cellProvider} />
                </div>
            </Stack>
            {buttonDiv}
        </Stack>
    )
}

function TilesMapEditor(props) {

    const [selection, setSelection] = useState(null);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);
    const rasterRef = useRef(null);
    const indexRef = useRef(null);

    const tilesImage = "data:image/png;base64,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";

    const indexProvider = useMemo(() => {
        return new TilesCellProvider(
            16,
                tilesImage
        );
    }, []);

    const cellProvider = useMemo(() => {

        const getTileFromSet = (index) => {
            return index;
        };

        const theme = {
            baseBlock: 1
        };
        const tiles = {
            237: {
                collectEvent: 'glide'
            },
            796: {
                block: true
            },
            'empty-blocker': {
                index: 0,
                block: true
            },
            'axe': {
                animation: 'axeAnimation',
                collectEvent: 'openBridge'
            },
            'coin-block': {
                animation: 'questionMarkAnimation',
                hitEvent: 'one-coin',
                block: true
            },
            'star-block': {
                index: getTileFromSet(theme.baseBlock),
                hitEvent: 'bump-star',
                block: true
            },
            'coin-cache': {
                index: getTileFromSet(theme.baseBlock),
                hitEvent: 'coin-cache',
                block: true
            },
            'one-up-hidden': {
                index: 0,
                hitEvent: 'bump-one-up'
            },
            'coin-hidden': {
                index: 0,
                hitEvent: 'one-coin'
            },
            'power-up-hidden': {
                index: getTileFromSet(theme.baseBlock),
                block: true,
                hitEvent: 'bump-power-up'
            },
            'one-up-block': {
                index: getTileFromSet(theme.baseBlock),
                block: true,
                hitEvent: 'bump-one-up'
            },
            'tube-down.1-1.uw': {
                index: getTileFromSet(264),
                block: true,
                downTarget: '1-1.uw'
            },
            'tube-down.1-2.sub': {
                index: getTileFromSet(264),
                block: true,
                downTarget: '1-2.sub'
            },
            'tube-down.1-1.ow': {
                index: getTileFromSet(264),
                block: true,
                downTarget: '1-1'
            },
            'tube-right.1-1.ow': {
                index: 66,
                block: true,
                rightTarget: '1-1:164-8'
            },
            'tube-right.1-2.uw': {
                index: 28,
                block: true,
                rightTarget: '1-2.uw'
            },
            'tube-right.1-2.uw#2': {
                index: 66,
                block: true,
                rightTarget: '1-2.uw:115-8'
            },
            'tube-right.1-2.ow': {
                index: 68,
                block: true,
                rightTarget: '1-2.ow:3-8'
            },
        };
        tiles[getTileFromSet(1)] = {block: true, hitEvent: 'breaking-block'};
        tiles[getTileFromSet(2)] = {block: true, hitEvent: 'breaking-block'};
        tiles[getTileFromSet(3)] = {block: true};
        tiles[getTileFromSet(28)] = {block: true};
        tiles[getTileFromSet(24)] = {
            block: true,
            hitEvent: 'bump-power-up',
            animation: 'questionMarkAnimation'
        };
        tiles[getTileFromSet(57)] = {
            collectEvent: 'coin',
            animation: 'coinAnimation'
        };
        const tileIds = [27, 33, 35, 48, 264, 265, 266, 267, 268, 297, 298, 299, 300, 301, 330, 331, 269, 270, 271];
        for (let tileId of tileIds) {
            tiles[getTileFromSet(tileId)] = {block: true};
        }

        const animations = {
            questionMarkAnimation: {
                frames: [
                    {id: getTileFromSet(24), duration: 25},
                    {id: getTileFromSet(25), duration: 10},
                    {id: getTileFromSet(26), duration: 10}
                ],
//                end: ANIMATION.END.LOOP,
//                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            },
            coinAnimation: {
                frames: [
                    {id: getTileFromSet(57), duration: 25},
                    {id: getTileFromSet(58), duration: 10},
                    {id: getTileFromSet(59), duration: 10}
                ],
//                end: ANIMATION.END.LOOP,
//                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            },
            axeAnimation: {
                frames: [
                    {id: 192, duration: 25},
                    {id: 193, duration: 10},
                    {id: 194, duration: 10}
                ],
//                end: ANIMATION.END.LOOP,
//                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            }
        };

        const cellProvider =
            new TilesMapCellProvider(16,
                tilesImage,
                tiles, animations,[
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 245,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [237, "object:flag"],   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   [0, 'object:evilmush.left'],   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-block",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   1,   1,   0,   0,   0,   1,   1,   1, "coin-block",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  24,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   1,   0,   0,   0,   0,   1, "coin-block", "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "one-up-hidden",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  11, [ 11, "object:flag-up-fg"],  11,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-block",   0,   0,   0,   1,  24,   1, "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0,   0, "tube-down.1-1.uw", 265,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,  24,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-cache",   0,   0,   0,   0,   0,   1, "star-block",   0,   0,   0,   0, "coin-block",   0,   0, "coin-block",   0,   0, "coin-block",   0,   0,   0,   0,   0,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   0,   0,   0,   0,   0,   0,  33,   0,   0,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1, "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  12,  13,  14,   0,   0,   0,   0,   0,   0,   0],
                    [  0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0, 273,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,  33,  33,   0,   0,   0,   0, 273,   0,   0,   0,  33,  33,  33,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0, 273,   0,   0,   0, 237,   0,   0,   0,  11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0],
                    [  0, 272, 305, 274,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,    0, 297, 298,  0, 272, 305, 274,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 272, 305, 274,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,   0,   0,  33,  33,  33,   0,   0, 272, 305, 274,   0,  33,  33,  33,  33,   0,   0,  33,  33,  33,   0,   0,   0, 273,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0, 272, 305, 274,   0,   0, 237,   0,   0,   0,  13,  13,  45,  13,  13,   0,   0, 273,   0,   0,   0],
                    [272, 305, 306, 307, 274,   0,   0,   0,   0,   0,   0, 308, 309, 309, 309, 310, 272, 305, 274,   0,   0,   0, [  0, "object:evilmush.left"], 308, 309, 310,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0,   0,   0, 297, 298, [  0, "object:evilmush.left"], 308, 309, 309, 310,   0, 297, 298, 272, 305, 306, [307, "object:evilmush.left"],  [274, "object:evilmush.right"],   0,   0,   0, 0,  297, 298, 308, 309, 309, 309, 310, 272, 305, 274,   0,   0,   0,   0, 308, 309, 310,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:store-position'],   0,   0,   0,   0,   0,   0, 308, 309, 309, 310,   0,   0,   0, 272, [305, 'object:evilmush.left'], [306, 'object:evilmush.right'], 307  , 274,   0,   0,   0,   0,   0,   0, [308, 'object:turtle.left'], 309, 309, 309, 310, 272, 305, [274, 'object:evilmush.left'],   [0, 'object:evilmush.right'],  0,   0,   0, 308, 309, 310,   0,   0,   [0, 'object:evilmush.left'],  [0, 'object:evilmush.right'],  0,   0,   0,   [0, 'object:evilmush.left'],  [0, 'object:evilmush.right'],   0,   0,   0,  33,  33,  33,  33, 309, 309,  33,  33,  33,  33, 272, 305, 306, 307,  33,  33,  33,  33,  33,   0,   0,  33,  33,  33,  33, 310, 272, 305, 274, 297, 298,   0,   0, 308, 309, 310,   0,   0,   0,   0,   [0, 'object:evilmush.left'], [  0, "object:evilmush.right"],   0,   0,   0, 297, 298,  33,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0, 272, 305, 306, 307, 274,   0,  33,   0,   0,   0,  13,  13,  46,  13,  13, 310, 272, 305, 274,   0,   0],
                    [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                    [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                ]

            );

        return cellProvider;
    }, []);


    const tracker = (trackX, trackY, width, height) => {
        setTrackX(trackX);
        setTrackY(trackY);
    };

    const selector = (selection) => {
        setSelection(selection);
    };

    return (
        <Stack dir="y" full>
            <Stack dir="x" full>
                <Section name="Selected" collapse="h">
                    <div className="padded">
                        <ActiveTile index={indexRef} raster={rasterRef} selection={selection} cellProvider={cellProvider} />
                    </div>
                </Section>

                <Section name="Map" flex>
                    <Raster ref={rasterRef} markerMode="pick" selector={selector} tracker={tracker} maxZoom={9} border={0} zoom={1} cellProvider={cellProvider} />
                </Section>

                <Section name="Cursor" collapse="h">
                    <div className="padded">
                        <TileTracker x={trackX} y={trackY} cellProvider={cellProvider} />
                    </div>
                </Section>
            </Stack>

            <Section name="Elements" collapse="v" raw>
            <Tabs height={280} reverse>
                <Tab name="Tiles">
                    <ActiveTileSelection ref={indexRef} raster={rasterRef} cellProvider={indexProvider} />
                </Tab>
                <Tab name="Aliases">
                    <ActiveAliasSelection raster={rasterRef} indexProvider={indexProvider} cellProvider={cellProvider} />
                </Tab>
                <Tab name="Brushes">
                    Brush selection here...
                </Tab>
                <Tab name="Events">
                    Event selection here...
                </Tab>
            </Tabs>
            </Section>
        </Stack>
    );
}

function Themed(props) {

    const [bgColor, setBgColor] = useState('#666677');
    const [bgOpacity, setBgOpacity] = useState(10);

    const getNumFromPx = (value) => {
        return parseInt(value, 10);
    };

    const style = getComputedStyle(document.body);
    const css = {
        contentTextColor: style.getPropertyValue('--content-text-color'),
        defaultPadding: getNumFromPx(style.getPropertyValue('--default-padding')),
        bgColor,
        setBgColor,
        bgOpacity,
        setBgOpacity
    };

    return (
        <CssContext.Provider value={css}>
            {props.children}
        </CssContext.Provider>
    );
}

class MyApp extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Themed>
                <Stack dir="y" full>
                    <div className="head padded">
                        <Stack dir="x">
                            <div className="flex">
                                TilesMapEditor: <b><kbd>Mario Level 1-1</kbd></b>
                            </div>
                            <div>
                                <button>Save</button> <button>Cancel</button> <button>Play</button>
                            </div>
                        </Stack>
                    </div>
                    <div className="flex">
                        <TilesMapEditor />
                    </div>
                </Stack>
            </Themed>
        )
    }
}

ReactDOM.render(<MyApp/>, document.getElementById('root'));

export default MyApp;