import { d, isObject, without, isEqual, getClonedProp } from "helper/helper"
import { validated } from "helper/validate"
import { Model } from "./classes"

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
        this.factory = modelCls
    }

    /**
     * Creates a new configuration object and initializes it with values in the given JSON object
     *
     * @param json
     */
    constructor(json, ...params) {
        this.handleParams(...params)
        if (!isObject(json))
            throw Error('Config must be instantiated with a JSON!')

        this.fieldProps = this.getFieldProps()
        this.resolved = false
        this.parse({ ...this.getDefaultProps(), ...json })
    }

    handleParams() {}

    /**
     * Returns an object holding all defaults for properties which should be used when they are missing in the
     * JSON object which is passed to the constructor
     *
     * @returns {object}
     */
    getDefaults() {
        return {}
    }

    getDefaultProps() {
        const props = {}
        const defaults = this.getDefaults()
        for (const [ key, value ] of Object.entries(defaults)) {
            if (value === undefined) continue
            props[key] = value
        }
        return props
    }

    getMandatoryKeys() {
        const keys = []
        const defaults = this.getDefaults()
        for (const [ key, value ] of Object.entries(defaults)) {
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
            for (let [ key, value ] of Object.entries(json)) {
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
     * Finalizes the configuration before it is sealed
     */
    finalize() {}

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
        if (!this.isEditable()) {
            this.resolve()
        }
        if (Config.storeInModel) model.config = this
        model.id = this.id
        this.applyPropsTo(model)
        return model
    }

    getModelInstance(input) {
        if (!this.constructor.factory)
            throw Error(`Missing model factory method in config ${this.constructor.name}`)

        return new this.constructor.factory(input ? input : this)
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
        const keys = without(Object.keys(this.getDefaults()), except)
        for (const key of keys) {
            obj[key] = getClonedProp(this[key])
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

    /**
     * Sets the configuration to resolved and freezes it
     * Throws an exception if no id was set
     */
    resolve() {
        if (!this.id) {
            if (!this.getAutoId)
                throw Error(`Missing mandatory key "id" in config`)
            this.id = this.getAutoId()
        }

        if (Object.isFrozen(this)) return

        this.finalize()
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

    /**
     * Deletes all properties from the given model which have the default as value
     *
     * @param {object} model
     * @returns {object}
     *
     */
    removeDefaults(model) {
        const defaults = this.getDefaultProps()
        for (const [ key, value ] of Object.entries(defaults)) {
            if (key in model && isEqual(value, model[key])) {
                delete model[key]
            }
        }
        return model
    }

    /**
     * Returns a JSON object which builds the same configuration given in the base model (or the )
     * If the deep flag is set, all dependent resources will also be represented as rebuild JSON, otherwise
     * dependent resources will only be linked via ids.
     *
     * @param {boolean}  deep
     * @param {object} base
     *
     * @returns {object}
     *
     * model.getRebuildJson(deep = true, base = null)
     */
    getRebuildJson(deep = true, base = null) {
        if (base === null) {
            base = this.getJson()
        }
        const obj = {id: base.id}
        this.addRebuildProps(obj, deep, base)
        return this.removeDefaults(obj)
    }

    /**
     * Adds all properties to the given rebuild JSON object, which rebuild the given base model and returns it.
     * Properties holding other configurables will only be converted to rebuild JSONs when the deep flag is set,
     * otherwise these will only be referenced via their id
     *
     * @param {object} obj
     * @param {boolean} deep
     * @param {object} base
     *
     * @returns {object}
     *
     * model.addRebuildProps(...)
     */
    addRebuildProps(obj, deep, base) {
        return obj
    }

    /**
     * Returns an object holding all resources under the "resources" key and all
     * dependencies under the "dependencies" for the given (or initial) model.
     *
     * Resources are returned as objects { id, type, data } and dependencies are
     * given as resource pair strings "<type>:<id>"
     *
     * @param {object} model
     *
     * @returns {object}
     */
    getResourcesAndDependencies(model) {
        return {
            resources: this.getResources(model),
            dependencies: this.getDependencies(model)
        }
    }

    /**
     * Returns the given model when its an object or returns the initial model if no model is given.
     * Throws an error if the model is no object
     *
     * @param model
     * @returns {Object|*}
     */
    validatedModel(model) {
        if (!model) return this.getJson()
        if (!isObject(model))
            throw Error(`Expected an object as model but got ${typeof model}`)
        return model
    }

    /**
     * Returns an object mapping the direct and indirect json resources of the
     * given (or initial) model to direct dependent resource ids
     *
     * Each resource is returned as resource pair string "<type>:<id>"
     *
     * @param {object} model
     *
     * @returns {object}
     */
    getDependencies(model) {
        model = this.validatedModel(model)
        const dependencies = {}
        this.addDependencies(model, dependencies)
        return dependencies
    }

    /**
     * Adds all direct and indirect resource ids the given (or initial) model
     * is dependant from to the dependencies object and return it
     *
     * Each resource is returned as resource pair string "<type>:<id>"
     *
     * @param {object} model
     * @param {object} dependencies
     *
     * @returns {object}
     */
    addDependencies(model, dependencies) {
        const dependentIds = []
        const isChildConfig = this instanceof ChildConfig
        const images = this.getDependentImages(model)
        for (const image of images) {
            if (!image) continue
            dependentIds.push('image:' + image.id)
        }
        const audios = this.getDependentAudio(model)
        for (const audio of audios) {
            if (!audio) continue
            dependentIds.push('audio:' + audio.id)
        }
        const depModels = this.getDependentModels(model)
        for (const depModel of depModels) {
            if (!depModel) continue
            if (!(depModel.config instanceof ChildConfig)) {
                dependentIds.push('json:' + depModel.id)
            }
            depModel.config.addDependencies(depModel, dependencies)
        }
        if (!isChildConfig)
            dependencies['json:' + model.id] = dependentIds

        return dependencies
    }

    /**
     * Returns an array holding all resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getResources(model) {
        model = this.validatedModel(model)
        const resources = []
        this.addDependentImageResources(resources, model)
        this.addDependentAudioResources(resources, model)
        this.addDependentJsonResources(resources, model)
        return resources
    }

    /**
     * Returns an array holding image resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getImageResources(model) {
        model = this.validatedModel(model)
        const images = []
        this.addDependentImageResources(images, model)
        return images
    }

    /**
     * Returns an array holding all image resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @param {object} model
     * @returns {object}
     */
    getImageResourceIds(model) {
        model = this.validatedModel(model)
        const images = []
        this.addDependentImageResources(images, model, true)
        return images
    }

    /**
     * Returns an array with all directly dependent image instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getDependentImages(model) {
        return []
    }

    /**
     * Adds all directly and indirectly dependant image resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {object} model
     * @param {boolean} idOnly
     */
    addDependentImageResources(result, model, idOnly = false) {
        const images = this.getDependentImages(model)
        for (const image of images) {
            if (!image || !image.id || image.isEmpty()) continue
            if (idOnly) {
                result.push(image.id)
            } else {
                result.push({ id: image.id, data: image, type: 'image' })
            }
        }
        const depModels = this.getDependentModels(model)
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.config.addDependentImageResources(result, depModel, idOnly)
        }
    }

    /**
     * Returns an array holding all audio resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @param {object} model
     * @returns {object}
     */
    getAudioResourceIds(model) {
        model = this.validatedModel(model)
        const ids = []
        this.addDependentAudioResources(ids, model, true)
        return ids
    }

    /**
     * Returns an array with all directly dependent audio instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getDependentAudio(model) {
        return []
    }

    /**
     * Adds all directly and indirectly dependant audio resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {object} model
     * @param {boolean} idOnly
     */
    addDependentAudioResources(result, model, idOnly = false) {
        const audios = this.getDependentAudio(model)
        for (const audio of audios) {
            if (!audio) continue
            if (idOnly) {
                result.push(audio.id)
            } else {
                const { id, data } = audio
                result.push({ id, data, type: 'audio' })
            }

        }
        const depModels = this.getDependentModels(model)
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.config.addDependentAudioResources(result, depModel, idOnly)
        }
    }

    /**
     * Returns an array with all directly dependent model instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getDependentModels(model) {
        return []
    }

    /**
     * Adds all directly and indirectly dependant model resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {object} model
     * @param {boolean} idOnly
     */
    addDependentJsonResources(result, model, idOnly = false) {
        if (!(model.config instanceof ChildConfig)) {
            result.push(
                idOnly ? model.id : {
                    id: model.id,
                    type: 'json',
                    data: this.getRebuildJson(false, model)
                }
            )
        }
        const depModels = this.getDependentModels(model)
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.config.addDependentJsonResources(result, depModel, idOnly)
        }
    }

    /**
     * Returns an array holding all json resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @param {object} model
     * @returns {object}
     */
    getJsonResourceIds(model) {
        model = this.validatedModel(model)
        const ids = []
        this.addDependentJsonResources(ids, model, true)
        return ids
    }

    /**
     * Returns an array holding the json resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @param {object} model
     *
     * @returns {array}
     */
    getJsonResources(model) {
        model = this.validatedModel(model)
        const resources = []
        this.addDependentJsonResources(resources, model)
        return resources
    }

    getRebuildModel(model, deep) {
        if (!deep && !(model.config instanceof ChildConfig))
            return model.id

        return model.config.getRebuildJson(deep, model)
    }

    getRebuildImage(modelImage, deep) {
        return deep ? modelImage.imageResource : modelImage.id
    }

    // TODO: move these to the model

    /**
     * Returns a JSON object which represents the current configuration
     *
     * @returns {object}
     *
     * model.getInitialJson() => this.config.applyTo({})
     *
     */
    getJson() {
        const obj = this.applyTo({})
        return obj
    }

    // model.getClone()
    getClonedModel(model) {
        return this.getModelInstance(
            this.getRebuildJson(true, model)
        )
    }
}
Config.storeInModel = true

class ChildConfig extends Config {

    constructor(input, parent) {
        super(input, parent)
        if (!this.parent)
            throw Error(`The childConfig "${this.constructor.name}" must be instantiated with the parent config as second parameter`)
    }

    handleParams(parent) {
        this.parent = parent
    }
}

export {
    ChildConfig,
    Config
}