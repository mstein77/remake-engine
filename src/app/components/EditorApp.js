import React, {Fragment, useState, useContext, useRef, useEffect} from "react";
import {Page, Stack, Content, Section, useUpdates, GlobalContext, GlobalCtx, useModal} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import FontMapEditor from "./FontMapEditor";
import SpriteSheetEditor from "./SpriteSheetEditor";
import {EditorContext, EditorCtx} from "./Raster";
import './EditorApp.css';
import {d} from '../helper/helper';
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

function PageSelector(props) {
    const context = useContext(GlobalContext);
    const [active, setActive] = useState(props.active === undefined ? null : props.active);
    const confirmRef = useRef(null);
    const updates = useUpdates();

    const cancel = () => {
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
            <button>Save</button> <button onClick={() => {setActive(null)}}>Cancel</button> <button onClick={props.play}>Play</button>
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
    const editorProps = {cancel: getConfirmed(cancel), play: getConfirmed(play), update: () => {
        context.setDirty();
        updates.update();
    }};
    switch(resource.type) {
        case 'tilesMap':
            editor = <TilesMapEditor tilesMap={resource.data} {...editorProps} />;
            break;

        case 'fontMap':
            const resourcesInfo = [];
            resourcesInfo.push({
                id: resource.data.id,
                name: 'FontMap Config',
                type: 'json'
            });
            resourcesInfo.push({
                id: resource.data.image.id,
                type: 'image',
                name: 'FontMap Image'
            });
            const components = {};
            for (let info of resourcesInfo) {
                info.source = resourceLoader.getResourceSource(info.type + ':' + info.id)
                components[info.type] = resourceLoader.getResource(info.type, info.id);
            }
            const config = new resource.config(components.json);
            editor = (
                <Restorable confirmRef={confirmRef}>
                    <FontMapEditor key={'fontmap_' + updates.count} fontMap={config} info={resourcesInfo} {...editorProps} />
                </Restorable>
            );
            break;

        case 'spriteSheet':
            editor = <SpriteSheetEditor spriteSheet={resource.data} {...editorProps} />;
            break;
    }

    return editor;
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

            case 'fontMap':
                imageResources.push({
                    id: resource.data.image.id,
                    name: 'Font Map image ' + resource.data.image.id,
                    bitmap: resource.data.image.getCanvasElem().toDataURL('image/png')
                });
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