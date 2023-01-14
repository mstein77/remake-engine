import { ImageResources, AudioResources, JsonResources, Resources, ResourceProvider, getResourcesAndCallback } from "core/resources"

test('ResourceProvider', () => {
    expect(() => (new ResourceProvider()).key).toThrow('No key')
    expect(() => (new ResourceProvider()).validateContent()).not.toThrow('No key')
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
