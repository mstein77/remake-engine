import _ from 'lodash';
import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App.js";

class TilesMapEditor {

    constructor(game, editor, tilesPane) {

        ReactDOM.render(<App />, document.getElementById("react-editor"));

        this.tilesPane = tilesPane;
        this.editor = editor;
        this.game = game;
        this.tileBits = tilesPane.tilesMap.tileBits;
        const mapTiles = tilesPane.tilesMap.mapTiles;
        this.mapDim = {x: mapTiles.x, y: mapTiles.y};
        this.mapSize = {x: this.mapDim.x << this.tileBits, y: this.mapDim.y << this.tileBits};
        const maxTileIndex = tilesPane.tilesMap.tilesImg.elem.width / tilesPane.tilesMap.tileSize;

        editor.innerHTML =
            '<div style="">' +
            '   <h1>TilesMap Editor</h1>' +
            '   <div id="map-edit-row">' +
            '       <div class="content-block" style="width: 120px; flex-grow: 0"><div>Active Tile</div>' +
            '<canvas id="active-tile-canvas" style="border: 1px solid #FF0000; transform: scale(3);' +
            'transform-origin: left top; margin-left: 30px; margin-top: 5px" width="16" height="16"></canvas>' +
            '<div style="margin-top: 50px">Index: <button id="btn-prev-tile">&nbsp;-&nbsp;</button> <kbd id="active-tile-index"></kbd> <button id="btn-next-tile">&nbsp;+&nbsp;</button></div>' +
            '</div>' +
            '       <div class="content-block" style="flex: 1">Map: Map-Size: ' +
            '           <button id="btn-map-width-down">-</button><kbd>' + this.mapDim.x + '</kbd><button id="btn-map-width-up">+</button> x ' +
            '           <button id="btn-map-height-down">-</button><kbd>' + this.mapDim.y + '</kbd><button id="btn-map-height-up">+</button>' +
            '   <div id="map-editor" class="content-div">' +
            '<canvas id="map-canvas" width="' + this.mapSize.x + '" height="' + this.mapSize.y + '"></canvas>' +
            '<div id="map-canvas-overlay" style="width: ' + this.mapSize.x + 'px; height: ' + this.mapSize.y + 'px">' +
            '<div id="tile-cursor" style="display: none; left: 0px; top: 0px; width: 16px; height: 16px"></div>' +
            '</div>' +
            '</div>' +
            '       </div>' +
            '   </div>' +
            '   <div class="content-block">Tiles:<div id="tile_browser" class="content-div"></div></div>' +
            '</div>';

        const mapEncoded = btoa(JSON.stringify(tilesPane.tilesMap.map));

        const overlay = game.getDomElem('map-canvas-overlay');
        const cursor = game.getDomElem('tile-cursor');
        const tileBits = this.tileBits;
        const map = game.getDomElem('map-canvas');
        const ctx = map.getContext('2d');
        let activeTileIndex = 1;

        const activeTileCtx = game.getDomElem('active-tile-canvas').getContext('2d');
        const activeTileIndexElem = game.getDomElem('active-tile-index');

        function updateActiveTile() {
            tilesPane.tilesMap.renderTileTo(activeTileCtx, activeTileIndex);
            activeTileIndexElem.innerHTML = activeTileIndex;
        }

        updateActiveTile();

        game.getDomElem('btn-map-width-up').onclick = function () {
            console.log('MAP-WIDTH+');
        };

        game.getDomElem('btn-map-width-down').onclick = function () {
            console.log('MAP-WIDTH-');
        };

        game.getDomElem('btn-map-height-up').onclick = function () {
            console.log('MAP-HEIGHT+');
        };

        game.getDomElem('btn-map-height-down').onclick = function () {
            console.log('MAP-HEIGHT-');
        };

        game.getDomElem('btn-prev-tile').onclick = function () {
            if (activeTileIndex > 0) {
                activeTileIndex--;
            }
            updateActiveTile();
        };

        game.getDomElem('btn-next-tile').onclick = function () {
            if (activeTileIndex < maxTileIndex) {
                activeTileIndex++;
            }
            updateActiveTile();
        };

        function getRelMapPosFromEvent(e) {
            let target = e.target;
            while (target.id === undefined || target.id !== 'map-canvas-overlay') {
                target = target.parentElement;
            }

            const rect = target.getBoundingClientRect();

            return {
                x: Math.round(e.clientX - rect.left - 5) >> tileBits,
                y: Math.round(e.clientY - rect.top - 5) >> tileBits
            };
        }

        function renderTilesMap() {
            tilesPane.tilesMap.render(ctx, {
                    x: 0,
                    y: 0
                },
                {
                    width: mapTiles.x,
                    height: mapTiles.y,
                    pos: {
                        x: 0,
                        y: 0
                    },
                    endless: false
                }
            );
        }

        function setActiveTileIndex(index) {
            activeTileIndex = index;
        }

        overlay.onmouseenter = function(e) {
            cursor.style.display = 'block';
        };
        overlay.onmouseleave = function(e) {
            cursor.style.display = 'none';
        };
        overlay.onmousemove = function (e) {
            const pos = getRelMapPosFromEvent(e);
            cursor.style.left = (pos.x << tileBits) - 2;
            cursor.style.top = (pos.y << tileBits) - 2;
        };

        overlay.onclick = function(e) {
            const pos = getRelMapPosFromEvent(e);
            tilesPane.tilesMap.replaceTile(pos.x, pos.y, activeTileIndex);
            renderTilesMap();
        };

        renderTilesMap();

        const tileBrowser = game.getDomElem('tile_browser');
        tileBrowser.appendChild(tilesPane.tilesMap.tilesImg.elem);

    }
}

window.gameEditor = {
    TilesMapEditor
};
