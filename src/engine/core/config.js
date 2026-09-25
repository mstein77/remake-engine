import { d, isObject, without, toKeys, toPairs, isArray } from "helper/helper"
import { validated } from "helper/validate"
import { AppliedImage } from "core/classes"
import { ImageResource } from "core/resources"
import inst from "./instances"

const getClonedProp = (value, parent) => {
    if (isArray(value)) {
        const result = []
        for (const item of value) {
            result.push(getClonedProp(item, parent))
        }
        return result
    }
    if (isObject(value)) {
        if (value instanceof Config)
            return value.getInitialModelInstance({ parent })

        if (value instanceof ImageResource)
            return new AppliedImage(value)

        const result = {}
        for (const [ key, subValue ] of Object.entries(value)) {
            result[key] = getClonedProp(subValue, parent)
        }
        return result
    }
    return value
}

/**
 * Represents a configuration object of a model. Validates and parses the configuration and initializes a model with
 * this configuration. The configuration will be sealed and finalized once the configuration is applied to a model for
 * the first time.
 *
 * @class Config
 */
class Config {

    /**
     * Creates a new configuration object and initializes it with values in the given JSON object
     *
     * @param json
     */
    constructor(json) {
        if (!isObject(json))
            throw Error('Config must be instantiated with a JSON!')

        this.fieldProps = this.getFieldProps()
        const compJson = this.getCompatibleJson(json)

        this.parse({ ...this.getDefaultProps(), ...compJson })
    }

    /**
     * Returns a string holding the current version number of the configuration
     *
     * @returns {string}
     */
    getVersion() {
        // TODO use engine version here by default
        return '1.0.0'
    }

    /**
     * Returns a compatible version of the given json configuration object. This method should be used to transform
     * configurations from lower versions to the current one if necessary
     *
     * @param {object} json
     * @returns {object}
     */
    getCompatibleJson(json) {
        return json
    }

    /**
     * Returns an object holding all defaults for properties which should be used when they are missing in the
     * JSON object which is passed to the constructor. Mandatory properties which have no default value should be set
     * to undefined here to trigger an exception when the configuration is applied to the model
     *
     * @returns {object}
     */
    getDefaults() {
        return {}
    }

    /**
     * Returns an object with all default properties which have a defined value
     *
     * @returns {object}
     */
    getDefaultProps() {
        const props = {}
        const defaults = this.getDefaults()
        for (const [ key, value ] of toPairs(defaults)) {
            if (value === undefined) continue
            props[key] = value
        }
        return props
    }

    /**
     * Returns an array with all default property names which the value undefined and thus are mandatory
     *
     * @returns {array}
     */
    getMandatoryKeys() {
        const keys = []
        const defaults = this.getDefaults()
        for (const [ key, value ] of toPairs(defaults)) {
            if (value !== undefined) continue
            keys.push(key)
        }
        return keys
    }

    /**
     * Returns an array which holds the properties of the given JSON object split over multiple to JSON to
     * allow the parsing some properties before others
     *
     * @param {object} json
     *
     * @returns {array}
     */
    getJsonsToParse(json) {
        return [json]
    }

    /**
     * Validates and sets the properties of the given JSON object by calling the setter method of the property.
     * Throw an error when the validation of a property fails
     *
     * @param {object} json
     */
    parse(json) {
        if (json.id) this.setId(json.id)

        const jsons = this.getJsonsToParse(json)
        for (let json of jsons) {
            for (let [ key, value ] of toPairs(json)) {
                if (value === undefined) continue
                const setKey = 'set' + key[0].toUpperCase() + key.substring(1)
                if (!this[setKey]) continue
                try {
                    this[setKey](value);
                } catch (e) {
                    throw Error(`[${this.constructor.name}] Error setting config key "${key}": ${e.message}`)
                }
            }
        }
    }

    /**
     * Returns an object holding validation properties for certain fields
     *
     * @returns {object}
     */
    getFieldProps() {
        return {}
    }

    /**
     * Returns an object holding the validation properties for the given field and overwrites it with
     * the properties from the second argument
     *
     * @param {string} field
     * @param {object} add
     *
     * @returns {object}
     */
    getFieldProp(field, add = {}) {
        const props = this.fieldProps[field] ? this.fieldProps[field] : {}
        return { ...props, ...add }
    }

    /**
     * Sets the id property to the given value. Throws an error if the validation fails
     *
     * @param value
     */
    setId(value) {
        this.id = validated.id(value)
    }

    /**
     * Applies the current config to the given model object and freezes the config when this configuration is not editable.
     * Returns the given model with the configuration applied to it
     *
     * @param {object} model
     *
     * @returns {object}
     */
    applyTo(model) {
        const id = this.getId()
        this.checkAndFreeze()
        if (Config.storeInModel) model.config = this
        model.id = id
        this.applyPropsTo(model)
        return model
    }

    /**
     * Deletes all properties which are given in the defaults object from this configuration. Only works if the
     * configuration was not applied to a model before
     */
    clear() {
        const keys = toKeys(this.getDefaults())
        for (const key of keys) delete this[key]
    }

    /**
     * Returns a new model instance with this configuration and the given options.
     * Throws an exception if no factory was linked to this configuration
     *
     * @param {object} options
     *
     * @returns {object}
     */
    getInitialModelInstance(options) {
        return this.getModelInstance(this, options)
    }

    /**
     * Returns a new model instance with the given input and options from the model factory linked to this
     * configuration. Throws an exception if no factory was linked to this configuration
     *
     * @param {string|object} input
     * @param {object} options
     *
     * @returns {object}
     */
    getModelInstance(input, options) {
        if (!this.constructor.factory)
            throw Error(`Missing model factory method in config ${this.constructor.name}`)

        return this.constructor.factory(input, options)
    }

    /**
     * Applies the current configuration props to the given model
     *
     * @param {object} obj
     */
    applyPropsTo(model) {}

    /**
     * Applies all properties which have a default to the given object by using the
     * value of the same property from "this". The second argument allows to skip
     * certain default keys. Returns the object with default keys applied
     *
     * @param {object} obj
     * @param {array} except
     */
    applyDefaultKeysTo(obj, except = []) {
        const keys = without(toKeys(this.getDefaults()), except)
        for (const key of keys) {
            obj[key] = getClonedProp(this[key], obj)
        }
    }

    /**
     * Returns a string holding the class name of this configuration
     *
     * @returns {string}
     */
    getModelType() {
        return this.constructor.typeName
    }

    /**
     * Returns a new automatically generated id which is used when no id was given in the configuration
     *
     * @returns {string}
     */
    getNewAutoId() {
        return '_auto_' + inst.autoIds.getNewId(this.getModelType())
    }

    /**
     * Returns the id given in the configuration or automatically generates a new one if none was set before
     * Throws an exception if there is no id after the auto generation
     *
     * @returns {string}
     */
    getId() {
        if (!this.id) {
            this.id = this.getNewAutoId()
            if (!this.id)
                throw Error(`Missing mandatory key "id" in config`)
        }
        return this.id
    }

    /**
     * Checks and freezes the configuration if this was not done before.
     * Throws an exception if no id was set or if mandatory properties were not set before
     */
    checkAndFreeze() {
        if (Object.isFrozen(this)) return

        const mandatoryKeys = this.getMandatoryKeys()
        for (const key of mandatoryKeys) {
            if (!(key in this))
                throw Error(`Missing mandatory config key "${key}" was not set`)
        }
        Object.freeze(this)
    }
}
Config.storeInModel = true

export {
    Config
}