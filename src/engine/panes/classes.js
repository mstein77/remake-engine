import { Model } from "core/model"

class Pane extends Model {

    getEditorResources() {
        return {
            id: this.id,
            type: this.typeName,
            elem: this.getPreview ? this.getPreview() : null,
            dim: this.viewPortDim,
            pane: this
        }
    }
}

export {
    Pane
}