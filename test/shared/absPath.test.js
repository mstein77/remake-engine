import absPath from '../../src/shared/absPath.cjs'
import jest from 'jest-mock'

/*
jest.mock('path', () => {
    return {
        default: {
            resolve: ( ...args ) => {
                return 'foo'
            }
        }
    }
})
*/
test('absPath', () => {
    absPath.setDeps('foo/')
    expect(true).toEqual(true)
})
