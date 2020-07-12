import React, {useMemo, useState, useContext, useEffect, useRef, Fragment} from "react";
import {CellSelection} from "../classes/CellProvider";
import {
    useModal,
    useKeyListener,
    ItemsStack,
    Section,
    Content,
    Checkbox,
    SwitchButton,
    Stack,
    Dim,
    Toolbar,
    Int,
    Color,
    GlobalContext
} from "./BaseComponents";
import {d, rgb2hex} from '../helper/helper';

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

    const getCharsForIndices = (indices) => {
        const chars = [];
        for (let index of indices) {
            chars.push(props.cellProvider.getCharAtIndex(index));
        }
        return chars;
    };

    const size = props.cellProvider.getSize();

    const update = () => {
        incPosRef.current.setMarked([]);
        eContext.updateRaster();
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
                const firstBitmap = props.cellProvider.getBitmapForIndex(first, 1, false).getContext('2d').getImageData(0, 0, size, size);
                const secondBitmap = props.cellProvider.getBitmapForIndex(second, 1, false).getContext('2d').getImageData(0, 0, size, size);
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
                    undoChars[char] = props.cellProvider.getBitmapForValue(char, 1, false);
                }
                eContext.doAction(
                    () => {
                        for (let char of chars) {
                            props.cellProvider.deleteChar(char);
                        }
                        update();
                    },
                    () => {
                        for (let code in undoChars) {
                            props.cellProvider.addCharCode(code);
                            const bitmap = undoChars[code].getContext('2d').getImageData(0, 0, size, size);
                            props.cellProvider.setBitmapForValue(code, bitmap);
                        }
                        update();
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
                clearCanvas.width = size;
                clearCanvas.height = size;
                clearCanvas = clearCanvas.getContext('2d');
                clearCanvas.clearRect(0, 0, size, size);
                for (let char of chars) {
                    undoChars[char] = props.cellProvider.getBitmapForValue(char, 1, false);
                }
                eContext.doAction(
                    () => {
                        for (let char of chars) {
                            props.cellProvider.setBitmapForValue(char, clearCanvas.getImageData(0, 0, size, size));
                        }
                        update();
                    },
                    () => {
                        for (let code in undoChars) {
                            props.cellProvider.addCharCode(code);
                            const bitmap = undoChars[code].getContext('2d').getImageData(0, 0, size, size);
                            props.cellProvider.setBitmapForValue(code, bitmap);
                        }
                        update();
                    }
                );
            },
        },
        {
            name: 'Reassign',
            doAction: (indices) => {
                const size = props.cellProvider.getSize();
                const chars = [];
                const images = [];
                indices.sort();
                for (let index of indices) {
                    chars.push(props.cellProvider.getCharAtIndex(index));
                    images.push(props.cellProvider.getBitmapForIndex(index, 1, false).getContext('2d').getImageData(0, 0, size, size));
                }
                assignImagesToChars(images, chars);
            }
        },
        {
            name: 'Copy',
            doAction: (indices) => {
                const bitmap = props.cellProvider.getBitmapForIndex(indices[0], 1, false).getContext('2d').getImageData(0, 0, size, size);
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
                        for (let code in undoChars) {
                            props.cellProvider.addCharCode(code);
                            const bitmap = undoChars[code].getContext('2d').getImageData(0, 0, size, size);
                            props.cellProvider.setBitmapForValue(code, bitmap);
                        }
                        update();
                    }
                );
            },
            isHidden: () => {
                if (!eContext.selection || !eContext.selection.isBitmap()) {
                    return true;
                }
                const cell = eContext.selection.getCell();
                return (cell.width !== size || cell.height !== size);
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
        const size = props.cellProvider.getSize();
        const assignProvider = new FontCharIndexProvider({width: size, height: size, map: {}});
        for (let i = 0; i < images.length; i++) {
            const code = String.fromCharCode(32 + i);
            assignProvider.addCharCode(code);
            assignProvider.setBitmapForValue(code, images[i]);
        }

        const assign = (newCodes) => {
            const backups = {};
            const size = props.cellProvider.getSize();
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
                            const bitmap = backups[char].getContext('2d').getImageData(0, 0, size, size);
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
            const size = props.cellProvider.getSize();
            const providers = [];
            const baseCells = selection.getBaseCells();
            for(let cells of baseCells) {
                const provider = new BitmapCellProvider(size);
                provider.setMap(cells);
                providers.push(provider);
            }
            assignChars(providers);
            ImportCharsModal.hide();
        };
        ImportCharsModal.show({
            selection: {
                type: 'rect',
                width: size,
                height: size,
                multi: true,
                doubleClick: selected
            },
            bitmap: props.source,
            save: selected
        });
    };

    const deleteCharAtIndex = (index) => {
        const undoChar = props.cellProvider.getCharAt(index).char;
        const size = props.cellProvider.getSize();
        const undoBitmap = props.cellProvider.getBitmapForIndex(index, 1, false).getContext('2d').getImageData(0, 0, size, size);
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
        canvas.width = 8;
        canvas.height = 8;
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
                <Content padded>
                    <Stack vertical>
                        <button onClick={newChar}>New</button>
                        <button onClick={importChars}>Import</button>
                    </Stack>
                </Content>

                <Content flex>
                    <FlexRasterIndex
                        editorId="fontIndex"
                        cellProvider={props.cellProvider}
                        undoRedo
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

        </Fragment>
    );
}

function FiltersSelector(props) {
    const context = useContext(GlobalContext);
    const [bgColor, setBgColor] = useState(props.bgColor ? props.bgColor : '#000000');
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
        const baseCanvas = props.canvas;
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
        preview =
            <Stack vertical border fullHeight>
                <Toolbar>
                    <Content padded>Preview:</Content>
                    {props.bgChange && <Color value={bgColor} set={setBgColor} />}
                </Toolbar>
                <Content padded><canvas className="thin-boxed" ref={previewRef} width={props.canvas.width} height={props.canvas.height} /></Content>
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
                        <Content padded key={def.key}>
                            <Stack alignItems="center">
                                <Content>{def.key}:</Content>
                                <Content>
                                    <Color
                                        value={colorValue}
                                        set={(value) => {
                                            const newFilters = [...filters];
                                            newFilters[active][def.key] = value;
                                            setFilters(newFilters);
                                        }}
                                    />
                                </Content>
                            </Stack>
                        </Content>
                    );
                    break;

                case 1:
                    const controls =
                        <Stack alignItems="center">
                            <Content padded>
                                <kbd>{def.min}</kbd>
                            </Content>
                            <input
                                type="range"
                                onChange={
                                    (e) => {
                                        const value = e.target.value;
                                        const newFilters = [...filters];
                                        newFilters[active][def.key] = value;
                                        setFilters(newFilters);
                                    }
                                }
                                min={def.min}
                                max={def.max}
                                step={0.01}
                                value={item[def.key]}
                            />
                            <Content padded>
                                <kbd>{def.max}</kbd>
                            </Content>
                            <Content>
                                <input type="text" size={String(def.max).length + 3} readOnly value={item[def.key]} />
                            </Content>
                        </Stack>;

                    inputs.push(
                        <Content padded key={def.key}>
                            <Stack>
                                <Content>{def.key}:</Content>
                                <Content>
                                    {controls}
                                </Content>
                            </Stack>
                        </Content>
                    );
                    break;

                case 4:
                    inputs.push(
                        <Content padded key={def.key}>
                            <Stack alignItems="center">
                                <Content>{def.key}:</Content>
                                <Content>
                                    <Int
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
                                </Content>
                            </Stack>
                        </Content>

                    );
                    break;

                default:
                    d('???', def);
                    break;
            }
        }
        return (
            <Fragment>
                {inputs}
            </Fragment>
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
                    <button onClick={() => {
                        props.save(getFilterString());
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
        text, setText,
        posX, setPosX,
        posY, setPosY,
        rasterize, setRasterize,
        textAlign, setTextAlign,
        autoCenterX, setAutoCenterX,
        autoCenterY, setAutoCenterY,
        screenX,
        screenY,
        fontSize,
        filters, setFilters,
        canvas,
        bgColor
    } = props;

    const changeFilters = () => {
        FiltersModal.show({
            title: 'Change assigned filters',
            filters,
            save: (newFilters) => {
                setFilters(newFilters);
                FiltersModal.hide();
            }
        });
    };

    return (
        <Fragment>
            <Dim name="Position"
                 setX={setPosX}
                 setY={setPosY}
                 stepX={rasterize ? fontSize : 1}
                 stepY={rasterize ? fontSize : 1}
                 minX={0}
                 readOnlyX={autoCenterX} readOnlyY={autoCenterY}
                 minY={0} maxX={screenX} maxY={screenY} x={posX} y={posY} buttons/>
            <Stack fit>
                <div>Auto-Center:</div>
                <Checkbox name="X" value={autoCenterX} set={setAutoCenterX}/>
                <Checkbox name="Y" value={autoCenterY} set={setAutoCenterY}/>
            </Stack>
            <Checkbox name="Rasterize" value={rasterize} set={setRasterize}/>
            <Stack padded>
                <div>Text align:</div>
                <div className="padded">
                    <Stack>
                        <SwitchButton enabled={textAlign === 'left'} switch={() => setTextAlign('left')}><i
                            className="material-icons md-18">format_align_left</i></SwitchButton>
                        <SwitchButton enabled={textAlign === 'center'} switch={() => setTextAlign('center')}><i
                            className="material-icons md-18">format_align_center</i></SwitchButton>
                        <SwitchButton enabled={textAlign === 'right'} switch={() => setTextAlign('right')}><i
                            className="material-icons md-18">format_align_right</i></SwitchButton>
                    </Stack>
                </div>
            </Stack>
            <textarea rows={10} cols={40} value={text} onChange={(e) => {
                setText(e.target.value);
            }}></textarea>
            <Stack>
                <Content>Filters: </Content>
                <Content flex>
                    <Stack noGap>
                        <Content flex><input onClick={changeFilters} className="full-h" type="text" value={filters} readOnly /></Content>
                        <Content><button onClick={() => {setFilters('')}}>X</button></Content>
                    </Stack>
                </Content>
            </Stack>
            <FiltersModal.render height={500} closeable>
                <FiltersSelector bgColor={bgColor} canvas={canvas} cancel={FiltersModal.hide} save={FiltersModal.params.save} filters={FiltersModal.params.filters} />
            </FiltersModal.render>
        </Fragment>
    );
}

function FontPreview(props) {
    const context = useContext(GlobalContext);
    const ready = useMountedReadyCellProvider(props.provider);
    const [active, setActive] = useState(0);
    const [zoom, setZoomRaw] = useState(2);
    const [bgColor, setBgColor] = useState('#000000');
    const [screenX, setScreenX] = useState(320);
    const [screenY, setScreenY] = useState(200);
    const [showMarker, setShowMarker] = useState(false);
    const fontSize = props.provider.getSize();
    const defaultBlock = {
        posX: 0,
        posY: 0,
        text: '',
        filters: '',
        img: null,
        textAlign: 'left',
        autoCenterX: false,
        autoCenterY: false,
        rasterize: false
    };
    const [blocks, setBlocks] = useState([
        Object.assign({name: 'Demo text'}, defaultBlock)
    ]);

    const propsRef = useRef(null);
    const overlayRef = useRef(null);
    const canvasRef = useRef(null);
    const currBlockRef = useRef(null);

    currBlockRef.current = blocks.length === 0 ? null : blocks[active];

    const invalidateImages = () => {
        for (let block of propsRef.current.blocks) {
            block.img = null;
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
        screenY
    };

    const getBlockImage = (block, raw = false) => {
        if (block.img === null) {
            const lines = block.text.split('\n');
            let maxWidth = 0;
            for (let line of lines) {
                maxWidth = Math.max(maxWidth, line.length);
            }
            const blockHeight = fontSize * lines.length;
            const blockWidth = fontSize * maxWidth;

            const canvas = document.createElement('canvas');
            canvas.width = blockWidth * zoom || 1;
            canvas.height = blockHeight * zoom || 1;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const size = fontSize * zoom;
            for (let y = 0; y < lines.length; y++) {
                let line = lines[y];
                if (block.textAlign !== 'left' && line.length < maxWidth) {
                    const pad = block.textAlign === 'right' ? maxWidth : (line.length + ((maxWidth - line.length) >> 1));
                    line = line.padStart(pad, ' ');
                }
                for (let x = 0; x < line.length; x++) {
                    const img = props.provider.getBitmapForValue(line[x], zoom, false);
                    ctx.drawImage(img, x * size, y * size);
                }
            }
            let elem = canvas;
            block.rawImg = canvas;
            if (block.filters) {
                const transformed = context.filters.getCanvasWithFiltersApplied(block.filters, {elem: canvas, ctx}, 0, 0, canvas.width, canvas.height);
                elem = transformed[0].elem;
            }
            block.img = {canvas: elem};
        }
        return raw ? block.rawImg : block.img.canvas;
    };

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let block of propsRef.current.blocks) {
            ctx.drawImage(getBlockImage(block), block.posX * propsRef.current.zoom, block.posY * propsRef.current.zoom);
        }
    });

    if (!ready) {
        return '';
    }

    const setState = (newProps) => {
        const curr = currBlockRef.current;
        const {text, textAlign, filters, rasterize, posX, posY, autoCenterX, autoCenterY} = curr;
        const change = Object.assign({text, textAlign, filters, rasterize, posX, posY, autoCenterX, autoCenterY}, newProps);

        const getRasterized = (value) => {
            if (!change.rasterize) {
                return value;
            }
            return Math.floor(value/fontSize) * fontSize;
        };

        const lines = currBlockRef.current.text.split('\n');
        let maxWidth = 0;
        for (let line of lines) {
            maxWidth = Math.max(maxWidth, line.length);
        }
        const blockHeight = fontSize * lines.length;
        const blockWidth = fontSize * maxWidth;

        if (change.autoCenterX) {
            let centeredX = getRasterized(Math.ceil(screenX/2) - Math.ceil(blockWidth/2));
            if (change.posX !== centeredX) {
                change.posX = centeredX;
            }
        } else if (change.rasterize) {
            let rasterPos = getRasterized(change.posX);
            if (rasterPos !== change.posX) {
                change.posX = rasterPos;
            }
        }
        if (change.autoCenterY) {
            const centeredY = getRasterized(Math.ceil(screenY/2) - Math.ceil(blockHeight/2));
            if (change.posY !== centeredY) {
                change.posY = centeredY;
            }
        } else if (change.rasterize) {
            let rasterPos = getRasterized(change.posY);
            if (rasterPos !== change.posY) {
                change.posY =rasterPos;
            }
        }

        let hasChanged = false;
        let invalidateImage = false;
        for (let key in change) {
            if (change[key] !== curr[key]) {
                hasChanged = true;
                if (['text', 'textAlign', 'filters'].indexOf(key) !== -1) {
                    invalidateImage = true;
                }
            }
        }

        if (invalidateImage) {
            change.img = null;
        }
        if (hasChanged) {
            const newBlocks = [...blocks];
            newBlocks[active] = {...curr, ...change};
            setBlocks(newBlocks);
        }
    };

    const getSetProp = (prop, invalidateImage = false) => {
        return (value) => {
            setState({[prop]: value});
        }
    };

    let marker = '';
    const currBlock = currBlockRef.current;
    if (blocks.length > 0) {
        const currLines = currBlock.text.split('\n');
        let currMaxWidth = 0;
        for (let currLine of currLines) {
            currMaxWidth = Math.max(currMaxWidth, currLine.length);
        }
        const currBlockHeight = fontSize * currLines.length;
        const currBlockWidth = fontSize * currMaxWidth;

        if (currBlockWidth > 0 && currBlockHeight > 0 && !(currBlock.autoCenterX && currBlock.autoCenterY)) {
            const setCurrPosX = getSetProp('posX');
            const setCurrPosY = getSetProp('posY');

            let moveCursor = 'move';
            if (currBlock.autoCenterY) {
                moveCursor = 'hresize';
            } else if (currBlock.autoCenterX) {
                moveCursor = 'vresize';
            }
            const initMove = (e) => {
                const rect = overlayRef.current.getBoundingClientRect();
                let lastX = Math.floor((e.clientX - rect.x)/zoom);
                let lastY = Math.floor((e.clientY - rect.y)/zoom);

                const moveListener = (e) => {
                    const currX = Math.floor((e.clientX - rect.x)/zoom);
                    const currY = Math.floor((e.clientY - rect.y)/zoom);

                    const cBlock = currBlockRef.current;
                    const deltaX = currX - lastX;
                    if (deltaX !== 0) {
                        const newX = Math.max(0, Math.min(cBlock.posX + deltaX, screenX - 1));
                        if (newX !== cBlock.posX) {
                            setCurrPosX(newX);
                            lastX = newX;
                        }
                    }
                    const deltaY = currY - lastY;
                    if (deltaY !== 0) {
                        const newY = Math.max(0, Math.min(cBlock.posY + deltaY, screenY - 1));
                        if (newY !== cBlock.posY) {
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
                        setShowMarker(false);
                        e.preventDefault();
                        e.stopPropagation();
                    },
                    {
                        once: true,
                        capture: false
                    }
                );
                setShowMarker(true);
            };

            marker = (<CellMarker
                blink
                initMove={initMove}
                border={0}
                posX={currBlockRef.current.posX}
                posY={currBlockRef.current.posY}
                zoom={zoom}
                moveCursor={'cursor-' + moveCursor}
                bottom={showMarker && (currBlockRef.current.posY + currBlockHeight < screenY)}
                top={showMarker}
                left={showMarker}
                right={showMarker && (currBlockRef.current.posX + currBlockWidth < screenX)}
                size={1}
                width={Math.min(currBlockWidth, screenX - currBlockRef.current.posX)}
                height={Math.min(currBlockHeight, screenY - currBlockRef.current.posY)}
                highlight
            />);
        }
    }
    const realWidth = screenX * zoom;
    const realHeight = screenY * zoom;

    const getTextBlockProperties = (index) => {
        const item = propsRef.current.blocks[index];
        return (
            <BlockProperties
                fontSize={fontSize}
                text={item.text}
                setText={getSetProp('text')}
                posX={item.posX}
                setPosX={getSetProp('posX')}
                posY={item.posY}
                setPosY={getSetProp('posY')}
                textAlign={item.textAlign}
                setTextAlign={getSetProp('textAlign')}
                autoCenterX={item.autoCenterX}
                setAutoCenterX={getSetProp('autoCenterX')}
                autoCenterY={item.autoCenterY}
                setAutoCenterY={getSetProp('autoCenterY')}
                rasterize={item.rasterize}
                setRasterize={getSetProp('rasterize')}
                filters={item.filters}
                setFilters={getSetProp('filters')}
                screenX={screenX}
                screenY={screenY}
                canvas={getBlockImage(item, true)}
                bgColor={bgColor}
            />
        );
    };

    return (
        <Stack fullHeight>
            <Section name="Text blocks">
                <ItemsStack
                    items={blocks}
                    active={active}
                    setActive={setActive}
                    getName={(item) => item.name}
                    setItems={(newBlocks) => {
                        let changed = false;
                        if (newBlocks.length !== blocks.length) {
                            changed = true;
                        } else {
                            for (let i = 0; i < blocks.length; i++) {
                                if (blocks[i].name !== newBlocks[i].name) {
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
                    getClone={(item) => {
                        return Object.assign({name: item.name + ' Clone'}, item)
                    }}
                    getNewItem={() => {
                        return Object.assign({name: 'New Item #' + (blocks.length + 1)}, defaultBlock)
                    }}
                    getProperties={getTextBlockProperties}
                    empty="Add text block"
                    width={200}
                />
            </Section>

            <Section name="Preview" flex>
                <Stack vertical border>
                    <Toolbar>
                        <Dim name="Size" x={screenX} setX={setScreenX} y={screenY} setY={setScreenY} min={1} max={1024} buttons />
                        <Int buttons name="Zoom:" value={zoom} set={setZoom} min={1} max={5} />
                        <Color value={bgColor} set={setBgColor} />
                    </Toolbar>
                    <Content flex>
                        <div style={{position: 'relative', overflow: 'auto', height: '100%'}}>
                            <div style={{position: 'absolute'}}>
                                <Content padded>
                                    <canvas className="thin-boxed" ref={canvasRef} width={screenX * zoom} height={screenY * zoom} />
                                    <div ref={overlayRef} className="" style={{position: 'absolute', backgroundColor: 'transparent', width: realWidth, height: realHeight, top: 6, left: 6}}>
                                        {marker}
                                    </div>
                                </Content>
                            </div>
                        </div>
                    </Content>
                </Stack>
            </Section>
        </Stack>
    );
}

function FontMapEditor(props) {
    const bitmap = useMemo(() => {
        return props.fontMap.image.toDataURL('image/png');
    }, []);
    const provider = new FontCharIndexProvider(props.fontMap);

    return (
        <EditorCtx>
            <Stack vertical fullHeight>
                <Section name="Font">
                    <CharIndex cellProvider={provider} source={bitmap} />
                </Section>
                <Content flex>
                    <FontPreview editorId="preview" provider={provider} source={bitmap} />
                </Content>
            </Stack>
        </EditorCtx>
    );
}

export default FontMapEditor;