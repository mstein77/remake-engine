import { d } from "helper/helper"

class ResourceProvider {

    constructor(resources) {
        this.id2content = {}
        this.addObject(resources)
    }

    get key() {
        throw Error(`No key given in ResourceProvider`)
    }

    add(id, content) {
        if (typeof id === 'object') {
            this.addObject(id)
        } else if (Array.isArray(content)) {
            this.addArray(id, content)
        } else {
            this.id2content[id] = content
        }
        return this
    }

    addArray(id, contentArray) {
        let index = 0;
        for (const content of contentArray) {
            this.add(this.getIdWithIndex(id, index), content)
            index++
        }
    }

    addObject(obj) {
        if (!obj) return

        for (const [ id, content ] of Object.entries(obj)) {
            this.add(id, content)
        }
        return this
    }

    getIdWithIndex(id, index) {
        return id + '_' + index
    }

    addResources(obj) {
    }

    get resources() {
        return {[this.key]: this.id2content}
    }
}

class ImageResourceProvider extends ResourceProvider {
    get key() {
        return 'image'
    }

    getIdWithIndex(id, index) {
        const idx = id.lastIndexOf('.')
        return id.substring(0, idx) + '_' + index + id.substring(idx)
    }
}

class AudioResourceProvider extends ResourceProvider {
    get key() {
        return 'audio'
    }
}

class JsonResourceProvider extends ResourceProvider {
    get key() {
        return 'json'
    }
}

class AllResourcesProvider {

    constructor(resources) {
        const { audio, image, json } = resources
        this.audio = new AudioResourceProvider(audio)
        this.json = new JsonResourceProvider(json)
        this.image = new ImageResourceProvider(image)
    }

    add(key, id, content) {
        if (!(['audio', 'json', 'image'].includes(key)))
            throw Error(`TODO`)
        this[key].add(id, content)
    }

    addObject(obj) {
        for (const [ key, subResources ] of Object.entries(obj)) {
            for (const [ id, content ] of Object.entries(subResources)) {
                this.add(key, id, content)
            }
        }
    }

    addImage(id, content) {
        this.image.add(id, content)
    }

    addImages(obj) {
        this.image.addObject(obj)
    }

    addJson(id, content) {
        this.json.add(id, content)
    }

    addJsons(obj) {
        this.json.addObject(obj)
    }

    addAudio(id, content) {
        this.audio.add(id, content)
    }

    addAudios(obj) {
        this.audio.addObject(obj)
    }

    get resources() {
        return {
            ...this.json.resources,
            ...this.image.resources,
            ...this.audio.resources
        }
    }
}

const ImageResources = resources => new ImageResourceProvider(resources)
const JsonResources = resources => new JsonResourceProvider(resources)
const AudioResources = resources => new AudioResourceProvider(resources)
const Resources = resources => new AllResourcesProvider(resources)

const isResourceProvider = value => value instanceof ResourceProvider

const getResourcesAndCallback = ( ...args ) => {
    const resources = {}
    let callback

    for (const arg of args) {
        const type = typeof arg
        if (type === 'function') {
            if (callback) throw Error(`TODO`)
            callback = arg
            continue
        }
        if (type !== 'object') throw Error(`TODO`)

        const provider = !isResourceProvider(arg) ? Resources(arg) : arg
        for (const [ key, subResources ] of Object.entries(provider.resources)) {
            if (!resources[key]) resources[key] = {}
            for (const [ id, content ] of Object.entries(subResources)) {
                resources[key][id] = content
            }
        }
    }
    return {
        resources,
        callback
    }
}

export {
    Resources,
    ImageResources,
    AudioResources,
    JsonResources,
    getResourcesAndCallback
}