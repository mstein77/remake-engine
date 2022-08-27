import { CellValue, Grid, CellRawValue } from "../classes";

class CellTileValue extends CellValue {
    constructor() {
        super();
    }

    getEmpty() {
        return 0
    }

    get(curr) {
        if (Array.isArray(curr)) {
            return curr[0]
        }
        return curr;
    }

    set(curr, value) {
        if (Array.isArray(curr)) {
            curr[0] = value;
            return curr;
        }
        return value;
    }

    isEmpty(curr) {
        return curr === 0
    }

    getName() {
        return 'Tiles';
    }

    getId() {
        return 'tile'
    }
}

class CellEventsValue extends CellValue {
    constructor() {
        super();
    }

    getEmpty() {
        return []
    }

    get(curr) {
        if (Array.isArray(curr)) {
            return curr.slice(1);
        }
        return [];
    }

    set(curr, value) {
        if (Array.isArray(curr)) {
            if (value.length === 0) {
                return curr[0];
            }
            return [curr[0], ...value]
        }
        if (value.length === 0) {
            return curr;
        }
        return [curr, ...value]
    }

    isEmpty(curr) {
        return curr.length === 0
    }

    add(base, addItems) {
        const result = [...base];
        for (let item of addItems) {
            if (!result.includes(item)) {
                result.push(item);
            }
        }
        return result
    }

    sub(base, subItems) {
        const result = [];
        for (let item of base) {
            if (!subItems.includes(item)) {
                result.push(item);
            }
        }
        return result;
    }

    getName() {
        return 'Events';
    }

    getId() {
        return 'events'
    }
}

CellValue.color = new CellRawValue('color', '#00000000');
CellValue.index = new CellRawValue('index', 0);
CellValue.tile = new CellTileValue();
CellValue.events = new CellEventsValue();

class EmptyGrid extends Grid {

    constructor(width, height, cellSize, color = '#00000000') {
        super();
        this.cellSizeX = cellSize;
        this.cellSizeY = cellSize;
        this.map = [];
        this.color = color;
        if (this.color.length === 7) {
            this.color += 'ff';
        }
        this.opacity = this.color.substr(7, 2).toLowerCase();
        for (let j = 0; j < height; j++) {
            const row = [];
            for (let i = 0; i < width; i++) {
                row.push(null);
            }
            this.map.push(row);
        }
    }

    getCellSizeX() {
        return this.cellSizeX;
    }

    getCellSizeY() {
        return this.cellSizeY;
    }

    drawGrid(ctx, posX, posY, width, height, grid = 0, zoom = 1, players = null) {
        super.drawGrid(ctx, Math.max(posX, 0), Math.max(posY, 0), width, height, grid, zoom, players);
    }

    drawCellValue(ctx, value, x, y, zoom) {
        if (this.opacity === '00') {
            return;
        }
        if (this.opacity !== 'ff') {
            ctx.clearRect(x, y, this.cellSizeX * zoom, this.cellSizeY * zoom);
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.cellSizeX * zoom, this.cellSizeY * zoom);
    }
}

class IndexGrid extends Grid {

    constructor(tilesIndex, model, key = 'map') {
        super();
        this.index = tilesIndex;
        this.model = model;
        this.key = key;
        this.map = model[key];
    }

    getCellSizeX() {
        return this.index.getSizeX();
    }

    getCellSizeY() {
        return this.index.getSizeY();
    }

    drawCellValue(ctx, value, x, y, zoomOrAvail, players = null) {
        this.index.drawEntity(ctx, value, x, y, zoomOrAvail, players);
    }
}

class TilesGrid extends IndexGrid {
    constructor(tilesIndex, model, key = 'map') {
        super(tilesIndex, model, key);
        this.baseCellValue = CellValue.index;
    }

    isCellValueSupported(cellValue) {
        return [CellValue.index, CellValue.tile, CellValue.events].includes(cellValue)
    }

    hasEvents() {
        return true;
    }

    getAliases() {
        const aliases = [];
        for (let key in this.index.model.tiles) {
            if (this.index.model.tiles[key].index !== undefined && key != this.index.model.tiles[key].index) {
                aliases.push(key);
            }
        }
        return aliases;
    }

    getIndexForTile(tile) {
        const obj = this.index.model.tiles[tile];
        if (!obj || obj.index === undefined) {
            return tile;
        }
        return obj.index;
    }

    drawEvent(ctx, value, x, y, zoom) {
        const event = this.index.model.events && this.index.model.events[value];
        if (!event || !event.width) {
            return false;
        }
        ctx.drawImage(this.index.model.eventsImg, event.x, event.y, event.width, event.height, x  + (event.offsetX * zoom), y + (event.offsetY * zoom), event.width * zoom, event.height * zoom);
        return true;
    }

    updatePlayers(players, posX, posY, width, height) {
        const animations = [];
        const rect = this.getRect(posX, posY, width, height, CellValue.tile);
        for (let row of rect) {
            for (let tile of row) {
                const obj = this.index.model.tiles[tile];
                if (obj && obj.animation && !animations.includes(obj.animation)) {
                    animations.push(obj.animation);
                }
            }
        }
        players.setAnimations(animations);
    }

    drawCellValue(ctx, value, x, y, zoom, players = null) {
        let events = [];
        if (Array.isArray(value)) {
            events = value.slice(1);
            value = value[0];
        }
        const alias = typeof(value) === 'string' ? value : null;
        const obj = this.index.model.tiles[value];
        if (obj) {
            if (players && obj.animation) {
                const frame = players.getCurrFrame(obj.animation);
                if (frame) {
                    value = frame.id;
                }
            } else {
                value = this.getIndexForTile(value);
            }
        }
        super.drawCellValue(ctx, value, x, y, zoom);
        if (events.length) {
            let hasNoImage = true;
            if (this.index.model.events) {
                for (let event of events) {
                    if (this.index.model.events[event]) {
                        hasNoImage = false;
                        break;
                    }
                }
            }
        }
        if (alias) {
            const size = this.getCellSizeX() * zoom;
            ctx.fillStyle = '#00000088';
            ctx.fillRect(x, y, size, 12);
            ctx.font = '10px';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('' + alias, x + 2, y + 10, size - 4);
        }
    }
}

class WrappingIndexGrid extends IndexGrid {

    constructor(tilesIndex, base = null, players = null) {
        super(tilesIndex, {map: []});
        this.base = base;
        this.mapping = tilesIndex.getView(0, tilesIndex.getLength(), [null, base]);
        this.wrapWidth = Math.max(this.mapping.count, 1);
        this.players = players;
        this.hasAnimationProp = players && tilesIndex.hasEntityProp('animation');
    }

    getLength() {
        return this.index.getLength()
    }

    setMatch(match) {
        this.mapping = this.index.getView(0, this.index.getLength(), [match, this.base]);
    }

    setWrapWidth(value) {
        this.wrapWidth = value;
    }

    getWidth() {
        return Math.min(this.wrapWidth, this.mapping.count);
    }

    getHeight() {
        return Math.ceil(this.mapping.count / this.wrapWidth);
    }

    getCellValue(x, y, raw = false) {
        const index = y * this.wrapWidth + x;
        if (index >= this.mapping.count) {
            return null;
        }
        return this.mapping.matches[index];
    }

    updatePlayers(posY, width, height) {
        if (!this.players) {
            return;
        }
        const animations = [];
        const viewX = Math.min(width, this.getWidth());
        const viewY = Math.min(height, this.getHeight());
        for (let y = 0; y < viewY; y++) {
            let currIndex = (posY + y) * this.wrapWidth;
            for (let x = 0; x < viewX; x++) {
                const animation =
                    this.hasAnimationProp ?
                        this.index.getEntityPropValue(
                            this.mapping.matches[currIndex],
                            'animation'
                        ) :
                        this.index.getEntityValue(this.mapping.matches[currIndex]);
                if (animation != '') {
                    animations.push(animation);
                }
                currIndex++;
            }
        }
        this.players.setAnimations(animations)
    }

    drawCellValue(ctx, value, x, y, zoomOrAvail) {
        super.drawCellValue(ctx, this.mapping.matches[value], x, y, zoomOrAvail, this.players);
    }

    drawGrid(ctx, posX, posY, width, height, grid = 0, zoom = 1) {
        const viewX = Math.min(width, this.getWidth());
        const viewY = Math.min(height, this.getHeight());
        const tileX = this.getCellSizeX() * zoom;
        const tileXPlusBorder = tileX + grid;
        const tileY = this.getCellSizeY() * zoom;
        const tileYPlusBorder = tileY + grid;
        ctx.clearRect(0, 0, width * tileX, height * tileY);

        ctx.fillStyle = '#C0C0C0'; // context.contentTextColor;

        const gridHeight = viewY * tileYPlusBorder + grid;
        const gridWidth = viewX * tileXPlusBorder + grid;
        let curr = 0;
        if (grid > 0) {
            for (let x = 0; x <= viewX; x++) {
                ctx.fillRect(curr, 0, grid, gridHeight);
                curr += tileXPlusBorder;
            }
            curr = 0;
            for (let y = 0; y <= viewY; y++) {
                ctx.fillRect(0, curr, gridWidth, grid);
                curr += tileYPlusBorder;
            }
        }
        let currY = grid;
        for (let y = 0; y < viewY; y++) {
            let currX = grid;
            let currIndex = (posY + y) * this.wrapWidth;
            for (let x = 0; x < viewX; x++) {
                this.drawCellValue(ctx, currIndex, currX, currY, {width: tileX, height: tileY}, this.players);
                currX += tileXPlusBorder;
                currIndex++;
            }
            currY += tileYPlusBorder;
        }
    }
}

class BitmapGrid extends Grid {

    constructor(model, key = 'image') {
        super();
        this.model = model;
        this.key = key;
        this.map = this.getColorMapFromImageData(model[key]);
        this.baseCellValue = CellValue.color;
    }

    getCellSizeX() {
        return 5;
    }

    getCellSizeY() {
        return 5;
    }

    drawCellValue(ctx, value, x, y, zoom) {
        ctx.fillStyle = value;
        ctx.fillRect(x, y, this.getCellSizeX() * zoom, this.getCellSizeY() * zoom);
    }

    getColorMapFromImageData(data) {
        const map = [];
        const toHex = function (value) {
            return  ('0' + (value & 0xFF).toString(16)).slice(-2);
        };

        let pos = 0;
        for (let y = 0; y < data.height; y++) {
            const row = [];
            for (let x = 0; x < data.width; x++) {
                row.push(
                    '#'
                    + toHex(data.data[pos])
                    + toHex(data.data[pos + 1])
                    + toHex(data.data[pos + 2])
                    + toHex(data.data[pos + 3])
                );
                pos += 4;
            }
            map.push(row);
        }
        return map;
    }

    getImageData() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = this.getWidth();
        const height = this.getHeight();
        const img = ctx.createImageData(width, height);

        let pos = 0;
        for (let y = 0, yMax = height; y < yMax; y++) {
            for (let x = 0, xMax = width; x < xMax; x++) {
                const hex = this.map[y][x];
                img.data[pos] = parseInt(hex.substr(1, 2), 16);
                img.data[pos + 1] = parseInt(hex.substr(3, 2), 16);
                img.data[pos + 2] = parseInt(hex.substr(5, 2), 16);
                img.data[pos + 3] = parseInt(hex.substr(7, 2), 16);
                pos += 4;
            }
        }
        return img;
    }
}

export {
    EmptyGrid,
    IndexGrid,
    WrappingIndexGrid,
    TilesGrid,
    BitmapGrid
}