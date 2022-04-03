import React, {useRef, useEffect, Fragment, useMemo, useState, useContext} from "react";
import {
    AnimationManager,
    Section,
    Stack,
    Content,
    useModal,
    Title,
    EntityManager,
    Page,
    Canvas,
    PropertyGrid,
    TextFieldProp,
    ActionFrame,
    PropLabel,
    useAddIndexActions, GlobalContext
} from "./../components-old/BaseComponents";
import {BitmapEditor, BitmapSelector, EditorContext, EditorCtx} from "./Raster";
import {d, getColorsFromCanvas, BitmapPlayer, getCanvasForBitmap, drawCanvasToAvail, getEmptyImageData} from '../helper/helper';
import {ColorIndex, SpriteIndex, AnimationIndex, FrameIndex} from "../classes/EntityIndex";
import {BitmapCellProvider} from "../classes/CellProvider";

function SpriteForm({width, height, image, save, isValid, close, ...props}) {
    const [value, setValue] = useState(props.value);

    const canSave = value !== '' && isValid(value);
    const canvas = getCanvasForBitmap(image);

    return (
        <Stack vertical border>
            <Content padded>
                <PropertyGrid>
                    <TextFieldProp name="Name" invalid={!canSave} value={value} set={setValue} />
                    <PropLabel name="Bitmap">
                        <Canvas width={200} height={200} className="thin-boxed" render={
                            ctx => drawCanvasToAvail(canvas, ctx, 0, 0, {width: 200, height: 200})}
                        />
                    </PropLabel>
                </PropertyGrid>
            </Content>
            <Content padded>
                <button onClick={() => save({width, height, value, image})}>OK</button>
                <button onClick={() => close()}>Cancel</button>
            </Content>
        </Stack>
    )
}

function SpriteManager({spriteIndex, editSprite}) {
    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);

    const NewSpriteModal = useModal();
    const ImportSpritesModal = useModal();
    const SpriteSelectorModal = useModal();
    const SpriteEditorModal = useModal();

    const newSprite = () => {
        const image = getEmptyImageData(8, 8);
        SpriteEditorModal.open({
            colors: new ColorIndex({colors: getColorsFromCanvas(spriteIndex.img)}),
            resize: true,
            image,
            save: provider => {
                SpriteEditorModal.close();
                NewSpriteModal.open({
                    value: '',
                    width: provider.getWidth(),
                    height: provider.getHeight(),
                    image: provider.getImageData(),
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
            }
        });
    };

    const importSprites = () => {
        const selected = selection => {
            const provider = new BitmapCellProvider(1);
            provider.setMap(selection.getCells());
            SpriteSelectorModal.close();
            // TODO we should handle multiple sprites here
            ImportSpritesModal.open({
                value: '',
                width: selection.getWidth(),
                height: selection.getHeight(),
                image: provider.getImageData(),
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
            });
        };
        SpriteSelectorModal.open({
            zoom: 1,
            border: 0,
            selection: {
                type: 'rect',
                multi: false,
                fixed: false,
                doubleClick: selected
            },
            cancelHandler: SpriteSelectorModal.close,
            saveHandler: selected,
            bitmaps: context.imageResources
        });
    };

    const actions = useAddIndexActions(spriteIndex, ['delete']);

    return (
        <>
            <EntityManager
                entityIndex={spriteIndex}
                actions={actions}
                titleHeight={20}
                bottomHeight={20}
                minWidth={100}
                filter
                maxedZoom
                newItem={newSprite}
                importItems={importSprites}
                empty="No sprites defined. Add new one"
                renderTitle={index => {
                    const name = spriteIndex.getEntityValue(index);
                    return <Title maxWidth={100}>{name}</Title>
                }}
                renderBottom={index => {
                    const width = spriteIndex.getEntityPropValue(index, 'width');
                    const height = spriteIndex.getEntityPropValue(index, 'height');
                    return <kbd className="less">{width}x{height}</kbd>
                }}
                doubleClick={editSprite}
            />

            <SpriteEditorModal.content name="Edit Sprite" closeable>
                <EditorCtx>
                    <BitmapEditor {...SpriteEditorModal.props} />
                </EditorCtx>
            </SpriteEditorModal.content>

            <SpriteSelectorModal.content name="Select new sprite" closeable>
                <EditorCtx>
                    <BitmapSelector {...SpriteSelectorModal.props} />
                </EditorCtx>
            </SpriteSelectorModal.content>

            <NewSpriteModal.content name="New Sprite" fit closeable>
                <SpriteForm {...NewSpriteModal.props} />
            </NewSpriteModal.content>

            <ImportSpritesModal.content name="Import Sprites" fit>
                <SpriteForm {...ImportSpritesModal.props} />
            </ImportSpritesModal.content>
        </>
    )
}

function SpriteSheetEditor({spriteSheet, tree, cancel, play, revert, resource}) {
    const eContext = useContext(EditorContext);

    const EditSpriteModal = useModal();

    const spriteIndex = useMemo(() => {
        return new SpriteIndex(spriteSheet);
    }, []);

    const animationIndex = useMemo(() => {
        return new AnimationIndex(spriteIndex, spriteSheet)
    }, []);

    const saveSpritePane = () => {
        //saveModel(model)
    };
    const exportSpritePane = () => {
        //exportModel(model);
    };
    const deploySpritePane = () => {d('DEPLOY...')};

    const editSprite = index => {
        const value = spriteIndex.getEntityValue(index);
        const image = spriteIndex.getEntityPropValue(index, 'image');
        EditSpriteModal.open({
            save: provider => {
                const undoSprite = spriteIndex.getEntityObject(index);
                const editedSprite = {index, value, image: provider.getImageData(), width: undoSprite.width, height: undoSprite.height};
                eContext.doAction(
                    () => {
                        spriteIndex.setEntityObject(editedSprite, true);
                    },
                    () => {
                        spriteIndex.setEntityObject(undoSprite, true);
                    }
                );
                EditSpriteModal.close();
            },
            colors: new ColorIndex({colors: getColorsFromCanvas(spriteIndex.img)}),
            image
        });
    };

    tree = [{source: 'BLAA'}];
    resource = {id: 'TODO'};

    const frameActions = (
        <Stack>
            <Content>
                <button disabled={!eContext.hasPast()} onClick={() => eContext.undoAction()}>Undo</button>
                <button disabled={!eContext.hasFuture()} onClick={() => eContext.redoAction()}>Redo</button>
            </Content>
            <Content>
                <button onClick={revert}>Revert</button>
                <button onClick={saveSpritePane}>Save</button>
                <button onClick={deploySpritePane} disabled={!eContext.hasStorePos()}>Deploy</button>
                <button onClick={exportSpritePane}>Export</button>
            </Content>
        </Stack>
    );

    return (
        <Page title="Edit TilesPane" resources={tree} cancel={cancel} play={play}>
            <Stack vertical fullHeight>
                <ActionFrame type="TilesPane: " name={resource.id + (eContext.hasStorePos() ? ' ' : '*')} fullHeight sub={{'from': tree[0].source, 'Resources': tree.length}} actions={frameActions}>
                <Stack vertical>
                    <Section name="Sprite sheet" collapse>
                        <Content height="280">
                            <SpriteManager spriteIndex={spriteIndex} editSprite={editSprite} />
                        </Content>
                    </Section>

                    <Section name="Animations" height={300}>
                        <AnimationManager animationIndex={animationIndex} spriteIndex={spriteIndex} />
                    </Section>

                </Stack>
                </ActionFrame>
            </Stack>

            <EditSpriteModal.content name="Edit Sprite" closeable>
                <EditorCtx>
                    <BitmapEditor {...EditSpriteModal.props} />
                </EditorCtx>
            </EditSpriteModal.content>
        </Page>
    );
}

export default SpriteSheetEditor;
