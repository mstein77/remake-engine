import inst from "./instances"
import { RENDERER_STATE } from "./const"
import { getResourcesAndCallback } from "./resources"
import { ResourceRequest } from "./classes"
import { getContainerElem } from "../helper/dom"
import { d } from "../helper/helper"

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
        inst.game.addDomChild(containerParent, node.parents[0]);
    }
}

function renderPanes(tree, force) {
    for (let child of tree.children) {
        if (child.type === 'pane' && child.pane !== null) {
            const isDirty = !(child.pane.dirty === false);
            if (force || isDirty) {
                child.pane.render();
            }
        }
        renderPanes(child, force);
    }
}

class PaneTreeRenderer {

    constructor(scope = null) {

        this._state = RENDERER_STATE.CONSTRUCTED
        this._elem = null
        this.scope = scope
        this.paneTree = new PaneTree()
        this.frames = 0
        this.loader = null
        this.prepareBuildCallback = null
        this.callback = null
        this.paramProvider = null
        this.frameHandler = null
        this.autoLoad = false
        this.autoBuild = false
        this.autoHandling = false
        this.hidden = undefined
        this.screen = null
        this.events = {}
    }

    init() {
        if (this.autoLoad) this.triggerLoading()
    }

    get state() {
        return this._state
    }

    setLoader(resources) {
        this.loader = resources
    }

    setBuilder(callback, paramProvider) {
        this.callback = callback
        this.paramProvider = paramProvider
    }

    setPrepareBuildCallback(callback) {
        this.prepareBuildCallback = callback
    }

    enableAutoLoad() {
        this.autoLoad = true
    }

    enableAutoBuild() {
        this.autoBuild = true
    }

    enableAutoHandling() {
        this.autoHandling = true
    }

    requestControls() {
        return inst.game.requestControlsForRenderer(this)
    }

    triggerLoading() {
        this.forwardTo(RENDERER_STATE.LOADED)
    }

    triggerBuild() {
        this.forwardTo(RENDERER_STATE.BUILD)
    }

    triggerHandling() {
        this.forwardTo(RENDERER_STATE.HANDLING)
    }

    triggerDestroy() {
        this._state = RENDERER_STATE.WAIT_DESTROY
    }

    triggerEnd() {
        this._state = RENDERER_STATE.HALTED
        this.events = {}
    }

    forwardTo(state) {
        if (state <= this._state) return
        if (state > RENDERER_STATE.WAIT_LOADING) {
            this.enableAutoLoad()
            if (this._state === RENDERER_STATE.CONSTRUCTED) this._state = RENDERER_STATE.WAIT_LOADING
        }
        if (state > RENDERER_STATE.WAIT_BUILD) {
            this.enableAutoBuild()
            if (this._state === RENDERER_STATE.LOADED) this._state = RENDERER_STATE.WAIT_BUILD
        }
        if (state > RENDERER_STATE.WAIT_HANDLING) {
            this.enableAutoHandling()
            if (this._state === RENDERER_STATE.BUILD) this._state = RENDERER_STATE.WAIT_HANDLING
        }
    }

    isLoaded() {
        return this._state >= RENDERER_STATE.LOADED
    }

    isBuild() {
        return this._state >= RENDERER_STATE.BUILD
    }

    isHandling() {
        return this._state >= RENDERER_STATE.HANDLING
    }

    isVisible() {
        return this.elem.style.display !== 'none'
    }

    hide(store = true) {
        if (store) this.hidden = true
        this.elem.style.display = 'none'
    }

    show() {
        this.hidden = false
        this.elem.style.display = 'block'
    }

    clear() {
        this.elem.replaceChildren()
    }

    setStyle(prop, value) {
        this.elem.style[prop] = value
    }

    loadResources(promise) {
        this._state = RENDERER_STATE.LOADING
        const setNextState = () => {
            this._state = RENDERER_STATE.LOADED
            if (this.autoBuild) return this.triggerBuild()
        }
        if (this.loader) {
            return promise.then(() => {
                this.loader.resolve()
                return inst.RL.loadTemporaryScope(this.scope).then(setNextState)
            })
        }
        return promise.then(setNextState)
    }

    buildTree(dimX, dimY) {
        this._state = RENDERER_STATE.BUILD
        if (this.prepareBuildCallback) this.prepareBuildCallback()

        this.hide(false)
        this.frameHandler = this.callback(
            { ...(this.paramProvider ? this.paramProvider() : {})}
        )
        this.tree = {
            type: 'screen',
            dim: {x: dimX, y: dimY},
            children: []
        };

        for (const area of this.paneTree.areas)
            area.addViewNodesToTree(this.tree, dimX, dimY)

        this.clear()
        buildNodeDom(this.tree, this.elem)

        this.render(true)
        if (this.hidden !== true) this.show()

        if (this.autoHandling) this.triggerHandling()
    }

    startHandling() {
        if (!this.frameHandler) {
            this._state = RENDERER_STATE.HALTED
            return
        }
        this._state = RENDERER_STATE.HANDLING
    }

    render(force = false) {
        renderPanes(this.tree, force)
    }

    handleNextFrame() {
        if (this._state !== RENDERER_STATE.HANDLING) return

        this.frameHandler({ frames: this.frames, ...this.paramProvider() })
        this.frames++
    }

    setElem(elem) {
        this._elem = elem
    }

    get elem() {
        if (!this._elem)
            throw Error(`No dom elem was yet assigned to this renderer`)

        return this._elem
    }
}

class PaneTreeProvider {

    constructor( ...args ) {
        this.initHandler = null
        this.setInitHandler( ...args )
    }

    setInitHandler( ...args ) {
        const { resources, callback } = getResourcesAndCallback( ...args )
        if (!callback) return

        const loader = new ResourceRequest(resources)
        this.initHandler = { loader, callback }
    }
}

class PaneTree {

    constructor() {
        this.areas = []
    }

    addArea(area) {
        if (!this.areas.length) area.firstArea = true
        this.areas.push(area)
        return this
    }

    addPane(pane) {
        const area = new Area()
        area.addPane(pane)
        this.addArea(area)
        return this
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

        inst.game.addDomOp(this.scrollElem, 'style.' + (this.axis === 'X' ? 'left' : 'top'), -this.scrollPos + 'px');
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
            const container = getContainerElem(dimX, dimY, offX, offY)
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

class ScreenImpl extends PaneTreeProvider {

    getPaneTreeRenderer(id) {
        const game = inst.game
        const renderer = new PaneTreeRenderer(id)
        renderer.init()

        const { loader, callback } = this.initHandler
        renderer.setLoader(loader)
        renderer.setBuilder(( ...args ) => {
                inst.autoIds.startContext('screen')
                const frameHandler = callback(...args)
                inst.autoIds.endContext()

                return frameHandler
            },
            () => ({ game, globals: game.globals, screen: renderer.paneTree, ...inst.RL.resources })
        )

        return renderer
    }
}

const Screen = ( ...args ) => new ScreenImpl( ...args )

const screens = {}
let isLocked = false

const ScreenRegistry = {
    set: (id, screen) => {
        if (isLocked)
            throw Error(`Cannot set screen "${id}". Registration only allowed in game init handler`)

        screens[id] = screen
    },
    get: id => {
        const screen = screens[id]

        return screen
    },
    lock: () => isLocked = true
}

export {
    PaneTree,
    PaneTreeRenderer,
    PaneTreeProvider,
    SplitArea,
    Screen,
    ScreenRegistry
}