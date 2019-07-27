import {
    StackedPane,
    PatternPane,
    WorldPane,
    LinearGradientBackground,
    printDebugs,
    d,
    getNewSpriteMap,
    getNewSprite,
    spriteMaps
} from './engine.js';

var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');

var sprites = [];
var keys = {};

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
var fadeBg = new LinearGradientBackground('Y', canvas.height);
fadeBg.addColorStop('#000000', 100);
fadeBg.addColorStop('#400000', 100);
fadeBg.addColorStop('#000080', 100);
fadeBg.addColorStop('#F0F040', 100);
fadeBg.addColorStop('#802050', 100);
fadeBg.init();

var bgPane = new WorldPane(
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

const player0 = new Image();
player0.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA7ElEQVRYR9WX0Q6FIAxD2f9/NAYTDE5g7ZQFfbk+SHuAsnEl55xTSklEpPxGPZdvfYmEuHkW40gI7XUtewREz+O27yshRtqP4K2AmGl2k/8lhKU1PHrWQOS4IhrTs48IjEDQsWbxQYVaEGaMCcDWCcb8LH7IXqIQrDkFYEF4zGmAEYTX3AWgIdot9HRUOAM6K+2s33TSfwLo2dfVCdmCXuDCQjgz8kLAGUAMkG90mCEARpj5FqoDrKBVMakV8JhXA3TsnhcSlB7ppJbWXpdSixaZMXtF2+OPycqZz7po6R0Sad49ohXA08m+yMQB423wEY5FdSYAAAAASUVORK5CYII=";

const patternBg = new PatternPane(player0, 'repeat');
const patternBg2 = new PatternPane(player0, 'repeat');
const patternBg3 = new PatternPane(player0, 'repeat');
const patternBg4 = new PatternPane(player0, 'repeat');

const patternsBg = new StackedPane('Y', [bgPane, patternBg, patternBg2, patternBg3, patternBg4], [136, 16, 16, 16, 16]);

function prepareSpriteMaps() {

    var player = getNewSpriteMap(ctx, 6);
    player.makeTransparent();
    player.addCol(255, 230, 220, 255);
    for (var i = 0; i < player.len; i++) {
        player.set(i, i, 0);
        player.set(player.len - (i + 1), i, 0);
    }
    spriteMaps['x'] = player;
}

function init() {
    prepareSpriteMaps();
    var player = getNewSprite('x', 30, 20);
    sprites.push(player);

    levelPane.init(canvas.width, canvas.height);
/*
    bgPane.init(canvas.width, canvas.height, false);
    */
    fadeBg.init();
    patternsBg.init(canvas.width, canvas.height);
}

function render() {
    //bgPane.render(ctx);
    patternsBg.render(ctx);
    levelPane.render(ctx);

    sprites.forEach(
        function (v) {
            ctx.drawImage(player0, v.x, v.y);
        }
    );
    patternBg.scrollBy(1, 0);
    patternBg2.scrollBy(1.2, 0);
    patternBg3.scrollBy(1.5, 0);
    patternBg4.scrollBy(2, 0);
}

function update() {
    requestAnimationFrame(update);
    if (sprites.length === 0) {
        init();
    }
    handleKeys();
    render();
    printDebugs();
}

function handleKeys() {
    var moveX = 0;
    var moveY = 0;
    var speed = 3;
    for (var key in keys) {
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

    var scrollBoundsTop = {x: 130, y: 50};
    var scrollBoundsBottom = {x: 130, y: 50};

    var scrollX = 0;
    if (moveX !== 0) {
        var pos = sprites[0].x + moveX;
        if (pos < scrollBoundsTop.x) {
            // new position is left of scrollbounds
            if (sprites[0].x >= scrollBoundsTop.x) {
                scrollX = -Math.abs(scrollBoundsTop.x - pos);
                pos = scrollBoundsTop.x;
            } else if (pos < 0) {
                pos = 0;
            }
        }

        var max = canvas.width - 1 - sprites[0].len;
        var rightScrollBound = max - scrollBoundsBottom.x;
        if (pos > rightScrollBound) {
            if (sprites[0].x <= rightScrollBound) {
                scrollX = Math.abs(pos - rightScrollBound);
                pos = rightScrollBound;
            } else if (pos > max) {
                pos = max;
            }
        }
        sprites[0].x = pos;
    }
    var scrollY = 0;
    if (moveY !== 0) {
        var pos = sprites[0].y + moveY;
        if (pos < scrollBoundsTop.y) {

            if (sprites[0].y >= scrollBoundsTop.y) {
                scrollY = -Math.abs(scrollBoundsTop.y - pos);
                pos = scrollBoundsTop.y;
            } else if (pos < 0) {
                pos = 0;
            }
        }
        var max = canvas.height - 1 - sprites[0].len;
        var bottomScrollBound = max - scrollBoundsBottom.y;
        if (pos > bottomScrollBound) {
            if (sprites[0].y <= bottomScrollBound) {
                scrollY = Math.abs(pos - bottomScrollBound);
                pos = bottomScrollBound;
            } else if (pos > max) {
                pos = max;
            }
        }
        sprites[0].y = pos;
    }


    fadeBg.scrollBy(0.75 * (fadeBg.isHorizontal ? scrollX : scrollY));
    bgPane.scrollBy(0.25 * scrollX, 0.25 * scrollY);

    var unscrolled = levelPane.scrollBy(scrollX, scrollY);
    if (unscrolled.x !== 0) {
        sprites[0].x += unscrolled.x;
    }
    if (unscrolled.y !== 0) {
        sprites[0].y += unscrolled.y;
    }

    d('Sprite-Pos', sprites[0].x, ',', sprites[0].y);
}

onkeydown = function(e) {
    keys[e.key] = e.key;
};

onkeyup = function(e) {
    delete keys[e.key];
};

document.addEventListener("DOMContentLoaded", function(event) {
    update();
});