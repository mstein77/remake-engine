import { stringifyValues } from '../../src/build/helper.cjs'

test('stringifyValues', () => {
    expect(stringifyValues({})).toBeEmptyObject()
    expect(stringifyValues({foo: "bar", foo2: false, foo3: [1, 'bar']})).toContainAllEntries([
        ['foo', JSON.stringify("bar")],
        ['foo2', JSON.stringify(false)],
        ['foo3', JSON.stringify([1, 'bar'])]
    ])
})