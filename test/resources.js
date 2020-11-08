const {DependencyManager, StorageManager, ResourceLoader} = require('../src/app/engine');
const {ResourceDependencies, getFlatObjectResources} =require('../src/app/helper/helper');
const assert = require('chai').assert;

class FetcherMock {
    constructor() {
        this.responses = {};
    }

    addRespone(name, jsonOrFunc, http = 200) {
        if (this.responses[name] === undefined) {
            this.responses[name] = [];
        }
        this.responses[name].push({jsonOrFunc, http});
    }

    fetch(name, json) {
        let response = {found: [], notFound: []};
        if (this.responses[name] && this.responses[name].length !== 0) {
            const jsonOrFunc = this.responses[name].pop().jsonOrFunc;
            response = typeof jsonOrFunc === 'function' ? jsonOrFunc(json) : jsonOrFunc;
        }
        return Promise.resolve(response);
    }
}

const getFetcherMock = () => {
    const fetcher = new FetcherMock();
    fetcher.addResponse = fetcher.addRespone.bind(fetcher);
    fetcher.fetch = fetcher.fetch.bind(fetcher);
    return fetcher;
};

const getDummyStorage = () => {
    const dummyStorage = {
        items: {},
        length: 0,

        setItem(key, value) {
            this.items[key] = value;
            this.length = Object.keys(this.items).length;
        },
        getItem(key) {
            return this.items[key];
        },
        removeItem(key) {
            delete this.items[key];
            this.length = Object.keys(this.items).length;
        },
        key(no) {
            return Object.keys(this.items)[no];
        }
    };
    dummyStorage.setItem = dummyStorage.setItem.bind(dummyStorage);
    dummyStorage.getItem = dummyStorage.getItem.bind(dummyStorage);
    dummyStorage.removetItem = dummyStorage.removeItem.bind(dummyStorage);
    dummyStorage.key = dummyStorage.key.bind(dummyStorage);

    return new StorageManager(dummyStorage);
};

const assertSameObjects = (actual, expected) => {
    assert.isObject(actual);
    const keys = Object.keys(expected);
    assert.sameMembers(Object.keys(actual), keys);
    for (let key of keys) {
        assert.deepPropertyVal(actual, key, expected[key]);
    }
};

/**
==============================
 Overwrite Logic:
==============================
 A) Direct Resource (A)
 --------------------D1
 CODE:    x: A
 SERVER:     -
 BROWSER:    -
  =>      x: A (Code)
 --------------------D2
 CODE:       -
 SERVER:  x: A
 BROWSER:    -
 =>       x: A (Server
 --------------------D3
 CODE:       -
 SERVER:     -
 BROWSER: x: A
 =>       x: A (Browser)
 --------------------D4
 CODE:    x: A
 SERVER:  x: A
 BROWSER:    -
 =>       x: A (Server)
 --------------------D5
 CODE:    x: A
 SERVER:     -
 BROWSER: x: A
 =>       x: A (Browser)
 --------------------D6
 CODE:       -
 SERVER:  x: A
 BROWSER: x: A
 =>       x: A (Browser)
 --------------------D7
 CODE:    x: A
 SERVER:  x: A
 BROWSER: x: A
 =>       x: A (Browser)


 B) Indirect Resource (B)
 --------------------I1
 CODE:    x: -
 SERVER:  x: A->B
 BROWSER: x: -
 =>       x: A, B (Server)
 --------------------I2
 CODE:    x: -
 SERVER:  x: -
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I3
 CODE:    x: -
 SERVER:  x: A->B
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I4
 CODE:    x: -
 SERVER:  x: A->C
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I5
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: -
 =>       x: A, B (Server)
 --------------------I6
 CODE:    x: A
 SERVER:  x: -
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I7
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I8
 CODE:    x: A
 SERVER:  x: A->C
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I9
 CODE:    x: A
 SERVER:  x: B
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I10
 CODE:    x: -
 SERVER:  x: B
 BROWSER: x: A->B
 =>       x: A, B (Browser)
 --------------------I11
 CODE:    x: -
 SERVER:  x: A->B
 BROWSER: x: A
 =>       x: A (Browser)
 --------------------I12
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A
 =>       x: A (Browser)


 C) Mixed Resources (B)
 --------------------M1
 CODE:    x: A, B
 SERVER:  x: A
 BROWSER: x: B
 =>       x: A (Server), B (Browser)
 --------------------M2
 CODE:    x: A, B
 SERVER:  x: A
 BROWSER: x: C
 =>       x: A (Server), B (Code), C (Browser)
 --------------------M3
 CODE:    x: A, B
 SERVER:  x: A->B
 BROWSER: x: C
 =>       x: A, B (Server), C (Browser)
 --------------------M4
 CODE:    x: A, B
 SERVER:  x: A->B
 BROWSER: x: C->B
 =>       x: A (Server), B, C (Browser)
 --------------------M5
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: C->B
 =>       x: A (Server), B, C (Browser)
 --------------------M6
 CODE:    x: A
 SERVER:  x: C->B
 BROWSER: x: A->B
 =>       x: A, B (Browser) C (Server)
 --------------------M7
 CODE:    x: A
 SERVER:  x: A, B
 BROWSER: x: A, C
 =>       x: A, C (Browser), B (Server)
 --------------------M8
 CODE:    x: A, D
 SERVER:  x: A, B
 BROWSER: x: A, C
 =>       x: A, C (Browser), B (Server), D (Code)


 D) SubTree Overwrite
 --------------------O1
 CODE:    x: A
          y: -
 SERVER:  x: A->B->C
          Y: -
 BROWSER: x: -
          y: B->D

 =>       x: A (Server), B, D (Browser)
          y: B, D (Browser)

 --------------------O2
 CODE:    x: A
          y: -
 SERVER:  x: B->D
          Y: -
 BROWSER: x: -
          y: A->B->C

 =>       x: A, B, C (Browser)
          y: A, B, C (Browser)

 --------------------O2
 CODE:    x: -
          y: -
 SERVER:  x: B->D
          Y: -
 BROWSER: x: -
          y: A->B->C

 =>       x: B, C (Browser)
          y: A, B, C (Browser)


==============================
 Deploy Logic:
==============================
 --------------------L1
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A

 # Deploy x: A

 CODE:    x: A
 SERVER:  x: A
 BROWSER: x: -
 =>       x: A (Server)

 --------------------L2
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A->C

 # Deploy x: A->C

 CODE:    x: A
 SERVER:  x: A->C
 BROWSER: x: -
 =>       x: A, C (Server)

 --------------------L3
 CODE:    x: A
 SERVER:  x: A->B
          y: C
 BROWSER: x: A->C

 # Deploy x: A->C

 CODE:    x: A
 SERVER:  x: A->C
          y: C
 BROWSER: x: -
 =>       x: A, C (Server)
          y: C (Server)

 --------------------L4
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A->C
          y: C

 # Deploy x: A->C

 CODE:    x: A
 SERVER:  x: A->C
          y: C
 BROWSER: x: -

 =>       x: A, C (Server)
          y: C (Server)

 --------------------L4
 CODE:    x: A
 SERVER:  x: A->B
 BROWSER: x: A->C
          y: B->C

 # Deploy x: A->C

 CODE:    x: A
 SERVER:  x: A->C
          y: C
 BROWSER: x: -
          y: B

 =>       x: A, C (Server)
          y: B (Browser), C (Server)

 ??? woher kommt die Verbindung B->C ?



--------------------------
  Resource-Vars
--------------------------
 Direct:
   <screen>: [id1, ..., idN]
 Indirect:
   idx: [id1,...,idN]
 Remote:
   idx: [id1,...,idN]
 -------------------------
   Alle Resourcen in Direct & Indirect
   befinden sich auch im Storage
   Die Resourcen im Remote, befinden sich woanders
   und müssen vom FE requested werden
 -------------------------

 ---------------------
 A) LOAD page X:
 ---------------------
 BROWSER:
   1. Ermittel den Knotenpfad Py über indirect für jeden Knoten y in direct[X]
   2. Bilde die Vereinigungsmenge über die Knotenpfade => r1, ..., rN
   3. Ergänze die Knoten um ihre Remotes und bilde dann wieder die Vereinigungsmenge
      <= required IDs

 FE:
   1. Ergänze die Local-Ids um die required-Ids und durchlaufe Loading
   2. Die Resourcen aus Browser-Knotenpfaden sollten nun alle geladen sein
   3. Die Local- und Browser-Remote-Ids gehen nun an den Server

 SERVER:
   1. Der Server ermittelt zum screen x seine direct-Nodes und ergänzt diese
      um die request nodes
   2. Von dieser Knotenmenge, werden die Browser-Resolved wieder entfernt
   3. Es wird für jeden Knoten nun der Knotenpfad über die Server-Direct ermittelt
      wobei Knoten, die schon im Resolved stehen ignoriert werden
   4. Der Server schickt alle Resourcen aus der Vereinigungsmenge dieser
      Knotenpfade

 */

describe('ResourceLoader', function() {
    const testPng = "data:image/png;base64,iVBORw0KGgoAAA\n" +
        "ANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4\n" +
        "//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU\n" +
        "5ErkJggg==";

    const testOgg = "data:audio/ogg;base64,T2dnUwACAAAAAAAAAAA+..........+fm5nB6slBlZ3Fcha363d5ut7u3ni1rLoPf728l3KcK";

    const getScenario = (code, browser = {}, server = {}) => {
        const fetcher = getFetcherMock();
        const SM = getDummyStorage();
        const RL = new ResourceLoader(
            fetcher,
            SM
        );
        let hasPerm = false;

        // setup code
        if (code.json) {
            for (let [id, local] of Object.entries(code.json)) {
                RL.addJson(false, id, local);
            }
        }
        if (code.permJson) {
            for (let [id, local] of Object.entries(code.permJson)) {
                RL.addJson(true, id, local);
            }
            hasPerm = true;
        }
        if (code.image) {
            for (let [id, local] of Object.entries(code.image)) {
                RL.addImage(false, id, local);
            }
        }
        if (code.permImage) {
            for (let [id, local] of Object.entries(code.permImage)) {
                RL.addImage(true, id, local);
            }
            hasPerm = true;
        }
        if (code.audio) {
            for (let [id, local] of Object.entries(code.audio)) {
                RL.addAudio(false, id, local);
            }
        }
        if (code.permAudio) {
            for (let [id, local] of Object.entries(code.permAudio)) {
                RL.addAudio(true, id, local);
            }
            hasPerm = true;
        }

        // setup browser
        if (browser.json) {
            for (let [id, value] of Object.entries(browser.json)) {
                SM.storeJson(id, value);
            }
        }
        if (browser.image) {
            for (let [id, value] of Object.entries(browser.image)) {
                SM.storeImage(id, value);
            }
        }
        if (browser.audio) {
            for (let [id, value] of Object.entries(browser.audio)) {
                SM.storeAudio(id, value);
            }
        }
        if (browser.direct) {
            for (let [screen, resources] of Object.entries(browser.direct)) {
                for (let resource of resources) {
                    const parts = resource.split(':');
                    SM.storeScreenResource(screen, parts[0], parts[1]);
                }
            }
        }
        if (browser.indirect) {
            SM.storeResourceDependencies(browser.indirect);
        }
        if (browser.remotes) {
            SM.setRemotes(browser.remotes);
        }

        const dependencies = new ResourceDependencies(
            () => {},
            () => {},
            () => {},
            () => {},
            () => {}
        );

        const serverDirect = {};
        if (server.direct) {
            for (let [screen, deps] of Object.entries(server.direct)) {
                serverDirect[screen] = deflateResources(deps);
            }
        }
        const serverIndirect = server.indirect ? server.indirect : {};
        dependencies.setDirect(serverDirect);
        dependencies.setIndirect(serverIndirect);

        // setup server
        const getResponse = request => {
            const found = [];
            const notFound = [];
            const relevant = dependencies.getRelevantScreenResources(request.screen, request.resolved, request.overwrites, request.remotes);
            for (let resId of relevant.found) {
                const [type, id] = resId.split(':');
                request.resources.push({id, type});
            }
            for (let resId of relevant.notFound) {
                const [type, id] = resId.split(':');
                notFound.push({id, type});
            }

            for (let resource of request.resources) {
                const info = {id: resource.id, type: resource.type};
                let success = false;
                if (server[resource.type] && server[info.type][info.id]) {
                    info.data = server[info.type][info.id];
                    success = true;
                }
                if (success) {
                    found.push(info);
                } else {
                    notFound.push(info);
                }
            }
            return {found, notFound};
        };

        fetcher.addResponse(
            'resources',
            getResponse
        );

        fetcher.addResponse(
            'resources',
            getResponse
        );
        return {RL, SM, fetcher,
            assertResources: (resourcesBySource, notResources = []) => {
                for (let [source, resources] of Object.entries(resourcesBySource)) {
                    for (let resource of resources) {
                        const [type, id] = resource.split(':');
                        assert.isTrue(RL.hasResource(type, id), `The ${type} resource with id "${id}" does not exist!`);
                        const res = RL.getResource(type, id);
                        assert.propertyVal(res, 'id', id);
                        assert.strictEqual(RL.getResourceSource(resource), source, `Source mismatch for ${type} resource with id "${id}"!`);
                    }
                }
                for (let resource of notResources) {
                    const [type, id] = resource.split(':');
                    assert.isFalse(RL.hasResource(type, id));
                }
            }
        }
    };

    describe('extractPaths', function() {
        const getPaths = (params, v) => {
            const overwrites = params.overwrites ? params.overwrites : [];
            const serverIndirect = params.server ? params.server : {};
            const resolved = params.resolved ? params.resolved : [];

            const resourceDependencies = new ResourceDependencies(
                () => {},
                () => {},
                () => {},
                () => {},
                () => {}
            );
            resourceDependencies.setIndirect(serverIndirect);
            return resourceDependencies.extractDependencies(
                v,
                overwrites,
                resolved
            );
        };

        it('should return simple dependency', function () {
            const test = getPaths({
                server: {
                    'json:a': ['json:b']
                }
            }, 'json:a');
            assert.sameMembers(test.found, ['json:a', 'json:b']);
            assert.sameMembers(test.notFound, []);
        });

        it('should return simple multi dependency', function () {
            const test = getPaths({
                server: {
                    'json:a': ['json:b', 'json:c'],
                    'json:b': ['json:d'],
                    'json:c': [],
                    'json:e': []
                }
            }, 'json:a');
            assert.sameMembers(test.found, ['json:a', 'json:b', 'json:c', 'json:d']);
            assert.sameMembers(test.notFound, []);
        });

        it('should return resources of resolved dependency', function () {
            const test = getPaths({
                server: {
                    'json:a': ['json:b', 'json:c'],
                    'json:b': ['json:d'],
                    'json:c': [],
                    'json:e': []
                },
                resolved: ['json:b']
            }, 'json:a');
            assert.sameMembers(test.found, ['json:a', 'json:c', 'json:d']);
            assert.sameMembers(test.notFound, []);
        });

        it('should return subpath from overwrites', function () {
            const test = getPaths({
                server: {
                    'json:a': ['json:b', 'json:c'],
                    'json:b': ['json:d'],
                    'json:c': [],
                    'json:e': []
                },
                resolved: [],
                overwrites: {
                    'json:b': ['json:x']
                }
            }, 'json:a');
            assert.sameMembers(test.found, ['json:a', 'json:c']);
            assert.sameMembers(test.notFound, ['json:b', 'json:x']);
        });

        it('should return subpath from overwrites while ignoring subpath deps', function () {
            const test = getPaths({
                server: {
                    'json:a': ['json:b', 'json:c'],
                    'json:b': ['json:d'],
                    'json:c': [],
                    'json:e': [],
                    'json:x': ['json:e']
                },
                resolved: [],
                overwrites: {
                    'json:b': ['json:x'],
                    'json:x': []
                }
            }, 'json:a');
            assert.sameMembers(test.found, ['json:a', 'json:c']);
            assert.sameMembers(test.notFound, ['json:b', 'json:x']);
        });
    });

    describe('load()', function() {
        it('should return all code only resources ', function (done) {
            // only code resource
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                }

            );
            test.RL.load('page').then(() => {
                test.assertResources({
                    code: ['json:myTest', 'image:example.png', 'audio:test.ogg']
                });
                done();
            }).catch(e => {done(e)});
        });

        // overwrite local json with browser resource
        it('should overwrite local resources with browser resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                },
                {
                    json: {
                        myTest: {source: 'browser'},
                        hidden: {answer: 42},
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                }
            );
            test.RL.load('test').then(() => {
                test.assertResources(
                    {
                        browser: ['json:myTest', 'image:example.png', 'audio:test.ogg']
                    },
                    ['json:hidden']
                );
                done();
            }).catch(e => {done(e)});
        });

        it('should overwrite local resources with server resources', function(done) {
            // e
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                },
                {
                    json: {
                        myTest2: {source: 'browser'}
                    },
                    image: {
                        'example2.png': testPng
                    },
                    audio: {
                        'test2.ogg': testOgg
                    }
                },
                {
                    json: {
                        myTest: {source: 'server'},
                        hidden: {answer: 42}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                }
            );
            test.RL.load('test').then(() => {
                test.assertResources(
                    {
                        server: ['json:myTest', 'image:example.png', 'audio:test.ogg']
                    },
                    ['json:myTest2']
                );
                done();
            }).catch(e => {done(e)});
        });

        it('should overwrite server with browser resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                },
                {
                    json: {
                        myTest: {source: 'browser'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                },
                {
                    json: {
                        myTest: {source: 'server'}
                    },
                    image: {
                        'example.png': testPng
                    },
                    audio: {
                        'test.ogg': testOgg
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {browser: ['json:myTest', 'image:example.png', 'audio:test.ogg']}
                );
                done();
            }).catch(e => {done(e)});
        });

        it('should load state resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest2: {answer: 42}
                    },
                    permJson: {
                        myTest: {source: 'code'}
                    },
                    permImage: {
                        'example.png': testPng
                    },
                    permAudio: {
                        'test.ogg': testOgg
                    }
                }
            );
            test.RL.load('test').then(() => {
                test.assertResources({
                    code: ['json:myTest', 'json:myTest2', 'image:example.png', 'audio:test.ogg']
                });

                test.fetcher.addResponse('resources', request => {
                    return {
                        found: [],
                        notFound: []
                    }
                });

                // simulate screen init
                test.RL.clearResources();
                test.RL.load('page2').then(() => {
                    test.assertResources({}, [
                        'json:myTest', 'json:myTest2', 'image:example.png', 'audio:test.ogg'
                    ]);

                    test.fetcher.addResponse('resources', request => {
                        return {
                            found: [
                                { id: 'example.png', type: 'image', data: testPng},
                                { id: 'test.ogg', type: 'audio', data: testOgg},
                                { id: 'myTest', type: 'json', data: {source: 'code'}}
                            ],
                            notFound: []
                        }
                    });

                    test.RL.clearResources();
                    test.RL.invalidatePermanentResources();
                    test.RL.load('page3').then(() => {
                        test.assertResources(
                            {
                                server: ['json:myTest', 'image:example.png', 'audio:test.ogg']
                            },
                            ['json:myTest2']
                        );
                        done();
                    }).catch(e => {done(e)})
                }).catch(e => {done(e)});
            }).catch(e => {done(e)});
        });

        //-------------------------------
        //  Dependency checks
        //-------------------------------
        it('should return a direct browser dependency', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    }
                },
                {
                    json: {
                        hidden: {answer: 42}
                    },
                    direct: {
                        page: ['json:hidden']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        code: ['json:myTest'],
                        browser: ['json:hidden']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        it('should return direct browser dependency with dependant image', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    }
                },
                {
                    json: {
                        hidden: {answer: 42}
                    },
                    image: {
                        'test.png': testPng
                    },
                    direct: {
                        page: ['json:hidden']
                    },
                    indirect: {
                        'json:hidden': ['image:test.png']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        code: ['json:myTest'],
                        browser: ['json:hidden', 'image:test.png']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        it('should return direct server dependency', function (done) {
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    }
                },
                {
                },
                {
                    json: {
                        'hidden': {
                            answer: 42
                        }
                    },
                    direct: {
                        'page': ['json:hidden']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        code: ['json:myTest'],
                        server: ['json:hidden']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        it('should return direct server dependency with dependant image', function (done) {
            //
            // test direct server dependency add
            const test = getScenario(
                {
                    json: {
                        myTest: {source: 'code'}
                    }
                },
                {
                },
                {
                    json: {
                        'hidden': {
                            answer: 42
                        }
                    },
                    image: {
                        'test.png': testPng
                    },
                    direct: {
                        'page': ['json:hidden']
                    },
                    indirect: {
                        'json:hidden': ['image:test.png']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        code: ['json:myTest'],
                        server: ['json:hidden', 'image:test.png']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        it('should overwrite dependant server resource with browser resource', function (done) {
            const test = getScenario(
                {
                    json: {
                        A: {source: 'code'}
                    }
                },
                {
                    json: {
                        B: {source: 'browser'},
                        A: {source: 'browser'}
                    },
                    direct: {
                        page: ['json:A']
                    },
                    indirect: {
                        'json:A': ['json:B']
                    }
                },
                {
                    json: {
                        C: {source: 'server'},
                        B: {source: 'server'}
                    },
                    direct: {
                        'page': ['json:C']
                    },
                    indirect: {
                        'json:C': ['json:B']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        server: ['json:C'],
                        browser: ['json:B', 'json:A']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        it('should overwrite dependant server resource with browser resource (local)', function (done) {
            const test = getScenario(
                {
                    json: {
                        A: {source: 'code'}
                    }
                },
                {
                    json: {
                        B: {source: 'browser'},
                        C: {source: 'browser'}
                    },
                    direct: {
                        page: ['json:C']
                    },
                    indirect: {
                        'json:C': ['json:B']
                    }
                },
                {
                    json: {
                        A: {source: 'server'},
                        B: {source: 'server'}
                    },
                    direct: {
                        'page': ['json:A']
                    },
                    indirect: {
                        'json:A': ['json:B']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        server: ['json:A'],
                        browser: ['json:B', 'json:C']
                    }
                );
                done();
            }).catch(e => done(e));
        });

        //--------------------------------------
        // Sub-Tree Overwrite
        //--------------------------------------

        it('should overwrite subtree server resources with browser resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        A: {source: 'code'}
                    }
                },
                {
                    json: {
                        B: {source: 'browser'},
                        D: {source: 'browser'}
                    },
                    direct: {
                        page2: ['json:B']
                    },
                    indirect: {
                        'json:B': ['json:D']
                    }
                },
                {
                    json: {
                        A: {source: 'server'},
                        B: {source: 'server'},
                        C: {source: 'server'}
                    },
                    direct: {
                        page: ['json:A']
                    },
                    indirect: {
                        'json:A': ['json:B'],
                        'json:B': ['json:C']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        server: ['json:A'],
                        browser: ['json:B', 'json:D']
                    },
                    ['json:C']
                );
                done();
            }).catch(e => done(e));
        });

        it('should overwrite subtree server resources with browser resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        A: {source: 'code'}
                    }
                },
                {
                    json: {
                        A: {source: 'browser'},
                        B: {source: 'browser'},
                        C: {source: 'browser'}
                    },
                    direct: {
                        page2: ['json:A']
                    },
                    indirect: {
                        'json:A': ['json:B'],
                        'json:B': ['json:C']
                    }
                },
                {
                    json: {
                        B: {source: 'server'},
                        D: {source: 'server'}
                    },
                    direct: {
                        page: ['json:B']
                    },
                    indirect: {
                        'json:B': ['json:D']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        browser: ['json:A', 'json:B', 'json:C']
                    },
                    ['json:D']
                );
                done();
            }).catch(e => done(e));
        });


        /*
         --------------------O2
         CODE:    x: A
                  y: -
         SERVER:  x: B->D
                  Y: -
         BROWSER: x: -
                  y: A->B->C

         =>       x: A, B, C (Browser)
                  y: A, B, C (Browser)

         --------------------O2
         CODE:    x: -
                  y: -
         SERVER:  x: B->D
                  Y: -
         BROWSER: x: -
                  y: A->B->C

         =>       x: B, C (Browser)
                  y: A, B, C (Browser)

                 */

        //----------------------------
        //  Server remotes in browser
        //----------------------------

        /*
 CODE:    x: A
 SERVER:  x: A->C->D
          y: C
 BROWSER: x: -
          y: B, D

 =>       x: A, C (Server)
          y: B (Browser), C (Server)

 ??? woher kommt die Verbindung B->C ?

         */

        it('should return remote server resources and a dependency along with browser resources', function (done) {
            const test = getScenario(
                {
                    json: {
                        A: {source: 'code'}
                    }
                },
                {
                    json: {
                        B: {source: 'browser'},
                        E: {source: 'browser'}
                    },
                    direct: {
                        page: ['json:B', 'json:E']
                    },
                    remotes: {
                        'json:B': ['json:C']
                    }
                },
                {
                    json: {
                        C: {source: 'server'},
                        D: {source: 'server'},
                        E: {source: 'server'}
                    },
                    indirect: {
                        'json:C': ['json:D'],
                        'json:D': ['json:E']
                    }
                }
            );
            test.RL.load('page').then(() => {
                test.assertResources(
                    {
                        code: ['json:A'],
                        browser: ['json:B', 'json:E'],
                        server: ['json:C', 'json:D']
                    }
                );
                done();
            }).catch(e => done(e));
        });


        // TODO prevent perm resource overwrite

        // TODO external resource and fetch

        // test outdated server dependency

        // check problem: server overwrites unused browser resource on page

        // test dependencies for state resources

    })
});



/*
 ----------------------
 B) CODE-DEPLOY: von Resource X auf screen Y
 ----------------------
   1. Der Editor ermittelt zur Resource X den Deploy-Tree
   2. Jeder Kante in Browser-Indirect, die in einen Deploy-Tree-Knoten führt
      wird gelöscht und festgehalten in "remote"
   3. Der Server bekommt über STORE alle Resourcen aus dem Deploy-Tree
   4. Der Server bekommt die Zuordnung direct.y += x
   5. Der Server bekommt für jede Deploy-Tree-Knoten v die Browser-indirects
      damit er seine damit überschreibt
   6. Alle Remote-Einträge die von einem Deploy-Tree-Knoten wegführen werden
      als Server-direct hinzugefügt und im Browser gelöscht
   7. Alle Resourcen aus dem Deploy-Tree werden im Browser gelöscht mitsamt ihren
      direct + indirect einträgen

 -----------------------
 C) SYNC-DEPENDENCIES: auf Serverseite wurde eine Resource x gelöscht
 -----------------------
   SERVER:
   1. Wir löschen Server-direct.x und Server.indirect.x
   2. Wir löschen alle Kanten in Server.indirect, die auf x verweisen
   3. TODO: wir löschen alle verwaisten Pfade die nicht in einem server-direct wurzeln
      -- besser nicht, denn sonst löschen wir auch images/audios, die im Code per
         id eingebunden sind
      -- alternativ können wir uns evt. auf Json-resourcen beschränken

   BROWSER:
   Lösche alle Remotes die auf x verweisen

 -----------------------
 D) SYNC-DEPENDENCIES: im Browser-Cache ging eine Resource x verloren
 -----------------------
    SERVER:
    1. Wir löschen Browser.indirect.x und alle Kanten auf x aus Browser.direct
    2. Wir löschen alle Kanten in Browser.indirect, die auf x verweisen
    3. TODO Wir löschen alle verwaisten Pfade die nicht in einem browser-direct wurzeln
    4. Lösche alle Remotes die auf x verweisen

 -----------------------
 E) REVERT: Resource x on screen y from Browser to Code
 -----------------------
    1. Lösche Kante y->x aus Browser-direct
    2. Lösche alle Kanten in Browser-indirect, die auf x verweisen
    3. Lösche alle Remotes von x
    4. Lösche Kante y->x aus Server-direct
    5. Lösche alle Kanten in Server-indirect, die auf x verweisen

 -----------------------
 F) REVERT: Resource x on screen y from Server to Code
 -----------------------
    1. Lösche Kante y->x aus Server-direct
    2. Lösche alle Kanten in Server-indirect, die auf x verweisen
    3. Lösche alle Remotes auf x

 -----------------------
 G) REVERT: Resource x on screen y from Browser to Server
 -----------------------
    1. Lösche Kante y->x aus Browser-direct
    2. Lösche alle Kanten in Browser-indirect, die auf x verweisen
    3. Lösche alle Remotes von x



















 */



function deflateResources(flat) {
    const result = {
        json: [],
        image: [],
        audio: []
    };
    for (let item of flat) {
        const [type, id] = item.split(':');
        result[type].push(id);
    }
    return result;
}

describe('StorageManager', function () {
    it('should not be available if no storage exists', function () {
        const SM = new StorageManager();
        assert.isFalse(SM.isAvailable());
    });

    it('should have correct keys', function () {
        const SM = getDummyStorage();
        SM.storeJson('shaka', {key: 666});
        SM.storeJson('shaka', {key: 666});
        SM.storeImage('laka.png', 'data:foo');
        assert.sameMembers(SM.getKeys('json'), ['shaka']);
        assert.sameMembers(SM.getKeys('image'), ['laka.png']);
        assert.sameMembers(SM.getKeys('audio'), []);

        assertSameObjects(SM.getJson('shaka'), {key: 666});

        SM.storeAudio('my.mp3');
        SM.storeAudio('my2.mp3');
        assert.sameMembers(SM.getKeys('audio'), ['my.mp3', 'my2.mp3']);
        assert.isTrue(SM.hasAudio('my.mp3'));
        SM.deleteResource('audio', 'my.mp3');
        assert.isFalse(SM.hasAudio('my.mp3'));
        assert.sameMembers(SM.getKeys('audio'), ['my2.mp3']);

        SM.clearResources();
        assert.sameMembers(SM.getKeys(), []);
    });

    it('should store screen dependencies', function () {
        const SM = getDummyStorage();
        SM.storeScreenResource('page', 'json', 'myTest');
        SM.storeResourceDependencies({
            'json:myTest': ['image:my.png', 'image:my2.png']
        });

        assert.sameMembers(SM.getDirectScreenResources('foo').json, []);
        assert.sameMembers(SM.getDirectScreenResources('page').json, ['myTest']);
        assertSameObjects(SM.getIndirectResources(), {'json:myTest': ['image:my.png', 'image:my2.png']})

        // let simulate an overwrite with no dependencies
        SM.storeScreenResource('page', 'json', 'myTest');
        SM.storeResourceDependencies({
            'json:myTest': []
        });
        assertSameObjects(SM.getIndirectResources(), {});
    });
});



describe('DependencyManager', function() {
    it('should work...', function() {
        const assertExpected = (direct, indirect, screenExpected, modifiy = () => {}) => {
            const DM = new DependencyManager();
            for (let [id, deps] of Object.entries(indirect)) {
                const [depType, depId] = id.split(':');
                DM.setResourceDependencies(depType, depId, deps);
            }
            for (let [screen, ids] of Object.entries(direct)) {
                for (let id of ids) {
                    const [depType, depId] = id.split(':');
                    DM.addResourceToScreen(depType, depId, screen);
                }
            }
            modifiy(DM);

            for (let [screen, expected] of Object.entries(screenExpected)) {
                const types = {json: [], image: [], audio: []};
                for (let expect of expected) {
                    const [depType, depId] = expect.split(':');
                    types[depType].push(depId);
                }
                const result = DM.getScreenDependencies(screen);
                assert.sameMembers(result.json, types.json);
                assert.sameMembers(result.image, types.image);
                assert.sameMembers(result.audio, types.audio);
            }
        };

        assertExpected(
            {test: ['json:marioFont'], test2: []},
            {'json:marioFont': ['image:marioFont.png']},
            {test: ['json:marioFont', 'image:marioFont.png'], test2: []}
        );

        assertExpected(
            {test: ['json:marioFont'], test2: ['image:marioFont.png']},
            {'json:marioFont': ['image:marioFont.png']},
            {test: ['json:marioFont', 'image:marioFont.png'], test2: ['image:marioFont.png']}
        );

        assertExpected(
            {test: ['json:marioFont'], test2: ['image:marioFont.png']},
            {'json:marioFont': ['image:marioFont.png']},
            {test: [], test2: ['image:marioFont.png']},
            (RM) => {RM.deleteResource('json', 'marioFont')}
        );

        assertExpected(
     {
                level: ['json:textPane']
            },
    {
                'json:marioFont': ['image:marioFont.png'],
                'json:turricanFont': ['image:turricanFont.png'],
                'json:textPane': ['json:marioFont', 'json:turricanFont']
            },

        {
                level: ['json:marioFont', 'json:turricanFont', 'json:textPane', 'image:marioFont.png', 'image:turricanFont.png']
            }
        );

        assertExpected(
            {
                level: ['json:textPane']
            },
            {
                'json:marioFont': ['image:marioFont.png'],
                'json:turricanFont': ['image:turricanFont.png'],
                'json:textPane': ['json:marioFont', 'json:turricanFont']
            },

            {
                level: ['json:turricanFont', 'json:textPane', 'image:turricanFont.png']
            },
            (DM) => {
                DM.deleteResource('json', 'marioFont');
            }
        );

        const DM = new DependencyManager();
        DM.setResourceDependencies('json', 'foo', ['json:bar']);
        DM.setResourceDependencies('json', 'marioFont', ['image:marioFont.png', 'audio:audio.mp3']);
        DM.setResourceDependencies('json', 'turricanFont', ['image:turricanFont.png']);
        DM.setResourceDependencies('json', 'textPane', ['json:marioFont', 'json:turricanFont']);
        DM.addResourceToScreen('json', 'textPane', 'level');
        DM.addResourceToScreen('json', 'turricanFont', 'level');
        DM.addResourceToScreen('image', 'turricanFont.png', 'level');
        DM.addResourceToScreen('json', 'foo', 'drop');
        DM.syncDependencies(['level']);

        assert.sameMembers(Object.keys(DM.direct), ['level']);
        assert.sameMembers(Object.keys(DM.indirect), ['json:textPane', 'json:marioFont', 'json:turricanFont']);
    });

    /*
        Resource-Abhängigkeiten über die Ebenen:
        ------------------------------------------
          Beim Speichern bzw. Deploy eines Configurables werden immer ALLE Abhängigkeiten mitgenommen

          1.) DEPLOY:
                TextPane
                  -> MarioFontMap -> marioFont.png
                  -> TurricanFontMap -> turrican.png

          2.) STORE nach entfernen von TurricanFontMap

                TextPane
                  -> MarioFontMap -> marioFont.png


          Das FE darf jetzt nur folgende ScreenDeps erhalten:
             json:  [TextPane, MarioFontMap]
             image: [marioFont.png]



          1.) RL ermittelt die direkten registrierten Resourcen als direct-Basis
                - diese Resourcen müssen auf jeden Fall geladen werden
                - Abhängigkeiten können hier nicht ermittelt werden

                Beipiel: addJsonResource('TextPane');
                    // verlässt sich darauf, dass die Abhängigkeiten auf Remote-Seite dazukommen



          2.) SM bekommt diese und setzt seine bekannten Abhängigkeiten hinzu:

                Beispiel: im Code steht im Build -> const textPane = new TextPane('myTextPane')
                  Hier wird sich darauf verlassen, dass die Resource mytextPane bereits im
                  Editor gespeichert wurde und damit eine Screen-Abhängigkeit existiert und
                  alle abhängigen Resourcen dazukommen

              Es wird ein Tree gebildet

                root = [direct-Basis + SM.screen-direct + Server.screen-direct]
                deps = Server.indirect.apply(SM.indirect)

                => dependencies / direct-Basis = alle fehlenden Resourcen, die noch geladen werden
                   müssen


          Solutions:
            - Server bekommt
                a) [direct-Basis + SM.screen-direct]
                b) SM.indirect
                c) die Screen-Resourcen, welche schon in SM aufgelöst wurden

            - Berechnung der Abhnängigkeiten über
                root = [direct-Basis + SM.screen-direct + Server.screen-direct]
                deps = Server.indirect.apply(SM.indirect)

            - Server schickt zusätzlich zu den registrierten Resourcen auch noch
              diejenigen abhängigen Resourcen, die nicht schon in SM augelöst wurden


      !!! Wenn eine Resource keine Dependencies hat, aber auf dem Server schon













        screen demo:
        --------------------
           1.) code => a1, a2, a3  (durch Registrierung im Load)

           2.) server => a3, a5    (durch STORE:
                                        a) Registrierung war/ist vorhanden
                                        b) JSON oder JSON-Resource-ID im Code war/ist vorhanden
                                        c) Add neuer Screen-Resource im Editor
                                   )

           3.) browser => a2, a3, a4 (durch DEPLOY von Resource aus 2)


        a1: code
        a2: browser
        a3: server
        a4*: browser  (nicht explizit registriert im Code)
        a5*: server (nicht explizit registriert im Code)

            * sind evt. garnicht mehr verwendet ... die zu erkennen könnte aber schwierig sein,
              da im Screen-Build die Zugriffe auf die Resource im "resource" oder im RL über
              getResource() getracked werden müssten.
            - Alternativ könnte man im Editor entweder einen Hinweis anzeigen und dem User das
              Löschen überlassen, oder auch eine generelle Screen-Resource-Übersicht anbieten
              (TOP!)

        D.h. dass wir die Screen-Direct-Resources über alle Ebenen zusammenschmeißen



     */
});