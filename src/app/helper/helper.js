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

class Storage {
    constructor(storage, prefix = '') {
        this.storage = storage;
        this.prefix = prefix;
        this.active = this.isAvailable();
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

    getKeys() {
        if (!this.isAvailable()) {
            return [];
        }
        const keys = [];
        for(let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }

    storeJson(id, data) {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            this.storage.setItem(this.prefix + id, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    getJson(id) {
        if (!this.isAvailable()) {
            return null;
        }
        try {
            const item = this.storage.getItem(this.prefix + id);
            try {
                return JSON.parse(item);
            } catch (e) {
                return null;
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    deleteJson(id) {
        this.storage.removeItem(this.prefix + id);
    }

    getDefaultedArray(id, defaults = []) {
        const json = this.getJson(id);
        if (Array.isArray(json)) {
            return json;
        }
        return Array.isArray(defaults) ? defaults : []
    }

    getDefaultedJson(id, defaults = null) {
        const json = this.getJson(id);
        if (json === null) {
            return typeof defaults === 'object' ? { ...defaults } : defaults;
        }
        if (defaults === null) {
            return json
        }
        return { ...defaults, ...json }
    }
}

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

const getIdsFromObjects = (items, idProp = 'id') => {
    const ids = [];
    for (let item of items) {
        ids.push(item[idProp]);
    }
    return ids;
};

const getObjectWithId = (items, id) => {
    for (let item of items) {
        if (item.id === id) {
            return item;
        }
    }
    return null;
};

const getNextUid = (ids, baseId) => {
    if (!ids.includes(baseId)) {
        return baseId;
    }
    let no = 2;
    while (ids.includes(baseId + no)) {
        no++;
    }
    return baseId + no;
};

const getCanvasForDim = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

const getCanvasForBitmap = bitmap => {
    const canvas = getCanvasForDim(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(bitmap, 0, 0);
    return canvas;
};

const getImageDataForImage = image => {
    const canvas = getCanvasForDim(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
}

const toHex = value => {
    return  ('0' + (value & 0xFF).toString(16)).slice(-2);
};

const getColorsFromCanvas = canvas => {
    const ctx = canvas.getContext('2d');
    return getColorsFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
};

const getColorsFromImageData = data => {
    const colors = [];

    let pos = 0;
    for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
            const color =
                '#'
                + toHex(data.data[pos])
                + toHex(data.data[pos + 1])
                + toHex(data.data[pos + 2])
                + toHex(data.data[pos + 3]);
            if (!colors.includes(color)) {
                colors.push(color);
            }
            pos += 4;
        }
    }
    return colors;
};

const getEmptyImageData = (width, height, color = '#00000000') => {
    const canvas = getCanvasForDim(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
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

/**
 * Wandelt die gegebene Resource (PaneModel) bzw. ResourceConfig in ein
 * JSON um, wobei Canvas gecloned werden
 *
 * null => null
 * array => [self(item1), ...self(itemN)]
 * !object(x) => x
 * (x.config === undef && x.getJson === undef)
 *   => x instanceof Canvas ? clone Canvas : x;
 *
 * config = x.config ? x.config : x;
 * json = config.getJson()
 * for (let key in json) {
 *     json[key] = self(json[key])
 * }
 *
 * @param instance
 * @returns {null|undefined|[]|HTMLCanvasElement|*}
 */
const getJsonModelOfInstance = instance => {
    if (instance === null) {
        return null
    }
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
            if (canvas.width > 0 && canvas.height > 0) {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(instance, 0, 0);
            }
            return canvas;
        }
    } else {
        const config = instance.config ? instance.config : instance;
        instance = config.getJson();
    }
    const json = {};
    for (let [key, value] of Object.entries(instance)) {
        json[key] = getJsonModelOfInstance(value);
    }
    return json;
};

const getInstanceFromInput = (cls, input) => {
    if (input instanceof cls) {
        return input;
    }
    if (!(input instanceof cls.Config)) {
        input = new cls.Config(input);
    }
    return new cls(input);
};

const getBlockPos = (block, fonts, dim) => {
    let blockDim = {};
    let font = null;
    if (block.canvas) {
        blockDim.width = block.canvas.elem.width;
        blockDim.height = block.canvas.elem.height;
    } else {
        font = getObjectWithId(fonts, block.font);
        blockDim = getBlockDim(block, font);
    }

    let x = block.autoCenteringX ?
        Math.ceil(dim.x/2) - Math.ceil(blockDim.width/2) : block.x;

    let y = block.autoCenteringY ?
        Math.ceil(dim.y/2) - Math.ceil(blockDim.height/2) : block.y;

    if (block.alignToGrid) {
        if (font === null) {
            font = getObjectWithId(fonts, block.font);
        }
        x = Math.floor(x/font.width) * font.width;
        y = Math.floor(y/font.height) * font.height;
    }

    return {x, y, width: blockDim.width, height: blockDim.height}
};

const drawTextBlocks = (ctx, dim, blocks, fonts, zoom = 1) => {
    for (let block of blocks) {
        const pos = getBlockPos(block, fonts, dim);

        ctx.drawImage(
            block.canvas.elem,
            0,
            0,
            pos.width,
            pos.height,
            pos.x * zoom,
            pos.y * zoom,
            pos.width * zoom,
            pos.height * zoom
        );
    }
};

const getBlockDim = (block, font) => {
    const lines = block.text.split('\n');
    block.height = lines.length;
    let max = 0;
    for (let line of lines) {
        max = Math.max(line.length, max);
    }
    block.width = max;

    // calc block dim
    return {
        width: font.width * block.width,
        height: (font.height * block.height) + (block.lineSpacing * (block.height - 1))
    }
};

const getTextBlockImage = (block, font, filterer = null) => {

    if (block.font !== font.id) {
        return null;
    }
    const blockDim = getBlockDim(block, font);

    // get new canvas for block
    let canvas = getCanvasForDim(
    blockDim.width || 1,
    blockDim.height || 1
    );
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const lines = block.text.split('\n');
    // process lines
    let posY = 0;
    for (let y = 0; y < block.height; y++) {
        let line = lines[y];
        // do text align on current line
        if (block.textAlign !== 'left' && line.length < block.width) {
            const pad = block.textAlign === 'right' ? block.width : (line.length + ((block.width - line.length) >> 1));
            line = line.padStart(pad, ' ');
        }
        // draw each char in current line
        for (let x = 0; x < line.length; x++) {
            const char = font.map[line[x]];
            if (char) {
                ctx.drawImage(
                    font.image,
                    char.x,
                    char.y,
                    font.width,
                    font.height,
                    x * font.width,
                    posY,
                    font.width,
                    font.height
                );
            } else {
                trigger = true;
            }
        }
        posY += block.lineSpacing + font.height;
    }

    if (filterer && block.filters) {
        canvas = filterer.getCanvasWithFiltersApplied(
            block.filters,
        {elem: canvas, ctx},
            0,
            0,
            canvas.width,
            canvas.height
        )[0].elem;
    }
    return canvas;
};

const drawCanvasToAvail = (canvas, ctx, x, y, avail, dim = null, pos = null) => {
    if (!canvas.width) {
        return;
    }
    const sizeX = dim === null ? canvas.width : dim.x;
    const sizeY = dim === null ? canvas.height : dim.y;
    const posX = pos === null ? 0 : pos.x;
    const posY = pos === null ? 0 : pos.y;
    const maxZoom = Math.min(Math.floor(avail.width/sizeX), Math.floor(avail.height/sizeY));
    if (maxZoom >= 1) {
        const targetWidth = sizeX * maxZoom;
        const targetHeight = sizeY * maxZoom;
        const offsetX = (avail.width - targetWidth) >> 1;
        const offsetY = (avail.height - targetHeight) >> 1;
        ctx.drawImage(canvas, posX, posY, sizeX, sizeY, x + offsetX, y + offsetY, targetWidth, targetHeight);
    } else {
        let targetX = avail.width;
        let targetY = avail.height;
        let offsetX = 0;
        let offsetY = 0;
        if (sizeX > sizeY) {
            offsetY = targetY;
            targetY = Math.round(targetY * (sizeY / sizeX));
            offsetY = (offsetY - targetY) >> 1;
        } else if (sizeY > sizeX) {
            offsetX = targetX;
            targetX = Math.round(targetX * (sizeX / sizeY));
            offsetX = (offsetX - targetX) >> 1;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(canvas, posX, posY, sizeX, sizeY, x + offsetX, y + offsetY, targetX, targetY);
    }
};

function drawEventsValue(ctx, eventIndex, values, x, y, zoom = 1) {
    let box = 0;
    for (let value of values) {
        if (!eventIndex.drawEvent(ctx, value, x, y, zoom)) {
            box++;
        }
    }
    if (box) {
        ctx.fillStyle = '#00FF0088';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px';
        ctx.fillText('' + box, x + 6, y + 12, 12);
    }
}

function getCanvasForEventMatrix(tilesIndex, eventIndex, matrix, maxDim = null) {
    const sizeX = tilesIndex.getSizeX();
    const sizeY = tilesIndex.getSizeY();
    const cellsY = matrix.length;
    const cellsX = cellsY === 0 ? 0 : matrix[0].length;
    const tilesWidth = cellsX * sizeX;
    const tilesHeight = cellsY * sizeY;
    const canvas = getCanvasForDim(tilesWidth, tilesHeight);
    const tilesCtx = canvas.getContext('2d');

    const plain = (maxDim !== null && (cellsX > maxDim || cellsY > maxDim));
    if (plain) {
        tilesCtx.fillStyle = '#ffffffff';
    }

    let posY = 0;
    for (let y = 0; y < cellsY; y++) {
        let posX = 0;
        for (let cell of matrix[y]) {
            if (plain) {
                if (cell.length !== 0) {
                    tilesCtx.fillRect(posX, posY, sizeX, sizeY);
                }
            } else {
                drawEventsValue(tilesCtx, eventIndex, cell, posX, posY);
            }
            posX += sizeX;
        }
        posY += sizeY;
    }
    return canvas;
}

const getCanvasForIndexMatrix = (tilesIndex, aliasIndex, matrix, maxDim = null) => {
    const sizeX = tilesIndex.getSizeX();
    const sizeY = tilesIndex.getSizeY();
    const cellsY = matrix.length;
    const cellsX = cellsY === 0 ? 0 : matrix[0].length;
    const tilesWidth = cellsX * sizeX;
    const tilesHeight = cellsY * sizeY;
    const canvas = getCanvasForDim(tilesWidth, tilesHeight);
    const tilesCtx = canvas.getContext('2d');

    const plain = (maxDim !== null && (cellsX > maxDim || cellsY > maxDim));
    if (plain) {
        tilesCtx.fillStyle = '#ffffffff';
    }

    let posY = 0;
    for (let y = 0; y < cellsY; y++) {
        let posX = 0;
        for (let tile of matrix[y]) {
            if (plain) {
                if (tile !== 0) {
                    tilesCtx.fillRect(posX, posY, sizeX, sizeY);
                }
            } else {
                if (typeof tile === 'string') {
                    const index = aliasIndex.getEntityByPropValue('value', tile);
                    aliasIndex.drawEntity(tilesCtx, index, posX, posY);
                } else {
                    tilesIndex.drawEntity(tilesCtx, tile, posX, posY);
                }
            }
            posX += sizeX;
        }
        posY += sizeY;
    }
    return canvas;
};

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

    loadAnimation(frames, end = ANIMATION.END.STOP, dir = ANIMATION.DIR.FORWARD, speed = 1) {
        this.frames = frames;
        this.direction = dir;
        this.end = end;
        this.isForward = (dir === ANIMATION.DIR.FORWARD || dir === ANIMATION.DIR.FORWARD_BACKWARD);
        this.speed = speed;
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
        let frame = this.getFrame()
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
        if (this.frames.length === 0 || this.frameNo === null || this.state === ANIMATION.STATE.PAUSED) {
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
        if (this.frameNo === null || !this.frames) {
            return null;
        }
        return this.frames[this.frameNo];
    }

    hasEnded() {
        return (this.state === ANIMATION.STATE.DONE || this.state === ANIMATION.STATE.DESTROYED);
    }

    reset() {
        this.step = 0;
        this.frameNo = this.frames.length === 0 ? null : (this.isForward ? 0 : this.frames.length - 1);
        this.state = ANIMATION.STATE.WAITING;
        this.dirty = true;
        this.isForward = (this.direction === ANIMATION.DIR.FORWARD || this.direction === ANIMATION.DIR.FORWARD_BACKWARD);
    }

    pause() {
        this.pauseState = this.state;
        this.state = ANIMATION.STATE.PAUSED;
        this.dirty = false;
    }

    isPaused() {
        return this.state === ANIMATION.STATE.PAUSED;
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

class Players {

    constructor(animationIndex) {
        this.index = animationIndex;
        this.players = {};
    }

    setAnimations(animations) {
        for (let name of Object.keys(this.players)) {
            if (!animations.includes(name)) {
                delete this.players[name];
            }
        }
        for (let name of animations) {
            if (this.players[name] === undefined) {
                const index = this.index.getEntityByPropValue('value', name);
                if (index !== null) {
                    const animation = this.index.getEntityObject(index);
                    const player = new BitmapPlayer();
                    player.loadAnimation(animation.frames, animation.end, animation.dir, animation.speed);
                    this.players[name] = player;
                }
            }
        }
    }

    clear() {
        this.players = {};
    }

    nextStep() {
        let hasNewFrame = false;
        for (let player of Object.values(this.players)) {
            if (player.hasEnded()) {
                player.reset();
            }
            player.nextStep();
            if (!hasNewFrame && player.isDirty()) {
                hasNewFrame = true;
            }
        }
        return hasNewFrame;
    }

    getCurrFrame(animation) {
        if (this.players[animation] === undefined) {
            return null;
        }
        return this.players[animation].getFrame();
    }

    allPlayers(callback) {
        for (let player of Object.values(this.players)) {
            callback(player);
        }
    }

    pause() {
        this.allPlayers(player => player.pause())
    }

    play() {
        this.allPlayers(player => player.play())
    }

    reset() {
        this.allPlayers(player => player.reset())
    }
/*
    setSpeed(speed) {
        this.speed = speed;
        this.allPlayers(player => player.setSpeed(speed))
    }

    getSpeed() {
        return this.speed;
    }
 */
}

function cloneDeep(value) {
    if (value === undefined) return;
    if (value === null) return null;
    if (Array.isArray(value)) {
        return value.map(item => cloneDeep(item));
    } else if (typeof value === 'object') {
        const obj = {};
        for (let [key, subValue] of Object.entries(value)) {
            obj[key] = cloneDeep(subValue);
        }
        return obj;
    }
    return value;
}

function clamp(min, curr, max) {
    return Math.min(Math.max(min, curr), max)
}

function areDisjoint(a, b) {
    return a.filter(item => b.includes(item)).length === 0;
}

module.exports = {
    d,
    clamp,
    areDisjoint,
    cloneDeep,
    hex2rgb,
    rgb2hex,
    isValidResourceId,
    getItemsCloneWithUpdatedItem,
    Storage,
    ResourceDependencies,
    flattenResources,
    drawTextBlocks,
    getFlatObjectResources,
    getDeflatedResources,
    getIdToItems,
    getIdsFromObjects,
    getObjectWithId,
    getNextUid,
    getCanvasForDim,
    getCanvasForBitmap,
    getImageDataForImage,
    getColorsFromCanvas,
    getColorsFromImageData,
    getEmptyImageData,
    getRebuildJsonForModel,
    getJsonModelOfInstance,
    getResourceTreeForJsonModel,
    getInstanceFromInput,
    getTextBlockImage,
    getBlockDim,
    getBlockPos,
    cloneDeep,
    drawCanvasToAvail,
    drawEventsValue,
    getCanvasForIndexMatrix,
    getCanvasForEventMatrix,
    BitmapPlayer,
    ANIMATION,
    Players
};