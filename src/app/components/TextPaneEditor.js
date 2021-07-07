import React, {useMemo, useState, useContext, useEffect, useRef, Fragment} from "react";
import {CellSelection} from "../classes/CellProvider";
import {CellProviderRaster} from "./Raster";
import {EmptyGrid} from "../classes/Grid";
import {AssignIndex, CharIndex, ColorIndex} from "../classes/EntityIndex";
import {
    useModal,
    useKeyListener,
    useUniqueResourceId,
    ItemsStack,
    Page,
    Section,
    Content,
    Centered,
    ActionFrame,
    CursorContext,
    Checkbox,
    CheckboxProp,
    TextField,
    TextFieldProp,
    SelectProp,
    LabelAndSubInfo,
    PropertyGrid,
    PropLabel,
    RadioProp,
    FullProp,
    Title,
    Stack,
    Spacer,
    Canvas,
    Dim,
    DimProp,
    Toolbar,
    Int,
    IntProp,
    Color,
    FiltersSelector,
    GlobalContext,
    useComponentUpdate,
    EntityManager, useExportModal
} from "./BaseComponents";

import {
    d,
    isValidResourceId,
    drawTextBlocks,
    getCanvasForDim,
    getIdToItems,
    getIdsFromObjects,
    getNextUid,
    getTextBlockImage,
    getBlockPos,
    getResourceTreeForJsonModel, getEmptyImageData, getColorsFromCanvas, getCanvasForBitmap
} from '../helper/helper';

import {
    EditorCtx,
    EditorContext,
    BitmapEditor,
    BitmapSelector,
    useEditorContextPart,
    CellMarker
} from "./Raster";
import {BitmapCellProvider} from "../classes/CellProvider";


function CharInput({value, setValue, index, focusIndex}) {
    const inputRef = useRef(null);
    useEffect(() => {
        if (index === focusIndex) {
            inputRef.current.focus();
        }
    });
    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            required
            onKeyPress={
                e => {
                    if (e.charCode >= 32) {
                        setValue(e.key);
                    }
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
            onChange={
                (e) => {
                    setValue(e.target.value);
                }
            } size={1} maxLength={1} />
    );
}

function CharAssign({assignIndex, close, save}) {
    const [focusIndex, setFocusIndex] = useState(0);
    const update = useComponentUpdate();
    const saveRef = useRef(null);
    const values = assignIndex.getPropValues('value');

    saveRef.current = values;
    const incPosRef = useRef(null);
    useKeyListener(13, () => {if (!canSave()) return false; doSave(); return true});

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
        update();
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
        focusNextFrom(values.length - 1);
    };

    const canSave = () => saveRef.current.indexOf('') === -1;

    const doSave = () => {
        save(assignIndex.getEntityObjects());
    };

    return (
        <EditorCtx>
            <Stack vertical fit>
                <Content>
                    <EntityManager
                        key={focusIndex}
                        entityIndex={assignIndex}
                        startPos={Math.max(focusIndex - 1, 0)}
                        minWidth={50}
                        titleHeight={22}
                        incPosRef={incPosRef}
                        fit
                        renderTitle={
                            index => {
                                const char = assignIndex.getEntityValue(index);
                                return (
                                    <Stack>
                                        <CharInput
                                            key={index + '_' + char}
                                            value={char}
                                            setValue={
                                                value => {
                                                    setValueAtIndex(index, value);
                                                    focusNextFrom(index);
                                                }}
                                            focusIndex={focusIndex}
                                            index={index}
                                        />
                                        <div>
                                            <button disabled={char === ''} onClick={() => autoFill(index)}>...</button>
                                        </div>
                                    </Stack>
                                );
                            }
                        } />
                </Content>
                <Content padded>
                    <Stack>
                        <button disabled={!canSave()} onClick={doSave}>Save</button>
                        <button onClick={() => close()}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </EditorCtx>
    );
}

function CharManager({fontIndex}) {
    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);

    const NewCharModal = useModal();
    const EditCharModal = useModal();
    const ApplyFilterModal = useModal();
    const AssignCharsModal = useModal();
    const ImportCharsModal = useModal();

    const newChar = () => {
        NewCharModal.open({
            image: getEmptyImageData(
                fontIndex.getSizeX(),
                fontIndex.getSizeY()
            ),
            colors: new ColorIndex({colors: getColorsFromCanvas(fontIndex.img)}),
            save: provider => {
                assignImagesToChars([{value: '', oldChar: '', image: provider.getImageData()}]);
                NewCharModal.close()
            }
        });
    };

    const importChars = () => {
        const selected = selection => {
            const baseCells = selection.getBaseCells();
            const chars = [];
            let index = 0;
            for(let cells of baseCells) {
                const provider = new BitmapCellProvider(1);
                provider.setMap(cells);
                chars.push({
                    index,
                    value: '',
                    oldChar: '',
                    image: provider.getImageData()
                });
                index++;
            }
            assignImagesToChars(chars);
            ImportCharsModal.close();
        };
        ImportCharsModal.open({
            selection: {
                type: 'rect',
                width: fontIndex.getSizeX(),
                height: fontIndex.getSizeY(),
                fixed: true,
                multi: true,
                doubleClick: selected
            },
            save: selected
        });
    };

    const editChar = index => {
        const image = fontIndex.getEntityPropValue(index, 'image');
        EditCharModal.open({
            image,
            colors: new ColorIndex({colors: getColorsFromCanvas(fontIndex.img)}),
            save: provider => {
                const doImage = provider.getImageData();
                eContext.doAction(
                    () => {
                        fontIndex.setEntityPropValue(index, 'image', doImage);
                    },
                    () => {
                        fontIndex.setEntityPropValue(index, 'image', image);
                    },
                );
                EditCharModal.close();
            }
        });
    };

    const assignImagesToChars = chars => {
        const assignIndex = new AssignIndex(fontIndex.getSizeX(), fontIndex.getSizeY());
        assignIndex.setEntityObjects(chars);
        AssignCharsModal.open({
            assignIndex,
            save: items => {
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
                    if (item.oldChar === item.value) continue;

                    const newIndex = fontIndex.getEntityByPropValue('value', item.value);
                    if (newIndex !== null) {
                        backup[item.value] = fontIndex.getEntityPropValue(newIndex, 'image');
                        changeItems.push(
                            {index: newIndex, value: item.value, image: item.image}
                        );
                    } else {
                        newItems.push(
                            {value: item.value, image: item.image}
                        );
                    }

                    if (item.oldChar !== '' && !newChars.includes(item.oldChar)) {
                        const oldIndex = fontIndex.getEntityByPropValue('value', item.oldChar);
                        backup[item.oldChar] = fontIndex.getEntityPropValue(oldIndex, 'image');
                        deleteIndices.push(oldIndex);
                        deleteChars.push(item.oldChar);
                    }
                }

                eContext.doAction(
                    () => {
                        fontIndex.setEntityObjects(changeItems, true);
                        if (deleteIndices) {
                            fontIndex.deleteEntities(deleteIndices);
                        }
                        fontIndex.setEntityObjects(newItems);
                    },
                    () => {
                        const undoIndices = [];
                        for (let item of newItems) {
                            undoIndices.push(fontIndex.getEntityByPropValue('value', item.value));
                        }
                        fontIndex.deleteEntities(undoIndices);

                        const items = [];
                        for (let char of deleteChars) {
                            items.push({image: backup[char], value: char});
                        }
                        fontIndex.setEntityObjects(items);
                        const undoItems = [];
                        for (let item of changeItems) {
                            undoItems.push({...item, image: backup[item.value]});
                        }
                        fontIndex.setEntityObjects(undoItems, true);
                    }
                );
                AssignCharsModal.close();
            }
        });
    };

    const actions = [
        {
            name: 'Edit',
            doAction: indices => {
                editChar(indices[0]);
            },
            isHidden: props => props.marked.length !== 1
        },
        {
            name: 'Delete',
            doAction: indices => {
                const undoChars = fontIndex.getEntityObjects(indices);
                eContext.doAction(
                    () => fontIndex.deleteEntities(indices),
                    () => fontIndex.setEntityObjects(undoChars)
                );
            }
        },
        {
            name: 'Swap',
            doAction: indices => {
                const first = indices[0];
                const second = indices[1];
                const firstBitmap = fontIndex.getEntityPropValue(first, 'image');
                const secondBitmap = fontIndex.getEntityPropValue(second, 'image');
                eContext.doAction(
                    () => {
                        fontIndex.setEntityPropValue(first, 'image', secondBitmap);
                        fontIndex.setEntityPropValue(second, 'image', firstBitmap);
                    },
                    () => {
                        fontIndex.setEntityPropValue(first, 'image', firstBitmap);
                        fontIndex.setEntityPropValue(second, 'image', secondBitmap);
                    }
                );
            },
            isHidden: props => props.marked.length !== 2
        },
        {
            name: 'Clear',
            doAction: indices => {
                const emptyBitmap = getEmptyImageData(fontIndex.getSizeX(), fontIndex.getSizeY());
                const undoChars = {};
                for (let index of indices) {
                    undoChars[index] = fontIndex.getEntityPropValue(index, 'image');
                }
                eContext.doAction(
                    () => {
                        for (let index of indices) {
                            fontIndex.setEntityPropValue(index, 'image', emptyBitmap);
                        }
                    },
                    () => {
                        for (let [index, bitmap] of Object.entries(undoChars)) {
                            fontIndex.setEntityPropValue(index, 'image', bitmap);
                        }
                    }
                );
            },
        },
        {
            name: 'Reassign',
            doAction: indices => {
                indices.sort();
                const items = [];
                for (let index of indices) {
                    const char = fontIndex.getEntityValue(index);
                    items.push({
                        image: fontIndex.getEntityPropValue(index, 'image'),
                        oldChar: char,
                        value: char
                    });
                }
                assignImagesToChars(items);
            }
        },
        {
            name: 'Apply...',
            doAction: indices => {
                const previewCanvas = [];
                for (let index of indices) {
                    previewCanvas.push({
                        name: fontIndex.getEntityValue(index),
                        canvas: getCanvasForBitmap(fontIndex.getEntityPropValue(index, 'image'))
                    });
                }
                ApplyFilterModal.open({
                    canvas: previewCanvas,
                    save: filter => {
                        const undoChars = fontIndex.getEntityObjects(indices);
                        const doBitmaps = {};
                        const sizeX = fontIndex.getSizeX();
                        const sizeY = fontIndex.getSizeY();
                        for (let index of indices) {
                            const canvas = getCanvasForBitmap(fontIndex.getEntityPropValue(index, 'image'));
                            const newBitmap =
                                context.filters.getCanvasWithFiltersApplied(
                                    filter,
                                    {elem: canvas, ctx: canvas.getContext('2d')},
                                    0,
                                    0,
                                    sizeX,
                                    sizeY
                                )[0].ctx.getImageData(0, 0, sizeX, sizeY);
                            doBitmaps[index] = newBitmap;
                        }
                        eContext.doAction(
                            () => {
                                for(let [index, bitmap] of Object.entries(doBitmaps)) {
                                    fontIndex.setEntityPropValue(index, 'image', bitmap);
                                }
                            },
                            () => {
                                for(let obj of undoChars) {
                                    fontIndex.setEntityPropValue(obj.index, 'image', obj.image);
                                }
                            }
                        );
                        ApplyFilterModal.close()
                    }
                });
            }
        },
        {
            name: 'Copy',
            doAction: indices => {
                const bitmap = fontIndex.getEntityPropValue(indices[0], 'image');
                const selection = new CellSelection('bitmap', [[bitmap]]);
                eContext.setSelection(selection);
            },
            isHidden: props => props.marked.length !== 1
        },
        {
            name: 'Paste',
            doAction: indices => {
                const undoChars = fontIndex.getEntityObjects(indices);
                const pasteBitmap = eContext.selection.getCell();
                eContext.doAction(
                    () => {
                        for (let index of indices) {
                            fontIndex.setEntityPropValue(index, 'image', pasteBitmap);
                        }
                    },
                    () => {
                        fontIndex.setEntityObjects(undoChars, true);
                    }
                );
            },
            isHidden: () => {
                if (!eContext.selection || !eContext.selection.isBitmap()) {
                    return true;
                }
                const cell = eContext.selection.getCell();
                return (cell.width !== fontIndex.getSizeX() || cell.height !== fontIndex.getSizeY());
            }
        }
    ];

    const deleteCharAtIndex = () => {};
    const charMatcher = {type: 'prefix', field: 'code'};

    return (
        <>
            <EntityManager
                entityIndex={fontIndex}
                empty="No characters yet, please import or create new ones"
                minWidth={50}
                titleHeight={22}
                newItem={newChar}
                importItems={importChars}
                rightClick={deleteCharAtIndex}
                doubleClick={editChar}
                filter
                actions={actions}
                matcher={charMatcher}
                maxedZoom
                renderTitle={
                    index => {
                        const code = fontIndex.getEntityValue(index).charCodeAt(0);
                        return (
                            <Stack>
                                <Content flex>
                                    <kbd className="padded title-area-active" dangerouslySetInnerHTML={{__html: '&#' + code + ';'}}></kbd>
                                </Content>
                                <Content>
                                    <kbd>{code}</kbd>
                                </Content>
                            </Stack>
                        );
                    }
                }
            />

            <EditCharModal.content name="Edit Char" height={600} closeable>
                <EditorCtx>
                    <BitmapEditor
                        resize={false}
                        zoom="2"
                        border="1"
                        cancel={EditCharModal.close}
                        {...EditCharModal.props}
                    />
                </EditorCtx>
            </EditCharModal.content>

            <NewCharModal.content name="Edit Char" height={600} closeable>
                <EditorCtx>
                    <BitmapEditor
                        resize={false}
                        zoom="2"
                        border="1"
                        {...NewCharModal.props} />
                    </EditorCtx>
            </NewCharModal.content>

            <AssignCharsModal.content fit closeable>
                <CharAssign {...AssignCharsModal.props} />
            </AssignCharsModal.content>

            <ApplyFilterModal.content height={500} closeable>
                <FiltersSelector bgColor="#000000" {...ApplyFilterModal.props} cancel={ApplyFilterModal.close} filters="" />
            </ApplyFilterModal.content>

            <ImportCharsModal.content name="Select" height={600} width="90%" closeable>
                <EditorCtx>
                    <BitmapSelector
                        zoom="1"
                        border="0"
                        cancelHandler={ImportCharsModal.close}
                        saveHandler={ImportCharsModal.props.save}
                        selection={ImportCharsModal.props.selection}
                        bitmaps={context.imageResources}
                    />
                </EditorCtx>
            </ImportCharsModal.content>
        </>
    )
}

function BlockProperties(props) {
    const FiltersModal = useModal();
    const {
        id, setId,
        text, setText,
        x, setX,
        y, setY,
        lineSpacing, setLineSpacing,
        alignToGrid, setAlignToGrid,
        textAlign, setTextAlign,
        autoCenteringX, setAutoCenteringX,
        autoCenteringY, setAutoCenteringY,
        screenX,
        screenY,
        fonts,
        font, setFont,
        filters, setFilters,
        canvas,
        bgColor
    } = props;


    const fontSize = fonts[font].provider.getIndexDim();

    const changeFilters = () => {
        FiltersModal.open({
            title: 'Change assigned filters',
            filters,
            save: newFilters => {
                setFilters(newFilters);
                FiltersModal.close();
            }
        });
    };

    const fontOptions = [];
    for (let id in fonts) {
        fontOptions.push({id, name: fonts[id].id});
    }
    let fieldProps = props.defaultConfig.getFieldProps();
    fieldProps = {
        minX: fieldProps.x.min,
        minY: fieldProps.y.min,
        maxX: Math.min(fieldProps.x.max, screenX),
        maxY: Math.min(fieldProps.y.max, screenY)
    };

    const actualPos = getBlockPos(
        {font, text, x, y, lineSpacing, autoCenteringX, autoCenteringY, alignToGrid}, props.model.fonts, {x: props.screenX, y: props.screenY});
    return (
        <Fragment>
            <PropertyGrid>
                <SelectProp name="Font:" buttons value={font} set={setFont} options={fontOptions} />
                <DimProp name="Position:"
                         setX={setX}
                         setY={setY}
                         stepX={alignToGrid ? fontSize.x : 1}
                         stepY={alignToGrid ? fontSize.y : 1}
                         {...fieldProps}
                         readOnlyX={autoCenteringX} readOnlyY={autoCenteringY}
                         x={x} y={y} buttons
                />
                <PropLabel name=" - actual:">
                    <Stack>
                        <Dim x={actualPos.x} y={actualPos.y} readOnly />
                        <Content>
                            <button onClick={() => {
                                setAutoCenteringX(false);
                                setAutoCenteringY(false);
                                setAlignToGrid(false);
                                setX(actualPos.x);
                                setY(actualPos.y);
                            }}>Apply</button>
                        </Content>
                    </Stack>
                </PropLabel>
                <IntProp name="Line Spacing:" buttons value={lineSpacing} set={setLineSpacing} {...props.defaultConfig.getFieldProp('lineSpacing')} />
                <PropLabel name="Auto-Centering:">
                    <Stack>
                        <Checkbox name="X" value={autoCenteringX} set={setAutoCenteringX}/>
                        <Checkbox name="Y" value={autoCenteringY} set={setAutoCenteringY}/>
                    </Stack>
                </PropLabel>
                <CheckboxProp name="Align to Grid:" value={alignToGrid} set={setAlignToGrid} />
                <RadioProp name="Text align:" material value={textAlign} set={setTextAlign} options={{left: 'format_align_left', center: 'format_align_center', right: 'format_align_right'}} />
                <FullProp name="Text:">
                    <textarea rows={10} cols={40} value={text} onChange={(e) => {
                        setText(e.target.value);
                    }}></textarea>
                </FullProp>
                <PropLabel name="Filters:">
                    <Stack noGap>
                        <Content flex>
                            <TextField onClick={changeFilters} className="full-h" value={filters} readOnly /></Content>
                        <Content><button onClick={() => {setFilters('')}}>X</button></Content>
                    </Stack>
                </PropLabel>
            </PropertyGrid>

            <FiltersModal.content height={500} closeable>
                <FiltersSelector bgColor={bgColor} canvas={canvas} cancel={FiltersModal.close} save={FiltersModal.props.save} filters={FiltersModal.props.filters} />
            </FiltersModal.content>
        </Fragment>
    );
}

function FontPreview(props) {
    const context = useContext(GlobalContext);
    const cContext = useContext(CursorContext);

    const NewBlockIdModal = useModal();

    const [active, setActive] = useState(0);

    const [zoom, setZoomRaw] = useState(2);
    const [bgColor, setBgColor] = useState('#000000');
    const [screenX, setScreenX] = useState(props.resource.dim.x);
    const [screenY, setScreenY] = useState(props.resource.dim.y);
    const [highlight, setHighlight] = useState(false);
    const [showMarker, setShowMarker] = useState(true);
    const [moving, setMoving] = useState(null);
    const fonts = getIdToItems(props.model.fonts)

    // TODO: try to use real state here? or just use props.blocks
    const {blocks, setBlocks} = props;

    const [defaultConfig] = useState(() => {
        return new props.resource.config.deps.block({});
    });

    const propsRef = useRef(null);
    const overlayRef = useRef(null);
    const canvasRef = useRef(null);
    const currBlockRef = useRef(null);

    currBlockRef.current = blocks.length === 0 || active === null || active >= blocks.length ? null : blocks[active];
    const currFont = currBlockRef.current ? fonts[currBlockRef.current.font] : null;

    // TODO provider und auch load sollte überflüssig sein, weil kein dataUrl=>Image=>onLoad()
    const currProvider = currFont ? currFont.provider : null;

    const update = useComponentUpdate();
    useEffect(() => {
        if (!currProvider) {
            return;
        }
        const updater = () => {
            invalidateImages();
            update();
        };
        currProvider.addListener(
            updater
        );
        return () => {
            currProvider.removeListener(updater);
        }
    }, []);


    const fontSize = currProvider ? currProvider.getIndexDim() : null;

    const invalidateImages = () => {
        for (let block of propsRef.current.blocks) {
            block.canvas = null;
        }
    };

    const eContext = useEditorContextPart('preview', () => {
        invalidateImages();
        setBlocks(propsRef.current.blocks);
    });

    const setZoom = (value) => {
        invalidateImages();
        setZoomRaw(value);
    };

    propsRef.current = {
        zoom,
        blocks,
        screenX,
        screenY,
        moving,
        model: props.model
    };

    const getBlockImage = (block, raw = false) => {
        if (!block.canvas) {
            let font = null;
            for (let item of props.model.fonts) {
                if (item.id === block.font) {
                    font = item;
                }
            }
            block.canvas = {elem: getTextBlockImage(
                block,
                font,
                context.filters
            )};
            block.rawImg = block.filters === '' ? block.canvas.elem : getTextBlockImage(block, font);
        }
        return raw ? block.rawImg : block.canvas.elem;
    };

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let block of blocks) {
            getBlockImage(block);
        }
        drawTextBlocks(
            ctx,
            {x: propsRef.current.screenX, y: propsRef.current.screenY},
            propsRef.current.blocks,
            propsRef.current.model.fonts,
            propsRef.current.zoom
        );
    });
    for (let block of blocks) {
        getBlockImage(block);
    }

    const setState = (newProps) => {
        const curr = currBlockRef.current;
        const {text, font, textAlign, filters, alignToGrid, x, y, autoCenteringX, autoCenteringY, lineSpacing} = curr;
        const change = Object.assign({text, font, textAlign, filters, lineSpacing, alignToGrid, x, y, autoCenteringX, autoCenteringY}, newProps);

        let hasChanged = false;
        let invalidateImage = false;
        for (let key in change) {
            if (change[key] !== curr[key]) {
                hasChanged = true;
                if (['font', 'lineSpacing', 'text', 'textAlign', 'filters'].includes(key)) {
                    invalidateImage = true;
                }
            }
        }

        if (!hasChanged) {
            return;
        }

        const newBlocks = [...blocks];
        const changeBlock = newBlocks[active];
        Object.assign(changeBlock, change);
        if (invalidateImage) {
            changeBlock.canvas = null;
        }
        setBlocks(newBlocks);
    };

    const getSetProp = prop => {
        return value => {
            setState({[prop]: value});
        }
    };

    let marker = '';
    let activateByClick = null;
    const currBlock = currBlockRef.current;
    const fieldProps = defaultConfig.getFieldProps();

    if (currBlock && blocks.length > 0) {

        const currLines = currBlock.text.split('\n');
        let currMaxWidth = 0;
        for (let currLine of currLines) {
            currMaxWidth = Math.max(currMaxWidth, currLine.length);
        }
        const currBlockHeight = fontSize.x * currLines.length;
        const currBlockWidth = fontSize.y * currMaxWidth;

        if (currBlockWidth > 0 && currBlockHeight > 0) {
            const setCurrPosX = getSetProp('x');
            const setCurrPosY = getSetProp('y');

            let moveCursor = 'move';
            if (currBlock.autoCenteringY) {
                moveCursor = 'hresize';
            } else if (currBlock.autoCenteringX) {
                moveCursor = 'vresize';
            }
            const initMove = e => {
                const rect = overlayRef.current.getBoundingClientRect();
                let lastX = Math.floor((e.clientX - rect.x) / zoom);
                let lastY = Math.floor((e.clientY - rect.y) / zoom);
                const offsetX = currBlockRef.current.x - lastX;
                const offsetY = currBlockRef.current.y - lastY;
                lastX += offsetX;
                lastY += offsetY;

                const moveListener = (e) => {
                    const currX = Math.floor((e.clientX - rect.x) / zoom);
                    const currY = Math.floor((e.clientY - rect.y) / zoom);

                    const cBlock = currBlockRef.current;
                    const deltaX = currX - lastX;
                    if (deltaX !== 0) {
                        const newX = Math.max(fieldProps.x.min, Math.min(cBlock.x + deltaX, fieldProps.x.max)) + offsetX;
                        if (newX !== cBlock.x) {
                            setCurrPosX(newX);
                            lastX = newX;
                        }
                    }
                    const deltaY = currY - lastY;
                    if (deltaY !== 0) {
                        const newY = Math.max(fieldProps.y.min, Math.min(cBlock.y + deltaY, fieldProps.y.max)) + offsetY;
                        if (newY !== cBlock.y) {
                            setCurrPosY(newY);
                            lastY = newY;
                        }
                    }
                    e.stopPropagation();
                    e.preventDefault();
                };

                cContext.setFixCursor(moveCursor);
                eContext.addListener(
                    props.editorId,
                    'mousemove',
                    moveListener,
                    {capture: false}
                );
                eContext.addListener(
                    props.editorId,
                    'mouseup',
                    e => {
                        eContext.removeListener(props.editorId, 'mousemove', moveListener, {capture: false});
                        cContext.setFixCursor(null);
                        setHighlight(false);
                        e.preventDefault();
                        e.stopPropagation();
                    },
                    {
                        once: true,
                        capture: false
                    }
                );

                setHighlight(true);
            };

            const pos = getBlockPos(currBlock, props.model.fonts, {x: screenX, y: screenY});

            marker = (<CellMarker
                blink
                initMove={initMove}
                border={0}
                posX={pos.x}
                posY={pos.y}
                zoom={zoom}
                moveCursor={'cursor-' + moveCursor}
                bottom={showMarker && (pos.y + pos.height < screenY)}
                top={showMarker}
                left={showMarker}
                right={showMarker && (pos.x + pos.width < screenX)}
                sizeX={1}
                sizeY={1}
                width={Math.min(pos.width, screenX - pos.x)}
                height={Math.min(pos.height, screenY - pos.y)}
                highlight={highlight}
            />);

            activateByClick = e => {
                const rect = overlayRef.current.getBoundingClientRect();
                const clickX = Math.floor((e.clientX - rect.x)/zoom);
                const clickY = Math.floor((e.clientY - rect.y)/zoom);

                let i = blocks.length - 1;
                let found = false;
                while(!found && i >= 0) {
                    const block = blocks[i];
                    const pos = getBlockPos(block, props.model.fonts, {x: screenX, y: screenY});
                    if (pos.x <= clickX && clickX <= (pos.x + pos.width - 1) &&
                        pos.y <= clickY && clickY <= (pos.y + pos.height - 1)) {
                        found = true;
                    } else {
                        i--;
                    }
                }
                if (found) {
                    setActive(i);
                    setMoving({clientX: e.clientX, clientY: e.clientY});
                } else {
                    e.stopPropagation();
                    e.preventDefault();

                }
            };
        }

    }
    const realWidth = screenX * zoom;
    const realHeight = screenY * zoom;

    const getTextBlockProperties = (index) => {
        const item = propsRef.current.blocks[index];
        return (
            <BlockProperties
                id={item.id}
                fonts={fonts}
                font={item.font}
                setFont={getSetProp('font')}
                fontSize={fontSize}
                text={item.text}
                setText={getSetProp('text')}
                x={item.x}
                setX={getSetProp('x')}
                y={item.y}
                setY={getSetProp('y')}
                textAlign={item.textAlign}
                setTextAlign={getSetProp('textAlign')}
                autoCenteringX={item.autoCenteringX}
                setAutoCenteringX={getSetProp('autoCenteringX')}
                autoCenteringY={item.autoCenteringY}
                setAutoCenteringY={getSetProp('autoCenteringY')}
                alignToGrid={item.alignToGrid}
                setAlignToGrid={getSetProp('alignToGrid')}
                filters={item.filters}
                setFilters={getSetProp('filters')}
                lineSpacing={item.lineSpacing}
                setLineSpacing={getSetProp('lineSpacing')}
                model={props.model}
                screenX={screenX}
                screenY={screenY}
                canvas={getBlockImage(item, true)}
                bgColor={bgColor}
                defaultConfig={defaultConfig}
            />
        );
    };

    const blockIds = getIdsFromObjects(blocks);

    const getNewTextBlock = () => {
        NewBlockIdModal.open({
            id: 'New block #' + (blockIds.length + 1),
            validator: id => !blockIds.includes(id),
            save: blockId => {
                NewBlockIdModal.close();
                const newBlock = defaultConfig.getDefaults();
                newBlock.id = blockId;
                newBlock.font = props.activeFont === null ? null : props.model.fonts[props.activeFont].id;
                newBlock.canvas = null;
                setBlocks([...blocks, newBlock]);
            }
        })
    };

    return (
        <Stack fullHeight>
            <Section name="Text blocks">
                <ItemsStack
                    items={blocks}
                    active={active}
                    setActive={setActive}
                    getName={item => <Title>{item.id}</Title>}
                    setItems={newBlocks => {
                        let changed = false;
                        if (newBlocks.length !== blocks.length) {
                            changed = true;
                        } else {
                            for (let i = 0; i < blocks.length; i++) {
                                if (blocks[i].id !== newBlocks[i].id) {
                                    changed = true;
                                    break;
                                }
                            }
                        }
                        if (changed) {
                            for (let block of newBlocks) {
                                block.img = null;
                            }
                        }
                        setBlocks(newBlocks);
                    }}
                    ordered
                    getClone={item => {return {...item, id: getNextUid(blockIds, item.id + ' Clone'), canvas: null}}}
                    new={props.model.fonts.length > 0 ? getNewTextBlock : null}
                    getProperties={getTextBlockProperties}
                    empty="Add text block"
                    width={200}
                />
            </Section>

            <Section name="Screen" flex>
                <Stack vertical border>
                    <Toolbar>
                        <Dim name="Size" x={screenX} setX={setScreenX} y={screenY} setY={setScreenY} min={1} max={1024} buttons />
                        <Int buttons name="Zoom:" value={zoom} set={setZoom} min={1} max={5} />
                        <Color value={bgColor} set={setBgColor} />
                        <Checkbox name="Show marker" set={setShowMarker} value={showMarker} />
                    </Toolbar>
                    <Content flex>
                        <div style={{position: 'relative', overflow: 'auto', height: '100%'}}>
                            <div style={{position: 'absolute'}}>
                                <Content padded>
                                    <canvas className="thin-boxed" ref={canvasRef} width={screenX * zoom} height={screenY * zoom} />
                                    <div ref={overlayRef} onMouseDown={activateByClick} className="" style={{position: 'absolute', backgroundColor: 'transparent', width: realWidth, height: realHeight, top: 6, left: 6}}>
                                        {marker}
                                    </div>
                                </Content>
                            </div>
                        </div>
                    </Content>
                </Stack>
            </Section>

            <NewBlockIdModal.content name="New Block Id" fit closeable>
                <NewIdForm {...NewBlockIdModal.props} />
            </NewBlockIdModal.content>
        </Stack>
    );
}

function ResizeFontForm(props) {
    const eContext = useContext(EditorContext);
    const cContext = useContext(CursorContext);
    const context = useContext(GlobalContext);
    const [width, setWidth] = useState(props.font.width);
    const [height, setHeight] = useState(props.font.height);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const overlayRef = useRef(null);
    const SelectDimModal = useModal();

    const propsRef = useRef(null);

    const selectDim = () => {
        const selected = (result) => {
            setState({width: result.getWidth(), height: result.getHeight()});
            SelectDimModal.close();
        };
        SelectDimModal.open({
            selection: {
                type: 'rect',
                multi: false,
                fixed: false,
                doubleClick: selected
            },
            bitmap: props.source,
            save: selected
        });
    };

    const setState = changes => {
        changes.width = changes.width ? changes.width : width;
        changes.height = changes.height ? changes.height : height;
        changes.offsetX = changes.offsetX !== undefined ? changes.offsetX : offsetX;
        changes.offsetY = changes.offsetY !== undefined ? changes.offsetY : offsetY;

        if (changes.width !== width) {
            changes.offsetX = Math.min(changes.offsetX, Math.abs(changes.width - props.font.width));
            setWidth(changes.width);
        }
        if (changes.height !== height) {
            changes.offsetY = Math.min(changes.offsetY, Math.abs(changes.height - props.font.height));
            setHeight(changes.height);
        }
        if (changes.offsetX !== offsetX) {
            setOffsetX(changes.offsetX);
        }
        if (changes.offsetY !== offsetY) {
            setOffsetY(changes.offsetY);
        }
    };

    const maxOffsetX = Math.abs(width - props.font.width);
    const maxOffsetY = Math.abs(height - props.font.height);

    propsRef.current = {offsetX, offsetY, maxOffsetX, maxOffsetY, setState};

    const previewWidth = Math.max(width, props.font.width);
    const previewHeight = Math.max(height, props.font.height);

    const size = 4;
    const zoom = 4;
    const border = 1;
    const provider = new EmptyGrid(previewWidth, previewHeight, size, '#000000');
    const dim = provider.getGridDim(previewWidth, previewHeight, border, zoom);

    let moveCursor = 'move';

    const initMove = e => {
        const rect = overlayRef.current.getBoundingClientRect();
        const cellSize = (size * zoom + border);
        let lastX = Math.floor((e.clientX - rect.x)/cellSize);
        let lastY = Math.floor((e.clientY - rect.y)/cellSize);

        const moveListener = (e) => {
            const currX = Math.floor((e.clientX - rect.x)/cellSize);
            const currY = Math.floor((e.clientY - rect.y)/cellSize);

            const curr = propsRef.current;
            const deltaX = currX - lastX;
            if (deltaX !== 0) {
                const newX = Math.max(0, Math.min(currX, curr.maxOffsetX));
                if (newX !== curr.offsetX) {
                    curr.setState({offsetX: newX});
                    lastX = newX;
                }
            }
            const deltaY = currY - lastY;
            if (deltaY !== 0) {
                const newY = Math.max(0, Math.min(currY, curr.maxOffsetY));
                if (newY !== curr.offsetY) {
                    curr.setState({offsetY: newY});
                    lastY = newY;
                }
            }
            e.stopPropagation();
            e.preventDefault();
        };
        cContext.setFixCursor(moveCursor);
        eContext.addListener(
            props.editorId,
            'mousemove',
            moveListener,
            {capture: false}
        );
        eContext.addListener(
            props.editorId,
            'mouseup',
            (e) => {
                eContext.removeListener(props.editorId, 'mousemove', moveListener, {capture: false});
                cContext.setFixCursor(null);
                e.preventDefault();
                e.stopPropagation();
            },
            {
                once: true,
                capture: false
            }
        );
    };


    return (
        <Stack vertical border>
            <Content padded>

                <SelectDimModal.content closeable>
                    <EditorCtx>
                        <BitmapSelector
                            zoom="1"
                            border="0"
                            selection={SelectDimModal.props.selection}
                            cancelHandler={SelectDimModal.close}
                            saveHandler={SelectDimModal.props.save}
                            bitmaps={context.imageResources}
                        />
                    </EditorCtx>
                </SelectDimModal.content>

                <PropertyGrid>
                    <DimProp name="Old Size:" buttons readOnly
                             x={props.font.width}
                             y={props.font.height} />
                    <PropLabel name="New Size:">
                        <Stack>
                            <Dim buttons min={1} max={128}
                                 x={width} setX={width => setState({width})}
                                 y={height} setY={height => setState({height})}></Dim>

                            <Content><button onClick={selectDim}>Select...</button></Content>
                        </Stack>
                    </PropLabel>
                    <DimProp name="Offset" buttons min={0}
                             maxX={maxOffsetX} maxY={maxOffsetY}
                             x={offsetX} setX={offsetX => setState({offsetX})}
                             y={offsetY} setY={offsetY => setState({offsetY})}></DimProp>
                    <FullProp name="Position:">
                        <div  style={{border: context.markerWidth + 'px solid transparent'}}>
                            <Centered>
                                <Canvas width={dim.width} height={dim.height} render={
                                    ctx => provider.drawGrid(ctx, 0, 0, previewWidth, previewHeight, border, zoom)
                                } />
                                <div className="rel-canvas" style={{height: 1}}>
                                    <div ref={overlayRef} style={{top: -(previewHeight * zoom * size + (previewHeight * border))}}>
                                        <CellMarker
                                            blink
                                            initMove={initMove}
                                            initResize={null}
                                            size={size}
                                            border={border}
                                            zoom={zoom}
                                            type="rect"
                                            highlight={true}
                                            posX={offsetX}
                                            posY={offsetY}
                                            width={Math.min(width, props.font.width)}
                                            height={Math.min(height, props.font.height)}
                                            top={true}
                                            bottom={true}
                                            left={true}
                                            right={true}
                                        />

                                    </div>
                                </div>
                            </Centered>
                        </div>
                    </FullProp>
                </PropertyGrid>
            </Content>

            <Content padded>
                <Stack>
                    <button onClick={() => {
                        props.save({width, height, offsetX, offsetY});
                    }}>Save</button>
                    <button onClick={props.close}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    )
}

function NewFontForm(props) {
    const context = useContext(GlobalContext);
    const [width, setWidth] = useState(props.defaults.width);
    const [height, setHeight] = useState(props.defaults.height);
    const [id, setId] = useState(props.defaults.id);
    const SelectDimModal = useModal();

    const selectDim = () => {
        const selected = result => {
            setWidth(result.getWidth());
            setHeight(result.getHeight());
            SelectDimModal.close();
        };
        SelectDimModal.open({
            selection: {
                type: 'rect',
                multi: false,
                fixed: false,
                doubleClick: selected
            },
            bitmap: props.source,
            save: selected
        });
    };

    return (
        <Stack vertical border>
            <Content padded>
                <PropertyGrid>
                    <TextFieldProp name="Id:" value={id} set={value => setId(value)} size={20} />
                    <PropLabel name="Size:">
                        <Stack>
                            <Dim buttons {...props.fieldProps} x={width} setX={setWidth} y={height} setY={setHeight}></Dim>
                            <Content><button onClick={selectDim}>Select...</button></Content>
                        </Stack>
                    </PropLabel>
                </PropertyGrid>
                <SelectDimModal.content closeable>
                    <EditorCtx>
                        <BitmapSelector
                            zoom="1"
                            border="0"
                            selection={SelectDimModal.props.selection}
                            cancelHandler={SelectDimModal.close}
                            saveHandler={SelectDimModal.props.save}
                            bitmaps={context.imageResources}
                        />
                    </EditorCtx>
                </SelectDimModal.content>
            </Content>
            <Content padded>
                <Stack>
                    <button onClick={() => {
                        props.save({width, height, id});
                    }}>Save</button>
                    <button onClick={props.close}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    );
}

function NewIdForm(props) {
    const [id, setId] = useState(props.id);
    const disabled = id === '' || !props.validator(id);
    const idRef = useRef(null);
    idRef.current = {disabled, id};
    useKeyListener(13,
        () => {
            if (idRef.current.disabled) return false;
            props.save(idRef.current.id);
            return true
    });

    return (
        <Stack vertical>
            <Content padded>
                <PropertyGrid>
                    <TextFieldProp invalid={disabled} name="Id:" value={id} set={setId} size={20} />
                </PropertyGrid>
            </Content>
            <Content padded>
                <Stack>
                    <button disabled={disabled} onClick={() => {
                        props.save(id);
                    }}>Save</button>
                    <button onClick={props.close}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    )
}

function TextPaneEditor(props) {

    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);

    const ResizeFontModal = useModal();
    const NewFontModal = useModal();
    const NewFontIdModal = useModal();

    const ExportModal = useExportModal(props.resource);

    const [model, setModel] = useState(props.model);
    const [blocks, setBlocks] = useState(props.resource.blocks);
    const [active, setActiveRaw] = useState(eContext.getSetting('lastActiveFont', model.fonts.length > 0 ? 0 : null));
    const setActive = value => {
        eContext.setSetting('lastActiveFont', value);
        setActiveRaw(value);
        updateTree();
    };
    const [tree, setTree] = useState(props.tree);
    const updateTree = () => {
        setTree(getResourceTreeForJsonModel(props.resource.cls, model));
    };
    const getNewFontUid = useUniqueResourceId(context.resourceLoader, 'json');
    const currFont = model.fonts[active];
    const getNewFontImageUid = useUniqueResourceId(context.resourceLoader, 'image');

    for (let font of model.fonts) {
        if (!font.provider) {
            font.provider = new CharIndex(font);
        }
    }

    const info = [];
    for (let resource of props.tree) {
        info.push(`${resource.type}: "${resource.id}" [${resource.source}]`);
    }

    const newFont = () => {

        const defaultConfig = new props.resource.config.deps.font({});
        const fontIds = getIdsFromObjects(model.fonts);
        const id = getNewFontUid(props.resource.id + '_font', fontIds);
        const jsonIds = context.resourceLoader.getAllResourceIds('json');

        NewFontIdModal.open({
            id,
            validator: id => (isValidResourceId('json', id) && !(fontIds.includes(id) || jsonIds.includes(id))),
            save: fontId => {
                NewFontIdModal.close();

                const defaults = {...defaultConfig.getDefaults(), id: fontId};
                let fieldProps = defaultConfig.getFieldProps();
                fieldProps = {
                    minX: fieldProps.width.min,
                    minY: fieldProps.height.min,
                    maxX: fieldProps.width.max,
                    maxY: fieldProps.height.max
                };
                NewFontModal.open({
                    defaults,
                    fieldProps,
                    save: item => {
                        const undoIndex = active;
                        const fontConfig = new props.resource.config.deps.font(item);
                        const imgIds = [];
                        for (let font of model.fonts) {
                            if (!imgIds.includes(font.imageId)) {
                                imgIds.push(font.imageId);
                            }
                        }
                        const img =
                            context.resourceLoader.makeImageResource(
                                getCanvasForDim(item.width, item.height),
                                getNewFontImageUid(fontId + '_image', imgIds)
                            );
                        fontConfig.setImage(img);
                        const undoFont = fontConfig.getJson();

                        const doAction = () => {
                            model.fonts.push(undoFont);
                            setActive(model.fonts.length - 1);
                        };
                        const undoAction = () => {
                            model.fonts.pop();
                            setActive(undoIndex);
                        };
                        eContext.doAction(doAction, undoAction);
                        NewFontModal.close();
                    }
                });
            }
        });
    };

    const deleteFont = () => {
        const undoFont = model.fonts[active];
        const undoIndex = active;
        const doAction = () => {
            model.fonts.splice(active, 1);
            const newBlocks = [];
            for (let block of blocks) {
                if (block.font != undoFont.id) {
                    newBlocks.push(block);
                }
            }
            let newActive = Math.min(model.fonts.length - 1, active);
            setBlocks(newBlocks);
            setActive(newActive < 0 ? null : newActive);
        };
        const undoAction = () => {
            model.fonts.splice(undoIndex, 0, undoFont);
            setActive(undoIndex);
        };
        eContext.doAction(doAction, undoAction);
    };


    const saveTextPane = () => {
        props.saveModel(model);
        eContext.updateRestorePos();
    };

    const exportTextPane = () => {
        ExportModal.open(model, {});
//        props.export(model);
    };

    const deployTextPane = () => {
        props.deploy(model);
    };

    function getFontProps(index) {
        const editFont = model.fonts[index];

        const resizeAction = () => {
            ResizeFontModal.open({
                font: editFont,
                save: resize => {
                    const undoObjects = editFont.provider.getEntityObjects();
                    const undoSizeX = editFont.provider.getSizeX();
                    const undoSizeY = editFont.provider.getSizeY();
                    eContext.doAction(
                        () => {
                            editFont.provider.resize(resize.width, resize.height, resize.offsetX, resize.offsetY);
                        },
                        () => {
                            editFont.provider.resize(undoSizeX, undoSizeY);
                            editFont.provider.setEntityObjects(undoObjects, true);
                        }
                    );
                    ResizeFontModal.close();
                }
            })
        };

        return (
            <PropertyGrid>
                <TextFieldProp
                    name="ID:"
                    value={editFont.id}
                    readOnly
                />
                <PropLabel name="Size:">
                    <Stack>
                        <Dim x={editFont.width} y={editFont.height} readOnly />
                        <Content>
                            <button onClick={resizeAction}>Resize</button>
                        </Content>
                    </Stack>
                </PropLabel>
            </PropertyGrid>
        )
    }

    const frameActions = (
        <Stack>
            <Content>
                <button disabled={!eContext.hasPast()} onClick={() => eContext.undoAction()}>Undo</button>
                <button disabled={!eContext.hasFuture()} onClick={() => eContext.redoAction()}>Redo</button>
            </Content>
            <Content>
                <button onClick={props.revert}>Revert</button>
                <button onClick={saveTextPane}>Save</button>
                <button onClick={deployTextPane} disabled={!eContext.hasStorePos()}>Deploy</button>
                <button onClick={exportTextPane}>Export</button>
            </Content>
        </Stack>
    );
    return (
        <Page title="Edit TexPane" resources={tree} cancel={props.cancel} play={props.play}>
            <Stack vertical fullHeight>
                <ActionFrame type="TextPane: " name={props.resource.id + (eContext.hasStorePos() ? ' ' : '*')} sub={{'from': tree[0].source, 'Resources': tree.length}} actions={frameActions}>
                    <Stack fullHeight>
                        <Section name="Fonts" height={250}>
                            <ItemsStack
                                new={newFont}
                                deleteActiveItem={deleteFont}
                                width={200}
                                min={1}
                                collapsed
                                active={active}
                                setActive={setActive}
                                setItems={value => {model.fonts = value; setModel(model)}}
                                items={model.fonts}
                                cleanUp={item => {
                                    // scheint beim Löschen eines Fonts auch die TextBlöcke
                                    // die auf diesen verlinkt haben, zu löschen
                                    const newBlocks = [];
                                    for (let block of blocks) {
                                        if (block.font != item.id) {
                                            newBlocks.push(block);
                                        }
                                    }
                                    setBlocks(newBlocks);
                                }}
                                getProperties={getFontProps}
                                getName={item => <LabelAndSubInfo name={item.id}> - Size: {item.width + 'x' + item.height}</LabelAndSubInfo>}
                            />
                        </Section>
                        <Section name="Characters" flex>
                            <CharManager fontIndex={currFont.provider} />
                        </Section>
                    </Stack>
                </ActionFrame>

                <Spacer />

                <ActionFrame type="Preview" flex actions={<button>Export</button>}>
                    <Content flex>{
                        <FontPreview model={model} activeFont={active} resource={props.resource}
                                     blocks={blocks} setBlocks={setBlocks}
                                     editorId="preview" />

                    }
                    </Content>
                </ActionFrame>
                </Stack>

            <ResizeFontModal.content name="Resize Font" fit closeable>
                <ResizeFontForm {...ResizeFontModal.props} />
            </ResizeFontModal.content>

            <NewFontModal.content name="New Font" fit closeable>
                <NewFontForm {...NewFontModal.props} />
            </NewFontModal.content>

            <NewFontIdModal.content name="New Font Id" fit closeable>
                <NewIdForm {...NewFontIdModal.props} />
            </NewFontIdModal.content>

            {ExportModal.render}
        </Page>
    );
}

export default TextPaneEditor;