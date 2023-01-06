import { Config } from "core/config"
import { SpriteSheet } from "../SpritePane/classes";

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
        this.spriteSheet = this.validateConfig(SpriteSheet, value)
    }

    setAxis(value) {
        this.axis = this.validateString(value, this.getFieldProp('axis'))
    }

    setMap(value) {
        this.map = this.validateArray(value)
    }

    setMin(value) {
        this.min = this.validateInt(value)
    }

    setMax(value) {
        this.max = this.validateInt(value)
    }

    applyTo(obj) {
        super.applyTo(obj)
        obj.axis = this.axis
        obj.spriteSheet = this.spriteSheet
        obj.map = this.map
        obj.min = this.min
        obj.max = this.max

        return obj
    }
}

export {
    BitmapScrollPaneConfig
}