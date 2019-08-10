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

    var clouds = new Image();
	clouds.src = "data:image/png;base64,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";

    var clouds2 = new Image();
    clouds2.src = "data:image/png;base64,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";

    var clouds3 = new Image();
    clouds3.src = "data:image/png;base64,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";

    const patternBg = new PatternPane(clouds, 'repeat');
    const patternBg2 = new PatternPane(clouds2, 'repeat');
    const patternBg3 = new PatternPane(clouds3, 'repeat');
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

    const sbgArea = new SplitArea('Y', [21, 40, 19, 50, 20, 20, 20, 20]);
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