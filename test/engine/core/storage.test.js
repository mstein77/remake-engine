import {BrowserStorageHandler, MapStorageHandler, StorageManager} from "core/storage"
import { d } from "helper/helper"
import jest from 'jest-mock'
import { id2jsonTid, id2imageTid, id2audioTid } from "core/resources"
import { RESOURCE } from "core/const"

test('StorageManager', () => {

    expect(() => new StorageManager()).toThrowError('handler')

    {
        const SM = new StorageManager(MapStorageHandler(), 'pfx.')
        expect(SM.getJsonIds()).toBeEmpty()
        expect(SM.hasJson('test')).toBeFalse()
        SM.storeJson('test', {})
        expect(SM.hasJson('test')).toBeTrue()
        expect(SM.getJsonIds()).toIncludeAllMembers(['test'])
        expect(SM.getJson('test')).toBeEmptyObject()
        SM.deleteJson('test')
        expect(SM.getJson('test')).toBeUndefined()
        expect(SM.getJsonIds()).toBeEmpty()

        expect(SM.hasImage('test')).toBeFalse()
        SM.storeImage('test', 'myImage')
        expect(SM.hasImage('test')).toBeTrue()
        expect(SM.getImage('test')).toBe('myImage')
        expect(SM.getImageIds()).toIncludeAllMembers(['test'])
        SM.deleteImage('test')
        expect(SM.getImage('test')).toBeUndefined()
        expect(SM.getImageIds()).toBeEmpty()

        expect(SM.hasAudio('test')).toBeFalse()
        SM.storeAudio('test', 'foo')
        expect(SM.hasAudio('test')).toBeTrue()
        expect(SM.getAudio('test')).toBe('foo')
        expect(SM.getAudioIds()).toIncludeAllMembers(['test'])
        SM.deleteAudio('test')
        expect(SM.getAudioIds()).toBeEmpty()
        expect(SM.getAudio('test')).toBeUndefined()

        SM.storeFromObject({
            [id2jsonTid('testj')]: {},
            [id2imageTid('testi')]: 'myImage',
            [id2audioTid('testa')]: 'myAudio'
        })
        expect(SM.getTypedIds()).toIncludeAllMembers([
            id2jsonTid('testj'), id2imageTid('testi'), id2audioTid('testa')
        ])

        SM.truncate()
        expect(SM.getAudioIds()).toBeEmpty()
        expect(SM.getImageIds()).toBeEmpty()
        expect(SM.getJsonIds()).toBeEmpty()
    }

    {
        const SM = new StorageManager(MapStorageHandler(2), 'pfx.')
        SM.storeImage('bla', 'boo')
        expect(SM.storeJson('foo', 'bar')).toBeTrue()
        expect(SM.isFull()).toBeFalse()
        expect(SM.storeJson('foo2', 'xxx')).toBeFalse()
        expect(SM.isFull()).toBeTrue()
        expect(SM.getJsonIds()).toIncludeAllMembers(['foo'])
        SM.truncate()
        expect(SM.isFull()).toBeFalse()
        expect(SM.storeFromObject({
            [id2jsonTid('foo')]: 'bar',
            [id2jsonTid('foo2')]: 'xxx',
            [id2jsonTid('foo3')]: 'bla'
        })).toBeFalse()
        const tids = SM.getTypedIds()
        expect(tids).toHaveLength(2)
        expect(SM.deleteResource(tids[0])).toBeTrue()
        expect(SM.isFull()).toBeFalse()
        expect(SM.storeJson('foo4', 'bad')).toBeTrue()
        expect(SM.deleteJson('none')).toBeFalse()
    }

    expect(() => new StorageManager(BrowserStorageHandler({setItem: () => {throw Error('foo')}}))).toThrowError('available')

    {
        const setItem = item => true
        const mockedSetItem = jest.fn(setItem)
            .mockReturnValueOnce(true)

        const storage = {
            setItem: mockedSetItem,
            removeItem: () => true,
            length: 0
        }

        const SM = new StorageManager(BrowserStorageHandler(storage), 'abc.')
        const json = {foo: 'bar'}
        SM.storeJson('test', json)
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

        const SM = new StorageManager(BrowserStorageHandler(storage), 'abc.')
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

        const SM = new StorageManager(BrowserStorageHandler(storage), 'abc.')
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