import { d } from "./helper/helper.js";
import { Game, Screen } from "./core/classes.js";
import { BackgroundPane } from "./panes/BackgroundPane/pane.js";

export {
    Game,
    BackgroundPane,
    Screen,
    d
}
// import '../public/css/old.css';

/*
new Game(320, 200, {zoom: 2}, function() {

    this.setStateInitHandler(function () {
        return function () {
        }
    });

    const moveScreen = new Screen('move-it');
    moveScreen.setInitHandler(function () {
        this.addImageResource('font.png',
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASgAAAAICAYAAABK3GKbAAADhElEQVRoQ+1Z0XXCQAxLN2AURmAERmGEjMAojMAIjMIG9Dmv6lNc3clHSvvR9oeA47Mt27KTvt3v98c0TdP1ep0Oh0NcLtfH4/Etrp0c94RO/MUZI/rqfPbByePey+XygO/Kf/aH/c0xMg5KZwnwA5/4DH32j8+DvpLjHOVL/s2dz/dvzd8r9Rk7tpPrRcXfy1/g82o551xhxPlU1/Cxp1upE8YQtVbpP4eP8jn3cI8fuPeVjy7+LI8zdrvdwj+fJMQNBYOq4UAI3KAZgCAMyFsF15Ln81UT8/lbC9SRRU7ed9rLxQXCa+GvMFf+9PDfmr9RffaPr8PH2+02nU6n1UD7CYKC7XmelwHjGlg1KxNEj6Dy+fjO9Q995Qvw4KZtYarOGY1vNL+MJew7fF3/svwLQVUJIoqrleDsdAbJNVCFFFxSe/JeIeRirfjCE+B8Pi+4VImPdUFM0M0DAtsGbx3PEpTLnxsgPf1Ww7pmqTbYSIGrhuMc5VrE/YiPY1H39shJDddnCKpaS0wQaphV5aP2MkaMXas+q/W3NBJPs/gejcJGlBzNoxg0Jy3f0/qupmn2T21rChD8Blv7/X71CNsqQPV7LwHsX9hQk7WHEcviOvR7eCHhOT4mxZZ++Bd/KrdV/SDHTMLzPD8yvlUc3ATeKs9NqfLL/ufaV1uBI6VWvUTu4tGlVQ+ul1qDNRNKJuCIuVX/rj9acpXf8E8NaIevqh/kaUVQKNIqocT9CtTs6Mh5KvnVBlfF5ArckU+egr3zQAA5eVv8VxM9k1puOoe3i9npu0YaaUCXnxF5iwAcXo6EXLw9wuIGd0O9Z6fV/Mq2u9fF4/D6zvy6fn8JQY1sAK4BlXykwVyBu7OyfXeek48QXmVgVOxVCZIndEy1in3VDM8UMLbPvCEGXpiweEenNgRs38gnP0Lkqf6Mf7xhVjaZTHq8XY/YR71wDPkdVDU+RcQuf5X66hG803fyz5eErbUfAYQTKII8sXsrHBec0m/JPwpz5V/rEapn3wGAAohPrPdqEwob4X8uBtVQbJPlWLP5MaLin9to4BtiiM/8/gprvlrNMwGol8Ksj5pAPtwKz6Ss/KjoBwbq8dLh5+RoLpVHJgfOXfzuXgXw4HPx8XspfhzDf7J4C8P7R7bvzs9bSsbE6Tu520Cdfk++epnbW1X/ZX8HAfcI8HeQ+I/0txF4B1/LAa5iP5tGAAAAAElFTkSuQmCC"
        );
        return function (resources) {
            const bgConfig = new BackgroundPane.Config({id: 'move-bg', color: '#000000'});
            bgConfig.addImage(resources.image['font.png'], 15, 15);
            const bgPane = new BackgroundPane(bgConfig);
            moveScreen.addPane(bgPane);
        }
    });
    moveScreen.setFrameHandler(function () {});
    this.addScreen(moveScreen);


    this.addGlobalKeyHandler(() => {
        if (!this.keyHandling) return;

        if (!this.running) {
            if (this.keys['Escape']) {
                this.setRunning(true);
                console.log('Game restarted...');
            }
            return true;
        }
        if (this.keysDown['*']) {
            this.setZoom(this.zoom + 0.01);
        } else if (this.keysDown['_']) {
            this.setZoom(this.zoom - 0.01);
        }
        if (this.keys['Dead']) {
            this.openEditorMode();
        }
        if (this.keys['Escape']) {
            this.gotoScreen('demo');
            /*
                        this.setRunning(false);
                        console.log('Game stopped...');

            return true;
        } else if (this.keys['<']) {
            this.setDebug(!this.debug);
            console.log('Set Debug', this.debug);
        } else if (this.keys['+']) {
            this.setZoom(Math.floor(this.zoom + 1));
        } else if (this.keys['-']) {
            this.setZoom(Math.floor(this.zoom - 1));
        }
    });

    return 'move-it'
});
*/

