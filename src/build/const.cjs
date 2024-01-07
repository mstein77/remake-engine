const { toValues, toPairs } = require("../shared/classes/helper.cjs");
const { buildLogLevels } = require("../shared/classes/console.cjs")

const DEPLOY_METHOD = {
    UPLOAD_ROOT: 'upload-dist-to-root',
    UPLOAD_PUBLIC: 'upload-dist-to-public',
    CHECKOUT: 'checkout'
}
const RESOURCE_LOADING = {
    API: 'api',
    API_ALL: 'api-all',
    LOCAL: 'local',
    LOCAL_ALL: 'local-all',
    STATIC_ALL: 'static-all'
}
const DELIVERABLE = {
    WEBAPP: 'webapp',
    PWA: 'pwa',
    HTML: 'html',
    EXE_WINDOWS: 'exe.windows',
    EXE_JAVA: 'exe.java',
    APP_ANDROID: 'app.android',
    APP_APPLE: 'app.apple'
}

const key2params = {
    title: {type: 'string', default: 'Remake Engine Game V0.1'},
    browsers: {type: 'string', default: '>2.25%, not ie 11, not op_mini all'},
    editor: {type: 'bool', default: true, distDefault: false},
    gzip: {type: 'bool', default: true},
    resourceLoading: {type: 'string', values: toValues(RESOURCE_LOADING), default: RESOURCE_LOADING.API},
    apiMaxJsonSize: {type: 'string', default: '10mb'},
    deployMethod: {type: 'string', values: toValues(DEPLOY_METHOD), default: DEPLOY_METHOD.CHECKOUT},
    hosting: {type: 'string', default: 'server-with-node-js', values: ['aws', 'heroku', 'server-with-nodejs', 'server-without-nodejs']},
    deliverable: {type: 'string', default: DELIVERABLE.WEBAPP, values: toValues(DELIVERABLE)},
    minimize: {type: 'bool', default: false, distDefault: true},
    server: {type: 'bool', default: true},
    https: {type: 'bool', default: false, distDefault: true},
    host: {type: 'string', default: 'localhost'},
    port: {type: 'uint', default: 8080},
    path: {type: 'string', default: ''},
    sourceMaps: {type: 'bool', default: true, distDefault: false},
    sourceMapType: {type: 'string', default: 'eval-cheap-source-map'},
    openBrowser: {type: 'string', default: 'default'},
    staticTypes: {type: 'string', default: 'audio,video'},
    buildLogging: {type: 'string', default: 'normal', values: buildLogLevels},
    clientLogging: {type: 'string', default: 'info'},
    serverLogging: {type: 'string', default: 'info'},
    stats: {type: 'string', default: 'normal'},
    envPrefix: {type: 'string', default: 'RMK_'},
    esLint: {type: 'bool', default: false}
}

/**
 * Returns an unresolved config object with default values for dev and dist environment
 *
 * @returns {object}
 */
const getDefaultConfig = () => {
    const json = {}
    const dist = {}
    for (const [ key, params ] of toPairs(key2params)) {
        json[key] = params.default
        if (!params.distDefault) continue
        dist[key] = params.distDefault
    }
    json.dist = dist
    return json
}

/**
 * Returns a resolved config object with default values for dist or dev environment
 *
 * @param {boolean} isDist
 *
 * @returns {object}
 */
const getResolvedDefaultConfig = isDist => {
    const json = {}
    for (const [ key, params ] of toPairs(key2params)) {
        json[key] = isDist && params.distDefault !== undefined ? params.distDefault : params.default
    }
    return json
}

module.exports = {
    DEPLOY_METHOD,
    RESOURCE_LOADING,
    key2params,
    getResolvedDefaultConfig,
    getDefaultConfig
}