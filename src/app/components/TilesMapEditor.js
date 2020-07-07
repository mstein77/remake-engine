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
    useModal
} from './BaseComponents';
import {EditorCtx, BasicRasterView, BaseCellProviderIndexRaster, EditorContext, CellProviderRaster, useMountedReadyCellProvider, BitmapEditor, useEditorContextPart} from './Raster';
import {CellSelection, TilesCellProvider, TilesMapCellProvider, MapSelectionCellProvider, MapValueCellProvider} from '../classes/CellProvider.js';
import {d} from '../helper/helper';

function TileTracker(props) {
    const eContext = useEditorContextPart(props.editorId);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);

    const width = 180;
    eContext.setTracker(props.editorId, (x, y) => {
        setTrackX(x);
        setTrackY(y);
    });

    let content = '';
    if (trackX !== null && props.cellProvider.hasData()) {
        const selection = props.cellProvider.getRawSelection(trackX, trackY, 1, 1);
        const tile = selection.getRow(0)[0];
        const index = Array.isArray(tile) ? tile[0] : tile;
        const selectionProvider = new MapSelectionCellProvider(props.cellProvider, selection);
        content = (
            <Fragment>
                <Stack align="center" alignItems="center">
                    <Content boxed className="min-content">
                        <CellProviderRaster
                            cellProvider={selectionProvider}
                            editorId="hovered"
                            zoom={4}
                            posX={0}
                            posY={0}
                            width={selection.getWidth()}
                            height={selection.getHeight()}
                            border={0}
                            renderOptions={{events: true, caching: false}}
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

function ActiveTile(props) {
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

    if (selection === null || !props.cellProvider.hasData()) {
        return <Content width={180}></Content>;
    }
    const selectionProvider = new MapSelectionCellProvider(props.cellProvider, selection);

    const editTile = () => {
        const index = selection.getCell();
        const save = (provider) => {
            const doImage = provider.getImageData();
            const actionIndex = props.cellProvider.getIndexForValue(index);
            const undoImage = props.cellProvider.getImageDataForValue(actionIndex);
            eContext.doAction(() => {
                props.cellProvider.setBitmapForValue(actionIndex, doImage);
                props.indexProvider.setBitmapForValue(actionIndex, doImage);
                eContext.updateRaster();
            }, () => {
                props.cellProvider.setBitmapForValue(actionIndex, undoImage);
                props.indexProvider.setBitmapForValue(actionIndex, undoImage);
                eContext.updateRaster();
            });
            EditModal.hide();
        };
        const bitmap = props.cellProvider.getBitmapForValue(index, 1, false).toDataURL('image/png');
        EditModal.show({save, bitmap});
    };
    return (
        <Content width={180} padded>
            <div>Type: {type}</div>
            <Content padded>
                <Stack align="center" alignItems="center">
                    <Content boxed>
                        <CellProviderRaster
                            cellProvider={selectionProvider}
                            editorId="active"
                            zoom={4}
                            posX={0}
                            posY={0}
                            width={selection.getWidth()}
                            height={selection.getHeight()}
                            border={0}
                            renderOptions={{events: false, caching: false}}
                        />
                    </Content>
                </Stack>
            </Content>
            <button disabled={width !== 1 || height !== 1} onClick={editTile}>Edit</button>
            <Content>Index: {index}</Content>
            <Content>Width: {width}</Content>
            <Content>Height: {height}</Content>
            <EditModal.render name="Edit" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="5"
                    border="1"
                    cancelHandler={EditModal.hide}
                    saveHandler={EditModal.params.save}
                    bitmap={EditModal.params.bitmap} />
            </EditModal.render>
        </Content>
    );
}

function ActiveAliasSelection(props) {
    const eContext = useContext(EditorContext);
    const ready = useMountedReadyCellProvider(props.cellProvider);
    const aliases = props.cellProvider.getAliases();
    const selection = [];

    if (!ready) {
        return '';
    }

    const setActive = (name) => {
        eContext.setSelection(new CellSelection('rect', [[name]]));
        eContext.setRasterMode('map', 'startPath');
    };

    for (let alias of aliases) {
        const index = props.cellProvider.getIndexForTile(alias);
        const selectionProvider = new MapValueCellProvider(props.cellProvider, index);
        selection.push(
            <div key={alias} className="thin-boxed" onClick={(e) => {
                setActive(alias);
                e.preventDefault();
                e.stopPropagation();
            }}>
                <Stack>
                    <Content padded>
                        <CellProviderRaster
                            cellProvider={selectionProvider}
                            zoom={2}
                            posX={0}
                            posY={0}
                            width={1}
                            height={1}
                            border={1}
                            renderOptions={{events: false, caching: false}}
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

function ActiveTileSelection(props) {
    const [rulers, setRulers] = useState(true);
    const [zoom, setZoom] = useState(props.zoom || 1);
    const ready = useMountedReadyCellProvider(props.cellProvider);
    if (!ready) {
        return '';
    }
    return (
        <Stack fullHeight scroll border>
            <Content padded>
                <Content>Tiles: {props.cellProvider.getMaxIndex()}</Content>
                <Content><Int min={1} max={4} value={zoom} set={setZoom} buttons /></Content>
                <Content><Checkbox value={rulers} set={setRulers} name="Rulers" /></Content>
                <Content><button>Import</button></Content>
                <Content><button>Export</button></Content>
            </Content>

            <Content flex scroll>
                <BaseCellProviderIndexRaster
                    auto width={10} height={5} mapProvider={props.mapProvider} cellProvider={props.cellProvider} editorId="tiles"
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
        </Stack>
    );
}

function TilesMapEditor(props) {

    const tilesImage = useMemo(() => {
        return props.tilesMap.tilesImg.elem.toDataURL('image/png');
    }, []);

    const indexProvider = useMemo(() => {
        return new TilesCellProvider(
            props.tilesMap.tileSize,
            tilesImage
        );
    }, []);

    const cellProvider = useMemo(() => {

        const cellProvider =
            new TilesMapCellProvider(
                props.tilesMap.tileSize,
                tilesImage,
                props.tilesMap.tiles,
                props.tilesMap.getAnimations(),
                props.tilesMap.getMap()
            );

        return cellProvider;
    }, []);

    const trackerRef = useRef(null);
    return (
        <Stack vertical>
            <EditorCtx tracking={{
                map: ['active', 'hover']
            }}>
                <Stack flex fullHeight>
                    <Section name="Selected" collapse vertical>
                        <ActiveTile cellProvider={cellProvider} indexProvider={indexProvider} />
                    </Section>

                    <Section name="Map" flex>
                        <BasicRasterView tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={cellProvider} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                    </Section>

                    <Section name="Cursor" collapse vertical>
                        <Content padded>
                            <TileTracker editorId="hover" cellProvider={cellProvider} />
                        </Content>
                    </Section>
                </Stack>

                <Section name="Elements" height={350} collapse raw>
                    <Tabs reverse active={0}>
                        <Tab name="Tiles">
                            <ActiveTileSelection mapProvider={cellProvider} cellProvider={indexProvider} />
                        </Tab>
                        <Tab name="Aliases">
                            <ActiveAliasSelection indexProvider={indexProvider} cellProvider={cellProvider} />
                        </Tab>
                        <Tab name="Brushes">
                            Brush selection here...
                        </Tab>
                        <Tab name="Events">
                            Event selection here...
                        </Tab>
                    </Tabs>
                </Section>
            </EditorCtx>
        </Stack>
    );
}

export default TilesMapEditor;