import React, {Fragment, useState, useContext, useRef, useEffect} from "react";
import {Page, Stack, Content, Section, PropertyGrid, RadioProp, useUpdates, TextArea, GlobalContext, GlobalCtx, useModal} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import TextPaneEditor from "./TextPaneEditor";
import SpriteSheetEditor from "./SpriteSheetEditor";
import {EditorContext, EditorCtx} from "./Raster";
import './EditorApp.css';
import {d, getJsonModelOfInstance, getRebuildJsonForModel, getResourceTreeForJsonModel} from '../helper/helper';
import ReactDOM from "react-dom";


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
            <button onClick={props.play}>Play</button>
        </Fragment>
    );

    if (active === null) {
        const items = [];
        let key = 0;
        for (let resource of props.resources) {
            const index = key;
            items.push(
                <div className="padded" key={key}>
                    <button onClick={() => setActive(index)}>Edit</button> #{key + 1} {resource.type}
                </div>
            );
            key++;
        }
        return (
            <Page title="Game" actions={actions}>
                <Section name="Resources">{items}</Section>
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

    switch (resource.type) {
        case 'tilesMap':
            editor = <TilesMapEditor tilesMap={resource.data} {...editorProps} />;
            break;

        case 'TextPane':
            if (resource.data === null) {
                resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
            }
            const model = getJsonModelOfInstance(resource.data);

            const tree = getResourceTreeForJsonModel(resource.cls, model);
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

function EditorApp(props) {
    const resources = props.game.getEditableResources();
    let filters = null;
    let imageResources = [];
    for (let resource of resources) {
        switch(resource.type) {
            case 'filters':
                filters = resource.data;
                break;

            case 'tilesMap':
                imageResources.push({
                    name: 'Tiles Map image',
                    bitmap: resource.data.tilesImg.elem.toDataURL('image/png')
                });
                break;

            case 'TextPane':
                // TODO: use this for all resource-types and prevent double ids
                const resources = resource.data.getResources('image').resources;
                for (let resource of resources) {
                    imageResources.push({
                        id: resource.id,
                        name: resource.id,
                        bitmap: resource.data.getDataUrl()
                    });
                }
                break;

            case 'spriteSheet':
                imageResources.push({
                    name: 'Sprite Sheet image',
                    bitmap: resource.data.sheet.elem.toDataURL('image/png')
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

    return (
        <GlobalCtx game={props.game} filters={filters} imageResources={imageResources}>
            <PageSelector {...props} resources={resources} />
            <div id="modals-container"></div>
        </GlobalCtx>
    );
}

export default EditorApp;