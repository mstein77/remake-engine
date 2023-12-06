import { CanvasContainer } from "core/classes"
import { Pane } from "../classes"
import { Config } from "core/config"
import { ModelFactory } from "core/model"

class CanvasPaneConfig extends Config {}

export class CanvasPaneImpl extends Pane {

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

const CanvasPane =
    ModelFactory(
        'CanvasPane',
        CanvasPaneConfig
    )
    .addImplementation(CanvasPaneImpl)


export default CanvasPane