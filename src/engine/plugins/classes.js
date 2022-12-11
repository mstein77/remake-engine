import { ucfirst, d } from "../helper/helper";

class Plugin {

    constructor(options) {
        this.game = null
        this.system = null
        this.options = options
        this.setup()
    }

    setup() {}

    setOptions(options) {
        this.options = options
    }

    getOption(key, defValue) {
        if (key in this.options) return this.options[key]
        return defValue
    }

    link(game, system) {
        d('link...')
        this.game = game
        this.system = system
        if (!this.options) this.options = {}
        this.init(this.options)
    }

    init(options) {
        // implement
    }

    registerListeners() {
        // implement
    }

    notify(action, props) {
        // implement
    }

    processedChanges(action) {
        // implement
    }
}

class RenderPlugin extends Plugin {

    setup() {
        this.watcher = {};
        this.filters = {}

        this.svg = (...args) => this.createNsElem('http://www.w3.org/2000/svg', 'svg', ...args)
        this.circle = (...args) => this.createNsElem('http://www.w3.org/2000/svg', 'circle', ...args)
        this.div = (...args) => this.createDomElem('div', ...args)
        this.canvas = (...args) => this.createDomElem('canvas', ...args)
        this.button = (...args) => this.createDomElem('button', ...args)
        this.input = (...args) => this.createDomElem('input', ...args)
        this.i = (...args) => this.createDomElem('i', ...args)
        this.pre = (...args) => this.createDomElem('pre', ...args)
        this.kbd = (...args) => this.createDomElem('kbd', ...args)
        this.icon = name => this.i(
            {
                class: "material-icons center-h min-content-h big",
                style: "display: block"
            },
            name
        )
    }

    addFilter(name, filter) {
        this.filters[name] = filter
    }

    addFilters(filters) {
        for (const [ name, filter ] of Object.entries(filters)) this.addFilter(name, filter)
    }

    getCssConstantsValues() {
        return {}
    }

    getParsed(expr) {
        const substituted = [];
        const matches = expr.matchAll(/<([a-z]+\.[a-zA-Z]+)(\,[a-z]+\.[a-zA-Z]+)*(\|[a-zA-Z]+)*>/g)
        if (!matches) return { parsed: expr, substituted };

        const game = this.game;
        let parsed = expr;
        let typed = true;
        for (let match of matches) {
            let [ all, matchExpr, ...more ] = [ ...match ]
            let replaceExpr = matchExpr;
            const filters = [];
            const substitutes = [matchExpr];
            const args = [eval(matchExpr)];
            for (let item of more) {
                if (item === undefined) continue
                replaceExpr += item;
                const name = item.substring(1)
                if (item.startsWith(',')) {
                    substitutes.push(name);
                    args.push(eval(name))
                } else {
                    filters.push(name)
                }
            }
            let first = true;
            let value = args[0];
            while (filters.length) {
                const filter = filters.shift()
                if (!this.filters[filter]) throw Error(`Cannot find filter "${method}"`)
                if (first) {
                    value = this.filters[filter]( ...args )
                } else {
                    value = this.filters[filter](value)
                }
                first = false
            }
            const full = '<' + replaceExpr + '>'
            if (!filters.length && typed && full === expr) {
                parsed = value
            } else {
                typed = false
                parsed = parsed.replaceAll(full, value)
            }
            for (let substitute of substitutes) {
                if (!substituted.includes(substitute)) substituted.push(substitute)
            }
        }
        return { parsed, substituted }
    }

    addWatcher(name, props) {
        if (!this.watcher[name]) this.watcher[name] = []
        const watch = this.watcher[name]
        const { node, prop } = props;
        let found = false
        for (let item of watch) {
            if (item.node !== node || item.prop !== prop) continue
            found = true
        }
        if (found) return false
        watch.push(props);
        node.classList.toggle('watched', true)
        return true
    }

    extractWatcher(expr, node, prop) {
        if (typeof expr !== 'string') return expr;

        const { parsed, substituted } = this.getParsed(expr)
        if (!substituted.length) return parsed

        for (let name of substituted) {
            this.addWatcher(name, { node, expr, prop });
        }
        return parsed;
    }

    createNsElem(ns, name, ...args) {
        const elem = document.createElementNS(ns, name)

        const propsOrChildren = args.shift();
        if (typeof propsOrChildren === 'object') {
            if (propsOrChildren instanceof Element) {
                elem.append(propsOrChildren)
            } else {
                for (let [ key, value ] of Object.entries(propsOrChildren)) {
                    if (key !== key.toLowerCase()) {
                        key = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
                    }
                    elem.setAttributeNS(null, key, value)
                }
            }
        }

        while (args.length) {
            const item = args.shift()
            if (!item) continue
            elem.append(item)
        }

        return elem
    }

    createDomElem(name, ...args) {
        const elem = document.createElement(name)

        const game = this.game;
        const propsOrChildren = args.shift();
        if (typeof propsOrChildren === 'string') {
            elem.append(this.extractWatcher(propsOrChildren, elem))
        } else if (typeof propsOrChildren === 'object') {
            if (propsOrChildren instanceof Node) {
                elem.append(propsOrChildren)
            } else {
                const pairs = Object.entries(propsOrChildren)
                let watch = null;
                for (let [prop, value] of pairs) {
                    if (prop === 'watch') continue;

                    if (prop.startsWith('on')) {
                        elem.addEventListener(prop.substring(2).toLowerCase(), value)
                    } else {
                        const parsed = this.extractWatcher(value, elem, prop)
                        if (typeof parsed === 'boolean') {
                            elem[prop] = parsed
                        } else {
                            const postfix = prop === 'class' && parsed.indexOf('watched') === -1 ? ' watched' : ''
                            elem.setAttribute(prop, parsed + postfix)
                        }
                    }
                }
                if ('watch' in propsOrChildren) {
                    if (args.length !== 1) throw Error('Missing function parameter')

                    let value = propsOrChildren.watch
                    if (!Array.isArray(value)) value = [value]
                    const parsed = [];
                    const callback = args.shift()
                    for (let name of value) {
                        parsed.push(eval(name))
                        this.addWatcher(name, { node: elem, expr: value, prop: 'watch', callback })
                    }
                    let addElems = callback( ...parsed )
                    if (!Array.isArray(addElems)) addElems = [addElems]
                    for (const addElem of addElems) {
                        elem.append(addElem)
                    }
                }
            }
        }

        while (args.length) {
            const item = args.shift()
            if (!item) continue
            elem.append(typeof item === 'string' ? this.extractWatcher(item, elem) : item)
        }

        return elem;
    }

    cleanupWatchers() {
        const elems = [ ...document.getElementsByClassName('watched') ]

        const watcher = {}

        for (let [ name, watch ] of Object.entries(this.watcher)) {
            const newWatch = []
            for (let props of watch) {
                if (elems.includes(props.node)) {
                    newWatch.push(props)
                }
            }
            if (newWatch.length) {
                watcher[name] = newWatch
            }
        }
        this.watcher = watcher
    }

    handleError(err) {
        console.log(err)
        this.game.running = false
    }

    processedChanges(action) {
        this.cleanupWatchers()
    }

    notify(action, props) {
        switch(action) {
            case 'error':
                return this.handleError(props)

            case 'change':
                const watch = this.watcher['game.' + props.name]
                if (!watch) break

                const game = this.game;
                for (let { node, expr, prop, callback } of watch) {
                    if (callback) {
                        const args = [];
                        for (let arg of expr) {
                            args.push(eval(arg))
                        }
                        let nodes = callback( ...args );
                        if (!Array.isArray(nodes)) nodes = [nodes]
                        while (node.firstChild) {
                            node.firstChild.remove()
                        }
                        for (const addElem of nodes) {
                            node.append(addElem)
                        }
                    } else {
                        const { parsed } = this.getParsed(expr)
                        if (prop) {
                            if (typeof parsed === 'boolean') {
                                node[prop] = parsed
                            } else {
                                const postfix = (prop === 'class' && parsed.indexOf('watched') === -1) ? ' watched' : ''
                                node.setAttribute(prop, parsed + postfix)
                            }
                        } else {
                            node.innerText = parsed
                        }
                    }
                }
                break
        }
    }
}

class TouchControlsPlugin extends Plugin {

    setup(options) {
        this.touchInputs = new Set()
    }

    reset() {
        this.touchInputs.clear()
    }

    get inputs() {
        return this.touchInputs
    }
}

export { Plugin, RenderPlugin, TouchControlsPlugin }