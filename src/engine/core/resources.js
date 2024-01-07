import { d, csv2values, toKeys, isNull, isObject, isUrl, isString, isDataUrl, isArray, toPairs, toValues, getCanvasObjForDim } from "helper/helper"
import { RESOURCE, makeDescriptor, typeText2tid, id2jsonTid, id2imageTid, id2audioTid, id2videoTid, tids2extTids,
    id2tid, tid2id, text2id, tid2type } from "shared/resources.cjs"
import { AppliedImage } from "./classes"
import { MapStorage } from "shared/storages/mapStorage.cjs"
import { StorageManager } from "shared/storage.cjs"
import inst from "./instances.js"

let staticTypes = csv2values(STATIC_TYPES)
const setStaticTypes = values => staticTypes = values

/**
 * Returns a promise which resolves the given value of a typed resource id to a result object which holds the data
 * which is necessary to add it to the resource manager. Depending on the value the processing will be as follows:
 *
 *   null => build a static link to the resource (if the type allows it) and load the resource (=> staticurl)
 *   string-url => fetch the resource from an external url (=> exturl)
 *   data-url => create resource if the resource type is a media type and decode or load it (=> data)
 *   json => return the json as promise if the resource type is also json (=> data)
 *
 * Throws an error if the resource type cannot handle the value or if the given typed resource id is invalid
 *
 * @param {string} tid
 * @param {mixed} value
 * @param {string} mainOrigin
 * @param {string} urlType
 *
 * @returns {Promise}
 */
const getResourceResolvePromise = (tid, value, mainOrigin, urlType = 'exturl') => {
    const descriptor = makeDescriptor.fromTid(tid)
    if (isNull(value)) {
        if (!staticTypes.includes(descriptor.key))
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

            case RESOURCE.TYPE.VIDEO:
                // TODO implement
                throw Error(`Missing video implementation`)

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

/**
 * The resource resolver allows to add resource values for a typed resource id to a resolve queue and this queues is
 * processed when the resolve method is called which will resolve all values of the queue and add their resolved values
 * to the resource manager. This resolver works asynchronously
 *
 * @param {Map} id2source
 * @param {Map} permId2scope
 *
 * @returns {object}
 */
const ResourceResolver = (id2source, permId2scope) => {
    const promises = []
    const ids = []

    return {

        /**
         * Adds the given typed resource id and its value plus origin to the resolve queue
         *
         * @param {string} tid
         * @param {mixed} value
         * @param {string} mainOrigin
         */
        add: (tid, value, mainOrigin) => {
            ids.push(tid)
            promises.push(getResourceResolvePromise(tid, value, mainOrigin))
        },

        /**
         * Processes the resolve queue data by resolving each resource value and adding it to the given
         * resolvedResources, id2source and the permScope of the resource manager. This method is working asynchronous
         *
         * @param {Map} resolvedResources
         * @param {Map} permScope
         */
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
                    break

                case RESOURCE.TYPE.IMAGE:
                    added.push({ id: tid, value: value instanceof AppliedImage ? value.imageResource : value, origin })
                    break

                case RESOURCE.TYPE.VIDEO:
                    // TODO resolveVideo
                    added.push({ id: tid, value, origin })
                    break

                case RESOURCE.TYPE.AUDIO:
                    // TODO resolvedAudio
                    added.push({ id: tid, value, origin })
                    break
            }
        },

        /**
         * Adds all resources and their data in the resolve queue to the given resolvedResources, id2source and the
         * permScope of the resource manager. This method is working synchronous
         *
         * @param {Map} resolvedResources
         * @param {string} permScope
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

/**
 * This resolver is used in unit tests and is working asynchronously by just passing the given value to a promise
 *
 * @param {Map} id2source
 * @param {Map} permId2scope
 *
 * @returns {object}
 */
const DummyResolver = (id2source, permId2scope) => {

    const promises = []
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
            promises.push(
                Promise.resolve({id: tid, value, origin})
            )
            ids.push(tid)
        },

        /**
         * Adds all resources and their data in the resolve queue to the given resolvedResources, id2source and the
         * permScope of the resource manager. This method is working asynchronous
         *
         * @param {Map} resolvedResources
         * @param {Map} permScope
         */
        resolve: (resolvedResources, permScope) => {
            return Promise.all(promises).then(resolved => {
                for (const { id, value, origin } of resolved) {
                    resolvedResources.set(id, value)
                    id2source.set(id, origin + '.data')
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
 * Returns a proxy for the given resources object which contains ids and resolved values of a resource type.
 * Throws an error if an unknown resource id is requested or if a setter is called
 *
 * @param {string} type
 * @param {object} resources
 *
 * @returns {Proxy}
 */
const getResourceProxy = (type, resources) => {
    const key = RESOURCE.KEY[type]
    if (key === undefined)
        throw Error(`Invalid type "${type}" given`)

    return (
        new Proxy(resources, {
            get(target, id, receiver) {
                if (id in target) return target[id]

                const descriptor = makeDescriptor.fromTid(RESOURCE.PREFIX[type] + id, false)
                if (descriptor.compactId in target) return target[descriptor.compactId]

                if (descriptor.isValid()) {
                    const extId = descriptor.extId
                    if (extId in target) return target[extId]
                }
                // only allow object retrieval in unit tests
                if (typeof window === 'undefined' && id === 'toObject') {
                    return () => ({ ...target })
                }

                throw Error(`No ${key} resource with id "${id}" was loaded in the resource manager`)
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

    /**
     * Constructs an new resource manager instance which uses the given apiFetcher, resolver and storage instances
     *
     * @param {object} apiFetcher
     * @param {object} localStorage
     * @param {object} sessionStorage
     * @param {object} resolver
     */
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

    /**
     * Returns an array holding all extended typed resource ids of permanent resources available in the manager
     *
     * @returns {array}
     */
    getPermanentIds() {
        return [ ...this.permId2scope.keys() ]
    }

    /**
     * Returns an array holding all extended typed resource ids of temporary resources available in the manager
     *
     * @returns {array}
     */
    getTemporaryIds() {
        const permIds = this.getPermanentIds()
        const tempIds = []
        for (const id of this.resolvedResources.keys()) {
            if (!permIds.includes(id)) tempIds.push(id)
        }
        return tempIds
    }

    /**
     * Sets the status of the preview mode to the given boolean value
     *
     * @param {boolean} value
     */
    setPreview(value) {
        this._resources = null
        this.preview = value
    }

    /**
     * Sets the disabled flag of the manager to the given boolean value
     *
     * @param {boolean} value
     */
    setDisabled(value) {
        this.disabled = value
    }

    /**
     * Invalidates the given permanent scope so that the resources of this scope will be reloaded the next time a
     * permanent load ot this scope is triggered
     *
     * @param {string} scope
     */
    invalidatePermanentScope(scope) {
        const ids = this.getPermanentIds()
        for (const id of ids) {
            if (this.permId2scope.get(id) !== scope) continue
            this.permId2scope.delete(id)
        }
        this.permScopes.delete(scope)
    }

    /**
     * Returns a boolean indicating whether the given permanent scope already exists or not
     *
     * @param {string} scope
     *
     * @returns {boolean}
     */
    hasPermanentScope(scope) {
        return this.permScopes.has(scope)
    }

    /**
     * Deletes the given typed resource ids from the local storage
     *
     * @param {array} tids
     */
    deleteIdsFromStore(tids) {
        const id2children = this.localStorage.getCoreResource('id2children') ?? {}
        for (const tid of tids) {
            this.localStorage.deleteResource(tid)
            const extTid = makeDescriptor.fromTid(tid).extTid
            delete id2children[extTid !== tid ? extTid : tid]
            const origin = this.id2origin.get(extTid)
            if (!origin || !origin.startsWith('browser')) continue
            this.id2origin.delete(extTid)
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

    /**
     * Deletes the resource given by the typed resource id from the local storage.
     * The methods works asynchronously but if the sync flag is set to true, then the delete will be performed
     * synchronous
     *
     * TODO check why also have the delete above this method
     *
     * @param {string} tid
     * @param {boolean} sync
     * @returns {Promise|undefined}
     */
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

    /**
     * Deploys the given model and its dependencies to the server and deletes them from the storage. If a scope is given
     * the model will be added as dependency to this scope.
     *
     * @param {object} model
     * @param {string|null} scope
     *
     * @returns {Promise}
     */
    deployModel(model, scope = null) {
        const { resources, dependencies } = model.getResourcesAndDependencies(true)

        const lastResource = resources.at(-1)
        const id = typeText2tid(lastResource.type, lastResource.id)

        return this.apiFetcher.fetch('store', { id, resources, dependencies, scope }).then(({ stored }) => {
            let success = stored.includes(id)
            this.deleteIdsFromStore(stored)

            for ( const tid of stored) {
                const descriptor = makeDescriptor.fromTid(tid)
                this.resolvedResources.delete(descriptor.extTid)
            }
            this._resources = null

            return success
		})
	}

    /**
     * Stores the given model and its dependencies in the browser storage. If a scope is given then the model will be
     * added as dependency to the scope
     *
     * @param {object} model
     * @param {string|null} scope
     */
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

    /**
     * Clears all resolved resources and internal variables from the resource manager
     */
    clear() {
        this.resolvedResources.clear()
        this.requested.clear()
        this.id2origin.clear()
        this.permId2scope.clear()
        this.permScopes.clear()
        this._resources = null
    }

    /**
     * Deletes all temporary resource from the manager and also invalidates the "globals" permanent scope
     */
    clearTempAndGlobals() {
        this.invalidatePermanentScope('globals')
        this.clearTemporary()
        this._resources = null
    }

    /**
     * Deletes all temporary resources from the manager
     */
    clearTemporary() {
        const ids = this.getTemporaryIds()
        for (const id of ids) {
            this.resolvedResources.delete(id)
        }
    }

    /**
     * Removes the resource matching the given typed resource id from the manager
     *
     * @param {string} tid
     */
    remove(tid) {
        const extTid = makeDescriptor.fromTid(tid).extTid
        this._resources = null
        this.resolvedResources.delete(extTid)
        this.id2origin.delete(extTid)
        this.permId2scope.delete(extTid)
    }

    /**
     * Removes the json resource matching the given resource id from the manager
     *
     * @param {string} id
     */
    removeJson(id) {
        return this.remove(id2jsonTid(id))
    }

    /**
     * Removes the image resource matching the given resource id from the manager
     *
     * @param {string} id
     */
    removeImage(id) {
        return this.remove(id2imageTid(id))
    }

    /**
     * Removes the audio resource matching the given resource id from the manager
     *
     * @param {string} id
     */
    removeAudio(id) {
        return this.remove(id2audioTid(id))
    }

    /**
     * Removes the video resource matching the given resource id from the manager
     *
     * @param {string} id
     */
    removeVideo(id) {
        return this.remove(id2videoTid(id))
    }

    /**
     * Returns a boolean indicating whether a permanent resource for the given typed resource id exists in the manager
     * or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    hasPermanent(tid) {
        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.permId2scope.has(extTid)
    }

    /**
     * Returns a boolean indicating whether a permanent json resource for the given resource id exists in the manager
     * or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasPermanentJson(id) {
        return this.hasPermanent(id2jsonTid(id))
    }


    /**
     * Returns a boolean indicating whether a permanent image resource for the given resource id exists in the manager
     * or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasPermanentImage(id) {
        return this.hasPermanent(id2imageTid(id))
    }


    /**
     * Returns a boolean indicating whether a permanent audio resource for the given resource id exists in the manager
     * or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasPermanentAudio(id) {
        return this.hasPermanent(id2audioTid(id))
    }


    /**
     * Returns a boolean indicating whether a permanent video resource for the given resource id exists in the manager
     * or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasPermanentVideo(id) {
        return this.hasPermanent(id2videoTid(id))
    }

    /**
     * Returns a boolean indicating if a resource for the given typed resource id exists in the manager or not
     *
     * @param {string} tid
     *
     * @returns {boolean}
     */
    has(tid) {
        if (this.disabled) return false;

        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.resolvedResources.has(extTid)
    }

    /**
     * Returns a boolean indicating if a json resource for the given resource id exists in the manager or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasJson(id) {
        return this.has(id2jsonTid(id))
    }

    /**
     * Returns a boolean indicating if a image resource for the given resource id exists in the manager or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasImage(id) {
        return this.has(id2imageTid(id))
    }

    /**
     * Returns a boolean indicating if an audio resource for the given resource id exists in the manager or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasAudio(id) {
        return this.has(id2audioTid(id))
    }

    /**
     * Returns a boolean indicating if a video resource for the given resource id exists in the manager or not
     *
     * @param {string} id
     *
     * @returns {boolean}
     */
    hasVideo(id) {
        return this.has(id2videoTid(id))
    }

    /**
     * Returns a boolean indicating whether there are resources stored in the local storage or not
     *
     * @returns {boolean}
     */
    hasBrowserResources() {
        return !this.localStorage.isEmpty()
    }

    /**
     * Deletes all resources stored in the browser and also clears all temporary resources plus the "globals" permanent
     * scope, so that a load reloads all resources. Returns a boolean which indicates whether the deletion was
     * successful or not
     *
     * @returns {boolean}
     */
    clearBrowserResources() {
        this.clearTempAndGlobals()
        return this.localStorage.truncateResources()
    }

    /**
     * Adds a new resource given by its typed resource id to the next load request. The value given here is optional
     * and is only used if no resource was found in the local storage and browser. The manager is returned to allow
     * chaining
     *
     * @param {string} tid
     * @param {mixed} value
     *
     * @returns {ResourceManager}
     */
    add(tid, value = null) {
        const descriptor = makeDescriptor.fromTid(tid)
        const extTid = descriptor.extTid
        if (this.requested.has(extTid))
            throw Error(`Resource of type ${descriptor.key} with id "${tid2id(tid)}" was already requested!`)

        this.requested.set(extTid, value)
        return this
    }

    /**
     * Adds a new json resource given by its resource id to the next load request. The value given here is optional
     * and is only used if no resource was found in the local storage and browser. The manager is returned to allow
     * chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {ResourceManager}
     */
    addJson(id, value = null) {
        return this.add(id2jsonTid(id), value)
    }

    /**
     * Adds a new image resource given by its resource id to the next load request. The value given here is optional
     * and is only used if no resource was found in the local storage and browser. The manager is returned to allow
     * chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {ResourceManager}
     */
    addImage(id, value = null) {
        return this.add(id2imageTid(id), value)
    }

    /**
     * Adds a new audio resource given by its resource id to the next load request. The value given here is optional
     * and is only used if no resource was found in the local storage and browser. The manager is returned to allow
     * chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {ResourceManager}
     */
    addAudio(id, value = null) {
        return this.add(id2audioTid(id), value)
    }

    /**
     * Adds a new video resource given by its resource id to the next load request. The value given here is optional
     * and is only used if no resource was found in the local storage and browser. The manager is returned to allow
     * chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @returns {ResourceManager}
     */
    addVideo(id, value = null) {
        return this.add(id2videoTid(id), value)
    }

    /**
     * Returns the origin of the resolved value for the given typed resource id or returns undefined if the resource
     * does not yet exist in the manager
     *
     * @param {string} tid
     *
     * @returns {string|undefined}
     */
    getResourceOrigin(tid) {
        const extTid = makeDescriptor.fromTid(tid).extTid
        return this.id2origin.get(extTid)
    }

    /**
     * Returns the origin of the resolved value for the given json resource id or returns undefined if the resource
     * does not yet exist in the manager
     *
     * @param {string} id
     *
     * @returns {string|undefined}
     */
    getJsonOrigin(id) {
        return this.getResourceOrigin(id2jsonTid(id))
    }

    /**
     * Returns the origin of the resolved value for the given image resource id or returns undefined if the resource
     * does not yet exist in the manager
     *
     * @param {string} id
     *
     * @returns {string|undefined}
     */
    getImageSource(id) {
        return this.getResourceOrigin(id2imageTid(id))
    }

    /**
     * Returns the origin of the resolved value for the given audio resource id or returns undefined if the resource
     * does not yet exist in the manager
     *
     * @param {string} id
     *
     * @returns {string|undefined}
     */
    getAudioOrigin(id) {
        return this.getResourceOrigin(id2audioTid(id))
    }

    /**
     * Returns the origin of the resolved value for the given video resource id or returns undefined if the resource
     * does not yet exist in the manager
     *
     * @param {string} id
     *
     * @returns {string|undefined}
     */
    getVideoOrigin(id) {
        return this.getResourceOrigin(id2videoTid(id))
    }

    /**
     * Returns an array holding all extended resource ids of the manager for the given resource type
     *
     * @param {string} type
     *
     * @returns {array}
     */
    getAllResourceIds(type) {
        // TODO: we might also fetch the server ids here
        switch (type) {
            case RESOURCE.TYPE.JSON:
                return this.localStorage.getJsonResourceIds()

            case RESOURCE.TYPE.IMAGE:
                return this.localStorage.getImageResourceIds()

            case RESOURCE.TYPE.AUDIO:
                return this.localStorage.getAudioResourceIds()

            case RESOURCE.TYPE.VIDEO:
                return this.localStorage.getVideoResourceIds()
        }
        return []
    }

    /**
     * Returns the resolved value of the resource matching the given type and resource id.
     * Throws an error if the type or resource does not exist
     *
     * @param {string} type
     * @param {string} id
     *
     * @returns {mixed}
     */
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

    /**
     * Returns the resolved value of the json resource matching the given resource id.
     * Throws an error if the resource does not exist
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getJson(id) {
        return this.getResourceById('json', id)
    }

    /**
     * Returns the resolved value of the image resource matching the given resource id.
     * Throws an error if the resource does not exist
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getImage(id) {
        return this.getResourceById('image', id)
    }

    /**
     * Returns the resolved value of the audio resource matching the given resource id.
     * Throws an error if the resource does not exist
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getAudio(id) {
        return this.getResourceById('audio', id)
    }

    /**
     * Returns the resolved value of the video resource matching the given resource id.
     * Throws an error if the resource does not exist
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getVideo(id) {
        return this.getResourceById('video', id)
    }

    /**
     * Returns an object mapping the resource keys to proxies for all resolved resources under this key
     *
     * @returns {object}
     */
    get resources() {
        if (this._resources === null) {
            const resourceMaps = [this.resolvedResources.entries()]
            if (this.preview) {
                // TODO: resourceMaps.push(Object.fromEntries(this.sessionStorage))
            }
            const json = {}
            const image = {}
            const audio = {}
            const video = {}
            const map = {
                [RESOURCE.TYPE.JSON]: json,
                [RESOURCE.TYPE.IMAGE]: image,
                [RESOURCE.TYPE.AUDIO]: audio,
                [RESOURCE.TYPE.VIDEO]: video
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
                audio: getResourceProxy(RESOURCE.TYPE.AUDIO, audio),
                video: getResourceProxy(RESOURCE.TYPE.VIDEO, video)
            }
        }
        return this._resources
    }

    /**
     * Fetches all resource and their dependencies of the given (permanent) scope and resolves their values
     *
     * @param {string} scope
     * @param {boolean} permanent
     *
     * @returns {Promise}
     */
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

    /**
     * Fetches all resource and their dependencies of the given permanent scope and resolves their values
     *
     * @param {string} scope
     *
     * @returns {Promise}
     */
    loadPermanentScope(scope) {
        return this.load(scope, true)
    }

    /**
     * Fetches all resource and their dependencies of the given temporary scope and resolves their values
     *
     * @param {string} scope
     *
     * @returns {Promise}
     */
    loadTemporaryScope(scope) {
        return this.load(scope, false)
    }
}

/**
 * A resource collection is used to collect resource ids which are required for a scope. The collection groups all
 * required resources under their resource key and can also store a fallback value or a lazy laoding function to
 * retrieve this value. Furthermore resource id can also be automatically generated by using a template id and an
 * array over fallback values. The template id must include a replace char (*) which will be replaced by the index
 * of each fallback item.
 */
class ResourceCollection {

    /**
     * Constructs the collection and parses the resources given in the parameters after type param. If a type param
     * other than null is given the collections parse add method will be bound to this resource type.
     *
     * @param {string|null} type
     * @param {mixed} args
     */
    constructor(type = null, ...args ) {
        this.resources = {}
        this.type = type
        this.parseArgs( type, ...args )
    }

    /**
     * Parses the given arguments and will add all resources of the given type which are encoded in them to the
     * collection.
     *
     * If null is given as type the parser only accepts objects which map resource keys to resources of this type.
     * Otherwise a string parameter will add a static (= null as value) resource of the given type and an array will
     * add multiple static resources of this type at once. If an object is given which maps resource ids to their
     * fallback values, null or a function, then all of these resources will be added.
     *
     * @param {string|null} type
     * @param {mixed} args
     */
    parseArgs(type, ...args ) {
        for (const arg of args) {
            if (type === null) {
                if (!isObject(arg))
                    throw Error(`Expected object`)

                for (const [ key, resources ] of toPairs(arg)) {
                    const subType = text2id[key]
                    if (subType === undefined)
                        throw Error(`Invalid key "${key}" given`)

                    this.parseArgs(subType, resources)
                }
                continue
            }
            if (isString(arg)) {
                this.addToResources(arg, type)
            } else if (isArray(arg)) {
                for (const id of arg) {
                    this.addToResources(id, type)
                }
            } else if (isObject(arg)) {
                for (const [ id, values ] of toPairs(arg)) {
                    if (!isArray(values)) {
                        this.addToResources(id, type, values)
                        continue
                    }
                    if (id.indexOf('*') < 0)
                        throw Error(`No replace char * found in resource id "${id}"`)

                    let index = 0
                    for (const value of values) {
                        this.addToResources(id.replaceAll('*', index), type, value)
                        index++
                    }
                }
            }
        }
    }

    /**
     * Invokes the parse method with the type used in the constructor for all the given parameters
     * Returns the collection itself to allow chaining
     *
     * @param {mixed} args
     *
     * @return {ResourceCollection}
     */
    add( ...args ) {
        this.parseArgs(this.type, ...args)
        return this
    }

    /**
     * Adds an image resource with the given resource id and fallback value to the collection
     * Returns the collection itself to allow chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @return {ResourceCollection}
     */
    addImage(id, value = null) {
        this.parseArgs(RESOURCE.TYPE.IMAGE, {[id]: value})
        return this
    }

    /**
     * Adds an audio resource with the given resource id and fallback value to the collection
     * Returns the collection itself to allow chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @return {ResourceCollection}
     */
    addAudio(id, value = null) {
        this.parseArgs(RESOURCE.TYPE.AUDIO, {[id]: value})
        return this
    }

    /**
     * Adds a json resource with the given resource id and fallback value to the collection
     * Returns the collection itself to allow chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @return {ResourceCollection}
     */
    addJson(id, value = null) {
        this.parseArgs(RESOURCE.TYPE.JSON, {[id]: value})
        return this
    }

    /**
     * Adds a video resource with the given resource id and fallback value to the collection
     * Returns the collection itself to allow chaining
     *
     * @param {string} id
     * @param {mixed} value
     *
     * @return {ResourceCollection}
     */
    addVideo(id, value = null) {
        this.parseArgs(RESOURCE.TYPE.VIDEO, {[id]: value})
        return this
    }

    /**
     * Adds a resource with the given resource id and value to the resource collection
     * Throws an error if a resource with the same id already exists
     *
     * @param {string} id
     * @param {string} type
     * @param {mixed} value
     */
    addToResources(id, type, value = null) {
        const tid = id2tid(type, id)
        const descriptor = makeDescriptor.fromTid(tid)

        const key = descriptor.key
        if (!(key in this.resources)) this.resources[key] = {}
        const target = this.resources[key]

        if ((descriptor.compactId in target) || (descriptor.extId in target))
            throw Error(`Resource "${descriptor.id}" of type ${descriptor.key} was already requested!`)

        target[id] = value
    }
}

/**
 * Creates a resource collection of json resources
 *
 * @param {mixed} args
 *
 * @returns {ResourceCollection}
 */
const JsonResources = ( ...args ) => new ResourceCollection(RESOURCE.TYPE.JSON, ...args)

/**
 * Creates a resource collection of image resources
 *
 * @param {mixed} args
 *
 * @returns {ResourceCollection}
 */
const ImageResources = ( ...args ) => new ResourceCollection(RESOURCE.TYPE.IMAGE, ...args)

/**
 * Creates a resource collection of audio resources
 *
 * @param {mixed} args
 *
 * @returns {ResourceCollection}
 */
const AudioResources = ( ...args ) => new ResourceCollection(RESOURCE.TYPE.AUDIO, ...args)

/**
 * Creates a resource collection of video resources
 *
 * @param {mixed} args
 *
 * @returns {ResourceCollection}
 */
const VideoResources = ( ...args ) => new ResourceCollection(RESOURCE.TYPE.VIDEO, ...args)

/**
 * Creates a resource collection over multiple resource types
 *
 * @param {mixed} args
 *
 * @returns {ResourceCollection}
 */
const Resources = ( ...args ) => new ResourceCollection(null, ...args)

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
        if (type === 'function') {
            if (callback) throw Error(`Multiple callback functions passed to method but only one allowed!`)
            callback = arg
            continue
        }
        if (!isObject(arg))
            throw Error(`Argument of type "${type}" not allowed. Expected callback function or resources instance`)

        const provider = !(arg instanceof ResourceCollection) ? Resources(arg) : arg
        for (const [ key, subResources ] of Object.entries(provider.resources)) {
            if (!resources[key]) resources[key] = {}
            const type = text2id[key]
            const id2resources = resources[key]
            for (const [ id, content ] of Object.entries(subResources)) {
                const descriptor = makeDescriptor.fromTypeAndId(type, id)
                if (id2resources[descriptor.compactId] || id2resources[descriptor.extId])
                    throw Error(`Resource "${id}" of type ${key} already passed as argument`)

                id2resources[id] = content
            }
        }
    }
    return {
        resources,
        callback
    }
}

/**
 * An ImageResource is an abstraction layer for a concrete image which is given by an url, a data-url or a canvas
 * and a resource id. It tracks whether the image has been successfully resolved (= loaded and decoded) or not and
 * also provides helper methods for retrieving image properties and for doing conversions.
 *
 * If the ImageResource is used outside browser context (e.g. unit tests) a fake image with dimension 100x100 is used
 */
class ImageResource {

    /**
     * Constructs a new image resource based on the given data which can be an url, a data-url or a canvas element
     *
     * @param {string|HTMLCanvasElement} data
     */
    constructor(data) {
        this.id = null;
        this.image = typeof Image != 'undefined' ? new Image() : {width: 100, height: 100, decode: () => Promise.resolve()}
        this.canvas = null
        if (typeof HTMLCanvasElement != 'undefined' && (data instanceof HTMLCanvasElement)) {
            this.canvas = {elem: data, ctx: data.getContext('2d')}
            data = this.getDataUrl()
        }
        if (data !== null)
            this.image.src = data
        this.resolved = false
    }

    /**
     * Sets the id of this image resource to the given value
     *
     * @param {string|null} id
     */
    setId(id) {
        this.id = id
    }

    /**
     * Returns a string holding the id or null if no id was set yet
     *
     * @param {string|null} id
     */
    getId() {
        return this.id
    }

    /**
     * Returns the width of this image resources or null if the resource has not yet been resolved
     *
     * @returns {number|null}
     */
    get width() {
        if (!this.resolved) return null

        return this.image ? this.image.width : this.canvas.width
    }

    /**
     * Returns the height of this image resources or null if the resource has not yet been resolved
     *
     * @returns {number|null}
     */
    get height() {
        if (!this.resolved) return null

        return this.image ? this.image.height : this.canvas.height
    }

    /**
     * Returns the canvas object of this image resource or a clone of it if the asClone flag is set to true
     *
     * @param {boolean} asClone
     *
     * @returns {object}
     */
    getCanvas(asClone = false) {
        let width = this.image.width
        let height = this.image.height
        let source = this.image
        if (this.canvas === null) {
            this.canvas = getCanvasObjForDim(width, height)
            this.canvas.ctx.drawImage(this.image, 0, 0)
        } else {
            width = this.canvas.elem.width
            height = this.canvas.elem.height
            source = this.canvas.elem
        }
        if (asClone) {
            const canvas = getCanvasObjForDim(width, height)
            canvas.ctx.drawImage(source, 0, 0)
            return canvas
        }
        return this.canvas
    }

    /**
     * Returns the canvas elem of this image resource or the one of a clone if the asClone flag is set to true
     *
     * @param {boolean} asClone
     *
     * @returns {HTMLCanvasElement}
     */
    getCanvasElem(asClone = false) {
        return this.getCanvas(asClone).elem
    }

    /**
     * Returns a promise which resolves when the image has been decoded and returns the image itself
     *
     * @returns {Promise}
     */
    getNewDecodePromise() {
        return this.image.decode().then(result => {this.resolved = true; return result})
    }

    /**
     * Returns a data-url for this image resource with the given format (or default image format)
     *
     * @param {string|undefined} format
     *
     * TODO use default image subType here
     *
     * @returns {string}
     */
    getDataUrl(format = 'png') {
        return this.getCanvasElem().toDataURL('image/' + format)
    }

    /**
     * Returns the HTMLImageElement of this image resource or a fake object if no browser context is available
     *
     * @returns {HTMLImageElement|{object}}
     */
    getImage() {
        return this.image
    }

    /**
     * Returns a boolean indicating whether the image resource has already been loaded and decoded or not
     *
     * @returns {boolean}
     */
    isResolved() {
        return this.resolved
    }
}

/**
 * Returns a new image resource instance with the given id and data which is directly set to resolved
 *
 * @param {mixed} data
 * @param {string} id
 *
 * @returns {ImageResource}
 */
const createImageResource = (data, id = null) => {
    const img = new ImageResource(data)
    img.resolved = true
    img.id = id

    return img
}

/**
 * An AudioResource is an abstraction layer for a concrete audio media which is given by an url or a data-url and a
 * resource id. It tracks whether the image has been successfully resolved (= loaded, decoded and playable) or not
 * and also provides helper methods for controlling the media playback
 */
class AudioResource {

    /**
     * Creates a new audio resource based on the given url or data-url and immediately starts the loading process
     * which is resolved when the canplaythrough event is triggered. After resolving the readyCallback is triggered
     * if it was passed to the constructor.
     *
     * If no browser context is available the resource will be automatically resolved and a fake audio object is set
     *
     * @param {string} url
     * @param {function|null} readyCallback
     */
    constructor(url, readyCallback = null) {
        this.audio = null
        this.id = null
        this.volume = 1
        this.resolved = false
        this.promise = new Promise(resolve => {
            if (typeof Audio == 'undefined') {
                this.audio = {}
                this.resolved = true
                resolve()
            } else {
                this.audio = new Audio(url)
                this.audio.oncanplaythrough = () => {
                    this.resolved = true
                    resolve()
                    if (readyCallback) {
                        readyCallback()
                    }
                }
                this.audio.onplaying = () => {
                    if (!inst.game.audioBlocked) return
                    inst.game.audioBlocked = false
                }
            }
        })
        this.lastAction = null
    }

    /**
     * Sets the given value as resource id
     *
     * @param {string} id
     */
    setId(id) {
        this.id = id
    }

    /**
     * Returns the id of the audio resource or null if no id was set yet
     *
     * @returns {string|null}
     */
    getId() {
        return this.id;
    }

    /**
     * Returns a boolean indicating whether the audio has already been loaded, decoded and is playable or not
     *
     * @returns {boolean}
     */
    isResolved() {
        return this.resolved
    }

    /**
     * Sets the volume of this audio resource to the given value
     *
     * @param {number} value
     */
    setVolume(value) {
        this.volume = value
        this.updateVolume()
    }

    /**
     * Updates the volume of this audio resource by applying the master volume of the game to it
     */
    updateVolume() {
        this.audio.volume = (inst.game.masterVolume / 100) * this.volume
    }

    /**
     * Starts the playback of this audio resource with the given volume. If the restart flag is set the audio will
     * be rewinded before. Returns a promise which resolves when the audio starts to play
     *
     * @param {number} volume
     * @param {boolean} restart
     *
     * @returns {Promise}
     */
    play(volume = 1, restart = true) {
        this.volume = 1
        if (restart && this.isPlaying()) {
            this.rewind()
        }
        this.updateVolume()
        this.lastAction = 'load'
        return this.audio.play().then(() => {
            if (this.lastAction === 'pause' || !inst.game.running) {
                this.audio.pause();
            } else {
                this.lastAction = 'play';
            }
        })
    }

    /**
     * Continues to play by triggering the play method if the audio was paused before
     */
    continue() {
        if (this.lastAction === 'pause') {
            this.lastAction = 'play';
            this.play(1, false);
        }
    }

    /**
     * Sets the playback back to the start
     */
    rewind() {
        this.audio.currentTime = 0
    }

    /**
     * Sets looping of the audio to the given boolean value
     *
     * @param {boolean} value
     */
    setLoop(value) {
        this.audio.loop = value
    }

    /**
     * Sets the muting of the audio to the given boolean value
     *
     * @param {boolean} value
     */
    setMuted(value) {
        this.audio.muted = value
    }

    /**
     * Pauses the audio playback of this audio resource
     */
    pause() {
        if (this.lastAction === 'play') {
            this.audio.pause()
        }
        this.lastAction = 'pause'
    }

    /**
     * Resets the playboack of this audio resource
     *
     * TODO why do we need this together with rewind?
     */
    reset() {
        this.rewind()
    }

    /**
     * Returns a boolean indicating whether the audio is currenly playing or not
     *
     * @returns {boolean}
     */
    isPlaying() {
        return !(this.audio.ended || this.lastAction === 'pause')
    }

    /**
     * Returns a boolean indicating whether the audio is currently looped or not
     *
     * @returns {boolean}
     */
    isLooping() {
        return this.audio.loop
    }

    /**
     * Returns a promise which is resolved when the audio of this resource is loaded, decoded and playable
     *
     * @returns {Promise}
     */
    getNewLoadingPromise() {
        return this.promise
    }
}

/**
 * When an init-handler is registered, a callback function and some resource providers which are called directly to
 * get all necessary resources, but some values can be given as functions so that the value can be called
 * lazy. The purpose of the is class is to collect all required resource for the init handler from the providers and
 * to add these values the ResourceManager
 */
class ResourceRequest {

    /**
     * Constructs a new resource request which is initialized with the given resource object which maps
     * resource keys to ids and there values (or lazy loading function to retrieve the value when its needed)
     *
     * @param {object} resources
     */
    constructor(resources) {
        this.resources = resources || {}
    }

    /**
     * Returns a boolean indicating whether any resources were passed to the constructor or not
     *
     * @returns {boolean}
     */
    isEmpty() {
        const { image, audio, json, video } = this.resources

        if (json && toKeys(json).length) return false
        if (image && toKeys(image).length) return false
        if (audio && toKeys(audio).length) return false

        return !(video && toKeys(video).length)
    }

    /**
     * Adds all resources and their fallback values to the given resource manager so that these get requested
     * with the next load. If the values or given as lazy loading functions then the function is called to get
     * the fallback value
     *
     * @param {ResourceManager} manager
     */
    addToManager(manager) {
        if (!manager)
            throw Error(`No resource manager given as parameter`)

        const { json, image, audio, video } = this.resources

        if (json) {
            for (const [ id, content ] of toPairs(json)) {
                manager.addJson(
                    id, typeof content === 'function' ? content() : content
                )
            }
        }
        if (image) {
            for (const [ id, content ] of toPairs(image)) {
                manager.addImage(
                    id, typeof content === 'function' ? content() : content
                )
            }
        }
        if (audio) {
            for (const [ id, content ] of toPairs(audio)) {
                manager.addAudio(
                    id, typeof content === 'function' ? content() : content
                )
            }
        }
        if (video) {
            for (const [ id, content ] of toPairs(video)) {
                manager.addVideo(
                    id, typeof content === 'function' ? content() : content
                )
            }
        }
    }
}

export {
    setStaticTypes,
    ResourceManager,
    ResourceResolver,
    SyncResolver,
    DummyResolver,
    getResourceProxy,
    getResourceResolvePromise,
    ResourceCollection,
    Resources,
    ImageResource,
    ImageResources,
    AudioResource,
    AudioResources,
    JsonResources,
    VideoResources,
    getResourcesAndCallback,
    createImageResource,
    ResourceRequest
}