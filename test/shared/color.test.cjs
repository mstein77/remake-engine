const { setLogger, FG, log } = require('../../src/shared/console.cjs')

test('log', () => {
    const out = []
    setLogger({log: (...params) => out.push([ ...params ])})
    log(444, 'xy', true)
    expect(out.length).toBe(1)
    expect(out[0]).toIncludeSameMembers([444, FG.RESET + 'xy' + FG.RESET, true])
    setLogger(console)
})