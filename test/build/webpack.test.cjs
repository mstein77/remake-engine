const { getTargetWebpackConfigs } = require('../../src/build/webpack.cjs')
const ServerWithNodeHosting = require('../../src/build/hostings/server-with-nodejs.cjs')
const { getResolvedDefaultConfig } = require("../../src/build/const.cjs")
const { d, toPairs } = require("../../src/shared/classes/helper.cjs")
const path = require("path")
const { FileOpQueue }  = require("../../src/build/fileOps.cjs")

describe('getWebpackConfigs', () => {

    const getPathValue = (obj, path) => {
        if (path.length === 0) return obj

        const key = path.shift()
        if (!(key in obj)) return

        return getPathValue(obj[key], path)
    }

    const expectPathValue = (obj, path2values) => {
        for (const [ path, expected ] of toPairs(path2values)) {
            const actual = getPathValue(obj, path.split('.'))
            expect(actual, `Expected value "${expected}" in object path "${path}" but ` + (
                actual === undefined ? 'path does not exist' : `got "${actual}"`)
            ).toBe(expected)
        }
    }

    const getConfig = (isDist, overwrite) => ({
        ...getResolvedDefaultConfig(isDist),
        ...overwrite
    })

    const deps = {
        dirname: __dirname,
        RMK_GAME_DIR: 'foo'
    }
    const absPath = {
        engine: ( ...relPath ) => path.resolve( deps.dirname, '../../../', ...relPath ),
        src: ( ...relPath ) => path.resolve(absPath.engine('src'), ...relPath ),
        game: ( ...relPath ) => path.resolve(absPath.engine(deps.RMK_GAME_DIR ? deps.RMK_GAME_DIR : '../../../'), ...relPath ),
        resources: ( ...relPath ) => path.resolve(absPath.game( 'resources'), ...relPath ),
        dist: ( ...relPath ) => path.resolve(absPath.game('dist'), ...relPath ),
        tmp: ( ...relPath ) => path.resolve(absPath.engine('tmp'), ...relPath )
    }
    const gamePackageJson = {
        name: 'testGame',
        version: '1.0.0'
    }
    const enginePackageJson = {
        name: 'engine',
        version: '1.0.0a'
    }

    const getFileDeps = () => ({
        absPath,
        queue: new FileOpQueue(true),
        syncFs: {}
    })

    const buildDev = (config, name = 'game') => {
        const matches = getTargetWebpackConfigs(
            {config: getConfig(false, config), gamePackageJson, enginePackageJson},
            getFileDeps(),
            new ServerWithNodeHosting(),
            {isDist: false}
        ).filter(obj => obj.name === name)
        return matches.length ? matches[0] : undefined
    }
    const buildDist = (config, name = 'game') => {
        const matches = getTargetWebpackConfigs(
            {config: getConfig(true, config), gamePackageJson, enginePackageJson},
            getFileDeps(),
            new ServerWithNodeHosting(),
            {isDist: true}
        ).filter(obj => obj.name === name)
        return matches.length ? matches[0] : undefined
    }

    test('webpack mode & dev server', () => {
        {
            const r = buildDev()
            expectPathValue(r,
                {
                    mode: 'development',
                    'devServer.port': 8080
                }
            )
        }

        {
            const r = buildDist()
            expectPathValue(r, {
                    mode: 'production',
                    devServer: undefined
                }
            )
        }
    })

    test('server build', () => {
        expect(buildDev({}, 'server')).toBeUndefined()
        {
            const r = buildDist({}, 'server')
            expectPathValue(r, {
                name: 'server',
                target: 'node',
                devServer: undefined
            })
        }

    })

    test('compress', () => {
        {
            const r = buildDev({compress: true})
            expectPathValue(r,
                {
                    'devServer.compress': true
                }
            )
        }

        {
            const r = buildDev({compress: false})
            expectPathValue(r,
                {
                    'devServer.compress': false
                }
            )
        }
    })

    test('open browser', () => {
        {
            const r = buildDev({openBrowser: false})
            expectPathValue(r,
                {
                    'devServer.open': false
                }
            )
        }

        {
            const r = buildDev()
            expectPathValue(r,
                {
                    'devServer.open': true
                }
            )
        }

        {
            const r = buildDev({openBrowser: 'chrome'})
            expectPathValue(r,
                {
                    'devServer.open.app.name': 'chrome'
                }
            )
        }
    })
})