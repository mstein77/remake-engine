import React, {useMemo, useState, useContext, useEffect, useRef, Fragment} from "react";
import {CellSelection} from "../classes/CellProvider";
import {CellProviderRaster} from "./Raster";
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
    Dim,
    DimProp,
    Toolbar,
    Int,
    IntProp,
    Color,
    ColorProp,
    RangeProp,
    GlobalContext
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
    getResourceTreeForJsonModel
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

function CharInput(props) {
    const [value, setValue] = useState(props.values[props.index]);
    const inputRef = useRef(null);
    useEffect(() => {
        if (props.index === props.focusIndex) {
            inputRef.current.focus();
        }
    });
    return (
        <input
            ref={inputRef}
            type="text"
            value={props.values[props.index]}
            required
            onChange={
                (e) => {
                    const newValues = props.values.concat();
                    const inputValue = e.target.value;
                    const isConflict = inputValue !== '' && newValues.indexOf(inputValue) !== -1;
                    if (isConflict) {
                        return;
                    }
                    const newValue = e.target.value;
                    setValue(newValue);
                    newValues[props.index] = newValue;
                    if (inputValue !== '') {
                        inputRef.current.blur();
                        props.setFocusIndex(props.index + 1);
                    } else {
                        props.setFocusIndex(props.index);
                    }
                    props.setValues(newValues);
                }
            } size={1} maxLength={1} />
    );
}

function CharAssign(props) {
    const defaultValues = [];
    while(defaultValues.length < props.provider.getWidth()) {
        defaultValues.push('');
    }
    const [values, setValues] = useState(props.codes ? props.codes : defaultValues);
    const [focusIndex, setFocusIndex] = useState(0);
    const saveRef = useRef(null);
    saveRef.current = values;
    const incPosRef = useRef(null);
    useKeyListener(13, () => {if (saveRef.current.indexOf('') !== -1) return false; save(); return true});

    const updateFocusIndex = (newIndex) => {
        const endPos = incPosRef.current.pos + incPosRef.current.page;
        if (endPos < newIndex && endPos < defaultValues.length - 1) {
            incPosRef.current.setPos(incPosRef.current.pos + 1);
        }
        setFocusIndex(newIndex);
    };
    const autoFill = (index) => {
        const newValues = values.concat();
        const leftValues = index === 0 ? [] : values.slice(0, index);
        for(let i = 0; i < leftValues.length; i++) {
            leftValues[i] = leftValues[i].charCodeAt(0);
        }
        let currCode = values[index].charCodeAt(0);
        for (let i = index + 1; i < values.length; i++) {
            currCode++;
            while(leftValues.indexOf(currCode) !== -1) {
                currCode++;
            }
            newValues[i] = String.fromCharCode(currCode);
        }
        setValues(newValues);
    };
    const save = () => {
        props.assign(saveRef.current);
    };

    return (
        <EditorCtx>
            <Stack vertical fit>
                <Content>
                    <FlexRasterIndex
                        cellProvider={props.provider}
                        dim={props.provider.getCharSize()}
                        minWidth={50}
                        titleHeight={22}
                        incPosRef={incPosRef}
                        renderTitle={
                            (index) => {
                                return (
                                    <Stack>
                                        <CharInput setFocusIndex={updateFocusIndex} focusIndex={focusIndex} setValues={setValues} values={values} index={index} />
                                        <div>
                                            <button disabled={values[index] === ''} onClick={() => autoFill(index)}>...</button>
                                        </div>
                                    </Stack>
                                );
                            }
                        } />
                </Content>
                <Content padded>
                    <Stack>
                        <button disabled={values.indexOf('') !== -1} onClick={save}>Save</button>
                        <button onClick={props.cancelHandler}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </EditorCtx>
    );
}


function CharIndex(props) {

    const eContext = useContext(EditorContext);
    const context = useContext(GlobalContext);
    const incPosRef = useRef(null);

    const NewCharModal = useModal();
    const EditCharModal = useModal();
    const AssignCharsModal = useModal();
    const ImportCharsModal = useModal();
    const ApplyFilterModal = useModal();

    const getCharsForIndices = (indices) => {
        const chars = [];
        for (let index of indices) {
            chars.push(props.cellProvider.getCharAtIndex(index));
        }
        return chars;
    };

    const size = props.cellProvider.getCharSize();

    const update = () => {
        incPosRef.current.setMarked([]);
        eContext.updateRaster();
    };

    const addCharsWithBitmap = chars => {
        props.cellProvider.addSpaceForChars(Object.keys(chars).length);
        const size = props.cellProvider.getCharSize();
        for (let code in chars) {
            props.cellProvider.addCharCode(code, false);
            const bitmap = chars[code].getContext('2d').getImageData(0, 0, size.x, size.y);
            props.cellProvider.setBitmapForValue(code, bitmap);
        }
        props.cellProvider.generateFlatImage();
        update();
    };

    const actions = [
        {
            name: 'Edit',
            doAction: (indices) => {
                editChar(indices[0]);
            },
            isHidden: (props) => {
                return (props.marked.length !== 1);
            }
        },
        {
            name: 'Swap',
            doAction: (indices) => {
                const first = indices[0];
                const second = indices[1];
                const firstBitmap = props.cellProvider.getBitmapForIndex(first, 1, false).getContext('2d').getImageData(0, 0, size.x, size.y);
                const secondBitmap = props.cellProvider.getBitmapForIndex(second, 1, false).getContext('2d').getImageData(0, 0, size.x, size.y);
                eContext.doAction(
                    () => {
                        props.cellProvider.setBitmapForIndex(first, secondBitmap);
                        props.cellProvider.setBitmapForIndex(second, firstBitmap);
                        update();
                    },
                    () => {
                        props.cellProvider.setBitmapForIndex(first, firstBitmap);
                        props.cellProvider.setBitmapForIndex(second, secondBitmap);
                        update();
                    }
                );
            },
            isHidden: (props) => {
                return (props.marked.length !== 2);
            }
        },
        {
            name: 'Delete',
            doAction: (indices) => {
                const chars = getCharsForIndices(indices);
                const undoChars = {};
                for (let char of chars) {
                    undoChars[char] = props.cellProvider.getBitmapForValue(char);
                }
                eContext.doAction(
                    () => {
                        for (let char of chars) {
                            props.cellProvider.deleteChar(char, false);
                        }
                        props.cellProvider.generateFlatImage();
                        update();
                    },
                    () => {
                        addCharsWithBitmap(undoChars);
                    }
                );
            }
        },
        {
            name: 'Clear',
            doAction: (indices) => {
                const chars = getCharsForIndices(indices);
                const undoChars = {};
                let clearCanvas = document.createElement('canvas');
                clearCanvas.width = size.x;
                clearCanvas.height = size.y;
                clearCanvas = clearCanvas.getContext('2d');
                clearCanvas.clearRect(0, 0, size.x, size.y);
                for (let char of chars) {
                    undoChars[char] = props.cellProvider.getBitmapForValue(char, 1, false);
                }
                eContext.doAction(
                    () => {
                        for (let char of chars) {
                            props.cellProvider.setBitmapForValue(char, clearCanvas.getImageData(0, 0, size.x, size.y));
                        }
                        update();
                    },
                    () => {
                        addCharsWithBitmap(undoChars);
                    }
                );
            },
        },
        {
            name: 'Reassign',
            doAction: (indices) => {
                const chars = [];
                const images = [];
                indices.sort();
                for (let index of indices) {
                    chars.push(props.cellProvider.getCharAtIndex(index));
                    images.push(props.cellProvider.getBitmapForIndex(index, 1, false).getContext('2d').getImageData(0, 0, size.x, size.y));
                }
                assignImagesToChars(images, chars);
            }
        },
        {
            name: 'Apply...',
            doAction: (indices) => {
                const previewCanvas = [];
                for (let index of indices) {
                    previewCanvas.push({
                        name: props.cellProvider.getCharAtIndex(index),
                        canvas: props.cellProvider.getBitmapForIndex(index, 5, false)
                    });
                }
                ApplyFilterModal.show({
                    canvas: previewCanvas,
                    save: (filter) => {
                        const undoBitmaps = {};
                        const doBitmaps = {};
                        for (let index of indices) {
                            const char = props.cellProvider.getCharAtIndex(index);
                            const bitmap = props.cellProvider.getBitmapForIndex(index, 1, false);
                            undoBitmaps[char] = bitmap;
                            doBitmaps[char] = context.filters.getCanvasWithFiltersApplied(filter, {elem: bitmap, ctx: bitmap.getContext('2d')}, 0, 0, size.x, size.y)[0].elem;
                        }
                        eContext.doAction(
                            () => {
                                for(let char in doBitmaps) {
                                    props.cellProvider.setBitmapForValue(char, doBitmaps[char].getContext('2d').getImageData(0, 0, size.x, size.y));
                                }
                                update();
                            },
                            () => {
                                for(let char in undoBitmaps) {
                                    props.cellProvider.setBitmapForValue(char, undoBitmaps[char].getContext('2d').getImageData(0, 0, size.x, size.y));
                                }
                                update();
                            }
                        );
                       ApplyFilterModal.hide()
                    }
                });
            }
        },
        {
            name: 'Copy',
            doAction: (indices) => {
                const bitmap = props.cellProvider.getBitmapForIndex(indices[0], 1, false).getContext('2d').getImageData(0, 0, size.x, size.y);
                const selection = new CellSelection('bitmap', [[bitmap]]);
                eContext.setSelection(selection);
            },
            isHidden: (props) => {
                return props.marked.length !== 1;
            }
        },
        {
            name: 'Paste',
            doAction: (indices) => {
                const chars = getCharsForIndices(indices);
                const undoChars = {};
                const pasteBitmap = eContext.selection.getCell();
                for (let char of chars) {
                    undoChars[char] = props.cellProvider.getBitmapForValue(char, 1, false);
                }
                eContext.doAction(
                    () => {
                        for (let char of chars) {
                            props.cellProvider.setBitmapForValue(char, pasteBitmap);
                        }
                        update();
                    },
                    () => {
                        addCharsWithBitmap(undoChars);
                    }
                );
            },
            isHidden: () => {
                if (!eContext.selection || !eContext.selection.isBitmap()) {
                    return true;
                }
                const cell = eContext.selection.getCell();
                return (cell.width !== size.x || cell.height !== size.y);
            }
        }
     ];

    const assignChars = (providers) => {
        if (!Array.isArray(providers)) {
            providers = [providers];
        }
        const images = [];
        for (let provider of providers) {
            images.push(provider.getImageData());
        }
        assignImagesToChars(images, null);
    };

    const assignImagesToChars = (images, oldCodes) => {
        const assignProvider = new FontCharIndexProvider({width: size.x, height: size.y, map: {}, image: getCanvasForDim(size.x, size.y)});
        assignProvider.addSpaceForChars(images.length);
        for (let i = 0; i < images.length; i++) {
            const code = String.fromCharCode(32 + i);
            assignProvider.addCharCode(code, false);
            assignProvider.setBitmapForValue(code, images[i]);
        }
        assignProvider.generateFlatImage();

        const assign = (newCodes) => {
            const backups = {};
            const deleted = [];
            const skip = [];
            if (oldCodes !== null) {
                for (let char of oldCodes) {
                    const newIndex = newCodes.indexOf(char);
                    if (newIndex === -1) {
                        backups[char] = props.cellProvider.getBitmapForValue(char, 1, false);
                        deleted.push(char);
                    } else if (newIndex === oldCodes.indexOf(char)) {
                        skip.push(char);
                    }
                }
            }
            for (let char of newCodes) {
                if (skip.indexOf(char) !== -1) continue;
                backups[char] = props.cellProvider.hasCode(char) ? props.cellProvider.getBitmapForValue(char, 1, false) : null;
            }
            eContext.doAction(
                () => {
                    for(let char of deleted) {
                        props.cellProvider.deleteChar(char);
                    }
                    for (let i = 0; i < newCodes.length; i++) {
                        const char = newCodes[i];
                        if (backups[char] === null) {
                            props.cellProvider.addCharCode(char);
                        }
                        props.cellProvider.setBitmapForValue(char, images[i]);
                    }
                    update();
                },
                () => {
                    for(let char of deleted) {
                        props.cellProvider.addCharCode(char);
                    }
                    for(let char in backups) {
                        if (backups[char] === null) {
                            props.cellProvider.deleteChar(char);
                        } else {
                            const bitmap = backups[char].getContext('2d').getImageData(0, 0, size.x, size.y);
                            props.cellProvider.setBitmapForValue(char, bitmap);
                        }
                    }
                    update();
                }
            );
            incPosRef.current.setMarked([]);
            AssignCharsModal.hide();
        };
        AssignCharsModal.show({provider: assignProvider, assign, oldCodes});
    };

    const importChars = () => {
        const selected = (selection) => {
            const providers = [];
            const baseCells = selection.getBaseCells();
            for(let cells of baseCells) {
                const provider = new BitmapCellProvider(1); //size);
                provider.setMap(cells);
                providers.push(provider);
            }
            assignChars(providers);
            ImportCharsModal.hide();
        };
        ImportCharsModal.show({
            selection: {
                type: 'rect',
                width: size.x,
                height: size.y,
                fixed: true,
                multi: true,
                doubleClick: selected
            },
            save: selected
        });
    };

    const deleteCharAtIndex = (index) => {
        const undoChar = props.cellProvider.getCharAt(index).char;
        const undoBitmap = props.cellProvider.getBitmapForIndex(index, 1, false).getContext('2d').getImageData(0, 0, size.x, size.y);
        eContext.doAction(
            () => {
                props.cellProvider.deleteIndex(index);
                update();
            },
            () => {
                props.cellProvider.addCharCode(undoChar);
                props.cellProvider.setBitmapForValue(undoChar, undoBitmap);
                update();
            }
        );
    };

    const newChar = () => {
        const canvas = props.cellProvider.getBitmapForValue('');
        canvas.width = size.x;
        canvas.height = size.y;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const bitmap = canvas.toDataURL('image/png');
        NewCharModal.show({bitmap});
    };

    const editChar = (index) => {
        const bitmap = props.cellProvider.getBitmapForIndex(index, 1, false).toDataURL('image/png')
        const save = (provider) => {
            const doImage = provider.getImageData();
            const actionIndex = index;
            const oldCanvas = props.cellProvider.getBitmapForIndex(actionIndex, 1, false);
            const undoImage = oldCanvas.getContext('2d').getImageData(0, 0, oldCanvas.width, oldCanvas.height);
            eContext.doAction(
                () => {
                    props.cellProvider.setBitmapForIndex(actionIndex, doImage);
                    update();
                },
                () => {
                    props.cellProvider.setBitmapForIndex(actionIndex, undoImage);
                    update();
                }
            );
            EditCharModal.hide();
        };
        EditCharModal.show({title: 'Edit char at index ' + index, save, bitmap});
    };

    return (
        <Fragment>
            <Stack fullHeight border>
                <Toolbar padded>
                    <Stack vertical>
                        <ActionBox material click={newChar}>add</ActionBox>
                        <ActionBox material click={importChars}>playlist_add</ActionBox>
                    </Stack>
                </Toolbar>

                <Content flex>
                    <FlexRasterIndex
                        editorId="fontIndex"
                        cellProvider={props.cellProvider}
                        undoRedo={props.undoRedo}
                        empty="No characters yet, please import or create new ones"
                        dim={props.cellProvider.getCharSize()}
                        incPosRef={incPosRef}
                        minWidth={50}
                        titleHeight={22}
                        rightClick={deleteCharAtIndex}
                        doubleClick={editChar}
                        actions={actions}
                        renderTitle={
                            (index) => {
                                const char = props.cellProvider.getCharAt(index);
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
                        } />
                </Content>
            </Stack>

            <NewCharModal.render name="New Char" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="5"
                    border="1"
                    cancelHandler={NewCharModal.hide}
                    saveHandler={(provider) => {
                        NewCharModal.hide();
                        assignChars(provider);
                    }}
                    bitmap={NewCharModal.params.bitmap} />
            </NewCharModal.render>

            <EditCharModal.render name="Edit Char" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="5"
                    border="1"
                    cancelHandler={EditCharModal.hide}
                    saveHandler={EditCharModal.params.save}
                    bitmap={EditCharModal.params.bitmap} />
            </EditCharModal.render>

            <ImportCharsModal.render name="Select" height={600} width="90%" closeable>
                <EditorCtx>
                    <BitmapSelector
                        zoom="1"
                        border="0"
                        selection={ImportCharsModal.params.selection}
                        cancelHandler={ImportCharsModal.hide}
                        saveHandler={ImportCharsModal.params.save}
                        bitmaps={context.imageResources}
                    />
                </EditorCtx>
            </ImportCharsModal.render>

            <AssignCharsModal.render name="Assign Chars" fit closeable>
                <CharAssign
                    provider={AssignCharsModal.params.provider}
                    assign={AssignCharsModal.params.assign}
                    codes={AssignCharsModal.params.codes}
                    cancelHandler={AssignCharsModal.hide}
                />
            </AssignCharsModal.render>

            <ApplyFilterModal.render height={500} closeable>
                <FiltersSelector bgColor="#000000" canvas={ApplyFilterModal.params.canvas} cancel={ApplyFilterModal.hide} save={ApplyFilterModal.params.save} filters="" />
            </ApplyFilterModal.render>

        </Fragment>
    );
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

    const fontSize = fonts[font].provider.getCharSize();

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
    const ready = useMountedReadyCellProvider(currProvider);

    const fontSize = currProvider ? currProvider.getCharSize() : null;

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

    if (!ready) {
        return '';
    }

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

                eContext.setFixCursor(moveCursor);
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
                        eContext.setFixCursor(null);
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
/*
            if (propsRef.current.moving !== null) {
                d('INIT!...', propsRef.current);
                initMove(propsRef.current.moving);
                setMoving(null);
            }
*/
            activateByClick = e => {
                d('ACTIVATE');
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

    const provider = new BitmapCellProvider(4);
    const map = [];
    for (let j = 0; j < previewHeight; j++) {
        const row = [];
        for (let i = 0; i < previewWidth; i++) {
            row.push('#000000');
        }
        map.push(row);
    }
    provider.setMap(map);
    const zoom = 4;
    const size = provider.getSize();
    const border = 1;

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
        eContext.setFixCursor(moveCursor);
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
                eContext.setFixCursor(null);
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
                                <CellProviderRaster
                                    cellProvider={provider}
                                    width={previewWidth}
                                    height={previewHeight}
                                    posX={0}
                                    posY={0}
                                    border={border}
                                    zoom={zoom}
                                />
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
            font.provider = new FontCharIndexProvider(font);
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
                    const iMax = editFont.provider.getMaxIndex();
                    const canvas = getCanvasForDim(
                    resize.width * editFont.provider.getMaxIndex(),
                        resize.height
                    );
                    const targetWidth = Math.min(resize.width, editFont.width);
                    const targetHeight = Math.min(resize.height, editFont.height);
                    const sourceOffsetX = resize.width < editFont.width ? resize.offsetX : 0;
                    const sourceOffsetY = resize.height < editFont.height ? resize.offsetY : 0;
                    const targetOffsetX = resize.width > editFont.width ? resize.offsetX : 0;
                    const targetOffsetY = resize.height > editFont.height ? resize.offsetY : 0;

                    const ctx = canvas.getContext('2d');
                    const map = {};
                    for(let i = 0; i < iMax; i++) {
                        ctx.drawImage(
                            editFont.provider.getBitmapForIndex(i),
                            sourceOffsetX,
                            sourceOffsetY,
                            targetWidth,
                            targetHeight,
                            (i * resize.width) + targetOffsetX,
                            targetOffsetY,
                            targetWidth,
                            targetHeight
                        );
                        map[editFont.provider.getCharAtIndex(i)] = {x: i * resize.width, y: 0};
                    }
                    const doFont = {
                        id: editFont.id,
                        height: resize.height,
                        width: resize.width,
                        map,
                        imageId: editFont.imageId,
                        image: canvas,
                        provider: null
                    };
                    const undoFont = model.fonts[index];
                    model.fonts[index] = doFont;
                    for (let block of blocks) {
                        block.img = null;
                    }

                    const doAction = () => {
                        model.fonts[index] = doFont;
                        setActive(index);
                        eContext.updateRaster();
                    };
                    const undoAction = () => {
                        model.fonts[index] = undoFont;
                        setActive(index);
                        eContext.updateRaster();
                    };
                    eContext.doAction(doAction, undoAction);
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
                            <CharIndex undoRedo={false} cellProvider={currFont.provider} />
                        </Section>
                    </Stack>
                </ActionFrame>

                <Spacer />

                <ActionFrame type="Preview" flex actions={<button>Export</button>}>
                    <Content flex>
                        <FontPreview model={model} activeFont={active} resource={props.resource}
                                     blocks={blocks} setBlocks={setBlocks}
                                     editorId="preview" />
                    </Content>
                </ActionFrame>
                </Stack>

            <ResizeFontModal.render name="Resize Font" fit closeable>
                <ResizeFontForm save={ResizeFontModal.params.save} hide={ResizeFontModal.hide} font={ResizeFontModal.params.font} />
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