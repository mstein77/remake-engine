import { Configurable } from "../core/classes.js";

class Pane extends Configurable {

    getEditorResources() {
        return {
            id: this.id,
            type: this.constructor.name,
            elem: this.getPreview ? this.getPreview() : null,
            config: this.constructor.Config,
            cls: this.constructor,
            data: this.config,
            dim: this.viewPortDim,
            props: {},
            pane: this
        }
    }
}

export {
    Pane
}