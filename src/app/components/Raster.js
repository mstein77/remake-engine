import React, {Fragment, useState, useCallback, useRef, useEffect, useContext} from "react";
import {
    Checkbox,
    Color,
    CssContext,
    Dim,
    FitCanvas,
    useWindowEventManager,
    getWindowEventManager,
    Int, Scrollbar,
    Stack,
    SwitchButton,
    Toolbar,
    upperFirst,
    MouseOverlay
} from "./BaseComponents";
import {CellSelection} from "../classes/CellProvider";

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

        const shiftRow = (start) => {
            const width = props.cellProvider.getWidth();
            const height = props.cellProvider.getHeight();
            const undoSelection =
                props.cellProvider.getRawSelection(
                    0, start ? 0 : height - 1, width, 1
                );

            const doAction = () => {
                props.cellProvider.addRows(start, -1);
                props.cellProvider.addRows(!start, 1);
                this.updateDims({});
            };
            const undoAction = () => {
                props.cellProvider.addRows(!start, -1);
                props.cellProvider.addRows(start, 1);
                props.cellProvider.writeSelection(
                    0, start ? 0 : height - 1,
                    undoSelection
                );
                this.updateDims({});
            };
            this.doAction(doAction, undoAction);
        };

        const shiftColumn = (start) => {
            const width = props.cellProvider.getWidth();
            const height = props.cellProvider.getHeight();
            const undoSelection =
                props.cellProvider.getRawSelection(
                    start ? 0 : width - 1, 0, 1, height
                );
            const doAction = () => {
                props.cellProvider.addColumns(start, -1);
                props.cellProvider.addColumns(!start, 1);
                this.updateDims({});
            };
            const undoAction = () => {
                props.cellProvider.addColumns(!start, -1);
                props.cellProvider.addColumns(start, 1);
                props.cellProvider.writeSelection(
                    start ? 0 : width - 1, 0,
                    undoSelection
                );
                this.updateDims({});
            };
            this.doAction(doAction, undoAction);
        };

        const getShiftButton = (start, vertical) => {
            if (!this.props.shift) {
                return '';
            }
            const shiftCallback = vertical ? shiftRow : shiftColumn;
            const btnShiftAttr = {};
            const shiftIconRotate = vertical ?
                (start ? null : 180) :
                (start ? 270 : 90);
            const shiftStyle = {};
            if (shiftIconRotate !== null) {
                shiftStyle.transform = 'rotate(' + shiftIconRotate + 'deg)';
            }
            btnShiftAttr.onClick = () => {
                shiftCallback(start);
            };
            return (
                <button {...btnShiftAttr}>
                    <i className="material-icons md-18" style={shiftStyle}>present_to_all</i>
                </button>
            )
        };

        const getSizeButtons = (start, vertical) => {
            const shiftBtn = getShiftButton(start, vertical);
            if (!this.state.resize) {
                return shiftBtn;
            }
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
            const jumpStyle = {};
            if (vertical) {
                jumpStyle.transform = 'rotate(90deg)';
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
            const jumpBtn =  props.full ? '' : <button {...btnJumpAttr}><i style={jumpStyle} className={materialCls.join(' ')}>{jumpChar}</i></button>;

            const br = vertical ? '' : <br />;
            const shiftBr = this.props.shift ? br : '';
            return (<div>
                <button {...btnSubPageAttr}>--</button>{br}
                <button {...btnSub1Attr}>-</button>{br}
                {shiftBtn}{shiftBr}
                {jumpBtn}
                <button {...btnAdd1Attr}>+</button>{br}
                <button {...btnAddPageAttr}>++</button>
            </div>)
        };

        const getNavButton = (startX, startY, rotate) => {
            if (props.full || !this.state.resize) {
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
        if (fixed && !props.shift) {
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
    cls.push('all-events');
    const divAttr = {
        style: offset,
        className: cls.join(' ')
    };
    if (props.dblClick) {
        divAttr.onDoubleClick = props.dblClick;
    } else if (props.click) {
        divAttr.onClick = props.click;
    } else if (props.mouseDown) {
        divAttr.onMouseDown = props.mouseDown;
    }

    let matrix = '';
    if (props.matrix) {
        const style = {
            display: 'grid',
            gridColumnGap: props.border + 'px',
            gridRowsGap: props.border + 'px'
        };
        const xMax = Math.min(props.matrix[0].length, props.width);
        const yMax = Math.min(props.matrix.length, props.height);
        const cells = [];
        const xSizes = [];
        const ySizes = [];
        for (let y = 0; y < yMax; y++) {
            ySizes.push(size + 'px');
            for (let x = 0; x < xMax; x++) {
                if (y === 0) {
                    xSizes.push(size + 'px');
                }
                cells.push(<div key={y + ' ' + x} className={props.matrix[y][x] ? '' : 'marker-cell'}></div>);
            }
        }
        style.gridTemplateColumns = xSizes.join(' ');
        style.gridTemplateRows = ySizes.join(' ');
        matrix =
            <div style={style}>
                {cells}
            </div>;
    }

    return (
        <div {...divAttr}>
            <div className={clsTopLeft.join(' ')} onMouseDown={topLeftClickHandler}></div>
            <div className={clsTop.join(' ')} onMouseDown={topClickHandler}></div>
            <div className={clsTopRight.join(' ')} onMouseDown={topRightClickHandler}></div>

            <div className={clsLeft.join(' ')} onMouseDown={leftClickHandler}></div>
            <div className={clsCenter.join(' ')} onMouseDown={centerClickHandler} style={centerStyle}>{matrix}</div>
            <div className={clsRight.join(' ')} onMouseDown={rightClickHandler}></div>

            <div className={clsBottomLeft.join(' ')} onMouseDown={bottomLeftClickHandler}></div>
            <div className={clsBottom.join(' ')} onMouseDown={bottomClickHandler}></div>
            <div className={clsBottomRight.join(' ')} onMouseDown={bottomRightClickHandler}></div>
        </div>
    )
}

function useMounted() {
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        }
    });
    return mounted;
}

function useReadyCellProvider(cellProvider, mounted) {
    const [ready, setReady] = useState(cellProvider.hasData());
    if (!ready) {
        cellProvider.load(() => {
            if (mounted.current) {
                setReady(true);
            }
        });
    }
    return ready;
}

function useRasterDim(props) {
    const cellSize = (props.size ? props.size : props.cellProvider.getSize()) * props.zoom;
    const cellPlusBorderSize = cellSize + props.border;
    const rasterWidth = cellPlusBorderSize * props.width + props.border;
    const rasterHeight = cellPlusBorderSize * props.height + props.border;

    return [cellSize, cellPlusBorderSize, rasterWidth, rasterHeight];
}

const EditorContext = React.createContext();

const RasterCanvas = React.memo(React.forwardRef((props, canvasRef) => {
    const context = useContext(CssContext);

    useEffect(() => {
        drawRaster();
    });

    const cellSize = props.size * props.zoom;
    const cellPlusBorderSize = cellSize + props.border;
    const canvasWidth = props.border + props.width * cellPlusBorderSize;
    const canvasHeight = props.border + props.height * cellPlusBorderSize;

    const drawRaster = () => {
        const canvas = canvasRef.current;
        if (canvas === null) {
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // TODO box-border-color?
        ctx.fillStyle = context.contentTextColor;

        let pos = 0;
        if (props.border > 0) {
            for (let x = 0; x <= props.width; x++) {
                ctx.fillRect(pos, 0, props.border, canvasHeight);
                pos += cellPlusBorderSize;
            }
            pos = 0;
            for (let y = 0; y <= props.height; y++) {
                ctx.fillRect(0, pos, canvasWidth, props.border);
                pos += cellPlusBorderSize;
            }
        }
        return ctx;
    };

    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
    return (
        <div style={{width: canvasWidth, height: canvasHeight}} className="checkbg"><div style={{backgroundColor: bgColor}}><canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} /></div></div>
    );
}));

function CellRaster(props) {
    const canvasRef = useRef(null);
    const height = props.cells.length;
    const width = props.cells[0].length;
    const {size, border, zoom} = props;
    const rasterProps = {size, width, height, border, zoom, ref: canvasRef};
    const cellPlusBorderSize = size * zoom + border;
    let ctx = null;

    const drawCells = (ctx) => {
        console.log('drawCells');
        let pos = border;
        for (let row of props.cells) {
            for (let x = 0; x < width; x++) {
                props.render(ctx, border + x * cellPlusBorderSize, pos, row[x]);
            }
            pos += cellPlusBorderSize;
        }
    };

    useEffect(() => {
        ctx = canvasRef.current.getContext('2d');
        drawCells(ctx);
    });

    return (
        <RasterCanvas {...rasterProps} />
    );
}

const CellProviderRaster = React.memo((props) => {
    const eContext = useContext(EditorContext);
    const [update, setUpdate] = useState(false);
    const mounted = useMounted();
    const ready = useReadyCellProvider(props.cellProvider, mounted);
    const updateRef = useRef(null);
    updateRef.current = update;

    useEffect(() => {
        if (props.id) {
            eContext.addRedraw(props.id, () => {
                setUpdate(!updateRef.current);
            });
        }
    }, []);

    if (!ready) {
        return ''
    }

    const cells = props.cellProvider.getSelection(props.posX, props.posY, props.width, props.height).getCells();
    const size = props.cellProvider.getSize();
    let render = null;
    switch (props.cellProvider.getCellType()) {
        case 'bitmap':
            render =
                (ctx, x, y, value) => {
                    const img = props.cellProvider.getBitmapForValue2(value, props.zoom);
                    if (img) {
                        ctx.putImageData(img, x, y);
                    }
                };
            break;

        case 'color':
            const cellSize = size * props.zoom;
            render =
                (ctx, x, y, value) => {
                    ctx.fillStyle = value;
                    ctx.fillRect(x, y, cellSize, cellSize);
                };
            break;

        default:
            console.error('Unknown cell type', props.cellProvider.getCellType());
            break;
    }

    return (
        <CellRaster size={size} cells={cells} border={props.border} zoom={props.zoom} render={render} />
    );
});

function FlexCellProviderRaster(props) {
    const divRef = useRef(null);
    const observerRef = useRef(null);

    const rulerSpaceX = props.rulers ? 30 : 0;
    const rulerSpaceY = props.rulers ? 20 : 0;

    const size = props.cellProvider.getSize();
    const [cellSize, cellPlusBorderSize, rasterWidth, rasterHeight] = useRasterDim({...props, size});

    const checkSize = () => {
        const rect = divRef.current.parentNode.getBoundingClientRect();
        const spaceX = rect.width - (props.rulers ? rulerSpaceX : 0) - props.border;
        const spaceY = rect.height - (props.rulers ? rulerSpaceY : 0) - props.border;
        let newWidth = Math.min(Math.floor(spaceX / cellPlusBorderSize), props.cellProvider.getWidth());
        let newHeight = Math.min(Math.floor(spaceY / cellPlusBorderSize), props.cellProvider.getHeight());

        if (props.width !== newWidth) {
            props.setWidth(newWidth);
        }
        if (props.height !== newHeight) {
            props.setHeight(newHeight);
        }
    };

    const maxColumns = props.cellProvider.getWidth();
    const maxRows = props.cellProvider.getHeight();
    if (props.setPosX && props.posX + props.width >= maxColumns) {
        props.setPosX(maxColumns - props.width);
    }
    if (props.setPosY && props.posY + props.height >= maxRows) {
        props.setPosY(maxRows - props.height);
    }

    useEffect(() => {
        if (props.auto) {
            const observer = new ResizeObserver(entries => {
                checkSize();
            });
            observerRef.current = observer;
            observer.observe(divRef.current);
            return () => {
                if (observerRef.current) {
                    observerRef.current.disconnect();
                }
            }
        }
    }, []);

    useEffect(() => {
        if (props.auto) checkSize();
    });

    const style = {
        width: rasterWidth,
        height: rasterHeight
    };

    const rasterProps = {
        cellProvider: props.cellProvider,
        border: props.border,
        zoom: props.zoom,
        posX: props.posX,
        posY: props.posY,
        width: props.width,
        height: props.height,
        id: props.id
    };

    let topRuler = '';
    let leftRuler = '';
    if (props.rulers) {
        topRuler = <HRuler digits={('' + props.cellProvider.getWidth()).length} width={rasterWidth} height={rulerSpaceY} max={props.width} start={props.posX} size={size} zoom={props.zoom} border={props.border} />;
        leftRuler = <VRuler digits={('' + props.cellProvider.getHeight()).length} height={rasterHeight} width={rulerSpaceX} max={props.height} start={props.posY} size={size} zoom={props.zoom} border={props.border} />;
        style.marginTop = -(rulerSpaceY >> 1);
    }

    return (
        <div ref={divRef} className="full-v stack-h centered" style={{paddingLeft: rulerSpaceX, paddingTop: rulerSpaceY}}>
            <div className="stack-h centered items-centered">
                <div className="rel-canvas marker-space" style={style}>
                    <CellProviderRaster {...rasterProps} />
                    {topRuler}
                    {leftRuler}
                    {props.children}
                </div>
            </div>
        </div>
    );
}

function FlexCellProviderScrollRaster(props) {
    const style = {
        display: 'grid',
        gridTemplateColumns: 'auto',
        gridRowGap: 0,
        gridColumGap: 0
    };

    const cellsWidth = props.cellProvider.getWidth();
    const cellsHeight = props.cellProvider.getHeight();
    const maxPosX = cellsWidth - props.width;
    const maxPosY = cellsHeight - props.height;
    const sensivity = 0.25;

    const onWheel = (e) => {
        let deltaX = Math.round(e.deltaX * sensivity);
        let deltaY = Math.round(e.deltaY * sensivity);

        const newPosX = Math.min(Math.max(props.posX + deltaX, 0), maxPosX);
        const newPosY = Math.min(Math.max(props.posY + deltaY, 0), maxPosY);
        if (newPosX !== props.posX) {
            props.setPosX(newPosX);
        }
        if (newPosY !== props.posY) {
            props.setPosY(newPosY);
        }
        e.stopPropagation();
        e.preventDefault();
    };

    const hasScrollingX = props.width < cellsWidth;
    const hasScrollingY = props.height < cellsHeight;

    const firstCells = [<div key={1} onWheel={onWheel}><FlexCellProviderRaster {...props} /></div>];
    if (hasScrollingY) {
        firstCells.push(<div key={2}><Scrollbar auto vertical set={props.setPosY} pos={props.posY} page={props.height} max={props.cellProvider.getHeight()} /></div>);
        style.gridTemplateColumns += ' 21px'
    }
    const secondCells = [];
    if (hasScrollingX) {
        secondCells.push(<div key={3}><Scrollbar auto set={props.setPosX} pos={props.posX} page={props.width} max={props.cellProvider.getWidth()} /></div>);
        style.gridTemplateRows = 'auto';
        if (hasScrollingY) {
            secondCells.push(<div key={4}></div>);
            style.gridTemplateRows += ' 21px';
        }
    }

    return (
        <div style={style} className="full-v">
            {firstCells}
            {secondCells}
        </div>

    );
}

function VRuler(props) {
    const context = useContext(CssContext);
    const rulerRef = useRef(null);
    const rulerPadding = context.markerWidth;
    const fontSize = 10;
    const fontWidth = 10;
    const width = props.width - rulerPadding;

    const drawRuler = (ctx) => {
        const fullWidth = 13;
        const smallWidth = 3;
        const border = 1;
        const padding = 10;
        const charWidth = fontWidth;
        const cellSize = props.zoom * props.size + border;

        ctx.clearRect(0, 0, props.width, props.height);
        ctx.fillStyle = context.contentTextColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(width - border, 0, 1, props.height);
        const dist = Math.ceil((fontSize + 2 * padding) / cellSize);
        for (let i = 0; i < props.max; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < props.max) {
                    const text = '' + (props.start + i);
                    const txtWidth = ctx.measureText(text).width;
                    ctx.fillText(
                        text,
                        width - padding - txtWidth,
                        cellSize * i + fontSize + (padding >> 1)
                    );
                }
                ctx.fillRect(width - fullWidth, cellSize * i, fullWidth, border);
            } else {
                ctx.fillRect(width - smallWidth, cellSize * i, smallWidth, border);
            }
        }
    };

    useEffect(() => {
        drawRuler(rulerRef.current.getContext('2d'));
    });

    return (
        <canvas
            style={{position: 'absolute', left: (-props.width), top: 0}}
            ref={rulerRef} width={width} height={props.height} />
    );
}

function HRuler(props) {
    const context = useContext(CssContext);
    const rulerRef = useRef(null);
    const rulerPadding = context.markerWidth;
    const fontSize = 10;
    const fontWidth = 10;
    const height = props.height - rulerPadding;

    const drawRuler = (ctx) => {
        const fullWidth = 13;
        const smallWidth = 3;
        const border = 1;
        const padding = 10;
        const charWidth = fontWidth;
        const cellSize = props.zoom * props.size + border;

        ctx.clearRect(0, 0, props.width, height);
        ctx.fillStyle = context.contentTextColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(0, height - border, props.width, border);
        const dist = Math.ceil((props.digits * charWidth + 2 * padding) / cellSize);
        for (let i = 0; i < props.max; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < props.max) {
                    ctx.fillText('' + (props.start + i), cellSize * i + padding, fontSize);
                }
                ctx.fillRect(cellSize * i, height - fullWidth, border, fullWidth);
            } else {
                ctx.fillRect(cellSize * i, height - smallWidth, border, smallWidth);
            }
        }
    };

    useEffect(() => {
        drawRuler(rulerRef.current.getContext('2d'));
    });

    return (
        <canvas
            style={{position: 'absolute', top: (-props.height), left: 0}}
            ref={rulerRef} width={props.width} height={height} />
    );
}

function MarkerArea(props) {
    const [cellSize, cellPlusBorderSize, rasterWidth, rasterHeight] = useRasterDim(props);

    if (props.markerX === null) {
        return '';
    }

    const markerType = props.markerType;
    let offX;
    let offY;
    let markerWidth;
    let markerHeight;

    const checkX = !markerType.startsWith('row');
    const checkY = !markerType.startsWith('column');

    const maxMarkerX = props.markerX + props.markerWidth - 1;
    const maxPosX = props.posX + props.width - 1;
    const visibleX = !checkX || (props.posX <= maxMarkerX && maxPosX >= props.markerX);
    const maxMarkerY = props.markerY + props.markerHeight - 1;
    const maxPosY = props.posY + props.height - 1;
    const visibleY = !checkY || (props.posY <= maxMarkerY && maxPosY >= props.markerY);
    const isGap = markerType.endsWith('gap');

    let hasTop = (checkY && props.posY <= props.markerY && maxPosY >= props.markerY && !isGap);
    let hasBottom = (checkY && props.posY <= maxMarkerY && maxPosY >= maxMarkerY && !isGap);
    let hasLeft = (checkX && props.posX <= props.markerX && maxPosX >= props.markerX && !isGap);
    let hasRight = (checkX && props.posX <= maxMarkerX && maxPosX >= maxMarkerX && !isGap);

    offX = checkX ? Math.max(props.markerX, props.posX) - props.posX : 0;
    offY = checkY ? Math.max(props.markerY, props.posY) - props.posY : 0;

    let maxOffX = Math.min(maxMarkerX, maxPosX) - props.posX;
    let maxOffY = Math.min(maxMarkerY, maxPosY) - props.posY;
    markerWidth = checkX ? maxOffX - offX + 1 : props.width;
    markerHeight = checkY ? maxOffY - offY + 1 : props.height;

    let marker = '';
    if (visibleX && visibleY) {
        marker = <CellMarker
            blink
            initMove={props.move}
            initResize={props.resize}
            size={props.size}
            border={props.border}
            zoom={props.zoom}
            type={markerType}
            highlight={true}
            posX={offX}
            posY={offY}
            width={markerWidth}
            height={markerHeight}
            top={hasTop}
            bottom={hasBottom}
            left={hasLeft}
            right={hasRight}
        />;
    }

    return (
        <Fragment>
            <div
                style={{width: rasterWidth, height: rasterHeight}}
                className="marker-area no-events">
                {marker}
            </div>
        </Fragment>
    );
}

function CursorArea(props) {
    const eContext = useContext(EditorContext);
    const divRef = useRef(null);
    const [offX, setOffX] = useState(null);
    const [offY, setOffY] = useState(null);

    const [cellSize, cellPlusBorderSize, rasterWidth, rasterHeight] = useRasterDim(props);
    let marker;

    useEffect(() => {
        const rect = divRef.current.getBoundingClientRect();
        rect.cellSize = cellSize;
        props.boundingRectRef.current = rect;
    }, [rasterWidth, rasterHeight, cellSize]);

    const cursorWidth = props.cursorWidth;
    const cursorHeight = props.cursorHeight;
    const markerType = props.cursorType;

    const isGap = markerType.endsWith('gap');

    if (offX !== null) {

        let hasTop = true;
        let hasBottom = true;
        let hasLeft = true;
        let hasRight = true;

        let markerWidth = markerType.startsWith('row') ? props.width : Math.min(cursorWidth, props.width - offX);
        let markerHeight = markerType.startsWith('column') ? props.height : Math.min(cursorHeight, props.height - offY);

        if (markerType === 'row-gap') {
            markerHeight = 1;
        } else if (markerType === 'column-gap') {
            markerWidth = 1;
        }

        switch (markerType) {
            case 'rect':
                hasBottom = (offY + cursorHeight <= props.height);
                hasRight = (offX + cursorWidth <= props.width);
                break;

            case 'columns':
                hasTop = false;
                hasBottom = false;
                break;

            case 'rows':
                hasLeft = false;
                hasRight = false;
                break;

            case 'row-gap':
            case 'column-gap':
                hasTop = false;
                hasBottom = false;
                hasLeft = false;
                hasRight = false;
                break;
        }

        const onClick = (e) => {
            if (!props.mouseDown) {
                return;
            }
            const offset = getOffsetPos(e);
            e.stopPropagation();
            e.preventDefault();
            return props.mouseDown(e, props.posX + offset.x, props.posY + offset.y, 1, 1);
        };

        // matrix={selection.getMatchMatrix(props.cellProvider.getEmptyCell())}

        marker = <CellMarker
            blink
            mouseDown={onClick}
            size={props.size}
            border={props.border}
            zoom={props.zoom}
            type={markerType}
            highlight={props.highlight}
            posX={offX}
            posY={offY}
            width={markerWidth}
            height={markerHeight}
            top={hasTop}
            bottom={hasBottom}
            left={hasLeft}
            right={hasRight}
        />;
    }

    const getOffsetPos = (e) => {
        const rect = divRef.current.getBoundingClientRect();
        let posX = Math.floor((e.clientX - rect.x)/cellPlusBorderSize);
        let reset = (posX < 0 || posX >= props.width);
        let posY = Math.floor((e.clientY - rect.y)/cellPlusBorderSize);
        reset = reset || (posY < 0 || posY >= props.height);

        if (reset) {
            return false;
        }
        if (markerType.startsWith('column')) {
            if (isGap && posX === 0 && props.posX === 0) {
                posX = 1;
            }
            posY = 0;
        } else if (markerType.startsWith('row')) {
            if (isGap && posY === 0 && props.posY === 0) {
                posY = 1;
            }
            posX = 0;
        }
        return {
            x: posX,
            y: posY
        };
    };

    const onMouseMove = (e) => {
        const offset = getOffsetPos(e);
        if (offset === false) {
            setOffX(null);
            setOffY(null);
        }  else if (offX !== offset.x || offY !== offset.y) {
            setOffX(offset.x);
            setOffY(offset.y);
            if (props.mouseTrack) {
                props.mouseTrack(props.posX + offset.x, props.posY + offset.y);
            }
        }
        e.stopPropagation();
        e.preventDefault();
    };

    const onMouseLeave = (e) => {
        setOffX(null);
        setOffY(null);
        e.stopPropagation();
        e.preventDefault();
    };

    const onDoubleClick = props.doubleClick ? (e) => {
        props.doubleClick(e);
        e.stopPropagation();
        e.preventDefault();
    } : null;

    return (
        <div
            ref={divRef}
            style={{width: rasterWidth, height: rasterHeight}}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
            className="marker-area">
            {marker}
        </div>
    );
}

class EditorCtx extends React.Component {
    constructor(props) {
        super(props);

        this.redraw = {};
        this.frames = {};

        this.setSelection = function (selection) {
            this.setState({selection});
        };
        this.setSelection = this.setSelection.bind(this);

        this.state = {
            past: [],
            future: [],
            selection: null,
            setSelection: this.setSelection,
            hasPast: () => {
                return this.state.past.length > 0;
            },
            hasFuture: () => {
                return this.state.future.length > 0;
            },
            doAction: (doAction, undoAction) => {
                const action = {doAction, undoAction};
                const past = this.state.past.concat();
                if (past.length > 10) {
                    past.shift();
                }
                past.push(action);
                this.setState({
                    past,
                    future: []
                });
                action.doAction();
            },
            undoAction: () => {
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
            },
            redoAction: () => {
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
            },
            addRedraw: (id, cellRedraw) => {
                this.redraw[id] = cellRedraw;
            },
            redraw: (id) => {
                if (this.redraw[id]) {
                    if (this.frames[id]) {
                        cancelAnimationFrame(this.frames[id]);
                    }
                    this.frames[id] = requestAnimationFrame(
                        () => {
                            this.redraw[id]();
                            this.frames[id] = undefined;
                        }
                    );
                }
            }
        };
    }

    render() {
        return (
            <EditorContext.Provider value={this.state}>
                {this.props.children}
            </EditorContext.Provider>
        );
    }
}

function BasicRasterView(props) {
    const eContext = useContext(EditorContext);

    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const propsRef = useRef({});

    useEffect(() => {
        eContext.setSelection(props.cellProvider.getEmptySelection());
    }, []);

    const [border, setBorder] = useState(1);
    const [zoom, setZoom] = useState(2);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(5);
    const [rulers, setRulers] = useState(true);
    const [cursorType, setCursorType] = useState('rect');
    const [cursorWidth, setCursorWidth] = useState(1);
    const [cursorHeight, setCursorHeight] = useState(1);
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(1);
    const [markerHeight, setMarkerHeight] = useState(1);
    const [markerType, setMarkerType] = useState('rect');
    const [markerSpaceX, setMarkerSpaceX] = useState(0);
    const [markerSpaceY, setMarkerSpaceY] = useState(0);
    const [cursorMouseDown, setCursorMouseDown] = useState(null);
    const [cursorMouseUp, setCursorMouseUp] = useState(null);
    const [cursorDoubleClick, setCursorDoubleClick] = useState(null);
    const [cursorHighlight, setCursorHighlight] = useState(false);
    const [cursorMouseTrack, setCursorMouseTrack] = useState(null);
    const [fixCursor, setFixCursor] = useState(null);
    const windowEvent = useWindowEventManager();
    const boundingRectRef = useRef(null);
    const autoScrollRef = useRef({id : null, x: null, y: null, marker: false});

    propsRef.current = {
        width,
        height,
        posX,
        posY,
        markerX,
        markerY,
        markerWidth,
        markerHeight,
        setMarkerX,
        setMarkerY,
        setMarkerWidth,
        setMarkerHeight,
        setPosX,
        setPosY,
        cellProvider: props.cellProvider
    };

    const overlayRef = useRef({
        modes: {},
        modeId: null,
        cleaned: true,
        markerAction: null,
        setMarkerAction: function (action) {
            this.markerAction = action;
        },
        triggerMarkerAction: function() {
            if (this.markerAction !== null) {
                this.markerAction(propsRef.current, this);
            }
        },
        cleanUp: function () {
            if (this.modeId !== null && !this.cleaned) {
                this.modes[this.modeId].cleanUp();
            }
            this.cleaned = true;
        },
        addMode: function (id, init, cleanUp) {
            this.modes[id] = {
                init,
                cleanUp
            };
        },
        setMode: function (modeId, data = {}) {
            console.log('setMode', modeId, data);
            if (!this.modes[modeId]) {
                throw Error('Unknown mode id "' + modeId + '"');
            }
            this.cleanUp();
            if (modeId !== null) {
                this.modes[modeId].init(data);
                this.modeId = modeId;
                this.cleaned = false;
            }
        }
    });
    const overlay = overlayRef.current;

    useEffect(() => {
        const autoScroll = autoScrollRef.current;

        overlay.addMode = overlay.addMode.bind(overlay);
        overlay.setMode = overlay.setMode.bind(overlay);
        overlay.cleanUp = overlay.cleanUp.bind(overlay);
        overlay.setMarkerAction = overlay.setMarkerAction.bind(overlay);
        overlay.triggerMarkerAction = overlay.triggerMarkerAction.bind(overlay);

        const mouseUpPickAgain = (e) => {
            overlay.setMode('pick');
        };
        overlay.addMode(
            'pick',
            (data) => {
                setCursorType('rect');
                setCursorWidth(1);
                setCursorHeight(1);
                setMarkerX(null);
                setMarkerHeight(1);
                setMarkerWidth(1);
                setCursorHighlight(false);
                setCursorMouseDown(() => (e, x, y) => {
                    eCtxRef.current.setSelection(props.cellProvider.getSelection(x, y, 1, 1));
                    setMarkerX(x);
                    setMarkerY(y);
                    windowEvent.addListener('mouseup', mouseUpPickAgain, {capture: false, once: true});
                    setFixCursor('pointer');
                });
                setCursorDoubleClick(() => (e, x, y) => {
                    overlay.setMode('startPath');
                });
            },
            () => {
                windowEvent.removeListener('mouseup', mouseUpPickAgain, {capture: false, once: true})
                setMarkerX(null);
                setMarkerY(null);
                setCursorMouseDown(null);
                setFixCursor(null);
                setCursorDoubleClick(null);
            }
        );
        overlay.addMode(
            'select',
            (data) => {
                setCursorType(data.type ? data.type : 'rect');
                setCursorWidth(data.width ? data.width : 1);
                setCursorHeight(data.height ? data.height : 1);
                // TODO fix, spacing
                setCursorMouseDown(() => (e, x, y) => {
                    setMarkerType(cursorType);
                    setMarkerX(x);
                    setMarkerY(y);
                    setMarkerWidth(cursorWidth);
                    setMarkerHeight(cursorHeight);
                    if (cursorType.endsWith('gap')) {
                        overlay.setMode('select', {type: data.type});
                    } else {
                        requestAnimationFrame(() => {
                            overlay.setMode('markerResize', {
                                event: e,
                                axis: 'xy',
                                startX: false,
                                startY: false
                            });
                        });
                    }
                });
            },
            () => {
                setCursorMouseDown(null);
            }
        );
        overlay.addMode(
            'startPath',
            (data) => {
                setCursorType(eCtxRef.current.selection.getType());
                setCursorWidth(eCtxRef.current.selection.getWidth());
                setCursorHeight(eCtxRef.current.selection.getHeight());
                setMarkerX(null);
                setMarkerY(null);

                setCursorMouseDown(() => (e, x, y) => {
                    overlayRef.current.setMode('writePath', {
                        clear: (e.button === 2),
                        start: {x, y}
                    });
                    e.stopPropagation();
                    e.preventDefault();
                });
            },
            () => {
                setCursorMouseDown(null);
            }
        );

        let mouseUpSavePath;
        overlay.addMode(
            'writePath',
            (data) => {
                const path = {
                    new: {},
                    old: {}
                };
                const track = (x, y) => {
                    let segment;
                    if (data.clear) {
                        segment = props.cellProvider.writeSelection(x, y, eCtxRef.current.selection, props.cellProvider.getEmptyCell(), true);
                    } else {
                        segment = props.cellProvider.writeSelection(x, y, eCtxRef.current.selection, null, true);
                    }
                    Object.assign(path.new, segment.new);
                    for(let key in segment.old) {
                        if (path.old[key] === undefined) {
                            path.old[key] = segment.old[key];
                        }
                    }
                    eCtxRef.current.redraw('boom');
                };

                setCursorHighlight(true);
                track(data.start.x, data.start.y);

                mouseUpSavePath = (e, x, y) => {
                    const doPath = path.new;
                    const undoPath = path.old;
                    const doAction = () => {
                        props.cellProvider.writePath(doPath);
                        eCtxRef.current.redraw('boom');
                    };
                    const undoAction = () => {
                        props.cellProvider.writePath(undoPath);
                        eCtxRef.current.redraw('boom');
                    };
                    eContext.doAction(doAction, undoAction);
                    overlay.setMode('startPath');
                };
                //                setCursorTrack()
                windowEvent.addListener('mouseup', mouseUpSavePath, {capture: false, once: true});
                setCursorMouseTrack(() => (x, y) => {
                    track(x, y);
                });
            },
            () => {
                windowEvent.removeListener('mouseup', mouseUpSavePath, {capture: false, once: true});
                setCursorHighlight(false);
                setCursorMouseTrack(null);
            }
        );

        // # Marker Modes #
        const setState = (change, where = '?') => {
            const props = propsRef.current;
            if (change.markerHeight !== undefined && change.markerHeight !== props.markerHeight) {
                console.log(where, '-> markerHeight', change.markerHeight, props.markerHeight);
                props.setMarkerHeight(change.markerHeight);
            }
            if (change.markerWidth !== undefined && change.markerWidth !== props.markerWidth) {
                console.log(where, '-> markerWidth', change.markerWidth, props.markerWidth);
                props.setMarkerWidth(change.markerWidth);
            }
            if (change.markerX !== undefined && change.markerX !== props.markerX) {
                console.log(where, '-> markerX', change.markerX, props.markerX);
                props.setMarkerX(change.markerX);
            }
            if (change.markerY !== undefined && change.markerY !== props.markerY) {
                console.log(where, '-> markerY', change.markerY, props.markerY);
                props.setMarkerY(change.markerY);
            }
            if (change.posX !== undefined && change.posX !== props.posX) {
                console.log(where, '-> posX', change.posX, props.posX);
                props.setPosX(change.posX);
            }
            if (change.posY !== undefined && change.posY !== props.posY) {
                console.log(where, '-> posY', change.posY, props.posY);
                props.setPosY(change.posY);
            }
        };

        const handleAutoScroll = () => {
            const props = propsRef.current;
            if (!autoScroll.id || !(autoScroll.x || autoScroll.y)) {
                autoScroll.id = undefined;
                return;
            }
            const change = {};
            if (autoScroll.x && !(autoScroll.marker && !autoScroll.marker.resizeX)) {
                const maxPosX = props.cellProvider.getWidth() - props.width;
                const posX =
                    Math.min(Math.max(props.posX + autoScroll.x, 0), maxPosX);

                if (autoScroll.marker && autoScroll.marker.resizeX) {
                    const anchorX = autoScroll.marker.anchorPos.x;

                    if (autoScroll.x < 0) {
                        change.markerX = Math.min(posX, anchorX);
                        change.markerWidth = Math.abs(posX - anchorX) + 1;
                    } else {
                        const posEndX = posX + props.width - 1;
                        change.markerX = posEndX < anchorX ? posEndX - 1 : anchorX;
                        change.markerWidth = Math.abs(posEndX - anchorX) + 1;
                    }
                } else {
                    change.markerX =
                        Math.min(Math.max(props.markerX + autoScroll.x, 0),
                            props.cellProvider.getWidth() - props.markerWidth
                        );
                }
                change.posX = posX;
            }

            if (autoScroll.y && !(autoScroll.marker && !autoScroll.marker.resizeY)) {
                const maxPosY = props.cellProvider.getHeight() - props.height;
                const posY =
                    Math.min(Math.max(props.posY + autoScroll.y, 0), maxPosY);

                if (autoScroll.marker && autoScroll.marker.resizeY) {
                    const anchorY = autoScroll.marker.anchorPos.y;

                    if (autoScroll.y < 0) {
                        change.markerY = Math.min(posY, anchorY);
                        change.markerHeight = Math.abs(posY - anchorY) + 1;
                    } else {
                        const posEndY = posY + props.height - 1;
                        change.markerY = posEndY < anchorY ? posEndY - 1 : anchorY;
                        change.markerHeight = Math.abs(posEndY - anchorY) + 1;
                    }
                } else {
                    change.markerY =
                        Math.min(Math.max(props.markerY + autoScroll.y, 0),
                            props.cellProvider.getHeight() - props.markerHeight
                        );
                }
                change.posY = posY;
            }
            setState(change);
            initAutoScroll();
        };

        const initAutoScroll = () => {
            autoScroll.id = setTimeout(
                handleAutoScroll, 100
            );
        };

        const resetAutoScroll = () => {
            if (autoScroll.id) {
                clearTimeout(autoScroll.id);
                autoScroll.id = undefined;
            }
            autoScroll.marker = false;
            autoScroll.x = null;
            autoScroll.y = null;
        };

        const updateAutoScroll = (newRasterPos, autoScrollMarker = null) => {
            const props = propsRef.current;
            const scrollX = autoScrollMarker === null || autoScrollMarker.resizeX;
            if (scrollX && newRasterPos.rawX < 0 || newRasterPos.rawX > props.width) {
                autoScroll.x = newRasterPos.rawX < 0 ? newRasterPos.rawX : newRasterPos.rawX - props.width;
            } else {
                autoScroll.x = null;
            }
            const scrollY = autoScrollMarker === null || autoScrollMarker.resizeY;
            if (scrollY && newRasterPos.rawY < 0 || newRasterPos.rawY > props.height) {
                autoScroll.y = newRasterPos.rawY < 0 ? newRasterPos.rawY : newRasterPos.rawY - props.height;
            } else {
                autoScroll.y = null;
            }
            autoScroll.marker = autoScrollMarker;
            if (autoScroll.x || autoScroll.y) {
                if (!autoScroll.id) {
                    initAutoScroll();
                }
            } else {
                autoScroll.id = undefined;
            }
        };

        const getRasterPosFromEvent = (e, outside = false, isGap = false) => {
            return getRasterPosFromClient({x: e.clientX, y: e.clientY}, outside, isGap);
        };

        const getRasterPosFromClient = (client, outside = false, gap = false) => {
            if (!boundingRectRef.current) {
                return null;
            }
            const rect = boundingRectRef.current;

            const rasterPos = {
                x: Math.floor(Math.round(client.x - rect.left)/rect.cellSize),
                y: Math.floor(Math.round(client.y - rect.top)/rect.cellSize),
            };
            const min = gap ? 1 : 0;
            let maxX = propsRef.current.width;
            let maxY = propsRef.current.height;

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
        };

        let lastRasterPos = {x: null, y: null};
        let mouseMove = null;
        let mouseUp = null;
        let lastMoveClick = Date.now();
        overlay.addMode(
            'markerMove',
            (data) => {
                const clickTime = Date.now();
                if (clickTime - lastMoveClick < 1500) {
                    overlay.triggerMarkerAction();
                    return;
                }
                lastMoveClick = clickTime;
                const props = propsRef.current;
                const isGap = false;
                lastRasterPos = getRasterPosFromEvent(data.event, false, isGap);
                const trackX = true;
                const trackY = true;

                if (!trackX) {
                    lastRasterPos.x = 0;
                }
                if (!trackY) {
                    lastRasterPos.y = 0;
                }

                const offPos = {
                    x: isGap ? 0 : lastRasterPos.x - (props.markerX - props.posX),
                    y: isGap ? 0 : lastRasterPos.y - (props.markerY - props.posY)
                };

                const checkWithLastRasterPos = (e) => {
                    const props = propsRef.current;
                    const newRasterPos = getRasterPosFromEvent(e, false, isGap);
                    if (newRasterPos === null) {
                        return;
                    }
                    if (!trackX) {
                        newRasterPos.x = 0;
                    }
                    if (!trackY) {
                        newRasterPos.y = 0;
                    }
                    const xStart = newRasterPos.x - offPos.x;
                    const yStart = newRasterPos.y - offPos.y;

                    let markerPosX = props.posX + xStart;
                    let markerPosY = props.posY + yStart;

                    const hasChangedX = trackX && newRasterPos.x !== lastRasterPos.x;
                    const hasChangedY = trackY && newRasterPos.y !== lastRasterPos.y;

                    updateAutoScroll(newRasterPos);

                    if (hasChangedX || hasChangedY) {
                        const change = {};
                        if (hasChangedX) {
                            if (markerPosX < 0) {
                                markerPosX = 0;
                            } else if (markerPosX + props.markerWidth > props.cellProvider.getWidth()) {
                                markerPosX = props.cellProvider.getWidth() - props.markerWidth;
                            }
                            lastRasterPos.x = newRasterPos.x;
                            change.markerX = markerPosX;
                        }
                        if (hasChangedY) {
                            if (markerPosY < 0) {
                                markerPosY = 0;
                            } else if (markerPosY + props.markerHeight > props.cellProvider.getHeight()) {
                                markerPosY = props.cellProvider.getHeight() - props.markerHeight;
                            }
                            lastRasterPos.y = newRasterPos.y;
                            change.markerY = markerPosY;
                        }
                        setState(change);
                    }
                };

                mouseMove = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                };
                windowEvent.addListener('mousemove', mouseMove, false);

                mouseUp = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                    overlay.setMode('select');
                };
                windowEvent.addListener(
                    'mouseup',
                    mouseUp,
                    {capture: false, once: true}
                );
                setFixCursor('move');
            },
            () => {
                resetAutoScroll();
                windowEvent.removeListener('mousemove', mouseMove, false);
                windowEvent.removeListener('mouseup', mouseUp, {capture: false, once: true});
                setFixCursor(null);
            }
        );

        let lastResizeClick = Date.now();
        overlay.addMode(
            'markerResize',
            (data) => {
                const clickTime = Date.now();
                if (clickTime - lastResizeClick < 1500) {
                    overlay.triggerMarkerAction();
                    return;
                }
                lastResizeClick = clickTime;
                const startX = data.startX;
                const startY = data.startY;
                const axis = data.axis;
                const e = data.event;
                const props = propsRef.current;

                const trackX = true;
                const trackY = true;

                const anchorPos = {
                    x: props.markerX + (!startX ? 0 : props.markerWidth - 1),
                    y: props.markerY + (!startY ? 0 : props.markerHeight - 1)
                };
                const resizeX = trackX && axis.indexOf('x') !== -1;
                const resizeY = trackY && axis.indexOf('y') !== -1;

                lastRasterPos = getRasterPosFromEvent(e, true);

                const checkWithLastRasterPos = (e) => {
                    const props = propsRef.current;
                    const newRasterPos = getRasterPosFromEvent(e, true);
                    if (newRasterPos === null) {
                        return;
                    }
                    updateAutoScroll(newRasterPos, {anchorPos, resizeX, resizeY});

                    // relative width/height from anchorPos
                    const absWidth = newRasterPos.x + props.posX - anchorPos.x;
                    const absHeight = newRasterPos.y + props.posY - anchorPos.y;

                    // width/height not 0 and within raster?
                    const validX = (resizeX && absWidth !== 0 && newRasterPos.x + 1 >= 0 && newRasterPos.x <= props.width);
                    const validY = (resizeY && absHeight !== 0 && newRasterPos.y + 1  >= 0 && newRasterPos.y <= props.height);

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
                                change.markerX = anchorPos.x + absWidth + 1;
                            }
                        }
                        if (validY) {
                            if (absHeight > 0) {
                                change.markerHeight = absHeight;
                            } else {
                                change.markerHeight = -absHeight;
                                change.markerY = anchorPos.y + absHeight + 1;
                            }
                        }
                        setState(change);
                    }
                };

                mouseMove = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                };
                windowEvent.addListener('mousemove', mouseMove, false);

                mouseUp = (e) => {
                    checkWithLastRasterPos(e);
                    overlay.setMode('select');
                    e.stopPropagation();
                    e.preventDefault();
                };
                windowEvent.addListener(
                    'mouseup',
                    mouseUp,
                    {capture: false, once: true}
                );

                let dir = '';
                if (axis === 'x') {
                    dir = 'h'
                } else if (axis === 'y') {
                    dir = 'v';
                } else {
                    dir = ((startX && startY) || (!startX && !startY)) ? 'nwse' : 'nesw';
                }
                setFixCursor(dir + 'resize');
            },
            () => {
                setFixCursor(null);
                windowEvent.removeListener('mousemove', mouseMove, false);
                windowEvent.removeListener(
                'mouseup',
                    mouseUp,
            {capture: false, once: true}
                );
                resetAutoScroll();
            }
        );

        if (props.mode) {
            overlay.setMode(props.mode);
        }

        overlay.setMarkerAction((props, overlay) => {
            const selection = props.cellProvider.getSelection(props.markerX, props.markerY, props.markerWidth, props.markerHeight);
            eCtxRef.current.setSelection(selection);
            requestAnimationFrame(() => {
                overlay.setMode('startPath');
            });
        });
    }, []);
    const size = props.cellProvider.getSize();

    const resetMarker = (type) => {
        setMarkerX(null);
        setMarkerY(null);
        setCursorHeight(1);
        setCursorWidth(1);
        if (type) {
            setCursorType(type);
        }
    };

    return (
        <div className="padded full-v">
            <Stack dir="x" full>
                <Stack dir="y">
                    <div><button disabled={markerX === null} onClick={resetMarker}>Clear</button></div>
                    <div><button onClick={() => {overlay.setMode('pick')}}>Pick</button></div>
                    <div><button onClick={() => {overlay.setMode('select', {type: 'rect'})}}>Select Rect</button></div>
                    <div><button onClick={() => {overlay.setMode('select', {type: 'rows'})}}>Select Rows</button></div>
                    <div><button onClick={() => {overlay.setMode('select', {type: 'columns'})}}>Select Columns</button></div>
                    <div><button onClick={() => {overlay.setMode('select', {type: 'column-gap'})}}>Select Column-Gap</button></div>
                    <div><button onClick={() => {overlay.setMode('select', {type: 'row-gap'})}}>Select Row-Gap</button></div>
                    <div><button onClick={() => {eContext.undoAction()}} disabled={!eContext.hasPast()}>Undo</button></div>
                    <div><button onClick={() => {eContext.redoAction()}} disabled={!eContext.hasFuture()}>Redo</button></div>
                </Stack>

                <div>
                    PosX: <Int min={0} max={props.cellProvider.getWidth() - width} value={posX} set={setPosX} buttons />
                    PosY: <Int min={0} max={props.cellProvider.getHeight() - height} value={posY} set={setPosY} buttons />
                    Zoom: <Int min={1} max={5} value={zoom} set={setZoom} buttons />
                    Border: <Int min={0} max={5} value={border} set={setBorder} buttons />
                    <Checkbox name="rulers" value={rulers} set={setRulers} />
                    <button onClick={() => {eContext.redraw('boom')}}>Redraw</button>
                </div>

                <div className="flex items-centered align-center">
                    <FlexCellProviderScrollRaster
                        auto
                        setWidth={setWidth}
                        setHeight={setHeight}
                        setPosX={setPosX}
                        setPosY={setPosY}
                        width={width}
                        height={height}
                        posX={posX}
                        posY={posY}
                        id="boom"
                        zoom={zoom}
                        border={border}
                        rulers={rulers}
                        cellProvider={props.cellProvider}>
                        <CursorArea
                            boundingRectRef={boundingRectRef}
                            cellProvider={props.cellProvider}
                            mouseDown={cursorMouseDown}
                            mouseUp={cursorMouseUp}
                            mouseTrack={cursorMouseTrack}
                            highlight={cursorHighlight}
                            cursorWidth={cursorWidth}
                            cursorHeight={cursorHeight}
                            cursorType={cursorType}
                            doubleClick={cursorDoubleClick}
                            width={width}
                            height={height}
                            zoom={zoom}
                            border={border}
                            size={size}
                            posX={posX}
                            posY={posY}
                        />
                        <MarkerArea
                            setPosX={setPosX}
                            setPosY={setPosY}
                            setMarkerWidth={setMarkerWidth}
                            setMarkerHeight={setMarkerHeight}
                            setMarkerX={setMarkerX}
                            setMarkerY={setMarkerY}
                            cellProvider={props.cellProvider}
                            width={width}
                            height={height}
                            zoom={zoom}
                            border={border}
                            size={size}
                            posX={posX}
                            posY={posY}
                            markerX={markerX}
                            markerY={markerY}
                            markerType={markerType}
                            markerWidth={markerWidth}
                            markerHeight={markerHeight}
                            move={(e) => {
                                overlay.setMode('markerMove', {event: e})
                            }}
                            resize={(event, axis, startX, startY) => {
                                overlay.setMode('markerResize', {event, startX, startY, axis});
                            }}
                        />
                        <MouseOverlay active={fixCursor !== null} cursor={fixCursor} />
                    </FlexCellProviderScrollRaster>
                </div>
            </Stack>
        </div>
    );
}

export {
    Raster,
    CellMarker,
    RasterCanvas,
    EditorContext,
    EditorCtx,
    BasicRasterView
}