import { toPairs,  d } from "helper/helper"
import { ResourceManager, VideoResources, ImageResources, AudioResources, JsonResources, Resources, ResourceCollection,
    getResourcesAndCallback, setStaticTypes
} from "core/resources"
import { StorageManager } from "shared/classes/storage"
import { MapStorage } from "shared/storage/mapStorage"
import { RESOURCE, makeDescriptor, id2coreTid, id2jsonTid, id2imageTid, id2audioTid, id2videoTid, tid2id, id2tid, typeText2tid } from "shared/classes/resources.cjs"
import { createImageResource, ResourceRequest, AudioResource, ImageResource, getResourceResolvePromise, getResourceProxy, ResourceResolver, SyncResolver, DummyResolver } from "core/resources"
import jest from 'jest-mock'
import { processResourceRequest, processStoreRequest } from "../../../src/server/controller/resources.cjs"

test('getResourceResolvePromise', () => {
    expect(() => getResourceResolvePromise()).toThrow()
    expect(() => getResourceResolvePromise(id2coreTid('foo'), 'http://foo.bar', 'foo')).toThrow()
    expect(() => getResourceResolvePromise(id2imageTid('foo'), {bar: 'foo2'})).toThrow()
    expect(() => getResourceResolvePromise(id2coreTid('foo'), 'data:text/json;base64,Zbsdhwe', 'bar2')).toThrow()
    expect(() => getResourceResolvePromise(id2jsonTid('foo'), null)).toThrow()
    // TODO this one should not throw once we have a VideoResource implementation
    expect(() => getResourceResolvePromise(id2videoTid('foo'), null)).toThrow()

    getResourceResolvePromise(id2jsonTid('foo'), {bar: 'foo2'}, 'bar2').then(data => {
        expect(data).toContainAllEntries([['id', id2jsonTid('foo')], ['value', {bar: 'foo2'}], ['origin', 'bar2.data']])
    })
    getResourceResolvePromise(id2audioTid('foo'), null, 'bar').then(
        data => {
            expect(data.id).toBe(id2audioTid('foo'))
            expect(data.value).toBeInstanceOf(AudioResource)
            expect(data.value.id).toBe('foo')
            expect(data.origin).toBe('bar.staticurl')
        }
    )
    getResourceResolvePromise(id2audioTid('foo'), 'data:audio/wav;base64,Abc', 'bar').then(
        data => {
            expect(data.id).toBe(id2audioTid('foo'))
            expect(data.value).toBeInstanceOf(AudioResource)
            expect(data.value.id).toBe('foo')
            expect(data.origin).toBe('bar.data')
        }
    )
    getResourceResolvePromise(id2imageTid('foo'), 'data:image/png;base64,Abc', 'bar').then(
        data => {
            expect(data.id).toBe(id2imageTid('foo'))
            expect(data.value).toBeInstanceOf(ImageResource)
            expect(data.value.id).toBe('foo')
            expect(data.origin).toBe('bar.data')
        }
    )
    // TODO video dataurl

    setStaticTypes(['image', 'json', 'audio', 'video'])
    getResourceResolvePromise(id2imageTid('foo'), null, 'bar').then(
        data => {
            expect(data.id).toBe(id2imageTid('foo'))
            expect(data.value).toBeInstanceOf(ImageResource)
            expect(data.value.id).toBe('foo')
            expect(data.origin).toBe('bar.staticurl')
            setStaticTypes(['audio', 'video'])
        }
    )
    global.fetch = jest.fn(
        () => Promise.resolve({ok: true, json: () => ({foo: 'bar'})}))

    getResourceResolvePromise(id2jsonTid('foo'), null, 'bar').then(
        data => {
            expect(data.id).toBe(id2jsonTid('foo'))
            expect(data.origin).toBe('bar.staticurl')
            expect(data.value).toContainAllEntries([['foo', 'bar']])
        }
    )
})

const map2object = map => Object.fromEntries(map.entries())

test('ResourceResolver', () => {
    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resources = new Map()
        const r = ResourceResolver(id2source, permId2scope)
        r.resolve(resources).then(() => {
            expect(map2object(id2source)).toContainAllEntries([])
            expect(map2object(permId2scope)).toContainAllEntries([])
            expect(map2object(resources)).toContainAllEntries([])
        })
    }

    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resources = new Map()
        const r = ResourceResolver(id2source, permId2scope)
        r.add(id2imageTid('foo'), 'data:image/png;base64,Abc', 'bar')
        r.resolve(resources, 'foo2').then(() => {
            expect(map2object(id2source)).toContainAllEntries([
                [id2imageTid('foo'), 'bar.data']
            ])
            expect(map2object(permId2scope)).toContainAllEntries([
                [id2imageTid('foo'), 'foo2']
            ])
            expect(map2object(resources)).toContainAllKeys([id2imageTid('foo')])
        })
    }

})

test('getResourceProxy', () => {
    expect(() => getResourceProxy()).toThrow()
    expect(() => getResourceProxy('foo', {})).toThrow()

    expect(() => getResourceProxy(RESOURCE.TYPE.IMAGE, {}).set('foo', 'bar')).toThrow()
    expect(() => getResourceProxy(RESOURCE.TYPE.IMAGE, {}).foo = 'bar').toThrow()
    expect(() => getResourceProxy(RESOURCE.TYPE.IMAGE, {}).foo).toThrow()
    expect(() => getResourceProxy(RESOURCE.TYPE.IMAGE, {foo: 'bar2'}).foo = 'bar').toThrow()

    expect(getResourceProxy(RESOURCE.TYPE.IMAGE, {'foo': 'xy'}).foo).toBe('xy')
    expect(getResourceProxy(RESOURCE.TYPE.IMAGE, {'foo.png': 'xy'})['foo']).toBe('xy')
    expect(getResourceProxy(RESOURCE.TYPE.IMAGE, {'foo': 'xy'})['foo.png']).toBe('xy')
})

test('SyncResolver', () => {
    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resolvedResources = new Map()
        const r = SyncResolver(id2source, permId2scope)
        r.add(id2jsonTid('foo'), 'bar', 'foo2')
        r.resolve(resolvedResources, 'testScope')
        expect(map2object(resolvedResources)).toContainAllEntries([[id2jsonTid('foo'), 'bar']])
        expect(map2object(id2source)).toContainAllEntries([[id2jsonTid('foo'), 'foo2.data']])
        expect(map2object(permId2scope)).toContainAllEntries([[id2jsonTid('foo'), 'testScope']])
    }

    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resolvedResources = new Map()
        const r = SyncResolver(id2source, permId2scope)
        r.add(id2jsonTid('foo'), 'bar', 'foo2')
        r.add(id2imageTid('foo.png'), 'bar2', 'foo2')
        r.add(id2audioTid('foo'), 'bar3', 'foo2')
        r.add(id2videoTid('foo'), 'bar4', 'foo2')
        r.resolve(resolvedResources)
        expect(map2object(resolvedResources)).toContainAllEntries([
            [id2jsonTid('foo'), 'bar'],
            [id2imageTid('foo.png'), 'bar2'],
            [id2audioTid('foo'), 'bar3'],
            [id2videoTid('foo'), 'bar4']
        ])
        expect(map2object(id2source)).toContainAllEntries([
            [id2jsonTid('foo'), 'foo2.data'],
            [id2imageTid('foo.png'), 'foo2.data'],
            [id2audioTid('foo'), 'foo2.data'],
            [id2videoTid('foo'), 'foo2.data']
        ])
        expect(map2object(permId2scope)).toContainAllEntries([])
    }
})

test('DummyResolver', () => {
    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resolvedResources = new Map()
        const r = DummyResolver(id2source, permId2scope)
        r.add(id2jsonTid('foo'), 'bar', 'foo2')
        r.resolve(resolvedResources, 'testScope').then(() => {
            expect(map2object(resolvedResources)).toContainAllEntries([[id2jsonTid('foo'), 'bar']])
            expect(map2object(id2source)).toContainAllEntries([[id2jsonTid('foo'), 'foo2.data']])
            expect(map2object(permId2scope)).toContainAllEntries([[id2jsonTid('foo'), 'testScope']])
        })
    }

    {
        const id2source = new Map()
        const permId2scope = new Map()
        const resolvedResources = new Map()
        const r = DummyResolver(id2source, permId2scope)
        r.add(id2jsonTid('foo'), 'bar', 'foo2')
        r.add(id2imageTid('foo.png'), 'bar2', 'foo2')
        r.add(id2audioTid('foo'), 'bar3', 'foo2')
        r.add(id2videoTid('foo'), 'bar4', 'foo2')
        r.resolve(resolvedResources).then(() => {
            expect(map2object(resolvedResources)).toContainAllEntries([
                [id2jsonTid('foo'), 'bar'],
                [id2imageTid('foo.png'), 'bar2'],
                [id2audioTid('foo'), 'bar3'],
                [id2videoTid('foo'), 'bar4']
            ])
            expect(map2object(id2source)).toContainAllEntries([
                [id2jsonTid('foo'), 'foo2.data'],
                [id2imageTid('foo.png'), 'foo2.data'],
                [id2audioTid('foo'), 'foo2.data'],
                [id2videoTid('foo'), 'foo2.data']
            ])
            expect(map2object(permId2scope)).toContainAllEntries([])
        })
    }
})

test('ResourceCollection', () => {

    function n( ...args ) {
        return new ResourceCollection( ...args )
    }

    function c( ...args ) {
        return Resources(null, ...args )
    }

    function i( ...args ) {
        return ImageResources( ...args )
    }

    function iRes( ...args ) {
        return i(...args).resources.image
    }

    expect(n().resources).toBeEmptyObject()
    expect(iRes('foo')).toContainAllEntries([['foo', null]])
    expect(iRes('foo', 'bar')).toContainAllEntries([['foo', null], ['bar', null]])
    expect(iRes('foo', null, 'bar')).toContainAllEntries([['foo', null], ['bar', null]])
    expect(iRes(['foo', 'bar'])).toContainAllEntries([['foo', null], ['bar', null]])
    expect(iRes({foo: null}, {bar: null})).toContainAllEntries([['foo', null], ['bar', null]])
    expect(iRes({foo: null}, 'bar')).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i('foo').addImage('bar').resources.image).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i('foo').add('bar').resources.image).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i().addImage('foo').add('bar').resources.image).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i().add(['foo', 'bar']).resources.image).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i().add({foo: 'fval', bar: 'bval'}).resources.image).toContainAllEntries([['foo', 'fval'], ['bar', 'bval']])
    expect(iRes({'foo*': ['bar1', 'bar2']})).toContainAllEntries([['foo0', 'bar1'], ['foo1', 'bar2']])

    expect(() => iRes({'foo': ['bar1', 'bar2']})).toThrow('No replace char')
    expect(() => i('foo', 'foo')).toThrow('already')
    expect(() => i('foo', 'foo.png')).toThrow('already')
    expect(() => i('foo.png', 'foo')).toThrow('already')
    expect(i().addAudio('foo').resources.audio).toContainAllEntries([['foo', null]])
    expect(i().addVideo('foo', null).addVideo('bar').resources.video).toContainAllEntries([['foo', null], ['bar', null]])
    expect(i().addJson('foo', {}).addJson('bar').resources.json).toContainAllEntries([['foo', {}], ['bar', null]])

    expect(JsonResources('foo').resources).toContainAllKeys(['json'])
    expect(AudioResources('foo').resources).toContainAllKeys(['audio'])
    expect(VideoResources('foo').resources).toContainAllKeys(['video'])

    expect(Resources({json: ['foo'], image: ['bar']}).resources).toContainAllKeys(['json', 'image'])
    expect(Resources().add({json: ['foo'], image: ['bar']}).resources).toContainAllKeys(['json', 'image'])
    expect(() => Resources('foo')).toThrow()
    expect(() => Resources().add('foo')).toThrow()
    expect(() => Resources({foo: 'bar'})).toThrow()

})

test('getResourcesAndCallback', () => {
    expect(getResourcesAndCallback()).toContainAllEntries([
        ['callback', undefined], ['resources', {}]
    ])
    const testCallback = () => {}
    expect(getResourcesAndCallback(null, testCallback)).toContainAllEntries([
        ['callback', testCallback], ['resources', {}]
    ])

    expect(() => getResourcesAndCallback(testCallback, testCallback)).toThrow()

    expect(getResourcesAndCallback({json: ['foo']}, testCallback)).toContainAllEntries([
        ['callback', testCallback],
        ['resources', {json: {foo: null}}]
    ])

    expect(getResourcesAndCallback(testCallback, {json: ['foo'], image: {bar2: 'foo2'}}, ImageResources('bar'))).toContainAllEntries([
        ['callback', testCallback],
        ['resources', {json: {foo: null}, image: {bar: null, bar2: 'foo2'}}]
    ])

    expect(() => getResourcesAndCallback(testCallback, 'foo')).toThrow()

    expect(() => getResourcesAndCallback({json: {foo: 'bar'}}, {json: {foo: 'bar2'}})).toThrow()
    expect(() => getResourcesAndCallback({json: {foo: 'bar'}}, {json: {'foo.json': 'bar2'}})).toThrow()
    expect(() => getResourcesAndCallback({json: {'foo.json': 'bar'}}, {json: {foo: 'bar2'}})).toThrow()

})

const newResourceManager = (server = {}, local = {}, session = {}) => {
    const apiFetcher = getApiResponse(server)
    const localStorage = new StorageManager(MapStorage())
    localStorage.storeResourcesFromObject(local)
    const sessionStorage = new StorageManager(MapStorage())
    sessionStorage.storeResourcesFromObject(session)
    return new ResourceManager(apiFetcher, localStorage, sessionStorage)
}

const getApiResponse = serverResourcesObj => {
    const storage = MapStorage()
    const SM = new StorageManager(storage)
    SM.storeResourcesFromObject(serverResourcesObj)

    const routes = {
        has: ({ resources }) => {
            const found = []
            for (const tid of resources) {
                if (SM.hasResource(tid)) found.push(tid)
            }
            return Promise.resolve({ found })
        },

        store: body => {
            return Promise.resolve(processStoreRequest(body, SM))
        },
        resources: body => Promise.resolve(processResourceRequest(body, SM))
    }

    return {
        fetch: (name, json) => routes[name](json)
    }
}

test('ResourceManager', () => {

    function makeModels(models, dependencies = {}) {
        return {
            getResourcesAndDependencies: () => {
                const resources = []
                for (const [ tid, data ] of toPairs(models)) {
                    const descriptor = makeDescriptor.fromTid(tid)
                    const type = descriptor.key
                    const id = descriptor.id
                    resources.unshift({ id, data, type })
                }
                return {
                    resources,
                    dependencies
                }
            }
        }
    }

    // test flags
    {
        const r = newResourceManager()
        expect(r.disabled).toBeFalse()
        expect(r.preview).toBeFalse()
        r.setDisabled(true)
        expect(r.disabled).toBeTrue()
        r.setPreview(true)
        expect(r.preview).toBeTrue()
    }

    {
        const r = newResourceManager({[id2coreTid('id2scope')]: 'bar'})
        expect(() => r.loadPermanentScope()).toThrow()
        expect(() => r.loadTemporaryScope()).toThrow()
        r.loadTemporaryScope('test').then(() => {
            expect(() => r.getResourceById(RESOURCE.TYPE.CORE, 'id2scope')).toThrow()
            expect(() => r.getResourceById(RESOURCE.TYPE.JSON, 'id2scope')).toThrow()
        })
    }

    {
        const r = newResourceManager({[id2coreTid('id2scope')]: 'bar'})
        r.addImage('foo')
        // TODO find a way to catch this correctly
        // expect(() => r.loadTemporaryScope('bar')).toThrow()
    }

    {
        const r = newResourceManager()
        expect(r.hasImage('foo')).toBeFalse()
        expect(r.hasAudio('foo')).toBeFalse()
        expect(r.hasVideo('foo')).toBeFalse()
        expect(r.hasPermanentImage('foo')).toBeFalse()
        expect(r.hasPermanentAudio('foo')).toBeFalse()
        expect(r.hasPermanentVideo('foo')).toBeFalse()
        expect(r.getAllResourceIds(RESOURCE.TYPE.IMAGE)).toBeEmpty()
        expect(r.getAllResourceIds(RESOURCE.TYPE.AUDIO)).toBeEmpty()
        expect(r.getAllResourceIds(RESOURCE.TYPE.VIDEO)).toBeEmpty()
    }

    {
        const r = newResourceManager()
        r.addImage('foo', 'bar1')
        r.addAudio('foo', 'bar2')
        r.addVideo('foo', 'bar3')
        r.loadTemporaryScope('test').then(() => {
            expect(r.hasImage('foo')).toBeTrue()
            expect(r.hasAudio('foo')).toBeTrue()
            expect(r.hasVideo('foo')).toBeTrue()
            expect(r.hasPermanentImage('foo')).toBeFalse()
            expect(r.hasPermanentAudio('foo')).toBeFalse()
            expect(r.hasPermanentVideo('foo')).toBeFalse()
            expect(r.getImage('foo')).toBe('bar1')
            expect(r.getAudio('foo')).toBe('bar2')
            expect(r.getVideo('foo')).toBe('bar3')

            // TODO this is not correct
            expect(r.getAllResourceIds(RESOURCE.TYPE.JSON)).toBeEmpty()
            expect(r.getAllResourceIds(RESOURCE.TYPE.IMAGE)).toBeEmpty()
            expect(r.getAllResourceIds(RESOURCE.TYPE.AUDIO)).toBeEmpty()
            expect(r.getAllResourceIds(RESOURCE.TYPE.VIDEO)).toBeEmpty()

            r.setDisabled(true)
            expect(r.hasImage('foo')).toBeFalse()
            r.setDisabled(false)
            expect(r.hasImage('foo')).toBeTrue()
            r.clearTemporary()
            expect(r.hasImage('foo')).toBeFalse()
        })
    }

    {
        const r = newResourceManager()
        r.addImage('foo', 'bar1')
        r.addAudio('foo', 'bar2')
        r.addVideo('foo', 'bar3')
        r.loadTemporaryScope('test').then(() => {
            expect(r.getAudioOrigin('foo')).toBe('code.data')
            expect(r.getVideoOrigin('foo')).toBe('code.data')
            r.removeImage('foo')
            r.removeAudio('foo')
            r.removeVideo('foo')
            expect(r.hasImage('foo')).toBeFalse()
            expect(r.hasAudio('foo')).toBeFalse()
            expect(r.hasVideo('foo')).toBeFalse()
        })
    }

    {
        const r = newResourceManager({}, {[id2imageTid('foo')]: 'bar'})
        expect(r.hasBrowserResources()).toBeTrue()
        r.clearBrowserResources()
        expect(r.hasBrowserResources()).toBeFalse()
    }

    {
        const r = newResourceManager()
        r.addImage('foo', 'bar1')
        r.loadPermanentScope('test').then(() => {
            r.addImage('foo2', 'bar2')
            r.loadPermanentScope('globals').then(() => {
                r.addImage('foo3', 'bar3')
                r.loadTemporaryScope('temp').then(() => {
                    r.clearTempAndGlobals()
                    expect(r.hasImage('foo2')).toBeFalse()
                    expect(r.hasImage('foo3')).toBeFalse()
                    expect(r.hasImage('foo')).toBeTrue()
                })
            })
        })
    }

    {
        const r = newResourceManager()
        r.addImage('foo', 'bar1')
        r.loadPermanentScope('test').then(() => {
            r.addImage('foo2', 'bar2')
            r.loadPermanentScope('globals').then(() => {
                r.addImage('foo3', 'bar3')
                r.loadTemporaryScope('temp').then(() => {
                    expect(r.getImageSource('foo')).toBe('code.data')
                    r.clear()
                    expect(r.hasImage('foo2')).toBeFalse()
                    expect(r.hasImage('foo3')).toBeFalse()
                    expect(r.hasImage('foo')).toBeFalse()
                })
            })
        })
    }

    // browser override
    {
        const RB = newResourceManager({}, {[id2jsonTid('test')]: 'z'})

        expect(RB.resources.json.toObject()).toBeEmptyObject()
        RB.addJson('test', 'xy')
        expect(RB.resources.json.toObject()).toBeEmptyObject()
        RB.loadTemporaryScope('bar').then(() => {
            expect(RB.resources.json.test).toBe('z')
            expect(RB.resources.json['test.json']).toBe('z')
            expect(RB.getJsonOrigin('test')).toEqual('browser.data')
            expect(RB.getJsonOrigin('test.json')).toEqual('browser.data')
        })
    }

    // code fallback
    {
        const RB = newResourceManager({}, {[id2jsonTid('x')]: 'y'})
        expect(RB.resources.json.toObject()).toBeEmptyObject()

        RB.addJson('foo', 'bar')
        RB.loadTemporaryScope('testScope').then(() => {
            expect(RB.resources.json.foo)
                .toBe('bar')
            expect(RB.getJsonOrigin('foo'))
                .toBe('code.data')
        })
    }

    // remote override
    {
        const RB = newResourceManager({[id2jsonTid('foo')]: 'bar2'}, {[id2jsonTid('x')]: 'y'})
        expect(RB.resources.json.toObject()).toBeEmptyObject()

        RB.addJson('foo', 'bar')
        RB.loadTemporaryScope('testScope').then(() => {
            expect(RB.resources.json.foo).toBe('bar2')
            expect(RB.getJsonOrigin('foo'))
                .toEqual('server.data')
        })
    }

    // all in one
    {
        const RB = newResourceManager(
            {[id2jsonTid('c')]: 'C'},
            {[id2jsonTid('a')]: 'A'},
            {}
        )
        expect(RB.resources.json.toObject()).toBeEmptyObject()

        RB.addJson('a', '_a')
        RB.addJson('b', '_b')
        RB.addJson('c', '_c')
        RB.loadTemporaryScope('testScope').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['a.json', 'A'], ['b.json', '_b'], ['c.json', 'C']])
        })
    }

    // temp and permanent
    {
        const RB = newResourceManager({}, {[id2jsonTid('x')]: 'perm', [id2jsonTid('y')]: 'temp1', [id2jsonTid('z')]: 'temp2'});
        RB.addJson('x');
        RB.loadPermanentScope('myScope').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['x.json', 'perm']])

            RB.addJson('y')
            RB.loadTemporaryScope('myScope').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['x.json', 'perm'], ['y.json', 'temp1']])

                expect(RB.hasPermanentJson('y')).toBeFalse()
                expect(RB.hasPermanentJson('x.json')).toBeTrue()
                expect(RB.hasJson('x')).toBeTrue()
                expect(RB.hasJson('y')).toBeTrue()
                RB.addJson('z')
                RB.loadTemporaryScope('myScope').then(() => {
                    expect(RB.resources.json.toObject())
                        .toContainAllEntries([['x.json', 'perm'], ['z.json', 'temp2']])
                    expect(RB.hasPermanentScope('xScope')).toBeFalse()
                    expect(RB.hasPermanentScope('myScope')).toBeTrue()
                    RB.invalidatePermanentScope('myScope')
                    expect(RB.hasPermanentScope('myScope')).toBeFalse()
                    expect(RB.getJson('z')).toBe('temp2')
                })
            })
        })
    }

    // game instantiation
    {
        const RB = newResourceManager()
        RB.addJson('game', 'myConfig')
        RB.load('game', true).then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['game.json', 'myConfig']])

            // globals
            RB.addJson('perm', 'perm1')
            RB.load('global', true).then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['game.json', 'myConfig'], ['perm.json', 'perm1']])

                RB.addJson('temp', 'temp1')
                RB.load('screen1').then(() => {
                    expect(RB.resources.json.toObject())
                        .toContainAllEntries([['game.json', 'myConfig'], ['perm.json', 'perm1'], ['temp.json', 'temp1']])

                    RB.addJson('temp2', 'temp2')
                    RB.load('screen2').then(() => {
                        expect(RB.resources.json.toObject())
                            .toContainAllEntries([['game.json', 'myConfig'], ['perm.json', 'perm1'], ['temp2.json', 'temp2']])

                        expect(RB.hasPermanentJson('game')).toBeTrue()
                        RB.removeJson('game')
                        expect(RB.hasPermanentJson('game')).toBeFalse()
                        expect(RB.resources.json.toObject())
                            .toContainAllEntries([['perm.json', 'perm1'], ['temp2.json', 'temp2']])
                    })
                })
            })
        })
    }

    // global server dependencies
    {
        const RB = newResourceManager({[id2coreTid('scope2ids')]: {'test': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar'})
        RB.load('test', true).then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar']])
        })
    }

    // global server dependencies
    {
        const RB = newResourceManager(
            {[id2coreTid('scope2ids')]: {globals: [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bar2', [id2coreTid('id2children')]: {[id2jsonTid('foo')]: [id2jsonTid('foo2')]}})
        RB.loadPermanentScope('globals').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar'], ['foo2.json', 'bar2']])
        })
    }

    // page server dependencies
    {
        const RB = newResourceManager({[id2coreTid('scope2ids')]: {'screen1': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bar2'})
        RB.addJson('foo2')
        RB.loadTemporaryScope('screen1').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar'], ['foo2.json', 'bar2']])
        })
    }

    // server dep overwritten by local store
    {
        const RB = newResourceManager({[id2coreTid('scope2ids')]: {'globals': [id2jsonTid('foo'), id2jsonTid('foo2')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bars'}, {[id2coreTid('scope2ids')]: {'globals': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar2'})
        RB.loadPermanentScope('globals').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar2'], ['foo2.json', 'bars']])
        })
    }

    // store->server->store scope dependency
    {
        const RB = newResourceManager(
            {
                [id2coreTid('scope2ids')]: {
                    screen: [id2jsonTid('b')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('b')]: [id2jsonTid('c')]
                },
                [id2jsonTid('b')]: 'foo2'
            },
            {
                [id2coreTid('scope2ids')]: {
                    screen: [id2jsonTid('a')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('a')]: [id2jsonTid('b')]
                },
                [id2jsonTid('a')]: 'foo1',
                [id2jsonTid('c')]: 'foo3'
            }
        )
        RB.loadTemporaryScope('screen').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['a.json', 'foo1'], ['b.json', 'foo2'], ['c.json', 'foo3']])
        })
    }

    // server->store->server scope dependency
    {
        const RB = newResourceManager(
            {
                [id2coreTid('scope2ids')]: {
                    screen: [id2jsonTid('a')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('a')]: [id2jsonTid('b')]
                },
                [id2jsonTid('a')]: 'foo1',
                [id2jsonTid('c')]: 'foo3'
            },
            {
                [id2coreTid('scope2ids')]: {
                    screen: [id2jsonTid('b')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('b')]: [id2jsonTid('c')]
                },
                [id2jsonTid('b')]: 'foo2'
            }
        )
        RB.loadTemporaryScope('screen').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['a.json', 'foo1'], ['b.json', 'foo2'], ['c.json', 'foo3']])
        })
    }

        // check clear of store-only dependence
        {
            const RB = newResourceManager({},{
                [id2coreTid('scope2ids')]: {
                    'testScreen': [id2jsonTid('font')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('font')]: [id2imageTid('myFont')]
                },
                [id2jsonTid('font')]: 'foo',
                [id2imageTid('myFont')]: 'fooimg'
            })

            RB.loadTemporaryScope('testScreen').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['font.json', 'foo']])
                expect(RB.resources.image.toObject())
                    .toContainAllEntries([['myFont.png', 'fooimg']])

                RB.deleteFromStore(id2imageTid('myFont')).then(() => {
                    RB.load('testScreen').then(() => {
                        expect(RB.resources.json.toObject())
                            .toContainAllEntries([['font.json', 'foo']])
                        expect(RB.resources.image.toObject())
                            .toBeEmptyObject()
                    })
                })
            })
        }

        // check clear of store-only resource + dependence
        {
            const RB = newResourceManager({}, {
                [id2coreTid('scope2ids')]: {
                    'testScreen': [id2jsonTid('font')]
                },
                [id2coreTid('id2children')]: {
                    [id2jsonTid('font')]: [id2imageTid('myFont')]
                },
                [id2jsonTid('font')]: 'foo',
                [id2imageTid('myFont')]: 'fooimg'
            })
            RB.loadTemporaryScope('testScreen').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['font.json', 'foo']])
                expect(RB.resources.image.toObject())
                    .toContainAllEntries([['myFont.png', 'fooimg']])

                RB.deleteFromStore(id2jsonTid('font')).then(() => {
                    RB.loadTemporaryScope('testScreen').then(() => {
                        expect(RB.resources.json.toObject())
                            .toBeEmptyObject()
                        expect(RB.resources.image.toObject())
                            .toBeEmptyObject()
                    })
                })
            })
        }

        // simple json store
        {
            const RB = newResourceManager()
            RB.storeModel(makeModels({[id2jsonTid('foo')]: 'bar'}), 'test')
            RB.loadTemporaryScope('test').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['foo.json', 'bar']])
                expect(RB.resources.image.toObject())
                    .toBeEmptyObject()
                expect(RB.getResourceOrigin(id2jsonTid('foo'))).toEqual('browser.data')
            })
        }

    // simple json store & deploy
    {
        const RB = newResourceManager()
        RB.storeModel(makeModels({[id2jsonTid('foo')]: 'bar'}), 'testfoo')
        RB.deployModel(makeModels({[id2jsonTid('foo')]: 'bar2'}), 'testfoo').then(() => {
            RB.loadTemporaryScope('testfoo').then(() => {
                expect(RB.getResourceOrigin(id2jsonTid('foo'))).toEqual('server.data')
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['foo.json', 'bar2']])
                expect(RB.resources.image.toObject())
                    .toBeEmptyObject()
            })
        })
    }

    // json store with dep
    {
        const RB = newResourceManager()
        const models = makeModels({
            [id2jsonTid('foo')]: 'bar',
            [id2imageTid('barimg')]: 'myImg'
        }, {[id2jsonTid('foo')]: [id2imageTid('barimg')]})
        RB.storeModel(models, 'test')
        RB.loadTemporaryScope('test').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar']])
            expect(RB.resources.image.toObject())
                .toContainAllEntries([['barimg.png', 'myImg']])
        })
    }

    // json store + deploy with dep
    {
        const RB = newResourceManager()
        const model = makeModels({
            [id2jsonTid('foo')]: 'bar',
            [id2imageTid('barimg')]: 'myImg'
        }, {[id2jsonTid('foo')]: [id2imageTid('barimg')]})
        RB.storeModel(model, 'test')
        RB.deployModel(model, 'test').then(() => {
            RB.loadTemporaryScope('test').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['foo.json', 'bar']])
                expect(RB.resources.image.toObject())
                    .toContainAllEntries([['barimg.png', 'myImg']])
                expect(RB.getResourceOrigin(id2jsonTid('foo'))).toEqual('server.data')
                expect(RB.getResourceOrigin(id2imageTid('barimg'))).toEqual('server.data')
            })
        })
    }

    // json store with deep deps
    {
        const RB = newResourceManager()
        RB.storeModel(makeModels({
            [id2jsonTid('font')]: 'myFont',
            [id2jsonTid('foo')]: 'bar',
            [id2imageTid('barimg')]: 'myImg'
        }, {[id2jsonTid('foo')]: [id2imageTid('barimg')], [id2jsonTid('font')]: [id2jsonTid('foo')]}), 'test')
        RB.loadTemporaryScope('test').then(() => {
            expect(RB.resources.json.toObject())
                .toContainAllEntries([['foo.json', 'bar'], ['font.json', 'myFont']])
            expect(RB.resources.image.toObject())
                .toContainAllEntries([['barimg.png', 'myImg']])
        })
    }

    // json store with deep deps
    {
        const RB = newResourceManager()
        const model = makeModels({
            [id2jsonTid('font')]: 'myFont',
            [id2jsonTid('foo')]: 'bar',
            [id2imageTid('barimg')]: 'myImg'
        }, {[id2jsonTid('foo')]: [id2imageTid('barimg')], [id2jsonTid('font')]: [id2jsonTid('foo')]}
        )
        RB.storeModel(model, 'test')
        RB.deployModel(model, 'test').then(() => {
            RB.loadTemporaryScope('test').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['foo.json', 'bar'], ['font.json', 'myFont']])
                expect(RB.resources.image.toObject())
                    .toContainAllEntries([['barimg.png', 'myImg']])
                expect(RB.getResourceOrigin(id2jsonTid('foo'))).toEqual('server.data')
                expect(RB.getResourceOrigin(id2jsonTid('font'))).toEqual('server.data')
                expect(RB.getResourceOrigin(id2imageTid('barimg'))).toEqual('server.data')
            })
        })
    }

    // store with dep and deploy dep
    {
        const RB = newResourceManager()
        const model = makeModels({
            [id2jsonTid('foo')]: 'bar',
            [id2imageTid('barimg')]: 'myImg'
        }, {[id2jsonTid('foo')]: [id2imageTid('barimg')]})
        RB.storeModel(model, 'test')
        // foo mit abhängigen "ibarimg" wird im browser gespeichert
        RB.deployModel(makeModels({[id2imageTid('barimg')]: 'myImg'})).then(() => {
            // deployment of "ibarimg"
            // => abhängigkeit von foo im store muss erhalten bleiben
            //    content muss aber vom server statt
            RB.loadTemporaryScope('test').then(() => {
                expect(RB.resources.json.toObject())
                    .toContainAllEntries([['foo.json', 'bar']])
                expect(RB.resources.image.toObject())
                    .toContainAllEntries([['barimg.png', 'myImg']])
                expect(RB.getResourceOrigin(id2jsonTid('foo'))).toEqual('browser.data')
                expect(RB.getResourceOrigin(id2imageTid('barimg'))).toEqual('server.data')
            })
        })
    }

    // prefetch

    // start preview
    // end preview
    /*
    {
        const RB = newResourceManager(getApiResponse({notFound: ['x']}), {x: 'local'}, {x: 'preview'})
        RB.add('x')
        RB.load().then(() => {
            expect(RB.resources)
                .toContainAllEntries([['x', 'local']])
            RB.setPreview(true)
            expect(RB.resources)
                .toContainAllEntries([['x', 'preview']])
            RB.setPreview(false)
            expect(RB.resources)
                .toContainAllEntries([['x', 'local']])

        })

    }
    */

    // goto page

    // clear temp

    // clear permanent

    // store model

    // deploy model

})

test('createImageResource', () => {
    {
        const res = createImageResource(undefined, 'foo')
        expect(res).toBeInstanceOf(ImageResource)
        expect(res.isResolved()).toBeTrue()
        expect(res.getId()).toBe('foo')
        expect(res.width).toBe(100)
        expect(res.height).toBe(100)
        expect(res.getImage()).toContainAnyEntries([['width', 100], ['height', 100]])
    }

    {
        const res = createImageResource(null)
        expect(res).toBeInstanceOf(ImageResource)
        expect(res.isResolved()).toBeTrue()
        expect(res.getId()).toBe(null)
    }
})

test('ResourceRequest', () => {

    const req = resources => new ResourceRequest(resources)
    {
        const r = req()
        r.addToManager(newResourceManager())
        expect(r.isEmpty()).toBeTrue()
    }

    {
        const r = req()
        expect(() => r.addToManager()).toThrow()
    }

    {
        const r = req({image: {}})
        expect(r.isEmpty()).toBeTrue()
    }

    {
        const r = req({image: {foo: 'bar'}})
        expect(r.isEmpty()).toBeFalse()
    }

    {
        const r = req({image: {}, audio: {foo: 'bar'}})
        expect(r.isEmpty()).toBeFalse()
    }

    {
        const r = req({image: {}, audio: {}, video: {foo: 'bar'}})
        expect(r.isEmpty()).toBeFalse()
    }

    {
        const r = req({
            json: {foo: 'bar', 'f.json': () => 'ok'},
            image: {foo2: 'bar2', 'f2.png': () => 'ok2'},
            audio: {foo3: 'bar3', 'f3.wav': () => 'ok3'},
            video: {foo4: 'bar4', 'f4.mp4': () => 'ok4'}
        })
        expect(r.isEmpty()).toBeFalse()

        const RB = newResourceManager()
        r.addToManager(RB)
        RB.loadTemporaryScope('foo').then(() => {
            expect(RB.resources.json.toObject()).toContainAllEntries([['foo.json', 'bar'], ['f.json', 'ok']])
            expect(RB.resources.image.toObject()).toContainAllEntries([['foo2.png', 'bar2'], ['f2.png', 'ok2']])
            expect(RB.resources.audio.toObject()).toContainAllEntries([['foo3.wav', 'bar3'], ['f3.wav', 'ok3']])
        })
    }
})
