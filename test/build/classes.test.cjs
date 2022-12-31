const { extractEnvOverwrites, castEnvValue } = require('../../src/build/classes.cjs')

test('castEnvValue', () => {
    // unknown type
    expect(() => castEnvValue('', '')).toThrow()
    expect(() => castEnvValue('foo', 'bar')).toThrow()

    // bool
    expect(() => castEnvValue('bool', '')).toThrow()
    expect(() => castEnvValue('bool', 'foo')).toThrow()
    expect(() => castEnvValue('bool', undefined)).toThrow()
    expect(() => castEnvValue('bool', null)).toThrow()
    expect(() => castEnvValue('bool', 0)).toThrow()
    expect(() => castEnvValue('bool', {true: true})).toThrow()
    expect(() => castEnvValue('bool', false)).toThrow()
    expect(() => castEnvValue('bool', true)).toThrow()

    for (const value of ['false', 'FALSE', 'off', 'OFF', '0'])
        expect(castEnvValue('bool', value)).toBeFalse()

    for (const value of ['true', 'TRUE', 'on', 'ON', '1'])
        expect(castEnvValue('bool', value)).toBeTrue()

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
    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_BASEURL: 'bar'}))
        .toContainEntry(['baseUrl', 'bar'])

    // check underscore removal
    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_BASE_URL: 'bar'}))
        .toContainEntry(['baseUrl', 'bar'])

    expect(extractEnvOverwrites({envPrefix: 'foo_'}, {FOO_BA__SE_URL: 'bar'}))
        .toContainEntry(['baseUrl', 'bar'])
})