import { intersect, without, toPairs, toKeys,  d } from "helper/helper"
import { ResourceManager, ImageResources, AudioResources, JsonResources, Resources,
    SingleResourceProvider, getResourcesAndCallback, id2jsonTid, id2imageTid, tid2typeText, tid2id, id2tid,
    resId2tid, typeText2tid
} from "core/resources"
import { MapStorageHandler, StorageManager } from "core/storage"

test('ResourceManager', () => {

    function makeModels(models, dependencies = {}) {
        return {
            getResourcesAndDependencies: () => {
                const resources = []
                for (const [ tid, data ] of toPairs(models)) {
                    const type = tid2typeText(tid)
                    const id = tid2id(tid)
                    resources.unshift({ id, data, type })
                }
                return {
                    resources,
                    dependencies
                }
            }
        }
    }

    const getApiResponse = serverResourcesObj => {
        const map =  new Map()
        for (const [ key, value ] of Object.entries(serverResourcesObj)) map.set(key, value)

        const scope2ids = map.get(id2jsonTid('scope2ids')) ?? {}
        const id2children = map.get(id2jsonTid('id2children')) ?? {}

        const routes = {
            has: ({ resources }) => {
                const found = []
                for (const tid of resources) {
                    if (map.has(tid)) found.push(tid)
                }
                return Promise.resolve({ found })
            },

            store: ({ resources, dependencies, scope = null }) => {
                const stored = []
                for (const { id, type, data } of resources) {
                    const tid = typeText2tid(type, id)
                    map.set(tid, data)
                    stored.push(tid)
                }
                for (const [ resId, resIds ] of toPairs(dependencies)) {
                    id2children[resId] = resIds
                }
                if (scope !== null) {
                    const scopeIds = scope2ids[scope] ?? []
                    const tid = typeText2tid(resources[0].type, resources[0].id)
                    if (!scopeIds.includes(tid)) scopeIds.push(tid)
                    scope2ids[scope] = scopeIds
                }
                return Promise.resolve({ stored })
            },

            resources: ({ scope, resources, storeInfo }) => {

                const requestedTids = [ ...resources ]
                const found = {}
                const add = []
                const missing = []
                const { id2resolved, id2children: storeId2children } = storeInfo
                const storedTids = toKeys(id2resolved)

                const scopeIds = scope2ids[scope] ?? []
                for (const tid of scopeIds) {
                    if (!requestedTids.includes(tid)) requestedTids.push(tid)
                }

                for (const tid of requestedTids) {
                    if (storedTids.includes(tid)) {
                        if (!id2resolved[tid]) {
                            add.push(tid)
                        }
                        const children = storeId2children[tid] ?? []
                        for (const child of children) {
                            if (requestedTids.includes(child)) continue
                            requestedTids.push(child)
                        }
                        continue
                    }

                    const value = map.get(tid)
                    if (value) {
                        found[tid] = value
                        const children = id2children[tid] ?? []
                        for (const child of children) {
                            if (requestedTids.includes(child)) continue
                            requestedTids.push(child)
                        }
                    } else {
                        missing.push(tid)
                    }
                }
                return Promise.resolve({ found, missing, add })
            }
        }

        return {
            fetch: (name, json) => routes[name](json)
        }
    }

    const newResourceManager = (server = {}, local = {}, session = {}) => {
        const apiFetcher = getApiResponse(server)
        const localStorage = new StorageManager(MapStorageHandler())
        localStorage.storeFromObject(local)
        const sessionStorage = new StorageManager(MapStorageHandler())
        sessionStorage.storeFromObject(session)
        return new ResourceManager(apiFetcher, localStorage, sessionStorage)
    }

    // browser override
    {
        const RB = newResourceManager({}, {[id2jsonTid('test')]: 'z'})

        expect(RB.resources.json).toBeEmptyObject()
        RB.addJson('test', 'xy')
        expect(RB.resources.json).toBeEmptyObject()

        RB.load().then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['test', 'z']])
            expect(RB.getJsonSource('test')).toEqual('browser')
        })
    }

    // code fallback
    {
        const RB = newResourceManager({}, {[id2jsonTid('x')]: 'y'})
        expect(RB.resources.json).toBeEmptyObject()

        RB.addJson('foo', 'bar')
        RB.load().then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar']])
            expect(RB.getJsonSource('foo'))
                .toEqual('code')
        })
    }

    // remote override
    {
        const RB = newResourceManager({[id2jsonTid('foo')]: 'bar2'}, {[id2jsonTid('x')]: 'y'})
        expect(RB.resources.json).toBeEmptyObject()

        RB.addJson('foo', 'bar')
        RB.load().then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar2']])
            expect(RB.getJsonSource('foo'))
                .toEqual('server')
        })
    }

    // all in one
    {
        const RB = newResourceManager(
            {[id2jsonTid('c')]: 'C'},
            {[id2jsonTid('a')]: 'A'},
            {}
        )
        expect(RB.resources.json).toBeEmptyObject()

        RB.addJson('a', '_a')
        RB.addJson('b', '_b')
        RB.addJson('c', '_c')
        RB.load().then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['a', 'A'], ['b', '_b'], ['c', 'C']])
        })
    }

    // temp and permanent
    {
        const RB = newResourceManager({}, {[id2jsonTid('x')]: 'perm', [id2jsonTid('y')]: 'temp1', [id2jsonTid('z')]: 'temp2'});
        RB.addJson('x');
        RB.load('myScope', true).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['x', 'perm']])

            RB.addJson('y')
            RB.load('myScope', false).then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['x', 'perm'], ['y', 'temp1']])

                RB.addJson('z')
                RB.load('myScope', false).then(() => {
                    expect(RB.resources.json)
                        .toContainAllEntries([['x', 'perm'], ['z', 'temp2']])
                })
            })
        })
    }

    // game instantiation
    {
        const RB = newResourceManager()
        RB.addJson('game', 'myConfig')
        RB.load('game', true).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['game', 'myConfig']])

            // globals
            RB.addJson('perm', 'perm1')
            RB.load('global', true).then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['game', 'myConfig'], ['perm', 'perm1']])

                RB.addJson('temp', 'temp1')
                RB.load('screen1').then(() => {
                    expect(RB.resources.json)
                        .toContainAllEntries([['game', 'myConfig'], ['perm', 'perm1'], ['temp', 'temp1']])

                    RB.addJson('temp2', 'temp2')
                    RB.load('screen2').then(() => {
                        expect(RB.resources.json)
                            .toContainAllEntries([['game', 'myConfig'], ['perm', 'perm1'], ['temp2', 'temp2']])

                        expect(RB.hasPermanentJson('game')).toBeTrue()
                        RB.removeJson('game')
                        expect(RB.hasPermanentJson('game')).toBeFalse()
                        expect(RB.resources.json)
                            .toContainAllEntries([['perm', 'perm1'], ['temp2', 'temp2']])
                    })
                })
            })
        })
    }

    // global server dependencies
    {
        const RB = newResourceManager({[id2jsonTid('scope2ids')]: {'': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar'})
        RB.load('', true).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar']])
        })
    }

    // global server dependencies
    {
        const RB = newResourceManager(
            {[id2jsonTid('scope2ids')]: {'': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bar2', [id2jsonTid('id2children')]: {[id2jsonTid('foo')]: [id2jsonTid('foo2')]}})
        RB.load('', true).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar'], ['foo2', 'bar2']])
        })
    }

    // page server dependencies
    {
        const RB = newResourceManager({[id2jsonTid('scope2ids')]: {'screen1': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bar2'})
        RB.addJson('foo2')
        RB.load('screen1', false).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar'], ['foo2', 'bar2']])
        })
    }

    // server dep overwritten by local store
    {
        const RB = newResourceManager({[id2jsonTid('scope2ids')]: {'': [id2jsonTid('foo'), id2jsonTid('foo2')]}, [id2jsonTid('foo')]: 'bar', [id2jsonTid('foo2')]: 'bars'}, {[id2jsonTid('scope2ids')]: {'': [id2jsonTid('foo')]}, [id2jsonTid('foo')]: 'bar2'})
        RB.load('', true).then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar2'], ['foo2', 'bars']])
        })
    }

    // store->server->store scope dependency
    {
        const RB = newResourceManager(
            {
                [id2jsonTid('scope2ids')]: {
                    screen: [id2jsonTid('b')]
                },
                [id2jsonTid('id2children')]: {
                    [id2jsonTid('b')]: [id2jsonTid('c')]
                },
                [id2jsonTid('b')]: 'foo2'
            },
            {
                [id2jsonTid('scope2ids')]: {
                    screen: [id2jsonTid('a')]
                },
                [id2jsonTid('id2children')]: {
                    [id2jsonTid('a')]: [id2jsonTid('b')]
                },
                [id2jsonTid('a')]: 'foo1',
                [id2jsonTid('c')]: 'foo3'
            }
        )
        RB.load('screen').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['a', 'foo1'], ['b', 'foo2'], ['c', 'foo3']])
        })
    }

    // server->store->server scope dependency
    {
        const RB = newResourceManager(
            {
                [id2jsonTid('scope2ids')]: {
                    screen: [id2jsonTid('a')]
                },
                [id2jsonTid('id2children')]: {
                    [id2jsonTid('a')]: [id2jsonTid('b')]
                },
                [id2jsonTid('a')]: 'foo1',
                [id2jsonTid('c')]: 'foo3'
            },
            {
                [id2jsonTid('scope2ids')]: {
                    screen: [id2jsonTid('b')]
                },
                [id2jsonTid('id2children')]: {
                    [id2jsonTid('b')]: [id2jsonTid('c')]
                },
                [id2jsonTid('b')]: 'foo2'
            }
        )
        RB.load('screen').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['a', 'foo1'], ['b', 'foo2'], ['c', 'foo3']])
        })
    }

    // check clear of store-only dependence
    {
        const RB = newResourceManager({},{
            [id2jsonTid('scope2ids')]: {
                'testScreen': [id2jsonTid('font')]
            },
            [id2jsonTid('id2children')]: {
                [id2jsonTid('font')]: [id2imageTid('myFont')]
            },
            [id2jsonTid('font')]: 'foo',
            [id2imageTid('myFont')]: 'fooimg'
        })
        RB.load('testScreen').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['font', 'foo']])
            expect(RB.resources.image)
                .toContainAllEntries([['myFont', 'fooimg']])

            RB.deleteFromStore(id2imageTid('myFont')).then(() => {
                RB.load('testScreen').then(() => {
                    expect(RB.resources.json)
                        .toContainAllEntries([['font', 'foo']])
                    expect(RB.resources.image)
                        .toBeEmptyObject()
                })
            })
        })
    }

    // check clear of store-only resource + dependence
    {
        const RB = newResourceManager({}, {
            [id2jsonTid('scope2ids')]: {
                'testScreen': [id2jsonTid('font')]
            },
            [id2jsonTid('id2children')]: {
                [id2jsonTid('font')]: [id2imageTid('myFont')]
            },
            [id2jsonTid('font')]: 'foo',
            [id2imageTid('myFont')]: 'fooimg'
        })
        RB.load('testScreen').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['font', 'foo']])
            expect(RB.resources.image)
                .toContainAllEntries([['myFont', 'fooimg']])

            RB.deleteFromStore(id2jsonTid('font')).then(() => {
                RB.load('testScreen').then(() => {
                    expect(RB.resources.json)
                        .toBeEmptyObject()
                    expect(RB.resources.image)
                        .toBeEmptyObject()
                })
            })
        })
    }

    // simple json store
    {
        const RB = newResourceManager()
        RB.storeModel(makeModels({[id2jsonTid('foo')]: 'bar'}), 'test')
        RB.load('test').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar']])
            expect(RB.resources.image)
                .toBeEmptyObject()
            expect(RB.getResourceSource(id2jsonTid('foo'))).toEqual('browser')
        })
    }

    // simple json store & deploy
    {
        const RB = newResourceManager()
        RB.storeModel(makeModels({[id2jsonTid('foo')]: 'bar'}), 'test')
        RB.deployModel(makeModels({[id2jsonTid('foo')]: 'bar2'}), 'test').then(() => {
            RB.load('test').then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['foo', 'bar2']])
                expect(RB.resources.image)
                    .toBeEmptyObject()
                expect(RB.getResourceSource(id2jsonTid('foo'))).toEqual('server')
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
        RB.load('test').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar']])
            expect(RB.resources.image)
                .toContainAllEntries([['barimg', 'myImg']])
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
            RB.load('test').then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['foo', 'bar']])
                expect(RB.resources.image)
                    .toContainAllEntries([['barimg', 'myImg']])
                expect(RB.getResourceSource(id2jsonTid('foo'))).toEqual('server')
                expect(RB.getResourceSource(id2imageTid('barimg'))).toEqual('server')
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
        RB.load('test').then(() => {
            expect(RB.resources.json)
                .toContainAllEntries([['foo', 'bar'], ['font', 'myFont']])
            expect(RB.resources.image)
                .toContainAllEntries([['barimg', 'myImg']])
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
            RB.load('test').then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['foo', 'bar'], ['font', 'myFont']])
                expect(RB.resources.image)
                    .toContainAllEntries([['barimg', 'myImg']])
                expect(RB.getResourceSource(id2jsonTid('foo'))).toEqual('server')
                expect(RB.getResourceSource(id2jsonTid('font'))).toEqual('server')
                expect(RB.getResourceSource(id2imageTid('barimg'))).toEqual('server')
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
            RB.load('test').then(() => {
                expect(RB.resources.json)
                    .toContainAllEntries([['foo', 'bar']])
                expect(RB.resources.image)
                    .toContainAllEntries([['barimg', 'myImg']])
                expect(RB.getResourceSource(id2jsonTid('foo'))).toEqual('browser')
                expect(RB.getResourceSource(id2imageTid('barimg'))).toEqual('server')
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


test('SingleResourceProvider', () => {
    expect(() => (new SingleResourceProvider()).key).toThrow('No key')
    expect(() => (new SingleResourceProvider()).validateContent()).not.toThrow('No key')
})

test('ImageResources', () => {
    expect(() => ImageResources({'foo.png': 'http://bar'}).add('foo.png', 'http://bar2'))
        .toThrow('already exists')
    expect(() => ImageResources({'foo.jpg': 'http://bar'}))
        .toThrow('.png')
    expect(() => ImageResources({'foo.jpeg': 'http://bar'}))
        .toThrow('.png')
    expect(() => ImageResources({'foo.gif': 'http://bar'}))
        .toThrow('.png')

    expect(() => ImageResources().add(false, 'foo'))
        .toThrow('type')
    expect(() => ImageResources().add(null, 'foo'))
        .toThrow('type')
    expect(() => ImageResources().add(undefined, 'foo'))
        .toThrow('type')
    expect(() => ImageResources().addArray('foo.png', null))
        .toThrow('array')
    expect(() => ImageResources().addArray('foo.png', {}))
        .toThrow('array')
    expect(() => ImageResources().addArray('foo.png', 'http://bar'))
        .toThrow('array')
    expect(() => ImageResources().addObject(null))
        .toThrow('object')
    expect(() => ImageResources().addObject('foo'))
        .toThrow('object')

    expect(() => ImageResources().add('foo.png', null))
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', 666))
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', {}))
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', 'xy'))
        .toThrow('URL')
    expect(() => ImageResources().add('foo.png', () => null).resources.image['foo.png']())
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', () => 666).resources.image['foo.png']())
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', () => ({})).resources.image['foo.png']())
        .toThrow('string')
    expect(() => ImageResources().add('foo.png', () => (() => {})).resources.image['foo.png']())
        .toThrow('string')

    expect(ImageResources().resources)
        .toMatchObject({image: {}})

    expect(ImageResources({'foo.png': 'http://bar'}).resources)
        .toMatchObject({image: {'foo.png': 'http://bar'}})

    expect(ImageResources().add('foo.png', () => 'http://bar').resources.image['foo.png']())
        .toEqual('http://bar')

    expect(ImageResources().add('foo.png', 'http://bar').resources)
        .toMatchObject({image: {'foo.png': 'http://bar'}})

    expect(ImageResources().add('foo.png', 'data:image/png;base64,XCD').resources)
        .toMatchObject({image: {'foo.png': 'data:image/png;base64,XCD'}})

    expect(ImageResources({'foo.png': 'http://bar'}).add('foo2.png', 'http://bar2').resources)
        .toMatchObject({image: {'foo.png': 'http://bar', 'foo2.png': 'http://bar2'}})

    expect(ImageResources({'foo.png': 'http://bar', 'foo2.png': 'http://bar2'}).resources)
        .toMatchObject({image: {'foo.png': 'http://bar', 'foo2.png': 'http://bar2'}})

    expect(ImageResources().add({'foo.png': 'http://bar', 'foo2.png': 'http://bar2'}).resources)
        .toMatchObject({image: {'foo.png': 'http://bar', 'foo2.png': 'http://bar2'}})

    expect(ImageResources({'foo.png': ['http://bar', 'http://bar2']}).resources)
        .toMatchObject({image: {'foo_0.png': 'http://bar', 'foo_1.png': 'http://bar2'}})

    expect(ImageResources({'My_home/Img_files/Foo.bar_img.png': 'https://foo'}).resources)
        .toMatchObject({image: {'My_home/Img_files/Foo.bar_img.png': 'https://foo'}})
})

test('AudioResources', () => {
    expect(() => AudioResources({'foo.mp3': 'http://bar'}).add('foo.mp3', 'http://bar2').resources)
        .toThrow('already exists')
    expect(() => AudioResources({'foo': 'http://bar'}))
        .toThrow('.wav')
    expect(() => AudioResources({'foo.ogg': 'http://bar'}))
        .toThrow('.mp3')
    expect(() => AudioResources().add(false, 'foo'))
        .toThrow('type')
    expect(() => AudioResources().add(null, 'foo'))
        .toThrow('type')
    expect(() => AudioResources().add(undefined, 'foo'))
        .toThrow('type')
    expect(() => AudioResources().addArray('foo.mp3', null))
        .toThrow('array')
    expect(() => AudioResources().addArray('foo.mp3', {}))
        .toThrow('array')
    expect(() => AudioResources().addArray('foo.mp3', 'http://bar'))
        .toThrow('array')
    expect(() => AudioResources().addObject(null))
        .toThrow('object')
    expect(() => AudioResources().addObject('foo'))
        .toThrow('object')
    expect(() => AudioResources().add('foo.mp3', null))
        .toThrow('string')
    expect(() => AudioResources().add('foo.wav', 666))
        .toThrow('string')
    expect(() => AudioResources().add('foo.mp3', {}))
        .toThrow('string')
    expect(() => AudioResources().add('foo.wav', 'xy'))
        .toThrow('URL')

    expect(AudioResources().resources)
        .toMatchObject({audio: {}})

    expect(AudioResources({'foo.mp3': 'http://bar'}).resources)
        .toMatchObject({audio: {'foo.mp3': 'http://bar'}})

    expect(AudioResources().add('foo.mp3', () => 'http://bar').resources.audio['foo.mp3']())
        .toEqual('http://bar')

    expect(AudioResources().add('foo.mp3', 'http://bar').resources)
        .toMatchObject({audio: {'foo.mp3': 'http://bar'}})

    expect(AudioResources({'foo.mp3': 'http://bar'}).add('foo2.mp3', 'http://bar2').resources)
        .toMatchObject({audio: {'foo.mp3': 'http://bar', 'foo2.mp3': 'http://bar2'}})

    expect(AudioResources({'foo.mp3': 'http://bar', 'foo2.mp3': 'http://bar2'}).resources)
        .toMatchObject({audio: {'foo.mp3': 'http://bar', 'foo2.mp3': 'http://bar2'}})

    expect(AudioResources().add({'foo.mp3': 'http://bar', 'foo2.mp3': 'http://bar2'}).resources)
        .toMatchObject({audio: {'foo.mp3': 'http://bar', 'foo2.mp3': 'http://bar2'}})

    expect(AudioResources({'foo.mp3': ['http://bar', 'http://bar2']}).resources)
        .toMatchObject({audio: {'foo_0.mp3': 'http://bar', 'foo_1.mp3': 'http://bar2'}})

    expect(AudioResources({'My_home/Audio_files/Foo.bar_audio.mp3': 'http://foo'}).resources)
        .toMatchObject({audio: {'My_home/Audio_files/Foo.bar_audio.mp3': 'http://foo'}})
})

test('JsonResources', () => {
    expect(() => JsonResources({'foo': 'http://bar'}).add('foo', 'http://bar2').resources)
        .toThrow('already exists')
    expect(() => JsonResources().add(false, 'foo')).toThrow('type')
    expect(() => JsonResources().add(false, 'foo'))
        .toThrow('type')
    expect(() => JsonResources().add(null, 'foo'))
        .toThrow('type')
    expect(() => JsonResources().add(undefined, 'foo'))
        .toThrow('type')
    expect(() => JsonResources().addArray('foo', null))
        .toThrow('array')
    expect(() => JsonResources().addArray('foo', {}))
        .toThrow('array')
    expect(() => JsonResources().addArray('foo', 'http://bar'))
        .toThrow('array')
    expect(() => JsonResources().addObject(null))
        .toThrow('object')
    expect(() => JsonResources().addObject('foo'))
        .toThrow('object')
    expect(() => JsonResources().add('foo', null))
        .toThrow('object')
    expect(() => JsonResources().add('foo', 666))
        .toThrow('object')
    expect(() => JsonResources().add('foo', undefined))
        .toThrow('object')
    expect(() => JsonResources().add('foo', 'xy'))
        .toThrow('URL')

    expect(JsonResources().resources)
        .toMatchObject({json: {}})

    expect(JsonResources({'foo': 'http://bar'}).resources)
        .toMatchObject({json: {'foo': 'http://bar'}})

    expect(JsonResources().add('foo', 'http://bar').resources)
        .toMatchObject({json: {'foo': 'http://bar'}})

    expect(JsonResources().add('foo', () => ({hello: 'kitty'})).resources.json['foo']())
        .toMatchObject({hello: 'kitty'})

    expect(JsonResources({'foo': 'http://bar'}).add('foo2', 'http://bar2').resources)
        .toMatchObject({json: {'foo': 'http://bar', 'foo2': 'http://bar2'}})

    expect(JsonResources({'foo': 'http://bar', 'foo2': 'http://bar2'}).resources)
        .toMatchObject({json: {'foo': 'http://bar', 'foo2': 'http://bar2'}})

    expect(JsonResources().add({'foo': 'http://bar', 'foo2': 'http://bar2'}).resources)
        .toMatchObject({json: {'foo': 'http://bar', 'foo2': 'http://bar2'}})

    expect(JsonResources({'foo': ['http://bar', 'http://bar2']}).resources)
        .toMatchObject({json: {'foo_0': 'http://bar', 'foo_1': 'http://bar2'}})

    expect(JsonResources({'My_home/Json_files/Foo.bar_json': {bla: 'boo'}}).resources)
        .toMatchObject({json: {'My_home/Json_files/Foo.bar_json': {bla: 'boo'}}})
})

test('Resources', () => {
    expect(() => Resources().add('foo', 'http://bar', 'xx')).toThrow('foo')
    expect(() => Resources({foo: 'http://bar'})).toThrow('foo')
    expect(() => Resources({foo: {foo2: 'http://bar'}})).toThrow('foo')
    expect(() => Resources({image: {'foo.png': 'https://bar'}}).addImage('foo.png', 'https://bar2')).toThrow('already exists')
    expect(() => Resources().addImage(false, 'https://foo')).toThrow('type')
    expect(() => Resources().addAudio(null, 'foo')).toThrow('type')
    expect(() => Resources().addJson('', 'foo')).toThrow('empty')
    expect(() => Resources().addJson('.', 'foo')).toThrow('Invalid')
    expect(() => Resources().addImage('äüö.png', 'https://foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('/hey.mp3', 'foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('hey/.mp3', 'foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('hey//.mp3', 'foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('hey/./mp3', 'foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('hey.mp3/', 'foo')).toThrow('Invalid')
    expect(() => Resources().addAudio('hey\\foo.mp3', 'foo')).toThrow('Invalid')

    expect(Resources().resources)
        .toMatchObject({image: {}, audio: {}, json: {}})

    expect(Resources({image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo3': 'http://bar3'}}).resources)
        .toMatchObject({image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo3': 'http://bar3'}})

    expect(Resources().add('image', 'foo.png', 'https://bar').add('audio', 'foo.wav', 'http://bar2').add('json', 'foo3', 'http://bar3').resources)
        .toMatchObject({image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo3': 'http://bar3'}})

    expect(Resources().addImage('foo.png', 'https://bar').addAudio('foo.wav', 'http://bar2').addJson('foo3', 'http://bar3').resources)
        .toMatchObject({image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo3': 'http://bar3'}})

    expect(Resources().addImages({'foo.png': 'https://bar'}).addAudios({'foo.wav': 'http://bar2'}).addJsons({'foo3': 'http://bar3'}).resources)
        .toMatchObject({image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo3': 'http://bar3'}})

})

test('getResourcesAndCallback', () => {
    const callback = () => false
    expect(() => getResourcesAndCallback(callback, callback)).toThrow('Multiple callback')
    expect(() => getResourcesAndCallback(false)).toThrow('not allowed')
    expect(() => getResourcesAndCallback(0)).toThrow('not allowed')
    expect(() => getResourcesAndCallback({image: {'foo.png': 'https://bar'}}, ImageResources({'foo.png': 'https://bar2'}))).toThrow('already passed')

    expect(getResourcesAndCallback())
        .toMatchObject({callback: undefined, resources: {}})

    expect(getResourcesAndCallback(undefined, null))
        .toMatchObject({callback: undefined, resources: {}})

    expect(getResourcesAndCallback(callback))
        .toMatchObject({callback, resources: {}})

    expect(getResourcesAndCallback({image: {'foo.png': 'https://bar'}}, callback))
        .toMatchObject({callback, resources: {image: {'foo.png': 'https://bar'}}})

    expect(getResourcesAndCallback(ImageResources({'foo.png': 'https://bar'}), callback))
        .toMatchObject({callback, resources: {image: {'foo.png': 'https://bar'}}})

    expect(getResourcesAndCallback(callback, {image: {'foo.png': 'https://bar'}}))
        .toMatchObject({callback, resources: {image: {'foo.png': 'https://bar'}}})

    expect(getResourcesAndCallback(callback, {image: {'foo.png': 'https://bar'}}, {audio: {'foo.wav': 'http://bar2'}}, {json: {'foo': 'http://bar3'}}))
        .toMatchObject({callback, resources: {image: {'foo.png': 'https://bar'}, audio: {'foo.wav': 'http://bar2'}, json: {'foo': 'http://bar3'}}})

    expect(getResourcesAndCallback({image: {'foo.png': 'https://bar'}}, ImageResources({'foo2.png': 'https://bar2'})))
        .toMatchObject({callback: undefined, resources: {image: {'foo.png': 'https://bar', 'foo2.png': 'https://bar2'}}})

    expect(getResourcesAndCallback({audio: {'foo.mp3': 'http://bar'}}, AudioResources({'foo2.wav': 'http://bar2'})))
        .toMatchObject({callback: undefined, resources: {audio: {'foo.mp3': 'http://bar', 'foo2.wav': 'http://bar2'}}})

    expect(getResourcesAndCallback({json: {'foo': 'http://bar'}}, JsonResources({'foo2': 'http://bar2'})))
        .toMatchObject({callback: undefined, resources: {json: {'foo': 'http://bar', 'foo2': 'http://bar2'}}})
})
