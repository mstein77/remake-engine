const config = {
    verbose: true,
    setupFilesAfterEnv: ['./test/setup.cjs', "jest-expect-message"],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.cjs$"
}
module.exports = config