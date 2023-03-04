import { EntityIndex } from "editor/classes"
import { drawCanvasToAvail, getCanvasForDim } from "helper/helper"
import { TextBlock } from "../models"

class FontIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.items = [];
        this.chars = {};
        for (let font of model.fonts) {
            this.items.push(font.id);
            const charIndex = new CharIndex(font);
            this.chars[font.id] = charIndex;
            charIndex.addListener(() => this.notify());
        }
    }

    setEntityValue(index, value) {
        if (this.model.fonts.length <= index) {
            this.model.fonts.push(null); // {id: value});
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
            this.model.fonts[index] = value.model;
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
        this.model.fonts.splice(index, 1);
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
            this.model.blocks.push(
                new TextBlock({id: value}, this.model)
            );
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (['filters', 'alignToGrid', 'autoCenteringX', 'autoCenteringY', 'filters', 'font', 'height', 'lineSpacing', 'text', 'textAlign', 'width', 'x', 'y'].includes(prop)) {
            const obj = this.model.blocks[index];
            if (obj) {
                obj[prop] = value;
                if (!['x', 'y'].includes(prop)) {
                    this.addPropUpdate(index)
                }
                this.notify()
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
            const pos = this.getIndexPos(index);
            this.img.ctx.putImageData(value, pos.x, pos.y);
            this.notify();
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'image') {
            const pos = this.getIndexPos(index);
            return this.img.ctx.getImageData(pos.x, pos.y, this.getSizeX(), this.getSizeY());
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
        this.img.canvas = canvas;
        return ['image'];
    }

    deleteEntityPropValues(index) {
        delete this.model.map[this.items[index]];
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
        this.img.canvas = canvas;
        this.notify();
    }

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1) {
        const pos = this.getIndexPos(index);
        if (typeof zoomOrAvail === 'object') {
            targetCtx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img.canvas, targetCtx, x, y, zoomOrAvail, this.getIndexDim(), pos);
            }
        } else {
            const sizeX = this.getSizeX();
            const sizeY = this.getSizeY();
            targetCtx.clearRect(x, y, sizeX * zoomOrAvail, sizeY * zoomOrAvail);
            if (pos !== null) {
                targetCtx.drawImage(
                    this.img.canvas,
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

export {
    FontIndex,
    CharIndex,
    TextBlockIndex
}
