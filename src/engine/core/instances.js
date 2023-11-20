import { FILTER } from "core/const"
import { toValues, d, getCanvasObjForDim } from "../helper/helper"
import { DefaultRenderPlugin } from "../plugins/DefaultRenderPlugin"
import { DefaultTouchControlsPlugin } from "../plugins/DefaultTouchControlsPlugin"
import { ResourceManager } from "./resources"
import Fetcher from "./fetcher/api"

/**
 * @type {ResourceManager}
 */
let RL = null
/**
 * @type {StorageManager}
 */
let game = null
let system = null
let filterer = null
let renderPlugin = null
let touchControlsPlugin = null

class PaneRegistry {

    constructor() {
        this.registry = new Map()
    }

    add(name, cls, props = {}) {
        this.registry.set(cls, { name, cls, ...props })
    }

    get(cls) {
        return this.registry.get(cls)
    }

    getAll() {
        return this.registry.values()
    }
}

class System {

    constructor() {
        this.renderingEngine = this.extractRenderingEngine()
        this.isMobile = this.extractIsMobile()
        this.supportsTouch = this.extractHasTouch()
        this.supportsFullscreen = this.setFullscreenApi()
        this.supportsOrientation = this.setScreenOrientationApi()

        console.log(
            `System Information | ` +
            `Rendering Engine: ${this.renderingEngine} | `+
            `Mobile: ${this.isMobile ? 'true' : 'false'} | ` +
            `Touch: ${this.supportsTouch ? 'true' : 'false'} | ` +
            `Orientation: ${this.supportsOrientation ? this.getScreenOrientation() : 'false'} | ` +
            `UserAgent: ${navigator.userAgent}`
        )
    }

    setFullscreenApi() {
        this.fullscreenChangeEvent = undefined
        this.isFullscreen = () => false
        this.requestFullscreen = () => Promise.reject('Fullscreen mode not supported!')
        this.exitFullscreen = () => Promise.reject('Fullscreen Mode not supported')

        const fullscreenEnabledKey = this.getExistingKey(
            document, 'fullscreenEnabled', 'webkitFullscreenEnabled', 'mozFullScreenEnabled', 'msFullscreenEnabled'
        )
        if (fullscreenEnabledKey & !document[fullscreenEnabledKey]) return false

        const fullscreenElementKey = this.getExistingKey(
            document, 'fullscreenElement', 'webkitCurrentFullScreenElement', 'msFullscreenElement'
        )
        if (!fullscreenElementKey) {
            const fullscreenKey = this.getExistingKey(
                document, 'fullscreen', 'webkitIsFullScreen', 'mozFullScreen', 'msFullscreen'
            )
            if (fullscreenKey) this.isFullscreen = () => document[fullscreenKey]
        } else {
            this.isFullscreen = () => document[fullscreenElementKey] !== null
        }
        this.fullscreenChangeEvent = this.getExistingEventType(
            document, 'fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'
        )
        const requestFullscreenKey = this.getExistingKey(
            document.body, 'requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'
        )
        if (requestFullscreenKey) this.requestFullscreen = elem => elem[requestFullscreenKey]()

        const exitFullscreenKey = this.getExistingKey(
            document, 'exitFullscreen', 'webkitCancelFullScreen', 'mozCancelFullScreen', 'msExitFullscreen'
        )
        if (exitFullscreenKey) this.exitFullscreen = elem => document[exitFullscreenKey]()

        return true
    }

    setScreenOrientationApi() {
        this.getScreenOrientation = () => undefined
        this.orientationChangeEvent = undefined
        this.lockOrientation = () => Promise.reject('No orientation locking supported')
        this.unlockOrientation = () => Promise.reject('No orientation unlocking supported')
        this.supportsOrientationLock = false
        const orientationKey = this.getExistingKey(
            screen, 'orientation', 'mozOrientation', 'msOrientation'
        )
        if (orientationKey) {
            this.getScreenOrientation = () => screen[orientationKey].type
            this.orientationChangeEvent = 'change'
            this.orientationEventElem = screen[orientationKey]
            this.lockOrientation = orientation => screen[orientationKey].lock(orientation)
            this.unlockOrientation = () => screen[orientationKey].unlock()
            this.supportsOrientationLock = true
        } else if ('orientation' in window) {
            const value2name = {
                '0': 'landscape-primary',
                '90': 'portrait-primary',
                '180': 'landscape-secondary',
                '-90': 'portrait-secondary'
            }
            this.getScreenOrientation = () => {
                if (window.orientation in value2name) return value2name[value2name]
            }
            this.orientationChangeEvent = this.getExistingEventType(window, 'orientationchange')
            this.orientationEventElem = window
            // TODO: https://stackoverflow.com/questions/5298467/prevent-orientation-change-in-ios-safari
            this.lockOrientation = orientation => Promise.reject('TODO...')
            this.unlockOrientation = () => Promise.reject('TODO...')
        }
        return !!this.orientationChangeEvent
    }

    getExistingMethod(elem, ...keys) {
        for (const key of keys) if (key in elem) return elem[key]
    }

    getExistingEventType(elem, ...keys) {
        for (const key of keys) if ('on' + key in elem) return key
    }

    getExistingKey(elem, ...keys) {
        for (const key of keys) if (key in elem) return key
    }

    extractRenderingEngine() {
        const UA = navigator.userAgent.toLowerCase()
        const match2engine = {
            applewebkit: 'WebKit',
            gecko: 'Gecko',
            opera: 'Presto',
            trident: 'Trident',
            edge: 'EdgeHTML',
            chrome: 'Blink'
        }
        for (const [ match, engine ] of Object.entries(match2engine)) {
            if (UA.indexOf(match) !== -1) return engine
        }
    }

    extractIsMobile() {
        if (!this.renderingEngine) return false

        return /mobi/i.test(navigator.userAgent.toLowerCase())
    }

    extractHasTouch() {
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
        let hasTouch = false
        if ('maxTouchPoints' in navigator) {
            return navigator.maxTouchPoints > 0
        }
        if ('msMaxTouchPoints' in navigator) {
            return navigator.msMaxTouchPoints > 0
        }
        const mQ = matchMedia?.("(pointer:coarse)")
        if (mQ?.media === "(pointer:coarse)") {
            return !!mQ.matches
        }
        if ("orientation" in window) return true
        const UA = navigator.userAgent
        return (
            /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
            /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
        )
    }
}

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
        let data = [ canvas, offX, offY, width, height ];
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
                            data = [getCanvasObjForDim(data[3], data[4]), 0, 0, data[3], data[4]];
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
                data = [getCanvasObjForDim(data[3], data[4]), 0, 0, data[3], data[4]];
            }
            data[0].ctx.putImageData(imageData, 0, 0);
        }
        return data;
    }
}

class AutoIdGenerator {

    constructor() {
        this.context2ids = {}
        this.context = null
    }

    startContext(value) {
        this.context = value
    }

    endContext() {
        this.context = null
    }

    getContext() {
        return this.context
    }

    getIdPrefix() {
        if (this.context === null) return ''
        return this.context === 'screen' ? 'screen_' + inst.game.getActiveScreenRenderer().scope : this.context
    }

    getNewId(name) {
        const context = this.context
        if (context === null)
            throw Error('Cannot generate new id outside context')

        let contextMap = this.context2ids[this.context]
        if (!contextMap) {
            contextMap = new Map()
            this.context2ids[context] = contextMap
        }

        let no = contextMap.get(name)
        if (no === undefined) no = 0
        no++
        contextMap.set(name, no)
        return this.getIdPrefix() + '_' + name + '_' + no
    }

    clearAllIds() {
        for (const map of toValues(this.context2ids)) {
            map.clear()
        }
    }

    clearScreenIds() {
        const map = this.context2ids.screen
        if (map) map.clear()
    }
}
let autoIds = null


const inst = {
    setGame: value => {
        if (game !== null) throw Error('There is already a running game instance!')
        game = value
    },
    setRenderPlugin: value => {
        renderPlugin = value
    },
    get renderPlugin() {
        if (renderPlugin === null) {
            renderPlugin = new DefaultRenderPlugin()
        }
        return renderPlugin
    },
    setTouchControlsPlugin: value => {
        touchControlsPlugin = value
    },
    get touchControlsPlugin() {
        if (touchControlsPlugin === null) {
            touchControlsPlugin = new DefaultTouchControlsPlugin()
        }
        return touchControlsPlugin
    },
    setRL: (baseUrl, ...params) => RL = new ResourceManager(
        Fetcher(baseUrl),
        ...params
    ),
    get RL() {
        if (RL) return RL
        throw Error('Resource Loader not yet initialized!')
    },
    get game() {
        if (game) return game
        throw Error('Game not yet instantiated!')
    },
    get system() {
        if (!system) {
            system = new System()
        }
        return system
    },
    get filterer() {
        if (!filterer) {
            filterer = new BitmapFilterer()
        }
        return filterer
    },
    get plugins() {
        const plugins = [ inst.renderPlugin ];
        if (system.supportsTouch) {
            plugins.push(inst.touchControlsPlugin)
        }
        return plugins
    },
    get autoIds() {
        if (autoIds === null) autoIds = new AutoIdGenerator()
        return autoIds
    },
    paneRegistry: new PaneRegistry()
}

export default inst