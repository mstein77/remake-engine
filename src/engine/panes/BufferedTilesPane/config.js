import inst from "core/instances"
import { d, getCanvasForDim, cloneDeep, getRebuildJsonForModel } from "helper/helper"
import { Config } from "core/config"
import { TilesMap } from "./classes"

class TilesMapConfig extends Config {

    getDefaults() {
        return {
            tileBits: 5,
            defaultTile: {},
            tiles: {},
            eventsImage: null,
            animations: {},
            brushes: {},
            events: {},
            count: null,
            map: [[]]
        }
    }

    getFieldProps() {
        return {
            tileBits: {min: 3, max: 16}
        }
    }

    setCount(value) {
        this.count = this.validateInt(value, {min: 0, null: true})
    }

    setTileBits(value) {
        this.tileBits = this.validateInt(value, this.getFieldProp('tileBits'))
    }

    setImage(value) {
        this.image = this.validateImageResource(value)
    }

    setEvents(value) {
        this.events = {};
        for (let [name, obj] of Object.entries(this.validateObject(value))) {
            this.validateObject(obj, {});
            this.addEvent(name, obj.x, obj.y, obj.width, obj.height, obj.offsetX, obj.offsetY)
        }
    }

    addEvent(name, x = 0, y = 0, width = 0, height = 0, offsetX = 0, offsetY = 0) {
        this.events[this.validateString(name)] =
            {
                x: this.validateInt(x, {min: 0, null: true}),
                y: this.validateInt(y, {min: 0, null: true}),
                width: this.validateInt(width, {min: 0}),
                height: this.validateInt(height, {min: 0}),
                offsetX: this.validateInt(offsetX),
                offsetY: this.validateInt(offsetY)
            }
    }

    setEventsImage(value) {
        this.eventsImage = value === null ? null : this.validateImageResource(value)
    }

    setDefaultTile(value) {
        this.defaultTile = this.validateObject(value)
    }

    setTiles(value) {
        this.tiles = this.validateObject(value)
    }

    addTile(id, value) {
        this.tiles[this.validateString(id)] = this.validateObject(value)
    }

    addTiles(values) {
        for (let id in this.validateObject(values)) {
            this.addTile(id, values[id])
        }
    }

    addTiles(values) {
        for (let tile of values) {
            this.addTile(tile)
        }
    }

    setAnimations(value) {
        this.animations = this.validateObject(value)
    }

    addAnimation(id, value) {
        this.animations[this.validateString(id)] = this.validateObject(value)
    }

    addAnimations(values) {
        for (let id in this.validateObject(values)) {
            this.addAnimation(id, values[id])
        }
    }

    setMap(value) {
        this.map = this.validateArray(value)
    }

    setBrushes(value) {
        this.brushes = this.validateObject(value)
    }

    getSubResources() {
        const resources = [
            {id: this.image.id, type: 'image', data: this.image}
        ];
        if (this.eventsImage) {
            resources.push(
                {id: this.eventsImage.id, type: 'image', data: this.eventsImage}
            );
        }
        return resources;
    }

    addRebuildProps(obj, deep, base) {
        obj.tileBits = base.tileBits;
        obj.image = deep ? inst.RL.makeImageResource(base.tilesImg.elem, base.tilesImgId) : base.tilesImgId;
        if (base.eventsImg && base.eventsImg.width !== 0) {
            const eventsImgId = base.eventsImgId ? base.eventsImgId : base.id + '_events.png';
            obj.eventsImage = deep ? inst.RL.makeImageResource(base.eventsImg, eventsImgId) : eventsImgId;
        }
        obj.map = [...base.map];
        obj.defaultTile = base.defaultTile;
        obj.tiles = base.tiles;
        obj.animations = base.animations;
        obj.brushes = base.brushes;
        obj.events = base.events;
        obj.count = base.count;
        return obj;
    }

    applyTo(json) {
        super.applyTo(json);
        json.tileBits = this.tileBits;
        json.tileSize = 1 << this.tileBits;
        json.tilesImgId = this.image.id;
        let canvas = this.image.getCanvas();
        json.tilesImg = canvas;
        const maxTiles = Math.floor(canvas.elem.width/json.tileSize) * Math.floor(canvas.elem.height/json.tileSize);
        json.count = this.count === null ? maxTiles : Math.min(this.count, maxTiles);
        json.eventsImg = this.eventsImage ? this.eventsImage.getCanvas().elem : getCanvasForDim(0, 0);
        json.eventsImgId = this.eventsImage ? this.eventsImage.id : null;
        json.events = cloneDeep(this.events);
        json.map = cloneDeep(this.map);
        json.defaultTile = cloneDeep(this.defaultTile);
        json.tiles = cloneDeep(this.tiles);
        json.animations = cloneDeep(this.animations);
        json.brushes = cloneDeep(this.brushes); // TODO only in editor mode
        json.mapTiles = {
            x: this.map[0].length,
            y: this.map.length
        };
        return json
    }
}
TilesMap.Config = TilesMapConfig

class BufferedTilesPaneConfig extends Config {

    getDefaults() {
        return {
            tilesMap: null,
            maxSpeed: 4,
            endlessX: false,
            endlessY: false
        }
    }

    setMaxSpeed(value) {
        this.maxSpeed = this.validateInt(value)
    }

    setTilesMap(value) {
        this.tilesMap = this.validateConfig(TilesMap, value, {null: true})
    }

    setEndlessX(value) {
        this.endlessX = this.validateBool(value)
    }

    setEndlessY(value) {
        this.endlessY = this.validateBool(value)
    }

    getSubResources() {
        d('GSR')
        return [
            {id: this.tilesMap.id, type: 'json', data: this.tilesMap}
        ]
    }

    addRebuildProps(obj, deep, base) {
        d('ARP')
        obj.tilesMap = !deep ? base.tilesMap.id : getRebuildJsonForModel(TilesMap, base.tilesMap, true)
        obj.maxSpeed = base.maxSpeed
        obj.endlessX = base.endlessX
        obj.endlessY = base.endlessY

        return obj
    }

    applyTo(obj) {
        super.applyTo(obj);
        obj.tilesMap = this.tilesMap
        obj.maxSpeed = this.maxSpeed
        obj.endlessX = this.endlessX
        obj.endlessY = this.endlessY

        return obj
    }
}
BufferedTilesPaneConfig.deps = {
    tilesMap: TilesMap.Config
}

export {
    TilesMapConfig,
    BufferedTilesPaneConfig
}

