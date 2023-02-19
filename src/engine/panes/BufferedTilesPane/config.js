import { d, cloneDeep } from "helper/helper"
import { validated } from "helper/validate"
import { Config } from "core/config"
import { TilesMap } from "./classes"
import { AppliedImage, RawAppliedImage } from "core/classes"

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

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model, 'eventsImage')
        model.tileSize = 1 << model.tileBits;
        model.tilesImg = new AppliedImage(this.image)
        model.eventsImg = this.eventsImage === null ?
            new RawAppliedImage(model.id + '_events.png') : new AppliedImage(this.eventsImage)
        const maxTiles = Math.floor(
                model.tilesImg.width / model.tileSize) *
            Math.floor(model.tilesImg.height / model.tileSize)
        model.count = model.count === null ? maxTiles : Math.min(model.count, maxTiles)
        model.mapTiles = {
            x: model.map[0].length,
            y: model.map.length
        }
    }

    getFieldProps() {
        return {
            tileBits: {min: 3, max: 16}
        }
    }

    setCount(value) {
        this.count = validated.int(value, {min: 0, null: true})
    }

    setTileBits(value) {
        this.tileBits = validated.int(value, this.getFieldProp('tileBits'))
    }

    setImage(value) {
        this.image = validated.imageResource(value)
    }

    setEvents(value) {
        this.events = {};
        for (let [name, obj] of Object.entries(validated.object(value))) {
            validated.object(obj, {});
            this.addEvent(name, obj.x, obj.y, obj.width, obj.height, obj.offsetX, obj.offsetY)
        }
    }

    addEvent(name, x = 0, y = 0, width = 0, height = 0, offsetX = 0, offsetY = 0) {
        this.events[validated.string(name)] =
            {
                x: validated.int(x, {min: 0, null: true}),
                y: validated.int(y, {min: 0, null: true}),
                width: validated.int(width, {min: 0}),
                height: validated.int(height, {min: 0}),
                offsetX: validated.int(offsetX),
                offsetY: validated.int(offsetY)
            }
    }

    setEventsImage(value) {
        this.eventsImage = validated.imageResource(value, {null: true})
    }

    setDefaultTile(value) {
        this.defaultTile = validated.object(value)
    }

    setTiles(value) {
        this.tiles = validated.object(value)
    }

    addTile(id, value) {
        this.tiles[validated.string(id)] = validated.object(value)
    }

    addTiles(values) {
        for (let id in validated.object(values)) {
            this.addTile(id, values[id])
        }
    }

    addTiles(values) {
        for (let tile of values) {
            this.addTile(tile)
        }
    }

    setAnimations(value) {
        this.animations = validated.object(value)
    }

    addAnimation(id, value) {
        this.animations[validated.string(id)] = validated.object(value)
    }

    addAnimations(values) {
        for (let id in validated.object(values)) {
            this.addAnimation(id, values[id])
        }
    }

    setMap(value) {
        this.map = validated.array(value)
    }

    setBrushes(value) {
        this.brushes = validated.object(value)
    }

    getDependentImages(model) {
        return [
            model.tilesImg,
            model.eventsImg
        ]
    }

    addRebuildProps(obj, deep, base) {
        obj.tileBits = base.tileBits;
        obj.image = !deep ? base.tilesImg.id : base.tilesImg.imageResource
        if (base.eventsImg && !base.eventsImg.isEmpty())
            obj.eventsImage = !deep ? base.eventsImg.id : base.eventsImg.imageResource
        obj.map = cloneDeep(base.map)
        obj.defaultTile = cloneDeep(base.defaultTile)
        obj.tiles = cloneDeep(base.tiles)
        obj.animations = cloneDeep(base.animations)
        obj.brushes = cloneDeep(base.brushes)
        obj.events = cloneDeep(base.events)
        obj.count = base.count
    }
}
TilesMapConfig.linkTo(TilesMap)

class BufferedTilesPaneConfig extends Config {

    getDefaults() {
        return {
            maxSpeed: 4,
            endlessX: false,
            endlessY: false,
            tilesMap: undefined
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
    }

    setMaxSpeed(value) {
        this.maxSpeed = validated.int(value)
    }

    setTilesMap(value) {
        this.tilesMap = validated.config(TilesMap, value)
    }

    setEndlessX(value) {
        this.endlessX = validated.bool(value)
    }

    setEndlessY(value) {
        this.endlessY = validated.bool(value)
    }

    getDependentModels(model) {
        return [ model.tilesMap ]
    }

    addRebuildProps(obj, deep, base) {
        obj.tilesMap = !deep ? base.tilesMap.id : base.tilesMap.config.getRebuildJson(true, base.tilesMap)
        obj.maxSpeed = base.maxSpeed
        obj.endlessX = base.endlessX
        obj.endlessY = base.endlessY
    }
}

export {
    TilesMapConfig,
    BufferedTilesPaneConfig
}

