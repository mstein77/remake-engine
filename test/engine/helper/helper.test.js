import { isDataUrl, isString, isUrl } from "helper/helper"

test('isString', () => {
    expect(isString()).toBeFalse()
    expect(isString(undefined)).toBeFalse()
    expect(isString(null)).toBeFalse()
    expect(isString(true)).toBeFalse()
    expect(isString(1)).toBeFalse()
    expect(isString({foo: 'bar'})).toBeFalse()
    expect(isString(new String('foo'))).toBeFalse()
    expect(isString(() => 'foo')).toBeFalse()

    expect(isString('')).toBeTrue()
    expect(isString('xy')).toBeTrue()
})

test('isUrl', () => {
    expect(isUrl()).toBeFalse()
    expect(isUrl(undefined)).toBeFalse()
    expect(isUrl(null)).toBeFalse()
    expect(isUrl(true)).toBeFalse()
    expect(isUrl(1)).toBeFalse()
    expect(isUrl({foo: 'bar'})).toBeFalse()
    expect(isUrl(new String('http://www.google.com'))).toBeFalse()
    expect(isUrl(() => 'foo')).toBeFalse()
    expect(isUrl('ftp://www.google.com')).toBeFalse()
    expect(isUrl('HTTP://www.google.com')).toBeFalse()


    expect(isUrl('http://www.google.com')).toBeTrue()
    expect(isUrl('https://www.google.com')).toBeTrue()
})

test('isDataUrl', () => {
    expect(isDataUrl()).toBeFalse()
    expect(isDataUrl(undefined)).toBeFalse()
    expect(isDataUrl(null)).toBeFalse()
    expect(isDataUrl(true)).toBeFalse()
    expect(isDataUrl(1)).toBeFalse()
    expect(isDataUrl('')).toBeFalse()
    expect(isDataUrl('data:xyz')).toBeFalse()
    expect(isDataUrl({foo: 'bar'})).toBeFalse()
    expect(isDataUrl(new String('http://www.google.com'))).toBeFalse()
    expect(isDataUrl(() => 'foo')).toBeFalse()
    expect(isDataUrl('data:image/png;,', 'image/png')).toBeFalse()
    expect(isDataUrl('data:image/png;base64,Hwebbwe', 'image/jpeg')).toBeFalse()

    expect(isDataUrl('data:;base64,', '')).toBeTrue()
    expect(isDataUrl('data:foo;base64,', 'foo')).toBeTrue()
    expect(isDataUrl('data:image/png;base64,')).toBeTrue()
    expect(isDataUrl('data:image/png;base64,', 'image/png')).toBeTrue()
    expect(isDataUrl('data:image/png;base64,XHWweiEEn', 'image/png')).toBeTrue()
})