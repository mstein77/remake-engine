import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import { Block, DIR, Overlay, Overlays, Grid, Stack, handleLeftRightClick } from "./LayoutComponents";
import {
    AvailContext,
    AvailContextProvider,
    CssContext,
    Canvas,
    ScrollArea,
    WindowContext,
    EditorContext, useModal, useComponentUpdate, useMounted, Toolbar, ToolGroup, UndoRedoButtons, BackgroundControl, Kbd
} from "./BasicComponents";
import { FiltersModal } from "./EditorComponents";
import { Button, Checkbox, Number, Select, Tuple } from "./FormComponents";
import { d, clamp, areDisjoint, getCanvasForBitmap } from "../helper/helper";
import { BitmapCellProvider, CellSelection } from "../classes/CellProvider";
import { PictureCell } from "./BaseComponents";
import { BitmapGrid, CellValue } from "../classes/Grid";

function GridMarkerOverlay({ markerType, markerX, markerY, posX, posY, markerWidth, markerHeight, width, height, onDoubleClick, onRightClick, initMove, initResize, autoMatrix }) {
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
                onRightClick={onRightClick}
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

        let offWidth = cursorWidth;
        let offHeight = cursorHeight;
        if (markerType === 'row-gap') {
            markerHeight = 1;
            offHeight--;
        } else if (markerType === 'column-gap') {
            markerWidth = 1;
            offWidth--;
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

        const onClick = !onLeftClick ? null : e => {
            const offset = getOffsetPos(e);
            e.stopPropagation();
            e.preventDefault();
            return onLeftClick(e, posX + offset.x, posY + offset.y, 1, 1);
        };

        const onClickRight = !onRightClick ? null : e => {
            const offset = getOffsetPos(e);
            e.stopPropagation();
            e.preventDefault();
            return onRightClick(e, posX + offset.x, posY + offset.y);
        };

        if (!(inclusion &&
            (posY + offY > gridHeight - offHeight ||
                posX + offX > gridWidth - offWidth
            ))
        )  {
            marker = <GridCellMarker
                blink
                cursor={cursorPointer}
                onLeftClick={onClick}
                onRightClick={onClickRight}
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
        if (!divRef.current) return false;

        const rect = divRef.current.getBoundingClientRect();
        let relX = Math.floor((e.clientX - rect.x + adjustPosX) / gContext.cellPlusBorderSizeX);
        let reset = (relX < 0 || relX >= maxPosX);

        let relY = Math.floor((e.clientY - rect.y + adjustPosY)/ gContext.cellPlusBorderSizeY);
        if (inclusion && !isGap) {
            const overSizeX = (posX + relX + cursorWidth) - gridWidth;
            if (overSizeX > 0) {
                relX -= overSizeX;
            }
            const overSizeY = (posY + relY + cursorHeight) - gridHeight;
            if (overSizeY > 0) {
                relY -= overSizeY;
            }
        }
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
            if (offset === false || (!isGap && valid && !valid(posX + offset.x, posY + offset.y))) {
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
                        gridProvider.drawGrid(ctx, posX, posY, width, height, border, zoom, null /* players*/);
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

function GridCellMarker({ dir = DIR.ALL, type, cursor, posX, posY, sizeX = 1, sizeY = 1, highlight, onClick, initResize, initMove, onLeftClick, onRightClick, onDoubleClick, zoom = 1, border = 0, width = 1, height = 1, moveCursor, autoMatrix, ...props }) {
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
    const isGap = type && type.endsWith('gap');
    let centerStyle = {
        width: (type === 'column-gap' ? 2 * overhang  : sizeX * width + (width - 1) * border),
        height: (type === 'row-gap' ? 2 * overhang : sizeY * height + (height - 1) * border)
    };
    if (type === 'row-gap') {
        offset.top = (posY * (sizeY + border)) - overhang;
        offset.left = 0;
        centerStyle.width += 2 * border;
    } else if (type === 'column-gap') {
        offset.left =  (posX * (sizeX + border)) - overhang;
        offset.top = 0;
        centerStyle.height += 2 * border;
    }

    const markerCls = 'marker-cell' + (highlight ? '-highlight' : '');
    const cls = [isGap ? 'relative' : 'marker-grid'];

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
    } else if (onLeftClick || onRightClick) {
        divAttr.onMouseDown = handleLeftRightClick(onLeftClick, onRightClick);
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
        <div { ...divAttr }>
            {!isGap &&
                <>
                    <div className={clsTopLeft.join(' ')} onMouseDown={topLeftClickHandler}></div>
                    <div className={clsTop.join(' ')} onMouseDown={topClickHandler}></div>
                    <div className={clsTopRight.join(' ')} onMouseDown={topRightClickHandler}></div>
                    <div className={clsLeft.join(' ')} onMouseDown={leftClickHandler}></div>
                </>
            }
            <div className={clsCenter.join(' ')} onMouseDown={centerClickHandler} style={centerStyle}>{matrix}</div>
            {!isGap &&
                <>
                    <div className={clsRight.join(' ')} onMouseDown={rightClickHandler}></div>
                    <div className={clsBottomLeft.join(' ')} onMouseDown={bottomLeftClickHandler}></div>
                    <div className={clsBottom.join(' ')} onMouseDown={bottomClickHandler}></div>
                    <div className={clsBottomRight.join(' ')} onMouseDown={bottomRightClickHandler}></div>
                </>
            }
        </div>
    )
}

function GridRulerH({ posX, width }) {
    const gContext = useContext(GridContext);
    const cssContext = useContext(CssContext);

    const rulerPadding = cssContext.getValue('defaultPaddingPx');
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

        ctx.fillRect(0, height - 1, gContext.dimX, 1);
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

    const rulerPadding = cssContext.getValue('defaultPaddingPx');
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

    const gContextRef = useRef(null);
    gContextRef.current = gContext;

    const eContextRef = useRef(null);
    eContextRef.current = eContext;

    const lastRef = useRef(null);

    const lastClickRef = useRef(null);

    return useMemo(() => {
        const { gridProvider, edit, resize } = propsRef.current;
        const {
            setMarkerX, setMarkerY, setPosX, setPosY,
            setCursorWidth, setCursorHeight, setCursorType,
            setMarkerWidth, setMarkerHeight, setMarkerType,
            update, doAction
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
            const { modeParams, posX, posY, markerType, markerX, markerY, gridWidth, gridHeight, markerWidth, markerHeight } = propsRef.current;

            const isGap = markerType.endsWith('gap');
            let doubleClick = isGap ? () => eContext.doGridAction('insert', {no: 10}) : modeParams.doubleClick;
            if (!doubleClick && edit) {
                doubleClick = () => eContext.doGridAction('copy');
            }
            setLastClick('move', e, doubleClick);

            const pos = getGridPosFromEvent(e, false, isGap);
            let lastX = pos.x;
            let lastY = pos.y;
            const grabX = pos.x - (markerX - posX);
            const grabY = pos.y - (markerY - posY);

            const autoScroll = new AutoScroll(setter, propsRef, (props, x, y) => {
                const { markerX, markerY } = props;
                let newMarkerX = clamp(0, markerX + x, gridWidth - (isGap ? 0 : markerWidth));
                if (markerX !== newMarkerX) {
                    setMarkerX(newMarkerX);
                }
                const newMarkerY = clamp(0, markerY + y, gridHeight - (isGap ? 0 : markerHeight));
                if (markerY !== newMarkerY) {
                    setMarkerY(newMarkerY);
                }
            });

            wContext.startExclusiveMode('marker-move', 'grabbing');
            wContext.addEventListener('mousemove', e => {
                const pos = getGridPosFromEvent(e, false, isGap);
                const { posX, posY, markerX, markerY } = propsRef.current;

                const checkX = pos.x !== lastX;
                if (checkX) {
                    const newMarkerX = clamp(0, posX + pos.x - grabX, gridWidth - (isGap ? 0 : markerWidth));
                    if (markerX !== newMarkerX) {
                        setMarkerX(newMarkerX);
                    }
                    lastX = pos.x;
                }
                const checkY = pos.y !== lastY;
                if (checkY) {
                    const newMarkerY = clamp(0, posY + pos.y - grabY, gridHeight - (isGap ? 0 : markerHeight));
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
        marker.use = !areDisjoint(modes, ['select', 'pick', 'move-marker']);

        const resetMarker = () => {
            const { mounted } = propsRef.current;
            if (mounted.current) {
                setMarkerX(null);
                setMarkerY(null);
                setMarkerType(null)
            }
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

        const actions = {
            goto: {
                exec: () => {
                    const { markerType, markerX, markerY } = propsRef.current;
                    if (!markerType.startsWith('row')) {
                        setPosX(markerX);
                    }
                    if (!markerType.startsWith('column')) {
                        setPosY(markerY);
                    }
                },
                has: () => false
            },
            clear: {
                exec: () => {
                    const { markerX, markerY, markerWidth, markerHeight, markerType } = propsRef.current;
                    const cellValue = eContextRef.current.selection.getCellValue();
                    const width = markerType === 'rows' ? gridProvider.getWidth() : markerWidth;
                    const height = markerType === 'columns' ? gridProvider.getHeight() : markerHeight;
                    const undoSelection = gridProvider.getSelection(markerX, markerY, width, height, cellValue);
                    doAction(
                        () => {
                            gridProvider.fillRect(
                                markerX,
                                markerY,
                                width,
                                height,
                                gridProvider.getEmptyCell(cellValue),
                                cellValue
                            );
                            eContext.renderGrid('main');
                        },
                        () => {
                            gridProvider.fillRectWithSelection(
                                markerX,
                                markerY,
                                width,
                                height,
                                undoSelection
                            );
                            eContext.renderGrid('main');
                        }
                    )
                },
                has: () => {
                    const { markerType, markerX } = propsRef.current;
                    return edit && markerX !== null && !markerType.endsWith('gap')
                }
            },
            copy: {
                exec: data => {
                    const { targetCellValue } = eContextRef.current;
                    const { markerX, markerY, markerWidth, markerHeight, markerType } = propsRef.current;
                    const rect = gridProvider.getRect(
                        markerX,
                        markerY,
                        markerType === 'rows' ? gridProvider.getWidth() : markerWidth,
                        markerType === 'columns' ? gridProvider.getHeight() : markerHeight,
                        targetCellValue
                    );
                    /*
                    if (modeParams.multi) {
                        eCtxRef.current.setSelection(
                            new CellSelection(
                                'multi',
                                {
                                    gapX: props.markerGapX,
                                    gapY: props.markerGapY,
                                    baseX: cursorRef.current.cursorWidth,
                                    baseY: cursorRef.current.cursorHeight,
                                    rect
                                },
                                cellValue
                            )
                        );
                    } else {
                     */
                    eContext.setSelection(new CellSelection(markerType, rect, targetCellValue));
                    if (data && data.copyOnly) return;

                    eContext.setMode('write');
                },
                has: () => {
                    const { markerType, markerX, modeParams } = propsRef.current;
                    return markerX !== null && !markerType.endsWith('gap') && !modeParams.fixed
                }
            },
            apply: {
                exec: () => {
                    const { ApplyModal, markerX, markerY, markerWidth, markerHeight, markerType } = propsRef.current;
                    const undoSelection = gridProvider.getSelection(
                        markerX,
                        markerY,
                        markerType === 'rows' ? gridProvider.getWidth() : markerWidth,
                        markerType === 'columns' ? gridProvider.getHeight() : markerHeight,
                    );
                    const provider = new BitmapCellProvider(1);
                    provider.setMap(undoSelection.getCells());
                    const image = provider.getImageData();
                    ApplyModal.open({
                        images: [ getCanvasForBitmap(image) ],
                        background: '#000000',
                        filters: '',
                        save: newFilters => {
                            const bitmapGrid = new BitmapGrid({image: wContext.getFilteredImageData(newFilters, image)})
                            const doSelection = bitmapGrid.getSelection(0, 0, image.width, image.height);
                            doAction(
                                () => {
                                    gridProvider.writeSelection(markerX, markerY, doSelection)
                                },
                                () => {
                                    gridProvider.writeSelection(markerX, markerY, undoSelection)
                                }
                            );
                            ApplyModal.close()
                        }
                    });
                },
                has: () => {
                    const { markerType, markerX } = propsRef.current;
                    return gridProvider.baseCellValue === CellValue.color && markerX !== null && ['rect', 'columns', 'rows'].includes(markerType)
                }
            },
            fill: {
                exec: () => {
                    const { markerX, markerY, markerWidth, markerHeight, markerType } = propsRef.current;
                    const { selection } = eContextRef.current;
                    const width = markerType === 'rows' ? gridProvider.getWidth() : markerWidth;
                    const height = markerType === 'columns' ? gridProvider.getHeight() : markerHeight;
                    const cellValue = selection.getCellValue();
                    const doSelection = new CellSelection(markerType, selection.getCells(), cellValue);
                    const undoSelection = gridProvider.getSelection(
                        markerX,
                        markerY,
                        width,
                        height,
                        cellValue
                    );
                    doAction(
                        () => {
                            gridProvider.fillRectWithSelection(
                                markerX,
                                markerY,
                                width,
                                height,
                                doSelection
                            );
                            eContext.renderGrid('main')
                        },
                        () => {
                            gridProvider.fillRectWithSelection(
                                markerX,
                                markerY,
                                width,
                                height,
                                undoSelection
                            );
                            eContext.renderGrid('main')
                        }
                    )
                },
                can: () => eContextRef.current.selection.getCellValue() === eContextRef.current.targetCellValue,
                has: () => {
                    const { markerType, markerX } = propsRef.current;
                    return (edit && markerX !== null && !markerType.endsWith('gap'))
                }
            }
        };
        if (resize) {
            actions.delete = {
                exec: () => {
                    const { posX, markerType, markerY, markerX, markerWidth, markerHeight, gridWidth, gridHeight } = propsRef.current;
                    const undoSelection = gridProvider.getRawSelection(0, 0, gridWidth, gridHeight);
                    doAction(
                        () => {
                            if (markerType === 'rows' || (markerType === 'rect' && markerWidth === gridWidth)) {
                                gridProvider.deleteRows(markerY, markerHeight);
                            } else {
                                gridProvider.deleteColumns(markerX, markerWidth);
                            }
                            setPosX(posX);
                            resetMarker();
                        },
                        () => {
                            gridProvider.importRawSelection(undoSelection);
                            setPosX(posX);
                        }
                    )
                },
                can: () => {
                    const { markerType, markerWidth, markerHeight } = propsRef.current;
                    if (markerType !== 'rect') return true;
                    let dims = 0;
                    if (markerWidth === gridProvider.getWidth()) dims++;
                    if (markerHeight === gridProvider.getHeight()) dims++;
                    return dims === 1
                },
                has: () => {
                    const { markerX, markerType } = propsRef.current;
                    return markerX !== null && ['rect', 'rows', 'columns'].includes(markerType)
                }
            };
            actions.crop = {
                has: () => {
                    const { markerX, markerType } = propsRef.current;
                    return markerX !== null && !markerType.endsWith('gap');
                },
                exec: () => {
                    const { markerX, markerY, markerWidth, markerHeight, markerType, posX, posY } = propsRef.current;
                    const oldWidth = gridProvider.getWidth();
                    const oldHeight = gridProvider.getHeight();
                    const cropWidth = markerType.startsWith('row') ? oldWidth : markerWidth;
                    const cropHeight = markerType.startsWith('column') ? oldHeight : markerHeight;
                    const undoSelection = gridProvider.getRawSelection(
                        0, 0, oldWidth, oldHeight
                    );
                    doAction(
                        () => {
                            gridProvider.reduceToRect(
                                markerX,
                                markerY,
                                cropWidth,
                                cropHeight
                            );
                            setPosX(0);
                            setPosY(0);
                        },
                        () => {
                            gridProvider.importRawSelection(undoSelection);
                            setPosX(posX);
                            setPosY(posY);
                        }
                    );
                    resetMarker()
                }
            };
            actions.addRows = {
                has: () => false,
                exec: data => {
                    const { gridWidth, gridHeight, posY } = propsRef.current;
                    const no = data.no;
                    const start = data.start;
                    let added = null;
                    let oldPosY = posY;
                    let undoSelection = null;
                    let min = Math.min(Math.abs(no), gridHeight - 1);
                    doAction(
                        () => {
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
                        },
                        () => {
                            gridProvider.addRows(start, -added);
                            if (undoSelection) {
                                gridProvider.fillRectWithSelection(
                                    0, start ? 0 : gridHeight + added,
                                    gridWidth, -added,
                                    undoSelection
                                );
                            }
                            setState({posY: oldPosY, start, added: -added, axis: 'y'});
                        }
                    )
                }
            };
            actions.addColumns = {
                has: () => false,
                exec: data => {
                    const { gridWidth, gridHeight, posX } = propsRef.current;

                    const no = data.no;
                    const start = data.start;
                    let added = null;
                    let oldPosX = posX;
                    let undoSelection = null;
                    let min = Math.min(Math.abs(no), gridWidth - 1);
                    doAction(
                        () => {
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
                            const _posX = start ? 0 : Math.max(0, oldPosX + added);
                            setState({posX: _posX, start, added, axis: 'x'});
                        },
                        () => {
                            gridProvider.addColumns(start, -added);
                            if (undoSelection) {
                                gridProvider.fillRectWithSelection(
                                    start ? 0 : gridWidth + added, 0,
                                    -added, gridHeight,
                                    undoSelection
                                );
                            }
                            setState({posX: oldPosX, start, added: -added, axis: 'x'});
                        }
                    )
                }
            };
            actions.insert = {
                buttons: [
                    {icon: 'add', padded: false, params: {no: 1}},
                    {icon: 'add', padded: false, name: '10', params: {no: 10}}
                ],
                has: () => propsRef.current.markerType && propsRef.current.markerType.endsWith('gap'),
                exec: data => {
                    const { posX, posY, markerX, markerY, markerType } = propsRef.current;
                    let no = data.no;
                    if (!no) {
                        no = 1;
                    }
                    if (markerType === 'row-gap') {
                        const oldMarkerY = markerY;
                        doAction(
                            () => {
                                gridProvider.insertRowsAt(oldMarkerY, no);
                                setPosY(posY + 1);
                                setPosY(posY);
                            },
                            () => {
                                gridProvider.deleteRows(oldMarkerY, no);
                                setPosY(posY + 1);
                                setPosY(posY);
                            }
                        )
                    } else {
                        const oldMarkerX = markerX;
                        doAction(
                            () => {
                                gridProvider.insertColumnsAt(oldMarkerX, no);
                                setPosY(posY + 1);
                                setPosY(posY);
                            },
                            () => {
                                gridProvider.deleteColumns(oldMarkerX, no);
                                setPosY(posY + 1);
                                setPosY(posY);
                            }
                        )
                    }
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
                                onLeftClick: data.onLeftClick ? (e, x, y) => {
                                        wContext.startExclusiveMode('pick', 'pointer');
                                        setMarker('rect', x, y)
                                        data.onLeftClick(e, x, y);
                                        wContext.addEventListener('mouseup', e => {
                                            resetMarker();
                                            wContext.endExclusiveMode('pick');
                                        }, {once: true});
                                    } :
                                    (e, x, y) => {
                                    if (modes.includes('write')) {
                                        setLastClick('pick', e, () => setMode('write'));
                                    }
                                    wContext.startExclusiveMode('pick', 'pointer');
                                    const lastSelection = gridProvider.getSelection(x, y, 1, 1, eContextRef.current.targetCellValue);
                                    eContext.setSelection(lastSelection);
                                    wContext.addEventListener('mouseup', e => {
                                        checkLastClick(e);
                                        resetMarker();
                                        wContext.endExclusiveMode('pick');
                                        const last = {clientX: e.clientX, clientY: e.clientY};
                                        cursor.propsRef.current.last = last;
                                        update();
                                        if (data.onPick) {
                                            data.onPick(lastSelection.getCell())
                                        }
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
                            let clear = false;

                            let lastPosX = null;
                            let lastPosY = null;

                            const track = (x, y, addPos = false) => {
                                if (x === null || y === null) {
                                    return;
                                }
                                if (addPos) {
                                    const { posX, posY } = propsRef.current;
                                    x += posX;
                                    y += posY;
                                }
                                if (lastPosX === x && lastPosY === y) {
                                    return;
                                }
                                lastPosX = x;
                                lastPosY = y;
                                let segment;
                                const { selection } = eContextRef.current;
                                const { writeTransparent } = propsRef.current;
                                if (selection.isRows()) {
                                    x = 0;
                                } else if (selection.isColumns()) {
                                    y = 0;
                                }

                                if (clear) {
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

                            const startPath = (e, x, y) => {
                                wContext.startExclusiveMode('write', 'cell');
                                path = {new: {}, old: {}};
                                track(x, y);
                                wContext.addEventListener('mousemove', e => {
                                    const pos = getGridPosFromEvent(e);
                                    track(pos.x, pos.y, true);
                                });
                                wContext.addEventListener('mouseup', e => {
                                    wContext.endExclusiveMode('write');
                                    const doPath = path.new;
                                    const undoPath = path.old;
                                    const { selection } = eContextRef.current;
                                    const cellValue = selection.getCellValue();
                                    doAction(
                                        () => {
                                            gridProvider.writePath(doPath, cellValue);
                                        },
                                        () => {
                                            gridProvider.writePath(undoPath, cellValue);
                                        }
                                    );
                                    cursor.propsRef.current.last = {clientX: e.clientX, clientY: e.clientY};
                                    resetMarker();
                                }, {once: true})
                            };

                            cursor.propsRef.current = {
                                onLeftClick: ( ...props ) => {
                                    clear = false;
                                    startPath( ...props );
                                },
                                onRightClick: ( ...props ) => {
                                    clear = true;
                                    startPath(...props );
                                }
                            }
                        },
                        cleanUp: () => {
                            cursor.propsRef.current = {};
                        }
                    };
                    break;

                case 'move-marker':
                    obj = {
                        init: data => {
                            marker.propsRef.current = {
                                initMove: moveMarker
                            };
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
                            if (data.markerX !== undefined) {
                                setMarker(data.type, data.markerX, data.markerY, data.width, data.height);
                            }
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
                                        (data.fixed && !data.multi) || data.type.endsWith('gap') ?
                                            moveMarker(startEvent) :
                                            resizeMarker(
                                                startEvent,
                                                {axis: 'xy', cursor: 'nwse-resize', startX: false, startY: false}
                                            )
                                    });
                                },
                                inclusion: true
                            };
                            let isGap = false;
                            if (data.type.endsWith('gap')) {
                                isGap = data.type === 'row-gap' ? 'Rows' : 'Columns'
                            }
                            marker.propsRef.current = {
                                initMove: moveMarker,
                                onRightClick: !isGap ? null : () => eContext.doGridAction('insert', {no: 1}),
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
        return { controller, actions }
    }, []);
}

function ManagedGrid({
         gridProvider, cellType, modes, markerType, setMarkerType,
         posX, posY, setPosX, setPosY, writeTransparent,
         width, height, zoom, border, rulers,
         markerX, markerY, setMarkerX, setMarkerY, valid,
         markerWidth, markerHeight, setMarkerWidth, setMarkerHeight,
         markerGapX, markerGapY, undo,
         ...props
    }) {
    const gContext = useContext(GridContext);
    const eContext = useContext(EditorContext);
    const mounted = useMounted();

    const ApplyModal = useModal();

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
            update, doAction: undo && eContext ? eContext.doAction : action => action()
        }
    }, []);

    const propsRef = useRef(null);
    propsRef.current = {
        mounted, ApplyModal,
        gridProvider, trackX, trackY,
        cursorWidth, cursorHeight, cursorType,
        mode, modeParams, writeTransparent,
        gridWidth, gridHeight, width, height, posX, posY,
        markerX, markerY, markerWidth, markerHeight,
        markerType, markerGapX, markerGapY, ...props
    };

    const { controller, actions } = useGridModes({modes, propsRef, cursor, marker, setter});
    useMemo(() => {
        eContext.setGridActions(actions)
    }, []);

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
    }, [mode, modeParams]);

    useMemo(() => {
        d('mode?', props.mode);
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
                    valid={valid}
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
            <ApplyModal.content name="Apply filters to selection..." full>
                <FiltersModal { ...ApplyModal.props } />
            </ApplyModal.content>
        </Overlays>
    )
}

function FlexGridInner({ gridProvider, cellType, border, zoom, rulers, maxZoom, setMaxZoom, setZoom,
    width, setWidth, height, setHeight, posX, setPosX, posY, setPosY, undo, ...props }) {
    const aContext = useContext(AvailContext);
    const cssContext = useContext(CssContext);

    let gridWidth = gridProvider.getWidth();
    let gridHeight = gridProvider.getHeight();
    const gridLength = gridProvider.getLength;

    const value = useMemo(() => {
        if (!aContext.width || !aContext.height) return null;

        // TODO: check & replace magic numbers
        let spaceX = Math.max(aContext.width - border - 2 * cssContext.getValue('defaultPaddingPx') -
            (rulers ? 38 : 0), 0);
        let spaceY = Math.max(aContext.height - border - 2 * cssContext.getValue('defaultPaddingPx') -
            (rulers ? 22 : 0), 0);

        const wrap = !!gridProvider.setWrapWidth;
        const cellDim = cellType.getCellSize(spaceX, spaceY, zoom, border);

        const maxWidth = wrap ? gridLength : gridWidth;
        const maxHeight = wrap ? gridLength : gridHeight;

        let maxPageX = Math.min(maxWidth,  Math.floor(spaceX / cellDim.xPlusBorder));
        let maxPageY = Math.min(maxHeight, Math.floor(spaceY / cellDim.yPlusBorder));

        if (wrap) {
            gridProvider.setWrapWidth(
                cellDim.wrapWidth
            );
            gridWidth = gridProvider.getWidth();
            gridHeight = gridProvider.getHeight()
        }
        if (maxPageX < gridWidth && spaceX >= 21) {
            spaceY -= 21 // scrollbarHeight;
        }
        if (maxPageY < gridHeight && spaceY >= 21) {
            spaceX -= 21 // scrollbarWidth;
        }

        maxPageX = Math.max(Math.min(Math.floor(spaceX / cellDim.xPlusBorder), gridWidth), 1);
        maxPageY = Math.max(Math.min(Math.floor(spaceY / cellDim.yPlusBorder), gridHeight), 1);

        if (maxZoom !== undefined) {
            const newMaxZoom = Math.max(cellType.getMinZoom(), cellDim.maxZoom);
            if (maxZoom !== newMaxZoom) {
                setMaxZoom(newMaxZoom);
            }
            if (zoom > newMaxZoom) {
                setZoom(newMaxZoom);
            }
        }
        return {
            border,
            zoom,
            sizeX: gridProvider.getCellSizeX(),
            sizeY: gridProvider.getCellSizeY(),
            cellSizeX: cellDim.x,
            cellSizeY: cellDim.y,
            cellPlusBorderSizeX: cellDim.xPlusBorder,
            cellPlusBorderSizeY: cellDim.yPlusBorder,
            maxPageX,
            maxPageY,
            boundingRectRef: {current: null}
        }
    }, [zoom, border, gridWidth, gridHeight, gridLength, rulers, aContext.width, aContext.height]);

    if (!value) return '';

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

    return (
        <GridContext.Provider value={value}>
            <ScrollArea
                full auto
                x={posX} setX={setPosX} maxX={gridWidth} pageX={pageX}
                y={posY} setY={setPosY} maxY={gridHeight} pageY={pageY}
            >
                <Block full centerItems>
                    <ManagedGrid
                        undo={undo}
                        gridProvider={gridProvider} cellType={cellType}
                        border={border} zoom={zoom} rulers={rulers}
                        posX={posX} setPosX={setPosX}
                        posY={posY} setPosY={setPosY}
                        width={pageX} height={pageY}
                        { ...props }
                    />
                </Block>
            </ScrollArea>
        </GridContext.Provider>
    )
}

function FlexGrid({  ...props }) {
    return (
        <AvailContextProvider>
            <FlexGridInner { ...props } />
        </AvailContextProvider>
    )
}

function FramedFlexGrid({ gridProvider, posX, posY, setPosX, setPosY, width, height, resize, edit, navi, undo, ...props}) {

    const eContext = useContext(EditorContext);

    useUpdateOnGridDimChanges(gridProvider);

    const doAction = undo && eContext ? eContext.doAction : action => action();

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const shiftRow = start => {
        const doWidth = gridWidth;
        const doHeight = gridHeight;
        const undoSelection =
            gridProvider.getRawSelection(
                0, start ? 0 : doHeight - 1, doWidth, 1
            );
        doAction(
            () => {
                gridProvider.addRows(start, -1);
                gridProvider.addRows(!start, 1);
            },
            () => {
                gridProvider.addRows(!start, -1);
                gridProvider.addRows(start, 1);
                gridProvider.writeSelection(
                    0, start ? 0 : doHeight - 1,
                    undoSelection
                )
            }
        )
    };
    const shiftColumn = start => {
        const doWidth = gridWidth;
        const doHeight = gridHeight;
        const undoSelection =
            gridProvider.getRawSelection(
                start ? 0 : doWidth - 1, 0, 1, doHeight
            );
        doAction(
            () => {
                gridProvider.addColumns(start, -1);
                gridProvider.addColumns(!start, 1);
            },
            () => {
                gridProvider.addColumns(!start, -1);
                gridProvider.addColumns(start, 1);
                gridProvider.writeSelection(
                    start ? 0 : doWidth - 1, 0,
                    undoSelection
                );
            }
        )
    };
    const addRows = (no, start) => {
        return () => eContext.doGridAction('addRows',{no, start})
    };
    const addColumns = (no, start) => {
        return () => eContext.doGridAction('addColumns', {no, start});
    };
    const maxPosX = Math.max(gridWidth - width, 0);
    const maxPosY = Math.max(gridHeight - height, 0);

    const innerProps = {
        gridProvider, posX, posY, setPosX, setPosY,
        width, height, resize, edit, navi, undo, ...props
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
                        {edit &&
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
                    {edit &&
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
                <FlexGrid { ...innerProps } />
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
                    {edit && <Button icon="system_update_alt" rotate={-90} onClick={() => shiftColumn(false)} />}
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
                    {edit && <Button icon="system_update_alt" onClick={() => shiftRow(false)} />}
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
    );
}

function BaseGrid({ gridProvider, selection, onDoubleClick, targetValues = [], undo, resize, edit, navi, minZoom = 1, maxZoom = 10, ...props }) {
    const eContext = useContext(EditorContext);

    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(1);
    const [height, setHeight] = useState(1);
    const [zoom, setZoom] = useState(props.zoom ? props.zoom : (minZoom !== undefined ? minZoom : 1));
    const [border, setBorder] = useState(1);
    const [rulers, setRulers] = useState(false);
    const [writeTransparent, setWriteTransparent] = useState(false);

    const [markerType, setMarkerType] = useState('rect');
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(null);
    const [markerHeight, setMarkerHeight] = useState(null);
    const [markerGapX, setMarkerGapX] = useState(0);
    const [markerGapY, setMarkerGapY] = useState(0);

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY);
    }, [sizeX, sizeY]);

    const mode = eContext.mode;

    useEffect(() => {
        const cellValue = gridProvider.baseCellValue;
        if (cellValue) {
            // TODO take default value from props?
            eContext.setSelection(new CellSelection('rect',[[cellValue.getEmpty()]], cellValue));
        }
    }, []);

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const showPin = selection.unfix && mode === 'select' && markerX !== null;
    const isPinned = (showPin && eContext.modeParams.fixed);

    const sectorWidth = selection.fixed || isPinned ? eContext.modeParams.width : markerWidth;
    const sectorHeight = selection.fixed || isPinned ? eContext.modeParams.height : markerHeight;

    const hasSegments = selection.multi && markerX !== null && isPinned;

    const maxSegsX = hasSegments ?
        Math.floor((gridWidth - markerX - sectorWidth) / (sectorWidth + markerGapX)) + 1 : 1;
    let segsX = 1;
    if (hasSegments && sectorWidth !== markerWidth) {
        segsX += (markerWidth - sectorWidth) / (sectorWidth + markerGapX);
    }
    const maxSegsY = hasSegments ?
        Math.floor((gridHeight - markerY - sectorHeight) / (sectorHeight + markerGapY)) + 1 : 1;
    let segsY = 1;
    if (hasSegments && sectorHeight !== markerHeight) {
        segsY += (markerHeight - sectorHeight) / (sectorHeight + markerGapY);
    }
    const maxSectorWidth = hasSegments ?
        Math.floor((gridWidth - markerX - (segsX - 1) * markerGapX) /  segsX) : 1;

    const maxSectorHeight = hasSegments ?
        Math.floor((gridHeight - markerY - (segsY - 1) * markerGapY) /  segsY) : 1;

    const targetValueOptions = useMemo(() => {
        const options = [];
        for (let value of targetValues) {
            options.push({id: value.getId(), name: value.getName()});
        }
        return options
    }, [targetValues]);

    const modes = props.modes ? props.modes : (edit ? ['select', 'pick', 'write'] : 'select');
    const startMode = (modes.length === 1) ? modes[0] : 'select';
    const startModeParams = startMode === 'select' ? selection : props.modeParams;
    const hasMode = value => modes.includes(value);
    const modeParams = eContext.modeParams;

    let isGap = false;
    if (markerX !== null && markerType.endsWith('gap')) {
        isGap = modeParams.type === 'row-gap' ? 'r' : 'c';
    }
    const actions = eContext.getGridActions();
    const buttons = [];
    for (let [name, action] of Object.entries(actions)) {
        if (action.has && !action.has()) continue;

        if (action.buttons) {
            for (let button of action.buttons) {
                const { params, ...buttonProps } = button;
                const key = '' + buttonProps.name + buttonProps.icon;
                buttons.push(
                    <Button { ...buttonProps } key={key} onClick={() => eContext.doGridAction(name, button.params)} />
                );
            }
        } else {
            buttons.push(<Button key={name} name={name} padded="h" onClick={action} />);
        }
    }
    const markerActions = <Stack>{buttons}</Stack>;

    return (
        <Stack vertical borders full>
            <Toolbar full="h">
                <ToolGroup>
                    {undo &&
                        <UndoRedoButtons />
                    }
                    {modes.length > 1 &&
                        <Stack gaps="1">
                            {edit && hasMode('pick') && <Button icon="colorize" current={eContext.mode} value={'pick'} onClick={() => eContext.setMode('pick')} />}
                            {edit && hasMode('write') && <Button icon="edit" current={eContext.mode} value={'write'} onClick={() => eContext.setMode('write')} />}
                            {edit && hasMode('drag') && <Button icon="pan_tool" current={eContext.mode} value={'drag'} onClick={() => eContext.setMode('drag')} />}
                            {edit && hasMode('add') && <Button icon="exposure" rotate={180} current={eContext.mode} value={'add'} onClick={() => eContext.setMode('add')} />}
                            {hasMode('select') && <Button icon="highlight_alt" current={modeParams.type || (mode === 'select' && 'rect')} value={'rect'} onClick={() => eContext.setMode('select', selection)} />}
                            {edit && hasMode('select')  && <Button icon="view_week" rotate={-90} current={modeParams.type} value={'rows'} onClick={() => eContext.setMode('select', {type: 'rows'})} />}
                            {edit && hasMode('select') && <Button icon="view_week" current={modeParams.type} value={'columns'} onClick={() => eContext.setMode('select', {type: 'columns'})} />}
                            {resize && hasMode('select')  && <Button icon="border_horizontal" current={modeParams.type} value={'row-gap'} onClick={() => eContext.setMode('select', {type: 'row-gap'})} />}
                            {resize && hasMode('select') && <Button icon="border_vertical" current={modeParams.type} value={'column-gap'} onClick={() => eContext.setMode('select', {type: 'column-gap'})} />}
                        </Stack>
                    }
                </ToolGroup>
                <ToolGroup>
                    <Tuple name="Position:" x={posX} setX={setPosX} maxX={gridWidth - width} min={0}
                           y={posY} setY={setPosY} maxY={gridHeight - height} />
                    <Number name="Zoom:" value={zoom} min={minZoom} max={maxZoom} set={setZoom} />
                    <Number name="Border:" value={border} min={0} max={10} set={setBorder} />
                    <Checkbox name="Rulers" value={rulers} set={setRulers} />
                </ToolGroup>
                <BackgroundControl />
            </Toolbar>
            <Block full>
                <FramedFlexGrid
                    modes={modes} mode={startMode} modeParams={startModeParams}
                    gridProvider={gridProvider} cellType={cellType}
                    zoom={zoom} border={border} rulers={rulers}
                    posX={posX} setPosX={setPosX} posY={posY} setPosY={setPosY}
                    width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                    gridWidth={gridWidth} gridHeight={gridHeight}
                    markerX={markerX} markerY={markerY} setMarkerX={setMarkerX} setMarkerY={setMarkerY}
                    markerWidth={markerWidth} markerHeight={markerHeight}
                    markerGapX={markerGapX} markerGapY={markerGapY}
                    setMarkerType={setMarkerType} markerType={markerType}
                    setMarkerWidth={setMarkerWidth} setMarkerHeight={setMarkerHeight}
                    writeTransparent={writeTransparent}
                    pinned={isPinned} edit={edit}
                    resize={resize} navi={navi}
                    onDoubleClick={onDoubleClick} undo={undo}
                />
            </Block>
            <Toolbar full="h">
                <ToolGroup>
                    <Stack gaps>
                        <Block>Mode:</Block>
                        <Block><Kbd value={mode} /></Block>
                    </Stack>
                    {mode === 'write' && targetValues.length > 1 &&
                        <Block width={100}>
                            <Select
                                value={eContext.targetCellValue.getId()}
                                buttons
                                full="h"
                                options={targetValueOptions}
                                set={id => eContext.setTargetCellValue(id)}
                            />
                        </Block>
                    }
                    {mode === 'write' && !eContext.selection.isCell() &&
                        <Checkbox name="Opaque" value={writeTransparent} set={setWriteTransparent} />
                    }
                </ToolGroup>

                {mode === 'select' &&
                <ToolGroup>
                    {isGap ?
                        <Number
                            name="Position:"
                            value={isGap === 'c' ? markerX : markerY}
                            set={isGap === 'c' ? setMarkerX : setMarkerY}
                            min={0} max={isGap === 'c' ? gridWidth : gridHeight}
                        /> :
                        <>
                            {markerX !== null &&
                                <Tuple name="Position:"
                                       x={markerX} setX={setMarkerX} min={0} maxX={gridWidth - markerWidth}
                                       maxY={gridHeight - markerHeight} y={markerY} setY={setMarkerY} />
                            }
                            {!selection.multi && markerX !== null &&
                                <Tuple name="Size:"
                                       x={markerWidth} setX={setMarkerWidth} maxX={gridWidth - markerX} min={1}
                                       y={markerHeight} setY={setMarkerHeight} maxY={gridHeight - markerY}
                                       readOnly={selection.fixed} />
                            }
                        </>
                    }
                    {hasSegments &&
                        <Tuple
                            name="Size:"
                            x={sectorWidth} setX={value => {
                            setMarkerWidth(value + (value + markerGapX) * (segsX - 1));
                            const params = { ...eContext.modeParams };
                            params.width = value;
                            eContext.setMode('select', params);
                        }} maxX={maxSectorWidth} min={1}
                            y={sectorHeight} setY={value => {
                            setMarkerHeight(value + (value + markerGapY) * (segsY - 1));
                            const params = { ...eContext.modeParams };
                            params.height = value;
                            eContext.setMode('select', params);
                        }} maxY={maxSectorHeight}
                            disabled={selection.fixed}
                        />
                    }
                    {hasSegments &&
                        <Tuple
                            name="Segments:"
                            x={segsX} setX={value => {setMarkerWidth(sectorWidth + (sectorWidth + markerGapX) * (value - 1))}} maxX={maxSegsX} min={1}
                            y={segsY} setY={value => {setMarkerHeight(sectorHeight + (sectorHeight + markerGapY) * (value - 1))}} maxY={maxSegsY}
                        />
                    }
                    {hasSegments &&
                        <Tuple name="Gap:"
                               x={markerGapX}
                               setX={
                                   value => {
                                       const oversize = markerWidth - sectorWidth;
                                       const sectors = (oversize / (sectorWidth + markerGapX));
                                       const newWidth = sectorWidth + sectors * (sectorWidth + value);
                                       setMarkerGapX(value);
                                       setMarkerWidth(newWidth);
                                   }
                               }
                               maxX={
                                   markerGapX + Math.floor(
                                       (gridWidth - (markerX + markerWidth)) / (
                                           markerWidth <= (sectorWidth * 2 + markerGapX) ?
                                               1 :
                                               ((markerWidth - sectorWidth)/(sectorWidth + markerGapX))
                                       )
                                   )
                               }
                               y={markerGapY}
                               setY={
                                   (value) => {
                                       const oversize = markerHeight - sectorHeight;
                                       const sectors = (oversize / (sectorHeight + markerGapY));
                                       const newHeight = sectorHeight + sectors * (sectorHeight + value);
                                       setMarkerGapY(value);
                                       setMarkerHeight(newHeight);
                                   }}
                               maxY={
                                   markerGapY + Math.floor(
                                       (gridHeight - (markerY + markerHeight)) / (
                                           markerHeight <= (sectorHeight * 2 + markerGapY) ?
                                               1 :
                                               ((markerHeight - sectorHeight) / (sectorHeight + markerGapY))
                                       )
                                   )
                               }
                               min={0}
                        />
                    }
                    {markerX !== null &&
                        <Stack gaps="1">
                            <Button icon="north_west" onClick={
                                () => {
                                    eContext.doGridAction('goto');
                                }
                            } />
                            {!(isGap || modeParams.fixed) && <Button icon="select_all" onClick={
                                () => {
                                    setMarkerX(0);
                                    setMarkerY(0);
                                    setMarkerWidth(gridProvider.getWidth());
                                    setMarkerHeight(gridProvider.getHeight());
                                }
                            } />}
                            {edit && <Button icon="clear" onClick={
                                () => {
                                    setMarkerX(null);
                                    setMarkerY(null);
                                    setMarkerWidth(null);
                                    setMarkerHeight(null)
                                }
                            } />}
                        </Stack>
                    }
                    {showPin &&
                        <Button
                            icon="push_pin"
                            value={true}
                            current={isPinned}
                            onClick={() => {
                                const newParams = { ...eContext.modeParams, fixed: !isPinned };
                                newParams.width = newParams.fixed ? markerWidth : sectorWidth;
                                newParams.height = newParams.fixed ? markerHeight : sectorHeight;
                                newParams.markerX = markerX;
                                newParams.markerY = markerY;

                                if (!newParams.fixed) {
                                    setMarkerWidth(sectorWidth);
                                    setMarkerHeight(sectorHeight);
                                }
                                eContext.setMode('select', newParams);
                            }}
                        />
                    }
                    {markerActions}
                </ToolGroup>
                }
            </Toolbar>
        </Stack>
    )
}

function useUpdateOnGridDimChanges(gridProvider, callback) {
    const update = useComponentUpdate();

    useEffect(
        () => {
            const callbackAndUpdate = !callback ? update : () => {
                callback();
                update()
            };
            gridProvider.addDimListener(callbackAndUpdate);
            return () => {
                gridProvider.removeDimListener(callbackAndUpdate);
            }
        },
        [gridProvider]
    );
    return update;
}

export {
    CellGrid,
    GridCellMarker,
    GridCursorOverlay,
    GridMarkerOverlay,
    GridRulerH,
    GridRulerV,
    FlexGrid,
    FramedFlexGrid,
    BaseGrid
}