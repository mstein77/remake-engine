import { EntityIndex } from "editor/classes";
import { getCanvasForBitmap, drawCanvasToAvail } from "helper/helper";

class ImageBlockIndex extends EntityIndex {

    constructor(model) {
        super();
        this.model = model;
        this.items = [];
        for (let i = 0; i < model.imgPos.length; i++) {
            this.items.push(model.imgIds[i]);
        }
        this.valueTemplate = '$.png';
        this.setSizes()
    }

    getEntityProps() {
        return [ ...super.getEntityProps(), 'image', 'width', 'height', 'x', 'y' ];
    }

    getEntityPropValue(index, prop) {
        if (['width', 'height'].includes(prop)) {
            const img = this.model.imgCanvas[index];
            return img ? img[prop] : 0
        }
        if (['x', 'y'].includes(prop)) {
            return this.model.imgPos[index][prop]
        }
        if (prop === 'image') {
            const canvas = this.model.imgCanvas[index];
            return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        }
        return super.getEntityPropValue(index, prop)
    }

    setEntityValue(index, value) {
        if (index >= this.model.imgIds.length) {
            this.model.imgIds.push(value);
            this.model.imgPos.push({x: 0, y: 0});
            this.model.imgCanvas.push(null);
        }
        this.items[index] = value;
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value);
        if (['x', 'y'].includes(prop)) {
            this.model.imgPos[index][prop] = value;
        }
        if (prop === 'image') {
            let currCanvas = this.model.imgCanvas[index];
            if (!currCanvas || currCanvas.width !== value.width || currCanvas.height !== value.height) {
                currCanvas = getCanvasForBitmap(value);
                this.model.imgCanvas[index] = currCanvas;
            } else {
                currCanvas.getContext('2d').putImageData(value, 0, 0);
            }
            this.addPropUpdate(index);
            this.notify()
        }
    }

    getSizeX() {
        return this.sizeX;
    }

    getSizeY() {
        return this.sizeY;
    }

    setSizes() {
        // TODO change
        this.sizeX = 100;
        this.sizeY = 100;
    }

    drawEntity(ctx, pos, x, y, zoomOrAvail = 1) {
        const props = this.getEntityObject(pos);
        let width = props.width;
        let height = props.height;

        if (typeof zoomOrAvail !== 'object') {
            width *= zoomOrAvail;
            height *= zoomOrAvail;
        } else {
            width = zoomOrAvail.width;
            height = zoomOrAvail.height;
        }
        const dim = {x: width, y: height};
        ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height);
        x += Math.max((width >> 1) - (props.width >> 1), 0);
        y += Math.max((height >> 1) - (props.height >> 1), 0);
        drawCanvasToAvail(getCanvasForBitmap(props.image), ctx, x, y, zoomOrAvail, dim, {x: 0, y: 0});
    }

    deleteEntityPropValues(index) {
        this.model.imgIds.splice(index, 1);
        this.model.imgPos.splice(index, 1);
        this.model.imgCanvas.splice(index, 1);
    }
}

export {
    ImageBlockIndex
}