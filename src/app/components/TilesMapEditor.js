import React, {useContext, useEffect, useMemo, useRef, useState} from "react";

import {d, Stack, SwitchButton, Checkbox, Section, Tabs, Tab, Int, Modal, closeModals} from './BaseComponents';
import {EditorCtx, BasicRasterView, BaseCellProviderIndexRaster, EditorContext, CellProviderRaster, useMountedReadyCellProvider, BitmapEditor, useEditorContextPart} from './Raster';
import {CellSelection, TilesCellProvider, TilesMapCellProvider, MapSelectionCellProvider, MapValueCellProvider} from '../classes/CellProvider.js';
import ReactDOM from "react-dom";

function TileTracker(props) {
    const eContext = useEditorContextPart(props.editorId);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);

    const style = {
        width: 180
    };
    eContext.setTracker(props.editorId, (x, y) => {
        setTrackX(x);
        setTrackY(y);
    });

    if (trackX === null || !props.cellProvider.hasData()) {
        return <div style={style}></div>;
    }
    const selection = props.cellProvider.getRawSelection(trackX, trackY, 1, 1);
    const tile = selection.getRow(0)[0];
    const index = Array.isArray(tile) ? tile[0] : tile;
    const selectionProvider = new MapSelectionCellProvider(props.cellProvider, selection);
    return (
        <div style={style}>
            <div className="stack-h centered padded">
                <div className="boxed min-content">
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
                </div>
            </div>
            <div>Position: <kbd>{trackX}x{trackY}</kbd></div>
            <div>Tile: <kbd>{index}</kbd></div>
        </div>
    );
}

function ActiveTile(props) {
    const eContext = useContext(EditorContext);
    const selection = eContext.selection;
    const style = {width: 180};
    const width = selection ? selection.getWidth() : 1;
    const height = selection ? selection.getHeight() : 1;
    const type = (width !== 1 || height !== 1) ? selection.getType() : 'cell';
    let index = null;
    if (type === 'cell') {
        index = selection ? selection.getRow(0)[0] : 0;
    }

    if (selection === null || !props.cellProvider.hasData()) {
        return <div style={style}></div>;
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
            closeModals();
        };
        ReactDOM.render(
            <Modal name="Edit" closeable>
                <div style={{height: 600}}>
                    <BitmapEditor
                        resize={false}
                        zoom="5"
                        border="1"
                        cancelHandler={() => {closeModals()}}
                        saveHandler={save}
                        bitmap={props.cellProvider.getBitmapForValue(index, 1, false).toDataURL('image/png')} />
                </div>
            </Modal>,
            document.getElementById('modals-container')
        );
    };
    return (
        <div style={style}>
            <div>Type: {type}</div>
            <div className="stack-h centered padded">
                <div className="boxed min-content">
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
                </div>
            </div>
            <button disabled={width !== 1 || height !== 1} onClick={editTile}>Edit</button>
            <div>Index: {index}</div>
            <div>Width: {width}</div>
            <div>Height: {height}</div>
        </div>
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
                <Stack dir="x">
                    <div className="padded">
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
                    </div>
                    <div className="padded"><kbd>{alias}</kbd><br />Index: <kbd>{index}</kbd></div>
                </Stack>
            </div>
        );
    }
    return (
        <div className="padded">
            <Stack dir="x" wrap>{selection}</Stack>
        </div>
    );
}


// TODO as Hook!
class ActiveTileSelection extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            ready: false,
            rulers: true,
            zoom: props.zoom || 2
        };
        this.tilesRef = React.createRef();
        this.setRulers = this.setRulers.bind(this);
    }

    setRulers(rulers) {
        this.setState({rulers});
        this.tilesRef.current.setState({rulers});
    }

    componentDidMount() {
        this._isMounted = true;
        this.props.cellProvider.load(() => {
            if (this._isMounted) {
                this.setState({ready: true});
            }
        });
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    render() {
        if (!this.state.ready) return <div></div>;

        const setZoom = (zoom) => {
            this.setState({zoom});
            this.tilesRef.current.setState({zoom});
            this.tilesRef.current.updateDims({});
        };

        return (
            <Stack dir="x" full border>
                <div className="padded">
                    <div>Tiles: {this.props.cellProvider.getMaxIndex()}</div>
                    <div><Int min={1} max={4} value={this.state.zoom} set={setZoom} buttons /></div>
                    <div><Checkbox value={this.state.rulers} set={this.setRulers} name="Rulers" /></div>
                    <div><button>Import</button></div>
                    <div><button>Export</button></div>
                </div>
                <div className="flex">
                    <BaseCellProviderIndexRaster
                        auto width={10} height={5} mapProvider={this.props.mapProvider} cellProvider={this.props.cellProvider} editorId="tiles"
                    />
                </div>
                <div className="padded">
                    <div className="padded">
                        <SwitchButton enabled={true}>All</SwitchButton>
                    </div>
                    <div className="padded">
                        <SwitchButton enabled={false}>Most used</SwitchButton>
                    </div>
                    <div className="padded">
                        <SwitchButton enabled={false}>Last used</SwitchButton>
                    </div>
                </div>
            </Stack>
        );
    }
}
ActiveTileSelection._isMounted = false;

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
        <Stack dir="y" full>
            <EditorCtx tracking={{
                map: ['active', 'hover']
            }}>
                <Stack dir="x" full>
                    <Section name="Selected" collapse="h">
                        <div className="padded">
                            <ActiveTile cellProvider={cellProvider} indexProvider={indexProvider} />
                        </div>
                    </Section>

                    <Section name="Map" flex>
                        <BasicRasterView tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={cellProvider} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                    </Section>

                    <Section name="Cursor" collapse="h">
                        <div className="padded">
                            <TileTracker editorId="hover" cellProvider={cellProvider} />
                        </div>
                    </Section>
                </Stack>

                <Section name="Elements" collapse="v" raw>
                    <Tabs height={280} reverse active={0}>
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