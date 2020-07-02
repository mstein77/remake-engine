import React, {useMemo, useState, useContext, useEffect, useRef, Fragment} from "react";
import {CellSelection} from "../classes/CellProvider";
import {closeModals, d, Section, Modal, Checkbox, SwitchButton, Stack, Dim, Toolbar, Int, Color, CssContext, openModal} from "./BaseComponents";
import {
    EditorCtx,
    EditorContext,
    BitmapSelectorModal,
    useMountedReadyCellProvider,
    FlexRasterIndex,
    BitmapEditor,
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
                        props.setFocusIndex(props.index + 1);
                    } else {
                        props.setFocusIndex(props.index);
                    }
                    props.setValues(newValues);
                }
            } size={1} maxLength={1} />
    );
}

function CharAssignModal(props) {
    const defaultValues = [];
    while(defaultValues.length < props.provider.getWidth()) {
        defaultValues.push('');
    }
    const [values, setValues] = useState(defaultValues);
    const [focusIndex, setFocusIndex] = useState(0);
    const incPosRef = useRef(null);

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
    return (
        <EditorCtx>
            <Modal name="Save as..." closeable>
                <Stack dir="y">
                    <div>
                        <FlexRasterIndex
                            cellProvider={props.provider}
                            minWidth={50}
                            titleHeight={22}
                            incPosRef={incPosRef}
                            renderTitle={
                                (index) => {
                                    return (
                                        <Stack dir="x">
                                            <CharInput setFocusIndex={updateFocusIndex} focusIndex={focusIndex} setValues={setValues} values={values} index={index} />
                                            <div>
                                                <button disabled={values[index] === ''} onClick={() => autoFill(index)}>...</button>
                                            </div>
                                        </Stack>
                                    );
                                }
                            } />
                    </div>
                    <div>
                        <button disabled={values.indexOf('') !== -1} onClick={() => props.assign(values)}>Save</button>
                        <button onClick={closeModals}>Cancel</button>
                    </div>
                </Stack>
            </Modal>
        </EditorCtx>
    );
}


function CharIndex(props) {

    const eContext = useContext(EditorContext);
    const incPosRef = useRef(null);

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
            name: 'Copy',
            doAction: (indices) => {
                const bitmap = props.cellProvider.getBitmapForIndex(indices[0], 1, false).getContext('2d').getImageData(0, 0, size, size);
                const selection = new CellSelection('bitmap', [[bitmap]]);
                d(selection);
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

    const saveChars = (providers) => {
        if (!Array.isArray(providers)) {
            providers = [providers];
        }
        const size = props.cellProvider.getSize();
        const assignProvider = new FontCharIndexProvider({width: size, height: size, map: {}});
        for (let i = 0; i < providers.length; i++) {
            const code = String.fromCharCode(32 + i);
            assignProvider.addCharCode(code);
            assignProvider.setBitmapForValue(code, providers[i].getImageData());
        }

        const assign = (values) => {
            const undoChars = {};
            const size = props.cellProvider.getSize();
            for (let value of values) {
                undoChars[value] = props.cellProvider.hasCode(value) ? props.cellProvider.getBitmapForValue(value, 1, false) : null;
            }
            eContext.doAction(
                () => {
                    let i = 0;
                    for(let code of values) {
                        props.cellProvider.addCharCode(code);
                        props.cellProvider.setBitmapForValue(code, providers[i].getImageData());
                        i++;
                    }
                    update();
                },
                () => {
                    for(let code in undoChars) {
                        if (undoChars[code] === null) {
                            props.cellProvider.deleteChar(code);
                        } else {
                            const bitmap = undoChars[code].getContext('2d').getImageData(0, 0, size, size);
                            props.cellProvider.setBitmapForValue(code, bitmap);
                        }
                    }
                    update();
                }
            );
            incPosRef.current.setMarked([]);
            closeModals();
        };
        openModal(
            <CharAssignModal
                provider={assignProvider}
                assign={assign}
            />
        );
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
            saveChars(providers);
        };
        BitmapSelectorModal(
            {
                name: 'Select Rect',
                selection: {
                    type: 'rect',
                    width: size,
                    height: size,
                    multi: true,
                    doubleClick: selected
                },
                bitmap: props.source
            },
            selected
        );
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

        openModal(
            <Modal name="Edit" closeable>
                <div style={{height: 600}}>
                    <BitmapEditor
                        resize={false}
                        zoom="5"
                        border="1"
                        cancelHandler={() => {closeModals()}}
                        saveHandler={saveChars}
                        bitmap={bitmap} />
                </div>
            </Modal>
        );
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
            closeModals();
        };
        openModal(
            <Modal name="Edit" closeable>
                <div style={{height: 600}}>
                    <BitmapEditor
                        resize={false}
                        zoom="5"
                        border="1"
                        cancelHandler={() => {closeModals()}}
                        saveHandler={save}
                        bitmap={bitmap} />
                </div>
            </Modal>
        );
    };

    return (
        <div>
            <Stack dir="x" full border>
                <div className="padded">
                    <Stack dir="y">
                        <button onClick={newChar}>New</button>
                        <button onClick={importChars}>Import</button>
                    </Stack>
                </div>
                <div className="flex">
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
                                    <Stack dir="x">
                                        <div className="flex">
                                            <kbd className="padded title-area-active">{char.char}</kbd>
                                        </div>
                                        <div>
                                            <kbd>{char.code}</kbd>
                                        </div>
                                    </Stack>
                                );
                            }
                        } />
                </div>
            </Stack>
        </div>
    );
}

function FontPreview(props) {

    const ready = useMountedReadyCellProvider(props.provider);
    const [demoText, setDemoText] = useState('');
    const [zoom, setZoomRaw] = useState(2);
    const [bgColor, setBgColor] = useState('#000000');
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [screenX, setScreenX] = useState(320);
    const [screenY, setScreenY] = useState(200);
    const [showMarker, setShowMarker] = useState(false);
    const [textAlign, setTextAlignRaw] = useState('left');
    const [autoCenterX, setAutoCenterX] = useState(false);
    const [autoCenterY, setAutoCenterY] = useState(false);
    const [rasterize, setRasterize] = useState(false);
    const propsRef = useRef(null);
    const overlayRef = useRef(null);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const eContext = useEditorContextPart('preview', () => {
        imgRef.current = null;
    });
    const setTextAlign = (value) => {
        setTextAlignRaw(value);
        imgRef.current = null;
    };
    const setZoom = (value) => {
        setZoomRaw(value);
        imgRef.current = null;
    };
    propsRef.current = {
        zoom,
        posX,
        posY,
        screenX,
        screenY
    };

    useEffect(() => {
        if (!canvasRef.current || !imgRef.current) {
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgRef.current.canvas, propsRef.current.posX * propsRef.current.zoom, propsRef.current.posY * propsRef.current.zoom);
    }, [imgRef.current, ready, textAlign, demoText, zoom, bgColor, posX, posY, screenX, screenY]);

    if (!ready) {
        return '';
    }

    const lines = demoText.split('\n');
    let maxWidth = 0;
    for (let line of lines) {
        maxWidth = Math.max(maxWidth, line.length);
    }
    const blockHeight = props.provider.getSize() * lines.length;
    const blockWidth = props.provider.getSize() * maxWidth;

    if (!imgRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = blockWidth * zoom || 1;
        canvas.height = blockHeight * zoom || 1;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const lines = demoText.split('\n');
        const size = props.provider.getSize() * zoom;
        for (let y = 0; y < lines.length; y++) {
            let line = lines[y];
            if (textAlign !== 'left' && line.length < maxWidth) {
                const pad = textAlign === 'right' ? maxWidth : (line.length + ((maxWidth - line.length) >> 1));
                line = line.padStart(pad, ' ');
            }
            for (let x = 0; x < line.length; x++) {
                const img = props.provider.getBitmapForValue(line[x], zoom, false);
                ctx.drawImage(img, x * size, y * size);
            }
        }
        imgRef.current = {canvas};
    }

    const getRasterized = (value) => {
        if (!rasterize) {
            return value;
        }
        return Math.floor(value/props.provider.getSize()) * props.provider.getSize();
    };

    if (autoCenterX) {
        let centeredX = getRasterized(Math.ceil(screenX/2) - Math.ceil(blockWidth/2));
        if (posX !== centeredX) {
            setPosX(centeredX);
        }
    } else if (rasterize) {
        let rasterPos = getRasterized(posX);
        if (rasterPos !== posX) {
            setPosX(rasterPos);
        }
    }
    if (autoCenterY) {
        const centeredY = getRasterized(Math.ceil(screenY/2) - Math.ceil(blockHeight/2));
        if (posY !== centeredY) {
            setPosY(centeredY);
        }
    } else if (rasterize) {
        let rasterPos = getRasterized(posY);
        if (rasterPos !== posY) {
            setPosY(rasterPos);
        }
    }
    let marker = '';
    if (blockWidth > 0 && blockHeight > 0 && !(autoCenterX && autoCenterY)) {
        let moveCursor = 'move';
        if (autoCenterY) {
            moveCursor = 'hresize';
        } else if (autoCenterX) {
            moveCursor = 'vresize';
        }
        const initMove = (e) => {
            const rect = overlayRef.current.getBoundingClientRect();
            let lastX = Math.floor((e.clientX - rect.x)/zoom);
            let lastY = Math.floor((e.clientY - rect.y)/zoom);

            const moveListener = (e) => {
                const currX = Math.floor((e.clientX - rect.x)/zoom);
                const currY = Math.floor((e.clientY - rect.y)/zoom);

                const deltaX = currX - lastX;
                if (deltaX !== 0) {
                    const newX = Math.max(0, Math.min(posX + deltaX, screenX - 1));
                    if (newX !== posX) {
                        setPosX(newX);
                    }
                }
                const deltaY = currY - lastY;
                if (deltaY !== 0) {
                    const newY = Math.max(0, Math.min(posY + deltaY, screenY - 1));
                    if (newY !== posY) {
                        setPosY(newY);
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
            posX={posX}
            posY={posY}
            zoom={zoom}
            moveCursor={'cursor-' + moveCursor}
            bottom={showMarker && (posY + blockHeight < screenY)}
            top={showMarker}
            left={showMarker}
            right={showMarker && (posX + blockWidth < screenX)}
            size={1}
            width={Math.min(blockWidth, screenX - posX)}
            height={Math.min(blockHeight, screenY - posY)}
            highlight
        />);
    }
    const realWidth = screenX * zoom;
    const realHeight = screenY * zoom;

    return (
        <Stack dir="x" full>
            <Section name="Screen">
                <div className="padded">
                    <Dim name="Position"
                         setX={setPosX} setY={setPosY} minX={0}
                         readOnlyX={autoCenterX} readOnlyY={autoCenterY}
                         minY={0} maxX={screenX} maxY={screenY} x={posX} y={posY} buttons />
                    <Stack dir="x">
                        <div>Auto-Center: </div>
                        <Checkbox name="X" value={autoCenterX} set={setAutoCenterX} />
                        <Checkbox name="Y" value={autoCenterY} set={setAutoCenterY} />
                    </Stack>
                    <Checkbox name="Rasterize" value={rasterize} set={setRasterize} />
                    <Stack dir="x" padded>
                        <div>Text align: </div>
                        <div className="padded">
                            <Stack dir="x">
                                <SwitchButton enabled={textAlign === 'left'} switch={() => setTextAlign('left')}><i className="material-icons md-18">format_align_left</i></SwitchButton>
                                <SwitchButton enabled={textAlign === 'center'} switch={() => setTextAlign('center')}><i className="material-icons md-18">format_align_center</i></SwitchButton>
                                <SwitchButton enabled={textAlign === 'right'} switch={() => setTextAlign('right')}><i className="material-icons md-18">format_align_right</i></SwitchButton>
                            </Stack>
                        </div>
                    </Stack>
                    <textarea rows={20} cols={40} value={demoText} onChange={(e) => {setDemoText(e.target.value); imgRef.current = null}}></textarea>
                </div>
            </Section>

            <Section name="Preview" flex>
                <Stack dir="y" border>
                <Toolbar>
                    <Dim name="Size" x={screenX} setX={setScreenX} y={screenY} setY={setScreenY} min={1} max={1024} buttons />
                    <Int buttons name="Zoom:" value={zoom} set={setZoom} min={1} max={5} />
                    <Color value={bgColor} set={setBgColor} />
                </Toolbar>
                <div className="padded flex">
                    <div className="thin-boxed min-content">
                        <canvas ref={canvasRef} width={screenX * zoom} height={screenY * zoom} />
                    </div>
                    <div className="rel-canvas" style={{height: 0}}>
                        <div ref={overlayRef} className="" style={{position: 'relative', backgroundColor: 'transparent', width: realWidth, height: realHeight, top: -(realHeight + 1), left: 1}}>
                            {marker}
                        </div>
                    </div>
                </div>
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
            <Stack dir="y" full>
                <Section name="Font">
                    <CharIndex cellProvider={provider} source={bitmap} />
                </Section>
                <div className="flex">
                    <FontPreview editorId="preview" provider={provider} source={bitmap} />
                </div>
            </Stack>
        </EditorCtx>
    );
}

export default FontMapEditor;