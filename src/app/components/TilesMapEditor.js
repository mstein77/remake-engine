import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import ReactDOM from "react-dom";

import {CssContext, Modal, Stack, SwitchButton, Checkbox, Section, Tabs, Tab, Int, closeModals} from './BaseComponents';
import {Raster, EditorCtx, BasicRasterView, BaseCellProviderIndexRaster} from './Raster';
import {CellSelection, BitmapCellProvider, TilesCellProvider, TilesMapCellProvider} from '../classes/CellProvider.js';

function TileTracker(props) {
    const context = useContext(CssContext);

    const style = {
        width: 180
    };
    if (props.x === null) {
        return <div style={style}></div>;
    }

    const selection = props.cellProvider.getRawSelection(props.x, props.y, 1, 1);
    const tile = selection.getRow(0)[0];
    const index = Array.isArray(tile) ? tile[0] : tile;
    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
    const img = props.cellProvider.getBitmapForValue(index, 5, false, bgColor);
    let src = '';
    if (img !== null) {
        src = img.toDataURL('image/png');
    }

    return (
        <div style={style}>
            <div className="align-center checkboard-bg padded">
                <img className="boxed" src={src} />
            </div>
            <div>Position: <kbd>{props.x}x{props.y}</kbd></div>
            <div>Tile: <kbd>{index}</kbd></div>
        </div>
    );
}

function ActiveTile(props) {

    const [refresh, setRefresh] = useState(0);
    const context = useContext(CssContext);

    const style = {width: 180};
    const width = props.selection ? props.selection.getWidth() : 1;
    const height = props.selection ? props.selection.getHeight() : 1;
    const type = (width !== 1 || height !== 1) ? props.selection.getType() : 'cell';
    let index = null;
    if (type === 'cell') {
        index = props.selection ? props.selection.getRow(0)[0] : 0;
    }
    let img = null;
    if (index !== null) {
        const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
        img = props.cellProvider.getBitmapForValue(index, 5, false, bgColor);
    }
    let src = '';
    if (img !== null) {
        src = img.toDataURL('image/png');
    }

    const editTile = () => {

        const save = (provider) => {
            const raster = props.raster.current;
            const indexRef = props.index.current;
            const doImage = provider.getImageData();
            const actionIndex = index;
            const undoImage = props.cellProvider.getImageDataForValue(actionIndex);
            raster.doAction(() => {
                props.cellProvider.setBitmapForValue(actionIndex, doImage);
                raster.redrawCanvas();
                setRefresh(refresh + 1);
                indexRef.setBitmapForTile(actionIndex, doImage);
            }, () => {
                props.cellProvider.setBitmapForValue(actionIndex, undoImage);
                raster.redrawCanvas();
                setRefresh(refresh + 1);
                indexRef.setBitmapForTile(actionIndex, undoImage);
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

    return <div style={style}>
        <div>Type: {type}</div>
        <div className="align-center checkboard-bg padded">
            <img className="boxed" src={src} />
        </div>
        <button disabled={img === null} onClick={editTile}>Edit</button>
        <div>Index: {index}</div>
        <div>Width: {width}</div>
        <div>Height: {height}</div>
    </div>;
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

        const selector = (selection) => {
            this.props.raster.current.setSelection(selection);
        };

        const setZoom = (zoom) => {
            this.setState({zoom});
            this.tilesRef.current.setState({zoom});
            this.tilesRef.current.updateDims({});
        };

        // <Raster ref={this.tilesRef} markerMode="pick" selector={selector} rulers={this.state.rulers} cellProvider={this.props.cellProvider} zoom={this.state.zoom} border={1} toolbars={false} />

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
                        auto width={10} height={5} cellProvider={this.props.cellProvider} editorId="test"
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
    const indexRef = useRef(null);

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


    const tracker = (trackX, trackY, width, height) => {
        setTrackX(trackX);
        setTrackY(trackY);
    };

    const selector = (selection) => {
        setSelection(selection);
    };

    return (
        <Stack dir="y" full>
            <Stack dir="x" full>
                <Section name="Selected" collapse="h">
                    <div className="padded">
                        <ActiveTile index={indexRef} raster={rasterRef} selection={selection} cellProvider={cellProvider} />
                    </div>
                </Section>

                <Section name="Map" flex>
                    <Raster ref={rasterRef} shift markerMode="pick" selector={selector} tracker={tracker} maxZoom={9} border={0} zoom={1} cellProvider={cellProvider} />
                </Section>

                <Section name="Cursor" collapse="h">
                    <div className="padded">
                        <TileTracker x={trackX} y={trackY} cellProvider={cellProvider} />
                    </div>
                </Section>
            </Stack>

            <EditorCtx>
            <Section name="Elements" collapse="v" raw>
                <Tabs height={280} reverse active={0}>
                    <Tab name="Test">
                        <BasicRasterView editorId="bell" auto mode="pick" cellProvider={cellProvider} width={5} height={5} posX={0} posY={7} border={0} zoom={1} />
                    </Tab>
                    <Tab name="Tiles">
                        <ActiveTileSelection ref={indexRef} raster={rasterRef} cellProvider={indexProvider} />
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