import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {Block, DIR, Overlay, Overlays} from "./LayoutComponents";
import {
    AvailContext,
    AvailContextProvider,
    CssContext,
    Canvas,
    ScrollArea,
    WindowContext,
    EditorContext
} from "./BasicComponents";
import { d, clamp } from "../helper/helper";

function GridMarkerOverlay({ markerType, markerX, markerY, posX, posY, markerWidth, markerHeight, width, height, onDoubleClick, onMove, onResize, autoMatrix }) {
    const gContext = useContext(GridContext);

    let offX;
    let offY;

    const checkX = !markerType.startsWith('row');
    const checkY = !markerType.startsWith('column');

    const isGap = markerType.endsWith('gap');

    const maxMarkerX = markerX + markerWidth - 1;
    const maxMarkerY = markerY + markerHeight - 1;
    let maxPosX = posX + width;
    let maxPosY = posY + height;
    if (!isGap) {
        maxPosX--;
        maxPosY--;
    }
    const visibleX = !checkX || (posX <= maxMarkerX && maxPosX >= markerX);
    const visibleY = !checkY || (posY <= maxMarkerY && maxPosY >= markerY);

    if (!(visibleX || visibleY)) {
        return '';
    }

    let hasTop = (checkY && posY <= markerY && maxPosY >= markerY && !isGap);
    let hasBottom = (checkY && posY <= maxMarkerY && maxPosY >= maxMarkerY && !isGap);
    let hasLeft = (checkX && posX <= markerX && maxPosX >= markerX && !isGap);
    let hasRight = (checkX && posX <= maxMarkerX && maxPosX >= maxMarkerX && !isGap);

    offX = checkX ? Math.max(markerX, posX) - posX : 0;
    offY = checkY ? Math.max(markerY, posY) - posY : 0;

    let maxOffX = Math.min(maxMarkerX, maxPosX) - posX;
    let maxOffY = Math.min(maxMarkerY, maxPosY) - posY;
    markerWidth = checkX ? maxOffX - offX + 1 : width;
    markerHeight = checkY ? maxOffY - offY + 1 : height;

    if (markerWidth < 1 || markerHeight < 1) {
        return '';
    }
    return (
        <Overlay width={gContext.dimX} height={gContext.dimY} className="no-events">
            <GridCellMarker
                highlight={true}
                blink
                matrix={null}
                sizeX={gContext.sizeX}
                sizeY={gContext.sizeY}
                border={gContext.border}
                zoom={gContext.zoom}
                type={markerType}
                posX={offX}
                posY={offY}
                pointer={null}
                width={markerWidth}
                height={markerHeight}
                onMove={onMove}
                onResize={onResize}
                onDoubleClick={onDoubleClick}
                autoMatrix={autoMatrix}
                dir={
                    (hasRight ? DIR.RIGHT : 0) |
                    (hasLeft ? DIR.LEFT : 0) |
                    (hasBottom ? DIR.BOTTOM : 0) |
                    (hasTop ? DIR.TOP : 0)
                }
            />
        </Overlay>
    )
}

function GridCursorOverlay({
           cursorType, cursorWidth = 1, cursorHeight = 1, cursorPointer,
           posX, posY, width, height, gridWidth, gridHeight,
           fixed, valid, matrix, inclusion, highlight,
           onMouseDown, onDoubleClick
       }) {

    const gContext = useContext(GridContext);

    const divRef = useRef(null);
    const [offX, setOffX] = useState(null);
    const [offY, setOffY] = useState(null);

    let marker;
    const markerType = cursorType;

    const isGap = markerType.endsWith('gap');

    if (offX !== null) {

        let hasTop = true;
        let hasBottom = true;
        let hasLeft = true;
        let hasRight = true;

        let markerWidth = markerType.startsWith('row') ? width : Math.min(cursorWidth, width - offX);
        let markerHeight = markerType.startsWith('column') ? height : Math.min(cursorHeight, height - offY);

        if (markerType === 'row-gap') {
            markerHeight = 1;
        } else if (markerType === 'column-gap') {
            markerWidth = 1;
        }

        switch (markerType) {
            case 'rect':
                hasBottom = (offY + cursorHeight <= height);
                hasRight = (offX + cursorWidth <= width);
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

        const onClick = e => {
            if (!onMouseDown) {
                return;
            }
            const offset = getOffsetPos(e);
            e.stopPropagation();
            e.preventDefault();
            return onMouseDown(e, posX + offset.x, posY + offset.y, 1, 1);
        };

        if (!(inclusion &&
            (posY + offY > gridHeight - cursorHeight ||
                posX + offX > gridWidth - cursorWidth
            ))
        )  {
            marker = <GridCellMarker
                blink
                cursor="crosshair"
                onMouseDown={onClick}
                matrix={matrix}
                sizeX={gContext.sizeX}
                sizeY={gContext.sizeY}
                border={gContext.border}
                zoom={gContext.zoom}
                type={markerType}
                highlight={highlight}
                posX={offX}
                posY={offY}
                pointer={cursorPointer}
                width={markerWidth}
                height={markerHeight}
                dir={
                    (hasRight ? DIR.RIGHT : 0) |
                    (hasLeft ? DIR.LEFT : 0) |
                    (hasBottom ? DIR.BOTTOM : 0) |
                    (hasTop ? DIR.TOP : 0)
                }
            />;
        }
    }

    const adjustPosX = isGap ? gContext.cellSizeX >> 1 : 0;
    let maxPosX = width;
    const adjustPosY = isGap ? gContext.cellSizeY >> 1 : 0;
    let maxPosY = height;
    if (isGap) {
        maxPosX++;
        maxPosY++;
    }

    const getOffsetPos = e => {
        const rect = divRef.current.getBoundingClientRect();
        let relX = Math.floor((e.clientX - rect.x + adjustPosX) / gContext.cellPlusBorderSizeX);
        let reset = (relX < 0 || relX >= maxPosX);

        let relY = Math.floor((e.clientY - rect.y + adjustPosY)/ gContext.cellPlusBorderSizeY);
        if (inclusion) {
            const overSizeX = (posX + relX + cursorWidth) - gridWidth;
            if (overSizeX > 0) {
                relX -= overSizeX;
            }
            const overSizeY = (posY + relY + cursorHeight) - gridHeight;
            if (overSizeY > 0) {
                relY -= overSizeY;
            }
        }
        // TODO wieso nur der Check auf Y?
        reset = reset || (relY < 0 || relY >= maxPosY);

        if (reset) {
            return false;
        }
        if (markerType.startsWith('column')) {
            relY = 0;
        } else if (markerType.startsWith('row')) {
            relX = 0;
        }
        return {
            x: relX,
            y: relY
        };
    };

    const onMouseMove = (e) => {
        if (!fixed) {
            const offset = getOffsetPos(e);
            if (offset === false || valid && !valid(posX + offset.x, posY + offset.y)) {
                /*
                if (props.mouseTrack) {
                    props.mouseTrack(null, null);
                }
                 */
                setOffX(null);
                setOffY(null);
            } else if (offX !== offset.x || offY !== offset.y) {
                /*
                if (props.mouseTrack) {
                    props.mouseTrack(props.posX + offset.x, props.posY + offset.y);
                }
                 */
                setOffX(offset.x);
                setOffY(offset.y);
            }
        }
        e.stopPropagation();
        e.preventDefault();
    };

    const onMouseLeave = (e) => {
        /*
        if (props.mouseTrack) {
            props.mouseTrack(null, null);
        }
         */
        setOffX(null);
        setOffY(null);
        e.stopPropagation();
        e.preventDefault();
    };

    onDoubleClick = onDoubleClick ? e => {
        const offset = getOffsetPos(e);
        onDoubleClick(e, offset.x, offset.y);
        e.stopPropagation();
        e.preventDefault();
    } : null;

    return (

        <Overlay
            width={gContext.dimX} height={gContext.dimY}
             ref={divRef}
             onMouseMove={onMouseMove}
             onMouseLeave={onMouseLeave}
             onDoubleClick={onDoubleClick}
        >
            {marker}
        </Overlay>
    );
}

function CellGrid({ gridProvider, cellType, posX, posY, width, height, border, zoom, ...props }) {
    const gContext = useContext(GridContext);

    const gridRef = useRef(null);
    const propsRef = useRef(null);
    propsRef.current = {
        posX,
        posY,
        width,
        height,
        border,
        zoom,
        dimX: gContext.dimX,
        dimY: gContext.dimY
    };

    const render = useMemo(
        () => {
            return (
                cellType.hasText() ?
                    (x, y) => {
                        return props.render(posX + x, posY + y);
                    } :
                    ctx => {
                        const {posX, posY, width, height, border, zoom, dimX, dimY} = propsRef.current;
                        ctx.clearRect(0, 0, dimX, dimY);
                        gridProvider.drawGrid(ctx, posX, posY, width, height, border, zoom, null /* players */);
                    }
            )
        },
        [gridProvider, props.render]
    );

    useEffect(() => {
        gContext.boundingRectRef.current = gridRef.current.getBoundingClientRect();
        return () => {
            gContext.boundingRectRef.current = null;
        }
    });

    return (
        <Overlay ref={gridRef}>
            <Canvas render={render} width={gContext.dimX} height={gContext.dimY} />
        </Overlay>
    )
}

class AutoScroll {

    constructor(propsRef, callback) {
        this.id = null;
        this.propsRef = propsRef;
        this.x = null;
        this.y = null;
        this.callback = callback;

        this.maxX = propsRef.current.gridWidth;
        this.maxY = propsRef.current.gridHeight;
/*
        if (propsRef.current.markerType.endsWith('gap')) {
            this.maxX++;
            this.maxY++;
        }

 */
    }

    init() {
        this.id = setTimeout(
            () => this.handle(), 100
        );
    }

    reset() {
        if (this.id) {
            clearTimeout(this.id);
            this.id = null;
        }
        this.x = null;
        this.y = null;
    }

    handle() {
        if (!this.id || !(this.x || this.y)) {
            this.id = null;
            return
        }
        const props = this.propsRef.current;
        let deltaX = 0;
        if (this.x) {
            const newPosX = clamp(0, props.posX + this.x, this.maxX - props.width);
            if (newPosX !== props.posX) {
                deltaX = newPosX - props.posX;
                props.setPosX(newPosX);

            }
        }
        let deltaY = 0;
        if (this.y) {
            const newPosY = clamp(0, props.posY + this.y, this.maxY - props.height);
            if (newPosY !== props.posY) {
                deltaY = newPosY - props.posY;
                props.setPosY(newPosY);
            }
        }
        if (this.callback) {
            this.callback(props, deltaX, deltaY);
        }
        this.init();
    }

    check(pos) {
        const props = this.propsRef.current;
        this.x = (pos.rawX < 0 || pos.rawX >= props.width) ?
            (pos.rawX < 0 ? pos.rawX : pos.rawX - props.width + 1) : null;
        //const scrollY = autoScrollMarker === null || autoScrollMarker.resizeY;
        this.y = (/*scrollY &&*/ pos.rawY < 0 || pos.rawY >= props.height) ?
            (pos.rawY < 0 ? pos.rawY : pos.rawY - props.height + 1) : null;

        if (this.x || this.y) {
            if (!this.id) {
                this.init();
            }
        } else {
            this.id = null;
        }
    }
}

function setMarkerResizeChanges(axis, change, dist, attr) {
    const dim = attr[axis];
    const anchorPos = attr.anchorPos[axis];
    const markerGap = dim.gap;
    const baseSize = dim.base;
    const baseAndGapSize = markerGap + baseSize;

    const posKey = dim.markerPos;
    let reset = false;
    let lower = baseAndGapSize > 1 ? -1 : 0;

    if (lower <= dist && dist <= baseSize) {
        change[dim.markerSize] = baseSize;
        change[posKey] = anchorPos;
    } else if (dist > baseSize) {
        change[dim.markerSize] = markerGap > 0 ?
            baseSize + Math.ceil((dist - baseSize) / baseAndGapSize) * baseAndGapSize :
            Math.ceil(dist / baseSize) * baseSize;
        change[posKey] = anchorPos;
        reset = (change[posKey] + change[dim.markerSize]) > dim.size;
    } else {
        change[dim.markerSize] =
            baseSize + Math.ceil(Math.abs(dist) / baseAndGapSize) * baseAndGapSize;
        change[posKey] = anchorPos - change[dim.markerSize] + baseSize;
    }
    if (change[posKey] < 0) {
        change[dim.markerSize] = Math.floor(anchorPos / baseAndGapSize) * baseAndGapSize;
        change[posKey] = anchorPos - change[dim.markerSize];
        change[dim.markerSize] += baseSize;
    } else if (reset || change[posKey] >= dim.size) {
        change[dim.markerSize] = Math.floor(dim.size - (anchorPos + baseSize)/baseAndGapSize) * baseAndGapSize + baseSize;
        change[posKey] = anchorPos;
    }
    if (reset) {
        change[posKey] = undefined;
        change[dim.markerSize] = undefined;
    }
}

const GridContext = React.createContext();

function FlexGridInner({
            gridProvider, cellType, gridWidth, gridHeight,
            width, setWidth, height, setHeight,
            border, zoom, rulers, selection,
            posX, setPosX, posY, setPosY,
            markerX, markerY, markerType = 'rect', markerWidth, markerHeight,
            setMarkerX, setMarkerY, setMarkerType, setMarkerWidth, setMarkerHeight,
            markerGapX, markerGapY,
            onDoubleClick
        }) {

    const aContext = useContext(AvailContext);
    const cssContext = useContext(CssContext);
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const cursorType = markerType;
    const cursorWidth = 1;
    const cursorHeight = 1;
    let trackX = true;
    let trackY = true;
    if (cursorType !== 'rect') {
        if (cursorType.startsWith('column')) {
            trackY = false;
        } else if (cursorType.startsWith('row')) {
            trackX = false;
        }
    }
    let autoMatrix = null;
    if (selection.fixed) {
        autoMatrix = {
            gapX: markerGapX,
            gapY: markerGapY,
            markerWidth,
            markerHeight,
            width: selection.width,
            height: selection.height,
            offStartX: Math.max(posX - markerX, 0),
            offEndX: Math.max(markerX + markerWidth - (posX + width), 0),
            offStartY: Math.max(posY - markerY, 0),
            offEndY: Math.max(markerY + markerHeight - (posY + height), 0)
        };
    }

    const propsRef = useRef(null);
    propsRef.current = {
        gridWidth, gridHeight, width, height, posX, setPosX, posY, setPosY,
        markerX, setMarkerX, markerY, setMarkerY, markerWidth, markerHeight,
        markerGapX, markerGapY
    };

    const setState = useMemo(
        () =>
            change => {
                d(change);
                const props = propsRef.current;
                if (change.markerType !== undefined && change.markerType !== props.markerType) {
                    d('-> markerType', change.markerType, props.markerType);
                    setMarkerType(change.markerType);
                } else {
                    change.markerType = props.markerType;
                }
                if (change.markerHeight !== undefined && change.markerHeight !== props.markerHeight) {
                    d('-> markerHeight', change.markerHeight, props.markerHeight);
                    setMarkerHeight(change.markerHeight);
                } else {
                    change.markerHeight = props.markerHeight;
                }
                if (change.markerWidth !== undefined && change.markerWidth !== props.markerWidth) {
                    d('-> markerWidth', change.markerWidth, props.markerWidth);
                    setMarkerWidth(change.markerWidth);
                } else {
                    change.markerWidth = props.markerWidth;
                }
                if (change.markerX !== undefined && change.markerX !== props.markerX) {
                    d('-> markerX', change.markerX, props.markerX);
                    setMarkerX(change.markerX);
                } else {
                    change.markerX = props.markerX;
                }
                if (change.markerY !== undefined && change.markerY !== props.markerY) {
                    d('-> markerY', change.markerY, props.markerY);
                    setMarkerY(change.markerY);
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
                    setPosY(change.posY);
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
                        setMarkerX(Math.max(change.markerX + change.added, 0));
                        if (isGap) {
                            if (change.markerX + change.added < 0) {
                                reset = true;
                            }
                        } else {
                            const markerWidth = change.markerWidth + Math.min(change.markerX + change.added, 0);
                            if (markerWidth <= 0) {
                                reset = true;
                            } else {
                                setMarkerWidth(markerWidth);
                            }
                        }
                    } else if (change.added < 0) {
                        const newWidth = props.gridWidth;
                        if (isGap) {
                            if (newWidth < change.markerX) {
                                reset = true;
                            }
                        } else {
                            if ((change.markerX + change.markerWidth) > newWidth) {
                                if (newWidth <= change.markerX) {
                                    reset = true;
                                } else {
                                    setMarkerWidth(newWidth - change.markerX);
                                }
                            }
                        }
                    }
                }

                if (checkY) {
                    if (change.start) {
                        setMarkerY(Math.max(change.markerY + change.added, 0));
                        if (isGap) {
                            if (change.markerY + change.added < 0) {
                                reset = true;
                            }
                        } else {
                            const markerHeight = change.markerHeight + Math.min(change.markerY + change.added, 0);
                            if (markerHeight <= 0) {
                                reset = true;
                            } else {
                                setMarkerHeight(markerHeight);
                            }
                        }
                    } else if (change.added < 0) {
                        const newHeight = props.gridHeight;
                        if (isGap) {
                            if (newHeight < change.markerY) {
                                reset = true;
                            }
                        } else {
                            if ((change.markerY + change.markerHeight) > newHeight) {
                                if (newHeight <= change.markerY) {
                                    reset = true;
                                } else {
                                    setMarkerHeight(newHeight - change.markerY);
                                }
                            }
                        }
                    }
                }

                if (reset) {
                    setMarkerX(null);
                    setMarkerY(null);
                }
        },
        []
    );

    const value = useMemo(() => {
        const sizeX = gridProvider.getCellSizeX();
        const sizeY = gridProvider.getCellSizeY();
        const cellSizeX = zoom * sizeX;
        const cellSizeY = zoom * sizeY;

        const cellPlusBorderSizeX = cellSizeX + border;
        const cellPlusBorderSizeY = cellSizeY + border;

        let spaceX = aContext.width - border - 2 * cssContext.values.defaultPadding -
            (rulers ? 38 : 0);
        let spaceY = aContext.height - border - 2 * cssContext.values.defaultPadding -
            (rulers ? 22 : 0);

        let maxPageX = Math.min(gridWidth, Math.floor(spaceX / cellPlusBorderSizeX));
        let maxPageY = Math.min(gridHeight, Math.floor(spaceY / cellPlusBorderSizeY));

        if (maxPageX < gridWidth) {
            spaceY -= 21 // scrollbarHeight;
        }
        if (maxPageY < gridHeight) {
            spaceX -= 21 // scrollbarWidth;
        }

        maxPageX = Math.floor(spaceX / cellPlusBorderSizeX);
        maxPageY = Math.floor(spaceY / cellPlusBorderSizeY);

        return {
            border,
            zoom,
            sizeX,
            sizeY,
            cellSizeX,
            cellSizeY,
            cellPlusBorderSizeX,
            cellPlusBorderSizeY,
            spaceX,
            spaceY,
            maxPageX,
            maxPageY,
            boundingRectRef: {current: null}
        }
    }, [zoom, border, gridWidth, gridHeight, rulers, aContext.width, aContext.height]);
    if (aContext.width === 0 || aContext.height === 0) return '';

    const maxPosX = gridWidth - value.maxPageX;
    const maxPosY = gridHeight - value.maxPageY;

    if (posX > maxPosX) setPosX(maxPosX);
    if (posY > maxPosY) setPosY(maxPosY);


    if (value.maxPageX !== width) {
        setWidth(value.maxPageX);
        width = value.maxPageX
    }
    if (value.maxPageY != height) {
        setHeight(value.maxPageY);
        height = value.maxPageY
    }
    value.dimX = width * value.cellPlusBorderSizeX + border;
    value.dimY = height * value.cellPlusBorderSizeY + border;

    const setMarker = (e, x, y) => {
        wContext.startExclusiveMode('set-marker');
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('set-marker')
        }, {once: true});
        eContext.setSelection(gridProvider.getSelection(x, y, selection.width, selection.height));
        setMarkerX(x);
        setMarkerY(y);
        setMarkerWidth(selection.width);
        setMarkerHeight(selection.height)
    };

    const getGridPosFromEvent = (e, outside = false, isGap = false) => {
        return getGridPosFromClient({x: e.clientX, y: e.clientY}, outside, isGap);
    };

    const getGridPosFromClient = (client, outside = false, isGap = false) => {
        const rect = value.boundingRectRef.current;
        if (!rect) return null;

        const adjustPosX = isGap ? value.cellPlusBorderSizeX >> 1 : 0;
        const adjustPosY = isGap ? value.cellPlusBorderSizeY >> 1 : 0;
        const rasterPos = {
            x: Math.floor(Math.round(client.x - rect.left + adjustPosX)/value.cellPlusBorderSizeX),
            y: Math.floor(Math.round(client.y - rect.top + adjustPosY)/value.cellPlusBorderSizeY),
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

    const moveMarker = e => {
        const pos = getGridPosFromEvent(e);
        let lastX = pos.x;
        let lastY = pos.y;
        const grabX = pos.x - (markerX - posX);
        const grabY = pos.y - (markerY - posY);

        const autoScroll = new AutoScroll(propsRef, (props, x, y) => {
            let newMarkerX = clamp(0, props.markerX + x, gridWidth - markerWidth);
            if (props.markerX !== newMarkerX) {
                setMarkerX(newMarkerX);
            }
            const newMarkerY = clamp(0, props.markerY + y, gridHeight - markerHeight);
            if (props.markerY !== newMarkerY) {
                setMarkerY(newMarkerY);
            }
        });

        wContext.startExclusiveMode('marker-move', 'grabbing');
        wContext.addEventListener('mousemove', e => {
            const pos = getGridPosFromEvent(e);
            const props = propsRef.current;

            const checkX = pos.x !== lastX;
            if (checkX) {
                const newMarkerX = clamp(0, props.posX + pos.x - grabX, gridWidth - markerWidth);
                if (propsRef.markerX !== newMarkerX) {
                    setMarkerX(newMarkerX);
                }
                lastX = pos.x;
            }
            const checkY = pos.y !== lastY;
            if (checkY) {
                const newMarkerY = clamp(0, props.posY + pos.y - grabY, gridHeight - markerHeight);
                if (propsRef.markerY !== newMarkerY) {
                    setMarkerY(newMarkerY);
                }
                lastY = pos.y;
            }
            autoScroll.check(pos);
        });
        wContext.addEventListener('mouseup', e => {
            wContext.endExclusiveMode('marker-move');
            const props = propsRef.current;
            eContext.setSelection(gridProvider.getSelection(props.markerX, props.markerY, props.markerWidth, props.markerHeight));
            autoScroll.reset()
        }, {once: true})
    };

    const resizeMarker = (e, resize) => {
        const {startX, startY, cursor, axis} = resize;

        const baseWidth = selection.width;
        const baseHeight = selection.height;

        const anchorPos = {
            x: markerX + (!startX ? 0 : markerWidth - baseWidth),
            y: markerY + (!startY ? 0 : markerHeight - baseHeight)
        };
        const resizeX = trackX && axis.indexOf('x') !== -1;
        const resizeY = trackY && axis.indexOf('y') !== -1;

        let lastRasterPos = getGridPosFromEvent(e, true);

        const attr = {
            x: {
                markerSize: 'markerWidth',
                markerPos: 'markerX',
                gap: markerGapX,
                base: baseWidth,
                size: gridWidth
            },
            y: {
                markerSize: 'markerHeight',
                markerPos: 'markerY',
                gap: markerGapY,
                base: baseHeight,
                size: gridHeight
            },
            anchorPos,
            resizeX,
            resizeY
        };

        const autoScroll = new AutoScroll(propsRef, (props, x, y) => {
            const change = {};
            if (resizeX && x !== 0) {
                const posX =
                    clamp(0,props.posX + x, props.gridWidth - props.width);
                const anchorX = anchorPos.x;
                const anchorDistX = posX - anchorX + (x > 0 ? props.width : 0);
                setMarkerResizeChanges('x', change, anchorDistX, attr);
            }
            if (resizeY && y !== 0) {
                const posY =
                    clamp(0,props.posY + y, props.gridHeight - props.height);
                const anchorY = anchorPos.y;
                const anchorDistY = posY - anchorY + (y > 0 ? props.height : 0);
                setMarkerResizeChanges('y', change, anchorDistY, attr);
            }
            setState(change);
        });

        const checkWithLastRasterPos = e => {
            const props = propsRef.current;
            const newRasterPos = getGridPosFromEvent(e, true);
            autoScroll.check(newRasterPos);

            if (newRasterPos === null) {
                return;
            }

            // distFromAnchor (+ => right from anchor, - = left from anchor)
            const anchorDistX = newRasterPos.x + props.posX - anchorPos.x;
            const anchorDistY = newRasterPos.y + props.posY - anchorPos.y;

            const validX =
                (resizeX  // resizing in X dir allowed
                    && newRasterPos.x + 1 >= 0 // new rasterPos in Range [-1, ..., width]
                    && newRasterPos.x <= props.width
                );

            const validY = (resizeY && anchorDistY !== 0 && newRasterPos.y + 1  >= 0 && newRasterPos.y <= props.height);

            // rasterPos valid and has changed since last check?
            const hasChanged =
                (newRasterPos.x !== lastRasterPos.x || newRasterPos.y !== lastRasterPos.y) &&
                (validX || validY);

            if (hasChanged) {
                lastRasterPos = newRasterPos;
                const change = {};

                if (validX) {
                    setMarkerResizeChanges('x', change, anchorDistX, attr);
                }
                if (validY) {
                    setMarkerResizeChanges('y', change, anchorDistY, attr);
                }
                setState(change)
            }
        };

        wContext.startExclusiveMode('marker-resize', cursor);
        wContext.addEventListener('mousemove', e => {
            checkWithLastRasterPos(e);
            e.stopPropagation();
            e.preventDefault();
        });

        wContext.addEventListener('mouseup', e => {
            wContext.endExclusiveMode('marker-resize');
            autoScroll.reset();
            e.stopPropagation();
            e.preventDefault()
        }, {once: true});
    };
    return (
        <GridContext.Provider value={value}>
            <ScrollArea
                full
                x={posX} setX={setPosX} maxX={gridWidth} pageX={width}
                y={posY} setY={setPosY} maxY={gridHeight} pageY={height}
            >
                <Block full centerItems>
                    <Overlays originX={rulers ? 38 : 0} originY={rulers ? 22 : 0} width={value.dimX} height={value.dimY} className="overflow">
                        <CellGrid
                            posX={posX} posY={posY} width={width} height={height}
                            border={border} zoom={zoom} cellType={cellType}
                            gridProvider={gridProvider}
                        />
                        {rulers &&
                            <GridRulerH posX={posX} width={width} />
                        }
                        {rulers &&
                            <GridRulerV posY={posY} height={height} />
                        }
                        <GridCursorOverlay
                            posX={posX} posY={posY}
                            width={width} height={height}
                            cursorWidth={selection.width} cursorHeight={selection.height}
                            gridWidth={gridWidth} gridHeight={gridHeight}
                            onMouseDown={setMarker}
                            inclusion={true}
                            cursorType="rect"
                        />
                        {markerX !== null &&
                            <GridMarkerOverlay
                                posX={posX} posY={posY}
                                width={width} height={height}
                                onDoubleClick={onDoubleClick}
                                onMove={moveMarker}
                                onResize={resizeMarker}
                                autoMatrix={autoMatrix}
                                markerX={markerX} markerY={markerY}
                                markerWidth={markerWidth} markerHeight={markerHeight}
                                markerType="rect"
                            />
                        }
                    </Overlays>
                </Block>
            </ScrollArea>
        </GridContext.Provider>
    )
}

function FlexGrid(props) {
    return (
        <AvailContextProvider>
            <FlexGridInner {...props} />
        </AvailContextProvider>
    );
}

function GridCellMarker({ dir = DIR.ALL, type, cursor, posX, posY, sizeX = 1, sizeY = 1, highlight, onClick, onResize, onMove, onMouseDown, onDoubleClick, zoom = 1, border = 0, width = 1, height = 1, moveCursor, autoMatrix, ...props }) {
    if (posX === null || posY === null) {
        return '';
    }
    sizeX = sizeX * zoom;
    sizeY = sizeY * zoom;

    const hasResize = onResize && !onClick;
    const hasMove = !!onMove;

    const overhang = 8;

    const offset = {
        top: border + (sizeY + border) * posY  - overhang,
        left: border + (sizeX + border) * posX - overhang,
        width: 'min-content',
        height: 'min-content'
    };
    if (cursor) {
        offset.cursor = cursor
    }
    if (type === 'row-gap') {
        const baseline = Math.round(border / 2) + posY * (sizeY + border) - overhang;
        offset.top =  baseline - overhang - border;
        offset.left = -overhang;
    } else if (type === 'column-gap') {
        const baseline = Math.round(border / 2) + posX * (sizeX + border) - overhang;
        offset.left =  baseline - overhang - border;
        offset.top = -overhang;
    }
    const centerStyle = {
        width: (type === 'column-gap' ? 2 * overhang  : sizeX * width + (width - 1) * border),
        height: (type === 'row-gap' ? 2 * overhang : sizeY * height + (height - 1) * border)
    };

    const markerCls = 'marker-cell' + (highlight ? '-highlight' : '');
    const cls = ['marker-grid'];

    const clsCenter = [];
    if (['rows', 'columns', 'row-gap', 'column-gap'].indexOf(type) !== -1) {
        clsCenter.push(markerCls);
    }
    let centerClickHandler = null;
    /*
        if (pointer) {
            clsCenter.push('cursor-' + pointer);
        }

     */
    if (hasMove) {
        centerStyle.cursor = moveCursor ? moveCursor : 'grab';
        centerClickHandler = e => {
            onMove(e);
        }
    }

    const clsRight = [];
    let rightClickHandler = null;
    if (DIR.RIGHT & dir) {
        clsRight.push(markerCls);
        if (hasResize) {
            clsRight.push('cursor-hresize');
            rightClickHandler  = e => {
                onResize(e, {axis: 'x', cursor: 'ew-resize', startX: false});
            };
        }
    }
    const clsTopLeft = [];
    let topLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.TOP & dir)) {
        clsTopLeft.push(markerCls);
        if (hasResize) {
            clsTopLeft.push('cursor-nwseresize');
            topLeftClickHandler  = e => {
                onResize(e, {axis: 'xy', cursor: 'nwse-resize', startX: true, startY: true});
            };
        }
    }
    const clsTopRight = [];
    let topRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.TOP & dir)) {
        clsTopRight.push(markerCls);
        if (hasResize) {
            clsTopRight.push('cursor-neswresize');
            topRightClickHandler  = e => {
                onResize(e, {axis: 'xy', cursor: 'nesw-resize', startX: false, startY: true});
            };
        }
    }
    const clsLeft = [];
    let leftClickHandler = null;
    if (DIR.LEFT & dir) {
        clsLeft.push(markerCls);
        if (hasResize) {
            clsLeft.push('cursor-hresize');
            leftClickHandler  = e => {
                onResize(e, {axis: 'x', cursor: 'ew-resize', startX: true});
            };
        }
    }
    const clsTop = [];
    let topClickHandler = null;
    if (DIR.TOP & dir) {
        clsTop.push(markerCls);
        if (hasResize) {
            clsTop.push('cursor-vresize');
            topClickHandler  = e => {
                onResize(e, {axis: 'y', cursor: 'ns-resize', startX: null, startY: true});
            };
        }
    }
    const clsBottom = [];
    let bottomClickHandler = null;
    if (DIR.BOTTOM & dir) {
        clsBottom.push(markerCls);
        if (hasResize) {
            clsBottom.push('cursor-vresize');
            bottomClickHandler  = e => {
                onResize(e, {axis: 'y', cursor: 'ns-resize', startX: null, startY: false});
            };
        }
    }
    const clsBottomLeft = [];
    let bottomLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomLeft.push(markerCls);
        if (hasResize) {
            clsBottomLeft.push('cursor-neswresize');
            bottomLeftClickHandler  = e => {
                onResize(e, {axis: 'xy', cursor: 'nesw-resize', startX: true, startY: false});
            };
        }
    }
    const clsBottomRight = [];
    let bottomRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomRight.push(markerCls);
        if (hasResize) {
            clsBottomRight.push('cursor-nwseresize');
            bottomRightClickHandler  = e => {
                onResize(e, {axis: 'xy', cursor: 'nwse-resize', startX: false, startY: false});
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
    if (onDoubleClick) {
        divAttr.onDoubleClick = onDoubleClick;
    } else if (onClick) {
        divAttr.onClick = onClick;
    } else if (onMouseDown) {
        divAttr.onMouseDown = onMouseDown;
    }
    let matrix = '';
    if (autoMatrix) {

        const offStartX = autoMatrix.offStartX;
        const offEndX = autoMatrix.offEndX;

        const sizeAndGapX = autoMatrix.width + autoMatrix.gapX;
        const modOffStartX = offStartX % sizeAndGapX;
        const modOffEndX = offEndX % sizeAndGapX;
        const segStartX = Math.floor((offStartX + autoMatrix.gapX) / sizeAndGapX);

        const margStartX = modOffStartX < autoMatrix.width ? 0 : sizeAndGapX - (offStartX % sizeAndGapX);

        const segmentsX = (autoMatrix.markerWidth + autoMatrix.gapX) / sizeAndGapX;
        const segEndX = (segmentsX - 1) - Math.max(0, Math.floor((offEndX + autoMatrix.gapX) / sizeAndGapX));

        const hiddenEndX = modOffEndX >= autoMatrix.width ? 0 : modOffEndX;

        const offStartY = autoMatrix.offStartY;
        const offEndY = autoMatrix.offEndY;

        const sizeAndGapY = autoMatrix.height + autoMatrix.gapY;
        const modOffStartY = offStartY % sizeAndGapY;
        const modOffEndY = offEndY % sizeAndGapY;
        const segStartY = Math.floor((offStartY + autoMatrix.gapY) / sizeAndGapY);

        const margStartY = modOffStartY < autoMatrix.height ? 0 : sizeAndGapY - (offStartY % sizeAndGapY);

        const segmentsY = (autoMatrix.markerHeight + autoMatrix.gapY) / sizeAndGapY;
        const segEndY = (segmentsY - 1) - Math.max(0, Math.floor((offEndY + autoMatrix.gapY) / sizeAndGapY));

        const hiddenEndY = modOffEndY >= autoMatrix.height ? 0 : modOffEndY;

        const gapX = border + (sizeX + border) * autoMatrix.gapX;
        const gapY = border + (sizeY + border) * autoMatrix.gapY;

        const style = {
            display: 'grid',
            gridColumnGap: gapX + 'px',
            gridRowGap: gapY + 'px'
        };

        const cells = [];
        const xSizes = [];
        const ySizes = [];
        for (let y = segStartY; y <= segEndY; y++) {
            let cellsY = autoMatrix.height;
            let rowStyle = null;
            if (y === segStartY) {
                if (margStartY) {
                    rowStyle = {marginTop: margStartY * sizeY};
                    cellsY += margStartY;
                } else if (modOffStartY < autoMatrix.height) {
                    cellsY -= modOffStartY
                }
            }
            if (y === segEndY) {
                cellsY -= hiddenEndY
            }
            ySizes.push(
                (sizeY + (sizeY + border) * (cellsY - 1)) + 'px'
            );

            for (let x = segStartX; x <= segEndX; x++) {
                let cellsX = autoMatrix.width;
                let style = rowStyle ? { ...rowStyle } : null;
                if (x === segStartX) {
                    if (margStartX) {
                        if (style === null) {
                            style = {};
                        }
                        style.marginLeft = margStartX * sizeX;
                        cellsX += margStartX

                    } else if (modOffStartX < autoMatrix.width) {
                        cellsX -= modOffStartX;
                    }
                }
                if (x === segEndX) {
                    cellsX -= hiddenEndX;
                }
                if (y === segStartY) {
                    xSizes.push((sizeX + (sizeX + border) * (cellsX - 1)) + 'px');
                }
                cells.push(<div key={y + ' ' + x} style={style} className={markerCls + ((x + y) % 2 === 1 ? ' alt-cell' : '')}></div>);
            }
        }
        style.gridTemplateColumns = xSizes.join(' ');
        style.gridTemplateRows = ySizes.join(' ');
        matrix =
            <div style={style}>
                {cells}
            </div>;
    } else if (props.matrix) {
       /*
        const style = {
            display: 'grid',
            gridColumnGap: props.border + 'px',
            gridRowGap: props.border + 'px'
        };
        const xMax = Math.min(props.matrix[0].length, props.width);
        const yMax = Math.min(props.matrix.length, props.height);
        const cells = [];
        const xSizes = [];
        const ySizes = [];
        for (let y = 0; y < yMax; y++) {
            ySizes.push(sizeY + 'px');
            for (let x = 0; x < xMax; x++) {
                if (y === 0) {
                    xSizes.push(sizeX + 'px');
                }
                cells.push(<div key={y + ' ' + x} className={props.matrix[y][x] ? '' : markerCls}></div>);
            }
        }
        style.gridTemplateColumns = xSizes.join(' ');
        style.gridTemplateRows = ySizes.join(' ');
        matrix =
            <div style={style}>
                {cells}
            </div>;

        */
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

function GridRulerH({ posX, width }) {
    const gContext = useContext(GridContext);
    const cssContext = useContext(CssContext);

    const rulerPadding = cssContext.values.defaultPadding;
    const fontSize = 10;
    const fontWidth = 10;
    const height = 22 - rulerPadding;
    const fullWidth = 13;
    const smallWidth = 3;
    const border = 1;
    const padding = 12;

    const digits = 2;

    const render = ctx => {
        const charWidth = fontWidth;
        const cellPlusBorderSize = gContext.cellPlusBorderSizeX;

        ctx.clearRect(0, 0, gContext.dimX, height);
        ctx.fillStyle = '#FFFFFF'; // cssContext.values.boxBorderColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(0, height - gContext.border, gContext.dimX, gContext.border);
        const dist = Math.ceil((digits * charWidth + 2 * padding) / cellPlusBorderSize);

        for (let i = 0; i < width; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < width) {
                    ctx.fillText('' + (posX + i), cellPlusBorderSize * i + padding, fontSize);
                }
                ctx.fillRect(cellPlusBorderSize * i, height - fullWidth, border, fullWidth);
            } else {
                ctx.fillRect(cellPlusBorderSize * i, height - smallWidth, border, smallWidth);
            }
        }
    };

    return (
        <Overlay top={-22}>
            <Canvas plain render={render} width={gContext.dimX} height={height} />
        </Overlay>
    )
}

function GridRulerV({ posY, height, cellsPerLine }) {
    const gContext = useContext(GridContext);
    const cssContext = useContext(CssContext);

    const rulerPadding = cssContext.values.defaultPadding;
    const fontSize = 10;
    const fontWidth = 10;
    const width = 38 - rulerPadding;

    const render = ctx => {
        const fullWidth = 13;
        const smallWidth = 3;
        const border = 1;
        const padding = 10;
        const charWidth = fontWidth;
        const cellPlusBorderSize = gContext.cellPlusBorderSizeY;

        ctx.clearRect(0, 0, width, gContext.dimY);
        ctx.fillStyle = '#FFFFFF'; // context.contentTextColor;
        ctx.text = fontSize + 'px Monospace';

        ctx.fillRect(width - border, 0, 1, gContext.dimY);
        const dist = Math.ceil((fontSize + 2 * padding) / cellPlusBorderSize);
        for (let i = 0; i < height; i++) {
            if (i % dist === 0) {
                if (i + dist - 1 < height) {
                    let num = posY + i;
                    if (cellsPerLine) {
                        num *= cellsPerLine;
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
    return (
        <Overlay left={-38}>
            <Canvas plain render={render} height={gContext.dimY} width={width} />
        </Overlay>
    )
}

export {
    CellGrid,
    GridCellMarker,
    GridCursorOverlay,
    GridMarkerOverlay,
    GridRulerH,
    GridRulerV,
    FlexGrid
}