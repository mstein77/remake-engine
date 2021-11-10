import React, {useContext, useMemo, useState, useRef, useEffect} from "react";
import { AnimationIndex, ColorIndex, FilterIndex, FrameIndex } from "../classes/EntityIndex";
import {
    EditorContext,
    EditorCtx,
    LoadingIndicator,
    ButtonStack,
    Canvas,
    CenterInfo,
    Kbd,
    OkCancelForm,
    PropertyGrid,
    Section,
    Toolbar,
    useModal,
    useUpdateOnEntityIndexChanges,
    WindowContext,
    AvailContextProvider,
    useMounted,
    useCssProps,
    useComponentUpdate, AvailContext
} from "./BasicComponents";
import {
    d,
    rgb2hex,
    getEmptyImageData,
    copy2clipboard,
    drawCanvasToAvail,
    getResourceTreeForJsonModel,
    getRebuildJsonForModel,
    getCanvasForBitmap,
    getImageDataForImage,
    getColorsFromImageData,
    BitmapPlayer
} from "../helper/helper";
import { FileDropZone, Button, AsyncButton, Color, ColorProp, CheckboxProp, RadioProp, Checkbox, ImageProp, InputProp, Number, NumberProp, Tuple, Hidden, TupleProp, LabelProp, TextArea } from "./FormComponents";
import { Block, Stack } from "./LayoutComponents";
import {EntityStack, EntityStackSections, EntityPicker, EntityManager} from "./EntityComponents";
import { FlexGrid, BaseGrid, PictureCell } from "./GridComponents";
import { BitmapGrid, CellValue } from "../classes/Grid";
import { BitmapCellProvider, CellSelection } from "../classes/CellProvider";
import { BackgroundControl, Icon } from "./BasicComponents";
import ReactDOM from "react-dom";

function ConfirmDialog({ close, save, msg }) {
    return (
        <OkCancelForm full="h" submit padded cancel={close} save={() => save()}>
            <Block full padded>
                <Stack full gaps>
                    <Block full="v">
                        <Block center="v">
                            <Icon size={30} name="warning" />
                        </Block>
                    </Block>
                    <CenterInfo>
                        {msg}
                    </CenterInfo>
                </Stack>
            </Block>
        </OkCancelForm>
    )
}

function useConfirmDialog() {
    const ConfirmModal = useModal();
    return {
        openConfirmModal: ({save, ...props}) => ConfirmModal.open({ ...props, save: () => {
            ConfirmModal.close();
            save()
            }}),
        Modals: () =>
            <ConfirmModal.content name="Please confirm" width={250}>
                <ConfirmDialog { ...ConfirmModal.props } />
            </ConfirmModal.content>
    }
}

function NameDialog({ close, save, max, reserved = [], ...props }) {
    const [name, setName] = useState(props.name || '');
    const matching = props.match ? props.match : () => true;
    const match = value => !reserved.includes(value) && matching(value);
    return (
        <OkCancelForm full="h" submit padded cancel={close} save={() => save(name)}>
            <Block full="h" padded>
                <PropertyGrid full="h">
                    <InputProp full="h" autoFocus name="Name:" value={name} set={setName} match={match} max={max} required />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function FiltersModal({ save, close, model, images, filters = '', type = 'canvas', ...props }) {
    const wContext = useContext(WindowContext);

    const [ zoom, setZoom ] = useState(1);
    const [ background, setBackground ] = useState(props.background ? props.background :'#000000');
    const [ index, setIndex ] = useState(0);

    const inputData = useMemo(() => {
        const data = [];
        for (let image of images) {
            if (type === 'imageData') {
                data.push(getCanvasForBitmap(image));
            } else {
                data.push(image);
            }
        }
        return data
    }, [images]);

    const currImage = inputData[index];

    const filterDefinitions = useMemo(() => {
        return wContext.filters.getFilters();
    });
    const filterIndex = useMemo(() => {
        const index =  new FilterIndex(model);
        const filterExpressions = filters.split('|');
        for (let expr of filterExpressions) {
            if (expr === '') {
                continue;
            }
            let name = expr;
            let item = {};
            if (expr.indexOf('(') !== -1 && expr.endsWith(')')) {
                const parts = expr.split('(', 2);
                name = parts[0];
                const values = parts[1].substr(0, parts[1].length - 1).split(',');
                const params = filterDefinitions[name].params;
                for (let i = 0; i < params.length; i++) {
                    params[i](values[i], item);
                }
            }
            index.setEntityObject({value: name, params: { ...item }});
        }
        return index;
    }, [model]);

    const [ activeFilter, setActiveFilter ] = useState(filterIndex.getLength() ? 0 : null);

    useUpdateOnEntityIndexChanges(filterIndex);

    const getFilterString = () => {
        const assigned = filterIndex.getEntityObjects();
        const values = [];
        for (let filter of assigned) {
            let expr = filter.value;
            const paramDefs = filterDefinitions[expr].paramDefs;
            if (paramDefs.length > 0) {
                expr += '(';
                const params = [];
                for (let def of paramDefs) {
                    const rawValue = filter.params[def.key];
                    params.push(def.type === 2 ? rgb2hex(rawValue) : rawValue);
                }
                expr += params.join(',') + ')';
            }
            values.push(expr);
        }
        return values.join('|');
    };

    const render = ctx => {
        const filteredCanvas = wContext.getFilteredCanvasData(getFilterString(), currImage);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, currImage.width * zoom, currImage.height * zoom);
        ctx.drawImage(
            filteredCanvas,
            0,
            0,
            currImage.width,
            currImage.height,
            0,
            0,
            currImage.width * zoom,
            currImage.height * zoom
        );
    };

    const addFilter = value => {
        const defs = filterDefinitions[value].paramDefs;
        const params = {};
        for (let param of defs) {
            params[param.key] = param.default;
        }
        filterIndex.setEntityObject({value, params});
        setActiveFilter(filterIndex.getLength() - 1);
    };

    const getItemProperties = () => {
        const params = (activeFilter === null || activeFilter === undefined) ? null : filterIndex.getEntityPropValue(activeFilter, 'params');
        if (!params) {
            return (
                <CenterInfo>No filter selected</CenterInfo>
            )
        }
        const paramDefs = filterDefinitions[filterIndex.getEntityValue(activeFilter)].paramDefs;
        const inputs = [];
        for (let def of paramDefs) {
            switch(def.type) {
                case 2:
                    const colorValue = rgb2hex(params[def.key]);
                    inputs.push(
                        <ColorProp
                            name={def.key + ':'}
                            key={def.key}
                            value={colorValue}
                            set={value => {
                                const newParams = { ...params, [def.key]: value };
                                filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                filterIndex.notify()
                            }}
                        />
                    );
                    break;

                case 1:
                    inputs.push(
                        <NumberProp
                            key={def.key}
                            slider="h"
                            name={def.key + ':'}
                            min={def.min}
                            max={def.max}
                            decimals={def.decimals}
                            step={def.step}
                            value={params[def.key]}
                            full="h"
                            set={value => {
                                const newParams = { ...params, [def.key]: value };
                                filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                filterIndex.notify()
                            }}
                        />
                    );
                    break;

                case 4:
                    inputs.push(
                        <NumberProp
                            key={def.key}
                            name={def.key + ':'}
                            set={
                                value => {
                                    const newParams = { ...params, [def.key]: value };
                                    filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                    filterIndex.notify()
                                }
                            }
                            value={params[def.key]}
                        />
                    );
                    break;

                default:
                    d('???', def);
                    break;
            }
        }
        return (
            <Block padded full="h">
                <PropertyGrid>
                    {inputs}
                </PropertyGrid>
            </Block>
        );
    };

    const saveFilters = () => {
        save(getFilterString());
    };

    const buttons = useMemo(() => {
        const items = [];
        for (let name of Object.keys(filterDefinitions).sort()) {
            items.push({name, full: 'h', onClick: () => addFilter(name), children: '>'});
        }
        return items
    }, []);

    return (
        <OkCancelForm full save={saveFilters} cancel={close}>
            <Stack full>
                <Section id="filterSelection" inner full="v" collapse="h" size={170} name="Filters">
                    <ButtonStack padded full="h" scroll buttons={buttons} buttonProps={{padded: 'h'}} vertical gaps />
                </Section>
                <EntityStackSections
                    id="filterPipeline"
                    sectionProps={{inner: true, name: 'Pipeline', size: 170, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    detailProps={{inner: true, name: 'Filter Properties', size: 200, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    entityIndex={filterIndex}
                    clone del order
                    emptyText="Add new filter from the left side"
                    active={activeFilter} setActive={setActiveFilter}
                >
                    {getItemProperties()}
                </EntityStackSections>
                <Section id="filterPreview" inner full name="Preview">
                    <Stack vertical full borders>
                        <Toolbar>
                            <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={9} />
                            <Color name="Background:" value={background} set={setBackground} />
                        </Toolbar>
                        <Block full>
                            <Block full padded centerItems scroll>
                                <Canvas
                                    border="1"
                                    width={currImage.width * zoom}
                                    height={currImage.height * zoom}
                                    render={render}
                                />
                            </Block>
                        </Block>
                    </Stack>
                </Section>
            </Stack>
        </OkCancelForm>
    )
}

function ResizeProps({ entityIndex, width, height, newWidth, newHeight, maxWidth, maxHeight, setNewWidth, setNewHeight, offsetX, offsetY, setOffsetX, setOffsetY }) {
    const { BitmapSelectionModal, openBitmapSelectionModal, closeBitmapSelectionModal } = useBitmapSelectionModal('Select New Size');

    const [ index, setIndex ] = useState(0);

    const selectNewSize = () => {
        openBitmapSelectionModal({
            selection: {},
            save: bitmap => {
                setNewWidth(bitmap.width);
                setNewHeight(bitmap.height);
                closeBitmapSelectionModal()
            }
        })
    };
    const moveOldX = newWidth > width;
    const moveOldY = newHeight > height;

    const markerWidth = Math.min(newWidth, width);
    const markerHeight = Math.min(newHeight, height);

    const previewWidth = Math.max(newWidth, width);
    const previewHeight = Math.max(newHeight, height);

    const maxOffsetX = Math.abs(previewWidth - markerWidth);
    const maxOffsetY = Math.abs(previewHeight - markerHeight);

    if (offsetX > maxOffsetX) {
        setOffsetX(maxOffsetX)
    }
    if (offsetY > maxOffsetY) {
        setOffsetY(maxOffsetY)
    }

    const provider = new BitmapGrid({image: getEmptyImageData(previewWidth, previewHeight)});

    const hasIndex = !!(entityIndex && entityIndex.getLength());

    if (hasIndex) {
        const model = {
            image: entityIndex.getEntityPropValue(index, 'image')
        };
        const oGrid = new BitmapGrid(model);

        const selection = oGrid.getSelection(
            0, 0,
            moveOldX ? width : previewWidth,
            moveOldY ? height : previewHeight
        );
        provider.writeSelection(
            moveOldX ? offsetX : 0,
            moveOldY ? offsetY : 0,
            selection
        )
    }
    return (
        <>
            <TupleProp name="Current Size:" readOnly x={width} y={height} min={1} max={128} />

            <LabelProp name="New Size:">
                <Stack gaps="1">
                    <Tuple
                        x={newWidth} y={newHeight}
                        setX={setNewWidth} setY={setNewHeight}
                        min={1} maxX={maxWidth} maxY={maxHeight} />
                    <Button name="Select" padded="h" onClick={selectNewSize} />
                </Stack>
            </LabelProp>
            <TupleProp name="Offset:"
                       disabled={width === newWidth && height === newHeight}
                       x={offsetX} y={offsetY}
                       setX={setOffsetX} setY={setOffsetY}
                       min={0}
                       maxX={maxOffsetX} maxY={maxOffsetY}
            />
            <LabelProp name="Position:">
                <Block width={400} height={300} border={1}>
                    <MarkerMoveGrid
                        gridProvider={provider}
                        index={index} setIndex={setIndex} maxIndex={hasIndex ? entityIndex.getLength() - 1 : null}
                        markerWidth={markerWidth} markerHeight={markerHeight}
                        markerX={offsetX} markerY={offsetY}
                        setMarkerX={setOffsetX} setMarkerY={setOffsetY}
                    />
                </Block>
            </LabelProp>
            {BitmapSelectionModal}
        </>
    )
}

function ImageProperties({ values, save, close, reserved }) {
    const [ value, setValue ] = useState(values.value);
    const [ image, setImage ] = useState(values.image);

    const saveImage = () => {
        save({value, image, width: (image.width || 0), height: (image.height || 0)});
    };

    return (
        <OkCancelForm submit save={saveImage} cancel={close} full>
            <Block padded full>
                <PropertyGrid full="h">
                    <InputProp name="ID" value={value} set={setValue} match={value => !reserved.includes(value)} full="h" required />
                    <ImageProp name="Image" value={image} set={setImage} setName={value ? null : name => setValue(name)} zoomOrAvail={{width: 200, height: 200}} required full="h" />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function ImagePicker({ images, save, empty = 'No images available', onClick }) {

    const [ zoom, setZoom ] = useState(6);

    const saveFileAsImage = (file, name = null) => {
        const img = new Image();
        img.src = file;
        img.decode().then(() => {
            save(img, name);
        })
    };
    const fileDropZone = <FileDropZone full="h" save={saveFileAsImage} type="image" />;

    if (images.length === 0) {
        return (
            <Stack vertical full padded>
                {fileDropZone}
                <Block full>
                    <CenterInfo>{empty}</CenterInfo>
                </Block>
            </Stack>
        )
    }
    const items = [];
    let index = 0;
    const avail = {width: zoom * 50, height: zoom * 50};
    for (let image of images) {
        const currIndex = index;
        items.push(
            <Block onClick={() => onClick(currIndex)} key={index} border="1" padded className="cursor-bg-hover">
                <Canvas width={avail.width} height={avail.height} render={ctx => {
                    drawCanvasToAvail(image, ctx, 0, 0, avail);
                }} />
            </Block>
        );
        index++;
    }

    return (
        <Stack full borders vertical>
            <Toolbar>
                <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={10} />
                <BackgroundControl />
            </Toolbar>
            <Block full>
                <Block scroll full="h" padded>
                    <Stack vertical full="h">
                        {fileDropZone}
                        <Stack wrap gaps full="h">
                            {items}
                        </Stack>
                    </Stack>
                </Block>
            </Block>
        </Stack>
    )
}

function BitmapSelectorInner({ save, close, selection, type = 'image' }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const NewImageModal = useModal();
    const StoreTempModal = useModal();

    const [ activeImage, setActiveImage ] = useState(null);
    const [ tempImage, setTempImage ] = useState(null);
    const [ tempName, setTempName ]  = useState('');

    const imageIndex = wContext.imageIndex;

    useUpdateOnEntityIndexChanges(imageIndex);

    const addImage = () => {
        NewImageModal.open({
            values: {
                value: '',
                width: 0,
                height: 0,
                image: null
            },
            reserved: imageIndex.getPropValues('value'),
            save: newImage => {
                const index = imageIndex.setEntityObject(newImage);
                setActiveImage(index);
                NewImageModal.close()
            }
        });
    };

    const doSave = value => {
        if (type !== 'image') {
            save(type === 'rgb' ? value.substr(0, 7) : value);
            return;
        }
        const markerSelection = eContext.getSelection();
        const baseCells = selection.multi ? markerSelection.getBaseCells() : [markerSelection.getCells()];
        const images = [];
        for(let cells of baseCells) {
            const provider = new BitmapCellProvider(1);
            provider.setMap(cells);
            images.push(provider.getImageData())
        }
        save(selection.multi ? images : images[0]);
    };
    selection.doubleClick = doSave;

    const tempIndex = imageIndex.getLength();

    const addTempImage = (file, name = null) => {
        setTempImage(file);
        setTempName(name);
        setActiveImage(tempIndex);
    };

    const storeTempImage = () => {
        StoreTempModal.open({
            name: tempName,
            reserved: imageIndex.getPropValues('value'),
            save: value => {
                imageIndex.setEntityObject({
                    value,
                    image: tempImage
                });
                StoreTempModal.close();
                setTempImage(null);
            }
        })
    };

    const images = imageIndex.getPropValues('image');
    let maxIndex = images.length - 1;
    if (tempImage) {
        images.push(tempImage);
        maxIndex++;
    }

    if (activeImage !== null && (activeImage > maxIndex)) {
        setActiveImage(null);
        return '';
    }

    return (
        <OkCancelForm submit full save={doSave} cancel={close}>
            <Stack full>
                <Section id="bitmapSelector" collapse="h" inner full="v" size={200} name="Images">
                    <Stack vertical borders full>
                        <Block full>
                            <EntityStack
                                entityIndex={imageIndex}
                                active={activeImage === tempIndex ? null : activeImage}
                                setActive={setActiveImage}
                                del
                                deselect
                                addOp={addImage}
                                getInfo={item => <Kbd className="less" value={item.width + ' x ' + item.height} />}
                                emptyText="No images available yet"
                            />
                        </Block>
                        {tempImage &&
                            <Stack borders vertical full="h">
                                <Stack padded gaps full="h">
                                    <Block full="h" center="v">Temp Image:</Block>
                                    <Button icon="save" onClick={storeTempImage} />
                                    <Button icon="delete" onClick={() => { setTempImage(null); setActiveImage(null) }} />
                                </Stack>
                                <Stack vertical gaps full="h" onClick={() => setActiveImage(activeImage === tempIndex ? null : tempIndex)} padded
                                       className={'hover-change ' + (activeImage === tempIndex ? 'active-bg active-text' : 'control-bg')}>
                                    <Block shorten>{tempName ? tempName : 'No name'}</Block>
                                    <Block className="less"><Kbd value={tempImage.width + ' x ' + tempImage.height} /></Block>
                                </Stack>
                                <StoreTempModal.content name="Id">
                                    <NameDialog { ...StoreTempModal.props } />
                                </StoreTempModal.content>
                            </Stack>

                        }
                    </Stack>
                </Section>
                <Block full>
                    {activeImage === null ?
                        <ImagePicker images={images} onClick={setActiveImage} save={addTempImage} /> :
                        <BitmapSelectionGrid
                            type={type}
                            selection={selection}
                            image={activeImage === tempIndex ? tempImage : imageIndex.getEntityPropValue(activeImage, 'image')}
                            onDoubleClick={doSave}
                        />
                    }
                </Block>
                <Hidden invalid={!eContext.hasSelection} />
            </Stack>

            <NewImageModal.content name="Add new Image" width={400}>
                <ImageProperties { ...NewImageModal.props } />
            </NewImageModal.content>
        </OkCancelForm>
    )
}

function BitmapSelector(props) {
    return (
        <EditorCtx>
            <BitmapSelectorInner { ...props } />
        </EditorCtx>
    )
}

function MarkerMoveGrid({ gridProvider, markerWidth, markerHeight, markerX, markerY, setMarkerX, setMarkerY, index, setIndex, maxIndex }) {
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(1);
    const [height, setHeight] = useState(1);
    const [zoom, setZoom] = useState(3);
    const [border, setBorder] = useState(1);
    const [rulers, setRulers] = useState(false);

    const [markerType, setMarkerType] = useState('rect');

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const modeProps = useMemo(() => {
        return {
            modes: ['move-marker'],
            mode: 'move-marker',
            modeParams: {},
            cellType: new PictureCell(sizeX, sizeY)
        }
    });

    return (
        <EditorCtx>
            <Stack vertical borders full>
                <Toolbar full="h">
                    {maxIndex !== null && <Number name="Index:" min={0} value={index} set={setIndex} max={maxIndex} />}
                    <Tuple name="Position:" x={posX} setX={setPosX} maxX={gridWidth - width} min={0}
                           y={posY} setY={setPosY} maxY={gridHeight - height} />
                    <Number name="Zoom:" value={zoom} min={1} max={10} set={setZoom} />
                    <Number name="Border:" value={border} min={0} max={10} set={setBorder} />
                    <Checkbox name="Rulers" value={rulers} set={setRulers} />
                </Toolbar>
                <Block full>
                    <FlexGrid
                        { ...modeProps }
                        gridProvider={gridProvider}
                        zoom={zoom} border={border} rulers={rulers}
                        posX={posX} setPosX={setPosX} posY={posY} setPosY={setPosY}
                        width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                        gridWidth={gridWidth} gridHeight={gridHeight}
                        markerX={markerX} markerY={markerY} setMarkerX={setMarkerX} setMarkerY={setMarkerY}
                        markerWidth={markerWidth} markerHeight={markerHeight}
                        setMarkerType={setMarkerType} markerType={markerType}
                    />
                </Block>
            </Stack>
        </EditorCtx>
    )
}

function BitmapEditorInner({ pageId, image, colors, resize, save, close }) {
    const eContext = useContext(EditorContext);

    const doSave = () => {
        save(gridProvider.getImageData())
    };
    const colorIndex = useMemo(() => {
        return colors ? colors : new ColorIndex({colors: getColorsFromImageData(image)});
    }, []);
    const gridProvider = useMemo(() => {
        return new BitmapGrid({ image });
    }, [ image ]);

    const selection = useMemo(() => {
        return {
            fixed: false,
        };
    }, []);

    const activeColor = eContext.selection.getType() === 'rect' ? eContext.selection.getCell() : '#00000000';
    const previewSize = 25;

    return (
        <OkCancelForm cancel={close} save={doSave} full>
            <Stack full>
                <Section id="markerSelection" inner full="v" inner collapse="h" size={170} name="Selection">
                    <Stack vertical full>
                        <Block padded>Selected:</Block>
                        <Block padded centerItems full="h">
                            <Canvas key={activeColor} border="1" width={previewSize} height={previewSize}
                                render={
                                    ctx => {
                                        ctx.fillStyle = activeColor;
                                        ctx.fillRect(0, 0, previewSize, previewSize)
                                    }
                                }
                            />
                        </Block>
                        <Block padded>Colors:</Block>
                        <Block padded full>
                            <EntityPicker
                                zoom={2}
                                entityIndex={colorIndex}
                                select={index => {
                                    eContext.setSelection(
                                        new CellSelection('rect', [[colorIndex.getEntityValue(index)]], CellValue.color)
                                    );
                                    eContext.setMode('write');
                                }}
                            />
                        </Block>
                    </Stack>
                </Section>
                <Block full>
                    <BaseGrid
                        pageId={pageId} undo edit resize={resize} navi zoom={4}
                        gridProvider={gridProvider} selection={selection}
                    />
                </Block>
            </Stack>
        </OkCancelForm>
    )
}

function BitmapEditor(props) {
    return (
       <EditorCtx id="BitmapEditor">
           <BitmapEditorInner { ...props } />
       </EditorCtx>
    )
}

function BitmapSelectionGrid({ image, selection, type, onDoubleClick }) {
    const bitmapGrid = useMemo(() => {
        return new BitmapGrid({image: getImageDataForImage(image)});
    }, [ image ]);

    const pickParams = {
        onPick: onDoubleClick
    };

    return (
        <BaseGrid
            modes={type !== 'image' ? ['pick'] : ['select']}
            modeParams={type !== 'image' ? pickParams : selection}
            gridProvider={bitmapGrid}
            selection={selection}
        />
    )
}

function ExportDialog({code, close}) {
    const copy = () => {
        return copy2clipboard(code);
    };

    return (
        <Stack vertical borders full>
            <Block padded full>
                <TextArea full copy readOnly value={code} />
            </Block>
            <Block padded full="h">
                <Stack gaps>
                    <AsyncButton
                        name="Copy" onClick={copy} onClickEnd={close}
                        icon="content_paste" padded="h" className="autofocus"
                    />
                    <Button name="Close" icon="close" padded="h" onClick={close} />
                </Stack>
            </Block>
        </Stack>
    )
}

function useExportModal({ model, resource, update, name }) {
    const wContext = useContext(WindowContext);
    const ExportModal = useModal();
    const LoadingModal = useModal();
    const ErrorModal = useModal();

    const getResourceDef = (type, id, value, details) => {
        if (type === 'image') {
            value = '"' + value + '"';
        } else if (type === 'json') {
            const lines = JSON.stringify(value, null, wContext.editorConfig.tabSpaces).split('\n');
            let jsonLines = [];
            if (details.compact) {
                let no = 0;
                let trackLevel = -1;
                let track;
                let prefix;
                for (let line of lines) {
                    if (trackLevel < 0) {
                        // TODO remove hardcoded key
                        if (line.trim().startsWith('"map": [')) {
                            trackLevel = 0;
                            track = [];
                        }
                        jsonLines.push(line);
                    } else {
                        if (line.match(/\[$/)) {
                            trackLevel++;
                            if (trackLevel === 1) {
                                prefix = line.substr(0, line.indexOf('['));
                                track = [line.trim()];
                            } else {
                                track.push(line.trim());
                            }
                        } else if (line.match(/\],?$/)) {
                            trackLevel--;
                            if (trackLevel === 0) {
                                track.push(line.trim());
                                jsonLines.push(prefix + track.join(' '));
                            } else if (trackLevel > 0) {
                                track.push(line.trim());
                            } else {
                                jsonLines.push(line);
                            }
                        } else {
                            if (trackLevel > 0) {
                                track.push(line.trim());
                            } else {
                                jsonLines.push(line);
                            }
                        }
                    }
                    no++;
                }
            } else {
                jsonLines = lines;
            }
            value = jsonLines.join('\n    ');
        }
        return "this.add" + type[0].toUpperCase() + type.substr(1) + 'Resource(\n' + `    '${id}',\n    ${value}\n);`;
    };
    const getModelConfig = () => {
        const rebuildJson = getRebuildJsonForModel(resource.cls, model, true);
        return new resource.config(rebuildJson);
    };
    const getModelResources = () => {
        return getModelConfig().getResources();
    };
    const storeModel = eContextRef => {
        wContext.resourceLoader.storeScreenResource(wContext.game.currentScreen, getModelConfig());
        eContextRef.current.updateRestorePos();
        wContext.markDirty()
        update();
    };
    const deployModel = () => {
        const gameRef = wContext.game;
        const resourcesInfo = getModelResources();

        LoadingModal.open();
        gameRef.getResourceLoader().deployResources(
            gameRef.currentScreen,
            resourcesInfo.resources,
            {json: [resource.id]},
            resourcesInfo.dependencies
        ).then(
            response => {
                ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
                gameRef.reloadScreen(1);
            }
        ).catch(err => {
            console.error(err);
            LoadingModal.close();
            ErrorModal.open({msg: 'Error deploying ' + name})
        })
    };

    const getResourceTree = () => {
        return getResourceTreeForJsonModel(resource.cls, model)
    };

    return {
        getModelConfig,
        getModelResources,
        getResourceTree,
        storeModel,
        deployModel,
        openExportModal: (code = null, details = {}) => {
            if (code === null) {
                const resources = getModelResources();
                const lines = [];
                for (let res of resources.resources.reverse()) {
                    const data = res.type === 'image' ? res.data.getDataUrl() : res.data;
                    lines.push(getResourceDef(res.type, res.id, data, details));
                }
                code = lines.join('\n');
            }
            ExportModal.open({
                code
            })
        },
        Modals: () =>
            <>
                <ExportModal.content name={'Export as Code: ' + name} width="80%" height="75%">
                    <ExportDialog { ...ExportModal.props }/>
                </ExportModal.content>

                <LoadingModal.content name={"Deploying " + name} closeable={false} width={200}>
                    <LoadingIndicator />
                </LoadingModal.content>

                <ErrorModal.content name="An error occured" width={250}>
                    <Block full>
                        <CenterInfo icon="warning" iconSize={30}>{ErrorModal.props.msg}</CenterInfo>
                    </Block>
                </ErrorModal.content>
            </>
    };
}

function AnimationProps({ animationIndex }) {
    const animation = animationIndex.getEntityObject(0);
    const dirOptions = [
        {id: 0, name: 'Forward'},
        {id: 1, name: 'Backward'},
        {id: 2, name: 'Forward Backward'},
        {id: 3, name: 'Backward Forward'}
    ];
    const endOptions = [
        {id: 0, name: 'Loop'},
        {id: 1, name: 'Stop'},
        {id: 2, name: 'Destroy'}
    ];
    const setProp = (prop, value) => {
        animationIndex.setEntityPropValue(0, prop, value);
    };
    return (
        <Block padded full="h">
            <PropertyGrid>
                <InputProp name="Name:" value={animation.value}
                   set={value => animationIndex.setEntityObject({ ...animationIndex.getEntityObject(0), value }, true)}
                />
                <NumberProp name="Speed:" value={animation.speed} set={value => setProp('speed', value)} decimals={2} min={0.0} max={2.0} slider="h" />
                <RadioProp name="Direction:" gaps="1" padded="h" options={dirOptions} value={animation.dir} set={value => setProp( 'dir', value)} />
                <RadioProp name="End:" gaps="1" padded="h" options={endOptions} value={animation.end} set={value => setProp( 'end', value)} />
                <CheckboxProp name="Synchronous:" value={animation.synchronous} set={value => setProp( 'synchronous', value)} />
            </PropertyGrid>
        </Block>
    )
}

function PlayerCanvas({ player, spriteIndex }) {
    const aContext = useContext(AvailContext);
    const wContext = useContext(WindowContext);

    const width = aContext.width;
    const height = aContext.height;
    const update = useComponentUpdate();
    const mounted = useMounted();
    const lastRef = useRef(null);
    const lastPlayer = useRef(null);
    lastPlayer.current = player;

    useEffect(() => {
        const level = wContext.getModalLevel();

        const run = () => {
            lastRef.current = requestAnimationFrame(() => {
                if (lastPlayer.current !== player && !mounted.current) {
                    return;
                }
                if (!(player.isPaused() || level !== wContext.getModalLevel())) {
                    if (player.hasEnded()) {
                        player.reset();
                    } else {
                        player.nextStep();
                    }
                    if (player.isDirty()) {
                        update();
                    }
                }
                run();
            })
        };
        run();

        return () => {
            if (lastRef.current) {
                cancelAnimationFrame(lastRef.current);
            }
        }
    }, [player]);

    return (
        <Canvas width={width} height={height} render={ctx => {
            const frame = lastPlayer.current.getFrame();
            if (!frame) {
                return;
            }
            spriteIndex.drawEntity(ctx, spriteIndex.getEntityByPropValue('value', frame.id) , 0, 0, {width, height});
        }} />
    )
}

function AnimationPreview({ animationIndex, frameIndex, spriteIndex }) {
    useUpdateOnEntityIndexChanges(frameIndex);
    const [ stopped, setStopped ] = useState(false);

    const player = new BitmapPlayer();
    const frames = frameIndex.getPropValues('value');
    const dir = animationIndex.getEntityPropValue(0, 'dir');
    const end = animationIndex.getEntityPropValue(0, 'end');
    const speed = animationIndex.getEntityPropValue(0, 'speed');

    player.loadAnimation(frames, end, dir, speed);
    if (stopped) {
        player.pause();
    }
    const toggleStopped = () => {
        setStopped(!stopped)
    };
    return (
        <Section name="Preview" inner width={200} full="v">
            <Stack vertical borders full>
                <Block full padded>
                    <AvailContextProvider>
                        <Block center border="1">
                            <PlayerCanvas spriteIndex={animationIndex.index} player={player} />
                        </Block>
                    </AvailContextProvider>
                </Block>
                <Block full="h" className="secondary-bg" padded>
                    <Block center>
                        <Button icon={stopped ? 'play_arrow' : 'stop'} onClick={toggleStopped} />
                    </Block>
                </Block>
            </Stack>
        </Section>
    )
}

function FramePicker({ fixSize, frameIndex, width, height, select }) {
    return (
        <EntityPicker
            entityIndex={frameIndex.index}
            filter
            base={fixSize ? null : index => (
                frameIndex.index.getEntityPropValue(index, 'width') === width &&
                frameIndex.index.getEntityPropValue(index, 'height') === height
            )}
            select={select}
        />
    )
}

function FrameManager({ frameIndex, fixSize, width, height }) {
    const eContext = useContext(EditorContext);

    const NewFrameModal = useModal();
    const addFrame = () => {
        NewFrameModal.open({
            frameIndex,
            fixSize,
            width,
            height,
            select: index => {
                const sprite = frameIndex.index.getEntityValue(index);
                let undoIndex = null;
                eContext.doAction(
                    () => {
                        undoIndex = frameIndex.setEntityObject({value: {id: sprite, duration: 1, padding: {x: 0, y: 0}}});
                    },
                    () => {
                        frameIndex.deleteEntity(undoIndex);
                    }
                );
                NewFrameModal.close();
            }
        });
    };

    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;

    return (
        <>
            <EntityManager
                entityIndex={frameIndex}
                titleHeight={titleHeight}
                footerHeight={20 + 2 * defaultPaddingPx}
                minWidth={150}
                filter
                auto
                undo
                addOp={addFrame}
                empty="No animations defined. Add new one"
                renderTitle={index => {
                    const name = frameIndex.getEntityValue(index).id;
                    return (
                        <Stack gaps padded full="h">
                            <Block className="less">#{index}</Block>
                            <Block full="h" shorten>{name}</Block>
                        </Stack>
                    )
                }}
                renderFooter={index => {
                    const frame = frameIndex.getEntityValue(index);
                    return (
                        <Stack padded className="less small" full="h" gaps>
                            <Block center="v">Duration: </Block>
                            <Block center="v" full="h"><Number size={3} min={1} value={frame.duration} set={duration => {frame.duration = duration; frameIndex.notify()}} /></Block>
                        </Stack>
                    )
                }}
            />

            <NewFrameModal.content name="Pick sprite for frame" width={600} height={500}>
                <FramePicker { ...NewFrameModal.props } />
            </NewFrameModal.content>
        </>
    )
}

function AnimationForm({ animation, spriteIndex, save, close, isValid }) {
    const update = useComponentUpdate();

    const animationIndex = useMemo(
        () => {
            const animationIndex = new AnimationIndex(spriteIndex, {animations: []});
            animationIndex.setEntityObject({ ...animation, index: 0 });
            animationIndex.addListener(update);
            return animationIndex
        },
        [animation]
    );
    const width = animation.sizeX;
    const height = animation.sizeY;
    const frameIndex = useMemo(
        () => {
            return new FrameIndex(animation, spriteIndex, width, height)
        },
        [animation]
    );
    const name = animationIndex.getEntityValue(0);
    const canSave = () => name !== '' && isValid(name);
    const saveAnimation = () => {
        save({
            ...animationIndex.getEntityObject(0),
            frames: [ ...frameIndex.getPropValues('value') ]
        })
    }
    return (
        <EditorCtx>
            <OkCancelForm submit save={saveAnimation} cancel={close} full>
                <Hidden invalid={!canSave} />
                <Stack vertical full borders>
                    <Stack full borders>
                        <FrameManager fixSize={animationIndex.fixSize} width={width} height={height} frameIndex={frameIndex} />
                        <AnimationPreview animationIndex={animationIndex} spriteIndex={spriteIndex} frameIndex={frameIndex} />
                    </Stack>
                    <AnimationProps animationIndex={animationIndex} />
                </Stack>
            </OkCancelForm>
        </EditorCtx>
    )
}

function AnimationFormNew({ save, close, isValid, ...props }) {
    const [ name, setName ] = useState(props.name);
    const [ width, setWidth ] = useState(props.width);
    const [ height, setHeight ] = useState(props.height);

    const canSave = () => name !== '' && isValid(name);
    const saveAnimation = () => {
        save({
            value: name,
            frames: [],
            end: 0,
            dir: 0,
            synchronous: true,
            sizeX: width,
            sizeY: height
        })
    };
    return (
        <OkCancelForm submit save={saveAnimation} cancel={close}>
            <PropertyGrid full>
                <InputProp name="Name:" value={name} set={setName} invalid={!canSave()} />
                <TupleProp name="Size:" x={width} setX={setWidth} y={height} setY={setHeight} min={1} max={32} buttons />
            </PropertyGrid>
        </OkCancelForm>
    )
}

function AnimationManager({ animationIndex, spriteIndex }) {
    const eContext = useContext(EditorContext);

    const NewAnimationModal = useModal();
    const EditAnimationModal = useModal();

    const addAnimation = () => {
        NewAnimationModal.open({
            name: '',
            speed: 1,
            width: animationIndex.fixSize ? animationIndex.getSizeX() : 16,
            height: animationIndex.fixSize ? animationIndex.getSizeY() : 16,
            isValid: value => !animationIndex.hasPropValue('value', value),
            save: newAnimation => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = animationIndex.setEntityObject({ ...newAnimation });
                    },
                    () => {
                        animationIndex.deleteEntity(index);
                    }
                );
                NewAnimationModal.close();
            }
        })
    };
    const editAnimation = index => {
        const animation = animationIndex.getEntityObject(index);
        EditAnimationModal.open({
            name: animationIndex.getEntityValue(index),
            spriteIndex,
            animation,
            isValid: value => animation.value === value || !animationIndex.hasPropValue('value', value),
            save: newAnimation => {
                let plan = null;
                if (animation.value !== newAnimation.value) {
                    plan = animationIndex.getRenamePlan(animation.value, newAnimation.value);
                }
                eContext.doAction(
                    () => {
                        if (plan) {
                            animationIndex.doRenamePlan(plan);
                        }
                        animationIndex.setEntityObject({ ...newAnimation, index }, true);
                    },
                    () => {
                        if (plan) {
                            animationIndex.undoRenamePlan(plan);
                        }
                        animationIndex.setEntityObject(animation, true);
                    }
                );
                EditAnimationModal.close();
            }
        });
    };
    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;
    return (
        <>
            <EntityManager
                entityIndex={animationIndex}
                animationIndex={animationIndex}
                titleHeight={titleHeight}
                footerHeight={titleHeight}
                minWidth={100}
                filter
                auto
                addOp={addAnimation}
                editOp={editAnimation}
                empty="No animations defined. Add new one"
                onDoubleClick={editAnimation}
                renderTitle={index => {
                    const name = animationIndex.getEntityValue(index);
                    return <Block padded full="h" shorten>{name}</Block>
                }}
                renderFooter={index => {
                    const frames = animationIndex.getEntityPropValue(index, 'frames').length;
                    return (
                        <Stack full="h" padded className="less small"><Block>Frames: </Block><Kbd value={frames} /></Stack>
                    )
                }}
            />

            <EditAnimationModal.content name="Edit Animation" width={1200} height={500}>
                <AnimationForm { ...EditAnimationModal.props } />
            </EditAnimationModal.content>

            <NewAnimationModal.content name="New Animation">
                <AnimationFormNew { ...NewAnimationModal.props } />
            </NewAnimationModal.content>
        </>
    )
}

function useEditBitmapModal(name = 'Edit image') {
    const EditModal = useModal();
    return useMemo(() => {
        return {
            openEditBitmapModal: props => {
                EditModal.open({id: 'EditBitmapModal', ...props })
            },
            closeEditBitmapModal: EditModal.close,
            EditBitmapModal: (
                <EditModal.content name={name} full>
                    <BitmapEditor { ...EditModal.props } />
                </EditModal.content>
            )
        }
    }, [EditModal.props])
}

function useBitmapSelectionModal(name = 'Select image') {
    const SelectionModal = useModal();
    return useMemo(() => {
        return {
            openBitmapSelectionModal: props => {
                SelectionModal.open({id: 'BitmapSelectionModal', ...props });
            },
            closeBitmapSelectionModal: SelectionModal.close,
            BitmapSelectionModal: <SelectionModal.content name={name} full>
                <BitmapSelector { ...SelectionModal.props } />
            </SelectionModal.content>
        }
    }, [SelectionModal.props])
}

function useFilterPipelineModal(name = 'Filter') {
    const FilterModal = useModal();
    return useMemo(() => {
        return {
            openFilterPipelineModal: props => {
                FilterModal.open({ id: 'FilterPipelineModal', ...props })
            },
            closeFilterPipelineModal: FilterModal.close,
            FilterPipelineModal: (
                <FilterModal.content name={name} width="75%" height="75%">
                    <EditorCtx>
                        <FiltersModal { ...FilterModal.props } />
                    </EditorCtx>
                </FilterModal.content>
            )
        }
    }, [FilterModal.props])
}

export {
    MarkerMoveGrid,
    ResizeProps,
    BitmapEditor,
    BitmapSelector,
    BitmapSelectionGrid,
    NameDialog,
    AnimationManager,
    useExportModal,
    useConfirmDialog,
    useFilterPipelineModal,
    useBitmapSelectionModal,
    useEditBitmapModal
}