import React, { useContext, useMemo, useState, useRef } from "react";
import { EditorSection, Kbd, EditorContext, useModal, useComponentUpdate, useUpdateOnEntityIndexChanges, PropertyGrid, Section, ButtonStack, WindowContext } from "../components/BasicComponents";
import { DIR, Block, Stack } from "../components/LayoutComponents";
import { d, RelativeBlock, getEmptyImageData, getColorsFromCanvas } from "../helper/helper.js";
import { useExportModal, NameDialog, ResizeProps, useFilterPipelineModal, useBitmapSelectionModal, useEditBitmapModal, ScreenBlocksGrid } from "../components/EditorComponents";
import { Checkbox, Input, InputProp, KeyInput, NumberProp, RadioProp, SelectProp, LabelProp, CheckboxProp, FullProp, Button, TextArea, Tuple, TupleProp, BitmapProp, Hidden, OkCancelForm } from "../components/FormComponents";
import { AssignIndex, FontIndex, CharIndex, TextBlockIndex, ColorIndex } from "../classes/EntityIndex";
import { EntityStack, EntityStackSections, EntityManager } from "../components/EntityComponents";

function FontProperties({ font, reserved, save, close }) {
    const { BitmapSelectionModal, openBitmapSelectionModal, closeBitmapSelectionModal } = useBitmapSelectionModal('Select Size');

    const [ value, setValue ] = useState(font.value);
    const [ width, setWidth ] = useState(font.width);
    const [ height, setHeight ] = useState(font.height);
    const [ newWidth, setNewWidth ] = useState(font.width);
    const [ newHeight, setNewHeight ] = useState(font.height);
    const [ offsetX, setOffsetX ] = useState(0);
    const [ offsetY, setOffsetY ] = useState(0);
    const [ images, setImages ] = useState(null);

    const saveFont = () => save(
        { ...font,
            newWidth, newHeight, offsetX, offsetY,
            value, images, width, height
        }
    );

    const importFont = () => {
        openBitmapSelectionModal({
            selection: {
                multi: true,
                unfix: true
            },
            save: bitmaps => {
                setWidth(bitmaps[0].width);
                setHeight(bitmaps[0].height);
                setImages(bitmaps);
                closeBitmapSelectionModal()
            }
        });
    };
    const selectSize = () => {
        openBitmapSelectionModal({
            selection: {},
            save: bitmap => {
                setWidth(bitmap.width);
                setHeight(bitmap.height);
                closeBitmapSelectionModal()
            }
        })
    };

    const buttons = [
        {name: 'Select', onClick: selectSize},
        {name: 'Import', onClick: importFont}
    ];

    return (
        <OkCancelForm submit save={saveFont} cancel={close} full>
            <Block full="h" padded scroll>
                <PropertyGrid full="h">
                    <InputProp name="ID:" full="h" maxWidth={250} required match={value => !reserved.includes(value)} value={value} set={setValue} />
                    {font.index === undefined &&
                        <LabelProp name="Size:">
                            <Stack gaps vertical>
                                <Tuple x={width} setX={setWidth} min={1} max={128} y={height} setY={setHeight} disabled={images !== null} />
                                {images ?
                                    <Stack gaps>
                                        <Block center="v" border="1" padded>{images.length} imported chars</Block>
                                        <Button icon="clear" onClick={() => setImages(null)} />
                                    </Stack> :
                                    <ButtonStack gaps="1" buttons={buttons} buttonProps={{padded: 'h'}} />
                                }
                            </Stack>
                        </LabelProp>
                    }
                    {font.index !== undefined &&
                        <ResizeProps
                            entityIndex={font.chars}
                            width={width} height={height}
                            maxWidth={128} maxHeight={128}
                            newWidth={newWidth} newHeight={newHeight}
                            setNewWidth={setNewWidth} setNewHeight={setNewHeight}
                            offsetX={offsetX} offsetY={offsetY}
                            setOffsetX={setOffsetX} setOffsetY={setOffsetY}
                        />
                    }
                </PropertyGrid>
                {BitmapSelectionModal}
            </Block>

        </OkCancelForm>
    )
}

function CharAssignments({ close, save, assignIndex }) {

    useUpdateOnEntityIndexChanges(assignIndex);

    const [ pos, setPos ] = useState(0);
    const [ page, setPage ] = useState(1);
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
    const { openBitmapSelectionModal, closeBitmapSelectionModal, BitmapSelectionModal } = useBitmapSelectionModal();
    const { openEditBitmapModal, closeEditBitmapModal, EditBitmapModal } = useEditBitmapModal('Edit char');

    const editChar = ({ marked }) => {
        const index = marked[0];
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
        openEditBitmapModal({
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

                closeEditBitmapModal()
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
            closeBitmapSelectionModal();
        };
        openBitmapSelectionModal({
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

    const assignIndices = indices => {
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

    const assignOp = ({ marked }) => {
        assignIndices([ ...marked ]);
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
                filter auto
                emptyText="No chars yet, please add or import chars by clicking on the icons on the left side"
                entityIndex={charIndex}

                addOp={addChar}
                editOp={editChar}
                importOp={importChars}
                assignOp={assignOp}
                copy swap clear delete apply

                minWidth={90}
                titleHeight={41}
                onDoubleClick={index => editChar({marked: [index]})}
                onRightClick={editBitmap}
                renderTitle={
                    index => {
                        const code = charIndex.getEntityValue(index).charCodeAt(0);
                        return (
                            <Stack full="h" padded>
                                <Block full="h">
                                    <Block padded={DIR.H} border="1" className="secondary-bg secondary-color"><Kbd value={'&#' + code + ';'} /></Block>
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

            {BitmapSelectionModal}
            {EditBitmapModal}
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
                            fontIndex.setEntityObject({ ...editFont, width: editFont.newWidth, height: editFont.newHeight }, true);
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
                <Section id="fonts" inner
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

                <NewFontModal.content name={NewFontModal.props.name}>
                    <FontProperties { ...NewFontModal.props } />
                </NewFontModal.content>

                <AssignCharsModal.content name="Assign Images to Chars" width="75%" height={290}>
                    <CharAssignments { ...AssignCharsModal.props } />
                </AssignCharsModal.content>
            </Stack>
        </Stack>
    )
}

function TextBlockEditor({ blockIndex, fontIndex, activeFont, ...props }) {
    const eContext = useContext(EditorContext);

    const [ activeBlock, setActiveBlock ] = useState(blockIndex.getLength() ? 0 : null);
    const [ background, setBackground ] = useState('#000000');
    const [ width, setWidth ] = useState(props.dim.x);
    const [ height, setHeight ] = useState(props.dim.y);
    const apiRef = useRef(null);

    const NewBlockModal = useModal();
    const { openFilterPipelineModal, closeFilterPipelineModal, FilterPipelineModal } = useFilterPipelineModal();

    useUpdateOnEntityIndexChanges(fontIndex, () => apiRef.current.cache.clear());
    useUpdateOnEntityIndexChanges(blockIndex);

    const fieldProps = {
        x: {min: -1000, max: 1000},
        y: {min: -1000, max: 1000}
    };

    const fontEntities = fontIndex.getEntityObjects();
    const fonts = {};
    for (let item of fontEntities) {
        fonts[item.value] = item;
    }

    const blockRef = useRef(null);
    blockRef.current = activeBlock === null || !blockIndex.getLength() || !blockIndex.hasIndex(activeBlock) ? null : blockIndex.getEntityObject(activeBlock);

    const alignOptions = [
        {id: 'left', name: 'format_align_left', help: 'Align left'},
        {id: 'center', name: 'format_align_center', help: 'Align center'},
        {id: 'right', name: 'format_align_right', help: 'Align right'}
    ];

    const fontOptions = [];
    const values = fontIndex.getPropValues('value');
    for (let value of values) {
        fontOptions.push({id: value, name: value});
    }
    const currBlock = blockRef.current;

    const changeFilter = () => {
        const undoFilters = currBlock.filters;
        const index = currBlock.index;

        openFilterPipelineModal({
            images: [ apiRef.current.getBaseBlockImage(currBlock.index) ],
            background,
            filters: undoFilters,
            save: newFilters => {
                eContext.doAction(
                    () => blockIndex.setEntityPropValue(index, 'filters', newFilters),
                    () => blockIndex.setEntityPropValue(index, 'filters', undoFilters)
                );
                closeFilterPipelineModal()
            }
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

    const newBlock = ({ x = 0, y = 0 }) => {
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
                        x,
                        y
                    }),
                    () => blockIndex.deleteEntity(index)
                )
                setActiveBlock(blockIndex.getLength() - 1);
                NewBlockModal.close();
            }
        })
    }

    const drawBlockToCtx = (ctx, index, dim) => {
        const block = blockIndex.getEntityObject(index);
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

    const getBlockDim = index => {
        if (index === null || index >= blockIndex.getLength()) return null;

        const block = blockIndex.getEntityObject(index);
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

    const moveRelativeBlock = (relBlock, block) => {
        if (blockIndex.getEntityPropValue(block.index, 'autoCenteringX')) relBlock.centerX();
        if (blockIndex.getEntityPropValue(block.index, 'autoCenteringY')) relBlock.centerY();
        if (blockIndex.getEntityPropValue(block.index, 'alignToGrid')) {
            const font = fonts[blockIndex.getEntityPropValue(block.index, 'font')];
            relBlock.align(font.width, font.height);
        }
        return relBlock;
    }

    const getActualBlockPos = (block, dim) => {
        if (!block) return null;
        const { x, y } = block;
        const relBlock = new RelativeBlock({width, height}, {x, y, width: dim.width, height: dim.height});
        return moveRelativeBlock(relBlock, block).getPos();
    };

    const setEntityProp = prop => {
        return value => blockIndex.setEntityPropValue(activeBlock, prop, value)
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
                blockIndex.setEntityPropValue(id, 'y', doY)
            },
            () => {
                blockIndex.setEntityPropValue(id, 'x', undoX);
                blockIndex.setEntityPropValue(id, 'y', undoY)
            }
        )
    }

    const actual = currBlock && getActualBlockPos(currBlock, getBlockDim(activeBlock));
    const font = currBlock && fonts[currBlock.font];

    return (
        <Stack full>
            <EntityStackSections
                id="textBlocks"
                key="tb"
                sectionProps={{inner: true, name: 'Text Blocks', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                detailProps={{inner: true, name: 'Text Block Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                entityIndex={blockIndex}
                deselect addOp={newBlock} delete clone order undo
                emptyText="Add new block"
                active={activeBlock} setActive={setActiveBlock}
            >
                {currBlock === null ?
                    <Block key="es" center className="less">No block selected</Block> :
                    <Block key="pg" full="h" scroll>
                        <PropertyGrid>
                            <SelectProp name="Font:" full="h" undo="font" options={fontOptions} value={currBlock.font} set={setEntityProp('font')} />
                            <TupleProp name="Position:" undo="position" wrap
                                       x={currBlock.x} setX={setEntityProp('x')} minX={fieldProps.x.min} maxX={fieldProps.x.max} stepX={currBlock.alignToGrid ? font.width : 1} disabledX={currBlock.autoCenteringX}
                                       y={currBlock.y} setY={setEntityProp('y')} minY={fieldProps.y.min} maxY={fieldProps.y.max} stepY={currBlock.alignToGrid ? font.height : 1} disabledY={currBlock.autoCenteringY}
                            />
                            <LabelProp name="- actual:" bottomPadding={false}>
                                <Stack gaps="1" wrap full="h">
                                    <Tuple center="v" readOnly
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
                            <RadioProp undo="textalign" name="Text Align:" options={alignOptions} gaps="1" padded="1" icon value={currBlock.textAlign} set={setEntityProp('textAlign')} />
                            <FullProp name="Text:">
                                <TextArea undo="text" value={currBlock.text} set={setEntityProp('text')} full="h" rows={5} />
                            </FullProp>
                            <LabelProp name="Filters:">
                                <Input full="h" clear maxWidth={false} onClick={changeFilter} onClear={clearFilter} value={currBlock.filters} />
                            </LabelProp>
                        </PropertyGrid>
                    </Block>
                }
            </EntityStackSections>

            <Section key="sc" name="Screen" full inner>
                <ScreenBlocksGrid
                    blockIndex={blockIndex} active={activeBlock} setActive={setActiveBlock}
                    color={background} setColor={setBackground}
                    getBlockDim={getBlockDim} drawBlockToCtx={drawBlockToCtx}
                    moveRelativeBlock={moveRelativeBlock} apiRef={apiRef} newBlock={newBlock}
                    width={width} setWidth={setWidth} height={height} setHeight={setHeight}
                />
            </Section>

            <NewBlockModal.content name="New Text Block">
                <NameDialog { ...NewBlockModal.props } />
            </NewBlockModal.content>

            {FilterPipelineModal}
        </Stack>
    )
}

function TextPaneEditor({ model, resource }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();
    const { storeModel, deployModel, getResourceTree, openExportModal, Modals } = useExportModal({ name: 'TextPane', model, resource, update });
    const [ activeFont, setActiveFont ] = useState(0);

    const fontIndex = useMemo(() => {
        return new FontIndex(model);
    }, [model]);

    const blockIndex = useMemo(() => {
        return new TextBlockIndex(model)
    }, [model]);

    const tree = getResourceTree();
    const details = {
        'From:': tree[0].source,
        'Resources:': tree.length
    };

    return (
        <Stack full vertical gaps>
            <EditorSection
                id="textPaneEditor" area={1} link={3} full="h" centerItems size={300} maxSize={400} name="TextPane"
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
                <FontEditor full resource={resource} fontIndex={fontIndex} blockIndex={blockIndex} activeFont={activeFont} setActiveFont={setActiveFont} />
            </EditorSection>

            <EditorSection id="textPanePreview" area={2} full name="Preview" actions={
                eContextRef => {
                    return {
                        export: () => {
                            const jsons = [];
                            for (let block of model.blocks) {
                                const obj = new resource.config.deps.block(block);
                                jsons.push(obj.getRebuildJson());
                            }
                            openExportModal(JSON.stringify(jsons, null, wContext.editorConfig.tabSpaces));
                        }
                    }
            }}>
                <TextBlockEditor full blockIndex={blockIndex} fontIndex={fontIndex} activeFont={activeFont} dim={resource.dim} />
            </EditorSection>

            <Modals />
        </Stack>
    )
}

export {
    TextPaneEditor
}