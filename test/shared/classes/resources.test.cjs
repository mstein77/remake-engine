const { id2jsonTid, id2coreTid, id2imageTid, id2audioTid, id2videoTid, id2tid, typeText2tid, tid2id,
    tid2type, tids2extTids, map2extMap, makeDescriptor, ResourceTypeRegistry, RESOURCE } = require('../../../src/shared/classes/resources.cjs')

const jType = RESOURCE.TYPE.JSON
const jTid = id => RESOURCE.PREFIX[jType] + id

const cType = RESOURCE.TYPE.CORE
const cTid = id => RESOURCE.PREFIX[cType] + id

const iType = RESOURCE.TYPE.IMAGE
const iTid = id => RESOURCE.PREFIX[iType] + id

const aType = RESOURCE.TYPE.AUDIO
const aTid = id => RESOURCE.PREFIX[aType] + id

const vType = RESOURCE.TYPE.VIDEO
const vTid = id => RESOURCE.PREFIX[vType] + id

test('id2jsonTid', () => {
    expect(id2jsonTid('')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.JSON])
    expect(id2jsonTid('json')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.JSON] + 'json')
})

test('id2coreTid', () => {
    expect(id2coreTid('')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.CORE])
    expect(id2coreTid('json')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.CORE] + 'json')
})

test('id2imageTid', () => {
    expect(id2imageTid('')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE])
    expect(id2imageTid('image')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE] + 'image')
})

test('id2audioTid', () => {
    expect(id2audioTid('')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO])
    expect(id2audioTid('wav')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO] + 'wav')
})

test('id2videoTid', () => {
    expect(id2videoTid('')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.VIDEO])
    expect(id2videoTid('vid')).toBe(RESOURCE.PREFIX[RESOURCE.TYPE.VIDEO] + 'vid')
})

test('id2tid', () => {
    expect(() => id2tid('foo', 'bar')).toThrow('Invalid')

    expect(id2tid(RESOURCE.TYPE.JSON, 'foo')).toBe(id2jsonTid('foo'))
    expect(id2tid(RESOURCE.TYPE.CORE, 'foo')).toBe(id2coreTid('foo'))
    expect(id2tid(RESOURCE.TYPE.IMAGE, 'foo')).toBe(id2imageTid('foo'))
    expect(id2tid(RESOURCE.TYPE.AUDIO, 'foo')).toBe(id2audioTid('foo'))
    expect(id2tid(RESOURCE.TYPE.VIDEO, 'foo')).toBe(id2videoTid('foo'))
})

test('typeText2tid', () => {
    expect(() => typeText2tid('foo', 'bar')).toThrow('Invalid')

    expect(typeText2tid(RESOURCE.TEXT[RESOURCE.TYPE.JSON], 'foo')).toBe(id2jsonTid('foo'))
    expect(typeText2tid(RESOURCE.TEXT[RESOURCE.TYPE.IMAGE], 'foo')).toBe(id2imageTid('foo'))
    expect(typeText2tid(RESOURCE.TEXT[RESOURCE.TYPE.AUDIO], 'foo')).toBe(id2audioTid('foo'))
    expect(typeText2tid(RESOURCE.TEXT[RESOURCE.TYPE.VIDEO], 'foo')).toBe(id2videoTid('foo'))
})

test('tid2type', () => {
    expect(() => tid2type('')).toThrow('Could not')
    expect(tid2type(id2jsonTid('foo'))).toBe(RESOURCE.TYPE.JSON)
    expect(tid2type(id2imageTid('foo'))).toBe(RESOURCE.TYPE.IMAGE)
    expect(tid2type(id2audioTid('foo'))).toBe(RESOURCE.TYPE.AUDIO)
    expect(tid2type(id2videoTid('foo'))).toBe(RESOURCE.TYPE.VIDEO)
})

test('tid2id', () => {
    expect(() => tid2id('')).toThrow('Invalid')
    expect(() => tid2id('f')).toThrow('Invalid')
    expect(tid2id(id2jsonTid(''))).toBe('')
    expect(tid2id(id2jsonTid('foo'))).toBe('foo')
})

test('tids2extTids', () => {
    expect(tids2extTids([id2jsonTid('foo.json')])).toIncludeAllMembers([id2jsonTid('foo.json')])
    expect(tids2extTids([id2jsonTid('foo')])).toIncludeAllMembers([id2jsonTid('foo.json')])
    expect(tids2extTids([id2imageTid('foo'), id2audioTid('bar'), id2coreTid('xxx')])).toIncludeAllMembers(
        [id2imageTid('foo.png'), id2audioTid('bar.wav'), id2coreTid('xxx.json')]
    )
})

test('map2extMap', () => {
    expect(map2extMap({})).toBeEmptyObject()
    const map = {
        [id2jsonTid('foo')]: [id2imageTid('foo'), id2audioTid('bar'), id2coreTid('xxx')],
        [id2imageTid('xxx')]: [],
        [id2audioTid('bar')]: [],
        [id2coreTid('foo2.json')]: []
    }
    const extMap = map2extMap(map)
    expect(Object.keys(extMap)).toIncludeAllMembers(
        [id2jsonTid('foo.json'), id2imageTid('xxx.png'), id2audioTid('bar.wav'), id2coreTid('foo2.json')])
    expect(extMap[id2jsonTid('foo.json')]).toIncludeAllMembers(
        [id2imageTid('foo.png'), id2audioTid('bar.wav'), id2coreTid('xxx.json')]
    )
})

test('ResourceTypeRegistry::register', () => {
    expect(() => ResourceTypeRegistry.register('foo', 'bar')).toThrow('Invalid')

    expect(ResourceTypeRegistry.register('json', RESOURCE.TYPE.JSON)).toBe(ResourceTypeRegistry)
})
test('makeDescriptor.fromJsonId', () => {

    expect(() => makeDescriptor.fromTid(id2jsonTid('foo'), true, iType)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2jsonTid('foo'), false, iType).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid(id2jsonTid('foo'), true, jType)).not.toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2jsonTid('foo'), false, jType).isValid()).toBeTrue()

    {
        const d = makeDescriptor.fromJsonId('foo')
        expect(d.tid).toEqual(jTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(jType)
        expect(d.key).toEqual(RESOURCE.KEY[jType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
        expect(d.isJson()).toBeTrue()
        expect(d.isCoreJson()).toBeFalse()
        expect(d.isJsonBased()).toBeTrue()
        expect(d.isImage()).toBeFalse()
        expect(d.isAudio()).toBeFalse()
        expect(d.isVideo()).toBeFalse()
        expect(d.mimeType).toBe('text/json')
    }

    {
        const d = makeDescriptor.fromJsonId('foo.json')
        expect(d.tid).toEqual(jTid('foo.json'))
        expect(d.id).toEqual('foo.json')
        expect(d.type).toEqual(jType)
        expect(d.key).toEqual(RESOURCE.KEY[jType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toEqual('json')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }
})

test('makeDescriptor.fromImageId', () => {

    expect(() => makeDescriptor.fromTid(id2imageTid('foo'), true, jType)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2imageTid('foo'), false, jType).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid(id2imageTid('foo'), true, iType)).not.toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2imageTid('foo'), false, iType).isValid()).toBeTrue()

    {
        const d = makeDescriptor.fromImageId('foo')
        expect(d.tid).toEqual(iTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('png')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
        expect(d.mimeType).toBe('image/png')
        expect(d.isImage()).toBeTrue()
    }

    {
        const d = makeDescriptor.fromImageId('foo.png')
        expect(d.tid).toEqual(iTid('foo.png'))
        expect(d.id).toEqual('foo.png')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('png')
        expect(d.idExt).toEqual('png')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const d = makeDescriptor.fromImageId('foo.jpg')
        expect(d.tid).toEqual(iTid('foo.jpg'))
        expect(d.id).toEqual('foo.jpg')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('jpg')
        expect(d.idExt).toEqual('jpg')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }
})


test('makeDescriptor.fromAudioId', () => {

    expect(() => makeDescriptor.fromTid(id2audioTid('foo'), true, iType)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2audioTid('foo'), false, iType).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid(id2audioTid('foo'), true, aType)).not.toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2audioTid('foo'), false, aType).isValid()).toBeTrue()

    {
        const d = makeDescriptor.fromAudioId('foo')
        expect(d.tid).toEqual(aTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('wav')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
        expect(d.isAudio()).toBeTrue()
    }

    {
        const d = makeDescriptor.fromAudioId('foo.wav')
        expect(d.tid).toEqual(aTid('foo.wav'))
        expect(d.id).toEqual('foo.wav')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('wav')
        expect(d.idExt).toEqual('wav')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const d = makeDescriptor.fromAudioId('foo.mp3')
        expect(d.tid).toEqual(aTid('foo.mp3'))
        expect(d.id).toEqual('foo.mp3')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('mp3')
        expect(d.idExt).toEqual('mp3')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }
})

test('makeDescriptor.fromVideoId', () => {

    expect(() => makeDescriptor.fromTid(id2videoTid('foo'), true, iType)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2videoTid('foo'), false, iType).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid(id2videoTid('foo'), true, vType)).not.toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2videoTid('foo'), false, vType).isValid()).toBeTrue()

    {
        const d = makeDescriptor.fromVideoId('foo')
        expect(d.tid).toEqual(vTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(vType)
        expect(d.key).toEqual(RESOURCE.KEY[vType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('mp4')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
        expect(d.isVideo()).toBeTrue()
    }

    {
        const d = makeDescriptor.fromVideoId('foo.mp4')
        expect(d.tid).toEqual(vTid('foo.mp4'))
        expect(d.id).toEqual('foo.mp4')
        expect(d.type).toEqual(vType)
        expect(d.key).toEqual(RESOURCE.KEY[vType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('mp4')
        expect(d.idExt).toEqual('mp4')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const d = makeDescriptor.fromVideoId('foo.webm')
        expect(d.tid).toEqual(vTid('foo.webm'))
        expect(d.id).toEqual('foo.webm')
        expect(d.type).toEqual(vType)
        expect(d.key).toEqual(RESOURCE.KEY[vType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('webm')
        expect(d.idExt).toEqual('webm')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }
})

test('makeDescriptor.fromFile', () => {

    {
        expect(makeDescriptor.fromFile('').isValid()).toBeFalse()
        expect(makeDescriptor.fromFile('x.foo').isValid()).toBeFalse()
        expect(makeDescriptor.fromFile('foo.png').isValid()).toBeFalse()
        expect(makeDescriptor.fromFile('json/foo.png').isValid()).toBeFalse()
        const d = makeDescriptor.fromFile('foo.json')
        expect(d.tid).toEqual(cTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(cType)
        expect(d.key).toBeUndefined()
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.id + '.' + d.ext)
        expect(d.isJson()).toBeFalse()
        expect(d.isJsonBased()).toBeTrue()
        expect(d.isCoreJson()).toBeTrue()
    }

    {
        const d = makeDescriptor.fromFile(RESOURCE.KEY[jType] + '/foo.json')
        expect(d.tid).toEqual(jTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(jType)
        expect(d.key).toEqual(RESOURCE.KEY[jType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }

    {
        const d = makeDescriptor.fromFile(RESOURCE.KEY[iType] + '/foo.png')
        expect(d.tid).toEqual(iTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('png')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }

    {
        const d = makeDescriptor.fromFile(RESOURCE.KEY[iType] + '/foo.jpg')
        expect(d.tid).toEqual(iTid('foo.jpg'))
        expect(d.id).toEqual('foo.jpg')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('jpg')
        expect(d.idExt).toEqual('jpg')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const d = makeDescriptor.fromFile(RESOURCE.KEY[aType] + '/foo.wav')
        expect(d.tid).toEqual(aTid('foo'))
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('wav')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }

    {
        const d = makeDescriptor.fromFile(RESOURCE.KEY[aType] + '/foo.mp3')
        expect(d.tid).toEqual(aTid('foo.mp3'))
        expect(d.id).toEqual('foo.mp3')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('mp3')
        expect(d.idExt).toEqual('mp3')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }
})

test('makeDescriptor.fromTypeAndId', () => {
    expect(() => makeDescriptor.fromTypeAndId(jType, '')).toThrow('Invalid')
    expect(makeDescriptor.fromTypeAndId(jType,'', false).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTypeAndId(jType,'foo', true)).not.toThrow('Invalid')
    expect(makeDescriptor.fromTypeAndId(jType, 'foo', false).isValid()).toBeTrue()
    expect(() => makeDescriptor.fromTypeAndId('foo', 'bar')).toThrow('Invalid')
    expect(makeDescriptor.fromTypeAndId('foo', 'bar', false).isValid()).toBeFalse()
})

test('makeDescriptor.fromTid', () => {

    expect(() => makeDescriptor.fromTid(undefined)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(undefined, false).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid('')).toThrow('Invalid')
    expect(makeDescriptor.fromTid('', false).isValid()).toBeFalse()
    expect(() => makeDescriptor.fromTid(id2jsonTid('foo'), true, iType)).toThrow('Invalid')
    expect(makeDescriptor.fromTid(id2jsonTid('foo'), false, iType).isValid()).toBeFalse()
    expect(makeDescriptor.fromTid(id2jsonTid('foo'), false, jType).isValid()).toBeTrue()

    {
        const d = makeDescriptor.fromTid('x', false)
        expect(d.isValid()).toBeFalse()
        expect(d.tid).toEqual('x')
        expect(d.id).toBeUndefined()
        expect(d.type).toBeUndefined()
        expect(d.key).toBeUndefined()
        expect(d.ext).toBeUndefined()
        expect(d.idExt).toBeUndefined()
        expect(d.file).toBeUndefined()
        expect(d.extId).toBeUndefined()
        expect(d.extTid).toBeUndefined()
    }

    {
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[jType], false)
        expect(d.isValid()).toBeFalse()
        expect(d.tid).toEqual(RESOURCE.PREFIX[jType])
        expect(d.id).toBeUndefined()
        expect(d.type).toBeUndefined()
        expect(d.key).toBeUndefined()
        expect(d.ext).toBeUndefined()
        expect(d.idExt).toBeUndefined()
        expect(d.file).toBeUndefined()
    }

    {
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[iType], false)
        expect(d.isValid()).toBeFalse()
        expect(d.tid).toEqual(RESOURCE.PREFIX[iType])
        expect(d.id).toBeUndefined()
        expect(d.type).toBeUndefined()
        expect(d.key).toBeUndefined()
        expect(d.ext).toBeUndefined()
        expect(d.idExt).toBeUndefined()
        expect(d.file).toBeUndefined()
    }

    {
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[aType], false)
        expect(d.isValid()).toBeFalse()
        expect(d.tid).toEqual(RESOURCE.PREFIX[aType])
        expect(d.id).toBeUndefined()
        expect(d.type).toBeUndefined()
        expect(d.key).toBeUndefined()
        expect(d.ext).toBeUndefined()
        expect(d.idExt).toBeUndefined()
        expect(d.file).toBeUndefined()
    }

    {
        const tid = jTid('foo')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(jType)
        expect(d.key).toEqual(RESOURCE.KEY[jType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }

    {
        const tid = jTid('foo.json')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo.json')
        expect(d.type).toEqual(jType)
        expect(d.key).toEqual(RESOURCE.KEY[jType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('json')
        expect(d.idExt).toEqual('json')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const tid = iTid('foo.png')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo.png')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('png')
        expect(d.idExt).toEqual('png')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const tid = iTid('foo.jpg')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo.jpg')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('jpg')
        expect(d.idExt).toEqual('jpg')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const tid = iTid('foo')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(iType)
        expect(d.key).toEqual(RESOURCE.KEY[iType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('png')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }

    {
        const tid = aTid('foo.wav')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo.wav')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('wav')
        expect(d.idExt).toEqual('wav')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const tid = aTid('foo.mp3')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo.mp3')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('mp3')
        expect(d.idExt).toEqual('mp3')
        expect(d.file).toEqual(d.key + '/' + d.id)
    }

    {
        const tid = aTid('foo')
        const d = makeDescriptor.fromTid(tid)
        expect(d.tid).toEqual(tid)
        expect(d.id).toEqual('foo')
        expect(d.type).toEqual(aType)
        expect(d.key).toEqual(RESOURCE.KEY[aType])
        expect(d.isValid()).toBeTrue()
        expect(d.ext).toEqual('wav')
        expect(d.idExt).toBeUndefined()
        expect(d.file).toEqual(d.key + '/' + d.id + '.' + d.ext)
    }
})
