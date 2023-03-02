import { FILTER } from "core/const"
import { toValues, flattenResources, getDeflatedResources, isValidResourceId, ResourceDependencies, d } from "../helper/helper"
import { ImageResource, AudioResource, AppliedImage } from "./classes"
import { DefaultRenderPlugin } from "../plugins/DefaultRenderPlugin"
import { DefaultTouchControlsPlugin } from "../plugins/DefaultTouchControlsPlugin"
import Fetcher from "./fetcher/api"

/**
 * @type {ResourceLoader}
 */
let RL = null
/**
 * @type {StorageManager}
 */
let SM = null
let OCM = null
let game = null
let system = null
let filterer = null
let renderPlugin = null
let touchControlsPlugin = null

class PaneRegistry {

    constructor() {
        this.registry = new Map()
    }

    add(name, cls, props = {}) {
        this.registry.set(cls, { name, cls, ...props })
    }

    get(cls) {
        return this.registry.get(cls)
    }

    getAll() {
        return this.registry.values()
    }
}

class System {

    constructor() {
        this.renderingEngine = this.extractRenderingEngine()
        this.isMobile = this.extractIsMobile()
        this.supportsTouch = this.extractHasTouch()
        this.supportsFullscreen = this.setFullscreenApi()
        this.supportsOrientation = this.setScreenOrientationApi()

        console.log(
            `System Information | ` +
            `Rendering Engine: ${this.renderingEngine} | `+
            `Mobile: ${this.isMobile ? 'true' : 'false'} | ` +
            `Touch: ${this.supportsTouch ? 'true' : 'false'} | ` +
            `Orientation: ${this.supportsOrientation ? this.getScreenOrientation() : 'false'} | ` +
            `UserAgent: ${navigator.userAgent}`
        )
    }

    setFullscreenApi() {
        this.fullscreenChangeEvent = undefined
        this.isFullscreen = () => false
        this.requestFullscreen = () => Promise.reject('Fullscreen mode not supported!')
        this.exitFullscreen = () => Promise.reject('Fullscreen Mode not supported')

        const fullscreenEnabledKey = this.getExistingKey(
            document, 'fullscreenEnabled', 'webkitFullscreenEnabled', 'mozFullScreenEnabled', 'msFullscreenEnabled'
        )
        if (fullscreenEnabledKey & !document[fullscreenEnabledKey]) return false

        const fullscreenElementKey = this.getExistingKey(
            document, 'fullscreenElement', 'webkitCurrentFullScreenElement', 'msFullscreenElement'
        )
        if (!fullscreenElementKey) {
            const fullscreenKey = this.getExistingKey(
                document, 'fullscreen', 'webkitIsFullScreen', 'mozFullScreen', 'msFullscreen'
            )
            if (fullscreenKey) this.isFullscreen = () => document[fullscreenKey]
        } else {
            this.isFullscreen = () => document[fullscreenElementKey] !== null
        }
        this.fullscreenChangeEvent = this.getExistingEventType(
            document, 'fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'
        )
        const requestFullscreenKey = this.getExistingKey(
            document.body, 'requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'
        )
        if (requestFullscreenKey) this.requestFullscreen = elem => elem[requestFullscreenKey]()

        const exitFullscreenKey = this.getExistingKey(
            document, 'exitFullscreen', 'webkitCancelFullScreen', 'mozCancelFullScreen', 'msExitFullscreen'
        )
        if (exitFullscreenKey) this.exitFullscreen = elem => document[exitFullscreenKey]()

        return true
    }

    setScreenOrientationApi() {
        this.getScreenOrientation = () => undefined
        this.orientationChangeEvent = undefined
        this.lockOrientation = () => Promise.reject('No orientation locking supported')
        this.unlockOrientation = () => Promise.reject('No orientation unlocking supported')
        this.supportsOrientationLock = false
        const orientationKey = this.getExistingKey(
            screen, 'orientation', 'mozOrientation', 'msOrientation'
        )
        if (orientationKey) {
            this.getScreenOrientation = () => screen[orientationKey].type
            this.orientationChangeEvent = 'change'
            this.orientationEventElem = screen[orientationKey]
            this.lockOrientation = orientation => screen[orientationKey].lock(orientation)
            this.unlockOrientation = () => screen[orientationKey].unlock()
            this.supportsOrientationLock = true
        } else if ('orientation' in window) {
            const value2name = {
                '0': 'landscape-primary',
                '90': 'portrait-primary',
                '180': 'landscape-secondary',
                '-90': 'portrait-secondary'
            }
            this.getScreenOrientation = () => {
                if (window.orientation in value2name) return value2name[value2name]
            }
            this.orientationChangeEvent = this.getExistingEventType(window, 'orientationchange')
            this.orientationEventElem = window
            // TODO: https://stackoverflow.com/questions/5298467/prevent-orientation-change-in-ios-safari
            this.lockOrientation = orientation => Promise.reject('TODO...')
            this.unlockOrientation = () => Promise.reject('TODO...')
        }
        return !!this.orientationChangeEvent
    }

    getExistingMethod(elem, ...keys) {
        for (const key of keys) if (key in elem) return elem[key]
    }

    getExistingEventType(elem, ...keys) {
        for (const key of keys) if ('on' + key in elem) return key
    }

    getExistingKey(elem, ...keys) {
        for (const key of keys) if (key in elem) return key
    }

    extractRenderingEngine() {
        const UA = navigator.userAgent.toLowerCase()
        const match2engine = {
            applewebkit: 'WebKit',
            gecko: 'Gecko',
            opera: 'Presto',
            trident: 'Trident',
            edge: 'EdgeHTML',
            chrome: 'Blink'
        }
        for (const [ match, engine ] of Object.entries(match2engine)) {
            if (UA.indexOf(match) !== -1) return engine
        }
    }

    extractIsMobile() {
        if (!this.renderingEngine) return false

        return /mobi/i.test(navigator.userAgent.toLowerCase())
    }

    extractHasTouch() {
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
        let hasTouch = false
        if ('maxTouchPoints' in navigator) {
            return navigator.maxTouchPoints > 0
        }
        if ('msMaxTouchPoints' in navigator) {
            return navigator.msMaxTouchPoints > 0
        }
        const mQ = matchMedia?.("(pointer:coarse)")
        if (mQ?.media === "(pointer:coarse)") {
            return !!mQ.matches
        }
        if ("orientation" in window) return true
        const UA = navigator.userAgent
        return (
            /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
            /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
        )
    }
}

class BitmapFilterer {

    constructor() {
        this.filters = {};
    }

    getFilters() {
        return this.filters;
    }

    addFilter(id, type, callback, params = []) {
        const paramClosures = [];
        let minParams = 0;
        let isMandatory = true;
        for (let index = 0; index < params.length; index++) {
            if (isMandatory) {
                if (params.default === undefined) {
                    minParams++;
                } else {
                    isMandatory = false;
                }
            }
            const param = params[index];
            let parser = null;
            switch(param.type) {

                case FILTER.PARAM.COLOR:
                    parser = function(rawValue) {
                        const color = {};
                        // TODO use helper function
                        if (rawValue[0] === '#') {
                            if (rawValue.length === 7) {
                                color.r = parseInt(rawValue.substr(1, 2), 16);
                                color.g = parseInt(rawValue.substr(3, 2), 16);
                                color.b = parseInt(rawValue.substr(5, 2), 16);
                                return color;
                            }
                        }
                        return null;
                    };
                    break;

                case FILTER.PARAM.INT:
                    parser = function(rawValue) {
                        return parseInt(rawValue, 10);
                    };
                    break;

                case FILTER.PARAM.FLOAT:
                    parser = function(rawValue) {
                        return parseFloat(rawValue);
                    };
                    break;

                case FILTER.PARAM.STRING:
                    parser = function(rawValue) {
                        return rawValue;
                    };
                    break;

                case FILTER.PARAM.MAPPING:
                    parser = function(rawValue) {
                        const result = {};
                        const assigns = rawValue.split(';');
                        for(let assign of assigns) {
                            const parts = assign.split(':', 2);
                            result[parts[0]] = parts[1];
                        }
                        return result;
                    };
                    break;

            }

            paramClosures.push(
                function(rawValue, params) {
                    params[param.key] = (rawValue === '') ? param.default : parser(rawValue);
                }
            );
        }

        this.filters[id] = {
            type,
            callback,
            minParams,
            paramDefs: params,
            params: paramClosures
        }
    }

    /**
     * Returns either the original canvas or a new one with the filters applied on the original one
     *
     * @param filters
     * @param canvas
     * @param offX
     * @param offY
     * @param width
     * @param height
     * @return {*[]}
     */
    getCanvasWithFiltersApplied(filters, canvas, offX, offY, width, height) {
        let data = [ canvas, offX, offY, width, height ];
        let lastType = FILTER.TYPE.CANVAS;
        let imageData = null;
        let isSourceCanvas = true;

        const filterParts = filters.split('|');
        for (let filterPart of filterParts) {
            let rawParams = [];
            if (filterPart[filterPart.length - 1] === ')') {
                const subExpr = filterPart.slice(0, -1).split('(', 2);
                filterPart = subExpr[0];
                rawParams = subExpr[1].split(',');
            }
            if (filterPart === '') {
                continue;
            }
            const filter = this.filters[filterPart];
            const filterParams = {};
            if (rawParams.length < filter.minParams) {
                throw Error(`Filter "${filterPart}" requires ${filter.minParams} parameters but got ${rawParams.length}!`);
            }
            for (let i = 0; i < filter.params.length; i++) {
                if (i < rawParams.length) {
                    filter.params[i](rawParams[i], filterParams);
                } else {
                    filterParams[filter.key] = filter.default;
                }
            }

            switch(filter.type) {

                case FILTER.TYPE.CANVAS:
                    if (lastType === FILTER.TYPE.IMAGEDATA) {
                        if (isSourceCanvas) {
                            data = [OCM.getNewOffscreenCanvas(data[3], data[4]), 0, 0, data[3], data[4]];
                            isSourceCanvas = false;
                        }
                        data[0].ctx.putImageData(imageData, 0, 0);
                    }
                    data = filter.callback(data, filterParams);
                    break;

                case FILTER.TYPE.IMAGEDATA:
                    if (lastType === FILTER.TYPE.CANVAS) {
                        imageData = data[0].ctx.getImageData(data[1], data[2], data[3], data[4]);
                    }
                    imageData = filter.callback(imageData, filterParams);
                    break;

                default:
                    throw Error(`Unknown filter type ${filter.type} given!`);
            }
            lastType = filter.type;
        }

        if (lastType === FILTER.TYPE.IMAGEDATA) {
            if (isSourceCanvas) {
                data = [OCM.getNewOffscreenCanvas(data[3], data[4]), 0, 0, data[3], data[4]];
            }
            data[0].ctx.putImageData(imageData, 0, 0);
        }
        return data;
    }
}

function each(obj, f) {
    if (Array.isArray(obj)) {
        for (let item of obj) {
            f(item);
        }
    } else {
        for (let [key, value] of Object.entries(obj)) {
            f(value, key);
        }
    }
}

function has(arr, key) {
    return key !== undefined ?
        (Array.isArray(arr) ? arr.indexOf(key) !== -1 : arr[key] !== undefined) :
        arr.length > 0;
}

class StorageManager {

    constructor(storage, gameId) {
        this.storage = storage;
        this.prefix = gameId;
        this.active = this.isAvailable();
        this.remotes = null;

        this.dependencies = new ResourceDependencies(
            () => (!this.getKeys().includes('direct')) ?
                {} : JSON.parse(this.storage.getItem(this.prefix + ':direct')),
            direct => {
                this.storage.setItem(this.prefix + ':direct', JSON.stringify(direct));
            },
            () => (!this.getKeys().includes('indirect')) ?
                {} : this.indirect = JSON.parse(this.storage.getItem(this.prefix + ':indirect')),
            indirect => {
                this.storage.setItem(this.prefix + ':indirect', JSON.stringify(indirect));
            },
            (type, id) => this.deleteResourceItem(type, id)
        )
    }

    getRemotes() {
        if (this.remotes === null) {
            if (!this.getKeys().includes('remotes')) {
                this.remotes = {};
            } else {
                this.remotes = JSON.parse(this.storage.getItem(this.prefix + ':remotes'));
            }
        }
        return this.remotes;
    }

    setRemotes(remotes) {
        this.remotes = remotes;
    }

    getScreenRemotes(screen) {
        const remotes = this.getRemotes();
        const resources = this.dependencies.getRelevantScreenResources(screen).found;
        const result = [];
        for (let resource of resources) {
            if (remotes[resource]) {
                for (let remote of remotes[resource]) {
                    if (!result.includes(remote)) {
                        result.push(remote);
                    }
                }
            }
        }
        return result;
    }

    storeRemotes() {
        this.storage.setItem(this.prefix + ':remotes', JSON.stringify(this.getRemotes()));
    }

    isQuotaExceededException(e) {
        return e instanceof DOMException && (
            e.name === 'QuotaExceededError' ||
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        );
    }

    isAvailable() {
        if (!this.storage) {
            return false;
        }
        try {
            const x = '__storage_test__';
            this.storage.setItem(x, '1');
            this.storage.removeItem(x);
            return true;
        } catch(e) {
            return e instanceof DOMException && !this.isQuotaExceededException(e) && (
                    e.code === 22 ||
                    e.code === 1014) &&
                (localStorage && localStorage.length !== 0);
        }
    }

    getKeys(type = null) {
        if (!this.isAvailable()) {
            return [];
        }
        const prefix = this.prefix + (type !== null ? ':' + type : '') + ':';
        const keys = [];
        for(let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                keys.push(key.substring(prefix.length));
            }
        }
        return keys;
    }

    getImageIds() {
        return this.getKeys('image');
    }

    getJsonIds() {
        return this.getKeys('json');
    }

    getAudioIds() {
        return this.getKeys('audio');
    }

    storeResource(type, id, data) {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            this.storage.setItem(this.prefix + ':' + type + ':' + id, data);
            return true;
        } catch (e) {
            return false;
        }
    }

    storeImage(id, data) {
        return this.storeResource('image', id, data);
    }

    storeJson(id, data) {
        let json;
        try {
            json = JSON.stringify(data);
        } catch (e) {
            return null;
        }
        return this.storeResource('json', id, json);
    }

    storeAudio(id, data) {
        return this.storeResource('audio', id, data);
    }

    getResource(type, id) {
        if (!this.isAvailable()) {
            return null;
        }
        try {
            const item = this.storage.getItem(this.prefix + ':' + type + ':' + id);
            if (type === 'json') {
                try {
                    return JSON.parse(item);
                } catch (e) {
                    return null;
                }
            }
            return item;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    getImage(id) {
        return this.getResource('image', id)
    }

    getJson(id) {
        return this.getResource('json', id);
    }

    getAudio(id) {
        return this.getResource('audio', id)
    }

    truncate() {
        const keys = this.getKeys();
        for (let key of keys) {
            this.storage.removeItem(this.prefix + ':' + key);
        }
        this.dependencies.truncate();
        this.remotes = {};
        return true;
    }

    deleteResources(type = null) {
        if (type === null) {
            this.deleteResources('image');
            this.deleteResources('audio');
            this.deleteResources('json');
        } else {
            const keys = this.getKeys(type);
            for (let key of keys) {
                this.deleteResource(type, key);
            }
        }
    }

    deleteResourceItem(type, id) {
        const resId = type + ':' + id;
        this.storage.removeItem(this.prefix + ':' + resId);
    }

    deleteResource(type, id) {
        if (!this.isAvailable()) {
            return false;
        }
        this.dependencies.deleteResource(type, id);
        return true;
    }

    deleteScreenResource(screen, type, id) {
        this.dependencies.deleteScreenResource(screen, type, id);
        return true;
    }

    deleteImage(id) {
        return this.deleteResource('image', id);
    }

    deleteJson(id) {
        return this.deleteResource('json', id);
    }

    deleteAudio(id) {
        return this.deleteResource('audio', id);
    }

    hasResource(type, id) {
        return has(this.getKeys(type), id);
    }

    hasImage(id) {
        return this.hasResource('image', id)
    }

    hasJson(id) {
        return this.hasResource('json', id)
    }

    hasAudio(id) {
        return this.hasResource('audio', id)
    }

    safeDeleteResources(resources) {
        for(let resource of resources) {
            const [type, id] = resource.split(':');
            this.dependencies.safeDeleteScreenResource(type, id);
        }
    }

    getAllScreenResources(screen) {
        return getDeflatedResources(this.dependencies.getRelevantScreenResources(screen).found)
    }

    getDirectScreenResources(screen) {
        return this.dependencies.getDirectScreenResources(screen);
    }

    storeScreenResource(screen, type, resource) {
        this.dependencies.storeScreenResource(screen, type, resource)
    }

    storeResourceDependencies(indirect) {
        this.dependencies.storeResourceDependencies(indirect);
    }

    getResourcesWithChildren() {
        return Object.keys(this.dependencies.getIndirect());
    }
}

class ResourceLoader {

    constructor(fetcher, storage) {
        this.fetcher = fetcher;
        this.storage = storage;
        this.clear()
    }

    clear() {
        this.disabled = false
        this.resources = {};
        this.image = {};
        this.json = {};
        this.audio = {};
        this.permImage = {};
        this.permJson = {};
        this.permAudio = {};
        this.hasPermLoaded = false;
        this.source = new Map();
        this.screen = new Map();
        this.hasLocal = new Set();
        this.hasExternal = new Set();
    }

    setDisabled(value) {
        this.disabled = value
    }

    invalidatePermanentResources() {
        this.hasPermLoaded = false;
    }

    clearResources() {
        this.resources = {};
    }

    clearBrowserResources() {
        this.storage.truncate();
    }

    hasLocalResource(type, id) {
        return this.hasLocal.has(type + ':' + id);
    }

    hasExternalResource(type, id) {
        return this.hasExternal.has(type + ':' + id);
    }

    isExternalValue(value) {
        return typeof value === 'string' && /^http(s)?:\/\//.test(value);
    }

    registerLocal(id, value) {
        if (this.isExternalValue(value)) {
            this.hasExternal.add(id);
        } else {
            this.hasLocal.add(id);
        }
    }

    addJson(perm, id, local = null) {
        if (!isValidResourceId('json', id)) {
            throw Error(`Invalid id "${id}" given for JSON resource...TODO`);
        }
        if (local !== null) {
            this.hasLocal.add('json:' + id);
        }
        if (perm) {
            this.permJson[id] = local;
        } else {
            this.json[id] = local;
        }
    }

    addImage(perm, id, localValue = null) {
        if (!isValidResourceId('image', id)) {
            throw Error(`Invalid id "${id}" given for image resource...TODO`);
        }
        if (localValue !== null) {
            this.registerLocal('image:' + id, localValue);
        }
        if (perm) {
            this.permImage[id] = localValue;
        } else {
            this.image[id] = localValue;
        }
    }

    addAudio(perm, id, localValue = null) {
        if (!isValidResourceId('audio', id)) {
            throw Error(`Invalid id "${id}" given for audio resource...TODO`);
        }
        if (localValue !== null) {
            this.registerLocal('audio:' + id, localValue);
        }
        if (perm) {
            this.permAudio[id] = localValue;
        } else {
            this.audio[id] = localValue;
        }
    }

    setResource(type, id, value, source, screen = null) {
        if (!has(this.resources, type)) {
            this.resources[type] = {};
        }
        if (type === 'json' && typeof value === 'object') {
            value.id = id;
            value.__resolved = true;
        } else {
            value.setId(id);
        }
        this.resources[type][id] = value;
        this.source.set(type + ':' + id, source);
        if (screen !== null) {
            this.screen.set(type + ':' + id, screen);
        }
        if (source === 'browser') {
            this.hasBrowserResource = true;
        }
        delete this[type][id];
    }

    getResourceSource(id) {
        const source = this.source.get(id)
        return source ? source : 'code'
    }

    getResourceScreen(id) {
        return this.screen.get(id);
    }

    updateImageResource(storage, img) {
        if (!(img instanceof AppliedImage)) {
            throw Error(`Expected AppliedImage but got ${typeof img}!`);
        }
        if (!img.id) {
            throw Error('No id given in ImageResource');
        }
        switch (storage) {
            case 'browser':
                this.storage.storeImage(img.id, img.dataUrl)
                this.setResource('image', img.id, img.imageResource, 'browser');
                break;
        }
    }

    updateJsonResource(storage, json) {
        if (!json.id) {
            throw Error('Missing id property in JSON resource!');
        }
        switch (storage) {
            case 'browser':
                this.storage.storeJson(json.id, json);
                this.setResource('json', json.id, json, 'browser');
                break;
        }
    }

    hasResource(type, id) {
        if (this.disabled) return false
        return this.resources[type] !== undefined && this.resources[type][id] !== undefined
    }

    getResources(type = null) {
        if (type === null) {
            return this.resources;
        }
        return this.resources[type];
    }

    getJsonResource(id) {
        if (this.resources.json[id] !== undefined) {
            return this.resources.json[id];
        }
        throw Error(`JSON resource "${id}" does not exists!`);
    }

    getResource(type, id) {
        if (this.resources[type] && this.resources[type][id] !== undefined) {
            return this.resources[type][id];
        }
        throw Error(`Resource "${id}" of type ${type} does not exists!`);
    }

    getImageResource(id) {
        if (this.resources.image[id] !== undefined) {
            return this.resources.image[id];
        }
        throw Error(`Image resource "${id}" does not exists!`);
    }

    getAudioResource(id) {
        if (this.resources.audio[id] !== undefined) {
            return this.resources.audio[id];
        }
        throw Error(`Audio resource "${id}" does not exists!`);
    }

    hasBrowserResources() {
        for (let key of this.storage.getKeys()) {
            if (key.indexOf(':') !== -1) {
                return true
            }
        }
        return false;
    }

    makeImageResource(data, id = null) {
        const img = new ImageResource(data);
        img.resolved = true;
        img.id = id;
        return img;
    }

    storeScreenModel(screen, model) {
        const oldResources = this.storage.dependencies.getResourceWithDependencies('json:' + model.id);
        const resources = model.getResourcesAndDependencies(model);
        for (let resource of resources.resources) {
            switch(resource.type) {
                case 'json':
                    this.updateJsonResource('browser', resource.data);
                    break;

                case 'image':
                    this.updateImageResource('browser', resource.data);
                    break;

                default:
                    throw Error('TODO');
            }
        }
        this.storage.storeScreenResource(screen, 'json', model.id);
        this.storage.storeResourceDependencies(resources.dependencies);

        const newResources = [];
        for (let node of Object.keys(resources.dependencies)) {
            if (!newResources.includes(node)) {
                newResources.push(node);
            }
            for (let target of resources.dependencies[node]) {
                if (!newResources.includes(target)) {
                    newResources.push(target);
                }
            }
        }
        for (let resource of oldResources) {
            const deleteResources = [];
            if (!newResources.includes(resource)) {
                deleteResources.push(resource);
            }
            if (deleteResources.length) {
                this.storage.safeDeleteResources(deleteResources);
            }
        }
    }

    deleteServerResources(resources) {
        if (resources.length === 0) {
            return Promise.resolve();
        }
        return this.fetcher.fetch(
            'delete', {resources}
        ).then(body => {
            for (let resource of body.deleted) {}
            return body.deleted;
        });
    }

    checkServerResources(resources) {
        return this.fetcher.fetch(
            'has', { resources }
        ).then(body => {
            const found = [];
            for (let item of body.found) {
                found.push(item.type + ':' + item.id);
            }
            return found;
        })
    }

    getAllResourceIds(type) {
        // TODO: we might also fetch the server ids here
        let ids = [];
        switch(type) {
            case 'json':
                ids = this.storage.getJsonIds();
                break;

            case 'image':
                ids = this.storage.getImageIds();
                break;
        }
        return ids;
    }

    deployResources(screen, resources, direct, indirect) {
        const overwrites = [];
        for(let resource of resources) {
            let data = resource.data;
            if (data instanceof AppliedImage) {
                data = data.dataUrl;
            }
            overwrites.push({data, type: resource.type, id: resource.id});
        }
        if (overwrites.length === 0) {
            return Promise.resolve();
        }
        return (
            this.fetcher.fetch('store', {
                screen,
                resources: overwrites,
                direct,
                indirect
            }).then(body => {
                for (let resource of body.stored) {
                    const screen = this.getResourceScreen(resource.type + ':' + resource.id);
                    if (screen) {
                        // TODO: check why global state resource fails here
                        this.storage.deleteScreenResource(screen, resource.type, resource.id);
                    }
                }
                return body;
            })
        )
    }

    loadGameConfig() {
        return Promise.resolve()
    }

    loadResources(images, jsons, audios, screen = '') {
        const direct = this.storage.getAllScreenResources(screen);

        for (let id of direct.json) {
            if (jsons[id] === undefined) {
                jsons[id] = null;
            }
        }
        for (let id of direct.image) {
            if (images[id] === undefined) {
                images[id] = null;
            }
        }
        for (let id of direct.audio) {
            if (audios[id] === undefined) {
                audios[id] = null;
            }
        }

        const resolved = flattenResources(direct);
        /*
        WHY ????
                const resourcesWithChildren = this.storage.getResourcesWithChildren();

                for(let resource of resourcesWithChildren) {
                    if (!resolved.includes(resource)) {
                        resolved.push(resource);
                    }
                }
        */
        const promises = [];
        const fetchResources = [];
        const storedImageIds = this.storage.getImageIds();
        each(images,(value, id) => {
            if (has(storedImageIds, id)) {
                const value = this.storage.getImage(id);
                const image = new ImageResource(value);
                promises.push(
                    image.getNewDecodePromise().then(() => {
                        this.setResource('image', id, image, 'browser', screen);
                    })
                );
            } else {
                if (value !== null && value.startsWith('http')) {
                    // try to fetch image directly
                    promises.push(
                        fetch(value, {mode: 'cors'}).then(
                            response => {
                                if (!response.ok) {
                                    throw Error('Could not open url');
                                }
                                return (
                                    response.blob().then(blob => {
                                        const resource = new ImageResource(URL.createObjectURL(blob));
                                        return resource.getNewDecodePromise().then(() => {
                                            this.setResource('image', id, resource, 'external', screen);
                                        });
                                    })
                                )
                            }
                        )
                    );
                } else {
                    fetchResources.push({id, type: 'image'});
                }
            }
        });

        const storedAudioIds = this.storage.getAudioIds();
        each(audios, (value, id) => {
            if (has(storedAudioIds, id)) {
                const audio = new AudioResource(this.storage.getAudio(id));
                promises.push(
                    audio.getNewLoadingPromise().then(() => {
                        this.setResource('audio', id, audio, 'browser', screen);
                    })
                );
            } else {
                if (value !== null && value.startsWith('http')) {
                    // try to fetch audio directly
                    promises.push(
                        fetch(value, {mode: 'cors'}).then(
                            response => {
                                if (!response.ok) {
                                    throw Error('Could not open url');
                                }
                                return (
                                    response.blob().then(blob => {
                                        const resource = new AudioResource(URL.createObjectURL(blob));
                                        return resource.getNewLoadingPromise().then(() => {
                                            this.setResource('audio', id, resource, 'external', screen);
                                        });
                                    })
                                )
                            }
                        )
                    );
                } else {
                    fetchResources.push({id, type: 'audio'});
                }
            }
        });

        // do the same for jsons
        const storedJsonIds = this.storage.getJsonIds();
        each(jsons,(value, id) => {
            if (has(storedJsonIds, id)) {
                this.setResource('json', id, this.storage.getJson(id), 'browser', screen);
                promises.push(
                    Promise.resolve()
                );
            } else {
                // TODO: url-load?
                fetchResources.push({id, type: 'json'});
            }
        });

        // load ids from server
//        if (has(fetchResources)) {
        /*
                    const remotes = this.storage.getScreenRemotes(screen);
                    for(let remote of remotes) {
                        const [type, id] = remote.split(':');
                        fetchResources.push({type, id});
                    }
        */
        promises.push(
            this.fetcher.fetch('resources', {
                resources: fetchResources,
                screen,
                resolved,
                overwrites: this.storage.dependencies.getIndirect(),
                remotes: this.storage.getScreenRemotes(screen)
            }).then(body => {
                const subPromises = [];
                for (let resource of body.found) {
                    if (resource.data === null) {
                        continue;
                    }
                    switch (resource.type) {
                        case 'image':
                            const image = new ImageResource(resource.data);
                            subPromises.push(
                                image.getNewDecodePromise().then(() => {
                                    this.setResource(resource.type, resource.id, image, 'server', screen);
                                })
                            );
                            break;

                        case 'audio':
                            const audio = new AudioResource(resource.data);
                            subPromises.push(
                                audio.getNewLoadingPromise().then(() =>{
                                    this.setResource(resource.type, resource.id, audio, 'server', screen);
                                })
                            );
                            break;

                        case 'json':
                            this.setResource('json', resource.id, resource.data, 'server', screen);
                            break;
                    }
                }

                for (let resource of body.notFound) {
                    if (this.storage.hasResource(resource.type, resource.id)) {
                        this.setResource(
                            resource.type,
                            resource.id,
                            this.storage.getResource(resource.type, resource.id),
                            'browser',
                            screen
                        );
                    } else {
                        let value = null;
                        switch(resource.type) {
                            case 'json':
                                value = jsons[resource.id];
                                break;

                            case 'image':
                                value = images[resource.id];
                                break;

                            case 'audio':
                                value = audios[resource.id];
                                break;
                        }
                        if (value === null) {
                            throw Error(`Missing remote ${resource.type} resource ${resource.id}`);
                        }
                        if (resource.type === 'image') {
                            const image = new ImageResource(value);
                            subPromises.push(
                                image.getNewDecodePromise().then(() => {
                                    this.setResource(resource.type, resource.id, image, 'code', screen);
                                })
                            );
                            continue;
                        } else if (resource.type === 'audio') {
                            const audio = new AudioResource(value);
                            subPromises.push(
                                audio.getNewLoadingPromise().then(() => {
                                    this.setResource(resource.type, resource.id, audio, 'code', screen);
                                })
                            );
                            continue;
                        }
                        this.setResource(resource.type, resource.id, value, 'code', screen);
                    }
                }
                return Promise.all(subPromises);
            })
        )
        //       }

        return Promise.all(promises).then(() => {
            return this.resources
        });
    }

    loadPermanentResources() {
        return this.loadResources(
            this.permImage, this.permJson, this.permAudio
        ).then(() => {
            this.hasPermLoaded = true;
        });
    }

    load(screen) {
        const promise = this.hasPermLoaded ? Promise.resolve() : this.loadPermanentResources(this.permImage, this.permJson, this.permAudio);
        return promise.then(() => this.loadResources(
            this.image, this.json, this.audio, screen
        ));
    }
}

class CanvasManager {

    constructor() {
        this.overlayElem = null;
        this.offscreenElem = null;
        this.canvasElems = [];
    }

    getCanvasElem(dimX, dimY, opaque) {
        const elem = document.createElement('canvas');
        elem.id = 'canvas_' + this.canvasElems.length;
        elem.setAttribute('width', dimX);
        elem.setAttribute('height', dimY);
        elem.setAttribute('style', 'position: absolute; left: 0px; top: 0px');

        const ctx = elem.getContext('2d', {alpha: !opaque});
        ctx.imageSmoothingEnabled = false;
        const canvas = {elem, ctx};
        this.canvasElems.push(canvas);
        return canvas;
    }

    getOverlayElem() {
        if (this.overlayElem === null) {
            this.overlayElem = document.getElementById('screen-overlay-div');
        }
        return this.overlayElem;
    }

    getOffscreenElem() {
        if (this.offscreenElem === null) {
            this.offscreenElem = document.getElementById('offscreen-div');
        }
        return this.offscreenElem;
    }

    getContainerElem(viewPortX, viewPortY, offX, offY) {
        const elem = document.createElement('div');
        elem.setAttribute('style', 'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortX + 'px; height: ' + viewPortY + 'px; top: ' + offY + 'px; left: ' + offX + 'px; overflow: hidden');
        return elem;
    }

    getNewOffscreenCanvas(dimX, dimY) {
        return this.getNewCanvas('offscreen', dimX, dimY);
    }

    getNewCanvas(type, dimX, dimY, offX = 0, offY = 0, opaque = false) {
        const id = type + '_' + this.canvasElems.length;
        const parentElem = type === 'offscreen' ? this.getOffscreenElem() : this.getOverlayElem();
        const elem = document.createElement('canvas');
        elem.id = id;
        elem.setAttribute('width', dimX);
        elem.setAttribute('height', dimY);
        if (type === 'overlay') {
            elem.setAttribute('style', 'position: absolute; top: ' + offY + 'px; left: ' + offX + 'px');
        }
        parentElem.appendChild(elem);
        const ctx = elem.getContext('2d', {alpha: !opaque});
        ctx.imageSmoothingEnabled = false;
        const canvas = {id, type, elem, ctx, width: dimX, height: dimY};
        this.canvasElems.push(canvas);

        return canvas;
    }

    discard(canvas) {
        canvas.elem.parentNode.removeChild(canvas.elem);
        canvas.elem = null;
        const index = this.canvasElems.indexOf(canvas);
        if (index !== -1) {
            this.canvasElems.splice(index, 1);
        }
    }

    removeChildren(node) {
        if (!node) return
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    clear() {
        this.canvasElems = [];
        this.removeChildren(this.getOffscreenElem());
        this.removeChildren(this.getOverlayElem());
    }
}

class AutoIdGenerator {

    constructor() {
        this.context2ids = {}
        this.context = null
    }

    startContext(value) {
        this.context = value
    }

    endContext() {
        this.context = null
    }

    getContext() {
        return this.context
    }

    getIdPrefix() {
        if (this.context === null) return ''
        return this.context === 'screen' ? 'screen_' + inst.game.currentScreen : this.context
    }

    getNewId(name) {
        const context = this.context
        if (context === null)
            throw Error('Cannot generate new id outside context')

        let contextMap = this.context2ids[this.context]
        if (!contextMap) {
            contextMap = new Map()
            this.context2ids[context] = contextMap
        }

        let no = contextMap.get(name)
        if (no === undefined) no = 0
        no++
        contextMap.set(name, no)
        return this.getIdPrefix() + '_' + name + '_' + no
    }

    clearAllIds() {
        for (const map of toValues(this.context2ids)) {
            map.clear()
        }
    }

    clearScreenIds() {
        const map = this.context2ids.screen
        if (map) map.clear()
    }
}
let autoIds = null


const inst = {
    setGame: value => {
        if (game !== null) throw Error('There is already a running game instance!')
        game = value
    },
    setRenderPlugin: value => {
        renderPlugin = value
    },
    get renderPlugin() {
        if (renderPlugin === null) {
            renderPlugin = new DefaultRenderPlugin()
        }
        return renderPlugin
    },
    setTouchControlsPlugin: value => {
        touchControlsPlugin = value
    },
    get touchControlsPlugin() {
        if (touchControlsPlugin === null) {
            touchControlsPlugin = new DefaultTouchControlsPlugin()
        }
        return touchControlsPlugin
    },
    setRL: (baseUrl, storage) => RL = new ResourceLoader(
        Fetcher(baseUrl),
        storage
    ),
    get RL() {
        if (RL) return RL
        throw Error('Resource Loader not yet initialized!')
    },
    setSM: (storage, gameId) => SM = new StorageManager(storage, gameId),
    get SM() {
        if (SM) return SM
        throw Error('Storage Manager not yet initialized!')
    },
    get game() {
        if (game) return game
        throw Error('Game not yet instantiated!')
    },
    get system() {
        if (!system) {
            system = new System()
        }
        return system
    },
    get filterer() {
        if (!filterer) {
            filterer = new BitmapFilterer()
        }
        return filterer
    },
    get OCM() {
        if (!OCM) {
            OCM = new CanvasManager()
        }
        return OCM
    },
    get plugins() {
        const plugins = [ inst.renderPlugin ];
        if (system.supportsTouch) {
            plugins.push(inst.touchControlsPlugin)
        }
        return plugins
    },
    get autoIds() {
        if (autoIds === null) autoIds = new AutoIdGenerator()
        return autoIds
    },
    paneRegistry: new PaneRegistry()
}

export default inst