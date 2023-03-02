import { d, isObject, without, getClonedProp, toKeys, toPairs } from "helper/helper"
import { validated } from "helper/validate"
import { ChildModel } from "./model"
import inst from "./instances"

/**
 * Represents a configuration object of a configurable model. Validates and parses the configuration and
 * initializes a model with this configuration. Also allows to rebuild a JSON configuration object based on a
 * given model.
 *
 * The configuration will be sealed and finalized once the configuration is applied to a model for the first time.
 *
 */
class Config {

    static linkTo(modelCls) {
        modelCls.Config = this
        this.isChild = modelCls.prototype instanceof ChildModel
        this.factory = modelCls
    }

    /**
     * Creates a new configuration object and initializes it with values in the given JSON object
     *
     * @param json
     */
    constructor(json) {
        if (!isObject(json))
            throw Error('Config must be instantiated with a JSON!')

        this.fieldProps = this.getFieldProps()
        this.resolved = false

        const compJson = this.getCompatibleJson(json)

        this.parse({ ...this.getDefaultProps(), ...compJson })
    }

    getVersion() {
        // TODO use engine version here by default
        return '1.0.0'
    }

    getCompatibleJson(json) {
        return json
    }

    /**
     * Returns an object holding all defaults for properties which should be used when they are missing in the
     * JSON object which is passed to the constructor
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
                    d(value)
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
        if (!this.isEditable()) {
            this.resolve()
        }
        if (Config.storeInModel) model.config = this
        model.id = id
        this.applyPropsTo(model)
        return model
    }

    clear() {
        const keys = toKeys(this.getDefaults())
        for (const key of keys) delete this[key]
    }

    getInitialModelInstance(options) {
        return this.getModelInstance(this, options)
    }

    getModelInstance(input, options) {
        if (!this.constructor.factory)
            throw Error(`Missing model factory method in config ${this.constructor.name}`)

        return new this.constructor.factory(input, options)
    }

    /**
     * Applies the current configuration props to the given model
     *
     * @param obj
     */
    applyPropsTo(model) {}

    /**
     * Applies all properties which have a default to the given object by using the
     * value of the same property from "this". The second argument allows to skip
     * certain default keys. Returns the object with default keys applied
     *
     * @param {object} obj
     * @param {array} except
     *
     * @returns {object}
     */
    applyDefaultKeysTo(obj, except = []) {
        const keys = without(toKeys(this.getDefaults()), except)
        for (const key of keys) {
            obj[key] = getClonedProp(this[key], obj)
        }
        return obj
    }

    /**
     * Returns a string holding the class name of this configuration
     *
     * @returns {string}
     */
    getType() {
        return Object.getPrototypeOf(this).constructor.name
    }

    /**
     * Freezes the given JSON object so that no more changes can be made and returns it
     *
     * @param {object} obj
     *
     * @returns {object}
     */
    freezeDeep(obj) {
        return Object.freeze(obj)
    }

    getAutoId() {
        return '_auto_' + inst.autoIds.getNewId(this.constructor.factory.name)
    }

    getId() {
        if (!this.id) {
            this.id = this.getAutoId()
            if (!this.id)
                throw Error(`Missing mandatory key "id" in config`)
        }
        return this.id
    }

    /**
     * Sets the configuration to resolved and freezes it
     * Throws an exception if no id was set
     */
    resolve() {
        if (Object.isFrozen(this)) return

        const mandatoryKeys = this.getMandatoryKeys()
        for (const key of mandatoryKeys) {
            if (!(key in this))
                throw Error(`Missing mandatory config key "${key}" was not set`)
        }
        this.resolved = true;
        this.freezeDeep(this)
    }

    /**
     * Returns a boolean indicating whether the configuration has been resolved (means applied) or not
     *
     * @returns {boolean}
     */
    isResolved() {
        return this.resolved
    }

    /**
     * Returns whether the configuration should be editable after its applied to an object or not
     *
     * @returns {boolean}
     */
    isEditable() {
        // TODO remove?
        return false
    }
}
Config.storeInModel = true

export {
    Config
}