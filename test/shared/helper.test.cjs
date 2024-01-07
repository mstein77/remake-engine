const { setLogger, d, isNull, isString, isArray, isObject, isUrl, isDataUrl, ucfirst, union, without, intersect,
    trim, simpleType, csv2values, isVersionEqualOrHigher } = require('../../src/shared/helper.cjs')

const allTrue = (func, ...params ) => {
    for (const param of params) {
        expect(func(param)).toBeTrue()
    }
}

const allFalse = (func, ...params ) => {
    for (const param of params) {
        expect(func(param)).toBeFalse()
    }
}

test('d', () => {
    setLogger({log: () => undefined, group: () => undefined, groupEnd: () => undefined})
    expect(d('test', 'foo')).toBe('test')
    setLogger(console)
})

test('isNull', () => {
    allTrue(isNull,null)
    allFalse(isNull,undefined, false, true, '', 0, 0.0, {}, [], 666, 'foo')
})

test('isString', () => {
    allTrue(isString, '', 'foo')
    allFalse(isString, new String(''), new String('foo'), undefined, false, true, 0, 0.0, [], {}, 666)
})

test('isArray', () => {
    allTrue(isArray, [], [0])
    allFalse(isArray, undefined, null, false, true, '', 0, 0.0, {}, 666, 'foo')
})

test('isObject', () => {
    class x {}

    allTrue(isObject, {}, new x(), new String('x123'))
    allFalse(isObject(undefined, null, false, true, '', 0, 0.0, 66, 'foo'))
})

test('isUrl', () => {
    allTrue(isUrl, 'https://foo.com', 'http://www.google.com:8080/foo.html', 'http://localhost:8080/audio/world_clear.mp3', 'https://www.google.com:443/xxx/foo.html')
    allFalse(isUrl, undefined, null, false, true, 0, 0.0, 66, [], {}, '', 'http://', 'ftp://', 'http:/www.foo.com', 'https:foo.com')
})

test('isDataUrl', () => {
    allTrue(isDataUrl, 'data:image/png;base64,x')
    allFalse(isDataUrl, undefined, null, false, true, 0, 0.0, '', 'data:', 'data:xxx;base64,x', 'image/png;base64,x')

    expect(isDataUrl('data:image/png;base64,x', 'audio/wav')).toBeFalse()
    expect(isDataUrl('data:image/png;base64,x', 'image/png')).toBeTrue()
    expect(isDataUrl('data:foo;base64,x', 'foo')).toBeTrue()
})

test('ucfirst', () => {
    expect(ucfirst('')).toEqual('')
    expect(ucfirst('x')).toEqual('X')
    expect(ucfirst('X')).toEqual('X')
    expect(ucfirst('xyz')).toEqual('Xyz')
    expect(ucfirst('XYZ')).toEqual('XYZ')
})

test('union', () => {
    expect(union([], [])).toBeEmpty()
    expect(union([1], [])).toIncludeSameMembers([1])
    expect(union([1, 2], [])).toIncludeSameMembers([1, 2])
    expect(union([1], [1])).toIncludeSameMembers([1])
    expect(union([1], [2])).toIncludeSameMembers([2, 1])
    expect(union([1, 1, 2], [2, 2, 3, 3])).toIncludeSameMembers([1, 2, 3])
})

test('without', () => {
    expect(without([], [])).toBeEmpty()
    expect(without([], [1, 2])).toBeEmpty()
    expect(without([1, 2], [])).toIncludeSameMembers([1, 2])
    expect(without([1, 2], 0)).toIncludeSameMembers([1, 2])
    expect(without([1, 2], 1)).toIncludeSameMembers([2])
    expect(without([1, 2], [1])).toIncludeSameMembers([2])
    expect(without([1, 2], [1, 2, 3])).toBeEmpty()
})

test('intersect', () => {
    expect(intersect([], [])).toBeEmpty()
    expect(intersect([1, 2], [])).toBeEmpty()
    expect(intersect([], [1, 2])).toBeEmpty()
    expect(intersect([1], [2])).toBeEmpty()
    expect(intersect([1, 2], [2])).toIncludeSameMembers([2])
    expect(intersect([1, 2], [2, 3])).toIncludeSameMembers([2])
    expect(intersect([1, 2, 3, 3], [2, 3, 3])).toIncludeSameMembers([2, 3])
})

test('simpleType', () => {
    expect(simpleType()).toBe('undefined')
    expect(simpleType(undefined)).toBe('undefined')
    expect(simpleType(null)).toBe('null')
    expect(simpleType(true)).toBe('boolean')
    expect(simpleType(false)).toBe('boolean')
    expect(simpleType(0)).toBe('number')
    expect(simpleType(0.1)).toBe('number')
    expect(simpleType(-1000)).toBe('number')
    expect(simpleType('undefined')).toBe('string')
    expect(simpleType(new String('foo'))).toBe('string')
    expect(simpleType([])).toBe('array')
    expect(simpleType(new Array(1))).toBe('array')
    expect(simpleType({})).toBe('object')
    expect(simpleType(new Object())).toBe('object')
    expect(simpleType(() => null)).toBe('function')
    expect(simpleType(function() {})).toBe('function')
})

test('trim', () => {
    expect(trim('', '')).toBe('')
    expect(trim('', 'ab')).toBe('')
    expect(trim('a', 'a')).toBe('')
    expect(trim('aaaa', 'ab')).toBe('')
    expect(trim('ab', '')).toBe('ab')
    expect(trim('ab', 'c')).toBe('ab')
    expect(trim('ab', 'ba')).toBe('')
    expect(trim('ab', 'a')).toBe('b')
    expect(trim('aaaccaaa', 'a')).toBe('cc')
    expect(trim('baaccbba', 'ab')).toBe('cc')
    expect(trim('baacacbba', 'ab')).toBe('cac')
})

test('csv2values', () => {
    expect(csv2values('')).toEqual([])
    expect(csv2values('   ')).toEqual([])
    expect(csv2values('a')).toEqual(['a'])
    expect(csv2values('  a ')).toEqual(['a'])
    expect(csv2values('a,b')).toEqual(['a', 'b'])
    expect(csv2values('  a ,  b ')).toEqual(['a', 'b'])
})

test('isVersionEqualOrHigher', () => {
    expect(isVersionEqualOrHigher('1', '1')).toBeTrue()
    expect(isVersionEqualOrHigher('v1', '1')).toBeTrue()
    expect(isVersionEqualOrHigher('1', 'v1')).toBeTrue()
    expect(isVersionEqualOrHigher('v1', 'v1')).toBeTrue()
    expect(isVersionEqualOrHigher('2', '1')).toBeTrue()
    expect(isVersionEqualOrHigher('1', '2')).toBeFalse()
    expect(isVersionEqualOrHigher('1.0', '1')).toBeTrue()
    expect(isVersionEqualOrHigher('1.1', '1.1')).toBeTrue()
    expect(isVersionEqualOrHigher('1.2', '1.1')).toBeTrue()
    expect(isVersionEqualOrHigher('1.2', '1.3')).toBeFalse()
    expect(isVersionEqualOrHigher('1.2a', '1.3')).toBeFalse()
    expect(isVersionEqualOrHigher('1.2', '1.2a')).toBeTrue()
    expect(isVersionEqualOrHigher('1.3', '1.2a')).toBeTrue()
    expect(isVersionEqualOrHigher('1.2a', '1.2')).toBeFalse()
    expect(isVersionEqualOrHigher('1.2a', '1.2a')).toBeTrue()
    expect(isVersionEqualOrHigher('1.2a', '1.2b')).toBeFalse()
    expect(isVersionEqualOrHigher('1.2b', '1.2a')).toBeFalse()
})