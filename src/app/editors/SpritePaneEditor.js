import React, { useState, useContext, useRef, useEffect, useMemo } from "react";
import { Stack, Block } from "../components/LayoutComponents";
import { d, drawCanvasToAvail, getColorsFromCanvas, getCanvasForBitmap, getEmptyImageData } from "../helper/helper";
import { InputProp, LabelProp, OkCancelForm } from "../components/FormComponents";
import { Canvas, Section, EditorSection, Kbd, useModal, useComponentUpdate, EditorContext, useCssProps, PropertyGrid } from "../components/BasicComponents";
import { useBitmapSelectionModal, useEditBitmapModal, useExportModal } from "../components/EditorComponents";
import { AnimationIndex, ColorIndex, SpriteIndex } from "../classes/EntityIndex";
import { AnimationManager } from "../components/EditorComponents";
import { EntityManager } from "../components/EntityComponents";

function SpriteForm({ width, height, image, save, isValid, close, ...props }) {
    const [ value, setValue ] = useState(props.value);

    const canSave = value !== '' && isValid(value);
    const canvas = getCanvasForBitmap(image);
    return (
        <OkCancelForm submit save={() => save({width, height, value, image})} cancel={close}>
            <PropertyGrid>
                <InputProp name="Name" invalid={!canSave} value={value} set={setValue} />
                <LabelProp name="Bitmap">
                    <Canvas width={200} height={200} border
                        render={ctx => drawCanvasToAvail(canvas, ctx, 0, 0, {width: 200, height: 200})}
                    />
                </LabelProp>
            </PropertyGrid>
        </OkCancelForm>
    )
}

function SpriteManager({ spriteIndex, editSprite }) {
    const eContext = useContext(EditorContext);
    const NewSpriteModal = useModal();
    const ImportSpritesModal = useModal();
    const { openBitmapSelectionModal, closeBitmapSelectionModal, BitmapSelectionModal } = useBitmapSelectionModal('Select new sprite');

    const newSprite = () => {
        const image = getEmptyImageData(8, 8);
        const select = image => {
            closeBitmapSelectionModal();
            NewSpriteModal.open({
                value: '',
                width: image.width,
                height: image.height,
                image: image,
                isValid: name => !spriteIndex.hasPropValue('value', name),
                save: sprite => {
                    let index = null;
                    eContext.doAction(
                        () => {
                            index = spriteIndex.setEntityObject(sprite);
                        },
                        () => {
                            spriteIndex.deleteEntity(index);
                        }
                    );
                    NewSpriteModal.close();
                }
            });
        };
        openBitmapSelectionModal({
            colors: new ColorIndex({colors: getColorsFromCanvas(spriteIndex.img)}),
            resize: true,
            save: select,
            selection: {}
        });
    };

    const importSprites = () => {
        const select= image => {
            closeBitmapSelectionModal();
            // TODO we should handle multiple sprites here
            ImportSpritesModal.open({
                value: '',
                width: image.width,
                height: image.height,
                image,
                isValid: name => !spriteIndex.hasPropValue('value', name),
                save: sprite => {
                    let index = null;
                    eContext.doAction(
                        () => {
                            index = spriteIndex.setEntityObject(sprite);
                        },
                        () => {
                            spriteIndex.deleteEntity(index);
                        }
                    );
                    ImportSpritesModal.close();
                }
            })
        }
        openBitmapSelectionModal({
            resize: true,
            save: select,
            selection: {
                type: 'rect',
                multi: false,
                fixed: false,
                doubleClick: select
            }
        })
    }

    const { defaultPaddingPx, fmMonoMedium } = useCssProps('defaultPaddingPx', 'fmMonoMedium');
    const titleHeight = 2 * defaultPaddingPx + fmMonoMedium;

    return (
        <>
            <EntityManager
                entityIndex={spriteIndex}
                titleHeight={titleHeight}
                footerHeight={titleHeight}
                minWidth={100}
                filter
                auto
                addOp={newSprite}
                importOp={importSprites}
                empty="No sprites defined. Add new one"
                renderTitle={index => {
                    const name = spriteIndex.getEntityValue(index);
                    return <Block padded shorten>{name}</Block>
                }}
                renderFooter={index => {
                    const width = spriteIndex.getEntityPropValue(index, 'width');
                    const height = spriteIndex.getEntityPropValue(index, 'height');
                    return <Block padded full="h"><Kbd className="less" value={width + 'x' + height} /></Block>
                }}
                onDoubleClick={editSprite}
            />

            <NewSpriteModal.content name="New Sprite">
                <SpriteForm { ...NewSpriteModal.props } />
            </NewSpriteModal.content>

            <ImportSpritesModal.content name="Import Sprites">
                <SpriteForm { ...ImportSpritesModal.props } />
            </ImportSpritesModal.content>

            {BitmapSelectionModal}
        </>
    )
}

function SpritePaneEditorInner({ spriteIndex, animationIndex }) {
    const eContext = useContext(EditorContext);
    const { openEditBitmapModal, closeEditBitmapModal, EditBitmapModal } = useEditBitmapModal('Edit Sprite');

    const editSprite = index => {
        const value = spriteIndex.getEntityValue(index);
        const image = spriteIndex.getEntityPropValue(index, 'image');
        openEditBitmapModal({
            save: image => {
                const undoSprite = spriteIndex.getEntityObject(index);
                const editedSprite = {index, value, image, width: undoSprite.width, height: undoSprite.height};
                eContext.doAction(
                    () => {
                        spriteIndex.setEntityObject(editedSprite, true);
                    },
                    () => {
                        spriteIndex.setEntityObject(undoSprite, true);
                    }
                );
                closeEditBitmapModal()
            },
            colors: new ColorIndex({colors: getColorsFromCanvas(spriteIndex.img)}),
            image
        });
    };
    return (
        <>
            <Stack vertical full borders>
                <Section name="Sprites" height={280} inner full="h">
                    <SpriteManager animationIndex={animationIndex} spriteIndex={spriteIndex} editSprite={editSprite} />
                </Section>

                <Section name="Animations" height={300} inner full="h">
                    <AnimationManager animationIndex={animationIndex} spriteIndex={spriteIndex} />
                </Section>

                <Section name="Preview" inner full>
                    Preview goes here...
                </Section>
            </Stack>
            {EditBitmapModal}
        </>
    )
}

function SpritePaneEditor({ model, resource }) {
    const update = useComponentUpdate();
    const { storeModel, deployModel, getResourceTree, openExportModal, Modals } = useExportModal({ name: 'SpritePane', model, resource, update });

    const spriteIndex = useMemo(() => {
        return new SpriteIndex(model);
    }, [model]);

    const animationIndex = useMemo(() => {
        return new AnimationIndex(spriteIndex, model)
    }, [model]);

    const tree = []; // getResourceTree();
    const details = {
        'From:': 'Browser',
        'Resources:': tree.length
    };
    return (
        <EditorSection
            id="SpritePaneEditor" area={1} full name="SpritePane"
            sub={model.id} details={details} confirm tree={tree}
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
                        export: () => openExportModal()
                    }
                }
            }>
            <SpritePaneEditorInner spriteIndex={spriteIndex} animationIndex={animationIndex} />
            <Modals />
        </EditorSection>
    )
}

export {
    SpritePaneEditor
}