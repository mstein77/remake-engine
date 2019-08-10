import {
    Game,
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    ColorPane,
    SpritePane,
    PatternPane,
    WorldPane,
    LinearGradientPane,
    d
} from './engine.js';



const Turrican = new Game(320, 256, 1, function () {
    var tb = 4;
    var spriteSheet = new Image();
    spriteSheet.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAQCAYAAABQrvyxAAAA9klEQVRIS2NkoBLYdejVf1KMcrUVBSt/oqNDijYMtYwU6YZqTsyc9P/tLzuSjdo4Rx/sAdmrV8lyx2Nt7f9kaUR3KcgDD58zkeQBHmEbhiHvgZx4KQbNTMfBEQOkJKEvb48wgGJgUHng/rHvRCUhPhN3hlEPQIOKqpkYFAMHLpbjLBQc9DvBxeygjwFcnhgyHgCFMjZPDAkPgJLHpzM7wSkU3RNDwgNVkxMZpix8htUTQ8ID+y+UMew+/BruCSZFbnBs7NuQwzgkPIBeEcA88O/+V7jUoCyFQK4DtYeIqsmQFM2fnscIKssHvDFHqsOR1YM8QIl+ALtc7JEpDo/lAAAAAElFTkSuQmCC";
    var world = [
        [2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [2, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    var levelPane = new WorldPane(tb, spriteSheet, world);
    var fadeBg = new LinearGradientPane('Y', Turrican.height);
    fadeBg.addColorStop('#000000', 100);
    fadeBg.addColorStop('#400000', 100);
    fadeBg.addColorStop('#000080', 100);
    fadeBg.addColorStop('#F0F040', 100);
    fadeBg.addColorStop('#802050', 100);

    const bgPane = new WorldPane(
        tb,
        spriteSheet,
        [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
        , fadeBg
    );

    const playerPane = new SpritePane();
    const player = new Image();
    player.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA7ElEQVRYR9WX0Q6FIAxD2f9/NAYTDE5g7ZQFfbk+SHuAsnEl55xTSklEpPxGPZdvfYmEuHkW40gI7XUtewREz+O27yshRtqP4K2AmGl2k/8lhKU1PHrWQOS4IhrTs48IjEDQsWbxQYVaEGaMCcDWCcb8LH7IXqIQrDkFYEF4zGmAEYTX3AWgIdot9HRUOAM6K+2s33TSfwLo2dfVCdmCXuDCQjgz8kLAGUAMkG90mCEARpj5FqoDrKBVMakV8JhXA3TsnhcSlB7ppJbWXpdSixaZMXtF2+OPycqZz7po6R0Sad49ohXA08m+yMQB423wEY5FdSYAAAAASUVORK5CYII=";
    playerPane.addSprite('player', player, 30, 20);

    const patternBg = new PatternPane(player, 'repeat');
    const patternBg2 = new PatternPane(player, 'repeat');
    const patternBg3 = new PatternPane(player, 'repeat');
    const patternBg4 = new PatternPane(player, 'repeat');
    const patternBg5 = new PatternPane(player, 'repeat');
    const patternBg6 = new PatternPane(player, 'repeat');
    const patternBg7 = new PatternPane(player, 'repeat');
    const patternFg = new PatternPane(player, 'repeat');


    // ##############################
    //   Turrican
    // ##############################

    let gameScreen = new Screen('turrican-ingame');

    console.log('Turrican');
    let gameArea = new Area();
    gameArea.addPane(fadeBg);
    gameArea.addPane(bgPane);
    gameArea.addPane(levelPane);
    gameArea.addPane(playerPane);

    let logoArea = new Area();
    logoArea.addPane(patternBg);
    let textArea = new Area();
    textArea.addPane(new ColorPane('#A07070'));
    textArea.addPane(patternBg3);
    let statusArea = new SplitArea('X', [100, 220]);
    statusArea.addArea(textArea, 1);
    statusArea.addArea(logoArea);

    let mainArea = new SplitArea('Y', [240, 16]);
    mainArea.addArea(gameArea);
    mainArea.addArea(statusArea);

    gameScreen.addArea(mainArea);

    gameScreen.setKeyHandler(function() {
        let moveX = 0;
        let moveY = 0;
        const speed = 3;
        for (var key in this.keysDown) {
            switch (key) {
                case 'a':
                    moveX -= speed;
                    break;

                case 'd':
                    moveX += speed;
                    break;

                case 'w':
                    moveY -= speed;
                    break;

                case 's':
                    moveY += speed;
                    break;
            }
        };

        const canvas = {
            width: levelPane.dimX,
            height: levelPane.dimY
        };

        const scrollBoundsTop = {x: 130, y: 50};
        const scrollBoundsBottom = {x: 130, y: 50};

        const sprite = playerPane.getSpritePos('player');

        let move = false;
        let scrollX = 0;
        if (moveX !== 0) {
            let pos = sprite.x + moveX;
            if (pos < scrollBoundsTop.x) {
                // new position is left of scrollbounds
                if (sprite.x >= scrollBoundsTop.x) {
                    scrollX = -Math.abs(scrollBoundsTop.x - pos);
                    pos = scrollBoundsTop.x;
                } else if (pos < 0) {
                    pos = 0;
                }
            }

            let max = canvas.width - 1 - sprite.len;
            let rightScrollBound = max - scrollBoundsBottom.x;
            if (pos > rightScrollBound) {
                if (sprite.x <= rightScrollBound) {
                    scrollX = Math.abs(pos - rightScrollBound);
                    pos = rightScrollBound;
                } else if (pos > max) {
                    pos = max;
                }
            }
            sprite.x = pos;
            move = true;
        }

        let scrollY = 0;
        if (moveY !== 0) {
            let pos = sprite.y + moveY;
            if (pos < scrollBoundsTop.y) {

                if (sprite.y >= scrollBoundsTop.y) {
                    scrollY = -Math.abs(scrollBoundsTop.y - pos);
                    pos = scrollBoundsTop.y;
                } else if (pos < 0) {
                    pos = 0;
                }
            }
            let max = canvas.height - 1 - sprite.len;
            let bottomScrollBound = max - scrollBoundsBottom.y;
            if (pos > bottomScrollBound) {
                if (sprite.y <= bottomScrollBound) {
                    scrollY = Math.abs(pos - bottomScrollBound);
                    pos = bottomScrollBound;
                } else if (pos > max) {
                    pos = max;
                }
            }
            sprite.y = pos;
            move = true;
        }

        fadeBg.scrollBy(0.75 * (fadeBg.isHorizontal ? scrollX : scrollY));
        bgPane.scrollBy(0.25 * scrollX, 0.25 * scrollY);
        patternBg.scrollBy(1.2 * scrollX, 0);
        patternBg3.scrollBy(1.6 * scrollX, 0);

        var unscrolled = levelPane.scrollBy(scrollX, scrollY);
        if (unscrolled.x !== 0) {
            sprite.x += unscrolled.x;
            move = true;
        }
        if (unscrolled.y !== 0) {
            sprite.y += unscrolled.y;
            move = true;
        }

        if (move) {
            playerPane.setSpritePos('player', sprite.x, sprite.y);
        }

        d('Sprite-Pos', sprite.x, ',', sprite.y);
    });

    this.addScreen(gameScreen);

    // #################################
    //   Shadow of the Beast
    // #################################

    const shadowScreen = new Screen('shadow-ingame');

    const sbgArea = new SplitArea('Y', [20, 40, 30, 50, 20, 20, 20, 20]);
    const sbgFadeBg = new LinearGradientPane('Y', 50);
    sbgFadeBg.addColorStop('#677b96', 50);
    sbgFadeBg.addColorStop('#ff7b96', 1);
    sbgArea.addPane(patternBg, 0);
    sbgArea.addPane(patternBg2, 1);
    sbgArea.addPane(patternBg3, 2);
    sbgArea.addPane(sbgFadeBg, 3);
    sbgArea.addPane(patternBg4, 4);
    sbgArea.addPane(patternBg5, 5);
    sbgArea.addPane(patternBg6, 6);
    sbgArea.addPane(patternBg7, 7);
    shadowScreen.addArea(sbgArea);

    const sfgArea = new SplitArea('Y', [188, 32]);
    sfgArea.addPane(new WorldPane(
        tb,
        spriteSheet,
        world
    ), 0);
    sfgArea.addPane(patternFg, 1);
    shadowScreen.addArea(sfgArea);

    shadowScreen.setFrameHandler(function() {
        patternBg.scrollBy(1,0);
        patternBg2.scrollBy(0.6,0);
        patternBg3.scrollBy(0.4,0);
        patternBg4.scrollBy(0.3,0);
        patternBg5.scrollBy(0.5,0);
        patternBg6.scrollBy(0.8,0);
        patternBg7.scrollBy(1,0);
        patternFg.scrollBy(2, 0);
    });

    this.addScreen(shadowScreen);

    // ################################

    this.addGlobalKeyHandler(() => {
        if (!this.running) {
            if (this.keys['Escape']) {
                this.setRunning(true);
                console.log('Game restarted...');
            }
            return true;
        }

        if (this.keys['Escape']) {
            this.setRunning(false);
            console.log('Game stopped...');
            return true;
        } else if (this.keys['<']) {
            this.setDebug(!this.debug);
            console.log('Set Debug', this.debug);
        } else if (this.keys['+']) {
            this.setZoom(this.zoom + 1);
        } else if (this.keys['-']) {
            this.setZoom(this.zoom - 1);
        }
        if (this.keys['1']) {
            this.gotoScreen('turrican-ingame');
            return true;
        } else if (this.keys['2']) {
            this.gotoScreen('shadow-ingame');
            return true;

        }
    });

    return 'turrican-ingame';
});

/**
 * The screen manager holds all possible screens of the game and allows transitions to a new screen by deleting and
 * creating overlay canvases of the current view.
 *
 * A screen can either be a Area (=overlays of different panes with the same dimension) or a
 * Split-Area which divides the screen in different subAreas along one axis (where each subArea can also be a Area or Split-Area).
 *
 * An area will create a canvas for each pane with the same dimension:
 *
 *   Area1:
 *     a) colorPane (=fix background color, opaque, no repaints)
 *     b) MapPane (=scrollable World, canvas will be bigger than the viewPort for css-scrolling, transparent, repaints on worldPos change)
 *     c) SpritePane (transparent, repaints)
 *
 *   Turrican:
 *
 *     Y230-Area1:
 *        a) GradientPane (opaque, repaint on scroll)
 *        b) MapPane (transparent, repaints on worldPos change)
 *        c) SpritePane (transparent, repaints)
 *
 *     Y20-Area1:
 *        a) backgroundPane (opaque, no repaints)
 *        b) textPane (transparent, repaint on status-update)
 *
 *    => Areas:
 *     A1.1 [0, 0, 320, 230] -> GradientPane, MapPane, SpritePane
 *     A1.2 [0, 230, 320, 20] -> backgroundPane, textPane
 *
 *
 *
 *
 *   Shadow of the Beast:
 *
 *    Area 1:
 *     Y150-Area:
 *       a) GradientPane
 *     Y100-Area:
 *       a) EmptyPane
 *
 *    Area 2:
 *     Y20-Area: PatternPane (opaque, scrollable, no repaints)
 *     Y40-Area: PatternPane
 *     Y30-Area: PatternPane
 *     Y50...
 *
 *    Area 3:
 *     Y200-Area: MapPane, SpritePane
 *     Y50-Area: PatternPane
 *
 *
 *    => Areas:
 *      A1.1 [0, 0, 320, 150] -> GradientPane
 *      A1.2 [0, 150, 320, 100] -> EmptyPane
 *      A2.1 [0, 0, 320, 20] -> PatternPane
 *      A2.2 [0, 20, 320, 40] -> PatternPane
 *      A2.3 [0, 60, 320, 30] -> PatternPane
 *      ..
 *      A3.1 [0, 0, 320, 200] -> MapPane, SpritePane
 *      A3.2 [0, 200, 320, 250] -> PatternPane
 *
 *
 *
 * Ein Screen besteht aus einer Folge von Areas, die alle mit der gleichen Dimension initialisiert werden
 * Liegt eine Splitarea vor, dann werden die darunterliegenden Areas entlang der SplitAxis auf einen vorgegebenen Wert gesetzt
 *
 * Für jede Area wird ein Canvas erzeugt, sofern es keine SplitArea ist
 *
 *
 *
 */