const { RESOURCE, makeDescriptor, id2tid } = require('./resources.cjs')
const { isArray, isObject, toPairs, d } = require("./helper.cjs")

/**
 * Allows the storage of JSON, image and audio resource data by invoking a storage handler
 *
 */
class StorageManager {

    /**
     * Constructs a new storage manager which uses the given prefix for all internal storage keys and
     * is bound to the given storage handler. Throws an exception if no storage handler is given or if
     * the storage is not available
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
     * Returns an array with all typed resource ids of the storage matching the given resource type(s)
     *
     * @param array|string types
     * @returns {array}
     */
    getTypedResourceIdsByType(types) {
        if (!isArray(types)) types = [types]
        const tids = this.storage.keys()
        const result = []
        for (const tid of tids) {
            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || !descriptor.isValid()) continue

            if (!types.includes(descriptor.type)) continue
            result.push(tid)
        }
        return result
    }

    getTypedResourceIds() {
        const tids = this.storage.keys()
        const result = []
        for (const tid of tids) {
            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || !descriptor.isValid()) continue

            result.push(tid)
        }
        return result
    }

    getResourceIdsByType(type) {
        const tids = this.storage.keys()
        const ids = []
        for (const tid of tids) {
            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || !descriptor.isValid() || descriptor.type !== type) continue

            ids.push(descriptor.id)
        }
        return ids
    }

    /**
     * Returns an array holding all typed resource ids of the storage except core resources
     *
     * @returns {array}
     */
    getPublicTypedResourceIds() {
        return this.getTypedResourceIdsByType([
            RESOURCE.TYPE.JSON, RESOURCE.TYPE.AUDIO, RESOURCE.TYPE.IMAGE, RESOURCE.TYPE.VIDEO
        ])
    }

    getJsonIds() {
        // TODO wie wollen wir hier unterscheiden?
        return this.storage.keys()
    }

    /**
     * Returns an array holding all ids of stored JSON resources
     *
     * @returns {Array}
     */
    getJsonResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.JSON)
    }

    /**
     * Returns an array holding all ids of stored image resources
     *
     * @returns {Array}
     */
    getImageResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.IMAGE)
    }

    /**
     * Returns an array holding all ids of stored audio resources
     *
     * @returns {Array}
     */
    getAudioResourceIds() {
        return this.getResourceIdsByType(RESOURCE.TYPE.AUDIO)
    }

    getResourceDescriptor(tid) {
        const descriptor = makeDescriptor.fromTid(tid)
        if (!descriptor || !descriptor.isValid())
            throw Error(`Invalid typed resource id "${tid}" given`)

        return descriptor
    }

    /**
     * Returns the data of resource matching the given typed resource id or undefined if no resource was found
     *
     * @param {string} tid
     *
     * @returns {mixed}
     */
    getResource(tid) {
        const descriptor = this.getResourceDescriptor(tid)

        return this.storage.get(descriptor.type, descriptor.extTid)
    }

    /**
     *
     * @param id
     * @returns {mixed}
     */
    getCoreResource(id) {
        return this.getResource(id2tid(RESOURCE.TYPE.CORE, id))
    }

    getJson(id) {
        return this.storage.get(RESOURCE.TYPE.JSON, id)
    }

    getDefaultedArray(id, defaults = []) {
        const json = this.getJson(id)
        if (isArray(json)) return json

        return isArray(defaults) ? defaults : []
    }

    getDefaultedJson(id, defaults) {
        const json = this.getJson(id)
        if (json === undefined)
            return isObject(defaults) ? { ...defaults } : defaults

        return defaults === undefined ? json : { ...defaults, ...json }
    }

    /**
     * Returns a boolean indicating whether the resource with the given typed id is stored in this storage or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    hasResource(tid) {
        const descriptor = this.getResourceDescriptor(tid)

        return this.storage.has(descriptor.extTid)
    }

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
     * Stores the resource data for the given typed id and returns whether it could be stored or not
     *
     * @param {string} tid
     * @param {mixed} value
     *
     * @returns {boolean}
     */
    storeResource(tid, value) {

        const { type, extId } = this.getResourceDescriptor(tid)

        return this.storage.set(type, extId, value)
    }

    /**
     * Stores the resource data of the given type under the id and returns whether it could be stored or not.
     * Throws an error if the type is unknown or the data could not be encoded
     *
     * @param {number} type
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

    storeJsonResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.JSON, id), value)
    }

    storeCoreResource(id, value) {
        return this.storeResource(id2tid(RESOURCE.TYPE.CORE, id), value)
    }

    /**
     * Stores the image data under the given id and returns whether it could be stored or not
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
     * Stores the audio data under the given id and returns whether it could be stored or not
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
     * Stores all key value pairs of the given object whereas the key is the typed resource id and the value is the
     * resource data. Returns false if all pairs could be stored otherwise false
     *
     * @param {object} obj
     *
     * @returns {boolean}
     */
    storeResourcesFromObject(obj) {
        for (const [ tid, value ] of toPairs(obj)) {
            if (!this.storeResource(tid, value)) return false
        }
        return true
    }

    /**
     * Deletes the resource matching the given typed id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    deleteResource(tid) {
        const { extId } = this.getResourceDescriptor(tid)
        return this.storage.delete(extId)
    }

    /**
     * Deletes the JSON resource matching the given id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteJson(id) {
        return this.storage.delete(id)
    }

    deleteJsonResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.JSON, id))
    }


    /**
     * Deletes the image resource matching the given id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteImageResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.IMAGE, id))
    }

    /**
     * Deletes the audio resource matching the given id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteAudioResource(id) {
        return this.deleteResource(id2tid(RESOURCE.TYPE.AUDIO, id))
    }

    /**
     * Clears all entries in the storage and returns whether all entries could be deleted or not
     *
     * @return {boolean}
     */
    truncateResources() {
        const tids = this.getTypedResourceIds()
        let success = true
        for (const tid of tids) {
            if (!this.deleteResource(tid)) success = false
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