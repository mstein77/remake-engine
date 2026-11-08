import { BackgroundPane, Screen, TextPane } from "remake-engine"

export default Screen(

    ({ screen, globals }) => {
        screen.addPane(BackgroundPane({
            color: '#000000'
        }))
        screen.addPane(TextPane({
            "id": "message",
            "fonts": [
                globals.font
            ],
            "blocks": [
                {
                    id: 'title',
                    text: 'IMPLEMENT ME!',
                    autoCenteringX: true,
                    autoCenteringY: true
                }
            ]
        }))
    }
)
