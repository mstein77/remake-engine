import { internal, runConfigIntegrityChecks } from '../../src/build/config.cjs'
const { MSG, extractEnvOverwrites, castEnvValue, extractAppEnvOverwrites } = internal
import { RESOURCE_LOADING, getResolvedDefaultConfig } from '../../src/build/config.cjs'
import { d, toValues, toKeys } from '../../src/shared/helper.cjs'
import ServerWithNodejs from '../../src/build/hostings/server-with-nodejs.cjs'
import ServerWithoutNodeJs from '../../src/build/hostings/server-without-nodejs.cjs'
test('castEnvValue', () => {
    // unknown type
    expect(() => castEnvValue('', '')).toThrow()
    expect(() => castEnvValue('foo', 'bar', 'context')).toThrow()

    // bool
    expect(() => castEnvValue('bool', '')).toThrow()
    expect(() => castEnvValue('bool', 'foo')).toThrow()
    expect(() => castEnvValue('bool', 'foo', 'context')).toThrow()
    expect(() => castEnvValue('bool', undefined)).toThrow()
    expect(() => castEnvValue('bool', null)).toThrow()
    expect(() => castEnvValue('bool', 0)).toThrow()
    expect(() => castEnvValue('bool', {true: true})).toThrow()
    expect(() => castEnvValue('bool', false)).toThrow()
    expect(() => castEnvValue('bool', true)).toThrow()

    for (const value of ['false', 'FALSE', 'off', 'OFF', '0'])
        expect(castEnvValue('bool', value), `Value "${value}" should be casted to false`).toBeFalse()

    for (const value of ['true', 'TRUE', 'on', 'ON', '1'])
        expect(castEnvValue('bool', value), `Value "${value}" should be casted to true`).toBeTrue()

    // int
    expect(() => castEnvValue('int', '')).toThrow()
    expect(() => castEnvValue('int', 'foo')).toThrow()
    expect(() => castEnvValue('int', undefined)).toThrow()
    expect(() => castEnvValue('int', null)).toThrow()
    expect(() => castEnvValue('int', 0)).toThrow()
    expect(() => castEnvValue('int', {true: true})).toThrow()
    expect(() => castEnvValue('int', false)).toThrow()
    expect(() => castEnvValue('int', true)).toThrow()
    expect(() => castEnvValue('int', '-')).toThrow()
    expect(() => castEnvValue('int', '5-')).toThrow()
    expect(() => castEnvValue('int', '0.5')).toThrow()

    expect(castEnvValue('int', '0')).toBe(0)
    expect(castEnvValue('int', '100')).toBe(100)
    expect(castEnvValue('int', '-100')).toBe(-100)

    // uint
    expect(() => castEnvValue('uint', '')).toThrow()
    expect(() => castEnvValue('uint', 'foo')).toThrow()
    expect(() => castEnvValue('uint', undefined)).toThrow()
    expect(() => castEnvValue('uint', null)).toThrow()
    expect(() => castEnvValue('uint', 0)).toThrow()
    expect(() => castEnvValue('uint', {true: true})).toThrow()
    expect(() => castEnvValue('uint', false)).toThrow()
    expect(() => castEnvValue('uint', true)).toThrow()
    expect(() => castEnvValue('uint', '-')).toThrow()
    expect(() => castEnvValue('uint', '5-')).toThrow()
    expect(() => castEnvValue('uint', '0.5')).toThrow()
    expect(() => castEnvValue('uint', '-100')).toThrow()

    expect(castEnvValue('uint', '0')).toBe(0)
    expect(castEnvValue('uint', '100')).toBe(100)

    //string
    expect(() => castEnvValue('string', undefined)).toThrow()
    expect(() => castEnvValue('string', null)).toThrow()
    expect(() => castEnvValue('string', 0)).toThrow()
    expect(() => castEnvValue('string', {true: true})).toThrow()
    expect(() => castEnvValue('string', false)).toThrow()

    expect(castEnvValue('string', '')).toBe('')
    expect(castEnvValue('string', 'FOO')).toBe('FOO')
    expect(castEnvValue('string', 'foo')).toBe('foo')
})

test('extractEnvOverwrites', () => {

    // empty handling
    expect(extractEnvOverwrites({}, {}))
        .toBeEmptyObject()

    expect(extractEnvOverwrites({}, {BAR: 'FOO'}))
        .toBeEmptyObject()

    expect(extractEnvOverwrites({envPrefix: 'FOO_'}, {}))
        .toBeEmptyObject()

    // check case
    expect(extractEnvOverwrites({envPrefix: 'FOO_'}, {BAR: 'FOO'}))
        .toBeEmptyObject()

    expect(extractEnvOverwrites({envPrefix: 'FOO_'}, {FOO_EDITOR: 'true'}))
        .toContainEntry(['editor', true])

    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_EDITOR: 'true'}))
        .toContainEntry(['editor', true])

    // check camel-cased return
    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_DEPLOYMENTMETHOD: 'bar'}))
        .toContainEntry(['deploymentMethod', 'bar'])

    // check underscore removal
    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_DEPLOYMENT_METHOD: 'bar'}))
        .toContainEntry(['deploymentMethod', 'bar'])

    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_DE__PLOYMENT_METHOD: 'bar'}))
        .toContainEntry(['deploymentMethod', 'bar'])
})

test('extractAppEnvOverwrites', () => {
    expect(extractAppEnvOverwrites({}, {}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({editor: true}, {}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({editor: true}, {APP_ENV: 'foo'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[]': true}, {}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[]': true}, {APP_ENV: ''}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[bar]': true}, {APP_ENV: 'foo'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[foo]': true}, {APP_ENV: 'FOO'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'[foo]': true}, {APP_ENV: 'foo'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[foo]x': true}, {APP_ENV: 'foo'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[foo][bar]': true}, {APP_ENV: 'foo'}))
        .toBeEmptyObject()

    expect(extractAppEnvOverwrites({'editor[foo]': true}, {APP_ENV: 'foo'}))
        .toContainAllEntries([['editor', true]])

    expect(extractAppEnvOverwrites({
        'editor[foo]': true,
        'server[foo2]': false
    }, {APP_ENV: 'foo'}))
        .toContainAllEntries([['editor', true]])

    expect(extractAppEnvOverwrites({
        'editor[foo]': true,
        'server[foo2]': false,
        'baseUrl[foo]': 'xy'
    }, {APP_ENV: 'foo'}))
        .toContainAllEntries([['editor', true], ['baseUrl', 'xy']])
})

test('runConfigIntegrityChecks', () => {
    const getTestConfig = (isDist, overwrite = {}) => {
        return { ...getResolvedDefaultConfig(isDist), ...overwrite }
    }

    const getPairs = (config, overwrites = {}) => {
        const checkConfig = { ...config }
        if ([RESOURCE_LOADING.API_ALL, RESOURCE_LOADING.LOCAL_ALL].includes(checkConfig.resourceLoading)) {
            checkConfig.staticTypes = ''
        } else if (checkConfig.resourceLoading === RESOURCE_LOADING.STATIC_ALL) {
            checkConfig.staticTypes = 'json,image,audio,video'
        }
        return Object.entries({ ...checkConfig, ...overwrites })
    }

    const runIntegrityChecks = (config, isDist) => runConfigIntegrityChecks(config, {}, {}, {}, { isDist })

    const allIntegrityChecksOk = (overwrites, isDist) => {
        for (const overwrite of overwrites) {
            const rawConfig = getTestConfig(isDist, overwrite)
            const rawPairs = getPairs(rawConfig)
            const { config, warnings } = runIntegrityChecks(
                rawConfig, {}, {}, {}, { isDist }
            )
            expect(config)
                .toContainAllEntries(rawPairs)
            expect(warnings)
                .toBeEmpty()
        }
    }

    const distBase = {editor: false}
    allIntegrityChecksOk(
        [
            { ...distBase },
            { ...distBase, resourceLoading: RESOURCE_LOADING.API },
            { ...distBase, resourceLoading: RESOURCE_LOADING.API_ALL },
            { ...distBase, resourceLoading: RESOURCE_LOADING.STATIC_ALL },
            { ...distBase, resourceLoading: RESOURCE_LOADING.LOCAL_ALL },
            { ...distBase, resourceLoading: RESOURCE_LOADING.LOCAL }
        ],
        true
    )

    allIntegrityChecksOk(
        [
            {},
            {resourceLoading: RESOURCE_LOADING.API}
        ],
        false
    )

    {
        const rawConfig = getTestConfig(true,{
            server: false,
            editor: true
        })
        expect(() => runIntegrityChecks(rawConfig, true))
            .toThrow(MSG.enableEditor)
    }
    {
        const rawConfig = getTestConfig(false,{
            hosting: 'server-without-nodejs',
            server: true
        })
        expect(() => runIntegrityChecks(rawConfig, true))
            .toThrow(MSG.noServerNodejs)
    }
    {
        const rawConfig = getTestConfig(false,{
            editor: false
        })
        const rawPairs = getPairs(rawConfig, {editor: true})
        const { config, warnings } = runIntegrityChecks(rawConfig, false)
        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude('Requested no editor but the editor is required in dev environment, using editor instead')
    }
    {
        const rawConfig = getTestConfig(false,{
            staticTypes: 'audio,video,image,json',
            resourceLoading: RESOURCE_LOADING.API
        })
        const rawPairs = getPairs(rawConfig, {resourceLoading: RESOURCE_LOADING.STATIC_ALL})
        const { config, warnings } = runIntegrityChecks(rawConfig, false)
        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude(MSG.allStaticApi)
    }
    {
        const rawConfig = getTestConfig(false,{
            editor: true,
            resourceLoading: RESOURCE_LOADING.LOCAL
        })
        const rawPairs = getPairs(rawConfig, {resourceLoading: RESOURCE_LOADING.API})
        const { config, warnings } = runIntegrityChecks(rawConfig, false)
        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude(MSG.localToApi)
    }
    {
        const rawConfig = getTestConfig(false,{
            resourceLoading: RESOURCE_LOADING.LOCAL
        })
        const rawPairs = getPairs(rawConfig, {resourceLoading: RESOURCE_LOADING.API})
        const { config, warnings } = runIntegrityChecks(rawConfig, false)
        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude(MSG.localToApi)
    }
    {
        const rawConfig = getTestConfig(false,{
            editor: true,
            resourceLoading: RESOURCE_LOADING.LOCAL_ALL
        })
        const rawPairs = getPairs(rawConfig, {resourceLoading: RESOURCE_LOADING.API, staticTypes: 'audio,video'})
        const { config, warnings } = runIntegrityChecks(rawConfig, false)

        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude(MSG.localAllToApi)
    }
    {
        const rawConfig = getTestConfig(false,{
            resourceLoading: RESOURCE_LOADING.LOCAL_ALL
        })
        const rawPairs = getPairs(rawConfig, {resourceLoading: RESOURCE_LOADING.API,             staticTypes: 'audio,video'
        })
        const { config, warnings } = runIntegrityChecks(rawConfig, false)
        expect(config)
            .toContainAllEntries(rawPairs)
        expect(warnings)
            .toInclude(MSG.localAllToApi)

    }
})