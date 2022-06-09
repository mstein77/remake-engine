import React, { Fragment, useContext, useMemo, useRef, useState} from "react";
import { Block, DIR, Stack } from "./LayoutComponents";
import { d, noop, clamp, getEmptyImageData, ucfirst, intersect, without } from "../helper/helper";
import {Button, Input, Number, Checkbox, Radio, Select} from "./FormComponents";
import {
    EditorCtx,
    useAnimationPlayers,
    CenterInfo,
    EditorContext,
    ButtonStack,
    Section,
    Canvas,
    Kbd,
    Icon,
    AvailContextProvider,
    Toolbar,
    ToolGroup,
    ScrollArea,
    BackgroundControl,
    useUpdateOnEntityIndexChanges,
    useCallAfterwards,
    useCachedState,
    AvailContext,
    WindowContext,
    useCssProps,
    UndoRedoButtons,
    useFocusManager,
    useMultiSelector, useExclusiveSelector, Separator
} from "./BasicComponents";
import { FlexGrid } from "./GridComponents";
import { useFilterPipelineModal } from "./EditorComponents";
import { CellSelection } from "../classes/CellProvider";
import { WrappingIndexGrid } from "../classes/Grid";
import { PictureCell, TrackingContext, PictureAndTextCell } from "./GridComponents";

function EntityStack({ entityIndex, set, getName = item => item.value, getInfo, undo, area, emptyText, deselect, children, ...props }) {
    const eContext = useContext(EditorContext);
    const update = useUpdateOnEntityIndexChanges(entityIndex);

    const [ dropIndex, setDropIndex ] = useState(null);
    const [ dragging, setDragging ] = useState(false);
    const dropRef = useRef({dragIndex: null});
    dropRef.current.source = entityIndex;
    dropRef.current.dropIndex = dropIndex;

    const doAction = undo && eContext ? eContext.doAction : action => action();

    let [ active, setActive ] = useState(props.active === undefined || entityIndex.getLength() === 0 ? null : props.active);
    const entities = entityIndex.getEntityObjects();
    if (props.setActive !== undefined) {
        setActive = props.setActive;
        active = props.active;
    }
    const stackRef = useRef(null);
    const indexSize = entityIndex.getLength();
    const { focusItem, attr, refocus, setActiveFocus, ...focus } = useFocusManager({
        count: indexSize,
        update,
        reset: deselect === true,
        divRef: stackRef,
        handleSpace: true,
        active,
        setActive
    });

    const paramsRef = useRef(null);
    paramsRef.current = {
        active, entityIndex, doAction, setActiveFocus
    };
    const actions = useMemo(() => {
        const can = ({ active, entityIndex }) => active !== null && entityIndex.getLength();
        return [
            {id: 'add', icon: 'add'},
            {id: 'edit', icon: 'edit', can},
            {
                id: 'clone', icon: 'content_copy', can,
                exec: ({ active, entityIndex, doAction, setActiveFocus }) => {
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
                    setActiveFocus(cloneEntity.index)
                }
            },
            {
                id: 'delete', icon: 'delete', can,
                exec: ({ entityIndex, active, doAction }) => {
                    const oldEntity = entityIndex.getEntityObject(active);
                    doAction(
                        () => entityIndex.deleteEntity(oldEntity.index),
                        () => entityIndex.setEntityObject(oldEntity)
                    )
                }
            },
            {
                id: 'up', icon: 'keyboard_arrow_up', parent: 'order', can,
                exec: ({ active, entityIndex, doAction, setActiveFocus }) => {
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
                    setActiveFocus(isFirst ? maxIndex : active - 1)
                }
            },
            {
                id: 'down', icon: 'keyboard_arrow_down', parent: 'order', can,
                exec: ({ active, entityIndex, doAction, setActiveFocus }) => {
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
                    setActiveFocus(isLast ? 0 : active + 1 )
                }
            }
        ];
    }, []);

    const { buttons, hotkeys } = getActionButtonsAndHotkeys(actions, props, paramsRef);

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
        setActiveFocus(index);
        refocus()
    }
    const items = [];
    let index = 0;
    // TODO use reasonable font width
    const numLen = (('' + indexSize).length + 2) * 8;
    for(let entity of entities) {
        const curr = index;
        const isActive = index === active;
        const itemCls = ['hover-change' + (isActive ? ' active-bg active-color' : ' ghost-bg')];
        if (index === dropIndex) {
            itemCls.push('focus-outline')
        }
        items.push(
            <Stack
                key={index} full="h"
                onDragOver={dragging ? e => e.preventDefault() : null}
                onDrop={dragging ? drop(index) : null}
                onDragLeave={dragging ? dragLeave(index) : null}
                onDragEnter={dragging ? dragEnter(index) : null}
                onDragStart={props.order ? dragStart(index) : null}
                border={DIR.BOTTOM} cursor="pointer"
                gaps
                className={itemCls.join(' ')}
                { ...focus.itemAttr(curr) }
            >
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

    let elem = (
        <Stack key="stack" vertical borders full area={area} hotKeys={hotkeys}>
            <Block full="h">
                <ButtonStack buttons={buttons} full wrap gaps className="secondary-bg" />
            </Block>
            <Block full ref={stackRef}>
                <Stack key="stack" vertical scroll full={isEmpty ? true : "h"} { ...attr }>
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
       readOnly, onDoubleClick, onRightClick, animationIndex,
       entityIndex, emptyText, auto, scaling, minWidth, undo,
       titleHeight, footerHeight = 0, renderTitle, renderFooter, ...props
    }) {
    const eContext = useContext(EditorContext);
    const wContext = useContext(WindowContext);

    const { defaultPaddingPx, buttonBorderWidthPx, buttonMinPaddingPx, fmButton } = useCssProps('defaultPaddingPx', 'buttonBorderWidthPx', 'buttonMinPaddingPx', 'fmButton');
    const minHeightToolbar = 2 * (defaultPaddingPx + buttonBorderWidthPx + buttonMinPaddingPx) + fmButton;
    const { openFilterPipelineModal, closeFilterPipelineModal, FilterPipelineModal } = useFilterPipelineModal('Apply Filters...');
    const doAction = eContext && undo !== false ? eContext.doAction : action => action();

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
    const selector = useMultiSelector({});
    const marked = selector.selection;
    const setMarked = selector.setSelection;

    const [ filter, setFilterRaw ] = useState('');
    const setFilter = value => {
        setPos(0);
        setFilterRaw(value);
    };
    useUpdateOnEntityIndexChanges(entityIndex);

    const players = useAnimationPlayers(entityIndex, animationIndex);

    const matcher = props.filter && filter ? filter : null;
    const view = entityIndex.getView(pos, filter ? null : page, matcher);
    view.all = [ ...view.matches ];
    if (filter) {
        view.matches = view.matches.slice(0, page);
    }
    if (players) {
        const hasAnimationProp = animationIndex && entityIndex.hasEntityProp('animation');
        const animations = [];
        for (let index of view.matches) {
            const animation = hasAnimationProp ?
                entityIndex.getEntityPropValue(index, 'animation') :
                entityIndex.getEntityValue(index);
            if (animation !== '') {
                animations.push(animation);
            }
        }
        players.setAnimations(animations);
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

    const avail = sizeY * zoom;
    const zoomOrAvail = auto ? {width: avail, height: avail} : zoom;

    const { attr, itemAttr } = useFocusManager({
        selector, count: view.count, page, handleSpace: true, pos, setPos,
        dblAction: readOnly || !onDoubleClick ? null : index => onDoubleClick(index)
    });
    if (!renderTitle) {
        renderTitle = value => <Block shorten>{value}</Block>
    }
    const bottomHeight = footerHeight ? footerHeight + padding : padding;

    const render = index => {
        const cls = [
            'hover-change',
            marked.includes(index) ? 'active-bg active-color' : 'ghost-bg'
        ];
        const itemRender = ctx => {
            entityIndex.drawEntity(ctx, index, 0, 0, zoomOrAvail, players);
        };
        const { onLeftClick, ...stackAttr } = itemAttr(index);

        return (
            <Stack vertical full>
                <Stack
                    vertical
                    full
                    className={cls.join(' ')}
                    border="1"
                    cursor="pointer"
                    xonDoubleClick={readOnly || !onDoubleClick ? null : () => onDoubleClick(index)}
                    onRightClick={readOnly || !onRightClick ? null : () => onRightClick(index)}
                    onLeftClick={readOnly ? null : () => {selector.select(index); onLeftClick()}}
                    { ...stackAttr }
                >
                    <Block full="h">
                        {renderTitle(index)}
                    </Block>
                    <Block full padded={DIR.ALL_BUT_TOP}>
                        <Block border="1" center>
                            {entityIndex.hasEntityImage(index) ?
                                <Canvas render={itemRender} width={avail} height={avail} /> :
                                <Block width={avail} height={avail} />
                            }
                        </Block>
                    </Block>
                </Stack>
                {renderFooter && <Block height={footerHeight}>{renderFooter(index)}</Block>}
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

    const exec = useMemo(() => {
        return {
            delete: ({ marked, doAction, entityIndex }) => {
                const undoEntities = entityIndex.getEntityObjects(marked);
                const doMarked = [ ...marked ];
                doAction(
                    () => entityIndex.deleteEntities(doMarked),
                    () => entityIndex.setEntityObjects(undoEntities)
                );
                selector.clearSelection()
            },
            clear: ({ marked, doAction, entityIndex }) => {
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
                selector.clearSelection()
            },
            swap: ({ marked, doAction, entityIndex }) => {
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
                )
            },
            apply: ({ marked, entityIndex, doAction, wContext,
                        openFilterPipelineModal, closeFilterPipelineModal }) => {
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
            },
            copy: ({ marked, eContext, entityIndex }) => {
                const bitmap = entityIndex.getEntityPropValue(marked[0], 'image');
                const selection = new CellSelection('bitmap', [[bitmap]]);
                eContext.setSelection(selection);
                selector.clearSelection()
            },
            paste: ({ marked, eContext, entityIndex }) => {
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
                selector.clearSelection()
            }
        }
    }, []);

    const paramsRef = useRef(null);
    paramsRef.current = {
        eContext, wContext, marked, entityIndex, doAction, exec,
        openFilterPipelineModal, closeFilterPipelineModal
    };

    const sideActions = useMemo(() => {
        return [
            {id: 'add', icon: 'add'},
            {id: 'import', icon: 'playlist_add'}
        ]
    }, []);
    const markedActions = useMemo(() => {
        return [
            {id: 'edit', name: 'edit', can: ({ marked }) => marked.length === 1},
            {id: 'delete', name: 'delete', exec: exec.delete},
            {id: 'clear', name: 'clear', exec: exec.clear},
            {id: 'apply', name: 'apply', exec: exec.apply},
            {id: 'assign', name: 'assign'},
            {id: 'swap', name: 'swap', exec: exec.swap, can: ({ marked }) => marked.length === 2},
            {id: 'copy', name: 'copy', exec: exec.copy, can: ({ marked }) => marked.length === 1},
            {id: 'paste', parent: 'copy', name: 'paste', exec: exec.paste, can: ({ eContext, entityIndex }) => {
                if (!(eContext.selection && eContext.selection.isBitmap())) {
                    return false;
                }
                const cell = eContext.selection.getCell();
                return (cell.width === entityIndex.getSizeX() && cell.height === entityIndex.getSizeY());
            }}
        ]
    }, []);
    const { buttons: sideButtons, hotkeys: sideHotkeys } = getActionButtonsAndHotkeys(sideActions, props, paramsRef);
    const { buttons: actionButtons, hotkeys: markedHotkeys } = getActionButtonsAndHotkeys(markedActions, props, paramsRef);

    const hotkeys = { ...sideHotkeys, ...markedHotkeys };

    const markerButtons = [
        {icon: 'clear',  disabled: marked.length === 0, onClick: () => selector.clearSelection()},
        {icon: 'done_all',
            onClick: () => setMarked(
                marked.length < entityIndex.getLength() ?
                    entityIndex.getAllIndices() : []
            )
        },
        {icon: 'flaky', onClick: () => selector.invertSelection(entityIndex.getAllIndices())}
    ];
    bottomItems.selection = (
        <Stack gaps key="selection" className={marked.length ? 'active-bg-text' : ''}>
            <Block key="m" center="v" className={marked.length ? 'active-underlined' : ''}>Marked:</Block>
            <Block center="v">
                <Kbd value={'' + marked.length} length={('' + view.count).length} />
            </Block>
            <ButtonStack gaps="1" buttons={markerButtons} />
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
        bottomItems.actions = (
            <Stack gaps key="actions">
                <Block center="v" className="active-bg-text active-underlined">Actions:</Block>
                <ButtonStack gaps="1" buttons={actionButtons} buttonProps={{padded: 'h'}} />
            </Stack>
        );
    }
    const toolGroups = [];
    for(let [key, elem] of Object.entries(bottomItems)) {
        toolGroups.push(<ToolGroup key={key}>{elem}</ToolGroup>);
    }

    return (
        <>
        <Stack full borders hotKeys={hotkeys}>
            {!readOnly &&
                <Block full="v" className="secondary-bg">
                    <ButtonStack vertical gaps buttons={sideButtons} padded scroll />
                </Block>
            }
            {
                entityIndex.getLength() === 0 ?
                    <Block full>
                        <CenterInfo>{emptyText}</CenterInfo>
                    </Block> :
                    <Stack full vertical borders>
                        <Toolbar>
                            {undo && <UndoRedoButtons />}
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
                        <Block full { ...attr }>
                            {
                                view.count === 0 ?
                                    <CenterInfo>{'No items found matching "' + filter + '"!'}</CenterInfo> :
                                    <FlexStack
                                        auto={auto} scaling={scaling}
                                        render={render} items={view.matches} maxAvailZoom={props.maxZoom}
                                        zoom={zoom} setZoom={setZoom} minZoom={1} maxZoom={maxZoom} setMaxZoom={setMaxZoom}
                                        varWidth={sizeX} fixWidth={2 * padding + 4} minWidth={minWidth}
                                        fixHeight={bottomHeight + titleHeight + 4} varHeight={sizeY}
                                        page={page} maxPage={view.count} setPage={setPage}
                                        pos={pos} setPos={setPos}
                                        onDoubleClick={onDoubleClick}
                                    />
                            }
                        </Block>
                        {!readOnly &&
                            <Toolbar minHeight={minHeightToolbar}>
                                {toolGroups}
                            </Toolbar>
                        }
                    </Stack>
            }

        </Stack>
        {FilterPipelineModal}
        </>
    )
}

function EntityPicker({
      entityIndex, animationIndex, select, doubleClick, controls, empty = 'No items available!',
      base = null, centerItems = true, text, ...props }) {

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
    const players = useAnimationPlayers(entityIndex, animationIndex);

    const gridProvider = useMemo(() => {
        return new WrappingIndexGrid(entityIndex, base, players);
    }, [entityIndex]);

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();
    let render = null;
    const cellType = useMemo(() => {
        if (text) {
            return new PictureAndTextCell(sizeX, sizeY, text);
        }
        return new PictureCell(sizeX, sizeY)
    }, [sizeX, sizeY, text]);
    render = !text ? null : (x, y) => {
        const index = gridProvider.getCellValue(x, y);
        if (index === null) {
            return '';
        }
        return (
            <Stack center="v" gaps padded full="h">
                {zoom > 0 &&
                    <Block center="v">{
                        entityIndex.hasEntityImage(index) ?
                        <Canvas width={sizeX * zoom} height={sizeY * zoom} render={ctx => gridProvider.index.drawEntity(ctx, index, 0, 0, {width: sizeX * zoom, height: sizeY * zoom}, players)} border /> :
                        <Block border="1" width={sizeX * zoom} height={sizeY * zoom} />
                    }</Block>
                }
                <Block center="v" full="h" shorten>{entityIndex.getEntityValue(index)}</Block>
            </Stack>
        )
    }
    const setFilter = value => {
        gridProvider.setMatch(value === '' ? null : value);
        setFilterRaw(value);
        setPos(0);
    };
    gridProvider.setMatch(filter === '' ? null : filter);
    if (players) {
        gridProvider.updatePlayers(pos, width, height);
    }
    const modeProps = useMemo(() => {
        return {
            modes: ['pick'],
            mode: 'pick',
            modeParams: {
                onLeftClick: (e, x, y) => select(gridProvider.getCellValue(x, y)),
                onDoubleClick: doubleClick ? (e, x, y) => doubleClick(gridProvider.getCellValue(x, y)) : null
            }
        }
    }, []);
    const hasItems = filter || gridProvider.getWidth() > 0;
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
                        <CenterInfo>{filter ? `No items found matching filter "${filter}"!` : empty}</CenterInfo> :
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
                                render={render}
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

function getActionButtonsAndHotkeys(actions, props, paramsRef) {
    const buttons = [];
    const hotkeys = {};
    for (let { id, parent, name, icon, exec, can, required = false } of actions) {
        let op = props[id + 'Op'];
        if (op !== undefined) {
            if (typeof op === 'function') {
                op = {exec: op}
            }
        }
        const checkId = parent ? parent : id;
        const has = props[checkId] === true || (op && !(op.has && !op.has(paramsRef.current)));
        if (required && !exec && (!op || !op.exec)) {
            throw Error(`Missing implementation of ${id}Op`);
        }
        if (has) {
            const opExec = {
                exec: op && op.exec ? () => op.exec(paramsRef.current) : () => exec(paramsRef.current),
            };
            const hasOpCan = op && op.can;
            if (can || hasOpCan) {
                opExec.can = () => {
                    if (can && !can(paramsRef.current)) return false;
                    if (hasOpCan && !op.can(paramsRef.current)) return false;
                    return true
                }
            }
            buttons.push({ icon, name, onClick: opExec });
            hotkeys[id] = opExec
        }
    }
    return {
        hotkeys,
        buttons
    }
}

class TreeView {

    constructor(model, setter) {
        this.model = model;
        this.setter = setter;
        this.filter = null;
        this.showSubTree = true;
        this.types = {};
        this.groups = [];
        this.id2index = new Map();

        let currLevel = null;
        const locked = new Map();
        this.locker = {
            update: level => {
                currLevel = level;
                for (let [key, keyLevel] of locked.entries()) {
                    if (level <= keyLevel) locked.delete(key)
                }
            },
            lock: key => {
                locked.set(key, currLevel)
            },
            clear: () => locked.clear(),
            getLockDist: key => currLevel - locked.get(key),
            isLocked: key => locked.has(key)
        };
        this.reset();

    }

    getTypesInfo() {
        return [
//            {name: 'Screen', total: 5, marked: 2, markedAll: 5, hidden: 0, hiddenAll: 0},
            {name: 'Areas', total: 5, marked: 2, markedAll: 5, hidden: 0, hiddenAll: 0},
            {name: 'Panes', total: 5, marked: 2, markedAll: 5, hidden: 0, hiddenAll: 0},
        ];
    }

    reset() {
        this.view = null;
        this.levelZeros = null;
        this.indices = [];
        this.map = {};
    }

    setState(state) {
        this.state = state;
        this.reset();
    }

    setGroups(groups) {
        this.groups = groups;
    }

    setShowSubTree(value) {
        this.showSubTree = value
    }

    setNodeStateChangeListener(listener) {
        this.nodeStateChangeListener = listener
    }

    setFilter(value) {
        this.reset();
        this.filter = value
    }

    notify() {
        this.setter([ ...this.state ]);
    }

    toggleNode(index, force = null) {
        this.state[index] = force === null ? !this.state[index] : force;
        if (this.nodeStateChangeListener) {
            this.nodeStateChangeListener(index, this.state[index]);
        }
        this.reset();
        this.notify()
    }

    isClosed(index) {
        return this.state[index]
    }

    isLeaf(pos) {
        return this.view[pos].leaf;
    }

    getNodes() {
        if (this.view === null) {
            this.buildView()
        }
        return this.view
    }

    getParentIndex(index) {
        const node = this.model[index];
        const parentLevel = node.level - 1;
        let curr = index - 1;
        while (curr >= 0 && this.model[curr].level > parentLevel) {
            curr--
        }
        return curr < 0 ? null : curr;
    }

    getViewAncestors(values) {
        const ancestors = {};
        if (!Array.isArray(values)) values = [values];
        let found = false;
        for (let value of values) {
            if (this.map[value] !== null) continue;
            let node = value;
            do {
                node = this.getParentIndex(node);
            } while (node !== null && this.map[node] === null);
            found = true;
            ancestors[value] = node;
        }
        return found ? ancestors : null;
    }

    getIndices() {
        if (this.view === null) {
            this.buildView()
        }
        return this.indices
    }

    getViewCount() {
        if (this.levelZeros !== null) {
            return this.levelZeros
        }
        return this.indices.length;
    }

    getPathNodesProp(path, prop) {
        const result = [];
        for(let index of path) {
            result.push(this.model[index][prop]);
        }
        return result;
    }

    isGroupFiltered(value, index) {
        if (!this.groups.length) return true;

        for (let group of this.groups) {
            if (group(value, index)) {
                return true
            }
        }
        return false
    }

    getGroupings() {
        return [
            {
                id: '', name: 'All', dynamic: true,
                exclusive: true, indirect: true,
                filter: (node, index) => true
            },
            {
                id: 'panes', name: 'Pane', dynamic: true,
                exclusive: true, indirect: true,
                filter: node => node.type === 'pane'
            },
            {
                id: 'marked', name: 'Marked', dynamic: true,
                exclusive: true, indirect: false,
                filter: () => true
            }
        ];
    }

    getActiveGroupings(activeGroups) {
        const result = [];
        const groups = this.getGroupings();
        for (let group of groups) {
            if (activeGroups.includes(group.id)) {
                result.push(group);
            }
        }
        return result;
    }

    getNodeProps(index, node) {
        return {
            id: index,
            index,
            type: node.type === 'areas' ? 'area' : node.type,
            level: node.level,
            hidden: 0,
            children: false,
            leaf: true,
            connected: {},
            data: node,
            closed: this.state[index]
        };
    }

    algo(selector, groups, filter) {
        const locker = this.locker;
        const levels = [];
        const nodes = [];
        const id2index = this.id2index;
        id2index.clear();

        const connect = (connectLevel, offset = 0) => {
            if (!connectLevel) return;

            let startIndex = -1;
            let i = levels.length - 1 + offset;
            while (i >= 0) {
                const currLevel = levels[i];
                if (currLevel === connectLevel) {
                    startIndex = i;
                } else if (currLevel < connectLevel) {
                    break;
                }
                i--
            }
            if (startIndex !== -1) {
                for (let i = startIndex; i < (nodes.length + offset - 1); i++) {
                    nodes[i].connected[connectLevel] = true
                }
            }
        }
        const directMatching = false;

        const types = ['', 'area', 'pane'];
        const type2stats = {};
        for (let type of types) {
            type2stats[type] = {name: ucfirst(type), total: 0, marked: 0, markedAll: 0, hidden: 0, hiddenAll: 0, matches: 0, matchesAll: 0};
        }
        let lastAdd = null;
        const activeGroups = this.getActiveGroupings(groups);
        let i = -1;
        let lastClosed = null;
        const currPath = [];
        for (let node of this.model) {
            i++;
            let found = false;
            let indirect = false;
            const props = this.getNodeProps(i, node);
            id2index.set(node.id, i);

            const type = (type2stats[props.type] !== undefined) ? props.type : '';
            const statsType = type2stats[type];
            while (currPath.length > props.level) currPath.pop();
            const skipLocked = locker.isLocked('skip');
            for (let group of activeGroups) {
                if (!group.filter(node, i)) continue;
                found = true;
                if (!skipLocked && group.indirect) indirect = true
            }
            locker.update(props.level);
            let baseAdd = false;
            if (locker.isLocked('skip')) {
                props.level = locker.getLockDist('skip');
                baseAdd = true;
            } else if (found) {
                props.level = 0;
                if (indirect) locker.lock('skip');
                baseAdd = true;
            }
            const isMarked = selector.isSelected(props.id);
            if (!locker.isLocked('marked') && isMarked) {
                locker.lock('marked');
                statsType.marked++;
                if (!baseAdd) {
                    statsType.hidden++;
                    locker.lock('hidden');
                }
            }
            if (baseAdd) {
                let isMatching = true;
                if (filter) {
                    isMatching = filter(props, i);
                    if (isMatching) statsType.matches++;
                    if (!locker.isLocked('match')) {
                        if (isMatching) {
                            props.level = 0;
                            locker.lock('match')
                        }
                    } else {
                        props.level = locker.getLockDist('match');
                        if (!directMatching) isMatching = true;
                    }
                }
                props.path = [ ...currPath ];
                if (isMatching) {
                    if (lastAdd && props.level === lastAdd.level + 1) {
                        lastAdd.children = true;
                        lastAdd.leaf = false
                    }
                    if (!locker.isLocked('state')) {
                        nodes.push(props);
                        connect(props.level);
                        levels.push(props.level);
                        if (props.closed) {
                            lastClosed = props;
                            locker.lock('state')
                        }
                    } else {
                        if (isMarked) lastClosed.hidden++;
                    }
                    lastAdd = props;
                }
                statsType.total++
            }
            if (locker.isLocked('marked')) statsType.markedAll++;
            if (locker.isLocked('hidden')) statsType.hiddenAll++;
            if (locker.isLocked('match')) statsType.matchesAll++;

            currPath.push(props.id);
        }
        locker.clear();

        i = 0;
        for(let node of nodes) {
            let connectLevel = node.level;
            i++;
            if (i === nodes.length) {
                connect(connectLevel, -1);
            }
            node.end = !node.connected[node.level];
        }

        const stats = [];
        for (let type of types) {
            stats.push(type2stats[type]);
        }
        return {
            nodes,
            stats
        }
    }


    buildView() {
        const view = [];
        let curr = 0;
        let level = 0;
        const levels = [];
        let closedLevel = null;
        let filterLevel = null;
        let currPath = [];
        let levelZeros = 0;

        const connect = (connectLevel, offset = 0) => {
            if (!connectLevel) return;

            let startIndex = -1;
            let i = levels.length - 1 + offset;
            while (i >= 0) {
                const currLevel = levels[i];
                if (currLevel === connectLevel) {
                    startIndex = i;
                } else if (currLevel < connectLevel) {
                    break;
                }
                i--
            }
            if (startIndex !== -1) {
                for (let i = startIndex; i < (view.length + offset); i++) {
                    view[i].connected[connectLevel] = true
                }
            }
        }
        const isFiltered = !!this.filter || this.groups.length;
        const lastIndex = this.model.length - 1;
        while (curr <= lastIndex) {
            const data = this.model[curr];
            const index = curr;
            curr++;
            level = data.level;
            let path = [];
            while(currPath.length - 1 > level) {
                currPath.pop();
            }
            this.map[index] = null;
            if (isFiltered && filterLevel !== null) {
                if (level <= filterLevel) {
                    filterLevel = null;
                }
            }
            currPath.push(index);
            if (closedLevel !== null) {
                if (level > closedLevel) continue;
                closedLevel = null
            }
            if (isFiltered && filterLevel === null) {
                if (!this.isGroupFiltered(data, index)) continue;
                if (this.filter && !this.filter(data)) continue;
                path = [ ...currPath ];
                path.pop();
                if (this.showSubTree) {
                    filterLevel = level;
                }
            }
            const relLevel = filterLevel !== null ? level - filterLevel : level;
            this.map[index] = this.indices.length;
            this.indices.push(index);
            const closed = this.state[index];
            if (closed) {
                closedLevel = level
            }
            const connected = {};
            const leaf = (index === lastIndex || this.model[curr].level <= level);
            if (relLevel === 0) levelZeros++;
            connect(relLevel);
            levels.push(relLevel);
            view.push({
                index,
                data,
                level: this.showSubTree ? relLevel : 0,
                connected,
                closed,
                leaf,
                path
            })
        }
        let i = 0;
        for(let node of view) {
            let connectLevel = node.level;
            i++;
            if (i === view.length) {
                // node.leaf = true;
                connect(connectLevel, -1);
            }
            node.end = !node.connected[node.level];
        }
        this.levelZeros = !!this.filter ? levelZeros : null;
        this.view = view
    }
}

function StatsBlock({ name = '', first, length = null, value, text = null, className = '', diff = 0 }) {
    return (
        <Stack gaps>
            {!first && <Block className="less">|</Block>}
            {name && <Block className={className}>{name}:</Block>}
            <Stack>
                <Block center="v" className={value || diff ? "more" : ""}><Kbd value={value} length={length} /></Block>
                {diff > 0 && <Block center="v" padded="1"><Kbd value={'+' + diff} /></Block>}
            </Stack>
            {text && <Block>{text}</Block>}
        </Stack>
    )
}

function StatsTag({ type = 'primary', value, lessValue, className }) {
    const cls = ['button-border-radius', type + '-bg', type + '-color', type + '-border-color'];
    if (className) cls.push(className)
    return (
        <Stack padded="h" border="1" className={cls.join(' ')}>
            <Block padded="1">{value}</Block>
            {lessValue && <Block padded="1" className="less">{lessValue}</Block>}
        </Stack>
    )
}

function HoverIconButton({ onMouseDown, closed }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);
    const cls = ['ghost-bg'];
    if (clicked) {
        cls.push('clicked hover-button-fix')
    } else {
        cls.push('hover-button')
    }
    const click = e => {
        wContext.startExclusiveMode('toggle', 'pointer');
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('toggle');
            setClicked(false)
        });
        onMouseDown(e);
        setClicked(true)
    }
    return (
        <Block center="h" className={cls.join(' ')} cursor="pointer" border="1" onMouseDown={click}><Icon size={12} name={closed ? 'add' : 'remove'} /></Block>
    )
}

function TreeStack({ tree, trackId, doubleClickAction, stateChanges, render, nodeHeight, ...props }) {

    const tContext = useContext(TrackingContext);
    const keyTrackRef = useRef(null);

    const [ state, setStateRaw ] = useState([]);
    const setState = !stateChanges ? setStateRaw : newState => {
        const changes = {};
        const same = intersect(state, newState);
        const toFalse = without(state, same);
        for (let id of toFalse) changes[id] = false;
        const toTrue = without(newState, same);
        for (let id of toTrue) changes[id] = true;
        stateChanges(changes);
        setStateRaw(newState);
    }
    const [ sorting, setSorting ] = useCachedState(props.cacheLevel, props.cacheId + '.sorting', tree.getDefaultSortId(), 'string');
    const [ asc, setAsc ] = useCachedState(props.cacheLevel, props.cacheId + '.asc', true, 'bool');
    const [ filter, setFilter ] = useState('');
    const [ groups, setGroups ] = useState(props.groups !== undefined ? [ ...props.groups ] : []);

    const tracking = useMemo(() => {
        if (!tContext || !trackId) return () => {};
        return tContext.getTracking(trackId)
    }, []);

    const selector = useMultiSelector(
        {reset: true, selection: props.active, setSelection: props.setActive, default: props.active}
    );
    const active = selector.selection;
    const setActive = selector.setSelection;

    tree.setContext({
        state, setState,
        sorting, asc,
        filter: !filter ? null : node => node.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1,
        selector,
        groups
    });
    const stackRef = useRef(null);
    const paramsRef = useRef(null);
    const keyTracking = !tracking ? () => {} : index => {
        keyTrackRef.current = index;
        if (index !== null) {
            tracking(0, tree.getViewNodeByIndex(index).model.plane)
        }
    };
    const node = [];
    for (let index of active) {
        node.push(tree.getModelNodeById(index));
    }
    paramsRef.current = { active, node, tree };

    const toggleNode = (id, force = null) => {
        tree.toggleNodeById(id, force);
    }
    const toggleOp = params => {
        const { active } = params;
        toggleNode(active[0])
    };
    const actions = useMemo(() => {
        return [
            {id: 'edit', icon: 'edit', can: ({ active }) => active.length === 1},
            {id: 'add', icon: 'add', can: () => false},
            {id: 'delete', icon: 'delete', can: () => false},
            {id: 'open_all', icon: 'unfold_more', parent: 'collapse', has: () => true,
                exec: () => tree.openAllInView()
            },
            {id: 'close_all', icon: 'unfold_less', parent: 'collapse', has: () => true,
                exec: () => tree.closeAllInView()
            }
        ]
    }, []);
    const { buttons, hotkeys } = getActionButtonsAndHotkeys(actions, props, paramsRef);
    const { focusItem, attr, refocus, ...focus } = useFocusManager({
        name: 'tree',
        selector,
        dblAction: !doubleClickAction ? () => null : index => {
            setActive([nodes[index].id]);
            return requestAnimationFrame(
                () => {
                    hotkeys[doubleClickAction].can() &&
                    hotkeys[doubleClickAction].exec()
                }
            );
        },
        treeView: tree,
        rootSelect: true,
        keyTracking,
//        syncSelection: !filter,
        divRef: stackRef,
        handleSpace: true,
        reset: true,
    });
    const mouseEnter = index => {
        return () => {
            tracking(0, tree.getViewNodeByIndex(index).model.plane)
        }
    }
    const elems = [];
    let lastPath = null;
    const { nodes, stats } = tree.view;

    let i = -1;
    for (let node of nodes) {
        i++;
        if (node.level === 0 && node.path.length) {
            const idPath = node.path.join('.');
            if (idPath !== lastPath) {
                const pathNodeNames = tree.getPathNodeNames(node.path);
                const path = pathNodeNames.join(' > ');
                elems.push(
                    <Block padded="h" key={'h' + i} full="h">
                        <Block full="h" padded="v" shorten className="less small" border={DIR.BOTTOM}>
                            {'» ' + path}
                        </Block>
                    </Block>
                );
                lastPath = idPath;
            }
        }
        const toggle = e => {toggleOp({ ...paramsRef.current, active: [node.id]}); e.stopPropagation()};

        const cls = ['hover-change'];
        cls.push(active.includes(node.id) ? 'active-bg active-color' : 'ghost-bg');

        const indention = [];
        for (let l = 0; l < node.level; l++) {
            indention.push(
                <Block key={l} width={18} full="v">
                    {node.connected[l] && <Block center="h" full="v" border={DIR.LEFT} width={1} height={nodeHeight} />}
                </Block>
            );
        }
        const elem = node.isLeaf ?
            <Icon size={12} className="border-color" name="square" /> :
            <HoverIconButton closed={node.isClosed} onMouseDown={e => {toggle(e); focus.setTabIndex(node.viewIndex); refocus()}} />;

        indention.push(
            <Block key="last" width={18} height={nodeHeight} full="v">
                <Block full className="relative">
                    {node.level > 0 &&
                        <div className="absolute pos-0 full-v full-h">
                            <Block width={1} height={node.end ? 10 : false} center="h" full="v" border={DIR.LEFT} />
                        </div>
                    }
                    <Block full className="absolute pos-0">
                        <Block padded={DIR.TOP} full="h">{elem}</Block>
                    </Block>
                </Block>
            </Block>
        );
        elems.push(
            <Stack full="h" key={node.id} cursor={node.clickMode ? "pointer" : false} onRightClick={toggle} onMouseEnter={mouseEnter(node.viewIndex)} className={cls.join(' ')} { ...focus.itemAttr(i) }>
                <Stack full="v" padded="h">
                    {indention}
                </Stack>
                {render({ node })}
            </Stack>
        );
    }

    let matches = [];
    const bottomBlocks = [];
    const sortOptions = tree.getSortOptions();
    const dirOptions = [
        {id: true, name: 'sort', iconProps: {flip: 'v'}},
        {id: false, name: 'sort'}
    ];
    if (sortOptions.length) {
        bottomBlocks.push(
            <Stack full="h" key="s" gaps padded>
                <Block full="h" />
                <Select options={sortOptions} value={sorting} set={setSorting} />
                <Radio options={dirOptions} icon value={asc} set={setAsc} />
            </Stack>
        );
    }
    let firstMatch = true;
    let no = 0;
    for (let typeStats of stats) {
        const bottomStats = [];
        const length = 2;
        bottomStats.push(
            <StatsBlock key="t" first name="Total" value={typeStats.total} length={length} />
        );
        let markerButtons = '';
        const tags = [];
        if (selector.isMulti()) {
            const typedIds = tree.getViewIdsByType(typeStats.id);
            const minIds = typedIds.length ? tree.getMinViewIdsByType(typeStats.id) : [];
            const count = selector.getMatchCount(minIds);
            const typedCount = selector.getMatchCount(typedIds);
            markerButtons = [
                {icon: 'clear', disabled: typeStats.marked === 0, onClick: () => selector.clearSelection(typedIds)},
                {icon: 'done_all',
                    disabled: typedIds.length === 0,
                    onClick:
                        () => (active.length && count === minIds.length && count === typedCount) ?
                            selector.clearSelection() : selector.setSelection(minIds),
                },
                {
                    icon: 'content_cut', disabled: typeStats.hidden === 0,
                    onClick: () => {selector.setSelection(tree.reduceToBaseByType(typeStats.id))}
                }
            ];
            const isMarked = typeStats.markedAll > 0;
            if (isMarked) {
                const markedDiff = typeStats.markedAll - typeStats.marked;
                tags.push(
                    <Stack gaps key="m">
                        <Block className="less">|</Block>
                        <StatsTag type="active" value={typeStats.marked} lessValue={markedDiff ? '+' + markedDiff : false} />
                    </Stack>
                )
            }
            if (typeStats.hiddenAll) {
                tags.push(
                    <StatsTag key="h" type="warning" value={typeStats.hidden} lessValue={'+' + typeStats.hiddenAll} />
                )
            }
        }
        bottomBlocks.push(
            <Stack key={no} full="h" className="secondary-bg secondary-color-color">
                <Stack full="h">
                    <Stack gaps wrap full="h">
                        <Block shorten>{typeStats.name}: </Block>
                        <Block><Kbd className={typeStats.total ? 'more' : ''} value={typeStats.total} /></Block>
                        {tags}
                    </Stack>
                </Stack>
                <Block padded={DIR.ALL_BUT_LEFT}>
                    <ButtonStack gaps="1" buttons={markerButtons} />
                </Block>
            </Stack>
        );

        if (typeStats.matches + typeStats.matchesAll) {
            const diff = typeStats.matchesAll - typeStats.matches;
            const typeProps = tree.getTypeProps(typeStats.id);
            if (typeProps.match) {
                matches.push(
                    <StatsBlock key={typeStats.name} first={firstMatch} value={typeStats.matches} diff={diff} text={typeProps.match} />
                );
                firstMatch = false
            }
        }
        no++;
    }
    let matching = '';
    if (filter && matches.length) {
        matching =
            <Stack full="h" gaps wrap key="matching">
                <Block>Matching:</Block>
                {matches}
            </Stack>;
    }
    const groupButtons = [];
    const treeGroups = tree.getGroups();
    for(let treeGroup of treeGroups) {
        const { id, name, disabled = () => false } = treeGroup;
        const onClick = () => setGroups(tree.toggleGroup(groups, treeGroup.id))
        groupButtons.push(
            { id, name, onClick, value: true, current: groups.includes(treeGroup.id), padded: "h", disabled: disabled() }
        )
    }
    return (
        <Stack borders vertical full hotKeys={hotkeys}>
            <Stack borders vertical full>
                {groupButtons.length &&
                    <Block full="h" padded>
                        <ButtonStack gaps buttons={groupButtons} />
                    </Block>
                }
                <Toolbar>
                    <ButtonStack gaps buttons={buttons} />
                    {props.filter &&
                        <Separator />
                    }
                    {props.filter &&
                        <Stack gaps>
                            <Input name="Filter:" clear size={6} active={!!filter} value={filter} set={setFilter} />
                        </Stack>
                    }
                </Toolbar>
                <Block full>
                    {!elems.length ?
                        <CenterInfo>{
                            filter ? 'No item found matching "' + filter + '"' : 'Tree is empty!'
                        }</CenterInfo> :
                        <Stack scroll full="h"
                               onMouseLeave={() => tracking(null, null)} stackRef={stackRef} { ...attr } vertical
                               className="primary-color ghost-bg">
                            {matching}
                            {elems}
                        </Stack>
                    }
                </Block>
                <>{bottomBlocks}</>
            </Stack>
        </Stack>
    )
}

export {
    EntityStack,
    EntityStackSections,
    EntityManager,
    EntityPicker,
    TreeStack
}
