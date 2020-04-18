import React, {Component, Fragment, useState, useEffect, useRef} from "react";
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

    constructor(size, data) {
        this.size = size;
        this.data = data;
        this.map = [[this.getEmptyCell()]];
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
            (data) => {

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

    convertURIToImageData(URI) {
        return new Promise(function(resolve, reject) {
            if (URI == null) return reject();
            var canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                image = new Image();
            image.addEventListener('load', function() {
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(context.getImageData(0, 0, canvas.width, canvas.height));
            }, false);
            image.src = URI;
        });
    }

    getCellType() {
        return 'color';
    }

    isResizeable() {
        return true;
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
                this.map[y][x] = elem;
            }
        }
    }

    writePath(path) {
        for (let key in path) {
            const pos = key.split(' ');
            this.map[pos[1]][pos[0]] = path[key];
        }
    }

    fillRectWithSelection(posX, posY, width, height, selection) {
        for (let y = 0; y < height; y++) {
            const row = selection.getRow(y, width);
            for (let x = 0; x < width; x++) {
                this.map[posY + y][posX + x] = row[x];
            }
        }
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
                    result.old[key] = this.map[posY][posX + x];
                    this.map[posY][posX + x] = value;
                    result.new[key] = value;
                }
            }
            posY++;
            i++;
        }
        return result;
    }

    reduceToRect(posX, posY, width, height) {
        this.map = this.getRect(posX, posY, width, height);
    }

    getRect(posX, posY, width, height) {
        const slice = this.map.slice(posY, posY + height);
        const rowSlices = [];
        for (let row of slice) {
            rowSlices.push(row.slice(posX, posX + width));
        }
        return rowSlices;
    }

    importSelection(selection) {
        this.map = [];
        const iMax = selection.getHeight();
        let i = 0;
        while (i < iMax) {
            this.map.push(selection.getRow(i));
            i++;
        }
    }

    getSelection(posX, posY, width, height) {
        return new CellSelection('rect', this.getRect(posX, posY, width, height));
    }

    getEmptyCell() {
        return '#00000000';
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

class FullRaster extends React.Component {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.hRulerRef = React.createRef();
        this.vRulerRef = React.createRef();

        this.windowEvents = getWindowEventManager();

        this.state = {
            border: props.border || 0,
            zoom: props.zoom || 1,
            posX: 0,
            posY: 0,
            rulers: props.rulers,
            viewX: props.cellProvider.getWidth(),
            viewY: props.cellProvider.getHeight(),
            maxX: props.maxX && !props.full ? props.maxX : null,
            maxY: props.maxY && !props.full ? props.maxY : null,
            bgColor: '#000000',
            bgOpacity: 10,
            writeTransparent: false,
            selection: null,
            markerPosX: null,
            markerPosY: null,
            markerWidth: 1,
            markerHeight: 1,
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
    }

    setBgOpacity(bgOpacity) {
        this.setState({
            bgOpacity
        });
        this.redrawCanvas();
    }

    setBgColor(bgColor) {
        this.setState({
            bgColor
        });
        this.redrawCanvas();
    }

    setBorder(border) {
        this.setState({
            border
        });
        this.updateDims({border});
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
        if (this.state.bgOpacity) {
            ctx.fillStyle = this.state.bgColor + (Math.min(this.state.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
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

        const rows = cellProvider.getRect(this.state.posX, this.state.posY, cellsX, cellsY);
        pos = border;
        for (let row of rows) {
            for (let x = 0; x < cellsX; x++) {
                ctx.fillStyle = row[x];
                ctx.fillRect(border + x * cellSize, pos, size, size);
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
                markerReset = true;
            }
        }

        if (markerReset) {
            set.markerPosX = null;
            set.markerPosY = null;
            set.markerWidth = 1;
            set.markerHeight = 1;
            set.markerMode = 'write';
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
                } else {
                    resetMarker(data);
                }
                break;

            case 'rows-select':
            case 'columns-select':
            case 'rect-select':
            case 'row-gap-select':
            case 'column-gap-select':
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
            if (this.state.selection !== null) {
                if (clear) {
                    segment = this.props.cellProvider.writeSelection(x, y, this.state.selection, this.props.cellProvider.getEmptyCell(), true);
                } else {
                    segment = this.props.cellProvider.writeSelection(x, y, this.state.selection, undefined, this.state.writeTransparent);
                }
            } else {
                this.props.cellProvider.fillRect(x, y, 1, 1, this.props.cellProvider.getEmptyCell());
                const key = x + '' + y;
                segment = {
                    old: {[key]: this.props.cellProvider.getRect(x, y, 1, 1)[0]},
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

            case 'write':
                if (this.state.selection) {
                    markerType = this.state.selection.getType();
                }
                highlight = this.isDown;

                const trackEventPosition = (x, y) => {
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
                writeSelection(this.state.posX + pos.x,this.state.posY + pos.y, true);
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
                    undoSelection = this.props.cellProvider.getSelection(
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
                    this.props.cellProvider.fillRectWithSelection(
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
                    undoSelection = this.props.cellProvider.getSelection(
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
                    this.props.cellProvider.fillRectWithSelection(
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
        const fixed = !props.cellProvider.isResizeable();
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

        const posSize = props.full ? '' :
            <Fragment>
                <Dim name="Size:" x={cellsX} y={cellsY} maxX={cellsX} maxY={cellsY} min="1" readOnly />
                <Dim name="Position:" buttons x={this.state.posX} setX={setPosX} y={this.state.posY} setY={setPosY} maxX={hiddenX} maxY={hiddenY} min="0" readOnly />
            </Fragment>;
        const zoomInput = props.maxZoom !== 1 ? <Int name="Zoom:" readOnly min="1" max={props.maxZoom} set={setZoom} value={this.state.zoom} buttons /> : '';

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
                    this.updateDims({posX, posY})}}>
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
                bottomActions.push(
                    <button key="cutout" onClick={() => {
                        const markerPosX = this.state.markerPosX;
                        const markerPosY = this.state.markerPosY;
                        const markerWidth = this.state.markerWidth;
                        const markerHeight = this.state.markerHeight;
                        const oldWidth = props.cellProvider.getWidth();
                        const oldHeight = props.cellProvider.getHeight();
                        const undoSelection = props.cellProvider.getSelection(
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
                            props.cellProvider.importSelection(undoSelection);
                            this.updateDims({});
                            this.switchToMode('write');
                        };
                        this.doAction(doAction, undoAction);

                    }}>Cut-Out</button>
                );
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
                const disabled =
                    (
                        this.state.markerMode === 'rows' ?
                            props.cellProvider.getHeight() === this.state.markerHeight :
                            props.cellProvider.getWidth() === this.state.markerWidth
                    );
                bottomActions.push(
                    <button key="del" onClick={() => {
                        if (this.state.markerMode === 'rows') {
                            props.cellProvider.deleteRows(this.state.markerPosY, this.state.markerHeight);
                        } else {
                            props.cellProvider.deleteColumns(this.state.markerPosX, this.state.markerWidth);
                        }
                        this.updateDims({});
                        this.switchToMode('write');
                    }} disabled={disabled}>Delete</button>
                );
                bottomActions.push(
                    <button key="cutout" onClick={() => {
                        if (this.state.markerMode === 'rows') {
                            props.cellProvider.reduceToRect(
                                0,
                                this.state.markerPosY,
                                props.cellProvider.getWidth(),
                                this.state.markerHeight
                            );
                        } else {
                            props.cellProvider.reduceToRect(
                                this.state.markerPosX,
                                0,
                                this.state.markerWidth,
                                props.cellProvider.getHeight()
                            );
                        }
                        this.updateDims({});
                        this.switchToMode('write');
                    }}>Cut-Out</button>
                );
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
                         maxX={cellsX - this.state.markerPosX} maxY={cellsY - this.state.markerPosY} min="1" readOnly/>
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
                <button key="abort" onClick={() => {this.switchToMode('write')}}>X</button>
            );
        } else if (this.state.markerMode === 'write') {
            bottomActions.push(
                <SwitchButton key="writeTransparent" enabled={this.state.writeTransparent} switch={(writeTransparent) => {this.setState({writeTransparent})}}>Transparent</SwitchButton>
            );
        }
        const selectionToolbar =
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

        return (
            <Stack dir="y" border full>
                <Toolbar>
                    <div>
                        <button {...undoAttr}>Undo</button>
                        <button {...redoAttr}>Redo</button>
                    </div>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rect')} switch={(enabled) => {this.switchToMode(enabled ? 'rect-select' : 'write')}}>Rect</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rows')} switch={(enabled) => {this.switchToMode(enabled ? 'rows-select' : 'write')}}>Rows</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('columns')} switch={(enabled) => {this.switchToMode(enabled ? 'columns-select' : 'write')}}>Columns</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('row-gap')} switch={(enabled) => {this.switchToMode(enabled ? 'row-gap-select' : 'write')}}>Row Gap</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('column-gap')} switch={(enabled) => {this.switchToMode(enabled ? 'column-gap-select' : 'write')}}>Column Gap</SwitchButton>
                    {posSize}
                    {zoomInput}
                    <Int name="Border:" readOnly min="0" max="5" set={this.setBorder} value={this.state.border} buttons />
                    <Checkbox name="Rulers" value={this.state.rulers} set={(rulers) => {
                        this.setState({rulers});
                    }} />
                    <Int name="Background:" readOnly min="0" max="26" set={this.setBgOpacity} value={this.state.bgOpacity} buttons />
                    <Color value={this.state.bgColor} set={this.setBgColor} />
                </Toolbar>

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

                {selectionToolbar}
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
FullRaster.contextType = CssContext;
FullRaster._isMounted = false;

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

    return (
        <div className={cls.join(' ')}>
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
            'section-div boxed stack-v inner-border-v'
        ];
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

        const contentDiv = this.state.collapsed ?
            '' :
            <div className="content-area flex">
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

    const modal = <div className={cls.join(' ')}>
        <div className="title-area-active padded stack-h inner-space-h">
            <div className="flex">{props.name}</div>
            <div className="action-box" onClick={(e) => {
                closeModals();
                e.stopPropagation();
            }}><i className="material-icons md-18">close</i></div>
        </div>
        <div className="content-area flex">{props.children}</div>
    </div>;

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

class MyApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            border: 1,
            zoom: 1
        };
        this.openModal = this.openModal.bind(this);
        this.fullRef = React.createRef();
        this.redraw = this.redraw.bind(this);
    }

    redraw() {
        this.fullRef.current.redrawCanvas();
    }

    openModal() {
        ReactDOM.render(<Modal name="My shiny first modal" closeable>
            <div className="padded">Here we go again...</div>
        </Modal>, document.getElementById('modals-container'));
    }

    getNumFromPx(value) {
        return parseInt(value, 10);
    }

    render() {
        const style = getComputedStyle(document.body);
        const css = {
            contentTextColor: style.getPropertyValue('--content-text-color'),
            defaultPadding: this.getNumFromPx(style.getPropertyValue('--default-padding'))
        };

        const cellProvider = new CellProvider(4,
//            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAYCAYAAAAyC/XlAAAC/klEQVRoQ+1Z0U4DMQxj0v7/iyeBDtEpBDt2um4rMF6Yrm2aJo7j653evv4ul8v7+H0+n0/jd/w/5uTxuBbZQOPHvMrOGJtZG22z9WpO9E2d77DF4ncP/5VvMQfq/J+JPiblgDvJiQdHTiEguSBS/jjAdPxD/sRnajzvked313ftsXjmwmZFfXIcdI1VlcCS4R44M1IHIBVY1PmfMa7ArQCq1sfxZQDIVKPaBEugQjQDDAOIEwxF8RWNuwCZBfAq+2z/JQBQyc+bIwQjzeFoERUgxV7uegYk1WOVfQX4e6z/xgCImqMmUBXExE8V+OrQ3R6qArQaAPfwr7Kp9psB0A8AuL0b0YiqgGx72HCqOycv7q+UMGtBlTB17SvB6zBct0W6vuV5CiDwdQ/R8evZ34zAFQBMCDkUW4kk1EIiC3Tsu6+VSiUzWkVV5pytEpEz6xU7dOKn4nu9BziMzgRYaQRUN1WClMNMUA7/syZBGqUDEOXP6vGOPkL6LT9T/sG3AJVU5qTqN0iQqWSwQ1b6AFUIqxoVoGeMs2ajfFHxReM/AFBVEBKBCiwuA1Ti0KkKtM/BaEqkqqCuHq8YiQk9lDj3mWJEeQ+gAqAAoNZX/bM6JEN7TDr7PdNDGfgRg1UMxFqtiqND9yxeVYyhBlC03GkBLgBytapXrW4FoI9LGSAuhVbJyudlAKmuslfGF7XKGNuHvAVUCGQBi5XCaHw2gdWeuRU5uib7N/xC/q1uAZEZnBaShf7rHoAprn/yfIkGcGnPFZGVIPzNeXHY5NHnswEwKLmiMOcTLVo/aAxdgLAr40cH6tb9UJu41eaK9d8AcDip+haqzooBkGDKSnjsi5RuHFtx4Bkb2YcZn7YHAAoM++DifFCprjNZpaPAzgS7m+RKZEYVHcXdrXvswmzyoqSrMnN15/UMPCy4uwCAtakOELbWAKzH557Nejiibyf5ObConexQLbE9zvqzNQDYxQtyeuaiwmkxu4rAFRqgwxSPnLvVPcCuQmlVQnZkgA/VdyxzlcUF0AAAAABJRU5ErkJggg=="
        "data:image/png;base64,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"
            /*
            ,

            [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            ]

             */
        );

        return (
            <CssContext.Provider value={css}>
            <Stack dir="y" full>
                <Stack dir="x" full>
                    <Section name="First and Last of us" collapse="h">
                        <div className="padded">
                            <Tabs reverse vertical>
                                <Tab name="Tiles">
                                </Tab>
                                <Tab name="Brushes">Canansnasnasan</Tab>
                                <Tab name="Aliases">
                                    <div className="padded">Thailand rulez!</div>
                                </Tab>
                            </Tabs>
                        </div>
                    </Section>

                    <Section name="Second" flex>
                        <FullRaster markerMode="write" maxZoom={9} border={0} zoom={1} cellProvider={cellProvider} />
                    </Section>

                    <Section name="Third" collapse="h">
                        <div className="padded">
                            <TabAccordion active={2}>
                                <Tab name="What the fuck?">Hey Chewie</Tab>
                                <Tab name="There it is">Guess who</Tab>
                                <Tab name="Bimmer"><div className="padded">Fuck you!</div></Tab>
                            </TabAccordion>
                        </div>
                    </Section>
                </Stack>

                <Section name="Fourth" collapse="v">
                    <div className="padded">
                        <button onClick={this.openModal}>Please open my modal!</button>
                    </div>
                </Section>
            </Stack>
            </CssContext.Provider>
        )
    }
}

ReactDOM.render(<MyApp/>, document.getElementById('root'));

export default MyApp;