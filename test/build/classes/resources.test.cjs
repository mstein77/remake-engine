const { makeDescriptor, ResourceTypeRegistry, RESOURCE } = require('../../../src/server/classes/resources.cjs')

const jType = RESOURCE.TYPE.JSON
const jTid = id => RESOURCE.PREFIX[jType] + id

const iType = RESOURCE.TYPE.IMAGE
const iTid = id => RESOURCE.PREFIX[iType] + id

const aType = RESOURCE.TYPE.AUDIO
const aTid = id => RESOURCE.PREFIX[aType] + id

test('makeDescriptor.fromJsonId()', () => {
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

test('makeDescriptor.fromImageId()', () => {
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


test('makeDescriptor.fromAudioId()', () => {
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

test('makeDescriptor.fromFile()', () => {

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

test('makeDescriptor.fromTid()', () => {

    expect(() => makeDescriptor.fromTid('')).toThrow('No type id given')
    expect(() => makeDescriptor.fromTid()).toThrow('No type id given')

    // TODO: subdirs / core-tid

    {
        const d = makeDescriptor.fromTid('x')
        expect(d.isValid()).toBeFalse()
        expect(d.tid).toEqual('x')
        expect(d.id).toBeUndefined()
        expect(d.type).toBeUndefined()
        expect(d.key).toBeUndefined()
        expect(d.ext).toBeUndefined()
        expect(d.idExt).toBeUndefined()
        expect(d.file).toBeUndefined()
    }

    {
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[jType])
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
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[iType])
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
        const d = makeDescriptor.fromTid(RESOURCE.PREFIX[aType])
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
