import { d, getCanvasForDim } from "helper/helper"
import { DivContainer } from "core/classes"
import { Pane } from "../classes"
import { Config } from "core/config"
import { validated } from "helper/validate"
import { AppliedImage } from "core/classes"
import { ModelFactory } from "core/model"

export class BackgroundPaneConfig extends Config {

    getFieldProps() {
        return {
            x: {min: -9999, max: 9999},
            y: {min: -9999, max: 9999}
        };
    }

    getDefaults() {
        return {
            color: '#000000',
            images: []
        }
    }

    applyPropsTo(obj) {
        obj.color = this.color
        obj.images = []
        obj.imgPos = []
        for (let { image, x, y } of this.images) {
            obj.images.push(new AppliedImage(image))
            obj.imgPos.push({ x, y });
        }
        return obj;
    }

    setColor(value) {
        this.color = validated.color(value)
        return this
    }

    setImages(values) {
        this.images = this.validateImgObjects(values)
        return this
    }

    validateImgObject(value) {
        validated.object(value);
        const { image, x, y } = value;
        return {
            image: validated.imageResource(image),
            x: validated.int(x),
            y: validated.int(y)
        }
    }

    validateImgObjects(values) {
        validated.array(values);
        const newValues = [];
        for (let value of values) {
            newValues.push(this.validateImgObject(value));
        }
        return newValues;
    }

    addImage(image, x = 0, y = 0) {
        this.images.push({ image, x, y })
        return this
    }
}

class BackgroundPaneImpl extends Pane {

    addImage(image, posX, posY) {
        // TODO appliedImage ?
        this.imgPos.push({x: posX, y: posY})
        const img = document.createElement('IMG')
        img.src = image
        this.images.push(img)
        this.dirty = false
    }

    setImagePosition(index, posX, posY) {
        const pos = this.imgPos[index]
        pos.x = posX
        pos.y = posY
        this.dirty = true
    }

    getImagePosition(index) {
        const pos = this.imgPos[index]
        return {x: pos.x, y: pos.y}
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim
        this.container = new DivContainer()
        return this.container
    }

    render() {
        this.container.setBackgroundColor(this.color)
        if (this.images.length) {
            const rawImg = []
            for (const img of this.images) {
                rawImg.push(img.dataUrl)
            }
            this.container.setBackgroundImages([ ...rawImg ].reverse())
            this.container.setBackgroundPositions([ ...this.imgPos ].reverse())
        }
        this.dirty = false;
    }

    getPreview() {
        const canvas = getCanvasForDim(this.viewPortDim.x, this.viewPortDim.y)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = this.color
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        for (let i = 0; i < this.images.length; i++) {
            const { x, y } = this.imgPos[i]
            this.images[i].drawTo(ctx, x, y)
        }
        return {
            type: 'plane',
            texture: canvas.toDataURL('image/png'),
//            color: this.color,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }

    addRebuildProps(obj, deep) {
        obj.color = this.color;
        obj.images = [];
        let i = 0;
        while (i < this.images.length) {
            const { x, y } = this.imgPos[i]
            const image = this.images[i]
            obj.images.push({
                image: deep ? image.imageResource : image.id,
                x,
                y
            })
            i++
        }
    }

    getDependentImages() {
        const result = [];
        for (let image of this.images) {
            result.push(image)
        }
        return result
    }
}

const BackgroundPane =
    ModelFactory(
        {name: 'BackgroundPane', editor: true},
        BackgroundPaneConfig
    )
    .addImplementation(BackgroundPaneImpl)

export default BackgroundPane