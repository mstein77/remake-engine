import { Pane } from "panes/classes"
import { Config } from "core/config"
import { ModelFactory } from "core/model"

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

const EmptyPane =
    ModelFactory(
        'EmptyPane',
        EmptyPaneConfig
    )
    .addImplementation(EmptyPaneImpl)

export default EmptyPane