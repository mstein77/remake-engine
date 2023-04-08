
const BufferedTilesPane =
    ModelFactory(
        {name: 'BufferedTilesPane', editor: true},
        BufferedTilesPaneConfig
    )
    .addImplementation(BufferedTilesPaneImpl)

export default BufferedTilesPane