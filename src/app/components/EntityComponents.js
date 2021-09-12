import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import { Block, DIR, Stack } from "./LayoutComponents";
import { d, noop, getEmptyImageData } from "../helper/helper";
import { Button, Input, Number, Checkbox } from "./FormComponents";
import {
    EditorCtx,
    CenterInfo,
    EditorContext,
    Section,
    Canvas,
    Kbd,
    AvailContextProvider,
    useFocusKeyBindings,
    useRefocus,
    Toolbar,
    ToolGroup,
    ScrollArea,
    BackgroundControl,
    useUpdateOnEntityIndexChanges,
    useCallAfterwards,
    AvailContext, WindowContext, useCssProps
} from "./BasicComponents";
import { FlexGrid } from "./GridComponents";
import { useFilterPipelineModal } from "./EditorComponents";
import { CellSelection } from "../classes/CellProvider";
import { WrappingIndexGrid } from "../classes/Grid";
import { PictureCell } from "./BaseComponents";

function makeOp(customOp, defaultOp, defaultCan = true) {
    const isObj = typeof customOp === 'object';
    const hasCustomExec = isObj && customOp.exec;
    const canByDefault = typeof defaultCan === 'function' ? defaultCan() : defaultCan;
    return {
        exec: () => !customOp || (isObj && !hasCustomExec) ? defaultOp() : (hasCustomExec ? customOp.exec() : customOp()),
        can: () => canByDefault && (!customOp || !isObj || !customOp.can || customOp.can())
    }
}

function EntityStack({ entityIndex, set, getName = item => item.value, getInfo, undo, area, addOp, cloneOp, editOp, deleteOp, order, emptyText, deselect, children, ...props }) {
    const eContext = useContext(EditorContext);

    const doAction = undo && eContext ? eContext.doAction : action => action();

    const add = props.add !== undefined ? props.add : !!addOp;
    const edit = props.edit !== undefined ? props.edit : !!editOp;
    const clone = props.clone !== undefined ? props.clone : !!cloneOp;
    const del = props.del !== undefined ? props.del : !!deleteOp;

    useUpdateOnEntityIndexChanges(entityIndex);

    let [active, setActiveRaw] = useState(props.active === undefined || entityIndex.getLength() === 0 ? null : props.active);
    const entities = entityIndex.getEntityObjects();
    if (props.setActive !== undefined) {
        setActiveRaw = props.setActive;
        active = props.active;
    }
    let [shadow, setShadow] = useState(active);

    const stackRef = useRef(null);
    const refocus = useRefocus(stackRef);
    const setActive = value => {
        refocus();
        if (value !== null) {
            setShadow(value);
        }
        setActiveRaw(value)
    };

    const stackAttr = useFocusKeyBindings({
        keyHandlers: [
            {
                keys: ['ArrowDown', 'ArrowRight'],
                handler:
                    () => {
                        let newIndex = (active === null ? shadow : active) + 1;
                        if (newIndex >= entities.length) {
                            newIndex = 0;
                        }
                        if (active === null) {
                            setShadow(newIndex);
                            refocus();
                        } else {
                            setActive(newIndex);
                        }
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                handler:
                    () => {
                        let newIndex = (active === null ? shadow : active) - 1;
                        if (newIndex < 0) {
                            newIndex = entities.length - 1;
                        }
                        if (active === null) {
                            setShadow(newIndex);
                            refocus()
                        } else {
                            setActive(newIndex);
                        }
                    }
            },
            {
                keys: [' '],
                handler:
                    () => {
                        if (entities.length === 0) {
                            return
                        }
                        if (!deselect && active !== null) {
                            return;
                        }
                        if (active === null) {
                            setActive(shadow !== null ? shadow : 0);
                        } else {
                            setActive(null);
                        }
                    }
            }
        ]
    });

    const indexSize = entityIndex.getLength();
    if (active !== null && indexSize === 0) {
        setActiveRaw(null);
        return '';
    } else if (indexSize > 0 && active >= indexSize) {
        setActiveRaw(indexSize - 1);
        return ''
    }

    const items = [];
    let index = 0;
    // TODO use reasonable font width
    const numLen = (('' + indexSize).length + 2) * 8;
    for(let entity of entities) {
        const curr = index;
        const isActive = index === active;
        const attr = {
            onClick: () => {
                if (curr === active) {
                    if (deselect) {
                        setActive(null);
                    }
                } else {
                    setActive(curr);
                }
            }
        };
        if (isActive || (index === shadow && active === null)) {
            attr.tab = true;
        }
        items.push(
            <Stack key={index} border={DIR.BOTTOM} gaps className={'hover-highlight' + (isActive ? ' active-bg' : ' control-bg')} full="h" {...attr}>
                <Block width={numLen} className="less" padded>#{index + 1}</Block>
                <Stack vertical full="h" padded gaps>
                    <Block shorten>{getName(entity)}</Block>
                    {getInfo && <Block className="less" shorten>{getInfo(entity)}</Block>}
                </Stack>
            </Stack>
        );
        index++
    }
    const isEmpty = items.length === 0;

    const execAdd = () => {throw Error('Missing implementation of addOp!')};

    const execEdit = () => {throw Error('Missing implementation of editOp!')};

    const execDelete = () => {
        const oldEntity = entityIndex.getEntityObject(active);
        doAction(
            () => entityIndex.deleteEntity(oldEntity.index),
            () => entityIndex.setEntityObject(oldEntity)
        )
    };

    const execClone = () => {
        const index = active;
        const cloneEntity = { ...entityIndex.getEntityObject(index) };

        if (entityIndex.hasUniqueValues()) {
            let no = 2;
            let name = cloneEntity.value;
            const matches = name.match(/ #(\d)+$/);
            if (matches) {
                name = name.substr(0, matches.index + 2);
                no = parseInt(matches[1])
            } else {
                name += ' #';
            }
            while (entityIndex.hasPropValue('value', name + no)) {
                no++;
            }
            cloneEntity.value = name + no;
        }
        cloneEntity.index++;
        doAction(
            () => entityIndex.setEntityObject(cloneEntity),
            () => entityIndex.deleteEntity(index + 1)
        );
        setActive(cloneEntity.index);
    };

    const execUp = !order ? null : () => {
        const index = active;
        doAction(
            () => {
                const old = entityIndex.getEntityObject(index - 1);
                entityIndex.deleteEntity(index - 1);
                entityIndex.setEntityObject({ ...old, index});
            },
            () => {
                const old = entityIndex.getEntityObject(index);
                entityIndex.deleteEntity(index);
                entityIndex.setEntityObject({ ...old, index: index - 1});
            }
        );
        setActive(active - 1)
    };

    const execDown = !order ? null : () => {
        const index = active;
        doAction(
            () => {
                const old = entityIndex.getEntityObject(index + 1);
                entityIndex.deleteEntity(index + 1);
                entityIndex.setEntityObject({ ...old, index});
            },
            () => {
                const old = entityIndex.getEntityObject(index);
                entityIndex.deleteEntity(index);
                entityIndex.setEntityObject({ ...old, index: index + 1});
            }
        );
        setActive(active + 1)
    };

    const hotKeys = {
        new: makeOp(addOp, execAdd),
        edit: makeOp(editOp, execEdit, active !== null),
        delete: makeOp(deleteOp, execDelete, active !== null && items.length > 0),
        clone: makeOp(cloneOp, execClone, active !== null),
        up: {
            exec: () => execUp(),
            can: () => active !== null && active > 0
        },
        down: {
            exec: () => execDown(),
            can: () => active !== null && active < (entityIndex.getLength() - 1)
        },
    };

    let elem = (
        <Stack vertical borders full area={area} hotKeys={hotKeys}>
            <Block full="h">
                <Stack full wrap gaps className="toolbar-bg">
                    {add && <Button icon="add" onClick={hotKeys.new} />}
                    {edit && <Button icon="edit" onClick={hotKeys.edit} />}
                    {clone && <Button icon="content_copy" onClick={hotKeys.clone} />}
                    {del && <Button icon="delete" onClick={hotKeys.delete} />}
                    {order && <Button icon="keyboard_arrow_up" onClick={hotKeys.up} />}
                    {order && <Button icon="keyboard_arrow_down" onClick={hotKeys.down} />}
                </Stack>
            </Block>
            <Block full ref={stackRef}>
                <Stack vertical full={isEmpty ? true : "h"} scroll {...stackAttr}>
                    {isEmpty ? <CenterInfo>{emptyText}</CenterInfo> : items}
                </Stack>
            </Block>
        </Stack>
    );

    if (children) {
        elem = <Stack>
            {elem}
            <Block>{children}</Block>
        </Stack>
    }

    return elem
}

function EntityStackSections({ id, sectionProps, detailProps, active, children, ...props}) {

    const items = [];

    items.push(
        <Section key={0} id={id} { ...sectionProps }>
            <EntityStack active={active} { ...props } />
        </Section>
    );
    if (children) {
        items.push(
            <Section key={1} id={id ? id + '.props' : null} { ...detailProps }>{children}</Section>
        );
    }
    return (
        <>
            {items}
        </>
    )
}

function FlexStack({ auto, scaling,
       zoom, setZoom, minZoom, maxZoom, setMaxZoom,
       varHeight, fixHeight = 0,
       varWidth, fixWidth = 0, minWidth,
       page, setPage, maxPage, items, render}) {

    const aContext = useContext(AvailContext);

    const callAfterwards = useCallAfterwards();
    const { defaultPaddingPx } = useCssProps('defaultPaddingPx');
    const gap = defaultPaddingPx;

    const getZoomAndHeight = () => {
        const varSpaceY = aContext.height - fixHeight - 2 * gap;
        if (varSpaceY < 0) return null;

        let maxAvailZoom = varSpaceY / varHeight;
        if (!scaling) {
            maxAvailZoom = Math.floor(maxAvailZoom);
        }
        if (maxAvailZoom < minZoom) return null;
        if (auto) {
            maxAvailZoom = maxZoom ? Math.min(maxAvailZoom, maxZoom) : maxAvailZoom;
            if (zoom !== maxAvailZoom) {
                callAfterwards(setZoom,  maxAvailZoom)
            }
            zoom = maxAvailZoom
        } else {
            if (maxZoom !== maxAvailZoom) {
                callAfterwards(setZoom,  maxAvailZoom)
            }
            if (zoom > maxAvailZoom) {
                callAfterwards(setZoom,  maxAvailZoom);
                return null;
            }
        }
        const zoomHeight = zoom * varHeight;
        if (varSpaceY < zoomHeight) {
            return null;
        }
        return {
            height: zoomHeight + fixHeight,
            zoom
        }
    };

    const box = getZoomAndHeight();
    if (!box) {
        return (
            <CenterInfo>No space to render!</CenterInfo>
        )
    }

    let spaceX = aContext.width - gap;
    let elemWidth = box.zoom * varWidth + fixWidth;
    if (minWidth) {
        elemWidth = Math.max(minWidth, elemWidth);
    }
    const newPage = Math.max(1, Math.min(maxPage, Math.floor( spaceX / (elemWidth + gap))));
    if (newPage !== page) {
        callAfterwards(setPage, newPage);
    }
    const count = Math.min(items.length, newPage);

    const blocks = [];
    let index = 0;
    while (blocks.length < count) {
        blocks.push(
            <Block key={index} width={elemWidth} height={box.height} full="v">{render(items[index])}</Block>
        );
        index++;
    }
    return (
        <Stack center gaps>
            {blocks}
        </Stack>
    )
}

function EntityManager({ addOp, editOp, importOp, reassignOp, readOnly, onDoubleClick, onRightClick,
                           entityIndex, emptyText, auto, scaling, minWidth, titleHeight, renderTitle, undo, ...props }) {
    const eContext = useContext(EditorContext);
    const wContext = useContext(WindowContext);
    const { defaultPaddingPx } = useCssProps('defaultPaddingPx');

    const { openFilterPipelineModal, closeFilterPipelineModal, FilterPipelineModal } = useFilterPipelineModal('Apply Filters...');

    const doAction = eContext && undo ? eContext.doAction : action => action();

    let [ posRaw, setPos ] = useState(props.pos !== undefined ? props.pos : 0);
    let pos = posRaw;
    if (props.setPos) {
        setPos = props.setPos;
        pos = props.pos
    }
    const [ zoom, setZoom ] = useState(props.zoom ? props.zoom : 1);
    const [ maxZoom, setMaxZoom ] = useState(props.maxZoom ? props.maxZoom : null);
    let [ pageRaw, setPage ] = useState(props.page !== undefined ? props.page : 1);

    let page = pageRaw;
    if (props.setPage) {
        setPage = props.setPage;
        page = props.page
    }
    const [marked, setMarked] = useState([]);
    const [filter, setFilterRaw] = useState('');
    const setFilter = value => {
        setPos(0);
        setFilterRaw(value);
    };
    useUpdateOnEntityIndexChanges(entityIndex);

    const matcher = props.filter && filter ? filter : null;
    const view = entityIndex.getView(pos, filter ? null : page, matcher);
    view.all = [ ...view.matches];
    if (filter) {
        view.matches = view.matches.slice(0, page);
    }
    const viewEnd = Math.max(view.count - page, 0);
    if (pos > viewEnd) {
        setPos(viewEnd);
    }
    if (minWidth === undefined) {
        minWidth = 50;
    }
    const sizeX = entityIndex.getSizeX();
    const sizeY = entityIndex.getSizeY();
    const padding = defaultPaddingPx;

    if (!renderTitle) {
        renderTitle = value => <Block shorten>{value}</Block>
    }
    const toggleMarker = index => {
        const newMarked = [ ...marked ];
        if (marked.includes(index)) {
            newMarked.splice(marked.indexOf(index), 1);
        } else {
            newMarked.push(index);
        }
        setMarked(newMarked);
    };

    const render = index => {
        const cls = [];
        if (marked.includes(index)) {
            cls.push('active-bg');
        }
        const itemRender = ctx => {
            entityIndex.drawEntity(ctx, index, 0, 0, zoom);
        };
        return (
            <Stack
                vertical
                full
                border="1"
                className={cls.join(' ')}
                onDoubleClick={readOnly || !onDoubleClick ? null : () => onDoubleClick(index)}
                onRightClick={readOnly || !onRightClick ? null : () => onRightClick(index)}
                onLeftClick={readOnly ? null : () => toggleMarker(index)}>
                {renderTitle(index)}
                <Block className="overflow" full centerItems padded="h">
                    <Canvas render={itemRender} width={zoom * sizeX} height={zoom * sizeY} border="1" />
                </Block>
                <Block height={padding}></Block>
            </Stack>
        )
    };

    const bottomItems = [
        <Stack gaps key="info" gaps>
            <Block>{filter ? 'Matching:' : 'Total:'}</Block>
            <Block center="v"><Kbd value={'' + view.count} /></Block>
            {filter && <Block>of</Block>}
            {filter && <Block center="v"><Kbd value={'' + entityIndex.getLength()} /></Block>}
        </Stack>
    ];
    bottomItems.push(
        <Stack gaps key="selection" className={marked.length ? 'active-bg-text' : ''}>
            <Block key="m" center="v">Marked:</Block>
            <Block center="v">
                <Kbd value={'' + marked.length} length={('' + view.count).length} />
            </Block>
            <Stack gaps="1">
                <Button icon="clear" disabled={marked.length === 0} onClick={() => setMarked([])} />
                <Button icon="flaky" onClick={
                    () => {
                        const newMarked = [];
                        for (let index of entityIndex.getAllIndices()) {
                            if (!marked.includes(index)) {
                                newMarked.push(index);
                            }
                        }
                        setMarked(newMarked)
                    }
                } />
                <Button icon="done_all" onClick={() => setMarked(
                    marked.length < entityIndex.getLength() ?
                        entityIndex.getAllIndices() : []
                )} />
            </Stack>

        </Stack>
    );

    if (marked.length) {
        let hidden = 0;
        const notHidden = [];
        for (let index of marked) {
            if (!view.all.includes(index)) {
                hidden++;
            } else {
                notHidden.push(index);
            }
        }
        if (hidden > 0) {
            bottomItems.push(
                <Stack gaps key="hidden">
                    <Block center="v">Hidden: </Block>
                    <Block center="v">
                        <Kbd value={'' + hidden} />
                    </Block>
                    <Button icon="clear" onClick={() => setMarked(notHidden)} />
                </Stack>
            );
        }
    }

    if (marked.length) {
        const execEdit = {
            exec: () => editOp([ ...marked]),
            can: () => marked.length === 1
        };
        const deleteOp = () => {
            const undoEntities = entityIndex.getEntityObjects(marked);
            const doMarked = [ ...marked ];
            doAction(
                () => entityIndex.deleteEntities(doMarked),
                () => entityIndex.setEntityObjects(undoEntities)
            );
            setMarked([]);
        };

        const clearOp = () => {
            const indices = [ ...marked ];
            const emptyBitmap = getEmptyImageData(entityIndex.getSizeX(), entityIndex.getSizeY());
            const undoImages = {};
            for (let index of indices) {
                undoImages[index] = entityIndex.getEntityPropValue(index, 'image');
            }
            doAction(
                () => {
                    for (let index of indices) {
                        entityIndex.setEntityPropValue(index, 'image', emptyBitmap);
                    }
                },
                () => {
                    for (let [index, bitmap] of Object.entries(undoImages)) {
                        entityIndex.setEntityPropValue(index, 'image', bitmap);
                    }
                }
            );
            setMarked([]);
        };

        const applyOp = () => {
            const indices = [ ...marked ];
            const undoImages = [];
            for (let index of indices) {
                undoImages.push(entityIndex.getEntityPropValue(index, 'image'));
            }
            openFilterPipelineModal({
                type: 'imageData',
                images: undoImages,
                save: filters => {
                    if (filters) {
                        const doImages = [];
                        for (let image of undoImages) {
                            doImages.push(wContext.getFilteredImageData(filters, image));
                        }
                        doAction(
                            () => {
                                let i = 0;
                                while (i < doImages.length) {
                                    entityIndex.setEntityPropValue(indices[i], 'image', doImages[i]);
                                    i++;
                                }
                                entityIndex.notify();
                            },
                            () => {
                                let i = 0;
                                while (i < doImages.length) {
                                    entityIndex.setEntityPropValue(indices[i], 'image', undoImages[i]);
                                    i++;
                                }
                                entityIndex.notify();
                            }
                        )
                    }
                    closeFilterPipelineModal()
                }
            });
        };
        const swapOp = {
            exec: () => {
                const first = marked[0];
                const second = marked[1];
                const firstBitmap = entityIndex.getEntityPropValue(first, 'image');
                const secondBitmap = entityIndex.getEntityPropValue(second, 'image');
                doAction(
                    () => {
                        entityIndex.setEntityPropValue(first, 'image', secondBitmap);
                        entityIndex.setEntityPropValue(second, 'image', firstBitmap);
                    },
                    () => {
                        entityIndex.setEntityPropValue(first, 'image', firstBitmap);
                        entityIndex.setEntityPropValue(second, 'image', secondBitmap);
                    }
                );
            },
            can: () => marked.length === 2
        };
        const copyOp = {
            exec: () => {
                const bitmap = entityIndex.getEntityPropValue(marked[0], 'image');
                const selection = new CellSelection('bitmap', [[bitmap]]);
                eContext.setSelection(selection);
                setMarked([])
            },
            can: () => marked.length === 1
        };
        const pasteOp = {
            exec: () => {
                const indices = [ ...marked ];
                const undoObjects = entityIndex.getEntityObjects(indices);
                const pasteBitmap = eContext.selection.getCell();
                doAction(
                    () => {
                        for (let index of indices) {
                            entityIndex.setEntityPropValue(index, 'image', pasteBitmap);
                        }
                    },
                    () => {
                        entityIndex.setEntityObjects(undoObjects, true);
                    }
                );
                setMarked([])
            },
            can: () => {
                if (!(eContext.selection && eContext.selection.isBitmap())) {
                    return false;
                }
                const cell = eContext.selection.getCell();
                return (cell.width === entityIndex.getSizeX() && cell.height === entityIndex.getSizeY());
            }
        };
        bottomItems.push(
            <Stack gaps key="actions">
                <Block center="v" className="active-bg-text">Actions:</Block>
                <Stack gaps="1">
                    <Button name="edit" padded="h" onClick={execEdit} />
                    <Button name="delete" padded="h" onClick={deleteOp} />
                    <Button name="clear" padded="h" onClick={clearOp} />
                    <Button name="apply..." padded="h" onClick={applyOp} />
                    <Button name="reassign" padded="h" onClick={() => reassignOp([ ...marked ])} />
                    <Button name="swap" padded="h" onClick={swapOp} />
                    <Button name="copy" padded="h" onClick={copyOp} />
                    <Button name="paste" padded="h" onClick={pasteOp} />
                </Stack>
            </Stack>
        );
    }
    for (let i = 0; i < bottomItems.length - 1; i++) {
        bottomItems[i] =
            <ToolGroup key={i}>
                {bottomItems[i]}
            </ToolGroup>
    }
    return (
        <Stack full borders>
            {!readOnly &&
                <Block full="v" className="toolbar-bg">
                    <Stack vertical gaps padded scroll>
                        <Button icon="add" onClick={addOp} />
                        <Button icon="playlist_add" onClick={importOp} />
                    </Stack>
                </Block>
            }
            {
                entityIndex.getLength() === 0 ?
                    <Block full>
                        <CenterInfo>{emptyText}</CenterInfo>
                    </Block> :
                    <Stack full vertical borders>
                        <Toolbar>
                            {props.filter &&
                            <ToolGroup>
                                <Stack gaps>
                                    <Input name="Filter:" active={filter !== ''} clear value={filter} set={setFilter} />
                                </Stack>
                            </ToolGroup>
                            }
                            <ToolGroup>
                                <Number name="Position:" value={pos} set={setPos} min={0} max={viewEnd} />
                                {!auto && <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={maxZoom} />}
                            </ToolGroup>
                            <BackgroundControl />
                        </Toolbar>
                        <Block full>
                            {
                                view.count === 0 ?
                                    <CenterInfo>{'No items found matching "' + filter + '"'}</CenterInfo> :
                                    <ScrollArea
                                        auto setX={setPos} pageX={page} x={pos} maxX={view.count}>
                                        <AvailContextProvider>
                                            <FlexStack
                                                auto={auto} scaling={scaling}
                                                render={render} items={view.matches}
                                                zoom={zoom} setZoom={setZoom} minZoom={1} maxZoom={maxZoom} setMaxZoom={setMaxZoom}
                                                varWidth={sizeX} fixWidth={2 * padding} minWidth={minWidth}
                                                fixHeight={titleHeight} varHeight={sizeY}
                                                page={page} maxPage={view.count} setPage={setPage}
                                                onDoubleClick={onDoubleClick}
                                            />
                                        </AvailContextProvider>
                                    </ScrollArea>
                            }
                        </Block>
                        {!readOnly &&
                            <Toolbar>
                                {bottomItems}
                            </Toolbar>
                        }
                    </Stack>
            }

            {FilterPipelineModal}
        </Stack>
    )
}

function EntityPicker({ entityIndex, animationIndex, select, doubleClick, controls, base = null, centerItems = true, ...props }) {
    const [ pos, setPos ] = useState(0);
    const [ zoom, setZoom ] = useState(props.zoom ? props.zoom : 5);
    const [ maxZoom, setMaxZoom ] = useState(10);
    const [ rulers, setRulers ] = useState(false);
    const [ border, setBorder ] = useState(1);
    const [ width, setWidth ] = useState(1);
    const [ height, setHeight ] = useState(1);
    const [ markerX, setMarkerX ] = useState(null);
    const [ markerY, setMarkerY ] = useState(null);
    const [ filter, setFilterRaw ] = useState('');

    if (zoom > maxZoom) {
        setZoom(maxZoom);
    }

    const players = null; // useAnimationPlayers(entityIndex, animationIndex);

    const gridProvider = useMemo(() => {
        return new WrappingIndexGrid(entityIndex, base, players);
    }, [entityIndex]);

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY)
    }, [sizeX, sizeY]);

    const setFilter = value => {
        gridProvider.setMatch(value === '' ? null : value);
        setFilterRaw(value);
        setPos(0);
    };
    const modeProps = useMemo(() => {
        return {
            modes: ['pick'],
            mode: 'pick',
            modeParams: {
                onLeftClick: (e, x, y) => select(gridProvider.getCellValue(x, y))
            }
        }
    }, []);

    return (
        <EditorCtx>
            <Stack vertical full borders>
                {controls &&
                    <Toolbar>
                        {props.filter &&
                            <Input name="Filter:" clear active={filter !== ''} value={filter} set={setFilter} />
                        }
                        <Number name="Pos:" buttons min={0} max={gridProvider.getHeight() - height} value={pos} set={setPos} />
                        <Number name="Zoom:" buttons min={cellType.getMinZoom()} value={zoom} set={setZoom} max={maxZoom} />
                        <Number name="Border:" buttons min={0} value={border} set={setBorder} />
                        <Checkbox name="Rulers:" value={rulers} set={setRulers} />
                    </Toolbar>
                }
                <Block full>
                    {gridProvider.getWidth() === 0 ?
                        <CenterInfo>No items available!</CenterInfo> :
                        <Block full>
                            <FlexGrid
                                { ...modeProps }

                                gridProvider={gridProvider} cellType={cellType}
                                zoom={zoom} setZoom={setZoom} maxZoom={maxZoom} setMaxZoom={setMaxZoom}
                                setBorder={setBorder} setRulers={setRulers}
                                border={border} rulers={rulers} center={centerItems}
                                posX={0} setPosX={noop} posY={pos} setPosY={setPos}
                                width={width} setWidth={setWidth} height={height} setHeight={setHeight}

                                markerType="rect" setMarkerType={noop}
                                markerWidth={1} setMarkerWidth={noop}
                                markerHeight={1} setMarkerHeight={noop}
                                markerX={markerX} setMarkerX={setMarkerX}
                                markerY={markerY} setMarkerY={setMarkerY}

                                valid={(x, y) => gridProvider.getCellValue(x, y) !== null}
                            />
                        </Block>
                    }
                </Block>
            </Stack>
        </EditorCtx>
    )
}

export {
    EntityStack,
    EntityStackSections,
    EntityManager,
    EntityPicker
}
