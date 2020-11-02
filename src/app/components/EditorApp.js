import React, {Fragment, useState, useContext, useRef, useEffect} from "react";
import {
    CellGridController,
    Page,
    Canvas,
    Color,
    Dim,
    TextField,
    IndexController,
    IndexPicker,
    Stack,
    Title,
    Scene3d,
    Content,
    Section,
    PropertyGrid,
    RadioProp,
    useUpdates,
    TextArea,
    GlobalContext,
    GlobalCtx,
    useModal,
    useComponentUpdate,
    useResize,
    Int,
    FiltersSelector, useKeyListener
} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import TextPaneEditor from "./TextPaneEditor";
import SpriteSheetEditor from "./SpriteSheetEditor";
import {BitmapEditor, BitmapSelector, EditorContext, EditorCtx, FlexRasterIndex} from "./Raster";
import './EditorApp.css';
import {
    d,
    getCanvasForBitmap,
    getCanvasForDim,
    getColorsFromCanvas,
    getEmptyImageData,
    getJsonModelOfInstance,
    getRebuildJsonForModel,
    getResourceTreeForJsonModel
} from '../helper/helper';
import ReactDOM from "react-dom";
import {ColorIndex, TileIndex, CharIndex, AssignIndex} from "../classes/IndexProvider";
import {IndexGrid, BitmapGrid} from "../classes/Grid";
import {BitmapCellProvider, CellSelection, FontCharIndexProvider} from "../classes/CellProvider";

function RestorableContent(props) {
    const eContext = useContext(EditorContext);
    const ConfirmModal = useModal();
    props.confirmRef.current = (confirmedAction) => {
        if (!eContext.hasStorePos()) {
            ConfirmModal.show({
                action: () => {
                    ConfirmModal.hide();
                    confirmedAction()
                }
            });
        } else {
            confirmedAction();
        }
    };
    const leaveHandler = function (e) {
        if (!eContext.hasStorePos()) {
            const confirmationMessage = 'You have unsaved changes, are you sure that you want to leave?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    };
    useEffect(() => {
        window.addEventListener('beforeunload', leaveHandler);
        return () => {
            window.removeEventListener('beforeunload', leaveHandler);
        }
    }, []);
    return <Fragment>
        {props.children}

        <ConfirmModal.render name="Please confirm" fit closeable>
            <Stack vertical border>
                <Content padded>
                    <Stack vertical alignItems="center">
                        <Content padded>You have unsaved changes!</Content>
                        <Content />
                        <Content padded>Are you sure???</Content>
                        <Content> </Content>
                    </Stack>
                </Content>
                <Content padded>
                    <Stack>
                        <button onClick={ConfirmModal.params.action}>OK</button>
                        <button onClick={ConfirmModal.hide}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </ConfirmModal.render>
    </Fragment>;
}

function Restorable(props) {
    return (
        <EditorCtx><RestorableContent confirmRef={props.confirmRef}>{props.children}</RestorableContent></EditorCtx>
    )
}

function RevertSelector(props) {
    const context = useContext(GlobalContext);
    const resourceLoader = context.game.getResourceLoader();
    const storageManager = context.game.getStorageManager();
    const options = [];
    const storedResources = [];

    const availSources = [];
    const defaultValues = [];
    for (let info of props.resourcesInfo) {
        const avail = {
            code: resourceLoader.hasLocalResource(info.type, info.id),
            external: resourceLoader.hasExternalResource(info.type, info.id),
            server: props.serverResources.indexOf(info.type + ':' + info.id) !== -1,
            browser: storageManager.hasResource(info.type, info.id)
        };
        availSources.push(avail);
        let defaultValue = info.source;
        switch(defaultValue) {
            case 'browser':
                if (avail.server) {
                    defaultValue = 'server';
                } else if (avail.external) {
                    defaultValue = 'external';
                } else if (avail.code) {
                    defaultValue = 'code';
                }
                break;
            case 'server':
                if (avail.external) {
                    defaultValue = 'external';
                } else if (avail.code) {
                    defaultValue = 'code';
                }
                break;
        }
        defaultValues.push(defaultValue);
    }
    const [selectedValue, setSelectedValue] = useState(defaultValues);
    let i = 0;
    for (let info of props.resourcesInfo) {
        const disabled = [];
        const index = i;
        const sources = availSources[i];
        const stored = [];
        if (!sources.browser) {
            disabled.push('browser');
        } else {
            stored.unshift('browser');
        }
        if (!sources.server) {
            disabled.push('server');
        } else {
            stored.unshift('server');
        }
        if (!sources.external) {
            disabled.push('external');
        } else {
            stored.unshift('external');
        }
        if (!sources.code) {
            disabled.push('code');
        } else {
            stored.unshift('code');
        }
        storedResources.push(stored);
        const setValue = (value) => {
            const newValue = [...selectedValue];
            newValue[index] = value;
            setSelectedValue(newValue);
        };
        options.push(
            <RadioProp
                key={info.type + ':' + info.id}
                set={setValue}
                name={info.id}
                disabled={disabled}
                options={{code: 'Code', external: 'External', server: 'Server', browser: 'Browser'}}
                value={selectedValue[index]}
            />
        );
        i++;
    }

    const doRevert = () => {
        const result = [];
        for (let i = 0; i < props.resourcesInfo.length; i++) {
            const lastSource = props.resourcesInfo[i].source;
            if (lastSource !== selectedValue[i]) {
                const deleteSources = [];
                const currStored = storedResources[i];
                let found = false;
                for (let j = 0; j < currStored.length; j++) {
                    if (!found) {
                        found = (currStored[j] === selectedValue[i]);
                    } else {
                        deleteSources.push(currStored[j]);
                        if (lastSource === currStored[j]) {
                            break;
                        }
                    }
                }
                result.push([props.resourcesInfo[i], deleteSources]);
            }
        }
        props.revert(result);
    };

    return (
        <Stack vertical>
            <Content padded>
                <PropertyGrid>
                    {options}
                </PropertyGrid>
            </Content>
            <Content padded>
                <button onClick={doRevert}>Revert</button>
                <button onClick={props.cancel}>Cancel</button>
            </Content>
        </Stack>
    );
}

function PageSelector(props) {
    const context = useContext(GlobalContext);
    const [active, setActive] = useState(props.active === undefined ? null : props.active);
    const confirmRef = useRef(null);
    const updates = useUpdates();
    const ExportModal = useModal();
    const RevertModal = useModal();

    const cancel = () => {
        update();
        setActive(null);
    };
    const play = () => {
        const game = context.game;
        ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
        if (context.dirty) {
            game.reloadScreen();
        } else {
            game.restart();
        }
    };
    const actions = (
        <Fragment>
            <button onClick={play}>xPlay</button>
        </Fragment>
    );

    if (active === null) {
        const items = [];
        let key = 0;
        let preview = [];
        let paneDim = null;
        const sceneElems = [];
        for (let resource of props.resources) {
            if (resource.elem) {
                sceneElems.push(resource.elem);
            }
            if (resource.preview) {
                preview.push(resource.preview);
                paneDim = resource.dim;
            }
            const index = key;
            items.push(
                <div className="padded" key={key}>
                    <button onClick={() => setActive(index)}>Edit</button> #{key + 1} {resource.type}
                </div>
            );
            key++;
        }
        return (
            <Page title="Game" actions={actions} play={play}>
                <Section name="Resources">
                    <Stack>
                        <Content padded>
                            <Scene3d width={600} height={400} elems={sceneElems.reverse()} />
                        </Content>
                        <Content flex padded>
                            {items}
                        </Content>
                    </Stack>
                </Section>
            </Page>
        )
    }
    const resource = props.resources[active];
    let editor = 'Unknown';

    const getConfirmed = (action) => {
        return () => {
            confirmRef.current(action);
        }
    };

    const resourceLoader = props.game.getResourceLoader();
    const storageManager = props.game.getStorageManager();
    const resourcesInfo = [];

    const revert = () => {
        resourceLoader.checkServerResources(resourcesInfo).then(
            serverResources => {
                RevertModal.show({
                    resourcesInfo,
                    serverResources,
                    revert: (result) => {
                        const resources = [];
                        for (let item of result) {
                            const [resource, stores] = item;
                            if (stores.indexOf('browser') !== -1) {
                                storageManager.deleteResource(resource.type, resource.id);
                            }
                            if (stores.indexOf('server') !== -1) {
                                resources.push(resource);
                            }
                        }
                        resourceLoader.deleteServerResources(resources).then(() => {
                            RevertModal.hide();
                            const game = props.game;
                            ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
                            game.reloadScreen(active);
                        });
                    }
                });
            }
        );
    };

    const getModelConfig = model => {
        const rebuildJson = getRebuildJsonForModel(resource.cls, model,true);
        return new resource.config(rebuildJson);
    };

    const deploy = model => {
        const resourcesInfo = getModelConfig(model).getResources();
        resourceLoader.deployResources(
            props.game.currentScreen,
            resourcesInfo.resources,
            {'json': [resource.id]},
            resourcesInfo.dependencies
        ).then(
            () => {
                const game = props.game;
                ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
                game.reloadScreen(active);
            }
        );
    };

    const getResourceDef = (type, id, value) => {
        if (type === 'image') {
            value = '"' + value + '"';
        } else if (type === 'json') {
            const lines = JSON.stringify(value, null, 4).split('\n');
            value = lines.join('\n    ');
        }
        return "this.add" + type[0].toUpperCase() + type.substr(1) + 'Resource(\n' + `    '${id}',\n    ${value}\n);`;
    };

    const exportModel = model => {
        const resources = getModelConfig(model).getResources();
        const lines = [];
        for (let res of resources.resources.reverse()) {
            const data = res.type === 'image' ? res.data.getDataUrl() : res.data;
            lines.push(getResourceDef(res.type, res.id, data));
        }
        ExportModal.show({
            code: lines.join('\n')
        });
    };

    const update = () => {
        context.setDirty();
        updates.update();
    };

    const save = model => {
        context.resourceLoader.storeScreenResource(context.game.currentScreen, getModelConfig(model));
        resource.data = null;
        update();
    };

    const editorProps = {cancel: getConfirmed(cancel), play: getConfirmed(play), save, revert, deploy, export: exportModel};
    let model, tree;

    switch (resource.type) {
        case 'TilesMap':
            if (resource.data === null) {
                resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
            }
            model = getJsonModelOfInstance(resource.data);

            tree = getResourceTreeForJsonModel(resource.cls, model);
            editor = (
                <Restorable confirmRef={confirmRef}>
                    <TilesMapEditor key={'tilesMap_' + updates.count} tree={tree} model={model} resource={resource} info={resourcesInfo} {...editorProps} />
                </Restorable>
            );
            break;

        case 'TextPane':
            if (resource.data === null) {
                resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
            }
            model = getJsonModelOfInstance(resource.data);

            tree = getResourceTreeForJsonModel(resource.cls, model);
            editor = (
                <Restorable confirmRef={confirmRef}>
                    <TextPaneEditor key={'textPane_' + updates.count} tree={tree} model={model} resource={resource} info={resourcesInfo} {...editorProps} />
                </Restorable>
            );
            break;

        case 'spriteSheet':
            editor = <SpriteSheetEditor spriteSheet={resource.data} {...editorProps} />;
            break;
    }

    return (
        <Fragment>
            {editor}

            <ExportModal.render name="Export resources" width="80%" height="50%" closeable>
                <Content padded>
                    Use this in your code:
                    <TextArea wrap="off" width="100%" height="80%" value={ExportModal.params.code} readOnly />
                </Content>
            </ExportModal.render>

            <RevertModal.render name="Revert resources" fit closeable>
                <RevertSelector
                    serverResources={RevertModal.params.serverResources}
                    resourcesInfo={RevertModal.params.resourcesInfo}
                    revert={RevertModal.params.revert}
                    cancel={RevertModal.hide}
                />
            </RevertModal.render>
        </Fragment>
    );
}

function ColorSelectModal({hide, save, valid}) {
    const [color, setColor] = useState('#FF0000');
    return (
        <Stack>
            <Content><Color value={color} set={setColor} /></Content>
            <Content>
                <button onClick={() => save(color)} disabled={!valid(color)}>Save</button>
                <button onClick={hide}>Cancel</button>
            </Content>
        </Stack>
    );
}

function CharSelectModal({hide, save, valid}) {
    const [char, setChar] = useState('');
    return (
        <Stack>
            <Content><TextField value={char} size={1} set={setChar} /></Content>
            <Content>
                <button onClick={() => save(char)} disabled={char === '' || !valid(char)}>Save</button>
                <button onClick={hide}>Cancel</button>
            </Content>
        </Stack>
    );
}


function ColorPane({model}) {
    const eContext = useContext(EditorContext);
    const NewModal = useModal();
    const [colorIndex] = useState(() => new ColorIndex({colors: getColorsFromCanvas(model.tilesImg.elem)}));
    colorIndex.setIndex(colorIndex.allocateIndex({value: '#FF0000'}), '#FF0000');
    const colorMatcher = {type: 'prefix', field: 'value'};

    const addColor = update => {
        NewModal.show({
            save: color => {
                const newCols = [color, '#000000'];
                const indices = colorIndex.allocateIndices([{value: newCols[0]}, {value: newCols[1]}], null);
                let i = 0;
                for (let index of indices) {
                    if (index !== null) {
                        colorIndex.setIndex(index, newCols[i]);
                        update();
                    }
                    i++;
                }
                NewModal.hide();
            },
            valid: color => {
                return !colorIndex.hasPropValue('value', color)
            }
        });
    };
    const actions = [
        {
            name: 'Delete',
            doAction: indices => {
                const undoColors = colorIndex.getObjectsForIndices(indices);
                eContext.doAction(
                    () => colorIndex.deleteIndices(indices),
                    () => colorIndex.setIndicesFromObjects(undoColors)
                );
            }
        },
    ];

    let undoRedo = '';
    const undoAttr = {
        onClick: () => {
            eContext.undoAction()
        }
    };
    if (!eContext.hasPast()) {
        undoAttr.disabled = 'disabled'
    }
    const redoAttr = {
        onClick: () => {
            eContext.redoAction();
        }
    };
    if (!eContext.hasFuture()) {
        redoAttr.disabled = 'disabled'
    }
    undoRedo = <div>
        <button {...undoAttr}>Undo</button>
        <button {...redoAttr}>Redo</button>
    </div>;

    return (
        <>
            {undoRedo}
            <IndexController
                titleHeight={20}
                indexProvider={colorIndex}
                name="Color Index"
                renderTitle={index => {
                    return <Title>{colorIndex.getIndex(index)}</Title>
                }}
                actions={actions}
                matcher={colorMatcher}
                add={addColor}
            />
            <IndexPicker indexProvider={colorIndex} />
            <NewModal.render>
                <ColorSelectModal save={NewModal.params.save} hide={NewModal.hide} valid={NewModal.params.valid} />
            </NewModal.render>
        </>
    );
}

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

function CharPane({model}) {
    const context = useContext(GlobalContext);
    const eContext = useContext(EditorContext);
    const [fontIndex] = useState(() => new CharIndex(model));

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

    let undoRedo = '';
    const undoAttr = {
        onClick: () => {
            eContext.undoAction()
        }
    };
    if (!eContext.hasPast()) {
        undoAttr.disabled = 'disabled'
    }
    const redoAttr = {
        onClick: () => {
            eContext.redoAction();
        }
    };
    if (!eContext.hasFuture()) {
        redoAttr.disabled = 'disabled'
    }
    undoRedo = <div>
        <button {...undoAttr}>Undo</button>
        <button {...redoAttr}>Redo</button>
    </div>;

    return (
        <>
            {undoRedo}
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
            <IndexPicker
                indexProvider={fontIndex}
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

function BitmapMap({name, bitmapGrid}) {

    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(bitmapGrid.getWidth());
    const [height, setHeight] = useState(bitmapGrid.getHeight());
    const [zoom, setZoom] = useState(1);
    const [grid, setGrid] = useState(1);
    const dim = bitmapGrid.getGridDim(width, height, grid, zoom);

    const viewEndX = bitmapGrid.getWidth() - width;
    const viewEndY = bitmapGrid.getHeight() - height;

    return (
        <Stack vertical>
            <Content>{name}</Content>
            <Stack>
                <Content>
                    <Dim name="Pos:" buttons min={0}
                         maxX={viewEndX} maxY={viewEndY} x={posX} y={posY} setX={setPosX} setY={setPosY} />
                </Content>
                <Content>
                    <Dim name="Dim:" buttons min={1} maxX={bitmapGrid.getWidth()} maxY={bitmapGrid.getHeight()} x={width} y={height} setX={setWidth} setY={setHeight} />
                </Content>

                <Content>
                    <Int name="Grid:" buttons min={0} max={20} value={grid} set={setGrid} />
                </Content>

                <Content>
                    <Int name="Zoom:" buttons min={1} value={zoom} set={setZoom} />
                </Content>
            </Stack>
            <Content>
                <Canvas
                    width={dim.width}
                    height={dim.height}
                    render={
                        ctx => {
                            bitmapGrid.drawGrid(ctx, posX, posY, width, height, grid, zoom)
                        }
                    }
                />
            </Content>
        </Stack>
    );
}

function TilesMap({name, indexGrid}) {
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [width, setWidth] = useState(20);
    const [height, setHeight] = useState(13);
    const [zoom, setZoom] = useState(1);
    const [grid, setGrid] = useState(1);
    const dim = indexGrid.getGridDim(width, height, grid, zoom);

    const viewEndX = indexGrid.getWidth() - width;
    const viewEndY = indexGrid.getHeight() - height;

    const update = useComponentUpdate();
    useEffect(() => {
        indexGrid.index.addListener(update);
        return () => {
            indexGrid.index.removeListener(update);
        }
    }, []);

    const divRef = useResize({zoom, grid, width}, [zoom, grid], (props, rect) => {
        const padding = 5;
        const cellWidth = indexGrid.getCellSizeX() * props.zoom + props.grid;
        const spaceX = rect.width - 2 * padding - props.grid;
        const cellsX = Math.floor(spaceX/cellWidth);
        if (cellsX !== width) {
            setWidth(cellsX);
        }
    });

    if (posX > viewEndX) {
        setPosX(viewEndX);
        return '';
    }
    if (posY > viewEndY) {
        setPosY(viewEndY);
        return '';
    }

    return (
        <Stack vertical>
            <Content>{name}</Content>
            <Stack>
                <Content>
                    <button onClick={() => {
                        indexGrid.addRows(0, 1);
                        update();
                    }}>Add row</button>
                </Content>
                <Content>
                    <Dim name="Pos:" buttons min={0}
                         maxX={viewEndX} maxY={viewEndY} x={posX} y={posY} setX={setPosX} setY={setPosY} />
                </Content>
                <Content>
                    <Dim name="Dim:" readOnly buttons min={1} maxX={indexGrid.getWidth()} maxY={indexGrid.getHeight()} x={width} y={height} setX={setWidth} setY={setHeight} />
                </Content>

                <Content>
                    <Int name="Grid:" buttons min={0} max={20} value={grid} set={setGrid} />
                </Content>

                <Content>
                    <Int name="Zoom:" buttons min={1} value={zoom} set={setZoom} />
                </Content>
            </Stack>
            <div ref={divRef} className="padding">
                <Canvas
                    width={dim.width}
                    height={dim.height}
                    render={
                        ctx => {
                            indexGrid.drawGrid(ctx, posX, posY, width, height, grid, zoom)
                        }
                    }
                />
            </div>
        </Stack>
    );
}

function Tiles({tileIndex}) {
    const eContext = useContext(EditorContext);
    const actions = [
        {
            name: 'Delete',
            doAction: indices => {
                const undoTiles = tileIndex.getObjectsForIndices(indices);
                eContext.doAction(
                    () => tileIndex.deleteIndices(indices),
                    () => tileIndex.setIndicesFromObjects(undoTiles)
                );
            }
        },
    ];
    return (
        <IndexController
            indexProvider={tileIndex}
            actions={actions}
            titleHeight={20}
        />
    )
}

function EditorApp(props) {
    const resources = props.game.getEditableResources();

    let filters = null;
    let imageResources = [];
    let tilesModel = null;
    let fontModel = null;
    for (let resource of resources) {
        switch(resource.type) {
            case 'filters':
                filters = resource.data;
                break;

            case 'TilesMap':
                tilesModel = getJsonModelOfInstance(resource.data);
                /*
                imageResources.push({
                    name: 'Tiles Map image',
                    bitmap: resource.data.tilesImg.elem.toDataURL('image/png')
                });

                 */
                break;

            case 'TextPane':
                // TODO: use this for all resource-types and prevent double ids
                fontModel = getJsonModelOfInstance(resource.data);
                const resources = resource.data.getResources('image').resources;
                for (let resource of resources) {
                    const canvas = resource.data.getCanvas().elem;
                    imageResources.push({
                        id: resource.id,
                        name: resource.id,
                        bitmap: canvas
                    });
                }
                break;

            case 'spriteSheet':
                const canvas = resource.data.sheet.elem;
                imageResources.push({
                    name: 'Sprite Sheet image',
                    bitmap: canvas
                });
                break;

            default:
                d('???', resource);
                break;
        }
    }

    // TODO: move to game:init?
    window.oncontextmenu = (e) => {
        e.preventDefault();
    };


    /*
                <BitmapMap bitmapGrid={bitmapGrid} />
                <TilesMap indexGrid={tileGrid} />
                <ColorPane />
        TEST
                <IndexController
                    indexProvider={tileIndex}
                    name="Tile Index"
                    add={update => {
                        tileIndex.allocateIndex({}, 0);
                    }}
                    top={
                        item => <><kbd>{item.index}</kbd></>
                    } />
                <IndexPicker indexProvider={tileIndex} />


            <Stack vertical>
                <EditorCtx>
                    <ColorPane model={tilesModel} />
                    <CharPane model={fontModel.fonts[0]} />
                    <Tiles tileIndex={tileIndex} />
                </EditorCtx>
            </Stack>

    const tileIndex = new TileIndex(tilesModel);
    const tileGrid = new IndexGrid(tileIndex, tilesModel);
    const bitmapGrid = new BitmapGrid({data: tileIndex.getIndex(1)}, 'data');
     */


    return (
        <GlobalCtx game={props.game} filters={filters} imageResources={imageResources}>
            <PageSelector {...props} resources={resources} />
            <div id="modals-container"></div>
        </GlobalCtx>
    );
}

export default EditorApp;