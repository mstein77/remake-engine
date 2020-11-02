import React, {useMemo, useState, useContext, useEffect, useRef, Fragment} from "react";
import {CellSelection} from "../classes/CellProvider";
import {CellProviderRaster} from "./Raster";
import {EmptyGrid} from "../classes/Grid";
import {AssignIndex, CharIndex, ColorIndex} from "../classes/IndexProvider";
import {
    useModal,
    useKeyListener,
    useEntity,
    useUniqueResourceId,
    ItemsStack,
    Page,
    Section,
    Content,
    Centered,
    ActionFrame,
    CursorContext,
    ActionBox,
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
    Select,
    Stack,
    Spacer,
    Canvas,
    Dim,
    DimProp,
    Toolbar,
    Int,
    IntProp,
    Color,
    ColorProp,
    RangeProp,
    GlobalContext, useComponentUpdate, IndexController, IndexPicker
} from "./BaseComponents";

import {
    d,
    isValidResourceId,
    getItemsCloneWithUpdatedItem,
    getRebuildJsonForModel,
    drawTextBlocks,
    getCanvasForDim,
    rgb2hex,
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
    useMountedReadyCellProvider,
    FlexRasterIndex,
    BitmapEditor,
    BitmapSelector,
    useEditorContextPart,
    CellMarker
} from "./Raster";
import {BitmapCellProvider, FontCharIndexProvider} from "../classes/CellProvider";


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

function CharAssign({assignIndex, cancel, save}) {
    const [focusIndex, setFocusIndex] = useState(0);
    const update = useComponentUpdate();
    const saveRef = useRef(null);
    const values = assignIndex.getPropValues('newChar');

    saveRef.current = values;
    const incPosRef = useRef(null);
    useKeyListener(13, () => {if (!canSave()) return false; doSave(); return true});

    const setValueAtIndex = (index, value) => {
        if (value !== '') {
            const oldIndex = assignIndex.getIndexByPropValue('newChar', value);
            if (oldIndex !== null) {
                assignIndex.setIndexProp(oldIndex, 'newChar', '');
            }
        }
        assignIndex.setIndexProp(index, 'newChar', value);
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
        save(assignIndex.getObjectsForIndices());
    };

    return (
        <EditorCtx>
            <Stack vertical fit>
                <Content>
                    <IndexController
                        key={focusIndex}
                        indexProvider={assignIndex}
                        startPos={Math.max(focusIndex - 1, 0)}
                        minWidth={50}
                        titleHeight={22}
                        incPosRef={incPosRef}
                        renderTitle={
                            index => {
                                const char = assignIndex.getIndexProps(index).newChar;
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
                        <button onClick={cancel}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </EditorCtx>
    );
}

function CharIndexController({fontIndex}) {
    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);

    const NewCharModal = useModal();
    const EditCharModal = useModal();
    const ApplyFilterModal = useModal();
    const AssignCharsModal = useModal();
    const ImportCharsModal = useModal();

    const newChar = () => {
        NewCharModal.show({
            image: getEmptyImageData(
                fontIndex.getSizeX(),
                fontIndex.getSizeY()
            ),
            colors: new ColorIndex({colors: getColorsFromCanvas(fontIndex.img)}),
            save: provider => {
                assignImagesToChars([{index: 0, value: provider.getImageData()}]);
                NewCharModal.hide()
            }
        });
    };

    const importChars = () => {
        const selected = selection => {
            const baseCells = selection.getBaseCells();
            const chars = [];
            let index = 0;
            for(let cells of baseCells) {
                const provider = new BitmapCellProvider(1); //size);
                provider.setMap(cells);
                chars.push({
                    index,
                    value: provider.getImageData()
                });
                index++;
            }
            assignImagesToChars(chars);
            ImportCharsModal.hide();
        };
        ImportCharsModal.show({
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
        EditCharModal.show({
            image: fontIndex.getIndex(index),
            colors: new ColorIndex({colors: getColorsFromCanvas(fontIndex.img)}),
            save: provider => {
                const doImage = provider.getImageData();
                const undoImage = fontIndex.getIndex(index);
                eContext.doAction(
                    () => {
                        fontIndex.setIndex(index, doImage);
                    },
                    () => {
                        fontIndex.setIndex(index, undoImage);
                    },
                );
                EditCharModal.hide();
            }
        });
    };

    const assignImagesToChars = chars => {
        const assignIndex = new AssignIndex(chars.length, fontIndex.getSizeX(), fontIndex.getSizeY(), {oldChar: '', newChar: ''});
        assignIndex.setIndicesFromObjects(chars);
        AssignCharsModal.show({
            assignIndex,
            save: items => {
                const newItems = [];
                const changeItems = [];
                const deleteIndices = [];
                const deleteChars = [];
                const backup = {};
                const newChars = [];
                for (let item of items) {
                    newChars.push(item.newChar);
                }

                for (let item of items) {
                    if (item.oldChar === item.newChar) continue;

                    const newIndex = fontIndex.getIndexByPropValue('code', item.newChar);
                    if (newIndex !== null) {
                        backup[item.newChar] = fontIndex.getIndex(newIndex);
                        changeItems.push(
                            {index: newIndex, code: item.newChar, value: item.value}
                        );
                    } else {
                        newItems.push(
                            {code: item.newChar, value: item.value}
                        );
                    }

                    if (item.oldChar !== '' && !newChars.includes(item.oldChar)) {
                        const oldIndex = fontIndex.getIndexByPropValue('code', item.oldChar);
                        backup[item.oldChar] = fontIndex.getIndex(oldIndex);
                        deleteIndices.push(oldIndex);
                        deleteChars.push(item.oldChar);
                    }
                }

                eContext.doAction(
                    () => {
                        fontIndex.setIndicesFromObjects(changeItems);
                        if (deleteIndices) {
                            fontIndex.deleteIndices(deleteIndices);
                        }
                        fontIndex.setIndicesFromObjects(newItems);
                    },
                    () => {
                        const undoIndices = [];
                        for (let item of newItems) {
                            undoIndices.push(fontIndex.getIndexByPropValue('code', item.code));
                        }
                        fontIndex.deleteIndices(undoIndices);
                        const items = [];
                        for (let char of deleteChars) {
                            items.push({value: backup[char], code: char});
                        }
                        fontIndex.setIndicesFromObjects(items);
                        const undoItems = [];
                        for (let item of changeItems) {
                            undoItems.push({...item, value: backup[item.code]});
                        }
                        fontIndex.setIndicesFromObjects(undoItems);
                    }
                );
                AssignCharsModal.hide();
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
                const undoChars = fontIndex.getObjectsForIndices(indices);
                eContext.doAction(
                    () => fontIndex.deleteIndices(indices),
                    () => fontIndex.setIndicesFromObjects(undoChars)
                );
            }
        },
        {
            name: 'Swap',
            doAction: indices => {
                const first = indices[0];
                const second = indices[1];
                const firstBitmap = fontIndex.getIndex(first);
                const secondBitmap = fontIndex.getIndex(second);
                eContext.doAction(
                    () => {
                        fontIndex.setIndex(first, secondBitmap);
                        fontIndex.setIndex(second, firstBitmap);
                    },
                    () => {
                        fontIndex.setIndex(first, firstBitmap);
                        fontIndex.setIndex(second, secondBitmap);
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
                    undoChars[index] = fontIndex.getIndex(index);
                }
                eContext.doAction(
                    () => {
                        for (let index of indices) {
                            fontIndex.setIndex(index, emptyBitmap);
                        }
                    },
                    () => {
                        for (let [index, bitmap] of Object.entries(undoChars)) {
                            fontIndex.setIndex(index, bitmap);
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
                    const char = fontIndex.getIndexProps(index).code;
                    items.push({
                        value: fontIndex.getIndex(index),
                        oldChar: char,
                        newChar: char
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
                        name: fontIndex.getIndexProps(index).code,
                        canvas: getCanvasForBitmap(fontIndex.getIndex(index))
                    });
                }
                ApplyFilterModal.show({
                    canvas: previewCanvas,
                    save: filter => {
                        const undoChars = fontIndex.getObjectsForIndices(indices);
                        const doBitmaps = {};
                        const sizeX = fontIndex.getSizeX();
                        const sizeY = fontIndex.getSizeY();
                        for (let index of indices) {
                            const canvas = getCanvasForBitmap(fontIndex.getIndex(index));
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
                                    fontIndex.setIndex(index, bitmap);
                                }
                            },
                            () => {
                                for(let obj of undoChars) {
                                    fontIndex.setIndex(obj.index, obj.value);
                                }
                            }
                        );
                        ApplyFilterModal.hide()
                    }
                });
            }
        },
        {
            name: 'Copy',
            doAction: indices => {
                const bitmap = fontIndex.getIndex(indices[0]);
                const selection = new CellSelection('bitmap', [[bitmap]]);
                eContext.setSelection(selection);
            },
            isHidden: props => props.marked.length !== 1
        },
        {
            name: 'Paste',
            doAction: indices => {
                const undoChars = fontIndex.getObjectsForIndices(indices);
                const pasteBitmap = eContext.selection.getCell();
                eContext.doAction(
                    () => {
                        for (let index of indices) {
                            fontIndex.setIndex(index, pasteBitmap);
                        }
                    },
                    () => {
                        fontIndex.setIndicesFromObjects(undoChars);
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
    const incPosRef = {current: null};
    const charMatcher = {type: 'prefix', field: 'code'};

    return (
        <>
            <IndexController
                indexProvider={fontIndex}
                empty="No characters yet, please import or create new ones"
                incPosRef={incPosRef}
                minWidth={50}
                titleHeight={22}
                newItem={newChar}
                importItems={importChars}
                rightClick={deleteCharAtIndex}
                doubleClick={editChar}
                actions={actions}
                matcher={charMatcher}
                renderTitle={
                    index => {
                        const char = {
                            code: fontIndex.getIndexProps(index).code.charCodeAt(0)
                        };
                        return (
                            <Stack>
                                <Content flex>
                                    <kbd className="padded title-area-active" dangerouslySetInnerHTML={{__html: '&#' + char.code + ';'}}></kbd>
                                </Content>
                                <Content>
                                    <kbd>{char.code}</kbd>
                                </Content>
                            </Stack>
                        );
                    }
                }
            />

            <EditCharModal.render name="Edit Char" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="2"
                    border="1"
                    cancel={EditCharModal.hide}
                    {...EditCharModal.params}
                />
            </EditCharModal.render>

            <NewCharModal.render name="Edit Char" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="2"
                    border="1"
                    cancel={EditCharModal.hide}
                    {...NewCharModal.params} />
            </NewCharModal.render>

            <AssignCharsModal.render fit closeable>
                <CharAssign
                    {...AssignCharsModal.params}
                    cancel={AssignCharsModal.hide}
                />
            </AssignCharsModal.render>

            <ApplyFilterModal.render height={500} closeable>
                <FiltersSelector bgColor="#000000" {...ApplyFilterModal.params} cancel={ApplyFilterModal.hide} filters="" />
            </ApplyFilterModal.render>

            <ImportCharsModal.render name="Select" height={600} width="90%" closeable>
                <EditorCtx>
                    <BitmapSelector
                        zoom="1"
                        border="0"
                        cancelHandler={ImportCharsModal.hide}
                        saveHandler={ImportCharsModal.params.save}
                        selection={ImportCharsModal.params.selection}
                        bitmaps={context.imageResources}
                    />
                </EditorCtx>
            </ImportCharsModal.render>
        </>
    )
}

function FiltersSelector(props) {
    const context = useContext(GlobalContext);
    const [bgColor, setBgColor] = useState(props.bgColor ? props.bgColor : '#000000');
    const [previewIndex, setPreviewIndex] = useState(0);
    const filterDefinitions = context.filters.getFilters();
    const allFilters = useMemo(() => {
        const keys = Object.keys(filterDefinitions).sort();
        const items = [];
        for (let key of keys) {
            const item = {
                name: key
            };
            const filterDefinition = filterDefinitions[key];
            for (let def of filterDefinition.paramDefs) {
                item[def.key] = def.default;
            }
            items.push({name: key, item});
        }
        return items;
    }, []);

    const [active, setActive] = useState(0);
    const assignedFilters = [];
    const filterExpressions = props.filters.split('|');
    for (let expr of filterExpressions) {
        if (expr === '') {
            continue;
        }
        let name = expr;
        let item = {};
        if (expr.indexOf('(') !== -1 && expr.endsWith(')')) {
            const parts = expr.split('(', 2);
            name = parts[0];
            const values = parts[1].substr(0, parts[1].length - 1).split(',');
            const params = filterDefinitions[name].params;
            for (let i = 0; i < params.length; i++) {
                params[i](values[i], item);
            }
        }
        assignedFilters.push({name, ...item});
    }
    const previewRef = useRef(null);
    const [filters, setFilters] = useState(assignedFilters);

    useEffect(() => {
        if (!previewRef.current || !props.canvas) {
            return;
        }
        const ctx = previewRef.current.getContext('2d');
        const baseCanvas = Array.isArray(props.canvas) ? props.canvas[previewIndex].canvas : props.canvas;
        const width = baseCanvas.width;
        const height = baseCanvas.height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const currFilters = getFilterString();

        let filteredCanvas = baseCanvas;
        if (currFilters) {
            const transformed =
                context.filters.getCanvasWithFiltersApplied(
                    currFilters,
                {elem: baseCanvas, ctx: baseCanvas.getContext('2d')}, 0, 0, width, height);
            filteredCanvas = transformed[0].elem;
        }
        ctx.drawImage(filteredCanvas, 0, 0, filteredCanvas.width, filteredCanvas.height);
    });

    let preview = null;
    if (props.canvas) {
        let imageCtrl = '';
        let previewCanvas = props.canvas;
        if (Array.isArray(props.canvas)) {
            const options = [];
            for (let i = 0; i < props.canvas.length; i++) {
                options.push({id: i, name: props.canvas[i].name});
            }
            if (options.length > 1) {
                imageCtrl = <Select options={options} value={previewIndex} buttons set={setPreviewIndex} />;
            }
            previewCanvas = props.canvas[0].canvas;
        }
        preview =
            <Stack vertical border fullHeight>
                <Toolbar>
                    <Content padded>Preview:</Content>
                    {imageCtrl}
                    {props.bgChange && <Color value={bgColor} set={setBgColor} />}
                </Toolbar>
                <Content scroll fullHeight><Centered><canvas className="thin-boxed" ref={previewRef} width={previewCanvas.width} height={previewCanvas.height} /></Centered></Content>
            </Stack>;
    }

    const getItemProperties = (index) => {
        const item = filters[index];
        const paramDefs = filterDefinitions[item.name].paramDefs;
        const inputs = [];
        for (let def of paramDefs) {
            switch(def.type) {
                case 2:
                    const colorValue = rgb2hex(item[def.key]);
                    inputs.push(
                        <ColorProp
                            name={def.key + ':'}
                            key={def.key}
                            value={colorValue}
                            set={(value) => {
                               const newFilters = [...filters];
                               newFilters[active][def.key] = value;
                               setFilters(newFilters);
                           }}
                        />
                    );
                    break;

                case 1:
                    inputs.push(
                        <RangeProp
                            key={def.key}
                            name={def.key + ':'}
                            min={def.min}
                            max={def.max}
                            step={def.step}
                            value={item[def.key]}
                            set={value => {
                                const newFilters = [...filters];
                                newFilters[active][def.key] = value;
                                setFilters(newFilters);
                            }}
                        />
                    );
                    break;

                case 4:
                    inputs.push(
                        <IntProp
                            key={def.key}
                            name={def.key + ':'}
                            buttons
                            set={
                                (value) => {
                                    const newFilters = [...filters];
                                    newFilters[active][def.key] = value;
                                    setFilters(newFilters);
                                }
                            }
                            value={item[def.key]}
                        />
                    );
                    break;

                default:
                    d('???', def);
                    break;
            }
        }
        return (
            <PropertyGrid>
                {inputs}
            </PropertyGrid>
        );
    };

    const getFilterString = () => {
        const values = [];
        for (let filter of filters) {
            let expr = filter.name;
            const paramDefs = filterDefinitions[filter.name].paramDefs;
            if (paramDefs.length > 0) {
                expr += '(';
                const params = [];
                for (let def of paramDefs) {
                    const rawValue = filter[def.key];
                    params.push(def.type === 2 ? rgb2hex(rawValue) : rawValue);
                }
                expr += params.join(',') + ')';
            }
            values.push(expr);
        }
        return values.join('|');
    };

    const currFilters = getFilterString();

    return (
        <Stack vertical border>
            <Stack fullHeight border>
                <ItemsStack
                    empty="Assign filters from the left side"
                    assignable={allFilters}
                    active={active}
                    setActive={setActive}
                    items={filters}
                    setItems={setFilters}
                    getProperties={getItemProperties}
                    getName={(item) => item.name}
                    ordered
                />
                {preview}
            </Stack>
            <Content padded>
                <Stack>
                    <button disabled={currFilters === props.filters} onClick={() => {
                        props.save(currFilters);
                    }}>Save</button>
                    <button onClick={props.cancel}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
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
        FiltersModal.show({
            title: 'Change assigned filters',
            filters,
            save: newFilters => {
                setFilters(newFilters);
                FiltersModal.hide();
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

            <FiltersModal.render height={500} closeable>
                <FiltersSelector bgColor={bgColor} canvas={canvas} cancel={FiltersModal.hide} save={FiltersModal.params.save} filters={FiltersModal.params.filters} />
            </FiltersModal.render>
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
                    (e) => {
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
                size={1}
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
        NewBlockIdModal.show({
            id: 'New block #' + (blockIds.length + 1),
            validator: id => !blockIds.includes(id),
            save: blockId => {
                NewBlockIdModal.hide();
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

            <NewBlockIdModal.render name="New Block Id" fit closeable>
                <NewIdForm save={NewBlockIdModal.params.save} validator={NewBlockIdModal.params.validator} id={NewBlockIdModal.params.id} hide={NewBlockIdModal.hide} />
            </NewBlockIdModal.render>
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
            SelectDimModal.hide();
        };
        SelectDimModal.show({
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
                <SelectDimModal.render closeable>
                    <EditorCtx>
                        <BitmapSelector
                            zoom="1"
                            border="0"
                            selection={SelectDimModal.params.selection}
                            cancelHandler={SelectDimModal.hide}
                            saveHandler={SelectDimModal.params.save}
                            bitmaps={context.imageResources}
                        />
                    </EditorCtx>
                </SelectDimModal.render>
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
                    <button onClick={props.hide}>Cancel</button>
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
            SelectDimModal.hide();
        };
        SelectDimModal.show({
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
                <SelectDimModal.render closeable>
                    <EditorCtx>
                        <BitmapSelector
                            zoom="1"
                            border="0"
                            selection={SelectDimModal.params.selection}
                            cancelHandler={SelectDimModal.hide}
                            saveHandler={SelectDimModal.params.save}
                            bitmaps={context.imageResources}
                        />
                    </EditorCtx>
                </SelectDimModal.render>
            </Content>
            <Content padded>
                <Stack>
                    <button onClick={() => {
                        props.save({width, height, id});
                    }}>Save</button>
                    <button onClick={props.hide}>Cancel</button>
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
                    <button onClick={props.hide}>Cancel</button>
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

        NewFontIdModal.show({
            id,
            validator: id => (isValidResourceId('json', id) && !(fontIds.includes(id) || jsonIds.includes(id))),
            save: fontId => {
                NewFontIdModal.hide();

                const defaults = {...defaultConfig.getDefaults(), id: fontId};
                let fieldProps = defaultConfig.getFieldProps();
                fieldProps = {
                    minX: fieldProps.width.min,
                    minY: fieldProps.height.min,
                    maxX: fieldProps.width.max,
                    maxY: fieldProps.height.max
                };
                NewFontModal.show({
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
                        NewFontModal.hide();
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
        props.save(model);
        eContext.updateRestorePos();
    };

    const exportTextPane = () => {
        props.export(model);
    };

    const deployTextPane = () => {
        props.deploy(model);
    };

    function getFontProps(index) {
        const editFont = model.fonts[index];

        const resizeAction = () => {
            ResizeFontModal.show({
                font: editFont,
                save: resize => {
                    const undoObjects = editFont.provider.getObjectsForIndices();
                    const undoSizeX = editFont.provider.getSizeX();
                    const undoSizeY = editFont.provider.getSizeY();
                    eContext.doAction(
                        () => {
                            editFont.provider.resize(resize.width, resize.height, resize.offsetX, resize.offsetY);
                        },
                        () => {
                            editFont.provider.resize(undoSizeX, undoSizeY);
                            editFont.provider.setIndicesFromObjects(undoObjects);
                        }
                    );
                    ResizeFontModal.hide();
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
                        <Section name="Fonts">
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
                            <CharIndexController fontIndex={currFont.provider} />
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

            <ResizeFontModal.render name="Resize Font" fit closeable>
                <ResizeFontForm hide={ResizeFontModal.hide} {...ResizeFontModal.params} />
            </ResizeFontModal.render>

            <NewFontModal.render name="New Font" fit closeable>
                <NewFontForm save={NewFontModal.params.save} defaults={NewFontModal.params.defaults} fieldProps={NewFontModal.params.fieldProps} hide={NewFontModal.hide} />
            </NewFontModal.render>

            <NewFontIdModal.render name="New Font Id" fit closeable>
                <NewIdForm save={NewFontIdModal.params.save} validator={NewFontIdModal.params.validator} id={NewFontIdModal.params.id} hide={NewFontIdModal.hide} />
            </NewFontIdModal.render>
        </Page>
    );
}

export default TextPaneEditor;