import { Config } from "core/config"
import { SpriteSheet } from "../SpritePane/classes"
import { validated } from "helper/validate"
import { d } from "helper/helper"

class BitmapScrollPaneConfig extends Config {

    getDefaults() {
        return {
            spriteSheet: undefined,
            map: [],
            axis: 'X',
            min: 0,
            max: 100
        }
    }

    getFieldProps() {
        return {
            axis: {values: ['X', 'Y']}
        }
    }

    setSpriteSheet(value) {
        this.spriteSheet = validated.config(SpriteSheet, value)
    }

    setAxis(value) {
        this.axis = validated.string(value, this.getFieldProp('axis'))
    }

    setMap(value) {
        this.map = validated.array(value)
    }

    setMin(value) {
        this.min = validated.int(value)
    }

    setMax(value) {
        this.max = validated.int(value)
    }

    applyPropsTo(obj) {
        this.applyDefaultKeysTo(obj)
    }

    getDependentModels(model) {
        return [
            model.spriteSheet
        ]
    }
}

export {
    BitmapScrollPaneConfig
}