import React, {useContext, useEffect, useMemo, useRef, useState, Fragment} from "react";
import {
    Stack,
    SwitchButton,
    Checkbox,
    Section,
    Tabs,
    Tab,
    Int,
    Content,
    Canvas,
    IndexPicker,
    IndexController,
    useModal, Page, ActionFrame
} from './BaseComponents';
import {EditorCtx, BasicRasterView, BaseCellProviderIndexRaster, EditorContext, CellProviderRaster, useMountedReadyCellProvider, BitmapEditor, useEditorContextPart} from './Raster';
import {CellSelection, TilesCellProvider, TilesMapCellProvider, MapSelectionCellProvider, MapValueCellProvider} from '../classes/CellProvider.js';
import {d} from '../helper/helper';
import {TileIndex} from "../classes/IndexProvider";
import {IndexGrid, TilesGrid} from "../classes/Grid";

function TileTracker({editorId, indexProvider, gridProvider}) {
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
        const selection = gridProvider.getRawSelection(trackX, trackY, 1, 1);
        const tile = selection.getRow(0)[0];
        const index = Array.isArray(tile) ? tile[0] : tile;

        const selectionProvider = new IndexGrid(indexProvider, {map: selection.getCells()});
        const zoom = 4;
        const dim = selectionProvider.getGridDim(1, 1, 0, zoom);

        content = (
            <Fragment>
                <Stack align="center" alignItems="center">
                    <Content boxed  className="min-content">
                        <Canvas width={dim.width} height={dim.height}
                                render={ctx => gridProvider.drawCellValue(ctx, tile, 0, 0, zoom)}
                        />
                    </Content>
                </Stack>
                <Content>Position: <kbd>{trackX}x{trackY}</kbd></Content>
                <Content>Tile: <kbd>{index}</kbd></Content>
            </Fragment>
        );
    }
    return <Content width={width}>{content}</Content>;
}

function ActiveTile({indexProvider}) {

    const eContext = useContext(EditorContext);
    const EditModal = useModal();
    const selection = eContext.selection;
    const width = selection ? selection.getWidth() : 1;
    const height = selection ? selection.getHeight() : 1;
    const type = (width !== 1 || height !== 1) ? selection.getType() : 'cell';
    let index = null;
    if (type === 'cell') {
        index = selection ? selection.getRow(0)[0] : 0;
    }

    if (selection === null) {
        return <Content width={180}></Content>;
    }
    const selectionProvider = new TilesGrid(indexProvider, {map: selection.getCells()});

    const editTile = () => {
        const index = selection.getCell();
        const image = indexProvider.getIndex(index);
        EditModal.show({
            save: provider => {
                const doImage = provider.getImageData();
                const undoImage = image;
                eContext.doAction(() => {
                    indexProvider.setIndex(index, doImage);
                }, () => {
                    indexProvider.setIndex(index, undoImage);
                });
                EditModal.hide();
            },
            image
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
            <button disabled={width !== 1 || height !== 1} onClick={editTile}>Edit</button>
            <Content>Index: {index}</Content>
            <Content>Width: {width}</Content>
            <Content>Height: {height}</Content>
            <EditModal.render name="Edit" height={600} closeable>
                <EditorCtx>
                    <BitmapEditor
                        resize={false}
                        zoom="5"
                        border="1"
                        cancelHandler={EditModal.hide}
                        {...EditModal.params}
                    />
                </EditorCtx>
            </EditModal.render>
        </Content>
    );
}

function ActiveAliasSelection({gridProvider, indexProvider}) {
    const eContext = useContext(EditorContext);
    const aliases = gridProvider.getAliases();
    const selection = [];

    const setActive = name => {
        eContext.setSelection(new CellSelection('rect', [[name]]));
        eContext.setRasterMode('map', 'startPath');
    };

    const zoom = 2;
    for (let alias of aliases) {
        const index = gridProvider.getIndexForTile(alias);
        const selectionProvider = new IndexGrid(indexProvider, {map: [[index]]});
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

function TilesController({indexProvider}) {
    return <IndexController indexProvider={indexProvider} titleHeight={20} minWidth={50} />;
}

function ActiveTileSelection({indexProvider, defaults = {}}) {
    const eContext = useContext(EditorContext);
    const ControllerModal = useModal();
    const [rulers, setRulers] = useState(true);
    const [zoom, setZoom] = useState(defaults.zoom || 1);

    return (
        <Stack fullHeight scroll border>
            <Content padded>
                <Content>Tiles: {indexProvider.getLength()}</Content>
                <Content><Int min={1} max={4} value={zoom} set={setZoom} buttons /></Content>
                <Content><Checkbox value={rulers} set={setRulers} name="Rulers" /></Content>
                <Content><button onClick={() => ControllerModal.show()}>Manage...</button></Content>
            </Content>

            <Content flex scroll>
                <IndexPicker
                    editorId="tilesPicker"
                    indexProvider={indexProvider}
                    select={
                        index => {
                            eContext.setSelection(new CellSelection('rect', [[index]]));
                            eContext.setRasterMode('map', 'startPath');
                        }
                    }
                    controls
                    defaults={{zoom}}
                />
            </Content>

            <Content padded>
                <Content padded>
                    <SwitchButton enabled={true}>All</SwitchButton>
                </Content>
                <Content padded>
                    <SwitchButton enabled={false}>Most used</SwitchButton>
                </Content>
                <Content padded>
                    <SwitchButton enabled={false}>Last used</SwitchButton>
                </Content>
            </Content>

            <ControllerModal.render name="Manage Tiles" {...ControllerModal.params} height={400} closeable fit>
                <TilesController editorId="tilesController" indexProvider={indexProvider} />
            </ControllerModal.render>
        </Stack>
    );
}

function TilesMapEditor({model, resource, revert, cancel, play, tree}) {

    const eContext = useContext(EditorContext);
    useEffect(() => {
        eContext.setTracking({map: ['active', 'hover']});
    }, []);

    const indexProvider = useMemo(() => {
        return new TileIndex(model);
    }, []);

    const cellProvider = useMemo(() => {
        return new TilesGrid(indexProvider, model);
    }, []);

    const saveTilesPane = () => {d('SAVE...')};
    const exportTilesPane = () => {d('EXPORT...')};
    const deployTilesPane = () => {d('DEPLOY...')};

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
                                <ActiveTile indexProvider={indexProvider} />
                            </Section>

                            <Section name="Map" flex>
                                <BasicRasterView undoRedo={false} tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={cellProvider} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                            </Section>
                            <Section name="Cursor" collapse vertical>
                                <Content padded>
                                    <TileTracker editorId="hover" gridProvider={cellProvider} indexProvider={indexProvider} />
                                </Content>
                            </Section>
                        </Stack>
                        <Section name="Elements" height={350} collapse raw>
                            <Tabs reverse active={0}>
                                <Tab name="Tiles">
                                    <ActiveTileSelection defaults={{zoom: 2}} indexProvider={indexProvider} />
                                </Tab>
                                <Tab name="Aliases">
                                    <ActiveAliasSelection indexProvider={indexProvider} gridProvider={cellProvider} />
                                </Tab>

                                <Tab name="Brushes">
                                    Brush picker and manager here...
                                </Tab>
                                <Tab name="Events">
                                    Event picker and manager here...
                                </Tab>
                                <Tab name="Animations">
                                    Animation picker and manager here...
                                </Tab>
                            </Tabs>
                        </Section>
                    </Stack>
                </ActionFrame>
            </Stack>
        </Page>
    );
}

export default TilesMapEditor;