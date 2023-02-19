import { Model } from "../core/classes.js";

class Pane extends Model {

    getEditorResources() {
        return {
            id: this.id,
            type: this.constructor.name,
            elem: this.getPreview ? this.getPreview() : null,
            dim: this.viewPortDim,
            pane: this
        }
    }
}

export {
    Pane
}