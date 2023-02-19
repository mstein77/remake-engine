import { Model, ChildModel } from "core/classes"
import { d } from "helper/helper"

class FontMap extends Model {
    constructor(input) {
        super(input)
    }
}

class TextBlock extends ChildModel {

    update(values) {
        for (const [ key, value ] of Object.entries(values)) {
            this[key] = value
        }
    }
}

export {
    FontMap,
    TextBlock
}