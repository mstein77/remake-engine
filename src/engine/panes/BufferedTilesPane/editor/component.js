import React, { useContext, useMemo, useState, useRef } from "react"
import { EditorSection, ButtonStack, CenterInfo, SideTabs, SideTab, EditorCtx, Kbd, EditorContext,
    Toolbar, useModal, PropertyGrid, Section, JsonView, useCssProps, useComponentUpdate, useUpdateOnEntityIndexChanges
} from "editor/components/BasicComponents"
import { DIR, Block, Stack, Grid } from "editor/components/LayoutComponents"
import { d, getCanvasForDim, getColorsFromCanvas, getCanvasForEventMatrix, getCanvasForIndexMatrix, getEmptyImageData, cloneDeep } from "helper/helper"
import { useBitmapSelectionModal, AnimationManager, useExportModal } from "editor/components/EditorComponents"
import { Bitmap, Entity, InputProp, NumberProp, LabelProp, CheckboxProp, FullProp, Button, Tuple, TupleProp, BitmapProp, PositionPickerProp, OkCancelForm, TextAreaProp, EntityProp } from "editor/components/FormComponents"
import { BaseGrid, TrackingCtx, useTracker } from "editor/components/GridComponents"
import { EntityPicker, EntityManager, EntityStack } from "editor/components/EntityComponents"
// import {  } from "editor/classes/Grid"
import { CellSelection, CellValue } from "editor/classes"
import { SimpleIndex, ColorIndex, AnimationIndex } from "editor/classes/EntityIndex"
import { TileIndex, AliasIndex, BrushIndex, EventIndex, TilesGrid } from "./classes"

function getEventsImage(tilesGrid, events, zoomOrAvail) {
    const sizeX = tilesGrid.getCellSizeX();
    const sizeY = tilesGrid.getCellSizeY();
    const canvas = getCanvasForDim(sizeX, sizeY);
    const ctx = canvas.getContext('2d');
    let hasImage = false;
    for (let event of events) {
        if (tilesGrid.drawEvent(ctx, event, 0, 0, 1)) {
            hasImage = true;
        }
    }
    return hasImage ?
        <Bitmap readOnly value={ctx.getImageData(0, 0, sizeX, sizeY)} zoomOrAvail={zoomOrAvail} /> :
        <Block padded><Block width={zoomOrAvail.width} height={zoomOrAvail.height} border="1" /></Block>
}

function EventStack({ events, eventIndex }) {
    const eContext = useContext(EditorContext);
    const AddEventModal = useModal();

    useUpdateOnEntityIndexChanges(eventIndex);

    const stackIndex = useMemo(() => {
        const index = new SimpleIndex({items: events});
        index.addListener(
            () => {
                eContext.setSelection(new CellSelection('rect', [[index.getPropValues('value')]], CellValue.events));
                eContext.setMode('write');
            }
        );
        return index
    }, [events]);

    const addEvent = () => {
        AddEventModal.open({
            editorId: 'addEvent',
            entityIndex: eventIndex,
            filter: true,
            text: 120,
            zoom: 1,
            border: 0,
            controls: true,
            base: index => !events.includes(eventIndex.getEntityValue(index)),
            select:
                index => {
                    AddEventModal.close();
                    const event = eventIndex.getEntityValue(index);
                    stackIndex.setEntityObject({index: null, value: event});
                }
        });
    }
    return (
        <Block full="h" border="1">
            <EntityStack
                entityIndex={stackIndex}
                order
                addOp={addEvent}
                delete
                deselect
                emptyText="No event"
            />
            <AddEventModal.content name="Add Event" width="600" height="500">
                <EntityPicker { ...AddEventModal.props } />
            </AddEventModal.content>
        </Block>
    )
}

function ActiveTile({tileIndex, aliasIndex, brushIndex, eventIndex, editTile, editAlias, editBrush, tilesGrid, editTiles, compact, animationIndex}) {
    const eContext = useContext(EditorContext);
    const SaveAsBrushModal = useModal();

    const selection = eContext.selection;
    const avail = selection && selection.isCell() ? 80 : 150;
    const zoomOrAvail = useMemo(() => {
        return {
            width: avail,
            height: avail
        };
    }, [avail]);

    const clearSelection = () => {
        const currMode = eContext.mode;
        let newMode = 'write';
        if (['pick', 'select', 'drag', 'add'].includes(currMode)) {
            newMode = currMode;
        }
        const cellValue = eContext.targetCellValue;
        eContext.setSelection(new CellSelection('rect', [[cellValue.getEmpty()]], cellValue));
        if (currMode === 'write' || currMode !== newMode) {
            eContext.setMode(newMode)
        }
    };

    const currType = selection.getType();
    if (currType === 'entity') {
        selection.setCellsFromEntity();
    }

    const cellValue = eContext.selection.getCellValue();
    if (currType === 'none' ||
        (currType === 'entity' && brushIndex.getEntityByPropValue('value', selection.getEntityValue()) === null)) {
        requestAnimationFrame(() => {
            const isEvent = eContext.targetCellValue === CellValue.events;
            eContext.setSelection(
                new CellSelection('rect', [[isEvent ? [] : 0]],  isEvent ? CellValue.events : CellValue.tile)
            );
            eContext.setMode('write')
        });
        return '';
    }
    if (cellValue !== eContext.targetCellValue) {
        requestAnimationFrame(clearSelection);
        return '';
    }
    let editAction;
    let brushAction = false;
    let clearAction = true;
    let index;
    const editSelection = () => {
        editAction(index);
    };
    const saveAsBrush = () => {
        SaveAsBrushModal.open({
            name: '',
            tiles: selection.cells,
            tileIndex: tilesGrid.index,
            tilesGrid,
            aliasIndex,
            editTiles,
            brushIndex,
            isValid: name => !brushIndex.hasPropValue('value', name),
            save: brush => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = brushIndex.setEntityObject(
                            brush
                        );
                    },
                    () => {
                        brushIndex.deleteEntity(index);
                    }
                );
                eContext.setSelection(new CellSelection('entity', {entityIndex: brushIndex, value: brush.value, cellsProp: 'tiles'}, CellValue.tile));
                eContext.setMode('write');
                SaveAsBrushModal.close()
            }
        });
    };
    let content;
    let type;
    let image;
    if (selection.isCell()) {
        // build single cell info
        const cell = selection.getCell();
        switch(cellValue) {

            case CellValue.tile:
                const isAlias = typeof cell === 'string';
                type = isAlias ? 'Alias' : 'Tile';
                editAction = isAlias ? editAlias : editTile;
                clearAction = cell !== 0;

                const infoProps = [];
                index = cell;

                if (isAlias) {
                    infoProps.push(
                        <LabelProp key="name" name="Name:"><Block shorten full="h">{cell}</Block></LabelProp>
                    );
                    index = aliasIndex.getEntityByPropValue('value', cell);
                    infoProps.push(
                        <LabelProp key="tile" name="Tile:">
                            {index !== undefined ? aliasIndex.getEntityPropValue(index, 'tile') : '?'}
                        </LabelProp>
                    );
                } else {
                    infoProps.push(
                        <LabelProp key="index" name="Index:">{cell}</LabelProp>
                    );
                }
                const entityIndex = isAlias ? aliasIndex : tileIndex;
                const animation = entityIndex.getEntityPropValue(index, 'animation');
                image =
                    <Entity
                        entityIndex={entityIndex}
                        value={entityIndex.getEntityValue(index)}
                        animationIndex={animation != '' ? animationIndex : null}
                        readOnly
                        zoomOrAvail={zoomOrAvail}
                    />;
                content =
                    <>
                        {infoProps}
                        {!compact &&
                            <>
                                <LabelProp name="Animation:">
                                    <Block shorten full="h">{animation}</Block>
                                </LabelProp>
                                <FullProp name="Properties:">
                                    <JsonView full="h" className="ghost-bg" trim skipKeys={['index', 'animation']} json={entityIndex.getEntityPropValue(index, 'props')} defaultJson={tilesGrid.index.model.defaultTile} />
                                </FullProp>
                            </>
                        }
                    </>;
                break;

            case CellValue.events:
                type = 'Events';
                clearAction = cell.length > 0;

                image = getEventsImage(tilesGrid, cell, zoomOrAvail);
                content = <FullProp name="Events:">
                    <EventStack events={cell} eventIndex={eventIndex} />
                </FullProp>;
                break;
        }
    } else if (selection.getType() !== 'none') {
        // build multi cell info
        let name;
        const cells = selection.getCells();

        brushAction = eContext.targetCellValue === CellValue.tile && !selection.isEntity();
        if (selection.isEntity()) {
            editAction = editBrush;
            name = selection.getEntityValue();
            type = 'Brush';
            index = brushIndex.getEntityByPropValue('value', name);
        } else {
            type = cellValue.getName() + '-' + selection.getType();
        }
        const canvas =
            selection.getCellValue() === CellValue.events ?
                getCanvasForEventMatrix(tileIndex, tilesGrid, cells, 20) :
                getCanvasForIndexMatrix(tileIndex, aliasIndex, cells, 20);

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        image =
            <Bitmap readOnly value={imageData} zoomOrAvail={zoomOrAvail} />;

        content = <>
            {name && <LabelProp name="Name:">{name}</LabelProp>}
            <LabelProp name="Size:"><Kbd value={selection.getWidth() + 'x' + selection.getHeight()} /></LabelProp>
        </>;
    }

    const toolbarButtons = [];
    if (editAction) toolbarButtons.push({name: 'Edit', onClick: editSelection});
    if (brushAction) toolbarButtons.push({name: 'to Brush', onClick: saveAsBrush});
    toolbarButtons.push({name: 'Clear', disabled: !clearAction, onClick: clearSelection});

    return (
        <Stack vertical borders full="h">
            {!compact &&
                <Toolbar>
                    <ButtonStack gaps="1" buttonProps={{padded: 'h'}} buttons={toolbarButtons} />
                </Toolbar>
            }
            <Block full="h" scroll full padded={DIR.TOP}>
                <Grid columns="70px *">
                    <FullProp>
                        <Block full="h" centerItems="h">
                            {image ? image : <Block center="h" width={avail} height={avail} border="1"></Block>}
                        </Block>
                    </FullProp>
                    <LabelProp name="Type:">
                        {type}
                    </LabelProp>
                    {content}
                </Grid>

                <SaveAsBrushModal.content name="Save as Brush">
                    <BrushForm { ...SaveAsBrushModal.props } />
                </SaveAsBrushModal.content>
            </Block>
        </Stack>
    )
}

function TilesPicker({ tileIndex, editTile }) {
    const eContext = useContext(EditorContext);
    return (
        <EntityPicker
            select={
                index => {
                    eContext.setSelection(new CellSelection('rect', [[index]], CellValue.tile));
                    eContext.setMode('write');
                }
            }
            doubleClick={index => editTile(index)}
            filter
            entityIndex={tileIndex}
            controls
        />
    )
}

function AliasPicker({ aliasIndex, animationIndex, editAlias }) {
    const eContext = useContext(EditorContext);
    const select = index => {
        const name = aliasIndex.getEntityValue(index);
        eContext.setSelection(new CellSelection('rect', [[name]], CellValue.tile));
        eContext.setMode('write');
    };
    return (
        <EntityPicker
            select={select}
            filter
            entityIndex={aliasIndex}
            animationIndex={animationIndex}
            doubleClick={index => editAlias(index)}
            controls
            text={120}
        />
    )
}

function BrushPicker({ brushIndex, editBrush }) {
    const eContext = useContext(EditorContext);
    const select = index => {
        const selection = new CellSelection('entity', {entityIndex: brushIndex, value: brushIndex.getEntityValue(index), cellsProp: 'tiles'}, CellValue.tile);
        selection.setCellsFromEntity();
        eContext.setSelection(selection);
        // requestAnimationFrame(() => eContext.setMode('write'));
        eContext.setMode('write');
    };
    return (
        <EntityPicker
            select={select}
            filter
            entityIndex={brushIndex}
            doubleClick={index => editBrush(index)}
            controls
        />
    )
}

function EventPicker({ eventIndex, editEvent }) {
    const eContext = useContext(EditorContext);
    const select = index => {
        const event = eventIndex.getEntityValue(index);
        eContext.setSelection(new CellSelection('rect', [[[event]]], CellValue.events));
        eContext.setMode('add');
    }
    return (
        <EntityPicker
            select={select}
            text={120}
            filter
            doubleClick={index => editEvent(index)}
            entityIndex={eventIndex}
            controls
        />
    )
}

function TileDeletionForm({ save, close, count, ...props }) {
    const [ safe, setSafe ] = useState(true);
    return (
        <OkCancelForm full="h" padded submit save={() => {save(safe)}} { ...props } cancel={close}>
            <PropertyGrid>
                <FullProp full="h">
                    <CenterInfo icon="warning">
                        Do you really want to delete the {count} tiles?
                    </CenterInfo>
                </FullProp>
                <CheckboxProp name="Preserve tiles" value={safe} set={setSafe} />
            </PropertyGrid>
        </OkCancelForm>
    );
}

function TilesManager({ tileIndex, animationIndex, editTile }) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const { openBitmapSelectionModal, closeBitmapSelectionModal, BitmapSelectionModal } = useBitmapSelectionModal();
    const NewTileModal = useModal();
    const ConfirmDeleteModal = useModal();

    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;

    const getColorIndexFromTiles = () => {
        return new ColorIndex({colors: getColorsFromCanvas(tileIndex.img, false)});
    };

    const addTile = () => {
        NewTileModal.open({
            tileIndex,
            animationIndex,
            save: (tile, preserve) => {
                const plan = tileIndex.getInsertPlan(tile.index, [tile], preserve);
                eContext.doAction(
                    () => {
                        tileIndex.doInsertPlan(plan, eCtxRef.current.selection);
                    },
                    () => {
                        tileIndex.undoInsertPlan(plan, eCtxRef.current.selection);
                        tileIndex.notify();
                    }
                );
                NewTileModal.close();
            },
            tile: {
                value: null,
                image: getEmptyImageData(tileIndex.getSizeX(), tileIndex.getSizeY()),
                animation: '',
                props: {}
            },
            colors: getColorIndexFromTiles(),
        });
    };

    const deleteTiles = ({ marked }) => {
        const indices = [ ...marked ];
        ConfirmDeleteModal.open({
            count: indices.length,
            save: safe => {
                const plan = tileIndex.getDeletePlan(indices, safe, eContext.selection);
                eContext.doAction(
                    () => {
                        tileIndex.doDeletePlan(plan, eCtxRef.current.selection);
                        tileIndex.notify();
                        animationIndex.notify();
                    },
                    () => {
                        tileIndex.undoDeletePlan(plan, eCtxRef.current.selection);
                        tileIndex.notify();
                        animationIndex.notify();
                    }
                );
                ConfirmDeleteModal.close()
            }
        });
    }
    const importTiles = () => {
        const selected = images => {
            const tiles = [];
            for(let image of images) {
                tiles.push({
                    value: null,
                    image
                });
            }
            let indices = null;
            eContext.doAction(
                () => {
                    indices = tileIndex.setEntityObjects(tiles);
                },
                () => {
                    tileIndex.deleteEntities(indices);
                }
            );
            closeBitmapSelectionModal()
        };
        openBitmapSelectionModal({
            selection: {
                type: 'rect',
                width: tileIndex.getSizeX(),
                height: tileIndex.getSizeY(),
                fixed: true,
                multi: true,
                doubleClick: selected
            },
            save: selected
        });
    };

    return (
        <>
            <EntityManager
                renderTitle={
                    index => <Block padded><Kbd value={index} /></Block>
                }
                onDoubleClick={editTile}

                addOp={addTile} clear apply swap copy
                editOp={({ marked }) => editTile(marked[0])}
                importOp={importTiles} deleteOp={deleteTiles}

                filter titleHeight={titleHeight} minWidth={60}
                entityIndex={tileIndex} maxZoom={5} auto
            />

            <NewTileModal.content name="New Tile">
                <TileForm { ...NewTileModal.props } />
            </NewTileModal.content>

            <ConfirmDeleteModal.content name="Delete Tiles">
                <TileDeletionForm { ...ConfirmDeleteModal.props } />
            </ConfirmDeleteModal.content>

            {BitmapSelectionModal}
        </>
    )
}

function AliasManager({ aliasIndex, tileIndex, animationIndex, editAlias }) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const NewAliasModal = useModal();
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');

    const addAlias = () => {
        NewAliasModal.open({
            tileIndex,
            animationIndex,
            alias: {
                tile: 0,
                value: '',
                animation: '',
                props: {}
            },
            isValid: value => !aliasIndex.hasPropValue('value', value),
            save: alias => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = aliasIndex.setEntityObject({ ...alias });
                    },
                    () => {
                        aliasIndex.deleteEntity(index);
                    }
                );
                NewAliasModal.close();
            }
        })
    };
    const deleteAlias = ({ marked }) => {
        const indices = [ ...marked ];
        const plan = aliasIndex.getDeletePlan(indices);
        eContext.doAction(
            () => {
                aliasIndex.doDeletePlan(plan, eCtxRef.current.selection);
            },
            () => {
                aliasIndex.undoDeletePlan(plan, eCtxRef.current.selection);
            }
        );
    };

    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <>
            <EntityManager
                renderTitle={index => <Block padded shorten>{aliasIndex.getEntityValue(index)}</Block>}
                onDoubleClick={editAlias}

                editOp={({ marked }) => editAlias(marked[0])}
                addOp={addAlias} deleteOp={deleteAlias}

                animationIndex={animationIndex}
                filter titleHeight={titleHeight} minWidth={100}
                entityIndex={aliasIndex} maxZoom={5} auto
            />

            <NewAliasModal.content name="New Alias">
                <AliasForm { ...NewAliasModal.props } />
            </NewAliasModal.content>
        </>
    )
}

function BrushManager({ brushIndex, tileIndex, aliasIndex, animationIndex, tilesGrid, editBrush }) {
    const eContext = useContext(EditorContext);

    const NewBrushModal = useModal();
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');

    const newBrush = () => {
        NewBrushModal.open({
            name: '',
            aliasIndex,
            tileIndex,
            animationIndex,
            tilesGrid,
            brushIndex,
            tiles: [[0]], // TODO: we should get some tiles from a matrix here
            isValid: name => !brushIndex.hasPropValue('value', name),
            save: brush => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = brushIndex.setEntityObject(
                            brush
                        );
                    },
                    () => {
                        brushIndex.deleteEntity(index);
                    }
                );
                NewBrushModal.close()
            }
        });
    };

    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <>
            <EntityManager
                emptyText="No brushes defined. Add new one"
                renderTitle={index => <Block padded shorten>{brushIndex.getEntityValue(index)}</Block>}

                addOp={newBrush} delete
                editOp={({ marked }) => editBrush(marked[0])}

                onDoubleClick={editBrush}
                filter titleHeight={titleHeight} minWidth={100}
                entityIndex={brushIndex} maxZoom={5} auto
            />
            <NewBrushModal.content name="New Brush">
                <BrushForm { ...NewBrushModal.props } />
            </NewBrushModal.content>
        </>
    )
}

function EventManager({ eventIndex, tileIndex, editEvent }) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;

    const NewEventModal = useModal();
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;

    const addEvent = () => {
        NewEventModal.open({
            event: {
                value: '',
                width: 0,
                height: 0,
                offsetX: 0,
                offsetY: 0,
                image: null
            },
            tileIndex,
            eventIndex,
            isValid: value => !eventIndex.hasPropValue('value', value),
            save: event => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = eventIndex.setEntityObject({ ...event });
                    },
                    () => {
                        eventIndex.deleteEntity(index);
                    }
                );
                NewEventModal.close();
            }
        });
    }

    const deleteEvents = ({ marked }) => {
        const indices = [ ...marked ];
        const plan = eventIndex.getDeletePlan(indices);
        eContext.doAction(
            () => {
                eventIndex.doDeletePlan(plan, eCtxRef.current.selection);
            },
            () => {
                eventIndex.undoDeletePlan(plan, eCtxRef.current.selection);
            }
        );
    }
    return (
        <>
            <EntityManager
                empty="No event defined. Add new one"
                renderTitle={index => <Block padded shorten>{eventIndex.getEntityValue(index)}</Block>}
                filter titleHeight={titleHeight} minWidth={100}

                editOp={({ marked }) => editEvent(marked[0])}
                deleteOp={deleteEvents} addOp={addEvent} onDoubleClick={editEvent}
                entityIndex={eventIndex} maxZoom={5} auto
            />
            <NewEventModal.content name="New Event">
                <EventForm { ...NewEventModal.props } />
            </NewEventModal.content>
        </>
    )
}

function TileForm({ save, close, tile, colors, animationIndex, tileIndex }) {

    const [ image, setImage ] = useState(tile.image);
    const [ props, setProps ] = useState(JSON.stringify(tile.props, null, 4));
    const [ position, setPosition ] = useState('end');
    const [ preserve, setPreserve ] = useState(true);
    const [ entity, setEntity ] = useState(0);
    const zoomOrAvail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);
    const [ animation, setAnimation ] = useState(tile.animation || '');

    let isValidJson = true;
    try {
        JSON.parse(props)
    } catch (e) {
        isValidJson = false;
    }
    const saveTile = () => {
        const newTile = { ...tile, animation, props: JSON.parse(props), image };
        if (tile.index === undefined && position !== 'end') {
            newTile.index = (position === 'start') ? 0 : entity;
            if (position === 'after') {
                newTile.index++;
            }
        }
        save(newTile, preserve);
    }
    return (
        <OkCancelForm padded submit save={saveTile} cancel={close}>
            <PropertyGrid>
                {tile.index !== undefined ?
                    <NumberProp name="Index:" value={tile.index} size={4} readOnly /> :
                    <PositionPickerProp position={position} preserve={preserve} setPreserve={setPreserve} setPosition={setPosition} entity={entity} setEntity={setEntity} name="Insert:" entityIndex={tileIndex} animationIndex={animationIndex} />
                }
                <BitmapProp name="Image:" value={image} set={setImage} entityIndex={tileIndex} zoomOrAvail={zoomOrAvail} colors={colors} />
                <EntityProp entityIndex={animationIndex} animationIndex={animationIndex} reset name="Animation:" value={animation} set={setAnimation} zoomOrAvail={zoomOrAvail} />
                <TextAreaProp name="Properties:" invalid={!isValidJson} cols={30} rows={10} value={props} set={setProps} />
            </PropertyGrid>
        </OkCancelForm>
    )
}

function AliasForm({ save, close, isValid, alias, tileIndex, animationIndex }) {
    const TilePickerModal = useModal();

    const [ name, setName ] = useState(alias.value);
    const [ tile, setTile ] = useState(alias.tile);
    const [ props, setProps ] = useState(JSON.stringify(alias.props, null, 2));
    const [ animation, setAnimation ] = useState(alias.animation);

    const avail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);
    const saveAlias = () => {
        save({ ...alias, value: name, tile, animation, props: JSON.parse(props) });
    };
    let isValidJson = true;
    try {
        JSON.parse(props);
    } catch (e) {
        isValidJson = false;
    }
    let isValidName = name !== '' && isValid(name);
    return (
        <>
            <OkCancelForm padded submit cancel={close} save={saveAlias}>
                <PropertyGrid>
                    <InputProp name="Name:" required value={name} set={setName} invalid={!isValidName} />
                    <EntityProp name="Tile:" number value={tile} zoomOrAvail={avail} entityIndex={tileIndex} set={setTile} />
                    <EntityProp entityIndex={animationIndex} animationIndex={animationIndex} reset name="Animation:" value={animation} set={setAnimation} zoomOrAvail={avail} />
                    <TextAreaProp name="Properties:" invalid={!isValidJson} cols={30} rows={10} value={props} set={setProps} />
                </PropertyGrid>
            </OkCancelForm>

            <TilePickerModal.content name="Pick Tile" { ...TilePickerModal.props } height={400} width={400}>
                <EntityPicker entityIndex={tileIndex} zoom={2} select={index => {setTile(index); TilePickerModal.close()}} />
            </TilePickerModal.content>
        </>
    )
}

function TilesEditor({ tilesGrid, aliasIndex, animationIndex, tiles, save, close }) {
    const eContext = useContext(EditorContext);

    const editGrid = useMemo(() => {
        return new TilesGrid(
            tilesGrid.index,
            { ...tilesGrid.model, map: tiles }
        );
    }, [tiles]);

    const selection = useMemo(() => {
        return {
            fixed: false,
        };
    }, []);

    return (
        <OkCancelForm full save={() => {save(editGrid.map)}} cancel={close}>
            <Stack vertical borders full>
                <Stack full borders>
                    <Block width={200} full="v">
                        <ActiveTile animationIndex={animationIndex} tileIndex={tilesGrid.index} aliasIndex={aliasIndex} tilesGrid={tilesGrid} compact />
                    </Block>

                    <Block full>
                        <BaseGrid
                            gridProvider={editGrid}
                            animationIndex={animationIndex}
                            edit
                            resize
                            undoRedo
                            selection={selection}
                            editorId="editTiles"
                        />
                    </Block>
                </Stack>

                <Block full="h" height={150}>
                    <SideTabs>
                        <SideTab name="Tiles" active>
                            <EntityPicker entityIndex={tilesGrid.index} animationIndex={animationIndex} select={
                                index => {
                                    eContext.setSelection(
                                        new CellSelection('rect', [[index]], CellValue.tile)
                                    );
                                    eContext.setMode('write');
                                }
                            } />
                        </SideTab>

                        <SideTab name="Alias">
                            <EntityPicker
                                entityIndex={aliasIndex}
                                animationIndex={animationIndex}
                                select={
                                    index => {
                                        eContext.setSelection(
                                            new CellSelection('rect', [[aliasIndex.getEntityValue(index)]], CellValue.tile)
                                        );
                                        eContext.setMode( 'write');
                                    }
                                }
                                sizeX={aliasIndex.getSizeX()}
                                sizeY={aliasIndex.getSizeY()}
                                textSize={120}
                                zoom={2}
                                border={0}
                            />
                        </SideTab>
                    </SideTabs>
                </Block>
            </Stack>
        </OkCancelForm>
    )
}

function BrushForm({ save, close, isValid, editTiles, animationIndex, brushIndex, aliasIndex, tilesGrid, tileIndex, ...props }) {

    const EditTilesModal = useModal();
    const CopyBrushModal = useModal();
    const [ name, setName ] = useState(props.name);
    const [ tiles, setTiles ] = useState(() => cloneDeep(props.tiles));

    const canSave = name !== '' && isValid(name);
    const saveBrush = () => {
        save({ value: name, tiles });
    };
    const editBrushTiles = () => {
        EditTilesModal.open({
            tiles: cloneDeep(tiles),
            aliasIndex,
            animationIndex,
            tilesGrid,
            save: editTiles => {
                setTiles(editTiles);
                EditTilesModal.close()
            },
            canSave
        });
    };
    const copyBrush = () => {
        CopyBrushModal.open({
            zoom: 2,
            entityIndex: brushIndex,
            select: index => {
                setTiles(brushIndex.getEntityPropValue(index, 'tiles'));
                CopyBrushModal.close();
            }
        });
    };

    const canvas = getCanvasForIndexMatrix(tileIndex, aliasIndex, tiles, 20);
    const ctx = canvas.getContext('2d');
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return (
        <OkCancelForm submit padded save={saveBrush} cancel={close}>
            <PropertyGrid>
                <InputProp name="Name:" required value={name} set={setName} invalid={!canSave} />
                <LabelProp name="Tiles:">
                    <Stack vertical gaps="1">
                        <Stack gaps="1">
                            <Button name="Edit" padded="h" onClick={editBrushTiles} />
                            <Button name="Copy" padded="h" onClick={copyBrush} />
                        </Stack>
                        <Bitmap value={image} zoomOrAvail={{width: 200, height: 200}} readOnly />
                    </Stack>
                </LabelProp>
                <TupleProp name="Size:" readOnly x={tiles[0].length} y={tiles.length} />
            </PropertyGrid>

            <EditTilesModal.content name="Edit Tiles" full>
                <EditorCtx>
                    <TilesEditor { ...EditTilesModal.props } />
                </EditorCtx>
            </EditTilesModal.content>

            <CopyBrushModal.content name="Pick Brush" width={600} height={600}>
                <EntityPicker { ...CopyBrushModal.props } />
            </CopyBrushModal.content>
        </OkCancelForm>
    )
}

function EventForm({ isValid, event, close, save, tileIndex, eventIndex }) {
    const [ value, setValue ] = useState(event.value);
    const [ width, setWidth ] = useState(event.width);
    const [ height, setHeight ] = useState(event.height);
    const [ offsetX, setOffsetX ] = useState(event.offsetX);
    const [ offsetY, setOffsetY ] = useState(event.offsetY);
    const [ image, setImageRaw ] = useState(event.image);
    const setImage = value => {
        setWidth(value ? value.width : 0);
        setHeight(value ? value.height : 0);
        setImageRaw(value)
    };
    const canSave = value !== '' && isValid(value);
    const avail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);
    const saveEvent = () => {
        save({ ...event, value, width, height, offsetX, offsetY, image })
    }
    return (
        <OkCancelForm submit padded save={saveEvent} cancel={close}>
            <PropertyGrid>
                <InputProp required invalid={!canSave} name="Name:" value={value} set={setValue} />
                <BitmapProp name="Image:" colors={new ColorIndex({colors: getColorsFromCanvas(tileIndex.img)})} zoomOrAvail={avail} value={image} set={setImage} resize empty={() => getEmptyImageData(tileIndex.getSizeX(), tileIndex.getSizeY())} entityIndex={eventIndex} />
                {image &&
                    <>
                        <TupleProp name="Size:" readOnly x={width} y={height} buttons />
                        <TupleProp name="Offset:" min={-1000} max={1000} x={offsetX} setX={setOffsetX} y={offsetY} setY={setOffsetY} buttons />
                    </>
                }
            </PropertyGrid>
        </OkCancelForm>
    )
}

function TileTracker({ tileIndex, aliasIndex, tilesGrid, animationIndex }) {
    const eContext = useContext(EditorContext);

    const [ pos, setPos ] = useState({x: null, y: null});
    useTracker('tileTracker', newPos => setPos(newPos));

    const zoomOrAvail = useMemo(() => {
        return {
            width: 80,
            height: 80
        };
    }, []);

    let content = '';
    if (pos.x !== null && eContext.selection.isCell()) {
        const cellValue = eContext.targetCellValue;
        const cell = tilesGrid.getCellValue(pos.x, pos.y, CellValue.tile);
        const events = tilesGrid.getCellValue(pos.x, pos.y, CellValue.events);

        let image = '';
        let type;
        let infoProps = [];

        if (cellValue === CellValue.tile) {
            const isAlias = typeof cell === 'string';
            type = isAlias ? 'Alias' : 'Tile';

            let index = cell;
            if (isAlias) {
                index = aliasIndex.getEntityByPropValue('value', cell);
                infoProps.push(
                    <LabelProp key="name" name="Name:" shorten>{cell}</LabelProp>,
                    <LabelProp key="tile" name="Tile:">{index ? aliasIndex.getEntityPropValue(index, 'title') : '?'}</LabelProp>
                )
            } else {
                infoProps.push(
                    <LabelProp key="index" name="Index:">{cell}</LabelProp>
                )
            }
            const entityIndex = isAlias ? aliasIndex : tileIndex;
            const animation = entityIndex.getEntityPropValue(index, 'animation');
            image =
                <Entity
                    entityIndex={entityIndex}
                    value={entityIndex.getEntityValue(index)}
                    animationIndex={animation != '' ? animationIndex : null}
                    readOnly zoomOrAvail={zoomOrAvail}
                />;
            infoProps.push(
                <LabelProp key="ani" name="Animation:" shorten>
                    {animation}
                </LabelProp>,
                <FullProp key="props" name="Properties:">
                    <JsonView full="h" className="ghost-bg" trim skipKeys={['index', 'animation']} json={entityIndex.getEntityPropValue(index, 'props')} defaultJson={tilesGrid.index.model.defaultTile} />
                </FullProp>
            )
        } else {
            image = getEventsImage(tilesGrid, events, zoomOrAvail);
            type = 'Events';
        }
        content = (
            <Grid columns="70px *">
                <FullProp>
                    <Block center>
                        <Tuple readOnly x={pos.x} y={pos.y} />
                    </Block>
                </FullProp>
                <FullProp>
                    <Block center padded>
                        {image}
                    </Block>
                </FullProp>
                <LabelProp name="Type:" shorten>{type}</LabelProp>
                {infoProps}
                <FullProp key="events" name="Events:">
                    <Stack vertical full="h">
                        {events.map((event, index) => <Block shorten padded="h" key={'ev-' + index}>- {event}</Block>)}
                    </Stack>
                </FullProp>
            </Grid>
        )
    }
    return (
        <Block full="h" scroll full padded={DIR.TOP}>
            {content}
        </Block>
    )
}

function MapGrid({ tilesGrid, animationIndex }) {
    const targetValues = useMemo(() => {
        return [CellValue.tile, CellValue.events]
    }, []);
    return (
        <BaseGrid
            trackId="tilesGrid"
            gridProvider={tilesGrid}
            selection={{}}
            targetValues={targetValues}
            animationIndex={animationIndex}
            navi
            resize
            edit
            events
        />
    )
}

function TilesPaneEditorInner({ tileIndex, tilesGrid, animationIndex, aliasIndex, brushIndex, eventIndex }) {
    const eContext = useContext(EditorContext);
    const eCtxRef = useRef(null);
    eCtxRef.current = eContext;
    const EditTileModal = useModal();
    const EditAliasModal = useModal();
    const EditBrushModal = useModal();
    const EditEventModal = useModal();

    const editTile = index => {
        const tile = tileIndex.getEntityObject(index);
        EditTileModal.open({
            tile,
            tileIndex,
            animationIndex,
            colors: new ColorIndex({colors: getColorsFromCanvas(tileIndex.img)}),
            save: editedTile => {
                const undoTile = tileIndex.getEntityObject(index);
                eContext.doAction(
                    () => {
                        tileIndex.setEntityObject(editedTile, true);
                    },
                    () => {
                        tileIndex.setEntityObject(undoTile, true);
                    }
                );
                EditTileModal.close();
            },
        });
    }
    const editAlias = index => {
        const alias = aliasIndex.getEntityObject(index);
        EditAliasModal.open({
            tileIndex,
            animationIndex,
            alias,
            isValid: value => alias.value === value || !aliasIndex.hasPropValue('value', value),
            save: changedAlias => {
                const plan = alias.value !== changedAlias.value ?
                    aliasIndex.getRenamePlan(alias.value, changedAlias.value) : null;
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        if (plan) aliasIndex.doRenamePlan(plan, eCtxRef.current.selection);
                        lastIndex = aliasIndex.setEntityObject({ ...changedAlias, index: lastIndex }, true);
                    },
                    () => {
                        if (plan) aliasIndex.undoRenamePlan(plan, eCtxRef.current.selection);
                        lastIndex = aliasIndex.setEntityObject({ ...alias, index: lastIndex }, true);
                    }
                );
                EditAliasModal.close();
            }
        });
    };
    const editBrush = index => {
        const brush = brushIndex.getEntityObject(index);
        EditBrushModal.open({
            name: brush.value,
            tiles: brush.tiles,
            aliasIndex,
            tileIndex,
            animationIndex,
            tilesGrid,
            brushIndex,
            isValid: name => name === brush.value || !brushIndex.hasPropValue('value', name),
            save: changedBrush => {
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        lastIndex = brushIndex.setEntityObject({...changedBrush, index: lastIndex}, true);
                        const entityValue = eContext.selection.getEntityValue();
                        if (entityValue !== undefined && entityValue === brushIndex.getEntityValue(lastIndex)) {
                            eContext.selection.setCellsFromEntity();
                        }
                    },
                    () => {
                        lastIndex = brushIndex.setEntityObject({...brush, index: lastIndex}, true);
                        const entityValue = eContext.selection.getEntityValue();
                        if (entityValue !== undefined && entityValue === brushIndex.getEntityValue(lastIndex)) {
                            eContext.selection.setCellsFromEntity();
                        }
                    }
                );
                EditBrushModal.close()
            }
        });
    }
    const editEvent = index => {
        const event = eventIndex.getEntityObject(index);
        EditEventModal.open({
            event,
            tileIndex,
            eventIndex,
            isValid: value => value === event.value || !eventIndex.hasPropValue('value', value),
            save: changedEvent => {
                const plan = event.value !== changedEvent.value ? eventIndex.getRenamePlan(event.value, changedEvent.value) : null;
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        if (plan) eventIndex.doRenamePlan(plan, eCtxRef.current.selection);
                        lastIndex = eventIndex.setEntityObject({...changedEvent, index: lastIndex}, true);
                    },
                    () => {
                        if (plan) eventIndex.undoRenamePlan(plan, eCtxRef.current.selection);
                        lastIndex = eventIndex.setEntityObject({...event, index: lastIndex}, true);
                    }
                );
                EditEventModal.close();
            }
        });
    };

    return (
        <>
            <TrackingCtx object="tilesGrid.cursor">
                <Stack vertical full borders>
                    <Stack full>
                        <Section id="selected" name="Selected" inner size={100} maxWidth="33%" collapse="h" full="v">
                            <ActiveTile editTile={editTile} animationIndex={animationIndex} tileIndex={tileIndex} aliasIndex={aliasIndex} brushIndex={brushIndex} eventIndex={eventIndex} editAlias={editAlias} editBrush={editBrush} tilesGrid={tilesGrid} />
                        </Section>

                        <Section name="Map" inner full>
                            <MapGrid tilesGrid={tilesGrid} animationIndex={animationIndex} />
                        </Section>

                        <Section id="cursor" name="Cursor" inner size={100} maxWidth="33%" collapse="h" rev full="v">
                            <TileTracker tilesGrid={tilesGrid} tileIndex={tileIndex} aliasIndex={aliasIndex} animationIndex={animationIndex} />
                        </Section>
                    </Stack>

                    <Section id="elements" name="Elements" full="h" size={180} maxHeight="50%" inner rev wrap collapse>
                        <SideTabs>
                            <SideTab active name="Tiles">
                                <SideTabs>
                                    <SideTab active name="Picker">
                                        <TilesPicker tileIndex={tileIndex} editTile={editTile} />
                                    </SideTab>
                                    <SideTab name="Manager">
                                        <TilesManager tileIndex={tileIndex} animationIndex={animationIndex} editTile={editTile} />
                                    </SideTab>
                                </SideTabs>
                            </SideTab>

                            <SideTab name="Aliases">
                                <SideTabs>
                                    <SideTab active name="Picker">
                                        <AliasPicker aliasIndex={aliasIndex} animationIndex={animationIndex} editAlias={editAlias} />
                                    </SideTab>
                                    <SideTab name="Manager">
                                        <AliasManager aliasIndex={aliasIndex} tileIndex={tileIndex} animationIndex={animationIndex} editAlias={editAlias} />
                                    </SideTab>
                                </SideTabs>
                            </SideTab>

                            <SideTab name="Brushes">
                                <SideTabs>
                                    <SideTab active name="Picker">
                                        <BrushPicker brushIndex={brushIndex} editBrush={editBrush} />
                                    </SideTab>
                                    <SideTab name="Manager">
                                        <BrushManager brushIndex={brushIndex} aliasIndex={aliasIndex} tileIndex={tileIndex} editBrush={editBrush} tilesGrid={tilesGrid} />
                                    </SideTab>
                                </SideTabs>
                            </SideTab>

                            <SideTab name="Events">
                                <SideTabs>
                                    <SideTab active name="Picker">
                                        <EventPicker eventIndex={eventIndex} editEvent={editEvent} />
                                    </SideTab>
                                    <SideTab name="Manager">
                                        <EventManager eventIndex={eventIndex} tileIndex={tileIndex} editEvent={editEvent} />
                                    </SideTab>
                                </SideTabs>
                            </SideTab>

                            <SideTab name="Animations">
                                <SideTabs>
                                    <SideTab active name="Manager">
                                        <AnimationManager animationIndex={animationIndex} spriteIndex={tileIndex} />
                                    </SideTab>
                                </SideTabs>
                            </SideTab>
                        </SideTabs>
                    </Section>
                </Stack>
            </TrackingCtx>

            <EditTileModal.content name="Edit Tile">
                <TileForm { ...EditTileModal.props } />
            </EditTileModal.content>

            <EditAliasModal.content name="Edit Alias">
                <AliasForm { ...EditAliasModal.props } />
            </EditAliasModal.content>

            <EditBrushModal.content name="Edit Brush">
                <BrushForm { ...EditBrushModal.props } />
            </EditBrushModal.content>

            <EditEventModal.content name="Edit Event">
                <EventForm {...EditEventModal.props} />
            </EditEventModal.content>
        </>
    )
}

function TilesPaneEditor({ model, resource }) {
    const update = useComponentUpdate();
    const { storeModel, deployModel, getResourceTree, openExportModal, Modals } = useExportModal({ name: 'TilesPane', model, resource, update });

    const tileIndex = useMemo(() => {
        return new TileIndex(model.tilesMap);
    }, [model]);

    const tilesGrid = useMemo(() => {
        return new TilesGrid(tileIndex, model.tilesMap);
    }, [model]);

    const animationIndex = useMemo(() => {
        return new AnimationIndex(tileIndex, model.tilesMap)
    }, [model]);

    const aliasIndex = useMemo(() => {
        return new AliasIndex(model.tilesMap, tileIndex, animationIndex);
    }, [model]);

    const brushIndex = useMemo(() => {
        return new BrushIndex(model.tilesMap, tileIndex, aliasIndex)
    }, [model]);

    const eventIndex = useMemo(() => {
        return new EventIndex(model.tilesMap)
    }, [model]);

    const models = { tileIndex, tilesGrid, animationIndex, aliasIndex, brushIndex, eventIndex };
    const tree = getResourceTree();
    const details = {
        'From:': tree[0].source,
        'Resources:': tree.length
    };
    return (
        <EditorSection id="tilesPaneEditor" full name="TilesPane" sub={model.id} details={details} confirm
                       actions={
                           eContextRef => {
                               return {
                                   revert: () => d('REVERT!'),
                                   save: {
                                       can: () => !eContextRef.current.hasStorePos(),
                                       exec: () => storeModel(eContextRef)
                                   },
                                   deploy: {
                                       can: () => !IS_DIST && eContextRef.current.hasStorePos(),
                                       exec: () => deployModel()
                                   },
                                   export: () => openExportModal()
                               }
                           }
                       }
        >
            <TilesPaneEditorInner { ...models } />
            <Modals />
        </EditorSection>
    )
}

export default TilesPaneEditor