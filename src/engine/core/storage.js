import { RESOURCE } from "core/const"
import { tid2id, id2tid, tid2type, isTid } from "./resources"
import { d, toPairs, isObject, isArray } from "helper/helper"

/**
 * A factory method which returns a storage handler which is based on a Map. Since a map is not persisted this
 * handler is only used for unit testing. If a limit is given, the storage cannot have more than entries than the
 * given limit
 *
 * @param {number} limit
 *
 * @return {object}
 */
const MapStorageHandler = limit => {

    let isFull = false
    const storage = new Map()

    return {
        set: (id, value) => {
            if (limit !== undefined && storage.size >= limit) {
                isFull = true
                return false
            }
            storage.set(id, value)
            return true
        },

        get: id => storage.get(id),

        has: id => storage.has(id),

        delete: id => {
            if (!storage.has(id)) return false
            storage.delete(id)
            isFull = false
            return true
        },

        clear: () => {
            storage.clear()
            isFull = false
        },

        keys: () => storage.keys(),

        isAvailable: () => true,

        size: () => storage.size,

        isFull: () => isFull,

        encode: (type, value) => value,

        decode: (type, value) => value
    }
}

/**
 * Returns a boolean whether the given exception represents a quota exceeded on a browser storage or not
 *
 * @param {Exception} e
 *
 * @returns {boolean}
 */
function isQuotaExceededException(e) {
    return (typeof DOMException !== 'undefined' && e instanceof DOMException) && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
}

/**
 * A factory method which returns a storage handler which is working on the given browser storage
 *
 * @param {object} storage
 *
 * @return {object}
 *
 */
const BrowserStorageHandler = storage => {

    let isFull = false
    const keys = new Set()
    for (let i = 0; i < storage.length; i++) {
        keys.add(storage.key(i))
    }
    return {
        set: (id, value) => {
           if (value === undefined)
               throw Error(`Cannot store undefined value for id "${id}"`)

           try {
               storage.setItem(id, value)
           } catch (e) {
               if (isQuotaExceededException(e)) {
                   isFull = true
               }
               return false
           }
            keys.add(id)
            return true
        },

        get: id => storage.getItem(id),

        has: id => keys.has(id),

        delete: id => {
            if (!keys.has(id)) return false
            storage.removeItem(id)
            keys.delete(id)
            isFull = false
            return true
        },

        clear: () => {
            storage.clear()
            keys.clear()
            isFull = false
        },

        keys: () => keys.keys(),

        isAvailable: () => {
            try {
                const x = '__storage_test__';
                storage.setItem(x, '1');
                storage.removeItem(x);
                return true;
            } catch(e) {
                return (typeof DOMException !== 'undefined' && e instanceof DOMException) && !isQuotaExceededException(e) && (
                        e.code === 22 ||
                        e.code === 1014) &&
                    (storage && storage.length !== 0);
            }
        },

        isFull: () => isFull,

        size: () => keys.size,

        encode: (type, value) => {
            switch (parseInt(type, 10)) {
                case RESOURCE.TYPE.JSON:
                    return JSON.stringify(value)

                case RESOURCE.TYPE.IMAGE:
                    return value.dataUrl

                case RESOURCE.TYPE.AUDIO:
                    return value
            }
            throw Error(`Unsupported type "${type}" for encoding given!`)
        },

        decode: (type, value) => {
            switch (type) {
                case RESOURCE.TYPE.JSON:
                    return JSON.parse(value)

                case RESOURCE.TYPE.IMAGE:
                case RESOURCE.TYPE.AUDIO:
                    return value
            }
            throw Error(`Unsupported type "${type}" for decoding given!`)
        }
    }
}

// TODO FileStorage?

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
     * @param {string} prefix
     */
    constructor(storageHandler, prefix = '') {
        if (!storageHandler)
            throw Error(`No storage handler given`)

        if (!storageHandler.isAvailable())
            throw Error('Storage is not available')

        this.prefix = prefix
        this.storage = storageHandler
    }

    /**
     * Returns an array holding all typed resource ids currently stored in the storage
     *
     * @returns {array}
     */
    getTypedIds() {
        const tids = this.storage.keys()
        const ids = []
        for (let prefixedTid of tids) {
            if (!prefixedTid.startsWith(this.prefix)) continue

            const tid = prefixedTid.substring(this.prefix.length)
            if (!isTid(tid)) continue

            ids.push(tid)
        }
        return ids
    }

    /**
     * Returns an array holding all ids of resources matching the given type
     *
     * @param {number} type
     *
     * @returns {array}
     */
    getIdsByType(type) {
        const tids = this.storage.keys()
        const ids = []
        for (let tid of tids) {
            tid = tid.substring(this.prefix.length)
            if (tid2type(tid) !== type) continue
            ids.push(tid2id(tid))
        }
        return ids
    }

    /**
     * Returns an array holding all ids of stored JSON resources
     *
     * @returns {Array}
     */
    getJsonIds() {
        return this.getIdsByType(RESOURCE.TYPE.JSON)
    }

    /**
     * Returns an array holding all ids of stored image resources
     *
     * @returns {Array}
     */
    getImageIds() {
        return this.getIdsByType(RESOURCE.TYPE.IMAGE)
    }

    /**
     * Returns an array holding all ids of stored audio resources
     *
     * @returns {Array}
     */
    getAudioIds() {
        return this.getIdsByType(RESOURCE.TYPE.AUDIO)
    }

    /**
     * Returns the data of resource matching the given typed resource id or undefined if no resource was found
     *
     * @param {string} tid
     *
     * @returns {mixed}
     */
    getResource(tid) {
        return this.getResourceById(tid2type(tid), tid2id(tid))
    }

    /**
     * Returns the data of resource matching the given type and id or undefined if no resource was found
     *
     * @param {number} type
     * @param {string} id
     *
     * @returns {mixed}
     */
    getResourceById(type, id) {
        const tid = id2tid(type, id)
        return this.storage.decode(type, this.storage.get(this.prefix + tid))
    }

    /**
     * Returns the json resource matching the given id or undefined if no resource was found
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getJson(id) {
        return this.getResourceById(RESOURCE.TYPE.JSON, id)
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
     * Returns the image resource matching the given id or undefined if no resource was found
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getImage(id) {
        return this.getResourceById(RESOURCE.TYPE.IMAGE, id)
    }

    /**
     * Returns the audio resource matching the given id or undefined if no resource was found
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getAudio(id) {
        return this.getResourceById(RESOURCE.TYPE.AUDIO, id)
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
        return this.deleteResourceById(tid2type(tid), tid2id(tid))
    }

    /**
     * Deletes the resource matching the given type and id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {number} type
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteResourceById(type, id) {
        return this.storage.delete(this.prefix + id2tid(type, id))
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
        return this.deleteResourceById(RESOURCE.TYPE.JSON, id)
    }

    /**
     * Deletes the image resource matching the given id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteImage(id) {
        return this.deleteResourceById(RESOURCE.TYPE.IMAGE, id)
    }

    /**
     * Deletes the audio resource matching the given id if it exists and returns a boolean indicating whether
     * the resource was deleted or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    deleteAudio(id) {
        return this.deleteResourceById(RESOURCE.TYPE.AUDIO, id)
    }

    /**
     * Returns a boolean indicating whether the resource with the given typed id is stored in this storage or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    hasResource(tid) {
        return this.hasResourceById(tid2type(tid), tid2id(tid))
    }

    /**
     * Returns a boolean indicating whether the resource with the given id and type is stored in this storage or not
     *
     * @param {number} type
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasResourceById(type, id) {
        return this.storage.has(this.prefix + id2tid(type, id))
    }

    /**
     * Returns a boolean indicating whether the json resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasJson(id) {
        return this.hasResourceById(RESOURCE.TYPE.JSON, id)
    }

    /**
     * Returns a boolean indicating whether the image resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasImage(id) {
        return this.hasResourceById(RESOURCE.TYPE.IMAGE, id)
    }

    /**
     * Returns a boolean indicating whether the audio resource with the given id is stored in this storage or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasAudio(id) {
        return this.hasResourceById(RESOURCE.TYPE.AUDIO, id)
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
        return this.storeResourceById(tid2type(tid), tid2id(tid), value)
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
        return this.storage.set(this.prefix + id2tid(type, id), this.storage.encode(type, value))
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
        return this.storeResourceById(RESOURCE.TYPE.JSON, id, value)
    }

    /**
     * Stores the image data under the given id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {string} value
     *
     * @returns {boolean}
     */
    storeImage(id, value) {
        return this.storeResourceById(RESOURCE.TYPE.IMAGE, id, value)
    }

    /**
     * Stores the audio data under the given id and returns whether it could be stored or not
     *
     * @param {string} id
     * @param {string} value
     *
     * @returns {boolean}
     */
    storeAudio(id, value) {
        return this.storeResourceById(RESOURCE.TYPE.AUDIO, id, value)
    }

    /**
     * Stores all key value pairs of the given object whereas the key is the typed resource id and the value is the
     * resource data. Returns false if all pairs could be stored otherwise false
     *
     * @param {object} obj
     *
     * @returns {boolean}
     */
    storeFromObject(obj) {
        for (const [ tid, value ] of toPairs(obj)) {
            if (!this.storeResource(tid, value)) return false
        }
        return true
    }

    /**
     * Clears all entries in the storage and returns whether all entries could be deleted or not
     *
     * @return {boolean}
     */
    truncate() {
        const ids = this.getTypedIds()
        let success = true
        for (const tid of ids) {
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

    isEmpty() {
        return this.storage.size === 0
    }

    hasNoTypedIds() {
        return this.getTypedIds().length === 0
    }
}

export {
    MapStorageHandler,
    BrowserStorageHandler,
    StorageManager
}