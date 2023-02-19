import { Configurable } from "core/classes"
import { d } from "helper/helper"

class FontMap extends Configurable {
    constructor(input) {
        super(input)
    }
}

class TextBlock extends Configurable {

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