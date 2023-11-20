const { d } = require('./helper.cjs')

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
for (const [ type, prefix ] of Object.entries(RESOURCE.PREFIX)) {
    prefix2type[prefix] = type
}

const type2exts = {
    [RESOURCE.TYPE.JSON]: [],
    [RESOURCE.TYPE.IMAGE]: [],
    [RESOURCE.TYPE.AUDIO]: [],
    [RESOURCE.TYPE.VIDEO]: [],
    [RESOURCE.TYPE.CORE]: ['json']
}

const ext2type = {}
const ext2info = {}

const ResourceTypeRegistry = {

    getDefaultExt: type => {
        const exts = type2exts[type]
        return exts.length ? exts[0] : undefined
    },

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

const makeDescriptor = {

    fromTid: tid => new Descriptor(tid),

    fromTypeAndId: (type, id) => new Descriptor(RESOURCE.PREFIX[type] + id),

    fromJsonId: id => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.JSON, id),

    fromImageId: id => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.IMAGE, id),

    fromAudioId: id => makeDescriptor.fromTypeAndId(RESOURCE.TYPE.AUDIO, id),

    /**
     *
     *
     * @param relPath
     */
    fromFile: relPath => {
        const ldx = relPath.lastIndexOf('.')
        if (ldx < 0) return

        const ext = relPath.substring(ldx + 1)
        let id = relPath.substring(0, ldx)
        const type = ext2type[ext]
        if (!type) return

        const idx = id.indexOf('/')
        const dir = idx > 0 ? id.substring(0, idx) : ''
        let prefix = RESOURCE.PREFIX[type]
        if (dir) {
            if (dir !== RESOURCE.KEY[type]) return
            id = relPath.substring(idx + 1)
            let defExt = ResourceTypeRegistry.getDefaultExt(type)
            if (defExt) {
                defExt = '.' + defExt
                if (id.endsWith(defExt)) id = id.substring(0, id.length - defExt.length)
            }
        } else {
            if (type !== RESOURCE.TYPE.JSON) return
            prefix = RESOURCE.PREFIX[RESOURCE.TYPE.CORE]
        }
        return new Descriptor(prefix + id)
    }
}

class Descriptor {

    constructor(tid) {
        if (!tid)
            throw Error(`No type id given in constructor of resource descriptor`)

        this.tid = tid
        this.type = this.extractType()
        this.id = this.extractId()
    }

    extractType() {
        if (!this.tid || this.tid.length <= 1) return

        return prefix2type[this.tid[0]]
    }

    extractId() {
        if (!this.type || this.tid.length <= 1) return
        return this.tid.substring(1)
    }

    isValid() {
        return !!(this.type && this.id)
    }

    isJson() {
        return this.type === RESOURCE.TYPE.JSON
    }

    isCoreJson() {
        return this.type === RESOURCE.TYPE.CORE
    }

    isJsonBased() {
        return [RESOURCE.TYPE.JSON, RESOURCE.TYPE.CORE].includes(this.type)
    }

    isImage() {
        return this.type === RESOURCE.TYPE.IMAGE
    }

    isAudio() {
        return this.type === RESOURCE.TYPE.AUDIO
    }

    get key() {
        switch (this.type) {
            case RESOURCE.TYPE.JSON:
            case RESOURCE.TYPE.IMAGE:
            case RESOURCE.TYPE.AUDIO:
            case RESOURCE.TYPE.VIDEO:
                return RESOURCE.KEY[this.type]
        }
    }

    get ext() {
        if (!this.isValid()) return

        const ext = this.idExt
        return ext ? ext : this.defaultExt
    }

    get idExt() {
        if (!this.isValid()) return

        const idx = this.id.lastIndexOf('.')

        if (idx <= 0) return

        const ext = this.id.substring(idx + 1)
        if (this.allowedExt.includes(ext)) return ext
    }

    get allowedExt() {
        return this.type ? type2exts[this.type] : []
    }

    get defaultExt() {
        const exts = this.allowedExt
        return exts.length ? exts[0] : ''
    }

    get extId() {
        if (!this.isValid()) return

        return this.id + (!this.idExt ? '.' + this.defaultExt : '')
    }

    get extTid() {
        if (!this.isValid()) return

        return this.tid + (!this.idExt ? '.' + this.defaultExt : '')
    }

    get file() {
        if (!this.isValid()) return

        return (this.key ? this.key + '/' : '') + this.extId
    }

    get mediaType() {
        return this.isJsonBased() ? 'text' : this.key
    }

    get subType() {
        return ext2info[this.ext].subType
    }

    get mimeType() {
        return this.mediaType + '/' + this.subType
    }
}

/*
const MimeCodec = (mediaType, subType) => {
    return {
        encode: content => {},
        decode: content => {
            const base64 = Buffer.from(content, 'binary').toString('base64')
            return `data:${mediaType}/${subType};base64,${base64}`
        }
    }
}
 */

ResourceTypeRegistry
    .register(
        'json',
        RESOURCE.TYPE.JSON,
        {
            encode: value => JSON.stringify(value, null, 4),
            decode: value => JSON.parse(value)
        }
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

const tid2id = tid => tid.substring(1)

const text2id = {}
for (const [ id, text ] of Object.entries(RESOURCE.TEXT)) {
    text2id[text] = id
}


const tid2type = tid => {
    if (!tid)
        throw Error('Empty typed resource id given')

    const type = prefix2type[tid[0]]
    if (!type)
        throw Error(`Could not extract type from typed id "${tid}"`)

    return type
}

const jsonPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.JSON]
const imagePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE]
const audioPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO]
const corePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.CORE]
const id2jsonTid = id => jsonPrefix + id
const id2imageTid = id => imagePrefix + id
const id2audioTid = id => audioPrefix + id
const id2coreTid = id => corePrefix + id

const type2tid = {
    [RESOURCE.TYPE.JSON]: id2jsonTid,
    [RESOURCE.TYPE.IMAGE]: id2imageTid,
    [RESOURCE.TYPE.AUDIO]: id2audioTid,
    [RESOURCE.TYPE.CORE]: id2coreTid
}

const id2tid = (type, id) => {
    const func = type2tid[type]
    if (!func)
        throw Error(`Invalid resource type "${type}" given!`);

    return func(id)
}
const typeText2tid = (typeText, id) => {
    const type = text2id[typeText]
    if (type === undefined)
        throw Error(`Could not find type matching "${typeText}"`)

    return id2tid(type, id)
}

const resId2tid = resId => {
    const index = resId.indexOf(':')
    if (index === -1)
        throw Error(`Invalid resource id "${resId}" given`)

    return id2tid(text2id[resId.substring(0, index)], resId.substring(index + 1))
}

const tid2typeText = tid => RESOURCE.TEXT[tid2type(tid)]

module.exports = {
    RESOURCE,
    id2tid,
    tid2id,
    tid2type,
    tid2typeText,
    text2id,
    prefix2type,
    type2tid,
    typeText2tid,
    resId2tid,
    makeDescriptor,
    ResourceTypeRegistry
}
