import React, { useState, useEffect } from "react";
import { TextPaneEditor as TextPaneEditorNew } from "./../editors/TextPaneEditor";
import { TilesPaneEditor as TilesPaneEditorNew } from "./../editors/TilesPaneEditor";
import { SpritePaneEditor as SpritePaneEditorNew } from "./../editors/SpritePaneEditor";
import { d, getJsonModelOfInstance, getResourceTreeForJsonModel } from '../helper/helper';
import { MainEditor } from "../editors/MainEditor";
import { ScreenEditor } from "../editors/ScreenEditor";
import { PocEditor } from "../editors/PocEditor";
import './../components-old/EditorApp.css';

function EditorApp(props) {
    const [ ready, setReady ] = useState(false);

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
        syncLinks(['css/layout.css', 'css/base.css']);
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
    // extract all filters and image resources from the list of resources
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

    const contentProvider = {
        'screen': {
            getContent: params => {
                return <ScreenEditor resources={resources} game={props.game} />
            }
        },

        'TilesMap': {
            getContent: params => {
                const resource = resources[params.id];
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                const model = getJsonModelOfInstance(resource.data);
                const tree = getResourceTreeForJsonModel(resource.cls, model);
                return <TilesPaneEditorNew resource={resource} model={model}/>
            }
        },

        'TextPane': {
            getContent: params => {
                const resource = resources[params.id];
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                const model = getJsonModelOfInstance(resource.data);
                model.blocks = resource.blocks;
                const tree = getResourceTreeForJsonModel(resource.cls, model);
                return <TextPaneEditorNew resource={resource} model={model}/>
            }
        },

        'spriteSheet': {
            getContent: params => {
                const resource = resources[params.id];
                if (resource.data === null) {
                    resource.data = new resource.config(resourceLoader.getResource('json', resource.id));
                }
                const model = getJsonModelOfInstance(resource.data);
                model.blocks = resource.blocks;
                // tree = getResourceTreeForJsonModel(resource.cls, model);
                return <SpritePaneEditorNew resource={resource} model={model}/>;
            }
        },

        'poc': {
            getContent: params => <PocEditor />
        }
    };

    const resourceLoader = props.game.getResourceLoader();
    resources.push({type: 'poc'});

    return (
        <>
            <MainEditor game={props.game} resources={resources} filters={filters} imageResources={imageResources} { ...props } contentProvider={contentProvider} />
            <div id="modals-container" />
        </>
    )
}

export default EditorApp;