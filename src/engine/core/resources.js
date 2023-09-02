import { d, isObject, isUrl, isDataUrl, toPairs, toKeys, toValues } from "helper/helper"
import { RESOURCE } from "./const"
import {ImageResource, AudioResource, AppliedImage} from "./classes"

const tid2id = tid => tid.substring(1) // tid => tid.substring(tid.indexOf(':') + 1)

const text2id = {}
for (const [ id, text ] of Object.entries(RESOURCE.TEXT)) {
    text2id[text] = id
}

const prefix2type = {}
for (const [ type, prefix ] of Object.entries(RESOURCE.PREFIX)) {
    prefix2type[prefix] = type
}

const isTid = value => {
    const type = tid2type(value, false)
    return type !== undefined
}

const tid2type = (tid, strict = true) => {
    if (!tid) {
        if (strict)
            throw Error('Empty typed resource id given')

        return
    }

    // const typeText = tid.substring(0, tid.indexOf(':') + 1) // tid[0]
    const type = prefix2type[tid[0]]

    if (!type) {
        if (strict)
            throw Error(`Could not extract type from typed id "${tid}"`)

        return
    }

    return parseInt(type, 10)
}


const jsonPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.JSON]
const imagePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE]
const audioPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO]
const id2jsonTid = id => jsonPrefix + id
const id2imageTid = id => imagePrefix + id
const id2audioTid = id => audioPrefix + id

const type2tid = {
    [RESOURCE.TYPE.JSON]: id2jsonTid,
    [RESOURCE.TYPE.IMAGE]: id2imageTid,
    [RESOURCE.TYPE.AUDIO]: id2audioTid
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

/*
    CHECK:

     - clear() / clearResources() wo wird das gebraucht?
     - resolved-flag

     - storageOverwrites wofür?
     - storageScreenRemotes?
     - buildUnresolvedResources
     - getRelevantScreenResources

     - http-link-fetch?
     - hasLocalResources wofür?
     - updateXResource() wikrlich?
     - makeImageResource()
     - storeScreenModel()
     - deployResources(screen, resources, direct, indirect)

    TODO:
      - storage class
      - error handling
      - server routen
      - resId methoden
      - resourceOverwrite-Cleanup

    Json:
    ------------------



    Image:
    ------------------
       ImageResource.resolved
    ------------------
      const image = new ImageResource(value)
      promises.push(
         image.getNewDecodingPromise().then(() => {
            this.setResource('image', id, image, 'browser')
         })
      )

      // value.startsWith('http')
      promises.push(
         fetch(value, {mode: 'cors'}).then(
             response => {
                if (!response.ok)
                    throw Error(`Could not open url`)

                return (
                    response.blob().then(blob => {
                        const resource = new ImageResource(URL.createObjectURL(blob))
                        return resource.getNewDecodePromise().then(() => {
                            this.setResource('image', 'id', resource, 'external')
                        })
                    })
                )
             }
         )
      )

    Audio:
    ------------------
       AudioResource.resolved
    ------------------
      const audio = new AudioResource(value)
      promises.push(
         audio.getNewLoadingPromise().then(() => {
             this.setResource('audio', id, audio, 'browser')
         })
      )



 */

const SyncResolver = (id2source, permanentIds) => {
    const added = []

    return {
        add: (tid, value, source, permanent) => {
            const type = tid2type(tid)
            switch (type) {

                case RESOURCE.TYPE.JSON:
                    added.push({ id: tid, value })
                    break;

                case RESOURCE.TYPE.IMAGE:
                    added.push({id: tid, value: value instanceof AppliedImage ? value.imageResource : value})
                    break;

                case RESOURCE.TYPE.AUDIO:
                    // TODO resolvedAudio?
                    added.push({id: tid, value })
            }
            if (source) id2source.set(tid, source)
            if (permanent) permanentIds.add(tid)
        },

        resolve: resolvedResources => {
            for (const { id, value } of added) {
                resolvedResources.set(id, value)
            }
        }
    }
}

const ResourceResolver = (id2source, permanentIds) => {
    const promises = []

    return {
        add: (tid, value, source, permanent) => {
            const type = tid2type(tid)
            switch (type) {
                case RESOURCE.TYPE.JSON:
                    promises.push(
                        Promise.resolve({id: tid, value: value})
                    )
                    break;

                case RESOURCE.TYPE.IMAGE:
                    if (source === 'code' && value.startsWith('http')) {
                        source = 'external'
                        promises.push(
                            fetch(value, {mode: 'cors'}).then(
                                response => {
                                    if (!response.ok)
                                        throw Error(`Could not open url`)

                                    return (
                                        response.blob().then(blob => {
                                            const image = new ImageResource(URL.createObjectURL(blob))
                                            image.setId(tid2id(tid))
                                            return image.getNewDecodePromise().then(() => {
                                                return { id: tid, value: image }
                                            })
                                        })
                                    )
                                }
                            )
                        )
                        break
                    }
                    const image = new ImageResource(value)
                    image.setId(tid2id(tid))
                    promises.push(
                        image.getNewDecodePromise().then(() => {
                            return { id: tid, value: image }
                        })
                    )
                    break;

                case RESOURCE.TYPE.AUDIO:
                    if (source === 'code' && value.startsWith('http')) {
                        source = 'external'
                        promises.push(
                            fetch(value, {mode: 'cors'}).then(
                                response => {
                                    if (!response.ok)
                                        throw Error(`Could not open url`)

                                    return (
                                        response.blob().then(blob => {
                                            const audio = new AudioResource(URL.createObjectURL(blob))
                                            return audio.getNewLoadingPromise().then(() => {
                                                return { id: tid, value: audio }
                                            })
                                        })
                                    )
                                }
                            )
                        )
                        break
                    }
                    const audio = new AudioResource(value)
                    promises.push(
                        audio.getNewLoadingPromise().then(() => {
                            return { id: tid, value: audio }
                        })
                    )
                    break;
            }

            if (source) id2source.set(tid, source)
            if (permanent) permanentIds.add(tid)
        },

        resolve: (resolvedResources) => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value } of resolved) {
                    resolvedResources.set(id, value)
                }
            })
        }
    }
}

const DummyResolver = (id2source, permanentIds) => {

    const promises = []

    return {
        add: (tid, value, source, permanent) => {
            if (source) id2source.set(tid, source)
            if (permanent) permanentIds.add(tid)
            promises.push(
                Promise.resolve({id: tid, value: value})
            );
        },

        resolve: (resolvedResources) => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value } of resolved) {
                    resolvedResources.set(id, value)
                }
            })
        }
    }
}


class ResourceManager {

    constructor(apiFetcher, localStorage, sessionStorage, resolver = DummyResolver) {

        this.permanent = false

        this.resolvedResources = new Map()
        this.requested = new Map()
        this._resources = null
        this.resolver = resolver

        this.apiFetcher = apiFetcher
        this.sessionStorage = sessionStorage
        this.localStorage = localStorage

        this.id2source = new Map()
        this.permanentIds = new Set()

        this.disabled = false
        this.preview = false
        this.permScopes = new Set();
    }

    setPreview(value) {
        this._resources = null
        this.preview = value
    }

    setDisabled(value) {
        this.disabled = value
    }

    setPermanent(value) {
        this.permanent = value === true
    }

    invalidatePermanentScope(scope) {
        this.permScopes.delete(scope)
    }

    hasPermanentScope(scope) {
        return this.permScopes.has(scope)
    }

    delete(scope, id) {
        const blockedIds = this.localStorage.getJson('blocked') ?? []
        if (blockedIds.includes(id)) return
        blockedIds.push(id)
        this.localStorage.storeJson('blocked', blockedIds)
    }

    revert(id) {
    }

    deployModel(model, scope = null) {
        const { resources, dependencies } = model.getResourcesAndDependencies()
        const lastResource = resources.at(-1)
        let tid = typeText2tid(lastResource.type, lastResource.id)
        return this.apiFetcher.fetch('store', { resources, dependencies, scope }).then(({ stored }) => {
            let success = stored.includes(tid)
            for (const tid of stored) {
                this.deleteFromStore(tid, true)
            }
            return success
		})
	}

    storeModel(model, scope = null) {
        const { resources, dependencies } = model.getResourcesAndDependencies()
        const resolver = SyncResolver(this.id2source, this.permanentIds)

        // store all resources this model uses
        let tid = null
        for (const { id, data, type } of resources) {
            this.localStorage.storeResourceById(text2id[type], id, data)
            const addTid = typeText2tid(type, id)
            tid = addTid // last resource should be the root resource
            resolver.add(addTid, data, 'browser', scope === null)
        }

        // update deps
        const id2children = this.localStorage.getJson('id2children') ?? {}

        for (const [ tid, depTids ] of toPairs(dependencies)) {
            id2children[tid] = depTids
        }
        this.localStorage.storeJson('id2children', id2children)
        resolver.resolve(this.resolvedResources)
        this._resources = null

        if (scope === null) return

        // update scope ids
        const scope2ids = this.localStorage.getJson('scope2ids') ?? {}
        const scopeIds = scope2ids[scope] ?? []
        if (!scopeIds.includes(tid)) scopeIds.push(tid)
        scope2ids[scope] = scopeIds
        this.localStorage.storeJson('scope2ids', scope2ids)
    }

    clear() {
        this.resolvedResources.clear()
        this.requested.clear()
        this.id2source.clear()
        this.permanentIds.clear()
        this._resources = null
    }

    clearTemporary() {
        this.resolvedResources.clear()
        /*
        const ids = [ ...this.resolvedResources.keys() ].filter(id => !this.permanentIds.has(id))
        for (const id of ids) {
            this.resolvedResources.delete(id)
        }

         */
    }

    deleteFromStore(tid, sync = false) {
		this.localStorage.deleteResource(tid)

        const scope2ids = this.localStorage.getJson('scope2ids') ?? {}
        let changed = false
		for (const ids of toValues(scope2ids)) {
            const index = ids.indexOf(tid)
			if (index === -1) continue
			ids.splice(index, 1)
            changed = true
		}
		if (changed) this.localStorage.storeJson('scope2ids', scope2ids)
			
		const id2children = this.localStorage.getJson('id2children') ?? {}
        const deps = id2children[tid] ?? []
		delete id2children[tid]

        if (sync) {
            for (const ids of toValues(id2children)) {
                const index = ids.indexOf(tid)
                if (index === -1) continue
                ids.splice(index, 1)
            }
            this.localStorage.storeJson('id2children', id2children)
            return
        }

        return this.apiFetcher.fetch('has', { resources: [tid] }).then(({ found }) => {
            if (!found.includes(tid)) {
                for (const ids of toValues(id2children)) {
                    const index = ids.indexOf(tid)
                    if (index === -1) continue
                    ids.splice(index, 1)
                }
                this.localStorage.storeJson('id2children', id2children)
            }
            const promises = [];
            for (const tid of deps) {
                promises.push(this.deleteFromStore(tid))
            }
            return Promise.all(promises)
        })
	}
	
    removeJson(id) {
        return this.remove(id2jsonTid(id))
    }

    removeImage(id) {
        return this.remove(id2imageTid(id))
    }

    removeAudio(id) {
        return this.remove(id2audioTid(id))
    }

    remove(tid) {
        this._resources = null
        this.resolvedResources.delete(tid)
        this.id2source.delete(tid)
        this.permanentIds.delete(tid)
    }

    hasPermanent(tid) {
        return this.permanentIds.has(tid)
    }

    hasPermanentJson(id) {
        return this.hasPermanent(id2jsonTid(id))
    }

    hasPermanentImage(id) {
        return this.hasPermanent(id2imageTid(id))
    }

    hasPermanentAudio(id) {
        return this.hasPermanent(id2audioTid(id))
    }

    has(tid) {
        if (this.disabled) return false;

        return this.resolvedResources.has(tid)
    }

    hasJson(id) {
        return this.has(id2jsonTid(id))
    }

    hasImage(id) {
        return this.has(id2imageTid(id))
    }

    hasAudio(id) {
        return this.has(id2audioTid(id))
    }

    hasBrowserResources() {
        return !this.localStorage.hasNoTypedIds()
    }

    add(tid, value = null) {
        if (this.requested.has(tid))
            throw Error(`Resource of type ${tid2typeText(tid)} with id "${tid2id(tid)}" was already requested!`)

        this.requested.set(tid, value)
        return this
    }

    addJson(id, value = null) {
        return this.add(id2jsonTid(id), value)
    }

    addImage(id, value = null) {
        return this.add(id2imageTid(id), value)
    }

    addAudio(id, value = null) {
        return this.add(id2audioTid(id), value)
    }

    clearBrowserResources() {
        this._resources = null
        return this.localStorage.truncate()
    }

    getResourceSource(tid) {
        return this.id2source.get(tid)
    }

    getJsonSource(id) {
        return this.getResourceSource(id2jsonTid(id))
    }

    getImageSource(id) {
        return this.getResourceSource(id2imageTid(id))
    }

    getAudioSource(id) {
        return this.getResourceSource(id2audioTid(id))
    }

    getAllResourceIds(type) {
        // TODO: we might also fetch the server ids here
        switch (type) {
            case 'json':
                return this.localStorage.getJsonIds();

            case 'image':
                return this.localStorage.getImageIds();
        }
        return [];
    }

    createImageResource(data, id = null) {
        const img = new ImageResource(data)
        img.resolved = true
        img.id = id
        return img
    }

    getResourceById(type, id) {
        const resources = this.resources[type]

        if (!resources)
            throw Error(`Invalid resource type "${type}" requested`)

        const value = resources[id]
        if (!value)
            throw Error(`Requested ${type} resource "${id}" is not available`)

        return value
    }

    getJson(id) {
        return this.getResourceById('json', id)
    }

    getImage(id) {
        return this.getResourceById('image', id)
    }

    getAudio(id) {
        return this.getResourceById('audio', id)
    }

    get resources() {
        if (this._resources === null) {
            const resourceMaps = [Object.fromEntries(this.resolvedResources)];
            if (this.preview) {

                // TODO: resourceMaps.push(Object.fromEntries(this.sessionStorage))
            }
            const json = {}
            const image = {}
            const audio = {}
            const map = {
                [RESOURCE.TYPE.JSON]: json,
                [RESOURCE.TYPE.IMAGE]: image,
                [RESOURCE.TYPE.AUDIO]: audio,
            }
            for (const resourceMap of resourceMaps) {
                for (const [ tid, value ] of toPairs(resourceMap)) {
                    map[tid2type(tid)][tid2id(tid)] = value
                }
            }
            this._resources = { json, image, audio }
        }
        return this._resources
    }

    load(scope, permanent = false) {

        const resolver = this.resolver(this.id2source, this.permanentIds)

        // add missing ids from local scope
        const scope2ids = this.localStorage.getJson('scope2ids') ?? {}
        const scopeIds = scope2ids[scope] ?? []
        const id2children = this.localStorage.getJson('id2children') ?? {}

        for (const tid of scopeIds) {
            if (!this.requested.has(tid)) this.requested.set(tid, null) // null means that we get an error if no store or server resource exists
        }

        // lets add dependencies
        const checkIds = [ ...this.requested.keys() ];
        while (checkIds.length) {
            const tid = checkIds.pop()
            if (!this.requested.has(tid)) {
                this.requested.set(tid, null)
            }
            if (!(tid in id2children)) continue
            checkIds.push( ...id2children[tid] )
        }

        const ids = [ ...this.requested.keys() ]
        const resources = []
        const id2resolved = {}
        for (const id of this.localStorage.getTypedIds()) {
            id2resolved[id] = false
        }

        for (const tid of ids) {
            if (this.resolvedResources.has(tid)) continue
            if (this.localStorage.hasResource(tid)) {
                resolver.add(tid, this.localStorage.getResource(tid), 'browser', permanent)
                id2resolved[tid] = true
            } else {
                resources.push(tid)
            }
        }
        const storeInfo = { id2resolved, id2children }
        return (
            this.apiFetcher.fetch('resources', {
                scope: permanent ? '' : scope, // TODO permanent request should send null
                resources,
                storeInfo
            })
                .then(({ found, missing, add = [] }) => {
                    for (const tid of missing) {
                        const value = this.requested.get(tid)
                        if (!value)
                            throw Error(`Could not resolve resource of type ${tid2typeText(tid)} with id "${tid2id(tid)}"`)

                        resolver.add(tid, value, 'code', permanent)
                    }
                    for (const tid of add) {
                        resolver.add(tid, this.localStorage.getResource(tid), 'browser', permanent)
                    }
                    if (!permanent) {
                        // remove all temporary resolved value which were not requested again
                        for (const tid of this.resolvedResources.keys()) {
                            if (this.requested.has(tid) || this.permanentIds.has(tid) || add.includes(tid)) continue
                            this.resolvedResources.delete(tid)
                        }
                    }
                    for (const [ tid, resource ] of Object.entries(found)) {
                        resolver.add(tid, resource, 'server', permanent)
                    }
                    return resolver.resolve(this.resolvedResources)
                })
                .then(() => {
                    if (permanent && scope !== null) {
                        this.permScopes.add(scope)
                    }
                    this.requested.clear()
                    this._resources = null
                })
        )
    }

    loadPermanentScope(scope) {
        return this.load(scope, true)
    }

    loadTemporaryScope(scope) {
        return this.load(scope, false)
    }
}

class ResourceProvider {}

/**
 * @class ResourceProvider
 *
 * Base class for storing resource by passing them as JSON object to the constructor or
 * by calling one of the add methods which allow chaining. All stored resources can be returned
 * as JSON object
 *
 */
class SingleResourceProvider extends ResourceProvider {

    /**
     * Creates a new provider which is initialized with the resources given in the passed JSON object.
     *
     * @param resources
     */
    constructor(resources) {
        super()
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
        if (typeof id !== 'string')
            throw Error(`Resource id must be a string but got type "${typeof id}"`)

        if (id in this.id2content)
            throw Error(`Resource id "${id}" already exists`)

        if (id === '')
            throw Error('Resource id cannot be empty')

        if (!id.match(/^([0-9a-z_\-]+\/)*([0-9a-z\-_]+\.)*[0-9a-z\-_]+$/i))
            throw Error(`Invalid id "${id}" given!`)
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
        return {[this.key]: { ...this.id2content }}
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
class ImageResourceProvider extends SingleResourceProvider {

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
class AudioResourceProvider extends SingleResourceProvider {

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
class JsonResourceProvider extends SingleResourceProvider {

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
class MultiResourcesProvider extends ResourceProvider {

    /**
     * Creates a new provider which is initialized with the resources given in the passed JSON object.
     * Resources must be grouped by a resource key representing their type ("image", "audio" or "video")
     *
     * @param {object} resources
     */
    constructor(resources = {}) {
        super()
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
    ResourceManager,
    ResourceResolver,
    id2jsonTid,
    id2imageTid,
    id2audioTid,
    tid2typeText,
    typeText2tid,
    tid2id,
    tid2type,
    id2tid,
    resId2tid,
    isTid,

    ResourceProvider,
    SingleResourceProvider,
    MultiResourcesProvider,
    Resources,
    ImageResources,
    AudioResources,
    JsonResources,
    getResourcesAndCallback
}