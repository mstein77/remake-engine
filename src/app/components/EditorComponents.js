import React, { useContext, useMemo, useState } from "react";
import { ColorIndex, FilterIndex } from "../classes/EntityIndex";
import { EditorContext, EditorCtx, ButtonStack, Canvas, CenterInfo, Kbd, OkCancelForm, PropertyGrid, Section, Toolbar, useModal, useUpdateOnEntityIndexChanges, WindowContext } from "./BasicComponents";
import { d, rgb2hex, drawCanvasToAvail, getCanvasForBitmap, getImageDataForImage, getColorsFromImageData } from "../helper/helper";
import { PictureCell } from "./BaseComponents";
import { FileDropZone, Button, Color, ColorProp, Checkbox, ImageProp, InputProp, Number, NumberProp, Select, Tuple, Hidden, TupleProp, LabelProp } from "./FormComponents";
import { Block, Stack } from "./LayoutComponents";
import { EntityStack, EntityStackSections, EntityPicker } from "./EntityComponents";
import { FlexGrid, BaseGrid } from "./GridComponents";
import { BitmapGrid, CellValue, EmptyGrid } from "../classes/Grid";
import { BitmapCellProvider, CellSelection } from "../classes/CellProvider";
import { BackgroundControl } from "./BasicComponents";

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
                    <MarkerMoveGrid
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

function MarkerMoveGrid({ gridProvider, markerWidth, markerHeight, markerX, markerY, setMarkerX, setMarkerY }) {
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
                        undo edit resize={resize} navi zoom={4}
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
    const bitmapGrid = useMemo(() => {
        return new BitmapGrid({image: getImageDataForImage(image)});
    }, [ image ]);

    return (
        <BaseGrid
            gridProvider={bitmapGrid}
            selection={selection}
        />
    )
}

export {
    MarkerMoveGrid,
    ResizeProps,
    BitmapEditor,
    BitmapSelector,
    BitmapSelectionGrid,
    FiltersModal,
    NameDialog
}