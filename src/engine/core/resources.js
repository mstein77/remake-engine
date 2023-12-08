import { d, isNull, isObject, isUrl, isDataUrl, toPairs, toValues } from "helper/helper"
import { RESOURCE, makeDescriptor, typeText2tid, id2jsonTid, id2imageTid, id2audioTid, id2videoTid, tids2extTids,
    tid2id, text2id, tid2type } from "shared/classes/resources.cjs"
import { ImageResource, AudioResource, AppliedImage } from "./classes"
import { MapStorage } from "shared/storage/mapStorage.cjs"
import { StorageManager } from "shared/classes/storage.cjs"

/**
 *
 *
 * @param tid
 * @param value
 * @param mainOrigin
 * @param urlType
 *
 * @returns {Promise}
 */
const getResourceResolvePromise = (tid, value, mainOrigin, urlType = 'exturl') => {
    const descriptor = makeDescriptor.fromTid(tid)
    if (isNull(value)) {
        if (!descriptor.type) // TODO implement check
            throw Error(`Resource with id "${descriptor.id}" was requested as static resource, but static ${descriptor.key} resources are not allowed`)

        const staticUrl = BASE_URL + '/' + descriptor.key + '/' + descriptor.extId

        return getResourceResolvePromise(tid, staticUrl, mainOrigin, 'staticurl')
    }
    if (isUrl(value)) {
        switch (descriptor.type) {

            case RESOURCE.TYPE.JSON:
                return fetch(value)
                    .then(response => {
                        if (!response.ok)
                            throw Error(`Failed to fetch json resource "${descriptor.id}"`)

                        return response.json()
                    })
                    .then(
                        data => ({ id: tid, value: data, origin: mainOrigin + '.' + urlType })
                    )

            case RESOURCE.TYPE.IMAGE:
                const image = new ImageResource(value);
                image.setId(descriptor.id)
                return image
                    .getNewDecodePromise()
                    .then(
                        () => ({id: tid, value: image, origin: mainOrigin + '.' + urlType})
                    )

            case RESOURCE.TYPE.AUDIO:
                const audio = new AudioResource(value)
                audio.setId(descriptor.id)
                return audio
                    .getNewLoadingPromise()
                    .then(
                        () => ({id: tid, value: audio, origin: mainOrigin + '.' + urlType})
                    )

            default:
                throw Error(`No ${urlType} support for ${descriptor.key} resource "${descriptor.id}"`)
        }
    }
    // data
    if (descriptor.type === RESOURCE.TYPE.JSON) {
        return Promise.resolve({id: tid, value, origin: mainOrigin + '.data'})
    }
    if (!isDataUrl(value))
        throw Error(`Given value of ${descriptor.key} resource "${descriptor.id}" is no data url`)

    if (descriptor.type === RESOURCE.TYPE.IMAGE) {
        const image = new ImageResource(value)
        image.setId(descriptor.id)
        return image
            .getNewDecodePromise()
            .then(
                () => ({id: tid, value: image, origin: mainOrigin + '.data'})
            )
    }
    if (descriptor.type === RESOURCE.TYPE.AUDIO) {
        const audio = new AudioResource(value)
        audio.setId(descriptor.id)
        return audio
            .getNewLoadingPromise()
            .then(
                () => ({id: tid, value: audio, origin: mainOrigin + '.data'})
            )
    }
    throw Error(`No data url support for ${descriptor.key} resource "${descriptor.id}"`)
}

const ResourceResolver = (id2source, permId2scope) => {
    const promises = []
    const ids = []

    return {

        add: (tid, value, mainOrigin) => {
            ids.push(tid)
            promises.push(getResourceResolvePromise(tid, value, mainOrigin))
        },

        resolve: (resolvedResources, permScope) => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value, origin } of resolved) {
                    resolvedResources.set(id, value)
                    id2source.set(id, origin)
                }
                if (!permScope) return
                for (const id of ids) {
                    permId2scope.set(id, permScope)
                }
            })
        }
    }
}

/**
 * This resolver is working synchronous and is only used to overwrite a stored model and its dependencies in the
 * resource manager to avoid a full resource reload in the editor
 *
 * @param {Map} id2source
 * @param {Map} permId2scope
 *
 * @returns {object}
 */
const SyncResolver = (id2source, permId2scope) => {
    const added = []
    const ids = []

    return {
        /**
         * Adds the given typed resource id and its value plus origin to the resolve queue
         *
         * @param {string} tid
         * @param {mixed} value
         * @param {string} origin
         */
        add: (tid, value, origin) => {
            ids.push(tid)
            const type = tid2type(tid)
            switch (type) {

                case RESOURCE.TYPE.JSON:
                    added.push({ id: tid, value, origin })
                    break;

                case RESOURCE.TYPE.IMAGE:
                    added.push({ id: tid, value: value instanceof AppliedImage ? value.imageResource : value, origin })
                    break;

                case RESOURCE.TYPE.AUDIO:
                    // TODO resolvedAudio
                    added.push({ id: tid, value, origin })
            }
        },
        /**
         * Adds all resources and their data in the resolve queue to the given resolvedResources, id2source and the
         * permScope of the resource manager. This method is working synchronous
         *
         * @param {Map} resolvedResources
         * @param {Map} permScope
         */
        resolve: (resolvedResources, permScope) => {
            for (const { id, value, origin } of added) {
                resolvedResources.set(id, value)
                id2source.set(id, origin + '.data')
            }
            if (!permScope) return
            for (const id of ids) {
                permId2scope.set(id, permScope)
            }
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

        resolve: resolvedResources => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value } of resolved) {
                    resolvedResources.set(id, value)
                }
            })
        }
    }
}

const getResourceProxy = (type, resources) => {
    return (
        new Proxy(resources, {
            get(target, id, receiver) {
                if (id in target) return target[id]

                const descriptor = makeDescriptor.fromTid(RESOURCE.PREFIX[type] + id, false)
                if (descriptor.isValid()) {
                    const extId = descriptor.extId
                    if (extId in target) return target[extId]
                }
                throw Error(`No ${RESOURCE.KEY[type]} resource with id "${id}" was loaded in the resource manager`)
            },
            set( obj, id, value ) {
                throw Error(`It's not possible to set a ${RESOURCE.KEY[type]} resource with id "${id}"`)
            }
        })
    )
}

/**
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
            const extTid = makeDescriptor.fromTid(tid)
            delete id2children[extTid !== tid ? extTid : tid]
        }
        this.localStorage.storeCoreResource('id2children', id2children)

        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        let changed = false
        for (const [ scope, ids ] of toPairs(scope2ids)) {
            const oldLength = ids.length
            const newIds = []
            for (const id of ids) {
                const descriptor = makeDescriptor.fromTid(id)
                const idx = tids.indexOf(id)
                const extIdx = tids.indexOf(descriptor.extTid)
                if (idx > -1 || extIdx > -1) continue
                newIds.push(id)
            }
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
        const extTid = makeDescriptor.fromTid(tid).extTid
        const permScope = this.permId2scope[extTid]
        const resolver = SyncResolver(this.id2origin, this.permId2scope)

        // store all resources this model uses
        for (const { id, data, type } of resources) {
            this.localStorage.storeResourceById(text2id[type], id, data)
            resolver.add(makeDescriptor.fromTid(typeText2tid(type, id)).extTid, data, 'browser')
        }
        // update deps
        const id2children = this.localStorage.getCoreResource('id2children') ?? {}

        for (const [ id, depTids ] of toPairs(dependencies)) {
            id2children[id] = depTids
        }
        this.localStorage.storeCoreResource('id2children', id2children)
        resolver.resolve(this.resolvedResources, permScope)
        this._resources = null

        if (scope === null) return

        // update scope ids
        const scope2ids = this.localStorage.getCoreResource('scope2ids') ?? {}
        const scopeIds = scope2ids[scope] ?? []
        const extScopeIds = tids2extTids(scopeIds)
        if (!extScopeIds.includes(extTid)) scopeIds.push(tid)
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
        const extTid = makeDescriptor.fromTid(tid).extTid
        this._resources = null
        this.resolvedResources.delete(extTid)
        this.id2origin.delete(extTid)
        this.permId2scope.delete(extTid)
    }

    hasPermanent(tid) {
        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.permId2scope.has(extTid)
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

        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.resolvedResources.has(extTid)
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
        const descriptor = makeDescriptor.fromTid(tid)
        const extTid = descriptor.extTid
        if (this.requested.has(extTid))
            throw Error(`Resource of type ${descriptor.key} with id "${tid2id(tid)}" was already requested!`)

        this.requested.set(extTid, value)
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
        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.id2origin.get(extTid)
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

        const extId = makeDescriptor.fromTypeAndId(text2id[type], id).extId
        const value = resources[extId]
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
            const resourceMaps = [this.resolvedResources.entries()]
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
                for (const [ tid, value ] of resourceMap) {
                    const { id, type } = makeDescriptor.fromTid(tid)
                    map[type][id] = value
                }
            }
            this._resources = {
                json: getResourceProxy(RESOURCE.TYPE.JSON, json),
                image: getResourceProxy(RESOURCE.TYPE.IMAGE, image),
                audio: getResourceProxy(RESOURCE.TYPE.AUDIO, audio)
            }
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
                    throw Error(`Could not resolve resource of type ${makeDescriptor(tid).key} with id "${tid2id(tid)}"`)

                resolver.add(tid, value, 'code')
            }
            for (const tid of add) {
                const extTid = makeDescriptor.fromTid(tid).extTid
                resolver.add(extTid, this.localStorage.getResource(tid), 'browser')
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
    getIdWithIndex(id, index) {
        const idx = id.lastIndexOf('.')
        return id.substring(0, idx) + '_' + index + id.substring(idx)
    }

    /**
     * @inheritDoc
     */
    validateContent(content) {
        if (content === null) return

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
    getIdWithIndex(id, index) {
        const idx = id.lastIndexOf('.')
        return id.substring(0, idx) + '_' + index + id.substring(idx)
    }

    /**
     * @inheritDoc
     */
    validateContent(content) {
        if (content === null) return

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
    ResourceProvider,
    SingleResourceProvider,
    MultiResourcesProvider,
    Resources,
    ImageResources,
    AudioResources,
    JsonResources,
    getResourcesAndCallback
}