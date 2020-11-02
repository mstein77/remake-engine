const {d, getCanvasForDim} = require('../helper/helper');

class IndexProvider {

    constructor(props) {
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
        if (!this.listeners) {
            return;
        }
        for (let listener of this.listeners) {
            listener();
        }
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

    getNormedValue(propName, value) {
        return value;
    }

    hasPropValue(name, value) {
        let index = 0;
        const length = this.getLength();
        const normedValue = this.getNormedValue(name, value);
        while (index < length) {
            const iProps = this.getIndexProps(index);
            if (this.getNormedValue(name, iProps[name]) === normedValue) {
                return true;
            }
            index++;
        }
        return false;
    }

    getIndexByPropValue(name, value) {
        const results = [];
        let index = 0;
        const length = this.getLength();
        const normedValue = this.getNormedValue(name, value);
        while (index < length) {
            const iProps = this.getIndexProps(index);
            if (this.getNormedValue(name, iProps[name]) === normedValue) {
                results.push(index);
            }
            index++;
        }
        if (results.length === 0) {
            return null;
        }
        if (results.length > 1) {
            throw Error(`Property ${name} with value ${value} found ${results.length} times but expected not more than 1`);
        }
        return results[0];
    }

    allocateIndex(props = {}, index = null) {
        return this.allocateIndices([props], index)[0];
    }

    allocateIndices(propItems, index = null) {
        const result = [];
        const iMax = propItems.length;
        let i = 0;
        if (index === null || index === this.items.length) {
            while(i < iMax) {
                result.push(propItems[i] === null ? null : this.items.length);
                if (propItems[i] !== null) {
                    this.items.push(null);
                }
                i++;
            }
            return result;
        }
        while(i < iMax) {
            result.push(propItems[i] === null ? null : index);
            if (propItems[i] !== null) {
                this.items.splice(index, 0, null);
                index++;
            }
            i++;
        }
        this.notify();
        return result;
    }

    setIndex(index, value) {
        this.items[index] = value;
        this.notify();
    }

    getIndex(index) {
        return this.items[index];
    }

    hasIndex(index) {
        return (index >= 0 && index < this.getLength());
    }

    deleteIndex(index) {
        this.deleteIndices([index]);
    }

    setItems(items) {
        this.items = items;
        this.notify();
    }

    deleteIndices(indices) {
        const newItems = [];
        const length = this.getLength();
        let i = 0;
        while(i < length) {
            if (!indices.includes(i)) {
                newItems.push(this.getIndex(i));
            }
            i++;
        }
        this.setItems(newItems);
        this.notify();
    }

    getMatchingIndices(matcher) {
        const result = [];
        let isValid;
        switch(matcher.type) {
            case 'prefix':
                isValid = index => {
                    let prop;
                    if (matcher.field === 'value') {
                        prop =  this.getIndex(index);
                    } else {
                        // todo
                        prop = this.getIndexProps(index)[matcher.field];
                    }
                    return prop !== null && prop.toLowerCase().startsWith(matcher.value.toLowerCase());
                };
                break;

            default:
                isValid = () => false;
                break;
        }

        for(let i = 0; i < this.getLength(); i++) {
            if (isValid(i)) {
                result.push(i);
            }
        }
        return result;
    }

    getAllIndices() {
        return this.items;
    }

    getIndexProps(index) {
        return {index};
    }

    getObjectsForIndices(indices = null) {
        if (indices === null) {
            indices = this.getAllIndices();
        }
        const result = [];
        for (let index of indices) {
            const obj = this.getIndexProps(index);
            obj.value = this.getIndex(index);
            result.push(obj);
        }
        return result;
    }

    getNullArray(length) {
        const result = [];
        while (length > 0) {
            result.push(null);
            length--;
        }
        return result;
    }

    setIndexFromObject(obj) {
        let index = obj.index;
        if (!this.hasIndex(obj.index)) {
            index = this.allocateIndex(obj, obj.index);
        }
        if (index !== null) {
            this.setIndex(index, obj.value);
        }
        this.notify();
        return index;
    }

    setIndicesFromObjects(objects) {
        for (let obj of objects) {
            this.setIndexFromObject(obj);
        }
    }

    getIndexMatches(index, length, matcher = null) {
        const items = matcher ? this.getMatchingIndices(matcher) : this.getAllIndices();

        const matches = [];
        const count = items.length;
        const max = Math.min(count, index + length);
        let i = index;
        while (i < max) {
            matches.push(items[i]);
            i++;
        }
        return {
            matches,
            count
        };
    }
}

class ColorIndex extends IndexProvider {

    constructor(model, key = 'colors') {
        super();
        this.model = model;
        this.key = key;
        this.sizeX = 10;
        this.sizeY = 10;
        this.items = this.model[key];
    }

    getNormedValue(name, value) {
        if (name === 'value') {
            return value.toLowerCase();
        }
        return value;
    }

    setItems(items) {
        this.model[this.key] = items;
        this.items = items;
        this.notify();
    }

    getIndexProps(index) {
        const props = super.getIndexProps(index);
        props.value = this.getIndex(index);
        return props;
    }

    drawIndex(targetCtx, pos, x, y, zoom = 1) {
        const value = this.getIndex(pos);
        if (value === undefined) {
            return;
        }
        targetCtx.fillStyle = value;
        targetCtx.fillRect(x, y, this.sizeX * zoom, this.sizeY * zoom);
    }

    allocateIndex(props, index = null) {
        if (index > this.items.length) {
            return null;
        }
        if (!props.value || this.items.includes(props.value)) {
            return null;
        }
        if (index === null || this.items.length === index) {
            this.items.push(null);
            return this.items.length - 1;
        }
        this.items.splice(index, 0, null);
        this.notify();
        return index;
    }

    allocateIndices(itemProps, index = null) {
        const newItems = [];
        for (let item of itemProps) {
             newItems.push(
                 (!item.value || this.items.includes(item.value)) ?
                 null : item
             );
        }
        return super.allocateIndices(newItems, index);
    }
}

class AssignIndex extends IndexProvider {

    constructor(length, sizeX, sizeY, props) {
        super();
        this.length = length;
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.props = props;
        this.propValues = {};
        for (let prop of Object.keys(props)) {
            this.propValues[prop] = {};
        }
        this.img = getCanvasForDim(sizeX * length, sizeY);
        this.items = [];
        let i = 0;
        while (i < this.length) {
            this.items.push(i);
            i++;
        }
    }

    getIndexProps(index) {
        const props = {index};
        for (let [prop, value] of Object.entries(this.props)) {
            const propValue = this.propValues[prop][index];
            props[prop] = propValue !== undefined ? propValue : value;
        }
        return props;
    }

    getPropValues(prop) {
        const values = [];
        let i = 0;
        while (i < this.length) {
            values.push(this.getIndexProps(i)[prop]);
            i++;
        }
        return values;
    }

    setIndexFromObject(obj) {
        const index = super.setIndexFromObject(obj);
        for (let prop of Object.keys(this.props)) {
            if (obj[prop] !== undefined) {
                this.setIndexProp(index, prop, obj[prop]);
            }
        }
        this.notify();
        return index;
    }

    setIndicesFromObjects(objects) {
        let i = 0;
        for (let obj of objects) {
            obj.index = i;
            i++;
        }
        super.setIndicesFromObjects(objects);
    }

    setIndexProp(index, prop, value) {
        this.propValues[prop][index] = value;
        this.notify();
    }

    getIndexPos(index) {
        return {x: index * this.sizeX, y: 0};
    }

    getIndex(index) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        return ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY());
    }

    setIndex(index, imageData) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        ctx.putImageData(imageData, pos.x, pos.y);
        this.notify();
    }

    drawIndex(targetCtx, index, x, y, zoom = 1) {
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

class CharIndex extends IndexProvider {

    constructor(model) {
        super();
        this.model = model;
        this.img = model.image;
        this.items = Object.keys(this.model.map).sort();
    }

    getSizeX() {
        return this.model.width;
    }

    getSizeY() {
        return this.model.height;
    }

    getIndexProps(index) {
        return {index, code: this.items[index]};
    }

    getAllIndices() {
        const result = [];
        let i = 0;
        while (i < this.items.length) {
            result.push(i++);
        }
        return result;
    }

    getIndexPos(index) {
        const char = this.items[index];
        return this.model.map[char];
    }

    setIndex(index, imageData) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        ctx.putImageData(imageData, pos.x, pos.y);
        this.notify();
    }

    getIndex(index) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        return ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY());
    }

    regenerate(changes = {}) {
        const length = this.getLength();
        const newWidth = length * this.getSizeX();
        const canvas = getCanvasForDim(newWidth, this.getSizeY());
        const ctx = canvas.getContext('2d');
        let index = 0;
        let x = 0;
        let curr = null;
        let found = 0;
        while (found < length) {
            let incIndex = true;
            if (!changes.skip || !changes.skip.includes(index)) {
                if (index === curr || !changes.insert || !changes.insert.includes(index)) {
                    this.drawIndex(ctx, index, x, 0);
                    this.model.map[this.items[index]] = {x, y: 0};
                } else {
                    incIndex = false;
                    curr = index;
                }
                x += this.getSizeX();
                found++;
            }
            if (incIndex) {
                index++;
            }
        }
        this.model.image = canvas;
        this.img = canvas;
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
                this.getIndex(i),
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

    deleteIndices(indices) {
        for (let index of indices) {
            const char = this.items[index];
            if (char === undefined) {
                continue;
            }
            delete this.model.map[char];
        }
        const newItems = [];
        let i = 0;
        while (i < this.items.length) {
            if (!indices.includes(i)) {
                newItems.push(this.items[i]);
            }
            i++;
        }
        this.items = newItems;
        this.regenerate();
        this.notify();
    }

    allocateIndices(propItems, index = null) {
        const result = [];
        const iMax = propItems.length;
        let i = 0;
        if (index !== null && index > this.items.length) {
            while (i < iMax) {
                result.push(null);
                i++;
            }
            return result;
        }
        const codes = [];
        for (let item of propItems) {
            const code = !item.code || this.items.includes(item.code) ? null : item.code;
            codes.push(code);
            if (code !== null) {
                this.model.map[code] = {x: null, y: null};
            }
        }
        this.items = Object.keys(this.model.map).sort();
        this.regenerate();
        while (i < iMax) {
            const code = codes[i];
            result.push(code === null ? null : this.items.indexOf(code));
            i++;
        }
        this.notify();
        return result;
    }

    drawIndex(targetCtx, index, x, y, zoom = 1) {
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

class TileIndex extends IndexProvider {

    constructor(model) {
        super();
        this.model = model;
        this.sizeX = model.tileSize;
        this.sizeY = model.tileSize;
        this.img = model.tilesImg.elem;
        this.tilesX = Math.floor(this.img.width/this.sizeX);
        this.tilesY = Math.floor(this.img.height/this.sizeY);
        // we could analyse how many empty tiles are at the end
        this.length = this.tilesX * this.tilesY;
    }

    getLength() {
        return this.length;
    }

    getIndexPos(index) {
        const y = Math.floor(index/this.tilesX);
        return {x: (index - y * this.tilesX) * this.sizeX, y: y * this.sizeY}
    }

    setIndex(index, imageData) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        ctx.putImageData(imageData, pos.x, pos.y);
        this.notify();
    }

    getIndex(index) {
        const ctx = this.img.getContext('2d');
        const pos = this.getIndexPos(index);
        return ctx.getImageData(pos.x, pos.y, this.sizeX, this.sizeY);
    }

    getAllIndices() {
        const result = [];
        let i = 0;
        while (i < this.length) {
            result.push(i++);
        }
        return result;
    }

    regenerate(changes) {
        const newWidth = this.length * this.getSizeX();
        const canvas = getCanvasForDim(newWidth, this.getSizeY());
        const ctx = canvas.getContext('2d');
        let index = 0;
        let x = 0;
        let found = 0;
        while (found < this.length) {
            let incIndex = true;
            if (!changes.skip || !changes.skip.includes(index)) {
                if (!changes.insert || !changes.insert[index]) {
                    this.drawIndex(ctx, index, x, 0);
                } else {
                    changes.insert[index]--;
                    incIndex = false;
                }
                x += this.getSizeX();
                found++;
            }
            if (incIndex) {
                index++;
            }
        }
        this.model.tilesImg = {elem: canvas, ctx};
        this.img = canvas;
        this.tilesX = this.length;
        this.tilesY = 1;
    }

    deleteIndices(indices) {
        const oldLength = this.getLength();
        for (let index of indices) {
            if (index >= oldLength) {
                continue;
            }
            this.length--;
        }
        this.regenerate({skip: indices});
        this.notify();
    }

    allocateIndices(propItems, index = null) {
        const iMax = propItems.length;
        const result = [];
        let i = 0;
        if (index !== null && this.getLength() < index) {
            while (i < iMax) {
                result.push(null);
            }
            return result;
        }
        if (index === null) {
            index = this.length;
        }
        while (i < iMax) {
            result.push(index);
            this.length++;
            i++;
        }
        this.regenerate({insert: {[index]: iMax}});
        this.notify();
        return result;
    }

    drawIndex(targetCtx, index, x, y, zoom = 1) {
        targetCtx.clearRect(x, y, this.sizeX * zoom, this.sizeY * zoom);
        if (index >= this.length) {
            return;
        }
        const pos = this.getIndexPos(index);
        targetCtx.drawImage(
            this.img,
            pos.x,
            pos.y,
            this.sizeX,
            this.sizeY,
            x,
            y,
            this.sizeX * zoom,
            this.sizeY * zoom
        );
    }
}

export {
    ColorIndex,
    TileIndex,
    CharIndex,
    AssignIndex
};