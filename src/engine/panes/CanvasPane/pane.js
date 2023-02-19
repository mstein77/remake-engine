import { CanvasContainer } from "core/classes"
import { CanvasPaneConfig } from "./config"
import { Pane } from "../classes"
import inst from "core/instances"

export class CanvasPane extends Pane {

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque)
        this.dirty = false
        return this.container
    }

    render() {
    }

    getCtx() {
        return this.container.getCanvasCtx();
    }

    getPreview() {
        return {
            type: 'plane',
            texture: this.container.canvas.elem.toDataURL('image/png'),
            color: null,
            width: this.paneDim.x,
            height: this.paneDim.y
        }
    }
}
CanvasPaneConfig.linkTo(CanvasPane)

inst.paneRegistry.add('CanvasPane', CanvasPane)