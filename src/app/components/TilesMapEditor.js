import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import ReactDOM from "react-dom";

import {d, useMounted, CssContext, Modal, Stack, SwitchButton, Checkbox, Section, Tabs, Tab, Int, closeModals} from './BaseComponents';
import {Raster, EditorCtx, BasicRasterView, BaseCellProviderIndexRaster, EditorContext, CellProviderRaster} from './Raster';
import {CellSelection, BitmapCellProvider, TilesCellProvider, TilesMapCellProvider, MapSelectionCellProvider} from '../classes/CellProvider.js';


function TileTracker(props) {
    const context = useContext(CssContext);
    const mounted = useMounted();
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);

    const style = {
        width: 180
    };
    props.trackerRef.current = (x, y) => {
        if (mounted.current) {
            setTrackX(x);
            setTrackY(y);
        }
    };
/*
    useEffect(() => {
        return () => {
            props.trackerRef.current = null;
        }
    });

 */

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
                        editorId="hover"
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
    const [refresh, setRefresh] = useState(0);

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

    const editTile = () => {};
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
    const [isReady, setIsReady] = useState(false);
    const context = useContext(CssContext);
    const mounted = useRef(false);
    const aliases = props.cellProvider.getAliases();
    const selection = [];
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false
        }
    }, []);

    if (!isReady) {
        props.cellProvider.load(() => {
            if (mounted.current) {
                setIsReady(true);
            }
        });
        return '';
    }

    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');

    const setActive = (name) => {
        props.raster.current.setSelection(new CellSelection('rect', [[name]]));
    };

    for (let alias of aliases) {
        const index = props.cellProvider.getIndexForTile(alias);
        let imgData = props.cellProvider.getBitmapForValue(index, 2, false, bgColor).toDataURL('image/png');
        selection.push(
            <div key={alias} className="thin-boxed" onClick={(e) => {
                setActive(alias);
                e.preventDefault();
                e.stopPropagation();
            }}>
                <Stack dir="x">
                    <div className="padded checkboard-bg">
                        <img className="thin-boxed" src={imgData} />
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
        this.tilesRef.current.redrawCanvas();
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

    setBitmapForTile(index, bitmap) {
        if (this.tilesRef.current) {
            this.props.cellProvider.setBitmapForValue(index, bitmap);
            this.tilesRef.current.redrawCanvas();
        }
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

function BitmapEditor(props) {

    const cellProvider = useMemo(() => {
        return new BitmapCellProvider(4,
            props.bitmap
        );
    }, []);

    const buttons = [];
    if (props.saveHandler) {
        buttons.push(
            <button key="save" onClick={() => {
                props.saveHandler(cellProvider);
            }}>Save</button>
        );
    }
    if (props.cancelHandler) {
        buttons.push(
            <button key="cancel" onClick={() => {
                props.cancelHandler();
            }}>Cancel</button>
        );
    }
    const buttonDiv = buttons.length === 0 ?
        '' :
        <div className="padded">
            {buttons}
        </div>;

    const zoom = props.zoom ? parseInt(props.zoom, 10) : 1;
    const border = props.border ? parseInt(props.border, 10) : 0;
    const resize = props.resize !== undefined ? props.resize : true;

    return (
        <Stack dir="y" border full>
            <Stack dir="x" border full>
                <div className="">Palette goes here</div>
                <div className="flex full-v">
                    <Raster markerMode="pick" shift resize={resize} maxZoom={9} border={border} zoom={zoom} cellProvider={cellProvider} />
                </div>
            </Stack>
            {buttonDiv}
        </Stack>
    )
}

function TilesMapEditor(props) {

    const [selection, setSelection] = useState(null);
    const [trackX, setTrackX] = useState(null);
    const [trackY, setTrackY] = useState(null);
    const rasterRef = useRef(null);

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
//
    // <Raster ref={rasterRef} shift markerMode="pick" selector={selector} tracker={tracker} maxZoom={9} border={0} zoom={1} cellProvider={cellProvider} />
    return (
        <Stack dir="y" full>
            <EditorCtx>
                <Stack dir="x" full>
                    <Section name="Selected" collapse="h">
                        <div className="padded">
                            <ActiveTile selection={selection} cellProvider={cellProvider} />
                        </div>
                    </Section>

                    <Section name="Map" flex>
                        <BasicRasterView tracker={trackerRef} editorId="map" resizeable auto mode="pick" cellProvider={cellProvider} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                    </Section>

                    <Section name="Cursor" collapse="h">
                        <div className="padded">
                            <TileTracker trackerRef={trackerRef} x={trackX} y={trackY} cellProvider={cellProvider} />
                        </div>
                    </Section>
                </Stack>

                <Section name="Elements" collapse="v" raw>
                    <Tabs height={280} reverse active={0}>
                        <Tab name="Tiles">
                            <ActiveTileSelection mapProvider={cellProvider} raster={rasterRef} cellProvider={indexProvider} />
                        </Tab>
                        <Tab name="Aliases">
                            <ActiveAliasSelection raster={rasterRef} indexProvider={indexProvider} cellProvider={cellProvider} />
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