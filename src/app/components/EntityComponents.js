import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import { Block, DIR, Stack } from "./LayoutComponents";
import { d, noop, clamp, getEmptyImageData } from "../helper/helper";
import { Button, Input, Number, Checkbox } from "./FormComponents";
import {
    EditorCtx,
    useRefocusFirst,
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
    useCachedState,
    AvailContext,
    WindowContext,
    useCssProps
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
    const callAfterwards = useCallAfterwards();

    const [ dropIndex, setDropIndex ] = useState(null);
    const [ dragging, setDragging ] = useState(false);
    const dropRef = useRef({dragIndex: null});
    dropRef.current.source = entityIndex;
    dropRef.current.dropIndex = dropIndex;

    const doAction = undo && eContext ? eContext.doAction : action => action();

    const add = props.add !== undefined ? props.add : !!addOp;
    const edit = props.edit !== undefined ? props.edit : !!editOp;
    const clone = props.clone !== undefined ? props.clone : !!cloneOp;
    const del = props.del !== undefined ? props.del : !!deleteOp;

    useUpdateOnEntityIndexChanges(entityIndex);

    let [ active, setActiveRaw ] = useState(props.active === undefined || entityIndex.getLength() === 0 ? null : props.active);
    const entities = entityIndex.getEntityObjects();
    if (props.setActive !== undefined) {
        setActiveRaw = props.setActive;
        active = props.active;
    }
    let [ shadow, setShadow ] = useState(active);

    const stackRef = useRef(null);
    const { canRefocus, refocus } = useRefocusFirst(stackRef);

    const setActive = (value, forceFocus = false) => {
        const doRefocus = forceFocus || canRefocus();
        if (value !== null) {
            setShadow(value);
        }
        setActiveRaw(value);
        if (doRefocus) {
            refocus()
        }
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
                            refocus()
                        } else {
                            setActive(newIndex, true)
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
                            setActive(newIndex, true);
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
                            setActive(null, true);
                        }
                    }
            }
        ]
    });

    const indexSize = entityIndex.getLength();
    if (active !== null && indexSize === 0) {
        callAfterwards(setActiveRaw, null);
    } else if (indexSize > 0 && active >= indexSize) {
        const doRefocus = canRefocus();
        callAfterwards(() => {
            setActiveRaw(indexSize - 1);
            if (doRefocus) {
                refocus()
            }
        });
    }
    const dragLeave = index => e => {
        requestAnimationFrame(() => {
            if (dropRef.current.dropIndex === index) {
                setDropIndex(null)
            }
        });
        e.preventDefault()
    }
    const dragEnter = index => e => {
        e.preventDefault();
        setDropIndex(index)
    }
    const dragStart = index => e => {
        e.dataTransfer.dropEffect = "move";
        dropRef.current.dragIndex = index;
        setDragging(true);
        window.addEventListener('dragend', e => {
            setDropIndex(null);
            setDragging(false)
        }, {once: true})
    };
    const drop = index => e => {
        if (index === dropRef.current.dragIndex) return;

        const indexDrag = dropRef.current.dragIndex;
        const indexDrop = index;
        eContext.doAction(
            () => {
                const dragged = entityIndex.getEntityObject(indexDrag);
                const dropped = entityIndex.getEntityObject(indexDrop);
                entityIndex.setEntityObjects([{ ...dragged, index: indexDrop}, { ...dropped, index: indexDrag }], true);
            },
            () => {
                const dragged = entityIndex.getEntityObject(indexDrag);
                const dropped = entityIndex.getEntityObject(indexDrop);
                entityIndex.setEntityObjects([{ ...dragged, index: indexDrop}, { ...dropped, index: indexDrag }], true);
            }
        );
        dropRef.current.dragIndex = null;
        setActive(index)
    }
    const items = [];
    let index = 0;
    // TODO use reasonable font width
    const numLen = (('' + indexSize).length + 2) * 8;
    for(let entity of entities) {
        const curr = index;
        const isActive = index === active;
        const attr = {
            onLeftClick: () => {
                if (curr === active) {
                    if (deselect) {
                        setActive(null);
                    }
                } else {
                    setActive(curr, true);
                }
            }
        };
        if (isActive || (index === shadow && active === null)) {
            attr.tab = true;
        }
        const itemCls = ['hover-change' + (isActive ? ' active-bg active-color' : ' ghost-bg')];
        if (index === dropIndex) {
            itemCls.push('focus-outline');
        }
        items.push(
            <Stack key={index} onDragOver={dragging ? e => e.preventDefault() : null} onDrop={dragging ? drop(index) : null} onDragLeave={dragging ? dragLeave(index) : null} onDragEnter={dragging ? dragEnter(index) : null} onDragStart={order ? dragStart(index) : null} border={DIR.BOTTOM} cursor="pointer" gaps className={itemCls.join(' ')} full="h" { ...attr }>
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
        const isFirst = index === 0;
        const maxIndex = entityIndex.getLength() - 1;
        doAction(
            () => {
                const oldIndex = isFirst ? 0 : index - 1;
                const old = entityIndex.getEntityObject(oldIndex);
                entityIndex.deleteEntity(oldIndex);
                entityIndex.setEntityObject({ ...old, index: isFirst ? maxIndex : index });
            },
            () => {
                const oldIndex = isFirst ? maxIndex : index;
                const old = entityIndex.getEntityObject(oldIndex);
                entityIndex.deleteEntity(oldIndex);
                entityIndex.setEntityObject({ ...old, index: isFirst ? 0 : index - 1 });
            }
        );
        setActive(isFirst ? maxIndex : active - 1)
    };
    const execDown = !order ? null : () => {
        const index = active;
        const maxIndex = entityIndex.getLength() - 1;
        const isLast = index === maxIndex;
        doAction(
            () => {
                const oldIndex = isLast ? maxIndex : index + 1;
                const old = entityIndex.getEntityObject(oldIndex);
                entityIndex.deleteEntity(oldIndex);
                entityIndex.setEntityObject({ ...old, index: isLast ? 0 : index });
            },
            () => {
                const oldIndex = isLast ? 0 : index;
                const old = entityIndex.getEntityObject(oldIndex);
                entityIndex.deleteEntity(oldIndex);
                entityIndex.setEntityObject({ ...old, index: isLast ? maxIndex : index + 1 });
            }
        );
        setActive(isLast ? 0 : active + 1 )
    };

    const hotKeys = {
        new: makeOp(addOp, execAdd),
        edit: makeOp(editOp, execEdit, active !== null),
        delete: makeOp(deleteOp, execDelete, active !== null && items.length > 0),
        clone: makeOp(cloneOp, execClone, active !== null),
        up: {
            exec: () => execUp(),
            can: () => active !== null && entityIndex.getLength() > 1
        },
        down: {
            exec: () => execDown(),
            can: () => active !== null && entityIndex.getLength() > 1
        }
    };

    let elem = (
        <Stack key="stack" vertical borders full area={area} hotKeys={hotKeys}>
            <Block full="h">
                <Stack key="buttons" full wrap gaps className="secondary-bg">
                    {add && <Button key="add" icon="add" onClick={hotKeys.new} />}
                    {edit && <Button key="edit" icon="edit" onClick={hotKeys.edit} />}
                    {clone && <Button key="clone" icon="content_copy" onClick={hotKeys.clone} />}
                    {del && <Button key="del" icon="delete" onClick={hotKeys.delete} />}
                    {order && <Button key="up" icon="keyboard_arrow_up" onClick={hotKeys.up} />}
                    {order && <Button key="down" icon="keyboard_arrow_down" onClick={hotKeys.down} />}
                </Stack>
            </Block>
            <Block full ref={stackRef}>
                <Stack vertical scroll full={isEmpty ? true : "h"} { ...stackAttr }>
                    {isEmpty ? <CenterInfo>{emptyText}</CenterInfo> : items}
                </Stack>
            </Block>
        </Stack>
    );
    if (children) {
        return (
            <Stack>
                {elem}
                <Block>{children}</Block>
            </Stack>
        )
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


function FlexStackInner({
        zoom, setZoom, minZoom, maxZoom, setMaxZoom,
        varHeight, fixHeight = 0,
        varWidth, fixWidth = 0, minWidth,
        pos, setPos, page, setPage, maxPage,
        auto, scaling, items, render, ...props }) {

    const aContext = useContext(AvailContext);

    const callAfterwards = useCallAfterwards();
    const { defaultPaddingPx } = useCssProps('defaultPaddingPx');
    const gap = defaultPaddingPx;

    const getFlexPropsForDim = (width, height) => {
        let maxAvailZoom = height / varHeight;
        if (!scaling) {
            maxAvailZoom = Math.floor(maxAvailZoom);
        }
        if (props.maxAvailZoom) {
            maxAvailZoom = Math.min(maxAvailZoom, props.maxAvailZoom);
        }
        if (minZoom && maxAvailZoom < minZoom) return null;

        const newZoom = clamp(minZoom, auto ? maxAvailZoom : zoom, maxAvailZoom);
        const elemWidth = clamp(minWidth, newZoom * varWidth + fixWidth);
        const newPage = clamp(1, Math.floor( width / (elemWidth + gap)), maxPage);

        return {
            zoom: newZoom,
            maxZoom: maxAvailZoom,
            elemWidth,
            page: newPage
        }
    }

    const flex = useMemo(() => {
        if (!aContext.width || !aContext.height) return null;

        let varSpaceY = aContext.height - fixHeight - 2 * gap;
        if (varSpaceY < 0) return null;

        const spaceX = aContext.width - gap;

        let calc = getFlexPropsForDim(spaceX, varSpaceY);
        if (!calc) return null;

        if (calc.page < maxPage) {
            calc = getFlexPropsForDim(spaceX, varSpaceY - 21);
            if (!calc) return null;
        }
        if (calc.zoom !== zoom) {
            callAfterwards(setZoom, calc.zoom)
        }
        if (!auto && maxZoom && maxZoom !== calc.maxZoom) {
            callAfterwards(setMaxZoom,  calc.maxZoom)
        }
        const zoomHeight = calc.zoom * varHeight;
        if (varSpaceY < zoomHeight) {
            return null;
        }
        if (calc.page !== page) {
            callAfterwards(setPage, calc.page);
        }
        const count = Math.min(items.length, calc.page);

        return {
            elemWidth: calc.elemWidth,
            count,
            page: calc.page,
            height: zoomHeight + fixHeight,
        }
    }, [zoom, aContext.width, aContext.height, items.length, maxPage, gap, fixWidth, fixHeight, varWidth, varHeight]);

    if (!flex) {
        return (
            <CenterInfo>No space to render!</CenterInfo>
        )
    }
    const blocks = [];
    let index = 0;
    while (blocks.length < flex.count) {
        blocks.push(
            <Block key={index} width={flex.elemWidth} height={flex.height} full="v">{render(items[index])}</Block>
        );
        index++;
    }
    return (
        <ScrollArea
            auto setX={setPos} pageX={flex.page} x={pos} maxX={maxPage}>
            <Stack center gaps>
                {blocks}
            </Stack>
        </ScrollArea>
    )
}

function FlexStack({ ...props }) {
    return (
        <AvailContextProvider>
            <FlexStackInner { ...props } />
        </AvailContextProvider>
    )
}

function EntityManager({
       addOp, editOp, importOp, reassignOp, readOnly, onDoubleClick, onRightClick,
       entityIndex, emptyText, auto, scaling, minWidth, titleHeight, renderTitle, undo, ...props
    }) {
    const eContext = useContext(EditorContext);
    const wContext = useContext(WindowContext);
    const { defaultPaddingPx, buttonBorderWidthPx, buttonMinPaddingPx, fmButton } = useCssProps('defaultPaddingPx', 'buttonBorderWidthPx', 'buttonMinPaddingPx', 'fmButton');
    const minHeightToolbar = 2 * (defaultPaddingPx + buttonBorderWidthPx + buttonMinPaddingPx) + fmButton;

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
    const [ marked, setMarked ] = useState([]);
    const [ filter, setFilterRaw ] = useState('');
    const setFilter = value => {
        setPos(0);
        setFilterRaw(value);
    };
    useUpdateOnEntityIndexChanges(entityIndex);

    const matcher = props.filter && filter ? filter : null;
    const view = entityIndex.getView(pos, filter ? null : page, matcher);
    view.all = [ ...view.matches ];
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
        const cls = [
            'hover-change',
            marked.includes(index) ? 'active-bg active-color' : 'ghost-bg'
        ];
        const itemRender = ctx => {
            entityIndex.drawEntity(ctx, index, 0, 0, zoom);
        };
        return (
            <Stack
                vertical
                full
                border="1"
                className={cls.join(' ')}
                cursor="pointer"
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

    const bottomItems = {};
    bottomItems.info = (
        <Stack gaps key="info" gaps>
            <Block>{filter ? 'Matching:' : 'Total:'}</Block>
            <Block center="v"><Kbd value={'' + view.count} /></Block>
            {filter && <Block>of</Block>}
            {filter && <Block center="v"><Kbd value={'' + entityIndex.getLength()} /></Block>}
        </Stack>
    );
    bottomItems.selection = (
        <Stack gaps key="selection" className={marked.length ? 'active-bg-text' : ''}>
            <Block key="m" center="v" className={marked.length ? 'active-underlined' : ''}>Marked:</Block>
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

    if (marked.length && filter) {
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
            bottomItems.hidden = (
                <Stack gaps key="hidden">
                    <Block center="v" className="warning-underlined">Hidden: </Block>
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
        bottomItems.actions = (
            <Stack gaps key="actions">
                <Block center="v" className="active-bg-text active-underlined">Actions:</Block>
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
    const groups = [];
    for(let [key, elem] of Object.entries(bottomItems)) {
        groups.push(<ToolGroup key={key}>{elem}</ToolGroup>);
    }
    return (
        <>
        <Stack full borders>
            {!readOnly &&
                <Block full="v" className="secondary-bg">
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
                                    <FlexStack
                                        auto={auto} scaling={scaling}
                                        render={render} items={view.matches} maxAvailZoom={props.maxZoom}
                                        zoom={zoom} setZoom={setZoom} minZoom={1} maxZoom={maxZoom} setMaxZoom={setMaxZoom}
                                        varWidth={sizeX} fixWidth={2 * padding + 2} minWidth={minWidth}
                                        fixHeight={titleHeight + padding + 2} varHeight={sizeY}
                                        page={page} maxPage={view.count} setPage={setPage}
                                        pos={pos} setPos={setPos}
                                        onDoubleClick={onDoubleClick}
                                    />
                            }
                        </Block>
                        {!readOnly &&
                            <Toolbar minHeight={minHeightToolbar}>
                                {groups}
                            </Toolbar>
                        }
                    </Stack>
            }

        </Stack>
        {FilterPipelineModal}
        </>
    )
}

function EntityPicker({ entityIndex, animationIndex, select, doubleClick, controls, empty = 'No items available!', base = null, centerItems = true, ...props }) {

    const callAfterwards = useCallAfterwards();

    const [ pos, setPos ] = useState(0);
    const [ zoom, setZoom ] = useState(props.zoom !== undefined ? props.zoom : 1);
    const [ maxZoom, setMaxZoom ] = useState(props.maxZoom !== undefined ? props.maxZoom : 10);
    const [ rulers, setRulers ] = useCachedState(props.rulers !== undefined ? null : 'global', 'EntityPickerRulers', props.rulers !== undefined ? props.rulers : false, 'bool');
    const [ border, setBorder ] = useCachedState(props.border !== undefined ? null : 'global', 'EntityPickerBorder', props.border !== undefined ? props.border : 1, 'number');
    const [ width, setWidth ] = useState(1);
    const [ height, setHeight ] = useState(1);
    const [ markerX, setMarkerX ] = useState(null);
    const [ markerY, setMarkerY ] = useState(null);
    const [ filter, setFilterRaw ] = useState('');

    if (zoom > maxZoom) {
        callAfterwards(setZoom, maxZoom);
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

    const hasItems = gridProvider.getWidth() > 0;

    return (
        <EditorCtx>
            <Stack vertical full borders>
                {hasItems && controls &&
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
                        <CenterInfo>{empty}</CenterInfo> :
                        <Block full>
                            <FlexGrid
                                { ...modeProps }

                                gridProvider={gridProvider} cellType={cellType}
                                zoom={zoom} setZoom={setZoom} maxZoom={maxZoom} setMaxZoom={setMaxZoom}
                                maxAvailZoom={props.maxZoom}
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
