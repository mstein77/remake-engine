import { EntityIndex } from "../classes"
import {d, cloneDeep, getCanvasForDim, drawCanvasToAvail, toPairs} from "helper/helper"

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

    drawEntity(targetCtx, index, x, y, zoomOrAvail = 1) {
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
                    this.getSizeX(),
                    this.getSizeY(),
                    x,
                    y,
                    targetWidth,
                    targetHeight
                );
            }
        }
    }
}

class FilterIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.params = [];
        this.items = [];
    }

    hasUniqueValues() {
        return false
    }

    setEntityValue(index, value) {
        if (index >= this.params.length) {
            this.params.push(null);
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'params') {
            this.params[index] = cloneDeep(value);
        }
    }

    getEntityPropValue(index, prop) {
        if (prop === 'params') {
            return cloneDeep(this.params[index])
        }
        return super.getEntityPropValue(index, prop);
    }

    getEntityProps() {
        return [ ...super.getEntityProps(), 'params'];
    }

    deleteEntityPropValues(index) {
        this.params.splice(index, 1);
    }
}

class AnimationIndex extends EntityIndex {

    constructor(entityIndex, model, key = 'animations') {
        super()
        this.model = model
        this.key = key
        this.index = entityIndex
        this.fixSize = !this.index.getEntityProps().includes('width')
        const items = []
        for (const [ id, obj ] of toPairs(model[key])) {
            if (!obj.transforms) items.push(id)
        }
        this.items = items.sort()
        this.sizeX = null
        this.sizeY = null
        this.indexSorting = (a, b) => a === b ? 0 : (a < b ? -1 : 1)
    }

    getEntityProps() {
        return [...super.getEntityProps(), 'sizeX', 'sizeY', 'dir', 'end', 'speed', 'sync', 'frames'];
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
            case 'sync':
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
        super.setEntityPropValue(index, prop, value);
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
            case 'sync':
            case 'frames': {
                    const animation = this.model[this.key][this.getEntityValue(index)];
                    animation[prop] = value;
                    this.notify();
                }
                break;
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

class ImageIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.items = []
    }

    getEntityProps() {
        return [ ...super.getEntityProps(), 'width', 'height', 'image' ];
    }

    getEntityPropValue(index, prop) {
        if (['width', 'height'].includes(prop)) {
            const img = this.model[this.getEntityValue(index)];
            return img ? img[prop] : 0
        }
        if (prop === 'image') {
            return this.model[this.getEntityValue(index)]
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (prop === 'image') {
            this.model[this.getEntityValue(index)] = value;
        }
    }
}

export {
    SimpleIndex,
    ColorIndex,
    AssignIndex,
    AnimationIndex,
    FrameIndex,
    FilterIndex,
    ImageIndex
};