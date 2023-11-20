import { d, isObject, isUrl, isDataUrl, toPairs, toValues, without } from "helper/helper"
import { RESOURCE, makeDescriptor, typeText2tid  } from "shared/classes/resources.cjs"
import { ImageResource, AudioResource, AppliedImage } from "./classes"
import { MapStorage } from "shared/storage/mapStorage.cjs"
import { StorageManager } from "shared/classes/storage.cjs"

const tid2id = tid => tid.substring(1)

const text2id = {}
for (const [ id, text ] of Object.entries(RESOURCE.TEXT)) {
    text2id[text] = id
}

const tid2type = (tid, strict = true) => {
    const descriptor = makeDescriptor.fromTid(tid)

    if (!descriptor || !descriptor.isValid()) {
        if (strict)
            throw Error('Empty typed resource id given')

        return
    }
    return descriptor.type
}

const jsonPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.JSON]
const imagePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE]
const audioPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO]
const id2jsonTid = id => jsonPrefix + id
const id2imageTid = id => imagePrefix + id
const id2audioTid = id => audioPrefix + id

const tid2typeText = tid => RESOURCE.TEXT[tid2type(tid)]

const SyncResolver = (id2source, permId2scope) => {
    const added = []
    const ids = []

    return {
        add: (tid, value, source) => {
            ids.push(tid)
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
        },
        resolve: (resolvedResources, permScope) => {
            for (const { id, value } of added) {
                resolvedResources.set(id, value)
            }
            if (!permScope) return
            for (const id of ids) {
                permId2scope.set(id, permScope)
            }
        }
    }
}

const ResourceResolver = (id2source, permId2scope) => {
    const promises = []
    const ids = []

    return {
        add: (tid, value, source) => {
            ids.push(tid)

            const { type } = makeDescriptor.fromTid(tid)
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

                default:
                    throw Error(`Unknown resource type "${type}" given`)
            }

            if (source) id2source.set(tid, source)
        },

        resolve: (resolvedResources, permScope) => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value } of resolved) {
                    resolvedResources.set(id, value)
                }
                if (!permScope) return
                for (const id of ids) {
                    permId2scope.set(id, permScope)
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


/**
 * Fragen:
 *   - beim Speichern werden temp-resourcen überschrieben, aber werden die wirklich mit ihren
 *     Dependencies neu geladen, wenn der Screen reloaded wird, oder spielt da die Regel rein, dass
 *     eine Resource nur neu geladen wird, wenn sie nicht schon vorher drin war?
 *
 *   - Wenn man eine globale Resource editiert, die bislang nur im Code über den Globals-Init()
 *     definiert wurde: wie kann ich dann feststellen, dass diese in den "globals"-scope gespeichert
 *     werden muss, statt dem aktuellen Screen, denn es sollte keinen Eintrag in permId2scope geben?
 *
 * The resource manager
 *
 *   Allows adding of resources which should be available in the next screen. When a resource is requested
 *   by its type and id, it's also possible to give a fallback value for the case that the requested id
 *   could not be found in the browser or server storage. All added resources are resolved when the next
 *   load is triggered which can either be temporary or permanent. A permanent load will remove all permanently
 *   loaded resources from before, which are not required in the current screen. Permanent resources are only
 *   loaded once and will be kept in the manager. After loading all permanent and requested resources will be
 *   available by their id or as resources object
 *
 *   The manager is used as follows:
 *
 *    - in the global request phase resources are added and afterwards the permanent load is triggered which
 *      will pass the resources object to the global init method
 *
 *    - in the screen request phase resources are added and afterwards the permanent load is triggered which
 *      will pass the resources object to the screen init method
 *
 *    - Model instantiation in the init-Methods will try to get a config for the id of the model from the
 *      manager first. This means that not all instantiated models must be stored in the manager.
 *      The manager is disabled by the editor, when a model should be instantiated with a temporary
 *      config.
 *
 *    - An image-property in a model config, must be an ImageResource instance or a string holding an id, so
 *      that the manager can be asked if he has already loaded the image.
 *
 *
 *   TODO:
 *      store
 *
 *   Resolving:
 *     a) JSON
 *          - addJson('foo', {bla: 'fasel'})
 *
 *            1. SM.hasJsonResource('foo') => SM.getJsonResource('foo')  // browserStorage converts string to JSON
 *            2. apiFetcher.load('jfoo') => ...SM.getResource('jfoo') // fileStorage converts file content to JSON
 *            3. fallback => JSON // is already a JSON
 *
 *            resolver.add('jfoo', {bla: 'fasel'}, 'code')
 *            resolver.add('jfoo', <json>, 'browser')
 *            resolver.add('jfoo', <json>, 'server')
 *
 *
 *     b) IMAGE
 *          - addImage('foo', 'data:image/png,base64...')
 *
 *            1. SM.hasImageResource('foo') => SM.getImageResource('foo')  // browserStorage converts string to image
 *            2. apiFetcher.load('jfoo') => ...SM.getResource('jfoo') // fileStorage converts file content to JSON
 *            3. fallback =>  //
 *
             resolver.add('ifoo', 'data:...', 'code')
             resolver.add('jfoo', 'data:...', 'browser')
             resolver.add('jfoo', 'data:...', 'server')  // API loaded
             resolver.add('') // static load
             resolver.add('ifoo', 'http://...' // external load
 */
class ResourceManager {

    constructor(apiFetcher, localStorage, sessionStorage, resolver = DummyResolver) {

        this.resolvedResources = new Map()
        this.requested = new Map()
        this._resources = null
        this.resolver = resolver

        this.apiFetcher = apiFetcher
        const dummyStorage = new StorageManager(MapStorage())
        this.sessionStorage = IS_DIST ? dummyStorage : sessionStorage
        this.localStorage = IS_DIST ? dummyStorage : localStorage

        this.id2origin = new Map()
        this.permId2scope = new Map()
        this.permScopes = new Set();

        this.disabled = false
        this.preview = false
    }

    getPermanentIds() {
        return [ ...this.permId2scope.keys() ]
    }

    getTemporaryIds() {
        const permIds = this.getPermanentIds()
        const tempIds = []
        for (const id of this.resolvedResources.keys()) {
            if (!permIds.includes(id)) tempIds.push(id)
        }
        return tempIds
    }

    setPreview(value) {
        this._resources = null
        this.preview = value
    }

    setDisabled(value) {
        this.disabled = value
    }

    invalidatePermanentScope(scope) {
        const ids = this.getPermanentIds()
        for (const id of ids) {
            if (this.permId2scope.get(id) !== scope) continue
            this.permId2scope.delete(id)
        }
        this.permScopes.delete(scope)
    }

    hasPermanentScope(scope) {
        return this.permScopes.has(scope)
    }

    delete(scope, id) {
        // TODO check where this is needed
        const blockedIds = this.localStorage.getJson('blocked') ?? []
        if (blockedIds.includes(id)) return
        blockedIds.push(id)
        this.localStorage.storeJson('blocked', blockedIds)
    }

    deployModel(model, scope = null) {
        const { resources, dependencies } = model.getResourcesAndDependencies(true)

        const lastResource = resources.at(-1)
        const id = typeText2tid(lastResource.type, lastResource.id)

        return this.apiFetcher.fetch('store', { id, resources, dependencies, scope }).then(({ stored }) => {
            let success = stored.includes(id)
            this.deleteIdsFromStore(stored)
            return success
		})
	}

    deleteIdsFromStore(tids) {
        const id2children = this.localStorage.getCoreResource('id2children') ?? {}
        for (const tid of tids) {
            this.localStorage.deleteResource(tid)
            delete id2children[tid]
        }
        this.localStorage.storeCoreResource('id2children', id2children)
        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        let changed = false
        for (const [ scope, ids ] of toPairs(scope2ids)) {
            const oldLength = ids.length
            const newIds = without(ids, tids)
            if (oldLength === newIds.length) continue
            scope2ids[scope] = newIds
            changed = true
        }
        if (changed) this.localStorage.storeCoreResource('scope2ids', scope2ids)
    }

    storeModel(model, scope = null) {
        const { resources, dependencies } = model.getResourcesAndDependencies()

        const lastResource = resources.at(-1)
        const tid = typeText2tid(lastResource.type, lastResource.id)
        const permScope = this.permId2scope[tid]
        const resolver = SyncResolver(this.id2origin, this.permId2scope)

        // store all resources this model uses
        for (const { id, data, type } of resources) {
            this.localStorage.storeResourceById(text2id[type], id, data)
            const addTid = typeText2tid(type, id)
            resolver.add(addTid, data, 'browser')
        }

        // update deps
        const id2children = this.localStorage.getCoreResource('id2children') ?? {}

        for (const [ tid, depTids ] of toPairs(dependencies)) {
            id2children[tid] = depTids
        }
        this.localStorage.storeCoreResource('id2children', id2children)
        resolver.resolve(this.resolvedResources, permScope)
        this._resources = null

        if (scope === null) return

        // update scope ids
        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        const scopeIds = scope2ids[scope] ?? []
        if (!scopeIds.includes(tid)) scopeIds.push(tid)
        scope2ids[scope] = scopeIds
        this.localStorage.storeCoreResource('scope2ids', scope2ids)
    }

    clear() {
        this.resolvedResources.clear()
        this.requested.clear()
        this.id2origin.clear()
        this.permId2scope.clear()
        this.permScopes.clear()
        this._resources = null
    }

    clearTempAndGlobals() {
        this.invalidatePermanentScope('globals')
        this.clearTemporary()
        this._resources = null
    }

    clearTemporary() {
        const ids = this.getTemporaryIds()
        for (const id of ids) {
            this.resolvedResources.delete(id)
        }
    }

    deleteFromStore(tid, sync = false) {
		this.localStorage.deleteResource(tid)

        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        let changed = false
		for (const ids of toValues(scope2ids)) {
            const index = ids.indexOf(tid)
			if (index === -1) continue
			ids.splice(index, 1)
            changed = true
		}
		if (changed) this.localStorage.storeCoreResource('scope2ids', scope2ids)
			
		const id2children = this.localStorage.getCoreResource('id2children') ?? {}
        const deps = id2children[tid] ?? []
		delete id2children[tid]

        if (sync) {
            for (const ids of toValues(id2children)) {
                const index = ids.indexOf(tid)
                if (index === -1) continue
                ids.splice(index, 1)
            }
            this.localStorage.storeCoreResource('id2children', id2children)
            return
        }

        return this.apiFetcher.fetch('has', { resources: [tid] }).then(({ found }) => {
            if (!found.includes(tid)) {
                for (const ids of toValues(id2children)) {
                    const index = ids.indexOf(tid)
                    if (index === -1) continue
                    ids.splice(index, 1)
                }
                this.localStorage.storeCoreResource('id2children', id2children)
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
        this.id2origin.delete(tid)
        this.permId2scope.delete(tid)
    }

    hasPermanent(tid) {
        return this.permId2scope.has(tid)
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
        return !this.localStorage.isEmpty()
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
        this.clearTempAndGlobals()
        return this.localStorage.truncateResources()
    }

    getResourceOrigin(tid) {
        return this.id2origin.get(tid)
    }

    getJsonOrigin(id) {
        return this.getResourceOrigin(id2jsonTid(id))
    }

    getImageSource(id) {
        return this.getResourceOrigin(id2imageTid(id))
    }

    getAudioOrigin(id) {
        return this.getResourceOrigin(id2audioTid(id))
    }

    getAllResourceIds(type) {
        // TODO: we might also fetch the server ids here
        switch (type) {
            case RESOURCE.TYPE.JSON:
                return this.localStorage.getJsonResourceIds();

            case RESOURCE.TYPE.IMAGE:
                return this.localStorage.getImageResourceIds();
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
                    const { id, type } = makeDescriptor.fromTid(tid)
                    map[type][id] = value
                }
            }
            this._resources = { json, image, audio }
        }
        return this._resources
    }

    load(scope, permanent = false) {
        if (!scope)
            throw Error(`No scope given`)

        const resolver = this.resolver(this.id2origin, this.permId2scope)

        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        const scopeIds = scope2ids[scope] ?? []
        for (const tid of scopeIds) {
            if (!this.requested.has(tid)) this.requested.set(tid, null) // null means that we get an error if no store or server resource exists
        }

        const ids = [ ...this.requested.keys() ];
        return this.apiFetcher.fetch('resources', {
            scope,
            ids,
            storedIds: this.localStorage.getPublicTypedResourceIds(),
            storedDeps: this.localStorage.getCoreResource('id2children') ?? {},
            tempIds: permanent ? [] : this.getTemporaryIds(),
            permIds: [ ...this.getPermanentIds() ]
        }).then(({ found, missing, add = [], drop = [] }) => {
            for (const tid of missing) {
                const value = this.requested.get(tid)
                if (!value)
                    throw Error(`Could not resolve resource of type ${tid2typeText(tid)} with id "${tid2id(tid)}"`)

                resolver.add(tid, value, 'code')
            }
            for (const tid of add) {
                resolver.add(tid, this.localStorage.getResource(tid), 'browser')
            }
            for (const [ tid, data ] of toPairs(found)) {
                resolver.add(tid, data, 'server')
            }
            if (!permanent) {
                for (const tid of drop) {
                    this.resolvedResources.delete(tid)
                }
            }
            return resolver.resolve(this.resolvedResources, permanent ? scope : undefined)
        })
        .then(() => {
            if (permanent && scope !== null) {
                this.permScopes.add(scope)
            }
            this.requested.clear()
            this._resources = null
        })
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

        return;
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

    ResourceProvider,
    SingleResourceProvider,
    MultiResourcesProvider,
    Resources,
    ImageResources,
    AudioResources,
    JsonResources,
    getResourcesAndCallback
}