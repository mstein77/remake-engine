import inst from "core/instances"
import { Model } from "core/model"
import { d, cloneDeep, BitmapPlayer } from "helper/helper"
import { validated } from "helper/validate"
import { Config } from "core/config"
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
}

class TilesMapImpl extends Model {

    finalizeApply() {
        this.player = {};
        for (let id in this.animations) {
            const player = new BitmapPlayer();
            const animation = this.animations[id];
            player.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed);
            this.player[id] = player;
        }
        this.animatedIndices = [];
    }

    getAnimations() {
        return this.player;
    }

    getTileObj(x, y) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return null;
        }
        let tile = this.map[y][x];
        if (Array.isArray(tile)) {
            tile = tile[0];
        }
        let obj = this.tiles[tile];
        if (obj === undefined) {
            if (this.defaultTile === null) {

                throw new Error('Unknown tile "' + tile + '" given in map at position (' + x + ', ' + y + ')!');
            }
            obj = Object.assign({}, this.defaultTile);
        }
        if (obj.index === undefined) {
            obj.index = tile;
        }

        return obj;
    }

    replaceTile(x, y, newTile) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return;
        }
        this.map[y][x] = newTile;
    }

    getTileAtPos(x, y) {
        return this.getTileObj(x, y);
    }

    getTilesAtXLine(y, x1, x2, lines = 1) {
        const tiles = [];
        while (lines > 0) {
            for (let x = x1; x <= x2; x++) {
                tiles.push(this.getTileObj(x, y));
            }
            y++;
            lines--;
        }
        return tiles;
    }

    getTilesAtYLine(x, y1, y2) {
        const tiles = [];
        for (let y = y1; y <= y2; y++) {
            tiles.push(this.getTileObj(x, y));
        }
        return tiles;
    }

    triggerEventsInRect(x1, y1, width = 1, height = 1) {
        x1 = Math.max(x1, 0);
        y1 = Math.max(y1, 0);
        const x2 = Math.min(x1 + width, this.map[0].length);
        const y2 = Math.min(y1 + height, this.map.length);
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                let tile = this.map[y][x];
                if (Array.isArray(tile)) {
                    if (tile.length === 0) {
                        tile = 0;
                    } else {
                        while (tile.length > 1) {
                            const event = tile.pop();
                            const parts = event.split(':');
                            inst.game.addFrameEvent(parts[0], {object: parts[1], tile: {obj: this.getTileObj(x, y), x, y}});
                        }
                        tile = tile[0];
                    }
                    this.map[y][x] = tile;
                }
            }
        }
    }

    triggerEventsInXLine(x, y1, y2) {
        this.triggerEventsInRect(x, y1, 1, y2 - y1 + 1);
    }

    getTileIndex(x, y) {
        const tile = this.getTileObj(x, y);
        if (tile.animation === undefined) {
            return tile.index;
        }
        const frame = this.player[tile.animation].getFrame();
        if (tile.isRegistered !== true) {
            this.animatedIndices.push(tile.index);
            tile.isRegistered = true;
        }
        return frame.id;
    }

    updateFrames() {
        for (let index in this.player) {
            this.player[index].nextStep();
        }
    }

    getAnimatedTiles(posX, posY, width, height) {
        const result = [];
        if (this.animatedIndices.length > 0) {
            const x_min = Math.max(posX, 0);
            const y_min = Math.max(posY, 0);
            const x_max = Math.min(posX + width, this.map[0].length);
            const y_max = Math.min(posY + height, this.map.length);
            for (let y = y_min; y < y_max; y++) {
                for (let x = x_min; x < x_max; x++) {
                    if (this.animatedIndices.indexOf(this.map[y][x]) !== -1) {
                        result.push([x, y]);
                    }
                }
            }
        }
        return result;
    }

    renderTileTo(target, index) {
        target.clearRect(0, 0, this.tileSize, this.tileSize);
        target.drawImage(
            this.tilesImg.canvas,
            index << this.tileBits,
            0,
            this.tileSize,
            this.tileSize,
            0,
            0,
            this.tileSize,
            this.tileSize
        );

    }

    render(target, offset, dim = {}) {
        // TODO refactor dim
        const startTileX = dim.pos.x;
        const endTileX = startTileX + dim.width;
        const startTileY = dim.pos.y;
        const endTileY = startTileY + dim.height;

        target.clearRect(offset.x, offset.y, dim.width * this.tileSize, dim.height * this.tileSize);

        const xIndices = [];
        for(let x = startTileX; x <= endTileX; x++) {
            let index = x;
            if (index >= this.mapTiles.x) {
                if (dim.endless.x) {
                    while (index >= this.mapTiles.x) {
                        index -= this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.x) {
                    while (index < 0) {
                        index += this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            }
            xIndices.push(index);
        }

        const yIndices = [];
        for(let y = startTileY; y <= endTileY; y++) {
            let index = y;
            if (index >= this.mapTiles.y) {
                if (dim.endless.y) {
                    while (index >= this.mapTiles.y) {
                        index -= this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.y) {
                    while (index < 0) {
                        index += this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            }
            yIndices.push(index);
        }

        const maxTiles = Math.floor(this.tilesImg.width/this.tileSize);

        for (let j = 0; j < yIndices.length; j++) {
            const y = yIndices[j];
            if (y === null) {
                continue;
            }
            for (let i = 0; i < xIndices.length; i++) {
                const x = xIndices[i];
                if (x === null) {
                    continue;
                }
                const index = this.getTileIndex(x, y);
                if (index === 0) {
                    continue;
                }
                const row = Math.floor(index/maxTiles);
                target.drawImage(
                    this.tilesImg.canvas,
                    (index - row * maxTiles) * this.tileSize,
                    row * this.tileSize,
                    this.tileSize,
                    this.tileSize,
                    offset.x + (i << this.tileBits),
                    offset.y + (j << this.tileBits),
                    this.tileSize,
                    this.tileSize
                );
            }
        }
    }

    getDependentImages() {
        return [
            this.tilesImg,
            this.eventsImg
        ]
    }

    addRebuildProps(obj, deep) {
        obj.tileBits = this.tileBits;
        obj.image = !deep ? this.tilesImg.id : this.tilesImg.imageResource
        if (this.eventsImg && !this.eventsImg.isEmpty())
            obj.eventsImage = !deep ? this.eventsImg.id : this.eventsImg.imageResource
        obj.map = cloneDeep(this.map)
        obj.defaultTile = cloneDeep(this.defaultTile)
        obj.tiles = cloneDeep(this.tiles)
        obj.animations = cloneDeep(this.animations)
        obj.brushes = cloneDeep(this.brushes)
        obj.events = cloneDeep(this.events)
        obj.count = this.count
    }
}

const TilesMap = (...args) => {
    return TilesMapImpl.newInst(type, ...args)
}

const type = Model.createType(
    'TilesMap',
    TilesMap,
    TilesMapConfig
)

export {
    TilesMap
}