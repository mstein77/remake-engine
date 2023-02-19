import { EntityIndex } from "editor/classes"
import { d, getCanvasForBitmap, drawCanvasToAvail } from "helper/helper"
import { RawAppliedImage } from "core/classes"

class ImageBlockIndex extends EntityIndex {

    constructor(model) {
        super()
        this.model = model
        this.items = [];
        for (let i = 0; i < model.images.length; i++) {
            this.items.push(model.images[i].id)
        }
        this.valueTemplate = '$.png'
        this.setSizes()
    }

    getEntityProps() {
        return [ ...super.getEntityProps(), 'image', 'width', 'height', 'x', 'y' ]
    }

    getEntityPropValue(index, prop) {
        if (['width', 'height'].includes(prop))
            return this.model.images[index][prop]

        if (['x', 'y'].includes(prop))
            return this.model.imgPos[index][prop]

        if (prop === 'image')
            return this.model.images[index].imageData

        return super.getEntityPropValue(index, prop)
    }

    setEntityValue(index, value) {
        if (index >= this.model.images.length) {
            this.model.images.push(new RawAppliedImage(value))
            this.model.imgPos.push({x: 0, y: 0})
        }
        this.items[index] = value
    }

    setEntityPropValue(index, prop, value) {
        super.setEntityPropValue(index, prop, value)
        if (['x', 'y'].includes(prop)) {
            this.model.imgPos[index][prop] = value
        }
        if (prop === 'image') {
            this.model.images[index].imageData = value
            this.addPropUpdate(index);
            this.notify()
        }
    }

    getSizeX() {
        return this.sizeX
    }

    getSizeY() {
        return this.sizeY
    }

    setSizes() {
        // TODO change
        this.sizeX = 100
        this.sizeY = 100
    }

    drawEntity(ctx, pos, x, y, zoomOrAvail = 1) {
        const props = this.getEntityObject(pos)
        let width = props.width
        let height = props.height

        if (typeof zoomOrAvail !== 'object') {
            width *= zoomOrAvail
            height *= zoomOrAvail
        } else {
            width = zoomOrAvail.width
            height = zoomOrAvail.height
        }
        const dim = {x: width, y: height}
        ctx.clearRect(x, y, zoomOrAvail.width, zoomOrAvail.height)
        x += Math.max((width >> 1) - (props.width >> 1), 0)
        y += Math.max((height >> 1) - (props.height >> 1), 0)
        drawCanvasToAvail(getCanvasForBitmap(props.image), ctx, x, y, zoomOrAvail, dim, {x: 0, y: 0})
    }

    deleteEntityPropValues(index) {
        this.model.images.splice(index, 1)
        this.model.imgPos.splice(index, 1)
    }
}

export {
    ImageBlockIndex
}