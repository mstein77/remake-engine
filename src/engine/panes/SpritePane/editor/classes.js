import { EntityIndex } from "editor/classes";
import { drawCanvasToAvail, getCanvasForDim, toPairs, d } from "helper/helper"

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

        for (const [ name, offset ] of Object.entries(offsets)) {
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
