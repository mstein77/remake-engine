import { Config } from "core/config";

class PatternPaneConfig extends Config {

    getDefaults() {
        return {
            image: undefined,
            repeat: 'repeat'
        }
    }

    getFieldProps() {
        return {
            repeat: {values: ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'], null: true}
        }
    }

    setImage(value) {
        this.image = this.validateImageResource(value)
    }

    setRepeat(value) {
        this.repeat = this.validateString(value, this.getFieldProp('repeat'))
    }

    applyTo(obj) {
        super.applyTo(obj)
        obj.image = this.image
        obj.repeat = this.repeat

        return obj
    }
}

export {
    PatternPaneConfig
}