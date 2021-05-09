import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { EditorSection, EditorContext, CellMarker, Toolbar, ToolGroup, Canvas, useModal, NameDialog, EntityStack, OkCancelForm, useUpdateOnEntityIndexChanges, PropertyGrid, EntityStackSections, Section, WindowContext} from "../components/BasicComponents";
import { DIR, Block, Grid, Stack, Overlays, Overlay } from "../components/LayoutComponents";
import {d, getBlockPos, getCanvasForDim} from "../helper/helper";
import {
    Checkbox,
    Input,
    InputProp,
    NumberProp,
    Number,
    RadioProp,
    Select,
    SelectProp,
    LabelProp,
    CheckboxProp,
    FullProp,
    Submit,
    Color,
    Button,
    TextArea,
    Tuple,
    TupleProp
} from "../components/FormComponents";
import { FontIndex, TextBlockIndex, FilterIndex } from "../classes/EntityIndex";

function FontProperties({ font, reserved, save, close }) {
    const [value, setValue] = useState(font.value);
    const [width, setWidth] = useState(font.width);
    const [height, setHeight] = useState(font.height);

    const saveFont = () => save({ ...font, value, width, height});

    return (
        <OkCancelForm submit save={saveFont} cancel={close} full>
            <Block full="h" padded>
                <PropertyGrid full="h" padded>
                    <InputProp name="ID:" full="h" required match={value => !reserved.includes(value)} value={value} set={setValue} />
                    <TupleProp name="Size:" x={width} setX={setWidth} min={1} max={128} y={height} setY={setHeight} />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function CharManager({ charIndex }) {
    const view = charIndex.getView(0, 10);
    const elems = [];
    for (let index of view.matches) {
        elems.push(<Block key={index} padded border>{charIndex.getEntityValue(index)}</Block>);
    }
    return (
        <Stack center vertical borders>
            <Stack padded gaps>{elems}</Stack>
            <Block>{view.matches.length + ' of ' + view.count}</Block>
        </Stack>
    )
}

function FontEditor({ fontIndex, blockIndex, activeFont, setActiveFont }) {
    const eContext = useContext(EditorContext);
    const wContext = useContext(WindowContext);

    const NewFontModal = useModal();

    useUpdateOnEntityIndexChanges(fontIndex);

    const currFont = fontIndex.getEntityObject(activeFont);

    const newFont = () => {
        const font = {value: 'MyNewId', map: [], width: 8, height: 8, image: null};
        NewFontModal.open({
            font,
            reserved: fontIndex.getPropValues('value'),
            save: newFont => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = fontIndex.setEntityObject(newFont);
                    },
                    () => {
                        fontIndex.deleteEntity(index);
                    }
                );
                setActiveFont(fontIndex.getLength() - 1);
                NewFontModal.close()
            }
        });
    };

    const deleteFont = () => {
        const oldEntity = fontIndex.getEntityObject(activeFont);
        eContext.doAction(
            () => fontIndex.deleteEntity(oldEntity.index),
            () => {fontIndex.setEntityObject(oldEntity); blockIndex.model.blocks}
        );
        wContext.clearEditor('preview');
    };

    return (
        <Stack vertical full>
            <Stack full>
                <Section inner
                         name="Fonts" size={250} maxWidth="33%" collapse="h" full="v">
                    <EntityStack
                        area={3} entityIndex={fontIndex} getInfo={obj => 'Size: ' + obj.width + 'x' + obj.height}
                        active={activeFont} setActive={setActiveFont}
                        addOp={newFont} deleteOp={deleteFont}
                        emptyText="Add new Font"
                    />
                </Section>

                <Section inner full name="Characters">
                    {currFont.chars && <CharManager charIndex={currFont.chars} />}
                </Section>

                <NewFontModal.content name="New Font" width={250}>
                    <FontProperties { ...NewFontModal.props } />
                </NewFontModal.content>
            </Stack>

        </Stack>
    )
}

function FiltersModal({ save, close, model }) {
    const [activeFilter, setActiveFilter] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [background, setBackground] = useState('#000000');

    const filterIndex = useMemo(() => {
        return new FilterIndex(model);
    }, [model]);

    return (
        <OkCancelForm full save={save} cancel={close}>
            <Stack full>
                <Section inner full="v" inner collapse="h" size={200} name="Filters">
                    Here are the Filters...
                </Section>
                <EntityStackSections
                    sectionProps={{inner: true, name: 'Pipeline', size: 200, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    detailProps={{inner: true, name: 'Filter Properties', size: 200, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    entityIndex={filterIndex}
                    clone order
                    emptyText="Add new filter from the left side"
                    active={activeFilter} setActive={setActiveFilter}
                >
                    <Block centerItems>Props go here</Block>
                </EntityStackSections>
                <Section inner full name="Preview">
                    <Stack vertical full>
                        <Toolbar>
                            <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={9} />
                            <Color name="Background:" value={background} set={setBackground} />
                        </Toolbar>
                        <Block full centerItems>
                            Here we go again!
                        </Block>
                    </Stack>
                </Section>
            </Stack>
        </OkCancelForm>
    )
}

function TextBlockEditor({ blockIndex, fontIndex, activeFont }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const NewBlockModal = useModal();
    const FilterModal = useModal();

    const [activeBlock, setActiveBlock] = useState(0);
    const [background, setBackground] = useState('#000000');
    const [zoom, setZoom] = useState(1);
    const [marker, setMarker] = useState(true);
    const [highlight, setHighlight] = useState(false);
    const [width, setWidth] = useState(320);
    const [height, setHeight] = useState(200);
    const screenRef = useRef(null);
    const onMoveRef = useRef(null);

    useUpdateOnEntityIndexChanges(blockIndex);
    useUpdateOnEntityIndexChanges(fontIndex);

    const blockRef = useRef(null);
    blockRef.current = blockIndex.getEntityObject(activeBlock);

    const imagesRef = useRef({});

    const alignOptions = [
        {id: 'left', name: 'format_align_left'},
        {id: 'center', name: 'format_align_center'},
        {id: 'right', name: 'format_align_right'}
    ];

    // TODO use from config
    const fieldProps = {
        x: {min: -1000, max: 1000},
        y: {min: -1000, max: 1000}
    };

    const setEntityProp = prop => {
        return value => {
            blockIndex.setEntityPropValue(activeBlock, prop, value);
            if (['font', 'text', 'textAlign', 'lineSpacing', 'filters'].includes(prop)) {
                delete imagesRef.current[blockIndex.getEntityValue(activeBlock)];
            }
            blockIndex.notify();
        };
    };

    const fontOptions = [];
    const values = fontIndex.getPropValues('value');
    for (let value of values) {
        fontOptions.push({id: value, name: value});
    }

    const currBlock = blockRef.current;

    const changeFilter = () => {
        FilterModal.open({

        });
    };

    const clearFilter = () => {
        const redoValue = currBlock.filters;
        const index = currBlock.index;
        eContext.doAction(
            () => blockIndex.setEntityPropValue(index, 'filters', ''),
            () => blockIndex.setEntityPropValue(index, 'filters', redoValue)
        )
    };

    const newBlock = () => {
        NewBlockModal.open({
            reserved: blockIndex.getPropValues('value'),
            save: value => {
                let index = null;
                const font = fontIndex.getEntityValue(activeFont);
                eContext.doAction(
                    () => index = blockIndex.setEntityObject({
                        value,
                        text: '',
                        font,
                        lineSpacing: 0,
                        autoCenteringX: false,
                        autoCenteringY: false,
                        alignToGrid: false,
                        textAlign: 'left',
                        filters: '',
                        x: 0,
                        y: 0,

                    }),
                    () => blockIndex.deleteEntity(index)
                );
                setActiveBlock(blockIndex.getLength() - 1);
                NewBlockModal.close();
            }
        })
    };

    const fontEntities = fontIndex.getEntityObjects();
    const fonts = {};
    for (let item of fontEntities) {
        fonts[item.value] = item;
    }

    const getBlockDim = block => {
        const font = fonts[block.font];
        const lines = block.text.split('\n');
        let maxLen = 0;
        for (let line of lines) {
            maxLen = Math.max(maxLen, line.length);
        }
        const spacing = lines.length <= 1 ? 0 : (lines.length - 1) * block.lineSpacing;
        return {
            lines,
            maxLen,
            width: maxLen * font.width,
            height: lines.length * font.height + spacing
        };
    };

    const getBlockImage = block => {
        if (!imagesRef.current[block.value]) {
            const dim = getBlockDim(block);
            let canvas = null;
            if (dim.maxLen > 0 && dim.lines.length > 0) {
                canvas = getCanvasForDim(dim.width, dim.height);
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                imagesRef.current[block.value] = canvas
            }
        }
        return imagesRef.current[block.value]
    };

    const applyActual = () => {
        const doX = actual.x;
        const doY = actual.y;
        const undoX = currBlock.x;
        const undoY = currBlock.y;
        const id = activeBlock;
        eContext.doAction(
            () => {
                blockIndex.setEntityPropValue(id, 'x', doX);
                blockIndex.setEntityPropValue(id, 'y', doY);
                blockIndex.notify();
            },
            () => {
                blockIndex.setEntityPropValue(id, 'x', undoX);
                blockIndex.setEntityPropValue(id, 'y', undoY);
                blockIndex.notify();
            }
        );
    };

    if (fontIndex.getLength() === 0) {
        return (
            <Block center className="less">Preview will be available once you add a font</Block>
        )
    }

    const getActualBlockPos = (block, dim) => {
        let x = block.autoCenteringX ?
            Math.ceil(width / 2) - Math.ceil(dim.width / 2) : block.x;

        let y = block.autoCenteringY ?
            Math.ceil(height / 2) - Math.ceil(dim.height / 2) : block.y;

        if (block.alignToGrid) {
            const font = fonts[block.font];
            x = Math.floor(x / font.width) * font.width;
            y = Math.floor(y / font.height) * font.height;
        }
        return {x, y}
    };

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
                    blockIndex.setEntityPropValue(activeBlock, 'x', newX);
                    lastX = newX;
                    changed = true;
                }
            }
            const deltaY = currY - lastY;
            if (deltaY !== 0) {
                const newY = Math.max(fieldProps.y.min, Math.min(cBlock.y + deltaY, fieldProps.y.max)) + offsetY;
                if (newY !== cBlock.y) {
                    blockIndex.setEntityPropValue(activeBlock, 'y', newY);
                    lastY = newY;
                    changed = true;
                }
            }
            if (changed) {
                blockIndex.notify();
            }
                e.stopPropagation();
                e.preventDefault();
        });
        wContext.addEventListener('mouseup', () => {
            eContext.doAction(
                () => {
                    blockIndex.setEntityPropValue(activeBlock, 'x', lastX);
                    blockIndex.setEntityPropValue(activeBlock, 'y', lastY);
                    blockIndex.notify();
                },
                () => {
                    blockIndex.setEntityPropValue(activeBlock, 'x', undoX);
                    blockIndex.setEntityPropValue(activeBlock, 'y', undoY);
                    blockIndex.notify();
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
        let i = blockIndex.getLength() - 1;
        let found = false;
        while(!found && i >= 0) {
            const block = blockIndex.getEntityObject(i);
            const img = getBlockImage(block);
            if (img) {
                const pos = getActualBlockPos(block, img);
                if (pos.x <= clickX && clickX <= (pos.x + img.width - 1) &&
                    pos.y <= clickY && clickY <= (pos.y + img.height - 1)) {
                    found = true;
                    break;
                }
            }
            i--;
        }
        if (found) {
            setActiveBlock(i);
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
    let moveCursor = 'move';
    if (currBlock.autoCenteringY || currBlock.autoCenteringX) {
        if (!currBlock.autoCenteringX) {
            moveCursor = 'ew-resize'
        } else if (!currBlock.autoCenteringY) {
            moveCursor = 'ns-resize'
        } else {
            moveCursor = 'not-allowed'
        }
    }

    const renderScreen = ctx => {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width * zoom, height * zoom);

        const blocks = blockIndex.getEntityObjects();
        for (let block of blocks) {
            const image = getBlockImage(block);
            if (!image) continue;

            const actual = getActualBlockPos(block, image);
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                actual.x * zoom,
                actual.y * zoom,
                image.width * zoom,
                image.height * zoom
            );
        }
    };
    const dim = getBlockDim(currBlock);
    const actual = getActualBlockPos(currBlock, dim);
    const font = fonts[currBlock.font];

    return (
        <Stack full>
            <EntityStackSections
                sectionProps={{inner: true, name: 'Text Blocks', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                detailProps={{inner: true, name: 'Text Block Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                entityIndex={blockIndex}
                deselect addOp={newBlock} clone order
                emptyText="Add new block"
                active={activeBlock} setActive={setActiveBlock}
            >
                {currBlock === null ?
                    <Block center className="less">No block selected</Block> :
                    <Block padded full="h" scroll>
                        <Grid gaps columns="90px *" full="h">
                            <SelectProp name="Font:" full="h" undo="font" options={fontOptions} value={currBlock.font} set={setEntityProp('font')} />
                            <TupleProp name="Position:" undo="position"
                               x={currBlock.x} setX={setEntityProp('x')} minX={fieldProps.x.min} maxX={fieldProps.x.max} stepX={currBlock.alignToGrid ? font.width : 1} disabledX={currBlock.autoCenteringX}
                               y={currBlock.y} setY={setEntityProp('y')} minY={fieldProps.y.min} maxY={fieldProps.y.max} stepY={currBlock.alignToGrid ? font.height : 1} disabledY={currBlock.autoCenteringY}
                            />
                            <LabelProp name="- actual:">
                                <Stack gaps="1" wrap full="h">
                                    <Tuple readOnly
                                           minX={fieldProps.x.min} maxX={fieldProps.x.max}
                                           minY={fieldProps.y.min} maxY={fieldProps.y.max}
                                           x={actual.x} y={actual.y}
                                    />
                                    <Button name="Apply" center="v" padded="h" onClick={applyActual} />
                                </Stack>
                            </LabelProp>
                            <NumberProp name="Line Spacing:" undo={'spacing' + currBlock.id} value={currBlock.lineSpacing} set={setEntityProp('lineSpacing')} />
                            <LabelProp name="Auto Centering:">
                                <Stack gaps>
                                    <Checkbox name="X" undo="center-x" value={currBlock.autoCenteringX} set={setEntityProp('autoCenteringX')} />
                                    <Checkbox name="Y" undo="center-y" value={currBlock.autoCenteringY} set={setEntityProp('autoCenteringY')} />
                                </Stack>
                            </LabelProp>
                            <CheckboxProp name="Align to grid:" undo="alignGrid" value={currBlock.alignToGrid} set={setEntityProp('alignToGrid')} />
                            <RadioProp undo="textalign" name="Text Align:" options={alignOptions} gaps="1" icon value={currBlock.textAlign} set={setEntityProp('textAlign')} />
                            <FullProp name="Text:">
                                <TextArea undo="text" value={currBlock.text} set={setEntityProp('text')} full="h" rows={5} />
                            </FullProp>
                            <LabelProp name="Filters:">
                                <Stack full="h" minWidth={100}>
                                    <Block full tab onClick={changeFilter} onKeyDown={e => e.keyCode === 32 ? changeFilter() : null}>
                                        <Input full="h" readOnly value={currBlock.filters} />
                                    </Block>
                                    <Button icon="clear" onClick={clearFilter} />
                                </Stack>
                            </LabelProp>
                        </Grid>
                    </Block>
                }
            </EntityStackSections>

            <Section name="Screen" full inner>
                <Stack vertical full borders>
                    <Toolbar>
                        <ToolGroup>
                            <Tuple name="Size:" x={width} setX={setWidth} y={height} setY={setHeight} />
                            <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={9} />
                            <Color name="Background:" value={background} set={setBackground} />
                        </ToolGroup>
                        <Checkbox name="Show marker" value={marker} set={setMarker} />
                    </Toolbar>
                    <Block full centerItems>
                        <Overlays className="thin-boxed" width={width * zoom} height={height * zoom}>
                            <Overlay>
                                <Canvas render={renderScreen} width={width * zoom} height={height * zoom} />
                            </Overlay>
                            <Overlay width={width * zoom} height={width * zoom}>
                                <Block ref={screenRef} full onMouseDown={activateByClick}>
                                    {marker &&
                                        <CellMarker
                                            blink
                                            posX={actual.x}
                                            posY={actual.y}
                                            zoom={zoom}
                                            moveCursor={moveCursor}
                                            xdir={
                                                (DIR.BOTTOM & (currBlock.y + dim.height < height)) |
                                                DIR.TOP |
                                                DIR.LEFT |
                                                (DIR.RIGHT & (currBlock.x + dim.width < width))
                                            }
                                            width={Math.min(dim.width, width - currBlock.x)}
                                            height={Math.min(dim.height, height - currBlock.y)}
                                            onMove={onMove}
                                            highlight={highlight}
                                        />
                                    }
                                </Block>
                            </Overlay>
                        </Overlays>
                    </Block>
                </Stack>
            </Section>

            <NewBlockModal.content name="New Text Block" width={250}>
                <NameDialog { ...NewBlockModal.props } />
            </NewBlockModal.content>

            <FilterModal.content name="Filter" width="75%" height="75%">
                <FiltersModal { ...FilterModal.props } />
            </FilterModal.content>
        </Stack>
    )
}

function TextPaneEditor({ model }) {
    const wContext = useContext(WindowContext);

    const [activeFont, setActiveFont] = useState(0);

    const fontIndex = useMemo(() => {
        return new FontIndex(model);
    }, [model]);

    const blockIndex = useMemo(() => {
        return new TextBlockIndex(model)
    }, [model]);

    return (
        <Stack full vertical gaps>
            <EditorSection id="pane" area={1} link={3} full="h" centerItems size={300} maxSize={400} name="TextPane"
                           actions={
                               [
                                   {name: 'Revert', onClick: () => d('REVERT!')},
                                   {name: 'Save',
                                       disabled: eContext => eContext.hasStorePos(),
                                       onClick: eContext => {
                                           eContext.updateRestorePos()
                                       }
                                   },
                                   {name: 'Deploy', onClick: () => {d('DEPLOY!'); wContext.clearEditor('preview')}},
                                   {name: 'Export', onClick: () => d('EXPORT!')},
                               ]
                           }>
                <FontEditor full fontIndex={fontIndex} blockIndex={blockIndex} activeFont={activeFont} setActiveFont={setActiveFont} />
            </EditorSection>

            <EditorSection id="preview" area={2} full name="Preview" actions={
                [
                    {name: 'Export', onClick: () => d('EXPORT!')}
                ]
            }>
                <TextBlockEditor full blockIndex={blockIndex} fontIndex={fontIndex} activeFont={activeFont} />

            </EditorSection>
        </Stack>
    )
}

export {
    TextPaneEditor
}