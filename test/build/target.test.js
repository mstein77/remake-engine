import { DistTarget, TASK } from "../../src/build/target.cjs"

test('DistTarget::construct()', () => {
    expect(new DistTarget({})).toBeInstanceOf(DistTarget)
    const target = new DistTarget({tasks: {[TASK.PREPARE_SOURCE]: [{msg: 'foo', priority: 66}]}})
    expect(target).toBeInstanceOf(DistTarget)
    expect(target.tasks).toBeUndefined()
})

test('DistTarget::getFlatTaskMessages()', () => {
    expect((new DistTarget()).getFlatTaskMessages()).toBeEmpty()
    expect((new DistTarget({tasks: {[TASK.PREPARE_SOURCE]: [{msg: 'foo', priority: 66}]}})).getFlatTaskMessages()).toEqual(['foo'])
    expect((new DistTarget({tasks: {
        [TASK.PREPARE_SOURCE]: [
            {msg: 'foo', priority: 66},
            {msg: 'bar', priority: 100}
        ]}})
    ).getFlatTaskMessages()).toEqual(['bar', 'foo'])
    expect((new DistTarget({tasks: {
            [TASK.PREPARE_SOURCE]: [
                {msg: 'bar', priority: 100},
                {msg: 'foo', priority: 66},
            ]}})
    ).getFlatTaskMessages()).toEqual(['bar', 'foo'])
})

test('DistTarget::toJson()', () => {
    const target = new DistTarget({})
    target.addTaskMessage(TASK.TRIGGER_START, 'foo', 20)
        .addTaskMessage(TASK.TRIGGER_INSTALL, 'foo2')
        .addTaskMessage(TASK.SOURCE_TO_SERVER, 'foo3', 30)
        .addTaskMessage(TASK.PREPARE_SERVER, 'foo4', 40)
        .addTaskMessage(TASK.PREPARE_SOURCE, 'foo5', 50)

    expect(target.getFlatTaskMessages()).toEqual(['foo5', 'foo4', 'foo3', 'foo2', 'foo'])

    expect(target.toJson().tasks).toEqual(target.tasks2messages)
})

test('DistTarget getter/setter', () => {
    const t = new DistTarget({
        target: 'foo',
        overwrites: {foo: 'bar'},
        root: 'bar',
        tmpDir: 'tmpDir',
        publicDir: 'pub',
        dir: 'foodir',
        config: {foo2: 'bar2'},
        skip: true,
        assets: ['foo']
    })
    expect(t.target).toEqual('foo')
    expect(t.root).toEqual('bar')
    expect(t.tmpDir).toEqual('tmpDir')
    expect(t.publicDir).toEqual('pub')
    expect(t.dir).toEqual('foodir')
    expect(t.skip).toEqual(true)
    expect(t.overwrites).toEqual({foo: 'bar'})
    expect(t.config).toEqual({foo2: 'bar2'})
    expect(t.assets).toEqual(['foo'])

    t.publicDir = 'foo'
    expect(t.publicDir).toEqual('foo')
    t.config = {foo3: 'bar3'}
    expect(t.config).toEqual({foo3: 'bar3'})
    t.skip = false
    expect(t.skip).toEqual(false)
    t.assets = ['bar']
    expect(t.assets).toEqual(['bar'])
})