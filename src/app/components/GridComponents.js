import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import { Block, DIR, Overlay, Overlays, Grid, Stack, handleLeftRightClick } from "./LayoutComponents";
import {
    AvailContext,
    AvailContextProvider,
    CssContext,
    Canvas,
    ScrollArea,
    WindowContext,
    EditorContext, useComponentUpdate
} from "./BasicComponents";
import { Button } from "./FormComponents";
import { d, clamp, areDisjoint } from "../helper/helper";
import { CellSelection } from "../classes/CellProvider";
import {CellValue} from "../classes/Grid";

function GridMarkerOverlay({ markerType, markerX, markerY, posX, posY, markerWidth, markerHeight, width, height, onDoubleClick, initMove, initResize, autoMatrix }) {
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
                initMove={initMove}
                initResize={initResize}
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
           cursorType, cursorWidth = 1, cursorHeight = 1, cursorPointer = 'crosshair',
           posX, posY, width, height, gridWidth, gridHeight,
           fixed, valid, matrix, inclusion, highlight, last,
           onLeftClick, onRightClick, onDoubleClick
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
            if (!onLeftClick) {
                return;
            }
            const offset = getOffsetPos(e);
            e.stopPropagation();
            e.preventDefault();
            return onLeftClick(e, posX + offset.x, posY + offset.y, 1, 1);
        };

        if (!(inclusion &&
            (posY + offY > gridHeight - cursorHeight ||
                posX + offX > gridWidth - cursorWidth
            ))
        )  {
            marker = <GridCellMarker
                blink
                cursor={cursorPointer}
                onLeftClick={onClick}
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

    const onMouseMove = e => {
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
        if (e.stopPropagation) {
            e.stopPropagation();
            e.preventDefault();
        }
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

    useMemo(() => {
        if (!last) return;
        onMouseMove(last);
    }, [last]);

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

function CellGrid({ id, gridProvider, cellType, posX, posY, width, height, border, zoom, ...props }) {
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
        gContext.boundingRectRef.current = gridRef.current.getBoundingClientRect()
    });

    return (
        <Overlay ref={gridRef}>
            <Canvas id={id} render={render} width={gContext.dimX} height={gContext.dimY} />
        </Overlay>
    )
}

class AutoScroll {

    constructor(setter, propsRef, callback) {
        this.id = null;
        this.propsRef = propsRef;
        this.setter = setter;
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
        const { posX, posY, width, height } = this.propsRef.current;
        const { setPosX, setPosY } = this.setter;
        let deltaX = 0;
        if (this.x) {
            const newPosX = clamp(0, posX + this.x, this.maxX - width);
            if (newPosX !== posX) {
                deltaX = newPosX - posX;
                setPosX(newPosX);
            }
        }
        let deltaY = 0;
        if (this.y) {
            const newPosY = clamp(0, posY + this.y, this.maxY - height);
            if (newPosY !== posY) {
                deltaY = newPosY - posY;
                setPosY(newPosY);
            }
        }
        if (this.callback) {
            this.callback(this.propsRef.current, deltaX, deltaY);
        }
        this.init();
    }

    check(pos) {
        const { width, height } = this.propsRef.current;
        this.x = (pos.rawX < 0 || pos.rawX >= width) ?
            (pos.rawX < 0 ? pos.rawX : pos.rawX - width + 1) : null;
        //const scrollY = autoScrollMarker === null || autoScrollMarker.resizeY;
        this.y = (/*scrollY &&*/ pos.rawY < 0 || pos.rawY >= height) ?
            (pos.rawY < 0 ? pos.rawY : pos.rawY - height + 1) : null;

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

function MarkerAutoSubGrid({ width, height, gapX, gapY, markerWidth, markerHeight, offStartX, offEndX, offStartY, offEndY, border, sizeX, sizeY }) {
    const sizeAndGapX = width + gapX;
    const modOffStartX = offStartX % sizeAndGapX;
    const modOffEndX = offEndX % sizeAndGapX;
    const segStartX = Math.floor((offStartX + gapX) / sizeAndGapX);

    const margStartX = modOffStartX < width ? 0 : sizeAndGapX - (offStartX % sizeAndGapX);

    const segmentsX = (markerWidth + gapX) / sizeAndGapX;
    const segEndX = (segmentsX - 1) - Math.max(0, Math.floor((offEndX + gapX) / sizeAndGapX));

    const hiddenEndX = modOffEndX >= width ? 0 : modOffEndX;

    const sizeAndGapY = height + gapY;
    const modOffStartY = offStartY % sizeAndGapY;
    const modOffEndY = offEndY % sizeAndGapY;
    const segStartY = Math.floor((offStartY + gapY) / sizeAndGapY);

    const margStartY = modOffStartY < height ? 0 : sizeAndGapY - (offStartY % sizeAndGapY);

    const segmentsY = (markerHeight + gapY) / sizeAndGapY;
    const segEndY = (segmentsY - 1) - Math.max(0, Math.floor((offEndY + gapY) / sizeAndGapY));

    const hiddenEndY = modOffEndY >= height ? 0 : modOffEndY;

    const style = {
        display: 'grid',
        gridColumnGap: (border + (sizeX + border) * gapX) + 'px',
        gridRowGap: (border + (sizeY + border) * gapY) + 'px'
    };

    const cells = [];
    const xSizes = [];
    const ySizes = [];
    for (let y = segStartY; y <= segEndY; y++) {
        let cellsY = height;
        let rowStyle = null;
        if (y === segStartY) {
            if (margStartY) {
                rowStyle = {marginTop: margStartY * sizeY};
                cellsY += margStartY;
            } else if (modOffStartY < height) {
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
            let cellsX = width;
            let style = rowStyle ? { ...rowStyle } : null;
            if (x === segStartX) {
                if (margStartX) {
                    if (style === null) {
                        style = {};
                    }
                    style.marginLeft = margStartX * sizeX;
                    cellsX += margStartX

                } else if (modOffStartX < width) {
                    cellsX -= modOffStartX
                }
            }
            if (x === segEndX) {
                cellsX -= hiddenEndX;
            }
            if (y === segStartY) {
                xSizes.push((sizeX + (sizeX + border) * (cellsX - 1)) + 'px');
            }
            cells.push(<div key={y + ' ' + x} style={style} className={((y + x) % 2 === 0 ? 'even' : 'odd') + '-cell'}></div>)
        }
    }
    style.gridTemplateColumns = xSizes.join(' ');
    style.gridTemplateRows = ySizes.join(' ');
    return (
        <div style={style} className="subgrid blinker marker-cell-highlight">
            {cells}
        </div>
    )
}

function GridCellMarker({ dir = DIR.ALL, type, cursor, posX, posY, sizeX = 1, sizeY = 1, highlight, onClick, initResize, initMove, onLeftClick, onDoubleClick, zoom = 1, border = 0, width = 1, height = 1, moveCursor, autoMatrix, ...props }) {
    if (posX === null || posY === null) {
        return '';
    }
    sizeX = sizeX * zoom;
    sizeY = sizeY * zoom;

    const hasResize = initResize && !onClick;
    const hasMove = !!initMove;

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
        centerClickHandler = handleLeftRightClick(e => {
            initMove(e);
        })
    }

    const clsRight = [];
    let rightClickHandler = null;
    if (DIR.RIGHT & dir) {
        clsRight.push(markerCls);
        if (hasResize) {
            clsRight.push('cursor-hresize');
            rightClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'x', cursor: 'ew-resize', startX: false});
            });
        }
    }
    const clsTopLeft = [];
    let topLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.TOP & dir)) {
        clsTopLeft.push(markerCls);
        if (hasResize) {
            clsTopLeft.push('cursor-nwseresize');
            topLeftClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'xy', cursor: 'nwse-resize', startX: true, startY: true});
            });
        }
    }
    const clsTopRight = [];
    let topRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.TOP & dir)) {
        clsTopRight.push(markerCls);
        if (hasResize) {
            clsTopRight.push('cursor-neswresize');
            topRightClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'xy', cursor: 'nesw-resize', startX: false, startY: true});
            });
        }
    }
    const clsLeft = [];
    let leftClickHandler = null;
    if (DIR.LEFT & dir) {
        clsLeft.push(markerCls);
        if (hasResize) {
            clsLeft.push('cursor-hresize');
            leftClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'x', cursor: 'ew-resize', startX: true});
            });
        }
    }
    const clsTop = [];
    let topClickHandler = null;
    if (DIR.TOP & dir) {
        clsTop.push(markerCls);
        if (hasResize) {
            clsTop.push('cursor-vresize');
            topClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'y', cursor: 'ns-resize', startX: null, startY: true});
            });
        }
    }
    const clsBottom = [];
    let bottomClickHandler = null;
    if (DIR.BOTTOM & dir) {
        clsBottom.push(markerCls);
        if (hasResize) {
            clsBottom.push('cursor-vresize');
            bottomClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'y', cursor: 'ns-resize', startX: null, startY: false});
            });
        }
    }
    const clsBottomLeft = [];
    let bottomLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomLeft.push(markerCls);
        if (hasResize) {
            clsBottomLeft.push('cursor-neswresize');
            bottomLeftClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'xy', cursor: 'nesw-resize', startX: true, startY: false});
            });
        }
    }
    const clsBottomRight = [];
    let bottomRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomRight.push(markerCls);
        if (hasResize) {
            clsBottomRight.push('cursor-nwseresize');
            bottomRightClickHandler = handleLeftRightClick(e => {
                initResize(e, {axis: 'xy', cursor: 'nwse-resize', startX: false, startY: false});
            });
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
    } else if (onLeftClick) {
        divAttr.onMouseDown = handleLeftRightClick(onLeftClick);
    }
    let matrix = '';
    if (autoMatrix) {
        matrix = <MarkerAutoSubGrid border={border} sizeX={sizeX} sizeY={sizeY} { ...autoMatrix } />;
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

function useGridModes({modes, propsRef, cursor, marker, setter}) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);
    const gContext = useContext(GridContext);

    const eContextRef = useRef(null);
    eContextRef.current = eContext;

    const gContextRef = useRef(null);
    gContextRef.current = gContext;

    const lastRef = useRef(null);

    const lastClickRef = useRef(null);

    return useMemo(() => {

        const { gridProvider } = propsRef.current;
        const {
            setMarkerX, setMarkerY, setPosX, setPosY,
            setCursorWidth, setCursorHeight, setCursorType,
            setMarkerWidth, setMarkerHeight, setMarkerType,
            update
        } = setter;
        const setMode = eContext.setMode;

        const setLastClick = (action, e, doubleClick) => {
            if (!doubleClick) return;

            const time = Date.now();

            let newLastClick = {
                action,
                time,
                x: e.clientX,
                y: e.clientY
            };
            const lastClick = lastClickRef.current;
            if (lastClick && lastClick.action === action) {
                if (time - lastClick.time < 250 &&
                    Math.abs(lastClick.x - newLastClick.x) < 10 &&
                    Math.abs(lastClick.y - newLastClick.y) < 10)
                {
                    newLastClick = null;
                    requestAnimationFrame(() => doubleClick());
                }
            }
            lastClickRef.current = newLastClick;
        };

        const checkLastClick = e => {
            const lastClick = lastClickRef.current;

            if (lastClick) {
                if (Date.now() - lastClick.time >= 250) {
                    lastClick.current = null;
                }
            }
        };

        const setState =
            change => {
                const { markerType, markerHeight, markerWidth, markerX, markerY,
                        posX, posY } = propsRef.current;
                const gridWidth = gridProvider.getWidth();
                const gridHeight = gridProvider.getHeight();

                if (change.markerType !== undefined && change.markerType !== markerType) {
                    d('-> markerType', change.markerType, markerType);
                    setMarkerType(change.markerType);
                } else {
                    change.markerType = markerType;
                }
                if (change.markerHeight !== undefined && change.markerHeight !== markerHeight) {
                    d('-> markerHeight', change.markerHeight, markerHeight);
                    setMarkerHeight(change.markerHeight);
                } else {
                    change.markerHeight = markerHeight;
                }
                if (change.markerWidth !== undefined && change.markerWidth !== markerWidth) {
                    d('-> markerWidth', change.markerWidth, markerWidth);
                    setMarkerWidth(change.markerWidth);
                } else {
                    change.markerWidth = markerWidth;
                }
                if (change.markerX !== undefined && change.markerX !== markerX) {
                    d('-> markerX', change.markerX, markerX);
                    setMarkerX(change.markerX);
                } else {
                    change.markerX = markerX;
                }
                if (change.markerY !== undefined && change.markerY !== markerY) {
                    d('-> markerY', change.markerY, markerY);
                    setMarkerY(change.markerY);
                } else {
                    change.markerY = markerY;
                }
                if (change.posX !== undefined && change.posX !== posX) {
                    d('-> posX', change.posX, posX);
                    setPosX(change.posX);
                } else {
                    change.posX = posX;
                }
                if (change.posY !== undefined && change.posY !== posY) {
                    d('-> posY', change.posY, posY);
                    setPosY(change.posY);
                } else {
                    change.posY = posY;
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
                        const newWidth = gridWidth;
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
                        const newHeight = gridHeight;
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
            };

        const getGridPosFromEvent = (e, outside = false, isGap = false) => {
            return getGridPosFromClient({x: e.clientX, y: e.clientY}, outside, isGap);
        };

        const getGridPosFromClient = (client, outside = false, isGap = false) => {
            const { cellPlusBorderSizeX, cellPlusBorderSizeY, boundingRectRef } = gContextRef.current;
            const rect = boundingRectRef.current;
            if (!rect) return null;

            const adjustPosX = isGap ? cellPlusBorderSizeX >> 1 : 0;
            const adjustPosY = isGap ? cellPlusBorderSizeY >> 1 : 0;
            const rasterPos = {
                x: Math.floor(Math.round(client.x - rect.left + adjustPosX) / cellPlusBorderSizeX),
                y: Math.floor(Math.round(client.y - rect.top + adjustPosY) / cellPlusBorderSizeY),
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
            const { modeParams, posX, posY, markerX, markerY, gridWidth, gridHeight, markerWidth, markerHeight } = propsRef.current;

            setLastClick('move', e, modeParams.doubleClick);

            const pos = getGridPosFromEvent(e);
            let lastX = pos.x;
            let lastY = pos.y;
            const grabX = pos.x - (markerX - posX);
            const grabY = pos.y - (markerY - posY);

            const autoScroll = new AutoScroll(setter, propsRef, (props, x, y) => {
                const { markerX, markerY } = props;
                let newMarkerX = clamp(0, markerX + x, gridWidth - markerWidth);
                if (markerX !== newMarkerX) {
                    setMarkerX(newMarkerX);
                }
                const newMarkerY = clamp(0, markerY + y, gridHeight - markerHeight);
                if (markerY !== newMarkerY) {
                    setMarkerY(newMarkerY);
                }
            });

            wContext.startExclusiveMode('marker-move', 'grabbing');
            wContext.addEventListener('mousemove', e => {
                const pos = getGridPosFromEvent(e);
                const { posX, posY, markerX, markerY } = propsRef.current;

                const checkX = pos.x !== lastX;
                if (checkX) {
                    const newMarkerX = clamp(0, posX + pos.x - grabX, gridWidth - markerWidth);
                    if (markerX !== newMarkerX) {
                        setMarkerX(newMarkerX);
                    }
                    lastX = pos.x;
                }
                const checkY = pos.y !== lastY;
                if (checkY) {
                    const newMarkerY = clamp(0, posY + pos.y - grabY, gridHeight - markerHeight);
                    if (markerY !== newMarkerY) {
                        setMarkerY(newMarkerY);
                    }
                    lastY = pos.y;
                }
                autoScroll.check(pos);
            });
            wContext.addEventListener('mouseup', e => {
                wContext.endExclusiveMode('marker-move');
                autoScroll.reset();
                checkLastClick(e);
            }, {once: true})
        };

        const resizeMarker = (e, resize) => {
            const { markerX, markerY, markerWidth, markerHeight, cursorWidth, cursorHeight,
                trackX, trackY, gridWidth, gridHeight, markerGapX, markerGapY } = propsRef.current;
            const {startX, startY, cursor, axis} = resize;

            const baseWidth = cursorWidth;
            const baseHeight = cursorHeight;

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

            const autoScroll = new AutoScroll(setter, propsRef, (props, x, y) => {
                const { posX, posY, gridWidth, gridHeight, width, height } = props;
                const change = {};
                if (resizeX && x !== 0) {
                    const clampedPosX =
                        clamp(0,posX + x, gridWidth - width);
                    const anchorX = anchorPos.x;
                    const anchorDistX = clampedPosX - anchorX + (x > 0 ? width : 0);
                    setMarkerResizeChanges('x', change, anchorDistX, attr);
                }
                if (resizeY && y !== 0) {
                    const clampedPosY =
                        clamp(0,posY + y, gridHeight - height);
                    const anchorY = anchorPos.y;
                    const anchorDistY = clampedPosY - anchorY + (y > 0 ? height : 0);
                    setMarkerResizeChanges('y', change, anchorDistY, attr);
                }
                setState(change);
            });

            const checkWithLastRasterPos = e => {
                const { posX, posY, width, height } = propsRef.current;
                const newRasterPos = getGridPosFromEvent(e, true);
                autoScroll.check(newRasterPos);

                if (newRasterPos === null) {
                    return;
                }

                // distFromAnchor (+ => right from anchor, - = left from anchor)
                const anchorDistX = newRasterPos.x + posX - anchorPos.x;
                const anchorDistY = newRasterPos.y + posY - anchorPos.y;

                const validX =
                    (resizeX  // resizing in X dir allowed
                        && newRasterPos.x + 1 >= 0 // new rasterPos in Range [-1, ..., width]
                        && newRasterPos.x <= width
                    );

                const validY = (resizeY && anchorDistY !== 0 && newRasterPos.y + 1  >= 0 && newRasterPos.y <= height);

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

        const getMarkerSelection = () => {
            const { markerX, markerY, markerType, markerWidth, markerHeight, markerGapX, markerGapY,
                    cursorWidth, cursorHeight, pinned,
                    gridWidth, gridHeight, gridProvider, modeParams } = propsRef.current;
            const cellValue = eContext.targetCellValue;
            const rect = gridProvider.getRect(
                markerX,
                markerY,
                markerType === 'rows' ? gridWidth : markerWidth,
                markerType === 'columns' ? gridHeight : markerHeight,
                cellValue
            );
            if (modeParams.multi) {
                const cursorBased = (modeParams.unfix && pinned) || modeParams.fixed;
                return (
                    new CellSelection(
                        'multi',
                        {
                            gapX: markerGapX,
                            gapY: markerGapY,
                            baseX: cursorBased ? cursorWidth : markerWidth,
                            baseY: cursorBased ? cursorHeight : markerHeight,
                            rect
                        },
                        cellValue
                    )
                );
            }
            return (
                gridProvider.getSelection(
                    markerX, markerY, markerWidth, markerHeight
                )
            )
        };

        cursor.use = !areDisjoint(modes, ['select', 'pick', 'write']);
        marker.use = !areDisjoint(modes, ['select']);

        const resetMarker = () => {
            setMarkerX(null);
            setMarkerY(null);
            setMarkerType(null)
        };

        const setMarker = (type, x, y, width = 1, height = 1) => {
            setMarkerType(type);
            setMarkerX(x);
            setMarkerY(y);
            setMarkerWidth(width);
            setMarkerHeight(height)
        };

        const setCursor = (type, width = 1, height = 1) => {
            setCursorType(type);
            setCursorWidth(width);
            setCursorHeight(height)
        };

        const actions = {};
        if (true) {
            actions.addRows = {
                exec: data => {
                    const { gridWidth, gridHeight, posY } = propsRef.current;
                    const no = data.no;
                    const start = data.start;
                    let added = null;
                    let oldPosY = posY;
                    let undoSelection = null;
                    let min = Math.min(Math.abs(no), gridHeight - 1);

                    const doAction = () => {
                        if (no < 0) {
                            undoSelection = gridProvider.getRawSelection(
                                0, start ? 0 : gridHeight - min,
                                gridWidth, min
                            );
                        }
                        added = gridProvider.addRows(start, no);
                        if (no < 0) {
                            added *= -1;
                        }
                        const _posY = start ? 0 : Math.max(0, oldPosY + added);
                        setState({posY: _posY, start, added, axis: 'y'});
                        gContext.update()
                    };

                    const undoAction = () => {
                        gridProvider.addRows(start, -added);
                        if (undoSelection) {
                            gridProvider.fillRectWithSelection(
                                0, start ? 0 : gridHeight + added,
                                gridWidth, -added,
                                undoSelection
                            );
                        }
                        setState({posY: oldPosY, start, added: -added, axis: 'y'});
                        gContext.update()
                    };
                    eContextRef.current.doAction(doAction, undoAction);
                }
            };
            actions.addColumns = {
                exec: data => {
                    const { gridWidth, gridHeight, posX } = propsRef.current;

                    const no = data.no;
                    const start = data.start;
                    let added = null;
                    let oldPosX = posX;
                    let undoSelection = null;
                    let min = Math.min(Math.abs(no), gridWidth - 1);

                    const doAction = () => {
                        if (no < 0) {
                            undoSelection = gridProvider.getRawSelection(
                                start ? 0 : gridWidth - min, 0,
                                min, gridHeight
                            );
                        }
                        added = gridProvider.addColumns(start, no);
                        if (no < 0) {
                            added *= -1;
                        }
                        d('NH', gridProvider.getHeight());
                        const _posX = start ? 0 : Math.max(0, oldPosX + added);
                        setState({posX: _posX, start, added, axis: 'x'});
                        gContext.update();
                    };
                    const undoAction = () => {
                        gridProvider.addColumns(start, -added);
                        if (undoSelection) {
                            gridProvider.fillRectWithSelection(
                                start ? 0 : gridWidth + added, 0,
                                -added, gridHeight,
                                undoSelection
                            );
                        }
                        setState({posX: oldPosX, start, added: -added, axis: 'x'});
                        gContext.update()
                    };
                    eContextRef.current.doAction(doAction, undoAction);
                }
            }
        }


        const controller = {};
        for (let mode of modes) {
            let obj = null;
            switch(mode) {

                case 'pick':
                    obj = {
                        init: data => {
                            setCursor('rect');
                            cursor.propsRef.current = {
                                onLeftClick: (e, x, y) => {
                                    setLastClick('pick', e, () => setMode('write'));
                                    wContext.startExclusiveMode('pick', 'pointer');
                                    eContext.setSelection(
                                        gridProvider.getSelection(x, y, 1, 1, eContextRef.current.targetCellValue)
                                    );
                                    wContext.addEventListener('mouseup', e => {
                                        checkLastClick(e);
                                        resetMarker();
                                        wContext.endExclusiveMode('pick');
                                        const last = {clientX: e.clientX, clientY: e.clientY};
                                        cursor.propsRef.current.last = last;
                                        update()
                                    }, {once: true});
                                    setMarker('rect', x, y)
                                }
                            }
                        },
                        cleanUp: () => {
                            cursor.propsRef.current = {}
                        }
                    };
                    break;

                case 'write':
                    obj = {
                        init: data => {
                            const currSelection = eContextRef.current.selection;
                            const selType = currSelection.type;
                            const selWidth = currSelection.getWidth();
                            const selHeight = currSelection.getHeight();
                            setCursor(selType, selWidth, selHeight);

                            let path = null;

                            const track = (x, y) => {
                                if (x === null || y === null) {
                                    return;
                                }
                                let segment;
                                const { selection } = eContextRef.current;
                                const { writeTransparent } = propsRef.current;
                                if (selection.isRows()) {
                                    x = 0;
                                } else if (selection.isColumns()) {
                                    y = 0;
                                }

                                if (data.clear) {
                                    segment = gridProvider.writeSelection(x, y, selection, gridProvider.getEmptyCell(selection.cellValue), true);
                                } else {
                                    segment = gridProvider.writeSelection(x, y, selection, null,  selection.isCell() || writeTransparent);
                                }
                                Object.assign(path.new, segment.new);
                                for(let key in segment.old) {
                                    if (path.old[key] === undefined) {
                                        path.old[key] = segment.old[key];
                                    }
                                }
                                setMarker(selType, x, y, selWidth, selHeight);
                            };

                            cursor.propsRef.current = {
                                onLeftClick: (e, x, y) => {
                                    wContext.startExclusiveMode('write', 'cell');
                                    path = {new: {}, old: {}};
                                    track(x, y);
                                    wContext.addEventListener('mousemove', e => {
                                        const pos = getGridPosFromEvent(e);
                                        track(pos.x, pos.y);
                                    });

                                    wContext.addEventListener('mouseup', e => {
                                        wContext.endExclusiveMode('write');
                                        const doPath = path.new;
                                        const undoPath = path.old;
                                        const { selection } = eContextRef.current;
                                        const cellValue = selection.getCellValue();
                                        const doAction = () => {
                                            gridProvider.writePath(doPath, cellValue);
                                        };
                                        const undoAction = () => {
                                            gridProvider.writePath(undoPath, cellValue);
                                        };
                                        eContextRef.current.doAction(doAction, undoAction);
                                        cursor.propsRef.current.last = {clientX: e.clientX, clientY: e.clientY};
                                        resetMarker();
                                    }, {once: true})
                                }
                            }
                        },
                        cleanUp: () => {
                            cursor.propsRef.current = {};
                        }
                    };
                    break;

                case 'select':
                    obj = {
                        defaults: {
                            unfix: false,
                            fixed: false,
                            multi: false,
                            type: 'rect',
                            width: 1,
                            height: 1,
                            resetMarker: false,
                            doubleClick: null
                        },
                        init: data => {
                            setCursor(data.type, data.fixed ? data.width : 1, data.fixed ? data.height : 1);
                            cursor.propsRef.current = {
                                onLeftClick: (e, x, y) => {
                                    setMarker(data.type, x, y, data.width, data.height);
                                    const startEvent = {clientX: e.clientX, clientY: e.clientY};
                                    lastRef.current = true;
                                    wContext.startExclusiveMode('set-marker');
                                    wContext.addEventListener('mouseup', () => lastRef.current = false, {once: true});
                                    requestAnimationFrame(() => {
                                        wContext.endExclusiveMode('set-marker');
                                        if (!lastRef.current) return;
                                        data.fixed && !data.multi ?
                                            moveMarker(startEvent) :
                                            resizeMarker(
                                                startEvent,
                                                {axis: "xy", cursor: "nwse-resize", startX: false, startY: false}
                                            )
                                    });
                                },
                                inclusion: true
                            };

                            marker.propsRef.current = {
                                initMove: moveMarker,
                                initResize: data.fixed && !data.multi ? null : resizeMarker,
                                autoMatrix: data.fixed && data.multi ? {width: data.width, height: data.height} : null
                            };
                            eContext.select.get = getMarkerSelection
                        },
                        cleanUp: () => {
                            eContext.select.get = null;
                            cursor.propsRef.current = {};
                            marker.propsRef.current = {};
                            resetMarker();
                        }
                    };
                    break;
            }
            if (obj) {
                controller[mode] = obj;
            }
        }
        return {controller, actions}
    }, []);
}

function ManagedGrid({
         gridProvider, cellType, modes, markerType, setMarkerType,
         posX, posY, setPosX, setPosY, writeTransparent,
         width, height, zoom, border, rulers,
         markerX, markerY, setMarkerX, setMarkerY,
         markerWidth, markerHeight, setMarkerWidth, setMarkerHeight,
         markerGapX, markerGapY,
         ...props
    }) {
    const gContext = useContext(GridContext);
    const eContext = useContext(EditorContext);

    const lastControllerRef = useRef(null);
    const update = useComponentUpdate();

    const [cursorWidth, setCursorWidth] = useState(1);
    const [cursorHeight, setCursorHeight] = useState(1);
    const [cursorType, setCursorType] = useState('rect');

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    let trackX = true;
    let trackY = true;
    if (cursorType !== 'rect') {
        if (cursorType.startsWith('column')) {
            trackY = false;
        } else if (cursorType.startsWith('row')) {
            trackX = false;
        }
    }

    const cursorPropsRef = useRef(null);
    const cursor = useMemo(() => {
        return {
            use: false,
            propsRef: cursorPropsRef
        }
    }, []);
    const markerPropsRef = useRef(null);
    const marker = useMemo(() => {
        return {
            use: false,
            propsRef: markerPropsRef
        }
    }, []);

    if (markerPropsRef.current && markerPropsRef.current.autoMatrix) {
        const autoMatrix = markerPropsRef.current.autoMatrix;
        autoMatrix.gapX = markerGapX;
        autoMatrix.gapY = markerGapY;
        autoMatrix.markerWidth = markerWidth;
        autoMatrix.markerHeight = markerHeight;
        autoMatrix.offStartX = Math.max(posX - markerX, 0);
        autoMatrix.offEndX = Math.max(markerX + markerWidth - (posX + width), 0);
        autoMatrix.offStartY = Math.max(posY - markerY, 0);
        autoMatrix.offEndY = Math.max(markerY + markerHeight - (posY + height), 0)
    }
    const hasSelection = marker.use && markerX !== null;
    if (eContext.hasSelection !== hasSelection) {
        eContext.setHasSelection(hasSelection)
    }

    const mode = eContext.mode;
    const modeParams = eContext.modeParams;

    const setter = useMemo(() => {
        return {
            setPosX, setPosY, setMarkerX, setMarkerY,
            setMarkerWidth, setMarkerHeight, setMarkerType,
            setCursorWidth, setCursorHeight, setCursorType,
            update
        }
    }, []);

    const propsRef = useRef(null);
    propsRef.current = {
        gridProvider, trackX, trackY,
        cursorWidth, cursorHeight, cursorType,
        mode, modeParams, writeTransparent,
        gridWidth, gridHeight, width, height, posX, posY,
        markerX, markerY, markerWidth, markerHeight,
        markerType, markerGapX, markerGapY, ...props
    };

    const {controller, actions} = useGridModes({modes, propsRef, cursor, marker, setter});
    useMemo(() => {}, [
        eContext.setGridActions(actions)
    ]);

    useMemo(() => {
            const lastController = lastControllerRef.current;
            if (lastController && lastController.cleanUp) {
                lastController.cleanUp()
            }
            if (mode === null) {
                return;
            }
            const modeController = controller[mode];
            if (modeController) {
                modeController.init(
                    modeController.defaults ?
                        { ...modeController.defaults, ...modeParams  } : modeParams
                );
            }
            lastControllerRef.current = modeController
        },
    [mode, modeParams]
    );
    useEffect(() => {
        if (props.mode) {
            eContext.setMode(props.mode, props.modeParams);
        }
    }, []);

    const pointer = mode === 'pick' ? 'pointer' : 'crosshair';

    return (
        <Overlays originX={rulers ? 38 : 0} originY={rulers ? 22 : 0} width={gContext.dimX} height={gContext.dimY} className="overflow">
            <CellGrid
                id="main"
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
            {cursor.use &&
                <GridCursorOverlay
                    posX={posX} posY={posY}
                    width={width} height={height}
                    cursorType={cursorType} cursorPointer={pointer}
                    cursorWidth={cursorWidth} cursorHeight={cursorHeight}
                    gridWidth={gridWidth} gridHeight={gridHeight}
                    { ...cursor.propsRef.current }
                />
            }
            {marker.use && markerX !== null &&
                <GridMarkerOverlay
                    posX={posX} posY={posY}
                    width={width} height={height}
                    markerX={markerX} markerY={markerY}
                    markerGapX={markerGapX} markerGapY={markerGapY}
                    markerWidth={markerWidth} markerHeight={markerHeight}
                    markerType={markerType}
                    { ...marker.propsRef.current }
                />
            }
        </Overlays>
    )
}

function FlexGridInner({ gridProvider, border, zoom, rulers,
    width, setWidth, height, setHeight, posX, setPosX, posY, setPosY,
   resize, shift, navi, ...props }) {
    const aContext = useContext(AvailContext);
    const cssContext = useContext(CssContext);
    const eContext = useContext(EditorContext);

    const update = useComponentUpdate();
    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

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

        maxPageX = Math.min(Math.floor(spaceX / cellPlusBorderSizeX), gridWidth);
        maxPageY = Math.min(Math.floor(spaceY / cellPlusBorderSizeY), gridHeight);

        return {
            update,
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

    const maxPosX = Math.max(gridWidth - value.maxPageX, 0);
    const maxPosY = Math.max(gridHeight - value.maxPageY, 0);

    if (posX > maxPosX) setPosX(maxPosX);
    if (posY > maxPosY) setPosY(maxPosY);

    let pageX = width;
    let pageY = height;
    if (value.maxPageX !== pageX) {
        setWidth(value.maxPageX);
        pageX = value.maxPageX
    }
    if (value.maxPageY != pageY) {
        setHeight(value.maxPageY);
        pageY = value.maxPageY
    }
    value.dimX = pageX * value.cellPlusBorderSizeX + border;
    value.dimY = pageY * value.cellPlusBorderSizeY + border;

    const shiftRow = start => {
        const doWidth = gridWidth;
        const doHeight = gridHeight;
        const undoSelection =
            gridProvider.getRawSelection(
                0, start ? 0 : doHeight - 1, doWidth, 1
            );

        const doAction = () => {
            gridProvider.addRows(start, -1);
            gridProvider.addRows(!start, 1);
        };
        const undoAction = () => {
            gridProvider.addRows(!start, -1);
            gridProvider.addRows(start, 1);
            gridProvider.writeSelection(
                0, start ? 0 : doHeight - 1,
                undoSelection
            );
        };
        eContext.doAction(doAction, undoAction);
    };

    const shiftColumn = start => {
        const doWidth = gridWidth;
        const doHeight = gridHeight;
        const undoSelection =
            gridProvider.getRawSelection(
                start ? 0 : doWidth - 1, 0, 1, doHeight
            );
        const doAction = () => {
            gridProvider.addColumns(start, -1);
            gridProvider.addColumns(!start, 1);
        };
        const undoAction = () => {
            gridProvider.addColumns(!start, -1);
            gridProvider.addColumns(start, 1);
            gridProvider.writeSelection(
                start ? 0 : doWidth - 1, 0,
                undoSelection
            );
        };
        eContext.doAction(doAction, undoAction);
    };

    const addRows = (no, start) => {
        return () => eContext.doGridAction('addRows',{no, start})
    };
    const addColumns = (no, start) => {
        return () => eContext.doGridAction('addColumns', {no, start});
    };

    return (
        <Grid className="padded-p" full columns="- * -" rows="- * -">
            <Block padded={DIR.BOTTOM|DIR.RIGHT}>
                {navi && <Button icon="north_west" disabled={posX === 0 && posY === 0} onClick={() => {setPosX(0); setPosY(0)}} />}</Block>
            <Block padded={DIR.BOTTOM|DIR.RIGHT|DIR.LEFT}>
                <Stack center="h" gaps="1">
                    {resize &&
                        <>
                            <Button icon="remove" onClick={addRows(-1, true)} />
                            <Button icon="remove" name="10" onClick={addRows(-10, true)} />
                        </>
                    }
                    {navi &&
                        <Button icon="north" disabled={posY === 0} onClick={() => setPosY(0)} />}
                    {shift &&
                        <Button icon="system_update_alt" rotate={180} onClick={() => shiftRow(true)} />}
                    {resize &&
                        <>
                            <Button icon="add" name="10" onClick={addRows(10, true)} />
                            <Button icon="add" onClick={addRows(1, true)} />
                        </>
                    }
                </Stack>
            </Block>
            <Block padded={DIR.BOTTOM|DIR.LEFT}>
                {navi && <Button icon="north_east" disabled={posX === maxPosX && posY === 0} onClick={() => {setPosX(maxPosX); setPosY(0)}} />}
            </Block>

            <Block padded={DIR.TOP|DIR.RIGHT|DIR.BOTTOM} centerItems full="v">
                <Stack gaps="1" vertical>
                    {resize &&
                        <>
                            <Button icon="remove" onClick={addColumns(-1, true)} />
                            <Button vertical icon="remove" name="10" onClick={addColumns(-10, true)} />
                        </>
                    }
                    {navi && <Button icon="west" disabled={posX === 0} onClick={() => setPosX(0)} />}
                    {shift &&
                        <Button icon="system_update_alt" rotate={90} onClick={() => shiftColumn(true)} />}
                    {resize &&
                        <>
                            <Button vertical icon="add" name="10" onClick={addColumns(10, true)} />
                            <Button icon="add" onClick={addColumns(1, true)} />
                        </>
                    }
                </Stack>
            </Block>
            <Block full>
                <GridContext.Provider value={value}>
                    <ScrollArea
                        full auto
                        x={posX} setX={setPosX} maxX={gridWidth} pageX={pageX}
                        y={posY} setY={setPosY} maxY={gridHeight} pageY={pageY}
                    >
                        <Block full centerItems>
                            <ManagedGrid
                                undo
                                gridProvider={gridProvider}
                                border={border} zoom={zoom} rulers={rulers}
                                posX={posX} setPosX={setPosX}
                                posY={posY} setPosY={setPosY}
                                width={pageX} height={pageY}
                                gridWidth={gridWidth} gridHeight={gridHeight}
                                { ...props }
                            />
                        </Block>
                    </ScrollArea>
                </GridContext.Provider>
            </Block>
            <Block padded={DIR.TOP|DIR.LEFT|DIR.BOTTOM} centerItems full="v">
                <Stack gaps="1" vertical>
                    {resize &&
                        <>
                            <Button icon="remove" onClick={addColumns(-1, false)} />
                            <Button vertical icon="remove" name="10" onClick={addColumns(-10, false)} />
                        </>
                    }
                    {navi && <Button icon="east" disabled={posX === maxPosX} onClick={() => setPosX(maxPosX)} />}
                    {shift &&
                        <Button icon="system_update_alt" rotate={-90} onClick={() => shiftColumn(false)} />}
                    {resize &&
                        <>
                            <Button vertical icon="add" name="10" onClick={addColumns(10, false)} />
                            <Button icon="add" onClick={addColumns(1, false)} />
                        </>
                    }
                </Stack>
            </Block>

            <Block padded={DIR.TOP|DIR.RIGHT}>
                {navi && <Button icon="south_west" disabled={posX === 0 && posY === maxPosY} onClick={() => {setPosX(0); setPosY(maxPosY)}} />}
            </Block>
            <Block padded={DIR.LEFT|DIR.TOP|DIR.RIGHT}>
                <Stack center="h" gaps="1">
                    {resize &&
                        <>
                            <Button icon="remove" onClick={addRows(-1, false)} />
                            <Button icon="remove" name="10" onClick={addRows(-10, false)} />
                        </>
                    }
                    {navi && <Button icon="south" disabled={posY === maxPosY} onClick={() => setPosY(maxPosY)} />}
                    {shift &&
                        <Button icon="system_update_alt" onClick={() => shiftRow(false)} />}
                    {resize &&
                        <>
                            <Button icon="add" name="10" onClick={addRows(10, false)} />
                            <Button icon="add" onClick={addRows(1, false)} />
                        </>
                    }
                </Stack>
            </Block>
            <Block padded={DIR.LEFT|DIR.TOP}>
                {navi && <Button icon="south_east" disabled={posY === maxPosY && posX === maxPosX} onClick={() => {setPosX(maxPosX); setPosY(maxPosY)}} />}
            </Block>
        </Grid>
    )
}

function FlexGrid(props) {
    return (
        <AvailContextProvider>
            <FlexGridInner { ...props } />
        </AvailContextProvider>
    );
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