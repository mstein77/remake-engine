### Installation

Go to a directory where you want to have a new folder with your game and type `npx remake-engine-cli start <game>` whereas  `<game>` should be an id for your game. The script will download and configure everything in  a
new folder with your game id and at the end, open the new game in your browser, where you can also open the editor to create your new game. 

### Scripts

The installation script makes the following scripts available, that you can call on the command line terminal of your OS when you are in your game folder:

|           Script | Explanation                                                                                                                 |
|-----------------:|-----------------------------------------------------------------------------------------------------------------------------|
|   `npm run game` | Builds the current development version and opens it in the (defined) browser                                                |
|  `npm run dist`  | Builds the distribution version of your game in the `dist` folder of your game                                              |
|  `npm run start` | Starts a webserver delivering the distribution version of your game and builds it automatically if this was not done before |


### Build Configuration

The cli generates a build configuration file ``config.cjs`` which allows you to configure the development and distribution build of your game at the same time.


|                   Property | Explanation                                                            |
|---------------------------:|------------------------------------------------------------------------|
|       `title` `dist.title` | The title of your game which should be displayed in the browser window |
| `browsers` `dist.browsers` | The minimum browsers in which the game should run                      |
|                   `editor` | Boolean which indicates whether an editor should be available or not   |
 |                `editorKey` | The key which should open the editor                                   
 |          `resourceLoading` | The way resources are loaded                                                               
 |                   `server` | Boolean which indicates whether a server should be build or not        

Besides directly assigning values to the properties in the configuration file, you also have the possibility to overwrite these via an environment, if you prefer this.  

### Creating your game

Learn the basic concepts of screens, areas and panes here and then create them using the game editor or in your favourite code editor.