const { StorageManager } = require("shared/classes/storage.cjs")
import { BrowserStorage } from "core/storage/browserStorage"
import { d } from "helper/helper"
import jest from 'jest-mock'
const { RESOURCE, id2jsonTid, id2imageTid, id2audioTid } = require('../../../src/shared/classes/resources.cjs')

test('BrowserStorage', () => {

    expect(() => new StorageManager(BrowserStorage({setItem: () => {throw Error('foo')}}))).toThrowError('available')

    {
        const setItem = item => true
        const mockedSetItem = jest.fn(setItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: mockedSetItem,
            removeItem: () => true,
            length: 0
        }

        const SM = new StorageManager(BrowserStorageHandler(storage, 'abc.'))
        const json = {foo: 'bar'}
        SM.storeJsonResource('test', json)
        const secondCallArgs = mockedSetItem.mock.calls[1];
        expect(secondCallArgs[0]).toEqual('abc.' + id2jsonTid('test'))
        expect(secondCallArgs[1]).toEqual(JSON.stringify(json))
    }

    {
        const setItem = item => true
        const mockedSetItem = jest.fn(setItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: mockedSetItem,
            key: () => 'abc.' + id2imageTid('foo'),
            removeItem: () => true,
            getItem: () => JSON.stringify({x: 122}),
            length: 1
        }

        const SM = new StorageManager(BrowserStorageHandler(storage, 'abc.'))
        expect(SM.hasJson('foo')).toBeFalse()
        expect(SM.hasImage('foo')).toBeTrue()
        expect(SM.getJson('foo')).toContainAllEntries([['x', 122]])
        expect(SM.isFull()).toBeFalse()
    }

    {
        const removeItem = () => true
        const mockedRemoveItem = jest.fn(removeItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: () => true,
            key: idx => 'abc.' + id2jsonTid('foo'),
            removeItem: mockedRemoveItem,
            length: 1
        }

        const SM = new StorageManager(BrowserStorageHandler(storage, 'abc.'))
        expect(SM.hasAudio('foo')).toBeFalse()
        expect(SM.deleteImage('foo')).toBeFalse()
        expect(SM.deleteJson('foo')).toBeTrue()
        const secondCallArgs = mockedRemoveItem.mock.calls[1];
        expect(secondCallArgs[0]).toEqual('abc.' + id2jsonTid('foo'))
        expect(SM.hasJson('foo')).toBeFalse()
    }

    {
        const clear = () => true
        const mockedClear = jest.fn(clear)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: () => true,
            key: idx => 'abc.' + id2imageTid('foo' + idx),
            removeItem: () => true,
            clear: mockedClear,
            length: 2
        }

        const SM = new StorageManager(BrowserStorageHandler(storage), 'abc.')
        expect(SM.hasImage('foo1')).toBeTrue()
        expect(SM.getImageIds()).toIncludeAllMembers(['foo0', 'foo1'])
        SM.truncate()
        expect(SM.hasImage('foo0')).toBeFalse()
        expect(SM.hasImage('foo1')).toBeFalse()
        expect(SM.getImageIds()).toBeEmpty()
    }

    {
        const storage = {
            setItem: () => {throw Error('Foo')},
            length: 0
        }
        const browserStorage = BrowserStorageHandler(storage)
        expect(browserStorage.encode(RESOURCE.TYPE.AUDIO, 'foo')).toEqual('foo');
        // expect(browserStorage.encode(RESOURCE.TYPE.IMAGE, 'foo')).toEqual('foo');
        expect(() => browserStorage.encode('?')).toThrowError('Unsupported')
        expect(browserStorage.decode(RESOURCE.TYPE.AUDIO, 'foo')).toEqual('foo');
        expect(browserStorage.decode(RESOURCE.TYPE.IMAGE, 'foo')).toEqual('foo');
        expect(() => browserStorage.decode('?')).toThrowError('Unsupported')

        expect(browserStorage.set('foo', 'bar')).toBeFalse()
        expect(browserStorage.isFull()).toBeFalse()
    }

})