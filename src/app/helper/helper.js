function d(main, ...params) {
    let stack = null;
    try {
        throw new Error('myError');
    }
    catch(e) {
        stack = e.stack.split('\n');
    }
    const func = [];
    let no = 0;
    for (let line of stack) {
        const pos = no;
        no++;
        if (pos <= 1) {
            continue;
        } else if (pos === 2) {
            func.push(line.trim());
            continue;
        } else if (pos > 6) {
            break;
        }
        line = line.split('(');
        func.push(line[0].substr(6).trim());
    }
    console.group('Debug ' + func.join(' <- '));
    console.log(main, ...params);
    console.groupEnd();
    return main;
}

function getItemsCloneWithUpdatedItem(oldItems, index, props) {
    const newItems = [...oldItems];
    newItems[index] = Object.assign({}, oldItems[index], props);
    return newItems;
}

function hex2rgb(hex) {
    const color = {};
    if (hex[0] === '#') {
        if (hex.length === 7) {
            color.r = parseInt(hex.substr(1, 2), 16);
            color.g = parseInt(hex.substr(3, 2), 16);
            color.b = parseInt(hex.substr(5, 2), 16);
            return color;
        }
    }
    return null;
}

function rgb2hex(rgb) {
    if (typeof rgb === 'string') {
        return rgb;
    }
    return '#' + (rgb.r).toString(16) + (rgb.g).toString(16) + (rgb.b).toString(16);
}

const isValidResourceId = (type, id) => {
    let regexp = null;
    switch(type) {
        case 'image':
            regexp = /^[0-9a-zA-Z_\-]+(\/[0-9a-zA-Z_\-]+)*.(png|jpg|jpeg)$/;
            break;

        case 'audio':
            regexp = /^[0-9a-zA-Z_\-]+(\/[0-9a-zA-Z_\-]+)*.(wav|mp3|ogg)$/;
            break;

        case 'json':
            regexp = /^[0-9a-zA-Z_\-]+(\/[0-9a-zA-Z_\-]+)*$/;
            break;

        default:
            return false;
    }
    return regexp.test(id);
};

const getFlatDependencies = (indirect, resource, found = []) => {
    if (indirect[resource] === undefined) {
        return found;
    }
    for (let item of indirect[resource]) {
        if (!found.includes(item)) {
            found.push(item);
            getFlatDependencies(indirect, item, found);
        }
    }
    return found;
};

const getDeflatedResources = resources => {
    const result = {json: [], image: [], audio: []};
    for (let resource of resources) {
        const [type, id] = resource.split(':');
        result[type].push(id);
    }
    return result;
};

const getFlatObjectResources = resources => {
    const result = [];
    for(let obj of resources) {
        result.push(obj.type + ':' + obj.id);
    }
    return result;
};

const flattenResources = resources => {
    const result = [];
    for(let [type, ids] of Object.entries(resources)) {
        for (let id of ids) {
            result.push(type + ':' + id);
        }
    }
    return result;
};

class ResourceDependencies {

    constructor(getDirect, storeDirect, getIndirect, storeIndirect, deleteResource) {
        this.getDirectContent = getDirect;
        this.getIndirectContent = getIndirect;
        this.storeDirectContent = storeDirect;
        this.storeIndirectContent = storeIndirect;
        this.deleteResourceContent = deleteResource;

        this.direct = null;
        this.indirect = null;
    }

    setDirect(value) {
        this.direct = value;
    }

    setIndirect(value) {
        this.indirect = value;
    }

    getDirect() {
        if (this.direct === null) {
            this.direct = this.getDirectContent();
        }
        return this.direct;
    }

    getIndirect() {
        if (this.indirect === null) {
            this.indirect = this.getIndirectContent();
        }
        return this.indirect;
    }

    truncate() {
        this.storeDirectContent({});
        this.storeIndirectContent({});
        this.direct = null;
        this.indirect = null;
    }

    getDirectScreenResources(screen) {
        const direct = this.getDirect();
        if (!direct[screen]) {
            return {json: [], image: [], audio: []};
        }
        return direct[screen];
    }

    storeScreenResource(screen, type, resource) {
        const currDeps = this.getDirectScreenResources(screen);
        if (currDeps[type].includes(resource)) {
            return;
        }
        currDeps[type].push(resource);
        const direct = this.getDirect();
        direct[screen] = currDeps;
        this.storeDirectContent(direct);
    }

    storeScreenResources(screen, resources) {
        for (let [type, ids] of Object.entries(resources)) {
            for (let id of ids) {
                this.storeScreenResource(screen, type, id);
            }
        }
    }

    storeResourceDependencies(indirect) {
        const currIndirect = this.getIndirect();
        for (let [id, deps] of Object.entries(indirect)) {
            if (deps.length > 0) {
                currIndirect[id] = deps;
            } else {
                delete currIndirect[id];
            }
        }
        this.storeIndirectContent(currIndirect);
    }

    deleteResource(type, id) {
        const resId = type + ':' + id;

        const indirect = this.getIndirect();
        if (indirect[resId] !== undefined) {
            delete indirect[resId];
            delete this.indirect[resId];
            this.storeIndirectContent(indirect);
        }
        return true;
    }

    isIndirectTarget(type, id) {
        const indirect = this.getIndirect();
        const resId = type + ':' + id;
        for (let [from, ids] of Object.entries(indirect)) {
            if (ids.indexOf(resId) !== -1) {
                return true;
            }
        }
        return false;
    }

    isDirectTarget(type, id) {
        const direct = this.getDirect();
        const resId = type + ':' + id;
        for (let [screen, resources] of Object.entries(direct)) {
            if (resources[type].indexOf(resId) !== -1) {
                return true;
            }
        }
        return false;
    }

    deleteResource(type, id) {
        if (this.isDirectTarget(type, id) || this.isIndirectTarget(type, id)) {
            return false;
        }
        const indirect = this.getIndirect();
        const resId = type + ':' + id;
        const targets = indirect[resId];
        if (targets) {
            delete indirect[resId];
            this.storeIndirectContent(indirect);
            for (let target of targets) {
                const [targetType, targetId] = target.split(':');
                this.deleteResource(targetType, targetId);
            }
        }
        this.deleteResourceContent(type, id);
        return true;
    }

    safeDeleteScreenResource(type, id, screen = null) {
        const resId = type + ':' + id;

        if (screen !== null) {
            // TODO der part hier ist noch ungetestet
            const direct = this.getDirect();
            if (direct[screen]) {
                const resources = flattenResources(direct[screen]);
                if (resources.includes(resId)) {
                    if (resources.length === 1) {
                        delete direct[screen]
                    } else {
                        direct[screen][type].splice(direct[screen].indexOf(id), 1)
                    }
                    this.storeDirectContent(direct);
                    this.direct = null;
                }
            }
        }
        if (this.isDirectTarget(type, id) || this.isIndirectTarget(type, id)) {
            return;
        }
        this.deleteResourceContent(type, id);

        // TODO: lösche remote kanten von resId
        const indirect = this.getIndirect();
        if (!indirect[resId]) {
            return;
        }
        const targets = indirect[resId];
        delete indirect[resId];
        this.storeIndirectContent(indirect);
        for (let target of targets) {
            const [type, id] = target.split(':');
            this.safeDeleteScreenResource(type, id)
        }
    }

    deleteScreenResource(screen, type, id) {
        const direct = this.getDirect();
        const index = direct[screen][type].indexOf(id);
        if (index !== -1) {
            direct[screen][type].splice(index, 1);
            this.storeDirectContent(direct);
        }
        this.deleteResource(type, id);
        return true;
    }

    extractDependencies(v, overwrites, resolved, result = null, onOverwrite = false) {
        if (result === null) {
            result = {found: [], notFound: []}
        }
        const indirect = this.getIndirect();
        let deps = null;
        if (overwrites[v]) {
            onOverwrite = true;
            deps = overwrites[v];
        } else if (!onOverwrite && indirect[v]) {
            deps = indirect[v];
        }
        if (!resolved.includes(v)) {
            result[onOverwrite ? 'notFound' : 'found'].push(v);
        }
        if (deps) {
            for (let target of deps) {
                this.extractDependencies(target, overwrites, resolved, result, onOverwrite);
            }
        }
        return result;
    }

    getResourceWithDependencies(resId, result = []) {
        result.push(resId);
        const indirect = this.getIndirect();
        if (indirect[resId]) {
            for (let target of indirect[resId]) {
                this.getResourceWithDependencies(target, result)
            }
        }
        return result
    }

    getRelevantScreenResources(screen, resolved = [], overwrites = {}, remotes = []) {
        const direct = this.getDirectScreenResources(screen);
        for (let remote of remotes) {
            const [type, id] = remote.split(':');
            if (!direct[type].includes(id)) {
                direct[type].push(id);
            }
        }

        const found = [];
        const notFound = [];
        for (let [type, ids] of Object.entries(direct)) {
            for (let id of ids) {
                const paths = this.extractDependencies(type + ':' + id, overwrites, resolved);
                for (let id of paths.found) {
                    if (!found.includes(id)) {
                        found.push(id);
                    }
                }
                for (let id of paths.notFound) {
                    if (!notFound.includes(id)) {
                        notFound.push(id);
                    }
                }
            }
        }
        return {found, notFound};
    }
}

const getIdToItems = items => {
    const id2items = {};
    for (let item of items) {
        id2items[item.id] = item;
    }
    return id2items;
};

const getCanvasForDim = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

const rebuilders = [];
const rebuildObj = [];

const addTreeResource = (tree, resId, resourceInfo, level = 0) => {
    const [type, id] = resId.split(':');
    for (let resource of resourceInfo.resources) {
        if (resource.id === id) {
            tree.push({level, id, type, source: 'browser'});
            break;
        }
    }
    if (!resourceInfo.dependencies[resId]) {
        return;
    }
    const deps = resourceInfo.dependencies[resId];
    for (let dep of deps) {
        addTreeResource(tree, dep, resourceInfo, level + 1);
    }
};

const getResourceTreeForJsonModel = (cls, model) => {
    const rebuildJson = getRebuildJsonForModel(cls, model, true);
    const config = new cls.Config(rebuildJson);
    const resourceInfo = config.getResources();
    const tree = [];
    addTreeResource(tree, 'json:' + model.id, resourceInfo);
    return tree;
};

const getRebuildJsonForModel = (cls, model, deep) => {
    if (model instanceof cls) {
        return deep ? model.config.getRebuildJson(true) : model.config.id;
    }
    const conf = cls.Config;
    if (model instanceof conf) {
        return deep ? conf.getRebuildJson(true) : conf.id;
    }
    if (!deep) {
        return model.id;
    }
    const index = rebuilders.indexOf(conf);
    let obj;
    if (index !== -1) {
        obj = rebuildObj[index]
    } else {
        obj = new conf({});
        rebuilders.push(conf);
        rebuildObj.push(obj)
    }
    return obj.getRebuildJson(true, model)
};

const getJsonModelOfInstance = instance => {
    if (Array.isArray(instance)) {
        const json = [];
        for (let item of instance) {
            json.push(getJsonModelOfInstance(item));
        }
        return json;
    }
    if (typeof instance !== 'object') {
        return instance;
    }
    if (instance.config === undefined && instance.getJson === undefined) {
        if (instance instanceof HTMLCanvasElement) {
            const canvas = getCanvasForDim(instance.width, instance.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(instance, 0, 0);
            return canvas;
        }
        return instance;
    }
    const config = instance.config ? instance.config : instance;
    const json = config.getJson();
    for (let key in json) {
        json[key] = getJsonModelOfInstance(json[key]);
    }
    return json;
};

module.exports = {
    d,
    hex2rgb,
    rgb2hex,
    isValidResourceId,
    getItemsCloneWithUpdatedItem,
    ResourceDependencies,
    flattenResources,
    getFlatObjectResources,
    getDeflatedResources,
    getIdToItems,
    getCanvasForDim,
    getRebuildJsonForModel,
    getJsonModelOfInstance,
    getResourceTreeForJsonModel
};