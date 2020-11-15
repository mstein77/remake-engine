import React, {useRef, useEffect, Fragment, useMemo, useState, useContext} from "react";
import {
    Section,
    Stack,
    Int,
    Content,
    useModal,
    Title,
    Range,
    EntityManager,
    EntityPicker,
    Page,
    Canvas,
    Centered,
    PropertyGrid,
    TextFieldProp,
    CheckboxProp,
    RadioProp,
    ActionBox,
    ActionFrame,
    PropLabel,
    useUpdateOnEntityIndexChanges,
    useComponentUpdate,
    useMounted,
    useAddIndexActions, GlobalContext
} from "./BaseComponents";
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

function DurationToggler({frame}) {
    const update = useComponentUpdate();
    return (
        <Stack>
            <Content>Duration: </Content>
            <Content>
                <Int buttons min={1} value={frame.duration} set={duration => {frame.duration = duration; update()}} />
            </Content>
        </Stack>
    );
}

function FrameManager({frameIndex}) {
    const eContext = useContext(EditorContext);
    const NewFrameModal = useModal();
    const actions = useAddIndexActions(frameIndex, ['delete']);

    const addFrame = () => {
        NewFrameModal.open({
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

    return (
        <>
            <EntityManager
                entityIndex={frameIndex}
                actions={actions}
                undoRedo
                titleHeight={20}
                bottomHeight={20}
                minWidth={100}
                filter
                maxedZoom
                newItem={addFrame}
                empty="No sprites defined. Add new one"
                renderTitle={index => {
                    const name = frameIndex.getEntityValue(index).id;
                    return <Title maxWidth={100}>#{index + 1} {name}</Title>
                }}
                renderBottom={index => {
                    const value = frameIndex.getEntityValue(index);
                    return (
                        <DurationToggler frame={value} />
                    )
                }}
            />

            <NewFrameModal.content name="Pick Sprite for frame" closeable width={600} height={500}>
                <EntityPicker
                    entityIndex={frameIndex.index}
                    controls
                    {...NewFrameModal.props}
                />
            </NewFrameModal.content>
        </>
    )
}

function AnimationForm({animation, spriteIndex, save, close, isValid}) {
    const update = useComponentUpdate();

    const animationIndex = useMemo(
        () => {
            const animationIndex = new AnimationIndex(spriteIndex, {animations: []});
            animationIndex.setEntityObject({...animation, index: 0});
            animationIndex.addListener(update);
            return animationIndex
        },
        [animation]
    );

    const frameIndex = useMemo(
        () => {
            return new FrameIndex(animation, spriteIndex, animation.sizeX, animation.sizeY)
        },
        [animation]
    );

    const name = animationIndex.getEntityValue(0);
    const canSave = () => name !== '' && isValid(name);

    return (
        <>
            <Stack vertical border fullHeight>
                <Content>
                    <AnimationProps canSave={canSave} animationIndex={animationIndex} />
                </Content>
                <Stack border flex>
                    <Content flex>
                        <EditorCtx>
                            <FrameManager frameIndex={frameIndex} />
                        </EditorCtx>
                    </Content>
                    <PreviewAnimation animationIndex={animationIndex} frameIndex={frameIndex} spriteIndex={spriteIndex} />
                </Stack>
                <Content padded>
                    <Stack>
                        <button disabled={!canSave()} onClick={e => save({
                            ...animationIndex.getEntityObject(0),
                            frames: [...frameIndex.getPropValues('value')]
                        })}>OK</button>
                        <button onClick={e => close()}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </>
    )
}

function AnimationProps({animationIndex, canSave}) {
    const animation = animationIndex.getEntityObject(0);
    const dirOptions = {
        0: 'Forward',
        1: 'Backward',
        2: 'Forward Backward',
        3: 'Backward Forward'
    };
    const endOptions = {
        0: 'Loop',
        1: 'Stop',
        2: 'Destroy'
    };
    const setProp = (prop, value) => {
        animationIndex.setEntityPropValue(0, prop, value);
    };

    return (
        <Content padded>
            <PropertyGrid>
                <TextFieldProp invalid={!canSave()} name="Name" value={animation.value} set={value => animationIndex.setEntityObject({...animationIndex.getEntityObject(0), value}, true)} />
                <RadioProp name="Direction" options={dirOptions} value={animation.dir} set={value => setProp( 'dir', parseInt('' + value, 10))}  />
                <RadioProp name="End" options={endOptions} value={animation.end} set={value => setProp( 'end', parseInt('' + value, 10))}  />
                <CheckboxProp name="Synchronous" value={animation.synchronous} set={value => setProp( 'synchronous', value)} />
            </PropertyGrid>
        </Content>
    )
}

function PlayerCanvas({player, width, height, spriteIndex}) {
    const update = useComponentUpdate();
    const mounted = useMounted();
    const lastRef = useRef(null);
    const lastPlayer = useRef(null);
    lastPlayer.current = player;

    useEffect(() => {
        const run = () => {
            lastRef.current = requestAnimationFrame(() => {
                if (lastPlayer.current !== player && !mounted.current) {
                    return;
                }
                if (!player.isPaused()) {
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
            if (frame === null) {
                return;
            }
            spriteIndex.drawEntity(ctx, spriteIndex.getEntityByPropValue('value', frame.id) , 0, 0, {width, height});
        }} />
    )
}

function PreviewAnimation({frameIndex, animationIndex}) {
    useUpdateOnEntityIndexChanges(frameIndex);

    const [stopped, setStopped] = useState(false);
    const [speed, setSpeed] = useState(0.1);

    const player = new BitmapPlayer();
    const frames = frameIndex.getPropValues('value');
    const dir = animationIndex.getEntityPropValue(0, 'dir');
    const end = animationIndex.getEntityPropValue(0, 'end');
    player.loadAnimation(frames, end, dir);
    player.setSpeed(speed);

    if (stopped) {
        player.pause();
    }

    const toggleStopped = () => {
        setStopped(!stopped)
    };

    return (
        <Section name="Preview">
            <Content>
                <Stack vertical>
                    <Centered flex>
                        <PlayerCanvas height={200} width={200} spriteIndex={animationIndex.index} player={player} />
                    </Centered>
                    <Content padded>
                        <Stack align="center">
                            <ActionBox click={toggleStopped} material>{stopped ? 'play_arrow' : 'stop'}</ActionBox>
                        </Stack>
                    </Content>
                    <Content padded><Range value={speed} set={value => setSpeed(parseFloat(value))} min={0.0} max={2.0} step={0.01} /></Content>
                </Stack>
            </Content>
        </Section>
    );
}

function AnimationManager({animationIndex, spriteIndex}) {
    const eContext = useContext(EditorContext);

    const EditAnimationModal = useModal();

    const actions = [];
    const addAnimation = () => {
    };

    const editAnimation = index => {
        const animation = animationIndex.getEntityObject(index);
        EditAnimationModal.open({
            name: animationIndex.getEntityValue(index),
            spriteIndex,
            animation,
            isValid: value => animation.value === value || !animationIndex.hasPropValue('value', value),
            save: newAnimation => {
                eContext.doAction(
                    () => {
                        animationIndex.setEntityObject({...newAnimation, index}, true);
                        d('STORE', index, newAnimation);
                    },
                    () => {
                        animationIndex.setEntityObject(animation, true);
                    }
                );
                EditAnimationModal.close();
            }
        });
    };

    return (
        <>
            <EntityManager
                entityIndex={animationIndex}
                actions={actions}
                titleHeight={20}
                bottomHeight={20}
                minWidth={100}
                filter
                player
                maxedZoom
                newItem={addAnimation}
                empty="No animations defined. Add new one"
                doubleClick={editAnimation}
                renderTitle={index => {
                    const name = animationIndex.getEntityValue(index);
                    return <Title maxWidth={100}>{name}</Title>
                }}
                renderBottom={index => {
                    const frames = animationIndex.getEntityPropValue(index, 'frames').length;
                    return <kbd className="less">Frames: {frames}</kbd>
                 }}
            />

            <EditAnimationModal.content name="Edit Animation" closeable width="1200" height="500">
                <AnimationForm {...EditAnimationModal.props} />
            </EditAnimationModal.content>
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
