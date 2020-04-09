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

    constructor(size, map = null) {
        this.size = size;
        this.map = map === null ? [[0]] : map;
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
            row.push(0);
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
            return;
        }
        if (no > 0) {
            while (no > 0) {
                for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                    if (start) {
                        this.map[i].unshift(0);
                    } else {
                        this.map[i].push(0);
                    }
                }
                no--;
            }
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
            columns.push(0);
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

    fillRectWithSelection(posX, posY, width, height, selection) {
        for (let y = 0; y < height; y++) {
            const row = selection.getRow(y, width);
            for (let x = 0; x < width; x++) {
                this.map[posY + y][posX + x] = row[x];
            }
        }
    }

    writeSelection(posX, posY, selection) {
        let i = 0;
        let xMax = Math.min(selection.getWidth(), this.getWidth() - posX);
        let iMax = Math.min(selection.getHeight(), this.getHeight() - posY);
        let row;

        while (i < iMax) {
            row = selection.getRow(i);
            for (let x = 0; x < xMax; x++) {
                this.map[posY][posX + x] = row[x];
            }
            posY++;
            i++;
        }
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

    getEmptyCell() {
        return 0;
    }
}

function drawRaster(canvas, cellProvider, border, zoom) {
    if (canvas === null) {
        return;
    }
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const spaceX = canvas.width - border;
    const spaceY = canvas.height - border;
    const cellSize = cellProvider.getSize() * zoom + border;
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
}

class FullRaster extends React.Component {

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.hRulerRef = React.createRef();
        this.vRulerRef = React.createRef();

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
            selection: null,
            markerPosX: null,
            markerPosY: null,
            markerWidth: 1,
            markerHeight: 1,
            markerMode: props.markerMode || 'display',
            highlight: false
        };

        this.rulerFontSize = 10;
        this.rulerFontWidth = 8;
        this.rulerPadding = 6;
        this.rulerDist = 5;

        this.setBorder = this.setBorder.bind(this);
        this.setZoom = this.setZoom.bind(this);
        this.getCanvasSizeForDim = this.getCanvasSizeForDim.bind(this);
        this.redrawCanvas = this.redrawCanvas.bind(this);
        this.renderOverlays = this.renderOverlays.bind(this);
    }

    setBorder(border) {
        this.setState({
            border
        });
    }

    setZoom(zoom) {
        this.setState({
            zoom
        });
    }

    redrawCanvas() {
        const canvas = this.getCanvas();
        drawRaster(canvas, this.props.cellProvider, this.state.border, this.state.zoom);

        const fullWidth = 13;
        const smallWidth = 3;
        const padding = this.rulerPadding;
        const fontSize = this.rulerFontSize;
        const border = 1;
        const charWidth = this.rulerFontWidth;
        const cellSize = this.state.zoom * this.props.cellProvider.getSize() + this.state.border;

        const getRulerContext = (canvas) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    }

    getCanvas() {
        if (this.props.full) {
            return this.canvasRef.current;
        }
        return (this.canvasRef.current === null) ? null : this.canvasRef.current.getCanvas();
    }

    updateDims(newDims) {
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

    getCanvasSizeForDim(width, height, updateViewDim = false) {
        const props = this.props;
        const padding = 20;

        let spaceX = width - (padding * 2) - this.state.border;
        let spaceY = height - (padding * 2) - this.state.border;

        if (this.state.rulers) {
            spaceX -= this.rulerFontSize + this.rulerPadding + this.rulerDist + this.context.defaultPadding;
            spaceY -= this.rulerFontWidth * ('' + this.props.cellProvider.getHeight()).length + this.rulerPadding + this.rulerDist + this.context.defaultPadding;
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
        const resetMarker = () => {
            set.markerWidth = 1;
            set.markerHeight = 1;
            set.markerPosX = null;
            set.markerPosY = null;
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
                    resetMarker();
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

        if (!this.lastRasterPos) {
            this.lastRasterPos = {x: null, y: null};
        }

        const initPositionTracking = (clickHandler) => {
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
                    const absWidth = newRasterPos.x + this.state.posX - anchorPos.x;
                    const absHeight = newRasterPos.y + this.state.posY - anchorPos.y;

                    const validX = (resizeX && absWidth !== 0 && newRasterPos.x + 1 >= 0 && newRasterPos.x <= this.state.viewX);
                    const validY = (resizeY && absHeight !== 0 && newRasterPos.y + 1  >= 0 && newRasterPos.y <= this.state.viewY);

                    const hasChanged =
                        (newRasterPos.x !== lastRasterPos.x || newRasterPos.y !== lastRasterPos.y) &&
                        (validX || validY);

                    if (hasChanged) {
                        lastRasterPos = newRasterPos;
                        const change = {};

                        if (validX) {
                            if (absWidth > 0) {
                                change.markerWidth = absWidth;
                            } else {
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
                window.addEventListener('mousemove', mouseMove, false);

                window.addEventListener(
                    'mouseup',
                    (e) => {
                        checkWithLastRasterPos(e);
                        window.removeEventListener('mousemove', mouseMove, false);
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
                    x: lastRasterPos.x - (this.state.markerPosX - this.state.posX),
                    y: lastRasterPos.y - (this.state.markerPosY - this.state.posY)
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

                    const markerPosX = this.state.posX + xStart;
                    const markerPosY = this.state.posY + yStart;
                    const hasChanged =
                        (markerPosX >= 0 && markerPosX + this.state.markerWidth <= this.props.cellProvider.getWidth()
                            && markerPosY >= 0 && markerPosY + this.state.markerHeight <= this.props.cellProvider.getHeight()) &&
                        ((trackX && newRasterPos.x !== lastRasterPos.x) || (trackY && newRasterPos.y !== lastRasterPos.y));

                    if (hasChanged) {
                        lastRasterPos = newRasterPos;
                        this.setState({markerPosX, markerPosY});
                    }
                };

                const mouseMove = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                };
                window.addEventListener('mousemove', mouseMove, false);

                window.addEventListener(
                    'mouseup',
                    (e) => {
                        checkWithLastRasterPos(e);
                        window.removeEventListener('mousemove', mouseMove, false);
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

        switch (this.state.markerMode) {

            case 'display':
                break;

            case 'write':
                if (this.state.selection) {
                    markerType = this.state.selection.getType();
                }
                highlight = this.isDown;
                const trackEventPosition = (e) => {
                    const currRasterPos = this.getRasterPosFromEvent(e);
                    const markerPosX = this.state.posX + currRasterPos.x;
                    const markerPosY = this.state.posY + currRasterPos.y;
                    if (this.state.selection !== null) {
                        this.props.cellProvider.writeSelection(markerPosX, markerPosY, this.state.selection);
                    } else {
                        this.props.cellProvider.fillRect(markerPosX, markerPosY, 1, 1, this.props.cellProvider.getEmptyCell());
                    }
                };

                initPositionTracking((e) => {
                    this.isDown = true;
                    trackEventPosition(e);
                    this.setState({highlight: !this.state.highlight});
                    window.addEventListener('mouseup', (e) => {
                        this.isDown = false;
                        this.setState({highlight: !this.state.highlight});
                        e.preventDefault();
                        e.stopPropagation();
                    }, {once: true, capture: false});
                });
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
                offHeight = viewEndY + 1;
                hasTop = false;
                hasBottom = false;
            } else if (markerType === 'rows') {
                offX = 0;
                offWidth = viewEndX + 1;
                hasLeft = false;
                hasRight = false;
            } else if (markerType === 'row-gap') {
                offX = 0;
                offWidth = viewEndX + 1;
                hasTop = false;
                hasBottom = false;
                hasLeft = false;
                hasRight = false;
            }  else if (markerType === 'column-gap') {
                offY = 0;
                offHeight = viewEndY + 1;
                hasTop = false;
                hasBottom = false;
                hasLeft = false;
                hasRight = false;
            }

            marker = <CellMarker
                initMove={initMove}
                initResize={initResize}
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
        return (
            <Fragment>
            <div className="leave"
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
                // TODO calc these values
                style.paddingLeft = 30;
                style.paddingTop = 30;
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

        const setZoom = zoom => {this.setState({zoom})};
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
            let added = props.cellProvider.addRows(start, no);
            if (no < 0) {
                added *= -1;
            }
            const _posY = start ? 0 : Math.max(0, this.state.posY + added);
            this.updateDims({posY: _posY, endY: !start});
        };

        const addColumns = (no, start) => {
            let added = props.cellProvider.addColumns(start, no);
            if (no < 0) {
                added *= -1;
            }
            const _posX = start ? 0 : Math.max(0, this.state.posX + added);
            this.updateDims({posX: _posX, endX: !start});
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
                    callback(max - maxPos, start);
                };
                if (max === 1) {
                    btnSub1Attr.disabled = 'disabled';
                    btnSubPageAttr.disabled = 'disabled';
                } else {
                    btnSub1Attr.onClick = () => {
                        callback(-1, start);
                    };
                    btnSubPageAttr.onClick = () => {
                        callback(-(max - maxPos), start);
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

        const sliderX = hiddenX ?
            <div className="full-h"><input onChange={(e) => {setPosX(parseInt(e.target.value, 10))}} max={hiddenX} value={this.state.posX} type="range" className="full-h" /></div> : '';
        const sliderY = hiddenY ?
            <div className="full-v"><input onChange={(e) => {setPosY(parseInt(e.target.max, 10) - parseInt(e.target.value, 10))}} max={hiddenY} value={hiddenY - this.state.posY} type="range" orient="vertical" className="full-v" /></div> : '';

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
                    <div>{getNavButton(false, true, -45)}</div>
                </Fragment>;
            rightBottomCell = getNavButton(false, false, 45);

            const leftButtons = getSizeButtons(true, false);
            leftMidCell =
                <div>
                    <Stack dir="x" center full>
                        {leftButtons}
                    </Stack>
                </div>;

            leftBottomCell = <div>{getNavButton(true, false, -45)}</div>;
        }
        const rightButtons = fixed ? '' : getSizeButtons(false, false);
        const bottomButtons = fixed ? '' : getSizeButtons(false, true);

        const posSize = props.full ? '' :
            <Fragment>
                <Dim name="Size:" x={cellsX} y={cellsY} size="3" min="1" readOnly />
                <Dim name="Position:" buttons x={this.state.posX} setX={setPosX} y={this.state.posY} setY={setPosY} size="3" maxX={hiddenX} maxY={hiddenY} min="0" readOnly />
            </Fragment>;
        const zoomInput = props.maxZoom !== 1 ? <Int name="Zoom:" readOnly min="1" max={props.maxZoom} set={setZoom} value={this.state.zoom} size="1" buttons /> : '';

        let bottomTools = [];
        const bottomActions = [];
        if (['rect', 'columns', 'rows'].indexOf(this.state.markerMode) !== -1) {
            bottomActions.push(
                <button key="clear" onClick={() => {
                    props.cellProvider.fillRect(
                        this.state.markerPosX,
                        this.state.markerPosY,
                        this.state.markerMode === 'rows' ? props.cellProvider.getWidth() : this.state.markerWidth,
                        this.state.markerMode === 'columns' ? props.cellProvider.getHeight() : this.state.markerHeight,
                        props.cellProvider.getEmptyCell()
                    );
                    this.redrawCanvas();
                }}>Clear</button>
            );
            if (this.state.markerMode === 'rect') {
                bottomTools.push(
                    <Dim key="pos" name="Position:" buttons x={this.state.markerPosX} setX={setMarkerPosX}
                         y={this.state.markerPosY} setY={setMarkerPosY} size="3" maxX={cellsX - this.state.markerWidth}
                         maxY={cellsY - this.state.markerHeight} min="0" readOnly/>
                );
                bottomActions.push(
                    <button key="cutout" onClick={() => {
                        props.cellProvider.reduceToRect(
                            this.state.markerPosX,
                            this.state.markerPosY,
                            this.state.markerWidth,
                            this.state.markerHeight
                        );
                        this.updateDims({});
                        this.switchToMode('write');
                    }}>Cut-Out</button>
                );
                bottomActions.push(
                    <button key="copy" onClick={() => {
                        const rect = props.cellProvider.getRect(
                            this.state.markerPosX,
                            this.state.markerPosY,
                            this.state.markerWidth,
                            this.state.markerHeight
                        );
                        this.switchToMode('write', {selection: new CellSelection('rect', rect)});
                    }}>Copy</button>
                );
            } else if (this.state.markerMode !== 'write') {
                bottomTools.push(
                    <Int key="pos" name="Position:" buttons min="0" size="3"
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
                bottomActions.push(
                    <button key="copy" onClick={() => {
                        const rect = props.cellProvider.getRect(
                            this.state.markerPosX,
                            this.state.markerPosY,
                            this.state.markerMode === 'rows' ? this.props.cellProvider.getWidth() : this.state.markerWidth,
                            this.state.markerMode === 'columns' ? this.props.cellProvider.getHeight() : this.state.markerHeight
                        );
                        this.switchToMode('write', {selection: new CellSelection(this.state.markerMode, rect)});
                    }}>Copy</button>
                );
            }
            bottomActions.push(
                <button key="fill" onClick={() => {
                    props.cellProvider.fillRectWithSelection(
                        this.state.markerPosX,
                        this.state.markerPosY,
                        this.state.markerMode === 'rows' ? props.cellProvider.getWidth() : this.state.markerWidth,
                        this.state.markerMode === 'columns' ? props.cellProvider.getHeight() : this.state.markerHeight,
                        this.state.selection
                    );
                    this.redrawCanvas();
                }}>Fill</button>
            );
        } else if (['row-gap', 'column-gap'].indexOf(this.state.markerMode) !== -1) {
            bottomTools.push(
                <Int key="pos" name="Position:" buttons min="1" size="3"
                     value={this.state[this.state.markerMode === 'row-gap' ? 'markerPosY' : 'markerPosX']}
                     set={this.state.markerMode === 'row-gap' ? setMarkerPosY : setMarkerPosX}
                     max={this.state.markerMode === 'row-gap' ? cellsY - this.state.markerHeight : cellsX - this.state.markerWidth}
                />
            );
            const insertGap = (no) => {
                if (this.state.markerMode === 'row-gap') {
                    props.cellProvider.insertRowsAt(this.state.markerPosY, no);
                } else {
                    props.cellProvider.insertColumnsAt(this.state.markerPosX, no);
                }
                this.updateDims({});
            };
            bottomActions.push(
                <button key="add1" onClick={() => {
                    insertGap(1);
                }}>+</button>
            );
            bottomActions.push(
                <button key="add10" onClick={() => {
                    insertGap(10);
                }}>++</button>
            );
        }

        if (['rect', 'columns', 'rows'].indexOf(this.state.markerMode) !== -1) {
            if (this.state.markerMode === 'rect') {
                bottomTools.push(
                    <Dim key="size" name="Size:" buttons x={this.state.markerWidth} setX={setMarkerWidth}
                         y={this.state.markerHeight} setY={setMarkerHeight} size="3"
                         maxX={cellsX - this.state.markerPosX} maxY={cellsY - this.state.markerPosY} min="1" readOnly/>
                );
            } else {
                bottomTools.push(
                    <Int key="size" name={this.state.markerMode === 'rows' ? 'Rows:' : 'Columns'} buttons min="1" size="3"
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
        }
        const selectionToolbar =
            <Toolbar>
                <div>Mode: {this.state.markerMode}</div>
                {bottomTools}
                {bottomActions}
            </Toolbar>;


        const canvasElem = this.getCanvas();
        const scrollSizeX = canvasElem ? canvasElem.width : 10;
        const scrollSizeY = canvasElem ? canvasElem.height : 10;

        return (
            <Stack dir="y" border full>
                <Toolbar>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rect')} switch={(enabled) => {this.switchToMode(enabled ? 'rect-select' : 'write')}}>Rect</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('rows')} switch={(enabled) => {this.switchToMode(enabled ? 'rows-select' : 'write')}}>Rows</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('columns')} switch={(enabled) => {this.switchToMode(enabled ? 'columns-select' : 'write')}}>Columns</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('row-gap')} switch={(enabled) => {this.switchToMode(enabled ? 'row-gap-select' : 'write')}}>Row Gap</SwitchButton>
                    <SwitchButton enabled={this.state.markerMode.startsWith('column-gap')} switch={(enabled) => {this.switchToMode(enabled ? 'column-gap-select' : 'write')}}>Column Gap</SwitchButton>
                    {posSize}
                    {zoomInput}
                    <Int name="Border:" readOnly min="0" max="5" set={this.setBorder} value={this.state.border} size="1" buttons />
                    <Checkbox name="Rulers" value={this.state.rulers} set={(rulers) => {
                        this.setState({rulers});
                    }} />
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
                                <Scrollbar vertical auto size={scrollSizeY} set={(value) => {this.updateDims({posY: value})}} max={this.props.cellProvider.getHeight()} pos={this.state.posY} page={this.state.viewY} />
                                {rightButtons}
                            </Stack>
                        </div>

                        {leftBottomCell}
                        <div>
                            <Stack dir="y" center>
                                <Scrollbar auto size={scrollSizeX} set={(value) => {this.updateDims({posX: value})}} max={this.props.cellProvider.getWidth()} pos={this.state.posX} page={this.state.viewX} />
                                {bottomButtons}
                            </Stack>
                        </div>
                        <div>{rightBottomCell}</div>
                    </div>
                </div>

                {selectionToolbar}
            </Stack>
        );
    }

    componentDidMount() {
        this.redrawCanvas();
    }

    componentDidUpdate() {
        this.redrawCanvas();
    }
}
FullRaster.contextType = CssContext;


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

        const cls = ['rel-canvas marker-space'];
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

    const hasResize = props.initResize !== undefined;
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

    return (
        <div style={offset} className={cls.join(' ')}>
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

    const pagePerc = Math.round(props.page / props.max * 100);
    if (props.auto && pagePerc === 100) {
        return '';
    }

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
        [oppAxisKey]: 20
    };
    const dimMax = {
        [axisKey]: maxPerc + '%',
        [oppAxisKey]: 20
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
        window.addEventListener('mousemove', trackMouse, false);

        window.addEventListener('mouseup', (e) => {
            window.removeEventListener('mousemove', trackMouse, false);
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
    const dim = {[oppAxisKey]: 20};
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

    render() {
        const style = getComputedStyle(document.body);
        const css = {
            contentTextColor: style.getPropertyValue('--content-text-color'),
            defaultPadding: style.getPropertyValue('--default-padding')
        };

        const cellProvider = new CellProvider(16,
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
                        <FullRaster markerMode="write" border={1} zoom={1} cellProvider={cellProvider} />
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