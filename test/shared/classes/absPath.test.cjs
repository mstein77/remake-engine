const path = require("path")
const absPath = require('../../../src/shared/classes/absPath.cjs')

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

    // expect(res).toEqual('bah')
})
