import {stringifyValues, id2name, getHtmlTags, getIconMimeType, getReplaceMetaVars, getJsonObjectFromFile, getDefaultFromModule } from '../../src/build/helper.cjs'
import path from "path"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('getJsonObjectFromFile', () => {
    expect(() => getJsonObjectFromFile()).toThrow()
    expect(getJsonObjectFromFile(path.resolve(__dirname, '../../package.json'))).toBeObject()
})

test('getDefaultFromModule', () => {
    expect(getDefaultFromModule(path.resolve(__dirname, '../../src/build/asset.cjs'))).toBeObject()
    expect(() => getDefaultFromModule(path.resolve(__dirname, '../../src/build/asset.cjs'), 'string')).toThrow('must return')
    expect(() => getDefaultFromModule(path.resolve(__dirname, 'foo.cjs'))).toThrow()
    expect(getDefaultFromModule(path.resolve(__dirname, 'foo.cjs'), 'object', false)).toBeUndefined()
})

test('stringifyValues', () => {
    expect(stringifyValues({})).toBeEmptyObject()
    expect(stringifyValues({foo: "bar", foo2: false, foo3: [1, 'bar']})).toContainAllEntries([
        ['foo', JSON.stringify("bar")],
        ['foo2', JSON.stringify(false)],
        ['foo3', JSON.stringify([1, 'bar'])]
    ])
})

test('id2name', () => {
    expect(id2name('')).toEqual('')
    expect(id2name('a')).toEqual('A')
    expect(id2name('A')).toEqual('A')
    expect(id2name('1')).toEqual('1')
    expect(id2name('12')).toEqual('12')
    expect(id2name('abc1')).toEqual('Abc 1')
    expect(id2name('abc12de')).toEqual('Abc 12 De')
    expect(id2name('ABC12DE')).toEqual('ABC 12 DE')
    expect(id2name('aB')).toEqual('A B')
    expect(id2name('anBn')).toEqual('An Bn')
})

test('getHtmlTag', () => {
    expect(getHtmlTags('foo', [])).toEqual('')
    expect(getHtmlTags('foo', [{}])).toEqual('<foo>')
    expect(getHtmlTags('foo', [{}, {}])).toEqual('<foo><foo>')
    expect(getHtmlTags('foo', [{bar: 'foo'}])).toEqual('<foo bar="foo">')
    expect(getHtmlTags('foo', [{bar: 'foo'}, {}, {bar2: 2, x: 'y'}])).toEqual('<foo bar="foo"><foo><foo bar2="2" x="y">')
})

test('getIconMimeType', () => {
    expect(getIconMimeType('png')).toEqual('image/png')
})

test('getReplaceMetaVars', () => {
    const r = getReplaceMetaVars({foo: 'bar'})
    expect(r('test')).toEqual('test')
    expect(r('test {config.foo} bar')).toEqual('test {config.foo} bar')
    expect(r('test {foo} bar')).toEqual('test bar bar')
    expect(r('test {foo} bar {foo}')).toEqual('test bar bar bar')
    expect(r('test {foo} bar')).toEqual('test bar bar')

    const r2 = getReplaceMetaVars({foo: 'bar', foo2: 'bar2'}, {bla: '1'})
    expect(r2('test {foo} {foo2} {config.bla}')).toEqual('test bar bar2 1')

})