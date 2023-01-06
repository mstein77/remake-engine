import inst from "core/instances"
import { getConfigFromInput, BitmapPlayer } from "helper/helper"

class TilesMap {

    constructor(input) {
        this.config = getConfigFromInput(TilesMap.Config, input);
        this.config.applyTo(this);
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
            this.tilesImg.elem,
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

        const maxTiles = Math.floor(this.tilesImg.elem.width/this.tileSize);

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
                    this.tilesImg.elem,
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
}

export {
    TilesMap
}