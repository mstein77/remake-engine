### Installation

Go to a directory where you want to have a new folder with your game and type `npx remake-engine-cli start <game>` whereas  `<game>` should be an id for your game. The script will download and configure everything in  a
new folder with your game id and at the end, open the new game in your browser, where you can also open the editor to create your new game. 

### Scripts

The installation script makes the following scripts available, that you can call on the command line terminal of your OS when you are in your game folder:

|          Script | Explanation                                                                                                                 |
|----------------:|-----------------------------------------------------------------------------------------------------------------------------|
|  `npm run game` | Builds the current development version and opens it in the configured browser                                               |
|  `npm run dist` | Builds the distribution version of your game in the `dist` folder of your game                                              |
| `npm run start` | Starts a webserver delivering the distribution version of your game and builds it automatically if this was not done before |


### Build Configuration

The cli generates a build configuration file ``config.cjs`` which allows you to configure the development and distribution build of your game at the same time.

|              Property | Explanation                                                                                                                              | Default
|----------------------:|------------------------------------------------------------------------------------------------------------------------------------------|---------
|                `name` | The title of your game which should be displayed in the browser window or app                                                            | `"{game.name} v{game.version}"`
|           `shortName` | The short version of the name (used where applicable e.g. app file etc.)                                                                 | `"{game.id}"`
|         `description` | A description of the game used in application meta data                                                                                  | `"{game.description}"`
|            `keywords` | A list of keywords separated by comma                                                                                                    | `"{game.keywords}"`
|              `author` | Author of the game                                                                                                                       | `"{game.author}"`
|            `browsers` | The minimum browsers in which the game should run                                                                                        | `">2.25%, not ie 11, not op_mini all"`
|              `editor` | Boolean which indicates whether an editor should be available or not                                                                     | `true` /  dist: `false`
|                `gzip` | Indicates whether to use gzip compression or not                                                                                         | `true`
|     `resourceLoading` | The location where resources are stored and loaded from. Possible values: `"api"`, `"api-all"`, `"local"`, `"local-all"`, `"static-all"` | `api`
|      `apiMaxJsonSize` | The maximum JSON size the API should accept                                                                                              | `"10mb"`
|    `deploymentMethod` | The method which is used to rollout a the game                                                                                           | `"checkout"`
|             `hosting` | Describes how (or where) the game is hosted                                                                                              | `"server-with-nodejs"`
|         `deliverable` | The build target type of the game. Possible values: `"pwa"`, `"html-file"`, `"mac-app"`, `"web-app"`, `"uwp-app"`, `"electron-app"`      | `"web-app"`
|   `deliverableConfig` | A JSON config for the build target                                                                                                       | `{}`
|     `targetPlatforms` | The target platforms for the build                                                                                                       | `"windows,android,apple"`
|       `targetServers` | The target servers for the API                                                                                                           | `"express"`
|     `assetGeneration` | Determines the asset generation strategy. Possible values: `"none"`, `"minimal"`, `"recommended"`, `"all"`                               | `"minimal"` / dist: `"all"`
|          `assetTypes` | A list of asset types which should be generated                                                                                          | `"icon,tile,store,splash,icons"`
|       `assetsBgColor` | A background color which should be used for the assets or an empty string                                                                | `""`
|       `assetsPadding` | The padding which should be used for the assets                                                                                          | `30`
|            `minimize` | Indicates whether the source files should be minimized or not                                                                            | `false` / dist: `true`
|              `server` | Boolean which indicates whether a server should be build or not                                                                          | `true`
|               `https` | Indicates whether HTTPS should be used for the server or not                                                                             | `false` / dist: `true`
|                `host` | The hostname of the server                                                                                                               | `"localhost"`
|            `httpPort` | The HTTP port for the server                                                                                                             | `8080`
|           `httpsPort` | The HTTPS port for the server                                                                                                            | `443`
|         `certificate` | The path to the certificate file when HTTPS is enabled                                                                                   | `""`
|                `path` | The URL path to the server endpoints                                                                                                     | `""`
|       `keepArtifacts` | Indicates whether the build artifcates should be kept after the build or not                                                             | `true`
|      `restrictedCors` | Whether CORS should be enabled or not                                                                                                    | `false`
|          `sourceMaps` | A boolean indicating if source maps should generated or not                                                                              | `true` / dist: `false`
|       `sourceMapType` | The type of source maps which should be generated                                                                                        | `"eval-cheap-source-maps"`
|         `openBrowser` | The browser which should be opened when the game is started or build                                                                     | `"default"`
|          `staticType` | The resource type which should be loaded static from the server                                                                          | `"audio,video"`
|        `buildLogging` | The log level used while building the game                                                                                               | `"normal"`
|       `clientLogging` | The log level during the execution of the game                                                                                           | `"info"`
|       `serverLogging` | The log level for the API requests on the server                                                                                         | `"normal"`
| `serverLoggingFormat` | The format used for the logging the API requests                                                                                         | `"dev"`
|               `stats` | The statistics which should be tracked                                                                                                   | `"normal"`
|           `envPrefix` | The prefix used for game related environment variables                                                                                   | `"RMK_"`
|              `esLint` | Indicates whether the source code should be linted with esLint or not                                                                    | `false`

If you have to set a different value for a property for the dist build you can enter the same key with a `dist.` prefix and set the value for dist there.
Besides directly assigning values to the properties in the configuration file, you also have the possibility to overwrite these via an environment variable but the name must start with the prefix defined as `envPrefix` in the config file. E.g. `RMK_HTTPS` (or `RMK_DIST_HTTPS`) to overwrite the `https` property (for the dist-build). 

### Creating your game

Learn the basic concepts of screens, areas and panes here and then create them using the game editor or in your favourite code editor.