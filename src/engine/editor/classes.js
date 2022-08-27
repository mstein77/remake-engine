import { cloneDeep, union, without } from "../helper/helper";

class CellSelection {

    constructor(type = 'none', cells = [[]], cellValue = CellValue.raw) {
        this.type = type;
        this.cellValue = cellValue;
        this.entityIndex = null;
        this.cellsProp = null;
        if (type === 'multi') {
            this.cells = cells.rect;
            this.gapX = cells.gapX;
            this.gapY = cells.gapY;
            this.baseX = cells.baseX;
            this.baseY = cells.baseY;
        } else if (type === 'entity') {
            this.entityIndex = cells.entityIndex;
            this.cellsProp = cells.cellsProp;
            this.value = cells.value;
            this.setCellsFromEntity();
        } else {
            this.cells = type === 'none' ? [[]] : cells;
        }
    }

    setCellsFromEntity() {
        if (this.type === 'entity') {
            const index = this.entityIndex.getEntityByPropValue('value', this.value);
            if (index !== null) {
                this.cells = this.entityIndex.getEntityPropValue(index, this.cellsProp);
            }
        }
    }

    getCellValue() {
        return this.cellValue
    }

    getWidth() {
        return this.cells[0].length;
    }

    getHeight() {
        return this.cells.length;
    }

    getRow(index, length = null) {
        if (length === null) {
            if (index > this.cells.length) {
                return null;
            }
            return this.cells[index];
        }
        const result = [];
        const row = this.cells[index % this.cells.length];
        let pos = 0;
        while(length > 0) {
            result.push(row[pos]);
            pos++;
            pos %= row.length;
            length--;
        }
        return result;
    }

    getBaseRect(x, y) {
        const cells = [];
        while(cells.length < this.baseY) {
            cells.push(this.cells[y].slice(x, x + this.baseX));
            y++;
        }
        return cells;
    }

    getBaseCells() {
        const baseCells = [];
        const xDist = this.baseX + this.gapX;
        const yDist = this.baseY + this.gapY;
        let y = 0;
        const yMax = this.getHeight();
        const xMax = this.getWidth();
        while (y < yMax) {
            let x = 0;
            while (x < xMax) {
                baseCells.push(this.getBaseRect(x, y));
                x += xDist;
            }
            y += yDist;
        }
        return baseCells;
    };

    getCells() {
        return this.cells;
    }

    getCell(x = 0, y = 0) {
        if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
            return null;
        }
        return this.cells[y][x];
    }

    getType() {
        return this.type;
    }

    getName() {}

    isCell() {
        return (this.isRect() && this.getWidth() === 1 && this.getHeight() === 1)
    }

    isRect() {
        return this.type === 'rect';
    }

    isRows() {
        return this.type === 'rows';
    }

    isColumns() {
        return this.type === 'columns';
    }

    isEntity() {
        return this.type === 'entity';
    }

    getEntityValue() {
        return this.value;
    }

    isBitmap() {
        return this.type === 'bitmap';
    }

    getNotEmptyMatrix(offset = null, length = null) {
        const rows = [];
        const xMin = !this.isRows() || offset === null ? 0 : offset;
        const xMax = this.isRows() && length !== null ? xMin + length : this.cells[0].length;
        const yMin = !this.isColumns() || offset === null ? 0 : offset;
        const yMax = this.isColumns() && length !== null ? yMin + length : this.cells.length;

        for (let y = yMin; y < yMax; y++) {
            const row = [];
            for (let x = xMin; x < xMax; x++) {
                row.push(this.cellValue.isEmpty(this.cells[y][x]));
            }
            rows.push(row);
        }
        return rows;
    }
}

class CellProvider {

    constructor(size) {
        this.size = size;
    }

    hasAutoWidth() {
        return false;
    }

    getCellType() {
        throw Error('Implement');
    }

    isResizeable() {
        throw Error('Implement');
    }

    getEmptyCell() {
        throw Error('Implement');
    }

    getEmptySelection() {
        return new CellSelection('rect', [[this.getEmptyCell()]]);
    }

    overwriteCell(x, y, value) {
        this.map[y][x] = value;
    }

    convertURIToImageData(URI) {
        return new Promise(function(resolve, reject) {
            if (URI == null) return reject();
            const canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                image = new Image();

            image.addEventListener('load', function() {
                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve({
                    context,
                    imgData: context.getImageData(0, 0, canvas.width, canvas.height)
                });
            }, false);
            image.src = URI;
        });
    }

    getClonedValue(value, raw = false) {
        return value;
    }

    getClonedRow(row, raw = false) {
        const result = [];
        for (let cell of row) {
            result.push(this.getClonedValue(cell, raw));
        }
        return result;
    }

    getSize() {
        return this.size;
    }

    getWidth() {
        return this.map[0].length;
    }

    getHeight() {
        return this.map.length;
    }

    getEmptyRow() {
        const row = [];
        let i = this.map[0].length;
        while (i > 0) {
            row.push(this.getEmptyCell());
            i--;
        }
        return row;
    }

    addRows(start, no) {
        if (no == 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                if (start) {
                    this.map.unshift(this.getEmptyRow());
                } else {
                    this.map.push(this.getEmptyRow());
                }
                no--;
            }
            return added;
        } else {
            if (this.map.length + no < 1) {
                no = -this.map.length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map.length + no;
            this.map.splice(pos, -no);
            return -no;
        }
    }

    insertRowsAt(index, no) {
        const rows = [];
        while (no > 0) {
            rows.push(this.getEmptyRow());
            no--;
        }
        this.map.splice.call(this.map, index, 0, ...rows);
    }

    deleteRows(index, no) {
        this.map.splice(index, no);
    }

    addColumns(start, no) {
        if (no === 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                    if (start) {
                        this.map[i].unshift(this.getEmptyCell());
                    } else {
                        this.map[i].push(this.getEmptyCell());
                    }
                }
                no--;
            }
            return added;
        } else {
            if (this.map[0].length + no < 1) {
                no = -this.map[0].length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map[0].length + no;
            for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                this.map[i].splice(pos, -no);
            }
            return -no;
        }
    }

    insertColumnsAt(index, no) {
        const columns = [];
        while (no > 0) {
            columns.push(this.getEmptyCell());
            no--;
        }
        for (let column of this.map) {
            column.splice.call(column, index, 0, ...columns);
        }
    }

    deleteColumns(index, no) {
        for (let row of this.map) {
            row.splice(index, no);
        }
    }

    fillRect(posX, posY, width, height, elem) {
        for (let y = posY, yMax = posY + height; y < yMax; y++) {
            for (let x = posX, xMax = posX + width; x < xMax; x++) {
                this.overwriteCell(x, y, this.getClonedValue(elem))
            }
        }
    }

    writePath(path) {
        for (let key in path) {
            const pos = key.split(' ');
            this.overwriteCell(pos[0], pos[1], this.getClonedValue(path[key]));
        }
    }

    fillRectWithSelection(posX, posY, width, height, selection, raw = false) {
        for (let y = 0; y < height; y++) {
            const row = selection.getRow(y, width);
            for (let x = 0; x < width; x++) {
                this.overwriteCell(posX + x, posY + y, this.getClonedValue(row[x], raw));
            }
        }
    }

    fillRectWithRawSelection(posX, posY, width, height, selection) {
        this.fillRectWithSelection(posX, posY, width, height, selection, true);
    }

    writeSelection(posX, posY, selection, overwrite = null, writeEmpty = true) {
        let i = 0;
        let xMax = Math.min(selection.getWidth(), this.getWidth() - posX);
        let iMax = Math.min(selection.getHeight(), this.getHeight() - posY);
        let row;
        const cellValue = selection.getCellValue();
        const result = {
            old: {},
            new: {}
        };

        const empty = this.getEmptyCell();
        while (i < iMax) {
            row = selection.getRow(i);
            for (let x = 0; x < xMax; x++) {
                const value = overwrite !== null ? overwrite : row[x];
                if (writeEmpty || (!writeEmpty && value !== empty)) {
                    const key = (posX + x) + ' ' + posY;
                    result.old[key] = cellValue.get(this.map[posY][posX + x]);
                    this.overwriteCell(posX + x, posY, value, cellValue);
                    result.new[key] = value;
                }
            }
            posY++;
            i++;
        }
        return result;
    }

    reduceToRect(posX, posY, width, height) {
        this.map = this.getRect(posX, posY, width, height, true);
    }

    getRect(posX, posY, width, height, raw = false) {
        const slice = this.map.slice(posY, posY + height);
        const rowSlices = [];
        for (let row of slice) {
            rowSlices.push(this.getClonedRow(row.slice(posX, posX + width), raw));
        }
        return rowSlices;
    }

    getCellValue(posX, posY, raw = false) {
        const rect = this.getRect(posX, posY, 1, 1, raw);
        if (Array.isArray(rect) && rect.length > 0) {
            return rect[0][0];
        }
        return null;
    }

    importSelection(selection, raw = false) {
        this.map = [];
        const iMax = selection.getHeight();
        let i = 0;
        while (i < iMax) {
            this.map.push(this.getClonedRow(selection.getRow(i), raw));
            i++;
        }
    }

    importRawSelection(selection) {
        this.importSelection(selection, true);
    }

    getSelection(posX, posY, width, height, raw = false) {
        return new CellSelection('rect', this.getRect(posX, posY, width, height, raw));
    }

    getRawSelection(posX, posY, width, height) {
        return this.getSelection(posX, posY, width, height, true);
    }
}

class EntityIndex {

    constructor() {
        this.updates = [];
        this.allIndices = null;
        this.suspendNotifications = false;
        this.valueIndexing = false;
        this.valueTemplate = '';
    }

    addListener(listener) {
        if (!this.listeners) {
            this.listeners = [];
        }
        this.listeners.push(listener);
    }

    removeListener(listener) {
        if (!this.listeners) {
            return;
        }
        if (this.listeners.includes(listener)) {
            this.listeners.splice(this.listeners.indexOf(listener), 1);
        }
    }

    notify() {
        if (this.suspendNotifications) {
            return;
        }
        this.allIndices = null;
        if (!this.listeners) {
            return;
        }
        for (let listener of this.listeners) {
            listener(this.updates);
        }
        this.updates = [];
    }

    addPropUpdate(index) {
        this.updates.push({type: 'update', index});
    }

    addDeleteUpdate(index) {
        this.updates.push({type: 'delete', index, value: this.getEntityValue(index)});
    }

    hasIndex(index) {
        return (index >= 0 && index < this.getLength());
    }

    hasUniqueValues() {
        return true
    }

    hasPropValueMatch(prop, matchFunction) {
        const indices = this.getAllIndices();
        for(let index of indices) {
            const value = this.getEntityPropValue(index, prop);
            if (value !== undefined && matchFunction(value)) {
                return true;
            }
        }
        return false
    }

    hasPropValue(prop, value) {
        return this.hasPropValueMatch(prop, item => value === item);
    }

    hasEntityDim() {
        return this.hasEntityProp('width');
    }

    hasEntityProp(name) {
        return this.getEntityProps().includes(name);
    }

    hasEntityImage(index) {
        return true;
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    getIndexDim() {
        return {x: this.getSizeX(), y: this.getSizeY()}
    }

    getLength() {
        return this.items.length;
    }

    getAllIndices() {
        if (this.allIndices === null) {
            const indices = [];
            let i = 0;
            let iMax = this.getLength();
            while (i < iMax) {
                indices.push(i++);
            }
            this.allIndices = indices;
        }
        return this.allIndices;
    }

    getAutoProps() {
        return [];
    }

    getEntityProps() {
        return ['index', 'value'];
    }

    getEntityPropValue(index, prop) {
        if (prop === 'index') {
            return index;
        } else if (prop === 'value') {
            return this.items[index];
        }
    }

    getEntityObject(index, props = null) {
        const obj = {};
        const objProps = props ? props : this.getEntityProps();
        for (let prop of objProps) {
            obj[prop] = this.getEntityPropValue(index, prop)
        }
        return obj;
    }

    getEntityValue(index) {
        return this.items[index];
    }

    getEntityByPropValue(prop, value) {
        let i = 0;
        const iMax = this.getLength();
        while(i < iMax) {
            if (this.getEntityPropValue(i, prop) === value) {
                return i;
            }
            i++;
        }
        return null;
    }

    getValueTemplate() {
        return this.valueTemplate
    }

    setValueTemplate(value) {
        this.valueTemplate = value
    }

    getPropValues(prop) {
        const values = [];
        const indices = this.getAllIndices();
        for (let index of indices) {
            values.push(this.getEntityPropValue(index, prop));
        }
        return values;
    }

    getEntityObjects(indices = null) {
        const result = [];
        if (indices === null) {
            indices = this.getAllIndices();
        }
        for (let index of indices) {
            result.push(this.getEntityObject(index));
        }
        return result
    }

    getMatchingEntities(indices, match) {
        return indices;
    }

    getView(start, length = null, match = null, sort = null) {
        let indices = this.getAllIndices();
        if (Array.isArray(match)) {
            if (match.length == 2 && typeof match[1] === 'function') {
                indices = indices.filter(match[1]);
            }
            match = match.length ? match[0] : null;
        }
        const items = this.getMatchingEntities(indices, match);

        // TODO sorting here

        const matches = [];
        const count = items.length;
        if (length === null) {
            length = count;
        }
        const max = Math.min(count, start + length);
        let i = start;
        while (i < max) {
            matches.push(items[i]);
            i++;
        }
        return {
            matches,
            count
        };
    }

    setItems(items) {
        this.items = items;
        this.notify();
    }

    setEntityValue(index, value) {
        this.items[index] = value;
        this.notify();
    }

    setEntityPropValue(index, prop, value) {
        switch(prop) {
            case 'index':
                break;

            case 'value':
                this.setEntityValue(index, value);
                break;
        }
    }

    setEntityObject(obj, overwrite = false) {
        return this.setEntityObjects([obj], overwrite)[0];
    }

    setEntityObjects(objects, overwrite = false) {
        if (objects.length === 0) {
            return [];
        }
        this.suspendNotifications = true;

        const result = [];
        let changeIndex = [];
        let i = 0;
        const iMax = this.getLength();
        while(i < iMax) {
            changeIndex.push({
                newValue: this.getEntityValue(i),
                objIndex: null,
                currIndex: i++
            });
        }

        let objIndex = 0;
        const transfers = [];
        for (let obj of objects) {
            result.push(null);
            if (obj.index !== undefined) {
                if (overwrite) {
                    const oldObj = changeIndex[obj.index];
                    if (oldObj.newValue !== obj.value) {
                        transfers.push([oldObj.newValue, obj.value]);
                        oldObj.newValue = obj.value;
                    }
                    oldObj.objIndex = objIndex;
                } else {
                    changeIndex.splice(obj.index, 0, {
                        newValue: obj.value,
                        objIndex,
                        currIndex: null
                    });
                }
            } else if (obj.value !== undefined) {
                changeIndex.push({
                    newValue: obj.value,
                    objIndex,
                    currIndex: null
                });
            }
            objIndex++;
        }
        const newIndex = [];
        const updates = [];
        i = 0;
        if (this.valueIndexing) {
            for (let item of changeIndex) {
                const index = i++;
                newIndex.push(item.newValue);
                item.newValue = index;
                if (item.currIndex === index && item.objIndex === null) {
                    continue;
                }
                if (item.objIndex !== null) {
                    result[item.objIndex] = index;
                    updates.push([index, {...objects[item.objIndex], value: index}]);
                } else {
                    updates.push([index, {...this.getEntityObject(item.currIndex), value: index}]);
                }
            }
        } else {
            if (this.indexSorting) {
                changeIndex.sort((a, b) => {
                    return this.indexSorting(a.newValue, b.newValue);
                });
            }

            for (let item  of changeIndex) {
                const index = i++;
                newIndex.push(item.newValue);
                if (item.currIndex === index && item.objIndex === null) {
                    continue;
                }
                if (item.objIndex !== null) {
                    result[item.objIndex] = index;
                    updates.push([index, objects[item.objIndex]]);
                } else {
                    updates.push([index, this.getEntityObject(item.currIndex)]);
                }
            }
            if (transfers.length) {
                for(let [oldValue, newValue] of transfers) {
                    if (!newIndex.includes(oldValue)) {
                        this.handleEntityValueReplace(oldValue, newValue);
                    }
                }
            }
        }
        this.setItems(newIndex);
        this.doUpdates(updates, overwrite);

        this.suspendNotifications = false;
        this.notify();
        return result
    }

    deleteEntityPropValues(index) {}

    deleteEntity(index) {
        this.deleteEntities([index]);
    }

    deleteEntities(indices) {
        this.suspendNotifications = true;
        const newItems = [];
        const length = this.getLength();
        let i = 0;
        while(i < length) {
            if (!indices.includes(i)) {
                newItems.push(this.getEntityValue(i));
            } else {
                this.addDeleteUpdate(i);
                this.deleteEntityPropValues(i);
            }
            i++;
        }
        const updates = [];
        if (this.valueIndexing) {
            let index = 0;
            for (let oldIndex of newItems) {
                if (oldIndex !== index) {
                    updates.push([index, { ...this.getEntityObject(oldIndex), value: index }]);
                }
                newItems[index] = index;
                index++;
            }
        }

        this.setItems(newItems);
        if (updates.length) {
            this.doUpdates(updates, true);
        }
        this.suspendNotifications = false;
        this.notify();
    }

    assignAutoProps(updatedIndices = []) {
        return [];
    }

    handleEntityValueReplace(oldValue, newValue) {}

    doUpdates(updates, overwrite) {
        const props = [];
        const autoProps = overwrite && !this.hasEntityDim() ? [] : this.getAutoProps();
        for (let prop of this.getEntityProps()) {
            if (prop === 'index' || autoProps.includes(prop)) {
                continue;
            }
            props.push(prop);
        }
        const updateIndices = [];
        for (let [index, obj] of updates) {
            updateIndices.push(index);
            for (let prop of props) {
                this.setEntityPropValue(index, prop, obj[prop]);
            }
        }
        if (autoProps.length > 0) {
            const reassignProps = this.assignAutoProps(updateIndices);
            if (reassignProps.length > 0) {
                for (let [index, obj] of updates) {
                    for (let prop of reassignProps) {
                        this.setEntityPropValue(index, prop, obj[prop]);
                    }
                }
            }
        }
    }
}

class CellValue {
    constructor() {
    }

    getName() {
        return 'Raw';
    }

    getId() {
        return 'raw'
    }

    add(base, add) {
        return add;
    }

    getEmpty() {
        return undefined;
    }

    sub(base, sub) {
        return (base === sub) ? this.getEmpty() : base;
    }
}

class CellRawValue extends CellValue {

    constructor(id, empty = null) {
        super();
        this.id = id;
        this.empty = empty;
    }

    getEmpty() {
        return this.empty
    }

    get(curr) {
        if (!Array.isArray(curr)) {
            return curr;
        }
        return [...curr]
    }

    set(curr, value) {
        return cloneDeep(value)
    }

    isEmpty(curr) {
        return curr === this.empty;
    }

    getName() {
        return 'Raw';
    }

    getId() {
        return this.id
    }
}
CellValue.raw = new CellRawValue('raw');

class Grid {

    constructor() {
        this.baseCellValue = CellValue.raw;
        this.dimListeners = [];
    }

    addDimListener(listener) {
        this.dimListeners.push(listener);
    }

    removeDimListener(listener) {
        const index = this.dimListeners.indexOf(listener);
        if (index !== -1) {
            this.dimListeners.splice(index, 1)
        }
    }

    notifyDimChange() {
        for (let listener of this.dimListeners) {
            listener();
        }
    }

    hasEvents() {
        return false;
    }

    getLength() {
        return null
    }

    getWidth() {
        return this.map.length === 0 ? 0 : this.map[0].length;
    }

    getHeight() {
        return this.map.length;
    }

    getCellSizeX() {
        return 1;
    }

    getCellSizeY() {
        return 1;
    }

    getGridDim(width, height, grid, zoom) {
        const tileX = this.getCellSizeX() * zoom;
        const tileXPlusBorder = tileX + grid;
        const tileY = this.getCellSizeY() * zoom;
        const tileYPlusBorder = tileY + grid;
        return {
            width: (tileXPlusBorder * width + grid) ,
            height: (tileYPlusBorder * height + grid)
        }
    }

    drawCellValue(ctx, value, x, y, zoom) {};

    drawGrid(ctx, posX, posY, width, height, grid = 0, zoom = 1, players = null) {
        const cellsX = this.getWidth();
        const cellsY = this.getHeight();
        if (posX + width > cellsX || posY + height > cellsY) return;

        const viewX = width;
        const viewY = height;
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
            for (let x = 0; x < viewX; x++) {
                const index = this.map[posY + y][posX + x];
                this.drawCellValue(ctx, index, currX, currY, zoom, players);
                currX += tileXPlusBorder;
            }
            currY += tileYPlusBorder;
        }
    }

    // cell methods

    hasCell(x, y) {
        return (y < this.getHeight() || x < this.getWidth());
    }

    getEmptyCell(cellValue = this.baseCellValue) {
        return cellValue.getEmpty();
    }

    overwriteCell(x, y, value, cellValue = this.baseCellValue) {
        this.map[y][x] = cellValue.set(this.map[y][x], value);
    }

    getCellValue(x, y, cellValue= this.baseCellValue) {
        if (!this.hasCell(x, y)) {
            return null;
        }
        return cellValue.get(this.map[y][x]);
    }

    // row methods

    getEmptyRow(cellValue= this.baseCellValue) {
        const row = [];
        let i = this.map[0].length;
        while (i > 0) {
            row.push(this.getEmptyCell(cellValue));
            i--;
        }
        return row;
    }

    addRows(start, no) {
        if (no == 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                if (start) {
                    this.map.unshift(this.getEmptyRow());
                } else {
                    this.map.push(this.getEmptyRow());
                }
                no--;
            }
            this.notifyDimChange();
            return added;
        } else {
            if (this.map.length + no < 1) {
                no = -this.map.length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map.length + no;
            this.map.splice(pos, -no);
            this.notifyDimChange();
            return -no;
        }
    }

    insertRowsAt(index, no) {
        const rows = [];
        while (no > 0) {
            rows.push(this.getEmptyRow());
            no--;
        }
        this.map.splice.call(this.map, index, 0, ...rows);
        this.notifyDimChange()
    }

    deleteRows(index, no) {
        this.map.splice(index, no);
        this.notifyDimChange()
    }

    getClonedRow(row, cellValue= this.baseCellValue) {
        const result = [];
        for (let cell of row) {
            result.push(cellValue.get(cell));
        }
        return result;
    }

    // column methods
    addColumns(start, no) {
        if (no === 0) {
            return 0;
        }
        if (no > 0) {
            const added = no;
            while (no > 0) {
                for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                    if (start) {
                        this.map[i].unshift(this.getEmptyCell());
                    } else {
                        this.map[i].push(this.getEmptyCell());
                    }
                }
                no--;
            }
            this.notifyDimChange();
            return added;
        } else {
            if (this.map[0].length + no < 1) {
                no = -this.map[0].length + 1;
                if (no === 0) {
                    return 0;
                }
            }
            const pos = start ? 0 : this.map[0].length + no;
            for (let i = 0, iMax = this.map.length; i < iMax; i++) {
                this.map[i].splice(pos, -no);
            }
            this.notifyDimChange();
            return -no;
        }
    }

    insertColumnsAt(index, no) {
        const columns = [];
        while (no > 0) {
            columns.push(this.getEmptyCell());
            no--;
        }
        for (let column of this.map) {
            column.splice.call(column, index, 0, ...columns);
        }
        this.notifyDimChange()
    }

    deleteColumns(index, no) {
        for (let row of this.map) {
            row.splice(index, no);
        }
        this.notifyDimChange()
    }

    // rect methods

    getRect(posX, posY, width, height, cellValue= this.baseCellValue) {
        const slice = this.map.slice(posY, posY + height);
        const rowSlices = [];
        for (let row of slice) {
            rowSlices.push(this.getClonedRow(row.slice(posX, posX + width), cellValue));
        }
        return rowSlices;
    }

    fillRect(posX, posY, width, height, elem, cellValue= this.baseCellValue) {
        for (let y = posY, yMax = posY + height; y < yMax; y++) {
            for (let x = posX, xMax = posX + width; x < xMax; x++) {
                this.overwriteCell(x, y, elem, cellValue)
            }
        }
    }

    reduceToRect(posX, posY, width, height) {
        // TODO also set in model.key
        this.map = this.getRect(posX, posY, width, height);
        this.notifyDimChange()
    }

    // path methods

    writePath(path, cellValue= this.baseCellValue) {
        for (let key in path) {
            const pos = key.split(' ');
            this.overwriteCell(pos[0], pos[1], path[key], cellValue);
        }
    }

    // selection methods

    getEmptySelection(cellValue= this.baseCellValue) {
        return new CellSelection('rect', [[this.getEmptyCell(cellValue)]], cellValue);
    }

    getSelection(posX, posY, width, height, cellValue= this.baseCellValue) {
        return new CellSelection('rect', this.getRect(posX, posY, width, height, cellValue), cellValue);
    }

    getRawSelection(posX, posY, width, height) {
        return this.getSelection(posX, posY, width, height);
    }

    isCellValueSupported(cellValue) {
        return (cellValue === this.baseCellValue)
    }

    getSelectionCellValue(selection, required = null) {
        const cellValue = selection.getCellValue();
        if (!this.isCellValueSupported(cellValue)) {
            throw Error(`Grid does not support cell value ${cellValue.getName()} from selection!`);
        }
        if (required !== null && !required.includes(cellValue)) {
            throw Error(`Got unexpected cell value ${cellValue.getName()}`);
        }
        return cellValue;
    }

    writeSelection(posX, posY, selection, overwrite = null, writeEmpty = true) {
        let i = 0;
        let xMax = Math.min(selection.getWidth(), this.getWidth() - posX);
        let iMax = Math.min(selection.getHeight(), this.getHeight() - posY);
        let row;
        const result = {
            old: {},
            new: {}
        };
        const cellValue = this.getSelectionCellValue(selection);

        while (i < iMax) {
            row = selection.getRow(i);
            for (let x = 0; x < xMax; x++) {
                const value = overwrite !== null ? overwrite : row[x];
                if (writeEmpty || (!writeEmpty && !cellValue.isEmpty(value))) {
                    const key = (posX + x) + ' ' + posY;
                    result.old[key] = cellValue.get(this.map[posY][posX + x]);
                    this.overwriteCell(posX + x, posY, value, cellValue);
                    result.new[key] = value;
                }

            }
            posY++;
            i++;
        }
        return result;
    }

    fillRectWithSelection(posX, posY, width, height, selection) {
        const cellValue = this.getSelectionCellValue(selection);
        for (let y = 0; y < height; y++) {
            const row = selection.getRow(y, width);
            for (let x = 0; x < width; x++) {
                this.overwriteCell(posX + x, posY + y, row[x], cellValue);
            }
        }
    }

    importSelection(selection) {
        const cellValue = this.getSelectionCellValue(selection, [this.baseCellValue]);
        this.map = [];
        const iMax = selection.getHeight();
        let i = 0;
        while (i < iMax) {
            this.map.push(this.getClonedRow(selection.getRow(i), cellValue));
            i++;
        }
        this.notifyDimChange();
    }

    importRawSelection(selection) {
        this.importSelection(selection);
    }
}

/**
 * Usage:
 *     const [ treeState, setTreeState ] = useState(null);
 *                                // or: = useCachedState('bla')
 *
 *     const tree = useMemo(() => new TreeView(nodes, setTreeState, treeState));
 *
 *  Wäre es vorteilhafter, wenn wir den state NUR initial in den TreeView geben und danach komplett
 *  intern verwalten? Würde einen stateListener erfordern für updates:
 *
 *     const tree = useMemo(() => new TreeView(nodes, treeState));
 *     tree.setUpdater(update)
 *
 *  PRO: der Tree-State bringt ausserhalb der Klasse rein garnichts
 *
 *  if (!tree.visible(active)) {
 *      const newActive = tree.getFallbackNode(active);
 *      callAfterwards(setActive, newActive);
 *  }
 *
 *
 *
 *  Model-Changes:
 *
 *  Virtualisierung:
 *
 *  Selection:
 *
 *  Filterung:
 *    const [ filterValue, setFilterValue ] = useState();
 *    const filter = useMemo(node => {
 *
 *    });
 *    tree.setFilter(filter, filterValue);
 *--------------
 *  Rendering:
 */
class AbstractTreeView {

    constructor(model) {
        this.model = model;
        let currLevel = null;
        const locked = new Map();
        this.locker = {
            update: level => {
                currLevel = level;
                for (let [key, keyLevel] of locked.entries()) {
                    if (level <= keyLevel) locked.delete(key);
                }
            },
            lock: key => locked.set(key, currLevel),
            clear: () => { locked.clear(); currLevel = null },
            getLockDist: key => currLevel - locked.get(key),
            isLocked: key => locked.has(key)
        };
        this.id2viewIndex = new Map();
        this.id2modelIndex = new Map();
        this.groups = this.getGroups();

        const typesMap = new Map();
        const types = this.getTypes();
        for (let type of types) typesMap.set(type.id, type);
        this.types = typesMap;
        this.context = {};
        this._view = null;
        this.hidden = new Set();
        this.sortings = this.getSortings()
    }

    setContext(context) {
        this.context = context;
        this._view = null;
    }

    getGroups() {
        return []
    }

    getTypes(types) {
        return []
    }

    getTypeProps(type) {
        return this.types.get(type)
    }

    getSortings() {
        return [];
    }

    getDefaultSortId() {
        return this.sortings.length === 0 ? null : this.sortings[0].id
    }

    getSortOptions() {
        return this.sortings
    }

    getMatchingGroups(matchGroups) {
        const result = [];
        for (let group of this.groups) {
            if (matchGroups.includes(group.id)) {
                result.push(group);
            }
        }
        return result;
    }

    extractName(model) {
        return model.name;
    }

    extractId(model, modelIndex) {
        return modelIndex
    }

    extractLevel(model) {
        return model.level
    }

    extractType(model) {
        return null
    }

    createViewNode(viewIndex, modelIndex, model) {
        const node = {
            id: this.extractId(model, modelIndex),
            viewIndex,
            modelIndex,
            name: this.extractName(model),
            type: this.extractType(model),
            level: this.extractLevel(model),
            hidden: 0,
            isLeaf: true,
            connected: {},
            model
        };
        node.isClosed = this.context.state.includes(node.id);
        this.id2modelIndex.set(node.id, modelIndex);
        return node
    }

    hasGroupDeselect() {
        return true
    }

    toggleGroup(groups, toggledGroup) {
        const index = groups.indexOf(toggledGroup);
        const newGroups = index === -1 ? [] : [ ...groups ];
        if (index > -1) {
            if (this.hasGroupDeselect()) {
                newGroups.splice(index, 1);
            }
            return newGroups
        }
        for (let group of this.groups) {
            if (group.id !== toggledGroup) {
                if (groups.includes(group.id) && !group.exclusive) newGroups.push(group.id);
                continue
            }
            if (group.exclusive) return [group.id];
            newGroups.push(group.id)
        }
        return newGroups
    }

    // view and model relevant methods

    getModelSubtreeIds(rootId) {
        let index = this.getModelIndexById(rootId);
        let node = this.model[index];
        const result = [];
        const rootLevel = this.extractLevel(node);
        while (true) {
            result.push(this.extractId(node, index))
            index++;
            if (index >= this.model.length) break;
            node = this.model[index];
            if (this.extractLevel(node) <= rootLevel) break;
        }
        return result;
    }

    getModelSubtreeLeafIds(rootId) {
        let index = this.getModelIndexById(rootId);
        let node = this.model[index];
        const ids = [];
        const levels = [];
        const rootLevel = this.extractLevel(node);
        let currLevel = rootLevel;
        while (true) {
            ids.push(this.extractId(node, index))
            levels.push(currLevel);
            index++;
            if (index >= this.model.length) break;
            node = this.model[index];
            currLevel = this.extractLevel(node);
            if (currLevel <= rootLevel) break;
        }
        const result = [];
        for (index = ids.length - 1; index > 0; index--) {
            if (levels[index - 1] + 1 === levels[index]) result.push(ids[index - 1])
        }
        return result;
    }

    openAllInView() {
        if (!this.view.indirect) return;

        const { setState, state } = this.context;
        const nodes = [];
        for (let node of this.view.nodes) {
            if (node.level === 0) nodes.push( ...this.getModelSubtreeIds(node.id) );
        }
        setState(without(state, nodes))
    }

    closeAllInView() {
        if (!this.view.indirect) return;

        const { setState, state } = this.context;
        const nodes = [];
        for (let node of this.view.nodes) {
            if (node.level === 0) nodes.push( ...this.getModelSubtreeLeafIds(node.id) );
        }
        setState(union(state, nodes))
    }

    toggleNodeByModelIndex(index, force = null) {
        this.toggleNodeById(this.extractId(this.model[index], index), force)
    }

    toggleNodeByViewIndex(index, force = null) {
        this.toggleNodeById(this.view.nodes[index].id, force)
    }

    toggleNodeById(id, force = null) {
        const { state, setState } = this.context;
        const newState = [ ...state ];
        const pos = state.indexOf(id);
        if (force === null ? pos === -1 : force) {
            if (pos === -1) newState.push(id)
        } else {
            if (pos !== -1) newState.splice(pos, 1)
        }
        setState(newState);
    }

    isClosedByModelIndex(index) {
        const { state } = this.context;
        return state.includes(this.extractId(this.model[index], index))
    }

    isClosedByViewIndex(index) {
        return this.getViewNodeByIndex(index).isClosed
    }

    isClosedById(id) {
        const { state } = this.context;
        return state.includes(id)
    }

    isVisibleById(id) {
        return (this.id2viewIndex.has(id) && this.id2viewIndex.get(id) !== null)
    }

    isVisibleByModelIndex(index) {
        return this.view.indices.includes(index)
    }

    // view-only methods

    isLeafByViewIndex(index) {
        return this.view.nodes[index].isLeaf
    }

    isLeafById(id) {
        return this.getViewNodeById(id).isLeaf;
    }

    getParentByModelIndex(index) {
        const parentLevel = this.extractLevel(this.model[index]) - 1;
        let curr = index - 1;
        while (curr >= 0 && this.extractLevel(this.model[curr]) > parentLevel) {
            curr--
        }
        return curr < 0 ? null : curr;
    }

    getViewAncestors(values) {
        const ancestors = {};
        if (!Array.isArray(values)) values = [values];
        let found = false;
        const indices = this.view.indices;
        for (let value of values) {
            if (indices.includes(value)) continue;
            let index = value;
            do {
                index = this.getParentByModelIndex(index);
            } while (index !== null && !indices.includes(index));
            found = true;
            ancestors[value] = index
        }
        return found ? ancestors : null;
    }

    getPathNodeNames(path) {
        const result = [];
        for(let index of path) {
            result.push(this.extractName(this.model[index]));
        }
        return result;
    }

    getModelNodeByIndex(index) {
        return this.model[index]
    }

    getModelNodeById(id) {
        return this.model[this.id2modelIndex.get(id)];
    }

    getModelIndexById(id) {
        return this.id2modelIndex.get(id);
    }

    getViewNodeById(id) {
        if (!this.id2viewIndex.has(id)) return;
        const index = this.id2viewIndex.get(id);
        if (index === null) return;
        return index === null ? null : this.view.nodes[index];
    }

    getViewNodeByIndex(index) {
        return this.view.nodes[index]
    }

    getViewIndices() {
        return this.view.indices
    }

    getViewIdsByType(type) {
        const ids = [];
        for (let node of this.view.nodes) {
            if (type === null || node.type === type) ids.push(node.id)
        }
        return ids
    }

    getMinViewIdsByType(type) {
        const ids = [];
        let lastPath = null;
        for (let node of this.view.nodes) {
            if (type !== null && node.type !== type) continue;
            const path = node.path.join('.') + '.';
            if (lastPath !== path && (lastPath === '.' || path.startsWith(lastPath))) continue;
            lastPath = path;
            ids.push(node.id)
        }
        return ids
    }

    reduceToBaseByType(type) {
        const { selector } = this.context;
        const newSelection = [];

        for (let id of selector.selection) {
            const index = this.id2modelIndex.get(id);
            if ((type === null || this.extractType(this.model[index]) !== type) && !this.hidden.has(index)) {
                newSelection.push(id);
            }
        }
        return newSelection
    }

    getAncestorIdsById(id) {
        const root = this.view.nodes[this.id2viewIndex.get(id)];
        let index = root.modelIndex;
        const ancestors = [];
        for (let pathIndex of root.path) {
            if (pathIndex === index) break;
            const node = this.model[pathIndex];
            ancestors.push(this.extractId(node, pathIndex));
        }
        const level = this.extractLevel(this.model[index]);
        index++;
        while (index < this.model.length) {
            const node = this.model[index];
            if (this.extractLevel(node) <= level) break;
            ancestors.push(this.extractId(node, index));
            index++
        }
        return ancestors
    }

    setClickMode(node) {
        node.clickMode = 1;
    }

    getViewNodes() {
        return this.view.nodes
    }

    get view() {
        if (this._view === null) this.buildView();
        return this._view;
    }

    getSorting(nodes, model2viewIndex, indirect) {
        const { sorting, asc } = this.context;
        if (sorting) {
            for (let sort of this.sortings) {
                if (sort.id !== sorting) continue;

                const dir = asc ? 1 : -1;
                if (!indirect) {
                    return (a, b) => dir * sort.sortAsc(a, b)
                }
                const getViewPath = node => {
                    const path = viewPath.get(node.id);
                    if (!path) {
                        const modelPath = [];
                        let i = node.offset;
                        while (i <= (node.path.length - 1)) {
                            modelPath.push(model2viewIndex.get(node.path[i]))
                            i++
                        }
                        modelPath.push(node.viewIndex);
                        viewPath.set(node.id, modelPath);
                    }
                    return viewPath.get(node.id)
                }
                const viewPath = new Map();
                return (a, b) => {
                    let i = 0;
                    const pathA = getViewPath(a);
                    const pathB = getViewPath(b);
                    let iMin = Math.min(pathA.length, pathB.length);
                    while (i < iMin) {
                        const indexA = pathA[i];
                        const indexB = pathB[i];
                        if (indexA === indexB) {
                            i++;
                            continue;
                        }
                        const aNode = nodes[indexA];
                        const bNode = nodes[indexB];
                        const comp = sort.sortAsc(aNode, bNode);
                        return dir * comp;
                    }
                    if (a.level === b.level) return 0;
                    return (a.level < b.level ? -1 : 1)
                }
            }
        }
        return null;
    }

    buildView() {
        if (!this.context) throw new Error('Cannot build tree view, because context was not set!');

        const { selector, groups, filter } = this.context;
        const locker = this.locker;
        const levels = [];
        const nodes = [];
        const indices= [];
        const id2viewIndex = this.id2viewIndex;
        const model2viewIndex = new Map();
        id2viewIndex.clear();
        this.id2modelIndex.clear();
        this.hidden.clear();

        const connect = connectLevel => {
            // no connection to predecessors for root nodes
            if (!connectLevel) return;

            // levels contains the levels of all predecessors
            // lets find the last predecessor who has the same level as our connect code
            let startIndex = -1;
            let i = levels.length - 1;
            while (i >= 0) {
                const currLevel = levels[i];
                if (currLevel === connectLevel) {
                    startIndex = i;
                } else if (currLevel < connectLevel) {
                    break;
                }
                i--
            }
            if (startIndex === -1) return;

            for (let i = startIndex; i < levels.length; i++) {
                nodes[i].connected[connectLevel] = true
            }
        }
        const directMatching = false;

        const types = [];
        const type2stats = {};
        let nullStats = null;
        for (let [id, type] of this.types.entries()) {
            if (!type.private) types.push(id);
            type2stats[id] = {id: type.id, name: type.name, total: 0, marked: 0, markedAll: 0, hidden: 0, hiddenAll: 0, matches: 0, matchesAll: 0};
            if (id === null) nullStats = type2stats[null];
        }
        const incStats = (type, key) => {
            const stats = type2stats[type];
            if (stats) stats[key]++;
            if (type && nullStats) {
                nullStats[key]++;
            }
        }
        let lastAdd = null;
        const activeGroups = this.getMatchingGroups(groups);
        const noGroups = activeGroups.length === 0;
        let modelIndex = -1;
        let viewIndex = 0;
        let lastClosed = null;
        let indirect = false;
        const currPath = [];
        for (let model of this.model) {
            modelIndex++;
            const node = this.createViewNode(viewIndex, modelIndex, model);
            id2viewIndex.set(node.id, null);

            const type = node.type;
            while (currPath.length > node.level) currPath.pop();

            let addIndirect = noGroups;
            let found = noGroups;
            const skipLocked = locker.isLocked('skip');
            for (let group of activeGroups) {
                if (!group.filter(node, modelIndex)) continue;
                found = true;
                if (!skipLocked && group.indirect) addIndirect = true
            }
            if (addIndirect) indirect = true;

            locker.update(node.level);
            let baseAdd = false;
            node.offset = node.level;
            if (locker.isLocked('skip')) {
                node.level = locker.getLockDist('skip');
                baseAdd = true;
            } else if (found) {
                node.level = 0;
                if (addIndirect) locker.lock('skip');
                baseAdd = true;
            }
            const isMarked = selector.isSelected(node.id);
            let isInView = false;
            if (!locker.isLocked('marked') && isMarked) {
                locker.lock('marked');
                incStats(type, 'marked');
            }
            if (baseAdd) {
                let isMatching = true;
                if (filter) {
                    isMatching = filter(node, modelIndex);
                    if (isMatching) incStats(type, 'matches');
                    if (!locker.isLocked('match')) {
                        if (isMatching) {
                            node.level = 0;
                            locker.lock('match')
                        }
                    } else {
                        node.level = locker.getLockDist('match');
                        if (!directMatching) isMatching = true;
                    }
                }
                node.path = [ ...currPath ];
                if (isMatching) {
                    if (lastAdd && node.level === lastAdd.level + 1) lastAdd.isLeaf = false;
                    if (!locker.isLocked('state')) {
                        nodes.push(node);
                        isInView = true;
                        model2viewIndex.set(modelIndex, viewIndex);
                        viewIndex++;
                        this.setClickMode(node);
                        if (node.isClosed) {
                            lastClosed = node;
                            locker.lock('state')
                        }
                    } else {
                        if (isMarked) lastClosed.hidden++;
                    }
                    lastAdd = node;
                }
                incStats(type, 'total')
            }
            if (locker.isLocked('marked')) incStats(type, 'markedAll');
            if (isMarked && !isInView) {
                incStats(type, 'hidden');
                incStats(type, 'hiddenAll');
                this.hidden.add(node.modelIndex);
                locker.lock('hidden');
            } else if (locker.isLocked('hidden') || locker.isLocked('marked')) {
                if (!isInView) {
                    incStats(type, 'hiddenAll');
                }
            }
            if (locker.isLocked('match')) incStats(type, 'matchesAll');
            node.offset -= node.level;

            currPath.push(node.modelIndex);
        }
        locker.clear();

        const sorting = this.getSorting(nodes, model2viewIndex, indirect);
        if (sorting) nodes.sort(sorting);
        let i = 0;
        for (let node of nodes) {
            node.viewIndex = i;
            id2viewIndex.set(node.id, i);
            connect(node.level);
            levels.push(node.level);
            indices.push(node.id);
            i++
        }
        for (let node of nodes) {
            node.end = !node.connected[node.level]
        }
        const stats = [];
        for (let type of types) {
            stats.push(type2stats[type]);
        }
        this._view = {
            nodes,
            indices,
            indirect,
            stats
        }
    }

    get modelSize() {
        return this.model.length
    }

    get viewSize() {
        return this.view.nodes.length
    }
}

export {
    AbstractTreeView,
    EntityIndex,
    CellSelection,
    CellProvider,
    CellValue,
    CellRawValue,
    Grid
}