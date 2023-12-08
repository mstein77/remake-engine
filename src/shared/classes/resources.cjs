const { d, toPairs} = require('./helper.cjs')

const RESOURCE = {
    TYPE: {
        JSON: '1',
        IMAGE: '2',
        AUDIO: '3',
        VIDEO: '4',
        CORE: '5'
    }
}
RESOURCE.PREFIX = {
    [RESOURCE.TYPE.JSON]: 'j',
    [RESOURCE.TYPE.IMAGE]: 'i',
    [RESOURCE.TYPE.AUDIO]: 'a',
    [RESOURCE.TYPE.VIDEO]: 'v',
    [RESOURCE.TYPE.CORE]: '.'
}
RESOURCE.TEXT = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio',
    [RESOURCE.TYPE.VIDEO]: 'video'
}
RESOURCE.KEY = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio',
    [RESOURCE.TYPE.VIDEO]: 'video'
}

const prefix2type = {}
for (const [ type, prefix ] of toPairs(RESOURCE.PREFIX)) {
    prefix2type[prefix] = type
}

const text2id = {}
for (const [ id, text ] of toPairs(RESOURCE.TEXT)) {
    text2id[text] = id
}

const jsonPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.JSON]
const imagePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE]
const audioPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO]
const videoPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.VIDEO]
const corePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.CORE]

/**
 * Returns the given id with the json resource prefix prepended
 *
 * @param {string} id
 *
 * @returns {string}
 */
const id2jsonTid = id => jsonPrefix + id

/**
 * Returns the given id with the core resource prefix prepended
 *
 * @param {string} id
 *
 * @returns {string}
 */
const id2coreTid = id => corePrefix + id

/**
 * Returns the given id with the image resource prefix prepended
 *
 * @param {string} id
 *
 * @returns {string}
 */
const id2imageTid = id => imagePrefix + id

/**
 * Returns the given id with the audio resource prefix prepended
 *
 * @param {string} id
 *
 * @returns {string}
 */
const id2audioTid = id => audioPrefix + id

/**
 * Returns the given id with the video resource prefix prepended
 *
 * @param {string} id
 *
 * @returns {string}
 */
const id2videoTid = id => videoPrefix + id

const type2tid = {
    [RESOURCE.TYPE.JSON]: id2jsonTid,
    [RESOURCE.TYPE.CORE]: id2coreTid,
    [RESOURCE.TYPE.IMAGE]: id2imageTid,
    [RESOURCE.TYPE.AUDIO]: id2audioTid,
    [RESOURCE.TYPE.VIDEO]: id2videoTid
}

/**
 * Returns a string holding the typed resource id (tid) for the given id and resource type, or throws an error if
 * the given type is not supported
 *
 * @param {string} type
 * @param {string} id
 *
 * @returns {string}
 */
const id2tid = (type, id) => {
    const func = type2tid[type]
    if (!func)
        throw Error(`Invalid resource type "${type}" given`)

    return func(id)
}

/**
 * Returns a string holding the typed resource id (tid) for the given type text and id, or throws an error if
 * the given type is not supported
 *
 * @param {string} typeText
 * @param {string} id
 *
 * @returns {string}
 */
const typeText2tid = (typeText, id) => {
    const type = text2id[typeText]
    if (type === undefined)
        throw Error(`Invalid type text "${typeText}" given`)

    return id2tid(type, id)
}

/**
 * Returns a string holding the resource type of the given typed resource id or throws an error if no valid resource id
 * is given
 *
 * @param {string} tid
 *
 * @returns {string}
 */
const tid2type = tid => {
    const type = tid.length > 0 ? prefix2type[tid[0]] : null
    if (!type)
        throw Error(`Could not extract type from typed id "${tid}"`)

    return type
}

/**
 * Returns a string holding the id of the given typed resource id (tid)
 *
 * @param {string} tid
 *
 * @returns {string}
 */
const tid2id = tid => {
    if (!tid.length || prefix2type[tid[0]] === undefined)
        throw Error(`Invalid typed resource id "${tid}" given!`)

    return tid.substring(1)
}

/**
 * Returns an array where are all given typed resource ids are included but all tids which have no extension in their
 * id will be replaced by the same tid with an appended default extension
 *
 * @param {array} tids
 *
 * @returns {array}
 */
const tids2extTids = tids => {
    const extTids = []
    for (const tid of tids) {
        extTids.push(makeDescriptor.fromTid(tid).extTid)
    }
    return extTids
}

/**
 * Returns an object which represents the one from the given mapping except that all tids in the keys or value arrays
 * which have no extension in their id will be replaced by the same tids with an appended default extension
 *
 * @param {object} map
 *
 * @returns {object}
 */
const map2extMap = map => {
    const extMap = {}
    for (const [ id, tids ] of toPairs(map)) {
        const extId = makeDescriptor.fromTid(id).extTid
        extMap[extId] = tids2extTids(tids)
    }
    return extMap
}

const ext2type = {}
const ext2info = {}
const type2exts = {
    [RESOURCE.TYPE.JSON]: [],
    [RESOURCE.TYPE.IMAGE]: [],
    [RESOURCE.TYPE.AUDIO]: [],
    [RESOURCE.TYPE.VIDEO]: [],
    [RESOURCE.TYPE.CORE]: ['json']
}

/**
 * The resource type registry allows the registration of resource types to id extensions and mime sub types.
 * Id extensions are used like a file extension. The first registered extension of a resource type is used as default
 * extension in case an id has no extension.
 *
 * TODO allow registration or overwrite of types from outside, make setter for defaultExt
 */
const ResourceTypeRegistry = {

    /**
     * Returns the default extension for the given resource type
     *
     * @param {string} type
     *
     * @returns {string}
     */
    getDefaultExt: type => {
        const exts = type2exts[type]
        return exts.length ? exts[0] : undefined
    },

    /**
     * Registers a new possible extension (and mime subtype) for the given resource id
     * If no mime subtype is given, a subtype with the same name as the extension is used
     * The method returns the ResourceTypeRegistry to allow chaining
     *
     * @param {string} ext
     * @param {string} type
     * @param {string} subType
     *
     * @returns {object}
     */
    register: (ext, type, subType = ext) => {
        const exts = type2exts[type]
        if (!exts)
            throw Error(`Invalid type "${type}" for resource type registration given!`)

        if (!exts.includes(ext)) exts.push(ext)

        ext2type[ext] = type
        ext2info[ext] = { type, subType }

        return ResourceTypeRegistry
    }
}

// register the default extension for each media type
ResourceTypeRegistry
    .register(
        'json',
        RESOURCE.TYPE.JSON
    )
    .register(
        'png',
        RESOURCE.TYPE.IMAGE
    )
    .register(
        'jpg',
        RESOURCE.TYPE.IMAGE,
        'jpeg'
    )
    .register(
        'wav',
        RESOURCE.TYPE.AUDIO
    )
    .register(
        'mp3',
        RESOURCE.TYPE.AUDIO
    )
    .register(
        'mp4',
        RESOURCE.TYPE.VIDEO
    )
    .register(
        'webm',
        RESOURCE.TYPE.VIDEO
    )

/**
 * A resource descriptor is used to extract certain information of a given typed resource id
 * or to validate it
 */
class Descriptor {

    /**
     * Constructs a new descriptor based on the given typed id. If we expect the tid to be of
     * a given type, we can pass an expectedType and if the type doesn't match the descriptor
     * is marked as invalid
     *
     * @param {string} tid
     * @param {string} expectedType
     */
    constructor(tid= '', expectedType) {
        this.tid = tid
        this.type = this.extractType()
        this.id = this.extractId()
        this.expectedType = expectedType
    }

    /**
     * Tries to extract the type of the current descriptor tid and returns it, returns undefined
     * if no type could be extracted
     *
     * @returns {string|undefined}
     */
    extractType() {
        if (!this.tid || this.tid.length <= 1) return

        return prefix2type[this.tid[0]]
    }

    /**
     * Tries to extract the id of the current descriptor tid and returns it, returns undefined
     * if no id could be extracted
     *
     * @returns {string|undefined}
     */
    extractId() {
        if (!this.type || this.tid.length <= 1) return
        return this.tid.substring(1)
    }

    /**
     * Returns a boolean indicating whether the resource type of the tid matches the expected
     * type (if it exists) or not
     *
     * @returns {boolean}
     */
    hasExpectedType() {
        return !this.expectedType || this.type === this.expectedType
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor is valid or not
     *
     * @returns {boolean}
     */
    isValid() {
        return !!(this.type && this.id && this.hasExpectedType())
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has a JSON type or not
     *
     * @returns {boolean}
     */
    isJson() {
        return this.type === RESOURCE.TYPE.JSON
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has a JSON type or not
     *
     * @returns {boolean}
     */
    isCoreJson() {
        return this.type === RESOURCE.TYPE.CORE
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has a JSON or core type
     * or not
     *
     * @returns {boolean}
     */
    isJsonBased() {
        return [RESOURCE.TYPE.JSON, RESOURCE.TYPE.CORE].includes(this.type)
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has an image type or not
     *
     * @returns {boolean}
     */
    isImage() {
        return this.type === RESOURCE.TYPE.IMAGE
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has an audio type or not
     *
     * @returns {boolean}
     */
    isAudio() {
        return this.type === RESOURCE.TYPE.AUDIO
    }

    /**
     * Returns a boolean indicating whether the tid of this descriptor has an video type or not
     *
     * @returns {boolean}
     */
    isVideo() {
        return this.type === RESOURCE.TYPE.VIDEO
    }

    /**
     * Returns a string holding the key under which the tid should be returned in the resource
     * manager or undefined if the resource should not be returned
     *
     * @returns {string}
     */
    get key() {
        return RESOURCE.KEY[this.type]
    }

    /**
     * Returns a string holding the extension of the resource or the default extensions if no
     * extension was given in the id. Returns undefined if the tid was not valid
     *
     * @returns {string|undefined}
     */
    get ext() {
        if (!this.isValid()) return

        const ext = this.idExt
        return ext ? ext : this.defaultExt
    }

    /**
     * Returns a string holding the extension encoded in the id of the tid or undefined
     * if no id extension was given
     *
     * @returns {string|undefined}
     */
    get idExt() {
        if (!this.isValid()) return

        const idx = this.id.lastIndexOf('.')

        if (idx <= 0) return

        const ext = this.id.substring(idx + 1)
        if (this.allowedExt.includes(ext)) return ext
    }

    /**
     * Returns an array holding all allowed extensions for the resource type of this tid
     *
     * @returns {array}
     */
    get allowedExt() {
        return this.type ? type2exts[this.type] : []
    }

    /**
     * Returns a string holding the default extension for the resource type of this tid
     * or an empty string if not default extension exists
     *
     * @returns {string}
     */
    get defaultExt() {
        const exts = this.allowedExt
        return exts.length ? exts[0] : ''
    }

    /**
     * Returns a string holding the id of the tid. In case the id has no extension the default
     * extension of the resource type will be appended
     *
     * @returns {string|undefined}
     */
    get extId() {
        if (!this.isValid()) return

        return this.id + (!this.idExt ? '.' + this.defaultExt : '')
    }

    /**
     * Returns a string holding the tid but if no extension is given then the default extension
     * of the resource type is appended. Returns undefined if no valid tid is given
     *
     * @returns {string|undefined}
     */
    get extTid() {
        if (!this.isValid()) return

        return this.tid + (!this.idExt ? '.' + this.defaultExt : '')
    }

    /**
     * Returns a string holding the relative path to the resource of this tid on the resource
     * directory of the server. Returns undefined if no valid tid is given
     *
     * @returns {string|undefined}
     */
    get file() {
        if (!this.isValid()) return

        return (this.key ? this.key + '/' : '') + this.extId
    }

    /**
     * Returns a string holding the mime media type of this tid or undefined if no valid tid
     * is given
     *
     * @returns {string|undefined}
     */
    get mediaType() {
        return this.isJsonBased() ? 'text' : this.key
    }

    /**
     * Returns a string holding the mime subtype of this tid or undefined if no valid tid is
     * given
     *
     * @returns {string|undefined}
     */
    get subType() {
        return ext2info[this.ext].subType
    }

    /**
     * Returns a string holding the mime type of this tid or undefined if no valid tid is given
     *
     * @returns {string|undefined}
     */
    get mimeType() {
        return this.mediaType + '/' + this.subType
    }
}

const InvalidDescriptor = new Descriptor('', false)

/**
 * A factory for typed resource ids
 */
const makeDescriptor = {

    /**
     * Creates a new resource descriptor for the given tid and returns it
     * If the strict flag is set, an error is thrown when no valid descriptor could be created
     *
     * @param {string} tid
     * @param {boolean} strict
     * @param {string} expectedType
     *
     * @returns {Descriptor}
     */
    fromTid: (tid, strict = true, expectedType) => {
        const descriptor = new Descriptor(tid, expectedType)
        if (strict && !descriptor.isValid())
            throw Error(`Invalid typed resource id "${tid}" given`)

        return descriptor
    },

    /**
     * Creates a new resource descriptor for the given resource type and id and returns it
     *
     * @param {string} type
     * @param {string} id
     * @param {boolean} strict
     *
     * @returns {Descriptor}
     */
    fromTypeAndId: (type, id, strict = true) => {
        const prefix = RESOURCE.PREFIX[type]
        const tid = prefix ? prefix + id : ''

        return makeDescriptor.fromTid(tid, strict, type)
    },

    /**
     * Creates a new resource descriptor of a json type for the given id and returns it
     *
     * @param {string} id
     * @param {boolean} strict
     *
     * @returns {Descriptor}
     */
    fromJsonId: (id, strict = true) => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.JSON, id, strict),

    /**
     * Creates a new resource descriptor of an image type for the given id and returns it
     *
     * @param {string} id
     * @param {boolean} strict
     *
     * @returns {Descriptor}
     */
    fromImageId: (id, strict = true) => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.IMAGE, id, strict),

    /**
     * Creates a new resource descriptor of a audio type for the given id and returns it
     *
     * @param {string} id
     * @param {boolean} strict
     *
     * @returns {Descriptor}
     */
    fromAudioId: (id, strict = true) => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.AUDIO, id, strict),

    /**
     * Creates a new resource descriptor of a video type for the given id and returns it
     *
     * @param {string} id
     * @param {boolean} strict
     *
     * @returns {Descriptor}
     */
    fromVideoId: (id, strict = true) => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.VIDEO, id, strict),

    /**
     * Creates a new resource descriptor matching the given relative server path and returns it
     *
     * @param {string} relPath
     *
     * @returns {Descriptor}
     */
    fromFile: relPath => {
        const ldx = relPath.lastIndexOf('.')
        if (ldx < 0) return InvalidDescriptor

        const ext = relPath.substring(ldx + 1)
        let id = relPath.substring(0, ldx)
        const type = ext2type[ext]
        if (!type) return InvalidDescriptor

        const idx = id.indexOf('/')
        const dir = idx > 0 ? id.substring(0, idx) : ''
        let prefix = RESOURCE.PREFIX[type]
        if (dir) {
            if (dir !== RESOURCE.KEY[type]) return InvalidDescriptor
            id = relPath.substring(idx + 1)
            let defExt = ResourceTypeRegistry.getDefaultExt(type)
            if (defExt) {
                defExt = '.' + defExt
                if (id.endsWith(defExt)) id = id.substring(0, id.length - defExt.length)
            }
        } else {
            if (type !== RESOURCE.TYPE.JSON) return InvalidDescriptor
            prefix = RESOURCE.PREFIX[RESOURCE.TYPE.CORE]
        }
        return new Descriptor(prefix + id)
    }
}

module.exports = {
    RESOURCE,
    id2tid,
    tid2id,
    tid2type,
    text2id,
    prefix2type,
    type2tid,
    typeText2tid,
    map2extMap,
    tids2extTids,
    id2jsonTid,
    id2coreTid,
    id2imageTid,
    id2audioTid,
    id2videoTid,
    makeDescriptor,
    ResourceTypeRegistry
}