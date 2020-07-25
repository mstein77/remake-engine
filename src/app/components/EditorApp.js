import React, {Fragment, useState} from "react";
import {Stack, Content, GlobalCtx, Section} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import FontMapEditor from "./FontMapEditor";
import SpriteSheetEditor from "./SpriteSheetEditor";
import './EditorApp.css';
import {d} from '../helper/helper';

function Page(props) {
    return (
        <Content maxHeight="100vh">
            <Stack vertical fullHeight>
                <Content>
                    <Stack className="head">
                        <Content flex padded>
                            {props.title}
                        </Content>
                        <Content padded>
                            {props.actions}
                        </Content>
                    </Stack>
                </Content>

                <Content flex>
                    {props.children}
                </Content>
            </Stack>
        </Content>
    );
}

function PageSelector(props) {
    const [active, setActive] = useState(props.active === undefined ? null : props.active);

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

    switch(resource.type) {
        case 'tilesMap':
            editor = <TilesMapEditor tilesMap={resource.data} />;
            break;

        case 'fontMap':
            editor = <FontMapEditor fontMap={resource.data} />;
            break;

        case 'spriteSheet':
            editor = <SpriteSheetEditor spriteSheet={resource.data} />;
            break;
    }

    const title = (
        <span>
            {resource.type}: <b><kbd>{props.game.currentScreen}</kbd></b>
        </span>
    );

    return (
        <Page title={title} actions={actions}>{editor}</Page>
    )
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
                    name: 'Font Map image',
                    bitmap: resource.data.image.toDataURL('image/png')
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
        <GlobalCtx filters={filters} imageResources={imageResources}>
            <PageSelector {...props} resources={resources} />
            <div id="modals-container"></div>
        </GlobalCtx>
    );
}

export default EditorApp;