export default {
    verbose: true,
    setupFilesAfterEnv: ['./test/setup.js', "jest-expect-message"],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.js$",
    globals: {
        IS_DIST: false,
        BASE_URL: 'http://localhost:8080',
        STATIC_TYPES: 'audio,video',
        RESOURCE_TYPES: ''
    },
    moduleNameMapper: {
        '^helper/(.+)$': '<rootDir>/src/engine/helper/$1',
        '^core/(.+)$': '<rootDir>/src/engine/core/$1',
        '^shared/(.+)$': '<rootDir>/src/shared/$1',
        '\.css$': '<rootDir>/test/mocks/empty'
    }
}