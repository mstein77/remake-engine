import React, { useContext, useMemo, useState } from "react";
import { TupleProp, BitmapProp, OkCancelForm, InputProp } from "../components/FormComponents";
import { EntityStackSections } from "../components/EntityComponents";
import { CenterInfo, Coords, Section, EditorSection, PropertyGrid, useComponentUpdate, WindowContext, EditorContext, useUpdateOnEntityIndexChanges, useModal } from "../components/BasicComponents";
import { ImageBlockIndex } from "../classes/EntityIndex";
import { ScreenBlocksGrid, useEditBitmapModal, useExportModal } from "../components/EditorComponents";
import { Block, Stack } from '../components/LayoutComponents';
import { d, getEmptyImageData, getUniqueName } from "../helper/helper.js";
import { EntityPicker } from "../components/EntityComponents";

function BackgroundPreview({ model, imageIndex, newImage, width, height, active, setActive, fieldProps }) {
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
    const color = model.color;
    const setColor = getModelPropSetter('color');

    return (
        <ScreenBlocksGrid
            color={color} setColor={setColor} width={width} height={height}
            active={active} setActive={setActive} newBlock={newImage}
            fieldProps={fieldProps} blockIndex={imageIndex}
        />
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

function ImageStack({ imageIndex, setActive, fieldProps, newImage, ...props }) {
    const eContext = useContext(EditorContext);
    useUpdateOnEntityIndexChanges(imageIndex);

    const active = props.active !== null && props.active < imageIndex.getLength() ? props.active : null;

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
                entityIndex={imageIndex} getReservedValues={props.getReservedValues}
                getInfo={obj => {
                    return (
                        <Stack gaps>
                            <Block>Size:</Block>
                            <Coords x={obj.width} y={obj.height} />
                        </Stack>
                    )}
                }
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
        </>
    )
}

function ImagePicker({ imageIndex, setActive, editBitmap }) {
    return (
        <EntityPicker entityIndex={imageIndex} select={index => setActive(index)} doubleClick={editBitmap} />
    )
}

function BackgroudPaneEditorInner({ model, imageIndex, fieldProps, resource }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);
    const NewImageModal = useModal();
    const { EditBitmapModal, openEditBitmapModal, closeEditBitmapModal } = useEditBitmapModal();
    const [ activeImage, setActiveImage ] = useState(null);

    const editBitmap = index => {
        const image = imageIndex.getEntityPropValue(index, 'image');
        openEditBitmapModal({
            image,
            resize: true,
            save: newImage => {
                eContext.doAction(
                    () => imageIndex.setEntityPropValue(index, 'image', newImage),
                    () => imageIndex.setEntityPropValue(index, 'image', image)
                );
                closeEditBitmapModal()
            }
        })
    }

    const getReservedIds = () => {
        const reserved = [
            ...imageIndex.getPropValues('value'),
            ...wContext.resourceLoader.getAllResourceIds('image')
        ];
        return reserved
    };

    const newImage = props => {
        const reserved = getReservedIds();
        const value = getUniqueName(`${resource.id}_img$.png`, reserved);
        NewImageModal.open({
            ...props,
            value,
            fieldProps,
            imageIndex,
            reserved,
            save: newImage => {
                const index = imageIndex.getLength();
                eContext.doAction(
                    () => imageIndex.setEntityObject({ index, ...newImage }),
                    () => imageIndex.deleteEntity(index)
                );
                NewImageModal.close()
            }
        })
    }
    return (
        <>
            <Stack full borders vertical>
                <Section inner name="Background" full>
                    <BackgroundPreview model={model} width={resource.dim.x} height={resource.dim.y} imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} fieldProps={fieldProps} newImage={newImage} />
                </Section>

                <Section id="backgroundPane_imagesSection" inner name="Images" full="h" size={250} maxHeight="50%" rev collapse>
                    <Stack full borders>
                        <ImageStack imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} resource={resource} fieldProps={fieldProps} newImage={newImage} getReservedValues={getReservedIds} />
                        <ImagePicker imageIndex={imageIndex} active={activeImage} setActive={setActiveImage} editBitmap={editBitmap} />
                    </Stack>
                </Section>
            </Stack>

            <NewImageModal.content name="Add New Image">
                <ImageBlockProperties { ...NewImageModal.props } />
            </NewImageModal.content>

            {EditBitmapModal}
        </>
    )
}

function BackgroundPaneEditor({ model, resource }) {
    const update = useComponentUpdate();
    const { storeModel, deployModel, getResourceTree, openExportModal, Modals } = useExportModal({ name: 'BackgroundPane', model, resource, update });

    const tree = getResourceTree();
    const details = {
        'From:': tree[0].source,
        'Resources:': tree.length
    };
    const imageIndex = useMemo(() => {
        return new ImageBlockIndex(model)
    }, [model])
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
            <BackgroudPaneEditorInner model={model} imageIndex={imageIndex} fieldProps={fieldProps} resource={resource} />
            <Modals />
        </EditorSection>
    )
}

export {
    BackgroundPaneEditor
}