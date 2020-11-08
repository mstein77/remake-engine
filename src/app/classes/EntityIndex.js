const {d, getCanvasForDim, getCanvasForIndexMatrix, drawCanvasToAvail} = require('../helper/helper');

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

    /*
    getEntityObject(index) {
        const objs = this.getEntityObjects([index]);
        if (objs.length === 0) {
            return null;
        }
        return objs[0];
    }

     */

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

    getMatchingEntities(match) {
        return this.getAllIndices();
    }

    getView(start, length = null, match = null, sort = null) {
        const items = match ? this.getMatchingEntities(match) : this.getAllIndices();

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
        const autoProps = overwrite ? [] : this.getAutoProps();
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

    drawEntity(targetCtx, pos, x, y, zoom = 1) {
        const value = this.getEntityValue(pos);
        if (value === undefined) {
            return;
        }
        targetCtx.fillStyle = value;
        targetCtx.fillRect(x, y, this.sizeX * zoom, this.sizeY * zoom);
    }

    // TODO matcher
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

    getMatchingEntities(matchValue) {
        const indices = this.getAllIndices();
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

class TileIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.sizeX = model.tileSize;
        this.sizeY = model.tileSize;
        this.img = model.tilesImg.elem;
        this.tilesX = Math.floor(this.img.width/this.sizeX);
        this.tilesY = Math.floor(this.img.height/this.sizeY);
        // we could analyse how many empty tiles are at the end
        this.items = this.getAllIndices();
        this.valueIndexing = true;
    }

    getLength() {
        if (this.items === undefined) {
            return this.tilesX * this.tilesY;
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
            x += sizeX;
            index++;
        }
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = this.getLength();
        this.tilesY = 1;

        return ['image'];
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1) {
        if (index >= this.length) {
            return;
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

    getMatchingEntities(match) {
        const indices = this.getAllIndices();
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

    constructor(model, tileIndex) {
        super();
        this.tileIndex = tileIndex;
        this.tileIndex.addListener(() => this.notify());
        this.model = model;
        const names = [];
        for (let [name, tile] of Object.entries(model.tiles)) {
            if (tile.index !== undefined && name != tile.index) {
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
        } else if (prop === 'value') {
            this.model.tiles[value] = {};
        }
    }

    deleteEntityPropValues(index) {
        const name = this.getEntityValue(index);
        if (name) {
            delete this.model.tiles[name];
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'tile') {
            const name = this.getEntityValue(index);
            return this.model.tiles[name].index;
        }
        return super.getEntityPropValue(index, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.tiles[newValue] = this.model.tiles[oldValue];
        delete this.model.tiles[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'tile'];
    }

    getSizeX() {
        return this.tileIndex.getSizeX();
    }

    getSizeY() {
        return this.tileIndex.getSizeY();
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1) {
        const tile = this.getEntityPropValue(index, 'tile');
        if (tile === null) {
            return;
        }
        this.tileIndex.drawEntity(targetCtx, tile, x, y, zoomOrAvail);
    }

    getMatchingEntities(matchValue) {
        const indices = this.getAllIndices();
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

class BrushIndex extends EntityIndex {

    constructor(model, tileIndex) {
        super();
        this.model = model;
        this.tileIndex = tileIndex;
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
        const canvas = getCanvasForIndexMatrix(this.tileIndex, tiles, 10);
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

    getMatchingEntities(matchValue) {
        const indices = this.getAllIndices();
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
}

export {
    SimpleIndex,
    ColorIndex,
    TileIndex,
    CharIndex,
    AssignIndex,
    AliasIndex,
    BrushIndex,
    SpriteIndex
};