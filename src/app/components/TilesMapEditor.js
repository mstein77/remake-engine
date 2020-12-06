import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {
    Stack,
    Section,
    Content,
    Canvas,
    Title,
    Button,
    Centered,
    TextAreaProp,
    PropertyGrid,
    TextFieldProp,
    TextArea,
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
    AnimationManager,
    useModal, Page, ActionFrame,
    SideTabs, SideTab, GlobalContext, useAddIndexActions
} from './BaseComponents';
import {
    EditorCtx,
    BasicRasterView,
    EditorContext,
    useEditorContextPart,
    BitmapSelector
} from './Raster';
import {CellSelection, BrushSelection, EventSelection} from '../classes/CellProvider.js';
import {d, getColorsFromCanvas, getCanvasForDim, getCanvasForIndexMatrix, getCanvasForBitmap, getEmptyImageData} from '../helper/helper';
import {TileIndex, ColorIndex, AliasIndex, BrushIndex, EventIndex, AnimationIndex} from "../classes/EntityIndex";
import {IndexGrid, TilesGrid} from "../classes/Grid";
import {BitmapCellProvider} from "../classes/CellProvider";

function TileTracker({editorId, tileIndex, tilesGrid}) {
    const eContext = useEditorContextPart(editorId);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);

    const width = 180;
    eContext.setTracker(editorId, (x, y) => {
        setTrackX(x);
        setTrackY(y);
    });

    let content = '';
    if (trackX !== null) {
        const selection = tilesGrid.getRawSelection(trackX, trackY, 1, 1);
        const tile = selection.getRow(0)[0];
        const index = Array.isArray(tile) ? tile[0] : tile;

        const selectionProvider = new IndexGrid(tileIndex, {map: selection.getCells()});
        const zoom = 4;
        const dim = selectionProvider.getGridDim(1, 1, 0, zoom);

        content = (
            <>
                <Stack align="center" alignItems="center">
                    <Content boxed  className="min-content">
                        <Canvas width={dim.width} height={dim.height}
                                render={ctx => tilesGrid.drawCellValue(ctx, tile, 0, 0, zoom)}
                        />
                    </Content>
                </Stack>
                <Content>Position: <kbd>{trackX}x{trackY}</kbd></Content>
                <Content>Tile: <kbd>{index}</kbd></Content>
            </>
        );
    }
    return <Content width={width}>{content}</Content>;
}

function useSelectionProps({aliasIndex, tileIndex, brushIndex, tilesGrid}) {
    const eContext = useContext(EditorContext);

    const selection = eContext.selection;
    if (!selection || selection.getType() === 'none') {
        return false;
    }

    const width = selection.getWidth();
    const height = selection.getHeight();

    if (width === 1 && height === 1) {
        const value = selection.getCell();
        switch (typeof value) {

            case 'string':
                const index = aliasIndex.getEntityByPropValue('value', value);
                if (index === null) {
                    return false;
                }
                return {
                    entity: aliasIndex,
                    index,
                    name: value,
                    tile: aliasIndex.getEntityPropValue(index, 'tile'),
                    animation: aliasIndex.getEntityPropValue(index, 'animation'),
                    props: aliasIndex.getEntityPropValue(index, 'props'),
                    type: 'Alias',
                    content: 'elem'
                };

            case 'object':
                const sizeX = tilesGrid.getCellSizeX();
                const sizeY = tilesGrid.getCellSizeY();
                const canvas = getCanvasForDim(sizeX, sizeY);
                const ctx = canvas.getContext('2d');
                let hasImage = false;
                for (let event of value) {
                    if (tilesGrid.drawEvent(ctx, event, 0, 0, 1)) {
                        hasImage = true;
                    }
                }
                return {
                    type: 'events',
                    content: 'events',
                    image: hasImage ? ctx.getImageData(0, 0, sizeX, sizeY) : null,
                    events: value
                };

            default:
                if (value >= tileIndex.getLength()) {
                    return false;
                }
                return {
                    entity: tileIndex,
                    index: value,
                    animation: tileIndex.getEntityPropValue(value, 'animation'),
                    props: tileIndex.getEntityPropValue(value, 'props'),
                    content: 'elem',
                    type: 'Tile'
                };
        }
    }

    const cells = selection.getCells();
    const type = selection.getType();
    let index;
    if (type === 'brush') {
        if (!brushIndex.hasIndex(selection.index)) {
            return false;
        }
    }
    let image;

    const canvas = getCanvasForIndexMatrix(tileIndex, cells, 20);
    const ctx = canvas.getContext('2d');
    image = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
        type,
        content: 'dim',
        index,
        name: selection.getName(),
        image,
        width,
        height,
        cells
    }

}

function ActiveTile({tileIndex, aliasIndex, brushIndex, eventIndex, editTile, editAlias, editBrush, tilesGrid}) {
    const eContext = useContext(EditorContext);

    const AddEventModal = useModal();

    const selection = useSelectionProps({aliasIndex, tileIndex, brushIndex, tilesGrid});
    const SaveAsBrushModal = useModal();

    const [active, setActive] = useState(null);

    const avail = selection && selection.content === 'dim' ? 150 : 80;
    const zoomOrAvail = useMemo(() => {
        return {
            width: avail,
            height: avail
        };
    }, [avail]);

    if (selection === false) {
        requestAnimationFrame(() => {
            eContext.setSelection(new CellSelection('rect', [[0]]));
        });
        return '';
    }

    let editAction;

    const editSelection = () => {
        const index = selection.index;
        editAction(index);
    };

    const clearSelection = () => {
        eContext.setSelection(new CellSelection('rect', [[0]]));
    };

    const saveAsBrush = () => {
        SaveAsBrushModal.open({
            name: '',
            tiles: selection.cells,
            isValid: name => !brushIndex.hasPropValue('value', name),
            save: (name, tiles) => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = brushIndex.setEntityObject(
                            {value: name, tiles}
                        );
                    },
                    () => {
                        brushIndex.deleteEntity(index);
                    }
                );
                eContext.setSelection(new BrushSelection(brushIndex, index));
                SaveAsBrushModal.close()
            }
        });
    };

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
            base: index => !selection.events.includes(eventIndex.getEntityValue(index)),
            select:
                index => {
                    AddEventModal.close();
                    const event = eventIndex.getEntityValue(index);
                    selection.events.push(event);
                    eContext.setSelection(new EventSelection(selection.events));
                }
        });
    };

    let content;
    let brushAction = false;
    switch(selection.content) {
        case 'events':
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
                                eContext.setSelection(new EventSelection(events));
                            }}
                            new={addEvent}
                            getName={value => value}
                            getProperties={null}
                            items={selection.events}
                        />
                    </Content>
                </FullProp>;
            break;

        case 'dim':
            const name = selection.name;
            brushAction = selection.type !== 'brush';
            if (selection.type === 'brush') {
                editAction = editBrush;
            }
            content = <>
                {name && <ValueProp name="Name:">{name}</ValueProp>}
                <ValueProp name="Size:"><kbd>{selection.width}<kbd className="less">x</kbd>{selection.height}</kbd></ValueProp>
            </>;
            break;

        case 'elem':
            switch(selection.type) {
                case 'Alias':
                    editAction = editAlias;
                    break;
                case 'Tile':
                    editAction = editTile;
                    break;
            }
            content = <>
                {
                    selection.name ?
                        <ValueProp name="Name:">
                            {selection.name}
                        </ValueProp> :
                        <ValueProp name="Index:">
                            <kbd>{selection.index}</kbd>
                        </ValueProp>
                }
                {
                    selection.tile !== undefined &&
                    <ValueProp name="Tile:">
                        <kbd>{selection.tile}</kbd>
                    </ValueProp>
                }
                <ValueProp name="Animation:">
                    {selection.animation}
                </ValueProp>

                <FullProp name="Properties:">
                    <TextArea wrap="off" rows={8} readOnly value={JSON.stringify(selection.props, null, 2)} />
                </FullProp>

            </>;
            break;
    }

    return (
        <Stack vertical border>
            <Toolbar>
                <Stack>
                    {editAction && <Button click={editSelection}>Edit</Button>}
                    {brushAction && <Button click={saveAsBrush}>Brush</Button>}
                    <Button click={clearSelection}>Clear</Button>
                </Stack>
            </Toolbar>

            <Content padded width="180" flex>
                <PropertyGrid>
                    <FullProp>
                        <Centered>
                            {
                                selection.entity ?
                                    <Entity
                                        entityIndex={selection.entity}
                                        value={selection.name ? selection.name : selection.index}
                                        player={selection.animation != ''}
                                        readOnly
                                        zoomOrAvail={zoomOrAvail}
                                    /> :
                                    (
                                        selection.image ?
                                        <Bitmap
                                            editable={false}
                                            value={selection.image}
                                            zoomOrAvail={zoomOrAvail}
                                        /> : <Content width={avail} height={avail} boxed thin></Content>
                                    )
                            }
                        </Centered>
                    </FullProp>
                    <ValueProp name="Type:">
                        {selection.type}
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

function ActiveTile2({tileIndex, brushIndex, editTile}) {
    const eContext = useContext(EditorContext);
    const SaveAsBrushModal = useModal();

    const selection = eContext.selection;
    const width = selection ? selection.getWidth() : 1;
    const height = selection ? selection.getHeight() : 1;
    const type = (width !== 1 || height !== 1) ? selection.getType() : 'cell';
    let index = null;
    if (type === 'cell') {
        index = selection ? selection.getRow(0)[0] : 0;
    }

    if (selection === null || selection.isBitmap()) {
        return <Content width={180}></Content>;
    }
    const selectionProvider = new TilesGrid(tileIndex, {map: selection.getCells()});

    const saveAsBrush = () => {
        SaveAsBrushModal.open({
            name: '',
            tiles: selection.getCells(),
            isValid: name => !brushIndex.hasPropValue('value', name),
            save: (name, tiles) => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = brushIndex.setEntityObject(
                            {value: name, tiles}
                        );
                    },
                    () => {
                        brushIndex.deleteEntity(index);
                    }
                );
                SaveAsBrushModal.close()
            }
        });
    };

    const zoom = 3;
    const dim = selectionProvider.getGridDim(width, height, 0, zoom);

    return (
        <Content width={180} padded>
            <div>Type: {type}</div>
            <Content padded>
                <Stack align="center" alignItems="center">
                    <Content boxed>
                        <Canvas
                            width={dim.width}
                            height={dim.height}
                            render={
                                ctx => selectionProvider.drawGrid(ctx, 0, 0, width, height, 0, zoom)
                            }
                        />
                    </Content>
                </Stack>
            </Content>
            <button disabled={width !== 1 || height !== 1} onClick={e => editTile(selection.getCell())}>Edit</button>
            {type === 'rect' && <button onClick={saveAsBrush}>Save as Brush</button>}
            <Content>Index: {index}</Content>
            <Content>Width: {width}</Content>
            <Content>Height: {height}</Content>

            <SaveAsBrushModal.content name="Save as Brush" fit closeable>
                <BrushForm {...SaveAsBrushModal.props} />
            </SaveAsBrushModal.content>
        </Content>
    );
}

function ActiveBrushPicker({brushIndex, editBrush}) {
    const eContext = useContext(EditorContext);

    const setActive = index => {
        // const brush = brushIndex.getEntityObject(index);
        eContext.setSelection(new BrushSelection(brushIndex, index));
        eContext.setRasterMode('map', 'startPath');
    };

    return (
        <EntityPicker
            zoom={2}
            border={1}
            entityIndex={brushIndex}
            doubleClick={editBrush}
            controls
            select={setActive}
        />
    )
}

function ActiveAliasPicker({tileIndex, aliasIndex, editAlias}) {
    const eContext = useContext(EditorContext);

    const select = index => {
        const name = aliasIndex.getEntityValue(index);
        eContext.setSelection(new CellSelection('rect', [[name]]));
        eContext.setRasterMode('map', 'startPath');
    };
    return (
        <EntityTextPicker
            filter
            entityIndex={aliasIndex}
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

function BrushForm({save, close, isValid, ...props}) {
    const [name, setName] = useState(props.name);
    const [tiles, setTiles] = useState(props.tiles);

    const canSave = name !== '' && isValid(name);

    const saveBrush = () => {
        save(name, tiles);
    };

    return (
        <SaveAndCancel canSave={canSave} padded save={saveBrush} close={close}>
            <PropertyGrid>
                <TextFieldProp name="Name:" value={name} set={setName} invalid={!canSave} />
                <PropLabel name="Tiles:">
                    Tiles go here...
                </PropLabel>
            </PropertyGrid>
        </SaveAndCancel>
    )
}

function AliasForm({save, close, isValid, alias, tileIndex}) {
    const TilePickerModal = useModal();

    const [name, setName] = useState(alias.value);
    const [tile, setTile] = useState(alias.tile);
    const [props, setProps] = useState(JSON.stringify(alias.props, null, 2));

    const avail = useMemo(() => {
        return {width: 100, height: 100}
    }, []);

    const saveAlias = () => {
        save({...alias, value: name, tile, props: JSON.parse(props)});
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

function BrushManager({brushIndex, editBrush}) {
    const eContext = useContext(EditorContext);

    const NewBrushModal = useModal();

    const actions = useAddIndexActions(brushIndex, ['delete']);

    const newBrush = () => {
        NewBrushModal.open({
            name: '',
            tiles: [[]], // TODO: we should get some tiles from a matrix here
            isValid: name => !brushIndex.hasPropValue('value', name),
            save: (name, tiles) => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = brushIndex.setEntityObject(
                            {value: name, tiles}
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

function AliasManager({aliasIndex, tileIndex, editAlias}) {
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
            alias: {
                tile: 0,
                value: '',
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
                        d('INSERT', tile);
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

function ActiveTilePicker({tileIndex, editTile, base = null}) {
    const eContext = useContext(EditorContext);
    return (
        <Stack fullHeight scroll border>
            <Content flex scroll>
                <EntityPicker
                    editorId="tilesPicker"
                    entityIndex={tileIndex}
                    base={base}
                    filter
                    doubleClick={index => editTile(index)}
                    select={
                        index => {
                            eContext.setSelection(new CellSelection('rect', [[index]]));
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
                    eContext.setSelection(new EventSelection(event));
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
                    <PositionPickerProp position={position} setPosition={setPosition} entity={entity} setEntity={setEntity} name="Insert:" entityIndex={tileIndex} />
                }
                <BitmapProp name="Image:" value={image} set={setImage} entityIndex={tileIndex} editable zoomOrAvail={zoomOrAvail} colors={colors} />
                <EntityProp entityIndex={animationIndex} reset player name="Animation:" value={animation} set={setAnimation} zoomOrAvail={zoomOrAvail} />
                <TextAreaProp name="Properties:" invalid={!isValidJson} cols={30} rows={10} value={props} set={setProps} />
            </PropertyGrid>
        </SaveAndCancel>
    )
}

function TilesMapEditor({model, resource, revert, cancel, play, tree, exportModel, saveModel}) {

    const eContext = useContext(EditorContext);

    const EditTileModal = useModal();
    const EditAliasModal = useModal();
    const EditBrushModal = useModal();
    const EditEventModal = useModal();

    useEffect(() => {
        eContext.setTracking({map: ['active', 'hover']});
    }, []);

    const tileIndex = useMemo(() => {
        return new TileIndex(model);
    }, []);

    const tilesGrid = useMemo(() => {
        return new TilesGrid(tileIndex, model);
    }, []);

    const aliasIndex = useMemo(() => {
        return new AliasIndex(model, tileIndex);
    }, []);

    const brushIndex = useMemo(() => {
        return new BrushIndex(model, tileIndex)
    }, []);

    const animationIndex = useMemo(() => {
        return new AnimationIndex(tileIndex, model)
    }, []);

    const eventIndex = useMemo(() => {
        return new EventIndex(model)
    }, []);

    const saveTilesPane = () => {
        saveModel(model)
    };
    const exportTilesPane = () => {
        exportModel(model);

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
            isValid: name => name === brush.value || !brushIndex.hasPropValue('value', name),
            save: (name, tiles) => {
                let lastIndex = index;
                tiles = brush.tiles;
                eContext.doAction(
                    () => {
                        lastIndex = brushIndex.setEntityObject({index: lastIndex, value: name, tiles}, true);
                    },
                    () => {
                        lastIndex = brushIndex.setEntityObject({...brush, index: lastIndex}, true);
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
    const trackerRef = useRef(null);
    return (
        <Page title="Edit TilesPane" resources={tree} cancel={cancel} play={play}>
            <Stack vertical fullHeight>
                <ActionFrame type="TilesPane: " name={resource.id + (eContext.hasStorePos() ? ' ' : '*')} fullHeight sub={{'from': tree[0].source, 'Resources': tree.length}} actions={frameActions}>
                    <Stack vertical>
                        <Stack flex fullHeight>
                            <Section name="Selected" collapse vertical>
                                <ActiveTile editTile={editTile} tileIndex={tileIndex} aliasIndex={aliasIndex} brushIndex={brushIndex} eventIndex={eventIndex} editAlias={editAlias} editBrush={editBrush} tilesGrid={tilesGrid} />
                            </Section>

                            <Section name="Map" flex>
                                <BasicRasterView undoRedo={false} tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={tilesGrid} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                            </Section>
                            <Section name="Cursor" collapse vertical>
                                <Content padded>
                                    <TileTracker editorId="hover" tilesGrid={tilesGrid} tileIndex={tileIndex} />
                                </Content>
                            </Section>
                        </Stack>

                        <Section name="Elements" height={400} collapse>
                            <SideTabs>

                                <SideTab name="Tiles" active>
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveTilePicker tileIndex={tileIndex} editTile={editTile} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <TilesManager tileIndex={tileIndex} animationIndex={animationIndex} editTile={editTile} editorId="tileManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Aliases">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveAliasPicker aliasIndex={aliasIndex} tileIndex={tileIndex} editAlias={editAlias} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <AliasManager aliasIndex={aliasIndex} tileIndex={tileIndex} editAlias={editAlias} editorId="aliasManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Brushes">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveBrushPicker brushIndex={brushIndex} editBrush={editBrush} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <BrushManager brushIndex={brushIndex} editBrush={editBrush} editorId="brushManager" />
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
                                        <SideTab name="Pick" active>
                                            <ActiveTilePicker tileIndex={tileIndex} base={index => tileIndex.getEntityPropValue(index, 'animation') !== ''} editTile={editTile} />
                                        </SideTab>
                                        <SideTab name="Manage">
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
        </Page>
    );
}

export default TilesMapEditor;