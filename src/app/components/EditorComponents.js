import React, { useRef, useEffect, useContext, useMemo, useState } from "react";
import { ColorIndex, FilterIndex } from "../classes/EntityIndex";
import { EditorContext, CssContext, EditorCtx, ButtonStack, Canvas, CenterInfo, Kbd, OkCancelForm, PropertyGrid, Section, Toolbar, useModal, useUpdateOnEntityIndexChanges, WindowContext } from "./BasicComponents";
import { d, rgb2hex, drawCanvasToAvail, getCanvasForBitmap, getImageDataForImage, getColorsFromImageData } from "../helper/helper";
import { PictureCell } from "./BaseComponents";
import { FileDropZone, Button, Color, ColorProp, Checkbox, ImageProp, InputProp, Number, NumberProp, Select, Tuple, Hidden, TupleProp, LabelProp } from "./FormComponents";
import { Block, Stack } from "./LayoutComponents";
import { EntityStack, EntityStackSections, EntityPicker } from "./EntityComponents";
import { FlexGrid } from "./GridComponents";
import { BitmapGrid, CellValue, EmptyGrid } from "../classes/Grid";
import { BitmapCellProvider, CellSelection } from "../classes/CellProvider";
import { BackgroundControl, UndoRedoButtons, ToolGroup } from "./BasicComponents";

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
    const [zoom, setZoom] = useState(1);
    const [background, setBackground] = useState(props.background ? props.background :'#000000');

    const [index, setIndex] = useState(0);
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
        return {
            "clear-y": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "flip-x": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "flip-y": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "flip-xy": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "shift-y": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "shift-x": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "monochrome": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 2,
                        "key": "color",
                        "default": "#ffffff"
                    }
                ],
                "params": [
                    null
                ]
            },
            "opacity": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "key": "opacity",
                        "type": 1,
                        "min": 0,
                        "max": 1,
                        "default": 1
                    }
                ],
                "params": [
                    null
                ]
            },
            "color-replace": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "key": "replace",
                        "type": 3
                    }
                ],
                "params": [
                    null
                ]
            }
        }
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
//                    params[i](values[i], item);
                    // TODO: validation?
                    item[name] = values[i];
                }
            }
            index.setEntityObject({value: name, params: { ...item }});
        }
        return index;
    }, [model]);

    const [activeFilter, setActiveFilter] = useState(filterIndex.getLength() ? 0 : null);

    useUpdateOnEntityIndexChanges(filterIndex);

    const render = ctx => {
        ctx.drawImage(
            currImage,
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
                            decimals={2}
                            step={def.step}
                            value={params[def.key]}
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
        save(values.join('|'));
    };

    return (
        <OkCancelForm full save={saveFilters} cancel={close}>
            <Stack full>
                <Section inner full="v" inner collapse="h" size={170} name="Filters">
                    <ButtonStack items={Object.keys(filterDefinitions).sort()} onClick={addFilter} />
                </Section>
                <EntityStackSections
                    sectionProps={{inner: true, name: 'Pipeline', size: 170, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    detailProps={{inner: true, name: 'Filter Properties', size: 200, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    entityIndex={filterIndex}
                    clone del order
                    emptyText="Add new filter from the left side"
                    active={activeFilter} setActive={setActiveFilter}
                >
                    {getItemProperties()}
                </EntityStackSections>
                <Section inner full name="Preview">
                    <Stack vertical full>
                        <Toolbar>
                            <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={9} />
                            <Color name="Background:" value={background} set={setBackground} />
                        </Toolbar>
                        <Block full centerItems>
                            <Canvas
                                width={currImage.width * zoom}
                                height={currImage.height * zoom}
                                render={render}
                            />
                        </Block>
                    </Stack>
                </Section>
            </Stack>
        </OkCancelForm>
    )
}

function ResizeProps({ width, height, newWidth, newHeight, maxWidth, maxHeight, setNewWidth, setNewHeight, offsetX, offsetY, setOffsetX, setOffsetY }) {
    const ImportFontModal = useModal();

    const selectNewSize = () => {
        ImportFontModal.open({
            selection: {},
            save: bitmap => {
                setNewWidth(bitmap.width);
                setNewHeight(bitmap.height);
                ImportFontModal.close()
            }
        })
    };
    const maxOffsetX = Math.abs(newWidth - width);
    const maxOffsetY = Math.abs(newHeight - height);

    const setState = changes => {
        changes.newWidth = changes.newWidth ? changes.newWidth : width;
        changes.newHeight = changes.newHeight ? changes.newHeight : height;
        changes.offsetX = changes.offsetX !== undefined ? changes.offsetX : offsetX;
        changes.offsetY = changes.offsetY !== undefined ? changes.offsetY : offsetY;

        if (changes.width !== width) {
            changes.offsetX = Math.min(changes.offsetX, maxOffsetX);
            setNewWidth(changes.newWidth);
        }
        if (changes.height !== height) {
            changes.offsetY = Math.min(changes.offsetY, maxOffsetY);
            setNewHeight(changes.newHeight);
        }
        if (changes.offsetX !== offsetX) {
            setOffsetX(changes.offsetX);
        }
        if (changes.offsetY !== offsetY) {
            setOffsetY(changes.offsetY);
        }
    };

    const previewWidth = Math.max(newWidth, width);
    const previewHeight = Math.max(newHeight, height);

    const size = 4;
    const zoom = 4;
    const border = 1;
    const provider = new EmptyGrid(previewWidth, previewHeight, size, '#000000');
//    const dim = provider.getGridDim(previewWidth, previewHeight, border, zoom);

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
                    <SimpleMarkerGrid
                        gridProvider={provider}
                        markerWidth={newWidth} markerHeight={newHeight}
                        markerX={offsetX} markerY={offsetY}
                        setMarkerX={setOffsetX} setMarkerY={setOffsetY}
                    />
                </Block>
            </LabelProp>

            <ImportFontModal.content name="Select New Size" full>
                <BitmapSelector { ...ImportFontModal.props } />
            </ImportFontModal.content>
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

function BitmapSelectorInner({ save, close, selection }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const NewImageModal = useModal();
    const StoreTempModal = useModal();

    const [activeImage, setActiveImage] = useState(null);
    const [tempImage, setTempImage] = useState(null);
    const [tempName, setTempName]  = useState('');

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

    const doSave = () => {
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
                <Section collapse="h" inner full="v" size={200} name="Images">
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
                                       className={activeImage === tempIndex ? 'hover-highlight active-bg active-text' : 'control-bg hover-highlight'}>
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

function SimpleMarkerGrid({ gridProvider, markerWidth, markerHeight, markerX, markerY, setMarkerX, setMarkerY }) {
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
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY);
    }, [sizeX, sizeY]);

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const modeParams = useMemo(() => {
        return {}
    });

    return (
        <EditorCtx>
            <Stack vertical borders full>
                <Toolbar full="h">
                    <Tuple name="Position:" x={posX} setX={setPosX} maxX={gridWidth - width} min={0}
                           y={posY} setY={setPosY} maxY={gridHeight - height} />
                    <Number name="Zoom:" value={zoom} min={1} max={10} set={setZoom} />
                    <Number name="Border:" value={border} min={0} max={10} set={setBorder} />
                    <Checkbox name="Rulers" value={rulers} set={setRulers} />
                </Toolbar>
                <Block full>
                    <FlexGrid
                        modes={['select']} mode="select" modeParams={modeParams}
                        gridProvider={gridProvider} cellType={cellType}
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

function BaseGrid({ gridProvider, selection, onDoubleClick, targetValues = [], resize, edit, navi, shift, undo, ...props }) {
    const eContext = useContext(EditorContext);

    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(1);
    const [height, setHeight] = useState(1);
    const [zoom, setZoom] = useState(props.zoom ? props.zoom : 1);
    const [border, setBorder] = useState(1);
    const [rulers, setRulers] = useState(false);
    const [writeTransparent, setWriteTransparent] = useState(false);

    const [markerType, setMarkerType] = useState('rect');
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(null);
    const [markerHeight, setMarkerHeight] = useState(null);
    const [markerGapX, setMarkerGapX] = useState(0);
    const [markerGapY, setMarkerGapY] = useState(0);

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY);
    }, [sizeX, sizeY]);

    const mode = eContext.mode;

    useEffect(() => {
        const cellValue = gridProvider.baseCellValue;
        if (cellValue) {
            // TODO take default value from props?
            eContext.setSelection(new CellSelection('rect',[[cellValue.getEmpty()]], cellValue));
        }
    }, []);

    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const showPin = selection.unfix && mode === 'select' && markerX !== null;
    const isPinned = (showPin && eContext.modeParams.fixed);

    const sectorWidth = selection.fixed || isPinned ? eContext.modeParams.width : markerWidth;
    const sectorHeight = selection.fixed || isPinned ? eContext.modeParams.height : markerHeight;

    const hasSegments = selection.multi && markerX !== null;

    const maxSegsX = hasSegments ?
        Math.floor((gridWidth - markerX - sectorWidth) / (sectorWidth + markerGapX)) + 1 : 1;
    let segsX = 1;
    if (hasSegments && sectorWidth !== markerWidth) {
        segsX += (markerWidth - sectorWidth) / (sectorWidth + markerGapX);
    }
    const maxSegsY = hasSegments ?
        Math.floor((gridHeight - markerY - sectorHeight) / (sectorHeight + markerGapY)) + 1 : 1;
    let segsY = 1;
    if (hasSegments && sectorHeight !== markerHeight) {
        segsY += (markerHeight - sectorHeight) / (sectorHeight + markerGapY);
    }
    const maxSectorWidth = hasSegments ?
        Math.floor((gridWidth - markerX - (segsX - 1) * markerGapX) /  segsX) : 1;

    const maxSectorHeight = hasSegments ?
        Math.floor((gridHeight - markerY - (segsY - 1) * markerGapY) /  segsY) : 1;

    const targetValueOptions = useMemo(() => {
        const options = [];
        for (let value of targetValues) {
            options.push({id: value.getId(), name: value.getName()});
        }
        return options
    }, [targetValues]);

    const modes = ['select', 'pick', 'write'];
    const hasMode = value => modes.includes(value);

    const actions = eContext.getGridActions();
    const buttons = [];
    for (let [name, action] of Object.entries(actions)) {
        if (action.has && !action.has()) continue;

        buttons.push(<Button key={name} name={name} padded="h" onClick={action} />);
    }
    const markerActions = <Stack>{buttons}</Stack>

    return (
        <Stack vertical borders full>
            <Toolbar full="h">
                <UndoRedoButtons />
                {modes.length > 1 &&
                    <Stack gaps="1">
                        {hasMode('select') && <Button icon="highlight_alt" current={eContext.mode} value={'select'} onClick={() => eContext.setMode('select', selection)} />}
                        {hasMode('pick') && <Button icon="colorize" current={eContext.mode} value={'pick'} onClick={() => eContext.setMode('pick')} />}
                        {hasMode('write') && <Button icon="edit" current={eContext.mode} value={'write'} onClick={() => eContext.setMode('write')} />}
                        {hasMode('drag') && <Button icon="pan_tool" current={eContext.mode} value={'drag'} onClick={() => eContext.setMode('drag')} />}
                        {hasMode('add') && <Button icon="exposure" rotate={180} current={eContext.mode} value={'add'} onClick={() => eContext.setMode('add')} />}
                    </Stack>
                }
                <Tuple name="Position:" x={posX} setX={setPosX} maxX={gridWidth - width} min={0}
                       y={posY} setY={setPosY} maxY={gridHeight - height} />
                <Number name="Zoom:" value={zoom} min={1} max={10} set={setZoom} />
                <Number name="Border:" value={border} min={0} max={10} set={setBorder} />
                <Checkbox name="Rulers" value={rulers} set={setRulers} />
            </Toolbar>
            <Block full>
                <FlexGrid
                    modes={modes} mode="select" modeParams={selection}
                    gridProvider={gridProvider} cellType={cellType}
                    zoom={zoom} border={border} rulers={rulers}
                    posX={posX} setPosX={setPosX} posY={posY} setPosY={setPosY}
                    width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                    gridWidth={gridWidth} gridHeight={gridHeight}
                    markerX={markerX} markerY={markerY} setMarkerX={setMarkerX} setMarkerY={setMarkerY}
                    markerWidth={markerWidth} markerHeight={markerHeight}
                    markerGapX={markerGapX} markerGapY={markerGapY}
                    setMarkerType={setMarkerType} markerType={markerType}
                    setMarkerWidth={setMarkerWidth} setMarkerHeight={setMarkerHeight}
                    writeTransparent={writeTransparent}
                    pinned={isPinned}
                    resize={resize} shift={shift} navi={navi}
                    onDoubleClick={onDoubleClick}
                />
            </Block>
            <Toolbar full="h">
                <ToolGroup>
                    <Block>Mode: {mode}</Block>
                    {mode === 'write' && targetValues.length > 1 &&
                        <Block width={100}>
                            <Select
                                value={eContext.targetCellValue.getId()}
                                buttons
                                full="h"
                                options={targetValueOptions}
                                set={id => eContext.setTargetCellValue(id)}
                            />
                        </Block>
                    }
                    {mode === 'write' && !eContext.selection.isCell() &&
                        <Checkbox name="Opaque" value={writeTransparent} set={setWriteTransparent} />
                    }
                </ToolGroup>

                {mode === 'select' &&
                    <ToolGroup>
                        {markerX !== null &&
                        <Tuple name="Position:"
                               x={markerX} setX={setMarkerX} min={0} maxX={gridWidth - markerWidth}
                               maxY={gridHeight - markerHeight} y={markerY} setY={setMarkerY} />
                        }
                        {!selection.multi && markerX !== null &&
                        <Tuple name="Size:"
                               x={markerWidth} setX={setMarkerWidth} maxX={gridWidth - (markerX + markerWidth)} min={1}
                               y={markerHeight} setY={setMarkerHeight} maxY={gridHeight - (markerY + markerHeight)}
                               readOnly={selection.fixed} />
                        }
                        {hasSegments &&
                        <Tuple
                            name="Size:"
                            x={sectorWidth} setX={value => {
                            setMarkerWidth(value + (value + markerGapX) * (segsX - 1));
                            const params = { ...eContext.modeParams };
                            params.width = value;
                            eContext.setMode('select', params);
                        }} maxX={maxSectorWidth} min={1}
                            y={sectorHeight} setY={value => {
                            setMarkerHeight(value + (value + markerGapY) * (segsY - 1));
                            const params = { ...eContext.modeParams };
                            params.height = value;
                            eContext.setMode('select', params);
                        }} maxY={maxSectorHeight}
                            disabled={selection.fixed}
                        />
                        }
                        {hasSegments &&
                        <Tuple
                            name="Segments:"
                            x={segsX} setX={value => {setMarkerWidth(sectorWidth + (sectorWidth + markerGapX) * (value - 1))}} maxX={maxSegsX} min={1}
                            y={segsY} setY={value => {setMarkerHeight(sectorHeight + (sectorHeight + markerGapY) * (value - 1))}} maxY={maxSegsY}
                        />
                        }
                        {hasSegments &&
                        <Tuple name="Gap:"
                               x={markerGapX}
                               setX={
                                   value => {
                                       const oversize = markerWidth - sectorWidth;
                                       const sectors = (oversize / (sectorWidth + markerGapX));
                                       const newWidth = sectorWidth + sectors * (sectorWidth + value);
                                       setMarkerGapX(value);
                                       setMarkerWidth(newWidth);
                                   }
                               }
                               maxX={
                                   markerGapX + Math.floor(
                                       (gridWidth - (markerX + markerWidth)) / (
                                           markerWidth <= (sectorWidth * 2 + markerGapX) ?
                                               1 :
                                               ((markerWidth - sectorWidth)/(sectorWidth + markerGapX))
                                       )
                                   )
                               }
                               y={markerGapY}
                               setY={
                                   (value) => {
                                       const oversize = markerHeight - sectorHeight;
                                       const sectors = (oversize / (sectorHeight + markerGapY));
                                       const newHeight = sectorHeight + sectors * (sectorHeight + value);
                                       setMarkerGapY(value);
                                       setMarkerHeight(newHeight);
                                   }}
                               maxY={
                                   markerGapY + Math.floor(
                                       (gridHeight - (markerY + markerHeight)) / (
                                           markerHeight <= (sectorHeight * 2 + markerGapY) ?
                                               1 :
                                               ((markerHeight - sectorHeight) / (sectorHeight + markerGapY))
                                       )
                                   )
                               }
                               min={0}
                        />
                        }
                        {markerX !== null &&
                            <Stack gaps="1">
                                <Button icon="north_west" onClick={
                                    () => {
                                        eContext.doGridAction('goto');
                                    }
                                } />
                                {<Button icon="select_all" onClick={
                                    () => {
                                        setMarkerX(0);
                                        setMarkerY(0);
                                        setMarkerWidth(gridProvider.getWidth());
                                        setMarkerHeight(gridProvider.getHeight());
                                    }
                                } />}
                                {edit && <Button icon="clear" onClick={
                                    () => {
                                        setMarkerX(null);
                                        setMarkerY(null);
                                        setMarkerWidth(null);
                                        setMarkerHeight(null)
                                    }
                                } />}
                            </Stack>
                        }
                        {showPin &&
                        <Button
                            icon="push_pin"
                            value={true}
                            current={isPinned}
                            onClick={() => {
                                const newParams = { ...eContext.modeParams, fixed: !isPinned };
                                newParams.width = newParams.fixed ? markerWidth : sectorWidth;
                                newParams.height = newParams.fixed ? markerHeight : sectorHeight;

                                if (!newParams.fixed) {
                                    setMarkerWidth(sectorWidth);
                                    setMarkerHeight(sectorHeight);
                                }
                                eContext.setMode('select', newParams);
                            }}
                        />
                        }
                        {markerActions}
                    </ToolGroup>
                }
            </Toolbar>
        </Stack>
    )
}


function BitmapEditorInner({ image, colors, resize, save, close }) {
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
                <Section inner full="v" inner collapse="h" size={170} name="Selection">
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
                        undo shift edit resize={resize} navi zoom={4}
                        gridProvider={gridProvider} selection={selection}
                    />
                </Block>
            </Stack>
        </OkCancelForm>
    )
}

function BitmapEditor(props) {
    return (
       <EditorCtx>
           <BitmapEditorInner { ...props } />
       </EditorCtx>
    )
}

function BitmapSelectionGrid({ image, selection, onDoubleClick }) {
    const eContext = useContext(EditorContext);

    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(100);
    const [height, setHeight] = useState(80);
    const [zoom, setZoom] = useState(1);
    const [border, setBorder] = useState(1);
    const [rulers, setRulers] = useState(false);

    const [markerType, setMarkerType] = useState('rect');
    const [markerX, setMarkerX] = useState(null);
    const [markerY, setMarkerY] = useState(null);
    const [markerWidth, setMarkerWidth] = useState(null);
    const [markerHeight, setMarkerHeight] = useState(null);
    const [markerGapX, setMarkerGapX] = useState(0);
    const [markerGapY, setMarkerGapY] = useState(0);

    const bitmapGrid = useMemo(() => {
        return new BitmapGrid({image: getImageDataForImage(image)});
    }, [ image ]);

    const sizeX = bitmapGrid.getCellSizeX();
    const sizeY = bitmapGrid.getCellSizeY();
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY);
    }, [sizeX, sizeY]);

    const gridWidth = bitmapGrid.getWidth();
    const gridHeight = bitmapGrid.getHeight();

    const showPin = selection.unfix && eContext.mode === 'select' && markerX !== null;
    const isPinned = (showPin && eContext.modeParams.fixed);

    const sectorWidth = selection.fixed || isPinned ? eContext.modeParams.width : markerWidth;
    const sectorHeight = selection.fixed || isPinned ? eContext.modeParams.height : markerHeight;

    const hasSegments = selection.multi && markerX !== null;

    const maxSegsX = hasSegments ?
        Math.floor((gridWidth - markerX - sectorWidth) / (sectorWidth + markerGapX)) + 1 : 1;
    let segsX = 1;
    if (hasSegments && sectorWidth !== markerWidth) {
        segsX += (markerWidth - sectorWidth) / (sectorWidth + markerGapX);
    }
    const maxSegsY = hasSegments ?
        Math.floor((gridHeight - markerY - sectorHeight) / (sectorHeight + markerGapY)) + 1 : 1;
    let segsY = 1;
    if (hasSegments && sectorHeight !== markerHeight) {
        segsY += (markerHeight - sectorHeight) / (sectorHeight + markerGapY);
    }
    const maxSectorWidth = hasSegments ?
        Math.floor((gridWidth - markerX - (segsX - 1) * markerGapX) /  segsX) : 1;

    const maxSectorHeight = hasSegments ?
        Math.floor((gridHeight - markerY - (segsY - 1) * markerGapY) /  segsY) : 1;

    return (
        <Stack vertical borders full>
            <Toolbar full="h">
                <Tuple name="Position:" x={posX} setX={setPosX} maxX={gridWidth - width} min={0}
                       y={posY} setY={setPosY} maxY={gridHeight - height} />
                <Number name="Zoom:" value={zoom} min={1} max={10} set={setZoom} />
                <Number name="Border:" value={border} min={0} max={10} set={setBorder} />
                <Checkbox name="Rulers" value={rulers} set={setRulers} />
            </Toolbar>
            <Block full>
                <FlexGrid
                    modes={['select', 'markerMove']} mode="select" modeParams={selection}
                    gridProvider={bitmapGrid} cellType={cellType}
                    zoom={zoom} border={border} rulers={rulers}
                    posX={posX} setPosX={setPosX} posY={posY} setPosY={setPosY}
                    width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                    gridWidth={gridWidth} gridHeight={gridHeight}
                    markerX={markerX} markerY={markerY} setMarkerX={setMarkerX} setMarkerY={setMarkerY}
                    markerWidth={markerWidth} markerHeight={markerHeight}
                    markerGapX={markerGapX} markerGapY={markerGapY}
                    setMarkerType={setMarkerType} markerType={markerType}
                    setMarkerWidth={setMarkerWidth} setMarkerHeight={setMarkerHeight}
                    pinned={isPinned} navi
                    onDoubleClick={onDoubleClick}
                />
            </Block>
            <Toolbar full="h">
                {markerX !== null &&
                    <Tuple name="Position:"
                           x={markerX} setX={setMarkerX} min={0} maxX={gridWidth - markerWidth}
                           maxY={gridHeight - markerHeight} y={markerY} setY={setMarkerY} />
                }
                {!selection.multi && markerX !== null &&
                    <Tuple name="Size:"
                           x={markerWidth} setX={setMarkerWidth} maxX={gridWidth - (markerX + markerWidth)} min={1}
                           y={markerHeight} setY={setMarkerHeight} maxY={gridHeight - (markerY + markerHeight)}
                           readOnly={selection.fixed} />
                }
                {hasSegments &&
                    <Tuple
                        name="Size:"
                        x={sectorWidth} setX={value => {
                            setMarkerWidth(value + (value + markerGapX) * (segsX - 1));
                            const params = { ...eContext.modeParams };
                            params.width = value;
                            eContext.setMode('select', params);
                        }} maxX={maxSectorWidth} min={1}
                        y={sectorHeight} setY={value => {
                            setMarkerHeight(value + (value + markerGapY) * (segsY - 1));
                            const params = { ...eContext.modeParams };
                            params.height = value;
                            eContext.setMode('select', params);
                        }} maxY={maxSectorHeight}
                        disabled={selection.fixed}
                    />
                }
                {hasSegments &&
                    <Tuple
                        name="Segments:"
                        x={segsX} setX={value => {setMarkerWidth(sectorWidth + (sectorWidth + markerGapX) * (value - 1))}} maxX={maxSegsX} min={1}
                        y={segsY} setY={value => {setMarkerHeight(sectorHeight + (sectorHeight + markerGapY) * (value - 1))}} maxY={maxSegsY}
                    />
                }
                {hasSegments &&
                    <Tuple name="Gap:"
                           x={markerGapX}
                           setX={
                                value => {
                                    const oversize = markerWidth - sectorWidth;
                                    const sectors = (oversize / (sectorWidth + markerGapX));
                                    const newWidth = sectorWidth + sectors * (sectorWidth + value);
                                    setMarkerGapX(value);
                                    setMarkerWidth(newWidth);
                                }
                           }
                           maxX={
                               markerGapX + Math.floor(
                                   (gridWidth - (markerX + markerWidth)) / (
                                       markerWidth <= (sectorWidth * 2 + markerGapX) ?
                                           1 :
                                           ((markerWidth - sectorWidth)/(sectorWidth + markerGapX))
                                   )
                               )
                           }
                           y={markerGapY}
                           setY={
                               (value) => {
                                   const oversize = markerHeight - sectorHeight;
                                   const sectors = (oversize / (sectorHeight + markerGapY));
                                   const newHeight = sectorHeight + sectors * (sectorHeight + value);
                                   setMarkerGapY(value);
                                   setMarkerHeight(newHeight);
                               }}
                           maxY={
                               markerGapY + Math.floor(
                                   (gridHeight - (markerY + markerHeight)) / (
                                       markerHeight <= (sectorHeight * 2 + markerGapY) ?
                                           1 :
                                           ((markerHeight - sectorHeight) / (sectorHeight + markerGapY))
                                   )
                               )
                           }
                           min={0}
                    />
                }
                {markerX !== null &&
                    <Button icon="clear" onClick={
                        () => {
                            setMarkerX(null);
                            setMarkerY(null);
                            setMarkerWidth(null);
                            setMarkerHeight(null)
                        }
                    } />
                }
                {showPin &&
                    <Button
                        icon="push_pin"
                        value={true}
                        current={isPinned}
                        onClick={() => {
                            const newParams = { ...eContext.modeParams, fixed: !isPinned };
                            newParams.width = newParams.fixed ? markerWidth : sectorWidth;
                            newParams.height = newParams.fixed ? markerHeight : sectorHeight;

                            if (!newParams.fixed) {
                                setMarkerWidth(sectorWidth);
                                setMarkerHeight(sectorHeight);
                            }
                            eContext.setMode('select', newParams);
                        }}
                    />
                }
            </Toolbar>
        </Stack>
    )
}

export {
    SimpleMarkerGrid,
    ResizeProps,
    BitmapEditor,
    BitmapSelector,
    BitmapSelectionGrid,
    FiltersModal,
    NameDialog
}