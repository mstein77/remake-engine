import { StorageManager } from "shared/classes/storage.cjs"
import { BrowserStorage } from "core/storages/browserStorage"
import { d } from "helper/helper"
import jest from 'jest-mock'
import { RESOURCE, id2jsonTid, id2imageTid, id2audioTid } from '../../../src/shared/classes/resources.cjs'

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

        const SM = new StorageManager(BrowserStorage(storage, 'abc.'))
        const json = {foo: 'bar'}
        SM.storeJsonResource('test', json)
        const secondCallArgs = mockedSetItem.mock.calls[1];
        expect(secondCallArgs[0]).toEqual('abc.' + id2jsonTid('test') + '.json')
        expect(secondCallArgs[1]).toEqual(JSON.stringify(json))
    }

    {
        const setItem = item => true
        const mockedSetItem = jest.fn(setItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: mockedSetItem,
            key: () => 'abc.' + id2imageTid('foo') + '.png',
            removeItem: () => true,
            getItem: () => JSON.stringify({x: 122}),
            length: 1
        }

        const SM = new StorageManager(BrowserStorage(storage, 'abc.'))
        expect(SM.hasJsonResource('foo')).toBeFalse()
        expect(SM.hasImageResource('foo')).toBeTrue()
        expect(SM.getResource(id2jsonTid('foo'))).toContainAllEntries([['x', 122]])
        expect(SM.isFull()).toBeFalse()
    }

    {
        const removeItem = () => true
        const mockedRemoveItem = jest.fn(removeItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: () => true,
            key: idx => 'abc.' + id2jsonTid('foo') + '.json',
            removeItem: mockedRemoveItem,
            length: 1
        }

        const SM = new StorageManager(BrowserStorage(storage, 'abc.'))
        expect(SM.hasAudioResource('foo')).toBeFalse()
        expect(SM.deleteImageResource('foo')).toBeFalse()
        expect(SM.deleteJsonResource('foo')).toBeTrue()
        const secondCallArgs = mockedRemoveItem.mock.calls[1];
        expect(secondCallArgs[0]).toEqual('abc.' + id2jsonTid('foo') + '.json')
        expect(SM.hasJsonResource('foo')).toBeFalse()
    }

    /*
    {
        const clear = () => true
        const mockedClear = jest.fn(clear)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: () => true,
            key: idx => d('abc.' + id2imageTid('foo' + idx) + '.png', idx),
            removeItem: () => true,
            clear: mockedClear,
            length: 2
        }

        const SM = new StorageManager(BrowserStorage(storage), 'abc.')
        // expect(SM.hasImageResource('foo1')).toBeTrue()
        expect(SM.getImageResourceIds()).toIncludeAllMembers(['foo0', 'foo1'])
        SM.truncate()
        expect(SM.hasImageResource('foo0')).toBeFalse()
        expect(SM.hasImageResource('foo1')).toBeFalse()
        expect(SM.getImageResourceIds()).toBeEmpty()
    }

    {
        const storage = {
            setItem: () => {throw Error('Foo')},
            length: 0
        }
        const browserStorage = BrowserStorage(storage)
        expect(browserStorage.encode(RESOURCE.TYPE.AUDIO, 'foo')).toEqual('foo');
        // expect(browserStorage.encode(RESOURCE.TYPE.IMAGE, 'foo')).toEqual('foo');
        expect(() => browserStorage.encode('?')).toThrowError('Unsupported')
        expect(browserStorage.decode(RESOURCE.TYPE.AUDIO, 'foo')).toEqual('foo');
        expect(browserStorage.decode(RESOURCE.TYPE.IMAGE, 'foo')).toEqual('foo');
        expect(() => browserStorage.decode('?')).toThrowError('Unsupported')

        expect(browserStorage.set('foo', 'bar')).toBeFalse()
        expect(browserStorage.isFull()).toBeFalse()
    }

     */
})