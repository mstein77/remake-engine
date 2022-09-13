const { extractEnvOverwrites } = require('../webpack.build-common.cjs');

test(
    'first test', () => expect(
        extractEnvOverwrites(
            {editor: false, envPrefix: 'TEST_'},
            {'TEST_EDITOR': 'TRUE'}
        )
    ).toMatchObject({editor: true})
)
;