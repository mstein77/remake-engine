import { DistTarget, TASK } from "../../src/build/target.cjs"

test('Tasks::construct()', () => {
    expect(new DistTarget({})).toBeInstanceOf(DistTarget)
    expect(new DistTarget({tasks: {[TASK.PREPARE_SOURCE]: [{msg: 'foo', priority: 66}]}})).toBeInstanceOf(DistTarget)
})

test('Tasks::getFlat()', () => {
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

test('Tasks::getJson()', () => {
    const target = new DistTarget({})
    target.addTaskMessage(TASK.TRIGGER_START, 'foo', 20)
        .addTaskMessage(TASK.TRIGGER_INSTALL, 'foo2')
        .addTaskMessage(TASK.SOURCE_TO_SERVER, 'foo3', 30)
        .addTaskMessage(TASK.PREPARE_SERVER, 'foo4', 40)
        .addTaskMessage(TASK.PREPARE_SOURCE, 'foo5', 50)

    expect(target.getFlatTaskMessages()).toEqual(['foo5', 'foo4', 'foo3', 'foo2', 'foo'])

    expect(target.toJson().tasks).toEqual(target.tasks2messages)
})