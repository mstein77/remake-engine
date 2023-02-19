import { Config } from "core/config"
import { validated } from "helper/validate"
import { AppliedImage } from "core/classes"

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
        this.image = validated.imageResource(value)
    }

    setRepeat(value) {
        this.repeat = validated.string(value, this.getFieldProp('repeat'))
    }

    getDependentImages(model) {
        return [model.image]
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
        model.image = new AppliedImage(this.image)
    }
}

export {
    PatternPaneConfig
}