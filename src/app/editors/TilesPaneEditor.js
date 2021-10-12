import React, { useContext, useMemo, useState, useRef } from "react";
import {
    EditorSection,
    SideTabs,
    SideTab,
    EditorCtx,
    Kbd,
    CenterInfo,
    EditorContext,
    Toolbar,
    ToolGroup,
    Canvas,
    useModal,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    PropertyGrid,
    Section,
    JsonView,
    useCachedState,
    WindowContext,
    useCssProps
} from "../components/BasicComponents";
import { DIR, Block, Stack, Grid, Overlays, Overlay } from "../components/LayoutComponents";
import {
    d,
    getCanvasForDim,
    getEmptyImageData,
    getColorsFromCanvas,
    getCanvasForEventMatrix,
    getCanvasForIndexMatrix
} from "../helper/helper";
import { useExportModal, NameDialog, FiltersModal, ResizeProps, useFilterPipelineModal, useBitmapSelectionModal, useEditBitmapModal } from "../components/EditorComponents";
import { Bitmap, Entity, Checkbox, Input, InputProp, KeyInput, NumberProp, Number, RadioProp, SelectProp, LabelProp, CheckboxProp, FullProp, Color, Button, TextArea, Tuple, TupleProp, BitmapProp, Hidden, OkCancelForm } from "../components/FormComponents";
import { GridCellMarker, BaseGrid } from "../components/GridComponents";
import { EntityPicker, EntityManager } from "../components/EntityComponents";
import { TileIndex, ColorIndex, AliasIndex, BrushIndex, EventIndex, AnimationIndex } from "../classes/EntityIndex";
import { CellValue, TilesGrid } from "../classes/Grid";
import { CellSelection } from "../classes/CellProvider";

function EntityTextPicker() {
    return 'TODO'
}

function ItemsStack() {
    return 'TODO'
}

function BrushForm() {
    return 'TODO'
}

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
        <Bitmap editable={false} value={ctx.getImageData(0, 0, sizeX, sizeY)} zoomOrAvail={zoomOrAvail} /> :
        <Block padded><Block width={zoomOrAvail.width} height={zoomOrAvail.height} border="1" /></Block>
}

function ActiveTile({tileIndex, aliasIndex, brushIndex, eventIndex, editTile, editAlias, editBrush, tilesGrid, editTiles, compact, animationIndex}) {
    const eContext = useContext(EditorContext);

    const AddEventModal = useModal();
    const SaveAsBrushModal = useModal();

    const [ active, setActive ] = useState(null);

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
    /*
    const isInvalidCell = cellValue === CellValue.tile ?
        value => {
            if (typeof value === 'string') {
                return (aliasIndex.getEntityByPropValue('value', value) === null)
            }
            return !tileIndex.hasIndex(value);
        } :
        events => {
            if (cellValue !== CellValue.events) {
                return false;
            }
            for (let event of events) {
                if (eventIndex.getEntityByPropValue('value', event) === null) {
                    return true;
                }
            }
            return false;
        };

    const hasInvalidCells = cells => {
        for (let row of cells) {
            for (let cell of row) {
                if (isInvalidCell(cell)) {
                    return true;
                }
            }
        }
        return false;
    };
    */

    if (currType === 'none' || /* hasInvalidCells(selection.getCells())  || */
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

                const addEvent = () => {
                    AddEventModal.open({
                        editorId: 'addEvent',
                        entityIndex: eventIndex,
                        filter: true,
                        sizeX: 50,
                        sizeY: 50,
                        textSize: 120,
                        zoom: 1,
                        border: 0,
                        controls: true,
                        base: index => !cell.includes(eventIndex.getEntityValue(index)),
                        select:
                            index => {
                                AddEventModal.close();
                                const event = eventIndex.getEntityValue(index);
                                cell.push(event);
                                eContext.setSelection(new CellSelection('rect', [[cell]], CellValue.events));
                                eContext.setMode('write');
                            }
                    });
                };

                image = getEventsImage(tilesGrid, cell, zoomOrAvail);
                content =
                    <FullProp name="Events:">
                        <Block thin boxed>
                            <ItemsStack
                                hasProps={false}
                                width={178}
                                empty="No event"
                                active={active}
                                setActive={setActive}
                                ordered
                                setItems={events => {
                                    eContext.setSelection(new CellSelection('rect', [[events]], CellValue.events));
                                    eContext.setMode('write');
                                }}
                                new={addEvent}
                                getName={value => value}
                                getProperties={null}
                                items={cell}
                            />
                        </Block>
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

    return (
        <Stack vertical borders full="h">
            {!compact &&
                <Toolbar>
                    <Stack gaps="1">
                        {editAction && <Button padded="h" onClick={editSelection}>Edit</Button>}
                        {brushAction && <Button padded="h" onClick={saveAsBrush}>To Brush</Button>}
                        <Button disabled={!clearAction} padded="h" onClick={clearSelection}>Clear</Button>
                    </Stack>
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

                <AddEventModal.content name="Add Event" width="600" height="500">
                    <EditorCtx>
                        <EntityTextPicker {...AddEventModal.props} />
                    </EditorCtx>
                </AddEventModal.content>

                <SaveAsBrushModal.content name="Save as Brush" fit closeable>
                    <BrushForm {...SaveAsBrushModal.props} />
                </SaveAsBrushModal.content>
            </Block>
        </Stack>
    )
}

function TilesPicker({ tileIndex }) {
    const eContext = useContext(EditorContext);
    return (
        <EntityPicker
            select={
                index => {
                    eContext.setSelection(new CellSelection('rect', [[index]], CellValue.tile));
                    eContext.setMode('write');
                }
            }
            filter
            entityIndex={tileIndex}
            controls
        />
    )
}

function AliasPicker({ aliasIndex }) {
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
            controls
        />
    )
}

function BrushPicker({ brushIndex }) {
    const eContext = useContext(EditorContext);
    const select = index => {
        eContext.setSelection(new CellSelection('entity', {entityIndex: brushIndex, value: brushIndex.getEntityValue(index), cellsProp: 'tiles'}, CellValue.tile));
        eContext.setMode('write')
    };
    return (
        <EntityPicker
            select={select}
            filter
            entityIndex={brushIndex}
            controls
        />
    )
}

function EventPicker({ eventIndex }) {
    const eContext = useContext(EditorContext);
    const select = index => {
        const event = eventIndex.getEntityValue(index);
        eContext.setSelection(new CellSelection('rect', [[[event]]], CellValue.events));
        eContext.setMode('add');
    }
    return (
        <EntityPicker
            select={select}
            filter
            entityIndex={eventIndex}
            controls
        />
    )
}

function TilesManager({ tileIndex }) {
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <EntityManager
            renderTitle={index => <Block padded><Kbd value={index} /></Block>}
            filter titleHeight={titleHeight} minWidth={60}
            entityIndex={tileIndex} maxZoom={5} undo auto
        />
    )
}

function AliasManager({ aliasIndex }) {
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <EntityManager
            renderTitle={index => <Block padded shorten>{aliasIndex.getEntityValue(index)}</Block>}
            filter titleHeight={titleHeight} minWidth={100}
            entityIndex={aliasIndex} maxZoom={5} undo auto
        />
    )
}

function BrushManager({ brushIndex }) {
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <EntityManager
            emptyText="No brushes defined. Add new one"
            renderTitle={index => <Block padded shorten>{brushIndex.getEntityValue(index)}</Block>}
            filter titleHeight={titleHeight} minWidth={100}
            entityIndex={brushIndex} maxZoom={5} undo auto
        />
    )
}

function EventManager({ eventIndex }) {
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <EntityManager
            empty="No event defined. Add new one"
            renderTitle={index => <Block padded shorten>{eventIndex.getEntityValue(index)}</Block>}
            filter titleHeight={titleHeight} minWidth={100}
            entityIndex={eventIndex} maxZoom={5} undo auto
        />
    )
}

function MapGrid({ tilesGrid }) {
    return (
        <BaseGrid
            gridProvider={tilesGrid}
            selection={{}}
            navi
            resize
            edit
        />
    )
}

function TilesPaneEditor({ model }) {

    const tileIndex = useMemo(() => {
        return new TileIndex(model);
    }, [model]);

    const tilesGrid = useMemo(() => {
        return new TilesGrid(tileIndex, model);
    }, [model]);

    const animationIndex = useMemo(() => {
//        return new AnimationIndex(tileIndex, model)
    }, [model]);

    const aliasIndex = useMemo(() => {
        return new AliasIndex(model, tileIndex, animationIndex);
    }, [model]);

    const brushIndex = useMemo(() => {
        return new BrushIndex(model, tileIndex, aliasIndex)
    }, [model]);

    const eventIndex = useMemo(() => {
        return new EventIndex(model)
    }, [model]);

    const editTile = null;
    const editAlias = null;
    const editBrush = null;

    return (
        <EditorSection id="tilesPaneEditor" full name="TilesPane" sub={model.id} actions={
            eContextRef => {
                return {
                    export: () => {
                    }
                }
            }}>

            <Stack vertical full borders>
                <Stack full>
                    <Section id="selected" name="Selected" size={100} maxWidth="33%" inner collapse="h" full="v">
                        <ActiveTile editTile={editTile} animationIndex={animationIndex} tileIndex={tileIndex} aliasIndex={aliasIndex} brushIndex={brushIndex} eventIndex={eventIndex} editAlias={editAlias} editBrush={editBrush} tilesGrid={tilesGrid} />
                    </Section>

                    <Section name="Map" inner full>
                        <MapGrid tilesGrid={tilesGrid} />
                    </Section>

                    <Section id="cursor" name="Cursor" inner size={100} maxWidth="33%" collapse="h" rev full="v" shorten padded>
                        Here I am you fucker!
                    </Section>
                </Stack>

                <Section id="elements" name="Elements" full="h" size={180} maxHeight="50%" inner rev wrap collapse>
                    <SideTabs>
                        <SideTab active name="Tiles">
                            <SideTabs>
                                <SideTab active name="Picker">
                                    <TilesPicker tileIndex={tileIndex} />
                                </SideTab>
                                <SideTab name="Manager">
                                    <TilesManager tileIndex={tileIndex} />
                                </SideTab>
                            </SideTabs>
                        </SideTab>

                        <SideTab name="Aliases">
                            <SideTabs>
                                <SideTab active name="Picker">
                                    <AliasPicker aliasIndex={aliasIndex} />
                                </SideTab>
                                <SideTab name="Manager">
                                    <AliasManager aliasIndex={aliasIndex} />
                                </SideTab>
                            </SideTabs>
                        </SideTab>

                        <SideTab name="Brushes">
                            <SideTabs>
                                <SideTab active name="Picker">
                                    <BrushPicker brushIndex={brushIndex} />
                                </SideTab>
                                <SideTab name="Manager">
                                    <BrushManager brushIndex={brushIndex} />
                                </SideTab>
                            </SideTabs>
                        </SideTab>

                        <SideTab name="Events">
                            <SideTabs>
                                <SideTab active name="Picker">
                                    <EventPicker eventIndex={eventIndex} />
                                </SideTab>
                                <SideTab name="Manager">
                                    <EventManager eventIndex={eventIndex} />
                                </SideTab>
                            </SideTabs>
                        </SideTab>

                        <SideTab name="Animations">
                            <SideTabs>
                                <SideTab active name="Picker">
                                    Pick me!
                                </SideTab>
                                <SideTab name="Manager">
                                    Manage me!
                                </SideTab>
                            </SideTabs>
                        </SideTab>
                    </SideTabs>
                </Section>
            </Stack>

        </EditorSection>
    )
}

export {
    TilesPaneEditor
}

