import React, { useRef, useContext, useMemo, useState } from "react";
import { FilterIndex } from "../classes/EntityIndex";
import { EditorContext, CssContext, EditorCtx, ButtonStack, Canvas, CenterInfo, Kbd, OkCancelForm, PropertyGrid, Section, Toolbar, useModal, useUpdateOnEntityIndexChanges, WindowContext } from "./BasicComponents";
import { d, rgb2hex, getCanvasForBitmap, getImageDataForImage, clamp } from "../helper/helper";
import {Dim, PictureCell} from "./BaseComponents";
import { Button, Color, ColorProp, Checkbox, ImageProp, InputProp, Number, NumberProp, Tuple, Hidden } from "./FormComponents";
import { Block, Stack } from "./LayoutComponents";
import { EntityStack, EntityStackSections } from "./EntityComponents";
import { FlexGrid } from "./GridComponents";
import { BitmapGrid } from "../classes/Grid";

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

function ImageProperties({ values, save, close }) {
    const [ value, setValue ] = useState(values.value);
    const [ image, setImage ] = useState(values.image);

    const saveImage = () => {
        save({value, image, width: (image.width || 0), height: (image.height || 0)});
    };

    return (
        <OkCancelForm submit save={saveImage} cancel={close} full>
            <Block padded full>
                <PropertyGrid full="h">
                    <InputProp name="ID" value={value} set={setValue} full="h" required />
                    <ImageProp
                        name="Image"
                        value={image}
                        set={setImage}
                        full="h" />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function BitmapSelectorInner({ save, close, selection }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const NewImageModal = useModal();
    const [activeImage, setActiveImage] = useState(null);

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
            save: newImage => {
                const index = imageIndex.setEntityObject(newImage);
                setActiveImage(index);
                NewImageModal.close()
            }
        });
    };

    const doSave = () => save(eContext.selection);

    return (
        <OkCancelForm submit full save={doSave} cancel={close}>
            <Stack full>
                <Section collapse="h" inner full="v" size={200} name="Images">
                    <EntityStack
                        entityIndex={imageIndex}
                        active={activeImage}
                        setActive={setActiveImage}
                        del
                        deselect
                        addOp={addImage}
                        getInfo={item => <Kbd className="less" value={item.width + ' x ' + item.height} />}
                        emptyText="No images available yet"
                    />
                </Section>
                <Block full>
                    {activeImage === null ?
                        <CenterInfo>Please select an image...</CenterInfo> :
                        <BitmapSelectionGrid
                            selection={selection}
                            image={imageIndex.getEntityPropValue(activeImage, 'image')}
                            onDoubleClick={doSave}
                        />
                    }
                </Block>
                <Hidden invalid={!(eContext.selection.getType() === 'rect')} />
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

function BitmapSelectionGrid({ image, selection, onDoubleClick }) {
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(100);
    const [height, setHeight] = useState(80);
    const [zoom, setZoom] = useState(1);
    const [border, setBorder] = useState(1);
    const [rulers, setRulers] = useState(false);
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
                    gridProvider={bitmapGrid} cellType={cellType}
                    zoom={zoom} border={border} rulers={rulers}
                    posX={posX} setPosX={setPosX} posY={posY} setPosY={setPosY}
                    width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                    gridWidth={gridWidth} gridHeight={gridHeight}
                    selection={selection}
                    markerX={markerX} markerY={markerY} setMarkerX={setMarkerX} setMarkerY={setMarkerY}
                    markerWidth={markerWidth} markerHeight={markerHeight}
                    markerGapX={markerGapX} markerGapY={markerGapY}
                    setMarkerWidth={setMarkerWidth} setMarkerHeight={setMarkerHeight}
                    onDoubleClick={onDoubleClick}
                />
            </Block>
            <Toolbar full="h">
                {markerX !== null &&
                    <Tuple name="Position:"
                           x={markerX} setX={setMarkerX} min={0} maxX={gridWidth - markerWidth}
                           maxY={gridHeight - markerHeight} y={markerY} setY={setMarkerY} />
                }
                {markerX !== null &&
                    <Tuple name="Size:"
                           x={markerWidth} setX={setMarkerWidth} maxX={selection.width} minX={selection.width}
                           y={markerHeight} setY={setMarkerHeight} maxY={selection.height} minY={selection.height}
                           readOnly={selection.fixed} />
                }
                {selection.multi && markerX !== null &&
                    <Tuple name="Gap:"
                           x={markerGapX}
                           setX={
                                value => {
                                    const oversize = markerWidth - selection.width;
                                    const sectors = (oversize / (selection.width + markerGapX));
                                    const newWidth = selection.width + sectors * (selection.width + value);
                                    setMarkerGapX(value);
                                    setMarkerWidth(newWidth);
                                }
                           }
                           maxX={
                               markerGapX + Math.floor(
                                   (gridWidth - (markerX + markerWidth)) / (
                                       markerWidth <= (selection.width * 2 + markerGapX) ?
                                           1 :
                                           ((markerWidth - selection.width)/(selection.width + markerGapX))
                                   )
                               )
                           }
                           y={markerGapY}
                           setY={
                               (value) => {
                                   const oversize = markerHeight - selection.height;
                                   const sectors = (oversize / (selection.height + markerGapY));
                                   const newHeight = selection.height + sectors * (selection.height + value);
                                   setMarkerGapY(value);
                                   setMarkerHeight(newHeight);
                               }}
                           maxY={
                               markerGapY + Math.floor(
                                   (gridHeight - (markerY + markerHeight)) / (
                                       markerHeight <= (selection.height * 2 + markerGapY) ?
                                           1 :
                                           ((markerHeight - selection.height) / (selection.height + markerGapY))
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
            </Toolbar>
        </Stack>
    )
}

export {
    BitmapSelector,
    BitmapSelectionGrid,
    FiltersModal,
    NameDialog
}