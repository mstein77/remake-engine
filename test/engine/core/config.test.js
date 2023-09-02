import { Config } from "core/config"
import { validated } from "helper/validate"
import { AppliedImage, ImageResource, AudioResource } from "core/classes"
import { Model } from "core/model"
import inst from "core/instances"

test('config class', () => {
    expect(() => new Config())
        .toThrow('JSON')

    expect(() => new Config(true))
        .toThrow('JSON')

    expect(() => (new Config({})).applyTo({}))
        .toThrow('context')

    /*
    expect(() => (new Config({})).getResources())
        .toThrow('id')

    expect(() => (new Config({id: 'bar'})).validatedModel('foo'))
        .toThrow('object')

    expect(() => (new Config({id: 'bar'})).validatedModel(1))
        .toThrow('object')

    expect(() => (new Config({id: 'bar'})).validatedModel(true))
        .toThrow('object')

    expect(() => (new Config({id: 'bar'})).validatedModel([]))
        .toThrow('object')
     */

    expect(new Config({}))
        .toBeInstanceOf(Config)

    expect(new Config({}))
        .not.toBeFrozen()

    {
        const config = new Config({id: 'foo'})
        config.applyTo({})
        expect(config)
            .toBeFrozen()
        config.checkAndFreeze();
        expect(config.getVersion())
            .toEqual('1.0.0');
    }

    {
        const config = new Config({id: 'foo', 'foo': 'bar'})
        const applied = config.applyTo({});
        expect(applied)
            .toContainEntry(['id', 'foo'])
    }

    /*
    {
        const config = new Config({id: 'foo'})
        config.getResources()
        expect(config.isResolved())
            .toBeTrue()

        config.resolve()
        expect(config.isResolved())
            .toBeTrue()
    }
    */

    expect((new Config({})).getFieldProp('id'))
        .toBeEmptyObject()

    expect((new Config({})).getFieldProps())
        .toBeEmptyObject()

    expect((new Config({})).getFieldProp('id', {foo: 'bar'}))
        .toContainAllEntries([['foo', 'bar']])

    /*
    expect((new Config({id: 'foo', bar: 'no'})).getJson())
        .toContainAllEntries([['__type', 'Config'], ['id', 'foo']])

    expect((new Config({id: 'foo', bar: 'no'})).applyTo({}))
        .toContainAllEntries([['id', 'foo']])

    expect((new Config({id: 'foo', bar: 'no'})).getRebuildJson())
        .toContainAllEntries([['id', 'foo']])

    expect((new Config({id: 'foo', bar: 'no'})).getRebuildJson(false, {id: 'bar2'}))
        .toContainAllEntries([['id', 'bar2']])

    expect((new Config({id: 'foo', bar: 'no'})).getRebuildJson(true, {id: 'bar2'}))
        .toContainAllEntries([['id', 'bar2']])

    expect((new Config({id: 'foo', bar: 'no'})).getDependentImages()).toBeEmpty()

    expect((new Config({id: 'foo', bar: 'no'})).getDependentAudio()).toBeEmpty()

    expect((new Config({id: 'foo', bar: 'no'})).getDependentModels()).toBeEmpty()

    expect((new Config({id: 'foo'})).getResourcesAndDependencies())
        .toContainAllKeys(['dependencies', 'resources'])

    expect((new Config({id: 'foo'})).getResourcesAndDependencies().dependencies)
        .toContainAllEntries([['json:foo', []]])

    expect((new Config({id: 'foo'})).getResourcesAndDependencies().resources)
        .toHaveLength(1)

    expect((new Config({id: 'foo'})).getJsonResources())
        .toHaveLength(1)

    expect((new Config({id: 'foo'})).getImageResources())
        .toHaveLength(0)

     */
})

test('MyConfig class', () => {

    class MyConfig extends Config {

        constructor(config) {
            super(config)
        }

        getDefaults() {
            return {s: 'foo1', b: true, x: undefined}
        }

        setS(value) {
            this.s = validated.string(value)
        }

        setB(value) {
            this.b = validated.bool(value)
        }

        setObj(value) {
            this.obj = validated.object(value)
        }

        setX(value) {
            this.x = value
        }

        applyPropsTo(model) {
            this.applyDefaultKeysTo(model)
            model.obj = this.obj
        }

        getFieldProps() {
            return {
                obj: {null: true}
            }
        }

        getNewAutoId() {
            return;
        }
    }
    MyConfig.typeName = 'MyConfig';

    expect(() => new MyConfig({id: 'foo', obj: false}))
        .toThrow('obj')

    expect(() => (new MyConfig({id: 'foo'})).applyTo({}))
        .toThrow('mandatory')

    expect(() => (new MyConfig({x: 'x'})).applyTo({}))
        .toThrow('mandatory')

    expect((new MyConfig({id: 'foo', s: 'foo2', x: 'x', undef: undefined})).getFieldProp('obj'))
        .toContainAllEntries([['null', true]])

    expect((new MyConfig({id: 'foo'})).getModelType())
        .toEqual('MyConfig')

    expect(() => (new MyConfig({id: 'foo'})).getModelInstance({}, {}))
        .toThrow('Missing')

    expect(() => (new MyConfig({id: 'foo'})).getInitialModelInstance({}))
        .toThrow('Missing')

    {
        const conf = new MyConfig({id: 'foo', s: 'foo2'})
        conf.setX('x');
        expect(conf.applyTo({}))
            .toContainEntries([
                ['id', 'foo'],
                ['s', 'foo2'],
                ['x', 'x'],
                ['b', true],
                ['obj', undefined]
            ]);
    }

    {
        const conf = new MyConfig({id: 'foo', s: 'foo2'})
        conf.setX('x');
        conf.clear()
        expect(conf)
            .toContainEntries([
                ['id', 'foo']
            ]);
    }

    /*
    expect((new MyConfig({id: 'foo', s: 'foo2'})).getImageResourceIds())
        .toBeEmpty()

    expect((new MyConfig({id: 'foo', s: 'foo2'})).getImageResources())
        .toBeEmpty()

    const resources = (new MyConfig({id: 'foo', s: 'foo2'})).getResources()
    expect(resources)
        .toHaveLength(1)
    expect(resources)
        .toPartiallyContain({id: 'foo', type: 'json'})
     */
})


/*
test('MyConfig <-> RebuildJson', () => {

    class DepConfig extends Config {
        getDefaults() {
            return {
                depImage: null,
            }
        }

        setDepImage(value) {
            this.depImage = validated.imageResource(value, {null: true})
        }

        applyPropsTo(model) {
            this.applyDefaultKeysTo(model, ['depImage'])
            model.depImage = this.depImage ? new AppliedImage(this.depImage) : null
        }

        addRebuildProps(obj, deep, base) {
            obj.depImage = base.depImage === null ? null : (
                !deep ? base.depImage.id : base.depImage.getImageResource()
            )
            return obj
        }

        getDependentImages(base) {
            return [base.depImage]
        }
    }

    class MyModel extends Model {}
    MyModel.Config = DepConfig;

    class MyConfig extends Config {

        getDefaults() {
            return {
                stringProp: 'defValue',
                imageProp: null,
                depProp: null,
                audioProp: null
            }
        }

        setStringProp(value) {
            this.stringProp = validated.string(value)
        }

        setImageProp(value) {
            this.imageProp = validated.imageResource(value, {null: true})
        }

        setDepProp(value) {
            this.depProp = validated.config(MyModel, value, {null: true})
        }

        setAudioProp(value) {
            this.audioProp = validated.audioResource(value, {null: true})
        }

        applyPropsTo(model) {
            this.applyDefaultKeysTo(model, ['imageProp'])
            model.imageProp = this.imageProp ? new AppliedImage(this.imageProp) : null
            model.audioProp = this.audioProp
        }

        addRebuildProps(obj, deep, base) {
            obj.stringProp = base.stringProp
            obj.imageProp = base.imageProp === null ? null : (
                !deep ? base.imageProp.id : fakeImageResource(base.imageProp.id)
            )
            obj.audioProp = base.audioProp === null ? null : (
                !deep ? base.audioProp.id : fakeAudioResource(base.audioProp.id)
            )
            obj.depProp = base.depProp === null ? null : (
                !deep ? base.depProp.id : base.depProp.config.getRebuildJson(deep, base.depProp)
            )
            return obj
        }

        getDependentImages(base) {
            return [base.imageProp, null]
        }

        getDependentModels(base) {
            return [base.depProp, undefined]
        }

        getDependentAudio(base) {
            return [base.audioProp, false]
        }
    }

    const fakeImageResource = id => {
        const resource = new ImageResource(null)
        resource.setId(id)
        resource.resolved = true
        return resource
    }

    const fakeAudioResource = id => {
        const resource = new AudioResource(null)
        resource.setId(id)
        resource.resolved = true
        return resource
    }

    const fakeAppliedImage = id => {
        return new AppliedImage(fakeImageResource(id))
    }

    expect((new MyConfig({id: 'rebuild'})).getJson())
        .toContainEntries([['id', 'rebuild'], ['stringProp', 'defValue'], ['imageProp', null], ['depProp', null]])

    expect((new MyConfig({id: 'rebuild'})).getRebuildJson())
        .toContainEntries([['id', 'rebuild']])

    expect((new MyConfig({id: 'rebuild', stringProp: 'foo'})).getRebuildJson())
        .toContainEntries([['id', 'rebuild'], ['stringProp', 'foo']])

    expect((new MyConfig({id: 'rebuild', stringProp: 'foo'})).getRebuildJson(false, {id: 'bar', stringProp: 'foo2', imageProp: null, audioProp: null, depProp: null}))
        .toContainEntries([['id', 'bar'], ['stringProp', 'foo2']])

    expect((new MyConfig({id: 'rebuild', stringProp: 'foo'})).getRebuildJson(true, {id: 'bar', stringProp: 'foo2', imageProp: null, audioProp: null, depProp: null}))
        .toContainEntries([['id', 'bar'], ['stringProp', 'foo2']])

    {
        const config = new MyConfig({
            id: 'rebuild',
            stringProp: 'foo',
            imageProp: fakeImageResource('test.png')
        })
        expect(config.getImageResourceIds())
            .toIncludeAllMembers(['test.png'])

        const result = config.getRebuildJson()
        expect(result)
            .toContainKey('imageProp')
        expect(result.imageProp)
            .toBeInstanceOf(ImageResource)
        expect(result.imageProp.id)
            .toBe('test.png')

        const result2 = config.getRebuildJson(false)
        expect(result2)
            .toContainKey('imageProp')
        expect(result2.imageProp)
            .toBe('test.png')

        const result3 = config.getRebuildJson(true, {
            id: 'boo',
            imageProp: fakeAppliedImage('test2.png'),
            audioProp: null,
            depProp: null
        })
        expect(result3)
            .toContainKey('imageProp')
        expect(result3.imageProp)
            .toBeInstanceOf(ImageResource)
        expect(result3.imageProp.id)
            .toBe('test2.png')

        const result4 = config.getRebuildJson(false, {
            id: 'boo',
            imageProp: fakeAppliedImage('test2.png'),
            audioProp: null,
            depProp: null
        })

        expect(result4)
            .toContainKey('imageProp')
        expect(result4.imageProp)
            .toBe('test2.png')
    }

    {
        inst.setRL('http://foo', null)
        inst.setGame({hasEditor: true})

        const config = new MyConfig({
            id: 'complex',
            depProp: {
                id: 'foo',
                depImage: fakeImageResource('dep.png')
            }
        })
        config.setImageProp(fakeImageResource('myimg.png'))
        config.setAudioProp(fakeAudioResource('foo.mp3'))
        const result = config.getRebuildJson(false)
        expect(result)
            .toContainEntries([['id', 'complex'], ['depProp', 'foo']])

        const resources = config.getResources()
        expect(resources)
            .toPartiallyContain({id: 'complex', type: 'json'})
        expect(resources)
            .toPartiallyContain({id: 'foo', type: 'json'})
        expect(resources)
            .toPartiallyContain({id: 'dep.png', type: 'image'})
        expect(resources)
            .toPartiallyContain({id: 'foo.mp3', type: 'audio'})

        expect(config.getImageResourceIds())
            .toIncludeSameMembers(['dep.png', 'myimg.png'])
        const imgResources = config.getImageResources();
        expect(imgResources)
            .toHaveLength(2)
        expect(imgResources)
            .toPartiallyContain({id: 'dep.png', type: 'image'})
        expect(imgResources)
            .toPartiallyContain({id: 'myimg.png', type: 'image'})

        expect(config.getAudioResourceIds())
            .toIncludeSameMembers(['foo.mp3'])

        expect(config.getJsonResourceIds())
            .toIncludeSameMembers(['complex', 'foo'])

        const dependencies = config.getDependencies()
        expect(dependencies)
            .toContainAllKeys(['json:complex', 'json:foo'])
        expect(dependencies['json:complex'])
            .toIncludeSameMembers(['json:foo', 'image:myimg.png', 'audio:foo.mp3'])
        expect(dependencies['json:foo'])
            .toIncludeSameMembers(['image:dep.png'])

        const dependencies2 = config.getDependencies({
            id: 'bar2', imageProp: fakeImageResource('foo.png')
        })
        expect(dependencies2)
            .toContainAllKeys(['json:bar2'])
        expect(dependencies2['json:bar2'])
            .toIncludeSameMembers(['image:foo.png'])

        const result2 = config.getRebuildJson(true)
        expect(result2)
            .toContainKey('depProp')
        expect(result2.depProp)
            .toContainKeys(['id', 'depImage'])
        expect(result2.depProp.depImage)
            .toBeInstanceOf(ImageResource)
        expect(result2.depProp.depImage.id)
            .toBe('dep.png')
    }
})
*/