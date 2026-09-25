import inst from "core/instances"
import React, { Suspense, useState, useEffect } from "react"
import { d } from 'helper/helper'
import { MainEditor } from "../editors/MainEditor"
import { ScreenEditor } from "../editors/ScreenEditor"
import { PocEditor } from "../editors/PocEditor"
import { GamePropsEditor } from "../editors/GamePropsEditor"

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
        // syncLinks(['css/layout.css', 'css/base.css']);
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
//            syncLinks(['css/old.css', 'https://fonts.googleapis.com/icon?family=Material+Icons']);
        }
    }, []);


    if (!ready) return '';

    const resources = props.game.getEditableResources();

    let filters = null;
    let imageResources = [];
    // extract all filters and image resources from the list of resources
    const found = new Set();
    for (let resource of resources) {
        switch(resource.type) {
            case 'filters':
                filters = resource.data;
                break;

            default:
                const matchingResources = resource.pane.getImageResources(resource.pane)
                for (const { id, data } of matchingResources) {
                    if (found.has(id)) continue
                    found.add(id)
                    const canvas = data.canvas
                    imageResources.push({
                        id,
                        name: id,
                        bitmap: canvas
                    })
                }
                break;
        }
    }

    // TODO: move to game:init?
    window.oncontextmenu = e => {
        e.preventDefault();
    }

    const lazyLoadPaneEditor = (pane, params) => {
        const Editor = React.lazy(() => import(`../../panes/${pane}/editor/component.js`));
        return <Suspense fallback={<div>Loading...</div>}><Editor { ...params } /></Suspense>
    }

    const contentProvider = {
        game: {
            getContent: params => {
                const resource = {pane: props.game.gameProps}
                return <GamePropsEditor game={props.game} resource={resource} />
            }
        },
        screen: {
            getContent: params => {
                return <ScreenEditor resources={resources} game={props.game} />
            }
        },
        poc: {
            getContent: params => <PocEditor />
        }
    }

    const items = inst.paneRegistry.getAll()
    for (let item of items) {
        if (!item.editable) continue
        const cls = item.constructor.factory ? item.constructor.factory.name : item.name
        contentProvider[cls] = {
            getContent: params => {
                const resource = resources[params.id];
                // build new model from pane
                inst.RL.setDisabled(true)
                const model = resource.pane.getClone()
                inst.RL.setDisabled(false)
                return lazyLoadPaneEditor(cls, { resource, model })
            }
        }
    }
    resources.push({type: 'poc'})
    resources.push({type: 'game'})

    return (
        <>
            <MainEditor
                game={props.game} resources={resources} filters={filters}
                imageResources={imageResources} { ...props } contentProvider={contentProvider}
            />
            <div id="modals-container" />
        </>
    )
}

export default EditorApp;