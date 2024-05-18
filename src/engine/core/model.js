import { d, isString, isEqual, isObject } from "helper/helper"
import inst from "./instances"
import { id2audioTid, id2imageTid, id2jsonTid } from "shared/resources.cjs"

/**
 * A model is a class which is constructed using a corresponding config instance. It can be linked to dependant models
 * and resources and also can be persisted via a configuration JSON object that allows to rebuild the model at any time
 */
class Model {

    /**
     * Returns a new model type object with the given name and links its factory method and config class. Also registers
     * the model and its type in the pane registry if the model represents a pane.
     *
     * @param {object|string} nameOrInfo
     * @param {function} factory
     * @param {object} config
     * @param {boolean} subtype
     * @returns {object}
     */
    static createType(nameOrInfo, factory, config, subtype = false) {
        if (isString(nameOrInfo)) {
            nameOrInfo = { name: nameOrInfo }
        }
        const { name } = nameOrInfo
        if (!name)
            throw Error(`Name required for creating a new model type but not given!`)

        if (name.endsWith('Pane'))
            inst.paneRegistry.add(name, factory, {editable: !!nameOrInfo.editor})

        factory.Config = config
        config.factory = factory
        config.typeName = name
        return {
            name,
            factory,
            config,
            subtype
        }
    }

    /**
     * Returns a new instance of this model with the given type, input and options
     *
     * @param {object} type
     * @param {string|object} input
     * @param {object} options
     *
     * @returns {Model}
     */
    static newInst(type, input, options = {}) {
        return new this(input, { ...options, type })
    }

    /**
     * Constructs a new model based on the input argument and the given options. The input can be a string holding
     * the id of a JSON resource which was resolved by the resource loader before. An instance of a configuration or
     * a JSON configuration object, which will be used to instantiate a new configuration. The options object must have
     * the type property with the model type object and can also have fetch property which should be set to false if
     * the resource loader should not be asked for a loaded configuration with the same id
     *
     * @param {string|object} input
     * @param {object} options
     */
    constructor(input, options) {
        let { fetch = true, type } = options
        this._type = type

        if (this.isChild) {
            const { parent } = options
            if (!parent)
                throw Error(`A child model must be instantiated with a parent model but no was given`)

            this.parent = parent
            fetch = false
        }
        let fetchId = null
        if (isString(input)) {
            fetchId = input
        } else {
            if (!isObject(input))
                throw Error(`Cannot instantiate model ${this.constructor.name}`)

            if (input.id && (fetch && inst.RL.hasJson(input.id))) {
                fetchId = input.id
            } else {
                if (!(input instanceof type.config)) {
                    input = new type.config(input)
                }
                const id = input.getId()

                if (fetch && inst.RL.hasJson(id)) {
                    fetchId = id
                    input.clear()
                } else {
                    input.applyTo(this)
                }
            }
        }
        if (fetchId !== null) {
            if (!fetch)
                throw Error(`Instantiation doesn't allow loading resource id "${fetchId}"`)

            if (!inst.RL.hasJson(fetchId))
                throw Error(`Required resource id "${fetchId}" not found`)

            input = inst.RL.getJson(fetchId)
            input = new type.config(input)
            input.applyTo(this)
        }
        this.finalizeApply()
    }

    /**
     * This method is called after the configuration was applied to this model to allow to set additional properties
     * which are not part of the configuration
     */
    finalizeApply() {}

    /**
     * Returns the type name of this model
     *
     * @returns {string}
     */
    get typeName() {
        return this._type.name
    }

    /**
     * Returns whether this model is a composite child of another model or not. If true it means that this model
     * can not exist without its parent
     *
     * @returns {boolean}
     */
    get isChild() {
        return this._type.subtype
    }

    /**
     * Returns whether this model has an id assigned and if this id was assigned automatically or not
     *
     * @returns {boolean}
     */
    hasAutoId() {
        return !!(this.id && this.id.startsWith('_auto_'))
    }

    /**
     * Returns a JSON object which builds a configuration representing the current model state.
     * If the deep flag is set, all dependent resources will also be represented as rebuild JSON, otherwise
     * dependent models and resources will only be linked via ids.
     *
     * @param {boolean} deep
     *
     * @returns {object}
     */
    getRebuildJson(deep = true) {
        const obj = {id: this.id, version: this.config.getVersion() }
        this.addRebuildProps(obj, deep)

        // remove defaults
        const defaults = this.config.getDefaultProps()
        for (const [ key, value ] of Object.entries(defaults)) {
            if (key in obj && isEqual(value, obj[key])) {
                delete obj[key]
            }
        }
        return obj
    }

    /**
     * Adds all properties to the given rebuild JSON object, which rebuild the current model and returns it.
     * Properties holding other models or resources will only be converted to rebuild JSONs when the deep flag is set,
     * otherwise these will only be referenced via their id
     *
     * @param {object} obj
     * @param {boolean} deep
     *
     * @returns {object}
     */
    addRebuildProps(obj, deep) {
        return obj
    }

    /**
     * Returns an object holding all resources of this model under the "resources" key and all dependencies under the
     * "dependencies" key
     *
     * Resources are returned as objects { id, type, data } and dependencies are given as resource pair strings
     * "<type>:<id>"
     *
     * @param {object} model
     *
     * @returns {object}
     */
    getResourcesAndDependencies(forTransport = false) {
        const resources = this.getResources()
        if (forTransport) {
            for (const resource of resources) {
                if (resource.type !== 'image') continue
                resource.data = resource.data.dataUrl
            }
        }
        return {
            resources,
            dependencies: this.getDependencies()
        }
    }

    /**
     * Returns an object mapping the direct and indirect json resources of this model to direct dependent resource ids
     *
     * Each resource is returned as resource pair string "<type>:<id>"
     *
     * @returns {object}
     */
    getDependencies() {
        const dependencies = {}
        this.addDependencies(dependencies)
        return dependencies
    }

    /**
     * Adds all direct and indirect resource ids this model is dependant from to the dependencies object and returns it
     *
     * Each resource is returned as resource pair string "<type>:<id>"
     *
     * @param {object} dependencies
     *
     * @returns {object}
     */
    addDependencies(dependencies) {
        const dependentIds = []
        const images = this.getDependentImages()
        for (const image of images) {
            if (!image) continue
            dependentIds.push(id2imageTid(image.id))
        }
        const audios = this.getDependentAudio()
        for (const audio of audios) {
            if (!audio) continue
            dependentIds.push(id2audioTid(audio.id))
        }
        const depModels = this.getDependentModels()
        for (const depModel of depModels) {
            if (!depModel) continue
            if (!depModel.isChild) {
                dependentIds.push(id2jsonTid(depModel.id))
            }
            depModel.addDependencies(dependencies)
        }
        if (!this.isChild)
            dependencies[id2jsonTid(this.id)] = dependentIds

        return dependencies
    }


    /**
     * Returns an array holding all resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @returns {array}
     */
    getResources() {
        const resources = []
        this.addDependentImageResources(resources)
        this.addDependentAudioResources(resources)
        this.addDependentJsonResources(resources)

        return resources
    }

    /**
     * Returns an array holding image resources of this model. Each resource is returned as object { id, type, data }
     *
     * @returns {array}
     */
    getImageResources() {
        const images = []
        this.addDependentImageResources(images)

        return images
    }

    /**
     * Returns an array holding all image resource ids which are directly or indirectly dependent from this model
     *
     * @returns {array}
     */
    getImageResourceIds() {
        const images = []
        this.addDependentImageResources(images, true)

        return images
    }

    /**
     * Returns an array with all directly dependent image instances of this model. The result can include falsy values
     * which must be filtered out (which allows to return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentImages() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant image resources of this model to the given result array and returns
     * them. If the idOnly argument is true then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {boolean} idOnly
     */
    addDependentImageResources(result, idOnly = false) {
        const images = this.getDependentImages()
        for (const image of images) {
            if (!image || !image.id || image.isEmpty()) continue
            if (idOnly) {
                result.push(image.id)
            } else {
                result.push({ id: image.id, data: image, type: 'image' })
            }
        }
        const depModels = this.getDependentModels()
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.addDependentImageResources(result, idOnly)
        }
    }

    /**
     * Returns an array holding all audio resource ids which are directly or indirectly dependent from this model
     *
     * @returns {object}
     */
    getAudioResourceIds() {
        const ids = []
        this.addDependentAudioResources(ids, true)
        return ids
    }

    /**
     * Returns an array with all directly dependent audio instances of this model. The result can include falsy values
     * which must be filtered out (which allows to return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentAudio() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant audio resources of this model to the given result array and returns
     * them. If the idOnly argument is true then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {boolean} idOnly
     */
    addDependentAudioResources(result, idOnly = false) {
        const audios = this.getDependentAudio()
        for (const audio of audios) {
            if (!audio) continue
            if (idOnly) {
                result.push(audio.id)
            } else {
                const { id, data } = audio
                result.push({ id, data, type: 'audio' })
            }
        }
        const depModels = this.getDependentModels()
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.addDependentAudioResources(result, idOnly)
        }
    }

    /**
     * Returns an array with all directly dependent model instances of this model. The result can include falsy values
     * which must be filtered out (which allows to return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentModels() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant model resources of this model to the given result array and returns
     * them. If the idOnly argument is true then each resource is only pushed as id, otherwise an object { id, type, data }
     *
     * @param {array} result
     * @param {boolean} idOnly
     */
    addDependentJsonResources(result, idOnly = false) {
        if (!this.isChild) {
            result.push(
                idOnly ? this.id : {
                    id: this.id,
                    type: 'json',
                    data: this.getRebuildJson(false)
                }
            )
        }
        const depModels = this.getDependentModels()
        for (const depModel of depModels) {
            if (!depModel) continue
            depModel.addDependentJsonResources(result, idOnly)
        }
    }

    /**
     * Returns an array holding all json resource ids which are directly or indirectly dependent from this model
     *
     * @param {object} model
     *
     * @returns {object}
     */
    getJsonResourceIds() {
        const ids = []
        this.addDependentJsonResources(ids, true)

        return ids
    }

    /**
     * Returns an array holding the json resources of this model. Each resource is returned as object { id, type, data }
     *
     * @returns {array}
     */
    getJsonResources() {
        const resources = []
        this.addDependentJsonResources(resources)

        return resources
    }

    /**
     * Returns a rebuild json for the given model or a string with the model id if the deep flag is not set or the model
     * is a child
     *
     * @param {object} model
     * @param {boolean} deep
     * @returns {string|object}
     */
    getRebuildModel(model, deep) {
        if (!deep && !model.isChild)
            return model.id

        return model.getRebuildJson(deep)
    }

    /**
     * Returns a new image resource object for the given AppliedImage or a string with the image id if the deep flag is
     * not set
     *
     * @param {object} modelImage
     * @param {boolean} deep
     * @returns {string|object}
     */
    getRebuildImage(modelImage, deep) {
        return deep ? modelImage.imageResource : modelImage.id
    }

    /**
     * Returns a new instance of this model with the current state
     *
     * @returns {object}
     */
    getClone() {
        return this.config.getModelInstance(
            this.getRebuildJson(true), {fetch: false}
        )
    }
}

/**
 * Creates a new model type for the given configuration and returns a factory function for this model.
 * The first argument can also be a model description object which must have a name property and the subModel
 * flag indicates whether the models of this factory will be child models or not.
 *
 *
 * @param {string|object} name
 * @param {object} config
 * @param {boolean} subModel
 *
 * @returns {function}
 */
function ModelFactory(name, config, subModel = false) {
    const factory = function(input, options = {}) {
        let { implementation } = options
        if (implementation === undefined) {
            let def = factory.default
            if (typeof def === 'function') {
                def = factory.default(input, options)
            }
            implementation = def ? def : 'browser'
        }
        const impl = factory.implementations[implementation]
        if (!impl)
            throw Error(`No implementation found with name "${implementation}"!`)

        return impl.newInst(type, input, options)
    }
    const type = Model.createType(name, factory, config, subModel)
    factory.implementations = {}
    factory.setDefault = value => {
        factory.default = value
        return factory
    }
    factory.addImplementation = (cls, name = 'browser') =>  {
        factory.implementations[name] = cls
        return factory
    }
    return factory
}

/**
 * Shorthand function to create and return ModelFactory for a sub model which is a child of another model
 * @see ModelFactory
 *
 * @param {string|object} name
 * @param {object} config
 */
function SubModelFactory(name, config) {
    return ModelFactory(name, config, true)
}

export {
    Model,
    ModelFactory,
    SubModelFactory
}