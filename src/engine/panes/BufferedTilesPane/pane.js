import inst from "core/instances"
import { d, getCanvasForDim } from "helper/helper"
import { BufferedCanvasContainer } from "core/classes"
import { Pane } from "../classes"
import { Config } from "core/config"
import { validated } from "helper/validate"
import { TilesMap } from "./models"
import { ModelFactory } from "core/model"

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
}

/**
 * TODO:
 *   - Filters
 *   - TileStates
 */
class BufferedTilesPaneImpl extends Pane {

    finalizeApply() {
        this.isBufferedTilesPane = true
        this.defaultTile = null
        this.state = -1
        // mandatory
        this.maxState = Math.floor(this.tilesMap.tileSize / this.maxSpeed)
        this.endless = {
            x: this.endlessX,
            y: this.endlessY
        }
        // scrolling is always relative to the scrollPosOffset (=top left corner of the neutral quadrant)
        this.scrollPos = {
            x: 0,
            y: 0
        }
        this.mapTilePos = {
            x: 0,
            y: 0
        }
        this.eventBounds = {top: 0, bottom: 0, left: 0, right: 0}
        this.scrollLock = false
        this.dirty = true
    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };
        this.viewPortTiles = viewPortTiles;

        // 3 tiles are required in each direction for scrolling around the neutral quadrant
        this.canvasTiles = {
            x: viewPortTiles.x + 3,
            y: viewPortTiles.y + 3
        };
        this.paneDim = {
            x: (this.canvasTiles.x + 2) * this.tilesMap.tileSize,
            y: (this.canvasTiles.y + 2) * this.tilesMap.tileSize
        };

        this.scrollAreaDim = {
            x: this.paneDim.x - 2 * this.tilesMap.tileSize,
            y: this.paneDim.y - 2 * this.tilesMap.tileSize
        };

        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.scrollStop = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };

        // this is where the scrollArea starts
        this.canvasTileOffset = {
            x: 1,
            y: 1
        };

        this.bufferTileOffset = {
            x: 1,
            y: 1
        };

        this.tileMoveVector = {
            x: 0,
            y: 0
        };

        this.scrollPosOffset = {
            x: (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize,
            y: (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize
        };

        this.scrollAreaTileRows = Math.ceil(this.scrollAreaDim.y / this.tilesMap.tileSize);
        const tileSteps = this.scrollAreaTileRows / (this.maxState - 1);

        this.copyRowsInState = [];
        let sum = 0;
        let remRows = viewPortTiles.y + 3;
        while(remRows > 0) {
            const pos = Math.round(tileSteps * (this.copyRowsInState.length + 1));
            const rows = pos - sum;
            this.copyRowsInState.push(rows);
            sum += rows;
            remRows -= rows;
        }
        this.bufferTilePos = {
            x: this.mapTilePos.x,
            y: this.mapTilePos.y
        };
        this.copiedHeight = 0;

        this.oldPos = this.getViewPortMapPos();

        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    hasBufferSwitchInNextFrame() {
        return (this.state === -1 || this.state === this.maxState);
    }

    replaceTile(x, y, newTile) {
        this.tilesMap.replaceTile(x, y, newTile);
        this.renderTile(x, y, this.state === -1, this.hasBufferSwitchInNextFrame());
    }

    updateAnimatedTiles() {
        const animTiles = this.tilesMap.getAnimatedTiles(this.mapTilePos.x, this.mapTilePos.y, this.canvasTiles.x, this.canvasTiles.y);
        for (let tilePos of animTiles) {
            this.renderTile(tilePos[0], tilePos[1], this.hasBufferSwitchInNextFrame());
        }
    }

    getTilesInRect(x1, y1, x2, y2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = x1 + this.scrollPos.x;
        const realEnd = x2 + this.scrollPos.x;
        const relPos = {
            x1: realStart >> this.tilesMap.tileBits,
            x2: realEnd >> this.tilesMap.tileBits,
            y: (y1 + this.scrollPos.y) >> this.tilesMap.tileBits
        };

        const xDiff = x2 - x1 + 1;
        const touchStart = Math.min(xDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(xDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapY = origin.y + relPos.y;
        const start = origin.x + relPos.x1;
        const end = origin.x + relPos.x2;

        const lines = 1 + Math.floor((y2 - y1)/this.tilesMap.tileSize);

        const tiles = this.tilesMap.getTilesAtXLine(mapY, start, end, lines);
        let i = 0;
        const result = [];
        const maxLine = mapY + lines - 1;
        for (let y = mapY; y <= maxLine; y++) {
            for (let x = start; x <= end; x++) {
                let touch = this.tilesMap.tileSize;
                if (x === start) {
                    touch = touchStart;
                } else if (x === end) {
                    touch = touchEnd;
                }
                result.push({x, y, touch, obj: tiles[i]});
                i++;
            }
        }
        return result;
    }

    getTilesInXLine(y, x1, x2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = x1 + this.scrollPos.x;
        const realEnd = x2 + this.scrollPos.x;
        const relPos = {
            x1: realStart >> this.tilesMap.tileBits,
            x2: realEnd >> this.tilesMap.tileBits,
            y: (y + this.scrollPos.y) >> this.tilesMap.tileBits
        };
        const xDiff = x2 - x1 + 1;
        const touchStart = Math.min(xDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(xDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapY = origin.y + relPos.y;
        const start = origin.x + relPos.x1;
        const end = origin.x + relPos.x2;
        const lineTiles = this.tilesMap.getTilesAtXLine(mapY, start, end);
        const result = [];
        let i = 0;
        for (let x = start; x <= end; x++) {
            let touch = this.tilesMap.tileSize;
            if (x === start) {
                touch = touchStart;
            } else if (x === end) {
                touch = touchEnd;
            }
            result.push({x, y: mapY, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    getTilesInYLine(x, y1, y2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = y1 + this.scrollPos.y;
        const realEnd = y2 + this.scrollPos.y;
        const relPos = {
            x: (x + this.scrollPos.x) >> this.tilesMap.tileBits,
            y1: realStart >> this.tilesMap.tileBits,
            y2: realEnd >> this.tilesMap.tileBits
        };
        const yDiff = y2 - y1 + 1;
        const touchStart = Math.min(yDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(yDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapX = origin.x + relPos.x;
        const start = origin.y + relPos.y1;
        const end = origin.y + relPos.y2;
        const lineTiles = this.tilesMap.getTilesAtYLine(mapX, start, end);
        const result = [];
        let i = 0;
        for (let y = start; y <= end; y++) {
            let touch = this.tilesMap.tileSize;
            if (y === start) {
                touch = touchStart;
            } else if (y === end) {
                touch = touchEnd;
            }
            result.push({x: mapX, y, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    getTileAt(x, y) {
        return this.tilesMap.getTileAtPos(x, y);
    }

    getRelativePositionOfTile(x, y) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };
        return {
            x: ((x - origin.x) << this.tilesMap.tileBits) - this.scrollPos.x,
            y: ((y - origin.y) << this.tilesMap.tileBits) + this.scrollPos.y
        };
    }

    getViewPortMapPos() {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const absPosStart = {
            x: (origin.x << this.tilesMap.tileBits) + this.scrollPos.x,
            y: (origin.y << this.tilesMap.tileBits) + this.scrollPos.y
        };

        const absPosEnd = {
            x: absPosStart.x + this.viewPortDim.x - 1,
            y: absPosStart.y + this.viewPortDim.y - 1
        };
        const result = {
            start: {x: absPosStart.x >> this.tilesMap.tileBits, y: absPosStart.y >> this.tilesMap.tileBits},
            end: {x: absPosEnd.x >> this.tilesMap.tileBits, y: absPosEnd.y >> this.tilesMap.tileBits}
        };
        return result;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
        this.state = -1;
        this.dirty = true;
    }

    renderAll(target) {
        this.tilesMap.render(
            target,
            {
                x: this.canvasTileOffset.x * this.tilesMap.tileSize,
                y: this.canvasTileOffset.y * this.tilesMap.tileSize
            },
            {
                width: this.canvasTiles.x,
                height: this.canvasTiles.y,
                pos: {
                    x: this.mapTilePos.x,
                    y: this.mapTilePos.y
                },
                endless: this.endless
            }
        );
    }

    renderTile(x, y, onlyInBuffer = false) {
        const targets = [];
        targets.push({
            ctx: this.buffers.getActiveCtx(),
            offX: this.canvasTileOffset.x + x - this.mapTilePos.x,
            offY: this.canvasTileOffset.y + y - this.mapTilePos.y
        });
        if (this.state > 0) {
            targets.push(
                {
                    ctx: this.buffers.getBufferCtx(),
                    offX: this.bufferTileOffset.x + x  - this.mapTilePos.x,
                    offY: this.bufferTileOffset.y + y - this.mapTilePos.y
                }
            );
        }

        for(let target of targets) {
            this.tilesMap.render(
                target.ctx,
                {
                    x: target.offX * this.tilesMap.tileSize,
                    y: target.offY * this.tilesMap.tileSize
                },
                {
                    width: 1,
                    height: 1,
                    pos: {
                        x,
                        y
                    },
                    endless: this.endless
                }
            );
        }
    }

    copyViewRows(source, target) {
        const copyRows = this.copyRowsInState[this.state - 1];
        if (copyRows > 0) {
            const copyHeight = copyRows * this.tilesMap.tileSize;
            const srcImg = source.getImageData(
                this.canvasTileOffset.x * this.tilesMap.tileSize,
                this.copiedHeight + (this.canvasTileOffset.y * this.tilesMap.tileSize),
                this.scrollAreaDim.x,
                copyHeight
            );
            target.putImageData(srcImg,
                this.bufferTileOffset.x * this.tilesMap.tileSize,
                this.bufferTileOffset.y * this.tilesMap.tileSize + this.copiedHeight
            );
            this.copiedHeight += copyHeight;
        }
    }

    renderNewTiles(target) {
        let addLen = 0;
        let offX = 0;

        if (this.tileMoveVector.x !== 0) {
            if (this.tileMoveVector.x < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: ((this.bufferTileOffset.x - 1) * this.tilesMap.tileSize),
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize)
                    },
                    {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: this.bufferTilePos.x - 1,
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
                offX -= 1;
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: this.bufferTileOffset.x * this.tilesMap.tileSize + this.scrollAreaDim.x,
                        y: this.bufferTileOffset.y * this.tilesMap.tileSize,
                    }, {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: (this.bufferTilePos.x + this.canvasTiles.x),
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
            }
            addLen++;
        }

        if (this.tileMoveVector.y !== 0) {
            if (this.tileMoveVector.y < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y - 1) * this.tilesMap.tileSize
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y - 1
                        },
                        endless: this.endless
                    }
                );
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize) + this.scrollAreaDim.y
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y + this.canvasTiles.y
                        },
                        endless: this.endless
                    }
                );
            }
        }
        this.bufferTilePos.x += this.tileMoveVector.x;
        this.bufferTilePos.y += this.tileMoveVector.y;
    }

    switchBuffer() {
        this.scrollPos.x -= this.tileMoveVector.x * this.tilesMap.tileSize;
        this.scrollPos.y -= this.tileMoveVector.y * this.tilesMap.tileSize;

        this.canvasTileOffset.x = this.bufferTileOffset.x + this.tileMoveVector.x;
        this.canvasTileOffset.y = this.bufferTileOffset.y + this.tileMoveVector.y;

        this.scrollPosOffset.x = (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize;
        this.scrollPosOffset.y = (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize;

        this.mapTilePos.x = this.bufferTilePos.x;
        this.mapTilePos.y = this.bufferTilePos.y;
        this.copiedHeight = 0;

        // set scroll blocks
        if (!this.endless.x) {
            this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
            this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
        }
        if (!this.endless.y) {
            this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
            this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
        }

        this.buffers.switchBuffer();
        this.state = 0;
    }

    getQuadrantMoveVector(fromQuadrant, toQuadrant) {
        const relDist = toQuadrant - fromQuadrant;
        const dist = Math.abs(relDist);
        switch(dist) {
            case 0:
                return {x: 0, y: 0};

            case 1:
                return {x: relDist, y: 0};

            case 2:
                if (relDist < 0) {
                    return {x: 1, y: -1};
                }
                return {x: -1, y: 1};

            case 3:
                return {x: 0, y: (relDist < 0 ? -1 : 1)};

            case 4:
                if (relDist < 0) {
                    return {x: -1, y: -1};
                }
                return {x: 1, y: 1};

            default:
                throw 'Quadrant distance ' + dist + ' not supported';
        }
    }

    getCurrentQuadrant() {
        const qx = Math.floor((this.scrollPos.x + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        const qy = Math.floor((this.scrollPos.y + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        return qy * 3 + qx;
    }

    setScrollLock(value) {
        this.scrollLock = value;
    }

    scrollBy(Sx, Sy) {
        const oldQuad = this.getCurrentQuadrant();

        let exceedX = 0;
        if (Math.max(this.maxSpeed, Math.abs(Sx)) > this.maxSpeed) {
            exceedX = Math.abs(Sx) - this.maxSpeed;
            if (Sx < 0) {
                exceedX *= -1;
                Sx = -this.maxSpeed;
            } else {
                Sx = this.maxSpeed;
            }
        }

        let exceedY = 0;
        if (Math.max(this.maxSpeed, Math.abs(Sy)) > this.maxSpeed) {
            exceedY = Math.abs(Sy) - this.maxSpeed;
            if (Sy < 0) {
                exceedY *= -1;
                Sy = -this.maxSpeed;
            } else {
                Sy = this.maxSpeed;
            }
        }

        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

        // do we need scrolling in x-dir at all?
        if (!this.scrollLock && this.viewPortTiles.x < this.tilesMap.mapTiles.x) {
            if (Math.max(this.maxSpeed, Math.abs(Sx)) > this.maxSpeed) {
                throw Error('Unallowed scroll speed ' + Sx + ' above ' + this.maxSpeed);
            }

            this.scrollPos.x += Sx;
            if (this.scrollStop.left !== null) {
                this.scrollPos.x = Math.max(this.scrollPos.x, this.scrollStop.left);
            }
            if (this.scrollStop.right !== null) {
                this.scrollPos.x = Math.min(this.scrollPos.x, this.scrollStop.right);
            }
            if (this.scrollPos.x <= -this.tilesMap.tileSize) {
                this.scrollPos.x = -this.tilesMap.tileSize + 1;
            } else if (this.scrollPos.x >= (this.paneDim.x - this.viewPortDim.x)) {
                this.scrollPos.x = this.paneDim.x - this.viewPortDim.x;
            }
        }

        if (!this.scrollLock && this.viewPortTiles.y < this.tilesMap.mapTiles.y) {
            if (Math.max(this.maxSpeed, Math.abs(Sy)) > this.maxSpeed) {
                throw Error('Unallowed scroll speed ' + Sy + ' above ' + this.maxSpeed);
            }
            this.scrollPos.y += Sy;
            if (this.scrollStop.top !== null) {
                this.scrollPos.y = Math.max(this.scrollPos.y, this.scrollStop.top);
            }
            if (this.scrollStop.bottom !== null) {
                this.scrollPos.y = Math.min(this.scrollPos.y, this.scrollStop.bottom);
            }

            if (this.scrollPos.y <= -this.tilesMap.tileSize) {
                this.scrollPos.y = -this.tilesMap.tileSize + 1;
            } else if (this.scrollPos.y >= (this.paneDim.y - this.viewPortDim.y)) {
                this.scrollPos.y = this.paneDim.y - this.viewPortDim.y;
            }
        }

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        scrolled.unscrolled.x += exceedX;
        scrolled.unscrolled.y += exceedY;

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        const newQuad = this.getCurrentQuadrant();
        if (oldQuad === newQuad) {
            return scrolled;
        }

        if (newQuad === 4) {
            this.state = 0;
        } else {
            const moveVector = this.getQuadrantMoveVector(oldQuad, newQuad);
            if (this.state === 0)  {
                this.bufferTilePos.x = this.mapTilePos.x;
                if (this.endless.x) {
                    if (this.mapTilePos.x === -this.canvasTiles.x) {
                        this.bufferTilePos.x += this.tilesMap.mapTiles.x;
                    } else if (this.mapTilePos.x === this.tilesMap.mapTiles.x) {
                        this.bufferTilePos.x = 0;
                    }

                }
                this.bufferTilePos.y = this.mapTilePos.y;
                if (this.endless.y) {
                    if (this.mapTilePos.y === -this.canvasTiles.y) {
                        this.bufferTilePos.y += this.tilesMap.mapTiles.y;
                    } else if (this.mapTilePos.y === this.tilesMap.mapTiles.y) {
                        this.bufferTilePos.y = 0;
                    }
                }
                this.tileMoveVector.x = moveVector.x;
                this.tileMoveVector.y = moveVector.y;
                this.bufferTileOffset.x = 1 - moveVector.x;
                this.bufferTileOffset.y = 1 - moveVector.y;
                this.copiedHeight = 0;
                this.state = 1;
            } else {
                this.tileMoveVector.x += moveVector.x;
                this.tileMoveVector.y += moveVector.y;
            }
        }
        return scrolled;
    }

    setEventBounds(bounds) {
        this.eventBounds = Object.assign(this.eventBounds, bounds);
    }

    render() {
        const target = this.buffers.getBufferCtx();
        let all = false;
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderAll(target);
                all = true;
                this.switchBuffer();
                break;

            case this.maxState:
                if (this.isScrolling) {
                    this.renderNewTiles(target);
                    this.switchBuffer();
                }
                break;

            default:
                if (this.isScrolling) {
                    this.copyViewRows(this.buffers.getActiveCtx(), target);
                    this.state++;
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const posLeft = -(this.scrollPosOffset.x + this.scrollPos.x) + 'px';
        const posTop = -(this.scrollPosOffset.y + this.scrollPos.y) + 'px';

        const newPos = this.getViewPortMapPos();
        const oldPos = this.oldPos;

        if (all) {
            const startX = newPos.start.x - this.eventBounds.left;
            const endX =  newPos.end.x + this.eventBounds.right;
            const startY = newPos.start.y - this.eventBounds.top;
            const endY = newPos.end.y + this.eventBounds.bottom;
            this.tilesMap.triggerEventsInRect(startX, startY, endX - startX + 1, endY - startY + 1);
        } else if (oldPos.start.x !== newPos.start.x || oldPos.start.y !== newPos.start.y ||
            oldPos.end.x !== newPos.end.x || oldPos.end.y !== newPos.end.y) {
            const relStart = {
                x: newPos.start.x - oldPos.start.x,
                y: newPos.start.y - oldPos.start.y
            };
            const relEnd = {
                x: newPos.end.x - oldPos.end.x,
                y: newPos.end.y - oldPos.end.y
            };

            const columns = [];
            if (relEnd.x > 0) {
                for (let i = 1; i <= relEnd.x; i++) {
                    columns.push(oldPos.end.x + i + this.eventBounds.right);
                }
            } else if (relEnd.x < 0) {
                for (let i = 1; i <= -relEnd.x; i++) {
                    columns.push(oldPos.start.x - i - this.eventBounds.left);
                }
            }
            const rows = [];
            if (relEnd.y > 0) {
                for (let i = 1; i <= relEnd.y; i++) {
                    rows.push(oldPos.end.y + i + this.eventBounds.bottom);
                }
            } else if (relEnd.x < 0) {
                for (let i = 1; i <= -relEnd.y; i++) {
                    rows.push(newPos.start.y - i - this.eventBounds.top);
                }
            }
            // @TODO much rework and optimization needed here
            if (columns.length > 0) {
                for (let column of columns) {
                    this.tilesMap.triggerEventsInXLine(column, newPos.start.y, newPos.end.y);
                }
            }
        }
        this.oldPos = newPos;

        if (elemStyle.left !== posLeft) {
            inst.game.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            inst.game.addDomOp(elemStyle, 'top', posTop);
        }
    }

    getPreview() {
        const preview = getCanvasForDim(this.viewPortDim.x, this.viewPortDim.y);
        const ctx = preview.getContext('2d');
        const posLeft = this.scrollPosOffset.x + this.scrollPos.x;
        const posTop = this.scrollPosOffset.y + this.scrollPos.y;
        ctx.drawImage(this.buffers.buffers[this.buffers.active].elem, posLeft, posTop, preview.width, preview.height, 0, 0, preview.width, preview.height);
        return {
            type: 'plane',
            texture: preview.toDataURL('image/png'),
            color: null,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }

    getDependentModels() {
        return [ this.tilesMap ]
    }

    addRebuildProps(obj, deep) {
        obj.tilesMap = !deep ? this.tilesMap.id : this.tilesMap.getRebuildJson(true)
        obj.maxSpeed = this.maxSpeed
        obj.endlessX = this.endlessX
        obj.endlessY = this.endlessY
    }
}

const BufferedTilesPane =
    ModelFactory(
        {name: 'BufferedTilesPane', editor: true},
        BufferedTilesPaneConfig
    )
    .addImplementation(BufferedTilesPaneImpl)

export default BufferedTilesPane