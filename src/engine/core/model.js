import { d, isString, isEqual, isObject } from "helper/helper"
import inst from "./instances"

/**
 * A model is a class which is constructed using a corresponding config instance.
 */
class Model {

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
        config.isChild = subtype
        return {
            name,
            factory,
            config,
            subtype
        }
    }

    static createSubType(name, factory, config) {
        return this.createType(name, factory, config, true)
    }

    static newInst(type, input, options = {}) {
        return new this(input, { ...options, type })
    }

    constructor( input, options ) {

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

            if (input.id && (fetch && inst.RL.hasResource('json', input.id))) {
                fetchId = input.id
            } else {
                if (!(input instanceof type.config)) {
                    input = new type.config(input)
                }
                const id = input.getId()

                if (fetch && inst.RL.hasResource('json', id)) {
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

            if (!inst.RL.hasResource('json', fetchId))
                throw Error(`Required resource id "${fetchId}" not found`)

            input = inst.RL.getJsonResource(fetchId)
            input = new type.config(input)
            input.applyTo(this)
        }
        this.finalizeApply()
    }

    finalizeApply() {}

    get typeName() {
        return this._type.name
    }

    get isChild() {
        return this._type.subtype
    }

    hasAutoId() {
        return this.id && this.id.startsWith('_auto_')
    }

    /**
     * Returns a JSON object which builds the same configuration given in the base model (or the )
     * If the deep flag is set, all dependent resources will also be represented as rebuild JSON, otherwise
     * dependent resources will only be linked via ids.
     *
     * @param {boolean}  deep
     *
     * @returns {object}
     *
     * model.getRebuildJson(deep = true, base = null)
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
     * Adds all properties to the given rebuild JSON object, which rebuild the given base model and returns it.
     * Properties holding other configurables will only be converted to rebuild JSONs when the deep flag is set,
     * otherwise these will only be referenced via their id
     *
     * @param {object} obj
     * @param {boolean} deep
     *
     * @returns {object}
     *
     * model.addRebuildProps(...)
     */
    addRebuildProps(obj, deep) {
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
    getResourcesAndDependencies() {
        return {
            resources: this.getResources(),
            dependencies: this.getDependencies()
        }
    }

    /**
     * Returns an object mapping the direct and indirect json resources of the
     * given (or initial) model to direct dependent resource ids
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
     * Adds all direct and indirect resource ids the given (or initial) model
     * is dependant from to the dependencies object and return it
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
            dependentIds.push('image:' + image.id)
        }
        const audios = this.getDependentAudio()
        for (const audio of audios) {
            if (!audio) continue
            dependentIds.push('audio:' + audio.id)
        }
        const depModels = this.getDependentModels()
        for (const depModel of depModels) {
            if (!depModel) continue
            if (!depModel.isChild) {
                dependentIds.push('json:' + depModel.id)
            }
            depModel.addDependencies(dependencies)
        }
        if (!this.isChild)
            dependencies['json:' + this.id] = dependentIds

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
     * Returns an array holding image resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @returns {array}
     */
    getImageResources(model) {
        const images = []
        this.addDependentImageResources(images)
        return images
    }

    /**
     * Returns an array holding all image resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @returns {object}
     */
    getImageResourceIds() {
        const images = []
        this.addDependentImageResources(images, true)
        return images
    }

    /**
     * Returns an array with all directly dependent image instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentImages() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant image resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
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
     * Returns an array holding all audio resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @returns {object}
     */
    getAudioResourceIds(model) {
        const ids = []
        this.addDependentAudioResources(ids, true)
        return ids
    }

    /**
     * Returns an array with all directly dependent audio instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentAudio() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant audio resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
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
     * Returns an array with all directly dependent model instances of the given model.
     * The result can include falsy values which must be filtered out (which allows to
     * return model properties here regardless if they are set or not)
     *
     * @returns {array}
     */
    getDependentModels() {
        return []
    }

    /**
     * Adds all directly and indirectly dependant model resources of the given
     * model to the given result array and returns them. If the idOnly argument is true
     * then each resource is only pushed as id, otherwise an object { id, type, data }
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
     * Returns an array holding all json resource ids which are directly or indirectly
     * dependent from the given (or inital) model
     *
     * @param {object} model
     * @returns {object}
     */
    getJsonResourceIds() {
        const ids = []
        this.addDependentJsonResources(ids, true)
        return ids
    }

    /**
     * Returns an array holding the json resources of the given (or initial) model
     * Each resource is returned as object { id, type, data }
     *
     * @returns {array}
     */
    getJsonResources(model) {
        const resources = []
        this.addDependentJsonResources(resources)
        return resources
    }

    getRebuildModel(model, deep) {
        if (!deep && !model.isChild)
            return model.id

        return model.getRebuildJson(deep)
    }

    getRebuildImage(modelImage, deep) {
        return deep ? modelImage.imageResource : modelImage.id
    }

    getClone() {
        return this.config.getModelInstance(
            this.getRebuildJson(true), {fetch: false}
        )
    }
}

function ModelFactory(name, config, subModel = false) {
    const f = function(input, options = {}) {
        let { implementation } = options
        if (implementation === undefined) {
            let def = f.default
            if (typeof def === 'function') {
                def = f.default(input, options)
            }
            implementation = def ? def : 'browser'
        }
        const impl = f.implementations[implementation]
        if (!impl)
            throw Error(`No implementation found!`)

        return d(impl.newInst(type, input, options), '<--- model')
    }
    const type = Model.createType(name, f, config, subModel)
    f.implementations = {}
    f.setDefault = value => {
        f.default = value
        return f
    }
    f.addImplementation = (cls, name = 'browser') =>  {
        f.implementations[name] = cls
        return f
    }
    return f
}

function SubModelFactory(name, config) {
    return ModelFactory(name, config, true)
}

export {
    Model,
    ModelFactory,
    SubModelFactory
}