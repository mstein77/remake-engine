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
    MouseOverlay,
    d
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
        const cellPlusBorderSize = props.cellSize + props.border;

        ctx.clearRect(0, 0, props.width, props.height);
        ctx.fillStyle = context.contentTextColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(width - border, 0, 1, props.height);
        const dist = Math.ceil((fontSize + 2 * padding) / cellPlusBorderSize);
        for (let i = 0; i < props.max; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < props.max) {
                    const text = '' + (props.start + i);
                    const txtWidth = ctx.measureText(text).width;
                    ctx.fillText(
                        text,
                        width - padding - txtWidth,
                        cellPlusBorderSize * i + fontSize + (padding >> 1)
                    );
                }
                ctx.fillRect(width - fullWidth, cellPlusBorderSize * i, fullWidth, border);
            } else {
                ctx.fillRect(width - smallWidth, cellPlusBorderSize * i, smallWidth, border);
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
    const fullWidth = 13;
    const smallWidth = 3;
    const border = 1;
    const padding = 10;

    const drawRuler = (ctx) => {
        const charWidth = fontWidth;
        const cellPlusBorderSize =  props.cellSize + props.border;


        ctx.clearRect(0, 0, props.width, height);
        ctx.fillStyle = context.contentTextColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(0, height - border, props.width, border);
        const dist = Math.ceil((props.digits * charWidth + 2 * padding) / cellPlusBorderSize);

        for (let i = 0; i < props.max; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < props.max) {
                    ctx.fillText('' + (props.start + i), cellPlusBorderSize * i + padding, fontSize);
                }
                ctx.fillRect(cellPlusBorderSize * i, height - fullWidth, border, fullWidth);
            } else {
                ctx.fillRect(cellPlusBorderSize * i, height - smallWidth, border, smallWidth);
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

    const isGap = markerType.endsWith('gap');

    const maxMarkerX = props.markerX + props.markerWidth - 1;
    const maxMarkerY = props.markerY + props.markerHeight - 1;
    let maxPosX = props.posX + props.width;
    let maxPosY = props.posY + props.height;
    if (!isGap) {
        maxPosX--;
        maxPosY--;
    }
    const visibleX = !checkX || (props.posX <= maxMarkerX && maxPosX >= props.markerX);
    const visibleY = !checkY || (props.posY <= maxMarkerY && maxPosY >= props.markerY);

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

        marker = <CellMarker
            blink
            mouseDown={onClick}
            matrix={props.matrix}
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

    const adjustPosX = isGap ? cellSize >> 1 : 0;
    let maxPosX = props.width;
    const adjustPosY = isGap ? cellSize >> 1 : 0;
    let maxPosY = props.height;
    if (isGap) {
        maxPosX++;
        maxPosY++;
    }

    const getOffsetPos = (e) => {
        const rect = divRef.current.getBoundingClientRect();
        let posX = Math.floor((e.clientX - rect.x + adjustPosX)/cellPlusBorderSize);
        let reset = (posX < 0 || posX >= maxPosX);
        let posY = Math.floor((e.clientY - rect.y + adjustPosY)/cellPlusBorderSize);
        reset = reset || (posY < 0 || posY >= maxPosY);

        if (reset) {
            return false;
        }
        if (markerType.startsWith('column')) {
            posY = 0;
        } else if (markerType.startsWith('row')) {
            posX = 0;
        }
        return {
            x: posX,
            y: posY
        };
    };

    const onMouseMove = (e) => {
        if (!props.fixed) {
            const offset = getOffsetPos(e);
            if (offset === false) {
                setOffX(null);
                setOffY(null);
            } else if (offX !== offset.x || offY !== offset.y) {
                setOffX(offset.x);
                setOffY(offset.y);
                if (props.mouseTrack) {
                    props.mouseTrack(props.posX + offset.x, props.posY + offset.y);
                }
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

/**
 *    R A S T E R - C o m p o n e n t s
 */

const EditorContext = React.createContext();

/**
 * RasterCanvas
 * ---------------------------------------------------------------
 *   Creates a canvas and draws a raster matching the cell props
 *   Returns the canvas as reference
 *
 * Props:
 *   - cellSize
 *   - border
 *   - width
 *   - height
 *
 * Context:
 *   - bgColor
 *   - bgOpacity
 *   - contentTextColor
 *
 * Out:
 *   - canvasRef
 */
const RasterCanvas = React.memo(React.forwardRef((props, canvasRef) => {
    const context = useContext(CssContext);
    const canvasElemRef = useRef(null);

    const cellPlusBorderSize = props.cellSize + props.border;
    const canvasWidth = props.border + props.width * cellPlusBorderSize;
    const canvasHeight = props.border + props.height * cellPlusBorderSize;

    useEffect(() => {
        if (canvasRef.current === null) {
            canvasRef.current = {
                elem: canvasElemRef.current,
                ctx: canvasElemRef.current.getContext('2d')
            };
        }
        const ctx = canvasRef.current.ctx;
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
    });

    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');

    return (
        <div style={{width: canvasWidth, height: canvasHeight}} className="checkbg">
            <div style={{backgroundColor: bgColor}}>
                <canvas ref={canvasElemRef} width={canvasWidth} height={canvasHeight} />
            </div>
        </div>
    );
}));

/**
 * CellRaster
 * ---------------------------------------------------------------
 *   Creates a canvas with a raster for the given cells matrix and
 *   uses the given cell render method for the matrix values
 *
 * Props:
 *   - cells
 *   - render
 *   - cellSize
 *   - border
 *
 */
function CellRaster(props) {
    const canvasRef = useRef(null);
    const height = props.cells.length;
    const width = (height === 0) ? 0 : props.cells[0].length;
    const {cellSize, border} = props;
    const rasterProps = {cellSize, width, height, border, ref: canvasRef};
    const cellPlusBorderSize = cellSize + border;

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        console.log('drawCells');
        const ctx = canvasRef.current.ctx;
        let pos = border;
        for (let row of props.cells) {
            for (let x = 0; x < width; x++) {
                if (props.render)
                props.render(ctx, border + x * cellPlusBorderSize, pos, row[x]);
            }
            pos += cellPlusBorderSize;
        }
    });

    if (height === 0 || width === 0) {
        return '';
    }

    return (
        <RasterCanvas {...rasterProps} />
    );
}

/**
 * CellProviderRaster
 * ----------------------------------------------------------
 *   Creates a canvas with raster based on the specified rect
 *   in the cellProvider and the zoom factor given in the props.
 *   Registers an update trigger method in the editor context
 *   when an editor id is given
 *
 * Props:
 *   - cellProvider
 *   - posX
 *   - posY
 *   - width
 *   - height
 *   - zoom
 *   - editorId
 *   - TODO: renderMode / renderCaching / renderBitmap
 *
 * Context:
 *   - addRedraw
 *
 * Out:
 *   - update() in editorContext
 */
const CellProviderRaster = React.memo((props) => {
    const eContext = useContext(EditorContext);
    const [update, setUpdate] = useState(false);
    const mounted = useMounted();
    const ready = useReadyCellProvider(props.cellProvider, mounted);
    const renderRef = useRef(null);
    const propsRef = useRef(null);
    const size = props.cellProvider.getSize();
    const cellSize = size * props.zoom;
    propsRef.current = {
        update: update,
        zoom: props.zoom,
        cellSize
    };

    if (!renderRef.current) {
        const type = props.cellProvider.getCellType();
        switch (type) {
            case 'bitmap2':
                renderRef.current =
                    (ctx, x, y, value) => {
                        const img = props.cellProvider.getBitmapForValue2(value, propsRef.current.zoom);
                        if (img) {
                        //    ctx.putImageData(img, x, y);
                        }
                    };
                break;

            case 'bitmap':
                renderRef.current =
                    (ctx, x, y, value) => {
                        const img = props.cellProvider.getBitmapForValue(value, propsRef.current.zoom);
                        if (img) {
                            ctx.clearRect(x, y, propsRef.current.cellSize, propsRef.current.cellSize);
                            ctx.drawImage(img, x, y);
                        }
                    };
                break;


            case 'color':
                renderRef.current =
                    (ctx, x, y, value) => {
                        ctx.fillStyle = value;
                        ctx.fillRect(x, y, propsRef.current.cellSize, propsRef.current.cellSize);
                    };
                break;

            default:
                console.error('Unknown cell type', type);
                break;
        }
    }

    useEffect(() => {
        if (props.editorId) {
            eContext.addRedraw(props.editorId, () => {
                setUpdate(!propsRef.current.update);
            });
        }
    }, []);

    if (!ready) {
        return ''
    }
    const cells = props.cellProvider.getSelection(props.posX, props.posY, props.width, props.height).getCells();
    return (
        <CellRaster cellSize={propsRef.current.cellSize} cells={cells} border={props.border} render={renderRef.current} />
    );
});

/**
 * FlexCellProviderRaster
 * ----------------------------------------------------------
 *   Creates an absolute positioned canvas with a raster and cells
 *   from the view of the given cellProvider which uses as much of
 *   the available width and height as possible in the auto mode.
 *   Registers a resize observer which will adjust the raster on size changes.
 *   Can also display rulers on both axis with the current position
 *   of the view
 *
 * Props:
 *   - cellProvider
 *   - posX
 *   - posY
 *   - width
 *   - height
 *   - zoom
 *   - rulers
 *   - editorId
 *   - children
 *   - TODO: renderMode / renderCaching?
 *
 * Context
 */
function FlexCellProviderRaster(props) {
    const divRef = useRef(null);
    const observerRef = useRef(null);
    const propsRef = useRef(null);

    const rulerSpaceX = props.rulers ? 30 : 0;
    const rulerSpaceY = props.rulers ? 20 : 0;

    const size = props.cellProvider.getSize();
    const [cellSize, cellPlusBorderSize, rasterWidth, rasterHeight] = useRasterDim({...props, size});

    propsRef.current = {...props, rulerSpaceX, rulerSpaceY, cellPlusBorderSize, rasterWidth, rasterHeight};

    // prevent rect position outside with cells outside of cellProvider after zoom level change
    const maxColumns = props.cellProvider.getWidth();
    const maxRows = props.cellProvider.getHeight();
    if (props.setPosX && props.posX + props.width >= maxColumns) {
        props.setPosX(maxColumns - Math.min(props.width, maxColumns));
    }
    if (props.setPosY && props.posY + props.height >= maxRows) {
        props.setPosY(maxRows - Math.min(props.height, maxRows));
    }

    const checkSize = () => {
        const props = propsRef.current;
        const rect = divRef.current.parentNode.getBoundingClientRect();
        const spaceX = rect.width - (props.rulers ? props.rulerSpaceX : 0) - props.border;
        const spaceY = rect.height - (props.rulers ? props.rulerSpaceY : 0) - props.border;

        const maxWidth = props.cellProvider.hasAutoWidth() ? props.cellProvider.getMaxIndex() : props.cellProvider.getWidth();
        const newWidth = Math.min(Math.floor(spaceX / props.cellPlusBorderSize), maxWidth);

        const maxHeight = props.cellProvider.hasAutoWidth() ? props.cellProvider.getMaxIndex() : props.cellProvider.getHeight();
        const newHeight = Math.min(Math.floor(spaceY / props.cellPlusBorderSize), maxHeight);

        const changedWidth = props.width !== newWidth;
        const changedHeight = props.height !== newHeight;

        if (!changedWidth && !changedHeight) {
            return;
        }

        if (changedWidth) {
            if (props.cellProvider.hasAutoWidth()) {
                props.cellProvider.setWidth(newWidth);
            }
            props.setWidth(newWidth);
        }
        if (changedHeight) {
            props.setHeight(newHeight);
        }
    };

    useEffect(() => {
        if (props.auto) {
            const observer = new ResizeObserver(entries => {
                checkSize();
            });
            observerRef.current = observer;
            observer.observe(divRef.current.parentNode);
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
        editorId: props.editorId
    };

    let topRuler = '';
    let leftRuler = '';

    if (props.rulers) {
        const {width, posX, posY, zoom, border, height} = props;
        const rulerProps = {width, posX, border, cellSize: size * zoom};
        const hProps = {...rulerProps, width: rasterWidth, height: rulerSpaceY, max: width, start: posX};
        topRuler =
            <HRuler
                digits={('' + props.cellProvider.getWidth()).length}
                {...hProps}
            />;
        const vProps = {...rulerProps, width: rulerSpaceX, height: rasterHeight, max: height, start: posY};
        leftRuler =
            <VRuler
                digits={('' + props.cellProvider.getHeight()).length}
                {...vProps}
            />;
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

/**
 *
 */
function FlexCellProviderScrollRaster(props) {
    const context = useContext(CssContext);
    const style = {
        display: 'grid',
        gridTemplateColumns: 'auto',
        gridRowGap: context.defaultPadding,
        gridColumnGap: context.defaultPadding
    };

    const cellsWidth = props.cellProvider.getWidth();
    const cellsHeight = props.cellProvider.getHeight();
    const maxPosX = cellsWidth - props.width;
    const maxPosY = cellsHeight - props.height;
    const sensitivity = 0.25;

    const onWheel = (e) => {
        let deltaX = Math.round(e.deltaX * sensitivity);
        let deltaY = Math.round(e.deltaY * sensitivity);

        const newPosX = Math.min(Math.max(props.posX + deltaX, 0), maxPosX);
        const newPosY = Math.min(Math.max(props.posY + deltaY, 0), maxPosY);
        if (newPosX !== props.posX) {
            props.setPosX(newPosX);
        }
        if (newPosY !== props.posY) {
            props.setPosY(newPosY);
        }
        e.stopPropagation();
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
        secondCells.push(<div style={{height: 21}} key={3}><Scrollbar auto set={props.setPosX} pos={props.posX} page={props.width} max={props.cellProvider.getWidth()} /></div>);
        style.gridTemplateRows = 'auto 21px';
        if (hasScrollingY) {
            secondCells.push(<div key={4}></div>);
        }
    }

    return (
        <div style={style} className="full-v">
            {firstCells}
            {secondCells}
        </div>

    );
}

function BaseCellProviderIndexRaster(props) {
    const [border, setBorder] = useState(1);
    const [zoom, setZoom] = useState(2);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(5);
    const [rulers, setRulers] = useState(true);
    const [cursorHighlight, setCursorHighlight] = useState(false);
    const [cursorFixed, setCursorFixed] = useState(false);
    const boundingRectRef = useRef(null);
    const [active, setActive] = useState(false);
    const windowEvent = useWindowEventManager();

    return (
        <div className="full-v padded">
            <FlexCellProviderScrollRaster
                cellProvider={props.cellProvider}
                auto={true}
                posX={posX}
                setPosX={setPosX}
                posY={posY}
                border={border}
                setPosY={setPosY}
                width={width}
                setWidth={setWidth}
                height={height}
                setHeight={setHeight}
                zoom={zoom}
                rulers={rulers}
                editorId={props.editorId}>
                <CursorArea
                    boundingRectRef={boundingRectRef}
                    cellProvider={props.cellProvider}
                    mouseDown={(e, x, y) => {
                        setCursorHighlight(true);
                        setCursorFixed(true);
                        console.log('PICK', props.cellProvider.getRect(x, y, 1, 1)[0][0]);
                        windowEvent.addListener(
                            'mouseup',
                            (e) => {
                                setCursorFixed(false);
                                setCursorHighlight(false);
                            },
                            {capture: false, once: true}
                        );
                    }}
                    highlight={cursorHighlight}
                    cursorWidth={1}
                    cursorHeight={1}
                    cursorType="rect"
                    matrix={null}
                    width={width}
                    height={height}
                    zoom={zoom}
                    border={border}
                    fixed={cursorFixed}
                    size={props.cellProvider.getSize()}
                    posX={posX}
                    posY={posY}
                />
            </FlexCellProviderScrollRaster>
            <MouseOverlay cursor="pointer" active={active} />
        </div>
    );
}

/**
 *
 */
function RasterOverlays(props) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const propsRef = useRef(null);
    propsRef.current = props;

    const [cursorType, setCursorType] = useState('rect');
    const [cursorWidth, setCursorWidth] = useState(1);
    const [cursorHeight, setCursorHeight] = useState(1);
    const [cursorMouseDown, setCursorMouseDown] = useState(null);
    const [cursorMouseUp, setCursorMouseUp] = useState(null);
    const [cursorDoubleClick, setCursorDoubleClick] = useState(null);
    const [cursorHighlight, setCursorHighlight] = useState(false);
    const [cursorMouseTrack, setCursorMouseTrack] = useState(null);
    const [cursorMatrix, setCursorMatrix] = useState(null);
    const [fixCursor, setFixCursor] = useState(null);

    const cursorRef = useRef(null);
    let trackX = true;
    let trackY = true;
    if (cursorType !== 'rect') {
        if (cursorType.startsWith('column')) {
            trackY = false;
        } else if (cursorType.startsWith('row')) {
            trackX = false;
        }
    }
    cursorRef.current = {
        cursorType, cursorWidth, cursorHeight, trackX, trackY,
        axis: '' + (trackX ? 'x' : '') + (trackY ? 'y' : '')
    };

    const windowEvent = useWindowEventManager();
    const boundingRectRef = useRef(null);
    const autoScrollRef = useRef({id : null, x: null, y: null, marker: false});

    useEffect(() => {
        eContext.setSelection(props.cellProvider.getEmptySelection());
    }, []);

    const overlayRef = useRef({
        modes: {},
        modeId: null,
        cleaned: true,
        frameId: null,
        markerAction: null,
        markerActions: {},
        canDoActions: {},
        addMarkerAction: function (id, action, canDo = () => {return true}) {
            this.markerActions[id] = action;
            this.canDoActions[id] = canDo;
        },
        doMarkerAction: function (id, data) {
            if (this.markerActions[id] && this.canDoMarkerAction(id)) {
                d('MarkerAction', id, data);
                this.markerActions[id](propsRef.current, data);
            }
        },
        canDoMarkerAction: function (id) {
            if (this.canDoActions[id] === undefined) {
                return false;
            }
            return this.canDoActions[id](propsRef.current);
        },
        setMarkerAction: function (action) {
            this.markerAction = action;
        },
        triggerMarkerAction: function() {
            if (this.markerAction !== null) {
                return this.markerAction(propsRef.current, this);
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
            d('setMode', modeId, data);
            if (!this.modes[modeId]) {
                throw Error('Unknown mode id "' + modeId + '"');
            }
            if (this.frameId) {
                cancelAnimationFrame(this.frameId);
            }
            this.frameId = requestAnimationFrame(() => {
                this.cleanUp();
                this.modes[modeId].init(data);
                this.modeId = modeId;
                this.cleaned = false;
                this.frameId = null;
                propsRef.current.setStateUpdate(!propsRef.current.stateUpdate);
            });
        }
    });
    const overlay = overlayRef.current;
    props.overlayRef.current = overlay;

    useEffect(() => {
        const autoScroll = autoScrollRef.current;

        overlay.addMode = overlay.addMode.bind(overlay);
        overlay.setMode = overlay.setMode.bind(overlay);
        overlay.cleanUp = overlay.cleanUp.bind(overlay);
        overlay.setMarkerAction = overlay.setMarkerAction.bind(overlay);
        overlay.doMarkerAction = overlay.doMarkerAction.bind(overlay);
        overlay.canDoMarkerAction = overlay.canDoMarkerAction.bind(overlay);
        overlay.addMarkerAction = overlay.addMarkerAction.bind(overlay);
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
                propsRef.current.setMarkerX(null);
                propsRef.current.setMarkerHeight(1);
                propsRef.current.setMarkerWidth(1);
                setCursorHighlight(false);
                setCursorMouseDown(() => (e, x, y) => {
                    eCtxRef.current.setSelection(props.cellProvider.getSelection(x, y, 1, 1));
                    propsRef.current.setMarkerX(x);
                    propsRef.current.setMarkerY(y);
                    propsRef.current.setMarkerType('rect');
                    windowEvent.addListener('mouseup', mouseUpPickAgain, {capture: false, once: true});
                    setFixCursor('pointer');
                });
                setCursorDoubleClick(() => (e, x, y) => {
                    overlay.setMode('startPath');
                });
            },
            () => {
                windowEvent.removeListener('mouseup', mouseUpPickAgain, {capture: false, once: true})
                propsRef.current.setMarkerX(null);
                propsRef.current.setMarkerY(null);
                setCursorMouseDown(null);
                setFixCursor(null);
                setCursorDoubleClick(null);
            }
        );
        let matrix = null;
        overlay.addMode(
            'select',
            (data) => {
                const markerType = data.type ? data.type : 'rect';
                setCursorType(markerType);
                const markerWidth = data.width ? data.width : 1;
                setCursorWidth(markerWidth);
                const markerHeight = data.height ? data.height : 1;
                setCursorHeight(markerHeight);
                if (data.all) {
                    setState({markerX: 0, markerY: 0, markerWidth: props.cellProvider.getWidth(), markerHeight: props.cellProvider.getHeight()});
                } else if (markerType !== propsRef.current.markerType) {
                    setState({markerX: null, markerY: null});
                }

                // TODO fix, spacing
                setCursorMouseDown(() => (e, markerX, markerY) => {
                    if (!cursorRef.current.trackX) {
                        markerX = 0;
                    }
                    if (!cursorRef.current.trackY) {
                        markerY = 0;
                    }
                    setState({
                        markerType,
                        markerX,
                        markerY,
                        markerWidth,
                        markerHeight
                    });
                    const event = {clientX: e.clientX, clientY: e.clientY};
                    if (markerType.endsWith('gap')) {
                        overlay.setMode('markerMove', {type: markerType, event});
                    } else {
                        overlay.setMode('markerResize', {
                            event,
                            axis: cursorRef.current.axis,
                            startX: false,
                            startY: false
                        });
                    }
                });
            },
            () => {
                setCursorMouseDown(null);
                setCursorMouseTrack(null);
            }
        );
        overlay.addMode(
            'startPath',
            (data) => {
                const selection = eCtxRef.current.selection;
                setCursorMatrix(matrix);
                setCursorType(selection.getType());
                setCursorWidth(selection.getWidth());
                setCursorHeight(selection.getHeight());
                const markerType = propsRef.current.markerType;
                propsRef.current.setMarkerX(null);
                propsRef.current.setMarkerY(null);

                if (markerType === 'rows' || markerType === 'columns') {
                    const isRows = markerType === 'rows';
                    setCursorMouseTrack(() => (x, y) => {
                        matrix = eCtxRef.current.selection.getMatchMatrix(
                            props.cellProvider.getEmptyCell(),
                            propsRef.current[isRows ? 'posX' : 'posY'],
                            propsRef.current[isRows ? 'width' : 'height']
                        );
                        setCursorMatrix(matrix);
                    });
                } else if (markerType === 'rect') {
                    matrix = selection.getMatchMatrix(props.cellProvider.getEmptyCell());
                }
                setCursorMatrix(matrix);
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
                setCursorMatrix(null);
                setCursorMouseTrack(null);
            }
        );

        let mouseUpSavePath;
        overlay.addMode(
            'writePath',
            (data) => {
                setCursorMatrix(matrix);
                const path = {
                    new: {},
                    old: {}
                };
                const track = (x, y) => {
                    let segment;
                    const selection = eCtxRef.current.selection;
                    if (selection.isRows()) {
                        x = 0;
                    } else if (selection.isColumns()) {
                        y = 0;
                    }
                    if (data.clear) {
                        segment = props.cellProvider.writeSelection(x, y, selection, props.cellProvider.getEmptyCell(), true);
                    } else {
                        segment = props.cellProvider.writeSelection(x, y, selection, null,  propsRef.current.writeTransparent);
                    }
                    Object.assign(path.new, segment.new);
                    for(let key in segment.old) {
                        if (path.old[key] === undefined) {
                            path.old[key] = segment.old[key];
                        }
                    }
                    eCtxRef.current.redraw(props.editorId);
                };
                setCursorHighlight(true);
                track(data.start.x, data.start.y);

                mouseUpSavePath = (e, x, y) => {
                    const doPath = path.new;
                    const undoPath = path.old;
                    const doAction = () => {
                        props.cellProvider.writePath(doPath);
                        eCtxRef.current.redraw(props.editorId);
                    };
                    const undoAction = () => {
                        props.cellProvider.writePath(undoPath);
                        eCtxRef.current.redraw(props.editorId);
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
                setCursorMatrix(null);
            }
        );

        // # Marker Modes #
        const setState = (change, where = '?') => {
            const props = propsRef.current;
            if (change.markerType !== undefined && change.markerType !== props.markerType) {
                console.log(where, '-> markerType', change.markerType, props.markerType);
                props.setMarkerType(change.markerType);
            }
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
            const isGap = props.markerType.endsWith('gap');
            let maxX = props.cellProvider.getWidth();
            let maxY = props.cellProvider.getHeight();
            if (isGap) {
                maxX++;
                maxY++;
            }
            const change = {};
            if (autoScroll.x && !(autoScroll.marker && !autoScroll.marker.resizeX)) {
                const maxPosX = maxX - props.width;
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
                            maxX - props.markerWidth
                        );
                }
                change.posX = posX;
            }

            if (autoScroll.y && !(autoScroll.marker && !autoScroll.marker.resizeY)) {
                const maxPosY = maxY - props.height;
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
                            maxY - props.markerHeight
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
            const isGap = props.markerType.endsWith('gap');
            let maxX = props.width;
            let maxY = props.height;
            if (isGap) {
                maxX++;
                maxY++;
            }
            const scrollX = autoScrollMarker === null || autoScrollMarker.resizeX;
            if (scrollX && newRasterPos.rawX < 0 || newRasterPos.rawX > maxX) {
                autoScroll.x = newRasterPos.rawX < 0 ? newRasterPos.rawX : newRasterPos.rawX - maxX;
            } else {
                autoScroll.x = null;
            }
            const scrollY = autoScrollMarker === null || autoScrollMarker.resizeY;
            if (scrollY && newRasterPos.rawY < 0 || newRasterPos.rawY > maxY) {
                autoScroll.y = newRasterPos.rawY < 0 ? newRasterPos.rawY : newRasterPos.rawY - maxY;
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

        const getRasterPosFromClient = (client, outside = false, isGap = false) => {
            if (!boundingRectRef.current) {
                return null;
            }
            const rect = boundingRectRef.current;

            const adjustPos = isGap ? rect.cellSize >> 1 : 0;
            const rasterPos = {
                x: Math.floor(Math.round(client.x - rect.left + adjustPos)/rect.cellSize),
                y: Math.floor(Math.round(client.y - rect.top + adjustPos)/rect.cellSize),
            };
            let maxX = propsRef.current.width;
            let maxY = propsRef.current.height;
            if (!isGap) {
                maxX++;
                maxY++;
            }
            rasterPos.rawX = rasterPos.x;
            rasterPos.rawY = rasterPos.y;
            if (!outside) {
                if (rasterPos.x < 0) {
                    rasterPos.x = 0;
                } else if (rasterPos.x > maxX) {
                    rasterPos.x = maxX;
                }
                if (rasterPos.y < 0) {
                    rasterPos.y = 0;
                } else if (rasterPos.y > maxY) {
                    rasterPos.y = maxY;
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
                const props = propsRef.current;
                const isGap = props.markerType.endsWith('gap');

                lastRasterPos = getRasterPosFromEvent(data.event, false, isGap);

                if (!cursorRef.current.trackX) {
                    lastRasterPos.x = 0;
                }
                if (!cursorRef.current.trackY) {
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
                    if (!cursorRef.current.trackX) {
                        newRasterPos.x = 0;
                    }
                    if (!cursorRef.current.trackY) {
                        newRasterPos.y = 0;
                    }
                    const xStart = newRasterPos.x - offPos.x;
                    const yStart = newRasterPos.y - offPos.y;

                    let markerPosX = props.posX + xStart;
                    let markerPosY = props.posY + yStart;

                    const hasChangedX = trackX && newRasterPos.x !== lastRasterPos.x;
                    const hasChangedY = trackY && newRasterPos.y !== lastRasterPos.y;

                    let maxPosX = props.cellProvider.getWidth();
                    let maxPosY = props.cellProvider.getHeight();
                    if (isGap) {
                        maxPosX++;
                        maxPosY++;
                    }

                    updateAutoScroll(newRasterPos);

                    if (hasChangedX || hasChangedY) {
                        const change = {};
                        if (hasChangedX) {
                            if (markerPosX < 0) {
                                markerPosX = 0;
                            } else if (markerPosX + props.markerWidth > maxPosX) {
                                markerPosX = maxPosX - props.markerWidth;
                            }
                            lastRasterPos.x = newRasterPos.x;
                            change.markerX = markerPosX;
                        }
                        if (hasChangedY) {
                            if (markerPosY < 0) {
                                markerPosY = 0;
                            } else if (markerPosY + props.markerHeight > maxPosY) {
                                markerPosY = maxPosY - props.markerHeight;
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

                const clickStartTime = Date.now();
                mouseUp = (e) => {
                    checkWithLastRasterPos(e);
                    e.stopPropagation();
                    e.preventDefault();
                    const clickEndTime = Date.now();
                    let doSelect = true;
                    if (clickEndTime - clickStartTime < 250) {
                        if (clickStartTime - lastMoveClick < 1000) {
                            doSelect = overlay.triggerMarkerAction();
                            lastMoveClick -= 1000;
                        } else {
                            lastMoveClick = clickStartTime;
                        }
                    }
                    if (doSelect) {
                        overlay.setMode('select', {type: propsRef.current.markerType});
                    }
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
                const startX = data.startX;
                const startY = data.startY;

                const axis = data.axis;
                const props = propsRef.current;

                const e = data.event;

                const anchorPos = {
                    x: props.markerX + (!startX ? 0 : props.markerWidth - 1),
                    y: props.markerY + (!startY ? 0 : props.markerHeight - 1)
                };
                const resizeX = cursorRef.current.trackX && axis.indexOf('x') !== -1;
                const resizeY = cursorRef.current.trackY && axis.indexOf('y') !== -1;

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

                const clickStartTime = Date.now();
                mouseUp = (e) => {
                    checkWithLastRasterPos(e);
                    const clickEndTime = Date.now();
                    let doSelect = true;
                    if (clickEndTime - clickStartTime < 250) {
                        if (clickStartTime - lastResizeClick < 1000) {
                            doSelect = overlay.triggerMarkerAction();
                            lastResizeClick -= 1000;
                        } else {
                            lastResizeClick = clickStartTime;
                        }
                    }
                    if (doSelect) {
                        overlay.setMode('select', {type: propsRef.current.markerType});
                    }
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

        overlay.addMarkerAction(
            'clear',
            (props) => {
                const markerX = props.markerX;
                const markerY = props.markerY;
                const markerType = props.markerType;
                const width = markerType === 'rows' ? props.cellProvider.getWidth() : props.markerWidth;
                const height = markerType === 'columns' ? props.cellProvider.getHeight() : props.markerHeight;
                const undoSelection = props.cellProvider.getSelection(markerX, markerY, width, height);
                const doAction = () => {
                    props.cellProvider.fillRect(
                        markerX,
                        markerY,
                        width,
                        height,
                        props.cellProvider.getEmptyCell()
                    );
                    eCtxRef.current.redraw(props.editorId);
                };
                const undoAction = () => {
                    props.cellProvider.fillRectWithSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        undoSelection
                    );
                    eCtxRef.current.redraw(props.editorId);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'delete',
            (props) => {
                const markerType = props.markerType;
                const markerY = props.markerY;
                const markerX = props.markerX;
                const markerWidth = props.markerWidth;
                const markerHeight = props.markerHeight;
                const undoSelection = props.cellProvider.getRawSelection(0, 0, props.cellProvider.getWidth(), props.cellProvider.getHeight());
                const doAction = () => {
                    if (markerType === 'rows') {
                        props.cellProvider.deleteRows(markerY, markerHeight);
                    } else {
                        props.cellProvider.deleteColumns(markerX, markerWidth);
                    }
                    props.setPosX(props.posX);
                };
                const undoAction = () => {
                    props.cellProvider.importRawSelection(undoSelection);
                    props.setPosX(props.posX);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && (props.markerType === 'rows' || props.markerType === 'columns'));
            }
        );

        overlay.addMarkerAction(
            'copy',
            (props) => {
                const rect = props.cellProvider.getRect(
                    props.markerX,
                    props.markerY,
                    props.markerType === 'rows' ? props.cellProvider.getWidth() : props.markerWidth,
                    props.markerType === 'columns' ? props.cellProvider.getHeight() : props.markerHeight
                );
                eCtxRef.current.setSelection(new CellSelection(props.markerType, rect));
                overlay.setMode('startPath');
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'fill',
            (props) => {
                const markerX = props.markerX;
                const markerY = props.markerY;
                const width = props.markerType === 'rows' ? props.cellProvider.getWidth() : props.markerWidth;
                const height = props.markerType === 'columns' ? props.cellProvider.getHeight() : props.markerHeight;
                const doSelection = new CellSelection(props.markerType, eCtxRef.current.selection.getCells());
                const undoSelection = props.cellProvider.getSelection(
                    markerX,
                    markerY,
                    width,
                    height
                );
                const doAction = () => {
                    props.cellProvider.fillRectWithSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        doSelection
                    );
                    eCtxRef.current.redraw(props.editorId);
                };
                const undoAction = () => {
                    props.cellProvider.fillRectWithSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        undoSelection
                    );
                    eCtxRef.current.redraw(props.editorId);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'crop',
            (props) => {
                const markerX = props.markerX;
                const markerY = props.markerY;
                const markerType = props.markerType;
                const oldWidth = props.cellProvider.getWidth();
                const oldHeight = props.cellProvider.getHeight();
                const markerWidth = markerType.startsWith('row') ? oldWidth : props.markerWidth;
                const markerHeight = markerType.startsWith('column') ? oldHeight : props.markerHeight;
                const undoSelection = props.cellProvider.getRawSelection(
                    0, 0, oldWidth, oldHeight
                );

                const doAction = () => {
                    props.cellProvider.reduceToRect(
                        markerX,
                        markerY,
                        markerWidth,
                        markerHeight
                    );
                    props.setPosX(0);
                    props.setPosY(0);
                };

                const undoAction = () => {
                    props.cellProvider.importRawSelection(undoSelection);
                    props.setPosX(props.posX);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'insert',
            (props, no) => {
                if (!no) {
                    no = 1;
                };
                const posY = props.posY;
                if (props.markerType === 'row-gap') {
                    const oldMarkerY = props.markerY;
                    const doAction = () => {
                        props.cellProvider.insertRowsAt(oldMarkerY, no);
                        props.setPosY(posY + 1);
                        props.setPosY(posY);
                    };
                    const undoAction = () => {
                        props.cellProvider.deleteRows(oldMarkerY, no);
                        eCtxRef.current.redraw(props.editorId);
                        props.setPosY(posY + 1);
                        props.setPosY(posY);
                    };
                    eCtxRef.current.doAction(doAction, undoAction);
                } else {
                    const oldMarkerX = props.markerX;
                    const doAction = () => {
                        props.cellProvider.insertColumnsAt(oldMarkerX, no);
                        props.setPosY(posY + 1);
                        props.setPosY(posY);
                    };
                    const undoAction = () => {
                        props.cellProvider.deleteColumns(oldMarkerX, no);
                        props.setPosY(posY + 1);
                        props.setPosY(posY);
                    };
                    eCtxRef.current.doAction(doAction, undoAction);
                }
            },
            (props) => {
                return (props.markerX !== null && props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'goto',
            (props) => {
                props.setPosX(props.markerX);
                props.setPosY(props.markerY);
            },
            (props) => {
                return (props.markerX !== null);
            }
        );

        overlay.addMarkerAction(
            'abort',
            (props) => {
                overlay.setMode('startPath');
            },
            (props) => {
                return (props.markerX !== null && props.markerType !== null);
            }
        );

        if (props.mode) {
            overlay.setMode(props.mode);
        }

        overlay.setMarkerAction((props, overlay) => {
            if (props.markerX === null) {
                return true;
            }
            switch(props.markerType) {
                case 'column-gap':
                case 'row-gap':
                    overlay.doMarkerAction('insert');
                    return true;

                case 'rows':
                case 'columns':
                case 'rect':
                    overlay.doMarkerAction('copy');
                    return false;
            }
            return true;
        });
    }, []);

    const size = props.cellProvider.getSize();

    return (
        <Fragment>
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
                matrix={props.writeTransparent ? null : cursorMatrix}
                width={props.width}
                height={props.height}
                zoom={props.zoom}
                border={props.border}
                size={size}
                posX={props.posX}
                posY={props.posY}
            />
            <MarkerArea
                setPosX={props.setPosX}
                setPosY={props.setPosY}
                setMarkerWidth={props.setMarkerWidth}
                setMarkerHeight={props.setMarkerHeight}
                setMarkerX={props.setMarkerX}
                setMarkerY={props.setMarkerY}
                cellProvider={props.cellProvider}
                width={props.width}
                height={props.height}
                zoom={props.zoom}
                border={props.border}
                size={size}
                posX={props.posX}
                posY={props.posY}
                markerX={props.markerX}
                markerY={props.markerY}
                markerType={props.markerType}
                markerWidth={props.markerWidth}
                markerHeight={props.markerHeight}
                move={(event) => {
                    overlay.setMode('markerMove', {event: {clientX: event.clientX, clientY: event.clientY}})
                }}
                resize={(event, axis, startX, startY) => {
                    overlay.setMode('markerResize', {event: {clientX: event.clientX, clientY: event.clientY}, startX, startY, axis});
                }}
            />
            <MouseOverlay active={fixCursor !== null} cursor={fixCursor} />
        </Fragment>
    );
}

/**
 *
 */
function RasterViewGrid(props) {
    const eContext = useContext(EditorContext);
    const addPage = 10;
    const {
        auto, mode, writeTransparent,
        setWidth, setHeight, setPosX, setPosY, width, height, posX, posY, zoom, border, rulers,
        setMarkerX, setMarkerY, markerX, markerY, setMarkerType, markerType, overlayRef, markerWidth,
        markerHeight, setMarkerWidth, setMarkerHeight, setStateUpdate, stateUpdate, editorId
    } = props;

    const updateDims = (newDims) => {
        if (newDims.posX !== undefined && newDims.posX !== posX) {
            setPosX(newDims.posX);
        }
        if (newDims.posY !== undefined && newDims.posY !== posY) {
            setPosY(newDims.posY);
        }
    };

    const addRows = (no, start) => {
        let added = null;
        let oldPosY = props.posY;
        let undoSelection = null;
        let min = Math.min(Math.abs(no), props.cellProvider.getHeight() - 1);

        const doAction = () => {
            if (no < 0) {
                undoSelection = props.cellProvider.getRawSelection(
                    0, start ? 0 : props.cellProvider.getHeight() - min,
                    props.cellProvider.getWidth(), min
                );
            }
            added = props.cellProvider.addRows(start, no);
            if (no < 0) {
                added *= -1;
            }
            const _posY = start ? 0 : Math.max(0, oldPosY + added);
            updateDims({posY: _posY, endY: !start});
        };

        const undoAction = () => {
            props.cellProvider.addRows(start, -added);
            if (undoSelection) {
                props.cellProvider.fillRectWithRawSelection(
                    0, start ? 0 : props.cellProvider.getHeight() + added,
                    props.cellProvider.getWidth(), -added,
                    undoSelection
                );
            }
            updateDims({posY: oldPosY, endY: !start});
        };
        eContext.doAction(doAction, undoAction);
    };

    const addColumns = (no, start) => {
        let added = null;
        let oldPosX = props.posX;
        let undoSelection = null;
        let min = Math.min(Math.abs(no), props.cellProvider.getWidth() - 1);

        const doAction = () => {
            if (no < 0) {
                undoSelection = props.cellProvider.getRawSelection(
                    start ? 0 : props.cellProvider.getWidth() - min, 0,
                    min, props.cellProvider.getHeight()
                );
            }
            added = props.cellProvider.addColumns(start, no);
            if (no < 0) {
                added *= -1;
            }
            const _posX = start ? 0 : Math.max(0, oldPosX + added);
            updateDims({posX: _posX, endX: !start});
        };

        const undoAction = () => {
            props.cellProvider.addColumns(start, -added);
            if (undoSelection) {
                props.cellProvider.fillRectWithRawSelection(
                    start ? 0 : props.cellProvider.getWidth() + added, 0,
                    -added, props.cellProvider.getHeight(),
                    undoSelection
                );
            }
            updateDims({posX: oldPosX, endX: !start});
        };

        eContext.doAction(doAction, undoAction);
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
            updateDims({});
        };
        const undoAction = () => {
            props.cellProvider.addRows(!start, -1);
            props.cellProvider.addRows(start, 1);
            props.cellProvider.writeSelection(
                0, start ? 0 : height - 1,
                undoSelection
            );
            updateDims({});
        };
        eContext.doAction(doAction, undoAction);
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
            updateDims({});
        };
        const undoAction = () => {
            props.cellProvider.addColumns(!start, -1);
            props.cellProvider.addColumns(start, 1);
            props.cellProvider.writeSelection(
                start ? 0 : width - 1, 0,
                undoSelection
            );
            updateDims({});
        };
        eContext.doAction(doAction, undoAction);
    };

    const getShiftButton = (start, vertical) => {
        if (!props.shift) {
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
        const callback = vertical ? addRows : addColumns;
        const pos = vertical ? props.posY : props.posX;
        const height = props.cellProvider.getHeight();
        const width = props.cellProvider.getWidth();
        const maxPos = vertical ? height - props.height : width - props.width;
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
                updateDims(target);
            };
        } else {
            btnJumpAttr.disabled = 'disabled';
            btnAdd1Attr.onClick = () => {
                callback(1, start);
            };
            btnAddPageAttr.onClick = () => {
                callback(addPage, start);
            };
            if (max === 1) {
                btnSub1Attr.disabled = 'disabled';
                btnSubPageAttr.disabled = 'disabled';
            } else {
                btnSub1Attr.onClick = () => {
                    callback(-1, start);
                };
                btnSubPageAttr.onClick = () => {
                    callback(-addPage, start);
                }
            }
        }
        const jumpBtn =  props.full ? '' : <button {...btnJumpAttr}><i style={jumpStyle} className={materialCls.join(' ')}>{jumpChar}</i></button>;

        const br = vertical ? '' : <br />;
        const shiftBr = props.shift ? br : '';
        return (<div>
            <button {...btnSubPageAttr}>--</button>{br}
            <button {...btnSub1Attr}>-</button>{br}
            {shiftBtn}{shiftBr}
            {jumpBtn}
            <button {...btnAdd1Attr}>+</button>{br}
            <button {...btnAddPageAttr}>++</button>
        </div>)
    };

    const getNavButton = (axis, startX, startY, rotate) => {
        const jumpChar = (startX ? 'first' : 'last') + '_page';
        const materialCls = ['material-icons md-18'];
        const endX = props.cellProvider.getWidth() - width;
        const endY = props.cellProvider.getHeight() - height;
        const hasX = axis.indexOf('x') !== -1;
        const hasY = axis.indexOf('y') !== -1;
        const btnAttr = {
            onClick: () => {
                if (hasX) {
                    setPosX(startX ? 0 : endX);
                }
                if (hasY) {
                    setPosY(startY ? 0 : endY);
                }
            }
        };

        let disabled = false;
        if (axis === 'xy') {
            disabled = (((startX && posX === 0) || (!startX && posX === endX)) && (
                ((startY && posY === 0) || (!startY && posY === endY))
            ));
        } else {
            if (axis === 'x') {
                disabled = ((startX && posX === 0) || (!startX && posX === endX));
            } else {
                disabled = ((startY && posY === 0) || (!startY && posY === endY));
            }
        }
        if (disabled) {
            btnAttr.disabled = 'disabled';
        }

        return (
            <button {...btnAttr}>
                <i className={materialCls.join(' ')} style={{transform: 'rotate(' + rotate + 'deg)'}}>{jumpChar}</i>
            </button>
        );
    };

    const gridCls = ['grid-3x3 full-v'];
    return (
        <div className={gridCls.join(' ')}>
            <div>{getNavButton('xy', true, true)}</div>
            <div>{getSizeButtons(true, true)}</div>
            <div>{getNavButton('xy',false, true)}</div>

            <div>
                <Stack dir="x" center full>
                    {getSizeButtons(true, false)}
                </Stack>
            </div>
            <div className="full-v padded">
                <FlexCellProviderScrollRaster
                    auto={auto}
                    setWidth={setWidth}
                    setHeight={setHeight}
                    setPosX={setPosX}
                    setPosY={setPosY}
                    width={width}
                    height={height}
                    posX={posX}
                    posY={posY}
                    editorId={props.editorId}
                    zoom={zoom}
                    border={border}
                    rulers={rulers}
                    cellProvider={props.cellProvider}>
                    <RasterOverlays
                        overlayRef={overlayRef}
                        setWidth={setWidth}
                        setHeight={setHeight}
                        setPosX={setPosX}
                        setPosY={setPosY}
                        width={width}
                        height={height}
                        posX={posX}
                        posY={posY}
                        editorId={props.editorId}
                        writeTransparent={writeTransparent}
                        stateUpdate={stateUpdate}
                        setStateUpdate={setStateUpdate}
                        mode={mode}
                        zoom={zoom}
                        border={border}
                        rulers={rulers}
                        markerX={markerX}
                        markerY={markerY}
                        markerWidth={markerWidth}
                        markerHeight={markerHeight}
                        markerType={markerType}
                        setMarkerX={setMarkerX}
                        setMarkerY={setMarkerY}
                        setMarkerWidth={setMarkerWidth}
                        setMarkerHeight={setMarkerHeight}
                        setMarkerType={setMarkerType}
                        cellProvider={props.cellProvider}
                    />
                </FlexCellProviderScrollRaster>
            </div>
            <div>
                <Stack dir="x" center full>
                    {getSizeButtons(false, false)}
                </Stack>
            </div>

            <div>{getNavButton('xy',true, false)}</div>
            <div>{getSizeButtons(false, true)}</div>
            <div>{getNavButton('xy',false, false)}</div>
        </div>
    );
}

/**
 *
 * @param props
 * @returns {*}
 * @constructor
 */
function BasicRasterView(props) {
    const eContext = useContext(EditorContext);

    const [border, setBorder] = useState(1);
    const [zoom, setZoom] = useState(2);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(5);
    const [rulers, setRulers] = useState(false);
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(1);
    const [markerHeight, setMarkerHeight] = useState(1);
    const [markerType, setMarkerType] = useState('rect');
    const [markerSpaceX, setMarkerSpaceX] = useState(0);
    const [markerSpaceY, setMarkerSpaceY] = useState(0);
    const [stateUpdate, setStateUpdate] = useState(false);
    const [writeTransparent, setWriteTransparent] = useState(false);
    const overlay = useRef(null);

    let markerActions = '';
    if (overlay.current) {
        markerActions =
            <Fragment>
                <div><button onClick={() => {overlay.current.doMarkerAction('goto')}} disabled={!overlay.current.canDoMarkerAction('goto')}>Goto</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('clear')}} disabled={!overlay.current.canDoMarkerAction('clear')}>Clear</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('delete')}} disabled={!overlay.current.canDoMarkerAction('delete')}>Delete</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('copy')}} disabled={!overlay.current.canDoMarkerAction('copy')}>Copy</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('fill')}} disabled={!overlay.current.canDoMarkerAction('fill')}>Fill</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('crop')}} disabled={!overlay.current.canDoMarkerAction('crop')}>Crop</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('insert')}} disabled={!overlay.current.canDoMarkerAction('insert')}>Insert</button></div>
                <div><button onClick={() => {overlay.current.doMarkerAction('abort')}} disabled={!overlay.current.canDoMarkerAction('abort')}>Abort</button></div>
                <div><button onClick={() => {overlay.current.setMode('select', {type: 'rect', all: true})}}>Select All</button></div>
            </Fragment>

    }

    return (
        <div className="padded full-v">
            <Stack dir="x" full>
                <Stack dir="y">
                    <div><button onClick={() => {overlay.current.setMode('pick')}}>Pick</button></div>
                    <div><button onClick={() => {overlay.current.setMode('select', {type: 'rect'})}}>Select Rect</button></div>
                    <div><button onClick={() => {overlay.current.setMode('select', {type: 'rows'})}}>Select Rows</button></div>
                    <div><button onClick={() => {overlay.current.setMode('select', {type: 'columns'})}}>Select Columns</button></div>
                    <div><button onClick={() => {overlay.current.setMode('select', {type: 'column-gap'})}}>Select Column-Gap</button></div>
                    <div><button onClick={() => {overlay.current.setMode('select', {type: 'row-gap'})}}>Select Row-Gap</button></div>
                    <div><button onClick={() => {eContext.undoAction()}} disabled={!eContext.hasPast()}>Undo</button></div>
                    <div><button onClick={() => {eContext.redoAction()}} disabled={!eContext.hasFuture()}>Redo</button></div>
                </Stack>

                <Stack dir="y">
                    {markerActions}
                </Stack>

                <div>
                    PosX: <Int min={0} max={props.cellProvider.getWidth() - width} value={posX} set={setPosX} buttons />
                    PosY: <Int min={0} max={props.cellProvider.getHeight() - height} value={posY} set={setPosY} buttons />
                    Zoom: <Int min={1} max={5} value={zoom} set={setZoom} buttons />
                    Border: <Int min={0} max={5} value={border} set={setBorder} buttons />
                    <Checkbox name="rulers" value={rulers} set={setRulers} />
                    <Checkbox name="Write Opaque" value={writeTransparent} set={setWriteTransparent} />
                    <button onClick={() => {eContext.redraw(props.editorId)}}>Redraw</button>
                </div>

                <div className="flex items-centered align-center full-v">
                    <RasterViewGrid
                        auto
                        shift
                        setStateUpdate={setStateUpdate}
                        stateUpdate={stateUpdate}
                        setWidth={setWidth}
                        setHeight={setHeight}
                        setPosX={setPosX}
                        setPosY={setPosY}
                        width={width}
                        height={height}
                        posX={posX}
                        posY={posY}
                        editorId={props.editorId}
                        zoom={zoom}
                        border={border}
                        rulers={rulers}
                        cellProvider={props.cellProvider}
                        overlayRef={overlay}
                        writeTransparent={writeTransparent}
                        mode="pick"
                        markerX={markerX}
                        markerY={markerY}
                        markerWidth={markerWidth}
                        markerHeight={markerHeight}
                        markerType={markerType}
                        setMarkerX={setMarkerX}
                        setMarkerY={setMarkerY}
                        setMarkerWidth={setMarkerWidth}
                        setMarkerHeight={setMarkerHeight}
                        setMarkerType={setMarkerType}
                    />
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
    BasicRasterView,
    BaseCellProviderIndexRaster
}