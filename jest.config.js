export default {
    verbose: true,
    setupFilesAfterEnv: ['./test/setup.js', "jest-expect-message"],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.js$",
    moduleNameMapper: {
        '^helper/(.+)$': '<rootDir>/src/engine/helper/$1',
        '^core/(.+)$': '<rootDir>/src/engine/core/$1',
        '\.css$': '<rootDir>/test/mocks/empty'
    }
}