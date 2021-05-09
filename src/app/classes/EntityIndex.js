const {d, getCanvasForDim, getCanvasForIndexMatrix, drawCanvasToAvail} = require('../helper/helper');
const {CellValue} = require('../classes/Grid');

class EntityIndex {

    constructor() {
        this.allIndices = null;
        this.suspendNotifications = false;
        this.valueIndexing = false;
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
            listener();
        }
    }

    hasIndex(index) {
        return (index >= 0 && index < this.getLength());
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

    getEntityObject(index) {
        const obj = {};
        const props = this.getEntityProps();
        for (let prop of props) {
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
                this.deleteEntityPropValues(i);
            }
            i++;
        }
        const updates = [];
        if (this.valueIndexing) {
            let index = 0;
            for (let oldIndex of newItems) {
                if (oldIndex !== index) {
                    updates.push([index, {...this.getEntityObject(oldIndex), value: index}]);
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

class SimpleIndex extends EntityIndex {
    constructor(model, key = 'items') {
        super();
        this.model = model;
        this.key = key;
        this.items = model[this.key];
    }
}

class ColorIndex extends EntityIndex {

    constructor(model, key = 'colors') {
        super();
        this.model = model;
        this.key = key;
        this.sizeX = 10;
        this.sizeY = 10;
        this.items = this.model[key];
    }

    setItems(items) {
        this.model[this.key] = items;
        this.items = items;
        this.notify();
    }

    drawEntity(targetCtx, pos, x, y, zoomOrAvail = 1) {
        const value = this.getEntityValue(pos);
        if (value === undefined) {
            return;
        }
        let width = this.sizeX;
        let height = this.sizeY;
        if (typeof zoomOrAvail !== 'object') {
            width *= zoomOrAvail;
            height *= zoomOrAvail;
        } else {
            width = zoomOrAvail.width;
            height = zoomOrAvail.height;
        }
        targetCtx.fillStyle = value;
        targetCtx.fillRect(x, y, width, height);
    }
}

class AssignIndex extends EntityIndex {

    constructor(sizeX, sizeY) {
        super();

        this.length = 0;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.img = null;
        this.items = [];
        this.oldChars = {};
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            ctx.putImageData(value, pos.x, pos.y);
            this.notify();
        } else if (prop === 'oldChar') {
            this.oldChars[index] = value;
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            return ctx.getImageData(pos.x, pos.y, this.sizeX, this.sizeY);
        } else if (prop === 'oldChar') {
            return this.oldChars[index];
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'image', 'oldChar'];
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices = []) {
        this.img = getCanvasForDim(this.sizeX * this.getLength(), this.sizeY);
        // we assume that the image is only created once and we update all images afterwards
        return ['image'];
    }

    getIndexPos(index) {
        if (!this.hasIndex(index)) {
            return null;
        }
        return {x: index * this.sizeX, y: 0};
    }

    drawEntity(targetCtx, index, x, y, zoom = 1) {
        const sizeX = this.getSizeX();
        const sizeY = this.getSizeY();
        targetCtx.clearRect(x, y, sizeX * zoom, sizeY * zoom);
        if (index >= this.items.length || this.img.width === 0) {
            return;
        }
        const pos = this.getIndexPos(index);
        targetCtx.drawImage(
            this.img,
            pos.x,
            pos.y,
            sizeX,
            sizeY,
            x,
            y,
            sizeX * zoom,
            sizeY * zoom
        );
    }
}

class FilterIndex extends EntityIndex {
    constructor(model) {
        super();
        this.model = model;
        this.items = [];
        this.chars = {};
    }
}

class FontIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.items = [];
        this.chars = {};
        for (let font of model.fonts) {
            this.items.push(font.id);
            this.chars[font.id] = new CharIndex(font);
        }
    }

    setEntityValue(index, value) {
        if (this.model.fonts.length <= index) {
            this.model.fonts.push({id: value});
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (['width', 'height'].includes(prop)) {
            const obj = this.model.fonts[index];
            if (obj) {
                obj[prop] = value;
            }
        } else if (prop === 'chars') {
            this.chars[this.getEntityValue(index)] = value;
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'width') {
            return this.model.fonts[index].width
        } else if (prop === 'height') {
            return this.model.fonts[index].height
        } else if (prop === 'chars') {
            return this.chars[this.getEntityValue(index)]
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'chars', 'width', 'height'];
    }

    deleteEntityPropValues(index) {
        const oldValue = this.getEntityValue(index);
        delete this.chars[this.getEntityValue(index)];
        const len = this.getLength();
        let replaceValue = null;
        if (len > 1) {
            replaceValue = this.getEntityValue(
                index === len - 1 ? index - 1 : index + 1
            )
        }
        for (let block of this.model.blocks) {
            if (block.font === oldValue) {
                block.font = replaceValue
            }
        }
    }
}

class TextBlockIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.items = [];
        for (let block of model.blocks) {
            this.items.push(block.id);
        }
    }

    setEntityValue(index, value) {
        if (this.model.blocks.length <= index) {
            this.model.blocks.push({id: value});
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (['filters', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'filters', 'font', 'height', 'lineSpacing', 'text', 'textAlign', 'width', 'x', 'y'].includes(prop)) {
            const obj = this.model.blocks[index];
            if (obj) {
                obj[prop] = value;
            }
        }
    }

    getEntityPropValue(index, prop) {
        if (['filters', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'filters', 'font', 'height', 'lineSpacing', 'text', 'textAlign', 'width', 'x', 'y'].includes(prop)) {
            return this.model.blocks[index][prop]
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return [ ...super.getEntityProps(), 'filters', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'filters', 'font', 'height', 'lineSpacing', 'text', 'textAlign', 'width', 'x', 'y' ];
    }

    deleteEntityPropValues(index) {
        this.model.blocks.splice(index, 1);
    }
}

class CharIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.img = model.image;
        this.items = Object.keys(this.model.map).sort();
        this.indexSorting = (a, b) => a === b ? 0 : (a < b ? -1 : 1);
    }

    getSizeX() {
        return this.model.width;
    }

    getSizeY() {
        return this.model.height;
    }

    getIndexPos(index) {
        if (!this.hasIndex(index)) {
            return null;
        }
        const char = this.items[index];
        return this.model.map[char];
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            ctx.putImageData(value, pos.x, pos.y);
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            return ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY());
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'image'];
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices = []) {
        const length = this.getLength();
        const sizeX = this.getSizeX();
        const newWidth = length * sizeX;
        const canvas = getCanvasForDim(newWidth, this.getSizeY());
        const ctx = canvas.getContext('2d');
        let index = 0;
        let x = 0;
        while(index < length) {
            if (!updateIndices.includes(index)) {
                this.drawEntity(ctx, index, x, 0);
            }
            this.model.map[this.items[index]] = {x, y: 0};
            x += sizeX;
            index++;
        }
        this.model.image = canvas;
        this.img = canvas;
        return ['image'];
    }

    resize(sizeX, sizeY, offsetX = 0, offsetY = 0) {
        const length = this.getLength();
        const newWidth = length * sizeX;
        const canvas = getCanvasForDim(newWidth, sizeY);
        const ctx = canvas.getContext('2d');

        const targetWidth = Math.min(sizeX, this.getSizeX());
        const targetHeight = Math.min(sizeY, this.getSizeY());
        const sourceOffsetX = sizeX < this.getSizeX() ? offsetX : 0;
        const sourceOffsetY = sizeY < this.getSizeY() ? offsetY : 0;
        const targetOffsetX = (sizeX > this.getSizeX() ? offsetX : 0) - sourceOffsetX;
        const targetOffsetY = (sizeY > this.getSizeY() ? offsetY : 0) - sourceOffsetY;

        let i = 0;
        let x = 0;
        for (let char of this.items) {
            ctx.putImageData(
                this.getEntityPropValue(i, 'image'),
                x + targetOffsetX,
                targetOffsetY,
                sourceOffsetX,
                sourceOffsetY,
                targetWidth,
                targetHeight
            );
            this.model.map[char] = {x, y: 0};
            x += sizeX;
            i++;
        }
        this.model.width = sizeX;
        this.model.height = sizeY;
        this.model.image = canvas;
        this.img = canvas;
        this.notify();
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1) {
        const pos = this.getIndexPos(index);
        if (typeof zoomOrAvail === 'object') {
            targetCtx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img, targetCtx, x, y, zoomOrAvail, this.getIndexDim(), pos);
            }
        } else {
            const sizeX = this.getSizeX();
            const sizeY = this.getSizeY();
            targetCtx.clearRect(x, y, sizeX * zoomOrAvail, sizeY * zoomOrAvail);
            if (pos !== null) {
                targetCtx.drawImage(
                    this.img,
                    pos.x,
                    pos.y,
                    sizeX,
                    sizeY,
                    x,
                    y,
                    sizeX * zoomOrAvail,
                    sizeY * zoomOrAvail
                );
            }
        }
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (matchValue.indexOf(this.items[index].toLowerCase()) !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

function getMapChanges(map, old2new) {
    const mapChanges = [];

    for (let y = 0; y < map.length; y++) {
        const row = map[y];
        for (let x = 0; x < row.length; x++) {
            const index = CellValue.tile.get(row[x]);
            const newIndex = old2new[index];
            if (newIndex !== undefined) {
                mapChanges.push([x, y, index, newIndex === null ? 0 : newIndex]);
            }
        }
    }
    return mapChanges;
}

function getMapEventChanges(map, old2new, raw = false) {
    const eventChanges = [];
    for (let y = 0; y < map.length; y++) {
        const row = map[y];
        for (let x = 0; x < row.length; x++) {
            const events = raw ? row[x] : CellValue.events.get(row[x]);
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const newEvent = old2new[event];
                if (newEvent !== undefined) {
                    eventChanges.push([x, y, i, event, newEvent]);
                }
            }
        }
    }
    return eventChanges;
}

function doEventChange(map, item, no, raw = false) {
    const curr = map[item[1]][item[0]];
    const events = raw ? curr : CellValue.events.get(curr);
    const index = item[2];
    const target = item[no];
    if (target === null) {
        events.splice(index, 1);
    } else {
        events.splice(index, 1, target);
    }
    map[item[1]][item[0]] = raw ? events : CellValue.events.set(curr, events);
}

function doPlanOnModel(model, plan, selection) {
    if (plan.mapChanges) {
        for (let item of plan.mapChanges) {
            model.map[item[1]][item[0]] = item[3];
        }
    }

    if (plan.eventChanges) {
        for (let item of plan.eventChanges) {
            doEventChange(model.map, item, 4);
        }
    }

    if (plan.brushChanges) {
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }
    }

    // selection changes
    if (plan.selectionChanges !== undefined) {
        let selectionChanges = null;
        if (selection !== null && selection.getType() !== 'entity') {
            const cells = selection.getCells();
            const cellValue = selection.getCellValue();
            if (!plan.event && cellValue === CellValue.tile) {
                selectionChanges = {
                    ref: selection,
                    changes: getMapChanges(cells, plan.old2new)
                };
                for (let item of selectionChanges.changes) {
                    selection.cells[item[1]][item[0]] = item[3];
                }
            } else if (cellValue === CellValue.events) {
                selectionChanges = {
                    ref: selection,
                    changes: getMapEventChanges(selection.cells, plan.old2new, true)
                };
                for (let item of selectionChanges.changes) {
                    doEventChange(selection.cells, item, 4, true);
                }
            }
        }
        plan.selectionChanges = selectionChanges;
    }

    if (plan.propChanges) {
        const prop = plan.prop ? plan.prop : 'index';
        for (let item of plan.propChanges) {
            model.tiles[item[0]][prop] = item[2]
        }
    }

    if (plan.frameIdChanges) {
        for (let item of plan.frameIdChanges) {
            model.animations[item[0]].frames[item[1]].id = item[3];
        }
    }

    if (plan.propRemovals) {
        for (let item of plan.propRemovals) {
            delete model.tiles[item[0]][item[1]]
        }
    }
}

function undoPlanOnModel(model, plan, selection) {
    if (plan.mapChanges) {
        for (let item of plan.mapChanges) {
            model.map[item[1]][item[0]] = item[2];
        }
    }

    if (plan.eventChanges) {
        for (let item of plan.eventChanges) {
            doEventChange(model.map, item, 3);
        }
    }

    if (plan.brushChanges) {
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }
    }

    if (plan.selectionChanges) {
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            if (!plan.event) {
                for (let item of plan.selectionChanges.changes) {
                    selection.cells[item[1]][item[0]] = item[2];
                }
            } else {
                for (let item of plan.selectionChanges.changes) {
                    doEventChange(selection.cells, item, 3, true);
                }
            }
        }
    }
    /*
    if (plan.changes) {
        for (let item of plan.changes) {
            const target = item[1];
            if (target !== null) {
                if (model.tiles[target] !== undefined) {
                    model.tiles[item[0]] = model.tiles[target];
                } else {
                    delete model.tiles[item[0]];
                }
            } else {
                this.items.push(this.items.length);
                this.model.tiles[item[0]] = {};
            }
        }
    }
    /*
    this.model.count = plan.count;
    this.model.tilesImg.elem = canvas;
    this.img = canvas;
    this.tilesX = dim.tilesX;
    this.tilesY = dim.tilesY;
    */

    // restore entity-backups
    if (plan.backupTiles) {
        for (let [index, obj] of Object.entries(plan.backupTiles)) {
            this.setEntityObject(obj, true);
        }
    }

    // 4. propChanges
    if (plan.propChanges) {
        const prop = plan.prop ? plan.prop : 'index';
        for (let item of plan.propChanges) {
            model.tiles[item[0]][prop] = item[1]
        }
    }
    if (plan.frameBackup) {
        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const currAnimation = model.animations[animation];
            for (let item of frames) {
                currAnimation.frames.splice(item[0], 0, item[1]);
            }
        }
    }
    if (plan.frameIdChanges) {
        for (let item of plan.frameIdChanges) {
            model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    if (plan.propRemovals) {
        for (let item of plan.propRemovals) {
            model.tiles[item[0]][item[1]] = item[2];
        }
    }
}

function getPropChanges(prop, model, old2new) {
    const changes = [];
    for (let [key, obj] of Object.entries(model.tiles)) {
        const old = obj[prop];
        if (old !== undefined) {
            const target = old2new[old];
            if (target !== undefined) {
                changes.push([key, old, target]);
            }
        }
    }
    return changes;
}

class TileIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.sizeX = model.tileSize;
        this.sizeY = model.tileSize;
        this.img = model.tilesImg.elem;

        this.tilesX = Math.floor(this.img.width/this.sizeX);
        if (model.count !== null) {
            this.tilesX = Math.min(this.tilesX, model.count);
        }
        this.tilesY = Math.floor(this.img.height/this.sizeY);
        if (model.count !== null) {
            this.tilesY = Math.min(this.tilesY, Math.ceil(model.count/this.tilesX));
        }

        // we could analyse how many empty tiles are at the end
        this.count = model.count !== null ? model.count : this.tilesX * this.tilesY;
        this.items = this.getAllIndices();
        this.valueIndexing = true;
    }

    notify() {
        this.model.count = this.getLength();
        this.count = this.model.count;
        return super.notify();
    }

    getInsertPlan(insertIndex, objects, preserve) {
        const count = objects.length;
        let value = insertIndex === undefined ? this.items.length : insertIndex;
        for (let object of objects) {
            object.index = value;
            object.value = value;
            value++;
        }

        const changes = [];
        const old2new = {};
        let mapChanges = [];
        const brushChanges = {};
        const propChanges = [];
        const frameIdChanges = [];

        if (insertIndex < this.items.length) {
            let index = this.items.length - 1;
            while (index >= insertIndex) {
                changes.push([index, index + count]);
                old2new[index] = index + count;
                index--;
            }

            if (preserve) {
                mapChanges = getMapChanges(this.model.map, old2new);

                for (let [key, brush] of Object.entries(this.model.brushes)) {
                    const changes = getMapChanges(brush, old2new);
                    if (changes.length > 0) {
                        brushChanges[key] = changes;
                    }
                }

                for (let [key, obj] of Object.entries(this.model.tiles)) {
                    if (obj.index !== undefined) {
                        const target = old2new[obj.index];
                        if (target !== undefined) {
                            propChanges.push([key, obj.index, target === null ? 0 : target]);
                        }
                    }
                }

                for (let [animation, obj] of Object.entries(this.model.animations)) {
                    for (let i = 0; i < obj.frames.length; i++) {
                        const frame = obj.frames[i];
                        const target = old2new[frame.id];
                        frameIdChanges.push(
                            [animation, i, frame.id, target]
                        );
                    }
                }
            }
        }

        return {
            changes,
            old2new,
            mapChanges,
            brushChanges,
            propChanges,
            frameIdChanges,
            count,
            objects,
            selectionChanges: null
        }
    }

    doInsertPlan(plan, selection) {
        const length = this.items.length + plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const new2old = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            new2old[target] = old;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const old = new2old[i];
            if (old !== undefined) {
                this.drawEntity(ctx, old, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[3];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }

        let selectionChanges = null;
        if (selection !== null && selection.getCellValue() === CellValue.tile &&
            selection.getType() !== 'entity') {
            const cells = selection.getCells();
            selectionChanges = {
                ref: selection,
                changes: getMapChanges(cells, plan.old2new)
            };
            for (let item of selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[3];
            }
        }
        plan.selectionChanges = selectionChanges;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[2]
        }

        // 5. animationChanges
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[3];
        }

        i = plan.changes.length - 1;
        while (i > 0) {
            const item = plan.changes[i];
            const target = item[1];
            if (target !== null) {
                const old = this.model.tiles[item[0]];
                if (old === undefined) {
                    delete this.model.tiles[target];
                } else {
                    this.model.tiles[target] = old;
                }
            }
            i--;
        }

        // entity-changes:
        while (this.items.length < length) {
            this.items.push(this.items.length);
        }

        this.model.count = plan.count;
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        this.setEntityObjects(plan.objects, true);
    }

    undoInsertPlan(plan, selection) {
        const length = this.items.length - plan.count;

        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const old2new = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            old2new[old] = target;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const target = old2new[i];
            if (target !== undefined) {
                this.drawEntity(ctx, target, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[2];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }

        // selection changes
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            for (let item of plan.selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[2];
            }
        }

        for (let item of plan.changes) {
            const target = item[1];
            if (this.model.tiles[target] !== undefined) {
                this.model.tiles[item[0]] = this.model.tiles[target];
            } else {
                delete this.model.tiles[item[0]];
            }
        }

        while(this.items.length > length) {
            const index = this.items.pop();
            delete this.model.tiles[index];
        }

        this.model.count = length;
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[1]
        }

        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    getDeletePlan(indices, safe, selection = null) {
        const avail = [];
        indices.sort();
        const backupTiles = {};
        for (let index of indices) {
            if (this.hasIndex(index)) {
                avail.push(index);
                backupTiles[index] = this.getEntityObject(index);
            }
        }
        let left = avail.length;
        let index = this.items.length - 1;
        let count = 0;
        const changes = [];

        // [old, new|null]
        while(left > 0 && index >= 0) {
            if (!avail.includes(index)) {
                changes.push([index, index - left]);
            } else {
                count++;
                changes.push([index, null]);
                left--;
            }
            index--;
        }

        const old2new = {};
        if (safe) {
            for (let change of changes) {
                old2new[change[0]] = change[1];
            }
        } else {
            index = this.items.length - count;
            while (index < this.items.length) {
                old2new[index] = null;
                index++;
            }
        }

        const mapChanges = getMapChanges(this.model.map, old2new);

        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }

        const propChanges = [];
        for (let [key, obj] of Object.entries(this.model.tiles)) {
            if (obj.index !== undefined) {
                const target = old2new[obj.index];
                if (target !== undefined) {
                    propChanges.push([key, obj.index, target === null ? 0 : target]);
                }
            }
        }

        const frameBackup = {};
        const frameIdChanges = [];
        for (let [animation, obj] of Object.entries(this.model.animations)) {
            for (let i = 0; i < obj.frames.length; i++) {
                const frame = obj.frames[i];
                const target = old2new[frame.id];
                if (target === undefined) continue;

                if (target === null) {
                    if (frameBackup[animation] === undefined) {
                        frameBackup[animation] = [];
                    }
                    frameBackup[animation].push([
                        i, frame
                    ]);
                } else {
                    frameIdChanges.push(
                        [animation, i, frame.id, target]
                    );
                }
            }
        }

        return {
            safe,
            count,
            changes,
            old2new,
            backupTiles,
            mapChanges,
            brushChanges,
            propChanges,
            frameBackup,
            frameIdChanges,
            selectionChanges: null
        };
    }

    doDeletePlan(plan, selection) {
        const length = this.items.length - plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const new2old = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            if (target !== null) {
                new2old[target] = old;
            }
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const old = new2old[i];
            if (old !== undefined) {
                this.drawEntity(ctx, old, x, y);
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[3];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[3];
            }
        }

        // selection changes

        let selectionChanges = null;
        if (selection !== null && selection.getCellValue() === CellValue.tile &&
            selection.getType() !== 'entity') {
            const cells = selection.getCells();
            selectionChanges = {
                ref: selection,
                changes: getMapChanges(cells, plan.old2new)
            };
            for (let item of selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[3];
            }
        }
        plan.selectionChanges = selectionChanges;

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[2]
        }

        // 5. animationChanges
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[3];
        }

        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const ids = [];
            for (let item of frames) {
                ids.push(item[0]);
            }
            const currAnimation = this.model.animations[animation];
            const newFrames = [];
            let i = 0;

            while (i < currAnimation.frames.length) {
                if (!ids.includes(i)) {
                    newFrames.push(currAnimation.frames[i]);
                }
                i++;
            }
            currAnimation.frames = newFrames;
        }

        // 5. tileChanges
        i = plan.changes.length - 1;
        while (i > 0) {
            const item = plan.changes[i];
            const target = item[1];
            if (target !== null) {
                const old = this.model.tiles[item[0]];
                if (old === undefined) {
                    delete this.model.tiles[target];
                } else {
                    this.model.tiles[target] = old;
                }
            }
            i--;
        }

        // entity-changes:
        while (this.items.length > length) {
            const index = this.items.pop();
            delete this.model.tiles[index];
        }

        this.model.count = plan.count;
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;
    }

    undoDeletePlan(plan, selection) {
        const length = this.items.length + plan.count;

        // 1. image
        const dim = this.getDimForLength(length);
        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        const old2new = {};
        for (let item of plan.changes) {
            const [old, target] = item;
            old2new[old] = target;
        }

        let x = 0;
        let y = 0;
        let i = 0;
        while (i < length) {
            const target = old2new[i];
            if (target !== undefined) {
                if (target !== null) {
                    this.drawEntity(ctx, target, x, y);
                }
            } else {
                this.drawEntity(ctx, i, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                x = 0;
                y += dim.sizeY;
            }
            i++;
        }

        // 2. map
        for (let item of plan.mapChanges) {
            this.model.map[item[1]][item[0]] = item[2];
        }

        // 3. brushes
        for (let [brush, changes] of Object.entries(plan.brushChanges)) {
            for (let item of changes) {
                this.model.brushes[brush][item[1]][item[0]] = item[2];
            }
        }

        // selection changes
        if (plan.selectionChanges && selection === plan.selectionChanges.ref) {
            for (let item of plan.selectionChanges.changes) {
                selection.cells[item[1]][item[0]] = item[2];
            }
        }

        for (let item of plan.changes) {
            const target = item[1];
            if (target !== null) {
                if (this.model.tiles[target] !== undefined) {
                    this.model.tiles[item[0]] = this.model.tiles[target];
                } else {
                    delete this.model.tiles[item[0]];
                }
            } else {
                this.items.push(this.items.length);
                this.model.tiles[item[0]] = {};
            }
        }
        this.model.count = plan.count;
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        // restore entity-backups
        for (let [index, obj] of Object.entries(plan.backupTiles)) {
            this.setEntityObject(obj, true);
        }

        // 4. propChanges
        for (let item of plan.propChanges) {
            this.model.tiles[item[0]].index = item[1]
        }

        for (let [animation, frames] of Object.entries(plan.frameBackup)) {
            const currAnimation = this.model.animations[animation];
            for (let item of frames) {
                currAnimation.frames.splice(item[0], 0, item[1]);
            }
        }
        for (let item of plan.frameIdChanges) {
            this.model.animations[item[0]].frames[item[1]].id = item[2];
        }
    }

    getLength() {
        if (this.items === undefined) {
            return this.count;
        }
        return this.items.length;
    }

    getIndexPos(index) {
        if (!this.hasIndex(index)) {
            return null;
        }
        const y = Math.floor(index/this.tilesX);
        return {x: (index - y * this.tilesX) * this.sizeX, y: y * this.sizeY};
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            ctx.putImageData(value, pos.x, pos.y);
            this.notify();
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[index];
            if (value === '') {
                if (tile && tile.animation) {
                    delete tile.animation;
                }
                if (JSON.stringify(tile) === '{}') {
                    delete this.model.tiles[index];
                }
            } else {
                if (!tile) {
                    this.model.tiles[index] = {animation: value};
                } else {
                    tile.animation = value;
                }
            }
            this.notify();
        }
        if (prop === 'props') {
            const tile = this.model.tiles[index];
            if (tile && JSON.stringify(value) === '{}') {
                delete this.model.tiles[index];
            } else {
                this.model.tiles[index] = value;
            }
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'image') {
            const ctx = this.img.getContext('2d');
            const pos = this.getIndexPos(index);
            return ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY());
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[index];
            if (!tile || !tile.animation) {
                return '';
            }
            return tile.animation;
        }
        if (prop === 'props') {
            const tile = this.model.tiles[index];
            if (!tile) {
                return {};
            }
            const {animation, ...result} = tile;
            return result;
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'props', 'animation', 'image'];
    }

    getAutoProps() {
        return ['image'];
    }

    getDimForLength(length) {
        const sizeX = this.getSizeX();
        const sizeY = this.getSizeY();

        const maxTiles = Math.floor(1000 / sizeX);
        const tilesX = Math.min(length, maxTiles);
        const width = tilesX * sizeX;
        const tilesY = Math.ceil(length / maxTiles);
        const height = tilesY * sizeY;
        return {
            width,
            height,
            tilesX,
            tilesY,
            sizeX,
            sizeY
        }
    }

    assignAutoProps(updateIndices = []) {
        const length = this.getLength();
        const dim = this.getDimForLength(length);

        const canvas = getCanvasForDim(dim.width, dim.height);
        const ctx = canvas.getContext('2d');

        let index = 0;
        let x = 0;
        let y = 0;
        while(index < length) {
            if (!updateIndices.includes(index)) {
                this.drawEntity(ctx, index, x, y);
            }
            x += dim.sizeX;
            if (x >= dim.width) {
                y += dim.sizeY;
                x = 0;
            }
            index++;
        }
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = dim.tilesX;
        this.tilesY = dim.tilesY;

        return ['image'];
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1, players = null) {
        if (index >= this.length) {
            return;
        }
        if (players) {
            const animation = this.getEntityPropValue(index, 'animation');
            if (animation) {
                const frame = players.getCurrFrame(animation);
                if (frame) {
                    index = frame.id;
                }
            }
        }
        const pos = this.getIndexPos(index);
        if (typeof zoomOrAvail === 'object') {
            targetCtx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img, targetCtx, x, y, zoomOrAvail, this.getIndexDim(), pos);
            }
        } else {
            const targetWidth = this.sizeX * zoomOrAvail;
            const targetHeight = this.sizeY * zoomOrAvail;
            targetCtx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                targetCtx.drawImage(
                    this.img,
                    pos.x,
                    pos.y,
                    this.sizeX,
                    this.sizeY,
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
            }
        }
    }

    getMatchingEntities(indices, match) {
        if (match === null) {
            return indices;
        }
        const result = [];
        match = ' ' + match.toLowerCase() + ' ';
        for (let index of indices) {
            if (match.indexOf(' ' + index + ' ') !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

class AliasIndex extends EntityIndex {

    constructor(model, tileIndex, animationIndex) {
        super();
        this.tileIndex = tileIndex;
        this.tileIndex.addListener(() => this.notify());
        this.animationIndex = animationIndex;
        this.model = model;
        const names = [];
        for (let [name, tile] of Object.entries(model.tiles)) {
            if (typeof name === 'string' && name.match(/[^0-9]/)) {
                if (tile.index === undefined || !Number.isInteger(tile.index)) {
                    tile.index = 0;
                }
                names.push(name);
            }
        }
        this.items = names.sort();
        this.indexSorting = (a, b) => (a === b ? 0 : (a < b ? -1 : 1));
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'tile') {
            const name = this.getEntityValue(index);
            this.model.tiles[name].index = value;
            this.notify();
        }
        if (prop === 'value') {
            if (!this.model.tiles[value]) {
                this.model.tiles[value] = {};
            }
        }
        if (prop === 'animation') {
            const name =  this.getEntityValue(index);
            const tile = this.model.tiles[name];
            if (value === '') {
                if (tile && tile.animation) {
                    delete tile.animation;
                }
            } else {
                tile.animation = value;
            }
            this.notify();
        }
        if (prop === 'props') {
            const name = this.getEntityValue(index);
            this.model.tiles[name] = value;
            this.notify();
        }
    }

    deleteEntityPropValues(index) {
        const name = this.getEntityValue(index);
        if (name) {
            delete this.model.tiles[name];
        }
    }

    getEntityPropValue(aIndex, prop) {
        if (prop === 'tile') {
            const name = this.getEntityValue(aIndex);
            return this.model.tiles[name].index;
        }
        if (prop === 'animation') {
            const tile = this.model.tiles[this.getEntityValue(aIndex)];
            if (!tile || !tile.animation) {
                return '';
            }
            return tile.animation;
        }
        if (prop === 'props') {
            const tile = this.model.tiles[this.getEntityValue(aIndex)];
            if (!tile) {
                return {};
            }
            const {index, animation, ...result} = tile;
            return result;
        }
        return super.getEntityPropValue(aIndex, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.tiles[newValue] = this.model.tiles[oldValue];
        delete this.model.tiles[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'props', 'animation', 'tile'];
    }

    getSizeX() {
        return this.tileIndex.getSizeX();
    }

    getSizeY() {
        return this.tileIndex.getSizeY();
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1, player = null) {
        let tile = this.getEntityPropValue(index, 'tile');
        if (tile === null) {
            return;
        }
        if (player !== null) {
            const animation = this.getEntityPropValue(index, 'animation');
            if (animation !== '') {
                const frame = player.getCurrFrame(animation);
                if (!frame) {
                    return;
                }
                tile = frame.id;
            }
        }
        this.tileIndex.drawEntity(targetCtx, tile, x, y, zoomOrAvail);
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    getRenamePlan(oldName, newName) {
        const old2new = {[oldName]: newName};
        const mapChanges = getMapChanges(this.model.map, old2new);
        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }
        return {
            mapChanges,
            brushChanges,
            old2new,
            selectionChanges: null
        };
    }

    doRenamePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
    }

    undoRenamePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
    }

    getDeletePlan(indices) {
        const names = [];
        const old2new = {};
        const backupEntities = [];
        for (let index of indices) {
            const name = this.getEntityValue(index);
            if (name === null) continue;

            const obj = this.getEntityObject(index);
            obj.index = null;
            backupEntities.push(obj);
            names.push(name);
            old2new[name] = null;
        }
        const mapChanges = getMapChanges(this.model.map, old2new);

        const brushChanges = {};
        for (let [key, brush] of Object.entries(this.model.brushes)) {
            const changes = getMapChanges(brush, old2new);
            if (changes.length > 0) {
                brushChanges[key] = changes;
            }
        }

        return {
            backupEntities,
            indices,
            old2new,
            mapChanges,
            brushChanges,
            selectionChanges: null
        }
    }

    doDeletePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
        this.deleteEntities(plan.indices);
    }

    undoDeletePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
        this.setEntityObjects(plan.backupEntities, false);
    }
}

class BrushIndex extends EntityIndex {

    constructor(model, tileIndex, aliasIndex) {
        super();
        this.model = model;
        this.tileIndex = tileIndex;
        this.aliasIndex = aliasIndex;
        this.items = Object.keys(this.model.brushes).sort();
        this.indexSorting = (a, b) => (a === b ? 0 : (a < b ? -1 : 1));
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'tiles') {
            const name = this.getEntityValue(index);
            this.model.brushes[name] = value;
            this.notify();
        }
    }

    deleteEntityPropValues(index) {
        const name = this.getEntityValue(index);
        if (name) {
            delete this.model.brushes[name];
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'tiles') {
            const name = this.getEntityValue(index);
            return this.model.brushes[name];
        }
        return super.getEntityPropValue(index, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.brushes[newValue] = this.model.brushes[oldValue];
        delete this.model.brushes[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'tiles'];
    }

    getSizeX() {
        return this.tileIndex.getSizeX();
    }

    getSizeY() {
        return this.tileIndex.getSizeY();
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {
        const tiles = this.getEntityPropValue(index, 'tiles');
        const canvas = getCanvasForIndexMatrix(this.tileIndex, this.aliasIndex, tiles, 10);
        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (canvas === null) {
                return;
            }
            drawCanvasToAvail(canvas, ctx, x, y, zoomOrAvail);
        } else {
            const sizeX = canvas.width;
            const sizeY = canvas.height;
            const targetWidth = sizeX * zoomOrAvail;
            const targetHeight = sizeY * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (canvas === null) {
                return;
            }
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, targetWidth, targetHeight);
        }
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

class SpriteIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.img = model.sheet.elem;
        const items = [];
        for (let [name, obj] of Object.entries(model.sprites)) {
            if (!obj.img) {
                items.push(name);
            }
        }
        this.items = items.sort();
        this.setSizes();
        this.indexSorting = (a, b) => a == b ? 0 : (a < b ? -1 : 1);
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices = []) {
        let maxWidth = 500;
        const sprites = [];
        let iMax = this.getLength();
        let i = 0;
        while(i < iMax) {
            const value = this.items[i];
            const dim = this.model.sprites[value].dim;
            maxWidth = Math.max(maxWidth, dim.x);
            sprites.push([value, dim.x, dim.y, i]);
            i++;
        }
        sprites.sort((a, b) => a[2] === b[2] ? (a[1] === b[1] ? 0 : (a[1] > b[1] ? -1 : 1)) : (a[2] > b[2] ? -1 : 1));

        // now them to free space blocks
        let spaceBlocks = [[0, 0, maxWidth, null]];
        let canvasWidth  = 0;
        let canvasHeight = 0;
        let offsets = {};

        for (let sprite of sprites) {
            const [name, width, height, index] = sprite;
            // find free block matching width and height
            let found = false;
            const newBlocks = [];
            for (let block of spaceBlocks) {
                if (!found) {
                    const [x, y, blockWidth, blockHeight] = block;
                    if (blockHeight !== null && (blockWidth < width || blockHeight < height)) {
                        newBlocks.push(block);
                        continue;
                    }
                    offsets[name] = {x, y, index};
                    if (blockHeight === null) {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        newBlocks.push([0, y + height, maxWidth, null]);
                    } else {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        if (blockHeight > height) {
                            newBlocks.push([x, y + height, blockWidth, blockHeight - height]);
                        }
                    }
                    found = true;
                    canvasWidth = Math.max(x + width, canvasWidth);
                    canvasHeight = Math.max(y + height, canvasHeight);
                } else {
                    newBlocks.push(block);
                }
            }
            spaceBlocks = newBlocks;
        }
        const canvas = getCanvasForDim(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        for (let [name, offset] of Object.entries(offsets)) {
            if (!updateIndices.includes(offset.index)) {
                this.drawEntity(ctx, offset.index, offset.x, offset.y);
            }
            this.model.sprites[name].off = {x: offset.x, y: offset.y};
        }
        this.model.sheet.elem = canvas;
        this.img = canvas;

        return ['image'];
    }

    setSizes() {
        let maxX = 0;
        let maxY = 0;
        for (let item of this.items) {
            maxX = Math.max(maxX, this.model.sprites[item].dim.x);
            maxY = Math.max(maxY, this.model.sprites[item].dim.y);
        }
        this.sizeX = maxX;
        this.sizeY = maxY;
    }

    getEntityProps() {
        return [...super.getEntityProps(), 'width', 'height',  'image'];
    }

    getEntityPropValue(index, prop) {
        if (prop === 'width') {
            return this.model.sprites[this.getEntityValue(index)].dim.x;
        }
        if (prop === 'height') {
            return this.model.sprites[this.getEntityValue(index)].dim.y;
        }
        if (prop === 'image') {
            const sprite = this.model.sprites[this.getEntityValue(index)];
            const ctx = this.img.getContext('2d');
            return ctx.getImageData(sprite.off.x, sprite.off.y, sprite.dim.x, sprite.dim.y);
        }
        return super.getEntityPropValue(index, prop);
    }

    setEntityValue(index, value) {
        if (!this.model.sprites[value]) {
            this.model.sprites[value] = {dim: {x: null, y: null}, off: {x: 0, y: 0}};
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        switch(prop) {
            case 'width':
                this.model.sprites[this.getEntityValue(index)].dim.x = value;
                break;

            case 'height':
                this.model.sprites[this.getEntityValue(index)].dim.y = value;
                break;

            case 'image':
                const sprite = this.model.sprites[this.getEntityValue(index)];
                const ctx = this.img.getContext('2d');
                ctx.putImageData(value, sprite.off.x, sprite.off.y);
                break;
        }
        super.setEntityPropValue(index, prop, value);
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {
        const sprite = this.model.sprites[this.getEntityValue(index)];
        if (!sprite) {
            return;
        }
        const pos = sprite.off;

        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img, ctx, x, y, zoomOrAvail, sprite.dim, pos);
            }
        } else {
            const targetWidth = sprite.dim.x * zoomOrAvail;
            const targetHeight = sprite.dim.y * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                ctx.drawImage(
                    this.img,
                    pos.x,
                    pos.y,
                    sprite.dim.x,
                    sprite.dim.y,
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
            }
        }
        ctx.drawImage(
            this.img,
            sprite.off.x, sprite.off.y,
            sprite.dim.x, sprite.dim.y,
            x, y,
            zoomOrAvail * sprite.dim.x,
            zoomOrAvail * sprite.dim.y
        );
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }
}

class AnimationIndex extends EntityIndex {

    constructor(entityIndex, model, key = 'animations') {
        super();
        this.model = model;
        this.key = key;
        this.index = entityIndex;
        this.fixSize = !this.index.getEntityProps().includes('width');
        this.items = Object.keys(model[key]).sort();
        this.sizeX = null;
        this.sizeY = null;
        this.indexSorting = (a, b) => a === b ? 0 : (a < b ? -1 : 1);
    }

    getEntityProps() {
        return [...super.getEntityProps(), 'sizeX', 'sizeY', 'dir', 'end', 'speed', 'synchronous', 'frames'];
    }

    getSizeX() {
        if (this.sizeX === null) {
            if (this.fixSize) {
                this.sizeX = this.index.getSizeX();
            } else {
                let i = 0;
                let sizeX = 0;
                const iMax = this.getLength();
                while(i < iMax) {
                    const index = i++;
                    sizeX = Math.max(this.getEntityPropValue(index,'sizeX'), sizeX);
                }
                this.sizeX = sizeX;
            }
        }
        return this.sizeX
    }

    getSizeY() {
        if (this.sizeY === null) {
            if (this.fixSize) {
                this.sizeY = this.index.getSizeY();
            } else {
                let i = 0;
                let sizeY = 0;
                const iMax = this.getLength();
                while(i < iMax) {
                    const index = i++;
                    sizeY = Math.max(this.getEntityPropValue(index,'sizeY'), sizeY);
                }
                this.sizeY = sizeY;
            }
        }
        return this.sizeY;
    }

    getEntityPropValue(index, prop) {
        let def;
        switch(prop) {
            case 'sizeX': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    return this.fixSize ? this.index.getSizeX() : animation.dim.x;
                }
                break;

            case 'sizeY': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    return this.fixSize ? this.index.getSizeY() : animation.dim.y;
                }
                break;

            case 'speed':
                def = 1;
            case 'dir':
            case 'end':
            case 'synchronous':
            case 'frames': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    return animation[prop] === undefined ? def : animation[prop];
                }
                break;
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityValue(index, value) {
        if (this.model[this.key][value] === undefined) {
            const obj = {};
            if (!this.fixSize) {
                obj.dim = {};
            }
            this.model[this.key][value] = obj;
        }
    }

    setEntityPropValue(index, prop, value) {
        switch(prop) {
            case 'sizeX':
                if (this.fixSize) return;
                {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    animation.dim.x = value;
                    this.notify()
                }
                break;

            case 'sizeY':
                if (this.fixSize) return;
                {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    animation.dim.y = value;
                    this.notify()
                }
                break;

            case 'speed':
            case 'dir':
            case 'end':
            case 'synchronous':
            case 'frames': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    animation[prop] = value;
                    this.notify();
                }
                break;

            default:
                super.setEntityPropValue(index, prop, value)
        }
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1, players = null) {
        const animation = this.getEntityValue(index);
        const frame = players ? players.getCurrFrame(animation) : null;
        if (!frame) {
            if (typeof zoomOrAvail === 'object') {
                ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            } else {
                ctx.clearRect(x, y, zoomOrAvail * this.getSizeX(), zoomOrAvail * this.getSizeY())
            }
            return;
        }
        this.index.drawEntity(ctx, this.index.getEntityByPropValue('value', frame.id), x, y, zoomOrAvail);
    }

    getDeletePlan(indices) {
        const names = [];
        for (let index of indices) {
            const name = this.getEntityValue(index);
            if (!name) continue;
            names.push(name);
        }
        const propRemovals = [];
        for (let [key, obj] of Object.entries(this.model.tiles)) {
            const old = obj.animation;
            if (old !== undefined && names.includes(old)) {
                propRemovals.push([key, 'animation',  old]);
            }
        }
        const backupEntities = [];
        for (let index of indices) {
            const entity = this.getEntityObject(index);
            entity.index = null;
            backupEntities.push(entity);
        }
        return {
            indices,
            backupEntities,
            propRemovals
        };
    }

    doDeletePlan(plan) {
        doPlanOnModel(this.model, plan);
        this.deleteEntities(plan.indices);
    }

    undoDeletePlan(plan) {
        undoPlanOnModel(this.model, plan);
        this.setEntityObjects(plan.backupEntities);
    }

    getRenamePlan(oldName, newName) {
        const old2new = {[oldName]: newName};
        return {
            old2new,
            prop: 'animation',
            propChanges: getPropChanges('animation', this.model, old2new)
        }
    };

    doRenamePlan(plan) {
        doPlanOnModel(this.model, plan);
    }

    undoRenamePlan(plan) {
        undoPlanOnModel(this.model, plan);
    }

}

class FrameIndex extends EntityIndex {

    constructor(model, entityIndex, sizeX, sizeY) {
        super();
        this.model = model;
        this.index = entityIndex;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.items = model['frames'];
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).id.toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {
        index = this.index.getEntityByPropValue('value', this.getEntityValue(index).id);
        this.index.drawEntity(ctx, index, x, y, zoomOrAvail);
    }
}

class EventIndex extends EntityIndex {

    constructor(model, key = 'events') {
        super();
        this.model = model;
        this.key = key;
        const events = model[key] ? Object.keys(model[key]) : [];
        for (let row of model.map) {
            for (let cell of row) {
                if (Array.isArray(cell)) {
                    const [index, ...items] = cell;
                    for (let item of items) {
                        if (!events.includes(item)) {
                            events.push(item);
                            if (!this.model.events[item]) {
                                this.model.events[item] = {
                                    width: 0,
                                    height: 0,
                                    offsetX: 0,
                                    offsetY: 0,
                                    x: null,
                                    y: null
                                };
                            }

                        }
                    }
                }
            }
        }
        if (model.eventsImg === undefined) {
            model.eventsImg = getCanvasForDim(0, 0);
        }
        this.img = model.eventsImg;
        this.items = events.sort();
        this.setSizes();
        this.indexSorting = (a, b) => a === b ? 0 : (a < b ? -1 : 1);
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    getEntityProps() {
        return [...super.getEntityProps(), 'offsetX', 'offsetY', 'width', 'height', 'image'];
    }

    setEntityValue(index, value) {
        if (this.model[this.key] === undefined) {
            this.model[this.key] = {};
        }
        if (this.model[this.key][value] === undefined) {
            this.model[this.key][value] = {
                width: 0,
                height: 0,
                offsetX: 0,
                offsetY: 0,
                x: null,
                y: null
            };
        }
        super.setEntityValue(index, value);
    }

    setEntityPropValue(index, name, value) {
        if (['offsetX', 'offsetY', 'width', 'height'].includes(name)) {
            const id = this.getEntityValue(index);
            this.model[this.key][id][name] = value;
            this.notify()
        }
        if (name === 'image') {
            if (value !== null) {
                const pos = this.model[this.key][this.getEntityValue(index)];
                const ctx = this.img.getContext('2d');
                ctx.putImageData(
                    value,
                    pos.x,
                    pos.y
                );
            }
            this.notify()
        }
        super.setEntityPropValue(index, name, value)
    }

    getEntityPropValue(index, name) {
        if (['offsetX', 'offsetY', 'width', 'height'].includes(name)) {
            const id = this.getEntityValue(index);
            const event = this.model[this.key] && this.model[this.key][id];
            if (!event) {
                return 0;
            }
            return event[name];
        }
        if (name === 'image') {
            const width = this.getEntityPropValue(index, 'width');
            if (width === 0) {
                return null;
            }
            const height = this.getEntityPropValue(index, 'height');
            const pos = this.model[this.key][this.getEntityValue(index)];
            const ctx = this.img.getContext('2d');
            return ctx.getImageData(pos.x, pos.y, width, height);
        }
        return super.getEntityPropValue(index, name);
    }

    getMatchingEntities(indices, matchValue) {
        if (matchValue === null) {
            return indices;
        }
        const result = [];
        matchValue = matchValue.toLowerCase();
        for (let index of indices) {
            if (this.getEntityValue(index).toLowerCase().indexOf(matchValue) !== -1) {
                result.push(index);
            }
        }
        return result;
    }

    getAutoProps() {
        return ['image'];
    }

    assignAutoProps(updateIndices = []) {
        let maxWidth = 500;
        const sprites = [];
        let iMax = this.getLength();
        let i = 0;
        while(i < iMax) {
            const value = this.items[i];
            const dim = {
                x: this.model.events[value] ? this.model.events[value].width : 0,
                y: this.model.events[value] ? this.model.events[value].height : 0
            };
            maxWidth = Math.max(maxWidth, dim.x);
            sprites.push([value, dim.x, dim.y, i]);
            i++;
        }
        sprites.sort((a, b) => a[2] === b[2] ? (a[1] === b[1] ? 0 : (a[1] > b[1] ? -1 : 1)) : (a[2] > b[2] ? -1 : 1));

        // now them to free space blocks
        let spaceBlocks = [[0, 0, maxWidth, null]];
        let canvasWidth  = 0;
        let canvasHeight = 0;
        let offsets = {};

        for (let sprite of sprites) {
            const [name, width, height, index] = sprite;
            // find free block matching width and height
            let found = false;
            const newBlocks = [];
            for (let block of spaceBlocks) {
                if (!found) {
                    const [x, y, blockWidth, blockHeight] = block;
                    if (blockHeight !== null && (blockWidth < width || blockHeight < height)) {
                        newBlocks.push(block);
                        continue;
                    }
                    offsets[name] = {x, y, index};
                    if (blockHeight === null) {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        newBlocks.push([0, y + height, maxWidth, null]);
                    } else {
                        if (blockWidth > width) {
                            newBlocks.push([x + width, y, blockWidth - width, height]);
                        }
                        if (blockHeight > height) {
                            newBlocks.push([x, y + height, blockWidth, blockHeight - height]);
                        }
                    }
                    found = true;
                    canvasWidth = Math.max(x + width, canvasWidth);
                    canvasHeight = Math.max(y + height, canvasHeight);
                } else {
                    newBlocks.push(block);
                }
            }
            spaceBlocks = newBlocks;
        }
        const canvas = getCanvasForDim(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        for (let [name, offset] of Object.entries(offsets)) {
            if (!updateIndices.includes(offset.index)) {
                this.drawEntity(ctx, offset.index, offset.x, offset.y);
            }
            const pos = this.model.events[name];
            pos.x = offset.x;
            pos.y = offset.y;
        }
        this.model.eventsImg = canvas;
        this.img = canvas;

        return ['image'];
    }

    setSizes() {
        let maxX = 0;
        let maxY = 0;
        for (let item of this.items) {
            if (!this.model.events || !this.model.events[item]) {
                continue;
            }
            maxX = Math.max(maxX, this.model.events[item].width);
            maxY = Math.max(maxY, this.model.events[item].height);
        }
        this.sizeX = Math.max(maxX, 10);
        this.sizeY = Math.max(maxY, 10);
    }

    hasEntityImage(index) {
        const width = this.getEntityPropValue(index, 'width');
        return (width !== 0)
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {

        const width = this.getEntityPropValue(index, 'width');
        if (width === 0) {
            return;
        }
        const height = this.getEntityPropValue(index, 'height');
        const dim = {x: width, y: height};
        const pos = this.model.events[this.getEntityValue(index)];

        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img, ctx, x, y, zoomOrAvail, dim, pos);
            }
        } else {
            const targetWidth = dim.x * zoomOrAvail;
            const targetHeight = dim.y * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                ctx.drawImage(
                    this.img,
                    pos.x,
                    pos.y,
                    dim.x,
                    dim.y,
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
                return;
            }
        }
        ctx.drawImage(
            this.img,
            pos.x, pos.y,
            dim.x, dim.y,
            x, y,
            zoomOrAvail * dim.x,
            zoomOrAvail * dim.y
        );
    }

    getRenamePlan(oldName, newName) {
        const old2new = {[oldName]: newName};
        const eventChanges = getMapEventChanges(this.model.map, old2new);
        return {
            event: true,
            old2new,
            eventChanges,
            selectionChanges: null
        }
    }

    doRenamePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection)
    }

    undoRenamePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection)
    }

    getDeletePlan(indices) {
        const old2new = {};
        const backupEntities = [];
        const names = [];
        for (let index of indices) {
            const name = this.getEntityValue(index);
            if (!name) continue;
            names.push(name);
            const obj = this.getEntityObject(index);
            obj.index = null;
            backupEntities.push(obj);
            old2new[name] = null;
        }
        const eventChanges = getMapEventChanges(this.model.map, old2new);
        return {
            event: true,
            indices,
            backupEntities,
            old2new,
            eventChanges,
            selectionChanges: null
        }
    }

    doDeletePlan(plan, selection) {
        doPlanOnModel(this.model, plan, selection);
        this.deleteEntities(plan.indices)
    }

    undoDeletePlan(plan, selection) {
        undoPlanOnModel(this.model, plan, selection);
        this.setEntityObjects(plan.backupEntities)
    }
}

export {
    SimpleIndex,
    ColorIndex,
    TileIndex,
    CharIndex,
    AssignIndex,
    AliasIndex,
    BrushIndex,
    SpriteIndex,
    AnimationIndex,
    FrameIndex,
    FontIndex,
    FilterIndex,
    TextBlockIndex,
    EventIndex
};