import { d, getCanvasForDim } from "helper/helper"
import { BackgroundPaneConfig } from "./config"
import { DivContainer } from "core/classes"
import { Pane } from "../classes"
import inst from "core/instances"

export class BackgroundPane extends Pane {

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
        if (this.images.length > 0) {
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
BackgroundPaneConfig.linkTo(BackgroundPane)

inst.paneRegistry.add('BackgroundPane', BackgroundPane, {editable: true})