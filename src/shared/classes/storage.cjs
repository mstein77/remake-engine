const { RESOURCE, makeDescriptor, id2tid } = require('./resources.cjs')
const { isArray, isObject, toPairs, d } = require("./helper.cjs")

/**
 * Allows the storage and retrieval of resources and raw json data by invoking a storage handler implementation
 */
class StorageManager {

    /**
     * Constructs a new storage manager which bound to the given storage handler. Throws an exception if no storage
     * handler is given or if the storage is not available
     *
     * @param {object} storageHandler
     */
    constructor(storageHandler) {
        if (!storageHandler)
            throw Error(`No storage handler given`)

        if (!storageHandler.isAvailable())
            throw Error('Storage is not available')

        this.storage = storageHandler
    }

    /**
     * Returns an array with all extended typed resource ids of the storage matching the given resource type(s)
     *
     * @param {array|string} types
     *
     * @returns {array}
     */
    getTypedResourceIdsByType(types) {
        if (!isArray(types)) types = [types]
        const extTids = this.storage.keys()

        const result = []
        for (const extTid of extTids) {
            const descriptor = makeDescriptor.fromTid(extTid, false)
            if (!descriptor.isValid()) continue

            if (!types.includes(descriptor.type)) continue
            result.push(extTid)
        }
        return result
    }

    /**
     * Returns an array with all extended typed resource ids of the storage
     *
     * @returns {array}
     */
    getTypedResourceIds() {
        const extTids = this.storage.keys()
        const result = []
        for (const extTid of extTids) {
            const descriptor = makeDescriptor.fromTid(extTid, false)
            if (!descriptor.isValid()) continue

            result.push(extTid)
        }
        return result
    }

    /**
     * Returns an array holding all extended resource ids (extId) of the given type
     *
     * @param {string} type
     *
     * @returns {array}
     */
    getResourceIdsByType(type) {
        const extTids = this.storage.keys()
        const extIds = []
        for (const extTid of extTids) {
            const descriptor = makeDescriptor.fromTid(extTid, false, type)
            if (!descriptor.isValid()) continue
            // the id here will always be the extId because it was created from an extTid
            extIds.push(descriptor.id)
        }
        return extIds
    }

    /**
     * Returns an array holding all extended typed resource ids (extTids) of the storage except the ones from
     * core resources
     *
     * @returns {array}
     */
    getPublicTypedResourceIds() {
        return this.getTypedResourceIdsByType([
            RESOURCE.TYPE.JSON, RESOURCE.TYPE.AUDIO, RESOURCE.TYPE.IMAGE, RESOURCE.TYPE.VIDEO
        ])
    }

    /**
     * Returns an array holding all non-resource ids of the storage
     *
     * @returns {array}
     */
    getJsonIds() {
        // TODO currently this method also returns typed resource ids
        return this.storage.keys()
    }

    /**
     * Returns an array holding all extended ids of stored JSON resources
     *
     * @returns {array}
     */
    getJsonResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.JSON)
    }

    /**
     * Returns an array holding all extended ids of stored image resources
     *
     * @returns {array}
     */
    getImageResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.IMAGE)
    }

    /**
     * Returns an array holding all extended ids of stored audio resources
     *
     * @returns {array}
     */
    getAudioResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.AUDIO)
    }

    /**
     * Returns an array holding all extended ids of stored video resources
     *
     * @returns {array}
     */
    getVideoResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.VIDEO)
    }

    /**
     * Returns the data of the resource matching the given typed resource id or undefined if no resource was found
     *
     * @param {string} tid
     *
     * @returns {mixed}
     */
    getResource(tid) {
        const { type, extTid } = makeDescriptor.fromTid(tid)

        return this.storage.get(type, extTid)
    }

    /**
     * Returns the data of the core resource matching the given id or undefined if the resource does not exist
     *
     * @param {string} id
     *
     * @returns {object|undefined}
     */
    getCoreResource(id) {
        return this.getResource(id2tid(RESOURCE.TYPE.CORE, id))
    }

    /**
     * Returns the json object stored under the given id or undefined if the id does not exist
     *
     * @param {string} id
     *
     * @returns {object|undefined}
     */
    getJson(id) {
        return this.storage.get(RESOURCE.TYPE.JSON, id)
    }

    /**
     * Returns an array which holds either the array stored under the given id or the defaults array if the id is not
     * found
     *
     * @param {string} id
     * @param {array|undefined} defaults
     *
     * @returns {array}
     */
    getDefaultedArray(id, defaults = []) {
        const json = this.getJson(id)
        if (isArray(json)) return json

        return isArray(defaults) ? defaults : []
    }

    /**
     * Returns an object which has all key/values which are stored in the JSON with the given id and all missing key
     * from the defaults object with their default values. If the JSON with the id does not exist and the defaults
     * param or the stored value is no plain object, then it's passed through as return value
     *
     * @param {string} id
     * @param {object|mixed} defaults
     *
     * @returns {object|mixed}
     */
    getDefaultedJson(id, defaults) {
        const json = this.getJson(id)
        if (json === undefined)
            return isObject(defaults) ? { ...defaults } : defaults

        return defaults === undefined || !isObject(json) ? json : { ...defaults, ...json }
    }

    /**
     * Returns a boolean indicating whether the resource with the given typed id is stored in this storage or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    hasResource(tid) {
        const { extTid } = makeDescriptor.fromTid(tid)

        return this.storage.has(extTid)
    }

    /**
     * Returns a boolean indicating whether a JSON is stored under the given id or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasJson(id) {
        return this.storage.has(id)
    }

    /**
     * Returns a boolean indicating whether the json resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasJsonResource(id) {
        return this.hasResource(id2tid(RESOURCE.TYPE.JSON, id))
    }

    /**
     * Returns a boolean indicating whether the image resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasImageResource(id) {
        return this.hasResource(id2tid(RESOURCE.TYPE.IMAGE, id))
    }

    /**
     * Returns a boolean indicating whether the audio resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasAudioResource(id) {
        return this.hasResource(id2tid(RESOURCE.TYPE.AUDIO, id))
    }

    /**
     * Returns a boolean indicating whether the video resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasVideoResource(id) {
        return this.hasResource(id2tid(RESOURCE.TYPE.VIDEO, id))
    }

    /**
     * Stores the resource data for the given typed id and returns whether it could be stored or not
     * Throws an error if no valid resource type id is given
     *
     * @param {string} tid
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeResource(tid, value) {
        const { type, extTid } = makeDescriptor.fromTid(tid)

        return this.storage.set(type, extTid, value)
    }

    /**
     * Stores all resources given by their typed resource id (key) and their values in the passed object
     *
     * @param {object} tid2value
     */
    storeResourcesFromObject(tid2value) {
        for (const [ tid, value ] of toPairs(tid2value)) {
            this.storeResource(tid, value)
        }
    }

    /**
     * Stores the resource data of the given type under the id and returns whether it could be stored or not.
     * Throws an error if no valid resource type id is given
     *
     * @param {string} type
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeResourceById(type, id, value) {
        return this.storeResource(id2tid(type, id), value)
    }

    /**
     * Stores the json data under the given id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeJson(id, value) {
        return this.storage.set(RESOURCE.TYPE.JSON, id, value)
    }

    /**
     * Stores the json data as json resource under the given resource id and returns whether it could be stored or not
     * Throws an error if no valid resource id is given
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeJsonResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.JSON, id), value)
    }

    /**
     * Stores the json data as core resource under the given resource id and returns whether it could be stored or not
     * Throws an error if no valid id is given
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeCoreResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.CORE, id), value)
    }

    /**
     * Stores the image data under the given resource id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {string} value
     *
     * @returns {boolean}
     */
    storeImageResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.IMAGE, id), value)
    }

    /**
     * Stores the audio data under the given resource id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {string} value
     *
     * @returns {boolean}
     */
    storeAudioResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.AUDIO, id), value)
    }

    /**
     * Stores the video data under the given resource id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {string} value
     *
     * @returns {boolean}
     */
    storeVideoResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.VIDEO, id), value)
    }

    /**
     * Deletes the resource matching the given typed resource id if it exists and returns a boolean indicating whether
     * the resource was deleted or not. Throws an error if an invalid resource type id is given
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    deleteResource(tid) {
        const { extTid } = makeDescriptor.fromTid(tid)

        return this.storage.delete(extTid)
    }

    /**
     * Deletes the json matching the given id if it exists and returns a boolean indicating whether it could be deleted
     * or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteJson(id) {
        return this.storage.delete(id)
    }

    /**
     * Deletes the JSON resource matching the given resource id if it exists and returns a boolean indicating whether
     * the resource was deleted or not. Throws an error if no valid typed resource id was given
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteJsonResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.JSON, id))
    }

    /**
     * Deletes the image resource matching the given resource id if it exists and returns a boolean indicating whether
     * the resource was deleted or not. Throws an error if no valid resource id is given
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteImageResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.IMAGE, id))
    }

    /**
     * Deletes the audio resource matching the given resource id if it exists and returns a boolean indicating whether
     * the resource was deleted or not. Throws an error if no valid resource id is given
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteAudioResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.AUDIO, id))
    }

    /**
     * Deletes the video resource matching the given resource id if it exists and returns a boolean indicating whether
     * the resource was deleted or not. Throws an error if no valid resource id is given
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteVideoResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.VIDEO, id))
    }

    /**
     * Deletes all stored resources and returns whether all entries could be deleted or not
     *
     * @return {boolean}
     */
    truncateResources() {
        const extTids = this.getTypedResourceIds()
        let success = true
        for (const extTid of extTids) {
            if (!this.deleteResource(extTid)) success = false
        }
        return success
    }

    /**
     * Returns a boolean indicating whether the storage is full or not
     *
     * @returns {boolean}
     */
    isFull() {
        return this.storage.isFull()
    }

    /**
     * Returns a boolean indicating whether the storage is empty or not
     *
     * @returns {boolean}
     */
    isEmpty() {
        return this.storage.size() === 0
    }
}

module.exports = {
    StorageManager
}