import React, {Fragment, useContext, useEffect, useMemo, useRef, useState} from "react";
import {CellValue} from "../classes/Grid";
import {
    Stack,
    Section,
    Content,
    Title,
    Button,
    Centered,
    TextAreaProp,
    PropertyGrid,
    TextFieldProp,
    Toolbar,
    PositionPickerProp,
    DimProp,
    Bitmap,
    ItemsStack,
    Entity,
    BitmapProp,
    EntityProp,
    PropLabel,
    FullProp,
    ValueProp,
    SaveAndCancel,
    EntityTextPicker,
    EntityPicker,
    FiltersSelector,
    EntityManager,
    JsonView,
    AnimationManager,
    useModal,
    Page,
    ActionFrame,
    SideTabs,
    SideTab,
    GlobalContext,
    useExportModal,
    useAddIndexActions
} from './BaseComponents';
import {
    EditorCtx,
    BasicRasterView,
    EditorContext,
    useEditorContextPart,
    BitmapSelector,
    drawEventsValue
} from './Raster';
import {CellSelection} from '../classes/CellProvider.js';
import {
    d,
    cloneDeep,
    getColorsFromCanvas,
    getCanvasForDim,
    getCanvasForIndexMatrix,
    getCanvasForBitmap,
    getEmptyImageData,
    getCanvasForEventMatrix,
    getRebuildJsonForModel
} from '../helper/helper';
import {TileIndex, ColorIndex, AliasIndex, BrushIndex, EventIndex, AnimationIndex} from "../classes/EntityIndex";
import {TilesGrid} from "../classes/Grid";
import {BitmapCellProvider} from "../classes/CellProvider";

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
        <Content padded><Content width={zoomOrAvail.width} height={zoomOrAvail.height} boxed thin></Content></Content>
}

function TileTracker({editorId, tileIndex, aliasIndex, tilesGrid, animationIndex}) {
    const eContext = useEditorContextPart(editorId);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);

    const zoomOrAvail = useMemo(() => {
        return {
            width: 80,
            height: 80
        };
    }, []);

    const width = 180;
    eContext.setTracker(editorId, (x, y) => {
        setTrackX(x);
        setTrackY(y);
    });

    let content = '';
    if (trackX !== null && eContext.selection.isCell()) {
        const cellValue = eContext.targetCellValue;
        const cell = tilesGrid.getCellValue(trackX, trackY, CellValue.tile);
        const events = tilesGrid.getCellValue(trackX, trackY, CellValue.events);

        let image = '';
        let type;
        let infoProps = [];

        if (cellValue === CellValue.tile) {
            const isAlias = typeof cell === 'string';
            type = isAlias ? 'Alias' : 'Tile';

            let index = cell;
            if (isAlias) {
                infoProps.push(
                    <ValueProp key="name" name="Name:">{cell}</ValueProp>
                );
                index = aliasIndex.getEntityByPropValue('value', cell);
                infoProps.push(
                    <ValueProp key="tile" name="Tile:">
                        {index ? aliasIndex.getEntityPropValue(index, 'tile') : '?'}
                    </ValueProp>
                );
            } else {
                infoProps.push(
                    <ValueProp key="index" name="Index:">{cell}</ValueProp>
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
            infoProps =
                <>
                    {infoProps}
                    <>
                        <ValueProp name="Animation:">
                            {animation}
                        </ValueProp>
                        <FullProp name="Properties:">
                            <JsonView width="165" trim skipKeys={['index', 'animation']} json={entityIndex.getEntityPropValue(index, 'props')} defaultJson={tilesGrid.index.model.defaultTile} />
                        </FullProp>
                    </>
                </>;
        } else {
            image = getEventsImage(tilesGrid, events, zoomOrAvail);
            type = 'Events';
        }

        content = (
            <PropertyGrid propWidth="70px">
                <DimProp name="Position:" readOnly x={trackX} y={trackY} />
                <FullProp>
                    <Centered>
                        {image}
                    </Centered>
                </FullProp>
                <ValueProp name="Type:">{type}</ValueProp>
                {infoProps}
                <FullProp name="Events:">
                    {events.map((event, index) => <Title key={index}>{' - '}{event}</Title>)}
                </FullProp>
            </PropertyGrid>
        );
    }
    return (
        <Content width={width}>{content}</Content>
    )
}

function ActiveTile({tileIndex, aliasIndex, brushIndex, eventIndex, editTile, editAlias, editBrush, tilesGrid, editTiles, compact, animationIndex}) {
    const eContext = useContext(EditorContext);

    const AddEventModal = useModal();
    const SaveAsBrushModal = useModal();

    const [active, setActive] = useState(null);

    const selection = eContext.selection;
    const avail = selection && selection.isCell() ? 80 : 150;
    const zoomOrAvail = useMemo(() => {
        return {
            width: avail,
            height: avail
        };
    }, [avail]);

    const clearSelection = () => {
        const currMode = eContext.getRasterMode('map');
        let newMode = 'startPath';
        if (['pick', 'select', 'drag', 'add'].includes(currMode)) {
            newMode = currMode;
        }
        const cellValue = eContext.targetCellValue;
        eContext.setSelection(new CellSelection('rect', [[cellValue.getEmpty()]], cellValue));
        if (currMode === 'startPath' || currMode !== newMode) {
            eContext.setRasterMode('map', newMode);
        }
    };

    const currType = selection.getType();
    if (currType === 'entity') {
        selection.setCellsFromEntity();
    }

    const cellValue = eContext.selection.getCellValue();
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

    if (currType === 'none' || hasInvalidCells(selection.getCells()) ||
        (currType === 'entity' && brushIndex.getEntityByPropValue('value', selection.getEntityValue()) === null)) {
        requestAnimationFrame(() => {
            const isEvent = eContext.targetCellValue === CellValue.events;
            eContext.setSelection(
                new CellSelection('rect', [[isEvent ? [] : 0]],  isEvent ? CellValue.events : CellValue.tile)
            );
            eContext.setRasterMode('map', 'startPath');
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
                eContext.setRasterMode('map', 'startPath');
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
                        <ValueProp key="name" name="Name:">{cell}</ValueProp>
                    );
                    index = aliasIndex.getEntityByPropValue('value', cell);
                    infoProps.push(
                        <ValueProp key="tile" name="Tile:">
                            {index !== undefined ? aliasIndex.getEntityPropValue(index, 'tile') : '?'}
                        </ValueProp>
                    );
                } else {
                    infoProps.push(
                        <ValueProp key="index" name="Index:">{cell}</ValueProp>
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
                                <ValueProp name="Animation:">
                                    {animation}
                                </ValueProp>
                                <FullProp name="Properties:">
                                    <JsonView width={170} trim skipKeys={['index', 'animation']} json={entityIndex.getEntityPropValue(index, 'props')} defaultJson={tilesGrid.index.model.defaultTile} />
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
                                eContext.setRasterMode('map', 'startPath');
                            }
                    });
                };

                image = getEventsImage(tilesGrid, cell, zoomOrAvail);
                content =
                    <FullProp name="Events:">
                        <Content thin boxed>
                            <ItemsStack
                                hasProps={false}
                                width={178}
                                empty="No event"
                                active={active}
                                setActive={setActive}
                                ordered
                                setItems={events => {
                                    eContext.setSelection(new CellSelection('rect', [[events]], CellValue.events));
                                    eContext.setRasterMode('map', 'startPath');
                                }}
                                new={addEvent}
                                getName={value => value}
                                getProperties={null}
                                items={cell}
                            />
                        </Content>
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
            <Bitmap editable={false} value={imageData} zoomOrAvail={zoomOrAvail} />;

        content = <>
            {name && <ValueProp name="Name:">{name}</ValueProp>}
            <ValueProp name="Size:"><kbd>{selection.getWidth()}<kbd className="less">x</kbd>{selection.getHeight()}</kbd></ValueProp>
        </>;
    }

    return (
        <Stack vertical border>
            {!compact &&
                <Toolbar>
                    <Stack>
                        {editAction && <Button click={editSelection}>Edit</Button>}
                        {brushAction && <Button click={saveAsBrush}>To Brush</Button>}
                        <Button disabled={!clearAction} click={clearSelection}>Clear</Button>
                    </Stack>
                </Toolbar>
            }
            <Content padded width="180" flex>
                <PropertyGrid propWidth="70px">
                    <FullProp>
                        <Centered>
                            {image ? image : <Content width={avail} height={avail} boxed thin></Content>}
                        </Centered>
                    </FullProp>
                    <ValueProp name="Type:">
                        {type}
                    </ValueProp>
                    {content}
                </PropertyGrid>

                <AddEventModal.content name="Add Event" width="600" height="500">
                    <EditorCtx>
                        <EntityTextPicker {...AddEventModal.props} />
                    </EditorCtx>
                </AddEventModal.content>

                <SaveAsBrushModal.content name="Save as Brush" fit closeable>
                    <BrushForm {...SaveAsBrushModal.props} />
                </SaveAsBrushModal.content>
            </Content>
        </Stack>
    )
}

function ActiveBrushPicker({brushIndex, editBrush}) {
    const eContext = useContext(EditorContext);

    const setActive = index => {
        eContext.setSelection(new CellSelection('entity', {entityIndex: brushIndex, value: brushIndex.getEntityValue(index), cellsProp: 'tiles'}, CellValue.tile));
        eContext.setRasterMode('map', 'startPath');
    };

    return (
        <EntityPicker
            zoom={2}
            border={1}
            filter
            entityIndex={brushIndex}
            doubleClick={editBrush}
            controls
            select={setActive}
        />
    )
}

function ActiveAliasPicker({tileIndex, aliasIndex, animationIndex, editAlias}) {
    const eContext = useContext(EditorContext);

    const select = index => {
        const name = aliasIndex.getEntityValue(index);
        eContext.setSelection(new CellSelection('rect', [[name]], CellValue.tile));
        eContext.setRasterMode('map', 'startPath');
    };
    return (
        <EntityTextPicker
            filter
            entityIndex={aliasIndex}
            animationIndex={animationIndex}
            doubleClick={editAlias}
            controls
            editorId="aliasPicker"
            sizeX={tileIndex.getSizeX()}
            sizeY={tileIndex.getSizeY()}
            textSize={120}
            zoom={2}
            border={0}
            select={select}
        />
    );
}

function BrushForm({save, close, isValid, editTiles, animationIndex, brushIndex, aliasIndex, tilesGrid, tileIndex, ...props}) {

    const EditTilesModal = useModal();
    const CopyBrushModal = useModal();

    const [name, setName] = useState(props.name);
    const [tiles, setTiles] = useState(cloneDeep(props.tiles));

    const canSave = name !== '' && isValid(name);

    const saveBrush = () => {
        save({value: name, tiles});
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
        <SaveAndCancel canSave={canSave} padded save={saveBrush} close={close}>
            <PropertyGrid>
                <TextFieldProp name="Name:" value={name} set={setName} invalid={!canSave} />
                <PropLabel name="Tiles:">
                    <Stack noGap>
                        <Button click={editBrushTiles}>Edit</Button>
                        <Button click={copyBrush}>Copy</Button>
                    </Stack>
                    <Bitmap value={image} zoomOrAvail={{width: 200, height: 200}} editable={false} />
                </PropLabel>
                <DimProp name="Size:" readOnly x={tiles[0].length} y={tiles.length} />
            </PropertyGrid>

            <EditTilesModal.content name="Edit Tiles" width={800} height={600} closeable fit>
                <EditorCtx>
                    <TilesEditor {...EditTilesModal.props} />
                </EditorCtx>
            </EditTilesModal.content>

            <CopyBrushModal.content name="Pick Brush" width={600} height={600}>
                <EntityPicker {...CopyBrushModal.props} />
            </CopyBrushModal.content>
        </SaveAndCancel>
    )
}

function AliasForm({save, close, isValid, alias, tileIndex, animationIndex}) {
    const TilePickerModal = useModal();

    const [name, setName] = useState(alias.value);
    const [tile, setTile] = useState(alias.tile);
    const [props, setProps] = useState(JSON.stringify(alias.props, null, 2));
    const [animation, setAnimation] = useState(alias.animation);

    const avail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);

    const saveAlias = () => {
        save({...alias, value: name, tile, animation, props: JSON.parse(props)});
    };

    let isValidJson = true;
    try {
        JSON.parse(props);
    } catch (e) {
        isValidJson = false;
    }

    let isValidName = name !== '' && isValid(name);

    const canSave = isValidName && isValidJson;

    return (
        <>
            <SaveAndCancel padded canSave={canSave} close={close} save={saveAlias}>
                <PropertyGrid>
                    <TextFieldProp name="Name:" value={name} set={setName} invalid={!isValidName} />
                    <EntityProp name="Tile:" value={tile} zoomOrAvail={avail} entityIndex={tileIndex} set={setTile} />
                    <EntityProp entityIndex={animationIndex} animationIndex={animationIndex} reset name="Animation:" value={animation} set={setAnimation} zoomOrAvail={avail} />
                    <TextAreaProp name="Properties:" invalid={!isValidJson} cols={30} rows={10} value={props} set={setProps} />
                </PropertyGrid>
            </SaveAndCancel>

            <TilePickerModal.content name="Pick Tile" {...TilePickerModal.props} height={400} width={400} closeable>
                <EditorCtx>
                    <EntityPicker entityIndex={tileIndex} zoom={2} select={index => {setTile(index); TilePickerModal.close()}} />
                </EditorCtx>
            </TilePickerModal.content>
        </>
    )
}

function BrushManager({brushIndex, tilesGrid, editBrush, aliasIndex, tileIndex}) {
    const eContext = useContext(EditorContext);

    const NewBrushModal = useModal();

    const actions = useAddIndexActions(brushIndex, ['delete']);

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

    return (
        <>
            <EntityManager
                entityIndex={brushIndex}
                actions={actions}
                titleHeight={20}
                minWidth={100}
                filter
                maxedZoom
                empty="No brushes defined. Add new one"
                renderTitle={index => {
                    const props = brushIndex.getEntityObject(index);
                    return <Title maxWidth={100}>{props.value}</Title>
                }}
                newItem={newBrush}
                doubleClick={editBrush}
            />

            <NewBrushModal.content name="New Brush" fit closeable>
                <BrushForm {...NewBrushModal.props} />
            </NewBrushModal.content>
        </>
    );
}

function AliasManager({aliasIndex, tileIndex, editAlias, animationIndex}) {
    const eContext = useContext(EditorContext);

    const NewAliasModal = useModal();

    const actions = [
        {
            name: 'Edit',
            doAction: indices => {
                editAlias(indices[0]);
            },
            isHidden: props => props.marked.length !== 1
        }
    ];
    useAddIndexActions(aliasIndex, ['delete'], actions);

    const newAlias = () => {
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
                        index = aliasIndex.setEntityObject({...alias});
                    },
                    () => {
                        aliasIndex.deleteEntity(index);
                    }
                );
                NewAliasModal.close();
            }
        });
    };

    return (
        <>
            <EntityManager
                entityIndex={aliasIndex}
                animationIndex={animationIndex}
                actions={actions}
                titleHeight={20}
                minWidth={100}
                maxedZoom
                filter
                renderTitle={index => {
                    const props = aliasIndex.getEntityObject(index);
                    return <Title maxWidth={100}>{props.value}</Title>
                }}
                newItem={newAlias}
                doubleClick={editAlias}
            />
            <NewAliasModal.content name="New Alias" fit closeable>
                <AliasForm {...NewAliasModal.props} />
            </NewAliasModal.content>
        </>
    )
}

function TilesManager({tileIndex, animationIndex, editTile}) {
    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);

    const NewTileModal = useModal();
    const ImportTilesModal = useModal();
    const ApplyFilterModal = useModal();

    const getColorIndexFromTiles = () => {
        return new ColorIndex({colors: getColorsFromCanvas(tileIndex.img)});
    };

    const actions = [
        {
            name: 'Edit',
            doAction: indices => {
                editTile(indices[0]);
            },
            isHidden: props => props.marked.length !== 1
        }
    ];
    useAddIndexActions(
        tileIndex,
        ['delete', 'swap', 'clear', 'copy', 'paste'],
        actions
    );
    actions.push({
        name: 'Apply...',
        doAction: indices => {
            const previewCanvas = [];
            for (let index of indices) {
                previewCanvas.push({
                    name: index,
                    canvas: getCanvasForBitmap(tileIndex.getEntityPropValue(index, 'image'))
                });
            }
            ApplyFilterModal.open({
                canvas: previewCanvas,
                save: filter => {
                    const undoChars = tileIndex.getEntityObjects(indices);
                    const doBitmaps = {};
                    const sizeX = tileIndex.getSizeX();
                    const sizeY = tileIndex.getSizeY();
                    for (let index of indices) {
                        const canvas = getCanvasForBitmap(tileIndex.getEntityPropValue(index, 'image'));
                        const newBitmap =
                            context.filters.getCanvasWithFiltersApplied(
                                filter,
                                {elem: canvas, ctx: canvas.getContext('2d')},
                                0,
                                0,
                                sizeX,
                                sizeY
                            )[0].ctx.getImageData(0, 0, sizeX, sizeY);
                        doBitmaps[index] = newBitmap;
                    }
                    eContext.doAction(
                        () => {
                            for(let [index, bitmap] of Object.entries(doBitmaps)) {
                                tileIndex.setEntityPropValue(index, 'image', bitmap);
                            }
                        },
                        () => {
                            for(let obj of undoChars) {
                                tileIndex.setEntityPropValue(obj.index, 'image', obj.image);
                            }
                        }
                    );
                    ApplyFilterModal.close()
                }
            });
        }
    });

    const newTile = () => {
        NewTileModal.open({
            tileIndex,
            animationIndex,
            save: tile => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = tileIndex.setEntityObject(tile);
                    },
                    () => {
                        tileIndex.deleteEntity(index);
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

    const importTiles = () => {
        const selected = selection => {
            const baseCells = selection.getBaseCells();
            const tiles = [];
            for(let cells of baseCells) {
                const provider = new BitmapCellProvider(1);
                provider.setMap(cells);
                tiles.push({
                    value: null,
                    image: provider.getImageData()
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
            ImportTilesModal.close();
        };
        ImportTilesModal.open({
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
                entityIndex={tileIndex}
                animationIndex={animationIndex}
                actions={actions}
                titleHeight={20}
                minWidth={50}
                maxedZoom
                filter
                newItem={newTile}
                importItems={importTiles}
                doubleClick={editTile}
            />

            <NewTileModal.content name="New Tile" closeable fit>
                <TileForm {...NewTileModal.props} />
            </NewTileModal.content>

            <ImportTilesModal.content name="Import Tiles" closeable>
                <EditorCtx>
                    <BitmapSelector
                        zoom="1"
                        border="0"
                        cancelHandler={ImportTilesModal.close}
                        saveHandler={ImportTilesModal.props.save}
                        selection={ImportTilesModal.props.selection}
                        bitmaps={context.imageResources}
                    />
                </EditorCtx>
            </ImportTilesModal.content>

            <ApplyFilterModal.content height={500} closeable>
                <FiltersSelector bgColor="#000000" {...ApplyFilterModal.props} cancel={ApplyFilterModal.close} filters="" />
            </ApplyFilterModal.content>
        </>
    );
}

function ActiveTilePicker({tileIndex, animationIndex, editTile, base = null}) {
    const eContext = useContext(EditorContext);
    return (
        <Stack fullHeight scroll border>
            <Content flex scroll>
                <EntityPicker
                    editorId="tilesPicker"
                    entityIndex={tileIndex}
                    animationIndex={animationIndex}
                    base={base}
                    filter
                    doubleClick={index => editTile(index)}
                    select={
                        index => {
                            eContext.setSelection(new CellSelection('rect', [[index]], CellValue.tile));
                            eContext.setRasterMode('map', 'startPath');
                        }
                    }
                    controls
                />
            </Content>
        </Stack>
    )
}

function ActiveEventPicker({eventIndex, editEvent}) {
    const eContext = useContext(EditorContext);
    return (
        <EntityTextPicker
            filter
            sizeX={50}
            sizeY={50}
            textSize={120}
            select={
                index => {
                    const event = eventIndex.getEntityValue(index);
                    eContext.setSelection(new CellSelection('rect', [[[event]]], CellValue.events));
                    eContext.setRasterMode('map', 'add');
                }
            }
            zoom={1}
            border={0}
            doubleClick={editEvent}
            controls
            entityIndex={eventIndex}
        />
    )
}

function EventForm({isValid, event, close, save, tileIndex, eventIndex}) {
    const [value, setValue] = useState(event.value);
    const [width, setWidth] = useState(event.width);
    const [height, setHeight] = useState(event.height);
    const [offsetX, setOffsetX] = useState(event.offsetX);
    const [offsetY, setOffsetY] = useState(event.offsetY);
    const [image, setImageRaw] = useState(event.image);
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
        save({...event, value, width, height, offsetX, offsetY, image});
    };

    return (
        <SaveAndCancel padded save={saveEvent} close={close} canSave={canSave}>
            <PropertyGrid>
                <TextFieldProp invalid={!canSave} name="Name:" value={value} set={setValue} />
                <BitmapProp name="Image:" colors={new ColorIndex({colors: getColorsFromCanvas(tileIndex.img)})} zoomOrAvail={avail} value={image} set={setImage} resizeable editable empty={() => getEmptyImageData(tileIndex.getSizeX(), tileIndex.getSizeY())} entityIndex={eventIndex} />
                {image &&
                    <>
                        <DimProp name="Size:" readOnly x={width} y={height} buttons />
                        <DimProp name="Offset:" min={-1000} max={1000} x={offsetX} setX={setOffsetX} y={offsetY} setY={setOffsetY} buttons />
                    </>
                }
            </PropertyGrid>
        </SaveAndCancel>
    )
}

function EventManager({eventIndex, tileIndex, editEvent}) {
    const eContext = useContext(EditorContext);

    const NewEventModal = useModal();

    const actions = useAddIndexActions(eventIndex, ['delete']);

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
                        index = eventIndex.setEntityObject({...event});
                    },
                    () => {
                        eventIndex.deleteEntity(index);
                    }
                );
                NewEventModal.close();
            }
        });
    };

    return (
        <>
            <EntityManager
                entityIndex={eventIndex}
                actions={actions}
                titleHeight={20}
                minWidth={100}
                filter
                maxedZoom
                newItem={addEvent}
                empty="No event defined. Add new one"
                doubleClick={editEvent}
                renderTitle={index => {
                    const name = eventIndex.getEntityValue(index);
                    return <Title maxWidth={100}>{name}</Title>
                }}
            />

            <NewEventModal.content name="New Event" closeable fit>
                <EventForm {...NewEventModal.props} />
            </NewEventModal.content>
        </>
    )
}

function TileForm({save, close, tile, colors, animationIndex, tileIndex}) {
    const [image, setImage] = useState(tile.image);
    const [props, setProps] = useState(JSON.stringify(tile.props, null, 4));
    const [position, setPosition] = useState('end');
    const [entity, setEntity] = useState(0);
    const zoomOrAvail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);
    const [animation, setAnimation] = useState(tile.animation || '');

    let isValidJson = true;
    try {
        JSON.parse(props)
    } catch (e) {
        isValidJson = false;
    }

    const saveTile = () => {
        const newTile = {...tile, animation, props: JSON.parse(props), image};
        if (tile.index === undefined && position !== 'end') {
            newTile.index = (position === 'start') ? 0 : entity;
            if (position === 'after') {
                newTile.index++;
            }
        }
        save(newTile);
    };

    const canSave = isValidJson;

    return (
        <SaveAndCancel padded save={saveTile} close={close} canSave={canSave}>
            <PropertyGrid>
                {tile.index !== undefined ?
                    <TextFieldProp name="Index:" value={tile.index} size={4} readOnly /> :
                    <PositionPickerProp position={position} setPosition={setPosition} entity={entity} setEntity={setEntity} name="Insert:" entityIndex={tileIndex} animationIndex={animationIndex} />
                }
                <BitmapProp name="Image:" value={image} set={setImage} entityIndex={tileIndex} editable zoomOrAvail={zoomOrAvail} colors={colors} />
                <EntityProp entityIndex={animationIndex} animationIndex={animationIndex} reset name="Animation:" value={animation} set={setAnimation} zoomOrAvail={zoomOrAvail} />
                <TextAreaProp name="Properties:" invalid={!isValidJson} cols={30} rows={10} value={props} set={setProps} />
            </PropertyGrid>
        </SaveAndCancel>
    )
}

function TilesEditor({tilesGrid, aliasIndex, animationIndex, tiles, save, close, canSave}) {
    const eContext = useContext(EditorContext);

    const editGrid = useMemo(() => {
        return new TilesGrid(
            tilesGrid.index,
            {...tilesGrid.model, map: tiles}
        );
    }, [tiles]);

    return (
        <SaveAndCancel fullHeight save={() => {save(editGrid.map)}} canSave={() => true} close={close}>
            <Stack vertical border fullHeight>
                <Stack flex fullHeight border>
                    <ActiveTile animationIndex={animationIndex} tileIndex={tilesGrid.index} aliasIndex={aliasIndex} tilesGrid={tilesGrid} compact />

                    <Content flex>
                        <BasicRasterView
                            cellProvider={editGrid}
                            animationIndex={animationIndex}
                            resizeable
                            undoRedo
                            editorId="editTiles"
                        />
                    </Content>
                </Stack>

                <Content height={150}>
                    <SideTabs>
                        <SideTab name="Tiles" active>
                            <EntityPicker entityIndex={tilesGrid.index} animationIndex={animationIndex} select={
                                index => {
                                    eContext.setSelection(
                                        new CellSelection('rect', [[index]], CellValue.tile)
                                    );
                                    eContext.setRasterMode('editTiles', 'startPath');
                                }
                            } />
                        </SideTab>

                        <SideTab name="Alias">
                            <EntityTextPicker
                                entityIndex={aliasIndex}
                                animationIndex={animationIndex}
                                select={
                                    index => {
                                            eContext.setSelection(
                                                new CellSelection('rect', [[aliasIndex.getEntityValue(index)]], CellValue.tile)
                                            );
                                            eContext.setRasterMode('editTiles', 'startPath');
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
                </Content>
            </Stack>
        </SaveAndCancel>
    )
}

function TilesMapEditor({model, resource, revert, cancel, play, tree, exportModel, saveModel}) {

    const eContext = useContext(EditorContext);

    const EditTileModal = useModal();
    const EditAliasModal = useModal();
    const EditBrushModal = useModal();
    const EditEventModal = useModal();

    const ExportModal = useExportModal(resource);

    useEffect(() => {
        eContext.setTracking({map: ['active', 'hover']});
    }, []);

    const tileIndex = useMemo(() => {
        return new TileIndex(model);
    }, [model]);

    const tilesGrid = useMemo(() => {
        return new TilesGrid(tileIndex, model);
    }, [model]);

    const animationIndex = useMemo(() => {
        return new AnimationIndex(tileIndex, model)
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

    const modeTargets = useMemo(() => {
        return [CellValue.tile, CellValue.events]
    }, [model]);

    const xxx = useMemo(() => {
        tileIndex.getDeleteInfo([922, 923]);
    }, [model]);

    const saveTilesPane = () => {
        saveModel(model);
        eContext.updateRestorePos();
    };
    const exportTilesPane = () => {
        ExportModal.open(model, {compact: ['map']});
    };
    const deployTilesPane = () => {d('DEPLOY...')};

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
    };

    const editAlias = index => {
        const alias = aliasIndex.getEntityObject(index);
        EditAliasModal.open({
            tileIndex,
            animationIndex,
            alias,
            isValid: value => alias.value === value || !aliasIndex.hasPropValue('value', value),
            save: changedAlias => {
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        lastIndex = aliasIndex.setEntityObject({...changedAlias, index: lastIndex}, true);
                    },
                    () => {
                        lastIndex = aliasIndex.setEntityObject({...alias, index: lastIndex}, true);
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
    };

    const editEvent = index => {
        const event = eventIndex.getEntityObject(index);
        EditEventModal.open({
            event,
            tileIndex,
            eventIndex,
            isValid: value => value === event.value || !eventIndex.hasPropValue('value', value),
            save: changedEvent => {
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        lastIndex = eventIndex.setEntityObject({...changedEvent, index: lastIndex}, true);
                    },
                    () => {
                        lastIndex = eventIndex.setEntityObject({...event, index: lastIndex}, true);
                    }
                );
                EditEventModal.close();
            }
        });
    };

    const frameActions = (
        <Stack>
            <Content>
                <button disabled={!eContext.hasPast()} onClick={() => eContext.undoAction()}>Undo</button>
                <button disabled={!eContext.hasFuture()} onClick={() => eContext.redoAction()}>Redo</button>
            </Content>
            <Content>
                <button onClick={revert}>Revert</button>
                <button onClick={saveTilesPane}>Save</button>
                <button onClick={deployTilesPane} disabled={!eContext.hasStorePos()}>Deploy</button>
                <button onClick={exportTilesPane}>Export</button>
            </Content>
        </Stack>
    );
    const getActiveTileElem = () => {
        return <ActiveTile editTile={editTile} animationIndex={animationIndex} tileIndex={tileIndex} aliasIndex={aliasIndex} brushIndex={brushIndex} eventIndex={eventIndex} editAlias={editAlias} editBrush={editBrush} tilesGrid={tilesGrid} />
    };

    const trackerRef = useRef(null);
    return (
        <Page title="Edit TilesPane" resources={tree} cancel={cancel} play={play}>
            <Stack vertical fullHeight>
                <ActionFrame type="TilesPane: " name={resource.id + (eContext.hasStorePos() ? ' ' : '*')} fullHeight sub={{'from': tree[0].source, 'Resources': tree.length}} actions={frameActions}>
                    <Stack vertical>
                        <Stack flex>
                            <Section name="Selected" hidden={getActiveTileElem} collapse vertical>
                                {getActiveTileElem()}
                            </Section>

                            <Section name="Map" flex>
                                <BasicRasterView modeTargets={modeTargets} animationIndex={animationIndex} undoRedo={false} tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={tilesGrid} width={5} height={5} posX={0} posY={7} border={0} events={true} zoom={1} />
                            </Section>
                            <Section name="Cursor" collapse vertical>
                                <Content padded>
                                    <TileTracker editorId="hover" tilesGrid={tilesGrid} tileIndex={tileIndex} aliasIndex={aliasIndex} animationIndex={animationIndex} />
                                </Content>
                            </Section>
                        </Stack>

                        <Section name="Elements" height={260} collapse>
                            <SideTabs>

                                <SideTab name="Tiles" active>
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveTilePicker tileIndex={tileIndex} animationIndex={animationIndex} editTile={editTile} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <TilesManager tileIndex={tileIndex} animationIndex={animationIndex} editTile={editTile} editorId="tileManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Aliases">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveAliasPicker aliasIndex={aliasIndex} tileIndex={tileIndex} animationIndex={animationIndex} editAlias={editAlias} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <AliasManager aliasIndex={aliasIndex} tileIndex={tileIndex} editAlias={editAlias} animationIndex={animationIndex} editorId="aliasManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Brushes">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveBrushPicker brushIndex={brushIndex} editBrush={editBrush} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <BrushManager brushIndex={brushIndex} aliasIndex={aliasIndex} tileIndex={tileIndex} editBrush={editBrush} tilesGrid={tilesGrid} editorId="brushManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Events">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveEventPicker eventIndex={eventIndex} editEvent={editEvent} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <EventManager eventIndex={eventIndex} tileIndex={tileIndex} editEvent={editEvent} />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Animations">
                                    <SideTabs>
                                        <SideTab name="Manage" active>
                                            <AnimationManager animationIndex={animationIndex} spriteIndex={tileIndex} />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                            </SideTabs>
                        </Section>
                    </Stack>
                </ActionFrame>
            </Stack>

            <EditTileModal.content name="Edit Tile" closeable fit>
                <TileForm {...EditTileModal.props} />
            </EditTileModal.content>

            <EditAliasModal.content name="Edit Alias" fit closeable>
                <AliasForm {...EditAliasModal.props} />
            </EditAliasModal.content>

            <EditBrushModal.content name="Edit Brush" fit closeable>
                <BrushForm {...EditBrushModal.props} />
            </EditBrushModal.content>

            <EditEventModal.content name="Edit Event" closeable fit>
                <EventForm {...EditEventModal.props} />
            </EditEventModal.content>

            {ExportModal.render}
        </Page>
    );
}

export default TilesMapEditor;