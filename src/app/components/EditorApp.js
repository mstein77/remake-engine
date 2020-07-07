import React, {Fragment, useState} from "react";
import {Stack, Content, GlobalCtx, Section} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import FontMapEditor from "./FontMapEditor";
import SpriteSheetEditor from "./SpriteSheetEditor";
import './EditorApp.css';

function Page(props) {
    return (
        <GlobalCtx>
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

            <div id="modals-container"></div>
        </GlobalCtx>
    );
}


function EditorApp(props) {
    const [resources, setResources]  =  useState(props.game.getEditableResources());
    const [active, setActive] = useState(props.active === undefined ? null : props.active);

    // TODO: move to game:init?
    window.oncontextmenu = (e) => {
        e.preventDefault();
    };

    const actions = (
        <Fragment>
            <button>Save</button> <button onClick={() => {setActive(null)}}>Cancel</button> <button onClick={props.play}>Play</button>
        </Fragment>
    );
    if (active === null) {
        const items = [];
        let key = 0;
        for (let resource of resources) {
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
    const resource = resources[active];
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

export default EditorApp;