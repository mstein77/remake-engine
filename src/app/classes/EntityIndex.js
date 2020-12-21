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

    hasEntityDim() {
        return this.getEntityProps().includes('width');
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

    assignAutoProps(updateIndices = []) {
        const length = this.getLength();
        const sizeX = this.getSizeX();
        const sizeY = this.getSizeY();

        const maxTiles = Math.floor(1000 / sizeX);

        const tilesX = Math.min(length, maxTiles);
        const newWidth = tilesX * sizeX;
        const rows = Math.ceil(length / maxTiles);

        const canvas = getCanvasForDim(newWidth, this.getSizeY() * rows);
        const ctx = canvas.getContext('2d');

        let index = 0;
        let x = 0;
        let y = 0;
        while(index < length) {
            if (!updateIndices.includes(index)) {
                this.drawEntity(ctx, index, x, y);
            }
            x += sizeX;
            if (x >= newWidth) {
                y += sizeY;
                x = 0;
            }
            index++;
        }
        this.model.tilesImg.elem = canvas;
        this.img = canvas;
        this.tilesX = tilesX;
        this.tilesY = rows;

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
        }
        if (prop === 'value') {
            if (!this.model.tiles[value]) {
                this.model.tiles[value] = {};
            }
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

    getEntityPropValue(index, prop) {
        if (prop === 'tile') {
            const name = this.getEntityValue(index);
            return this.model.tiles[name].index;
        }
        if (prop === 'props') {
            const tile = this.model.tiles[this.getEntityValue(index)];
            if (!tile) {
                return {};
            }
            const {...result} = tile;
            delete result.index;
            return result;
        }
        return super.getEntityPropValue(index, prop);
    }

    handleEntityValueReplace(oldValue, newValue) {
        this.model.tiles[newValue] = this.model.tiles[oldValue];
        delete this.model.tiles[oldValue];
    }

    getEntityProps() {
        return  [...super.getEntityProps(), 'props', 'tile'];
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
        return [...super.getEntityProps(), 'sizeX', 'sizeY', 'dir', 'end', 'synchronous', 'frames'];
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

            case 'dir':
            case 'end':
            case 'synchronous':
            case 'frames': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    return animation[prop];
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
        const frame = players.getCurrFrame(index);
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
    EventIndex
};