import inst from "core/instances"
import { PatternPaneConfig } from "./config";
import { d, getCanvasForDim } from "helper/helper"
import { ImageContainer } from "core/classes"
import { Pane } from "../classes"

export class PatternPane extends Pane {

    constructor(input) {
        super(input)
        this.pattern = this.image.getImage()
        this.repeatX = ([null, '', 'repeat', 'repeat-x'].indexOf(this.repeat) !== -1);
        this.repeatY = ([null, '', 'repeat', 'repeat-y'].indexOf(this.repeat) !== -1);
    }

    init(viewPortDimX, viewPortDimY) {
        this.patternDim = {
            x: this.pattern.width,
            y: this.pattern.height
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.paneDim = {
            x: this.repeatX ? viewPortDimX + this.patternDim.x - 1 : viewPortDimX,
            y: this.repeatY ? viewPortDimY + this.patternDim.y - 1 : viewPortDimY
        };

        this.container = new ImageContainer(this.paneDim.x, this.paneDim.y);
        const tmpCanvas = inst.OCM.getNewOffscreenCanvas(this.paneDim.x, this.paneDim.y);
        tmpCanvas.ctx.fillStyle = tmpCanvas.ctx.createPattern(this.pattern, this.repeat);
        tmpCanvas.ctx.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
        this.container.getImageElem().src = tmpCanvas.elem.toDataURL('image/png');
        inst.OCM.discard(tmpCanvas);
        return this.container;
    }

    render() {
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        if (this.repeatX) {
            this.scrollPos.x += Sx;
        }
        if (this.scrollPos.x < 0) {
            this.scrollPos.x += this.patternDim.x;
        } else if (this.scrollPos.x >= this.patternDim.x) {
            this.scrollPos.x -= this.patternDim.x;
        }
        if (this.repeatY) {
            this.scrollPos.y += Sy;
        }
        if (this.scrollPos.y < 0) {
            this.scrollPos.y += this.patternDim.y;
        } else if (this.scrollPos.y >= this.patternDim.y) {
            this.scrollPos.y -= this.patternDim.y;
        }
        const elem = this.container.getImageElem();
        if (elem) {
            if (Sx !== 0) {
                inst.game.addDomOp(elem, 'style.left', -this.scrollPos.x + 'px')
            }
            if (Sy !== 0) {
                inst.game.addDomOp(elem, 'style.top', -this.scrollPos.y + 'px')
            }
        }
        return {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: 0,
                y: 0
            }
        };
    }

    getPreview() {
        const canvas = getCanvasForDim(this.viewPortDim.x, this.viewPortDim.y);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.container.getImageElem(), 0, 0);

        return {
            type: 'plane',
            texture: canvas.toDataURL('image/png'),
            color: null,
            width: this.viewPortDim.x,
            height: this.viewPortDim.y
        }
    }
}
PatternPane.Config = PatternPaneConfig

inst.paneRegistry.add('PatternPane', PatternPane)