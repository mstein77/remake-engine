import _ from 'lodash';
import MyApp from "./test.js";
import React from "react";
import ReactDOM from "react-dom";

import App from "./components/App.js";

class TileCellProvider {

    constructor(tilesPane) {
        this.tilesPane = tilesPane;
        this.dim = tilesPane.tilesMap.tileSize;
        this.index = null;
    }

    getCellSize() {
        return 1;
    }

    getColumns() {
        return this.dim;
    }

    getRows() {
        return this.dim;
    }

    setIndex(index) {
        this.index = index;
    }

    isFixed() {
        return true;
    }

    getCellImageData(x, y, context) {
        if (x >= this.getColumns()) {
            return null;
        }
        if (y >= this.getRows()) {
            return null;
        }
        let index = 0;
        if (this.index === null) {
            return null;
        }
        const offX = this.index * this.dim + x;
        return this.tilesPane.tilesMap.tilesImg.ctx.getImageData(offX, y, 1, 1);
    }
}

class TilesIndexProvider {
    constructor(tilesPane) {
        this.tilesImg = tilesPane.tilesMap.tilesImg;
        this.dim = tilesPane.tilesMap.tileSize;
        this.maxIndex = this.tilesImg.width / this.dim - 1;
        this.wrap = null;
    }

    isFixed() {
        return true;
    }

    getCellSize() {
        return this.dim;
    }

    setWrap(value) {
        this.wrap = value;
    }

    getColumns() {
        if (this.wrap !== null) {
            return Math.min(this.wrap, this.maxIndex + 1);
        }
        return this.maxIndex + 1;
    }

    getRows() {
        if (this.wrap !== null) {
            return Math.ceil((this.maxIndex + 1)/this.wrap);
        }
        return 1;
    }

    getWrappedIndex(x, y) {
        const index = y * this.wrap + x;
        if (index >= this.maxIndex) {
            return null;
        }
        return index;
    }

    getCellInfo(x, y) {
        if (this.wrap !== null) {
            return this.getWrappedIndex(x, y);
        }
        if (y !== 0 || x >= this.maxIndex) {
            return null;
        }
        return x;
    }

    getCellImageData(x, y) {
        if (this.wrap !== null) {
            const index = this.getWrappedIndex(x, y);
            if (index === null) {
                return null;
            }
            return this.tilesImg.ctx.getImageData(index * this.dim, 0, this.dim, this.dim);
        }
        if (y !== 0 || x >= this.maxIndex) {
            return null;
        }
        return this.tilesImg.ctx.getImageData(x * this.dim, 0, this.dim, this.dim);
    }
}

class TilesCellProvider {

    constructor(tilesPane) {
        this.tilesPane = tilesPane;
        this.dim = tilesPane.tilesMap.tileSize;
        this.map = tilesPane.tilesMap.getMap();
        this.tiles = tilesPane.tilesMap.tiles;
        this.animations = tilesPane.tilesMap.getAnimations();
    }

    isFixed() {
        return false;
    }

    getCellSize() {
        return this.dim;
    }

    getColumns() {
        if (this.map.length === 0) {
            return 0;
        }
        return this.map[0].length;
    }

    getRows(value) {
        return this.map.length;
    }

    appendRows(value) {
        for (let i = 0; i < Math.abs(value); i++) {
            const row = [];
            for (let j = 0; j < this.getColumns(); j++) {
                row.push(0);
            }
            if (value < 0) {
                this.map.unshift(row);
            } else {
                this.map.push(row);
            }
        }
    }

    deleteRows(value) {
        for (let i = 0; i < Math.abs(value); i++) {
            if (this.map.length <= 1) {
                break;
            }
            this.map.splice(value < 0 ? 0 : this.map.length  - 1, 1);
        }
    }

    appendColumns(value) {
        for (let i = 0; i < Math.abs(value); i++) {
            for (let j = 0; j < this.getRows(); j++) {
                if (value < 0) {
                    this.map[j].unshift(0);
                } else {
                    this.map[j].push(0);
                }
            }
        }
    }

    deleteColumns(value) {
        for (let i = 0; i < Math.abs(value); i++) {
            if (this.map[0].length <= 1) {
                break;
            }
            for (let j = 0; j < this.getRows(); j++) {
                this.map[j].splice(value < 0 ? 0 : this.map[j].length  - 1, 1);
            }
        }
    }

    setCellValue(x, y, value) {
        const oldValue = this.map[y][x];
        if (Array.isArray(oldValue)) {
            this.map[y][x][0] = value;
        } else {
            this.map[y][x] = value;
        }
    }

    getCellInfo(x, y) {
        return this.getTileObj(x, y);
    }

    getTileObj(x, y) {
        if (x >= this.getColumns()) {
            return null;
        }
        if (y >= this.getRows()) {
            return null;
        }
        const obj = {
            isAnimation: false
        };
        let tile = this.map[y][x];
        if (Array.isArray(tile)) {
            obj.events = [];
            for (let i = 1; i < tile.length; i++) {
                obj.events.push(tile[i]);
            }
            tile = tile[0];
        } else if (typeof tile === 'string' || tile instanceof String) {
            obj.alias = tile;
        }
        if (this.tiles[tile] !== undefined) {
            const tileObj = this.tiles[tile];
            if (tileObj.animation !== undefined) {
                obj.isAnimation = true;
                obj.index = this.animations[tileObj.animation].getFrame().id;
            } else {
                obj.index = (tileObj.index !== undefined) ? tileObj.index : tile;
            }
        } else {
            obj.index = tile;
        }
        return obj;
    }

    getCellImageData(x, y) {
        if (x >= this.getColumns()) {
            return null;
        }
        if (y >= this.getRows()) {
            return null;
        }
        let tile = this.map[y][x];
        if (Array.isArray(tile)) {
            tile = tile[0];
        }
        if (this.tiles[tile] !== undefined) {
            const obj = this.tiles[tile];
            if (obj.animation !== undefined) {
                tile = this.animations[obj.animation].getFrame().id;
            } else {
                tile = (obj.index !== undefined) ? obj.index : tile;
            }
        }
        return this.tilesPane.tilesMap.tilesImg.ctx.getImageData(tile * this.dim, 0, this.dim, this.dim);
    }

    exportCells() {
        function getArrayString(values) {
            const subValues = [];
            for (let value of values) {
                let subValue = null;
                if (Array.isArray(value)) {
                    subValue = getArrayString(value)
                } else if (typeof value === 'string' || value instanceof String) {
                    subValue = JSON.stringify(value);
                } else {
                    subValue = '' + value;
                }
                while(subValue.length < 3) {
                    subValue = ' ' + subValue;
                }
                subValues.push(subValue);
            }
            return '[' + subValues.join(', ') + ']';
        }

        let result = '[\n';
        for (let i of this.map) {
            result += '    ' + getArrayString(i) + ',\n';
        }
        result += ']';

        return result;
    }
}

class Selection {
    constructor() {
        this.selected = null;
    }

    setSelected(value) {
        this.selected = value;
    }

    getSelected() {
        return this.selected;
    }
}

class TilesMapEditor {

    constructor(game, editor, tilesPane) {

        const cellProvider = [new TilesCellProvider(tilesPane), new TileCellProvider(tilesPane), new TilesIndexProvider(tilesPane), new TileCellProvider(tilesPane)];

        ReactDOM.render(<App cellProvider={cellProvider} />, document.getElementById("react-editor"));
/*
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

 */
    }

}

window.gameEditor = {
    TilesMapEditor
};
