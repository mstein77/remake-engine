const path = require("path")
const absPath = require('../../../src/build/classes/absPath.cjs')

jest.mock('path', () => {
    return {
        default: {
            resolve: ( ...args ) => {
                return 'foo'
            }
        }
    }
})

test('absPath', () => {
    absPath.setDeps('foo/')
    const res = absPath.engine()
    console.log(res)

    expect(res).toEqual('bah')
})
