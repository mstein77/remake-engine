import { d, isObject, isUrl, isDataUrl } from "helper/helper"

/**
 * @class ResourceProvider
 *
 * Base class for storing resource by passing them as JSON object to the constructor or
 * by calling one of the add methods which allow chaining. All stored resources can be returned
 * as JSON object
 *
 */
class ResourceProvider {

    /**
     * Creates a new provider which is initialized with the resources given in the passed JSON object.
     *
     * @param resources
     */
    constructor(resources) {
        this.id2content = {}
        this.addObject(resources)
    }

    /**
     * Returns the key under which the resources will be returned in the resources JSON
     */
    get key() {
        throw Error(`No key given in ResourceProvider`)
    }

    /**
     * Throws an error if the given id cannot be used as new id
     *
     * @param string id
     */
    validateNewId(id) {
        if (typeof id !== 'string') throw Error(`Resource id must be a string but got type "${typeof id}"`)
        if (id in this.id2content) throw Error(`Resource id "${id}" already exists`)
        if (id === '') throw Error('Resource id cannot be empty')
        if (!id.match(/^([0-9a-z_\-]+\/)*([0-9a-z\-_]+\.)*[0-9a-z\-_]+$/i)) throw Error(`Invalid id "${id}" given!`)
    }

    /**
     * Throws an error if the given content is no valid resource data
     *
     * @param {mixed} content
     */
    validateContent(content) {}

    /**
     * Validates the given resource content and returns it when the content is no function.
     * Returns function which validates and returns the content if the argument is a function
     *
     * @param {mixed} content
     * @returns {midex}
     */
    getValidatedContent(content) {
        if (typeof content === 'function') return () => {
            const value = content()
            this.validateContent(value)
            return value
        }
        this.validateContent(content)
        return content
    }

    /**
     * Adds the passed resource(s) to the stored resources. Depending on the type of the first parameter either a single
     * resource (with the given id) is added to the storage or multiple resources if these are given as JSON object.
     *
     * The content of the resource can be
     *  - a string representing an url to the resource
     *  - a function which returns the content when it's needed (lazy loading for saving memory)
     *  - content depending on the type of the resource
     *  - an array holding multiple of the resource representations given above whose ids are automatically generated
     *    based on the given id value (usually the id will be extended by "_<index>"
     *
     * Returns the instance itself for chaining
     *
     * @param {string|object} id
     * @param {string|function|mixed} content
     *
     * @returns {ResourceProvider}
     */
    add(id, content) {
        if (isObject(id)) {
            this.addObject(id)
        } else if (Array.isArray(content)) {
            this.addArray(id, content)
        } else {
            this.validateNewId(id)
            this.id2content[id] = this.getValidatedContent(content)
        }
        return this
    }

    /**
     * Adds a resource for each resource content in the given array and generates the id for each resource automatically
     * based on the given id by adding a "_<index>"
     *
     * Returns the instance itself for chaining
     *
     * @param {string} id
     * @param {array} contentArray
     *
     * @returns {ResourceProvider}
     */
    addArray(id, contentArray) {
        if (!Array.isArray(contentArray)) throw Error(`Expected second argument to be array but got "${typeof contentArray}"`)
        let index = 0;
        for (const content of contentArray) {
            this.add(this.getIdWithIndex(id, index), content)
            index++
        }
        return this
    }

    /**
     * Adds each resource in the given resource JSON object, where the key is the id and the value the content
     *
     * Returns the instance itself for chaining
     *
     * @param {object} obj
     *
     * @returns {ResourceProvider}
     */
    addObject(obj = {}) {
        if (!isObject(obj)) throw Error(`Expected argument to be an object but got ${obj === null ? 'null' : typeof obj}`)

        for (const [ id, content ] of Object.entries(obj)) {
            this.add(id, content)
        }
        return this
    }

    /**
     * Returns a new id by extending it with "_<index>"
     *
     * @param {string} id
     * @param {number} index
     * @returns {string}
     */
    getIdWithIndex(id, index) {
        return id + '_' + index
    }

    /**
     * Returns a JSON object holding all resources (id and content) under a key which represents the type of the
     * resources
     *
     * @returns {object}
     */
    get resources() {
        return {[this.key]: this.id2content}
    }
}

/**
 * @class ImageResourceProvider
 * @extends ResourceProvider
 *
 * A resource provider for image resources which are returned under the key "image".
 * The content of an image resource can be a data url string and ids must a file extension ".png"
 *
 */
class ImageResourceProvider extends ResourceProvider {

    /**
     * @inheritDoc
     */
    get key() {
        return 'image'
    }

    /**
     * @inheritDoc
     */
    validateNewId(id) {
        super.validateNewId(id)
        if (!id.endsWith('.png')) throw Error(`Resource id "${id}" must have file extension .png`)
    }

    /**
     * @inheritDoc
     */
    getIdWithIndex(id, index) {
        const idx = id.lastIndexOf('.')
        return id.substring(0, idx) + '_' + index + id.substring(idx)
    }

    /**
     * @inheritDoc
     */
    validateContent(content) {
        if (typeof content !== 'string') throw Error(`Image resources must be a string but got ${typeof content}`)

        if (!isUrl(content) && !isDataUrl(content, 'image/png')) throw Error(`Image resource string must be an URL or data URL`)
    }
}

/**
 * @class AudioResourceProvider
 * @extends ResourceProvider
 *
 * A resource provider for audio resources which are returned under the key "audio".
 * The content of an audio resource must be a http link to an audio file and ids must have a file extension ".wav" or
 * ".mp3"
 */
class AudioResourceProvider extends ResourceProvider {

    /**
     * @inheritDoc
     */
    get key() {
        return 'audio'
    }

    /**
     * @inheritDoc
     */
    validateNewId(id) {
        super.validateNewId(id)
        if (!id.endsWith('.mp3') && !id.endsWith('.wav')) throw Error(`Resource id "${id}" must have file extension .wav or .mp3`)
    }

    /**
     * @inheritDoc
     */
    getIdWithIndex(id, index) {
        const idx = id.lastIndexOf('.')
        return id.substring(0, idx) + '_' + index + id.substring(idx)
    }

    /**
     * @inheritDoc
     */
    validateContent(content) {
        if (typeof content !== 'string') throw Error(`Audio resources must be a string but got ${typeof content}`)

        if (!isUrl(content)) throw Error(`Audio resource string must be an URL`)
    }

}

/**
 * @class JsonResourceProvider
 * @extends ResourceProvider
 *
 * A resource provider for JSON resources which are returned under the key "json".
 * The content of a JSON resource can be everything which is allowed within a JSON
 *
 */
class JsonResourceProvider extends ResourceProvider {

    /**
     * @inheritDoc
     */
    get key() {
        return 'json'
    }

    /**
     * @inheritDoc
     */
    validateContent(content) {
        if (typeof content === 'string' && !isUrl(content)) throw Error(`Json resource string must be an URL`)
        if (!['object', 'string'].includes(typeof content) || !content) throw Error(`Json resources must be an object or URL but got ${content === null ? 'null' : typeof content}`)
    }
}

/**
 @class MultiResourcesProvider
 @extends ResourceProvider

 A resource provider which allows to add resources of the types "image", "audio" or "json". The resources of each
 type are returned under the according key in the resources JSON
 */
class MultiResourcesProvider {

    /**
     * Creates a new provider which is initialized with the resources given in the passed JSON object.
     * Resources must be grouped by a resource key representing their type ("image", "audio" or "video")
     *
     * @param {object} resources
     */
    constructor(resources = {}) {
        this.image = new ImageResourceProvider()
        this.audio = new AudioResourceProvider()
        this.json = new JsonResourceProvider()
        this.addObject(resources)
    }

    /**
     * Throws an error if the given key is no valid resource key in resources JSON
     *
     * @param key
     */
    validateKey(key) {
        if (!(['audio', 'json', 'image'].includes(key)))
            throw Error(`Key "${key}" invalid for resources!`)
    }

    /**
     * Passes the given id and content to the add method of the ResourceProvider matching the resource key.
     *
     * Returns the instance itself to allow chaining
     *
     * @param {type} key
     * @param {string|object} id
     * @param {mixed} content
     *
     * @returns {MultiResourcesProvider}
     */
    add(key, id, content) {
        this.validateKey(key)
        this[key].add(id, content)
        return this
    }

    /**
     * Adds all resources grouped by resource key in the given in the resource JSON object to the
     * appropriate ResourceProvider for this type
     *
     * Returns the instance itself to allow chaining
     *
     * @param {object} obj
     *
     * @returns {MultiResourcesProvider}
     */
    addObject(obj) {
        for (const [ key, subResources ] of Object.entries(obj)) {
            for (const [ id, content ] of Object.entries(subResources)) {
                this.add(key, id, content)
            }
        }
        return this
    }

    /**
     * Passes the id and the content to add method of the ImageResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see ImageResourceProvider
     *
     * @param {string|object} id
     * @param {mixed} content
     *
     * @returns {MultiResourcesProvider}
     */
    addImage(id, content) {
        this.image.add(id, content)
        return this
    }

    /**
     * Passes the id and the content to addObject method of the ImageResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see ImageResourceProvider
     *
     * @param {object} obj
     *
     * @returns {MultiResourcesProvider}
     */
    addImages(obj) {
        this.image.addObject(obj)
        return this
    }

    /**
     * Passes the id and the content to add method of the AudioResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see AudioResourceProvider
     *
     * @param {string|object} id
     * @param {mixed} content
     *
     * @returns {MultiResourcesProvider}
     */
    addAudio(id, content) {
        this.audio.add(id, content)
        return this
    }

    /**
     * Passes the id and the content to addObject method of the AudioResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see AudioResourceProvider
     *
     * @param {object} obj
     *
     * @returns {MultiResourcesProvider}
     */
    addAudios(obj) {
        this.audio.addObject(obj)
        return this
    }

    /**
     * Passes the id and the content to add method of the JsonResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see JsonResourceProvider
     *
     * @param {string|object} id
     * @param {mixed} content
     *
     * @returns {MultiResourcesProvider}
     */
    addJson(id, content) {
        this.json.add(id, content)
        return this
    }

    /**
     * Passes the id and the content to addObject method of the JSONResourceProvider
     *
     * Returns the instance itself to allow chaining
     *
     * @see JsonResourceProvider
     *
     * @param {object} obj
     *
     * @returns {MultiResourcesProvider}
     */
    addJsons(obj) {
        this.json.addObject(obj)
        return this
    }

    /**
     * @inheritDoc
     */
    get resources() {
        return {
            ...this.json.resources,
            ...this.image.resources,
            ...this.audio.resources
        }
    }
}

/**
 * Returns a new ImageResourceProvider instance initialized with the resources in the given JSON object
 *
 * @param {object} resources
 *
 * @returns {ImageResourceProvider}
 */
const ImageResources = resources => new ImageResourceProvider(resources)

/**
 * Returns a new AudioResourceProvider instance initialized with the resources in the given JSON object
 *
 * @param {object} resources
 *
 * @returns {AudioResourceProvider}
 */
const AudioResources = resources => new AudioResourceProvider(resources)

/**
 * Returns a new JsonResourceProvider instance initialized with the resources in the given JSON object
 *
 * @param {object} resources
 *
 * @returns {JsonResourceProvider}
 */
const JsonResources = resources => new JsonResourceProvider(resources)

/**
 * Returns a new MultiResourcesProvider instance initialized with the given resources
 *
 * @param {object} resources
 *
 * @returns {MultiResourcesProvider}
 */
const Resources = resources => new MultiResourcesProvider(resources)

/**
 * Returns an object holding all resources and a callback which were passed as arguments.
 * Resources can either be ResourceProvider instances or JSON objects for an AllResourcesProvider.
 * All resources are merged to a single json resource object in the result. Null and undefined args are ignored.
 *
 * Throws an error if more than one functions were found, if an invalid param type was
 * encountered or if a resource is passed multiple times
 *
 * @param args
 *
 * @returns {object}
 */
const getResourcesAndCallback = ( ...args ) => {
    const resources = {}
    let callback

    for (const arg of args) {
        if (arg === undefined || arg === null) continue
        const type = typeof arg
        switch(type) {
            case 'function':
                if (callback) throw Error(`Multiple callback functions passed to method but only one allowed!`)
                callback = arg
                continue

            case 'object':
                break

            default:
                throw Error(`Argument of type "${type}" not allowed. Expected callback function or resources instance`)
        }
        const provider = !(arg instanceof ResourceProvider) ? Resources(arg) : arg
        for (const [ key, subResources ] of Object.entries(provider.resources)) {
            if (!resources[key]) resources[key] = {}
            for (const [ id, content ] of Object.entries(subResources)) {
                const id2resources = resources[key]
                if (id2resources[id]) throw Error(`Resource "${id}" of type ${key} already passed as argument`)
                id2resources[id] = content
            }
        }
    }
    return {
        resources,
        callback
    }
}

export {
    ResourceProvider,
    Resources,
    ImageResources,
    AudioResources,
    JsonResources,
    getResourcesAndCallback
}