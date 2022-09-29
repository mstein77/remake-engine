import { ucfirst } from "../helper/helper.js";

class RenderPlugin {

    constructor() {
        this.watcher = {};

        this.div = (...args) => this.createDomElem('div', ...args)
        this.canvas = (...args) => this.createDomElem('canvas', ...args)
        this.button = (...args) => this.createDomElem('button', ...args)
        this.input = (...args) => this.createDomElem('input', ...args)
        this.i = (...args) => this.createDomElem('i', ...args)
        this.icon = name => this.i(
            {
                class: "material-icons center-h min-content-h big",
                style: "display: block"
            },
            name
        )
    }

    setGame(value) {
        this.game = value
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
                const method = 'filter' + ucfirst(filter)
                if (!this[method]) throw Error(`Cannot find filter method "${method}"`)
                if (first) {
                    value = this[method]( ...args )
                } else {
                    value = this[method](value)
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

    extractWatcher(expr, node, prop) {
        if (typeof expr !== 'string') return expr;

        const { parsed, substituted } = this.getParsed(expr)
        if (!substituted.length) return parsed

        for (let name of substituted) {
            if (!this.watcher[name]) this.watcher[name] = []
            const watch = this.watcher[name]
            let found = false
            for (let item of watch) {
                if (item.node !== node || item.prop !== prop) continue
                found = true
            }
            if (found) continue
            watch.push({ node, expr, prop });
        }
        return parsed;
    }

    createDomElem(name, ...args) {
        const elem = document.createElement(name)

        const propsOrChildren = args.shift();
        if (typeof propsOrChildren === 'string') {
            elem.append(this.extractWatcher(propsOrChildren, elem))
        } else if (typeof propsOrChildren === 'object') {
            const pairs = Object.entries(propsOrChildren)
            for (let [prop, value] of pairs) {
                if (prop.startsWith('on')) {
                    elem.addEventListener(prop.substring(2).toLowerCase(), value)
                } else {
                    const parsed = this.extractWatcher(value, elem, prop)
                    if (typeof parsed === 'boolean') {
                        elem[prop] = parsed
                    } else {
                        elem.setAttribute(prop, parsed)
                    }
                }
            }
        }
        while (args.length) {
            const item = args.shift()
            elem.append(typeof item === 'string' ? this.extractWatcher(item, elem) : item)
        }
        return elem;
    }

    notify(action, props) {
        switch(action) {
            case 'change':
                const watch = this.watcher['game.' + props.name];
                if (!watch) break

                const game = this.game;
                for (let { node, expr, prop } of watch) {
                    const { parsed } = this.getParsed(expr);
                    if (prop) {
                        if (typeof parsed === 'boolean') {
                            node[prop] = parsed
                        } else {
                            node.setAttribute(prop, parsed)
                        }
                    } else {
                        node.innerText = parsed
                    }
                }
                break
        }
    }
}

export { RenderPlugin }