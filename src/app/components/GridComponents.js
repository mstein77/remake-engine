import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {Block, DIR, Overlay, Overlays, Stack} from "./LayoutComponents";
import {AvailContext, AvailContextProvider, CssContext, Canvas, ScrollArea} from "./BasicComponents";
import { d } from "../helper/helper";

function CellMarkerOverlay({markerType, markerX, markerY, posX, posY, markerWidth, markerHeight, width, height, onDoubleClick}) {
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
                onDoubleClick={onDoubleClick}
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

function CellCursorOverlay({
           cellProvider, cursorType, cursorWidth = 1, cursorHeight = 1, cursorPointer,
           posX, posY, width, height,
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
            (posY + offY > cellProvider.getHeight() - cursorHeight ||
                posX + offX > cellProvider.getWidth() - cursorWidth
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
        let posX = Math.floor((e.clientX - rect.x + adjustPosX) / gContext.cellPlusBorderSizeX);
        let reset = (posX < 0 || posX >= maxPosX);
        let posY = Math.floor((e.clientY - rect.y + adjustPosY)/ gContext.cellPlusBorderSizeY);
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
    return (
        <Overlay width={gContext.dimX} height={gContext.dimY}>
            <Canvas render={render} width={gContext.dimX} height={gContext.dimY} />
        </Overlay>
    )
}

const GridContext = React.createContext();

function AvailGridInner({
            gridProvider, cellType, gridWidth, gridHeight,
            width, setWidth, height, setHeight,
            border, zoom, rulers,
            posX, setPosX, posY, setPosY, children
        }) {
    const aContext = useContext(AvailContext);
    const cssContext = useContext(CssContext);

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
            maxPageY
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
                        {children}
                    </Overlays>
                </Block>
            </ScrollArea>
        </GridContext.Provider>
    )

}

function AvailGrid(props) {
    return (
        <AvailContextProvider>
            <AvailGridInner {...props} />
        </AvailContextProvider>
    );
}

function GridCellMarker({ dir = DIR.ALL, type, cursor, posX, posY, sizeX = 1, sizeY = 1, highlight, onClick, onResize, onMove, onMouseDown, onDoubleClick, zoom = 1, border = 0, width = 1, height = 1, moveCursor, ...props }) {
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
        centerStyle.cursor = moveCursor ? moveCursor : 'move';
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
                onResize(e, 'x', false);
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
                onResize(e, 'xy', true, true);
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
                onResize(e, 'xy', false, true);
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
                onResize(e, 'x', true);
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
                onResize(e, 'y', null, true);
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
                onResize(e, 'y', null, false);
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
                onResize(e, 'xy', true, false);
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
                onResize(e, 'xy', false, false);
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
    GridRulerH,
    GridRulerV,
    AvailGrid,
    CellCursorOverlay,
    CellMarkerOverlay
}