const config = {
    verbose: true,
    setupFilesAfterEnv: ['./test/setup.cjs'],
    testEnvironment: "node",
    testRegex: "test/.*\\.test\\.cjs$"
}
module.exports = config