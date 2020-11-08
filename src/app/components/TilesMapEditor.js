import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {
    Stack,
    Section,
    Content,
    Canvas,
    Title,
    PropertyGrid,
    TextFieldProp,
    IntProp,
    PropLabel,
    EntityPicker,
    FiltersSelector,
    EntityManager,
    useModal, Page, ActionFrame,
    SideTabs, SideTab, GlobalContext, useAddIndexActions
} from './BaseComponents';
import {
    EditorCtx,
    BasicRasterView,
    EditorContext,
    BitmapEditor,
    useEditorContextPart,
    BitmapSelector
} from './Raster';
import {CellSelection} from '../classes/CellProvider.js';
import {d, getColorsFromCanvas, getCanvasForBitmap, getEmptyImageData} from '../helper/helper';
import {TileIndex, ColorIndex, AliasIndex, BrushIndex} from "../classes/EntityIndex";
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

function ActiveTile({tileIndex, brushIndex, editTile}) {
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

function ActiveBrushPicker({brushIndex}) {
    const eContext = useContext(EditorContext);

    const setActive = index => {
        const brush = brushIndex.getEntityObject(index);
        eContext.setSelection(new CellSelection('rect', brush.tiles));
        eContext.setRasterMode('map', 'startPath');
    };

    return (
        <EntityPicker
            zoom={2}
            border={1}
            entityIndex={brushIndex}
            controls
            select={setActive}
        />
    )
}

function ActiveAliasPicker({tilesGrid, tileIndex}) {
    const eContext = useContext(EditorContext);
    const aliases = tilesGrid.getAliases();
    const selection = [];

    const setActive = name => {
        eContext.setSelection(new CellSelection('rect', [[name]]));
        eContext.setRasterMode('map', 'startPath');
    };

    const zoom = 2;
    for (let alias of aliases) {
        const index = tilesGrid.getIndexForTile(alias);
        const selectionProvider = new IndexGrid(tileIndex, {map: [[index]]});
        const dim = selectionProvider.getGridDim(1, 1, 0, zoom);
        selection.push(
            <div key={alias} className="thin-boxed" onClick={(e) => {
                setActive(alias);
                e.preventDefault();
                e.stopPropagation();
            }}>
                <Stack>
                    <Content padded>
                        <Canvas width={dim.width} height={dim.height}
                                render={ctx => selectionProvider.drawGrid(ctx, 0, 0, 1, 1, 0, zoom)}
                        />
                    </Content>
                    <Content padded>
                        <kbd>{alias}</kbd><br />Index: <kbd>{index}</kbd>
                    </Content>
                </Stack>
            </div>
        );
    }
    return (
        <div className="padded">
            <Stack wrap>{selection}</Stack>
        </div>
    );
}

function BrushForm({save, close, isValid, ...props}) {
    const [name, setName] = useState(props.name);
    const [tiles, setTiles] = useState(props.tiles);

    const canSave = () => name !== '' && isValid(name);

    return (
        <Stack vertical>
            <Content flex padded>
                <TextFieldProp name="Name:" value={name} set={setName} invalid={!canSave()} />
            </Content>

            <Content padded>
                <Stack>
                    <button disabled={!canSave()} onClick={() => save(name, tiles)}>Save</button>
                    <button onClick={() => close()}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    )
}

function AliasForm({save, close, isValid, tileIndex, ...props}) {
    const TilePickerModal = useModal();
    const [name, setName] = useState(props.name);
    const [tile, setTile] = useState(props.tile);

    const canSave = () => name !== '' && isValid(name);

    return (
        <>
            <Stack vertical border>
                <Content flex padded>
                    <PropertyGrid>
                        <TextFieldProp name="Name:" value={name} set={setName} invalid={!canSave()} />
                        <IntProp name="Index:" max={tileIndex.getLength() - 1} min={0} value={tile} buttons set={setTile} />
                        <PropLabel name="">
                            <Content align="center">
                                <Canvas width={tileIndex.getSizeX() * 2} height={tileIndex.getSizeY() * 2} render={ctx => {
                                    tileIndex.drawEntity(ctx, tile, 0, 0, 2);
                                }} />
                                <button onClick={e => TilePickerModal.open({})}>Pick</button>
                            </Content>
                        </PropLabel>
                    </PropertyGrid>
                </Content>
                <Content padded>
                    <Stack>
                        <button disabled={!canSave()} onClick={() => save(name, tile)}>Save</button>
                        <button onClick={() => close()}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
            <TilePickerModal.content name="Pick Tile" {...TilePickerModal.props} height={400} width={400} closeable>
                <EditorCtx>
                    <EntityPicker entityIndex={tileIndex} zoom={2} select={index => {setTile(index); TilePickerModal.close()}} />
                </EditorCtx>
            </TilePickerModal.content>
        </>
    )
}

function BrushManager({brushIndex}) {
    const eContext = useContext(EditorContext);
    const NewBrushModal = useModal();
    const EditBrushModal = useModal();

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

            <EditBrushModal.content name="Edit Brush" fit closeable>
                <BrushForm {...EditBrushModal.props} />
            </EditBrushModal.content>
        </>
    );
}

function AliasManager({aliasIndex, tileIndex}) {
    const eContext = useContext(EditorContext);
    const NewAliasModal = useModal();
    const EditAliasModal = useModal();

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
            tile: 0,
            name: '',
            isValid: value => !aliasIndex.hasPropValue('value', value),
            save: (name, tile) => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = aliasIndex.setEntityObject({value: name, tile});
                    },
                    () => {
                        aliasIndex.deleteEntity(index);
                    }
                );
                NewAliasModal.close();
            }
        });
    };

    const editAlias = index => {
        const obj = aliasIndex.getEntityObject(index);
        EditAliasModal.open({
            tileIndex,
            tile: obj.tile,
            name: obj.value,
            isValid: value => obj.value === value || !aliasIndex.hasPropValue('value', value),
            save: (name, tile) => {
                let lastIndex = index;
                eContext.doAction(
                    () => {
                        lastIndex = aliasIndex.setEntityObject({index: lastIndex, value: name, tile}, true);
                    },
                    () => {
                        lastIndex = aliasIndex.setEntityObject({...obj, index: lastIndex}, true);
                    }
                );
                EditAliasModal.close();
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

            <EditAliasModal.content name="Edit Alias" fit closeable>
                <AliasForm {...EditAliasModal.props} />
            </EditAliasModal.content>
        </>
    )
}

function TilesManager({tileIndex, editTile}) {
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
            save: provider => {
                const image = provider.getImageData();
                let index = null;
                eContext.doAction(
                    () => {
                        index = tileIndex.setEntityObject({value: null, image});
                    },
                    () => {
                        tileIndex.deleteEntity(index);
                    }
                );
                NewTileModal.close();
            },
            colors: getColorIndexFromTiles(),
            image: getEmptyImageData(tileIndex.getSizeX(), tileIndex.getSizeY())
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

            <NewTileModal.content name="New Tile" closeable>
                <EditorCtx>
                    <BitmapEditor {...NewTileModal.props} />
                </EditorCtx>
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

function ActiveTilePicker({tileIndex}) {
    const eContext = useContext(EditorContext);
    return (
        <Stack fullHeight scroll border>
            <Content flex scroll>
                <EntityPicker
                    editorId="tilesPicker"
                    entityIndex={tileIndex}
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

function TilesMapEditor({model, resource, revert, cancel, play, tree, exportModel, saveModel}) {

    const eContext = useContext(EditorContext);

    const EditTileModal = useModal();

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

    const saveTilesPane = () => {
        saveModel(model)
    };
    const exportTilesPane = () => {
        exportModel(model);

    };
    const deployTilesPane = () => {d('DEPLOY...')};

    const editTile = index => {
        const image = tileIndex.getEntityPropValue(index, 'image');
        EditTileModal.open({
            save: provider => {
                const editedTile = {index, value: index, image: provider.getImageData()};
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
            colors: new ColorIndex({colors: getColorsFromCanvas(tileIndex.img)}),
            image
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
                                <ActiveTile editTile={editTile} tileIndex={tileIndex} brushIndex={brushIndex} />
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
                                            <ActiveTilePicker defaults={{zoom: 2}} tileIndex={tileIndex} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <TilesManager tileIndex={tileIndex} editTile={editTile} editorId="tileManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>
                                <SideTab name="Aliases">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveAliasPicker tileIndex={tileIndex} tilesGrid={tilesGrid} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <AliasManager aliasIndex={aliasIndex} tileIndex={tileIndex} editorId="aliasManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>

                                <SideTab name="Brushes">
                                    <SideTabs>
                                        <SideTab name="Pick" active>
                                            <ActiveBrushPicker brushIndex={brushIndex} />
                                        </SideTab>
                                        <SideTab name="Manage">
                                            <BrushManager brushIndex={brushIndex} editorId="brushManager" />
                                        </SideTab>
                                    </SideTabs>
                                </SideTab>
                                <SideTab name="Events">
                                    Event picker and manager here...
                                </SideTab>
                                <SideTab name="Animations">
                                    Animation picker and manager here...
                                </SideTab>
                            </SideTabs>
                        </Section>
                    </Stack>
                </ActionFrame>
            </Stack>

            <EditTileModal.content name="Edit Tile" closeable>
                <EditorCtx>
                    <BitmapEditor {...EditTileModal.props} />
                </EditorCtx>
            </EditTileModal.content>
        </Page>
    );
}

export default TilesMapEditor;