import React from "react";
import ReactDOM from "react-dom";

import EditorApp from './components/EditorApp';

class GameEditor {

    constructor(game) {
        function extractEditablesFromAreas(areas, editables) {
            if (!Array.isArray(areas)) {
                return;
            }
            for (let area of areas) {
                if (area.panes !== undefined) {
                    for (let pane of area.panes) {
                        if (pane.isBufferedTilesPane) {
                            editables.push(pane);
                        }
                    }
                }
                if (Array.isArray(area)) {
                    extractEditablesFromAreas(area, editables);
                } else if (area.areas !== undefined) {
                    extractEditablesFromAreas(area.areas, editables);
                }
            }
        }

        const panes = [];
        extractEditablesFromAreas(game.screens[game.currentScreen].areas, panes);

        const play = () => {
            ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
            game.restart();
        };

        ReactDOM.render(<EditorApp panes={panes} play={play} />, document.getElementById('editor'));
    }
}

window.gameEditor = {
    GameEditor
};
