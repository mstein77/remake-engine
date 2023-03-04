import { Pane } from "panes/classes"
import { Config } from "core/config"

class EmptyPaneConfig extends Config {}

class EmptyPaneImpl extends Pane {

    constructor(input, options) {
        super({id: 'empty'}, options)
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

const type = Pane.createType(
    'EmptyPane',
    EmptyPane,
    EmptyPaneConfig
)

export function EmptyPane(...args) {
    return EmptyPaneImpl.newInst(type, ...args)
}