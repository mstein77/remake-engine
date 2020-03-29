import React, {Component, Fragment, useState, useEffect} from "react";
import ReactDOM from 'react-dom';
import './components/base.css';

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

        this.state = {
            border: props.border || 0,
            zoom: props.zoom || 1,
            posX: 0,
            posY: 0,
            viewX: props.cellProvider.getWidth(),
            viewY: props.cellProvider.getHeight(),
            maxX: props.maxX && !props.full ? props.maxX : null,
            maxY: props.maxY && !props.full ? props.maxY : null,
            markerPosX: null,
            markerPosY: null,
            markerWidth: 1,
            markerHeight: 1,
            markerMode: props.markerMode || 'display',
            highlight: false
        };

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

        if (this.state.markerPosX >= width) {
            set.markerPosX = null;
            set.markerPosY = null;
        } else if (this.state.markerPosX + this.state.markerWidth > width) {
            set.markerWidth = width - this.state.markerPosX;
        }
        if (this.state.markerPosY >= height) {
            set.markerPosY = null;
            set.markerPosX = null;
        } else if (this.state.markerPosY + this.state.markerHeight > height) {
            set.markerHeight = height - this.state.markerPosY;
        }
        this.setState(set);
    };

    getCanvasSizeForDim(width, height, updateViewDim = false) {
        const props = this.props;
        const padding = 20;
        const spaceX = width - (padding * 2) - this.state.border;
        const spaceY = height - (padding * 2) - this.state.border;

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
            case 'scan':
                resetMarker();
                break;

            case 'select-start':
                resetMarker();
                break;

            case 'select':
                if (this.state.markerMode === 'select-start') {
                    this.modeSwitchData = data;
                }
                break;

            default:
                console.error('Unknown marker mode given: ', markerMode);
                return;
        }
        this.setState(set);
    }

    getRasterPosFromEvent(e, outside = false) {
        return this.getRasterPosFromClient({x: e.clientX, y: e.clientY}, outside);
    }

    getRasterPosFromClient(client, outside = false) {
        const rect = this.getBoundingRect();
        if (!rect) { console.log('no rect'); return null; }

        const cellsize = this.props.cellProvider.getSize() * this.state.zoom  + this.state.border;
        const rasterPos = {
            x: Math.floor(Math.round(client.x - rect.left)/cellsize),
            y: Math.floor(Math.round(client.y - rect.top)/cellsize),
        };
        if (!outside) {
            if (rasterPos.x < 0) {
                rasterPos.x = 0;
            } else if (rasterPos.x >= this.state.viewX) {
                rasterPos.x = this.state.viewX - 1;
            }
            if (rasterPos.y < 0) {
                rasterPos.y = 0;
            } else if (rasterPos.y >= this.state.viewY) {
                rasterPos.y = this.state.viewY - 1;
            }
        }
        return rasterPos;
    }

    renderOverlays(width, height) {
        let marker = '';
        let mouseMoveCanvas = null;
        let mouseLeaveCanvas = null;
        let mouseDownCanvas = null;
        let highlight = false;
        let showMarker = true && (this.state.markerPosX !== null && this.state.markerPosY !== null);

        let initResize = undefined;
        let initMove = undefined;

        switch (this.state.markerMode) {

            case 'display':
                break;

            case 'scan':
                let lastRasterPos = {x: null, y: null};
                highlight = this.isDown;

                const trackEventPosition = (e) => {
                    const currRasterPos = this.getRasterPosFromEvent(e);
                    const markerPosX = this.state.posX + currRasterPos.x;
                    const markerPosY = this.state.posY + currRasterPos.y;
                    console.log('OVERWRITE', markerPosX, markerPosY);
                };

                const mouseTrack = (e, force = false) => {
                    const currRasterPos = this.getRasterPosFromEvent(e);
                    if (force || currRasterPos.x !== lastRasterPos.x || currRasterPos.y !== lastRasterPos.y) {
                        lastRasterPos = currRasterPos;
                        const markerPosX = this.state.posX + currRasterPos.x;
                        const markerPosY = this.state.posY + currRasterPos.y;
                        this.setState({
                            markerPosX,
                            markerPosY
                        });
                        if (this.isDown) {
                            trackEventPosition(e);
                        }
                    }
                };

                mouseDownCanvas = (e) => {
                    this.isDown = true;
                    trackEventPosition(e);
                    this.setState({highlight: !this.state.highlight});
                    e.preventDefault();
                    e.stopPropagation();
                    window.addEventListener('mouseup', (e) => {
                        this.isDown = false;
                        this.setState({highlight: !this.state.highlight});
                        e.preventDefault();
                        e.stopPropagation();
                    }, {once: true, capture: false});
                };

                mouseMoveCanvas = (e) => {
                    mouseTrack(e);
                    e.preventDefault();
                    e.stopPropagation();
                };

                mouseLeaveCanvas = (e) => {
                    this.setState({markerPosX: null, markerPosY: null});
                    e.preventDefault();
                    e.stopPropagation();
                };
                break;

            case 'select-start':
                let lastRasterPos2 = {x: null, y: null};

                const mouseTrack2 = (e, force = false) => {
                    const currRasterPos = this.getRasterPosFromEvent(e);
                    if (force || currRasterPos.x !== lastRasterPos2.x || currRasterPos.y !== lastRasterPos2.y) {
                        lastRasterPos2 = currRasterPos;
                        const markerPosX = this.state.posX + currRasterPos.x;
                        const markerPosY = this.state.posY + currRasterPos.y;
                        this.setState({
                            markerPosX,
                            markerPosY
                        });
                    }
                };

                mouseDownCanvas = (e) => {
                    this.switchToMode('select', {clientX: e.clientX, clientY: e.clientY});
                    e.preventDefault();
                    e.stopPropagation();
                };

                mouseMoveCanvas = (e) => {
                    mouseTrack2(e);
                    e.preventDefault();
                    e.stopPropagation();
                };

                mouseLeaveCanvas = (e) => {
                    this.setState({markerPosX: null, markerPosY: null});
                    e.preventDefault();
                    e.stopPropagation();
                };
                break;

            case 'select':
                highlight = true;

                initResize = (e, axis, startX, startY) => {
                    const anchorPos = {
                        x: this.state.markerPosX + (!startX ? 0 : this.state.markerWidth - 1),
                        y: this.state.markerPosY + (!startY ? 0 : this.state.markerHeight - 1)
                    };
                    const resizeX = axis.indexOf('x') !== -1;
                    const resizeY = axis.indexOf('y') !== -1;

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
                let lastRasterPos = this.getRasterPosFromEvent(e);
                const offPos = {
                    x: lastRasterPos.x - (this.state.markerPosX - this.state.posX),
                    y: lastRasterPos.y - (this.state.markerPosY - this.state.posY)
                };
                const checkWithLastRasterPos = (e) => {
                    const newRasterPos = this.getRasterPosFromEvent(e);
                    const xStart = newRasterPos.x - offPos.x;
                    const yStart = newRasterPos.y - offPos.y;

                    const markerPosX = this.state.posX + xStart;
                    const markerPosY = this.state.posY + yStart;
                    const hasChanged =
                        (markerPosX >= 0 && markerPosX + this.state.markerWidth <= this.props.cellProvider.getWidth() &&
                            markerPosY >= 0 && markerPosY + this.state.markerHeight <= this.props.cellProvider.getHeight()) &&
                        (newRasterPos.x !== lastRasterPos.x || newRasterPos.y !== lastRasterPos.y);

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
                initResize(this.modeSwitchData, 'xy', false, false);
                this.modeSwitchData = undefined;
            }

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

            marker = <CellMarker
                initMove={initMove}
                initResize={initResize}
                size={this.props.cellProvider.getSize()}
                border={this.state.border}
                zoom={this.state.zoom}
                highlight={highlight}
                posX={offX} posY={offY}
                width={offWidth} height={offHeight}
                top={hasTop} bottom={hasBottom} left={hasLeft} right={hasRight}
            />;
        }

        return (
            <div
                onMouseMove={mouseMoveCanvas}
                onMouseLeave={mouseLeaveCanvas}
                onMouseDown={mouseDownCanvas}
                style={{width, height, top: 0, left: 0, position: 'absolute'}}
            >
                {marker}
            </div>
        );
    }

    render() {
        const props = this.props;

        let canvas = '';
        if (props.full) {
            const cellSize = props.cellProvider.getSize() * this.state.zoom  + this.state.border;
            const width = cellSize * props.cellProvider.getWidth() + this.state.border;
            const height = cellSize * props.cellProvider.getHeight() + this.state.border;
            canvas =
                <div className="auto-scroll">
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

            if (pos !== (start ? 0 : maxPos)) {
                btnAdd1Attr.disabled = 'disabled';
                btnSub1Attr.disabled = 'disabled';
                btnAddPageAttr.disabled = 'disabled';
                btnSubPageAttr.disabled = 'disabled';
            } else {
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
            const br = vertical ? '' : <br />;
            return (<div>
                <button {...btnSubPageAttr}>--</button>{br}
                <button {...btnSub1Attr}>-</button>{br}
                <button {...btnAdd1Attr}>+</button>{br}
                <button {...btnAddPageAttr}>++</button>
            </div>)
        };

        const sliderX = hiddenX ?
            <div className="full-h"><input onChange={(e) => {setPosX(parseInt(e.target.value, 10))}} max={hiddenX} value={this.state.posX} type="range" className="full-h" /></div> : '';
        const sliderY = hiddenY ?
            <div className="full-v"><input onChange={(e) => {setPosY(parseInt(e.target.max, 10) - parseInt(e.target.value, 10))}} max={hiddenY} value={hiddenY - this.state.posY} type="range" orient="vertical" className="full-v" /></div> : '';

        const gridCls = ['full-v'];
        let topRow = '';
        let leftMidCell = '';
        let leftBottomCell = '';
        const fixed = !props.cellProvider.isResizeable();
        if (fixed) {
            gridCls.push('grid-2x2');
        } else {
            gridCls.push('grid-3x3');
            const topButtons = getSizeButtons(true, true);
            topRow =
                <Fragment>
                    <div></div>
                    <div>
                        <Stack dir="y" center>{topButtons}</Stack>
                    </div>
                    <div></div>
                </Fragment>;


            const leftButtons = getSizeButtons(true, false);
            leftMidCell =
                <div>
                    <Stack dir="x" center full>
                        {leftButtons}
                    </Stack>
                </div>;

            leftBottomCell = <div></div>;
        }
        const rightButtons = fixed ? '' : getSizeButtons(false, false);
        const bottomButtons = fixed ? '' : getSizeButtons(false, true);

        const posSize = props.full ? '' :
            <Fragment>
                <Dim name="Size:" x={cellsX} y={cellsY} size="3" min="1" readOnly />
                <Dim name="Position:" buttons x={this.state.posX} setX={setPosX} y={this.state.posY} setY={setPosY} size="3" maxX={hiddenX} maxY={hiddenY} min="0" readOnly />
            </Fragment>;
        const zoomInput = props.maxZoom !== 1 ? <Int name="Zoom:" readOnly min="1" max={props.maxZoom} set={setZoom} value={this.state.zoom} size="1" buttons /> : '';

        let bottomTools = '';
        if (this.state.markerMode === 'select') {
            bottomTools =
                <Fragment>
                    <Dim name="Position:" buttons x={this.state.markerPosX} setX={setMarkerPosX} y={this.state.markerPosY} setY={setMarkerPosY} size="3" maxX={cellsX - this.state.markerWidth} maxY={cellsY - this.state.markerHeight} min="0" readOnly />
                    <Dim name="Size:" buttons x={this.state.markerWidth} setX={setMarkerWidth} y={this.state.markerHeight} setY={setMarkerHeight} size="3" maxX={cellsX - this.state.markerPosX} maxY={cellsY - this.state.markerPosY} min="1" readOnly />
                    <button onClick={() => {this.switchToMode('scan')}}>X</button>
                </Fragment>
        }
        const selectionToolbar =
            <Toolbar>
                <div>Mode: {this.state.markerMode}</div>
                {bottomTools}
            </Toolbar>;

        return (
            <Stack dir="y" border full>
                <Toolbar>
                    <SwitchButton enabled={this.state.markerMode.startsWith('select')} switch={(enabled) => {this.switchToMode(enabled ? 'select-start' : 'scan')}}>Select</SwitchButton>
                    {posSize}
                    {zoomInput}
                    <Int name="Border:" readOnly min="0" max="5" set={this.setBorder} value={this.state.border} size="1" buttons />
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
                                {rightButtons}
                                {sliderY}
                            </Stack>
                        </div>

                        {leftBottomCell}
                        <div>
                            <Stack dir="y" center>
                                {bottomButtons}
                                {sliderX}
                            </Stack>
                        </div>
                        <div></div>
                    </div>
                </div>

                {selectionToolbar}
            </Stack>
        );
    }

    componentDidMount() {
        // initial
        this.redrawCanvas();
    }

    componentDidUpdate() {
        // Änderungen an state oder props
        this.redrawCanvas();
    }
}

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
        left: props.border + (size + props.border) * props.posX - 8
    };
    const width = props.width || 1;
    const height = props.height || 1;
    const centerStyle = {
        width: size * width + (width - 1) * props.border,
        height: size * height + (height - 1) * props.border
    };

    const markerCls = 'marker-cell' + (props.highlight ? '-highlight' : '');
    const cls = ['marker-grid'];

    const clsCenter = [];
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

function MarkerArea(props) {
    return (
        <div className="marker-area" style={{width: props.width, height: props.height}}>
            <CellMarker top bottom left right width={props.markerWidth} height={props.markerHeight} zoom={props.zoom} size={props.size} border={props.border} posX={5} posY={5} />
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

class AutoCanvas extends React.Component {

    constructor(props) {
        super(props);
        this.divRef = React.createRef();
        this.canvasRef = React.createRef();
        this.state = {
            width: null,
            height: null
        };
    }

    render() {
        const cls = ['rel-canvas marker-space'];
        const canvas = (this.state.width && this.state.height) ?
            <div className={cls.join(' ')}>
                <canvas ref={this.canvasRef} width={this.state.width} height={this.state.height} />
                {this.props.children}
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
        const sizes = this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight);
        this.props.setViewDim(sizes.cellsX, sizes.cellsY);
        this.setState(
            {width: sizes.width, height: sizes.height}
        );
    }

    getSnapshotBeforeUpdate() {
        return this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight);
    }

    componentDidUpdate(a, b, snapshot) {
        if (snapshot !== null) {
            if (snapshot.width !== this.state.width || snapshot.height !== this.state.height) {
                this.updateSize();
                return;
            }
        }
        this.props.redrawCanvas(this.canvasRef.current);
    }

    componentDidMount() {
        this.updateSize();
        const resizeObserver = new ResizeObserver(entries => {
            this.updateSize();
        });
        resizeObserver.observe(this.divRef.current);
    }
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
                        <FullRaster markerMode="scan" border={1} zoom={1} cellProvider={cellProvider} />
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
        )
    }
}

function Raster(props) {

    const zoom = props.zoom || 1;
    const border = props.border || 0;
    const padding = props.padding || 0;
    const cellSize = zoom * props.size + border;

    const cellsX = props.cellsX || null;
    const cellsY = props.cellsY || null;

    const getCanvasSizeForDim = (width, height) => {
        // border + zoom
        const spaceX = width - (padding * 2) - border;
        const spaceY = height - (padding * 2) - border;

        let maxX = Math.floor(spaceX / cellSize);
        if (cellsX !== null) {
            maxX = Math.min(maxX, cellsX);
        }
        let maxY = Math.floor(spaceY / cellSize);

        if (cellsY !== null) {
            maxY = Math.min(maxY, cellsY);
        }
        return {
            width: maxX * cellSize + border,
            height: maxY * cellSize + border,
            cellsX: maxX,
            cellsY: maxY
        }
    };

    const drawRaster = (canvas) => {
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const spaceX = canvas.width - border;
        const spaceY = canvas.height - border;
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
    };

    return (
        <AutoCanvas setViewDim={props.setViewDim} getCanvasSizeForDim={getCanvasSizeForDim} redrawCanvas={drawRaster}>
            {props.children}
        </AutoCanvas>
    );
}

function MapRaster(props) {
    const [zoom, setZoom] = useState(props.zoom || 1);
    const [border, setBorder] = useState(props.border || 0);
    const [cellsX, setCellsX] = useState(props.cellsX !== undefined ? props.cellsX : null);
    const [cellsY, setCellsY] = useState(props.cellsY !== undefined ? props.cellsY : null);
    const [viewX, setViewX] = useState(props.viewX !== undefined ? props.viewX : cellsX);
    const [viewY, setViewY] = useState(props.viewY !== undefined ? props.viewY : cellsY);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [markerWidth, setMarkerWidth] = useState(1);
    const [markerHeight, setMarkerHeight] = useState(1);

    const updateDims = (newDims) => {
        const _cellsX = newDims.cellsX !== undefined ? newDims.cellsX : cellsX;
        const _cellsY = newDims.cellsY !== undefined ? newDims.cellsY : cellsY;
        const _viewX = newDims.viewX !== undefined ? newDims.viewX : viewX;
        const _viewY = newDims.viewY !== undefined ? newDims.viewY : viewY;
        const _posX = newDims.posX !== undefined ? newDims.posX : posX;
        const _posY = newDims.posY !== undefined ? newDims.posY : posY;

        const _hiddenX = Math.max(_cellsX - _viewX, 0);
        const _hiddenY = Math.max(_cellsY - _viewY, 0);

        setViewX(_viewX);
        if (_posX >= _hiddenX || newDims.endX) {
            setPosX(_hiddenX);
        } else {
            setPosX(_posX);
        }
        setViewY(_viewY);
        if (_posY >= _hiddenY || newDims.endY) {
            setPosY(_hiddenY);
        } else {
            setPosY(_posY);
        }
        setCellsX(_cellsX);
        setCellsY(_cellsY);
    };

    const setViewDim = (viewX, viewY) => {
        updateDims({viewX, viewY});
    };

    const hiddenX = cellsX - viewX;
    const hiddenY = cellsY - viewY;

    const addRows = (no, start) => {
        const _posY = start ? 0 : Math.max(0, posY + no);
        const _cellsY = Math.max(1, cellsY + no);
        updateDims({posY: _posY, cellsY: _cellsY, endY: !start});
    };

    const addColumns = (no, start) => {
        const _posX = start ? 0 : Math.max(0, posX + no);
        const _cellsX = Math.max(1, cellsX + no);
        updateDims({posX: _posX, cellsX: _cellsX, endX: !start});
    };

    const getSizeButtons = (start, vertical) => {
        const callback = vertical ? addRows : addColumns;
        const maxPos = vertical ? hiddenY : hiddenX;
        const pos = vertical ? posY : posX;
        const max = vertical ? cellsY : cellsX;
        const btnAdd1Attr = {};
        const btnAddPageAttr = {};
        const btnSub1Attr = {};
        const btnSubPageAttr = {};

        if (pos !== (start ? 0 : maxPos)) {
            btnAdd1Attr.disabled = 'disabled';
            btnSub1Attr.disabled = 'disabled';
            btnAddPageAttr.disabled = 'disabled';
            btnSubPageAttr.disabled = 'disabled';
        } else {
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
        const br = vertical ? '' : <br />;
        return (<div>
            <button {...btnSubPageAttr}>--</button>{br}
            <button {...btnSub1Attr}>-</button>{br}
            <button {...btnAdd1Attr}>+</button>{br}
            <button {...btnAddPageAttr}>++</button>
        </div>)
    };

    const sliderX = hiddenX ?
        <div className="full-h"><input onChange={(e) => {setPosX(parseInt(e.target.value, 10))}} max={hiddenX} value={posX} type="range" className="full-h" /></div> : '';
    const sliderY = hiddenY ?
        <div className="full-v"><input onChange={(e) => {setPosY(parseInt(e.target.max, 10) - parseInt(e.target.value, 10))}} max={hiddenY} value={hiddenY - posY} type="range" orient="vertical" className="full-v" /></div> : '';

    const gridCls = ['full-v'];
    let topRow = '';
    let leftMidCell = '';
    let leftBottomCell = '';
    if (props.fixed) {
        gridCls.push('grid-2x2');
    } else {
        gridCls.push('grid-3x3');
        const topButtons = getSizeButtons(true, true);
        topRow =
            <Fragment>
                <div></div>
                <div>
                    <Stack dir="y" center>{topButtons}</Stack>
                </div>
                <div></div>
            </Fragment>;


        const leftButtons = getSizeButtons(true, false);
        leftMidCell =
            <div>
                <Stack dir="x" center full>
                    {leftButtons}
                </Stack>
            </div>;

        leftBottomCell = <div></div>;
    }
    const rightButtons = props.fixed ? '' : getSizeButtons(false, false);
    const bottomButtons = props.fixed ? '' : getSizeButtons(false, true);

    const zoomInput = props.maxZoom !== 1 ? <Int name="Zoom:" readOnly min="1" max={props.maxZoom} set={setZoom} value={zoom} size="1" buttons /> : '';

    return (
        <Stack dir="y" full border>
            <Toolbar>
                <Dim name="Size:" x={cellsX} setX={setCellsX} y={cellsY} setY={setCellsY} size="3" min="1" readOnly />
                <Dim name="Position:" buttons x={posX} setX={setPosX} y={posY} setY={setPosY} size="3" maxX={hiddenX} maxY={hiddenY} min="0" readOnly />
                {zoomInput}
                <Int name="Border:" readOnly min="0" max="5" set={setBorder} value={border} size="1" buttons />
            </Toolbar>
            <div className="padded flex">
                <div className={gridCls.join(' ')}>
                    {topRow}

                    {leftMidCell}
                    <Raster posX={posX} posY={posY} setViewDim={setViewDim} size={props.size}  cellsX={cellsX} cellsY={cellsY} border={border} zoom={zoom}>
                        <MarkerArea markerWidth={markerWidth} size={props.size} markerHeight={markerHeight} cellsX={cellsX} cellsY={cellsY} border={border} zoom={zoom} />
                    </Raster>
                    <div>
                        <Stack dir="x" center full>
                            {rightButtons}
                            <div className="full-v">{sliderY}</div>
                        </Stack>
                    </div>

                    {leftBottomCell}
                    <div>
                        <Stack dir="y" center>
                            {bottomButtons}
                            {sliderX}
                        </Stack>
                    </div>
                    <div></div>
                </div>
            </div>
            <Toolbar>
                <div>Mode: Cell-Selection</div>
                <Dim name="Position:" buttons x={posX} setX={setPosX} y={posY} setY={setPosY} size="3" maxX={hiddenX} maxY={hiddenY} min="0" readOnly />
                <Dim name="Size:" buttons x={markerWidth} setX={setMarkerWidth} y={markerHeight} setY={setMarkerHeight} size="3" maxX={10} maxY={10} min="1" readOnly />
            </Toolbar>
        </Stack>
    );
}


ReactDOM.render(<MyApp/>, document.getElementById('root'));

export default MyApp;