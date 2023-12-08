const { d } = require('../../../src/shared/classes/helper.cjs')

/**
 * A factory method which returns a storage handler which is based on a Map. Since a map is not persisted this
 * handler is only used for unit testing. If a limit is given, the storage cannot have more than entries than the
 * given limit
 *
 * @param {number} [limit]
 *
 * @return {object}
 */
const MapStorage = limit => {

    let isFull = false
    const storage = new Map()

    return {
        get: (type, id) => storage.get(id),

        has: id => storage.has(id),

        set: (type, id, value) => {
            if (limit !== undefined && storage.size >= limit) {
                isFull = true
                return false
            }
            storage.set(id, value)
            return true
        },

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

        keys: () => [ ...storage.keys() ],

        isAvailable: () => true,

        size: () => storage.size,

        isFull: () => isFull
    }
}

module.exports = {
    MapStorage
}