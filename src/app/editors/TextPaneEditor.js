import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import {
    EditorSection,
    Kbd,
    CenterInfo,
    EditorContext,
    Toolbar,
    ToolGroup,
    Canvas,
    useModal,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    PropertyGrid,
    Section,
    WindowContext,
} from "../components/BasicComponents";
import { DIR, Block, Grid, Stack, Overlays, Overlay } from "../components/LayoutComponents";
import { d, getCanvasForDim, getEmptyImageData, getColorsFromImageData, getColorsFromCanvas } from "../helper/helper";
import {
    useExportModal,
    NameDialog,
    FiltersModal,
    BitmapSelector,
    ResizeProps,
    BitmapEditor
} from "../components/EditorComponents";
import {
    Checkbox,
    Input,
    InputProp,
    KeyInput,
    NumberProp,
    Number,
    RadioProp,
    SelectProp,
    LabelProp,
    CheckboxProp,
    FullProp,
    Color,
    Button,
    TextArea,
    Tuple,
    TupleProp,
    BitmapProp,
    Hidden,
    OkCancelForm
} from "../components/FormComponents";
import { AssignIndex, FontIndex, CharIndex, TextBlockIndex, ColorIndex } from "../classes/EntityIndex";
import { EntityStack, EntityStackSections, EntityManager } from "../components/EntityComponents";
import { GridCellMarker } from "../components/GridComponents";

function FontProperties({ font, reserved, save, close }) {
    const ImportFontModal = useModal();

    const [value, setValue] = useState(font.value);
    const [width, setWidth] = useState(font.width);
    const [height, setHeight] = useState(font.height);
    const [newWidth, setNewWidth] = useState(font.width);
    const [newHeight, setNewHeight] = useState(font.height);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [images, setImages] = useState(null);

    const saveFont = () => save(
        { ...font,
            newWidth, newHeight, offsetX, offsetY,
            value, images, width, height
        }
    );

    const importFont = () => {
        ImportFontModal.open({
            selection: {
                multi: true,
                unfix: true
            },
            save: bitmaps => {
                setWidth(bitmaps[0].width);
                setHeight(bitmaps[0].height);
                setImages(bitmaps);
                ImportFontModal.close()
            }
        });
    };
    const selectSize = () => {
        ImportFontModal.open({
            selection: {},
            save: bitmap => {
                setWidth(bitmap.width);
                setHeight(bitmap.height);
                ImportFontModal.close()
            }
        })
    };

    return (
        <OkCancelForm submit save={saveFont} cancel={close} full>
            <Block full="h" padded>
                <PropertyGrid full="h" padded>
                    <InputProp name="ID:" full="h" required match={value => !reserved.includes(value)} value={value} set={setValue} />
                    {font.index === undefined &&
                        <LabelProp name="Size:">
                            <Stack gaps vertical>
                                <Tuple x={width} setX={setWidth} min={1} max={128} y={height} setY={setHeight} disabled={images !== null} />
                                {images ?
                                    <Stack gaps>
                                        <Block center="v" border="1" padded>{images.length} imported chars</Block>
                                        <Button icon="clear" onClick={() => setImages(null)} />
                                    </Stack> :
                                    <Stack gaps="1">
                                        <Button name="Select" padded="h" onClick={selectSize} />
                                        <Button name="Import" padded="h" onClick={importFont} />
                                    </Stack>
                                }
                            </Stack>
                        </LabelProp>
                    }
                    {font.index !== undefined &&
                        <ResizeProps
                            width={width} height={height}
                            maxWidth={128} maxHeight={128}
                            newWidth={newWidth} newHeight={newHeight}
                            setNewWidth={setNewWidth} setNewHeight={setNewHeight}
                            offsetX={offsetX} offsetY={offsetY}
                            setOffsetX={setOffsetX} setOffsetY={setOffsetY}
                        />
                    }
                </PropertyGrid>
            </Block>

            <ImportFontModal.content name="Select Size" full>
                <BitmapSelector { ...ImportFontModal.props } />
            </ImportFontModal.content>
        </OkCancelForm>
    )
}

function CharAssignments({ close, save, assignIndex }) {

    useUpdateOnEntityIndexChanges(assignIndex);

    const [pos, setPos] = useState(0);
    const [page, setPage] = useState(1);

    const managerRef = useRef(null);

    const values = assignIndex.getPropValues('value');

    const setValueAtIndex = (index, value) => {
        if (value !== '') {
            const oldIndex = assignIndex.getEntityByPropValue('value', value);
            if (oldIndex !== null) {
                assignIndex.setEntityPropValue(oldIndex, 'value', '');
            }
        }
        assignIndex.setEntityPropValue(index, 'value', value);
        values[index] = value;
        return value;
    };

    const autoFill = index => {
        const leftValues = index === 0 ? [] : values.slice(0, index);
        for(let i = 0; i < leftValues.length; i++) {
            leftValues[i] = leftValues[i].charCodeAt(0);
        }
        let currCode = values[index].charCodeAt(0);
        for (let i = index + 1; i < values.length; i++) {
            currCode++;
            setValueAtIndex(i, String.fromCharCode(currCode));
        }
        assignIndex.notify();
        focusNextFrom(values.length - 1);
    };

    const focusRelIndex = index => {
        const inputs = managerRef.current.querySelectorAll('.assign');
        if (inputs.length > index) {
            const focusElem = inputs[index];
            if (focusElem) {
                requestAnimationFrame(
                    () => {
                        focusElem.focus()
                    }
                )
            }
        }
    };

    const setFocusIndex = index => {
        if (index === -1) {
            let elem = managerRef.current;
            while (elem && !elem.classList.contains('form')) {
                elem = elem.parentNode;
            }
            if (elem) {
                const focusElem = elem.querySelector('.submit');
                if (focusElem) {
                    requestAnimationFrame(
                        () => {
                            focusElem.focus()
                        }
                    )
                }
            }
        } else {
            const relIndex = index - pos;
            if (relIndex < 0 || relIndex > (page - 1)) {
                const newPos = Math.min(values.length - page, index);
                if (pos !== newPos) {
                    setPos(newPos);
                    requestAnimationFrame(() => {
                        focusRelIndex(index - newPos);
                    });
                }
            } else {
                focusRelIndex(relIndex);
            }
        }
    };

    const focusNextFrom = from => {
        if (values[from] === '') {
            setFocusIndex(from);
        } else {
            let next = from + 1;
            if (values.length === next) {
                next = values.indexOf('');
            }
            setFocusIndex(next);
        }
    };

    const doSave = () => {
        save(assignIndex.getEntityObjects())
    };

    return (
        <OkCancelForm submit full cancel={close} save={doSave}>
            <Block full ref={managerRef}>
                <EntityManager
                    pos={pos}
                    page={page}
                    setPos={setPos}
                    setPage={setPage}
                    minWidth={82}
                    readOnly
                    auto
                    entityIndex={assignIndex}
                    titleHeight={60}
                    renderTitle={index => {
                        const char = assignIndex.getEntityValue(index);
                        return (
                            <Stack full="h" padded gaps>
                                <Block center="v">
                                    <KeyInput
                                        key={index}
                                        value={char}
                                        onInput={() => focusNextFrom(index)}
                                        set={value => setValueAtIndex(index, value)}
                                        className={"assign" + (index === pos ? ' autofocus' : '')}
                                    />
                                </Block>
                                <Button
                                    icon="more_horiz"
                                    disabled={char === '' || index === values.length - 1}
                                    onClick={() => autoFill(index)}
                                />
                            </Stack>
                        )}
                    }
                />
            </Block>
            <Hidden invalid={assignIndex.hasPropValue('value', '')} />
        </OkCancelForm>
    )
}

function CharProperties({ charIndex, char, save, close }) {
    const [value, setValue] = useState(char.value);
    const [image, setImage] = useState(char.image);

    const saveChar = () => save({
        value,
        image
    });
    const colors = new ColorIndex({colors: getColorsFromCanvas(charIndex.img)});
    return (
        <OkCancelForm submit save={saveChar} cancel={close} full>
            <Block full="h" padded>
                <PropertyGrid full="h" padded>
                    <LabelProp name="Char:">
                        <Stack gaps>
                            <Input min={1} max={1} value={value} set={setValue} className="padded-h" />
                            {value && <Block center="v"><Kbd value={value.charCodeAt(0)} /></Block>}
                        </Stack>
                    </LabelProp>
                    <InputProp name="Code:"
                       value={value ? '' + value.charCodeAt(0) : ''}
                       min={1} max={4}
                       set={code => setValue(code ? String.fromCharCode(code) : '')}
                       className="padded-h"
                    />
                    <BitmapProp name="Image:" zoomOrAvail={10} value={image} colors={colors} set={setImage} width={charIndex.getSizeX()} height={charIndex.getSizeY()} entityIndex={charIndex} />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function CharManager({ charIndex }) {
    const eContext = useContext(EditorContext);

    const CharPropsModal = useModal();
    const AssignCharsModal = useModal();
    const BitmapSelectorModal = useModal();
    const EditBitmapModal = useModal();

    const editChar = index => {
        const char = charIndex.getEntityObject(index);
        CharPropsModal.open({
            name: 'Edit char',
            charIndex,
            char,
            save: editChar => {
                saveAssignments([
                    {oldChar: char.value, value: editChar.value, image: editChar.image}
                ]);
                CharPropsModal.close()
            }
        });
    };

    const editBitmap = index => {
        const image = charIndex.getEntityPropValue(index, 'image');
        EditBitmapModal.open({
            image,
            colors: new ColorIndex({colors: getColorsFromCanvas(charIndex.img)}),
            save: newImage => {
                const undoImage = charIndex.getEntityPropValue(index, 'image');
                eContext.doAction(
                    () => {
                        charIndex.setEntityPropValue(index, 'image', newImage);
                        charIndex.notify();
                    },
                    () => {
                        charIndex.setEntityPropValue(index, 'image', undoImage);
                        charIndex.notify();
                    }
                );

                EditBitmapModal.close()
            }
        });
    };

    const addChar = () => {
        CharPropsModal.open({
            name: 'Add new char',
            charIndex,
            char: {
                value: '',
                image: getEmptyImageData(charIndex.getSizeX(), charIndex.getSizeY())
            },
            save: newChar => {
                saveAssignments([
                    {
                        value: newChar.value,
                        oldChar: '',
                        image: newChar.image
                    }
                ]);
                CharPropsModal.close()
            }
        });
    };
    const importChars = () => {
        const selected = images => {
            const chars = [];
            let index = 0;
            for(let image of images) {
                chars.push({
                    index,
                    value: '',
                    oldChar: '',
                    image
                });
                index++;
            }
            assignImagesToChars(chars);
            BitmapSelectorModal.close();
        };
        BitmapSelectorModal.open({
            selection: {
                type: 'rect',
                width: charIndex.getSizeX(),
                height: charIndex.getSizeY(),
                fixed: true,
                multi: true,
                doubleClick: selected
            },
            save: selected
        });
    };

    const reassignOp = indices => {
        indices = indices.sort((a, b) => a === b ? 0 : (a < b) ? -1 : 1);
        const items = [];
        for (let index of indices) {
            const char = charIndex.getEntityValue(index);
            items.push({
                image: charIndex.getEntityPropValue(index, 'image'),
                oldChar: char,
                value: '' // char
            });
        }
        assignImagesToChars(items)
    };

    const saveAssignments = items => {
        const newItems = [];
        const changeItems = [];
        const deleteIndices = [];
        const deleteChars = [];
        const backup = {};
        const newChars = [];

        for (let item of items) {
            newChars.push(item.value);
        }
        for (let item of items) {
            if (item.oldChar === item.value) {
                const index = charIndex.getEntityByPropValue('value', item.oldChar);
                backup[item.value] = charIndex.getEntityPropValue(index, 'image');
                changeItems.push(
                    {index, value: item.value, image: item.image}
                );
                continue;
            }

            const newIndex = charIndex.getEntityByPropValue('value', item.value);

            if (newIndex !== null) {
                backup[item.value] = charIndex.getEntityPropValue(newIndex, 'image');
                changeItems.push(
                    {index: newIndex, value: item.value, image: item.image}
                );
            } else {
                newItems.push(
                    {value: item.value, image: item.image}
                );
            }

            if (item.oldChar !== '' && !newChars.includes(item.oldChar)) {
                const oldIndex = charIndex.getEntityByPropValue('value', item.oldChar);
                backup[item.oldChar] = charIndex.getEntityPropValue(oldIndex, 'image');
                deleteIndices.push(oldIndex);
                deleteChars.push(item.oldChar);
            }
        }

        eContext.doAction(
            () => {
                charIndex.setEntityObjects(changeItems, true);
                if (deleteIndices) {
                    charIndex.deleteEntities(deleteIndices);
                }
                charIndex.setEntityObjects(newItems);
            },
            () => {
                const undoIndices = [];
                for (let item of newItems) {
                    undoIndices.push(charIndex.getEntityByPropValue('value', item.value));
                }
                charIndex.deleteEntities(undoIndices);

                const items = [];
                for (let char of deleteChars) {
                    items.push({image: backup[char], value: char});
                }
                charIndex.setEntityObjects(items);
                const undoItems = [];
                for (let item of changeItems) {
                    undoItems.push({...item, image: backup[item.value]});
                }
                charIndex.setEntityObjects(undoItems, true);
            }
        );
    };

    const assignImagesToChars = chars => {
        const assignIndex = new AssignIndex(charIndex.getSizeX(), charIndex.getSizeY());
        assignIndex.setEntityObjects(chars);
        AssignCharsModal.open({
            assignIndex,
            save: images => {
                saveAssignments(images);
                AssignCharsModal.close();
            }
        })
    };

    return (
        <>
            <EntityManager
                filter auto undo
                emptyText="No chars yet, please add or import chars by clicking on the icons on the left side"
                entityIndex={charIndex}
                addOp={addChar}
                editOp={editChar}
                importOp={importChars}
                reassignOp={reassignOp}
                minWidth={90}
                titleHeight={41}
                onDoubleClick={editChar}
                onRightClick={editBitmap}
                renderTitle={
                    index => {
                        const code = charIndex.getEntityValue(index).charCodeAt(0);
                        return (
                            <Stack full="h" padded>
                                <Block full="h">
                                    <Kbd className="padded input" value={'&#' + code + ';'} />
                                </Block>
                                <Block>
                                    <Kbd value={code} />
                                </Block>
                            </Stack>
                        );
                    }
                }
            />

            <CharPropsModal.content name={CharPropsModal.props.name} width={250}>
                <CharProperties { ...CharPropsModal.props } />
            </CharPropsModal.content>

            <AssignCharsModal.content name="Assign Images to Chars" width="75%" height={290}>
                <CharAssignments { ...AssignCharsModal.props } />
            </AssignCharsModal.content>

            <BitmapSelectorModal.content name="Select Image" full>
                <BitmapSelector { ...BitmapSelectorModal.props } />
            </BitmapSelectorModal.content>

            <EditBitmapModal.content name="Edit Char" full>
                <BitmapEditor { ...EditBitmapModal.props } />
            </EditBitmapModal.content>
        </>
    )
}

function FontEditor({ resource, fontIndex, blockIndex, activeFont, setActiveFont }) {
    const eContext = useContext(EditorContext);
    const wContext = useContext(WindowContext);

    const AssignCharsModal = useModal();
    const NewFontModal = useModal();

    useUpdateOnEntityIndexChanges(fontIndex);

    const currFont = activeFont !== null && fontIndex.getLength() ? fontIndex.getEntityObject(activeFont) : null;
    const currChars = currFont && currFont.chars;

    const newFont = () => {
        const font = {value: 'MyNewId', width: 8, height: 8, image: null};
        NewFontModal.open({
            name: 'New Font',
            font,
            reserved: fontIndex.getPropValues('value'),
            save: newFont => {
                let index = null;
                const fontConfig = new resource.config.deps.font({id: newFont.value, map: {}, width: newFont.width, height: newFont.height});
                fontConfig.setImage(
                    wContext.getNewImageResource('font_' + newFont.value + '$.png', newFont.width, newFont.height)
                );
                const fontJson = fontConfig.getJson();
                const chars = new CharIndex(fontJson);
                newFont.chars = chars;

                if (newFont.images) {
                    const assignIndex = new AssignIndex(newFont.width, newFont.height);
                    const chars = [];
                    for(let image of newFont.images) {
                       chars.push({value: '', oldChar: null, image});
                    }
                    assignIndex.setEntityObjects(chars);
                    AssignCharsModal.open({
                        assignIndex,
                        save: assigns => {
                            for(let assign of assigns) {
                                newFont.chars.setEntityObject({value: assign.value, image: assign.image});
                            }
                            eContext.doAction(
                                () => {
                                    index = fontIndex.setEntityObject(newFont);
                                },
                                () => {
                                    fontIndex.deleteEntity(index);
                                }
                            );
                            setActiveFont(fontIndex.getLength() - 1);
                            AssignCharsModal.close();
                        }
                    });
                } else {

                    eContext.doAction(
                        () => {
                            index = fontIndex.setEntityObject(newFont);
                        },
                        () => {
                            fontIndex.deleteEntity(index);
                        }
                    );
                    setActiveFont(fontIndex.getLength() - 1);
                }
                NewFontModal.close()
            }
        });
    };

    const deleteFont = () => {
        const oldEntity = fontIndex.getEntityObject(activeFont);
        eContext.doAction(
            () => {
                fontIndex.deleteEntity(oldEntity.index);
                if (!fontIndex.getLength()) {
                    blockIndex.deleteEntities(blockIndex.getAllIndices());
                }
            },
            () => fontIndex.setEntityObject(oldEntity)
        );
        wContext.clearEditor('preview');
    };

    const editFont = () => {
        const font = currFont;
        const reserved = [ ...fontIndex.getPropValues('value') ];
        reserved.splice(reserved.indexOf(font.value), 1);
        NewFontModal.open({
            name: 'Edit Font',
            font,
            reserved,
            save: editFont => {
                if (
                    editFont.width !== editFont.newWidth ||
                    editFont.height !== editFont.newHeight
                ) {
                    const undoObjects = editFont.chars.getEntityObjects();
                    const undoSizeX = editFont.width;
                    const undoSizeY = editFont.height;
                    eContext.doAction(
                        () => {
                            editFont.chars.resize(editFont.newWidth, editFont.newHeight, editFont.offsetX, editFont.offsetY);
                            fontIndex.setEntityObject(d({ ...editFont, width: editFont.newWidth, height: editFont.newHeight }), true);
                        },
                        () => {
                            editFont.chars.resize(undoSizeX, undoSizeY);
                            editFont.chars.setEntityObjects(undoObjects, true);
                        }
                    );
                }
                NewFontModal.close()
            }
        });
    };

    return (
        <Stack vertical full>
            <Stack full>
                <Section inner
                         name="Fonts" size={250} maxWidth="33%" collapse="h" full="v">
                    <EntityStack
                        area={3} entityIndex={fontIndex}
                        getInfo={obj => 'Size: ' + obj.width + 'x' + obj.height}
                        active={activeFont} setActive={setActiveFont}
                        editOp={editFont}
                        addOp={newFont} deleteOp={deleteFont} undo
                        emptyText="Add new Font"
                    />
                </Section>

                <Section inner full name="Characters">
                    {currChars && <CharManager charIndex={currChars} />}
                </Section>

                <NewFontModal.content name={NewFontModal.props.name} width={500}>
                    <FontProperties { ...NewFontModal.props } />
                </NewFontModal.content>

                <AssignCharsModal.content name="Assign Images to Chars" width="75%" height={290}>
                    <CharAssignments { ...AssignCharsModal.props } />
                </AssignCharsModal.content>
            </Stack>
        </Stack>
    )
}

function TextBlockEditor({ blockIndex, fontIndex, activeFont }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);

    const NewBlockModal = useModal();
    const FilterModal = useModal();

    const [activeBlock, setActiveBlock] = useState(blockIndex.getLength() ? 0 : null);
    const [background, setBackground] = useState('#000000');
    const [zoom, setZoom] = useState(1);
    const [marker, setMarker] = useState(true);
    const [highlight, setHighlight] = useState(false);
    const [width, setWidth] = useState(320);
    const [height, setHeight] = useState(200);
    const screenRef = useRef(null);
    const onMoveRef = useRef(null);

    useUpdateOnEntityIndexChanges(blockIndex);
    useUpdateOnEntityIndexChanges(fontIndex, () => imagesRef.current = {});

    const blockRef = useRef(null);
    blockRef.current = activeBlock === null || !blockIndex.getLength() ? null : blockIndex.getEntityObject(activeBlock);

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

    const invalidateBlockImage = index => {
        delete imagesRef.current[blockIndex.getEntityValue(index)];
    };

    const setEntityProp = prop => {
        return value => {
            blockIndex.setEntityPropValue(activeBlock, prop, value);
            if (['font', 'text', 'textAlign', 'lineSpacing', 'filters'].includes(prop)) {
                invalidateBlockImage(activeBlock)
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
        const undoFilters = currBlock.filters;
        const index = currBlock.index;

        FilterModal.open({
            images: [getBaseBlockImage(currBlock)],
            background,
            filters: undoFilters,
            save: newFilters => {
                eContext.doAction(
                    () => {
                        blockIndex.setEntityPropValue(index, 'filters', newFilters);
                        invalidateBlockImage(index);
                        blockIndex.notify()
                    },
                    () => {
                        blockIndex.setEntityPropValue(index, 'filters', undoFilters);
                        invalidateBlockImage(index);
                        blockIndex.notify()
                    }
                );
                FilterModal.close()
            }
        });
    };

    const clearFilter = () => {
        const redoValue = currBlock.filters;
        const index = currBlock.index;
        eContext.doAction(
            () => {
                blockIndex.setEntityPropValue(index, 'filters', '');
                invalidateBlockImage(index);
                blockIndex.notify()
            },
            () => {
                blockIndex.setEntityPropValue(index, 'filters', redoValue);
                invalidateBlockImage(index);
                blockIndex.notify()
            }
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
        if (!block) return null;

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

    const getBaseBlockImage = block => {
        const dim = getBlockDim(block);
        let canvas = null;
        if (dim.maxLen > 0 && dim.lines.length > 0) {
            canvas = getCanvasForDim(dim.width, dim.height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            const font = fonts[block.font].chars.model;
            const lines = block.text.split('\n');
            // process lines
            let posY = 0;
            for (let y = 0; y < lines.length; y++) {
                let line = lines[y];
                // do text align on current line
                if (block.textAlign !== 'left' && line.length < dim.maxLen) {
                    const pad = block.textAlign === 'right' ? dim.maxLen : (line.length + ((dim.maxLen - line.length) >> 1));
                    line = line.padStart(pad, ' ');
                }
                // draw each char in current line
                for (let x = 0; x < line.length; x++) {
                    const char = font.map[line[x]];
                    if (char) {
                        ctx.drawImage(
                            font.image,
                            char.x,
                            char.y,
                            font.width,
                            font.height,
                            x * font.width,
                            posY,
                            font.width,
                            font.height
                        );
                    }
                }
                posY += block.lineSpacing + font.height;
            }
        }
        return canvas;
    };

    const getBlockImage = block => {
        if (!imagesRef.current[block.value]) {
            let canvas = getBaseBlockImage(block);
            if (block.filters) {
                canvas = wContext.getFilteredCanvasData(block.filters, canvas)
            }
            imagesRef.current[block.value] = canvas
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

    const getActualBlockPos = (block, dim) => {
        if (!block) return null;

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
    if (currBlock && (currBlock.autoCenteringY || currBlock.autoCenteringX)) {
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
            if (!actual) continue;
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
    if (fontIndex.getLength() === 0) {
        return (
            <CenterInfo>Preview will be available once you add a font</CenterInfo>
        )
    }
    const dim = getBlockDim(currBlock);
    const actual = getActualBlockPos(currBlock, dim);
    const font = currBlock && fonts[currBlock.font];

    return (
        <Stack full>
            <EntityStackSections
                sectionProps={{inner: true, name: 'Text Blocks', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                detailProps={{inner: true, name: 'Text Block Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                entityIndex={blockIndex}
                deselect addOp={newBlock} del clone order undo
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
                                    <Button name="Apply" disabled={actual.x === currBlock.x && actual.y === currBlock.y} center="v" padded="h" onClick={applyActual} />
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
                                    <Button disabled={currBlock.filters === ''} icon="clear" onClick={clearFilter} />
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
                    <Block full centerItems padded scroll>
                        <Overlays className="thin-boxed" width={width * zoom} height={height * zoom}>
                            <Overlay>
                                <Canvas render={renderScreen} width={width * zoom} height={height * zoom} />
                            </Overlay>
                            <Overlay width={width * zoom} height={width * zoom}>
                                <Block ref={screenRef} full onMouseDown={activateByClick}>
                                    {marker && actual &&
                                        <GridCellMarker
                                            blink
                                            posX={actual.x}
                                            posY={actual.y}
                                            zoom={zoom}
                                            cursor={moveCursor}
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

// TODO: remove
function FastCanvas() {
    const sizeX = 2;
    const sizeY = 2;
    const cells = 100;
    const width = sizeX * cells;
    const height = sizeY * cells;
    const buffer = new ArrayBuffer((cells * cells) << 2);
    const colors32 = new Uint32Array(buffer);
    for (let y = 0; y < cells; y++ ) {
        for (let x = 0; x < cells; x++) {
            colors32[y * cells + x] = parseInt((x + y) % 2 === 0 ? 'F04040FF' : 'D0D0D0FF', 16);
        }
    }
    const render = ctx => {
        let pos = 0;
        let posY = 0;
        for (let y = 0; y < cells; y++) {
            let posX = 0;
            for (let x = 0; x < cells; x++) {
                ctx.fillStyle = '#' + colors32[pos].toString(16);
                ctx.fillRect(posX, posY, sizeX, sizeY);
                pos++;
                posX += sizeX;
            }
            posY += sizeY;
        }
    };
    return (
        <Block><Canvas border width={width} height={height} render={render} /></Block>
    );
}

function TextPaneEditor({ model, resource }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();

    const { getModelConfig, getModelResources, openExportModal, Modals } = useExportModal({ name: 'TextPane', model, resource });

    const [activeFont, setActiveFont] = useState(0);

    const fontIndex = useMemo(() => {
        return new FontIndex(model);
    }, [model]);

    const blockIndex = useMemo(() => {
        return new TextBlockIndex(model)
    }, [model]);

    return (
        <Stack full vertical gaps>
            <EditorSection
                id="pane" area={1} link={3} full="h" centerItems size={300} maxSize={400} name="TextPane"
                confirm
               actions={
                   eContextRef => {
                       return {
                           revert: () => d('REVERT!'),
                           save: {
                               can: () => !eContextRef.current.hasStorePos(),
                               exec: () => {
                                   wContext.storeScreenResource(wContext.game.currentScreen, getModelConfig());
                                   eContextRef.current.updateRestorePos();
                                   update();
                               }
                           },
                           deploy: {
                               can: () => eContextRef.current.hasStorePos(),
                               exec: () => {
                                    wContext.clearEditor('preview')
                               }
                           },
                           export: () => openExportModal()
                       }
                   }
               }>
                <FontEditor full resource={resource} fontIndex={fontIndex} blockIndex={blockIndex} activeFont={activeFont} setActiveFont={setActiveFont} />
            </EditorSection>

            <EditorSection id="preview" area={2} full name="Preview" actions={
                eContextRef => {
                    return {
                        export: () => {
                            const jsons = [];
                            for (let block of model.blocks) {
                                const obj = new resource.config.deps.block(block);
                                jsons.push(obj.getRebuildJson());
                            }
                            openExportModal(JSON.stringify(jsons, null, 4));
                        }
                    }
            }}>
                <TextBlockEditor full blockIndex={blockIndex} fontIndex={fontIndex} activeFont={activeFont} />
            </EditorSection>

            <Modals />

        </Stack>
    )
}

export {
    TextPaneEditor
}