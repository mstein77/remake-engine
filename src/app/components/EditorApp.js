import ReactDOM from "react-dom";
import React, { Fragment, useState, useContext, useRef, useEffect } from "react";
import { Page, Stack, Scene3d, Content, Section, PropertyGrid, RadioProp, useUpdates, TextArea, GlobalContext, GlobalCtx, useModal } from "./../components-old/BaseComponents";
import TilesMapEditor from "./../components-old/TilesMapEditor";
import TextPaneEditor from "./../components-old/TextPaneEditor";
import { TextPaneEditor as TextPaneEditorNew } from "./../editors/TextPaneEditor";
import { TilesPaneEditor as TilesPaneEditorNew } from "./../editors/TilesPaneEditor";
import { SpritePaneEditor as SpritePaneEditorNew } from "./../editors/SpritePaneEditor";
import SpriteSheetEditor from "./../components-old/SpriteSheetEditor";
import { EditorContext, EditorCtx } from "./../components-old/Raster";
import { d, getJsonModelOfInstance, getRebuildJsonForModel, getResourceTreeForJsonModel } from '../helper/helper';
import { MainEditor } from "../editors/MainEditor";
import { ScreenEditor } from "../editors/ScreenEditor";
import { PocEditor } from "../editors/PocEditor";
import './../components-old/EditorApp.css';

function RestorableContent(props) {
    const eContext = useContext(EditorContext);
    const ConfirmModal = useModal();
    props.confirmRef.current = (confirmedAction) => {
        if (!eContext.hasStorePos()) {
            ConfirmModal.open({
                action: () => {
                    ConfirmModal.close();
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

        <ConfirmModal.content name="Please confirm" fit closeable>
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
                        <button onClick={ConfirmModal.props.action}>OK</button>
                        <button onClick={ConfirmModal.close}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </ConfirmModal.content>
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
                        <Content flex padded>
                            {items}
                        </Content>
                        <Content padded>
                            <Scene3d width={600} height={400} elems={sceneElems} />
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
                RevertModal.open({
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
                            RevertModal.close();
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

    const getResourceDef = (type, id, value, details) => {
        if (type === 'image') {
            value = '"' + value + '"';
        } else if (type === 'json') {
            const lines = JSON.stringify(value, null, 4).split('\n');
            let jsonLines = [];
            if (details.compact) {
                let no = 0;
                let trackLevel = -1;
                let track;
                let prefix;
                for (let line of lines) {
                    if (trackLevel < 0) {
                        // TODO remove hardcoded key
                        if (line.trim().startsWith('"map": [')) {
                            trackLevel = 0;
                            track = [];
                        }
                        jsonLines.push(line);
                    } else {
                        if (line.match(/\[$/)) {
                            trackLevel++;
                            if (trackLevel === 1) {
                                prefix = line.substr(0, line.indexOf('['));
                                track = [line.trim()];
                            } else {
                                track.push(line.trim());
                            }
                        } else if (line.match(/\],?$/)) {
                            trackLevel--;
                            if (trackLevel === 0) {
                                track.push(line.trim());
                                jsonLines.push(prefix + track.join(' '));
                            } else if (trackLevel > 0) {
                                track.push(line.trim());
                            } else {
                                jsonLines.push(line);
                            }
                        } else {
                            if (trackLevel > 0) {
                                track.push(line.trim());
                            } else {
                                jsonLines.push(line);
                            }
                        }
                    }
                    no++;
                }
            } else {
                jsonLines = lines;
            }
            value = jsonLines.join('\n    ');
        }
        return "this.add" + type[0].toUpperCase() + type.substr(1) + 'Resource(\n' + `    '${id}',\n    ${value}\n);`;
    };

    const exportModel = (model, details = {}) => {
        const resources = getModelConfig(model).getResources();
        const lines = [];
        for (let res of [ ...resources.resources ].reverse()) {
            const data = res.type === 'image' ? res.data.getDataUrl() : res.data;
            lines.push(getResourceDef(res.type, res.id, data, details));
        }
        ExportModal.open({
            code: lines.join('\n')
        });
    };

    const update = () => {
        context.setDirty();
        updates.update();
    };

    const saveModel = model => {
        const rebuildJSON = getModelConfig(model);
        context.resourceLoader.storeScreenResource(context.game.currentScreen, rebuildJSON);
        resource.data = null;
        update();
    };

    const editorProps = {cancel: getConfirmed(cancel), play: getConfirmed(play), saveModel, revert, deploy, exportModel};
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
                    <TilesMapEditor key={'tilesMap_' + updates.count} tree={tree} model={model} resource={resource} info={resourcesInfo} { ...editorProps } />
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
                    <TextPaneEditor key={'textPane_' + updates.count} tree={tree} model={model} resource={resource} info={resourcesInfo} { ...editorProps } />
                </Restorable>
            );
            break;

        case 'spriteSheet':
            editor =
                <Restorable confirmRef={confirmRef}>
                    <SpriteSheetEditor spriteSheet={resource.data} {...editorProps} />
                </Restorable>;
            break;
    }

    return (
        <Fragment>
            {editor}

            <ExportModal.content name="Export resources" width="80%" height="50%" closeable>
                <Content padded>
                    Use this in your code:
                    <TextArea wrap="off" width="100%" height="80%" value={ExportModal.props.code} readOnly />
                </Content>
            </ExportModal.content>

            <RevertModal.content name="Revert resources" fit closeable>
                <RevertSelector
                    serverResources={RevertModal.props.serverResources}
                    resourcesInfo={RevertModal.props.resourcesInfo}
                    revert={RevertModal.props.revert}
                    cancel={RevertModal.close}
                />
            </RevertModal.content>
        </Fragment>
    );
}

function EditorApp(props) {
    const isNew = 1;
    const [ ready, setReady ] = useState(false);
    const [ selected, setSelected ] = useState(null);

    useEffect(() => {
        const syncLinks = parts => {
            const elems = document.querySelectorAll('link');
            for (let elem of elems) {
                const href = elem.href;
                if (!parts.includes(href)) {
                    const parent = elem.parentNode;
                    parent.removeChild(elem);
                }
            }
            const head = document.querySelector('head');
            for (let part of parts) {
                const linkNode = document.createElement('link');
                linkNode.href = part;
                linkNode.rel = 'stylesheet';
                linkNode.type ='text/css';
                linkNode.onload = function() { this.title = '1' };
                requestAnimationFrame(
                    () => {
                        head.appendChild(
                            linkNode
                        )
                    }
                );
            }
        };
        syncLinks(isNew ? ['css/layout.css', 'css/base.css'] : ['css/old.css', 'https://fonts.googleapis.com/icon?family=Material+Icons']);
        setTimeout(() => {
            const elems = document.querySelectorAll('link');
            let loaded = true;
            for (let elem of elems) {
                if (!(elem.title && elem.title === '1')) {
                    loaded = false;
                    break
                }
            }
            setReady(true);
        }, 200);

        return () => {
            syncLinks(['css/old.css', 'https://fonts.googleapis.com/icon?family=Material+Icons']);
        }
    }, []);


    if (!ready) return '';

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

    if (isNew) {
        let editor = '';
        const resourceLoader = props.game.getResourceLoader();
        resources.push({type: 'poc'});

        if (selected === null) {
            return (
                <>
                    <MainEditor game={props.game} resources={resources} filters={filters} imageResources={imageResources} { ...props }>
                        <ScreenEditor setSelected={setSelected} resources={resources} game={props.game} />
                    </MainEditor>
                    <div id="modals-container" />
                </>
            )
        }

        const resource = resources[selected];

        editor = null;
        let model = null;
        let tree = null;

        switch (resource.type) {
            case 'TilesMap':
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                model = getJsonModelOfInstance(resource.data);
                tree = getResourceTreeForJsonModel(resource.cls, model);
                editor = <TilesPaneEditorNew resource={resource} model={model} />;
                break;

            case 'TextPane':
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                model = getJsonModelOfInstance(resource.data);
                model.blocks = resource.blocks;
                tree = getResourceTreeForJsonModel(resource.cls, model);
                editor = <TextPaneEditorNew resource={resource} model={model} />;
                break;

            case 'spriteSheet':
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                model = getJsonModelOfInstance(resource.data);
                model.blocks = resource.blocks;
                // tree = getResourceTreeForJsonModel(resource.cls, model);
                editor = <SpritePaneEditorNew resource={resource} model={model} />;
                break;

            case 'poc':
                editor = <PocEditor />;
                break;
        }
        return  (
            <>
                <MainEditor back={() => setSelected(null)} game={props.game} resources={resources} filters={filters} imageResources={imageResources} { ...props }>{editor}</MainEditor>
                <div id="modals-container"></div>
            </>
        )
    }
    return (
        <GlobalCtx game={props.game} filters={filters} imageResources={imageResources}>
            <PageSelector { ...props } resources={resources} />
            <div id="modals-container"></div>
        </GlobalCtx>
    );
}

export default EditorApp;