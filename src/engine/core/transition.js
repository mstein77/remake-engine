import inst from "./instances"
import { PaneTreeProvider, PaneTreeRenderer } from "./screen"
import { ResourceRequest } from "./classes"
import { getCosinePath, getSinePath, isObject, isString, toPairs, d } from "helper/helper"
import { HtmlPane } from "../index"
import { BackgroundPane } from "../index"

const getIdAndOptions = idOrOptions => {

    if (isString(idOrOptions)) {
        return {id: idOrOptions, options: {}}
    } else if (!isObject(idOrOptions)) {
        throw Error(`Expected string or object`)
    } else if (!idOrOptions.id) {
        throw Error(`Object must have id property`)
    }
    return idOrOptions
}

class TransitionImpl extends PaneTreeProvider {

    getPaneTreeRenderer(source, target, options = {}) {
        const game = inst.game
        const renderer = new PaneTreeRenderer()
        renderer.enableAutoLoad()
        renderer.enableAutoBuild()
        renderer.enableAutoHandling()
        renderer.init()

        const { callback } = this.initHandler
        renderer.setBuilder(( ...args ) => {
            inst.autoIds.startContext('trans')
            const frameHandler = callback( ...args )
            inst.autoIds.endContext()
            return frameHandler
        }, () => ({ options, target, source, game, screen: renderer.paneTree, transition: renderer, ...inst.RL.resources }))

        return renderer
    }

    getLoader() {
        const { loader } = this.initHandler
        return loader
    }
}

const Transition = (...args) => new TransitionImpl(...args)

const FadeInOutTransition = Transition(
    ({ options, screen, source, target, transition }) => {

        const { frames = 45, freezeSource = true, freezeTarget = false, color = '#000000' } = options
        const parts = [
            {path: getCosinePath(1.0, 0.0, frames), pos: 0},
            {pos: 0, max: 1},
            {path:  getCosinePath(0.0, 1.0, frames), pos: 0}
        ]
        target.hide()
        screen.addPane(BackgroundPane({ color }))
        target.triggerLoading()

        if (freezeSource) source.triggerEnd()
        transition.setStyle('opacity', 0.0)
        let index = 0

        return ({ target, transition }) => {
            if (index >= parts.length) {
                transition.triggerDestroy()
                if (freezeTarget) target.triggerHandling()
                return
            }
            const curr = parts[index]
            if (curr.max) {
                if (target.isLoaded()) {
                    freezeTarget ? target.triggerBuild() : target.triggerHandling()
                    target.show()
                    source.triggerDestroy()
                    if (curr.pos === curr.max) index++
                    curr.pos++
                }
                return
            }
            if (curr.pos >= curr.path.length) {
                index++
                return
            }
            transition.setStyle('opacity', curr.path[curr.pos])
            curr.pos++
        }
    })

const BlendTransition = Transition(
    ({ options, screen, source, target }) => {

        const { frames = 45, freezeSource = true, freezeTarget = true } = options
        const bgPane = HtmlPane({html: '<div class="center-v transparent"><div class="stack-v center-child-h inner-space-v transparent"><div class="loading padding"></div></div></div>'})
        screen.addPane(bgPane)

        let pos = 0
        const path = getCosinePath(1.0, 0, frames)

        if (freezeSource) source.triggerEnd()
        freezeTarget ? target.triggerBuild() : target.triggerHandling()

        return ({ target, transition }) => {
            if (target.isBuild()) {
                if (pos === path.length) {
                    if (freezeTarget) target.triggerHandling()
                    transition.triggerDestroy()
                    return
                }
                pos++
            } else if (target.isLoaded() && transition.isVisible()) {
                transition.hide()
            }
            target.setStyle('opacity', path[pos])
        }
    }
)

const PushInTransition = Transition(
    ({ options, source, target, screen }) => {

        const { frames = 45, freezeSource = true, freezeTarget = true } = options
        const bgPane = HtmlPane({html: '<div class="center-v transparent"><div class="stack-v center-child-h inner-space-v transparent"><div class="loading padding"></div></div></div>'})
        screen.addPane(bgPane)

        let pos = 0
        const path = getSinePath(100, 0, frames)

        if (freezeSource) source.triggerEnd()
        freezeTarget ? target.triggerBuild() : target.triggerHandling()

        return ({ source, target, transition }) => {
            if (target.isBuild()) {
                if (pos === path.length) {
                    if (freezeTarget) target.triggerHandling()
                    transition.triggerDestroy()
                    return
                }
                pos++
            } else if (target.isLoaded() && transition.isVisible()) {
                transition.hide()
            }
            source.setStyle('left', -(100 - path[pos]) + '%')
            target.setStyle('left', path[pos] + '%')
        }
    }
)

const LoadingTransition = Transition(
    ({ screen, target, transition, source, options }) => {
        const { delay = 1, freezeSource = true } = options

        const bgPane = HtmlPane({html:
                '<div class="center-v transparent"><div class="stack-v center-child-h inner-space-v transparent"><div style="transform: scale(' + (inst.game.zoom > 1 ? 1 / inst.game.zoom : 1.0).toFixed(3) + '); transform-origin: center center;" class="loading padding"></div></div></div>'})
        screen.addPane(bgPane)

        target.triggerHandling()
        if (freezeSource) source.triggerEnd()
        transition.hide()
        return ({ frames, target, transition }) => {
            if (target.isHandling()) {
                transition.triggerDestroy()
                return
            }
            if (frames === 60 * delay) {
                transition.show()
            } else {
                transition.hide()
            }
        }
    }
)

let isLocked = true
let transitions = {}
const TransitionRegistry = {

    clear: () => {
        transitions = {}
        isLocked = false
    },
    add: (id, transition, options = {}) => {
        if (isLocked)
            throw Error(`Cannot add transition "${id}". Registration only allowed in game init handler`)

        transitions[id] = {
            transition,
            options
        }
    },
    addAll: obj => {
        if (isLocked)
            throw Error(`Cannot add transitions. Registration only allowed in game init handler`)

        for (const [ id, transition ] of toPairs(obj)) {
            transitions[id] = {
                transition,
                options: {}
            }
        }
    },
    setDefaults: (id, options) => {
        if (isLocked) return

        const transition = transitions[id]
        if (!transition)
            throw Error(`No transition with id "${id}" was registered`)

        transition.options = options
    },
    get: (idOrOptions) => {
        const { id, ...options } = getIdAndOptions(idOrOptions)
        const obj = transitions[id]
        if (obj === undefined)
            throw Error(`No transition with id "${id}" was registered`)

        return {
            id,
            transition: obj.transition,
            options: { ...obj.options, ...options }
        }
    },
    lock: () => {
        isLocked = true
    },
    getLoader: () => {
        const json = {}
        const audio = {}
        const image = {}

        for (const { transition } of Object.values(transitions)) {
            if (transition === null) continue

            const { resources } = transition.getLoader()
            if (resources.json) {
                Object.assign(json, resources.json)
            }
            if (resources.image) {
                Object.assign(image, resources.image)
            }
            if (resources.audio) {
                Object.assign(audio, resources.audio)
            }
        }
        return new ResourceRequest({ json, audio, image })
    }
}

export {
    Transition,
    TransitionRegistry,
    LoadingTransition,
    PushInTransition,
    BlendTransition,
    FadeInOutTransition
}