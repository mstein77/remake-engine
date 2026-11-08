import { Game, ImageResources, TransitionRegistry, FadeInOutTransition, FontMap } from "remake-engine"
import WelcomeScreen from "./screens/welcome.js"
import GameScreen from "./screens/game.js"

// instantiate a new game
new Game(
    // the game is initialized with a config, let's just set the dimension
    {
        width: 320, height: 200, zoom: 2
    },
    //
    ({ game }) => {

        // we can define and initialize global resources by using a globals resolver
        game.setGlobalsResolver(
            // we can define image, audio or JSON resources before the callback at the end
            // besides data-urls like in this example, you can also reference resources via http-url or as filename
            // A filename <name> of resource type <type> will be mapped to ./resources/<type>/<name>
            ImageResources({
                "font.png":
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATgAAAAICAYAAABtcuNzAAACvUlEQVRoQ+2R0U4jUQxDQer/f3GlRV4wslw7mekgeOl5mRs7cVJ4fxPu9/s/fG+32zu1o3AWtPmWr7NEe5IPphx6z8yCbR5MPdv9R/cT9bdsMM2DK7cT9G0+36lP51PvdCPQGeB9Z/M9DyRPtc3XWpk8kPKUK/PqAfcJ+uilvN/wfZ/X7XYA/+Fooj9oA7Np+Zf9H81XL/UnjTRP88F2jzL1JE+1qz5r9YFqU57XSZvqyUu1s/lg6kle0kDTHe3zGa+bRugBzWs1vpqXsv/ST/eQ5G3aT/mtxtczvFZ8/mEpScOJtCxpoOmKH8g3aPOqe4/mKe57ZsP7vXbtjM93q/lOM2d8JflX55Vn/KSBpjva196fnZ80HdBLaCbxPSn7r/3GdmvSzvh4u6b9SstLNdEceg8hJC1w0JOWJQ00HfgO72m+Z3qd0B7PJWm+ZacM7Uk+4H69o80lXecc9qdcJfnP5Dvue02tzQO9CXhWQ/s8P81OuT6vpHxFfc1O9/2Uz7ppRPOIZx3RfN9UOykTqE48x3vafGyahhX9AenYltN04r6jOT6rtJw0r71HNZD0pCm+n19qX23ffY1trvlK8q/OK8nf8pMGkr5pfCtHcolnaWZ7E/epTzOE/VNv0oDuSqSbQNKPaNMNySNTj98GfC/Refdiozdt+BzqlOF9qoGzM0f6vXZt8ycNJD1pxD2t+W4132mm+Vs9eal2Nh94z7QfJA0kfdPSmzXfKYMkL2XS9x3ug2necX+q+WaNr/c3DST9rAYm/WzNNzizlzwIzzItUk/xH+QwJ/X4DrL9EcgZH6Rcss277xnwk/ZdlDxo3keO5rkO0q6E7vd9Tspp866lWTD57nndNAW+zwPVNl9rxT2dd3yee9N+7U0aSfs8i5yZdz1lqrb51EDSqSXQtwa8+B3SP+r1f3jx4hofhRf0VB0PIAMAAAAQZGVCR0QwNUFFQTY2NTU4QjJBOEJeqrM/AAAAAElFTkSuQmCC"
            }),
            // the callback can be used to initialize resources and write them to the globals scope
            ({ image, globals }) => {
                // let's define a font which is used in TextPanes on both of our screens
                globals.font = FontMap({
                    id: "font",
                    image: image["font.png"], // our image resource from above is available in the image object
                    chars: [
                        ['!', 0, 0],
                        ['-', 8, 0],
                        ['@', 96, 0],
                        ['AZ', 104, 0],
                        ['09', 16, 0]
                    ]
                })
            }
        )

        // a game is a collection of screens, so let's add some screens...
        game.addScreen('welcome', WelcomeScreen)
        game.addScreen('game', GameScreen)

        // if we navigate to a new screen we want to have a fade-out and fade-in transition by default
        TransitionRegistry.add('default', FadeInOutTransition, {frames: 30, freezeSource: false})

        // the game needs to know the start screen which should rendered, return its id at the end
        return 'welcome'
    }
)
