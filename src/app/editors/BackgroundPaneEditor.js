import React, { useContext, useMemo, useState, useRef } from "react";
import { Color, TupleProp, Number, Checkbox, BitmapProp, OkCancelForm, InputProp } from "../components/FormComponents";
import { EntityStackSections } from "../components/EntityComponents";
import { CenterInfo, Section, Canvas, EditorSection, PropertyGrid, useComponentUpdate, WindowContext, EditorContext, Toolbar, useUpdateOnEntityIndexChanges, useModal } from "../components/BasicComponents";
import { ImageBlockIndex } from "../classes/EntityIndex";
import { useExportModal } from "../components/EditorComponents";
import { Stack, Block, Overlays, Overlay, DIR } from '../components/LayoutComponents';
import { d, getCanvasForBitmap, getEmptyImageData } from "../helper/helper";
import { EntityPicker } from "../components/EntityComponents";
import { GridCellMarker } from "../components/GridComponents";

function BackgroundPreview({ model, imageIndex, width, height, active, setActive, fieldProps }) {

    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const screenRef = useRef(null);
    const onMoveRef = useRef(null);

    const blockRef = useRef(null);

    useUpdateOnEntityIndexChanges(imageIndex);
    const [ marker, setMarker ] = useState(true);
    const [ zoom, setZoom ] = useState(2);
    const [ highlight, setHighlight ] = useState(false);

    const currBlock = active === null ? null : imageIndex.getEntityObject(active);

    const update = useComponentUpdate();
    const getModelPropSetter = prop => {
        return newValue => {
            const undoValue = model[prop];
            eContext.doAction(
                () => {
                    model[prop] = newValue;
                    update()
                },
                () => {
                    model[prop] = undoValue;
                    update()
                },
                prop
            );
        }
    }

    const onMove = e => {
        const rect = screenRef.current.getBoundingClientRect();
        const undoX = currBlock.x;
        const undoY = currBlock.y;
        let lastX = Math.floor((e.clientX - rect.x) / zoom);
        let lastY = Math.floor((e.clientY - rect.y) / zoom);
        const offsetX = blockRef.current.x - lastX;
        const offsetY = blockRef.current.y - lastY;
        lastX += offsetX;
        lastY += offsetY;

        wContext.startExclusiveMode('move-block', moveCursor);
        wContext.addEventListener('mousemove', e => {
            const currX = Math.floor((e.clientX - rect.x) / zoom);
            const currY = Math.floor((e.clientY - rect.y) / zoom);

            const cBlock = blockRef.current;
            const deltaX = currX - lastX;
            let changed = false;
            if (deltaX !== 0) {
                const newX = Math.max(fieldProps.x.min, Math.min(cBlock.x + deltaX, fieldProps.x.max)) + offsetX;
                if (newX !== cBlock.x) {
                    imageIndex.setEntityPropValue(active, 'x', newX);
                    lastX = newX;
                    changed = true;
                }
            }
            const deltaY = currY - lastY;
            if (deltaY !== 0) {
                const newY = Math.max(fieldProps.y.min, Math.min(cBlock.y + deltaY, fieldProps.y.max)) + offsetY;
                if (newY !== cBlock.y) {
                    imageIndex.setEntityPropValue(active, 'y', newY);
                    lastY = newY;
                    changed = true;
                }
            }
            if (changed) {
                imageIndex.notify();
            }
            e.stopPropagation();
            e.preventDefault();
        });
        wContext.addEventListener('mouseup', () => {
            eContext.doAction(
                () => {
                    imageIndex.setEntityPropValue(active, 'x', lastX);
                    imageIndex.setEntityPropValue(active, 'y', lastY);
                    imageIndex.notify();
                },
                () => {
                    imageIndex.setEntityPropValue(active, 'x', undoX);
                    imageIndex.setEntityPropValue(active, 'y', undoY);
                    imageIndex.notify();
                }
            );
            setHighlight(false);
            wContext.endExclusiveMode('move-block')
        }, {once: true});

        setHighlight(true);
        if (e.stopPropagation) {
            e.stopPropagation();
            e.preventDefault()
        }
    };
    onMoveRef.current = onMove;

    const activateByClick = e => {
        const rect = screenRef.current.getBoundingClientRect();
        const clickX = Math.floor((e.clientX - rect.x) / zoom);
        const clickY = Math.floor((e.clientY - rect.y) / zoom);
        let i = imageIndex.getLength() - 1;
        let found = false;
        while(!found && i >= 0) {
            const block = imageIndex.getEntityObject(i);
            // const img = getBlockImage(block);
            // if (img) {
                const pos = {x: block.x, y: block.y};
                if (pos.x <= clickX && clickX <= (pos.x + block.width - 1) &&
                    pos.y <= clickY && clickY <= (pos.y + block.height - 1)) {
                    found = true;
                    break;
                }
            //}
            i--;
        }
        if (found) {
            setActive(i);
            const startEvent = {
                clientX: e.clientX, clientY: e.clientY
            };
            requestAnimationFrame(() => {
                onMoveRef.current(startEvent);
            });
        } else {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    const render = ctx => {
        ctx.fillStyle = model.color;
        ctx.fillRect(0, 0, zoom * width, zoom * height);
        const images = imageIndex.getEntityObjects();
        for (let obj of images) {
            const bitmapCanvas = getCanvasForBitmap(obj.image);
            ctx.drawImage(bitmapCanvas, 0, 0, obj.width, obj.height, obj.x * zoom, obj.y * zoom, obj.width * zoom, obj.height * zoom);
        }
    }
    const moveCursor = 'grab';
    const dim = !currBlock ? null : {width: currBlock.width, height: currBlock.height};
    blockRef.current = active === null || !imageIndex.getLength() || !imageIndex.hasIndex(active) ? null : imageIndex.getEntityObject(active);

    return (
        <Stack vertical borders full>
            <Toolbar>
                <Color name="Background color:" value={model.color} set={getModelPropSetter('color')} />
                <Number name="Zoom:" set={setZoom} value={zoom} min={1} max={10} />
                <Checkbox name="Marker" set={setMarker} value={marker} />
            </Toolbar>

            <Block full centerItems padded scroll>
                <Overlays className="thin-boxed" width={width * zoom} height={height * zoom}>
                    <Overlay>
                        <Canvas render={render} width={width * zoom} height={height * zoom} />
                    </Overlay>
                    <Overlay width={width * zoom} height={width * zoom}>
                        <Block ref={screenRef} full onMouseDown={activateByClick}>
                            {marker && currBlock &&
                                <GridCellMarker
                                    blink
                                    posX={currBlock.x * zoom}
                                    posY={currBlock.y * zoom}
                                    zoom={zoom}
                                    cursor={moveCursor}
                                    xdir={
                                        (DIR.BOTTOM & (currBlock.y + dim.height < height)) |
                                        DIR.TOP |
                                        DIR.LEFT |
                                        (DIR.RIGHT & (currBlock.x + dim.width < width))
                                    }
                                    width={Math.min(dim.width, width - currBlock.x) * zoom}
                                    height={Math.min(dim.height, height - currBlock.y) * zoom}
                                    onMove={onMove}
                                    highlight={highlight}
                                />
                            }
                        </Block>
                    </Overlay>
                </Overlays>
            </Block>
        </Stack>
    )
}

function ImageBlockProperties({ close, save, reserved = [], fieldProps, imageIndex, ...props }) {
    const [ value, setValue ] = useState(props.value !== undefined ? props.value : 'test-bg.png');
    const [ x, setX ] = useState(props.x !== undefined ? props.x : 0);
    const [ y, setY ] = useState(props.y !== undefined ? props.y : 0);
    const [ image, setImage ] = useState(() => getEmptyImageData(10, 10));
    return (
        <OkCancelForm cancel={close} submit save={() => save({value, x, y, image, width: image.width, height: image.height })}>
            <PropertyGrid full="h">
                <InputProp name="Id" value={value} set={setValue}
                   full="h" maxWidth={250} required match={value => value.endsWith('.png') && !reserved.includes(value)}
                />
                <TupleProp name="Position" x={x} setX={setX} y={y} setY={setY}
                    min={fieldProps.x.min} max={fieldProps.x.max}
                />
                <BitmapProp
                    name="Bitmap:"
                    value={image}
                    set={setImage} resize entityIndex={imageIndex} zoomOrAvail={{width: 200, height: 200}}
                />
            </PropertyGrid>
        </OkCancelForm>
    )
}

function ImageStack({ imageIndex, active, setActive, fieldProps }) {
    const eContext = useContext(EditorContext);
    useUpdateOnEntityIndexChanges(imageIndex);
    const NewImageModal = useModal();

    const newImage = props => NewImageModal.open({
        ...props,
        fieldProps,
        imageIndex,
        reserved: imageIndex.getPropValues('value'),
        save: newImage => {
            const index = imageIndex.getLength();
            eContext.doAction(
                () => imageIndex.setEntityObject({index, ...newImage }),
                () => imageIndex.deleteEntity(index)
            );
            NewImageModal.close()
        }
    });

    const deleteImage = ({ active }) => {
        const index = active;
        const undoImage = imageIndex.getEntityObject(index);

        eContext.doAction(
            () => {
                imageIndex.deleteEntity(index);
            },
            () => {
                imageIndex.setEntityObject(undoImage);
            }
        );
        imageIndex.notify()
    };

    const currImage = active === null ? null : imageIndex.getEntityObject(active);

    const getModelPropSetter = prop => {
        return value => {
            const index = active;
            const undoValue = imageIndex.getEntityPropValue(index, prop);

            eContext.doAction(
                () => {
                    imageIndex.setEntityPropValue(index, prop, value)
                },
                () => {
                    imageIndex.setEntityPropValue(index, prop, undoValue)
                },
                prop
            );
            imageIndex.notify()
        }
    }

    return (
        <>
            <EntityStackSections
                id="backgroundPaneImages"
                sectionProps={{inner: true, name: 'Images', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                detailProps={{inner: true, name: 'Image Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                entityIndex={imageIndex}
                getInfo={obj => 'Size: ' + obj.width + 'x' + obj.height}
                active={active} setActive={setActive}
                deselect
                addOp={newImage} deleteOp={deleteImage} undo
                clone order
                emptyText="Add new Image"
            >
                {currImage !== null ?
                    <PropertyGrid full>
                        <TupleProp
                            name="Position:"
                            x={currImage.x} y={currImage.y} setX={getModelPropSetter('x')} setY={getModelPropSetter('y')}
                            min={fieldProps.x.min} max={fieldProps.x.max} />
                        <BitmapProp
                            name="Bitmap:"
                            value={currImage.image}
                            set={getModelPropSetter('image')} resize entityIndex={imageIndex} zoomOrAvail={{width: 200, height: 200}}
                        />
                    </PropertyGrid> :
                    <CenterInfo>No image selected</CenterInfo>
                }
            </EntityStackSections>

            <NewImageModal.content name="Add New Image">
                <ImageBlockProperties { ...NewImageModal.props } />
            </NewImageModal.content>
        </>
    )
}

function ImagePicker({ imageIndex, setActive }) {
    return (
        <EntityPicker entityIndex={imageIndex} select={index => setActive(index)} />
    )
}

function BackgroundPaneEditor({ model, resource }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();
    const { storeModel, deployModel, getResourceTree, openExportModal, Modals } = useExportModal({ name: 'BackgroundPane', model, resource, update });

    const tree = getResourceTree();
    const details = {
        'From:': tree[0].source,
        'Resources:': tree.length
    };
    const [ activeImage, setActiveImage ] = useState(null);

    const imageIndex = useMemo(() => new ImageBlockIndex(model), [model])
    const fieldProps = useMemo(() => resource.data.getFieldProps(), []);

    return (
        <EditorSection
            id="backgroundPaneEditor" area={1} link={3} full name="BackgroundPane"
            sub={model.id} details={details}
            confirm tree={tree}

            actions={
                eContextRef => {
                    return {
                        revert: () => d('REVERT!'),
                        save: {
                            can: () => !eContextRef.current.hasStorePos(),
                            exec: () => storeModel(eContextRef)
                        },
                        deploy: {
                            can: () => eContextRef.current.hasStorePos(),
                            exec: () => deployModel()
                        },
                        export: () =>  openExportModal()
                    }
                }
            }>
            <Stack full borders vertical>
                <Section inner name="Background" full>
                    <BackgroundPreview model={model} width={resource.dim.x} height={resource.dim.y} imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} fieldProps={fieldProps} />
                </Section>

                <Section id="backgroundPane_imagesSection" inner name="Images" full="h" size={250} maxHeight="50%" rev collapse>
                    <Stack full borders>
                        <ImageStack imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} resource={resource} fieldProps={fieldProps} />
                        <ImagePicker imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} />
                    </Stack>
                </Section>
                <Modals />
            </Stack>
        </EditorSection>
    )
}

export {
    BackgroundPaneEditor
}