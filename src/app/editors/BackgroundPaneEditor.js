import React, { useContext, useMemo, useState } from "react";
import {
    Button,
    Color,
    ImageProp,
    TupleProp,
    KeyInput,
    Number,
    EntityProp,
    BitmapProp
} from "../components/FormComponents";
import { EntityStackSections } from "../components/EntityComponents";
import {
    CenterInfo,
    Section,
    Canvas,
    EditorSection,
    PropertyGrid,
    useComponentUpdate,
    WindowContext,
    EditorContext, Toolbar, useUpdateOnEntityIndexChanges
} from "../components/BasicComponents";
import { ImageBlockIndex } from "../classes/EntityIndex";
import { useExportModal } from "../components/EditorComponents";
import { Stack, Block } from '../components/LayoutComponents';
import { d, drawCanvasToAvail } from "../helper/helper";
import { EntityManager, EntityStack, EntityPicker } from "../components/EntityComponents";

function ImageManager({ imageIndex }) {
    return (
        <Block full>
            <EntityManager
                minWidth={100}
                auto
                entityIndex={imageIndex}
                titleHeight={60}
                renderTitle={index => {
                    const name = imageIndex.getEntityValue(index);
                    const width = imageIndex.getEntityPropValue(index, 'width');
                    const height = imageIndex.getEntityPropValue(index, 'height');
                    return (
                        <Stack full="h" gaps vertical padded>
                            <Block className="more">
                                {name}
                            </Block>
                            <Block>{width + ' x' + height}</Block>
                        </Stack>
                    )}
                }
            />
        </Block>
    )
}

function BackgroundPreview({ model, imageIndex, dim }) {
    useUpdateOnEntityIndexChanges(imageIndex);
    const [ zoom, setZoom ] = useState(2);

    const eContext = useContext(EditorContext);
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

    const render = ctx => {
        ctx.fillStyle = model.color;
        ctx.fillRect(0, 0, zoom * dim.x, zoom * dim.y);
        const images = imageIndex.getEntityObjects();
        for (let obj of images) {
            ctx.drawImage(obj.image, 0, 0, obj.width, obj.height, obj.x * zoom, obj.y * zoom, obj.width * zoom, obj.height * zoom);
        }
    }

    return (
        <Stack vertical borders full>
            <Toolbar>
                <Color name="Background color:" value={model.color} set={getModelPropSetter('color')} />
                <Number name="Zoom:" set={setZoom} value={zoom} min={1} max={10} />
            </Toolbar>

            <Block full padded>
                <Block centerItems full>
                    <Canvas width={dim.x * zoom} height={dim.y * zoom} render={render} />
                </Block>
            </Block>
        </Stack>
    )
}

function ImageStack({ imageIndex, active, setActive, resource }) {
    const eContext = useContext(EditorContext);
    useUpdateOnEntityIndexChanges(imageIndex);

    const editImage = () => {};
    const newImage = () => {};
    const deleteImage = () => {};
    const fieldProps = useMemo(() => resource.data.getFieldProps(), []);

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
        <EntityStackSections
            id="backgroundPaneImages"
            sectionProps={{inner: true, name: 'Images', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
            detailProps={{inner: true, name: 'Image Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
            entityIndex={imageIndex}
            getInfo={obj => 'Size: ' + obj.width + 'x' + obj.height}
            active={active} setActive={setActive}
            deselect
            editOp={editImage}
            addOp={newImage} deleteOp={deleteImage} undo
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
                        value={currImage.image.getContext('2d').getImageData(0, 0, currImage.width, currImage.height)} set={() => {}} resize entityIndex={imageIndex} zoomOrAvail={{width: 200, height: 200}}
                    />
                </PropertyGrid> :
                <CenterInfo>No image selected</CenterInfo>
            }
        </EntityStackSections>
    )
}

function ImagePicker({ imageIndex, active, setActive }) {
    return (
        <EntityPicker entityIndex={imageIndex} select={() => d('sel')} select={index => setActive(index)} />
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

    const imageIndex = useMemo(() => new ImageBlockIndex(model), [model])

    const [ activeImage, setActiveImage ] = useState(null);

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
                    <BackgroundPreview model={model} dim={resource.dim} imageIndex={imageIndex} />
                </Section>

                <Section id="backgroundPane_imagesSection" inner name="Images" full="h" size={250} maxHeight="50%" rev collapse>
                    <Stack full borders>
                        <ImageStack imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} resource={resource} />
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