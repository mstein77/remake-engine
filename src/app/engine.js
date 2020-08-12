const {isValidResourceId, d} = require('./helper/helper');

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

class ImageResource {

    constructor(data) {
        this.image = new Image();
        this.canvas = null;
        if (data instanceof HTMLCanvasElement) {
            this.canvas = {elem: data, ctx: data.getContext('2d')};
            data = this.getDataUrl();
        }
        this.image.src = data;
    }

    getCanvas() {
        if (this.canvas === null) {
            this.canvas = OCM.getNewOffscreenCanvas(this.image.width, this.image.height);
            this.canvas.ctx.drawImage(this.image, 0, 0);
        }
        return this.canvas;
    }

    getCanvasElem() {
        return this.getCanvas().elem;
    }

    getNewDecodePromise() {
        return this.image.decode();
    }

    getDataUrl(format = 'png') {
        return this.getCanvasElem().toDataURL('image/' + format);
    }

    getImage() {
        return this.image;
    }
}

class AudioResource {

    constructor(url, readyCallback = null) {
        this.audio = null;
        this.promise = new Promise((resolve) => {
            this.audio = new Audio(url);
            this.audio.oncanplaythrough = () => {
                resolve();
                if (readyCallback) {
                    readyCallback();
                }
            }
        });
        this.lastAction = null;
    }

    play(volume = 1, restart = true) {
        if (restart && this.isPlaying()) {
            this.rewind();
        }
        this.audio.volume = volume;
        this.lastAction = 'load';
        this.audio.play().then(() => {
            if (this.lastAction === 'pause') {
                this.audio.pause();
            } else {
                this.lastAction = 'play';
            }
        });
    }

    continue() {
        if (this.lastAction === 'pause') {
            this.lastAction = 'play';
            this.play(1, false);
        }
    }

    rewind() {
        this.audio.currentTime = 0;
    }

    setLoop(value) {
        this.audio.loop = value;
    }

    pause() {
        if (this.lastAction === 'play') {
            this.audio.pause();
        }
        this.lastAction = 'pause';
    }

    reset() {
        this.rewind();
    }

    isPlaying() {
        return !(this.audio.ended || this.lastAction === 'pause');
    }

    isLooping() {
        return this.audio.loop;
    }

    getNewLoadingPromise() {
        return this.promise;
    }
}

class StorageManager {

    constructor(gameId = 'demo') {
        this.prefix = gameId;
        this.active = this.isAvailable();
    }

    isQuotaExceededException(e) {
        return e instanceof DOMException && (
            e.name === 'QuotaExceededError' ||
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        );
    }

    isAvailable() {
        if (!localStorage) {
            return false;
        }
        try {
            const x = '__storage_test__';
            localStorage.setItem(x, '1');
            localStorage.removeItem(x);
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
        for(let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
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
            localStorage.setItem(this.prefix + ':' + type + ':' + id, data);
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
            return localStorage.getItem(this.prefix + ':' + type + ':' + id);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    getImage(id) {
        return this.getResource('image', id)
    }

    getJson(id) {
        const json = this.getResource('json', id);
        if (json === null) {
            return null;
        }
        try {
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    getAudio(id) {
        return this.getResource('audio', id)
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

    deleteResource(type, id) {
        if (!this.isAvailable()) {
            return false;
        }
        localStorage.removeItem(this.prefix + ':' + type + ':' + id);
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

    clearResources(types = null) {
        if (!this.isAvailable()) {
            return false;
        }
        types =
            types === null ? ['image', 'json', 'audio'] :
                (Array.isArray(types) ? types : [types]);
        for (let type of types) {
            const keys = this.getKeys(type);
            for (let key of keys) {
                this.deleteResource(type, key);
            }
        }
        return true;
    }

    clearImages() {
        return this.clearResources('image');
    }

    clearJsons() {
        return this.clearResources('json');
    }

    clearAudios() {
        return this.clearResources('audio');
    }
}

class ResourceLoader {

    constructor() {
        this.resources = {};
        this.image = {};
        this.json = {};
        this.audio = {};
        this.permImage = {};
        this.permJson = {};
        this.permAudio = {};
        this.hasPermLoaded = false;
        this.source = new Map();
        this.hasLocal = new Set();
        this.hasExternal = new Set();
    }

    invalidatePermanentResources() {
        this.hasPermLoaded = false;
    }

    clearResources() {
        this.resources = {};
    }

    clearBrowserResources() {
        SM.deleteResources();
/*
        for(let [id, source] of this.source.entries()) {
            if (source === 'browser') {
                const [type, resourceId] = id.split(':');
                SM.deleteResource(type, resourceId);
            }
        }

 */
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

    setResource(type, id, value, source) {
        if (!has(this.resources, type)) {
            this.resources[type] = {};
        }
        if (type === 'json' && typeof value === 'object') {
            value.id = id;
        } else if (type === 'image') {
            value.id = id;
        }
        this.resources[type][id] = value;
        this.source.set(type + ':' + id, source);
        if (source === 'browser') {
            this.hasBrowserResource = true;
        }
        delete this[type][id];
    }

    getResourceSource(id) {
        return this.source.get(id);
    }

    updateImageResource(storage, img) {
        if (!(img instanceof ImageResource)) {
            throw Error('XX');
        }
        if (!img.id) {
            throw Error('Bowoew');
        }
        switch (storage) {
            case 'browser':
                SM.storeImage(img.id, img.getDataUrl());
                this.setResource('image', img.id, img, 'browser');
                break;
        }
    }

    updateJsonResource(storage, json) {
        if (!json.id) {
            throw Error('##we');
        }
        switch (storage) {
            case 'browser':
                SM.storeJson(json.id, json);
                this.setResource('json', json.id, json, 'browser');
                break;
        }
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

    hasBrowserResources() {
        return SM.getKeys().length > 0;
    }

    makeImageResource(data) {
        return new ImageResource(data);
    }

    deleteServerResources(resources) {
        if (resources.length === 0) {
            return Promise.resolve();
        }
        return (
            fetch('http://localhost:8080/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resources
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('failed...');
                    throw Error('BOOM!');
                }
                return response.json();
            }).then(body => {
                for (let resource of body.deleted) {
                }
                return body.deleted;
            })
        )
    }

    checkServerResources(resources) {
        return (
            fetch('http://localhost:8080/has', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resources
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('failed...');
                    throw Error('BOOM!');
                }
                return response.json();
            }).then(body => {
                const found = [];
                for (let item of body.found) {
                    found.push(item.type + ':' + item.id);
                }
                return found;
            })
        )
    }

    deployResources(resources) {
        const overwrites = [];
        for(let resource of resources) {
            let data = null;
            if (this.resources[resource.type]) {
                data = this.resources[resource.type][resource.id];
                if (data) {
                   if (data instanceof ImageResource) {
                       data = data.getDataUrl();
                   }
                }
            }
            overwrites.push({data, type: resource.type, id: resource.id});
        }
        if (overwrites.length === 0) {
            return Promise.resolve();
        }
        return (
            fetch('http://localhost:8080/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resources: overwrites
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('failed...');
                    throw Error('BOOM!');
                }
                return response.json();
            }).then(body => {
                for (let resource of body.stored) {
                    SM.deleteResource(resource.type, resource.id);
                }
                return body;
            })
        );
    }

    loadResources(images, jsons, audios) {
        const promises = [];
        const fetchResources = [];
        const storedImageIds = SM.getImageIds();
        each(images,(value, id) => {
            if (has(storedImageIds, id)) {
                const value = SM.getImage(id);
                const image = new ImageResource(value);
                promises.push(
                    image.getNewDecodePromise().then(() => {
                        this.setResource('image', id, image, 'browser');
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
                                            this.setResource('image', id, resource, 'external');
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

        const storedAudioIds = SM.getAudioIds();
        each(audios, (value, id) => {
            if (has(storedAudioIds, id)) {
                const audio = new AudioResource(SM.getAudio(id));
                promises.push(
                    audio.getNewLoadingPromise().then(() => {
                        this.setResource('audio', id, audio, 'browser');
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
                                            this.setResource('audio', id, resource, 'external');
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
        const storedJsonIds = SM.getJsonIds();
        each(jsons,(value, id) => {
            if (has(storedJsonIds, id)) {
                this.setResource('json', id, SM.getJson(id), 'browser');
                promises.push(
                    Promise.resolve()
                );
            } else {
                // TODO: url-load?
                fetchResources.push({id, type: 'json'});
            }
        });

        // load ids from server
        if (has(fetchResources)) {
            promises.push(
                fetch('http://localhost:8080/resources', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        resources: fetchResources
                    })
                }).then(response => {
                    if (!response.ok) {
                        console.error('failed...');
                        throw Error('BOOM!');
                    }
                    return response.json();
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
                                        this.setResource(resource.type, resource.id, image, 'server');
                                    })
                                );
                                break;

                            case 'audio':
                                const audio = new AudioResource(resource.data);
                                subPromises.push(
                                    audio.getNewLoadingPromise().then(() =>{
                                        this.setResource(resource.type, resource.id, audio, 'server');
                                    })
                                );
                                break;

                            case 'json':
                                this.setResource('json', resource.id, resource.data, 'server');
                                break;
                        }
                    }

                    for (let resource of body.notFound) {
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
                                    this.setResource(resource.type, resource.id, image, 'code');
                                })
                            );
                        } else if (resource.type === 'audio') {
                            const audio = new AudioResource(value);
                            subPromises.push(
                                audio.getNewLoadingPromise().then(() => {
                                    this.setResource(resource.type, resource.id, audio, 'code');
                                })
                            );
                        }
                        this.setResource(resource.type, resource.id, value, 'code');
                    }
                    return Promise.all(subPromises);
                })
            )
        }

        return Promise.all(promises).then(() => {
            return this.resources;
        });
    }

    loadPermanentResources() {
        return this.loadResources(
            this.permImage, this.permJson, this.permAudio
        ).then(() => {
            this.hasPermLoaded = true;
        });
    }

    load() {
        const promise = this.hasPermLoaded ? Promise.resolve() : this.loadPermanentResources(this.permImage, this.permJson, this.permAudio);
        return promise.then(() => this.loadResources(
            this.image, this.json, this.audio
        ));
    }
}

const SM = new StorageManager();
const RL = new ResourceLoader();

class Config {
    constructor(json) {
        if (typeof json === 'string') {
           json = RL.getJsonResource(json);
           this.parse(json);
        } else if (json !== undefined) {
            if (typeof json !== 'object') {
                throw 'Config must be instantiated with a JSON or an JSON resource id!';
            }
            this.parse(json);
        }
    }

    validateInt(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'number') {
            throw Error('value must be an integer');
        }
        if (props.min && value < props.min) {
            throw Error('value is less than ' + props.min);
        }
        if (props.max && value > props.max) {
            throw Error('value is more than ' + props.max);
        }
        return value;
    }

    validateString(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'string') {
            throw Error('value must be a string');
        }
        if (props.min && value.length < props.min) {
            throw Error('value is shorter than ' + props.min);
        }
        if (props.max && value.length > props.max) {
            throw Error('value is longer than ' + props.max);
        }
        if (props.size && value.length !== props.size) {
            throw Error('value must have a length of ' + props.size);
        }
        return value;
    }

    validateArray(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (!Array.isArray(value)) {
            throw Error('value must be an array');
        }
        if (props.min && value.length < props.min) {
            throw Error('value is shorter than ' + props.min);
        }
        if (props.max && value.length > props.max) {
            throw Error('value is longer than ' + props.max);
        }
        if (props.size && value.length !== props.size) {
            throw Error('value must have a length of ' + props.size);
        }
        return value;
    }

    validateImageResource(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value === 'string') {
            value = RL.getImageResource(value);
        }
        if (!(value instanceof ImageResource)) {
            throw Error('value is no image resource!');
        }
        return value;
    }

    validateObject(value, props = {}) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'object') {
            throw Error('value must be an object');
        }
        return value;
    }

    validateImage(value) {
        if (value === undefined) {
            throw Error('Undefined value');
        }
        if (typeof value !== 'string' || !value.startsWith('data:image/')) {
            throw Error('value must be an image dataURL');
        }
        return value;
    }

    validateId(value) {
        if (value == undefined) {
            throw Error('config requires an id property');
        }
        if (typeof value !== 'string') {
            throw Error('id must be a string');
        }

        if (!(/^[0-9_a-z]+$/i).test(value)) {
            throw Error('unallowed characters in id');
        }
        return value;
    }

    setId(value) {
        this.id = this.validateId(value);
    }

    parse(json) {
        if (json.id !== undefined) {
            this.setId(json.id);
        }
        for (let key in json) {
            const value = json[key];
            if (key !== '' && value !== undefined) {
                const setKey = 'set' + key[0].toUpperCase() + key.substr(1);
                if (this[setKey]) {
                    this[setKey](value);
                }
            }
        }
    }

    freezeDeep(obj) {
        return Object.freeze(obj);
    }

    exists(keys = []) {
        if (!Object.isFrozen(this)) {
            this.freezeDeep(this);
        }
        keys.push('id');
        for(let key of keys) {
            if (this[key] === undefined) {
                throw Error(`Missing key "${key}" in config`);
            }
        }
    }

    applyTo(obj) {
        return obj;
    }

    getJson() {
        return this.applyTo({});
    }
}

class FontMapConfig extends Config {
    setWidth(width) {
        this.width = this.validateInt(width, {min: 1, max: 256});
    }

    setHeight(height) {
        this.height = this.validateInt(height, {min: 1, max: 256});
    }

    setImage(image) {
        this.image = this.validateImageResource(image);
    }

    setChars(values) {
        this.validateArray(values);
        for(let value of values) {
            this.validateArray(value, {size: 3});
            const [chars, x, y] = value;
            this.validateString(chars,{min: 1, max: 2});
            if (chars.length === 1) {
                this.addChar(chars, x, y);
            } else {
                this.addRange(chars[0], chars[1], x, y);
            }
        }
    }

    setMap(map) {
        for(let char in this.validateObject(map)) {
            const props = this.validateObject(map[char]);
            this.addChar(char, props.x, props.y);
        }
    }

    addChar(char, x, y) {
        if (this.map === undefined) {
            this.map = {};
        }
        this.map[this.validateString(char, {min: 1, max: 1})] = {
            x: this.validateInt(x, {min: 0}),
            y: this.validateInt(y, {min: 0})
        };
    }

    addRange(from, to, x, y) {
        if (this.width === undefined) {
            throw Error('Width required but not set!');
        }
        const fromCode = this.validateString(from, {min: 1, max: 1}).charCodeAt(0);
        const toCode = this.validateString(to, {min: 1, max: 1}).charCodeAt(0);
        for (let i = fromCode; i <= toCode; i++) {
            this.addChar(String.fromCharCode(i), x, y);
            x += this.width;
        }
    }

    applyTo(obj) {
        super.exists(['width', 'height', 'image']);
        obj.id = this.id;
        obj.width = this.width;
        obj.height = this.height;
        obj.image = this.image;
        obj.map = this.map ? {...this.map} : {};

        return obj;
    }
}

class stateProxyHandler {
    constructor() {
        this.lazyKeys = [];
        this.locked = false;
    }

    hasConfigureableValue(value) {
        if (value === null) {
            return false;
        }
        if (Array.isArray(value)) {
            for (let item of value) {
                if (this.hasConfigureableValue(item)) {
                    return true;
                }
            }
        } else if (typeof value === 'object') {
            if (value.config && value.config instanceof Config) {
                return true;
            }
            for (let subValue of Object.values(value)) {
                if (this.hasConfigureableValue(subValue)) {
                    return true;
                }
            }
        }
        return false;
    }

    defineProperty(target, key, descriptor) {
        if (this.locked && this.hasConfigureableValue(descriptor.value)) {
            throw new Error(`Tried to write a configureable object to the state object as key "${key}" !`);
        }
        if (this.locked && typeof descriptor.value === 'function') {
            throw new Error(`Tried to write a function to the state object as key "${key}" !`);
        } else {
            target[key] = descriptor.value;
        }

        return true;
    }

    get(target, prop, receiver) {
        if (prop === 'lock') {
            this.locked = true;
            return () => null
        } else if (prop === 'unlock') {
            this.locked = false;
            return () => null
        } else if (prop === 'getClone') {
            const lazyKeys = Object.keys(this.lazyKeys);
            const keys = Object.keys(target).filter(x => lazyKeys.indexOf(x) === -1);
            const clone = getNewStateObj();
            for (let key of keys) {
                clone[key] = target[key];
            }
            return () => clone;
        }
        return Reflect.get(...arguments);
    }
}

function getNewStateObj() {
    const globState = {
        getClone: () => {}
    };
    const stateProxy = new Proxy(globState, new stateProxyHandler());
    stateProxy.self = stateProxy;
    return stateProxy;
}

class ResourceRequest {
    constructor(permanent = false) {
        this.permament = permanent;
    }

    addImageResource(id, data) {
        if (Array.isArray(data)) {
            if (!isValidResourceId('image', id)) {
                throw Error('TODO');
            }
            for (let index = 0; index < data.length; index++) {
                const parts = id.split('.');
                RL.addImage(this.permament,parts[0] + '_' + index + '.' + parts[1], data[index]);
            }
        } else {
            RL.addImage(this.permament, id, data);
        }
    }

    addImageResources(dataObj) {
        for (let id in dataObj) {
            this.addImageResource(id, dataObj[id]);
        }
    }

    addAudioResource(id, url) {
        RL.addAudio(this.permament, id, url);
    }

    addAudioResources(dataObj) {
        for (let id in dataObj) {
            RL.addAudio(this.permament, id, dataObj[id]);
        }
    }

    addJsonResource(id, json) {
        RL.addJson(this.permament, id, json);
    }
}

const TILE = {
    DIM_1x1: 0,
    DIM_2x2: 1,
    DIM_4x4: 2,
    DIM_8x8: 3,
    DIM_16x16: 4,
    DIM_32x32: 5,
    DIM_64x64: 6,
    DIM_128x128: 7,
    DIM_256x256: 8
};

class Game {

    constructor(width, height, config, init) {
        // analyse the element?
        if (Game.instance) {
            throw new Error('There is already a running game instance!');
        }
        Game.instance = this;
        this.width = width;
        this.height = height;
        this.init = init.bind(this);
        this.screens = {};
        this.currentScreen = null;
        this.debug = config.debug === true;
        this.globalKeyHandlers = [];
        this.timers = {};
        this.frameEvents = {};
        this.durations = {};
        this.frames = 0;
        this.zoom = config.zoom;
        this.elems = {};
        this.minFps = 100;
        this.logs = [];
        this.domQueue = [];
        this.audioPlaying = [];
        this.globals = getNewStateObj();
        this.touchInputs = [];
        this.gamepads = [];
        this.audio = new AudioPlayer();
        this.lastTouches = {};
        this.hasTouch = false;
        this.buildState = null;
        this.hasBuildState = true;
        this.editorRun = 0;
        this.restartEditorWithId = null;
        this.lastState = null;

        document.addEventListener('DOMContentLoaded', function(event) {
            Game.instance.boot();
        });
    }

    setStateInitHandler(handler) {
        this.buildState = handler.bind(new ResourceRequest(true))();
        this.hasBuildState = false;
    }

    getResourceLoader() {
        return RL;
    }

    getStorageManager() {
        return SM;
    }

    updateDom() {
        while (this.domQueue.length > 0) {
            const next = this.domQueue.shift();
            switch(next.op) {
                case 'set':
                    const parts = next.key.split('.');
                    let elem = next.elem;
                    while (parts.length > 1) {
                        elem = elem[parts.shift()];
                    }
                    elem[parts[0]] = next.value;
                    break;

                case 'add':
                    next.target.appendChild(next.child);
                    break;
            }
        }
    }

    addDomOp(elem, key, value) {
        this.domQueue.push({op: 'set', elem, key, value});
    }

    addDomChild(target, child) {
        this.domQueue.push({op: 'add', target, child});
    }

    getDomElem(id) {
        if (this.elems[id] === undefined) {
            const elem = document.getElementById(id);
            if (elem === null) {
                throw Error('Required element with ID "' + id + '" not found in DOM!');
            }
            this.elems[id] = elem;
        }
        return this.elems[id];
    }

    log() {
        if (arguments.length === 0) {
            return;
        }
        const values = [];
        for (let i = 0; i < arguments.length; i++) {
            values.push('' + arguments[i]);
        }
        this.logs.push(values.join(' '));
    }

    setZoom(value, force = false) {
        if (value < 1 || value > 4 || (!force && this.zoom === value)) {
            return;
        }
        this.zoom = value;
        const overlay = this.getDomElem('overlay');
        overlay.style.transform =  'scale(' + this.zoom +')';
        overlay.style.transformOrigin = 'top left';
        const elem = this.getDomElem('screen-div');
        elem.style.width = '' + this.width * this.zoom;
        elem.style.height = '' + this.height * this.zoom;
        this.resetFps();
    }

    addGlobalKeyHandler(handler) {
        this.globalKeyHandlers.push(handler.bind(this));
    }

    render(force = false) {
        if (this.currentScreen !== null && this.screens[this.currentScreen].getState() === 'READY') {
            this.screens[this.currentScreen].render(force);
        }
    }

    startTimer(name) {
        this.timers[name] = performance.now();
    }

    addTimerDuration(name) {
        const delta = performance.now() - this.timers[name];
        if (this.durations[name] === undefined) {
            this.durations[name] = 0;
        }
        this.durations[name] += delta;
        return delta;
    }

    resetTimers(names) {
        for (let name of names) {
            this.timers[name] = 0;
            this.durations[name] = 0;
        }
    }

    addScreen(screen) {
        this.screens[screen.id] = screen;
    }

    reloadScreen(restartEditorWithId = null) {
        this.restartEditorWithId = restartEditorWithId;
        this.hasBuildState = false;
        RL.invalidatePermanentResources();
        this.globals = this.lastState;
        this.gotoScreen(this.currentScreen);
        this.restart();
    }

    gotoScreen(screenId, params = {}) {
        this.stopAllAudio();
        OCM.clear(); // TODO: clear should remove all children of overlay via DomOp
        this.frameEvents = {};
        this.currentScreen = screenId;
        const screen = this.screens[screenId];
        this.globals = Object.assign(this.globals, params);
        this.lastState = this.globals.getClone();
        RL.clearResources();
        const callback = screen.init(this.globals);
        this.build = callback.bind(this);
    }

    stopAllAudio() {
        for (let audio of this.audioPlaying) {
            audio.pause();
        }
        this.audioPlaying = [];
    }

    playAudio(audio) {
        if (audio.readyState >= 2) {
            this.audioPlaying.push(audio);
            audio.play();
        }
    }

    getGamepadPressed(no) {
        if (no >= this.gamepads.length) {
            return [];
        }
        return this.gamepads[no].pressed;
    }

    resetFps() {
        this.resetTimers(['game', 'render']);
        this.startTimer('game');
        this.frames = 0;
        this.minFps = 100;
    }

    setDebug(value) {
        this.debug = (value === true);
        this.getDomElem('log-div').style.display = this.debug ? 'block' : 'none';
        this.getDomElem('debugs').style.display = this.debug ? 'block' : 'none';
    }

    line() {
        return "=================================================\n";
    }

    openEditorMode() {
        if (gameEditor === null) {
            console.log('NO GAME EDITOR found!');
            return;
        }
        console.log('OPEN EDITOR MODE for Screen "' + this.currentScreen + '"');
        this.editorRun++;

        this.setRunning(false);
        RL.loadPermanentResources().then(() => {
            this.getDomElem('game').style.display = 'none';
            this.getDomElem('editor').style.display = 'block';
            new gameEditor.GameEditor(this, this.activeResource);
        });
    }

    getEditableResources() {
        const resources = [];

        function extractEditablesFromAreas(areas) {
            if (!Array.isArray(areas)) {
                return;
            }
            for (let area of areas) {
                if (area.panes !== undefined) {
                    for (let pane of area.panes) {
                        if (pane.tilesMap) {
                            resources.push({type: 'tilesMap', data: pane.tilesMap});
                        } else if (pane.font) {
                            resources.push({type: 'fontMap', config: FontMapConfig, data: pane.font.config});
                        } else if (pane.spriteSheet) {
                            resources.push({type: 'spriteSheet', data: pane.spriteSheet});
                        }
                    }
                }
                if (Array.isArray(area)) {
                    extractEditablesFromAreas(area);
                } else if (area.areas !== undefined) {
                    extractEditablesFromAreas(area.areas);
                }
            }
        }
        extractEditablesFromAreas(this.screens[this.currentScreen].areas);

        resources.push({type: 'filters', data: filterer});
        return resources;
    }

    restart() {
        if (this.running || gameEditor === null) {
            return;
        }
        this.getDomElem('editor').style.display = 'none';
        this.getDomElem('game').style.display = 'inline';
        this.setRunning(true);
//        this.gotoScreen(this.currentScreen);
    }

    printDebugs() {
        if (this.debug) {
            const gameDuration = this.running ? this.addTimerDuration('game') : this.durations['game'];
            const frameTime = this.getRounded(this.durations['render'] / this.frames, 2);
            const fps = this.frames === 0 ? '-' : Math.round((1000 / (gameDuration / this.frames)));
            this.minFps = Math.min(fps, this.minFps);
            const perfKpis =
                this.line() +
                " Performance\n" +
                this.line() +
                "FPS: " + fps + " - Min: " + this.minFps + "\n" +
                "Rendering: " + frameTime + "ms\n" +
                "Boot-Time: " + this.getRounded(this.durations['boot'], 2) + "ms\n\n";
            ;
            const out = [];
            out.push(this.line() + " Debug\n" + this.line());
            for (let k in debugs) {
                out.push(k + ': ' + debugs[k])
            }
            this.addDomOp(this.getDomElem('d'), 'innerHTML', perfKpis + out.join("\n"));

            if (this.logs.length > 0) {
//                this.getDomElem('log').innerHTML += this.logs.join("\n") + "\n";
                this.logs = [];
            }
        }
        debugs = [];
    }

    handleKeys() {
        for (let handler of this.globalKeyHandlers) {
            const stop = handler();
            if (stop) {
                this.keys = {};
                return;
            }
        }

        if (this.running) {
            const screen = this.screens[this.currentScreen];
            if (screen.keyHandler !== null) {
                screen.keyHandler();
            }
        }

        this.keys = {};
    }

    getRounded(value, decimals) {
        let f = 1;
        while(decimals > 0) {
            f *= 10;
            decimals--;
        }
        return Math.round(value * f) / f;
    }

    addFrameEvent(type, event) {
        if (this.frameEvents[type] === undefined) {
            this.frameEvents[type] = [];
        }
        this.frameEvents[type].push(event);
    }

    getEvents(type) {
        if (this.frameEvents[type] === undefined) {
            return [];
        }
        const events = this.frameEvents[type];
        delete this.frameEvents[type];
        return events;
    }

    getNextEvent(type) {
        const events = this.frameEvents[type];
        if (events === undefined) {
            return null;
        }
        const event = events.shift();
        if (events.length === 0) {
            delete this.frameEvents[type];
        }
        return event;
    }

    updateGamepads() {
        if (this.gamepads.length === 0) {
            return;
        }
        const buttonPressed = {};
        const gamepads = navigator.getGamepads();
        for (let gamepad of gamepads) {
            if (gamepad !== null) {
                const pressed = [];
                let i = 0;
                for (let button of gamepad.buttons) {
                    if (button.pressed) {
                        pressed.push(i);
                    }
                    i++;
                }
                buttonPressed[gamepad.index] = pressed;
            }
        }

        for (let gamepad of this.gamepads) {
            gamepad.pressed =
                buttonPressed[gamepad.index] !== undefined ? buttonPressed[gamepad.index] : [];
        }
    }

    updateFrame() {
        const screen = this.screens[this.currentScreen];
        if (screen.getState() === 'READY') {
            this.updateDom();
            if (this.debug) {
                this.printDebugs();
            }
            this.handleKeys();
            if (this.running) {
                this.startTimer('render');
                this.render();
                this.addTimerDuration('render');
                this.frames++;
                if (screen.frameHandler !== null) {
                    screen.frameHandler();
                }
            }
            this.updateGamepads();
            if (this.restartEditorWithId !== null) {
                this.activeResource = this.restartEditorWithId;
                this.restartEditorWithId = null;
                this.openEditorMode();
            }
        }
        this.waitForNextFrame();
    }

    waitForNextFrame() {
        const screen = this.screens[this.currentScreen];
        if (screen.getState() !== 'READY') {
            if (!screen.hasAllDependencies()) {
                requestAnimationFrame(this.waitForNextFrame.bind(this));
                return;
            }
            document.getElementById('tmp-resources-warning').classList.toggle('hidden', !RL.hasBrowserResources())
            const resources = RL.getResources();
            if (!this.hasBuildState) {
                const state = Game.instance.globals;
                state.unlock();
                this.buildState(resources, state);
                state.lock();
                this.hasBuildState = true;
            }
            this.build(resources, Game.instance.globals);
            screen.setDimension(this.width, this.height);
            screen.render(true);
            /*
            if (this.sound && screen.audio !== null) {
                const audio = new Audio(screen.audio);
                audio.addEventListener('canplaythrough', event => {
                    this.playAudio(audio);
                });
                audio.addEventListener('ended', event => {
                    for (let i = 0; i < this.audioPlaying.length; i++) {
                        if (this.audioPlaying[i] === audio) {
                            this.audioPlaying.splice(i, 1);
                            break;
                        }
                    }
                });
            }
             */
        }
        requestAnimationFrame(this.updateFrame.bind(this));
    }

    setRunning(value) {
        this.log('setRunning', value);
        this.running = value;
        if (value) {
            this.resetFps();
            this.audio.continueAll();
        } else {
            this.audio.pauseAll();
            this.addTimerDuration('game');
        }
    }

    enableTouchInputs() {
        const touchDirs = document.getElementById('touch-input-dir');
        touchDirs.style.display = 'grid';

        const syncEventTouches = (touches, del = false) => {
            for(let touch of touches) {
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!del && elem !== null && elem.classList.contains('touch-dir-cell') && !elem.classList.contains('touch-dir-middle')) {
                    elem.classList.toggle('touching', true);
                    const parts = elem.id.substr(10).split('_');
                    for (let part of parts) {
                        if (this.touchInputs.indexOf(part) === -1) {
                            this.touchInputs.push(part);
                        }
                    }
                    this.lastTouches[touch.identifier] = elem;
                } else {
                    const lastElem = this.lastTouches[touch.identifier];
                    if (lastElem !== undefined) {
                        lastElem.classList.toggle('touching', false);
                        const parts = lastElem.id.substr(10).split('_');
                        for (let part of parts) {
                            this.touchInputs.splice(this.touchInputs.indexOf(part), 1);
                        }
                        delete this.lastTouches[touch.identifier];
                    }
                }
            }
        };

        const onTouchStartHandler = (e) => {
            syncEventTouches(e.touches);
            e.preventDefault();
        };

        const onTouchMoveHandler = (e) => {
            syncEventTouches(e.changedTouches);
            e.preventDefault();
        };

        const onTouchCancelHandler = (e) => {
            syncEventTouches(e.changedTouches, true);
            e.preventDefault();
        };

        const onTouchEndHandler = (e) => {
            syncEventTouches(e.changedTouches, true);
            e.preventDefault();
        };

        let dirElem = touchDirs;
        dirElem.ontouchstart = onTouchStartHandler;
        dirElem.ontouchmove = onTouchMoveHandler;
        dirElem.ontouchcancel = onTouchCancelHandler;
        dirElem.ontouchend = onTouchEndHandler;

        const touchButtons = document.getElementById('touch-input-buttons');
        touchButtons.style.display = 'grid';

        let buttonElem = touchButtons;
        buttonElem.ontouchstart = onTouchStartHandler;
        buttonElem.ontouchmove = onTouchMoveHandler;
        buttonElem.ontouchcancel = onTouchCancelHandler;
        buttonElem.ontouchend = onTouchEndHandler;
    }

    boot() {
        this.startTimer('boot');
        this.log('Boot game engine...');
        this.keysDown = {};
        this.keys = {};

        if (window.gameEditor !== undefined) {
            gameEditor = window.gameEditor;
        }

        this.hasTouch = ('ontouchstart' in document.documentElement);

        // register key handlers
        const keyDownHandler = (e) => {
            this.keysDown[e.key] = e.key;
        };
        document.onkeydown = keyDownHandler;

        const keyUpHandler = (e) => {
            delete this.keysDown[e.key];
            this.keys[e.key] = e.key;
        };
        document.onkeyup = keyUpHandler;

        const gamepadConnectHandler = (e) => {
            this.gamepads.push({
                index: e.gamepad.index,
                pressed: []
            });
        };
        window.addEventListener('gamepadconnected', gamepadConnectHandler);

        document.body.innerHTML =

            '<div id="game"><div id="tmp-resources-warning" class="hidden stack-h inner-space-h"><div class="flex">Warning! The current screen is using resources from the local storage!</div>' +
            '<div><button id="clear-tmp-resources">Clear</button></div></div>' +
            '<div style="display: flex; justify-content: center; margin-top: 20px">' +

                '<div id="log-div" style="display: none; width: 400px; overflow: auto; flex-shrink: 1; color: #A0A0A0">' +
                    '<pre id="log" style="float: right; margin: 0">' + this.line() + " Log\n" + this.line() + '</pre>' +
                '</div>' +

                '<div id="screen-div" style="flex-shrink: 0; margin: 0 15px 0px 15px; padding: 0; width: ' + this.width + 'px; height: ' + this.height + 'px"><div id="overlay" style="position: relative; padding: 0px; margin: 0; width: ' + this.width + 'px; height: ' + this.height + 'px"></div>' +
                '</div>' +

                '<div id="debugs" style="display: none; width: 400px; overflow: auto; flex-shrink: 1; color: #A0A0A0"><pre id="d" style="margin: 0"></pre>' +
                '</div>' +
            '</div></div>' +
            '<div id="offscreen" style="display: none"></div>' +
            '<div id="react-editor"></div>' +
            '<div id="editor" style="display: none">Editor</div>' + (this.hasTouch ?
                '<div id="touch-input-dir" style="display: none">' +
                    '<div id="touch_btn_left_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_right_up" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_left" class="touch-dir-cell"></div>' +
                    '<div class="touch-dir-cell touch-dir-middle"></div>' +
                    '<div id="touch_btn_right" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_left_down" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_down" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_right_down" class="touch-dir-cell"></div>' +
                '</div>' +
                '<div id="touch-input-buttons" style="display: none">' +
                    '<div id="touch_btn_1" class="touch-dir-cell"></div>' +
                    '<div id="touch_btn_2" class="touch-dir-cell"></div>' +
                    '<div class="touch-dir-cell touch-dir-middle"></div>' +
                    '<div id="touch_btn_3" class="touch-dir-cell"></div>' +
                '</div>'
             : ''
            )
        ;

        if (this.zoom !== 1) {
            this.setZoom(this.zoom, true);
        }

        if (this.hasTouch) {
            this.enableTouchInputs();
        }

        const clearBtn = document.getElementById('clear-tmp-resources');
        clearBtn.addEventListener('click', () => {
            this.getResourceLoader().clearBrowserResources();
            this.reloadScreen();
        }, {capture: false});

        const debugElem = document.getElementById('d');
        const startScreen = this.init();
        this.addTimerDuration('boot');
        this.gotoScreen(startScreen);
        this.setRunning(true);
        if (this.debug) {
            this.setDebug(true);
        }
        this.log('...booting done');
        this.waitForNextFrame();
    }
}

// ###############################
//         M a n a g e r
// ###############################

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
            this.overlayElem = document.getElementById('overlay');
        }
        return this.overlayElem;
    }

    getOffscreenElem() {
        if (this.offscreenElem === null) {
            this.offscreenElem = document.getElementById('offscreen');
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

// ########################################
//       A r e a s
// ########################################

class Area {

    constructor() {
        this.panes = [];
    }

    addPane(pane) {
        this.panes.push(pane);
    }

    addViewNodesToTree(tree, dimX, dimY, offX = 0, offY = 0) {
        const areaNode = {
            type: 'area',
            dim: {
                x: dimX,
                y: dimY
            },
            offset: {
                x: offX,
                y: offY
            },
            children: []
        };
        for (let i = 0; i < this.panes.length; i++) {
            const pane = this.panes[i];
            if (this.firstArea === true && i === 0) {
                pane.opaque = true;
            }
            const node = {
                type: 'pane',
                pane,
                container: pane.init(dimX, dimY),
                children: []
            };
            areaNode.children.push(node);
            if (node.container) {
                node.container.setViewPort(dimX, dimY, offX, offY);
            }
        }
        tree.children.push(areaNode);
    }
}

class SplitArea {

    constructor(axis, areaSizes) {
        this.axis = axis;
        this.areaSizes = areaSizes;
        this.areaLength = 0;
        this.areas = [];
        this.scrollElem = null;
        this.scrollPos = 0;
        this.maxScrollPos = 0;
        let i = 0;
        while (i < areaSizes.length) {
            this.areaLength += this.areaSizes[i];
            this.areas.push([]);
            i++;
        }
    }

    scrollBy(sx, sy) {
        if (!this.scrollElem) {
            return {
                x: 0,
                y: 0,
                unscrolled: {
                    x: sx,
                    y: sy
                }
            };
        }
        const move = this.axis === 'X' ? sx : sy;
        const old = this.scrollPos;
        this.scrollPos += move;
        if (this.scrollPos < 0) {
            this.scrollPos = 0;
        } else if (this.scrollPos > this.maxScrollPos) {
            this.scrollPos = this.maxScrollPos;
        }
        const unscrolled = old + move - this.scrollPos;

        Game.instance.addDomOp(this.scrollElem, 'style.' + (this.axis === 'X' ? 'left' : 'top'), -this.scrollPos);
        return {
            x: (this.axis === 'X') ? this.scrollPos - old : 0,
            y: (this.axis !== 'X') ? this.scrollPos - old : 0,
            unscrolled: {
                x: (this.axis === 'X') ? unscrolled : sx,
                y: (this.axis !== 'X') ? unscrolled : sy
            }
        };
    }

    addArea(area, pos = null) {
        if (pos === null) {
            pos = 0;
            while (pos < this.areas.length && this.areas[pos].length !== 0) {
                pos++;
            }
            if (pos === this.areas.length) {
                throw new Error('No free area slot found!');
            }
        }
        if (pos >= this.areas.length) {
            return;
        }
        this.areas[pos].push(area);
    }

    addPane(pane, pos = null) {
        const area = new Area();
        area.addPane(pane);
        this.addArea(area, pos);
    }

    addViewNodesToTree(tree, dimX, dimY, offX = 0, offY = 0) {
        const areaNode = {
            type: 'area',
            dim: {
                x: dimX,
                y: dimY
            },
            offset: {
                x: offX,
                y: offY
            },
            children: []
        };
        const oversize = (this.axis === 'X') ? (dimX < this.areaLength) : (dimY < this.areaLength);
        if (oversize) {
            const container = OCM.getContainerElem(dimX, dimY, offX, offY);
            this.scrollElem = document.createElement('div');
            this.scrollElem.setAttribute(
                'style',
                'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' +
                (this.axis === 'X' ? this.areaLength : dimX) + 'px; height: ' +
                (this.axis !== 'X' ? this.areaLength : dimY) + 'px; top: 0px; left: 0px;'
            );
            container.appendChild(this.scrollElem);
            areaNode.parents = [container, this.scrollElem];
            offX = 0;
            offY = 0;
            this.maxScrollPos = this.areaLength - (this.axis === 'X' ? dimX : dimY);
        }
        let pos = 0;
        for (let i = 0; i < this.areas.length; i++) {
            // TODO check
/*
            if (this.areas[i].length === 0) {
                continue;
            }

 */
            const size = this.areaSizes[i];
            let x = (this.axis === 'X') ? size : dimX;
            let y = (this.axis !== 'X') ? size : dimY;
            pos += size;
            let firstArea = (this.firstArea === true);
            for (let area of this.areas[i]) {
                if (firstArea) {
                    area.firstArea = true;
                    firstArea = false;
                }
                area.addViewNodesToTree(areaNode, x, y, offX, offY);
            }
            if (this.axis === 'X') {
                offX += size;
            } else {
                offY += size;
            }
        }
        tree.children.push(areaNode);
    }
}

// ########################################
//       S c r e e n
// ########################################

class Screen {

    constructor(id) {
        this.id = id;
        this.areas = [];
        this.keyHandler = null;
        this.initHandler = null;
        this.resources = {};
        this.frameHandler = null;
        this.tree = null;
        this.audio = null;
        this.hasDependencies = false;
        this.state = 'NEW';
    }

    getState() {
        return this.state;
    }

    addArea(area) {
        if (this.areas.length === 0) {
            area.firstArea = true;
        }
        this.areas.push(area);
    }

    addPane(pane) {
        const area = new Area();
        area.addPane(pane);
        this.addArea(area);
    }

    setDimension(dimX, dimY) {
        this.tree = {
            type: 'screen',
            dim: {x: dimX, y: dimY},
            children: []
        };

        for (let i = 0; i < this.areas.length; i++) {
            this.areas[i].addViewNodesToTree(this.tree, dimX, dimY);
        }

        function buildNodeDom(node, containerParent) {
            let parent = containerParent;
            if (node.parents)  {
                parent = node.parents[node.parents.length - 1];
            }

            if (node.container) {
                node.container.buildDom(parent);
            }
            for (let child of node.children) {
                buildNodeDom(child, parent);
            }
            if (parent !== containerParent) {
                Game.instance.addDomChild(containerParent, node.parents[0]);
            }
        }
        buildNodeDom(this.tree, Game.instance.getDomElem('overlay'));
    }

    hasAllDependencies() {
        const hasAll = this.hasDependencies;
        if (this.state === 'INIT' && hasAll) {
            this.state = 'READY';
        }
        return hasAll;
    }

    init(params) {
        this.hasDependencies = false;
        RL.clearResources();
        this.resources = {};
        this.areas = [];
        if (this.initHandler !== null) {
            this.state = 'INIT';
            const build = this.initHandler(params);
            RL.load().then((res) => {
                this.hasDependencies = true;
            });
            return build;
        }
        this.hasDependencies = true;
        this.state = 'READY';
    }

    render(force = false) {
        function renderPanes(tree) {
            for (let child of tree.children) {
                if (child.type === 'pane' && child.pane !== null) {
                    const isDirty = !(child.pane.dirty === false);
                    if (force || isDirty) {
                        child.pane.render();
                    }
                }
                renderPanes(child);
            }
        }
        renderPanes(this.tree);
    }

    setKeyHandler(handler) {
        this.keyHandler = handler.bind(Game.instance);
    }

    setFrameHandler(handler) {
        this.frameHandler = handler.bind(Game.instance);
    }

    addImageResource(id, data) {
        if (Array.isArray(data)) {
            for (let index = 0; index < data.length; index++) {
                RL.addImage(id + '_' + index, data[index]);
            }
        } else {
            RL.addImage(id, data);
        }
    }

    addImageResources(dataObj) {
        for (let id in dataObj) {
            this.addImageResource(id, dataObj[id]);
        }
    }

    addAudioResource(id, url) {
        RL.addAudio(id, url);
        /*
        this.dependencies++;
        const resource = new AudioResource(url, () => {
            this.dependencies--;
        });
        this.resources[id] = resource;

         */
    }

    addAudioResources(dataObj) {
        for (let id in dataObj) {
            RL.addAudio(id, dataObj[id]);
        }
    }

    addJsonResource(id, json) {
        RL.addJson(id, json);
    }

    setInitHandler(handler) {
        this.initHandler = handler.bind(new ResourceRequest());
    }

    addAudio(src) {
//        this.audio = src;
    }
}

// #####################################
//   DOM Container
// #####################################

class DivContainer {
    constructor(child = null) {
        this.child = child;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        if (this.child !== null) {
            this.containerElem.appendChild(this.child);
        }
        Game.instance.addDomChild(parent, this.containerElem);
    }

    getChild() {
        return this.child;
    }

    setBackgroundColor(color) {
        Game.instance.addDomOp(this.containerElem, 'style.backgroundColor', color);
    }

    setBackgroundImages(dataElems, pos) {
        const urls = [];
        const noRepeats = [];
        for (data of dataElems) {
            urls.push('url(' + data + ')');
            noRepeats.push('no-repeat');
        }
        Game.instance.addDomOp(this.containerElem, 'style.background-image', urls.join(', '));
        Game.instance.addDomOp(this.containerElem, 'style.background-repeat', noRepeats.join(', '));
    }

    setBackgroundImage(data, posX, posY) {
        this.setBackgroundImages([data]);
        Game.instance.addDomOp(this.containerElem, 'style.background-image', 'url(' + data + ')' );
        Game.instance.addDomOp(this.containerElem, 'style.background-repeat', 'no-repeat');
    }

    setBackgroundPositions(positions) {
        const pos = [];
        for (let position of positions) {
            pos.push(position.x + 'px ' + position.y + 'px');
        }
        Game.instance.addDomOp(this.containerElem, 'style.background-position', pos.join(', '));
    }

    setBackgroundPosition(posX, posY) {
        this.setBackgroundPositions([{x: posX, y: posY}]);
    }

    setViewPortOffset(x, y) {
    }
}

class ImageContainer {
    constructor(dimX, dimY) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.image = new Image();
        this.image.style.left = 0;
        this.image.style.right = 0;
        this.image.style.position = 'absolute';
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        this.containerElem.appendChild(this.image);
        Game.instance.addDomChild(parent, this.containerElem);
    }

    setImageData(data) {
        Game.instance.updateDom(this.image, 'src', data);
    }

    getImageElem() {
        return this.image;
    }

    setViewPortOffset(x, y) {
        Game.instance.addDomOp(this.image, 'style.left', x);
        Game.instance.addDomOp(this.image, 'style.right', y);
    }
}

class BufferedCanvasContainer {

    constructor(dimX, dimY, opaque) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.active = 1;
        this.opaque = opaque;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        }
    }

    buildDom(parent) {
        this.containerElem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, this.viewPortOffsetPos.x, this.viewPortOffsetPos.y);
        this.buffers = [
            OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque),
            OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque)
        ];
        this.containerElem.appendChild(this.buffers[0].elem);
        this.containerElem.appendChild(this.buffers[1].elem);
        Game.instance.addDomChild(parent, this.containerElem);
    }

    setViewPortOffset(x, y) {
        const activeElem = this.getActiveElem();
        Game.instance.addDomOp(activeElem, 'style.left', x);
        Game.instance.addDomOp(activeElem, 'style.right', y);
    }

    getBufferCtx() {
        return this.buffers[this.active === 1 ? 0 : 1].ctx;
    }

    getActiveCtx() {
        return this.buffers[this.active].ctx;
    }

    getBufferElem() {
        return this.buffers[this.active === 1 ? 0 : 1].elem;
    }

    getActiveElem() {
        return this.buffers[this.active].elem;
    }

    getActiveIndex() {
        return this.active;
    }

    switchBuffer() {
        Game.instance.addDomOp(this.getBufferElem(), 'style.display', 'block');
        this.active = this.active === 1 ? 0 : 1;
        Game.instance.addDomOp(this.getBufferElem(), 'style.display', 'none');
    }
}

class CanvasContainer {

    constructor(dimX, dimY, opaque) {
        this.dim = {
            x: dimX,
            y: dimY
        };
        this.opaque = opaque;
    }

    setViewPort(viewPortX, viewPortY, offsetX, offsetY) {
        this.viewPortDim = {
            x: viewPortX,
            y: viewPortY
        };
        this.viewPortOffsetPos = {
            x: offsetX,
            y: offsetY
        };
        this.canvas = OCM.getCanvasElem(this.dim.x, this.dim.y, this.opaque);
        this.elem = null;

        if ((this.dim.x !== this.viewPortDim.x) || (this.dim.y !== this.viewPortDim.y)) {
            this.elem = OCM.getContainerElem(this.viewPortDim.x, this.viewPortDim.y, offsetX, offsetY);
        } else {
            this.canvas.elem.style.left = offsetX;
            this.canvas.elem.style.top = offsetY;
        }
    }

    buildDom(parent) {
        if (this.elem) {
            this.elem.appendChild(this.canvas.elem);
            Game.instance.addDomChild(parent, this.elem);
        } else {
            Game.instance.addDomChild(parent, this.canvas.elem);
        }
    }

    setViewPortOffset(x, y) {
    }

    getCanvasCtx() {
        return this.canvas.ctx;
    }

    getCanvasElem() {
        return this.canvas.elem;
    }
}

// #############################################
//      P a n e s
// #############################################

class EmptyPane {
    constructor() {}

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
    }

    render() {
        this.dirty = false;
    }
}

class CanvasPane {
    constructor() {
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        this.dirty = false;
        return this.container;
    }

    render() {
    }

    getCtx() {
        return this.container.getCanvasCtx();
    }
}

class ColorPane {
    constructor(color) {
        this.color = color;
        this.images = [];
        this.imgPos = [];
        this.dirty = true;
    }

    addImage(image, posX, posY) {
        this.images.push(image);
        this.imgPos.push({x: posX, y: posY});
        this.dirty = false;
    }

    setImagePosition(index, posX, posY) {
        const pos = this.imgPos[index];
        pos.x = posX;
        pos.y = posY;
        this.dirty = true;
    }

    getImagePosition(index) {
        const pos = this.imgPos[index];
        return {x: pos.x, y: pos.y};
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim;
        this.container = new DivContainer();
        return this.container;
    }

    render() {
        this.container.setBackgroundColor(this.color);
        if (this.images.length > 0) {
            this.container.setBackgroundImages(this.images);
            this.container.setBackgroundPositions(this.imgPos);
        }
        this.dirty = false;
    }
}

/**
 * TODO:
 *   - Multi-Font
 *   - Monochrome + Color
 *   - CaseInsensitive
 *   - Scrolling (Buffering?)
 *   - Proper Dirty-Handling (update)
 */
class TextPane {

    constructor(font) {
        this.font = font;
        this.blocks = {};
        this.lineSpacing = 0;
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.container = new CanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    getTextBlockIds() {
        return Object.keys(this.blocks);
    }

    removeTextBlock(id) {
        delete this.blocks[id];
        this.dirty = true;
    }

    drawTextBlockToCtx(ctx, block) {
        let parts = block.text.split("\n");
        let y = 0;
        for (let part of parts) {
            this.font.drawTextLine(ctx, part, 0, y);
            y += this.font.height + block.lineSpacing;
        }
    }

    addTextBlock(id, posX, posY, text, lineSpacing = 0) {
        let width = 0;
        let height = 0;
        const lines = text.split('\n');
        for (let line of lines) {
            width = Math.max(width, line.length);
            height += this.font.height;
        }
        width *= this.font.width;
        height += lineSpacing * lines.length;

        const canvas = OCM.getNewOffscreenCanvas(width, height);
        const block = {x: posX, y: posY, filter: '', height, width, text, lineSpacing, canvas};
        this.drawTextBlockToCtx(canvas.ctx, block);
        this.blocks[id] = block;
        this.dirty = true;
    }

    setTextBlockFilter(id, filter) {
        this.blocks[id].filter = filter;
        this.dirty = true;
    }

    updateTextBlock(id, text) {
        const block = this.blocks[id];
        block.text = text;
        if (block.canvas === undefined) {
            block.canvas = OCM.getNewOffscreenCanvas(block.width, block.height);
        } else {
            block.canvas.ctx.clearRect(0, 0, block.width, block.height);
        }
        this.drawTextBlockToCtx(block.canvas.ctx, block);
        this.dirty = true;
    }

    render() {
        const ctx = this.container.getCanvasCtx();
        ctx.clearRect(0, 0, this.paneDim.x, this.paneDim.y);
        for (let id in this.blocks) {
            const block = this.blocks[id];
            if (block.filter === '') {
                ctx.drawImage(block.canvas.elem, 0, 0, block.width, block.height, block.x, block.y, block.width, block.height);
            } else {
                const result = filterer.getCanvasWithFiltersApplied(block.filter, block.canvas, 0, 0, block.width, block.height);
                ctx.drawImage(result[0].elem, 0, 0, block.width, block.height, block.x, block.y, block.width, block.height);
            }
        }
        this.dirty = false;
    }

    static padStart(value, char, len) {
        value = '' + value;
        while (value.length < len) {
            value = char + value;
        }
        return value;
    }
}

/**
 * TODO:
 *   - Y-Scrolling
 *   - Endless-Scrolling
 *   - Events
 *   - Rastering
 *   - Oversize/Scrolling
 *   - Z-Ordering / MultiBitmaps
 */
class BitmapScrollPane {

    constructor(spriteSheet, axis, map, min, max) {
        this.spriteSheet = spriteSheet;
        this.axis = axis;
        this.min = min;
        this.max = max;
        this.maxState = 0;
        this.pos = 0;
        this.map = map;
        this.state = -1;
        this.maxSpeed = 2;
        this.bufferSpace = 32;
        this.scrollPos = 0;
        this.isScrolling = false;
        this.dirty = true;
        this.bufferPos = 0;
        this.scrollJump = 0;
        this.scrollPos = 0;
        this.scrollDim = (axis === 'X') ? 'x' : 'y';
        this.offsetDim = (axis === 'X') ? 'y' : 'x';
        for (let entry of map) {
            entry.dim = spriteSheet.getSpriteDim(entry.bitmap);
        }
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {x: viewPortDimX, y: viewPortDimY};
        this.paneDim = {
            x: viewPortDimX + (this.axis === 'X' ? 3 * this.bufferSpace : 0),
            y: viewPortDimY + (this.axis !== 'X' ? 3 * this.bufferSpace : 0)
        };
        this.scrollPosOffset = {
            x: (this.axis === 'X' ? this.bufferSpace : 0),
            y: (this.axis !== 'X' ? this.bufferSpace : 0)
        };
        this.stateSizes = [];
        const maxSize = (this.axis === 'X') ? this.paneDim.x : this.paneDim.y;
        this.maxState = Math.ceil(this.bufferSpace / this.maxSpeed);
        let copySize = Math.ceil(maxSize / this.maxState);
        let size = 0;
        while (size < maxSize) {
            const newSize = size + copySize;
            this.stateSizes.push(newSize > maxSize ? newSize - maxSize : copySize);
            size = newSize;
        }
        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    getBitmapsInRange(minPos, maxPos) {
        let maxIndex = this.map.length;
        const result = [];
        for (let index = 0; index < maxIndex; index++) {
            const start = this.map[index][this.scrollDim];
            if (start >= maxPos) {
                break;
            }
            const width = this.map[index].dim[this.scrollDim];
            const end = start + width;
            if ((minPos <= start && start < maxPos) ||
                (minPos <= end && end < maxPos) ||
                (minPos >= start && end >= maxPos)
            ) {
                result.push({
                    index,
                    width: Math.min(end, maxPos) - Math.max(start, minPos),
                    offset: Math.max(start, minPos) - start
                });
            }
        }
        return result;
    }

    renderRange(ctx, startPos, endPos, offX = 0, offY = 0) {
        const draws = this.getBitmapsInRange(startPos, endPos);
        ctx.clearRect(
            offX, offY,
            this.axis === 'X' ? endPos - startPos : this.viewPortDim.x,
            this.axis !== 'X' ? endPos - startPos : this.viewPortDim.y
        );
        for (let draw of draws) {
            const bitmap = this.map[draw.index];
            const posX = this.axis === 'X' ? (bitmap.x + draw.offset - this.bufferPos) : bitmap.x;
            const posY = this.axis === 'X' ? bitmap.y : (bitmap.y + draw.offset - this.bufferPos);
            const width = this.axis === 'X' ? draw.width : bitmap.dim.x;
            const height = this.axis !== 'X' ? draw.height : bitmap.dim.y;
            this.spriteSheet.drawSpritePart(
                ctx, bitmap.bitmap,
                posX, posY,
                width, height,
                this.axis === 'X' ? draw.offset : 0,
                this.axis !== 'X' ? draw.offset : 0
            );
        }
    }

    switchBuffer() {
        this.pos = this.bufferPos;
        this.scrollPos += this.scrollJump;
        this.buffers.switchBuffer();
        this.state = 0;
    }

    render() {
        const target = this.buffers.getBufferCtx();
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderRange(target, this.bufferPos, this.bufferPos + this.paneDim.x, 0, 0);
                this.switchBuffer();
                break;

            default:
                if (this.isScrolling) {
                    const offset = (this.state - 1) * this.stateSizes[0];
                    const width = this.stateSizes[this.state - 1];
                    this.renderRange(target, this.bufferPos + offset, this.bufferPos + offset + width, offset, 0);
                    if (this.state === this.maxState) {
                        this.switchBuffer();
                    } else {
                        this.state++;
                    }
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const scrollPosX = (this.axis === 'X' ? this.scrollPos : 0);
        const scrollPosY = (this.axis !== 'X' ? this.scrollPos : 0);

        const posLeft = -(this.scrollPosOffset.x + scrollPosX) + 'px';
        const posTop = -(this.scrollPosOffset.y + scrollPosY) + 'px';

        if (elemStyle.left !== posLeft) {
            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }

    }

    scrollBy(sx, sy) {
        if (Math.max(this.maxSpeed, (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))) > this.maxSpeed) {
            throw Error('Unallowed scroll speed ' + (this.axis === 'X' ? Math.abs(sx) : Math.abs(sy))  + ' above ' + this.maxSpeed);
        }
        this.isScrolling = false;
        const oldPos = this.scrollPos;
        if (sx !== 0) {
            if (this.axis === 'X') {
                this.scrollPos += sx;
            }
        }
        if (sy !== 0) {
            if (this.axis !== 'X') {
                this.scrollPos += sy;
            }
        }
        if (this.pos + this.scrollPos > this.max) {
            this.scrollPos = this.max - this.pos;
        } else if (this.pos + this.scrollPos < this.min - this.bufferSpace) {
            this.scrollPos = this.min - this.pos - this.bufferSpace;
        }
        const scrolled = {x: (this.axis === 'X' ? this.scrollPos - oldPos : 0), y: (this.axis !== 'X' ? this.scrollPos - oldPos : 0)};
        scrolled.unscrolled = {x: sx - scrolled.x, y: sy - scrolled.y};

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        if (this.scrollPos >= 0 && this.scrollPos < this.bufferSpace) {
            this.state = 0;
        } else {
            if (this.state === 0)  {
                let startCopy = true;
                if (this.scrollPos < 0) {
                    this.bufferPos = this.pos - this.bufferSpace;
                    this.scrollJump = this.bufferSpace;
                    startCopy = (this.bufferPos > this.min);
                } else {
                    this.bufferPos = this.pos + this.bufferSpace;
                    this.scrollJump = -this.bufferSpace;
                }
                if (startCopy) {
                    this.state = 1;
                }
            }
        }
        return scrolled;
    }
}

/**
 * TODO:
 *   - Filters
 */
class TilesPane {

    constructor(tilesMap, config = {}) {

        this.tilesMap = tilesMap;

        this.endless = {
            x: (config.endless && config.endless.x === true),
            y: (config.endless && config.endless.y === true)
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.mapTilePos = {
            x: 0,
            y: 0
        };

    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };

        this.canvasTiles = {
            x: viewPortTiles.x + 1,
            y: viewPortTiles.y + 1
        };
        this.paneDim = {
            x: this.canvasTiles.x * this.tilesMap.tileSize,
            y: this.canvasTiles.y * this.tilesMap.tileSize
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollStop = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };
        this.dirty = true;
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.container;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
    }

    render() {
        const target = this.container.getCanvasCtx();
        this.tilesMap.render(
            target,
            {
                x: 0,
                y: 0
            },
            {
                width: this.canvasTiles.x,
                height: this.canvasTiles.y,
                pos: {
                    x: this.mapTilePos.x,
                    y: this.mapTilePos.y
                },
                endless: this.endless
            }
        );

        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

        this.scrollPos.x += Sx;
        if (this.scrollStop.left !== null) {
            this.scrollPos.x = Math.max(this.scrollPos.x, this.scrollStop.left);
        }
        if (this.scrollStop.right !== null) {
            this.scrollPos.x = Math.min(this.scrollPos.x, this.scrollStop.right);
        }
        if (this.scrollPos.x <= -this.tilesMap.tileSize) {
            this.scrollPos.x = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.x >= (this.paneDim.x - this.viewPortDim.x)) {
            this.scrollPos.x = this.paneDim.x - this.viewPortDim.x;
        }

        this.scrollPos.y += Sy;
        if (this.scrollStop.top !== null) {
            this.scrollPos.y = Math.max(this.scrollPos.y, this.scrollStop.top);
        }
        if (this.scrollStop.bottom !== null) {
            this.scrollPos.y = Math.min(this.scrollPos.y, this.scrollStop.bottom);
        }

        if (this.scrollPos.y <= -this.tilesMap.tileSize) {
            this.scrollPos.y = -this.tilesMap.tileSize + 1;
        } else if (this.scrollPos.y >= (this.paneDim.y - this.viewPortDim.y)) {
            this.scrollPos.y = this.paneDim.y - this.viewPortDim.y;
        }

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        if (scrolled.x === 0 && scrolled.y === 0) {
            return scrolled;
        }

        const mapVector = {
            x: 0, y: 0
        };
        if (this.scrollPos.x < 0) {
            mapVector.x = -1;
            this.scrollPos.x += this.tilesMap.tileSize;
        } else if (this.scrollPos.x >= this.tilesMap.tileSize) {
            mapVector.x = 1;
            this.scrollPos.x -= this.tilesMap.tileSize;
        }
        if (this.scrollPos.y < 0) {
            mapVector.y = -1;
            this.scrollPos.y += this.tilesMap.tileSize;
        } else if (this.scrollPos.y >= this.tilesMap.tileSize) {
            mapVector.y = 1;
            this.scrollPos.y -= this.tilesMap.tileSize;
        }

        if (mapVector.x !== 0 || mapVector.y !== 0) {
            this.mapTilePos.x += mapVector.x;
            this.mapTilePos.y += mapVector.y;

            // set scroll blocks
            if (!this.endless.x) {
                this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
                this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
            }
            if (!this.endless.y) {
                this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
                this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
            }
            this.dirty = true;
        }

        const elemStyle = this.container.getCanvasElem().style;
        const posLeft = -this.scrollPos.x + 'px';
        const posTop = -this.scrollPos.y + 'px';

        if (elemStyle.left !== posLeft) {
            elemStyle.left = posLeft;
//            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            elemStyle.top = posTop;
//            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }

        return scrolled;
    }
}


/**
 * TODO:
 *   - Filters
 *   - TileStates
 */
class BufferedTilesPane {

    constructor(tilesMap, config) {
        // TODO solve instancof problem due to webpack build
        this.isBufferedTilesPane = true;
        this.tilesMap = tilesMap;
        this.defaultTile = null;
        this.state = -1;
        // mandatory
        this.maxSpeed = config.maxSpeed;
        this.maxState = Math.floor(this.tilesMap.tileSize / this.maxSpeed);
        this.endless = {
            x: (config.endless !== undefined && config.endless.x !== undefined) ? config.endless.x : false,
            y: (config.endless !== undefined && config.endless.y !== undefined) ? config.endless.y : false,
        };
        // scrolling is always relative to the scrollPosOffset (=top left corner of the neutral quadrant)
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.mapTilePos = {
            x: 0,
            y: 0
        };
        this.eventBounds = {top: 0, bottom: 0, left: 0, right: 0};
        this.scrollLock = false;
        this.dirty = true;
    }

    init(viewPortDimX, viewPortDimY) {
        const viewPortTiles = {
            x: Math.ceil(viewPortDimX / this.tilesMap.tileSize),
            y: Math.ceil(viewPortDimY / this.tilesMap.tileSize)
        };
        this.viewPortTiles = viewPortTiles;

        // 3 tiles are required in each direction for scrolling around the neutral quadrant
        this.canvasTiles = {
            x: viewPortTiles.x + 3,
            y: viewPortTiles.y + 3
        };
        this.paneDim = {
            x: (this.canvasTiles.x + 2) * this.tilesMap.tileSize,
            y: (this.canvasTiles.y + 2) * this.tilesMap.tileSize
        };

        this.scrollAreaDim = {
            x: this.paneDim.x - 2 * this.tilesMap.tileSize,
            y: this.paneDim.y - 2 * this.tilesMap.tileSize
        };

        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.scrollStop = {
            top: null,
            bottom: null,
            left: null,
            right: null
        };

        // this is where the scrollArea starts
        this.canvasTileOffset = {
            x: 1,
            y: 1
        };

        this.bufferTileOffset = {
            x: 1,
            y: 1
        };

        this.tileMoveVector = {
            x: 0,
            y: 0
        };

        this.scrollPosOffset = {
            x: (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize,
            y: (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize
        };

        this.scrollAreaTileRows = Math.ceil(this.scrollAreaDim.y / this.tilesMap.tileSize);
        const tileSteps = this.scrollAreaTileRows / (this.maxState - 1);

        this.copyRowsInState = [];
        let sum = 0;
        let remRows = viewPortTiles.y + 3;
        while(remRows > 0) {
            const pos = Math.round(tileSteps * (this.copyRowsInState.length + 1));
            const rows = pos - sum;
            this.copyRowsInState.push(rows);
            sum += rows;
            remRows -= rows;
        }
        this.bufferTilePos = {
            x: this.mapTilePos.x,
            y: this.mapTilePos.y
        };
        this.copiedHeight = 0;

        this.oldPos = this.getViewPortMapPos();

        this.buffers = new BufferedCanvasContainer(this.paneDim.x, this.paneDim.y);
        return this.buffers;
    }

    hasBufferSwitchInNextFrame() {
        return (this.state === -1 || this.state === this.maxState);
    }

    replaceTile(x, y, newTile) {
        this.tilesMap.replaceTile(x, y, newTile);
        this.renderTile(x, y, this.state === -1, this.hasBufferSwitchInNextFrame());
    }

    updateAnimatedTiles() {
        const animTiles = this.tilesMap.getAnimatedTiles(this.mapTilePos.x, this.mapTilePos.y, this.canvasTiles.x, this.canvasTiles.y);
        for (let tilePos of animTiles) {
            this.renderTile(tilePos[0], tilePos[1], this.hasBufferSwitchInNextFrame());
        }
    }

    getTilesInRect(x1, y1, x2, y2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = x1 + this.scrollPos.x;
        const realEnd = x2 + this.scrollPos.x;
        const relPos = {
            x1: realStart >> this.tilesMap.tileBits,
            x2: realEnd >> this.tilesMap.tileBits,
            y: (y1 + this.scrollPos.y) >> this.tilesMap.tileBits
        };

        const xDiff = x2 - x1 + 1;
        const touchStart = Math.min(xDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(xDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapY = origin.y + relPos.y;
        const start = origin.x + relPos.x1;
        const end = origin.x + relPos.x2;

        const lines = 1 + Math.floor((y2 - y1)/this.tilesMap.tileSize);

        const tiles = this.tilesMap.getTilesAtXLine(mapY, start, end, lines);
        let i = 0;
        const result = [];
        const maxLine = mapY + lines - 1;
        for (let y = mapY; y <= maxLine; y++) {
            for (let x = start; x <= end; x++) {
                let touch = this.tilesMap.tileSize;
                if (x === start) {
                    touch = touchStart;
                } else if (x === end) {
                    touch = touchEnd;
                }
                result.push({x, y, touch, obj: tiles[i]});
                i++;
            }
        }
        return result;
    }

    getTilesInXLine(y, x1, x2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = x1 + this.scrollPos.x;
        const realEnd = x2 + this.scrollPos.x;
        const relPos = {
            x1: realStart >> this.tilesMap.tileBits,
            x2: realEnd >> this.tilesMap.tileBits,
            y: (y + this.scrollPos.y) >> this.tilesMap.tileBits
        };
        const xDiff = x2 - x1 + 1;
        const touchStart = Math.min(xDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(xDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapY = origin.y + relPos.y;
        const start = origin.x + relPos.x1;
        const end = origin.x + relPos.x2;
        const lineTiles = this.tilesMap.getTilesAtXLine(mapY, start, end);
        const result = [];
        let i = 0;
        for (let x = start; x <= end; x++) {
            let touch = this.tilesMap.tileSize;
            if (x === start) {
                touch = touchStart;
            } else if (x === end) {
                touch = touchEnd;
            }
            result.push({x, y: mapY, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    getTilesInYLine(x, y1, y2) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const realStart = y1 + this.scrollPos.y;
        const realEnd = y2 + this.scrollPos.y;
        const relPos = {
            x: (x + this.scrollPos.x) >> this.tilesMap.tileBits,
            y1: realStart >> this.tilesMap.tileBits,
            y2: realEnd >> this.tilesMap.tileBits
        };
        const yDiff = y2 - y1 + 1;
        const touchStart = Math.min(yDiff, this.tilesMap.tileSize - (realStart % this.tilesMap.tileSize));
        const touchEnd = Math.min(yDiff, (realEnd % this.tilesMap.tileSize) + 1);

        const mapX = origin.x + relPos.x;
        const start = origin.y + relPos.y1;
        const end = origin.y + relPos.y2;
        const lineTiles = this.tilesMap.getTilesAtYLine(mapX, start, end);
        const result = [];
        let i = 0;
        for (let y = start; y <= end; y++) {
            let touch = this.tilesMap.tileSize;
            if (y === start) {
                touch = touchStart;
            } else if (y === end) {
                touch = touchEnd;
            }
            result.push({x: mapX, y, touch, obj: lineTiles[i]});
            i++;
        }
        return result;
    }

    getTileAt(x, y) {
        return this.tilesMap.getTileAtPos(x, y);
    }

    getRelativePositionOfTile(x, y) {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };
        return {
            x: ((x - origin.x) << this.tilesMap.tileBits) - this.scrollPos.x,
            y: ((y - origin.y) << this.tilesMap.tileBits) + this.scrollPos.y
        };
    }

    getViewPortMapPos() {
        const origin = {
            x: this.mapTilePos.x + this.canvasTileOffset.x,
            y: this.mapTilePos.y + this.canvasTileOffset.y
        };

        const absPosStart = {
            x: (origin.x << this.tilesMap.tileBits) + this.scrollPos.x,
            y: (origin.y << this.tilesMap.tileBits) + this.scrollPos.y
        };

        const absPosEnd = {
            x: absPosStart.x + this.viewPortDim.x - 1,
            y: absPosStart.y + this.viewPortDim.y - 1
        };
        const result = {
            start: {x: absPosStart.x >> this.tilesMap.tileBits, y: absPosStart.y >> this.tilesMap.tileBits},
            end: {x: absPosEnd.x >> this.tilesMap.tileBits, y: absPosEnd.y >> this.tilesMap.tileBits}
        };
        return result;
    }

    setMapTilePos(mapTilePosX, mapTilePosY) {
        this.mapTilePos.x = mapTilePosX;
        this.mapTilePos.y = mapTilePosY;
        this.scrollPos.x = 0;
        this.scrollPos.y = 0;
        this.state = -1;
        this.dirty = true;
    }

    renderAll(target) {
        this.tilesMap.render(
            target,
            {
                x: this.canvasTileOffset.x * this.tilesMap.tileSize,
                y: this.canvasTileOffset.y * this.tilesMap.tileSize
            },
            {
                width: this.canvasTiles.x,
                height: this.canvasTiles.y,
                pos: {
                    x: this.mapTilePos.x,
                    y: this.mapTilePos.y
                },
                endless: this.endless
            }
        );
    }

    renderTile(x, y, onlyInBuffer = false) {
        const targets = [];
        targets.push({
            ctx: this.buffers.getActiveCtx(),
            offX: this.canvasTileOffset.x + x - this.mapTilePos.x,
            offY: this.canvasTileOffset.y + y - this.mapTilePos.y
        });
        if (this.state > 0) {
            targets.push(
                {
                    ctx: this.buffers.getBufferCtx(),
                    offX: this.bufferTileOffset.x + x  - this.mapTilePos.x,
                    offY: this.bufferTileOffset.y + y - this.mapTilePos.y
                }
            );
        }

        for(let target of targets) {
            this.tilesMap.render(
                target.ctx,
                {
                    x: target.offX * this.tilesMap.tileSize,
                    y: target.offY * this.tilesMap.tileSize
                },
                {
                    width: 1,
                    height: 1,
                    pos: {
                        x,
                        y
                    },
                    endless: this.endless
                }
            );
        }
    }

    copyViewRows(source, target) {
        const copyRows = this.copyRowsInState[this.state - 1];
        if (copyRows > 0) {
            const copyHeight = copyRows * this.tilesMap.tileSize;
            const srcImg = source.getImageData(
                this.canvasTileOffset.x * this.tilesMap.tileSize,
                this.copiedHeight + (this.canvasTileOffset.y * this.tilesMap.tileSize),
                this.scrollAreaDim.x,
                copyHeight
            );
            target.putImageData(srcImg,
                this.bufferTileOffset.x * this.tilesMap.tileSize,
                this.bufferTileOffset.y * this.tilesMap.tileSize + this.copiedHeight
            );
            this.copiedHeight += copyHeight;
        }
    }

    renderNewTiles(target) {
        let addLen = 0;
        let offX = 0;

        if (this.tileMoveVector.x !== 0) {
            if (this.tileMoveVector.x < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: ((this.bufferTileOffset.x - 1) * this.tilesMap.tileSize),
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize)
                    },
                    {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: this.bufferTilePos.x - 1,
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
                offX -= 1;
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: this.bufferTileOffset.x * this.tilesMap.tileSize + this.scrollAreaDim.x,
                        y: this.bufferTileOffset.y * this.tilesMap.tileSize,
                    }, {
                        width: 1,
                        height: this.canvasTiles.y,
                        pos: {
                            x: (this.bufferTilePos.x + this.canvasTiles.x),
                            y: this.bufferTilePos.y
                        },
                        endless: this.endless
                    }
                );
            }
            addLen++;
        }

        if (this.tileMoveVector.y !== 0) {
            if (this.tileMoveVector.y < 0) {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y - 1) * this.tilesMap.tileSize
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y - 1
                        },
                        endless: this.endless
                    }
                );
            } else {
                this.tilesMap.render(
                    target,
                    {
                        x: (this.bufferTileOffset.x + offX) * this.tilesMap.tileSize,
                        y: (this.bufferTileOffset.y * this.tilesMap.tileSize) + this.scrollAreaDim.y
                    },
                    {
                        width: this.canvasTiles.x + addLen,
                        height: 1,
                        pos: {
                            x: this.bufferTilePos.x + offX,
                            y: this.bufferTilePos.y + this.canvasTiles.y
                        },
                        endless: this.endless
                    }
                );
            }
        }
        this.bufferTilePos.x += this.tileMoveVector.x;
        this.bufferTilePos.y += this.tileMoveVector.y;
    }

    switchBuffer() {
        this.scrollPos.x -= this.tileMoveVector.x * this.tilesMap.tileSize;
        this.scrollPos.y -= this.tileMoveVector.y * this.tilesMap.tileSize;

        this.canvasTileOffset.x = this.bufferTileOffset.x + this.tileMoveVector.x;
        this.canvasTileOffset.y = this.bufferTileOffset.y + this.tileMoveVector.y;

        this.scrollPosOffset.x = (this.canvasTileOffset.x + 1) * this.tilesMap.tileSize;
        this.scrollPosOffset.y = (this.canvasTileOffset.y + 1) * this.tilesMap.tileSize;

        this.mapTilePos.x = this.bufferTilePos.x;
        this.mapTilePos.y = this.bufferTilePos.y;
        this.copiedHeight = 0;

        // set scroll blocks
        if (!this.endless.x) {
            this.scrollStop.left = this.mapTilePos.x <= -1 ? 0 : null;
            this.scrollStop.right = this.mapTilePos.x >= (this.tilesMap.mapTiles.x - this.canvasTiles.x + 1) ? this.tilesMap.tileSize -1 : null;
        }
        if (!this.endless.y) {
            this.scrollStop.top = this.mapTilePos.y <= -1 ? 0 : null;
            this.scrollStop.bottom = this.mapTilePos.y >= (this.tilesMap.mapTiles.y - this.canvasTiles.y + 1) ? this.tilesMap.tileSize -1 : null;
        }

        this.buffers.switchBuffer();
        this.state = 0;
    }

    getQuadrantMoveVector(fromQuadrant, toQuadrant) {
        const relDist = toQuadrant - fromQuadrant;
        const dist = Math.abs(relDist);
        switch(dist) {
            case 0:
                return {x: 0, y: 0};

            case 1:
                return {x: relDist, y: 0};

            case 2:
                if (relDist < 0) {
                    return {x: 1, y: -1};
                }
                return {x: -1, y: 1};

            case 3:
                return {x: 0, y: (relDist < 0 ? -1 : 1)};

            case 4:
                if (relDist < 0) {
                    return {x: -1, y: -1};
                }
                return {x: 1, y: 1};

            default:
                throw 'Quadrant distance ' + dist + ' not supported';
        }
    }

    getCurrentQuadrant() {
        const qx = Math.floor((this.scrollPos.x + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        const qy = Math.floor((this.scrollPos.y + this.tilesMap.tileSize) / this.tilesMap.tileSize);
        return qy * 3 + qx;
    }

    setScrollLock(value) {
        this.scrollLock = value;
    }

    scrollBy(Sx, Sy) {
        const oldQuad = this.getCurrentQuadrant();

        let exceedX = 0;
        if (Math.max(this.maxSpeed, Math.abs(Sx)) > this.maxSpeed) {
            exceedX = Math.abs(Sx) - this.maxSpeed;
            if (Sx < 0) {
                exceedX *= -1;
                Sx = -this.maxSpeed;
            } else {
                Sx = this.maxSpeed;
            }
        }

        let exceedY = 0;
        if (Math.max(this.maxSpeed, Math.abs(Sy)) > this.maxSpeed) {
            exceedY = Math.abs(Sy) - this.maxSpeed;
            if (Sy < 0) {
                exceedY *= -1;
                Sy = -this.maxSpeed;
            } else {
                Sy = this.maxSpeed;
            }
        }

        const scrolled = {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: this.scrollPos.x + Sx,
                y: this.scrollPos.y + Sy
            }
        };

        // do we need scrolling in x-dir at all?
        if (!this.scrollLock && this.viewPortTiles.x < this.tilesMap.mapTiles.x) {
            if (Math.max(this.maxSpeed, Math.abs(Sx)) > this.maxSpeed) {
                throw Error('Unallowed scroll speed ' + Sx + ' above ' + this.maxSpeed);
            }

            this.scrollPos.x += Sx;
            if (this.scrollStop.left !== null) {
                this.scrollPos.x = Math.max(this.scrollPos.x, this.scrollStop.left);
            }
            if (this.scrollStop.right !== null) {
                this.scrollPos.x = Math.min(this.scrollPos.x, this.scrollStop.right);
            }
            if (this.scrollPos.x <= -this.tilesMap.tileSize) {
                this.scrollPos.x = -this.tilesMap.tileSize + 1;
            } else if (this.scrollPos.x >= (this.paneDim.x - this.viewPortDim.x)) {
                this.scrollPos.x = this.paneDim.x - this.viewPortDim.x;
            }
        }

        if (!this.scrollLock && this.viewPortTiles.y < this.tilesMap.mapTiles.y) {
            if (Math.max(this.maxSpeed, Math.abs(Sy)) > this.maxSpeed) {
                throw Error('Unallowed scroll speed ' + Sy + ' above ' + this.maxSpeed);
            }
            this.scrollPos.y += Sy;
            if (this.scrollStop.top !== null) {
                this.scrollPos.y = Math.max(this.scrollPos.y, this.scrollStop.top);
            }
            if (this.scrollStop.bottom !== null) {
                this.scrollPos.y = Math.min(this.scrollPos.y, this.scrollStop.bottom);
            }

            if (this.scrollPos.y <= -this.tilesMap.tileSize) {
                this.scrollPos.y = -this.tilesMap.tileSize + 1;
            } else if (this.scrollPos.y >= (this.paneDim.y - this.viewPortDim.y)) {
                this.scrollPos.y = this.paneDim.y - this.viewPortDim.y;
            }
        }

        scrolled.unscrolled.x -= this.scrollPos.x;
        scrolled.unscrolled.y -= this.scrollPos.y;
        scrolled.x -= scrolled.unscrolled.x;
        scrolled.y -= scrolled.unscrolled.y;

        scrolled.unscrolled.x += exceedX;
        scrolled.unscrolled.y += exceedY;

        if (scrolled.x === 0 && scrolled.y === 0) {
            this.isScrolling = false;
            return scrolled;
        }

        this.isScrolling = true;

        const newQuad = this.getCurrentQuadrant();
        if (oldQuad === newQuad) {
            return scrolled;
        }

        if (newQuad === 4) {
            this.state = 0;
        } else {
            const moveVector = this.getQuadrantMoveVector(oldQuad, newQuad);
            if (this.state === 0)  {
                this.bufferTilePos.x = this.mapTilePos.x;
                if (this.endless.x) {
                    if (this.mapTilePos.x === -this.canvasTiles.x) {
                        this.bufferTilePos.x += this.tilesMap.mapTiles.x;
                    } else if (this.mapTilePos.x === this.tilesMap.mapTiles.x) {
                        this.bufferTilePos.x = 0;
                    }

                }
                this.bufferTilePos.y = this.mapTilePos.y;
                if (this.endless.y) {
                    if (this.mapTilePos.y === -this.canvasTiles.y) {
                        this.bufferTilePos.y += this.tilesMap.mapTiles.y;
                    } else if (this.mapTilePos.y === this.tilesMap.mapTiles.y) {
                        this.bufferTilePos.y = 0;
                    }
                }
                this.tileMoveVector.x = moveVector.x;
                this.tileMoveVector.y = moveVector.y;
                this.bufferTileOffset.x = 1 - moveVector.x;
                this.bufferTileOffset.y = 1 - moveVector.y;
                this.copiedHeight = 0;
                this.state = 1;
            } else {
                this.tileMoveVector.x += moveVector.x;
                this.tileMoveVector.y += moveVector.y;
            }
        }
        return scrolled;
    }

    setEventBounds(bounds) {
        this.eventBounds = Object.assign(this.eventBounds, bounds);
    }

    render() {
        const target = this.buffers.getBufferCtx();
        let all = false;
        switch(this.state) {

            case 0:
                break;

            case -1:
                this.renderAll(target);
                all = true;
                this.switchBuffer();
                break;

            case this.maxState:
                if (this.isScrolling) {
                    this.renderNewTiles(target);
                    this.switchBuffer();
                }
                break;

            default:
                if (this.isScrolling) {
                    this.copyViewRows(this.buffers.getActiveCtx(), target);
                    this.state++;
                }
                break;
        }

        // sync position
        const elemStyle = this.buffers.getActiveElem().style;
        const posLeft = -(this.scrollPosOffset.x + this.scrollPos.x) + 'px';
        const posTop = -(this.scrollPosOffset.y + this.scrollPos.y) + 'px';

        const newPos = this.getViewPortMapPos();
        const oldPos = this.oldPos;

        if (all) {
            const startX = newPos.start.x - this.eventBounds.left;
            const endX =  newPos.end.x + this.eventBounds.right;
            const startY = newPos.start.y - this.eventBounds.top;
            const endY = newPos.end.y + this.eventBounds.bottom;
            this.tilesMap.triggerEventsInRect(startX, startY, endX - startX + 1, endY - startY + 1);
        } else if (oldPos.start.x !== newPos.start.x || oldPos.start.y !== newPos.start.y ||
            oldPos.end.x !== newPos.end.x || oldPos.end.y !== newPos.end.y) {
            const relStart = {
                x: newPos.start.x - oldPos.start.x,
                y: newPos.start.y - oldPos.start.y
            };
            const relEnd = {
                x: newPos.end.x - oldPos.end.x,
                y: newPos.end.y - oldPos.end.y
            };

            const columns = [];
            if (relEnd.x > 0) {
                for (let i = 1; i <= relEnd.x; i++) {
                    columns.push(oldPos.end.x + i + this.eventBounds.right);
                }
            } else if (relEnd.x < 0) {
                for (let i = 1; i <= -relEnd.x; i++) {
                    columns.push(oldPos.start.x - i - this.eventBounds.left);
                }
            }
            const rows = [];
            if (relEnd.y > 0) {
                for (let i = 1; i <= relEnd.y; i++) {
                    rows.push(oldPos.end.y + i + this.eventBounds.bottom);
                }
            } else if (relEnd.x < 0) {
                for (let i = 1; i <= -relEnd.y; i++) {
                    rows.push(newPos.start.y - i - this.eventBounds.top);
                }
            }
            // @TODO much rework and optimization needed here
            if (columns.length > 0) {
                for (let column of columns) {
                    this.tilesMap.triggerEventsInXLine(column, newPos.start.y, newPos.end.y);
                }
            }
        }
        this.oldPos = newPos;

        if (elemStyle.left !== posLeft) {
            Game.instance.addDomOp(elemStyle, 'left', posLeft);
        }
        if (elemStyle.top !== posTop) {
            Game.instance.addDomOp(elemStyle, 'top', posTop);
        }
    }
}

const COLLISION = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    INCLUDE: 'include',
    COVER: 'cover'
};

/**
 * TODO:
 *  - addFilter, removeFilter, clearFilter
 */
class SpritePane {

    constructor(spriteSheet) {
        this.spriteSheet = spriteSheet;
        this.sprites = {};
        this.actorId = null;
        this.groups = {};
        this.bufferClearRects = {
            0: [],
            1: []
        };
        this.uid = 0;
        this.zOrdering = false;
        this.attachDefault = null;
        this.collisions = {};
        this.posSort = function (x, y) {
            if (x.pos < y.pos) {
                return -1;
            } else if (x.pos > y.pos) {
                return 1;
            }
            return 0;
        };
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.totalPixels = viewPortDimX * viewPortDimY;
        this.pixelLimit = Math.round(this.totalPixels * 0.25);

        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };

        this.container = new BufferedCanvasContainer(viewPortDimX, viewPortDimY, this.opaque);
        return this.container;
    }

    getAxisPointCollisions(sprites, axis, detailed = false) {
        const axisPoints = [];
        for (let key in sprites) {
            const sprite = sprites[key];
            if (sprite.noCollision === true) {
                continue;
            }
            axisPoints.push({
                sprite,
                isStart: true,
                key,
                pos: sprite[axis]
            });
            axisPoints.push({
                sprite,
                isStart: false,
                key,
                pos: (sprite[axis] + sprite.dim[axis] - 1)
            });
        }

        axisPoints.sort(this.posSort);

        let i = 0;
        let pos = null;
        const opening = [];
        let closing = [];
        const found = detailed ? [] : {};

        do {
            if (i === axisPoints.length || axisPoints[i].pos !== pos) {
                for (let o of opening) {
                    for (let c of closing) {
                        if (o !== c) {
                            if (detailed) {
                                found.push([o, c]);
                                found.push([c, o]);
                            } else {
                                found[o.id] = o;
                                found[c.id] = c;
                            }
                        }
                    }
                }
                if (i === axisPoints.length) {
                    break;
                }

                for (let c of closing) {
                    const posClose = opening.indexOf(c);
                    opening.splice(posClose, 1);
                }
                closing = [];
            }
            let point = axisPoints[i];
            pos = point.pos;
            if (point.isStart) {
                opening.push(point.sprite)
            } else {
                closing.push(point.sprite)
            }
            i++
        } while (true);

        return found;
    }

    updateCollisions() {
        const firstDim = (this.paneDim.x > this.paneDim.y ? 'x' : 'y');
        const secondaryDim = firstDim === 'x' ? 'y' : 'x';
        let found = this.getAxisPointCollisions(this.sprites, firstDim);
        found = this.getAxisPointCollisions(found, secondaryDim, true);

        const collisions = {};
        for (let pair of found) {

            const source = pair[0];
            const target = pair[1];
            if (collisions[source.id] === undefined) {
                collisions[source.id] = [];
            }

            let sourceEnd = source.x + source.dim.x - 1;
            let targetEnd = target.x + target.dim.x - 1;
            let touch = 0;
            let type;
            const collision = {sprite: target};
            if (source.x < target.x) {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.COVER;
                    touch = targetEnd - target.x + 1;
                } else {
                    type = COLLISION.LEFT;
                    touch = sourceEnd - target.x + 1;
                }
            } else {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.RIGHT;
                    touch = targetEnd - source.x + 1;
                } else {
                    type = COLLISION.INCLUDE;
                    touch = sourceEnd - source.x + 1;
                }
            }
            if (touch <= 0) {
                continue;
            }
            collision.x = {type, touch};

            sourceEnd = source.y + source.dim.y - 1;
            targetEnd = target.y + target.dim.y - 1;
            if (source.y < target.y) {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.COVER;
                    touch = targetEnd - target.y + 1;
                } else {
                    type = COLLISION.TOP;
                    touch = sourceEnd - target.y + 1;
                }
            } else {
                if (sourceEnd > targetEnd) {
                    type = COLLISION.BOTTOM;
                    touch = targetEnd - source.y + 1;
                } else {
                    type = COLLISION.INCLUDE;
                    touch = sourceEnd - source.y + 1;
                }
            }
            if (touch <= 0) {
                continue;
            }
            collision.y = {type, touch};

            collisions[source.id].push(collision);
        }
        this.collisions = collisions;
    }

    getLastSpriteCollisions(id) {
        if (this.collisions[id] === undefined) {
            return [];
        }
        return this.collisions[id];
    }

    setAttachDefault(value) {
        this.attachDefault = value;
    }

    setActorId(id) {
        if (!this.sprites[id]) {
            throw Error('Sprite Actor "' + id + "' not found!");
        }
        this.actorId = id;
    }

    getActorId() {
        return this.actorId;
    }

    hasSprite(id) {
        return (this.sprites[id] !== undefined);
    }

    isAxisCollide(aStart, aEnd, bStart, bEnd) {
        return !(aStart > bEnd || bStart > aEnd);
    }

    getActorCollision(id = null) {
        const actorId = this.getActorId();
        if (actorId === null) {
            return false;
        }

        if (id === null) {
            const actorCollisions = this.getLastSpriteCollisions(actorId);
            return actorCollisions.length > 0 ? actorCollisions : null;
        }
        const colls = this.getLastSpriteCollisions(id);
        for (let coll of colls) {
            if (coll.sprite.id === actorId) {
                return coll;
            }
        }
        return null;
    }

    isCollidingActor(id) {
        const actorId = this.getActorId();
        if (actorId === null) {
            return false;
        }
        const colls = this.getLastSpriteCollisions(id);
        for (let coll of colls) {
            if (coll.sprite.id === actorId) {
                return true;
            }
        }
        return false;
    }

    addSprite(id, name,  x = 0, y = 0, z = 0) {
        if (!this.zOrdering && z !== 0) {
            this.zOrdering = true;
        }
        const sprite = {id, x, y, z, noCollision: false, animSpeed: 1, filterDuration: -1, attached: this.attachDefault, filters: '', hidden: false};
        this.sprites[id] = this.initSpriteObj(sprite, name);
        this.dirty = true;
    }

    setNoCollision(id, value) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.noCollision = value;
        }
    }

    hideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === false;
            }
            sprite.hidden = true;
        }
    }

    unhideSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (!this.dirty) {
                this.dirty = sprite.hidden === true;
            }
            sprite.hidden = false;
        }
    }

    toggleSpriteVisiblity(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.hidden = !sprite.hidden;
            this.dirty = true;
        }
    }

    isHidden(id) {
        const sprite = this.getSprite(id);
        return sprite.hidden;
    }

    hasSprite(id) {
        return !(this.sprites[id] === undefined);
    }

    setAnimationSpeed(id, speed) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.animSpeed = speed;
            if (sprite.isAnimation) {
                sprite.animation.setSpeed(speed);
            }
        }
    }

    getSpritesById(id) {
        return id[0] === ':' ? this.getGroupSprites(id) : [this.getSprite(id)];
    }

    getSprite(id) {
        return this.sprites[id];
    }

    initSpriteObj(obj, sheetId) {
        const isAni = sheetId !== null && this.spriteSheet.isAnimation(sheetId);
        obj.name = sheetId;
        obj.isAnimation = isAni;
        obj.dim = this.spriteSheet.getSpriteDim(sheetId);
        if (isAni) {
            if (obj.animation === undefined) {
                obj.animation = new PlayerProxy();
            }
            this.spriteSheet.loadAnimationToProxy(sheetId, obj.animation);
            obj.animation.setSpeed(obj.animSpeed);
        }
        return obj;
    }

    assignSprite(id, sheetId, alignStrategy = false) {
        const sprite = this.sprites[id];
        const oldDim = alignStrategy === true ? sprite.dim : null;
        this.initSpriteObj(sprite, sheetId);
        if (oldDim !== null && (oldDim.y !== sprite.dim.y || oldDim.x !== sprite.dim.x)) {
            // @TODO implement different strategies
            this.setSpriteBottomPos(id, sprite.x, sprite.y + oldDim.y - 1);
        }
        this.dirty = true;
    }

    hasSpriteSheetId(id, sheetId) {
        const sprite = this.sprites[id];
        return (sprite.name === sheetId);
    }

    getSpriteSheetId(id) {
        const sprite = this.sprites[id];
        return sprite.name;
    }

    updateFrames() {
        const synced = [];
        for (let id in this.sprites) {
            const sprite = this.sprites[id];
            if (sprite.filterDuration !== -1) {
                if (sprite.filterDuration === 0) {
                    sprite.filters = '';
                    if (!sprite.hidden) {
                        this.dirty = true;
                    }
                }
                sprite.filterDuration--;
            }
            if (sprite.isAnimation) {
                const ani = sprite.animation;
                if (ani.isSynchronous()) {
                    if (synced.indexOf(sprite.name) === -1) {
                        ani.nextStep();
                        synced.push(sprite.name);
                    } else {
                        continue;
                    }
                } else {
                    ani.nextStep();
                }
                if (!this.dirty && ani.isDirty()) {
                    this.dirty = true;
                }
            }
        }
    }

    getSpritePos(id, xEnd = false, yEnd = false) {
        const sprite = this.sprites[id];
        let x = sprite.x;
        if (xEnd) {
            x += sprite.dim.x - 1;
        }
        let y = sprite.y;
        if (yEnd) {
            y += sprite.dim.y - 1;
        }
        return {id, x, y, z: sprite.z, dim: sprite.dim};
    }

    getAllSpritePos(match) {
        const result = [];
        const matchLen = match.length;
        for(let sprite in this.sprites) {
            if (sprite.substr(0, matchLen) === match) {
                result.push(this.sprites[sprite]);
            }
        }
        return result;
    }

    getUid(name) {
        this.uid++;
        return name + '.' + this.uid;
    }

    removeSprites(ids) {
        for (let id of ids) {
            this.removeSprite(id);
        }
    }

    removeSprite(id) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            if (sprite) {
                delete this.sprites[sprite.id];
                this.dirty = true;
            }
        }
    }

    moveSpritesAttachedTo(attached, moveX, moveY) {
        for(let id in this.sprites) {
            const sprite = this.sprites[id];
            if (attached === sprite.attached) {
                this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
            }
        }
    }

    isSpriteInBounds(id, top = 0, bottom = 0, left = 0, right = 0) {
        const pos = this.getSpritePos(id);
        return (
            pos.x + pos.dim.x >= left && pos.x < (this.viewPortDim.x + right) &&
            pos.y + pos.dim.y >= top && pos.y < (this.viewPortDim.y + bottom)
        );
    }

    attachSpriteTo(id, attach) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.attached = attach;
        }
    }

    setSpritePos(id, x, y, z = null, xEnd = false, yEnd = false) {
        const sprite = this.sprites[id];
        if (xEnd) {
            x -= sprite.dim.x - 1;
        }
        if (yEnd) {
            y -= sprite.dim.y - 1;
        }
        if (!this.dirty) {
            this.dirty = (sprite.x !== x || sprite.y !== y);
        }
        sprite.x = x;
        sprite.y = y;
        if (z !== null) {
            this.zOrdering = true;
            if (!this.dirty) {
                this.dirty = sprite.z !== z;
            }
            sprite.z = z;
        }
    }

    setSpriteBottomPos(id, x, y, z = null) {
        this.setSpritePos(id, x, y, z, false, true);
    }

    addGroup(id, spriteIds) {
        this.groups[':' + id] = spriteIds;
    }

    deleteGroup(id) {
        delete this.groups[':' + id];
    }

    getGroupSprites(id) {
        const result = [];
        if (this.groups[id]) {
            for (let sprite of this.groups[id]) {
                if (this.hasSprite(sprite)) {
                    result.push(this.getSprite(sprite));
                }
            }
        }
        return result;
    }

    setSpriteFilters(id, filters, duration = -1) {

        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            sprite.filters = filters;
            sprite.filterDuration = duration;
        }
        this.dirty = true;
    }

    moveSprite(id, moveX, moveY) {
        const sprites = this.getSpritesById(id);
        for (let sprite of sprites) {
            this.setSpritePos(sprite.id, sprite.x + moveX, sprite.y + moveY);
        }
    }

    render() {
        const target = this.container.getBufferCtx();
        const clearRects = this.bufferClearRects[this.container.getActiveIndex()];
        if (clearRects.length === 0) {
            target.clearRect(0, 0, this.paneDim.x, this.paneDim.y);
        } else {
            for (let rect of clearRects) {
                target.clearRect(rect.x, rect.y, rect.width, rect.height);
            }
        }

        const drawRects = [];
        let pixels = 0;

        const ids = Object.keys(this.sprites);
        if (this.zOrdering) {
            ids.sort((id1, id2) => {
                const z1 = this.sprites[id1].z;
                const z2 = this.sprites[id2].z;
                if (z1 < z2) {
                    return -1;
                } else if (z1 > z2) {
                    return 1;
                }
                return 0;
            });
        }

        for (let id of ids) {
            const sprite = this.sprites[id];
            if (sprite.name !== null && !sprite.hidden && sprite.x < this.paneDim.x && sprite.x > -sprite.dim.x && sprite.y < this.paneDim.y && sprite.y > -sprite.dim.y) {
                let clearRect;
                if (sprite.isAnimation) {
                    const frameSprite = sprite.animation.getFrame();
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, frameSprite.id, sprite.filters, sprite.x, sprite.y, frameSprite.padding.x, frameSprite.padding.y, sprite.filters
                    );
                } else {
                    clearRect = this.spriteSheet.drawFilteredSprite(
                        target, sprite.name, sprite.filters, sprite.x, sprite.y, 0, 0, sprite.filters
                    );
                }
                drawRects.push(clearRect);
                pixels += clearRect.width * clearRect.height;
            }
        }
        this.bufferClearRects[this.container.getActiveIndex()] = (pixels <= this.pixelLimit) ? drawRects : [];
        this.container.switchBuffer();
        this.dirty = false;
    }
}

class PatternPane2 {

    constructor(pattern, repeat) {
        this.canvas = null;
        this.pattern = pattern;
        this.repeat = repeat;
        this.repeatX = ([null, '', 'repeat', 'repeat-x'].indexOf(repeat) !== -1);
        this.repeatY = ([null, '', 'repeat', 'repeat-y'].indexOf(repeat) !== -1);
    }

    init(viewPortDimX, viewPortDimY) {
        this.patternDim = {
            x: this.pattern.width,
            y: this.pattern.height
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.paneDim = {
            x: this.repeatX ? viewPortDimX + this.patternDim.x - 1 : viewPortDimX,
            y: this.repeatY ? viewPortDimY + this.patternDim.y - 1 : viewPortDimY
        };
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y, this.opaque);
        return this.container;
    }

    render() {
        const target = this.container.getCanvasCtx();
        target.fillStyle = target.createPattern(this.pattern, this.repeat);
        target.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        if (this.repeatX) {
            this.scrollPos.x += Sx;
        }
        if (this.scrollPos.x < 0) {
            this.scrollPos.x += this.patternDim.x;
        } else if (this.scrollPos.x >= this.patternDim.x) {
            this.scrollPos.x -= this.patternDim.x;
        }
        if (this.repeatY) {
            this.scrollPos.y += Sy;
        }
        if (this.scrollPos.y < 0) {
            this.scrollPos.y += this.patternDim.y;
        } else if (this.scrollPos.y >= this.patternDim.y) {
            this.scrollPos.y -= this.patternDim.y;
        }
        const elem = this.container.getCanvasElem();
        if (elem) {
            if (Sx !== 0) {
                Game.instance.addDomOp(elem, 'style.left', -this.scrollPos.x);
            }
            if (Sy !== 0) {
                Game.instance.addDomOp(elem, 'style.top', -this.scrollPos.y);
            }
        }
    }
}


class PatternPane {

    constructor(pattern, repeat) {
        this.pattern = pattern.getImage();
        this.repeat = repeat;
        this.repeatX = ([null, '', 'repeat', 'repeat-x'].indexOf(repeat) !== -1);
        this.repeatY = ([null, '', 'repeat', 'repeat-y'].indexOf(repeat) !== -1);
    }

    init(viewPortDimX, viewPortDimY) {
        this.patternDim = {
            x: this.pattern.width,
            y: this.pattern.height
        };
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.scrollPos = {
            x: 0,
            y: 0
        };
        this.paneDim = {
            x: this.repeatX ? viewPortDimX + this.patternDim.x - 1 : viewPortDimX,
            y: this.repeatY ? viewPortDimY + this.patternDim.y - 1 : viewPortDimY
        };

        this.container = new ImageContainer(this.paneDim.x, this.paneDim.y);
        const tmpCanvas = OCM.getNewOffscreenCanvas(this.paneDim.x, this.paneDim.y);
        tmpCanvas.ctx.fillStyle = tmpCanvas.ctx.createPattern(this.pattern, this.repeat);
        tmpCanvas.ctx.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
        this.container.getImageElem().src = tmpCanvas.elem.toDataURL('image/png');
        OCM.discard(tmpCanvas);
        return this.container;
    }

    render() {
        this.dirty = false;
    }

    scrollBy(Sx, Sy) {
        if (this.repeatX) {
            this.scrollPos.x += Sx;
        }
        if (this.scrollPos.x < 0) {
            this.scrollPos.x += this.patternDim.x;
        } else if (this.scrollPos.x >= this.patternDim.x) {
            this.scrollPos.x -= this.patternDim.x;
        }
        if (this.repeatY) {
            this.scrollPos.y += Sy;
        }
        if (this.scrollPos.y < 0) {
            this.scrollPos.y += this.patternDim.y;
        } else if (this.scrollPos.y >= this.patternDim.y) {
            this.scrollPos.y -= this.patternDim.y;
        }
        const elem = this.container.getImageElem();
        if (elem) {
            if (Sx !== 0) {
                Game.instance.addDomOp(elem, 'style.left', -this.scrollPos.x);
            }
            if (Sy !== 0) {
                Game.instance.addDomOp(elem, 'style.top', -this.scrollPos.y);
            }
        }
        return {
            x: Sx,
            y: Sy,
            unscrolled: {
                x: 0,
                y: 0
            }
        };
    }
}


class LinearGradientPane2 {

    constructor(axis, colorStops) {
        if (colorStops.length % 2 == 0) {
            throw Error('ColorStops need to be in the format: [<color>, <len>, <color>, ..., <len>, <color>]');
        }
        this.colorStops = [];
        for (let i = 0; i < colorStops.length; i += 2) {
            this.colorStops.push([colorStops[i], (i === colorStops.length - 1) ? 0 : colorStops[i + 1]]);
        }
        this.colorStopIndex = null;
        this.colorStopPosition = null;
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.isHorizontal = (axis === 'X');
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.colorStopIndex = 0;
        this.colorStopPosition = 0;
        this.viewPosition = 0;
        let totalSize = 0;
        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewSize = this.isHorizontal ? viewPortDimX : viewPortDimY;
        this.viewPositionMax = totalSize - (this.viewSize + 1);
        this.container = new CanvasContainer(this.paneDim.x, this.paneDim.y, this.opaque);
        return this.container;
    }

    render() {
        const target = this.container.getCanvasCtx();
        this.dirty = false;

        let i = this.colorStopIndex;
        const i_max = this.colorStops.length;
        let pos = this.colorStopPosition - this.viewPosition;
        const posStart = pos;
        const posMax = this.viewPosition + this.viewSize - 1;

        let len = 0;
        // wir suche jetzt den letzten relevanten ColorStop für den View
        while (pos < posMax && i < i_max) {
            const stop = this.colorStops[i];
            pos += stop[1];
            len += stop[1];
            i++;
        }

        if (len === 0) {
            return;
        }

        const gradient = this.isHorizontal ?
            target.createLinearGradient(posStart, 0, pos, 0) :
            target.createLinearGradient(0, posStart, 0, pos);

        const factor = 1 / len;
        pos = 0;
        for (let j = this.colorStopIndex; j <= i; j++) {
            if (j >= i_max) {
                break;
            }
            const stop = this.colorStops[j];
            gradient.addColorStop(pos, stop[0]);
            pos += stop[1] * factor;
        }
        target.fillStyle = gradient;
        target.fillRect(0, 0, this.paneDim.x, this.paneDim.y);
    }

    scrollBy(speedX, speedY) {
        const speed = this.isHorizontal ? speedX : speedY;

        if (speed === 0) {
            return;
        }
        let newPos = this.viewPosition + speed;
        if (speed > 0) {
            if (newPos > this.viewPositionMax) {
                newPos = this.viewPositionMax;
            }
            if (newPos !== this.viewPosition) {
                var posEnd = this.colorStopPosition + this.colorStops[this.colorStopIndex][1];
                while(posEnd < newPos) {
                    this.colorStopPosition = posEnd;
                    this.colorStopIndex++;
                    posEnd += this.colorStops[this.colorStopIndex][1];
                }
            }
        } else {
            if (newPos < 0) {
                newPos = 0;
            }

            if (newPos !== this.viewPosition) {
                while (this.colorStopPosition > newPos) {
                    this.colorStopIndex--;
                    this.colorStopPosition -= this.colorStops[this.colorStopIndex][1]
                }
            }

        }
        this.viewPosition = newPos;
        if (speed !== 0) {
            this.dirty = true;
        }
    }
}

/**
 * TODO:
 *   - endless Scrolling
 *   - Use CSS Background-Property?
 */
class LinearGradientPane {

    constructor(axis, colorStops) {
        if (colorStops.length % 2 == 0) {
            throw Error('ColorStops need to be in the format: [<color>, <len>, <color>, ..., <len>, <color>]');
        }
        this.colorStops = [];
        for (let i = 0; i < colorStops.length; i += 2) {
            this.colorStops.push([colorStops[i], (i === colorStops.length - 1) ? 0 : colorStops[i + 1]]);
        }
        this.viewPosition = null;
        this.viewPositionMax = null;
        this.isHorizontal = (axis === 'X');
    }

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.lowerBoundPos = 0;
        this.upperBoundPos = 0;
        this.viewPosition = 0;
        let totalSize = 0;
        for (let i = 0; i < this.colorStops.length; i++) {
            totalSize += this.colorStops[i][1];
        }
        this.viewSize = this.isHorizontal ? viewPortDimX : viewPortDimY;
        this.viewPositionMax = Math.max(totalSize - this.viewSize, 0);
        this.divPosition = 0;
        this.fadeDiv = document.createElement('div');
        this.fadeDiv.setAttribute(
            'style',
            'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortDimX + 'px; height: ' + viewPortDimY + 'px; top: 0px; left: 0px'
        );
        this.container = new DivContainer(this.fadeDiv);
        return this.container;
    }

    render() {
        let currPos = 0;
        let currColorIndex = 0;

        while (currPos + this.colorStops[currColorIndex][1] <= this.viewPosition) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
        }
        const startIndex = currColorIndex;
        this.divPosition = currPos;

        const top = Math.abs(currPos - this.viewPosition);
        this.lowerBoundPos = currPos;
        this.upperBoundPos = currPos + this.colorStops[currColorIndex][1];

        const endPos = this.viewPosition + this.viewSize;
        while (currPos + this.colorStops[currColorIndex][1] <= endPos) {
            currPos += this.colorStops[currColorIndex][1];
            currColorIndex++;
            if (currColorIndex === this.colorStops.length) {
                currPos = endPos;
                break;
            }
        }
        let lastIndex = currColorIndex;
        const lastIndexPos =
            1 - this.viewSize + (currPos === endPos ? currPos : currPos + this.colorStops[currColorIndex][1]);
        this.upperBoundPos = Math.min(this.upperBoundPos, lastIndexPos);
        this.lowerBoundPos = Math.max(this.lowerBoundPos, currPos - this.viewSize);

        let bottom = 0;
        if (currPos !== endPos) {
            bottom = currPos + this.colorStops[currColorIndex][1] - endPos;
            lastIndex++;
        }

        let gradient = 'to ' + (this.isHorizontal ? 'right' : 'bottom');
        let pos = 0;
        for (let i = startIndex; i <= lastIndex; i++) {
            if (i === this.colorStops.length) {
                gradient += ', ' + this.colorStops[i - 1][0];
                break;
            }
            const stop = this.colorStops[i];
            gradient += ', ' + stop[0];
            if (pos > 0 && i < lastIndex) {
                gradient += ' ' + pos + 'px';
            }
            pos += stop[1];
        }

        const div = this.container.getChild();
        Game.instance.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'width' : 'height'),
            top + this.viewSize + bottom
        );
        Game.instance.addDomOp(
            div,
            'style.' + (this.isHorizontal ? 'left' : 'top'),
            -top
        );
        Game.instance.addDomOp(
            div,
            'style.background',
            'linear-gradient(' + gradient + ')'
        );
        this.dirty = false;
    }

    scrollBy(speedX, speedY) {
        const speed = this.isHorizontal ? speedX : speedY;

        if (speed === 0) {
            return;
        }
        let newPos = this.viewPosition + speed;
        if (newPos > this.viewPositionMax) {
            newPos = this.viewPositionMax;
        } else if (newPos < 0) {
            newPos = 0;
        }

        if (this.viewPosition !== newPos) {
            this.viewPosition = newPos;
            if (newPos < this.lowerBoundPos || newPos > this.upperBoundPos) {
                this.dirty = true;
            } else {
                Game.instance.addDomOp(
                    this.container.getChild(),
                    'style.' + (this.isHorizontal ? 'left' : 'top'),
                    this.divPosition - newPos
                );
            }
        }
    }
}

// #################################
//    Scroll Handler
// #################################

class MasterSlavesScrollHandler {

    constructor(master) {
        this.master = master;
        this.slaves = [];
        this.spriteSlaves = [];
    }

    addSlave(slave, factorX = 0, factorY = 0) {
        this.slaves.push([slave, factorX, factorY]);
    }

    addSpriteSlave(slave, factorX = 0, factorY = 0) {
        this.spriteSlaves.push([slave, factorX, factorY]);
    }

    scrollBy(sx, sy) {
        const scrolled = this.master.scrollBy(sx, sy);
        if (scrolled.x !== 0 || scrolled.y !== 0) {
            for (let slave of this.slaves) {
                slave[0].scrollBy(scrolled.x * slave[1], scrolled.y * slave[2]);
            }
            for (let slave of this.spriteSlaves) {
                slave[0].moveSpritesAttachedTo(this.master, scrolled.x * slave[1], scrolled.y * slave[2]);
            }

        }
        return scrolled;
    }
}

class BoundsScrollHandler {

    constructor(spritePane, scroller, boundsSize, maxOut = {}) {
        this.spritePane = spritePane;
        this.scroller = scroller;
        this.usePushback = false;
        const bounds = {
            left: null,
            right: null,
            top: null,
            bottom: null
        };
        this.maxOut = Object.assign({top: 0, bottom: 0, left: 0, right: 0}, maxOut);
        if (boundsSize.x !== undefined) {
            bounds.left = boundsSize.x;
            bounds.right = boundsSize.x;
        }
        if (boundsSize.y !== undefined) {
            bounds.top = boundsSize.y;
            bounds.bottom = boundsSize.y;
        }
        if (boundsSize.left !== undefined) {
            bounds.left = boundsSize.left;
        }
        if (boundsSize.right !== undefined) {
            bounds.right = boundsSize.right;
        }
        if (boundsSize.top !== undefined) {
            bounds.top = boundsSize.top;
        }
        if (boundsSize.bottom !== undefined) {
            bounds.bottom = boundsSize.bottom;
        }
        this.bounds = bounds;
    }

    setUsePushback(value) {
        this.usePushback = value === true;
    }

    setMaxOut(maxOut) {
        this.maxOut = Object.assign(this.maxOut, maxOut);
    }

    moveActor(moveX = 0, moveY = 0, forceScrollX = false, forceScrollY = false) {
        const actor = this.spritePane.getActorId();
        if (actor === null) {
            return;
        }
        const sprite = this.spritePane.getSpritePos(actor);

        let move = false;
        let scrollX = 0;
        if (moveX !== 0) {
            // let's assume there is no scroll problem
            let pos = sprite.x + moveX;
            // the minimal position of the player sprite on the left
            const min = -this.maxOut.left;
            if (this.bounds.left === null) {
                // no scrollbound on left side
                if (pos < min) {
                    // player pos below allowed minimum => set to minimum
                    pos = min;
                }
            } else if (pos < this.bounds.left) {
                if (this.usePushback) {
                    if (pos < min) {
                        pos = min;
                    }
                    scrollX = -Math.abs(Math.min(this.bounds.left, sprite.x) - pos);
                } else {
                    // new position is left of scrollbounds
                    if (sprite.x >= this.bounds.left) {
                        scrollX = -Math.abs(this.bounds.left - pos);
                        pos = this.bounds.left;
                    } else if (pos < min) {
                        // player pos below allowed minimum => set to minimum
                        pos = min;
                    }

                }
            }

            const max = this.spritePane.viewPortDim.x - 1 - sprite.dim.x + this.maxOut.right;
            const rightScrollBound = (this.bounds.right === null) ? null : max - this.bounds.right;

            if (rightScrollBound === null) {
                if (pos > max) {
                    pos = max;
                }
            } else if (forceScrollX) {
                pos = sprite.x;
                if (pos > max) {
                    pos = max;
                }
                scrollX = moveX;
            } else if (pos > rightScrollBound) {
                if (this.usePushback) {
                    if (pos > max) {
                        pos = max;
                    }
                    scrollX = Math.abs(pos - rightScrollBound);
                } else {
                    if (sprite.x <= rightScrollBound) {
                        scrollX = Math.abs(pos - rightScrollBound);
                        pos = rightScrollBound;
                    } else if (pos > max) {
                        pos = max;
                    }
                }
            }
            sprite.x = pos;
            move = true;
        }

        let scrollY = 0;
        if (moveY !== 0) {
            let pos = sprite.y + moveY;
            const min = -this.maxOut.top;
            if (this.bounds.top === null) {
                if (pos < min) {
                    pos = min;
                }
            } else if (pos < this.bounds.top) {
                if (sprite.y >= this.bounds.top) {
                    scrollY = -Math.abs(this.bounds.top - pos);
                    pos = this.bounds.top;
                } else if (pos < min) {
                    pos = min;
                }
            }
            const max = this.spritePane.viewPortDim.y - 1 - sprite.dim.y + this.maxOut.bottom;
            const bottomScrollBound = (this.bounds.bottom === null) ? null : max - this.bounds.bottom;
            if (bottomScrollBound === null) {
                if (pos > max) {
                    pos = max;
                }
            } else if (pos > bottomScrollBound) {
                if (sprite.y <= bottomScrollBound) {
                    scrollY = Math.abs(pos - bottomScrollBound);
                    pos = bottomScrollBound;
                } else if (pos > max) {
                    pos = max;
                }
            }
            sprite.y = pos;
            move = true;
        }

        const scrolled = this.scroller.scrollBy(scrollX, scrollY);
        if (this.usePushback) {
            move = true;
            if (scrollX < 0) {
                sprite.x += scrolled.x;
            } else if (scrollX > 0) {
                sprite.x -= scrolled.x;
            }

            if (scrollY < 0) {
                sprite.y += scrolled.y;
            } else if (scrollY > 0) {
                sprite.y -= scrolled.y;
            }

            //move = (scrollY !== 0 || scrollX !== 0);
        } else {
            const unscrolled = scrolled.unscrolled;
            if (unscrolled.x !== 0) {
                sprite.x += unscrolled.x;
                move = true;
            }
            if (unscrolled.y !== 0) {
                sprite.y += unscrolled.y;
                move = true;
            }
        }

        if (move) {
            this.spritePane.setSpritePos(actor, sprite.x, sprite.y);
        }
    }
}

// ####################################
//    Bitmap Filter
// ####################################

const FILTER = {
   TYPE: {
       CANVAS: 0,
       IMAGEDATA: 1
   },
    PARAM: {
       STRING: 0,
       FLOAT: 1,
       COLOR: 2,
       MAPPING: 3,
        INT: 4
    }
};

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
        let data = [canvas, offX, offY, width, height];
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

const filterer = new BitmapFilterer();

filterer.addFilter(
    'clear-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        if (params.pixels > 0) {
            newCanvas.ctx.clearRect(0, 0, data[3], params.pixels);
        } else if (params.pixels < 0) {
            params.pixels = Math.abs(params.pixels);
            newCanvas.ctx.clearRect(0, data[4] - params.pixels, data[3], params.pixels);
        }
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);

filterer.addFilter(
    'flip-x',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        newCanvas.ctx.translate(data[3], 0);
        newCanvas.ctx.scale(-1, 1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'flip-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        newCanvas.ctx.translate(0, data[4]);
        newCanvas.ctx.scale(1, -1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'flip-xy',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        newCanvas.ctx.translate(data[3], data[4]);
        newCanvas.ctx.scale(-1, -1);
        newCanvas.ctx.drawImage(data[0].elem, data[1], data[2], data[3], data[4], 0, 0, data[3], data[4]);
        newCanvas.ctx.resetTransform();
        return [newCanvas, 0, 0, data[3], data[4]];
    }
);

filterer.addFilter(
    'shift-y',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        const shiftedSize = data[4] - Math.abs(params.pixels);
        let sourceY = data[2];
        if (params.pixels < 0) {
            sourceY -= params.pixels;
        }
        const targetY = params.pixels < 0 ? 0 : params.pixels;
        newCanvas.ctx.drawImage(data[0].elem, data[1], sourceY, data[3], shiftedSize, 0, targetY, data[3], shiftedSize);
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);


filterer.addFilter(
    'shift-x',
    FILTER.TYPE.CANVAS,
    function(data, params) {
        const newCanvas = OCM.getNewOffscreenCanvas(data[3], data[4]);
        const shiftedSize = data[3] - Math.abs(params.pixels);
        let sourceX = data[1];
        if (params.pixels < 0) {
            sourceX -= params.pixels;
        }
        const targetX = params.pixels < 0 ? 0 : params.pixels;
        newCanvas.ctx.drawImage(data[0].elem, sourceX, data[2], shiftedSize, data[4], targetX, 0, shiftedSize, data[4]);
        return [newCanvas, 0, 0, data[3], data[4]];
    },
    [
        {type: FILTER.PARAM.INT, key: 'pixels', default: 0}
    ]
);

filterer.addFilter(
    'monochrome',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = i << 2;
            if (rgba[pos] > 0 || rgba[pos+1] > 0 || rgba[pos+2] > 0) {
                rgba[pos] = params.color.r;
                rgba[pos+1] = params.color.g;
                rgba[pos+2] = params.color.b;
            }
        }
        return imageData;
    },
    [
        {type: FILTER.PARAM.COLOR, key: 'color', default: '#ffffff'}
    ]
);

filterer.addFilter(
    'opacity',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = (i << 2) + 3;
            rgba[pos] = rgba[pos] * params.opacity;
        };
        return imageData;
    },
    [
        {key: 'opacity', type: FILTER.PARAM.FLOAT, min: 0, max: 1, default: 1}
    ]
);

function getRgbFromHexColor(hex) {
    const result = [];
    result.push(parseInt(hex.substr(1, 2), 16));
    result.push(parseInt(hex.substr(3, 2), 16));
    result.push(parseInt(hex.substr(5, 2), 16));
    return result;
}

filterer.addFilter(
    'color-replace',
    FILTER.TYPE.IMAGEDATA,
    function(imageData, params) {
        const colors = [];
        for (let find in params.replace) {
            colors.push([getRgbFromHexColor(find), getRgbFromHexColor(params.replace[find])]);
        };
        const rgba = imageData.data;
        for(let i = 0; i < imageData.width * imageData.height; i++) {
            const pos = i << 2;
            for (let s of colors) {
                if (s[0][0] === rgba[pos] && s[0][1] === rgba[pos+1] && s[0][2] === rgba[pos+2]) {
                    rgba[pos] = s[1][0];
                    rgba[pos+1] = s[1][1];
                    rgba[pos+2] = s[1][2];
                    break;
                }
            }
        };
        return imageData;
    },
    [
        {key: 'replace', type: FILTER.PARAM.MAPPING}
    ]
);

// ####################################
//    Sheets
// ####################################

class SpriteSheet {

    constructor(imageRsrc) {
        this.sheet = imageRsrc.getCanvas();
        this.sprites = {};
        this.animations = {};
        this.customImages = [];
        this.players = {};
    }

    assertSprite(id) {
        if (!this.sprites[id]) {
            throw Error('No sprite with id "' + id + '" found in spritesheet!');
        }
    }

    assertAnimation(id) {
        if (!this.animations[id]) {
            throw Error('No animation with id "' + id + '" found in spritesheet!');
        }
    }

    addTransformedSprite(id, base, transformers) {
        this.assertSprite(base);
        this.customImages.push({
            id,
            base,
            transformers
        });
    }

    addTransformedSprites(postfix, baseIds, transformers) {
        for (let id of baseIds) {
            this.addTransformedSprite(id + postfix, id, transformers);
        }
    }

    addTransformedSpritesFromObj(transformers, obj) {
        for (let target in obj) {
            this.addTransformedSprite(target, obj[target], transformers);
        }
    }

    addTransformedAnimation(id, base, transformers, synchronous = false) {
        this.assertAnimation(base);
        const baseAnimation = this.animations[base];
        const newFrames = [];
        for (let i = 0; i < baseAnimation.frames.length; i++) {
            const frame = baseAnimation.frames[i];
            const newId = id + '_' + i;
            this.addTransformedSprite(newId, frame.id, transformers);
            newFrames.push({
                id: newId, duration: frame.duration, padding: {x: frame.padding.x, y: frame.padding.y}
            });
        }
        const animation = {
            synchronous,
            dim: {x: baseAnimation.dim.x, y: baseAnimation.dim.y},
            frames: newFrames,
            dir: baseAnimation.dir,
            end: baseAnimation.end
        };
        this.animations[id] = animation;
        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, animation.end, animation.dir);
            this.players[id] = player;
        }
    }

    build() {
        for (let image of this.customImages) {
            let base = this.getSprite(image.base);
            const trans = filterer.getCanvasWithFiltersApplied(
                image.transformers,
                base.img ? base.img : this.sheet,
                base.off.x,
                base.off.y,
                base.dim.x,
                base.dim.y
            );
            const sprite = this.addSprite(image.id, 0, 0, base.dim.x, base.dim.y);
            sprite.img = trans[0];
        }
    }

    addSprite(name, offX, offY, width, height) {
        const sprite = {
            off: {x: offX, y: offY},
            dim: {x: width, y: height}
        };
        this.sprites[name] = sprite;
        return sprite;
    }

    addSpriteSeq(name, offX, offY, width, height, length, spacing = 0) {
        for (let i = 1; i <= length; i++) {
            this.addSprite(name + i, offX, offY, width, height);
            offX += width + spacing;
        }
    }

    addAnimation(name, frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD, synchronous = false) {
        let maxX = 0;
        let maxY = 0;
        let sameSize = true;
        let dims = [];
        const frameDetails = [];
        for (let rawFrame of frames) {
            const frame = (typeof rawFrame === 'string' || rawFrame instanceof String) ?
                {
                    duration: 1,
                    id: rawFrame,
                    padding: {x: 0, y: 0}
                } : rawFrame;

            const dim = this.getSpriteDim(frame.id);
            maxX = Math.max(maxX, dim.x);
            maxY = Math.max(maxY, dim.y);
            sameSize = sameSize && (maxX === dim.x || maxY === dim.y);
            dims.push(dim);
            frameDetails.push(frame);
        }

        const animation = {
            synchronous,
            dim: {x: maxX, y: maxY},
            frames: frameDetails,
            dir,
            end
        };

        if (!sameSize) {
            for (let i = 0; i < dims.length; i++) {
                const frame = animation.frames[i];
                const dim = dims[i];
                // TODO multiple auto padding strategies per axis
                // (V-CENTERING, V-TOP, V-BOTTOM, H-CENTERING, H-LEFT, H-RIGHT)
                const offX = (maxX - dim.x) >> 1;
                const offY = (maxY - dim.y) >> 1;
                frame.padding = {x: offX, y: offY};
            }
        }

        this.animations[name] = animation;

        if (synchronous) {
            const player = new BitmapPlayer();
            player.loadAnimation(animation.frames, end, dir);
            this.players[name] = player;
        }
    }

    isAnimation(name) {
        return !(this.animations[name] === undefined);
    };

    getSpriteDim(name) {
        if (name === null) {
            return {x: 0, y: 0};
        }
        if (this.isAnimation(name)) {
            return this.animations[name].dim;
        }
        const sprite = this.getSprite(name);
        return sprite.dim;
    }

    getSprite(name) {
        this.assertSprite(name);
        return this.sprites[name];
    }

    loadAnimationToProxy(name, proxy) {
        this.assertAnimation(name);
        let animation = this.animations[name];
        if (animation.synchronous) {
            proxy.setPlayer(this.players[name]);
        } else {
            // creates a new player by lazy loading in the proxy
            proxy.loadAnimation(animation.frames, animation.end, animation.dir);
        }
    }

    drawSprite(ctx, name, posX, posY, paddX = 0, paddY = 0) {
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        ctx.drawImage(
            sprite.img === undefined ?
                this.sheet.elem : sprite.img.elem,
            sprite.off.x, sprite.off.y,
            sprite.dim.x, sprite.dim.y,
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawFilteredSprite(ctx, name, filters, posX, posY, paddX = 0, paddY = 0) {
        if (filters === '') {
            return this.drawSprite(ctx, name, posX, posY, paddX, paddY);
        }
        const sprite = this.getSprite(name);
        const draw = {x: posX + paddX, y: posY + paddY, width: sprite.dim.x, height: sprite.dim.y};
        const transformed = filterer.getCanvasWithFiltersApplied(
            filters,
            sprite.img === undefined ? this.sheet : sprite.img,
            sprite.off.x, sprite.off.y,
            draw.width, draw.height
        );
        ctx.drawImage(
            transformed[0].elem,
            transformed[1], transformed[2],
            transformed[3], transformed[4],
            draw.x,
            draw.y,
            draw.width,
            draw.height
        );
        return draw;
    }

    drawSpritePart(ctx, name, posX, posY, width, height, offX = 0, offY = 0) {
        const sprite = this.getSprite(name);
        width = Math.min(offX + sprite.dim.x, width);
        height = Math.min(offY + sprite.dim.y, height);
        if (width === 0 || height === 0) {
            return;
        }
        ctx.drawImage(
            sprite.img === undefined ? this.sheet.elem : sprite.img.elem,
            sprite.off.x + offX, sprite.off.y + offY,
            width, height,
            posX, posY,
            width, height
        );
    };
}

class SpriteAndTilesCollider {

    static defaultCheck(tile) {
        return (tile.obj !== null && tile.obj.block);
    }

    constructor(spriteId, spritePane, tilesPane, collides) {
        this.spriteId = spriteId;
        this.spritePane = spritePane;
        this.tilesPane = tilesPane;
        this.collides = {};
        for (let id in collides) {
            this.addCollide(id, collides[id]);
        }
        this.spriteOffset = {x: 0, y: 0};
        this.tileSize = tilesPane.tilesMap.tileSize;
    }

    addCollide(id, collide) {
        if (collide.dir === undefined || ['up', 'down', 'left', 'right', 'center'].indexOf(collide.dir) === -1) {
            throw Error(`Collide "${id}" must have dir property with an allowed value!`)
        }
        const margin = collide.dir === 'center' ?
            {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            } :
            {
                dir: 0,
                start: 0,
                end: 0
            };
        if (collide.margin) {
            Object.assign(margin, collide.margin);
        }
        collide.margin = margin;
        if (collide.check === undefined) {
            collide.check = SpriteAndTilesCollider.defaultCheck
        }
        this.collides[id] = collide;
    }

    setSpriteOffset(x, y) {
        this.spriteOffset = {x, y};
    }

    getCollideLines() {
        const pos = this.spritePane.getSpritePos(this.spriteId);
        pos.x += this.spriteOffset.x;
        pos.y += this.spriteOffset.y;

        const lines = {};
        for (let collideId in this.collides) {
            const collide = this.collides[collideId];
            if (collide.dir === 'center') {
/*
                const xStart = pos.x + collide.margin.left;
                const yStart = pos.y + collide.margin.top;
                lines[collideId] = [
                    xStart,
                    yStart,
                    pos.x + pos.dim.x - 1 - collide.margin.right - xStart,
                    pos.y + pos.dim.y - 1 - collide.margin.bottom - yStart
                ];

 */
            } else {
                let first = 0;
                let dir = 1;
                let axis = 'x';
                switch (collide.dir) {
                    case 'down':
                        dir = -1;
                        first = pos.dim.y - 1;
                    case 'up':
                        break;

                    case 'right':
                        dir = -1;
                        first = pos.dim.x - 1;
                    case 'left':
                        axis = 'y';
                        break;
                }
                const oppAxis = axis === 'x' ? 'y' : 'x';
                first += pos[oppAxis] + dir * collide.margin.dir;
                const dStart = pos[axis] + collide.margin.start;
                const dEnd = pos[axis] + pos.dim[axis] - collide.margin.end - 1;

                lines[collideId] = (axis === 'x' ?
                        [dStart, first, dEnd - dStart, 1] :
                        [first, dStart, 1, dEnd - dStart]
                );
            }
        }
        return lines;
    }

    getCollides(collideIds, obstacleSprites = []) {
        const result = {};
        const pos = this.spritePane.getSpritePos(this.spriteId);

        pos.x += this.spriteOffset.x;
        pos.y += this.spriteOffset.y;

        // pos hat die gerundete Position des Sprites inklusive eines möglichen Offsets

        for (let collideId of collideIds) {
            const collide = this.collides[collideId];
            const obj = {};

            if (collide.dir !== 'center') {
                let dist = collide.lookahead;
                let first = 0; //
                let dir = 1;
                let axis = 'x';
                switch(collide.dir) {
                    case 'down':
                        dir  = -1;
                        first = pos.dim.y - 1;
                    case 'up':
                        break;

                    case 'right':
                        dir = -1;
                        first = pos.dim.x - 1;
                    case 'left':
                        axis = 'y';
                        break;
                }
                const oppAxis = axis === 'x' ? 'y' : 'x';
                first += pos[oppAxis] + dir * collide.margin.dir;
                const dStart = pos[axis] + collide.margin.start;
                const dEnd = pos[axis] + pos.dim[axis] - 1 - collide.margin.end - 1;

                let tiles = axis === 'x' ?
                    this.tilesPane.getTilesInXLine(first, dStart, dEnd) :
                    this.tilesPane.getTilesInYLine(first, dStart, dEnd);
                let obstDist = collide.lookahead;
                obj.obstacles = [];
                for (let sprite of obstacleSprites) {
                    const obstPos = this.spritePane.getSpritePos(sprite);
                    obstPos.x += this.spriteOffset.x;
                    obstPos.y += this.spriteOffset.y;

                    if (this.spritePane.isAxisCollide(dStart, dEnd, obstPos[axis], obstPos[axis] + obstPos.dim[axis] - 1)) {
                        let dist = collide.lookahead;
                        switch (collide.dir) {
                            case 'down':
                            case 'right':
                                dist = obstPos[oppAxis] - first;
                                break;

                            case 'up':
                            case 'left':
                                dist = first - (obstPos[oppAxis] + obstPos.dim[oppAxis] - 1);
                                break;

                        }
                        if (dist > -collide.lookahead && dist <= obstDist) {
                            if (dist <= 0 && obstDist >= dist) {
                                obj.obstacles.push(sprite);
                            } else {
                                obj.obstacles = [];
                            }
                            obstDist = dist;
                        }
                    }
                }

                for(let tile of tiles) {
                    // auf der line liegen block-tiles, d.h. wir haben hier ein Collision und damit
                    // ist die distance hier gleich 0
                    if (collide.check(tile)) {
                        dist = 0;
                        break;
                    }
                }
                if (dist > 0) {
                    const pos = first + this.tilesPane.scrollPos[oppAxis];
                    let blockDist;
                    if (dir === -1) {
                        blockDist = Math.min(
                            collide.lookahead,
                            pos >= 0 ?
                                this.tileSize - 1 - (pos % this.tileSize) + 1 :
                                Math.min(Math.abs(pos) - 1 + 1)
                        );
                    } else {
                        blockDist = Math.min(
                            collide.lookahead,
                            pos >= 0 ?
                                pos % this.tileSize + 1:
                                this.tileSize - Math.abs(pos % this.tileSize) + 1
                        );
                    }

                    if (blockDist < collide.lookahead) {
                        const newFirst = first - dir * this.tileSize;
                        const tiles = axis === 'x' ?
                            this.tilesPane.getTilesInXLine(newFirst, dStart, dEnd) :
                            this.tilesPane.getTilesInYLine(newFirst, dStart, dEnd);
                        for (let tile of tiles) {
                            if (collide.check(tile)) {
                                dist = blockDist;
                                break;
                            }
                        }
                    }
                }

                if (dist === 0 && collide.saveContacts) {
                    obj.tiles = tiles;
                }

                obj.dist = Math.min(dist, obstDist);
                if (obj.dist <= 0 && obj.tiles === undefined) {
                    obj.tiles = [];
                }

            } else {
                const tiles = this.tilesPane.getTilesInRect(
                    pos.x + collide.margin.left,
                    pos.y + collide.margin.top,
                    pos.x + pos.dim.x - collide.margin.right - 1,
                    pos.y + pos.dim.y - collide.margin.bottom - 1
                );

                for (let tile of tiles) {
                    if (collide.check(tile)) {
                        Game.instance.addFrameEvent('collide', tile);
                    }
                }
                obj.tiles = tiles;
            }
            result[collideId] = obj;
        }
        return result;
    }
}

class TilesMap {

    constructor(tileBits, imageResource, tiles, defaultTile = null) {
        this.tileBits = tileBits;
        this.tileSize = 1 << tileBits;

        const srcCanvas = imageResource.getCanvas();
        const tilesPerLine = Math.floor(srcCanvas.elem.width / this.tileSize);
        const lines = Math.floor(srcCanvas.elem.height / this.tileSize);
        const tgtCanvas = OCM.getNewOffscreenCanvas((tilesPerLine * lines) * this.tileSize, this.tileSize);
        for (let i = 0; i < lines; i++) {
            const width = tilesPerLine * this.tileSize;
            tgtCanvas.ctx.drawImage(srcCanvas.elem, 0, i*this.tileSize, width, this.tileSize, i*width, 0, width, this.tileSize);
        }
        this.tilesImg = tgtCanvas;

        this.map = [];
        this.mapTiles = {
            x: 0,
            y: 0
        };
        this.tiles = tiles;
        this.animations = {};
        this.animatedIndices = [];
        this.defaultTile = defaultTile;
    }

    addAnimation(id, animation) {
        const player = new BitmapPlayer();
        player.loadAnimation(animation.frames, animation.end, animation.dir);
        this.animations[id] = player;
    };

    getAnimations() {
        return this.animations;
    }

    setMap(map) {
        if (!Array.isArray(map)) {
            throw Error('Map must be an array of arrays!');
        }
        if (map.length === 0 || map[0].length === 0) {
            throw Error('Map cannot be empty!');
        }

        this.map = this.getMapClone(map);
        this.mapTiles.x = this.map[0].length;
        this.mapTiles.y = this.map.length;
    }

    getMap() {
        return this.getMapClone(this.map);
    }

    getMapClone(map) {
        const clone = [];
        for (let row of map) {
            const mapRow = [];
            for (let item of row) {
                if (Array.isArray(item)) {
                    const eventItems = [];
                    for (let event of item) {
                        if (Array.isArray(event)) {
                            throw 'Invalid event in map definition found!';
                        }
                        eventItems.push(event);
                    }
                    mapRow.push(eventItems);
                } else {
                    mapRow.push(item);
                }
            }
            clone.push(mapRow);
        }
        return clone;
    }

    getTileObj(x, y) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return null;
        }
        let tile = this.map[y][x];
        if (Array.isArray(tile)) {
            tile = tile[0];
        }
        let obj = this.tiles[tile];
        if (obj === undefined) {
            if (this.defaultTile === null) {

                throw new Error('Unknown tile "' + tile + '" given in map at position (' + x + ', ' + y + ')!');
            }
            obj = Object.assign({}, this.defaultTile);
        }
        if (obj.index === undefined) {
            obj.index = tile;
        }

        return obj;
    }

    replaceTile(x, y, newTile) {
        if (this.map[y] === undefined || this.map[y][x] === undefined) {
            return;
        }
        this.map[y][x] = newTile;
    }

    getTileAtPos(x, y) {
        return this.getTileObj(x, y);
    }

    getTilesAtXLine(y, x1, x2, lines = 1) {
        const tiles = [];
        while (lines > 0) {
            for (let x = x1; x <= x2; x++) {
                tiles.push(this.getTileObj(x, y));
            }
            y++;
            lines--;
        }
        return tiles;
    }

    getTilesAtYLine(x, y1, y2) {
        const tiles = [];
        for (let y = y1; y <= y2; y++) {
            tiles.push(this.getTileObj(x, y));
        }
        return tiles;
    }

    triggerEventsInRect(x1, y1, width = 1, height = 1) {
        x1 = Math.max(x1, 0);
        y1 = Math.max(y1, 0);
        const x2 = Math.min(x1 + width, this.map[0].length);
        const y2 = Math.min(y1 + height, this.map.length);
        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                let tile = this.map[y][x];
                if (Array.isArray(tile)) {
                    if (tile.length === 0) {
                        tile = 0;
                    } else {
                        while (tile.length > 1) {
                            const event = tile.pop();
                            const parts = event.split(':');
                            Game.instance.addFrameEvent(parts[0], {object: parts[1], tile: {obj: this.getTileObj(x, y), x, y}});
                        }
                        tile = tile[0];
                    }
                    this.map[y][x] = tile;
                }
            }
        }
    }

    triggerEventsInXLine(x, y1, y2) {
        this.triggerEventsInRect(x, y1, 1, y2 - y1 + 1);
    }

    getTileIndex(x, y) {
        const tile = this.getTileObj(x, y);
        if (tile.animation === undefined) {
            return tile.index;
        }
        const frame = this.animations[tile.animation].getFrame();
        if (tile.isRegistered !== true) {
            this.animatedIndices.push(tile.index);
            tile.isRegistered = true;
        }
        return frame.id;
    }

    updateFrames() {
        for (let index in this.animations) {
            this.animations[index].nextStep();
        }
    }

    getAnimatedTiles(posX, posY, width, height) {
        const result = [];
        if (this.animatedIndices.length > 0) {
            const x_min = Math.max(posX, 0);
            const y_min = Math.max(posY, 0);
            const x_max = Math.min(posX + width, this.map[0].length);
            const y_max = Math.min(posY + height, this.map.length);
            for (let y = y_min; y < y_max; y++) {
                for (let x = x_min; x < x_max; x++) {
                    if (this.animatedIndices.indexOf(this.map[y][x]) !== -1) {
                        result.push([x, y]);
                    }
                }
            }
        }
        return result;
    }

    renderTileTo(target, index) {
        target.clearRect(0, 0, this.tileSize, this.tileSize);
        target.drawImage(
            this.tilesImg.elem,
            index << this.tileBits,
            0,
            this.tileSize,
            this.tileSize,
            0,
            0,
            this.tileSize,
            this.tileSize
        );

    }

    render(target, offset, dim = {}) {
        // TODO refactor dim
        const startTileX = dim.pos.x;
        const endTileX = startTileX + dim.width;
        const startTileY = dim.pos.y;
        const endTileY = startTileY + dim.height;

        target.clearRect(offset.x, offset.y, dim.width * this.tileSize, dim.height * this.tileSize);

        const xIndices = [];
        for(let x = startTileX; x <= endTileX; x++) {
            let index = x;
            if (index >= this.mapTiles.x) {
                if (dim.endless.x) {
                    while (index >= this.mapTiles.x) {
                        index -= this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.x) {
                    while (index < 0) {
                        index += this.mapTiles.x;
                    }
                } else {
                    index = null;
                }
            }
            xIndices.push(index);
        }

        const yIndices = [];
        for(let y = startTileY; y <= endTileY; y++) {
            let index = y;
            if (index >= this.mapTiles.y) {
                if (dim.endless.y) {
                    while (index >= this.mapTiles.y) {
                        index -= this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            } else if (index < 0) {
                if (dim.endless.y) {
                    while (index < 0) {
                        index += this.mapTiles.y;
                    }
                } else {
                    index = null;
                }
            }
            yIndices.push(index);
        }

        for (let j = 0; j < yIndices.length; j++) {
            const y = yIndices[j];
            if (y === null) {
                continue;
            }
            for (let i = 0; i < xIndices.length; i++) {
                const x = xIndices[i];
                if (x === null) {
                    continue;
                }
                const index = this.getTileIndex(x, y);
                if (index === 0) {
                    continue;
                }
                target.drawImage(
                    this.tilesImg.elem,
                    index << this.tileBits,
                    0,
                    this.tileSize,
                    this.tileSize,
                    offset.x + (i << this.tileBits),
                    offset.y + (j << this.tileBits),
                    this.tileSize,
                    this.tileSize
                );
            }
        }
    }
}

class FontMap {
    constructor(configOrJson) {

        if (!(configOrJson instanceof FontMap.Config)) {
            configOrJson = new FontMap.Config(configOrJson);
        }
        configOrJson.applyTo(this);
        this.config = configOrJson;
        this.image = this.image.getCanvasElem();
    }

    drawTextLine(ctx, text, posX, posY) {
        for (let i = 0; i <= text.length; i++) {
            const char = this.map[text[i]];
            if (char !== undefined) {
                ctx.drawImage(this.image, char.x, char.y, this.width, this.height, posX, posY, this.width, this.height);
            }
            posX += this.width;
        }
    }
}
FontMap.Config = FontMapConfig;


/**
 *  BitmapPlayer-Modes
 * ----------------------------
 *
 *   DIR: forward, backwards, forward-backward, backward-forward
 *   END: loop, stop, delete
 *
 * ----------------------------
 *
 */

const ANIMATION = {
    DIR: {
        FORWARD: 0,
        BACKWARD: 1,
        FORWARD_BACKWARD: 2,
        BACKWARD_FORWARD: 3
    },
    END: {
        LOOP: 0,
        STOP: 1,
        DELETE: 2
    },
    STATE: {
        EMPTY: -1,
        WAITING: 0,
        RUNNING: 1,
        DONE: 2,
        DESTROYED: 3,
        PAUSED: 4
    }
};

class PlayerProxy {

    constructor() {
        this.players = [
            null, // non-synchronous player
            null  // synchronous player
        ];
        this.active = 0;
    }

    setPlayer(player) {
        this.active = 1;
        this.players[1] = player;
    }

    isSynchronous() {
        return this.active === 1;
    }

    loadAnimation(frames, end, dir) {
        this.active = 0;
        if (this.players[0] === null) {
            this.players[0] = new BitmapPlayer();
        }
        this.players[0].loadAnimation(frames, end, dir);
        this.players[1] = null;
    }

    getFrame() {
        return this.players[this.active].getFrame();
    }

    setSpeed(speed) {
        this.players[this.active].setSpeed(speed);
    }

    getState() {
        return this.players[this.active].getState();
    }

    nextStep() {
        this.players[this.active].nextStep();
    }

    isDirty() {
        return this.players[this.active].isDirty();
    }

    pause() {
        this.players[this.active].pause();
    }

    continue() {
        this.players[this.active].continue();
    }

    reverse() {
        this.players[this.active].reverse();
    }
}


/**
 * TODO: setSync(null|frameState)
 *
 *   getStep() -> holt sich den step aus dem frameState falls dieser gesetzt wurde, andernfalls aus this.step
 *   addStep(value) -> führt diesen auf frameState aus
 *
 */
class BitmapPlayer {

    constructor() {
        this.speed = 1;
        this.state = ANIMATION.STATE.EMPTY;
        this.frameNo = null;
        this.pauseState = null;
        this.dirty = false;
    }

    loadAnimation(frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD) {
        this.frames = frames;
        this.direction = dir;
        this.end = end;
        this.isForward = (dir === ANIMATION.DIR.FORWARD || dir === ANIMATION.DIR.FORWARD_BACKWARD);
        this.step = 0;
        this.frameNo = this.isForward ? 0 : frames.length - 1;
        this.state = ANIMATION.STATE.WAITING;
        this.dirty = true;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    getState() {
        return this.state;
    }

    handleForward() {
        let frame = this.getFrame();
        while (this.step >= frame.duration) {
            this.step -= frame.duration;
            this.frameNo++;
            if (this.frameNo === this.frames.length) {
                this.frameNo--;
                if (this.direction === ANIMATION.DIR.FORWARD_BACKWARD) {
                    this.frameNo--;
                    this.isForward = false;
                } else {
                    if (this.end === ANIMATION.END.DELETE) {
                        this.state = ANIMATION.STATE.DESTROYED;
                        this.frameNo = null;
                    } else if (this.end === ANIMATION.END.LOOP) {
                        if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                            this.isForward = false;
                        } else {
                            this.frameNo = 0;
                        }
                    } else {
                        this.state = ANIMATION.STATE.DONE;
                    }
                }
                break;
            }
            frame = this.getFrame();
        }
    }

    handleBackward() {
        let frame = this.getFrame();
        while (this.step >= frame.duration) {
            this.step -= frame.duration;
            this.frameNo--;
            if (this.frameNo < 0) {
                this.frameNo = 0;
                if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                    this.frameNo++;
                    this.isForward = true;
                } else {
                    if (this.end === ANIMATION.END.DELETE) {
                        this.state = ANIMATION.STATE.DESTROYED;
                        this.frameNo = null;
                    } else if (this.end === ANIMATION.END.LOOP) {
                        if (this.direction === ANIMATION.DIR.BACKWARD_FORWARD) {
                            this.isForward = false;
                        } else if (this.direction === ANIMATION.DIR.FORWARD_BACKWARD) {
                            this.isForward = true;
                            this.frameNo = 0;
                        } else {
                            this.frameNo =  this.frames.length - 1;
                        }
                    } else {
                        this.state = ANIMATION.STATE.DONE;
                    }
                }
                break;
            }
            frame = this.getFrame();
        }
    }

    nextStep() {
        if (this.frameNo === null || this.state === ANIMATION.STATE.PAUSED) {
            this.dirty = false;
            return;
        }
        const oldFrameNo = this.frameNo;
        this.state = ANIMATION.STATE.RUNNING;
        this.step += this.speed;
        if (this.isForward) {
            this.handleForward();
            if (!this.isForward) {
                this.handleBackward();
            }
        } else {
            this.handleBackward();
            if (this.isForward) {
                this.handleForward();
            }
        }
        this.dirty = (oldFrameNo !== this.frameNo);
    }

    getFrame() {
        if (this.frameNo === null) {
            return null;
        }
        return this.frames[this.frameNo];
    }

    pause() {
        this.pauseState = this.state;
        this.state = ANIMATION.STATE.PAUSED;
        this.dirty = false;
    }

    continue() {
        if (this.state === ANIMATION.STATE.PAUSED) {
            this.state = this.pauseState;
        }
    }

    reverse() {
        switch(this.dir) {
            case ANIMATION.DIR.FORWARD:
                this.dir = ANIMATION.DIR.BACKWARD;
                break;
            case ANIMATION.DIR.BACKWARD:
                this.dir = ANIMATION.DIR.FORWARD;
                break;
        }
        if (this.state === ANIMATION.STATE.DONE) {
            this.state = ANIMATION.STATE.WAITING;
        }
        this.isForward = !this.isForward;
    }

    isDirty() {
        return this.dirty;
    }
}

/**
 * TODO:
 *   - MasterStates (?)
 */
class States {

    constructor(states) {
        if (states.length === 0) {
            throw Error("No states given!");
        }
        this.states = {};
        this.transitions = [];
        this.currState = states[0];
        this.eventPrios = [];
        this.possibleEvents = null;
        for (let state of states) {
            this.states[state] = {};
        }
    }

    assertExists(state) {
        if (this.states[state] === undefined) {
            throw Error('State "' + state + '" does not exist in machine!');
        }
    }

    getPossibleEvents() {
        if (this.possibleEvents === null) {
            const keys = Object.keys(this.states[this.currState]);
            const events = [];
            for (let event of this.eventPrios) {
                if (keys.indexOf(event) !== -1) {
                    events.push(event);
                }
            }
            this.possibleEvents = events;
        }
        return this.possibleEvents;
    }

    hasPossibleEvent() {
        const events = this.getPossibleEvents();
        for(let event of arguments) {
            if (events.indexOf(event) !== -1) {
                return true;
            }
        }
        return false;
    }

    addTransition(from, events, to) {
        this.assertExists(from);
        this.assertExists(to);
        if (!Array.isArray(events)) {
            events = [events];
        }
        for (let event of events) {
            this.states[from][event] = to;
        }
    }

    cloneStatesAndTransitions(postfix, states) {
        for (let state of states) {
            const newState = state + '_' + postfix;
            this.states[newState] = {};
            const transitions = this.states[state];
            for (let event in transitions) {
                const targetState = transitions[event];
                if (states.indexOf(targetState) !== -1) {
                    this.states[newState][event] = targetState + '_' + postfix;
                }
            }
        }
    }

    replaceEventForStates(states, event, newEvent) {
        if (!Array.isArray(states)) {
            states = [states];
        }
        for (let state of states) {
            const target = this.states[state][event];
            if (target !== undefined) {
                this.states[state][newEvent] = target;
                delete this.states[state][event];
            }
        }
    }

    setEventPrios(events) {
        this.eventPrios = events;
    }

    doEvent(event) {
        const newState = this.states[this.currState][event];
        if (newState === undefined || newState === null) {
            return;
        }
        this.possibleEvents = null;
        this.transitions.push({event, from: this.currState, to: newState});
        this.currState = newState;
    }

    popTransitions() {
        const popped = this.transitions;
        this.transitions = [];
        return popped;
    }

    getState() {
        return this.currState;
    }

    setState(state) {
        this.assertExists(state);
        this.popTransitions();
        this.possibleEvents = null;
        this.currState = state;
    }
}

class AudioPlayer {

    constructor() {
        this.audio = {};
        this.channels = {};
        this.masterVolume = 1;
        this.paused = [];
    }

    addChannel(id) {
        this.channels[id] = null;
    }

    addAudioResources(obj) {
        this.audio = Object.assign(this.audio, obj);
    }

    setMasterVolume(volume) {
        this.masterVolume = volume;
    }

    play(id, channel = null) {
        this.paused = [];
        const audio = this.audio[id];
        if (channel !== null) {
            if (this.channels[channel] !== undefined) {
                if (this.channels[channel] !== null && this.channels[channel].isPlaying()) {
                    this.channels[channel].reset();
                    this.channels[channel].pause();
                }
            }
            this.channels[channel] = audio;
        } else {
            if (audio.isPlaying()) {
                audio.reset();
            }
        }
        audio.setLoop(false);
        audio.play();

        return audio;
    }

    loop(id, channel = null) {
        const audio = this.play(id, channel);
        audio.setLoop(true);
    }

    pause() {
        for (let id in this.audio) {
            this.audio[id].pause();
        }
    }

    isPlaying(id) {
        return this.audio[id].isPlaying();
    }

    continue() {
        // TODO we only want to restart what was paused
    }

    pauseAll() {
        this.paused = [];
        for (let id in this.channels) {
            if (this.channels[id] && this.channels[id].isPlaying()) {
                this.pauseChannel(id);
                this.paused.push(id);
            }
        }
    }

    continueAll() {
        for (let id of this.paused) {
            this.continueChannel(id);
        }
        this.paused = [];
    }

    pauseChannel(id) {
        const channel = this.channels[id];
        if (channel !== null && channel.isPlaying()) {
            channel.pause();
        }
    }

    continueChannel(id, speed = null) {
        const channel = this.channels[id];
        if (speed !== null && channel !== null) {
            channel.defaultPlaybackRate = speed;
        }
        if (channel !== null && !channel.isPlaying()) {
            channel.continue();
        }
    }

    resetChannel(id) {
        const channel = this.channels[id];
        if (channel !== null) {
            channel.reset();
            channel.pause();
        }
    }

    resetChannels() {
        for (let id in this.channels) {
            this.resetChannel(id);
        }
    }

    pauseChannels() {
        for (let id in this.channels) {
            this.pauseChannel(id);
        }
    }
}

class SceneController {
    constructor(defaultState = {}) {
        this.scenes = {};
        this.playing = null;
        this.defaultState = defaultState;
    }

    addScene(id, handler) {
        this.scenes[id] = handler;
    }

    getLastState() {
        return this.lastState;
    }

    play(id, state = {}) {
        if (this.scenes[id] !== undefined) {
            throw 'Unknown scene with id "' + id + '" given!';
        }
        this.playing = id;
        this.state = Object.assign({
            frame: 0
        }, this.defaultState, state);
    }

    handleScene() {
        if (this.playing === null) {
            this.lastState = null;
            return false;
        }
        this.lastState = this.state;
        const playScene = this.playing;
        if (!this.scenes[this.playing].handler(this.state)) {
            if (playScene === this.playing) {
                this.playing = null;
            }
        } else {
            this.lastState.frame++;
        }
        return true;
    }
}

class ObjectController {

    constructor(spritePane, eventType = 'object') {
        this.spritePane = spritePane;
        this.uid = 0;
        this.eventType = eventType;
        this.activeObjects = [];
        this.classes = {};
        this.removeMargin = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
    }

    setRemoveMargin(key, value) {
        this.removeMargin[key] = value;
    }

    addClass(name, handler, state = {}) {
        this.classes[name] = {
            handler,
            state
        };
    }

    getObjectWithSpriteId(id) {
        for (let obj of this.activeObjects) {
            if (obj.sprites.indexOf(id) !== -1) {
                return obj;
            }
        }
        return null;
    }

    getSpriteIdsForClass(cls) {
        let result = [];
        for (let obj of this.activeObjects) {
            if (obj.class === cls) {
                result = result.concat(obj.sprites);
            }
        }
        return result;
    }

    getObjectsForClass(cls) {
        let result = [];
        for (let obj of this.activeObjects) {
            if (obj.class === cls) {
                result.push(obj);
            }
        }
        return result;
    }

    deleteObjectsOfClass(cls) {
        if (!Array.isArray(cls)) {
            cls = [cls];
        }
        for (let obj of this.activeObjects) {
            if (cls.indexOf(obj.class) !== -1) {
                obj.deleted = true;
            }
        }
    }

    getObjectIdFromIdParts(idParts, obj) {
        let subIds = [];
        for (let part of idParts) {
            let id = '';
            if (Array.isArray(part)) {
                let curr = obj;
                for (let key of part) {
                    curr = curr[key];
                }
                id = curr;
            } else {
                id = obj[part];
            }
            subIds.push(id);
        }
        return obj.class + '_' + subIds.join('_');
    }

    hasActiveObject(id) {
        for (let obj of this.activeObjects) {
            if (obj.id === id && obj.deleted !== true) {
                return true;
            }
        }
        return false;
    }

    getClassParts(id) {
        const parts = id.split('.', 2);
        return {
            main: parts[0],
            variant: (parts.length === 2 ? parts[1] : null)
        }
    }

    addObject(clsId, state = {}) {
        const cls = this.getClassParts(clsId);
        if (this.classes[cls.main] === undefined) {
            throw Error('No class with name "' + cls.main + '" found!');
        }
        const classState = this.classes[cls.main].state;
        let varState = {};
        if (cls.variant !== null) {
            if (classState.variants[cls.variant] === undefined) {
                throw Error('Class "' + cls.main + '" does not have variant "' + cls.variant +  '"!');
            }
            Object.assign(varState, {variant: cls.variant}, classState.variants[cls.variant]);
        }
        const obj = Object.assign({autoRemove: true}, classState, varState, state);
        obj.class = cls.main;
        const id = Array.isArray(obj.idParts) ? this.getObjectIdFromIdParts(obj.idParts, obj) : this.getUid(cls.main);
        if (this.hasActiveObject(id)) {
            return;
        }
        obj.id = id;
        obj.frame = 0;
        obj.sprites = [];
        this.activeObjects.push(obj);
        return obj;
    }

    getUid(name) {
        name += '_' + this.uid;
        this.uid++;
        return name;
    }

    handleObjects(onlyClasses = null) {
        while (true) {
            const event = Game.instance.getNextEvent(this.eventType);
            if (event === null) {
                break;
            }
            this.addObject(event.object, {event})
        }

        let i = 0;
        const survivedObjects = [];
        while (i < this.activeObjects.length) {
            const obj = this.activeObjects[i];
            const cls = this.classes[obj.class];
            let remove = obj.deleted === true;
            if (!remove && (onlyClasses === null || onlyClasses.indexOf(obj.class) !== -1)) {
                remove = cls.handler(obj) === false;
                if (!remove) {
                    if (obj.autoRemove === true) {
                        remove = false;
                        for (let spriteId of obj.sprites) {
                            if (this.spritePane.isSpriteInBounds(spriteId, this.removeMargin.top, this.removeMargin.bottom, this.removeMargin.left, this.removeMargin.right)) {
                                remove = false;
                                break;
                            } else {
                                remove = true;
                            }
                        }
                    };
                    if (!remove) {
                        obj.frame++;
                    }
                }
            }
            if (remove) {
                this.spritePane.removeSprites(obj.sprites);
            } else {
                survivedObjects.push(obj);
            }
            i++;
        }
        this.activeObjects = survivedObjects;
    }
}

const INPUT = {
    TYPE: {
        PRESSED_DOWN: 0,
        PRESS_AND_RELEASE: 1
    },
    STATE: {
        NOTPRESSED: 0,
        PRESSED: 1,
        AWAIT_NOTPRESSED: 2,
        AWAIT_PRESSED: 3
    }
};

class InputController {

    constructor() {
        this.xDir = 0;
        this.yDir = 0;
        this.inputs = {};
        this.forced = null;
        this.dirInputsKeyboard = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.dirInputsGamepad = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.dirInputsTouch = {
            up: null,
            down: null,
            left: null,
            right: null
        };
        this.touchPressed = [];
        this.gamepadNo = 0;
    }

    assignGamepadNo(value) {
        this.gamepadNo = value;
    }

    setDirInputsKeyboard(up, down, left, right) {
        this.dirInputsKeyboard['up'] = (up !== undefined) ? up : null;
        this.dirInputsKeyboard['down'] = (down !== undefined) ? down : null;
        this.dirInputsKeyboard['left'] = (left !== undefined) ? left : null;
        this.dirInputsKeyboard['right'] = (right !== undefined) ? right : null;
    }

    setDirInputsGamepad(up, down, left, right) {
        this.dirInputsGamepad['up'] = (up !== undefined) ? up : null;
        this.dirInputsGamepad['down'] = (down !== undefined) ? down : null;
        this.dirInputsGamepad['left'] = (left !== undefined) ? left : null;
        this.dirInputsGamepad['right'] = (right !== undefined) ? right : null;
    }

    setDirInputsTouch(up, down, left, right) {
        this.dirInputsTouch['up'] = (up !== undefined) ? up : null;
        this.dirInputsTouch['down'] = (down !== undefined) ? down : null;
        this.dirInputsTouch['left'] = (left !== undefined) ? left : null;
        this.dirInputsTouch['right'] = (right !== undefined) ? right : null;
    }

    isForced() {
        return this.forced !== null;
    }

    getDirKeys() {
        return this.dirInputsKeyboard;
    }

    setForcedInputs(keysDown) {
        if (keysDown === null) {
            this.forced = null;
        } else {
            this.forced = {};
            for (let key of keysDown) {
                this.forced[key] = key;
            }
        }
    }

    getKeysDown() {
        if (this.forced !== null) {
            return this.forced;
        }
        return Game.instance.keysDown;
    }

    getGamepadPressed() {
        if (this.forced !== null) {
            return [];
        }
        return Game.instance.getGamepadPressed(this.gamepadNo);
    }

    getTouchPressed() {
        if (this.forced !== null) {
            return [];
        }
        return this.touchPressed;
    }

    hasDirInput(dir) {
        const keysDown = this.getKeysDown();
        let key = this.dirInputsKeyboard[dir];
        if (key !== null && keysDown[key]) {
            return true;
        }
        const gamepadPressed = this.getGamepadPressed();
        let button = this.dirInputsGamepad[dir];
        if (button !== null && gamepadPressed.indexOf(button) !== -1) {
            return true;
        }
        const touchId = this.dirInputsTouch[dir];
        const touchPressed = this.getTouchPressed();
        if (touchId !== null && touchPressed.indexOf(touchId) !== -1) {
            return true;
        }
        return false;
    }

    getDirVector() {
        return {x: this.xDir, y: this.yDir};
    }

    updateTouchInputs() {
        const touchPressed = [];
        for (let touchId of Game.instance.touchInputs) {
            if (touchPressed.indexOf(touchId) === -1) {
                touchPressed.push(touchId);
            }
        }
        this.touchPressed = touchPressed;
    }

    update() {
        this.updateTouchInputs();

        this.yDir = 0;
        if (this.hasDirInput('up')) {
            this.yDir--;
        }
        if (this.hasDirInput('down')) {
            this.yDir++;
        }
        this.xDir = 0;
        if (this.hasDirInput('left')) {
            this.xDir--;
        }
        if (this.hasDirInput('right')) {
            this.xDir++;
        }

        for (let name in this.inputs) {
            const input = this.inputs[name];
            const keyDown = this.isPressed(name);

            switch(input.type) {
                case INPUT.TYPE.PRESSED_DOWN:
                    input.state = keyDown ? INPUT.STATE.PRESSED : INPUT.STATE.NOTPRESSED;
                    break;

                case INPUT.TYPE.PRESS_AND_RELEASE:
                    switch(input.state) {
                        case INPUT.STATE.AWAIT_NOTPRESSED:
                            if (!keyDown) {
                                input.state = INPUT.STATE.AWAIT_PRESSED;
                            }
                            break;

                        case INPUT.STATE.AWAIT_PRESSED:
                            if (keyDown) {
                                input.state = INPUT.STATE.PRESSED;
                            }
                            break;

                        case INPUT.STATE.PRESSED:
                            if (!keyDown) {
                                input.state = INPUT.STATE.NOTPRESSED;
                            }
                    }
                    break;
            }
        }
    }

    isPressed(name) {
        const input = this.inputs[name];
        const keysDown = this.getKeysDown();
        if (input.map.key !== null && keysDown[input.map.key] === input.map.key) {
            return true;
        }
        const buttonPressed = this.getGamepadPressed();
        if (input.map.button !== null && buttonPressed.indexOf(input.map.button) !== -1) {
            return true;
        }

        const touchPressed = this.getTouchPressed();
        if (input.map.touch !== null && touchPressed.indexOf(input.map.touch) !== -1) {
            return true;
        }

        return false;
    }

    hasInput(name) {
        return this.inputs[name].state === INPUT.STATE.PRESSED;
    }

    awaitInput(name) {
        const input = this.inputs[name];
        if (input.type === INPUT.TYPE.PRESS_AND_RELEASE) {
            if (input.state === INPUT.STATE.NOTPRESSED || input.state === INPUT.STATE.PRESSED) {
                input.state = INPUT.STATE.AWAIT_NOTPRESSED;
            }
        }
    }

    addInput(name, type = INPUT.TYPE.PRESSED_DOWN) {
        this.inputs[name] =
            {
                map:
                    {'key': null, 'button': null, 'touch': null},
                type,
                state:
                    INPUT.STATE.NOTPRESSED
            };
    }

    assignKeyToInput(name, key) {
        this.inputs[name].map.key = key;
    }

    assignButtonToInput(name, button) {
        this.inputs[name].map.button = button;
    }

    assignTouchToInput(name, touchId) {
        this.inputs[name].map.touch = touchId;
    }

    noXDir() {
        return this.xDir === 0
    }

    noYDir() {
        return this.yDir === 0
    }

    noDir() {
        return this.xDir === 0 && this.yDir === 0;
    }

    isDownDir() {
        return this.yDir === 1;
    }

    isUpDir() {
        return this.yDir === -1;
    }

    isRightDir() {
        return this.xDir === 1;
    }

    isLeftDir() {
        return this.xDir === -1;
    }

    isDown() {
        return this.yDir === 1 && this.xDir === 0;
    }

    isUp() {
        return this.yDir === -1 && this.xDir === 0;
    }

    isLeft() {
        return this.yDir === 0 && this.xDir === -1;
    }

    isRight() {
        return this.yDir === 0 && this.xDir === 1;
    }
}

const DEGREE_90 = Math.PI / 2;

const PATH = {
    TYPE: {
        STRAIGHT: 0,
        ACCELERATED: 1,
        DAMPED: 2
    }
};

class Force {

    constructor(v0, height, drag = 0) {
        this.v0 = v0;
        this.drag = drag;
        this.gravity = Math.abs(v0 * v0 / (2 * height));
        this.peakTime = Math.round(Math.abs(v0 / this.gravity));
    }

    getMoveForTimeVector(vector, lowerBound = null, upperBound = null) {
        if (vector[0] === null) {
            return 0;
        }
        let move = this.v0 + (this.v0 < 0 ? 1 : -1) * (this.gravity * vector[0]);
        if (vector[1] !== null) {
            move -= vector[1] * this.drag;
        }
        if (lowerBound !== null && move < 0) {
            return -Math.min(-move, lowerBound);
        } else if (upperBound !== null && move >= 0) {
            return Math.min(move, upperBound);
        }
        return move;
    }

    incVector(vector) {
        if (vector[0] !== null) {
            vector[0]++;
            if (vector[1] !== null) {
                vector[1]++;
            }
        }
    }

    isTimeVectorAtPeak(vector) {
        return vector[0] === this.peakTime;
    }

    getPeakTime() {
        return this.peakTime;
    }
}


class Gravity {

    constructor(gravity = null, round = true) {
        this.time = 0;
        this.gravity = gravity;
        this.v0 = null;
        this.currHeight = 0;
        this.maxHeight = null;
        this.round = round;
        this.dragTime = 0;
        this.drag = null;
    }



    setSpeed(v0) {
        this.v0 = v0;
    }

    setSpeedByHeight(targetHeight) {
        if (this.gravity === null) {
            throw Error('No gravity given!');
        }
        const height = targetHeight - this.currHeight;
        this.speed = Math.sqrt(this.gravity * 2 * height);
    }

    reset() {
        this.time = 0;
    }

    getMaxHeight() {
        if (this.gravity === null || this.v0 === null) {
            return null;
        }
        return this.v0 * this.v0 * this.gravity / 2;
    }

    setGravity(gravity) {
        this.gravity = Math.abs(gravity);
    }

    setGravityByHeightAndSpeed(v0, height) {
        this.setGravity(v0 * v0 / (2 * height));
    }

    getCurrentHeight() {
        if (this.round) {
            return Math.round(this.currHeight);
        }
        return this.currHeight;
    }

    setMaxHeight(height) {
        this.maxHeight = height;
    }

    getTimeUntilMax() {
        const tMax = Math.round(Math.abs(this.v0 / this.gravity));
        return tMax;
    }

    setDrag(value) {
        this.dragTime = this.time;
        this.drag = value;
    }

    move() {
        this.lastSpeed =  this.v0 + (this.v0 < 0 ? 1 : -1) * (this.gravity * this.time);
        if (this.drag !== null) {
            const dragTime = this.time - this.dragTime;
            this.lastSpeed -= dragTime * this.drag;
        }
        this.currHeight += this.lastSpeed;
        const move = this.round ? Math.round(this.lastSpeed) : this.lastSpeed;

        if (this.maxHeight !== null && Math.abs(this.currHeight) >= this.maxHeight) {
            this.currHeight = null;
            this.lastSpeed = null;
            return null;
        } else {
            this.time++;
        }
        return move;
    }

    getAllMovements(from = 0, to = null) {
        if (this.maxHeight === null) {
            return [];
        }
        this.reset();
        const result = [];
        let i = 0;
        while (true) {
            const move = this.move();
            if (move === null) {
                break;
            }
            if (to !== null && i > to) {
                break;
            }
            if (from <= i) {
                result.push(move);
            }
            i++;
        }
        return result;
    }
}

class AxisPath {

    constructor(start = 0) {
        this.points = [start];
        this.position = 0;
        return this;
    }

    static new(start = 0) {
        const path = new AxisPath(start);
        return path;
    }

    getLastPoint() {
        return this.points[this.points.length - 1];
    }

    addAbsolutePoint(point) {
        this.points.push(point);
        return this;
    }

    addRelativePoint(point) {
        const lastPoint = this.getLastPoint();
        this.points.push(lastPoint + point);
        return this;
    }

    addRelativePoints(points) {
        for (let point of points) {
            this.addRelativePoint(point);
        }
        return this;
    }

    round() {
        const rounded = [];
        for (let point of this.points) {
            rounded.push(Math.round(point));
        }
        this.points = rounded;
        return this;
    }

    getPoints() {
        return this.points;
    }

    throw(v0, maxHeight) {
        const gravity = v0 * v0 / (2 * maxHeight);
        let v = v0;
        let i = 0;
        let iMax = Math.round(v0 / gravity);
        while (i !== (iMax * 2 + 1)) {
            v = v0 - gravity * i;
            i++;
            this.addRelativePoint(v);
        }
        return this;
    }

    fall(v0, maxHeight) {
        const gravity = v0 * v0 / (2 * maxHeight);
        let v = v0;
        let i = 0;
        let iMax = Math.round(v0 / gravity);
        while (i !== (iMax * 2)) {
            v = v0 - gravity * (iMax - i);
            i++;
            this.addRelativePoint(v);
        }
        return this;
    }

    addTarget(target, steps, type = PATH.TYPE.STRAIGHT) {
        let point = this.getLastPoint();
        const dist = target - point;
        const size = dist / steps;
        let rad, start;

        switch(type) {
            case PATH.TYPE.STRAIGHT:
                for (let i = 1; i <= steps; i++) {
                    point += size;
                    this.points.push(point);
                }
                break;

            case PATH.TYPE.DAMPED:
                start = point;
                rad = DEGREE_90 / steps;
                for (let i = 1; i <= steps; i++) {
                    point = start + Math.sin(rad * i) * dist;
                    this.points.push(point);
                }
                break;

            case PATH.TYPE.ACCELERATED:
                start = point;
                rad = DEGREE_90 / steps;
                for (let i = 1; i <= steps; i++) {
                    point = start + (1 - Math.cos(rad * i)) * dist;
                    this.points.push(point);
                }
                break;

            default:
                throw Error('Unknown type ' + type + ' given!');
        }
        return this;
    }

    applyFactor(factor) {
        const points = [];
        for (let point of this.points) {
            points.push(point * factor);
        }
        this.points = points;
        return this;
    }

    getCount() {
        return this.points.length;
    }

    isStart() {
        return this.position === 0;
    }

    isEnd() {
        return this.position === this.points.length - 1;
    }

    getCurrentPoint() {
        return this.points[this.position];
    }

    forward(points = 1) {
        let startPos = this.getCurrentPoint();
        while (points > 0) {
            if (!this.isEnd()) {
                this.position++;
            }
            points--;
        }
        return this.getCurrentPoint() - startPos;
    }

    forwardFrom(from, steps = 1) {
        const lastIndex = this.getCount() - 1;
        if (from >= lastIndex) {
            return null;
        }
        const fromPos = this.points[from];
        while (steps > 0) {
            if (from < lastIndex) {
                from++;
            } else {
                return null;
            }
            steps--;
        }
        return this.points[from] - fromPos;
    }

    backward(points = 1) {
        let startPos = this.getCurrentPoint();
        while (points > 0) {
            if (!this.isStart()) {
                this.position--;
            }
            points--;
        }
        return this.getCurrentPoint() - startPos;
    }

    backwardFrom(from, steps = 1) {
        if (from <= 0) {
            return null;
        }
        const fromPos = this.points[from];
        while (steps > 0) {
            if (from > 0) {
                from--;
            } else {
                return null;
            }
            steps--;
        }
        return this.points[from] - fromPos;
    }

    rewind() {
        this.position = 0;
    }

    getDist(from, to) {
        const max = this.getCount() - 1;
        if (from > max || to > max) {
            return null;
        }
        return this.points[to] - this.points[from];
    }

    getMaxDist(from = 0, to = null) {
        let max = this.getCount() - 1;
        if (to === null) {
            to = max;
        }
        if (from > max || to > max) {
            return null;
        }
        let min = this.points[from];
        max = this.points[from];
        for (let i = from; i <= to; i++) {
            min = Math.min(min, this.points[i]);
            max = Math.max(max, this.points[i]);
        }
        return max - min;
    }

    getRelativePath(offset = 0) {
        this.rewind();
        const relPath = [];
        while (!this.isEnd()) {
            let value = 0;
            if (this.isStart()) {
                value = offset;
            }
            value += this.forward();
            relPath.push(value);
        }
        this.rewind();
        return relPath;
    }

    limitToFirst(num) {
        const points = [];
        for(let i = 1; i <= num; i++) {
            points.push(this.points[i]);
        }
        this.points = points;
    }
}

class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    setMaxDist(xMin = null, xMax = null, yMin = null, yMax = null) {
        const pos = this.getRounded();
        this.xMin = xMin !== null ? pos - xMin : null;
        this.xMax = xMax !== null ? pos + xMax : null;
        this.yMin = yMin !== null ? pos - yMin : null;
        this.yMax = yMax !== null ? pos + yMax : null;
    }

    move(x, y) {
        const oldX = this.x;
        this.x += x;
        if (this.xMin !== null && this.x < this.xMin) {
            this.x = this.xMin;
        }
        if (this.xMax !== null && this.x > this.xMax) {
            this.x = this.xMax;
        }
        const oldY = this.y;
        this.y += y;
        if (this.yMin !== null && this.y < this.yMin) {
            this.y = this.yMin;
        }
        if (this.yMax !== null && this.y > this.yMax) {
            this.y = this.yMax;
        }

        return {x: Math.round(this.x) - Math.round(oldX), y: Math.round(this.y) - Math.round(oldY)};
    }

    setFrom(obj) {
        this.x = obj.x;
        this.y = obj.y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    getRounded() {
        return {x: Math.round(this.x), y: Math.round(this.y)}
    }
}

const OCM = new CanvasManager();
// let debugElem = null;
let debugs = [];
var spriteMaps = [];

let gameEditor = null;

module.exports = {
    Game,
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    CanvasPane,
    BitmapScrollPane,
    SpritePane,
    ColorPane,
    TextPane,
    PatternPane,
    PatternPane2,
    TilesPane,
    AxisPath,
    BufferedTilesPane,
    LinearGradientPane,
    MasterSlavesScrollHandler,
    BoundsScrollHandler,
    SpriteAndTilesCollider,
    ObjectController,
    InputController,
    Position,
    Animation: BitmapPlayer,
    d,
    FontMap,
    SpriteSheet,
    spriteMaps,
    TilesMap,
    States,
    Gravity,
    Force,
    TILE,
    INPUT,
    ANIMATION,
    OCM,
    COLLISION,
    PATH
};