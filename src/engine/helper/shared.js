/**
 * Returns an array holding the typed resource ids given in the type2ids object
 *
 * @param {object} resources
 * @returns {array}
 */
const flattenResources = resources => {
    const result = []
    for(const [ type, ids ] of Object.entries(resources)) {
        for (const id of ids) {
            result.push(type + ':' + id)
        }
    }
    return result
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

    /**
     * Returns an object which includes all typed resource ids of the direct and indirect resources of the given
     * screen which are already resolved (found) or are missing (notFound) and must be fetched from the server.
     * The overwrites array allows to overwrite the initially loaded dependencies of the storage
     *
     * @param {string} screen
     * @param {array} resolved
     * @param {object} overwrites
     * @param {array} remotes
     * @returns {object}
     */
    getRelevantScreenResources(screen, resolved = [], overwrites = {}, remotes = []) {
        // hole object welches die resource-types of die direkten Resource-Ids des Screens abbildet
        const direct = this.getDirectScreenResources(screen)

        // die remotes sind als "<type>:<id>" gegeben und alles was fehlt wird im direct ergänzt
        for (const remote of remotes) {
            const [ type, id ] = remote.split(':')
            if (direct[type].includes(id)) continue
            direct[type].push(id)
        }

        const found = []
        const notFound = []
        for (const [ type, ids ] of Object.entries(direct)) {
            for (const id of ids) {
                // ermittel die abhängigen Resourcen "<type>:<id>" der aktuellen Resource unterteilt in die,
                // die im resolved array vorkommen und die diejenigen, die nicht
                const paths = this.extractDependencies(type + ':' + id, overwrites, resolved);
                // anschliessend übernehme die gefundenen und nicht gefundenen resource ids in das resultat
                for (const id of paths.found) {
                    if (!found.includes(id)) found.push(id)
                }
                for (const id of paths.notFound) {
                    if (!notFound.includes(id)) notFound.push(id)
                }
            }
        }
        return { found, notFound };
    }
}

export {
    flattenResources,
    isValidResourceId,
    ResourceDependencies
}