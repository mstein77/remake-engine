const elem = (tagName, ...args) => {
    const elem = document.createElement(tagName)
    const propsOrChildren = args.shift();
    if (typeof propsOrChildren === 'string') {
        elem.append(propsOrChildren)
    } else if (typeof propsOrChildren === 'object') {
        if (propsOrChildren instanceof Node) {
            elem.append(propsOrChildren)
        } else {
            const pairs = Object.entries(propsOrChildren)
            for (let [prop, value] of pairs) {
                const parsed = value
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
        if (!item) continue
        elem.append(item)
    }
    return elem;

}

const div = ( ...args ) => elem('div', ...args )

const stackH = ( stackProps, ...props ) => {
    if (typeof stackProps === 'object' && !(stackProps instanceof Node)) {
        let { class: stackCls = '', ...objProps } = stackProps
        if (!stackCls.includes('stack-h')) stackCls += ' stack-h'
        return div({ class: stackCls, ...objProps }, ...props)
    }
    return div({ class: `stack-h ${typeof stackProps === 'string' ? stackProps : ''}`}, typeof stackProps !== 'string' ? stackProps : null, ...props)
}
const stackV = ( stackProps, ...props ) => {
    if (typeof stackProps === 'object' && !(stackProps instanceof Node)) {
        let { class: stackCls = '', ...objProps } = stackProps
        if (!stackCls.includes('stack-v')) stackCls += ' stack-v'
        return div({ class: stackCls, ...objProps }, ...props)
    }
    return div({ class: `stack-v ${typeof stackProps === 'string' ? stackProps : ''}`}, typeof stackProps !== 'string' ? stackProps : null, ...props)
}

// TODO replace this
const getContainerElem = (viewPortX, viewPortY, offX, offY, cls = '') => {
    const elem = document.createElement('div')
    elem.setAttribute('style', 'display: inline; margin: 0px; padding: 0px; position: absolute; width: ' + viewPortX + 'px; height: ' + viewPortY + 'px; top: ' + offY + 'px; left: ' + offX + 'px; overflow: hidden')
    if (cls) elem.setAttribute('class', cls)
    return elem
}

export {
    div,
    getContainerElem,
    stackH,
    stackV
}