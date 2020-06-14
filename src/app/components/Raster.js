import React, {Fragment, useState, useRef, useEffect, useContext, useMemo} from "react";
import {
    Checkbox,
    Color,
    CssContext,
    Dim,
    Int,
    Stack,
    SwitchButton,
    Toolbar,
    MouseOverlay,
    useMounted,
    d,
    Modal,
    closeModals
} from "./BaseComponents";
import {BitmapCellProvider, CellSelection} from "../classes/CellProvider";
import ReactDOM from "react-dom";

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

function useMountedReadyCellProvider(cellProvider) {
    const mounted = useMounted();
    return useReadyCellProvider(cellProvider, mounted);
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
                    let num = props.start + i;
                    if (props.cellsPerLine !== null) {
                        num *= props.cellsPerLine;
                    }
                    const text = '' + num;
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
                if (props.mouseTrack) {
                    props.mouseTrack(null, null);
                }
                setOffX(null);
                setOffY(null);
            } else if (offX !== offset.x || offY !== offset.y) {
                if (props.mouseTrack) {
                    props.mouseTrack(props.posX + offset.x, props.posY + offset.y);
                }
                setOffX(offset.x);
                setOffY(offset.y);
            }
        }
        e.stopPropagation();
        e.preventDefault();
    };

    const onMouseLeave = (e) => {
        if (props.mouseTrack) {
            props.mouseTrack(null, null);
        }
        setOffX(null);
        setOffY(null);
        e.stopPropagation();
        e.preventDefault();
    };

    const onDoubleClick = props.doubleClick ? (e) => {
        const offset = getOffsetPos(e);
        props.doubleClick(e, offset.x, offset.y);
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

        this.frames = {};
        this.raster = {};
        this.tracking = props.tracking ? props.tracking : {};
        this.tracker = {};
        this.listeners = [];

        this.state = {

            // Selection
            selection: null,
            setSelection: (selection) => {
                this.setState({selection});
            },

            // Undo/Redo
            past: [],
            future: [],
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

            // raster management
            mountRaster: (id) => {
                if (!this.raster[id]) {
                    this.raster[id] = {};
                }
                this.raster[id].mounted = true;
            },
            unmountRaster: (id) => {
                this.raster[id].mounted = false;
            },
            setRasterUpdate: (id, update) => {
                if (this.raster[id]) {
                    this.raster[id].update = update;
                }
            },
            updateRaster: (id = null) => {
                const ids = (id === null) ? Object.keys(this.raster) : [id];
                for(let id of ids) {
                    const raster = this.raster[id];
                    if (raster && raster.mounted) {
                        if (this.frames[id]) {
                            cancelAnimationFrame(this.frames[id]);
                        }
                        this.frames[id] = requestAnimationFrame(
                            () => {
                                raster.update();
                                this.frames[id] = undefined;
                            }
                        );
                    }
                }
            },
            setRasterOverlay: (id, overlay) => {
                if (this.raster[id]) {
                    this.raster[id].overlay = overlay;
                }
            },
            setRasterMode: (id, mode, data = {}) => {
                const raster = this.raster[id];
                if (raster && raster.overlay && raster.mounted) {
                    raster.overlay.setMode(mode, data);
                }
            },
            doRasterAction: (id, action, data = {}) => {
                const raster = this.raster[id];
                if (raster && raster.overlay && raster.mounted) {
                    raster.overlay.doMarkerAction(action, data);
                }
            },
            canDoRasterAction: (id, action) => {
                const raster = this.raster[id];
                if (raster && raster.overlay && raster.mounted) {
                    return raster.overlay.canDoMarkerAction(action);
                }
                return false;
            },

            // window events
            removeListener: (rasterId, event, listener, options) => {
                const remainingListeners = [];
                for (let item of this.listeners) {
                    let match = false;
                    if (rasterId === item.rasterId && item.event === event) {
                        match = JSON.stringify(options) === JSON.stringify(item.options);
                    }
                    if (match) {
                        window.removeEventListener(event, listener, options);
                    } else {
                        remainingListeners.push(item);
                    }
                }
                this.listeners = remainingListeners;
            },
            addListener: (rasterId, event, listener, options) => {
                this.state.removeListener(rasterId, event, listener, options);
                window.addEventListener(event, listener, options);
                this.listeners.push({rasterId, event, listener, options});
            },
            clearListeners: (rasterId) => {
                const remainingListeners = [];
                for(let item of this.listeners) {
                    if (item.rasterId === rasterId) {
                        window.removeEventListener(item.event, item.listener, item.options);
                    } else {
                        remainingListeners.push(item);
                    }
                }
                this.listeners = remainingListeners;
            },
            getWindowEvents: (rasterId) => {
                return {
                    addListener: (event, listener, options) => {
                        this.state.addListener(rasterId, event, listener, options);
                    },
                    removeListener: (event, listener, options) => {
                        this.state.removeListener(rasterId, event, listener, options);
                    },
                    clearListeners: () => {
                        this.state.clearListeners(rasterId);
                    }
                }
            },

            // mouse pointer lock
            fixCursor: null,
            setFixCursor: (fixCursor) => {
                this.setState({fixCursor});
            },

            // cursor tracking
            setTracker: (id, tracker) => {
                this.tracker[id] = tracker;
            },
            updateTracking: (id, x, y) => {
                const rasterIds = this.tracking[id];
                if (!rasterIds) {
                    return;
                }
                for(let id of rasterIds) {
                    const raster = this.raster[id];
                    if (raster && raster.mounted && this.tracker[id]) {
                        this.tracker[id](x, y);
                    }
                }
            }
        };
    }

    render() {
        return (
            <EditorContext.Provider value={this.state}>
                {this.props.children}
                <MouseOverlay active={this.state.fixCursor !== null} cursor={this.state.fixCursor} />
            </EditorContext.Provider>
        );
    }
}

function RasterScrollbar(props) {
    const eContext = useContext(EditorContext);
    const divRef = useRef(null);
    const pagePerc = Math.round(props.page / props.max * 100);
    if (props.auto && pagePerc === 100) {
        return '';
    }

    const space = 15;
    const windowEvents = eContext.getWindowEvents(props.editorId);

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
                props.set(props.pos + relPos);
            }
            e.stopPropagation();
            e.preventDefault();
        };
        windowEvents.addListener('mousemove', trackMouse, false);

        windowEvents.addListener('mouseup', (e) => {
            eContext.setFixCursor(null);
            windowEvents.removeListener('mousemove', trackMouse, false);
            e.stopPropagation();
            e.preventDefault();
        }, {capture: false, once: true});

        eContext.setFixCursor(dirKey + 'resize');
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
        dim[axisKey] = 'calc(100% - 6px)';
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
        if (canvasRef.current === null || canvasRef.current.elem !== canvasElemRef.current) {
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
    const context = useContext(CssContext);
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
 *   - renderOptions
 *   - editorId
 *
 * Context:
 *   - addRedraw
 *
 * Out:
 *   - update() in editorContext
 */
const CellProviderRaster = React.memo((props) => {
    useEditorContextPart(props.editorId);
    const ready = useMountedReadyCellProvider(props.cellProvider);
    const renderRef = useRef(null);
    const propsRef = useRef(null);
    const size = props.cellProvider.getSize();
    const cellSize = size * props.zoom;
    propsRef.current = {
        zoom: props.zoom,
        renderOptions: props.renderOptions,
        cellSize
    };

    if (!renderRef.current) {
        const type = props.cellProvider.getCellType();
        switch (type) {

            case 'bitmap':
                renderRef.current =
                    (ctx, x, y, value) => {
                        const img = props.cellProvider.getBitmapForValue(value, propsRef.current.zoom, propsRef.current.renderOptions.caching);

                        if (img) {
                            const size = propsRef.current.cellSize;
                            ctx.clearRect(x, y, size, size);
                            ctx.drawImage(img, x, y);
                            const events = propsRef.current.renderOptions.events ?
                                props.cellProvider.getEventCount(value) : null;
                            if (events === null) {
                                if (typeof(value) === 'string') {
                                    ctx.fillStyle = '#00000088';
                                    ctx.fillRect(x, y, size, 12);
                                    ctx.font = '10px';
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.fillText('' + value, x + 2, y + 10, size - 4);
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
                        }
                    };
                break;

            case 'color':
                renderRef.current =
                    (ctx, x, y, value) => {
                        ctx.fillStyle = value;
                        if (value.length === 9 && value.substr(-2).toLowerCase() != 'ff') {
                            ctx.clearRect(x, y, propsRef.current.cellSize, propsRef.current.cellSize);
                        }
                        ctx.fillRect(x, y, propsRef.current.cellSize, propsRef.current.cellSize);
                    };
                break;

            default:
                console.error('Unknown cell type', type);
                break;
        }
    }

    if (!ready) {
        return ''
    }
    const cells = props.cellProvider.getRawSelection(props.posX, props.posY, props.width, props.height).getCells();
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
 *   - renderOptions
 *
 * Context
 */
function FlexCellProviderRaster(props) {
    const divRef = useRef(null);
    const observerRef = useRef(null);
    const propsRef = useRef(null);
    const eContext = useContext(EditorContext);

    const rulerSpaceX = props.rulers ? 38 : 0;
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
    const hasAutoWidth = props.cellProvider.hasAutoWidth();
    const maxWidth = hasAutoWidth ? props.cellProvider.getMaxIndex() : props.cellProvider.getWidth();
    const maxHeight = hasAutoWidth ? props.cellProvider.getMaxIndex() : props.cellProvider.getHeight();

    const checkSize = () => {
        const props = propsRef.current;
        const rect = divRef.current.parentNode.getBoundingClientRect();
        const spaceX = rect.width - (props.rulers ? props.rulerSpaceX : 0) - props.border;
        const spaceY = rect.height - (props.rulers ? props.rulerSpaceY : 0) - props.border;

        const newWidth = Math.min(Math.floor(spaceX / props.cellPlusBorderSize), maxWidth);
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
        editorId: props.editorId,
        renderOptions: props.renderOptions
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
        const vProps = {...rulerProps, width: rulerSpaceX, height: rasterHeight, max: height, start: posY, cellsPerLine: hasAutoWidth ? props.cellProvider.getWidth() : null};
        leftRuler =
            <VRuler
                digits={('' + maxHeight).length}
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
        firstCells.push(<div key={2}><RasterScrollbar editorId={props.editorId} auto vertical set={props.setPosY} pos={props.posY} page={props.height} max={props.cellProvider.getHeight()} /></div>);
        style.gridTemplateColumns += ' 21px'
    }
    const secondCells = [];
    if (hasScrollingX) {
        secondCells.push(<div style={{height: 21}} key={3}><RasterScrollbar editorId={props.editorId} auto set={props.setPosX} pos={props.posX} page={props.width} max={props.cellProvider.getWidth()} /></div>);
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
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(1);
    const [markerHeight, setMarkerHeight] = useState(1);
    const [markerType, setMarkerType] = useState('rect');
    const [renderOptions, setRenderOptions] = useState({events: false, caching: true});
    const [cursorHighlight, setCursorHighlight] = useState(false);
    const [cursorFixed, setCursorFixed] = useState(false);
    const boundingRectRef = useRef(null);
    const [active, setActive] = useState(false);
    const [overlayRef, eContext] = useOverlay(props.editorId);

    const propsRef = useRef(null);
    propsRef.current = {
        posY
    };

    useEffect(() => {
        overlayRef.current.setMode('pick', {
            doubleClick: (e, x, y) => {
                const index = props.cellProvider.getCellValue(x, propsRef.current.posY + y);

                const save = (provider) => {
                    const doImage = provider.getImageData();
                    const actionIndex = index;
                    const undoImage = props.mapProvider.getImageDataForValue(actionIndex);
                    eContext.doAction(() => {
                        props.cellProvider.setBitmapForValue(actionIndex, doImage);
                        props.mapProvider.setBitmapForValue(actionIndex, doImage);
                        eContext.updateRaster();
                    }, () => {
                        props.cellProvider.setBitmapForValue(actionIndex, undoImage);
                        props.mapProvider.setBitmapForValue(actionIndex, undoImage);
                        eContext.updateRaster();
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
            }
        });
    }, []);

    return (
        <div className="full-v padded">
            <FlexCellProviderScrollRaster
                cellProvider={props.cellProvider}
                auto={true}
                posX={posX}
                setPosX={setPosX}
                posY={posY}
                border={border}
                renderOptions={renderOptions}
                setPosY={setPosY}
                width={width}
                setWidth={setWidth}
                height={height}
                setHeight={setHeight}
                zoom={zoom}
                rulers={rulers}
                editorId={props.editorId}>
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
                    mode="pick"
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

    const windowEvent = eContext.getWindowEvents(props.editorId);
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
        updateState: null,
        markerAction: null,
        markerActions: {},
        canDoActions: {},
        selectionType: 'rect',
        setState: function (change) {
            const props = propsRef.current;
            if (change.markerType !== undefined && change.markerType !== props.markerType) {
                d('-> markerType', change.markerType, props.markerType);
                props.setMarkerType(change.markerType);
            } else {
                change.markerType = props.markerType;
            }
            if (change.markerHeight !== undefined && change.markerHeight !== props.markerHeight) {
                d('-> markerHeight', change.markerHeight, props.markerHeight);
                props.setMarkerHeight(change.markerHeight);
            } else {
                change.markerHeight = props.markerHeight;
            }
            if (change.markerWidth !== undefined && change.markerWidth !== props.markerWidth) {
                d('-> markerWidth', change.markerWidth, props.markerWidth);
                props.setMarkerWidth(change.markerWidth);
            } else {
                change.markerWidth = props.markerWidth;
            }
            if (change.markerX !== undefined && change.markerX !== props.markerX) {
                d('-> markerX', change.markerX, props.markerX);
                props.setMarkerX(change.markerX);
            } else {
                change.markerX = props.markerX;
            }
            if (change.markerY !== undefined && change.markerY !== props.markerY) {
                d('-> markerY', change.markerY, props.markerY);
                props.setMarkerY(change.markerY);
            } else {
                change.markerY = props.markerY;
            }
            if (change.posX !== undefined && change.posX !== props.posX) {
                d('-> posX', change.posX, props.posX);
                props.setPosX(change.posX);
            } else {
                change.posX = props.posX;
            }
            if (change.posY !== undefined && change.posY !== props.posY) {
                d('-> posY', change.posY, props.posY);
                props.setPosY(change.posY);
            } else {
                change.posY = props.posY;
            }

            if (!change.added || change.markerX === null) {
                return;
            }

            const isGap = change.markerType.endsWith('gap');
            const checkX = change.axis === 'x' && !change.markerType.startsWith('row');
            const checkY = change.axis === 'y' && !change.markerType.startsWith('column');
            let reset = false;

            if (checkX) {
                if (change.start) {
                    props.setMarkerX(Math.max(change.markerX + change.added, 0));
                    if (isGap) {
                        if (change.markerX + change.added < 0) {
                            reset = true;
                        }
                    } else {
                        const markerWidth = change.markerWidth + Math.min(change.markerX + change.added, 0);
                        if (markerWidth <= 0) {
                            reset = true;
                        } else {
                            props.setMarkerWidth(markerWidth);
                        }
                    }
                } else if (change.added < 0) {
                    const newWidth = props.cellProvider.getWidth();
                    if (isGap) {
                        if (newWidth < change.markerX) {
                            reset = true;
                        }
                    } else {
                        if ((change.markerX + change.markerWidth) > newWidth) {
                            if (newWidth <= change.markerX) {
                                reset = true;
                            } else {
                                props.setMarkerWidth(newWidth - change.markerX);
                            }
                        }
                    }
                }
            }

            if (checkY) {
                if (change.start) {
                    props.setMarkerY(Math.max(change.markerY + change.added, 0));
                    if (isGap) {
                        if (change.markerY + change.added < 0) {
                            reset = true;
                        }
                    } else {
                        const markerHeight = change.markerHeight + Math.min(change.markerY + change.added, 0);
                        if (markerHeight <= 0) {
                            reset = true;
                        } else {
                            props.setMarkerHeight(markerHeight);
                        }
                    }
                } else if (change.added < 0) {
                    const newHeight = props.cellProvider.getHeight();
                    if (isGap) {
                        if (newHeight < change.markerY) {
                            reset = true;
                        }
                    } else {
                        if ((change.markerY + change.markerHeight) > newHeight) {
                            if (newHeight <= change.markerY) {
                                reset = true;
                            } else {
                                props.setMarkerHeight(newHeight - change.markerY);
                            }
                        }
                    }
                }
            }

            if (reset) {
                props.setMarkerX(null);
                props.setMarkerY(null);
            }
        },
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
                if (this.updateState) {
                    this.updateState();
                }
            });
        }
    });
    const overlay = overlayRef.current;
    props.overlayRef.current = overlay;
    eContext.setRasterOverlay(props.editorId, overlay);

    useEffect(() => {
        const autoScroll = autoScrollRef.current;

        overlay.addMode = overlay.addMode.bind(overlay);
        overlay.setMode = overlay.setMode.bind(overlay);
        overlay.cleanUp = overlay.cleanUp.bind(overlay);
        overlay.setState = overlay.setState.bind(overlay);
        overlay.setMarkerAction = overlay.setMarkerAction.bind(overlay);
        overlay.doMarkerAction = overlay.doMarkerAction.bind(overlay);
        overlay.canDoMarkerAction = overlay.canDoMarkerAction.bind(overlay);
        overlay.addMarkerAction = overlay.addMarkerAction.bind(overlay);
        overlay.triggerMarkerAction = overlay.triggerMarkerAction.bind(overlay);

        let mouseUpPickAgain = null;
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
                mouseUpPickAgain = (e) => {
                    overlay.setMode('pick', data);
                    if (props.editorId !== 'map') {
                        eCtxRef.current.setRasterMode('map', 'startPath');
                    }
                };
                setCursorMouseDown(() => (e, x, y) => {
                    eCtxRef.current.setSelection(props.cellProvider.getSelection(x, y, 1, 1));
                    propsRef.current.setMarkerX(x);
                    propsRef.current.setMarkerY(y);
                    propsRef.current.setMarkerType('rect');
                    windowEvent.addListener('mouseup', mouseUpPickAgain, {capture: false, once: true});
                    eCtxRef.current.setFixCursor('pointer');
                });
                setCursorMouseTrack(() => (x, y) => {
                    eCtxRef.current.updateTracking(propsRef.current.editorId, x, y);
                });
                const doubleClick = data.doubleClick ? data.doubleClick : (e, x, y) => {
                    overlay.setMode('startPath');
                };
                setCursorDoubleClick(() => doubleClick);
            },
            () => {
                windowEvent.removeListener('mouseup', mouseUpPickAgain, {capture: false, once: true})
                propsRef.current.setMarkerX(null);
                propsRef.current.setMarkerY(null);
                if (props.tracker && props.tracker.current) {
                    props.tracker.current(null, null);
                }
                setCursorMouseTrack(null);
                setCursorMouseDown(null);
                eCtxRef.current.setFixCursor(null);
                setCursorDoubleClick(null);
            }
        );
        let matrix = null;
        overlay.addMode(
            'select',
            (data) => {
                const markerType = data.type ? data.type : 'rect';
                setCursorType(markerType);
                overlay.selectionType = markerType;
                const markerWidth = data.width ? data.width : 1;
                setCursorWidth(markerWidth);
                const markerHeight = data.height ? data.height : 1;
                setCursorHeight(markerHeight);
                if (data.all) {
                    overlay.setState({markerType, markerX: 0, markerY: 0, markerWidth: props.cellProvider.getWidth(), markerHeight: props.cellProvider.getHeight()});
                } else if (markerType !== propsRef.current.markerType) {
                    overlay.setState({markerX: null, markerY: null});
                }
                setCursorMouseDown(() => (e, markerX, markerY) => {
                    if (!cursorRef.current.trackX) {
                        markerX = 0;
                    }
                    if (!cursorRef.current.trackY) {
                        markerY = 0;
                    }
                    overlay.setState({
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
                    if (x === null || y === null) {
                        return;
                    }

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
                    eCtxRef.current.updateRaster(props.editorId);
                };
                setCursorHighlight(true);
                track(data.start.x, data.start.y);

                mouseUpSavePath = (e, x, y) => {
                    const doPath = path.new;
                    const undoPath = path.old;
                    const doAction = () => {
                        props.cellProvider.writePath(doPath);
                        eCtxRef.current.updateRaster(props.editorId);
                    };
                    const undoAction = () => {
                        props.cellProvider.writePath(undoPath);
                        eCtxRef.current.updateRaster(props.editorId);
                    };
                    eContext.doAction(doAction, undoAction);
                    overlay.setMode('startPath');
                };
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
            overlay.setState(change);
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
                        overlay.setState(change);
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
                eCtxRef.current.setFixCursor('move');
            },
            () => {
                resetAutoScroll();
                windowEvent.removeListener('mousemove', mouseMove, false);
                windowEvent.removeListener('mouseup', mouseUp, {capture: false, once: true});
                eCtxRef.current.setFixCursor(null);
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
                        overlay.setState(change);
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
                eCtxRef.current.setFixCursor(dir + 'resize');
            },
            () => {
                eCtxRef.current.setFixCursor(null);
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
                    eCtxRef.current.updateRaster(props.editorId);
                };
                const undoAction = () => {
                    props.cellProvider.fillRectWithSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        undoSelection
                    );
                    eCtxRef.current.updateRaster(props.editorId);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
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
                    eCtxRef.current.updateRaster(props.editorId);
                };
                const undoAction = () => {
                    props.cellProvider.fillRectWithSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        undoSelection
                    );
                    eCtxRef.current.updateRaster(props.editorId);
                };
                eCtxRef.current.doAction(doAction, undoAction);
            },
            (props) => {
                return (props.markerX !== null && !props.markerType.endsWith('gap'));
            }
        );

        overlay.addMarkerAction(
            'goto',
            (props) => {
                if (!props.markerType.startsWith('row')) {
                    props.setPosX(props.markerX);
                }
                if (!props.markerType.startsWith('column')) {
                    props.setPosY(props.markerY);
                }
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
        </Fragment>
    );
}

/**
 *
 */
function RasterViewGrid(props) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const addPage = 10;
    const {
        auto, mode, writeTransparent,
        setWidth, setHeight, setPosX, setPosY, width, height, posX, posY, zoom, border, rulers,
        setMarkerX, setMarkerY, markerX, markerY, setMarkerType, markerType, overlayRef, markerWidth,
        markerHeight, setMarkerWidth, setMarkerHeight, renderOptions, editorId
    } = props;

    const resizeable = props.cellProvider.isResizeable() && props.resizeable;

    useEffect(() => {
        const overlay = overlayRef.current;
        if (resizeable) {

            overlay.addMarkerAction(
                'addRows',
                (props, data) => {
                    const no = data.no;
                    const start = data.start;
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
                        overlayRef.current.setState({posY: _posY, start, added, axis: 'y'});
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
                        overlayRef.current.setState({posY: oldPosY, start, added: -added, axis: 'y'});
                    };
                    eContext.doAction(doAction, undoAction);
                }
            );

            overlay.addMarkerAction(
                'addColumns',
                (props, data) => {
                    const no = data.no;
                    const start = data.start;
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
                        overlayRef.current.setState({posX: _posX, start, added, axis: 'x'});
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
                        overlayRef.current.setState({posX: oldPosX, start, added: -added, axis: 'x'});
                    };

                    eContext.doAction(doAction, undoAction);
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
                            eCtxRef.current.updateRaster(props.editorId);
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
        }
    }, []);

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
            eContext.updateRaster(props.editorId);
        };
        const undoAction = () => {
            props.cellProvider.addRows(!start, -1);
            props.cellProvider.addRows(start, 1);
            props.cellProvider.writeSelection(
                0, start ? 0 : height - 1,
                undoSelection
            );
            eContext.updateRaster(props.editorId);
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
            eContext.updateRaster(props.editorId);
        };
        const undoAction = () => {
            props.cellProvider.addColumns(!start, -1);
            props.cellProvider.addColumns(start, 1);
            props.cellProvider.writeSelection(
                start ? 0 : width - 1, 0,
                undoSelection
            );
            eContext.updateRaster(props.editorId);
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
        const action = vertical ? 'addRows' : 'addColumns';
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
                overlayRef.current.setState(target);
            };
        } else {
            btnJumpAttr.disabled = 'disabled';
            btnAdd1Attr.onClick = () => {
                overlayRef.current.doMarkerAction(action, {no: 1, start});
            };
            btnAddPageAttr.onClick = () => {
                overlayRef.current.doMarkerAction(action, {no: addPage, start});
            };
            if (max === 1) {
                btnSub1Attr.disabled = 'disabled';
                btnSubPageAttr.disabled = 'disabled';
            } else {
                btnSub1Attr.onClick = () => {
                    overlayRef.current.doMarkerAction(action, {no: -1, start});
                };
                btnSubPageAttr.onClick = () => {
                    overlayRef.current.doMarkerAction(action, {no: -addPage, start});
                }
            }
        }
        const jumpBtn =  <button {...btnJumpAttr}><i style={jumpStyle} className={materialCls.join(' ')}>{jumpChar}</i></button>;
        const br = vertical ? '' : <br />;
        const shiftBr = props.shift ? br : '';

        return (
            <div>{
                resizeable &&
                    <Fragment>
                        <button {...btnSubPageAttr}>--</button>{br}
                        <button {...btnSub1Attr}>-</button>{br}
                    </Fragment>
            }
            {shiftBtn}{shiftBr}
            {jumpBtn}
            {
                resizeable &&
                    <Fragment>
                        <button {...btnAdd1Attr}>+</button>{br}
                        <button {...btnAddPageAttr}>++</button>
                    </Fragment>
            }
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
                    renderOptions={renderOptions}
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
                        tracker={props.tracker}
                        editorId={props.editorId}
                        writeTransparent={writeTransparent}
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

function useOverlay(id) {
    const eContext = useContext(EditorContext);
    const overlay = useRef(null);
    const [updateState, setUpdateState] = useState(false);
    const updateRef = useRef(null);
    updateRef.current = updateState;

    useEffect(() => {
        overlay.current.updateState = () => {
            setUpdateState(!updateRef.current);
        };
    }, []);

    return [overlay, eContext];
}

/**
 *
 * @param props
 * @returns {*}
 * @constructor
 */
function BasicRasterView(props) {
    const context = useContext(CssContext);

    const defaults = props.defaults ? props.defaults : {};

    const [border, setBorder] = useState(defaults.border !== undefined ? defaults.border : 0);
    const [zoom, setZoom] = useState(defaults.zoom ? defaults.zoom : 1);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(defaults.width ? defaults.width : 1);
    const [height, setHeight] = useState(defaults.height ? defaults.height : 1);
    const [rulers, setRulers] = useState(defaults.rulers !== undefined ? defaults.rulers : false);
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(1);
    const [markerHeight, setMarkerHeight] = useState(1);
    const [markerType, setMarkerType] = useState('rect');
    const [markerSpaceX, setMarkerSpaceX] = useState(0);
    const [markerSpaceY, setMarkerSpaceY] = useState(0);
    const [renderOptions, setRenderOptions] = useState({caching: true, events: true});
    const [writeTransparent, setWriteTransparent] = useState(false);
    const resizeable = props.resizeable === true;
    const [overlay, eContext] = useOverlay(props.editorId);

    const maxWidth = props.cellProvider.getWidth();
    const maxHeight = props.cellProvider.getHeight();
    const maxZoom = 5;

    const mode = overlay.current && overlay.current.modeId !== null ? overlay.current.modeId : '?';
    const isSelectionMode = ['select', 'markerMove', 'markerResize'].indexOf(mode) !== -1;
    const isWriteMode = ['startPath', 'writePath'].indexOf(mode) !== -1;

    const bottomActions = [];
    const bottomTools = [];
    if (overlay.current && isWriteMode) {
        bottomActions.push(
            <Checkbox key="trans" name="Write opaque" value={writeTransparent} set={setWriteTransparent} />
        );
    }
    if (overlay.current && isSelectionMode && markerX !== null) {
        const selectionType = overlay.current.selectionType;
        const isGap = selectionType.endsWith('gap');

        bottomActions.push(
            <button key="goto" onClick={() => {overlay.current.doMarkerAction('goto')}} disabled={!overlay.current.canDoMarkerAction('goto')}>Goto</button>
        );
        if (!isGap) {
            bottomActions.push(
                <button key="clear" onClick={() => {overlay.current.doMarkerAction('clear')}} disabled={!overlay.current.canDoMarkerAction('clear')}>Clear</button>
            );
        }
        if (resizeable && (selectionType === 'rows' || selectionType === 'columns')) {
            bottomActions.push(
                <button key="delete" onClick={() => {overlay.current.doMarkerAction('delete')}} disabled={!overlay.current.canDoMarkerAction('delete')}>Delete</button>
            );
        }
        if (!isGap) {
            bottomActions.push(
                <button key="copy" onClick={() => {overlay.current.doMarkerAction('copy')}} disabled={!overlay.current.canDoMarkerAction('copy')}>Copy</button>
            );
            bottomActions.push(
                <button key="fill" onClick={() => {overlay.current.doMarkerAction('fill')}} disabled={!overlay.current.canDoMarkerAction('fill')}>Fill</button>
            );
            if (resizeable) {
                bottomActions.push(
                    <button key="crop" onClick={() => {overlay.current.doMarkerAction('crop')}} disabled={!overlay.current.canDoMarkerAction('crop')}>Crop</button>
                );
            }
        } else if (resizeable) {
            bottomActions.push(
                <button key="insert" onClick={() => {overlay.current.doMarkerAction('insert')}} disabled={!overlay.current.canDoMarkerAction('insert')}>+</button>
            );
            bottomActions.push(
                <button key="insertPage" onClick={() => {overlay.current.doMarkerAction('insert', 10)}} disabled={!overlay.current.canDoMarkerAction('insert')}>++</button>
            );
        }
        bottomActions.push(
            <button key="abort" onClick={() => {overlay.current.doMarkerAction('abort')}} disabled={!overlay.current.canDoMarkerAction('abort')}>X</button>
        );

        if (selectionType === 'rect') {
            bottomTools.push(
                <Dim key="pos" name="Position:" buttons x={markerX} setX={setMarkerX}
                     y={markerY} setY={setMarkerY} maxX={maxWidth - markerWidth}
                     maxY={maxHeight - markerHeight} min="0"
                     readOnly
                />
            );
            bottomTools.push(
                <Dim key="size" name="Size:" buttons
                     x={markerWidth} setX={setMarkerWidth}
                     y={markerHeight} setY={setMarkerHeight}
                     maxX={maxWidth - markerX} maxY={maxHeight - markerY} min="1"
                     readOnly
                />
            );
        }
        if (['columns', 'rows'].indexOf(selectionType) !== -1) {
            bottomTools.push(
                <Int key="pos" name="Position:" buttons min="0"
                     value={selectionType === 'rows' ? markerY : markerX}
                     set={selectionType === 'rows' ? setMarkerY : setMarkerX}
                     max={selectionType === 'rows' ? maxHeight - markerHeight : maxWidth - markerWidth}
                />
            );
            bottomTools.push(
                <Int key="size" name={selectionType === 'rows' ? 'Rows:' : 'Columns'} buttons min="1"
                     value={selectionType === 'rows' ? markerHeight : markerWidth}
                     set={selectionType === 'rows' ? setMarkerHeight : setMarkerWidth}
                     max={selectionType === 'rows' ? maxHeight - markerY : maxWidth - markerX}
                />
            );
        }
        if (isGap) {
            bottomTools.push(
                <Int key="pos" name="Position:" buttons min="0"
                     value={selectionType === 'row-gap' ? markerY : markerX}
                     set={selectionType === 'row-gap' ? setMarkerY : setMarkerX}
                     max={selectionType === 'row-gap' ? maxHeight - markerHeight : maxWidth - markerWidth}
                />
            );
        }
    }

    let modeInfo = mode;
    if (isSelectionMode) {
        modeInfo = 'Select ' + overlay.current.selectionType;
    } else if (isWriteMode) {
        modeInfo = 'Write'
    }
    const bottomToolbar =
        <Toolbar>
            <div>Mode: {modeInfo}</div>
            {bottomTools}
            {bottomActions}
        </Toolbar>;

    const undoAttr = {
        onClick: () => {
            eContext.undoAction()
        }
    };
    if (!eContext.hasPast()) {
        undoAttr.disabled = 'disabled'
    }
    const redoAttr = {
        onClick: () => {
            eContext.redoAction();
        }
    };
    if (!eContext.hasFuture()) {
        redoAttr.disabled = 'disabled'
    }
    const gapButtons = resizeable ?
        <Fragment>
            <SwitchButton enabled={isSelectionMode && overlay.current.selectionType === 'row-gap'} switch={(enabled) => selectMode(enabled, 'row-gap')}>Row Gap</SwitchButton>
            <SwitchButton enabled={isSelectionMode && overlay.current.selectionType === 'column-gap'} switch={(enabled) => selectMode(enabled, 'column-gap')}>Column Gap</SwitchButton>
        </Fragment> : '';

    const selectMode = (enabled, type) => {
        overlay.current.setMode(
            enabled ? 'select' : 'startPath',
            enabled ? {type} : undefined
        );
    };
    const posSize =
        <Fragment>
            <Dim name="Size:" x={maxWidth} y={maxHeight} readOnly/>
            <Dim name="Position:" buttons x={posX} setX={setPosX} y={posY} setY={setPosY}
                 maxX={maxWidth - width} maxY={maxHeight - height} min="0" readOnly/>
        </Fragment>;
    const zoomInput =
        <Int name="Zoom:" readOnly min="1" max={maxZoom} set={setZoom} value={zoom} buttons/>;

    const topToolbar = <Toolbar>
        <div>
            <button {...undoAttr}>Undo</button>
            <button {...redoAttr}>Redo</button>
        </div>
        <Stack dir="x">
            <SwitchButton enabled={mode === 'pick'} switch={(enabled) => {overlay.current.setMode(enabled ? 'pick' : 'startPath')}}>Pick</SwitchButton>
            <SwitchButton enabled={false} switch={() => overlay.current.setMode('select', {type: 'rect', all: true})}>All</SwitchButton>
            <SwitchButton enabled={isSelectionMode && overlay.current.selectionType === 'rect'} switch={(enabled) => {selectMode(enabled, 'rect')}}>Rect</SwitchButton>
            <SwitchButton enabled={isSelectionMode && overlay.current.selectionType === 'rows'} switch={(enabled) => {selectMode(enabled, 'rows')}}>Rows</SwitchButton>
            <SwitchButton enabled={isSelectionMode && overlay.current.selectionType === 'columns'} switch={(enabled) => {selectMode(enabled, 'columns')}}>Columns</SwitchButton>
            {gapButtons}
        </Stack>
        {posSize}
        {zoomInput}
        <Int name="Border:" readOnly min="0" max="5" set={setBorder} value={border} buttons />
        <Checkbox name="Rulers" value={rulers} set={setRulers} />
        <Stack dir="x">
            <Int name="Background:" readOnly min="0" max="26" set={context.setBgOpacity} value={context.bgOpacity} buttons />
            <Color value={context.bgColor} set={(value) => {context.setBgColor(value)}} />
        </Stack>
    </Toolbar>;

    return (
        <Stack dir="y" border full>
            {topToolbar}
            <div className="flex items-centered align-center full-v">
                <RasterViewGrid
                    auto
                    shift
                    resizeable={resizeable}
                    renderOptions={renderOptions}
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
                    tracker={props.tracker}
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
            {bottomToolbar}
        </Stack>
    );
}

function BitmapEditor(props) {

    const cellProvider = useMemo(() => {
        return new BitmapCellProvider(4,
            props.bitmap
        );
    }, []);

    const ready = useMountedReadyCellProvider(cellProvider);

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

    if (!ready) {
        return '';
    }

    return (
        <EditorCtx>
            <Stack dir="y" border full>
                <Stack dir="x" border full>
                    <div className="">Palette goes here</div>
                    <div className="flex full-v">
                        <BasicRasterView
                            editorId="bitmap"
                            cellProvider={cellProvider}
                            defaults={{zoom: 5, border: 1, resizeable: false, width: cellProvider.getWidth(), height: cellProvider.getHeight()}}
                        />
                    </div>
                </Stack>
                {buttonDiv}
            </Stack>
        </EditorCtx>
    )
}

function useEditorContextPart(id) {
    const eContext = useContext(EditorContext);
    const updateRef = useRef(null);
    const [update, setUpdate] = useState(false);
    updateRef.current = update;

    useEffect(() => {
        if (!id) {
            return;
        }
        eContext.mountRaster(id);
        eContext.setRasterUpdate(id, () => {
            setUpdate(!updateRef.current);
        });
        return () => {
            eContext.unmountRaster(id);
        }
    }, []);

    return eContext;
}

export {
    CellMarker,
    RasterCanvas,
    EditorContext,
    EditorCtx,
    BasicRasterView,
    CellProviderRaster,
    useEditorContextPart,
    BitmapEditor,
    BaseCellProviderIndexRaster,
    useMountedReadyCellProvider
}