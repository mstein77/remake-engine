import { CanvasContainer } from "core/classes"
import { TilesPaneConfig } from "./config"
import { Pane } from "../classes"
import inst from "core/instances"

class TilesPane extends Pane {

    constructor(input) {
        super(input)

        this.endless = {
            x: this.endlessX,
            y: this.endlessY
        }
        this.scrollPos = {
            x: 0,
            y: 0
        }
        this.mapTilePos = {
            x: 0,
            y: 0
        }
    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };

        this.canvasTiles = {
            x: viewPortTiles.x + 1,
            y: viewPortTiles.y + 1
        };
        this.paneDim = {
            x: this.canvasTiles.x * this.tilesMap.tileSize,
            y: this.canvasTiles.y * this.tilesMap.tileSize
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
        this.dirty = true;
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.container;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
    }

    render() {
        const target = this.container.getCanvasCtx();
        this.tilesMap.render(
            target,
            {
                x: 0,
                y: 0
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

        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

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

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        if (scrolled.x === 0 && scrolled.y === 0) {
            return scrolled;
        }

        const mapVector = {
            x: 0, y: 0
        };
        if (this.scrollPos.x < 0) {
            mapVector.x = -1;
            this.scrollPos.x += this.tilesMap.tileSize;
        } else if (this.scrollPos.x >= this.tilesMap.tileSize) {
            mapVector.x = 1;
            this.scrollPos.x -= this.tilesMap.tileSize;
        }
        if (this.scrollPos.y < 0) {
            mapVector.y = -1;
            this.scrollPos.y += this.tilesMap.tileSize;
        } else if (this.scrollPos.y >= this.tilesMap.tileSize) {
            mapVector.y = 1;
            this.scrollPos.y -= this.tilesMap.tileSize;
        }

        if (mapVector.x !== 0 || mapVector.y !== 0) {
            this.mapTilePos.x += mapVector.x;
            this.mapTilePos.y += mapVector.y;

            // set scroll blocks
            if (!this.endless.x) {
                this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
                this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
            }
            if (!this.endless.y) {
                this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
                this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
            }
            this.dirty = true;
        }

        const elemStyle = this.container.getCanvasElem().style;
        const posLeft = -this.scrollPos.x + 'px';
        const posTop = -this.scrollPos.y + 'px';

        if (elemStyle.left !== posLeft) {
            elemStyle.left = posLeft;
//            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            elemStyle.top = posTop;
//            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }

        return scrolled;
    }

    getDependentModels() {
        return [
            this.tilesMap
        ]
    }

    addRebuildProps(obj, deep) {
        obj.tilesMap = !deep ? this.tilesMap.id : this.tilesMap.getRebuildJson(true)
        obj.endlessX = this.endlessX
        obj.endlessY = this.endlessY
    }
}
TilesPaneConfig.linkTo(TilesPane)

inst.paneRegistry.add('TilesPane', TilesPane)

export {
    TilesPane
}