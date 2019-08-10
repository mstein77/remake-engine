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

    var clouds4 = new Image();
    clouds4.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT8AAAAJCAYAAABE8iuvAAADEUlEQVRoQ+1ZgXHCMBALGzACIzAKIzCCR8gIGYERGIURGIEN6Ck9UfV5O06TGFOSO64p8TlvWa/Xm02zXosj0Lbtfb/fN5fLpWnbdrP4C9cX9AisuPtECCH0fLxerx/NxzURFxaK0+l0v91uzXa77T8gHP4ej8dqsUdyMF781avmuDXOd8R9YSo2Xdf1+2qvTxXBaAKiaipQvEci47M6mN8UAl673e5RTc/n8x0jgBUvS7zD4VBMAFXQuH/6XSrxEDcFnONqEcHacV9a0HLnh/BhrO6l7mkt+5m7njnGPZIPJCI4dmKvWjCxVyFs+ooKHCB+dHe4p/ChsqLN4P+KZ0kBTBEmBOz/j0O1oq2xM/5XJ8x/wH2OJNY52NJqfsby2cvrV+9pCg8asrn414sfJ7XVXSuFdx8LdIo7pDXHHCGEYs5oiIRoo6z7VYEgPhA9JR7H8Ht9D+YrcQ5o21iIMeLquq7Hl8+9JKFTUBfLlhjflUgWJT25ZXGsEfchTs39nO6O85J7mtfkcMwBltrT3LXbDtTu+5R4H+LnBRNzfLmBc1xOy0znaUm8VHutImtdDc/lmOQQKF0D18VYOT6GoSasd5SA71IOkOKkgqWipfFzTEzQ/rJ3VuS9OebcJ3IhFuucuHNvau5gsJfAgp0FCxF4hwKG51pc2X2oCHpHF8pFHtmUOo+GmRgqnCp81pjZ9QzN5XHpqe0dmxw54+dMjJz36RivnYej1ARTd6P3JJktAnYjSBwVeyaVRzo7Di0xLpB5itv1BC8lXHR+FtOY+HzPhR9u+m6huCu365uKu1fceVwxpXsZy9FIMXn6ccIem5Bb3hGFctQWR8/9aQxTODi0dnWnFOncLsTOPVUAkwQeqsAI5hVJMATwmOdco10HEi0mDnZ+dWZ4pkmlxHt3rMbgWmLsO+Buf1SybTu7C+026ELp+GIdmBVDFmtykALoFcBYUZ7CUeTSEl2I16KninruGopX7xJJUcs7xghoLTGvcbwfAhTJVOR6vuuNyy30uehYl26PbHLmSR3d5Apc6j1fuJCkKBKQwfAAAAAASUVORK5CYII=";

    var clouds5 = new Image();
    clouds5.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAFCAYAAAA0cjXBAAABl0lEQVRYR+1WiQnDMAxsN8gIGTEjeISMmg1a1CJQD8k+P2makkAoBUc63Uln3W8Dn2VZHtM03eTdtu31rut6H5jisFC2NgHxb/W1EIt6SwzVXn71+SZXisnWg1j0/zdxtfB7ffNmwNNUe81y1KJntzmVGq7XLGz8I4wV67MDXks41nKEQbQOVdSEUTw0wlquanAy2FA3a4rao6ONES/NM+md4z9XV0qp21Nypqe4GD2ZBewDbErpIQmiImoaDbcBZgBsfDmPTRq5vjbwyG0zVyu73ZT42mtbkrzzPFNbKsM5Y0ail6ePHfpWfRBjLg9iVY5xI1S8bG0RdsUW9as3sLmtxcZr5YupiTlT6l+ccYzJzLz9xsuHOnmeUMKh/uDVvJtbM+7LiBDdBiPj526ckgAsDhwU9rsejno3ZsFszcZyYbclOSPDqucR816DHOWzpuMNJV5go/FFgzw6D9sb3jm8VFS/yGBqcnkXu5pQT997ejN4czmHGGANOdfZ8zFgG++XhjjHZMkcz1LHr3VLtBX2GNuRNT4B/o6qlAamdAIAAAAASUVORK5CYII=";

    var mountains = new Image();
    mountains.src = "data:image/png;base64,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";

    var fence = new Image();
    fence.src = "data:image/png;base64,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";

    var green1 = new Image();
    green1.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARkAAAACCAYAAABsdqj7AAAAw0lEQVRIS9WU0Q2AIAxEywaO4AiO5giOyghuoOnHJU3TUmjQKF9EOXp5PVr2gy76wKqVaF2JloXoPN83xPW3ra921mtWN5MG+DJj3mfW06yynLK6DINIA87wFJ3/+/9WroocMgieFUA8fFymA+pp5Dl5xtszbFkL8Ee02uPMWnwXhqH0Jtnxd8+D5tTilukD+LX6o/l6Ayfqg66lOUesLH2k8XLoZXc239GcW/n1Mo3cWD1sZVi/mR6PUY0R31bW5Bu4AeMJy8H7Z5xtAAAAAElFTkSuQmCC";
    
    var green2 = new Image();
    green2.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAAACCAYAAADCSSsWAAAAb0lEQVQoU61S2wkAIQyrGziiI9zobqDUIxhCfRxcv4qmeVRTeazlbFarjfra68zLMov5Vvw7TZ9xb45BrxoRL2P/ygQP0Icv9gfd5Itlowq6vVuFZRN4PJyp0YhDF3RacMRxmwkPAHykpR+Fs7BOB2zXS8E5RWMjAAAAAElFTkSuQmCC";


    const patternBg = new PatternPane(clouds, 'repeat');
    const patternBg2 = new PatternPane(clouds2, 'repeat');
    const patternBg3 = new PatternPane(clouds3, 'repeat');
    const patternBg4 = new PatternPane(clouds4, 'repeat');
    const patternBg5 = new PatternPane(clouds5, 'repeat');
    const patternBg6 = new PatternPane(mountains, 'repeat');
    const patternBg7 = new PatternPane(player, 'repeat');
    const patternFg = new PatternPane(fence, 'repeat');


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

    const sbgArea = new SplitArea('Y', [21, 40, 19, 9, 5, 73, 20, 20]);
    const sbgFadeBg = new LinearGradientPane('Y', 50);
    sbgFadeBg.addColorStop('#677b96', 50);
    sbgFadeBg.addColorStop('#ff7b96', 1);
    sbgArea.addPane(patternBg, 0);
    sbgArea.addPane(patternBg2, 1);
    sbgArea.addPane(patternBg3, 2);
    sbgArea.addPane(patternBg4, 3);
    sbgArea.addPane(patternBg5, 4);
    sbgArea.addPane(patternBg6, 6);
    sbgArea.addPane(sbgFadeBg, 5);
    sbgArea.addPane(patternBg7, 7);
    shadowScreen.addArea(sbgArea);

    const sfgArea = new SplitArea('Y', [198, 21]);
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