import inst from "core/instances"
import { Pane } from "panes/classes"
import { EmptyPaneConfig } from "./config"

export class EmptyPane extends Pane {

    constructor() {
        super({id: 'empty'})
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
    }

    render() {
        this.dirty = false;
    }
}
EmptyPaneConfig.linkTo(EmptyPane)

inst.paneRegistry.add('EmptyPane', EmptyPane)