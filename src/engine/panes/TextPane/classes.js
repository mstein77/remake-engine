import { getConfigFromInput } from "helper/helper"
import { FontMapConfig } from "./config.js"

class FontMap {

    constructor(input) {
        this.config = getConfigFromInput(FontMap.Config, input)
        this.config.applyTo(this)
    }
}

class TextBlock {

    constructor(input) {
        this.config = getConfigFromInput(TextBlock.Config, input)
        this.config.applyTo(this)
    }

    update(values) {
        this.config.parse(values)
        this.config.applyTo(this)
    }
}

export {
    FontMap,
    TextBlock
}