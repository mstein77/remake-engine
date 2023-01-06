import { d, getCanvasForDim, getConfigFromInput } from "helper/helper"
import { BackgroundPaneConfig } from "./config";
import { DivContainer } from "core/classes";

export class BackgroundPane {

    constructor(input) {
        const config = getConfigFromInput(BackgroundPane.Config, input);
        config.applyTo(this);
        this.config = config;
    }

    addImage(image, posX, posY) {
        this.images.push(image);
        this.imgPos.push({x: posX, y: posY});
        const img = document.createElement('IMG');
        img.src = image;
        this.imgElems.push(img);
        this.dirty = false;
    }

    setImagePosition(index, posX, posY) {
        const pos = this.imgPos[index];
        pos.x = posX;
        pos.y = posY;
        this.dirty = true;
    }

    getImagePosition(index) {
        const pos = this.imgPos[index];
        return {x: pos.x, y: pos.y};
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
        this.container = new DivContainer();
        return this.container;
    }

    render() {
        this.container.setBackgroundColor(this.color);
        if (this.imgCanvas.length > 0) {
            const rawImg = [];
            for (let img of this.imgCanvas) {
                rawImg.push(img.toDataURL('image/png'));
            }
            this.container.setBackgroundImages([ ...rawImg ].reverse());
            this.container.setBackgroundPositions( [ ...this.imgPos ].reverse());
        }
        this.dirty = false;
    }

    getPreview() {
        const canvas = getCanvasForDim(this.viewPortDim.x, this.viewPortDim.y);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < this.imgCanvas.length; i++) {
            const img = this.imgCanvas[i];
            const { x, y } = this.imgPos[i];
            ctx.drawImage(img, x, y);
        }
        return {
            type: 'plane',
            texture: canvas.toDataURL('image/png'),
//            color: this.color,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }
}

/**
 * @type {BackgroundPaneConfig}
 */
BackgroundPane.Config = BackgroundPaneConfig;