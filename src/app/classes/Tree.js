import { d, without, union } from "../helper/helper.js";

/**
 * Usage:
 *     const [ treeState, setTreeState ] = useState(null);
 *                                // or: = useCachedState('bla')
 *
 *     const tree = useMemo(() => new TreeView(nodes, setTreeState, treeState));
 *
 *  Wäre es vorteilhafter, wenn wir den state NUR initial in den TreeView geben und danach komplett
 *  intern verwalten? Würde einen stateListener erfordern für updates:
 *
 *     const tree = useMemo(() => new TreeView(nodes, treeState));
 *     tree.setUpdater(update)
 *
 *  PRO: der Tree-State bringt ausserhalb der Klasse rein garnichts
 *
 *  if (!tree.visible(active)) {
 *      const newActive = tree.getFallbackNode(active);
 *      callAfterwards(setActive, newActive);
 *  }
 *
 *
 *
 *  Model-Changes:
 *
 *  Virtualisierung:
 *
 *  Selection:
 *
 *  Filterung:
 *    const [ filterValue, setFilterValue ] = useState();
 *    const filter = useMemo(node => {
 *
 *    });
 *    tree.setFilter(filter, filterValue);
 *--------------
 *  Rendering:
 */
class AbstractTreeView {

    constructor(model) {
        this.model = model;
        let currLevel = null;
        const locked = new Map();
        this.locker = {
            update: level => {
                currLevel = level;
                for (let [key, keyLevel] of locked.entries()) {
                    if (level <= keyLevel) locked.delete(key);
                }
            },
            lock: key => locked.set(key, currLevel),
            clear: () => { locked.clear(); currLevel = null },
            getLockDist: key => currLevel - locked.get(key),
            isLocked: key => locked.has(key)
        };
        this.id2viewIndex = new Map();
        this.id2modelIndex = new Map();
        this.groups = this.getGroups();

        const typesMap = new Map();
        const types = this.getTypes();
        for (let type of types) typesMap.set(type.id, type);
        this.types = typesMap;
        this.context = {};
        this._view = null;
        this.hidden = new Set();
        this.sortings = this.getSortings()
    }

    setContext(context) {
        this.context = context;
        this._view = null;
    }

    getGroups() {
        return []
    }

    getTypes(types) {
        return []
    }

    getTypeProps(type) {
        return this.types.get(type)
    }

    getSortings() {
        return [];
    }

    getDefaultSortId() {
        return this.sortings.length === 0 ? null : this.sortings[0].id
    }

    getSortOptions() {
        return this.sortings
    }

    getMatchingGroups(matchGroups) {
        const result = [];
        for (let group of this.groups) {
            if (matchGroups.includes(group.id)) {
                result.push(group);
            }
        }
        return result;
    }

    extractName(model) {
        return model.name;
    }

    extractId(model, modelIndex) {
        return modelIndex
    }

    extractLevel(model) {
        return model.level
    }

    extractType(model) {
        return null
    }

    createViewNode(viewIndex, modelIndex, model) {
        const node = {
            id: this.extractId(model, modelIndex),
            viewIndex,
            modelIndex,
            name: this.extractName(model),
            type: this.extractType(model),
            level: this.extractLevel(model),
            hidden: 0,
            isLeaf: true,
            connected: {},
            model
        };
        node.isClosed = this.context.state.includes(node.id);
        this.id2modelIndex.set(node.id, modelIndex);
        return node
    }

    hasGroupDeselect() {
        return true
    }

    toggleGroup(groups, toggledGroup) {
        const index = groups.indexOf(toggledGroup);
        const newGroups = index === -1 ? [] : [ ...groups ];
        if (index > -1) {
            if (this.hasGroupDeselect()) {
                newGroups.splice(index, 1);
            }
            return newGroups
        }
        for (let group of this.groups) {
            if (group.id !== toggledGroup) {
                if (groups.includes(group.id) && !group.exclusive) newGroups.push(group.id);
                continue
            }
            if (group.exclusive) return [group.id];
            newGroups.push(group.id)
        }
        return newGroups
    }

    // view and model relevant methods

    getModelSubtreeIds(rootId) {
        let index = this.getModelIndexById(rootId);
        let node = this.model[index];
        const result = [];
        const rootLevel = this.extractLevel(node);
        while (true) {
            result.push(this.extractId(node, index))
            index++;
            if (index >= this.model.length) break;
            node = this.model[index];
            if (this.extractLevel(node) <= rootLevel) break;
        }
        return result;
    }

    getModelSubtreeLeafIds(rootId) {
        let index = this.getModelIndexById(rootId);
        let node = this.model[index];
        const ids = [];
        const levels = [];
        const rootLevel = this.extractLevel(node);
        let currLevel = rootLevel;
        while (true) {
            ids.push(this.extractId(node, index))
            levels.push(currLevel);
            index++;
            if (index >= this.model.length) break;
            node = this.model[index];
            currLevel = this.extractLevel(node);
            if (currLevel <= rootLevel) break;
        }
        const result = [];
        for (index = ids.length - 1; index > 0; index--) {
            if (levels[index - 1] + 1 === levels[index]) result.push(ids[index - 1])
        }
        return result;
    }

    openAllInView() {
        if (!this.view.indirect) return;

        const { setState, state } = this.context;
        const nodes = [];
        for (let node of this.view.nodes) {
            if (node.level === 0) nodes.push( ...this.getModelSubtreeIds(node.id) );
        }
        setState(without(state, nodes))
    }

    closeAllInView() {
        if (!this.view.indirect) return;

        const { setState, state } = this.context;
        const nodes = [];
        for (let node of this.view.nodes) {
            if (node.level === 0) nodes.push( ...this.getModelSubtreeLeafIds(node.id) );
        }
        setState(union(state, nodes))
    }

    toggleNodeByModelIndex(index, force = null) {
        this.toggleNodeById(this.extractId(this.model[index], index), force)
    }

    toggleNodeByViewIndex(index, force = null) {
        this.toggleNodeById(this.view.nodes[index].id, force)
    }

    toggleNodeById(id, force = null) {
        const { state, setState } = this.context;
        const newState = [ ...state ];
        const pos = state.indexOf(id);
        if (force === null ? pos === -1 : force) {
            if (pos === -1) newState.push(id)
        } else {
            if (pos !== -1) newState.splice(pos, 1)
        }
        setState(newState);
    }

    isClosedByModelIndex(index) {
        const { state } = this.context;
        return state.includes(this.extractId(this.model[index], index))
    }

    isClosedByViewIndex(index) {
        return this.getViewNodeByIndex(index).isClosed
    }

    isClosedById(id) {
        const { state } = this.context;
        return state.includes(id)
    }

    isVisibleById(id) {
        return (this.id2viewIndex.has(id) && this.id2viewIndex.get(id) !== null)
    }

    isVisibleByModelIndex(index) {
        return this.view.indices.includes(index)
    }

    // view-only methods

    isLeafByViewIndex(index) {
        return this.view.nodes[index].isLeaf
    }

    isLeafById(id) {
        return this.getViewNodeById(id).isLeaf;
    }

    getParentByModelIndex(index) {
        const parentLevel = this.extractLevel(this.model[index]) - 1;
        let curr = index - 1;
        while (curr >= 0 && this.extractLevel(this.model[curr]) > parentLevel) {
            curr--
        }
        return curr < 0 ? null : curr;
    }

    getViewAncestors(values) {
        const ancestors = {};
        if (!Array.isArray(values)) values = [values];
        let found = false;
        const indices = this.view.indices;
        for (let value of values) {
            if (indices.includes(value)) continue;
            let index = value;
            do {
                index = this.getParentByModelIndex(index);
            } while (index !== null && !indices.includes(index));
            found = true;
            ancestors[value] = index
        }
        return found ? ancestors : null;
    }

    getPathNodeNames(path) {
        const result = [];
        for(let index of path) {
            result.push(this.extractName(this.model[index]));
        }
        return result;
    }

    getModelNodeByIndex(index) {
        return this.model[index]
    }

    getModelNodeById(id) {
        return this.model[this.id2modelIndex.get(id)];
    }

    getModelIndexById(id) {
        return this.id2modelIndex.get(id);
    }

    getViewNodeById(id) {
        if (!this.id2viewIndex.has(id)) return;
        const index = this.id2viewIndex.get(id);
        if (index === null) return;
        return index === null ? null : this.view.nodes[index];
    }

    getViewNodeByIndex(index) {
        return this.view.nodes[index]
    }

    getViewIndices() {
        return this.view.indices
    }

    getViewIdsByType(type) {
        const ids = [];
        for (let node of this.view.nodes) {
            if (type === null || node.type === type) ids.push(node.id)
        }
        return ids
    }

    getMinViewIdsByType(type) {
        const ids = [];
        let lastPath = null;
        for (let node of this.view.nodes) {
            if (type !== null && node.type !== type) continue;
            const path = node.path.join('.') + '.';
            if (lastPath !== path && (lastPath === '.' || path.startsWith(lastPath))) continue;
            lastPath = path;
            ids.push(node.id)
        }
        return ids
    }

    reduceToBaseByType(type) {
        const { selector } = this.context;
        const newSelection = [];

        for (let id of selector.selection) {
            const index = this.id2modelIndex.get(id);
            if ((type === null || this.extractType(this.model[index]) !== type) && !this.hidden.has(index)) {
                newSelection.push(id);
            }
        }
        return newSelection
    }

    getAncestorIdsById(id) {
        const root = this.view.nodes[this.id2viewIndex.get(id)];
        let index = root.modelIndex;
        const ancestors = [];
        for (let pathIndex of root.path) {
            if (pathIndex === index) break;
            const node = this.model[pathIndex];
            ancestors.push(this.extractId(node, pathIndex));
        }
        const level = this.extractLevel(this.model[index]);
        index++;
        while (index < this.model.length) {
            const node = this.model[index];
            if (this.extractLevel(node) <= level) break;
            ancestors.push(this.extractId(node, index));
            index++
        }
        return ancestors
    }

    setClickMode(node) {
        node.clickMode = 1;
    }

    getViewNodes() {
        return this.view.nodes
    }

    get view() {
        if (this._view === null) this.buildView();
        return this._view;
    }

    getSorting(nodes, model2viewIndex, indirect) {
        const { sorting, asc } = this.context;
        if (sorting) {
            for (let sort of this.sortings) {
                if (sort.id !== sorting) continue;

                const dir = asc ? 1 : -1;
                if (!indirect) {
                    return (a, b) => dir * sort.sortAsc(a, b)
                }
                const getViewPath = node => {
                    const path = viewPath.get(node.id);
                    if (!path) {
                        const modelPath = [];
                        let i = node.offset;
                        while (i <= (node.path.length - 1)) {
                            modelPath.push(model2viewIndex.get(node.path[i]))
                            i++
                        }
                        modelPath.push(node.viewIndex);
                        viewPath.set(node.id, modelPath);
                    }
                    return viewPath.get(node.id)
                }
                const viewPath = new Map();
                return (a, b) => {
                    let i = 0;
                    const pathA = getViewPath(a);
                    const pathB = getViewPath(b);
                    let iMin = Math.min(pathA.length, pathB.length);
                    while (i < iMin) {
                        const indexA = pathA[i];
                        const indexB = pathB[i];
                        if (indexA === indexB) {
                            i++;
                            continue;
                        }
                        const aNode = nodes[indexA];
                        const bNode = nodes[indexB];
                        const comp = sort.sortAsc(aNode, bNode);
                        return dir * comp;
                    }
                    if (a.level === b.level) return 0;
                    return (a.level < b.level ? -1 : 1)
                }
            }
        }
        return null;
    }

    buildView() {
        if (!this.context) throw new Error('Cannot build tree view, because context was not set!');

        const { selector, groups, filter } = this.context;
        const locker = this.locker;
        const levels = [];
        const nodes = [];
        const indices= [];
        const id2viewIndex = this.id2viewIndex;
        const model2viewIndex = new Map();
        id2viewIndex.clear();
        this.id2modelIndex.clear();
        this.hidden.clear();

        const connect = connectLevel => {
            // no connection to predecessors for root nodes
            if (!connectLevel) return;

            // levels contains the levels of all predecessors
            // lets find the last predecessor who has the same level as our connect code
            let startIndex = -1;
            let i = levels.length - 1;
            while (i >= 0) {
                const currLevel = levels[i];
                if (currLevel === connectLevel) {
                    startIndex = i;
                } else if (currLevel < connectLevel) {
                    break;
                }
                i--
            }
            if (startIndex === -1) return;

            for (let i = startIndex; i < levels.length; i++) {
                nodes[i].connected[connectLevel] = true
            }
        }
        const directMatching = false;

        const types = [];
        const type2stats = {};
        let nullStats = null;
        for (let [id, type] of this.types.entries()) {
            if (!type.private) types.push(id);
            type2stats[id] = {id: type.id, name: type.name, total: 0, marked: 0, markedAll: 0, hidden: 0, hiddenAll: 0, matches: 0, matchesAll: 0};
            if (id === null) nullStats = type2stats[null];
        }
        const incStats = (type, key) => {
            const stats = type2stats[type];
            if (stats) stats[key]++;
            if (type && nullStats) {
                nullStats[key]++;
            }
        }
        let lastAdd = null;
        const activeGroups = this.getMatchingGroups(groups);
        const noGroups = activeGroups.length === 0;
        let modelIndex = -1;
        let viewIndex = 0;
        let lastClosed = null;
        let indirect = false;
        const currPath = [];
        for (let model of this.model) {
            modelIndex++;
            const node = this.createViewNode(viewIndex, modelIndex, model);
            id2viewIndex.set(node.id, null);

            const type = node.type;
            while (currPath.length > node.level) currPath.pop();

            let addIndirect = noGroups;
            let found = noGroups;
            const skipLocked = locker.isLocked('skip');
            for (let group of activeGroups) {
                if (!group.filter(node, i)) continue;
                found = true;
                if (!skipLocked && group.indirect) addIndirect = true
            }
            if (addIndirect) indirect = true;

            locker.update(node.level);
            let baseAdd = false;
            node.offset = node.level;
            if (locker.isLocked('skip')) {
                node.level = locker.getLockDist('skip');
                baseAdd = true;
            } else if (found) {
                node.level = 0;
                if (addIndirect) locker.lock('skip');
                baseAdd = true;
            }
            const isMarked = selector.isSelected(node.id);
            let isInView = false;
            if (!locker.isLocked('marked') && isMarked) {
                locker.lock('marked');
                incStats(type, 'marked');
            }
            if (baseAdd) {
                let isMatching = true;
                if (filter) {
                    isMatching = filter(node, modelIndex);
                    if (isMatching) incStats(type, 'matches');
                    if (!locker.isLocked('match')) {
                        if (isMatching) {
                            node.level = 0;
                            locker.lock('match')
                        }
                    } else {
                        node.level = locker.getLockDist('match');
                        if (!directMatching) isMatching = true;
                    }
                }
                node.path = [ ...currPath ];
                if (isMatching) {
                    if (lastAdd && node.level === lastAdd.level + 1) lastAdd.isLeaf = false;
                    if (!locker.isLocked('state')) {
                        nodes.push(node);
                        isInView = true;
                        model2viewIndex.set(modelIndex, viewIndex);
                        viewIndex++;
                        this.setClickMode(node);
                        if (node.isClosed) {
                            lastClosed = node;
                            locker.lock('state')
                        }
                    } else {
                        if (isMarked) lastClosed.hidden++;
                    }
                    lastAdd = node;
                }
                incStats(type, 'total')
            }
            if (locker.isLocked('marked')) incStats(type, 'markedAll');
            if (isMarked && !isInView) {
                incStats(type, 'hidden');
                incStats(type, 'hiddenAll');
                this.hidden.add(node.modelIndex);
                locker.lock('hidden');
            } else if (locker.isLocked('hidden') || locker.isLocked('marked')) {
                if (!isInView) {
                    incStats(type, 'hiddenAll');
                }
            }
            if (locker.isLocked('match')) incStats(type, 'matchesAll');
            node.offset -= node.level;

            currPath.push(node.modelIndex);
        }
        locker.clear();

        const sorting = this.getSorting(nodes, model2viewIndex, indirect);
        if (sorting) nodes.sort(sorting);
        let i = 0;
        for (let node of nodes) {
            node.viewIndex = i;
            id2viewIndex.set(node.id, i);
            connect(node.level);
            levels.push(node.level);
            indices.push(node.id);
            i++
        }
        for (let node of nodes) {
            node.end = !node.connected[node.level]
        }
        const stats = [];
        for (let type of types) {
            stats.push(type2stats[type]);
        }
        this._view = {
            nodes,
            indices,
            indirect,
            stats
        }
    }

    get modelSize() {
        return this.model.length
    }

    get viewSize() {
        return this.view.nodes.length
    }
}

class ScreenTreeView extends AbstractTreeView {

    getTypes() {
        return [
            {id: 'area', name: 'Areas', match: 'areas'},
            {id: 'pane', name: 'Panes', match: 'panes'},
            {id: null, name: 'Items', match: null}
        ];
    }

    getSortings() {
        return [
            {
                id: 'default', name: 'Default', sortAsc: (a, b) => {
                    if (a.modelIndex === b.modelIndex) return 0;
                    return a.modelIndex < b.modelIndex ? -1 : 1;
                }
            },
            {
                id: 'alpha', name: 'Alpha', sortAsc: (a, b) => {
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    if (nameA === nameB) return 0;
                    return nameA < nameB ? -1 : 1;
                }
            }
        ];
    }

    hasGroupDeselect() {
        return false
    }

    getGroups() {
        return [
            {
                id: '', name: 'All', dynamic: true,
                exclusive: true, indirect: true,
                filter: node => true
            },
            {
                id: 'panes', name: 'Panes', dynamic: true,
                exclusive: true, indirect: true,
                filter: node => node.type === 'pane'
            },
            {
                id: 'marked', name: 'Marked', dynamic: true,
                exclusive: true, indirect: false,
                disabled: () => {
                    const {selector} = this.context;
                    return selector.selection.length === 0
                },
                filter: node => {
                    const {selector} = this.context;
                    return selector.selection.includes(node.id)
                }
            }
        ];
    }

    setClickMode(node) {
        node.clickMode = node.type === null ? 0 : 1;
    }

    extractType(model) {
        const type = model.type === 'areas' ? 'area' : model.type;
        return this.types.has(type) ? type : null
    }

    extractId(model, modelIndex) {
        return 'x' + super.extractId(model, modelIndex);
    }
}

export {
    ScreenTreeView
}