import { Config } from "core/config";

class LinearGradientPaneConfig extends Config {

    getDefaults() {
        return {
            colorStops: [],
            axis: 'Y'
        }
    }

    getFieldProps() {
        return {
            axis: {values: ['X', 'Y']}
        }
    }

    setAxis(value) {
        this.axis = this.validateString(value, this.getFieldProp('axis'))
    }

    setColorStops(value) {
        this.colorStops = this.validateColorStops(value)
    }

    validateColorStops(value) {
        this.validateArray(value)
        if (value.length % 2 == 0) {
            throw Error('ColorStops need to be in the format: [<color>, <len>, <color>, ..., <len>, <color>]')
        }
        const colorStops = []
        for (let i = 0; i < value.length; i += 2) {
            colorStops.push([value[i], (i === value.length - 1) ? 0 : value[i + 1]])
        }
        return colorStops
    }

    applyTo(obj) {
        super.applyTo(obj)
        obj.axis = this.axis
        obj.colorStops = this.colorStops

        return obj
    }
}

export {
    LinearGradientPaneConfig
}