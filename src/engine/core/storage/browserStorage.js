import { RESOURCE } from "shared/classes/resources.cjs"
import { d } from "helper/helper"
import {makeDescriptor} from "../../../shared/classes/resources.cjs";

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
const BrowserStorage = (storage, prefix = '') => {

    let isFull = false
    const keys = new Set()
    const idIndex = prefix.length
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key.startsWith(prefix)) keys.add(key.substring(idIndex))
    }
    return {
        get: (type, id) => {
            const value = storage.getItem(prefix + id)
            if (value === null) return

            switch (type) {
                case RESOURCE.TYPE.CORE:
                case RESOURCE.TYPE.JSON:
                    return JSON.parse(value)

                case RESOURCE.TYPE.IMAGE:
                case RESOURCE.TYPE.AUDIO:
                    const descriptor = makeDescriptor.fromTid(id)
                    return `data:${descriptor.mimeType};base64,${value}`
            }
            throw Error(`Unsupported type "${type}" for decoding given!`)
        },

        has: id => keys.has(id),

        set: (type, id, value) => {
           if (value === undefined)
               throw Error(`Cannot store undefined value for id "${id}"`)

           let encoded
           switch(type) {
               case RESOURCE.TYPE.JSON:
               case RESOURCE.TYPE.CORE:
                   try {
                       encoded = JSON.stringify(value)
                   } catch (e) {
                       console.error(e)
                   }
                   break

               case RESOURCE.TYPE.IMAGE:
                   break

               case RESOURCE.TYPE.AUDIO:
                   break
           }
            if (!encoded)
                throw Error(`Could not encode ${RESOURCE.TEXT[type]} value for id "${id}" to a string`)

           try {
               storage.setItem(prefix + id, encoded)
           } catch (e) {
               if (isQuotaExceededException(e)) {
                   isFull = true
               }
               return false
           }
            keys.add(id)
            return true
        },

        delete: id => {
            if (!keys.has(id)) return false

            storage.removeItem(prefix + id)
            keys.delete(id)
            isFull = false
            return true
        },

        keys: () => keys.keys(),

        isAvailable: () => {
            try {
                const x = '__storage_test__';
                storage.setItem(x, '1');
                storage.removeItem(x);
                return true;
            } catch (e) {
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
        }
    }
}

export {
    BrowserStorage
}