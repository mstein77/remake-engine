import { EntityIndex } from "editor/classes"
import { drawCanvasToAvail, getCanvasForDim, toPairs, d } from "helper/helper"
import { minRectPositions } from "helper/algo"

class SpriteIndex extends EntityIndex {

    constructor(model) {
        super()
        this.model = model
        this.img = model.sheet
        const items = []
        for (const [ name, obj ] of toPairs(model.sprites)) {
            if (!obj.transforms) items.push(name)
        }
        this.items = items.sort()
        this.setSizes()
        this.indexSorting = (a, b) => a == b ? 0 : (a < b ? -1 : 1)
    }

    getAutoProps() {
        return ['image']
    }

    assignAutoProps(updateIndices = []) {
        const sprites = []
        let iMax = this.getLength()
        let i = 0
        while(i < iMax) {
            const value = this.items[i]
            const dim = this.model.sprites[value].dim
            sprites.push([dim.x, dim.y, value, i])
            i++
        }

        const { id2pos, width, height } = minRectPositions(sprites)

        const canvas = getCanvasForDim(width, height)
        const ctx = canvas.getContext('2d');

        for (const [ name, offset ] of Object.entries(id2pos)) {
            if (!updateIndices.includes(offset.index)) {
                this.drawEntity(ctx, offset.index, offset.x, offset.y);
            }
            this.model.sprites[name].off = {x: offset.x, y: offset.y};
        }
        this.img.canvas = canvas;

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
        return [ ...super.getEntityProps(), 'width', 'height',  'image' ]
    }

    getEntityPropValue(index, prop) {
        if (prop === 'width')
            return this.model.sprites[this.getEntityValue(index)].dim.x

        if (prop === 'height')
            return this.model.sprites[this.getEntityValue(index)].dim.y

        if (prop === 'image') {
            const sprite = this.model.sprites[this.getEntityValue(index)]
            return this.img.ctx.getImageData(sprite.off.x, sprite.off.y, sprite.dim.x, sprite.dim.y)
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityValue(index, value) {
        if (!this.model.sprites[value]) {
            this.model.sprites[value] = {dim: {x: null, y: null}, off: {x: 0, y: 0}};
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        switch(prop) {
            case 'width':
                this.model.sprites[this.getEntityValue(index)].dim.x = value;
                break;

            case 'height':
                this.model.sprites[this.getEntityValue(index)].dim.y = value;
                break;

            case 'image':
                const sprite = this.model.sprites[this.getEntityValue(index)];
                this.img.ctx.putImageData(value, sprite.off.x, sprite.off.y);
                break;
        }
    }

    drawEntity(ctx, index, x, y, zoomOrAvail = 1) {
        const sprite = this.model.sprites[this.getEntityValue(index)];
        if (!sprite) {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            return;
        }
        const pos = sprite.off;

        if (typeof zoomOrAvail === 'object') {
            ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
            if (pos !== null) {
                drawCanvasToAvail(this.img.canvas, ctx, x, y, zoomOrAvail, sprite.dim, pos);
            }
        } else {
            const targetWidth = sprite.dim.x * zoomOrAvail;
            const targetHeight = sprite.dim.y * zoomOrAvail;
            ctx.clearRect(x, y, targetWidth, targetHeight);
            if (pos !== null) {
                ctx.drawImage(
                    this.img.canvas,
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
            this.img.canvas,
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

export {
    SpriteIndex
}
