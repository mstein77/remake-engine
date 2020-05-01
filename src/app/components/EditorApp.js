import React, {Component} from "react";
import {Stack, Themed} from "./BaseComponents";
import TilesMapEditor from "./TilesMapEditor";
import './EditorApp.css';

class EditorApp extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Themed>
                <Stack dir="y" full>
                    <div className="head padded">
                        <Stack dir="x">
                            <div className="flex">
                                TilesMapEditor: <b><kbd>Mario Level 1-1</kbd></b>
                            </div>
                            <div>
                                <button>Save</button> <button>Cancel</button> <button onClick={this.props.play}>Play</button>
                            </div>
                        </Stack>
                    </div>
                    <div className="flex">
                        <TilesMapEditor tilesMap={this.props.panes[0].tilesMap} />
                    </div>
                </Stack>
                <div id="modals-container"></div>
            </Themed>
        )
    }
}

export default EditorApp;