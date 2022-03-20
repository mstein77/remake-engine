import {
    Game,
    Area,
    SplitArea,
    Screen,
    EmptyPane,
    CanvasPane,
    BitmapScrollPane,
    SpritePane,
    ColorPane,
    TextPane,
    TextBlock,
    PatternPane,
    TilesPane,
    ObjectController,
    BufferedTilesPane,
    LinearGradientPane,
    MasterSlavesScrollHandler,
    BoundsScrollHandler,
    SpriteAndTilesCollider,
    InputController,
    AxisPath,
    Position,
    Gravity,
    Force,
    d,
    SpriteSheet,
    TilesMap,
    States,
    FontMap,
    TILE,
    INPUT,
    PATH,
    COLLISION,
    ANIMATION
} from './engine';

new Game(320, 224, {zoom: 2, debug: false}, function () {

    this.setStateInitHandler(function () {
        this.addImageResources({
            'marioFont.png': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAYCAYAAAAyC/XlAAAC/klEQVRoQ+1Z0U4DMQxj0v7/iyeBDtEpBDt2um4rMF6Yrm2aJo7j653evv4ul8v7+H0+n0/jd/w/5uTxuBbZQOPHvMrOGJtZG22z9WpO9E2d77DF4ncP/5VvMQfq/J+JPiblgDvJiQdHTiEguSBS/jjAdPxD/sRnajzvked313ftsXjmwmZFfXIcdI1VlcCS4R44M1IHIBVY1PmfMa7ArQCq1sfxZQDIVKPaBEugQjQDDAOIEwxF8RWNuwCZBfAq+2z/JQBQyc+bIwQjzeFoERUgxV7uegYk1WOVfQX4e6z/xgCImqMmUBXExE8V+OrQ3R6qArQaAPfwr7Kp9psB0A8AuL0b0YiqgGx72HCqOycv7q+UMGtBlTB17SvB6zBct0W6vuV5CiDwdQ/R8evZ34zAFQBMCDkUW4kk1EIiC3Tsu6+VSiUzWkVV5pytEpEz6xU7dOKn4nu9BziMzgRYaQRUN1WClMNMUA7/syZBGqUDEOXP6vGOPkL6LT9T/sG3AJVU5qTqN0iQqWSwQ1b6AFUIqxoVoGeMs2ajfFHxReM/AFBVEBKBCiwuA1Ti0KkKtM/BaEqkqqCuHq8YiQk9lDj3mWJEeQ+gAqAAoNZX/bM6JEN7TDr7PdNDGfgRg1UMxFqtiqND9yxeVYyhBlC03GkBLgBytapXrW4FoI9LGSAuhVbJyudlAKmuslfGF7XKGNuHvAVUCGQBi5XCaHw2gdWeuRU5uib7N/xC/q1uAZEZnBaShf7rHoAprn/yfIkGcGnPFZGVIPzNeXHY5NHnswEwKLmiMOcTLVo/aAxdgLAr40cH6tb9UJu41eaK9d8AcDip+haqzooBkGDKSnjsi5RuHFtx4Bkb2YcZn7YHAAoM++DifFCprjNZpaPAzgS7m+RKZEYVHcXdrXvswmzyoqSrMnN15/UMPCy4uwCAtakOELbWAKzH557Nejiibyf5ObConexQLbE9zvqzNQDYxQtyeuaiwmkxu4rAFRqgwxSPnLvVPcCuQmlVQnZkgA/VdyxzlcUF0AAAAABJRU5ErkJggg==",
            'sprites.png': "data:image/png;base64,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"
        });
        this.addJsonResource(
            'marioFontMap',
            {
                width: 8,
                height: 8,
                chars: [
                    ['09', 0, 0],
                    ['AF', 10*8, 0],
                    ['GV', 0, 8],
                    ['WZ', 0, 16],
                    ['!', 88, 16],
                    ['-', 64, 16],
                    ['*', 72, 16]
                ],
                image: 'marioFont.png'
            }
        );
        return (resources, globals) => {

            globals.fontMap = new FontMap('marioFontMap');

            const statusPaneConf = new TextPane.Config({id: 'statusPane'});
            statusPaneConf.addFont(globals.fontMap);
            const statusPane = new TextPane(statusPaneConf);
            statusPane.addTextBlocks([{
                id: 'status',
                x: 24,
                y: 8,
                text: "MARIO         WORLD  TIME"
            }, {
                id: 'score',
                x: 3 * 8,
                y: 16,
                text: '      '

            }, {
                id: 'coins',
                x: 12 * 8,
                y: 16,
                text: '   '
            }, {
                id: 'world',
                x: 18 * 8,
                y: 16,
                text: '' + globals.world
            }, {
                id: 'time',
                x: 25 * 8,
                y: 16,
                text: '   '
            }]);
            globals.updateCoins = function() {
                statusPane.updateTextBlock('coins', '*' + TextPane.padStart(globals.coins, '0', 2));
            };

            globals.updateTime = function() {
                statusPane.updateTextBlock('time', globals.time === null ? '' : TextPane.padStart(globals.time, '0', 3));
            };

            globals.updateScore = function() {
                statusPane.updateTextBlock('score', TextPane.padStart(globals.score, '0', 6));
            };

            globals.updateWorld = function() {
                const parts = globals.world.split('.', 2);
                statusPane.updateTextBlock('world', parts[0]);
            };

            globals.updateStatusPane = function() {
                const ids = globals.statusPane.getTextBlockIds();
                const baseIds = ["status", "score", "coins", "world", "time"];
                for (let id of ids) {
                    if (baseIds.indexOf(id) === -1) {
                        globals.statusPane.removeTextBlock(id);
                    }
                }
                globals.updateCoins();
                globals.updateTime();
                globals.updateScore();
                globals.updateWorld();
            };
            globals.statusPane = statusPane;
        }
    });

    /**
     * GLOBALS
     */
    const bootstrap = new Screen('bootstrap');
    bootstrap.setInitHandler(function (globals) {
        this.addAudioResources({
            'sfx_coin.wav': 'http://localhost:8080/audio/smb/coin.wav',
            'sfx_oneup.wav': 'http://localhost:8080/audio/smb/1-up.wav',
            'sfx_breakblock.wav': 'http://localhost:8080/audio/smb/breakblock.wav',
            'sfx_bump.wav': 'http://localhost:8080/audio/smb/bump.wav',
            'sfx_jump.wav': 'http://localhost:8080/audio/smb/jump-small.wav',
            'sfx_stomp.wav': 'http://localhost:8080/audio/smb/stomp.wav',
            'sfx_fireball.wav': 'http://localhost:8080/audio/smb/fireball.wav',
            'sfx_kick.wav': 'http://localhost:8080/audio/smb/kick.wav',
            'sfx_newpowerup.wav': 'http://localhost:8080/audio/smb/powerup-appears.wav',
            'sfx_powerup.wav': 'http://localhost:8080/audio/smb/powerup.wav',
            'sfx_flagpole.wav': 'http://localhost:8080/audio/smb/flagpole.wav',
            'sfx_die.wav': 'http://localhost:8080/audio/smb/mariodie.wav',
            'sfx_fireworks.wav': 'http://localhost:8080/audio/smb/fireworks.wav',
            'sfx_gameover.wav': 'http://localhost:8080/audio/smb/gameover.wav',
            'sfx_stageclear.wav': 'http://localhost:8080/audio/smb/stage-clear.wav',
            'sfx_warning.wav': 'http://localhost:8080/audio/smb/warning.wav',
            'sfx_invincible.wav': 'http://localhost:8080/audio/smb/invincible.wav',
            'sfx_tubedown.wav': 'http://localhost:8080/audio/smb/pipe.wav',
            'sfx_overworld.mp3': 'http://localhost:8080/audio/smb_overworld.mp3',
            'sfx_underworld.mp3': 'http://localhost:8080/audio/smb_underworld.mp3',
            'sfx_castle.mp3': 'http://localhost:8080/audio/castle-bgm.mp3',
            'sfx_bonus.wav': 'http://localhost:8080/audio/smb/bonus.wav',
            'sfx_bowserfalls.wav': 'http://localhost:8080/audio/smb/bowserfalls.wav',
            'sfx_firebreath.wav': 'http://localhost:8080/audio/smb/firebreath.wav',
            'sfx_worldclear.mp3': 'http://localhost:8080/audio/world_clear.mp3'
        });
        return function (resource, globals) {
//            globals.testAudio = resource.audio.sfx_oneup;

            this.audio.addAudioResources({
                coin: resource.audio['sfx_coin.wav'],
                oneup: resource.audio['sfx_oneup.wav'],
                breakblock: resource.audio['sfx_breakblock.wav'],
                bump: resource.audio['sfx_bump.wav'],
                jump: resource.audio['sfx_jump.wav'],
                stomp: resource.audio['sfx_stomp.wav'],
                fireball: resource.audio['sfx_fireball.wav'],
                powerup: resource.audio['sfx_powerup.wav'],
                newpowerup: resource.audio['sfx_newpowerup.wav'],
                kick: resource.audio['sfx_kick.wav'],
                flagpole: resource.audio['sfx_flagpole.wav'],
                die: resource.audio['sfx_die.wav'],
                fireworks: resource.audio['sfx_fireworks.wav'],
                gameover: resource.audio['sfx_gameover.wav'],
                stageclear: resource.audio['sfx_stageclear.wav'],
                warning: resource.audio['sfx_warning.wav'],
                invincible: resource.audio['sfx_invincible.wav'],
                tubedown: resource.audio['sfx_tubedown.wav'],
                overworld: resource.audio['sfx_overworld.mp3'],
                underworld: resource.audio['sfx_underworld.mp3'],
                castle: resource.audio['sfx_castle.mp3'],
                worldclear: resource.audio['sfx_worldclear.mp3'],
                bonus: resource.audio['sfx_bonus.wav'],
                bowserfalls: resource.audio['sfx_bowserfalls.wav'],
                firebreath: resource.audio['sfx_firebreath.wav']
            });
            this.audio.addChannel('bgm');

            globals.savePositions = [];
            globals.activeSavePosition = null;
            globals.worlds = {
                '1-1': {
                    theme: 'overworld',
                    startPos: {x: 2, y: 10},
                    map:
                        [
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 245,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0, 660, 661, 661, 661, 662,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [237, "object:flag"],   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   [0, 'object:evilmush.left'],   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-block",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   1,   1,   0,   0,   0,   1,   1,   1, "coin-block",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  24,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   1,   0,   0,   0,   0,   1, "coin-block", "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "one-up-hidden",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  11, [ 11, "object:flag-up-fg"],  11,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-block",   0,   0,   0,   1,  24,   1, "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0,   0, "tube-down.1-1.uw", 265,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,  24,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-cache",   0,   0,   0,   0,   0,   1, "star-block",   0,   0,   0,   0, "coin-block",   0,   0, "coin-block",   0,   0, "coin-block",   0,   0,   0,   0,   0,   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   0,   0,   0,   0,   0,   0,  33,   0,   0,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   1,   1, "coin-block",   1,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  12,  13,  14,   0,   0,   0,   0,   0,   0,   0],
                            [  0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0, 273,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,  33,  33,   0,   0,   0,   0, 273,   0,   0,   0,  33,  33,  33,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0, 273,   0,   0,   0, 237,   0,   0,   0,  11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0],
                            [  0, 272, 305, 274,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,    0, 297, 298,  0, 272, 305, 274,   0,   0,   0,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 272, 305, 274,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 273,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,   0,   0,  33,  33,  33,   0,   0, 272, 305, 274,   0,  33,  33,  33,  33,   0,   0,  33,  33,  33,   0,   0,   0, 273,   0, 264, 265,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0, 272, 305, 274,   0,   0, 237,   0,   0,   0,  13,  13,  45,  13,  13,   0,   0, 273,   0,   0,   0],
                            [272, 305, 306, 307, 274,   0,   0,   0,   0,   0,   0, 308, 309, 309, 309, 310, 272, 305, 274,   0,   0,   0, [  0, "object:evilmush.left"], 308, 309, 310,   0,   0, 297, 298,   0,   0,   0,   0,   0,   0,   0,   0, 297, 298, [  0, "object:evilmush.left"], 308, 309, 309, 310,   0, 297, 298, 272, 305, 306, [307, "object:evilmush.left"],  [274, "object:evilmush.right"],   0,   0,   0, 0,  297, 298, 308, 309, 309, 309, 310, 272, 305, 274,   0,   0,   0,   0, 308, 309, 310,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:store-position'],   0,   0,   0,   0,   0,   0, 308, 309, 309, 310,   0,   0,   0, 272, [305, 'object:evilmush.left'], [306, 'object:evilmush.right'], 307  , 274,   0,   0,   0,   0,   0,   0, [308, 'object:turtle.left'], 309, 309, 309, 310, 272, 305, [274, 'object:evilmush.left'],   [0, 'object:evilmush.right'],  0,   0,   0, 308, 309, 310,   0,   0,   [0, 'object:evilmush.left'],  [0, 'object:evilmush.right'],  0,   0,   0,   [0, 'object:evilmush.left'],  [0, 'object:evilmush.right'],   0,   0,   0,  33,  33,  33,  33, 309, 309,  33,  33,  33,  33, 272, 305, 306, 307,  33,  33,  33,  33,  33,   0,   0,  33,  33,  33,  33, 310, 272, 305, 274, 297, 298,   0,   0, 308, 309, 310,   0,   0,   0,   0,   [0, 'object:evilmush.left'], [  0, "object:evilmush.right"],   0,   0,   0, 297, 298,  33,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0, 272, 305, 306, 307, 274,   0,  33,   0,   0,   0,  13,  13,  46,  13,  13, 310, 272, 305, 274,   0,   0],
                            [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                            [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                        ],
                    next: '1-2'
                },
                '1-1.uw': {
                    theme: 'underworld',
                    startPos: {x: 2, y: 0},
                    map: [
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,   0, 123, 123, 123, 123, 123,   0,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0, 123, 123, 123, 123, 123, 123, 123,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0, 123, 123, 123, 123, 123, 123, 123,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,   0,   0, 332, 333, 334],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,   0,   0, 365, 366, 367],
                        [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66, "tube-right.1-1.ow",  66,  66,  66],
                        [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66],
                    ],
                    next: null
                },
                '1-2': {
                    theme: 'overworld',
                    startPos: {x: 2, y: 10},
                    main: '1-2.uw',
                    cutscene: 'run-to-pipe',
                    map: [
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0],
                        [  0,  11,  11,  11,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0],
                        [  0,  12,  13,  14,   0,   0,   0,   0,   0,   0,   0,   0, 264, 265,   0,   0],
                        [ 11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0,   0, 297, 298,   0,   0],
                        [ 13,  13,  45,  13,  13,   0,   0,   0,   0,   0, 266, 267, 268, 298,   0,   0],
                        [ 13,  13,  46,  13,  13,   0,   0,   0,   0,   0, 299, 300, 301, 298,   0,   0],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  "tube-right.1-2.uw",  28,  28,  28,  28,  28,  28],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                    ],
                    next: null
                },
                '1-2.uw': {
                    theme: 'underworld',
                    startPos: {x: 2, y: 0},
                    map:
                        [
                            [ 68,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, 68, 68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, "one-up-block",  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68, 363, 364,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,  68,  [68, 'object:warp-zone']],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 0, 0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,  68,  68,  68,  68,  68,  68,   0,   0,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 0, 0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,  68,  68,  68,  68,  68,  68,   0,   0,  68,  68,  68,  68,   0,   0,   0,   [0, 'object:evilmush.left'],   0,   0,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 0, 0,   0,   0, 123, 123, 123, 123,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,  68,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 123, 123, 123, 123, 123, 123,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  0, 0,  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,  68,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, "obstacle:bar.down"],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, "obstacle:bar.up"],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  0, 0, 0,  68,   0,  68,  68,  68,  68,   0,  'star-block',   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,  68,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-cache",   0,   0,   0,   0,   0,   0, 0, 0,   0,  68, 123,  68,   0,   0,  68, 123,  68,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0, 123, 123, 123, 123,  68,  68,   0,   0,   0,  68, 123,  'power-up-hidden',   0,   0,  68,  'coin-cache',   0,   0,   [0, 'object:evilmush.left'],   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:plant'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  [0, 'object:evilmush.left'],  0,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  'power-up-hidden',   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 332, 333, 334, 364,  68,  68,  68,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,  90, "coin-block", "coin-block", "coin-block", "coin-block",   0,   0,   0,   0,   0,   0,   0,   0,  99,   0,  99,   0,   0,   0,   0,   0,   0, 0,   0,   0,   0,   0,   0,   0,  68,  68,  68,   0,   0,  68,  68,  68,   0,   0,   0,   0,   0,  68,  68,  68,  68,   0,   0,  68,  68,  68,  68,  68,  68,   0,   0,   0,  68,  68,  68,   0,   0,  68,  68,   0,   0,  68,  68,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  0,   0,   0,   0,   0,   0,   [0, 'object:plant'],   0,   0,   0,   0,   0, 330, 331,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:evilmush.left'],  99,  99,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 365, 366, 367, 364,  68,  68,  68,  68,  68,  68,  68,   0,   [0, 'object:plant'],   0,   0,   0,   [0, 'object:plant'],   0,   0,   0,   [0, 'object:plant'],   0,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  99,   0,  99,   0,  99,   0,  99,   0,   0,   0,  99,   0,   0,   0,   0,   0,   0,   0,   0,  0,  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 'tube-down.1-2.sub', 331,   0,   0,   0,   0, 363, 364,   0,   0,   0,   0,   [0, 'object:plant'],   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  99,  99,  99,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  "tube-right.1-2.ow", 68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,   0, 'tube-down.1-1.ow', 331,   0,   0, 'tube-down.1-1.ow', 331,   0,   0, 'tube-down.1-1.ow', 331,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  99,   0,  99,   0,  99,   0,  99,   0,  99,   0,   0,   0,  99,   0,   99, 0, 0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 363, 364,   0,   0,   0,   0, 363, 364,   0,   0,   0,   0, 330, 331,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  99,  99,  99,  99,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,   0, 363, 364,   0,   0, 363, 364,   0,   0, 363, 364,   0,   0,  68,  68],
                            [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  [0, 'object:evilmush.left'],   [0, 'object:evilmush.left'],  99,   0,  99,   0,  99,   0,  99,   0,  99,   0,  99,   0,   [0, 'object:evilmush.left'],   0,  99, 0, 99,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:turtle.left'],   0,   [0, 'object:turtle.left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:turtle.left'],   0,   0,   [0, 'object:evilmush.left'],   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:evilmush.left'],   [0, 'object:evilmush.left'],   [0, 'object:evilmush.left'], 363, 364,   0,   0,   0,   0, 363, 364,   0,   0,   [0, 'object:evilmush.left'],   0, 363, 364,   0,   0,   0,   0,   0,  68,  68,   0,   0,   0,   0,   0,   0,   0,   0,   0,  99,  99,  99,  99,  99,   0,   0,   [0, "obstacle:bar.down"],   0,   0,   0,   0,   [0, 'object:turtle.red-left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, "obstacle:bar.up"], 0,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,   0, 363, 364,   0,   0, 363, 364,   0,   0, 363, 364,   0,   0,  68,  68],
                            [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66, 66, 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,  66,  66,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,   0,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,   0,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66],
                            [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66, 66, 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,  66,  66,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,   0,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,   0,   0,   0,   0,   0,   0,   0,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66],
                        ],
                    next: null
                },
                '1-2.sub': {
                    theme: 'underworld',
                    startPos: {x: 2, y: 0},
                    map: [
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68,  68, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68, 363],
                        [ 68,   0,   0,   0,   0, 123, 123, 123, 123, 123, 123, 123,   0,  68,  68, 363],
                        [ 68,   0,   0,   0,  68,  68,  68,  68,  68,  68,  68,  68,  'coin-cache',  68,  68, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  68,  68, 363],
                        [ 68,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 332, 333, 334],
                        [ 68,   0,   0,   0, 123, 123, 123, 123, 123, 123, 123, 123,   0, 365, 366, 367],
                        [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66, "tube-right.1-2.uw#2",  66,  66,  66],
                        [ 66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66,  66],
                    ],
                    next: null
                },
                '1-2.ow': {
                    theme: 'overworld',
                    startPos: {x: 3, y: 8},
                    map: [
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 245,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661],
                        [  0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [237, "object:flag"],   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694],
                        [  0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  11,  [ 11, "object:flag-up-fg"],  11,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  12,  13,  14,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   [0, 'object:plant'],   0,   0,   0,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0, 273,   0,   0,   0, 237,   0,   0,   0,  11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0, 264, 265,   0,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0,   0, 272, 305, 274,   0,   0, 237,   0,   0,   0,  13,  13,  45,  13,  13,   0,   0, 273,   0,   0,   0],
                        [  0,   0,   0, 297, 298,  33,  33,  33,  33,  33,  33,  33,  33,  33,   0,   0, 272, 305, 306, 307, 274,   0,  33,   0,   0,   0,  13,  13,  46,  13,  13, 310, 272, 305, 274,   0,   0],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                    ],
                    next: '1-3'
                },
                '1-3': {
                    theme: 'overworld',
                    startPos: {x: 2, y: 10},
                    map: [
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  57,  57,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 245,   0,   0,   0,   0,   0,  11,  11,  11,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:evilmush.left'],   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 661, 662,   0, [237, "object:flag"],   0,   0,   0,   0,   0,  12,  13,  14,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  57,  57,  57,   [0, 'object:turtle.red-left'],   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 270, 270, 270, 271,   0,   0,   0,   0, 693, 694, 694, 695,   0,   0,   0,   0,   0,  57,  57,  57,  57,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  57,  57,   0,   0,  57,  57, 693, 694, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 694, 695,   0, 237,   0,   0,   0,   0,  11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 270, 271,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 271,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:evilmush.left'],   0,   0,   0,   0,  57,  57,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  57,  57,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  13,  13,  45,  13,  13,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,  38,  38,  38,  38,  38,   0,   0,   0,   0,  57,  57,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:turtle.red-flying'],   0, 269, 270, 270, 270, 270, 271,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:turtle.red-left'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,   0,   0,  13,  13,  46,  13,  13,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,   0,   0,   0,   0,   0, 660, 661, 662, 693, 694, 695,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0, 660, 661, 662, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 270, 270, 270, 270, 271,   0,   0,   [0, 'object:turtle.red-flying'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'obstacle:bar.leftright'], 660, 661, 662, 693, 694, 695,   0,   0,   0,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237, 660, 661,  11,  11, [ 44, "object:flag-up-fg.hidden"],  44,  44,  44,  44,  11,  11,  11,  11,  11,  11,  11,  11,  11,  11],
                        [  0,  11,  11,  11,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,   0,   0,   0,   0,   0, 269, 270, 270, 270, 271,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237, 693, 694,  13,  13,  13,  45,  13,  45,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13],
                        [  0,  12,  13,  14,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 270, 270, 270, 270, 271,   0,   0,   0,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0, 269, 270, 271,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0,   0,   0,   [0, 'obstacle:bar.leftright'],   0,   0,   0,   0,   0,   0,   0,   [0, 'obstacle:bar.leftright'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0, 269, 270, 270, 271,   0,   0, 269, 270, 270, 271,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,  13,  13,  13,  46,  13,  46,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13],
                        [ 11,  44,  44,  44,  11,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'obstacle:bar.updown'],   0,   0,   0,  24,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,  38,   0,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33,   0,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13],
                        [ 13,  13,  45,  13,  13,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,  57,   0,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38, 660, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,  38,   0,   0,   0,   0, 660,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 660, 661, 662,   0, 269, 270, 270, 271,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38, 661, 662,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  33,  33,  33,  33,  33,  33, 662,   0,   0,   0,   0,   0,   0,   0, 237,   0,   0,  13,  13,  45,  13,  45,  13,  45,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13],
                        [ 13,  13,  46,  13,  13,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 269, 270, 270, 271,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0, 269, 270, 271,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38, 693, 694, 695,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,  38,   0,   0,   0,   0, 693,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 693, 694, 695,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,  57,  57,  57,   0,  38,  38,   0,   0,   0,   0,  38,  38, 694, 695,   0,   0,   0,   0,   0,   0,   [0, 'object:turtle.red-left'],   0,   0,   0,   0,  33,  33,  33,  33,  33,  33, 695,   0,   0,   0,   0,   0,   0,   0,  33,   0,   0,  13,  13,  46,  13,  46,  13,  46,  13,  13,  13,  13,  13,  13,  13,  13,  13,  13],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,  38,   0,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0, 269, 270, 270, 271,   0,   0,   0,   0,   0, 269, 270, 270, 270, 271,   0, 269, 270, 270, 270, 271,   0,  38,   0,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0, 269, 270, 271,   0,  38,  38,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                        [ 28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,  38,   0,   0,  38,  38,  38,   0,   0,  38,  38,  38,  38,  38,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,   0,   0,   0,  38,  38,  38,   0,   0,   0,  38,  38,  38,   0,   0,  38,   0,   0,   0,   0,   0,  38,  38,  38,  38,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,  38,  38,  38,  38,   0,   0,   0,  38,   0,   0,  38,  38,   0,   0,   0,   0,  38,  38,   0,   0,   0,   0,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28,  28],
                    ],
                    next: '1-4'
                },
                '1-4': {
                    theme: 'castle',
                    startPos: {x: 2, y: 4},
                    map: [
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0, 167,   0,   0,   0,   0,   0,   0,   0, 167,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0, 159,   0,   0,   0,   0,   0,   0,   0, [159, "object:firestick.right"],   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-hidden",   0,   0, "coin-hidden",   0,   0, "coin-hidden",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 159,   0,   0,   0,   0,   0,   0, 156,   0,   0,   0,   0,   0,   0, 159,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [159, "object:firestick.left"],   0,   0,   0,   0,   0,   0,   0,   0,   0, [159, "object:firestick.left"],   0,   0,   0,   0,   0,   0, [159, "object:firestick.left"],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [  0, "obstacle:bar.short-leftright"],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   [0, 'object:firezone'],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "axe",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0, [159, "object:firestick.left"],   0,   0,   0,   0,   0,   0,   0, [159, "object:firestick.left"],   0,   0,   0,   0,   0,   0,   0, 159,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, "coin-hidden",   0,   0, "coin-hidden",   0,   0, "coin-hidden",   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, [  0, "object:bowser"],   0, 540, 167, 167, 167,   0, [  0, "object:scrollstop"],   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0, 167, [159, "object:firestick.left"], 167,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167,   0,   0,   0, 167, 167, 167, 167, 167, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 796, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0, 167, 167, 167,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167,   0,   0,   0, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 795, 795, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0, 167, 167, 167,   0,   0,   0, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167, 167,   0,   0,   0, 167, 167, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0, 167, 167, 167,   0,   0,   0,   0,   0,   0,   0,   0,   0, [  0, "object:toadhead"],   0,   0,   0,   0,   0,   0,   0],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 828, 828, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 795, 795, 795, 167, 167, 167, 795, 795, 795, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 795, 795, 795, 795, 795, 795, 795, 795, 795, 795, 795, 795, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167],
                        [167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 828, 828, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 828, 828, 828, 167, 167, 167, 828, 828, 828, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 828, 828, 828, 828, 828, 828, 828, 828, 828, 828, 828, 828, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167, 167],
                    ]
                }
            };
            globals.time = null;

            const spriteSheet = new SpriteSheet(resource.image['sprites.png']);

            const marioTypes = [{prefix: '', offY: 1, height: 32}, {prefix: 'small-', offY: 34, height: 16}];
            spriteSheet.addSprite('throwing-mario', 273, 1, 16, 32);
            spriteSheet.addSpriteSeq('throwing-mario-run', 273, 1, 16, 32, 3, 1);
            spriteSheet.addSprite('throwing-mario-slide', 307, 1, 16, 32);
            spriteSheet.addSprite('throwing-mario-jump', 341, 1, 16, 32);
            spriteSheet.addSprite('mid-mario', 256, 1, 16, 32);
            spriteSheet.addTransformedSpritesFromObj(
                'flip-x',
                {
                    'mid-mario-rev': 'mid-mario',
                    'throwing-mario-rev': 'throwing-mario',
                    'throwing-mario-run1-rev': 'throwing-mario-run1',
                    'throwing-mario-run2-rev': 'throwing-mario-run2',
                    'throwing-mario-run3-rev': 'throwing-mario-run3',
                    'throwing-mario-slide-rev': 'throwing-mario-slide',
                    'throwing-mario-jump-rev': 'throwing-mario-jump'
                });
            for (let type of marioTypes) {
                spriteSheet.addSprite(type.prefix + 'mario', 1, type.offY, 16, type.height);
                spriteSheet.addSprite(type.prefix + 'mario-jump', 86, type.offY, 16, type.height);
                if (type.prefix === 'small-') {
                    spriteSheet.addSprite(type.prefix + 'mario-duck', 103, type.offY, 16, type.height);
                } else {
                    spriteSheet.addSprite(type.prefix + 'mario-duck', 103, type.offY + 8, 16, type.height - 8);
                }
                spriteSheet.addSprite(type.prefix + 'mario-slide', 69, type.offY, 16, type.height);
                spriteSheet.addSprite(type.prefix + 'mario-swim1', 154, type.offY, 16, type.height);
                spriteSheet.addTransformedSprite(type.prefix + 'mario-rev', type.prefix + 'mario', 'flip-x');
                spriteSheet.addTransformedSprites('-rev',
                    [type.prefix + 'mario', type.prefix + 'mario-slide', type.prefix + 'mario-jump', type.prefix + 'mario-duck',
                        type.prefix + 'mario-swim1'], 'flip-x');
                spriteSheet.addSpriteSeq(type.prefix + 'mario-run', 18, type.offY, 16, type.height, 3, 1);
                spriteSheet.addSpriteSeq(type.prefix + 'mario-glide', 120, type.offY, 16, type.height, 2, 1);
                spriteSheet.addAnimation(type.prefix + 'mario-glide', [type.prefix + 'mario-glide1', type.prefix + 'mario-glide2'], ANIMATION.END.LOOP)
                spriteSheet.addTransformedSpritesFromObj('flip-x', {
                    [type.prefix + 'mario-run1-rev']: type.prefix + 'mario-run1',
                    [type.prefix + 'mario-run2-rev']: type.prefix + 'mario-run2',
                    [type.prefix + 'mario-run3-rev']: type.prefix + 'mario-run3'
                });
                spriteSheet.addTransformedSprite(type.prefix + 'mario-glide-rev', type.prefix + 'mario-glide2', 'flip-x');
            }
            spriteSheet.build();
            spriteSheet.addTransformedSpritesFromObj(
                'color-replace(#b13425:#f7d6a4;#6a6b04:#b53121)',
                {
                    'fire-mario': 'mario',
                    'fire-throwing-mario': 'throwing-mario',
                    'fire-throwing-mario-rev': 'throwing-mario-rev',
                    'fire-mario-jump': 'mario-jump',
                    'fire-throwing-mario-jump': 'throwing-mario-jump',
                    'fire-throwing-mario-jump-rev': 'throwing-mario-jump-rev',
                    'fire-small-mario-duck': 'small-mario-duck',
                    'fire-mario-duck': 'mario-duck',
                    'fire-mario-slide': 'mario-slide',
                    'fire-throwing-mario-slide': 'throwing-mario-slide',
                    'fire-throwing-mario-slide-rev': 'throwing-mario-slide-rev',
                    'fire-mario-slide-rev': 'mario-slide-rev',
                    'fire-mario-glide1': 'mario-glide1',
                    'fire-mario-glide2': 'mario-glide2',
                    'fire-mario-run1': 'mario-run1',
                    'fire-throwing-mario-run1': 'throwing-mario-run1',
                    'fire-throwing-mario-run1-rev': 'throwing-mario-run1-rev',
                    'fire-mario-run2': 'mario-run2',
                    'fire-throwing-mario-run2': 'throwing-mario-run2',
                    'fire-throwing-mario-run2-rev': 'throwing-mario-run2-rev',
                    'fire-mario-run3': 'mario-run3',
                    'fire-throwing-mario-run3': 'throwing-mario-run3',
                    'fire-throwing-mario-run3-rev': 'throwing-mario-run3-rev',
                    'fire-mario-glide-rev': 'mario-glide-rev'
                });
            spriteSheet.addSprite('mushroom', 0, 51, 16, 16);
            spriteSheet.addSprite('mushroom-1', 0, 51, 16, 16);
            spriteSheet.addSprite('mushroom-2', 0, 51, 16, 16);
            spriteSheet.addSprite('one-up', 16, 51, 16, 16);
            spriteSheet.addSpriteSeq('fireflower', 0, 83, 16, 16, 4, 0);
            spriteSheet.addAnimation('fireflower', ['fireflower1', 'fireflower2', 'fireflower3', 'fireflower4'], ANIMATION.END.LOOP);
            spriteSheet.addSpriteSeq('star', 0, 99, 16, 16, 4);
            spriteSheet.addAnimation('star', ['star1', 'star2', 'star3', 'star4'], ANIMATION.END.LOOP);
            spriteSheet.addSprite('bar', 64, 179, 48, 8);
            spriteSheet.addSprite('bar-short', 64, 179, 32, 8);
            spriteSheet.addSprite('flag', 239, 34, 16, 16);
            spriteSheet.addSprite('flag-up', 256, 34, 16, 16);
            spriteSheet.addSprite('flag-up-fg', 273, 34, 16, 16);
            spriteSheet.addSpriteSeq('plant', 272, 51, 16, 24, 3);
            spriteSheet.addAnimation('plant', ['plant1', 'plant2'], ANIMATION.END.LOOP);
            spriteSheet.addSpriteSeq('evilmush', 80, 59, 16, 16, 2);
            spriteSheet.addAnimation('evilmush', ['evilmush1', 'evilmush2'], ANIMATION.END.LOOP);
            spriteSheet.addSpriteSeq('turtle', 176, 51, 16, 24, 2);
            spriteSheet.addSprite('turtle-shell', 240, 51, 16, 24);
            spriteSheet.addSpriteSeq('turtle-awake', 240, 51, 16, 24, 2);
            spriteSheet.addAnimation('turtle-awake', ['turtle-awake2', 'turtle-awake1', 'turtle-awake1',
                'turtle-awake2', 'turtle-awake1', 'turtle-awake1', 'turtle-awake2', 'turtle-awake1', 'turtle-awake1',
                'turtle-awake2', 'turtle-awake1', 'turtle-awake1', 'turtle-awake2']
            );
            spriteSheet.addTransformedSprite('turtle-shell-rev', 'turtle-shell', 'flip-x');
            spriteSheet.addTransformedSprite('turtle-shell-flipped', 'turtle-shell', 'flip-y');
            spriteSheet.addAnimation('turtle', ['turtle1', 'turtle2'], ANIMATION.END.LOOP);
            spriteSheet.addSpriteSeq('flying-turtle', 208, 51, 16, 24, 2);
            spriteSheet.addAnimation('flying-turtle', ['flying-turtle1', 'flying-turtle2'], ANIMATION.END.LOOP);
            spriteSheet.addTransformedAnimation('turtle-rev', 'turtle', 'flip-x');
            spriteSheet.addTransformedSprite('evilmush-flip', 'evilmush1', 'flip-y');
            spriteSheet.addSprite('evilmush-dead', 112, 59, 16, 16);
            spriteSheet.addSprite('toadhead', 112, 107, 16, 24);
            spriteSheet.addSprite('mini-block1', 64, 51, 8, 8);
            spriteSheet.addSprite('mini-block2', 72, 51, 8, 8);
            spriteSheet.addSprite('bump-block1', 64, 131, 16, 16);
            spriteSheet.addSprite('bump-block2', 80, 131, 16, 16);
            spriteSheet.addSprite('bump-box', 96, 131, 16, 16);
            spriteSheet.addSprite('fireball1', 290, 34, 8, 8);
            spriteSheet.addSprite('fireball2', 298, 34, 8, 8);
            spriteSheet.addSprite('fireball3', 290, 42, 8, 8);
            spriteSheet.addSprite('fireball4', 298, 42, 8, 8);
            spriteSheet.addSprite('firebreath0_1', 88, 115, 8, 8);
            spriteSheet.addSprite('firebreath0_2', 88, 123, 8, 8);
            spriteSheet.addSprite('firebreath1', 96, 115, 16, 8);
            spriteSheet.addSprite('firebreath2', 96, 123, 16, 8);
            spriteSheet.addAnimation('firebreath', ['firebreath1', 'firebreath2'], ANIMATION.END.LOOP);
            spriteSheet.addAnimation('firebreath0', ['firebreath0_1', 'firebreath0_2'], ANIMATION.END.LOOP);
            spriteSheet.addSprite('bowser1', 144, 75, 32, 32);
            spriteSheet.addSprite('bowser2', 176, 75, 32, 32);
            spriteSheet.addSprite('bowser-fire1', 80, 75, 32, 32);
            spriteSheet.addSprite('bowser-fire2', 112, 75, 32, 32);
            spriteSheet.addAnimation('bowser', ['bowser1', 'bowser2'], ANIMATION.END.LOOP);
            spriteSheet.addAnimation('bowser-fire', ['bowser-fire1', 'bowser-fire2'], ANIMATION.END.LOOP);
            spriteSheet.addSpriteSeq('explode', 307, 34, 16, 16, 3, 1);
            spriteSheet.addAnimation('explode', ['explode1', 'explode2', 'explode3']);
            spriteSheet.addAnimation('fireball', ['fireball1', 'fireball2', 'fireball3', 'fireball4'], ANIMATION.END.LOOP, ANIMATION.DIR.FORWARD, false, 0.25);
            spriteSheet.addSprite('1up', 32, 219, 16, 7);
            spriteSheet.addSprite('num_0', 0, 219, 4, 8);
            spriteSheet.addSpriteSeq('num_', 4, 219, 4, 8, 5, 0);
            spriteSheet.addSpriteSeq('minicoin', 0, 211, 8, 8, 3, 0);
            spriteSheet.addAnimation('minicoin',
                [{id: 'minicoin1', duration: 40, padding: {x: 0, y: 0}}, {id: 'minicoin2', duration: 10, padding: {x: 0, y: 0}},
                    {id: 'minicoin3', duration: 10, padding: {x: 0, y: 0}}],
                ANIMATION.END.LOOP,
                ANIMATION.DIR.FORWARD_BACKWARD
            );
            spriteSheet.addSpriteSeq('coin-up', 0, 163, 16, 16, 4);
            spriteSheet.addAnimation('coin-up', ['coin-up1', 'coin-up2', 'coin-up3', 'coin-up4'], ANIMATION.END.LOOP);
            spriteSheet.build();

            spriteSheet.addAnimation(
                'fire-mario-run',
                ['fire-mario-run1', 'fire-mario-run2', 'fire-mario-run3'],
                ANIMATION.END.LOOP
            );
            spriteSheet.addAnimation(
                'fire-mario-glide',
                ['fire-mario-glide1', 'fire-mario-glide2'],
                ANIMATION.END.LOOP
            );
            spriteSheet.addTransformedSprites('-rev',
                ['fire-mario', 'fire-mario-jump', 'fire-mario-duck', 'fire-mario-run1', 'fire-mario-run2', 'fire-mario-run3'], 'flip-x');
            spriteSheet.addTransformedAnimation('fire-mario-run-rev', 'fire-mario-run', 'flip-x');
            spriteSheet.build();

            // theme-conversion for enemies
            spriteSheet.addTransformedSprites('-1', ['mini-block1', 'mini-block2', 'bump-block1', 'bump-block2', 'bump-box', 'evilmush-dead', 'evilmush-flip'], 'color-replace(#994b0c:#007c8d;#9c4a00:#007c8d;#000000:#00404d;#ffc8b8:#b5ebf2)');
            spriteSheet.addTransformedSprites('-2', ['mini-block1', 'mini-block2', 'bump-block1', 'bump-block2', 'bump-box'], 'color-replace(#ffffff:#ffffff)');
            spriteSheet.addTransformedAnimation('evilmush-1', 'evilmush', 'color-replace(#994b0c:#007c8d;#000000:#00404d;#ffc8b8:#b5ebf2)');
            spriteSheet.addTransformedSprites('-1', ['turtle-shell', 'turtle-shell-rev', 'turtle-shell-flipped'], 'color-replace(#ffffff:#feccc5;#1e8400:#007c8d;#d78d22:#994e00)');
            spriteSheet.addTransformedSprites('-1', ['one-up'], 'color-replace(#fcfcfc:#feccc5;#e69c21:#994e00;#109400:#007c8d)');
            spriteSheet.addTransformedAnimation('turtle-1', 'turtle', 'color-replace(#ffffff:#feccc5;#1e8400:#007c8d;#d78d22:#994e00)');
            spriteSheet.addTransformedAnimation('turtle-awake-1', 'turtle-awake', 'color-replace(#ffffff:#feccc5;#1e8400:#007c8d;#d78d22:#994e00)');
            spriteSheet.addTransformedAnimation('flying-turtle-1', 'flying-turtle', 'color-replace(#ffffff:#feccc5;#1e8400:#007c8d;#d78d22:#994e00)');
            spriteSheet.addTransformedAnimation('turtle-rev-1', 'turtle-rev', 'color-replace(#ffffff:#feccc5;#1e8400:#007c8d;#d78d22:#994e00)');
            spriteSheet.addTransformedAnimation('turtle-red', 'turtle', 'color-replace(#ffffff:#fffeff;#1e8400:#b53120;#d78d22:#ea9e22)');
            spriteSheet.addTransformedAnimation('flying-turtle-red', 'flying-turtle', 'color-replace(#ffffff:#fffeff;#1e8400:#b53120;#d78d22:#ea9e22)');
            spriteSheet.addTransformedAnimation('turtle-awake-red', 'turtle-awake', 'color-replace(#ffffff:#fffeff;#1e8400:#b53120;#d78d22:#ea9e22)');
            spriteSheet.addTransformedAnimation('turtle-rev-red', 'turtle-rev', 'color-replace(#ffffff:#fffeff;#1e8400:#b53120;#d78d22:#ea9e22)');
            spriteSheet.addTransformedSprites('-red', ['turtle-shell', 'turtle-shell-rev', 'turtle-shell-flipped'], 'color-replace(#ffffff:#fffeff;#1e8400:#b53120;#d78d22:#ea9e22)');
            spriteSheet.addTransformedAnimation('plant-1', 'plant', 'color-replace(#1e8400:#007c8d;#d78d22:#994e00;#ffffff:#feccc5)');
            spriteSheet.addTransformedAnimation('fireflower-1', 'fireflower', 'color-replace(#fcfcfc:#feccc5;#000000:#00404d;#109400:#007c8d;#9c4a00:#007c8d;#e69c21:#994e00)' )
            spriteSheet.addTransformedAnimation('fireflower-2', 'fireflower', 'color-replace(#ffffff:#ffffff)' );
            spriteSheet.build();

            globals.spriteSheet = spriteSheet;
            this.gotoScreen(
                'mario', {world: '1-1', marioLevel: 0, worldPos: {x: 2, y: 0}}
//                'demo'
            );
        }
    });
    this.addScreen(bootstrap);

    // ##############################
    //   D e m o - S c r e e n
    // ##############################

    const demoScreen = new Screen('demo');

    demoScreen.setInitHandler(function () {
        this.addImageResource('font.png',
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASgAAAAICAYAAABK3GKbAAADhElEQVRoQ+1Z0XXCQAxLN2AURmAERmGEjMAojMAIjMIG9Dmv6lNc3clHSvvR9oeA47Mt27KTvt3v98c0TdP1ep0Oh0NcLtfH4/Etrp0c94RO/MUZI/rqfPbByePey+XygO/Kf/aH/c0xMg5KZwnwA5/4DH32j8+DvpLjHOVL/s2dz/dvzd8r9Rk7tpPrRcXfy1/g82o551xhxPlU1/Cxp1upE8YQtVbpP4eP8jn3cI8fuPeVjy7+LI8zdrvdwj+fJMQNBYOq4UAI3KAZgCAMyFsF15Ln81UT8/lbC9SRRU7ed9rLxQXCa+GvMFf+9PDfmr9RffaPr8PH2+02nU6n1UD7CYKC7XmelwHjGlg1KxNEj6Dy+fjO9Q995Qvw4KZtYarOGY1vNL+MJew7fF3/svwLQVUJIoqrleDsdAbJNVCFFFxSe/JeIeRirfjCE+B8Pi+4VImPdUFM0M0DAtsGbx3PEpTLnxsgPf1Ww7pmqTbYSIGrhuMc5VrE/YiPY1H39shJDddnCKpaS0wQaphV5aP2MkaMXas+q/W3NBJPs/gejcJGlBzNoxg0Jy3f0/qupmn2T21rChD8Blv7/X71CNsqQPV7LwHsX9hQk7WHEcviOvR7eCHhOT4mxZZ++Bd/KrdV/SDHTMLzPD8yvlUc3ATeKs9NqfLL/ufaV1uBI6VWvUTu4tGlVQ+ul1qDNRNKJuCIuVX/rj9acpXf8E8NaIevqh/kaUVQKNIqocT9CtTs6Mh5KvnVBlfF5ArckU+egr3zQAA5eVv8VxM9k1puOoe3i9npu0YaaUCXnxF5iwAcXo6EXLw9wuIGd0O9Z6fV/Mq2u9fF4/D6zvy6fn8JQY1sAK4BlXykwVyBu7OyfXeek48QXmVgVOxVCZIndEy1in3VDM8UMLbPvCEGXpiweEenNgRs38gnP0Lkqf6Mf7xhVjaZTHq8XY/YR71wDPkdVDU+RcQuf5X66hG803fyz5eErbUfAYQTKII8sXsrHBec0m/JPwpz5V/rEapn3wGAAohPrPdqEwob4X8uBtVQbJPlWLP5MaLin9to4BtiiM/8/gprvlrNMwGol8Ksj5pAPtwKz6Ss/KjoBwbq8dLh5+RoLpVHJgfOXfzuXgXw4HPx8XspfhzDf7J4C8P7R7bvzs9bSsbE6Tu520Cdfk++epnbW1X/ZX8HAfcI8HeQ+I/0txF4B1/LAa5iP5tGAAAAAElFTkSuQmCC"
        );
        this.addJsonResource('fonts/TurricanFontMap', {
            width: 8,
            height: 8,
            image: 'font.png',
            chars: [
                ['AZ', 0, 0],
                ['09', 216, 0]
            ]
        });
        return function (resource) {
            this.audio.resetChannels();
            const turricanFont = new FontMap('fonts/TurricanFontMap');

            demoScreen.addPane(new LinearGradientPane('Y', ['#000000', 124, '#000000', 100, '#000060']));
            const canvasPane = new CanvasPane();

            const demoTextPane = new TextPane({id: 'demoTextPane', fonts: [turricanFont]});
            demoTextPane.addTextBlocks([{
                id: 'screentext',
                autoCenteringX: true,
                y: 25,
                textAlign: 'center',
                text:
                    'REMAKE ENGINE\n' +
                    'SHOWCASES',
                lineSpacing: 4
            }, {
                id: 'games',
                x: 30,
                y: 66,
                text: '  GAME 1     GAME 2    GAME 3',
                lineSpacing: 4
            }, {
                id: 'start',
                x: 83,
                y: 192,
                text: 'ESC=BACK RETURN=START'
            }, {
                id: 'controls',
                x: 100,
                y: 138,
                text:
                    '  W\n' +
                    'A   D      J   K\n' +
                    '  S',
                lineSpacing: 10
            }]);

            demoScreen.addPane(canvasPane);
            demoScreen.addPane(demoTextPane);

            const demos = [
                {
                    name: 'SUPER MARIO BROS',
                    system: 'NINTENDO ENTERTAINMENT SYSTEM',
                    cursorX: 44,
                    goto: 'world',
                    params: {
                        lifes: 3, score: 0, coins: 0, world: '1-1', worldPos: null, marioLevel: 0
                    }
                },
                {
                    name: 'SHADOW OF THE BEAST',
                    system: 'AMIGA 500',
                    cursorX: 132,
                    goto: 'shadow-ingame'
                },
                {
                    name: 'THUNDERFORCE IV',
                    system: 'SEGA MEGA DRIVE',
                    cursorX: 212,
                    goto: 'tf4'
                }
            ];
            let activeDemo = 0;

            let frames = 0;
            let startX = 79;
            let startY = 134;
            let width = 177;
            let height = 53;
            let cursor = 0;

            const inputController = new InputController();
            inputController.addInput('next', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('next','d');
            inputController.assignButtonToInput('next', 15);
            inputController.assignTouchToInput('next', 'right');
            inputController.addInput('prev', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('prev','a');
            inputController.assignButtonToInput('prev', 14);
            inputController.assignTouchToInput('prev', 'left');
            inputController.addInput('start');
            inputController.assignKeyToInput('start', 'Enter');
            inputController.assignButtonToInput('start', 9);
            inputController.addInput('start1');
            inputController.assignKeyToInput('start1', 'j');
            inputController.assignButtonToInput('start1', 0);
            inputController.assignTouchToInput('start1', '1');
            inputController.addInput('start2');
            inputController.assignKeyToInput('start2', 'k');
            inputController.assignButtonToInput('start2', 2);
            inputController.assignTouchToInput('start2', '2');

            const drawBox = () => {
                const ctx = canvasPane.getCtx();
                ctx.strokeStyle = '#666666';
                ctx.strokeRect(startX, startY, width, height);
                ctx.strokeRect(startX, startY + height, width, 17);
            };

            const setDemo = function() {
                demoTextPane.removeTextBlock('selected');
                demoTextPane.removeTextBlock('system');
                demoTextPane.addTextBlock({
                    id: 'selected',
                    x: 30,
                    y: 94,
                    text: demos[activeDemo].name,
                    lineSpacing: 4
                });
                demoTextPane.setTextBlockFilters('selected', 'monochrome(#FFFFFF)')
                demoTextPane.addTextBlock({
                    id: 'system',
                    x: 30,
                    y: 106,
                    text: demos[activeDemo].system,
                    lineSpacing: 4
                });
            };

            const minCol = 60;
            const cursorPath = new AxisPath(minCol)
                .addTarget(255, 60, PATH.TYPE.DAMPED)
                .addTarget(minCol, 60, PATH.TYPE.ACCELERATED)
                .round()
                .getPoints();

            setDemo();

            demoScreen.setFrameHandler(() => {
                if (frames === 0) {
                    const ctx = canvasPane.getCtx();
                    ctx.fillStyle = 'rgba(0,0,0,210)';
                    ctx.fillRect(startX, startY, width, height + 16);

                    ctx.strokeStyle = '#666666';
                    ctx.fillStyle = '#666666';
                    drawBox();

                    ctx.beginPath();
                    ctx.arc(120, startY + 26, 25, 0, Math.PI * 2, true);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(192, startY + 26, 12, 0, Math.PI * 2, true);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(223, startY + 26, 12, 0, Math.PI * 2, true);
                    ctx.stroke();

                    ctx.fillStyle = '#555555';
                    ctx.fillRect(110, startY + 24, 19, 2);
                    ctx.fillRect(119, startY + 15, 2, 21);
                    ctx.fillRect( 150, startY + height, 2, 16);
                }

                inputController.awaitInput('next');
                inputController.awaitInput('prev');
                inputController.update();

                if (inputController.hasInput('start') || inputController.hasInput('start1') || inputController.hasInput('start2')) {
                    const params = demos[activeDemo].params;
                    this.gotoScreen(demos[activeDemo].goto, params === undefined ? {} : params);
                }

                let demoChange = 0;
                if (inputController.hasInput('next')) {
                    demoChange++;
                }
                if (inputController.hasInput('prev')) {
                    demoChange--;
                }
                if (demoChange !== 0) {
                    activeDemo += demoChange;
                    if (activeDemo < 0) {
                        activeDemo = demos.length - 1;
                    } else if (activeDemo >= demos.length) {
                        activeDemo = 0;
                    }
                    setDemo();
                }

                const ctx = canvasPane.getCtx();
                ctx.clearRect(0, 77, 320, 4);

                if (cursor === cursorPath.length) {
                    cursor = 0;
                }
                let currCol = cursorPath[cursor];
                cursor++;
                ctx.fillStyle = 'rgb(' + currCol + ', 0, 0)' ;
                ctx.fillRect(demos[activeDemo].cursorX, 77, 50, 4);
            });
        }
    });
    this.addScreen(demoScreen);


    // ##############################
    //   Thunder Force 4
    // ##############################

    const tfScreen = new Screen('tf4');

    tfScreen.setInitHandler(function() {
        this.addAudioResource('metal.mp3', 'http://localhost:8080/audio/tf4-metalsquad.mp3');
        this.addImageResources({
            'tfShip.png': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAPCAYAAACFgM0XAAABz0lEQVRIS8WUQW7CMBBFv29Rdri3KGoXcW/RqEjFHIOyCDlG3Uqt4BjJgooeI+zCLVz9CU4dikCoiM4CG5x43vz5g1ota39zewWllMI/hKoBP8nmsIkBQRiXhJGqc8BbbjKNCfKLwrSyE4IMMYjpGxTrQoAYQaFzqtTpOyFcYjHP8jbZ1+cGriwEIAY5V5uUzebeTVMB4f7l+QHj2QLu1cGOrKxaa1RV1UCMrIAM7nrinx7wJ/MqTgErjE14aBiUvhcgk5izeEV57z1lHjym7cUBgB5gaN3tfzi/NuMOiNIL+d60C3Bls+7ewXwUNB32lLSgKItG4nWB+XvzQjr80UEn9lfFsUobpRBGmb/zKpp3X7CoUNDiYwOlE+tD8u1ItpOAJwBvAKYVHIBJ45OO9JvZded8b9atkuEstLCqDBT6xrNyRs2PTEMSx0EIxrQxImHMsoYuB/uSn2RKPsz5l5VSU42aQATZVr5bFZVAVBUrkj73c2jNdlLmpqjwXxL8ZIY9xJMjtJyEdDpBVToECKqS72SWxIeCUITfkTx+JV8XbGWrUrvhNHDEeIG0AiBpJwJQfMExpmPnnX7RkKvSBcOJP4K8vKgq3Un9PZac599AQ8vGnDaSnQAAAABJRU5ErkJggg==",
            'tfTopBar.png': "data:image/png;base64,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",
            'tfFgMountains.png': "data:image/png;base64,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",
            'tfSprites.png': "data:image/png;base64,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",
            'tfBgA.png': [
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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"
            ],
            'tfBgB.png': [
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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"
            ],
            'tfWaterData.png': [
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABWUlEQVRYR+1Yyw3DIAx1NgmzdJR2i147Rm6do7fuAcdskcoEU4PMJ1IkEG1OCPLMs3l5cTI9nuumFYDSYC87njXcQMHd7PM0dwGAxSh7H93vMQJ+AQ3aqCC2xRbi4zrupUCBj8ExbpyLn8PX8u81/1r+o9af9POr5986/9b7n6H/6fpeN0zEGpQzHG9uzmA0aHihKRoFt/k75qZIeGuEzhzJ5MiEMA5eufjEhbA8ljTHTZLzTOFL/ANz7zD/Ev/R68/1IemLdDrq+bfOv/X+Z+l/wo5v7/X2zo67KXV69DB5o3PdHeFyeFoLDC3qDuP4KUeX+Enxa/E1/JF3r/nX8B+5/qQH8YXINEpfNLF+aurX8/m3zr/1/jXnl9K/7fj8omBokljiT+McnpPjuJRZlubjZFPxcyI/wr/H/I/wH7H+KQ1IdeG/ZLi2+K+dv/7DhifWTNxIjFD/D5ZnUork796EAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABT0lEQVRYR+2XwQ2DMAxFzSZktrJFr+0W3DoIl+4RDj2wBZWTGn5dEoLUylKBE8LY37HDi6kut2H0jsLlak8NOWrJk+8dOR+fl9hTvto/FTc8z+izLcRK5LXmz77Xmj7WtmV9lvpr/fl1/a31995/6/X/W/+r4TGMvCiGHXUuQA6Bh7CIGJwhKSAIRfEzIPEdBinGFxvqIHxy8VF/yV9yKMkfGyn5MTwt9a3rv6V++CEe/Y97f0v9jv03c8bi+69O9wg+vgRyDKtz/5nY0qkjSQdbF8GBmwBhpScufq+pPbW9m7QFpgIvjK+nUe0vAEvmDxNsCtSW+tb1X63fwtR99H/ev6v1O/bf2x+X5fdf8a+uhpWGzjQFvRqHhMbpSiCGEwDa9YmYmv5S8Uv8c5NkSX6Yk6wjVx+06Xt9kpXo5/Jf6su362+tb13/vevvpf9PsT6eagjUv9MAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABTUlEQVRYR+1XQQ6CMBAsP6FPka/oL7wZ/YU3/4EX/1GO/AKzkgnDpGAMsSUBL9R2YXd2t9NpcXy1naOfD84F79ytdO7cDAunMrh74z8TsMHYnnXobSs/Htu31J5tbf3f/hHnVIy2jjg4VmDW+GGrOYnhsnf1+zv+oVe2UH/sga323xr3f3F9tJ0WBORlTyYEEJzNM9mB8LDBmTSx8XWN51P4Bw7EBv/wzRhsDhjtvVAPG1VzgKYGefOhwRh3/OMDdWv133r/ra3/C1N8MQWnhWJ1p2SoZMAkoGpOiSamCFkhxUh0iX+OhwlOVdkv/1VRgkRjambHP1QAB2vK/std/9z+c/dfbv/If1Fd2k4VHF9XYahXWCY7BgN7/+xH4cCljo9T+J+LhxUuK1meZ5KMXVm+o5y22PH3uZnL69L+y13/3P7n+jNF/+X2r/l/A11zuvjSJqLhAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABk0lEQVRYR+1XwXGEMAxcOsGlQDrJXBf5ZS5d3OSTOnL3TBnikUe6uIywhYUQPJI7k5mYD9gYS1pJy7o5fn5caQgIhPGigOl5nOgI9j2dgT7E9Xyd07cyx2N+tvOLvVf2F19+an/NL+0rP+sY2LdDSzgNMbAZHi0BFxWwwUnHKbF7uJSyL7FV/GMleLV6z/zvjX/tP5+XdP81x7evqyUKWxTee5kbi6pLzJfIgUnkpQWehkwgnIxwAahbFuOt7U+MrPwSEpDYhIT5LpeQnSWMvCKTucQiTeXFrHEpaZ/9rfjP6/I/4V/7L3XsRv+PxLdQLI9R4Xh/Dr3WKjiXMDrCAQEEwruoJnZoY//+l/ZnpJwG4qsQME8zCWtlymTmzcuaieRTHA8dISDghLki9HAoaV8TNZNvxT+fZErkf2/8tcKt+U89nU6ykv+mf46KTysYes0EMKmhpNb0cVYrwzVFZ/+0tvC8/W9h3yqyteO4JqSteAQjjxjtdxZPHpe2b/MkPlb8Y8XJT/1e+d8b/73t//X++wZLAQOEEeLj0wAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABbElEQVRYR+2XzXGEMAyFRSe4FChlky5yyyRd5JY+klLMkS7IyN6HH4qW/ckEDoaTVzaS/Iy+lZunbpxiJ9IHkRhEQhT5ipIetWGcLcXOa8N3tsNPGodsU38YP7dRPoY8cSmOxsSjsdU3/HJee8ZnHWyOOmc1Yx1DX/ZudbtV/9rj22916+9vb/2P/S9Z9cj5N/3rOFnAAT6pENsocQgzwBhYa3DEHECw8EkwfG9FXoYMA16r8LAHDB8Mlktw/s/4DGYvRwAsreuKfh4UPQ2v6V97/NrP/9h/aY4erf/m7XOc0LWga0OXVdz/HnmUhZ9wyuu56+Pf8AbY2ULmLsoCbH7X6TK3jO/lxbpZSOOA1nS7R//a4+/9/e2t/7H/M2POt1U0FarLLfxJ4ONOxBYoF+MMndPyOmzf587N8602PjiLVcxZEMCuG+Nr79bxka9ewQE7L2erna5Hwazlz39Env61x6/9/I/9/73+fwAawP74Iw/sMQAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABbElEQVRYR+2YwW3DMAxFvzeJRrFGabpFbgEyRrtJ7VGYY7ZIQEq0f1TD6aUQUFaXyDZJiRT1RGXI59s9J1ibpPymDCSh5xn4qN+OVVZGIM1F3vv8bnmfAZkAHUPSandPV+34nGyAUSDXZHMyu2qr2vQ5u7yP4TIqz/5pn3W0H9H/6PH3vIi6/r397z3+cBxv9xZeBr8KtYKaAjdvvGkYUA4U1ldgMixXK2uvtaH2v8GvijOcLwfgdC0w1abfXJfnugVp9jmi/7yeEePvebJ1APzn/+/v/97xH7TiY1hwIjCVGYQGklrJLYDJFZDTM3y2IMmAUjsGnonAqhXnQYA5Gcz2qjTTGgXvSBAIvuZSksrnM7BbIDKAI/q/JF7Q+Edf/97+9x7fKj4//XUzcIXmk/Pqy6+Pr65JfmK+uh7zybp3XW6rNwdhe0VtQe2+tP5x0LUajeh/fitR+MnfFX8x/pybEdff17RX/veO/wPL/Sa+vGksmAAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABaElEQVRYR+2XTXLCMAyFlZvUR8H36AZu0p6DbLhHOIq23IKOrDz6KpzOtMMgmJCNfyRLlpx8Vobd5nTeq7RnV7zVjUg5emsP+tZCXmfdSfu6JjcZ1ke7i/Y/RXTydWzDZ3zOHvYb9XifbIfjsJgR7y3jj/He2z9izMp/tv/s/K/d/7Oc/1A/TucLEKpDB+AAbNAaCHsf1A89AhfslIPKNJYrgPbsM9y0iJQ3FTk67dpYHXq2jzhuOqMDu25V9H1eB4DX7/Vd8N4i/vniSPOfnX87l/niep3/6/1rF8EDfv+DVXxLAMKLyxUR+nGNVU8s42qKZbGPSjDelAxYrvKgh2o0yqbRdwY/saqDLO6fx1zp2vx/4+9Vlff0j71n5T/bf3b+1+7/kc+/gW/ptw/zXOkxDAEVJjqvYZj1qkazBX3ApW5dk39Xe30AM/6G/wbxHrSXAMnzf4k/2392/rP9Z+d/7f6f5fy/AKnKEvo4KHnzAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABZ0lEQVRYR+1XwW3DMAw8bxKOEo/RZzNHX0XHqD/ZQx2FfWaLFLRA+0JIAQoYkQ1bgCFKkcTwKB3JDqfbHQAuAnyrSbn52Hpv/rvPxTE+AU2A/OQdes69j01mHfPJ29f/zC62kzFzfHoB1L6UV9rYWtIsW28Yrhn/w3728uM7eoX/947/iPE/+Ke7nDPxfV2Bt+GRpNhhTGImT2QWlEX382M1uUaaW9AvPYCPmdQNg0juJXJym31tDAYxSDC+Lq8B/8P+tv7fO/7+bpbgn84yPs7unJzkqtBfmR56OZ7l2ZjFGCHY/jTISJDynjMaOeUzRQEd5r1b0M+kXcOC10SbORN2ovNsjokwEpzr4qz5WXDxS7E0/of9c9Bu4f80tNXf+v4tzT9TxscE5kpi+WvzpdKX/xTv4bV+frVMLpTBa9Rfw6BmFxPGSEo9RuL38jWWQXYOk18sYVrjf9hffgOv8v/e8V/q/v8Bm7i1Ts/mwtMAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABRUlEQVRYR+2Y0RGCMAyGwyYwCowCboJjKKPAKPWRLfDS9pdQW4Q7Du5s+yKGNqkh/fhjRvk4NQXp8VRE+rolUr2xFYOx8+B7uDaW9SH9rs2s6jmOuwbfVWnm8Cf2BRt8790b5qf4cef/6vq/On6M9Z815TgBeBIcWyD39cBoBhPDqKoV0VBQb8HJ4AJgAVINsZr0HC/YKgNhrHUByvCrGNalor6zBLfAXsDcgt0H4Hub4secf99L/cz6T+fv/POnwSdh8FF9QgG6tuL1IJXfgiIOQJRKzIWkVG7Sf8ipnO+Dp/sbQn6w95CyTPH9Gfjn/Mt6vaL+0/mzneZKW3h0/WVodfe2ibxHrbZqo7Sg1mRr/KsVDt3H29YHJxQmlB4rlb5beuJ1sjWWe5TQTPH9GYgt/1vUncyU/PvliPq/Or5bBTE8/zc4+Ws/SVrV+AAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABUElEQVRYR+WXzZHCMAyFlU6iUmgFaGNPtAFc6CMpRRy3i91RPGKEkEgOwJshXCD+yfMT9mepo/73j5LPjlvjSe47Y7s++zF8PU4TpN/fJmZt2qntfpxXepX+9J4DkQxEPDYF2bRve858xpAsXU86D6hvcY7/yVrij/aP1kfvf7T/Sr/bbRr4DF7VAY8v0HEeIDp/DopLAPtq/Uwz+q3WbpBUQOqYCuA6LvNeaX9SP15cc0D/tvij/aP10fsf7b/S76qML2ZfEYxLsqQIBLt96Ocxk3wGCZ9V2sFcqm9rUEgrwPgiNJy5/d4SCRNxLyRXJhYiObeVGAw9FDNgPVu39dklgdD3IFtj/NH+0fro/Y/2X+lP4LOSMx6MWMb6Q16VtFa6+v658vfd+vbnZ/D2kMsy32F8LN2zSyHGLpbxFbw/ob/2+KP9o/XR+x/tP9P/B/kgeMO50J7NAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABSUlEQVRYR+1XSxaCMAwcbiJHgavIMXSFx1CPgkfBpbfQF+o8Y/gVeJiFdFMpSSadTkJNsHs89ymAEsARuNRA84zwWwafW2vKJ1jG+dLuK/5EfItnc2Psvvzp3zdbDqyd5ezX+/fG9+Z/wx+uzbX1783/Uv0n0vh0UUtAkpbez6h3BfRMW70ua2IjQ9aXjFh8jWFzjMmhr7nXWYicS/PPalTX91dA9ngL7yw/Hvv/d/6pN2rOanVMg0vPf8MP9e7FP2uOtT61/zSNj6LputlZAVmAvptRVyJaLF2kTcHX/l0it8KkDdfzrACbnDQ0e9PVuehmZ7G89s8D98L35n9M6Guf/4Y/fNFZm3/qb67+Wze+sS/lnPenEjgcP55stHNixfpYDJtDbBxNsDRKaZIyV9f4CB7719l54Hvzv+GHf2scv9a/N/9j+n8BYiEHeQ4gKiYAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABSElEQVRYR+1X2w3CMAx0NiGjdBXKGPBFxwBWYZTw2S2K0tb0sJz0gdQgJfw0NWmc3Fnni6FD2xER2dfNP8gdTv3T/2pLdHfT2I/4/TNpHOD3/B3G/NivrcVK/u34e6wlL0txl/OQU64D5k3jlGskZX7ec671l5r/1PhvPb+pq7bTxM0v6KrhWPY5CJ4mjlpMiiKCg8IaE9eSfzn+3FCwsTDmEm8WsljjCvGHceadm6VsbHvmlw07t/pLzX9q/Lec37DjixU7qyp2dnSDMcdmj0Tnyyig4Co1pQ7toeSfkMEmJd23hinGZJNqrkTu8e3icc7c/5KvlPlDN5Zc6i/kvvfiPzX+a89vLDX9VVdebTQLqwkTdv7QVUmLo1iW/L/jL/mTjkzyKR1Z6NqL68aaY+r8cm+hfaMD1jCSjnjuRvMv9Z87/mvP/wYPB+l5ZmB6JQAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABO0lEQVRYR+2XQRKCMAxFw03oVbiKHkNXcgzdegw8Ci69BU4Lkc83rW6AGQobBhr6JyF5fAonddeWR8Hj4MarWztZEmvN32se12kgXXkN9+xjUE/vJR/+c7GVJkQ6qaJPWNo55L/Xf93+y73+OpBrzR/rFyJV50HBw8/kQEDpS8Szxvu4yUsGGHkwKZQQUqodnh1iMDbAkqBmaQfokT4mrPsjHD96BP+t5a813OvffxSX7r/c6y/lvZ9NnmOd95nnj/ULKV8du66UI4sB0kxqcHkMKYaob4r6InI6j7hBd4gwi0IVHaUBW4Qr0z+H/NFp7/Uf/060L+buv9zrj8Zojflj/QA+dEoawI3w62/TimdgWXtYDs2Ca2ovr+0PBafGWq4tCW746mwx/73+3xVYsv9yr39sLpfiD+q/AeGqyhYvs8dOAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABaElEQVRYR+1Y0RGCMAwNm8gq7OEXjqFfMoZ8uQeOgpvopW3qI6TocSeI0B+llrwkTV4Ss5yqB4XVUkM5FdTuDpTfL+6TF39/t/Bd66zIG5I1Fl/0RFyHF+zhfbRJdEjZyftlTlS33nb0Q3xHydY2b/jr8b+LL8idqeN/bvwl5l9GVDjiE8LT5CGkIQSYIsMOOUgQUOOJk4oolgNElsOEM9qBSFBD+B0ZKgCRuLSMqEcgdusCkfgt/Sx70Jcb/qtw/Kv/e/c9cfz3cnRi/CXmX8YdnyYzNESqCZIV7iGpxc4xdIopsnrX2Y3BR1LSXWV5PdDx5LVDMuWujhd3dimC4zPNzXe8Pb2gI97w/XSAfpTnNfg/Gh+mC/SFlV9Dk9WY+J8bf2nx7zo+IS8JUGvM1WNjhyiMzk4TxSeX+U38ocDA36xz1rhbnYnqvU2IsQCk/KIKw4Zve0D/xYCFdGn+nzv+58b/tfx7AmRyP4hqvJ9pAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABXUlEQVRYR+1X3RGCMAwOm8AqriJj6JOM4Rt3jMEq+OgWeOk1McQU0OsRD+UFaHv98vslKaC8jwAA1e2Kr/AMZc3/+L12H882F4DT+XnfAD3fW8GB7+fFiK1xSAZvfCmn9U36kW7yjJT9U/288X/d/t76e+PvNf6KCppRJq+VyKn9ybokS+jBIgJNCki2eAeenZPBC5/klYQdZI7FgPfjmiweXEQy6ScL0lb4UodQ/Gb8NCmWmfzvbX9v/TnuYvPwt3+aJ96NvwI7vlTCNm036d4mxGUEd6qroaSlzlEmLhGJJEHCOba1K77sOslGc2QvySEEaSwG/FY2W9IPyi503tqpjKOKTW58b/97299b/6X40M1F7vzbs/1DxxeISYykutKm9q02WFepl2RUo6+F+034euQm2XCkxwfHeovQec2w61r9NHlKe2+Fr7sey+dyLbf/ve3vrb83/l7t/wCnCRElsNWDRwAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT4AAAAECAYAAAAXrlNPAAABM0lEQVRYR+1XuxGDMAwVm8AqjJG7VGGMpApjkCp7sAqU2YKcPyJCyIHzgdWYBhtzetKz/SQVAPUE/qmgtqMBeqBj8w3nuM6/oY2hbOywGjtni8+hd+sESxN/9tvHbPw1vnO/8T/+Pio+zknmf3mOzuJfe/8zvmMANSfV/Sug/ExUpHAsipYXBb5mnJaEcEtA0Y4qPhE8erkk4f4nhkEOGGd7+c38rxPnKfyPF5uE0fachIXEnfHDySj6/CvxX1TQTug0r7ykLEvFLJSFV1URqSBDNhei46vBFPixFVuoQouJL/NPOoSdHcFR/Gvvf8ZnHWKi/bfCt6clxXKUC5TZuPYJ8Lp2v3KVOC9dakk8tw7A2fi3dwP3h7uAki9z6xlo3WnSiIlPO35tfG3+M77u+U/N/xcvIKFQewOYCAAAAABJRU5ErkJggg==",

                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA7UlEQVRIS91UyQ2EMAwcenExWwwPSsmDUvZBMSllJVZO4jBYCQqvXZEPseUM42smyGeXuEJPlDl99bBvFmCN2a93BABL9iW7HIvxcdt2jW//OpCAiC3zwIvdl/ce/xZ+C+ip+U+CsGtyWghfWLW1yJw8F4eb7wfDbHt7he8LXvmUoeMmVU6O2wj/FFNyTUNdBgnyfnT+tcncJN7qU4FtGGTubnDdYhzb79Whhc/N4w3mhrcUJwRgWc7q08Pv4Y7wM0wblJ6C/WP+k8q137phfbwRaMUZecKx3ER+2xu+Fn4Lg7faK8cIx7sxv8z/C6mbD7gF7mB8AAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA9UlEQVRIS91VuxWEMAxTdskwKRiFglEoGIWCYTLKvce9fJQTJg+uTqo7x3ZsSzIOCKdHQDrRz/Bxy795ko2Hd2qbfbnd4iUs/0n+EQeY/+7xbGE9+p5GaH76ZFvtQ9/u5bD1jdq/g/+cHAyBIeB2oBZ8O9Acj9CA1cH3iKPvIk4ttpGqki/Xg6MQ5yW/BZNAak6Cb4kxav/OYz1TcyHMFzWqatcVWJYfTD31XgCrKrY6VaAUuAbegwL/yW/JoGR9ix+5f5fWdZHI3lYsh2NXt9qtSi2ABPgGbF3/jUR1ndOPgPfUq3e9/FaZiZzbVD4/b/WN3P8XqkooTPsUAbkAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA6ElEQVRIS91UsQ3EIAw8dmGYFD8KRUahyChfZBhGeSkvE443FiJ8mdCEmJMPzvY5j3gAQPJBPnX5tNWY7InpxfWZzkVsjMC6AjUP9h8Plpr7Sfx8a08PraecW03TQJ9Z/TW/Y5GbImKHxwKS2X3GlouMcNI4urCCHS3iJfdd+UfaXOk2q8+/HA7+c+ju0J2V40VwFie8QzOVumgWa7v4auKZi/e5I3/Wr9PM0sDiaNvrdEUWKjdzGQa66WjSrSta/Xv8eZKtPeh/O3n6ASNcY720ZGNDdmJ5wafy6wnsOVrPvXTMFnBW/y80gSYI78kSLwAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA2ElEQVRIS9VVwQ2DMAy87OJheDAKw+SRUXgwDLu0coiRY0yglaLSF8LYvtw5PgIhvgBgxcIPEIb8lHcbk+85qeRd1VQ9aNpw1iQttj4m/nR8q5enoSZ44HfC90rLb/QPwJCHfCimaR8EH1APxR5YhiQ5Nv9MAE+oPZfmv8HXfLU2LX52mD31D7LJ1VqpLdVxexC9zXfy7OZ7mNXtL+4isafif8rLc8Ge+lebzDfPu1HaXrWN3rLh0tPWgWbECKQx5V8D47oW2LDxX+JrnTxNeKNb/NyaTvq/Abc76Pn9/3LkAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA20lEQVRIS71VyxWEIAyMvVCMxXiwlD1sKRwshl7cB7vhjdlBgr6nFxEmk8+EOInMu3SeIHNBJNmktUaKjElhKVshvetR3svf9S3bwTNyn4YU4pfnqn0vYXNuc74d/03/TIuz+k9MZI+QSsqweqYiFNF/guB6MFc33DbLqM+R/FlQT/r31J+K7A1cO8riXzHKuh5vsRXerdgF4KioHhfuKZOnFzS1h9uDYY3jrX8VWUlahuzmtoLrcdGbwsY7jGPkxIapXGCPY5zFwgTrxWzz/xuZD/u3vyo7rrFGH+uZk/l24xpvAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA0UlEQVRIS+VUyRHDIAyUe1ExfrgUl5NS8kgxlJIZZySzmkUDOH/4GIMuVtrdRL+XlpcU+YjK7l8s+7eFO+zDgDbsG356isV2Pz1v63J4Hj5bLf8MP8eRcBvhhPOMb4NlxXwT2a8mqb6bxiBIJCtHMwQ8AByHh6X3qOHZQvlBDAz9jER2969dxtabnJmXG8TBnwrpFZNZjvj5kZjgVfKPBj0raKisMZOUkFU2MGOSVHUOJvcA94ZBbquMZ0nnQrm42QN6LF89P8jxpIAz/IF5tvkBV8HiZSGTDhEAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAuUlEQVRIS91VUQrAIAi1u3SYjrfj7DC7S8PA8RBLjcFg/WzyzJ76slLp6BedxKtSG1+25V/sAcBiXPZpTGyMZ+2d4bOzMvxmnCRPzPHv+Rei1ldN8hq5KmYGi4gmKzSJuRMbxZDJY9d3h6O3R/CnyVgQiyiq3brp3s3HSSHxMwKK8vNuMOJ4fjS+5ReZfF/mX3hc65GsFYIN1EW0GrXyjyhdFz/CT/PIcrAarp+dlfj1cxTJc+bzdv43B4J/jd6HV+8AAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAs0lEQVRIS8VVwQ3AIAg8d+kwjtdxOkx3aUNTDCGIYFLbl9ET7uCwZcN+4f1OHLzEhvqs5V47BNo5Yyw878l7vXiEIbzFweMnY0fWOr/k+If+FfkLUFuTI0WKYEYG0Wah4lqG8Exm8dAxPENFdMxiMvpnc3j3dP5CkxwtRpa8xOspHZFkTpl7vcaziSydmfhf6F+R353kWQK9J6jXWG0G63keNVD+NqKmHU3RKv1eXaJavBreNLNr+WXTa4YAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAuUlEQVRIS71V2w2AMAiku3SYDuMwfjiMw7iLhiaYCwEtivKjMZR7ALUQtZ0GolLrWRutxO/8jAbWiJ7V+V6tzq1OVLfl5Cq832Li+b/x3/hfuMnYNCkmgqSpXxiVafpVLW2Q1mLpfzLEHocn+Jn+9yZbW2KJjGwiDkumYZHBiPDVW5rBORs/Ug/9L5Xms8mjwqxtF5MsIjofDUVML8/L4WuZg69m/JXgFtwNhTeMQ98/xB+5mSydlv8H4gJrjSfwS9cAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAA80lEQVRIS71UyRHDMAhc9UIxLibF5JFS/EgxKiUzzkgDGoTR5Rz62NIAuyxHAL0OAKD4QMQThC1dEemWv+ldTnqTu9hau/QO2itf109jJR8+Cd/yKJjMqdgyNxs/8+Y4JbD58fKczf+Us9Hl1/i5PqzfjP4B2HKR9RkJ1BJu9F6EVUXVxdXk5X8U0/K29kUMB7PXALlZF4/kp93+id+iGwj3o9XBmmBVINrPE82i6AaxUzlTuJaP13hX42se3ubIk6g2W6VPZ+vM5vcx/qL+1SSvTHDLdhTDNoGdXunGK5Mka7In9mibXMX1NpI3Wd/CX9H/DQl00o3a2HmsAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAv0lEQVRIS8VUwRGDMAxTdvEwDNNheHQUHh2GXcq5V3O26hDS9ggvHGIk25ILMD3hHsG0RysesFjf+R6fQRbIekd2V3PP/MPjMZdA4B0EfqPxgdAv5Xa2F1bbT/2v4BcesoJl5LIGX3E2mssI/H9jFsEcnJwNzhztnW3O/IaQ5WSqZYyakD62SIfirsD3tWVbLHPuUa0tzpzr8YOTeWC1AXIBDBDWvNxen3WN9wysxeWIw2j8Dr2Fdd6quUcYnsMG0qKB+TDNwToAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAApklEQVRIS8VV2w3AIAg8d+kwjtdxOkx3aSOJDbmIj1qpPxofHAcHhg37BQAnjjTJ2BBlTnt5bd15HpENvc9rbTOfeeJrnhr3rZ8cK+ZiYaQ4eOAHIEqSdWJrCVp15oWfA2uJ9yt+Fp8/8EOpkkeIshp7k8Vka4pudQWrC/RWrLZf8r9VcS3/uAuO3p/Fl0pmVTPRGZAewazGr/k/y02/t765WpI98G8P925lIb/NXwAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAVUlEQVRIS2NkYPD4z4AGVBg8wCJ3GHagS9GFP2o/dcOfERbJuAIWJI4e2TC12BICuRE0aj/2iKVG+MMjmdZZFJtjaW0nsvkj2X66RTI9I3TULtQQAACpTjMhZt17FAAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAcklEQVRIS2NkYPD4zzAKhnUIMOKKZBUGD4Y7DDuI8jxILQiQop5YtSBzsZlPivuweYKQfkLyyGYOdv/jjGSiYncQK4IFPLbER0oEDmIv4nUasv8pysnEBBYxanC5llS9pKgnpJaQPKyEIVQiEWMOrf0PAD9/NY3Bi16aAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAaUlEQVRIS2NkYPD4zzAIgAqDB9gVdxh2DIhraGk/yOyB8hcoMBlVGCb8HygH0DJgiUkp1LKfXHPI1UeM35DVMBKbk8lNjfTyCC6PD6T9sDCDuYGSkoqS8Cc6kklNPSNZPXKkIofDQJWYAAdNI43MUFvuAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAAECAYAAACqRpBWAAAAaUlEQVRIS2NkYPD4zzAIgAqDB9gVdxh2DIhraGk/yOyB8hcoMBlVGCb8HygH0DJgiUkp1LKfXHPI1UeM35DVMBKbk8lNjfTyCC6PD6T9sDCDuYGSkoqS8Cc6kklNPSNZPXKkIofDQJWYAAdNI43MUFvuAAAAAElFTkSuQmCC"
            ]
        });

        return function (resource) {

            function getBgPane(res) {
                return new PatternPane(res, 'repeat-x');
            }

            this.audio.addAudioResources({
                metal: resource.audio['metal.mp3']
            });
            this.audio.addChannel('bgm');

            const tfSpriteSheet = new SpriteSheet(
                resource.image['tfSprites.png']
            );
            tfSpriteSheet.addSprite('twinshot', 268, 121, 16, 4);
            tfSpriteSheet.addSprite('bladeshot-1', 7, 147, 32, 16);
            tfSpriteSheet.addSprite('bladeshot-2', 42, 140, 16, 32);
            tfSpriteSheet.addSprite('bladeshot-3', 60, 143, 24, 24);
            tfSpriteSheet.addSprite('bladeshot-4', 87, 144, 24, 24);
            tfSpriteSheet.addAnimation(
                'bladeshot',
                ['bladeshot-1', 'bladeshot-2', 'bladeshot-3', 'bladeshot-4'],
                ANIMATION.END.LOOP
            );
            tfSpriteSheet.addSprite('ship-up1', 75, 5, 32, 16);
            tfSpriteSheet.addSprite('ship-up2', 40, 5, 32, 16);
            tfSpriteSheet.addSprite('ship-up3', 5, 5, 32, 16);
            tfSpriteSheet.addSprite('ship', 110, 5, 32, 16);
            tfSpriteSheet.addSprite('ship-down1', 145, 5, 32, 16);
            tfSpriteSheet.addSprite('ship-down2', 180, 5, 32, 16);
            tfSpriteSheet.addSprite('ship-down3', 215, 5, 32, 16);

            tfSpriteSheet.addAnimation(
                'ship-down',
                ['ship-down1', 'ship-down2', 'ship-down3']
            );
            tfSpriteSheet.addAnimation(
                'ship-up',
                ['ship-up1', 'ship-up2', 'ship-up3']
            );

            const SHIPSTATE = {
                'WAITING': 0,
                'GO_DOWN': 1,
                'GO_UP': 2,
                'GO_DOWN_REV': 3,
                'GO_UP_REV': 4
            };
            const shipStates  = new States([0, 1, 2, 3, 4]);
            shipStates.addTransition(SHIPSTATE.WAITING, 'up', SHIPSTATE.GO_UP);
            shipStates.addTransition(SHIPSTATE.WAITING, 'down', SHIPSTATE.GO_DOWN);
            shipStates.addTransition(SHIPSTATE.GO_UP, 'wait', SHIPSTATE.GO_UP_REV);
            shipStates.addTransition(SHIPSTATE.GO_UP, 'down', SHIPSTATE.GO_UP_REV);
            shipStates.addTransition(SHIPSTATE.GO_DOWN, 'wait', SHIPSTATE.GO_DOWN_REV);
            shipStates.addTransition(SHIPSTATE.GO_DOWN, 'up', SHIPSTATE.GO_DOWN_REV);
            shipStates.addTransition(SHIPSTATE.GO_UP_REV, 'eoa', SHIPSTATE.WAITING);
            shipStates.addTransition(SHIPSTATE.GO_DOWN_REV, 'eoa', SHIPSTATE.WAITING);

            const tfMain = new SplitArea('Y', [32, 192]);
            tfMain.addPane(new PatternPane(resource.image['tfTopBar.png'], 'no-repeat'));

            const mainSizes = [32, 64, 64, 32, 96, 96];
            const waterPanes = [];
            for (let i = 0; i < 32; i++) {
                mainSizes.push(4);
                const waterPane = new PatternPane(resource.image['tfWaterData_' + i + '.png'], 'repeat-x');
                waterPanes.push(waterPane);
            }

            const tfMainArea = new SplitArea('Y', mainSizes);

            tfMain.addPane( new LinearGradientPane('Y', ['#404080', 192, '#B060C0', 224 + 32 * 4, '#B060C0']));
//    tfMain.addPane( new ColorPane('#84e4c7'), 1);
            tfMain.addArea(tfMainArea, 1);

            const bg1aPane = getBgPane(resource.image['tfBgA_0.png']);
            tfMainArea.addPane(bg1aPane, 0);
            const bg2aPane = getBgPane(resource.image['tfBgB_1.png']);
            tfMainArea.addPane(bg2aPane, 1);
            const bg3aPane = getBgPane(resource.image['tfBgA_2.png']);
            tfMainArea.addPane(bg3aPane, 2);

            const bg1bPane = getBgPane(resource.image['tfBgB_0.png']);
            tfMainArea.addPane(bg1bPane, 0);
            const bg2bPane = getBgPane(resource.image['tfBgA_1.png']);
            tfMainArea.addPane(bg2bPane, 1);
            const bg3bPane = getBgPane(resource.image['tfBgB_2.png']);
            tfMainArea.addPane(bg3bPane, 2);

            const mountTopPane = getBgPane(resource.image['tfBgB_3.png']);
            tfMainArea.addPane(mountTopPane, 3);

            const bg4aPane = getBgPane(resource.image['tfBgA_3.png']);
            tfMainArea.addPane(bg4aPane, 3);

            const cloudMidPane = getBgPane(resource.image['tfBgA_4.png']);
            tfMainArea.addPane(cloudMidPane, 4);
            const mountMidPane = getBgPane(resource.image['tfBgB_4.png']);
            tfMainArea.addPane(mountMidPane, 4);
            const mountBottomPane = getBgPane(resource.image['tfBgB_5.png']);
            tfMainArea.addPane(mountBottomPane, 5);
            for (let pane of waterPanes) {
                tfMainArea.addPane(pane);
            }

            const tfMainAreaFg = new SplitArea('Y', [160 + 224 - 96, 96, 32 * 4]);
            tfMainAreaFg.addPane(new EmptyPane());
            const bottomCloudPane = getBgPane(resource.image['tfBgA_5.png']);
            tfMainAreaFg.addPane(bottomCloudPane);
            tfMainAreaFg.addPane(new EmptyPane());
            tfMain.addArea(tfMainAreaFg, 1);

            const tfSprites = new SpritePane(tfSpriteSheet);
            tfSprites.addSprite('player', 'ship', 30, 30);
            tfSprites.setAnimationSpeed('player', 0.15);
            tfSprites.setActorId('player');
            tfSprites.setAttachDefault(tfMainArea);

            tfMain.addPane(tfSprites, 1);

            const tfFgArea = new SplitArea('Y', [160 + 224 + 32 * 4 - 64, 64]);
            const tfBottomMountains = new PatternPane(resource.image['tfFgMountains.png'], 'repeat-x');
            tfFgArea.addPane(new EmptyPane());
            tfFgArea.addPane(tfBottomMountains);
            tfMain.addArea(tfFgArea, 1);

            const bgScroller = new MasterSlavesScrollHandler(tfMainArea);
            bgScroller.addSlave(tfMainAreaFg, 0, 1);
            bgScroller.addSlave(tfFgArea, 0, 1);
            bgScroller.addSpriteSlave(tfSprites, 0, -1);

            tfScreen.addArea(tfMain);
            const tfScroller = new MasterSlavesScrollHandler(mountTopPane);
            tfScroller.addSlave(bg1bPane, 2.5, 0);
            tfScroller.addSlave(bg2aPane, 1.5, 0);
            tfScroller.addSlave(bg3bPane, 1.5, 0);
            tfScroller.addSlave(bg4aPane, 1.2, 0);

            tfScroller.addSlave(bg1aPane, 2, 0);
            tfScroller.addSlave(bg2bPane, 2, 0);
            tfScroller.addSlave(bg3aPane, 1.2, 0);
//    tfScroller.addSlave(bg4bPane, 1, 0);

            tfScroller.addSlave(mountMidPane, 1, 0);
            tfScroller.addSlave(mountBottomPane, 1, 0);
            tfScroller.addSlave(cloudMidPane, 0.8, 0);
            tfScroller.addSlave(bottomCloudPane, 1.2, 0);
            let factor = 1.4;
            for (let pane of waterPanes) {
                tfScroller.addSlave(pane, factor, 0);
                factor += 0.2;
            }

            let isBlade = false;

            tfScroller.addSlave(tfBottomMountains, factor + 1.5, 0);
            const tfScrollBounds = new BoundsScrollHandler(tfSprites, bgScroller, {x: 0, y: 30});

            const inputController = new InputController();
            inputController.setDirInputsKeyboard('w', 's', 'a', 'd');
            inputController.setDirInputsGamepad(12, 13, 14, 15);
            inputController.setDirInputsTouch('up', 'down', 'left', 'right');
            inputController.addInput('fire', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('fire', 'j');
            inputController.assignButtonToInput('fire', 0);
            inputController.assignTouchToInput('fire', '1');
            inputController.addInput('change', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('change', 'k');
            inputController.assignTouchToInput('change', '2');
            inputController.assignButtonToInput('change', 2);
            inputController.addInput('back', INPUT.TYPE.PRESSED_DOWN);
            inputController.assignButtonToInput('back', 8);
            inputController.assignTouchToInput('back', '3');

            this.audio.loop('metal', 'bgm');

            tfScreen.setFrameHandler(function() {

                tfScroller.scrollBy(1, 0);
                // move shots
                const shots = tfSprites.getAllSpritePos('shot.');
                for (let sprite of shots) {
                    if (sprite.x <= 320) {
                        tfSprites.setSpritePos(sprite.id, sprite.x + 10, sprite.y);
                    } else {
                        tfSprites.removeSprite(sprite.id);
                    }
                }
                tfSprites.updateFrames();

                inputController.awaitInput('fire');
                inputController.awaitInput('change');
                inputController.update();

                if (inputController.hasInput('back')) {
                    this.gotoScreen('demo');
                }

                let moveX = 0;
                let moveY = 0;
                const speed = 2;
                if (inputController.isLeftDir()) {
                    moveX--;
                }
                if (inputController.isRightDir()) {
                    moveX++;
                }
                if (inputController.isUpDir()) {
                    moveY--;
                }
                if (inputController.isDownDir()) {
                    moveY++;
                }
                moveX *= speed;
                moveY *= speed;

                let event = 'wait';
                if (moveY !== 0) {
                    event = moveY < 0 ? 'up' : 'down';
                }
                shipStates.doEvent(event);
                const shipSprite = tfSprites.getSprite(tfSprites.getActorId());
                if (shipSprite.isAnimation) {
                    if (shipSprite.animation.getState() === ANIMATION.STATE.DONE) {
                        shipStates.doEvent('eoa');
                    }
                }

                const transitions = shipStates.popTransitions();
                for (let transition of transitions) {
                    let target = null;
                    switch (transition.to) {

                        case SHIPSTATE.WAITING:
                            target = 'ship';
                            break;

                        case SHIPSTATE.GO_UP:
                            target = 'ship-up';
                            break;

                        case SHIPSTATE.GO_DOWN:
                            target = 'ship-down';
                            break;

                        case SHIPSTATE.GO_UP_REV:
                        case SHIPSTATE.GO_DOWN_REV:
                            shipSprite.animation.reverse();
                            break;
                    }
                    if (target !== null) {
                        tfSprites.assignSprite(tfSprites.getActorId(), target);
                    }
                }

                if (inputController.hasInput('fire')) {
                    const actor = tfSprites.getSpritePos(tfSprites.getActorId());
                    if (isBlade) {
                        tfSprites.addSprite(tfSprites.getUid('shot'), 'bladeshot', actor.x + actor.dim.x, actor.y + (actor.dim.y >> 1) - 16);
                    } else {
                        tfSprites.addSprite(tfSprites.getUid('shot'), 'twinshot', actor.x + actor.dim.x, actor.y + (actor.dim.y >> 1) - 8);
                        tfSprites.addSprite(tfSprites.getUid('shot'), 'twinshot', actor.x + actor.dim.x, actor.y + (actor.dim.y >> 1) + 8);

                    }
                }
                if (inputController.hasInput('change')) {
                    isBlade = !isBlade;
                }

                if (moveX !== 0 || moveY !== 0) {
                    tfScrollBounds.moveActor(moveX, moveY);
                }
            });
        }
    });

    tfScreen.addAudio('audio/tf4-metalsquad.mp3');
    this.addScreen(tfScreen);


    // #################################
    //   Shadow of the Beast
    // #################################

    const shadowScreen = new Screen('shadow-ingame');

    shadowScreen.setInitHandler(function () {
        this.addAudioResource('sotb.mp3', 'http://localhost:8080/audio/sotb-ingame.mp3');
        this.addImageResources({
            'clouds.png': [
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,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",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAT8AAAAJCAYAAABE8iuvAAADEUlEQVRoQ+1ZgXHCMBALGzACIzAKIzCCR8gIGYERGIURGIEN6Ck9UfV5O06TGFOSO64p8TlvWa/Xm02zXosj0Lbtfb/fN5fLpWnbdrP4C9cX9AisuPtECCH0fLxerx/NxzURFxaK0+l0v91uzXa77T8gHP4ej8dqsUdyMF781avmuDXOd8R9YSo2Xdf1+2qvTxXBaAKiaipQvEci47M6mN8UAl673e5RTc/n8x0jgBUvS7zD4VBMAFXQuH/6XSrxEDcFnONqEcHacV9a0HLnh/BhrO6l7mkt+5m7njnGPZIPJCI4dmKvWjCxVyFs+ooKHCB+dHe4p/ChsqLN4P+KZ0kBTBEmBOz/j0O1oq2xM/5XJ8x/wH2OJNY52NJqfsby2cvrV+9pCg8asrn414sfJ7XVXSuFdx8LdIo7pDXHHCGEYs5oiIRoo6z7VYEgPhA9JR7H8Ht9D+YrcQ5o21iIMeLquq7Hl8+9JKFTUBfLlhjflUgWJT25ZXGsEfchTs39nO6O85J7mtfkcMwBltrT3LXbDtTu+5R4H+LnBRNzfLmBc1xOy0znaUm8VHutImtdDc/lmOQQKF0D18VYOT6GoSasd5SA71IOkOKkgqWipfFzTEzQ/rJ3VuS9OebcJ3IhFuucuHNvau5gsJfAgp0FCxF4hwKG51pc2X2oCHpHF8pFHtmUOo+GmRgqnCp81pjZ9QzN5XHpqe0dmxw54+dMjJz36RivnYej1ARTd6P3JJktAnYjSBwVeyaVRzo7Di0xLpB5itv1BC8lXHR+FtOY+HzPhR9u+m6huCu365uKu1fceVwxpXsZy9FIMXn6ccIem5Bb3hGFctQWR8/9aQxTODi0dnWnFOncLsTOPVUAkwQeqsAI5hVJMATwmOdco10HEi0mDnZ+dWZ4pkmlxHt3rMbgWmLsO+Buf1SybTu7C+026ELp+GIdmBVDFmtykALoFcBYUZ7CUeTSEl2I16KninruGopX7xJJUcs7xghoLTGvcbwfAhTJVOR6vuuNyy30uehYl26PbHLmSR3d5Apc6j1fuJCkKBKQwfAAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAAFCAYAAAA0cjXBAAABl0lEQVRYR+1WiQnDMAxsN8gIGTEjeISMmg1a1CJQD8k+P2makkAoBUc63Uln3W8Dn2VZHtM03eTdtu31rut6H5jisFC2NgHxb/W1EIt6SwzVXn71+SZXisnWg1j0/zdxtfB7ffNmwNNUe81y1KJntzmVGq7XLGz8I4wV67MDXks41nKEQbQOVdSEUTw0wlquanAy2FA3a4rao6ONES/NM+md4z9XV0qp21Nypqe4GD2ZBewDbErpIQmiImoaDbcBZgBsfDmPTRq5vjbwyG0zVyu73ZT42mtbkrzzPFNbKsM5Y0ail6ePHfpWfRBjLg9iVY5xI1S8bG0RdsUW9as3sLmtxcZr5YupiTlT6l+ccYzJzLz9xsuHOnmeUMKh/uDVvJtbM+7LiBDdBiPj526ckgAsDhwU9rsejno3ZsFszcZyYbclOSPDqucR816DHOWzpuMNJV5go/FFgzw6D9sb3jm8VFS/yGBqcnkXu5pQT997ejN4czmHGGANOdfZ8zFgG++XhjjHZMkcz1LHr3VLtBX2GNuRNT4B/o6qlAamdAIAAAAASUVORK5CYII="
            ],
            'mountains.png': "data:image/png;base64,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",
            'fence.png': "data:image/png;base64,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",
            'greens.png': [
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARkAAAACCAYAAABsdqj7AAAAw0lEQVRIS9WU0Q2AIAxEywaO4AiO5giOyghuoOnHJU3TUmjQKF9EOXp5PVr2gy76wKqVaF2JloXoPN83xPW3ra921mtWN5MG+DJj3mfW06yynLK6DINIA87wFJ3/+/9WroocMgieFUA8fFymA+pp5Dl5xtszbFkL8Ee02uPMWnwXhqH0Jtnxd8+D5tTilukD+LX6o/l6Ayfqg66lOUesLH2k8XLoZXc239GcW/n1Mo3cWD1sZVi/mR6PUY0R31bW5Bu4AeMJy8H7Z5xtAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAAACCAYAAADCSSsWAAAAb0lEQVQoU61S2wkAIQyrGziiI9zobqDUIxhCfRxcv4qmeVRTeazlbFarjfra68zLMov5Vvw7TZ9xb45BrxoRL2P/ygQP0Icv9gfd5Itlowq6vVuFZRN4PJyp0YhDF3RacMRxmwkPAHykpR+Fs7BOB2zXS8E5RWMjAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAAFCAYAAADllTGxAAACPklEQVRYR8VXiW3DQAxzNsgIGakjZISOnBGyQYprIYBmSYl2AzRA0eSs00NRvPPl4769rtdt93k+t43XykA9q7X1f31qL66vNdzLe2of+8ff6LfWyy/GVvlwLiueygeB6GpVdok9Y7RHfp8TY34WX8R+ypFjIA8ejz0vXD+5/xOmiluVh+JF10uF79TniQsdj2uv4r2rq/BBnMp2rTHOzBGOibOAMadZ7Xih5hBrRF5gr7o6Kh7ifbl/bq+jA+sa6sRDiQMmcVY8brefctd+FiTXJLe+9pc/tEn9cD3cXGwef6/6WWyLiLzOw7nseFCTocFBUDlMA+SEoBONTmwcZh2vkj3IDcYUD7DOV4fvkWfv5pMTap5pzFH1h/vCouIuKTy7CouaK8Xny7oBocKiSrHy4jPVrK5IlSiqpVNRtc5xnB+XL4KNYqBAT8RTYeZw7PDFOjqhVHUxBup0cxijeDohRcxZ7JNYU90phly7winhc8rzo9xShznm6GYkPUCUsLh5mHCYMOcb2mQ/xVNY/hKgTnT42dnfXAgW2g3JROIkHxweN2xHyZkQwOXmhDxpJhMk7d1f6kNBXn7WX93AVI2q1+rUng6jd9TW8eO/uNX1/ww3juI98TLF3fUexVcd8N8CxFfcZJDZ5owPvtaVT3wdQGKmeSW5JISr1zJ3C+vywRySfKYBTHwkNomwuVcWRUbsIdecxHJ1cy1Jv1Q/zvYBD6eUd8lMVB3uFjnF4v0Tb5y/o/gm3HI26oJRa1+Bf7DP74ifEAAAAABJRU5ErkJggg==",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAAICAYAAABZCyJvAAADMklEQVRoQ81ZW3IbQQiU/vzpI/goOYKPkKP7CP70n1NY6birTQOzDylbpZJ2hx2GBhpmdH39ffm8/L2en28/3t/xJP+OcchWkioX73RzZ/NN55msayLDa8jkH4XT6toVy7Pe3zuvi6HA+e1tFmscw7GeaczUkT4bnep6erpc4vPxcfu4C2MhW10qB/lq7plF3zzQ5bnLaTxHvsc9PuFTXFcmIJf88RwTugWpE6p7Hlt5D+TIBND9hk2dHucYBrAj27Nx0iTLfJElLdteFYGtPlO/ZPfOD/oca3CktuLHbo4jdbnYDDKoiARkxDKZvJJNdc9jUzLjOK8KSoU/x1bWaICA4PMgouuv18snk4suBEnFAPPknASarOxgTk79zTqgp9LLhmpCZbY4fRnozn4N1kfjpNjCxqzyKHFmAdbZk5GfxkGHkYuVzBZes/N39lyfaTyFLujLyHirLhffjky4W+HOCHYzcbAsCA2dFMvrnDHG3dBZec6+6khf/TEiIAbXOc85kytc1UFw4oApswDXwJzOr7qr4OtIbUKAZ+OUJWi27j34cLB0JD4hqKPWol2vVlvtDDkpssrsyO4ImyYEFHogp0XcdTp4R8kpyzGQ1f8Y119bMOdAfc7gcBC45J50I1nbxq2aa+Vctc0qkSZSRYRurCLYe+PUETnsddit2LgFq9V3uk5kUjwyndV2s4rf1fVX8tm5jDsL4u1YrM+dF7ktXUZW0OXI/9Fx/dUBVQC6isEksTfBXaJkLfuW4Mjawio4YQ/0d7KV/UfilHUhXKUVG+C6SkTTZO5wYdy7DnfFr51et37101FxUW3pOrvcgXQQB0go5ugOrjs9W8fPzv8fBKQdiZKAtreVfJUwGSBdQHTje0DOtn1dp8EJfk+cuJq5dXOF17Z+K05doaow1O303g6ki7uMjDV2OxwmxKIkC5JzZyHZlkm7pOxAmgnIjXf2TMbvnf//CMgB5ha9Kj8xnmXOmn/vvKvvr8p3OO0hE7fdXfUxb39RZFxBcXNrZzj5u51J7OXldpisW/EJSVbFr/MX45/h4Lqz6b9RWNuqfGV3909cZ3MXk9NmQgtn3P8BcCUy7j8i1xEAAAAASUVORK5CYII=",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAKCAYAAACaPJ0xAAABrUlEQVRYR+1W2bHCQAxLOqAESqAESqD/KugAZgGD0MjHZpMBZuDnvWQ3tiXLx3w8TZeJfrvdNJ3P95ftb3u2Hz+399F9Pmdf1WeLB2NR8VXt8T3DhVjsjvlsd7w4Mr/fxGPDo3Aan7OJQiU7A5qdRzYrZyoB3nf2Xp3zGT6baDMsWeEstVPxW+FK2enBaVw3O39RPDpdJTl4h7vjr4sCsT1F4Y0HT21ZG622e6wC/CbrXJF/r2tk9vncG304Tvb710hBYjm+b+Ixw3kTRaUlYyUogCoR2JKQYCTVKg4rz/tfVWM0NnDnyGLG/cETT8YT7zgZ+Sw6b1/K/K6NbT4cX4umt3yo1qqSqeauWgY9sjiJPX5ZaKpqWdhV+8yLx5O3pGJxYJxKFJxgVYxbY3sTRbRMefNUVZj3rkd00YxXxJqgVOIrfqsJ5e7HHVCdR9wpwWVY+LzXpxqLGMeiTlEhORJLlHD8DsFHVe1VnOenJ/7Mb1YsFayZj2icVgu5GkfzdRNFTzscIXo0GVVgn7q3Bj7uglthiWJd1Cm2CnTE7hoJGfE/2hnX8K3GwhK7V3M7qPBanwtLAAAAAElFTkSuQmCC",
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAFCAYAAABrai/kAAAAuUlEQVRIS92W2w2AIAxFYQNGYARHcP9p2EDTkCakKfYB9QMSPxTo8/TGfN3pST+s1rqTUvqDC79rQuDOjrY0NrRnwK4lNrRrvQc+sCYef7N8rHGMdnI0FGOitIH4bi2GdD4KFNoALo5adTDRunhroYXcAk8oFBwQo2KgcuxQjWgQdqnUDOgVBeVgXVGf7VB4p5g29asJsEfhWp2YE+5zQ+hRoGUoJAikYnMT7v3nkHyduq9VH8hf068X7vBNMUzmaioAAAAASUVORK5CYII="
            ],
            'bitmaps.png': "data:image/png;base64,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",
            'sprites.png': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPUAAAG4CAYAAACdAKFjAAAgAElEQVR4Xu19PXIcObNt3R1QO2DobqAjtAEaWgCdeTYtPZfefCbNkUf3yqL9xuECZHADiuAGroI7kHagF4muUzydnfgtoKq6G5yYoNiNAhKJPPmHBOq/hv7TOdA5sAgHnobhz90w/FfrwZoP0HoCvf/OgVYcaAFC6fN5GIbnhuDuoG4lEb3fk+dAC1ALU1oDu4P65EWvT6AFB25vhj+3L8PQwl2+vxv+XF8Pw8tDG4vdQd1CInqfJ8+BlqAW5jw+DH/kdwtgVwH1l7++OAI/fPiwX8zx19evX6v0H5OQtceP0bfU93e3d24dfv/+PTy/PC/C+6XmtvQ4t8Pw53ZoY6kB6uvdMPy+HYbXu2F4fKqXQJu18ADTt3+/uX4+f/r8R4CN/1uDe+3xZc63N7d/rq6uJpkTQAFYL68vs/hbKsgd3KWce3+uNajhgl89DMPvh2F4e6sH7KpC9/+G4c+PL39P1vrXz1976/1hGJaw2muPDzAB1PJ7SYspCgZiCUXTrXYZwAXU15UtKFMi7r3E1bunYbh6Hoa313rArg5qIVyA/evXO6CHX3uXvDWwBdRLjg8QsaW+vd0Nz8+vk7VeCtgMaBYeoe3p+anqOpfB5LSeag1q4YZY67enYRA3vyawqy42g+rnz5/OSgu4P3766FZ0SVC3Hv9md/NHu9eyVSHzfNrduPleX18PAqq3t7emFhu0CLBvX2QXdP/zfCPiMv57gRgbnsqk5Mao5PHxsaqcLaEelgC1jIG5YKVquOJVmQ33V4DMoJK/5efz58/D12/tkmdrjw9QW8B+fGov2Dw+A7u1tQaY4RGIkpEx8f9wguAGqIWPNZNYBy64AWr5XoD98iKhW1nyrCqo//7y9x8BMP8v1vrTp0/Dp29fh68fPw0/fv6oOiYzae3xNajEYou1Fku9RNLMB+olrbVTaMPw5/Xufj/s1TD8fvvtAC7/PhWrjURZ7cy09jIkth5e9i44/wiw7x8WBrUACNltiZlhnWGV4XrL748fP07bXfI9suW13SjJhouHgHgev5caH3GtJKfkfxFkAbUT9AXiWgvUCAWElqWSdqBDgA0+OGstGwMnAmzsUy8BahERia3vxshJtrnkn6WJuiKrOQF671W7HwHQjx8/vDjFNpcArIUL/vfff//5+WMPaKYJ/24xPtxM5zKNW1nOOI1xNGJL/G4BKtAAj0C8AtBw9/oyxfdLeArgNYNa6JH5C3+ud3sFdwrWGqAWeltUlYFXyIILqG8eRudm/F1aI54N6r8+/zXtRTN44HID4Ba6BdBiSWu64EKP9Ou8hl+D61/Thb9rjW+BGcCFZRZhhkDL+PJ5TWvNYNZKBZ4Cr8HSoIaVZlBD8d3c3AxL5Bi8FibhC+cWSx1Co1JRH6hRkOIU8/MwSN4zN6YvBrUMChf7INM8AtdZ7jF+/vTx05Tl+/zX52pZ8CMFo4ANq83We+74nARi0MI68vbWi2Q7RstdG9QoekGs6lzbQfY63y01gx3WsoW3oDFyf3f/B4qFQ5Hdbjfsnh6Hx+vd8Pr2mi17CVis1oRB3dJaw1LvFf8wSDEKfrDNlRtbZzFWYlaOmWVwABog//DxwyBFJ+KKa4ss4J4LKkxYAD2NifLU8UvE1dpCC+16fKmCEwueGucDTBBWWGbnXo7xMyySWObd9c5lgmtaSlEs2C57l4B9QgpjI/PMfwP0NYEtAEZ229HyexheX18P6OD8AhfF1PRcqqF57GgpUO+u90UoiKs5YSaglp9ca50EahdDj3EzQAs3Fy4tJ6Ok7ffv36u62bxoADQ+m2rOqRG74VPZKurTPwxO8SBkSAU1wMTWBxZwr2mvJ2FuWcnFimXaNlJWmumaNP8Y29YC0wTo0UsAeOGhWEADvcKrFi54rb1y7CEDZK3iaoBaMuDyg0IUSZYB1FJtlmOto6AW64xST2S5GQzyHaw1g0ss9fcf36P9l2hYBvVUuUbhAEDMcb626mzNU0Ct3W6A2BknynYDTPJZTesMPrGVhqvNcby0c8C5vnKWG/S1KBt1oKYfeAWgi5OH3A5JvZoueO29cgfqm31MLT+lSasU+YYCkWy3lI3Kdpa44QzqnNrwKOgOTkB9GIYf3/cZ7ungxkcxe4duuABagPLv93+j/adM2melEdPrkIAtc40tNAa0CCpiaXa32c1tCWhsk3EyDB4C6GLrzQpH+Fhrz/wgph8V20Gme9yfl/EBXglFJuV0e9M0Cz53r5xBXaPKKyTncPVRCy7jOaOxe38qx1pHQYdkFIDM+8B8Gku2k/indpYbfXMsDZrkN7bT4C3o3xa4kTmPbbHpumoNnmkvdiSyheutq7SEBo5VWdnoU2NoVytZJlZRx+oSR0PJud9j0Yl8ri2ygPtmAVDLcpTulcMtFksNkOVYyxxjxaAe0zIO0AJkAFv+nVplFgW1ECcJrqmI5OOHAfvB2iJyHNuiJJTdboAWLrYVV4OxsOj//M8/7qOv//l6sJ8d8ij09hXvQTN4YC1hGWu73lAsPI4AW/6GO8vJOswd4OfEWmlMLWBGth1VYkiKSWYb9OgdgJpudipY5u6VM6ilAMUlsioej+R5pFrq1PGTQM3AlpJP+WGLzVZc/u0OcTRwvzWoAWSx0lzBxiDlZ3CwBEkyoTVWDCOglnYAMwCkXVwGm96zdgwb65/fXt+3nFLBxVZauuLtIj40wjShHW9xzSmCcYC+FvNLLuHoLTANe7fxemonoK+t4FKADfebPRgOWWJ75TpRBhdcxs7dN47RC1d/stL7Gh33o13wFGudDGoAW0DNVpGPWEq8jb9h2UOurWwnSX8x91fGDllptsghq4ssPnsUMVBL3wA2LCG73wCPBpReyPuHfS30w/0+YJL2uaBGn3Cj2TLC/eWEmI6nuQ4dLnTq9haD2sXJr/vjpYjxAXjeuwdNqWPEhD/n+7l75VNWetw/lgSW/LQoG+VEmQPyCGrLBU+x1tmgBlj//ufv4du3b9PWEIDCLjmDTcCu3V/OXMeSap8+/+Ms5sfBX4oa6yNHKHRbAbYGNbeR78QFRazJmV8n+GOJZImlZsUC0OowQIOa3W4BFZ/9FgUjyiVHsfANL/Ic3O4J1OOBDcwPvBE6lnK/dTaeq/py98oF1AAYQNYK2E6B7B04V++N8SxLXRXUANXw819nqT99/jR8+fJl+Pb1myNGQM2FKPKZtujyjGtLNdpiqWMZ6mlsA5Uffn13n7baPuMhUUjCSSLeD7a2cGoLNLwGttoAGdxgWGiuYuPcgCgYAV8OqKFY4JFgzL3g78+Nyw+sOPgiv1u73wcFMBQe+PbLMYfYXjlba2xtge81Lba1V43knAXsmAueZKktUH36sL8EgX/gRnNZKH+PeJwz1TFQH4z989+pOxdDf/g8/f3j+3+S5jLXWsNCalAx0Fu7mwxsCChbaqaFzzgLzWif6vprfoWy8Oif96kFOC354dsrF1rgrVhrnrJXzmDTRyNr71vjCKbQqqvKjrLgkauFo0A4AjQBSwAp1ll+16ogk/EAUAvQrEgsVz+13LME3Lubh4NiC+7jetjHmE6Yht3w+vIQ5W0JDXjGhQNX+xtWQj8t6EABDEAsv6dtvatheH3Zl4lCgbQCdWivnBUMlJx4TTl75RaoeXtLTlbVetMGMuDW2erJgDwPw9OI+NC4UcFjtxud83YS7wfXimkZzAJwWH4eS+9Ds2DzAQ75vAbQQ4C2QNUCTHqcVJpa0HJQfz7uSSPTzB6B/Dvm5sYUk/V9bK/cKZSxqg5JPQ6FUvbKp1h3rCzD1pYksOjWqCrZcO2CI7bmAx7Ch+myqhv/zShBUIcAzYxGqWjNI5XcP/bJ5TO2zjpm10oHf3PFWUqm3RKiFABd/X7ZZ4N3102rpYS+ID1v+6VvEc/yuDLf3c1uuLu7G54e9+lhfeSUAa5dfrG0JVYc++XItMPdx7odHHa5EgDuaz1L8htcWcagxu2f0m+NLS4GtQB6rwyPT205HkduHs0CNQAl20B8ZZEMlFI/XaKR5Rm21CkWWrvo0seXv7+4bH3J5YcaQCLMVlKMk0ilMauPR0IDLO4RoEcQ87NIXNVKUvmUyO5qn3DjHxzUgKuL7x+fHl2zx4fH4hcO6K013rM/KIChPXVJmJUqOA1qgK22tY6BGnXgVUAN9xeA9oJqPPlUw9W1BNtywbkdhwTaYsvJMpepLwA1hFkAxQkqC9So7oLFKrFCIcV3ACwDyBao5bMawA6NDTDJbwGQVRYqdEjBB3gDMMaKQHhOvr1yaSNjh/bKS7fWdAbcZ63nWmwL1GytJZY/KBl9vx3lyDBHLbWOaX3ur2N+Y2Cz1XbDqey7Bjb21IWuElCzdXSCM56Nln9rULOVdpbpStyk+lcDgyZO+GhFwJZT/j1XuUyAJkXCW1gyPu+f+8bDSSquW8+hT9x11JdDOXABjgO1c0/f6+LRrsT13q/5+341trU0wBD3zjmeqYtdAGjHW1xz9H778z5h5omrk0DNYLIs9sEpqQWADSH2bZ0B8AD1HNdbA8ay1gA02k5/N7xkD8UwAJQ+YLEXin1p0tyTWSFQQ8FhzikWkd3yHFCD91PMPGbaWaGCHt5WK3W9sZ7WfjWALeee5UcsuBSnlAI7Zqm1HIYuJswGNTpncKPumq2nbHXVyobrCem/LXCzFY/thcf65+9hrVFcwd9pCymWo4W1ljHFalkhgFYs2FefY601qBlEoAEggovd4gKEveXc3yTjgD3GzZLdZsWqaSq10j5QA8D4nuvC5bOSxBkrDlhpVJZpSx27bTS6pQXCpU5bbxXJd/r6XY65SzPNOSDzWW1L6dSI9xnU06Kqm0QPgNUI2Pq9WXxYAdYbgo6tptLYml1+bRV1kkxfbbQX8rovMsAaSByNMGfaJ6dQAG5+DVADaOKCC6idgqH3YMnf4/Vw7rtcYFvuN8bES/QQUwuooUhkTH3pfxaoZRAGNraw+G2XKBUVsNd0e31Al7E1XaxscP1SDUDDUnBcByHHXigABXpbXYtrgVqsMZ8qY3CLgJda64PM+2gpdcih590a3AcWe8xh4I42PlTCsT4roBxFw3E1gMagdoAea49KgR2z1Mh+w92vAmpcKCAlngA270sDXHDF5bcc4CjJOKdYapza0t4DbjGdbhodL0JsAWordtYlnE4IKu9bcx03BJXjZv09QgWxZiXAtkCtQcyAwcGXaR15x+v3fMvN4YCMa+2Vy9igA4lLliu3t/70lFxPYFlSXD3EWWm22DkxdoqlhhuOeN63X51sqQFqAQ1OZOlDFAC2TEzi2FaWmm8/0feNQ9EwqOW6pZqhAJ940nGzPnAhe7M5wpOi0A4OZ4zXBmmw6jau38LEnbULEAI15nAAqvHDu/s8MGl+6P3yaZ/8ajgoggnyEW0zQQ0rfXCKio5JWhY7FdiWpWb3m+eDq4OhQLSrnwVqjpd9J6vgird0v/XFg9pzwGWJolTkp6a3oA80WEABsCcLkiE8OaDmjLNlgUGreAq5limFDt5WO4qtqQMktoRXc+jw7ZW7PerxplQMq7fcDj4voMNywWGp0bdlsXFcM5YVj1lqp0Sfh0HfMiruvo6rs0AtHbu3YciVQIG3V7r7vT9/dha9dgYcFpgttPYYpssSZxSd+IT6ANSBJNj9/f6mzTlCnETDeLbZSoKBhlZ0SL+h/fJJ2MejmeLVzOGHtbWmQQwPQsIRfb6dt8JK6LDOWMOaut/qokBY0hRgW5Yaz0k/OEiCW0Y5hi8CNQMJJaKhGBU3mtQGNdMhEw0pDNAQU0ApFgltjlzagDvLbeX5klg2BmoIsK8klUMBEfCc5FAOXzSwuUpMvnNZarE0M0Dt21ZzAj/uPvAlFnzTK9rAegs9Jdcs+RJmMWDzoQyfxT4ANd0BjnXgghd8hpg6G9QcS0tnOLzhA9TkfsuL5ivFsjqGTgE0aE25rihVgK2zxBZYsYfMLmDpdpKmTWe3fQpDK5UWJ6X4miemU5d+TuHIeDNMSV18aFttbxH3V4cA2L4baKTNXFADxLy9FbqtBFtSQqJYX+uCBX4Bveufts3YUrOLj+uO9G0oUfeb384hnYv1Dd0ycgBqcdO/zn/JPMfpKdYf7cVFx8UMNRJlfKNnaItIg7qllfZVi6Uk01KVmdWO+9cA0vvC0hbWutRb0KCGlwLaOMM/WTdVP8AFK0JzkXKhslG20Ef/Jlcc+8p75WNz3X0+WmgGNBe68KEO1xdto3GyLAhqttKIYWPXBrWw1DIBBnYMoHg/Ftgn3kXsmZiA57iyS4AaXkDI9eZCkVIwWXzh+8p0VZuVhXfW8WbnbhgtpYMz8HqHwQIxPsPFCLjtVeiQ/ewSQLt5KFCnAptB6AO3XLog9dzokxNxugAF87Nc8CCo8UI8ADrlvHQLS40J5ADbuk54DrDZhYwVcnAJZ05tc0yxyPccAvj2ndlFB7BLwaRp4u085xaO1tDnjTgrLYCe+V5q37ZaiGcoWUUZqewC4FVEpaC2gM2ut2WxdcaaaWbLjX/jZXmur/EiQn4NDwMaCoLjai+osS2EYpMUQMOiym93yWClmJqZAGDnZNX1W0ZKwM3uZsydZlCJ0NeKp4UPUBh83a8WbF18Ulp0wv2ydU4BM56dQD3DSnNf+DeUpS/7PtWHy8WH43nquVYaY8estQVsvUZwnSeAjm65dsN99d/ZlprjaOuVtDGL4jLPjUANxRELA2I05n4PC5UCUi7hjCmAHDpSrDRbc/m3CPccq8T9ceIvdV6tQO0DN5evcrUd4ulaB2xqAFsD01nd8X5xxNVQELqazLWlmDpoqeFy4xW1ORZRBuK3ZJacYc4R8qXa5lhpoUnvD+92u2hCMmUuqXTwDZtSwTV3fJ1xTwU0zj8LDfIzt7JOZ/Q5nrcSZdiXRployd50aF1aAJtdcLb41plqAFsXoJjCxvFoCahlMElOtSoTTQFAzTapYMKYLUEN6xsC1gTqseb68XH+KalcHgid022fM/aneR3ZU0GczN/r+nMB/bRHfnU1zC1R1TJlgZqBiPa+yjPujxNevhhdAzvZUmMg1HGnvhaHCcT5ZlSf5SqGmoCs0VeuO53bPpVGtpghUHNST/qukSRDnzn5AcS7KARJtfAhfgDY3JcvGy7jTkmyESlzQ5FSYGugoh/ed4bFZcXAz1nW2gJ20C3kbLMMlJpg0m/JbJEwSwVCjXb6VbbSZyi25vYpMXgqjdr9DGWcYbVqAAn0WYAKu6fHFxrMVTAhGqxadD5nPXdbzZorrLVloS0g+8DtXOmxjjtmqZ23Rlcb6W2taKyn93xTjjAKqHF5gjsEIi/yaJAJTwXD3HYWqEPA1u1rAVvHtkJD6CAHz7sGuNkiplhsAZmOa+fsVct8UsIAnRGf9qjHSxXm0uCz1nOAjVjaF1NjTC451ae18HKBKKhLAMGKQF8OmGPxS8bewjO5lr02zQw+jjNrADuHVqEDrrd1imuu1U6hBTT4TpHVoiHXYmsFwKAO7XtrUDsLP94D3hTUKczubToHzokDIVBbFtyaOxeiWO+qdm73eLMonsfprRe6MriJpT6nxepz6RxI5cBcYGvXG+Nqy62B7cIwF5vs7yvroE5dsd6ucyDCAQa1zzrHEmUayEeuuJTQq1dw6vvKOqi7qHYOVORACrAtwHNMPb7IZKLKZ6lxE0oHdcUF7F11DlgcSAU2g1sfyfTF1HxNcAd1l7/OgQU5kANsTVYo++0UweiCd1AvuKB9qM4B4UAusMVaawttxdTSNx/nlL+5AKXH1F3+OgcaciAH2AB1jqUGoN3vsSKtg7rhgvauOwdSLTYD2rLYU1acrkli7nZL3WWtc2BhDsQsdhDI4wsDGNjWbSrdUi+8qH24zgEfsLnoxF1lZMTW3VJ3+ekc2CgHNLAnsJI1TomptevdLKbmW0/coCd8MmujMhEkC7e/ukYnfjLuFPmfSnPIFU+11M2z33zZvtzLPb2zekHBml6Ih6OeF6ZU+C2g07u5P8oC1Ll7PSawGB8XY5yyUrm9Gf7odz7H5p/7fcqpLg1wnwuuL0qYnf2WxcTNJriwEAvqAF7xTR0W41iY5SpjEeg1lEruotZsjzU44L+8eOHHXsE6YAfefTaXFhlfeC+XQfK7yuXd4Esplblz4OefhuFP7IV2c8dLvQrJt0+tx2+S/RbX+/O/39xYP7787dy/SagWsthrKhXn8X744P53Sm0hTwGAFv7LBRb/bxj+OP6Pb1OR3y0Vq1epL6BU8CJECPh0dn/kf+nbYZYEtdDOBSc6SXbw925fZMIv4pPnq1tq1hgiUAA1rCastvwuZXKKVtyCUjm4xmmlG194DQ74tgD/11AqPMcDL4GUa67cCait912lyGFqm5Ow1JiMCNX3v764d27hmmG8P1peb9vSDWSBxviOrpmaO2WhtqBUhE621HizivBCfj7/9bmpYsX4k7cmuVIJiUY3vHXilOcua/7r5z4cyzUo8rI6Od3Y0gW3YuqUJNnilloWU1xgESJYaryk7tO3r8O3T5+DL9dLAU+sDRZWXkKwplJZ2lMBXxCCAMjyW5Sp8P/rx09D6ptWYnz2fb+mUqnlKUqiTN5o2QrU0n/qhQirxtT8Vg8NagjVj7//bm4p1lQqIddXQJDrBuYCa8opSF7jx499WP/r1wRq+fv/DMPs5GiIrjWVivbUxErL/F1OIYP/YkXv3+xXzuauidU+5HrHCk8WsdR///23i6PFtXJu148fjpH8I3eHI4kh36XcSFrCPP3+LyzqkkpFWyooOOf+Ng4/MH/hMUAt44L/8F5a8x9ysIRSQRwtY/31/V+XpJX5C9+x/rnhH9xv6bOFtU7ZzoL8L26p2TIg2w23T4MSmeGaL4HXY4Ce79+/r6JUZFChAbEshFpA1Tr8QCZY+KznL3RAqZa8nCFFwfL4rZUKJ8Tc3CRmH+0IeI/fMm/wPzX8cC+Ap1fK8rufU3gRazPHUlt9V8t+HxR7jCOxVYJ2lBgOb+xw1qpRsobfbMlWSnsMJS/804zUb9GU7zkxiL/xXEtPBe8+m7bTRlr49cP8xhRxRWuHAVMlIY0NhWYJYWlcf2BExrGgrOQ3e4mw0gd1C2M4EvNUBNRv1/utJljKWsDmeFp4k7qdNVludUoL7vjsfWoIEiwAGAvBZk3NCyjCVRvUiKEh1HC9aisVJ7jI4jqJfRdXuHosyNpjaeGpoCxUhBnCy4U/QkNr/k/KnTLcUO54M2kNpYK56tCO5+7zUlhOUzxFtqQAtsS6NYDdyvWWORaf0oKbhewuxy5ikdzPh2H4/u/eBS7VyjEXhrU2aADoZCsD1rqGULMl0nSxInNJmY8fndW2whDhTw1PQWgAmDDOAahHpSNueCv+gw9WvbkG9eSxzFDqbEiYt7DIkD18p8EvNGBtUngi4GMriu2mucD21X1b21mphSdSjFJsqTkRgziG4ze4mbDUTnP++F4926qzvFOts+xJNlAqHGqwsADEHL9xQlBIEVfPCj+4GirmDmpFwkoGlurAaxor+ETAW76cUL9rDXRCyebOy6fIwX94YWws9MsYWbE6OSwM/yxrDWs4B9ibs9RWTIMFFC3I1hvMrS1UFqB1GCB/i7IRmmqMz6BmELH255gWisUZzJ/v2X4OPxjUwsNU5XdgGcfdBh57KlP9tY/za8zfB7ajCi6KqYX3tUCts/ra+8I6TL/HwhPtFeWEf4h9tbWeA2y9Px0sCdXnqhNKREFblhUFc9m9RHZRXO4f39/3RmsBigXKB2gNaljOmgLNwJaqOE6WYXwH4l+/9nuj40EKVDaxgHOm2OeqWkDiMdntRlsGdwseME28lcTzn0KhDx+qgFrG+fT50/Dly5fhv//7v4/klb0gnZCEkSlVLtpayzwB8pIYO3b7Se45aqxH9lsveSEPkiK/9nvS04moUaCxqDUBBRoABhZoxFQM7BYCHQI1l0FarrjQxuWxsrcvQvr1P1+zBF9v5TD/EdszP0qF2WeZLVCz8pIDPLw3nOp9hMZznsmnjyaohR8ALtafFSpCJaEpxAschtF06K0nJM04hpVnUt3xua53SuFJ9mt3DmKoMW7TMSaYfHQcs8LxP04O8VYGWwcsTG2B9oF62joZ90pheZk+TdP//u///vn27ZvzbHIFn98oyqBmAYbH0EKxSt++gxMAtbSpxX++eENvxemYnnchOIEbCgXE+wsV5dQENveV43pDfvTprCqWmhfUaejxeCW7fyJc//zPP+6jb1+/TYUQ4hrVWGic3bVADW1dYxyttbGlBTdQJ890tpVBBrdYrPW0NTZuiZUccGELBT5MnsrHDwdxPM8Dns5c/lixtM41sEIBMEvm6kKuMUbWdEPBcR4ByTTtwfkUnIuzP392XqelYK1CkRKL7dufngCrLxc0LhtsYqlBgD4IDw0NKyVMkh8uBqgZY/NNKzIOJ+u0q6tdxjkVVVwtxvvinPEGmEWIcBRz2m4aiYGrXCLk0gXiSB4XYZB8phNk4u7LGgH4cy2pVXwDUE/Kdty3lkQhu8ipCsVKTjIwOaa3+M9KFvKo+S3rybs3vq0uy1oLDx24xwSW/I1DGpY7HnO9S89R6+2sbPf70+d/9nXeshX967uLn8QqiyspQgNGIs6SBRTm45lcV1NbS1YqEFBOTFm3fHBtOuhLFSw9Pm+tsKcAobVieQDbgfHTpymRNsc1duvw898D8hjUEF72Lv7zf/8zgTon226tgVaqWAveP8Za6HAkZ97aI9GgZiXFNDCgoVCxXuCNk4tf+12S2Narz1ozsB2oX/fc4vdiAeA1XO8mlppB7YT0w09XdysuaWmM6ANu6HOhQ5QKfgAqTtrJd/L53//sbwGRpBR+aoJaKxf5WwsuW1YRoBzB1nzQawBwA0TsjiMUgtJlfs1RsELDx2G/06FzB6XeR0h5yDyYXkbrkM0AACAASURBVBgKAHbyBMYdGPmb96fhVSFhhkSlKDpROqnFKAAxaD16Rc5YwolsNM/p5eX9r2iWO8P1nmWpD4QJVuLjX8Pnj7+mmysdeBrehaUFWoDNWpmtldDi3NzxjjT8bYEuVbHAQqE9gAQa2PU+AuPHT/tbYX7+yNpG5H6OAI0vf/47baFpUGP+tXYENA1H4K54Lxn4rZXglCD79NHlD6DA4SlY+9jCF3hKougl3yM8yVHwPjccYPddM/T0FAZ0yPWeFEjkzRzSTvrJcr+nxfz578ExSpQ+IjFRM3b2CTSs9K8P+9hdrBW0MVsPbG/UUjTggSgyToQBMHMURopi4TWY2n/8a28xx3BIx5cQ5Bzh9dHiUyoYG1tP8ry1p5wyx1gbpgHrgDn7im2sxF4uoIUuXZACME/AGy2sBvfD/b5FrBRU98OAjrne2aDWwjTtTY7uF9fbzrFEUWFS4HV4HsZ6c7GC3/9TbAVzhEm3lTAkZKVjfad8bylVFmbhe4v8BWjT+RR8PnlKH//ah2NjqS57UDUUioznUyoC7lgRD7vsc5RvKL4+AvluGABoL2AjWW8GNsuJPp01C9ScyUX9N1dY1VpAngAWk60RtjG+/8DVnYMLBWpZ5SPgIkk4hh7TlsloKeGGzomXQ+Dm5BjHiOBD7eOUofmzVwQF//3nB6dUJTmn6wZqyIQ2LJPyGL01kY1YngDAjrWLKdkYsBnctVzvmKWG6y1jJ1k2CNSRMEkP4151K2GeNPRopXUyTITJtRmTdi0ut/N5KlMsPQpWc09hVCg6d5B7sV5MaK3vWanI+KhTmNr+2icmAWAAqFYNuKXUnKc2Xqo4fPyrqafGPPHdMaYTYPIMEmQtXG8rSZYFahFYKzbxFQaUCI7vGSzokTDLwY2fHwaxklyuWBvYDGrOMounghsrYalqzlt7K3oNnE4d3d3WhzeCin1U7o5eOkgCeamh8E2lMjKoVhIwZ+1i+84M6MmFjhWYqEMc03OBJBnc7iJLDYGCILELVpJ0yGGgF9TjFgZ7EK7fii8P0LHswVjjOEspNgY1AxqhQA03N6ZYrfVnWviShhpgnjw1Z5b3CVHtrbUYM0U+Q8AG2BjQpaWhMdcbY+FVQcnuN1xLba3dHuHHD674pNYiWhZKPrNqjuUyBp35Rpw512ILoNmltsbnu6X5mGWKUOS0YVp0NRXm23oN+EQUg/sA1OQ91FL2mDtX6On9cQC71pipa+MDNhegeN+JFbPcgeOW+lBJtqXWEzy6+G28irWlpQiBWlstBrl8Vyt5ZoEaJbIAVktgYx10JhfzbS3QqPDS8qD5zXvl8u85/IenBOWqgc1jbQHYwhuAmPmUUnDCljzH9S6y1CmgXiJZY8X0IjC6Ftras54jWAwm7X5zTTVv5yyh4KDMBMx8nU8LjwlKVX7zdhXLxlFW/MOwrzb8+m0WsA88t7GIhy31gVJZ6NYXjQl9VjoG6NSCE5/rXd1Ss9VkN6x1ssbyEBisXGeNuAslhK1ALccntSu4RIzLIJN/83xbKhSsARfccG0Cv6SwNqBlnr4QQOY/lYuOiGotjynAru16Y0x9LTC/ejcpprbiCyuua+3+WS64BVY+RSQ01bJcoZjeijGX4gePDQVTQ4mF1h2KS9dO64s0avNAg1rPXQO7pYKz+KNjbNOl1lcVzch6a9db/i4GtWWtXU3tt2/V75Vm5rEyEe3Mwmudcc4FtPThe8ZKEvLFgjoLv4TFxik0sYryI/yfmyC0hJVDkAMgffwwrTcDGjXZtUEFbwwhALwEzjMA2CIfX/62r0EKzXHud7Htrpau92xQA9hw/YSBS4EaAAKorRs/S6z0dLGf8aZMH6ghBCxwfLNqbcHGeDg+KHxnQLfOb+jz9FLNxnzDGepchYp5hS5z4ESZ9hI0sEN3m80Fru/50OWCeCaaNPNkvS3Xu6qlFoGSxeMLCpYAtUyC3WsARrvc0q5EqCCcAAofTNAxvQPSv98OvB2+shaucG1Q6zPinAHGFmPLslEN6unFBuMNJSXKlEHC59atE1rsKVi3oUxKNnBhYStQ+85NhwCdm/UOJcmKLTUshCyeBnWr0znWosv+OKwEf18CZigL+Y0SSCR65DMkhnj7yAI1vBfOyDYBtZw4HL0JSdZxpVureBo85iOoXMkn/JIzyqX85zXQigp96lyOxVtp47zH8az/EjIptKdcWTTH9WZLjX1w3p/G99kxNa70kQ74pgv5e85VQSmak6/WFYHGjZwAXal1ZmE1ixrcAHsQodgklACazvuOGdkaoOaD/Xg1K65khiKauyecsgb63nF4BrgoY66HgDvoQAsrUQG29pZ8vJV2OBY89wBHCl+kTShJlpwFn+l6Z1tqfuUOEhVIBrUGNV9+z7et8CH5ORYCVkLmA0ERV9odXhjfbwwlEkuATZZiZuEFCxNuIJXPGMzyt9BjXeWUKoyp7Xhejo7ximhHQ+DCw9T+AWh9ywkDG0mwWGizNKhLY+narncyqPWLxLn4AMxt8TZFCMPRu6xQ1PDtm7OcoKcGqL23bIyZVKEJVyOFrASSh3NcYZ38w1FXvvkSrjBChrmW0gdA9j7Qhi8brOElyBiWVbVyGUJDiP9O0Y233sxZg1SFlBJL13K9haZi9xuuFkADdxuM50IEyTS2EqgDt5te7cJx11xAw1Jb/XCM5sKOSJ17LUutk3+WNWbgt8x6H4xDr4TVOwKtAKRj6WRQixL++jU7zEwFs7TLjaXRt/VCeauCDO31xYZWPB211JyFFGBrLbokqGV80bwoy0R8BfdTftcAtm8x9TuYQ2O1ALVPiJcAtWUpOcNda74xIPGWVYz/S1rq0li6hesdBTWslwVo+W4JUOMVpgJolGT6tjmEpqWSIiEBZBDMTZJZ23d6bN4jbmGVDlz80VPSawA65843BuyU76dQYcyFtOAJ6KgdSze31AC1zwpCc4rr3aqKiUEdc3tTFnyJNuwqzvUeUsDCGena7m+s4Ib5GarGW4LvGGMJucRYKS+9WyqWBk3RWMN3TSszsFU8LQk6XPNb8t6pJQVJCzeytEuBWlfY1Zq7TtZtwRLH5rYUqK1YOgnA6hz1FGMHbjiJFZwwT5JA7RNMfgOEdFpzkx/vUJJ+axQ1xASh9vcxZZg6XqqlbgnqJbbLUvmR0g75D6sqMOX51Daphze4P+9+dYX96SxLHQS13JE1bjHVBrVY6elle40PiqQuZGo7gJr3vVOfzXFpubpr7liavlO00s4I/PXFvTihZUVZKqCTLHdFQMu8o5Y6JIhcXD/XzdSCzJVdtePEEnDlPJNSypjTX6htq7E4QSfjn4LbzXxqJZsyhna75TPrkIbv2KW1nqHX1Oa43lVAzTd81gSf3het2XctQPn6sQ48tKK/5VgpmffWvCztH9WALcISKzmWZJELzk3rt2qi6IQvRdA8mm2pJ1CPL12vKbynCmy2ntP92L/q3ZXGi9h6rFMF9gGoK8pmLDmGtUm23JVd79mWGvW1+rYJ6bgWuLUbeAquoK6RdguN64Qr8ka6XWIsjttlzJqhVqkljj3XSjaXjqVzXe/ZoI4xtn/fOXBOHEgtNEm5wmiy6AnbWNJW+vSVhVZ1v89pwfpcOgdCHPAlx+bG0rHbQgFo/A7F0qB/VkzdxaBz4BI4kALoVrE0W2n5dwf1JUhcn2NzDsSy3QzoJMudkBwriaW7pW4uCvEB7m7vXJHE1dXVvvH46/HxcTEPags0+Dh1f3f/BzxBm7fXt+H55Xkx/pQC2gf00lg61UpLuyBzZMG1wMlDSwqdjGct7vB7GB6flhP+OETTWwBIT89Pjv83uxvHZ/y/BLi3QIOPY6DtbdyU3e12k8ITUAufwLt0rue3bAnoGqexfDMyQa0X/PbmdhI61pxLgHsrC5wvEulPPA3Dn9e7+8la/377vbfeV8sp0C3QAI7Jmv/+/Xu4fXkeHF+uhuH15XVw4HaZ4PbADgHa52LXcr0nr2TMeOdY6ailRufTgo/uoVjJpQRuCwucDs+ylsJfeVIEWIQZgF6Sz1ugQXMPnqKAWAD+tLuZgL2EN1O2mus/FY1NsNhC6svtnaP46hroXs6SnPMCM6BghQTc17v9Gb0lPKIt0GCBGhYb3x0pvoX4sz5U0ynIAvXzze3U85ICJ4OyxT63BYYnJALMoJa/5efm5qZ5/mALNFhiy0YF3szr66trKvy5f3sd7mYeTEqHy2m0jIJapiGMhZWGoMlv+f/17TWpjxrsONcFlkQg+Inf4oJLDLl7ehwer3dN+ewSkSNImI4laTBdb/EIf+/BOyVsx5halJ/wRz4/1YRpDUxYfSQBElaSAc0LvqSmPMjIn8ECA9CwPsJXCPH19fUkzPJZ7Yyv5qVT0q+vbsylaLCE0tE1AhrKxoV949Yf6GT+1OZNK8At0W8SqCX7DUCDycJgMHVJTan3VU95gaetutEaAdi88NjmEl7X4jPzEODF+iJf8vL8MpHRgoajbcqRBxgUimWia9zyg/yxEhTedFC/S00Q1Pf3938kSQNQM7ChOQHuWgLn02RCi2z1aIEHqEHPqSywzMdltx3h4vvu3UwL2DIncTdrhDqccJR+AWrpX/6e6JHEKAG7Jg1w9621Zlcb+YWD3YDxIa3MO6gjoOaFR1N2va3FqCFwPkCLUoEA6vgKbpqAwWWMR5e15SILPXOqmrTbCyCJ0gKohZ+7652LdeXn5vZmVhYctQbS1wFYRrdWf4Yty5o0YC5c96ATg1g/xPZO0ZDSY4C/vLx7E6ny55QpZcyhYFobJZ9st/j8yFILwzEQNDcqe7SlnrKzMwUuNDFdbQWLcgDucdFLFrmEqQLKOUoDcTS8C/kNXgqotYAKsOaAGu425ookk7aKoAeuL89xLg3MZw1qyNdUUTc2njwHss7gE4Ndl5JOY42eEBukh8cH9/XT49NUpeb4/1Y/Z1EiWzWeOQA1mH1kDa+unHbHonN5o3y2u9nNsiK+iQigWdBk0QHqI8sydpKqcXXVXCozwaNSUOs4GuMKzzGnl9eXpFxHCs0MaFg/t2a73YHrzckxJ/RjCWvKGCVt2HNgeRJZklCEwwGAEjKojU7q+M6TG/f+OZTDWK3nnErn3HZeULO7y8CCVWnJAAYzKxgWPP4c/2bXLARubbly5lIF1I6hwyB1zPLDwipzqAlqBo94AbKuHEtjfGSW8TtVOZYKoAVq/gwARMksGxVWhJxI08aIaUM7LjVFuHYxoObtA2EOBAEAb7XoDGgoEFYqVgjAbhuAbblTVrIN/aXEyJYg5gj1wVbNCGptfVJjw9RxEU7xevpAzcqx1fqCbh+okZDTh1tgvXn9+d9aKck4KWsKeaupSFPXplW7JPebteHSoAawscgQPJ24sxaVCxME0Hd3d8PT05OLnywwI4mCTLSMff+wP2ghMRgLUY51d/2MBSbgH1dFsQfSQrgY2LBO4KPkIZCc4gIPC9Q1k0pIFt7d30ko4OQQCVErtJLPtALUa54C4lZA2lK/WaCGQDohbxBzISkGIHOiToOarbhWOtqyT8kViacQr+2uBwdylTCZFoe3m8ZECi9czvw5261dRAZ3bSvN9ALY2uMCqHltsaMggINCa3E6j/MasvbiGjOgkQPgXADm1JJXWwJoCS1eUPMis7U8yD6OI2Lx7+/uXQKm1HVjUAuIrfPGTAsmzFabrY0OIYS227v3+nWx2vzDyROtCKQdW4ocqyDzgoXk8ThsAA9htUoWM/YMKgN5XN4KPKJtPLgzHQWVk2Svr9Vifr3NBlBDmWsw19qrj/Hp1L8/AjXAzPEVM5dBM1nUMaMoiR+2RDmCD0YysOUz9KEBry0eAIfiE96ak36mOJJOmDn6qaDFF68huVKqrGQcoYeVAgTXAYxpGo+1gh81T2gdXcYwglTnKSADmLcuiKkZIoii4bVj+ZLPWfa6dU5TNyao8ShiPV9X+B4CisXHdkmOi8pjMIBlCwKCzUKpXW4uYmCh43JEjqXd1sZYxSV9Cc2gv0QZhdhtHdhAexxKYK+DvYRaoEZVoKwZu+AAjoy/BmhAFyfvIFesBGsqkjRonG6rA1Dvbh6mwhPflF5fHoJ7qFKkIIsyF9gyvouzZN9yrACyrLWmE4A8qC02ihBgvdmtrg3mCbgjX6+H/ZFBFlYBkr7dhb2kGjTxuu6u9ttobAGhRNYAtaaNE3lcXXe6EFue8mRQQyABhjmuaM40AU7s6XJMz27j2/B+K/rN9e+ptJAtIIRZftcAS2weQSX59uwebw2kEA1Xv1/eK9kWPEIr8w7RJYpH1rbH0DEJs78/sroTs9+ep6NuvHWgY+qjbq+GfVb56alalZkAm4sP4Go7q0dgFsXDSSAGMSfTlnDljoR2BLHj1/U+WRfzesqW9PCpAzoMGoa35+aKxZqHCWqhb+TNUvypweOt9WFb6nHxARANFG+trUPRMEgmtyaowTRkS19/Xw8CYAa0w4oCNQOZAS7/bg1sVo686CiuWALYXkCDoAWVC/MgqPCItiWU3tYAWYMeB2phsjBQC6IX1IGREQ+2ArbPbQOgmTQNav6uJahT+SgeR8swwFIspZVXNYQNfYSUDdNX8wx5Tfq33tdkqcFoB+7xyJ8lADKhmAsu3y8NaokPre02WGU9J22ta5YLOl6Sq6sz3E4oxpNlrXITFnBQ930glI3p0ACw6GJPcDp9hQdP+H73tcDvzWTzOVofiEOfy94r9oBLt7aSYzHByO/3s7V4TltjC9gtrPfk+Yw7AXyE8IBnDQGllTRKQU2l3JAOH6hhPBjQB2He+4W1LqRrpfzWAl7LcaNH/BjcMSstIJrOyo6grgXolEwyM8qXVfYBu6Y7zqAWmhhQRzxs8KodBrQLr0blogGkLXbLM8W8foiVmS7my5Hiky87sJP1QBTUVk/WyR9d+SXFHbWExAI0C0YKmLkNA7smmDlm1PRxfgICfFAV1/BtHKyYtcU+KOKRyzsXvCxAe4NHCVn9nrEO7CRgZ4Nan/iRUTjZMxWf3OyqCgisX9KsEhoJna33iGElmRxUdDGw2Uq1cDNRew46dAJUV+fJ37U8rNBSaC8QfLByOagyk98teJQgMifTpBjUmKGVvUUlGMoyW2Z4t87pkOByGS67nLUB5bs4kkHEoAFPa9Oh10orG638oHxY6YDO1rRtXa5C9GWBmq870hZaD4JKMClEaXnyaOvMt6wkXH54NXwxgPy79s4B1o3rvIVvfLmh3kqqTYO1TsIbma8+MCJ0YTeCPRqc4pJ7xlrUQWxdllLpSwZ1DqBlcOsQfCpR59ROC66Ah+N4ThYJ6OSCwdoVeXzkEsDm0APeBJSL/F4CODqUs8pC9U04kqupzZ9zkjeZSzKopTEDO8WlhkDLs5fqLuE2D3EhfQcU9DW8tYU2BmoINeiQd3ctYalTQA3acImC7O/X5s9FgxrAhksUAioskLRtddvoKSwGhBGZbl8SSvjlilSur6oLLUAt/JLxfRn/iYaGxUO8ZkxXjDb5nkO67n77pT/LUqOb1Bs1RUhwTtYduF+wyGELgOezwohZQ5lbd7f2zU3V20UmMIyAFhc3tI3XertPgxqJLxzYCdEGBVnz9pUtyEltGopAjZg55lbD/bYqz859WwIXI4iw8h3bKaCuVROOV/vEvAQWqiVAffDKoURlIzR2UKfBvxjUad37W9W8mXIuLbWf51fDIlRBgspniZAQQoY3JWcRopuBgwsRQq63C5OUZ9VC8ZbQBUAjlOvVZWGJXQ3UtYG0pf40qFNdSye0442as0FNVxID1LHqOYQLLXMgfFVyKl3CF5dwHO/Cq3XF05ZkpiYtHdQ1uTn2pe8kk49jgMJVTchBzNkt0G+6iFlozpW4+9oavUYJ4GSWpyiviTfjvXItPIgGYrBalx3UlVmPjC6sUGop6uR+Vyiv1UolplDAAn0nXGXWTC80yLHQcL1deS1dQlmbtnPqr4O64mpiTxp3aacC+iBmHF9cV2qpuZYg1UIfgbrBwQl+PfKW6Kq4/JvpqoO60lLoIpMcQGtQl7qX/NqaXOCABrx1spQGi52gS74r2Y6aPIgGyqbS8m+qmw7qisvBd2unxIo89NzCClRn4YrdXEuPl/dJtZb81KrX55cqiAtdRNfVlatx6JVkacLaQZ3Gp6RWc0DNtfKl1VJcdjkXPLVArZNjucoOd6K3vCIraXFPqFEHdeXFYsuUI8B8qEJIynlWTyG14k8/x4dL5ozvY+kcuqRPXAvVgrbKYrBqdx3UDdgPYOcIHx/DxFsnS+Na/c6s1H5Kn8th4XTdVcZlBzV5k0PrqbbtoG60cnAbpfsUVxjVXNOVPjPr5BmgKeOzm+xokJf2NUhMcYiQeotJbd40WvLNdNtBvZGl4GOqa9XKI64/uDtt5E+qtW/Bzi3wpsW8WvXZQd2Ks73fzoGVONBBvRLj+7CdA6040EHdirO9386BlTjQQb0S4/uwnQOtONBB3Yqzvd/OgZU40EG9EuP7sJ0DrTjQQd2Ks73fzoGVONBBvRLj+7CdA6040EHdirO9386BlTjQQb0S4/uwnQOtONBB3Yqzvd/OgZU40EG9EuP7sJ0DrTjQQd2Ks73fzoGVONBBvRLj+7CdA6040EHdirO9386BlThQDdR8l5SbixzyH4ah5dsU1hgztE64PPCgTYOLBlaSlT7siXBgNqgBLNyuoa/EaQHuNcYMrSfowet1pjd8DsPw9vo2lNyieSLy08ncIAdmg1rP6WkY/rze3e8/lhtx3n47oZZ/t7Laa4zJ88ZbOW5fngc396theH15de/Fkh8Bewf2BqX/TElqAmrhlQj3dC3OeN9WK2ALqJce05IHfguFAPxpdzMBu4XHcqYy2ac1kwNNQQ0L5S6Yb/jGQgb1UmP6QC1zFUDj50i5Nc4z+OTh9nb44xwm5zEN2et+6s/PxMlJPZ69uLHZwRUW4WaAyd/yc3NzM9S+xG6NMX18gIJhUMurZuRHeHD/9jrcDfmgivH9IBy423suOT9PT+803Z348znzPse21UGt37gIF1ziy93T4/B4vRty3zMVYjy/C5pfri4xbKsxva73eK2uvo1TlJv8L/SkXotbKmwCSNGfz8+3yV3c3j47Cy7APvXnkyd9xg2bgBpCLAIMAZe3K+DqW/ks9S5qH+8Rv+J76VMsYssxg7SMgIZFlt88X6GNeTB3/l5a7oY/T08hQF8P19dX7n/cMS6v+bm7ex5EGezBfbrPPz+39YJOQRdUBTVbaWzvMBMgRCLcpS44701DYcC1xwX0Ly8v07A1xpTOjvagf+/dafxAmUy0yIX4gpDR7YYL7t6zfH09W6mVgxpP7sG9210Pz8/PGaDOf/55uBtuhydFcvr4d8PV8CRvFjj4sZ/voK4U201Wcyw4kW0sCLEWPhFoAXyJC87ZZekHoJb+8J4ll2X+PQwM7DljToD2oIhdbeQQsIXHcghPAtZ6PUvNE7kebm6uHa/SLXX+8zaopZ+08W1Q2893UFcAtXaDLVBpPNzc3mTvWXOBx/RqmtHFPQCT83v3e+J46Zx8VDIm6Ob3P+nkH0CKeN4pl1Gx6C09VjQhpXZ/f+8SXdjXR94gxbuRmDjsPit7d70b3iR5l+x+5z/vB7W89C4+vh/Ux893UDcCNVtqFl6ALAdg/E4qEScknLSFRAwLN5gtoYybM6ZWQhrU2u2eHFIBNP0A6M6mENixZ733zfcPoE/5/fD44D57enyaym1dm7d4LiIX1GIth+HNC+oQIPeUh59/GHbuv2P3e+JacPyb4fdwPVwb7rf9fAf1TFAf1V6PfOZE2cvrS3HczoBmgEgWmV1vLC9i2BaurfW2RimJ3d3sHDA5BABAdV5hChG01lCKAHv6AmL8oP/Y3ATU1097KPmB9D6ggMZB8+5lSpS9Pd04IMl/Kf044Knn93BP78PyFCbaEvrB8x3UM0DNW0naOkGYRYhzXufqs5DyObLHHEvL53CH5d8AdYqbGsCV+ZUFanwGSytgRFkseMAvu2PFxFl6DAhlwOWlrnBnzEOkJNjyLfV+9FL3G7SHno9b+/D44n6LengY9vv91k8H9TtXiqyozkDz/jBbzTlWWvrh155OwKEEGYMalrvVPrAGNWgD4A5eQeuI3SscdtUttz2FR+IRSJcpbc8V1MfZ70Nod1BXAjVbGG2ZRMjnWGn0zcCG1QKAJfGERBVbRMtS5ySbTEtwe/eHD6Z4QT0+jBCE+wKNKeDM9STeLWZeoizF0qbQ0tLS54zf3e8C91tvX7FFYktUsxyUAcT7wAC1LDoAA7f2/mF/Ukwnm+acFMNetfQhNGkrzR4L80LoKNnCSxFm3WZORRiKT0or0rbwfAd1Jqh1JprBxAKNmLBmbIvjjbydJXE2rLcWbk42AfDSfo6VhAsOwHKsi/CAwVy6H18CZn4mVrsN8N09DcPT3f5J1NEIKFo/j3FbjT+Xf6f+fFZMLcDixNSBhRzLJOV7bMnsdrus/kPMPLp8YUye+baXoFh0EcwcUAt9UC6YO1eN6dzCUtbZ4pucqsoVTrZyp/587tzPqX0y6KztJXaFYUHZch7UO48FGSXWWywk4mhkv2UReMuI3W/Z9kEMLe1KxjSBcnPrgDJZ/t+H+9L8zPWwr0OPxfpLCdOpH52cS/9SfN7COMmg3t08hDX/m5z0eT8kwIAD0OV7iXXlAEFObBsd2+2JEojGclUw+O7uLntMvTgpNOyu3txjE5Ab0JEiNDH32eqjH71M4exptEkCdYpAY7o313LU53hLx2Wpr6+GHICFxhUQO2s97AY3pkPTSAXX/l/JHug8UPvoOAKxj4bx87l0pIjUnERZP3qZwuHtt8kH9dv7rR6wSmyhAWj57ijezQDYAZDGMdmVtcbUGWdsQc0B0xGglUcyHd7AWqvTW5PlHudeM89giVd8n7ofJWEyUAAAIABJREFUvdw+LOdRGAX1JNQEZgaU70QSkkYafKkA0+OmjgllMp1dzlAkUZfbB2iq3+Yabk2D9L8GqKXc8uWg4FwoST/6aImYVIndX8vlimVHN6WQ9ela+FH2vMzp7VrugDt8vm9pJWxpOXCRpRRwWTXMLMz8b1gqyUYjEx3LQDOgj8CsJIxLL3lcWHWMGxvTEly20le/92e0D5QUvP3fvw8OZECx1KAhV2dbltoG9R7YpUcv96WfL8XPC6gfht/Fz+/ntDt6voM6A9ScXeasrgYwBJoz46OFcqCOgUuA9Pry4I5N6jEnV1adarKUSM6YPkA7OsYEoYBaZ7M5xLDKQaU9Dp9I4jA291wAp7rfflCnHX30WWo5MJJydNJ6fg9quQ0mfvTSeh5z0s93UBeAmoHFzLbADRC4QpDEN1X4QK3HtSw02iApJ2NKu9jJphio2UrrthaYLTpqbavFgJ9iqQ8PWISPTvoA+X56K//5wwMa+c/j9NY+pDh8voM6AmorrvUJlU5SOeduvJdMst6pW1gAtTyPgwzWmFYZplh3hAY4MVUCaGfl4THcPPwBqHPpgDIrVSwxAOdY6r2z7T8KGavdjh2DjD3v1hPHPA06Up7HfK1+nu9uXVVcB3UCqMUFBTP5JhGfwMHlxCWATph218mg1v2mjCl15vKDMQFo+awU1DXpqEVDCsh9llqePU6WvfcYA5V24fVxytjzmnZ9eULu8/ryhH5K653Dwey3WCu2UgJYOXnlAxon0QAwuUQg1UrzwsNKp4yJceWAh1MqN7ukW0JSQILy1JR5y9gtaEihE21S3G/bwqfeJrp/ugao+Xx0CahZSXVQJ4La5wJbQOOMuHyPGvFSK61dbz2mTlphTMTT8mK6uUc/c2hAUg83lEjIUYOGHEBL2/g+td1jLqh0L1t5vrvfCYkyWCosoi4o4YSVc7URR48vxUvdl9ZCguOW8nnKmLgDrHQ8S9RzaZgUzYy98VwQH4Or/DL/LRydFLGZc/SzgzoB1LDWAhqOkyFMsFAAnwAQJ6Tku7v7/BJNViT6VJiMo8fkveOS8XxAwlHLpeY9F9Dsgof6mnv0svXRyVjteoz+Wnw81X6iFWUANdxfTNSXmWbwwyXPTRTpeDo25oG7P97omTumtYAcT8doqDHvmkJ06kcn59Jfk5en1lcxqDFRTprBguKYpLTBbZs5+7QWmFqO53O9ZR6+gpEW8z414en0bpMDWaCWKfiSTzojjnPPzhXPPEvN7vcS44WsdGjOTmld76YjqXPmvE3x6FSdIgeSQJ07MQHldJjBeDjHaqeMvfR4PiWw5JxT+NLbXCYHmoD6MlnZZ905sA0OdFBvYx06FZ0D1TjQQV2Nlb2jzoFtcOC/vnz5MiV6vn371kG+jXXpVHQOFHPAgfjjx48O2J8/f3YddXAX87M/2DmwOgcmywxgd3CvviadgM6BWRwwQd2BPYun/eHOgVU5MIH68+fPU2z98+fPiSjLJWer/vPnzx6Hr7qEffDOgUMOHACSgY1mAnBfrN3B3cWpc2B7HDjIfmvy2GL7wM3Alue75d7eIneKLosD0ZiaLfYIWme5kSHXoO7AviwB6rPdHgcO3G8LoJw0A/nfv3/vwN7eWnaKOgccB5JAzbxCfM3A9imDbrW7lHUOLM+Bo8x1CKAa3AC2xNscfxuxec+QL7+2fcQL5YAJ6o8fPzqQ4rePN7DaiLVbAJvLWEFHr3i7UGnt007iwBGoZVuLAc0AB3h1zwB3S4ttVbwJHR3gSevcG10QB0xQA7wWoH1WfGlgY43YW+gAvyDJ7VP1csAL6hSeWS66gCxksefuY4di/n4gJWXVeptz50C0oiyVAbq0tAWwc5J43TVPXbne7tw44EBtJaOsiYYSYWiPNiGLnWutLfo0LRZt3XKfm7j2+aRwwJWJhqrDrNjVlzCzgC3bXh4FUbTNpc9+674tD4H31nMVSgoTe5vOgS1xYNY+tQYxTwy14j43fA64UuJqoYUVCgN7VEpFSmVLi9dpyecAG7H8p0/jCVOwU2NXmSJnn7UFB7Ataz0H1DJOCo0ayFaGfi4dp7HMnUoOM899l8QEdWivOhRX62KUEXxOomoDOwXUOnQADVa838F93sBHXkZk4NzX2uuC6ksT9P50qOpMW29YcCO5NcsFzgE2exW+8tZzX+wlYLtF91ZoQhjIa7xFWmusURKoUwYSkPMPgKPjbHVGezaoc5SNL1yoSVMKr861DazhltxbBjRyKedutYtBrUHMLjbXjGurrd3wOdYxFiZoGnm7TSsgpXxmKZsU0Fq3zAi9WwJEyjzQZotA0YCGUufk7Rz5y+HPkm29MbVFBIPEt1XFbXR7AXhtUMeYZSkf/UzteN+iyQIxwhKh8fv379MtNKcG7C26t1AyDGCdSzlHQItMRUGdCmSUjLJA41lOUOHfwlCJiUsZ6wOJFQYwTew5IESovZdOCbrpMkcNdHb5AWppgzgvdGHFlkC/hnvrK5YCXyxAC2/ZgyyVu5gR2cL33tpvDUhNrD7sYX3PLjmsNDOzFqhjige0WkdFLe9hrivuUzjoVycMY0dcdSy4FVAv6d6mVj2qtZvO+WsPcis8bKEEjkDNsVHIBbcsM9r7FEJtQPvGsRQOLypcMh+gQWeu0omBGe62T0Fa/AYtW4tZl3BvQ0CGYvSFV76tV7S/GFALE0OxcoyRcHHYQs+1elrQBTgWmK0sONPDVtK34NolSwV1Cph9Vlq7hYab7mLtJbdkNJigwJdyb31gttaNvRzIhT49yNWNLBPnCuzJUocArS2wz2UIuew1YhjLi7AW1aJXbVsdTYEtoiz2UoCOgdpK7rSw2j4gw7vQgMHnlqKfk8VnD0B7VzG5Y1p8B37Q5xwaW7jMNfucTmmFDnXE4ueYhUZMOIdwXSgQs44+gQhZ6dJ91hgtISvtA7Xv0omaGVwLyLxGIYXZwr2FFxYCp+Ylg9QX3lhyd85ueLD2OwXMDOgWhzdiikADSsdYPo2tw4JSQHM/IXCHymstYFugrgVoy73V2Xi2xMJT+Z8r8RjwNdxb5p0vvFJr5mhi+csBNZ47RxfcW2SBLRVfIkK7uD5AayvdojQPAhEDtG/RGSw1ygh9ry+KKSjL6miw4e/ScIYBHYtR2fXWVrume+tTzJzfsdaWPwN9HE9zyGDxnl9KEVubU/p+Fqi1i2sJiQaJMKeFdoy5kimAhgKqFbP6XjrIAPEJG1tKbY1K40Ht3jJofUILkMRo1s/nuLeWldZGwqew4UVY7UE7W2UYlRbGZSvAD5ZDhtxJK2YNgbqGe+tjms9SayBr+qzTWrVdXJ8Ho61I6AgrzzsHLKHQwHK3Lf4yqMVyxjw3TWtMgWsZYyBaSTjLBWcrbc2BPSDO4Mdo2wpIc+koAnUJoCHcNdxbniS2e3yWAp+zgPBhEwbdUoC2QMrWmF1IKCbQxu1ShdICDmiIgVSDGuNb4NNrkOLehspnYzRqLyKWvGOLnQuUU2qfDWoL0NoiEpAO9ljHdlONc42zranehM8KtYhZuc9YgswSXMvV1VYrxwX3gToGaE2bjnFruLe+I74+xVdiqUuUzSmBWNMaPY2k4x1eSA3mXPe2NNkj4/J+prXQLJCaZrbelouXAxgeO2QRQ0KSCi5L0GPW2qLJOu+eKsRWcdIc99aXd4hZacieL6ZWMhGV89T5n0K76GStzKQFhLXcW58F1kCB9YtlRFvErD5BiGV0YwKUonzmKBpNn+8ADLdLocmnCOWk2ugiu4MwMWXHMheKq+cYj9gabPH7ZFBb7p/PAlqWEIuEfkoZ7YuhNXN9ioetCtHi7lrTz8SsIMYsAY5WMuz1pCqg3JjVCgUs5Wd5PtZJO59Ap9DFz8a22ULASY2rS+Vti6CN0eQFteXe+lzVtdzb2OR8QrxUzBqjj8GradXAhgXM3ZIJbatZ1pDXWHtfvvnUAIx19XNKPgJtrJ2MS3XBTVD74lVtTXSMl5IRreXeWpY55q7FQKbnI3/HrHWuldZAthSMprNWzMoXMbA3ZY2XCuhRJqIeXwrvhZfapdZeg9VPB/YhV8yjlzkaUmfDW7i3QnJo6yM1No2FC5Zw54Ca+cbHN1ME2lBS7lCJtqa5MSvzDjGrj59WvkE+853cI8VQBdSgK+Rh+ZSRPKOvhLZ4WrIWp/bMwWKkHkyIafnW7i2Pb1k+rd21sLaMWUOuaOz2U9+z+rncmFUD21eWaYUAMUDXtNSWsvEZmFgGv9VtNqcA8AnUMUDnWrnY5HPc8NA+K+jy/dYKyKcEasSsbAlj81/j+1Qws3ewNqgNa+tlnawhe21L3D23xjrGxoyC2gJzKDGWE9emuJKnFrPGGL7296j/Hi2sSQ7WMAXQrS11Kr8sb0yevURgO1DH4lVtBdd0b3UcF3NpfUKBiw/ZKuHfsTha9wn+bdVSpxx2wZxyAa3XIxWEVruYt6jXSsuhngPk9tKAbYJab2v4MrY6SQamW0qghnsr/baIWUe6p5s/58ascwS75bOpJbW4+SWHltJtrdA9ZNb4owwcfMVyyBY7lvAtpTmHL2u0/a/u3tZjO/NSZ5rXtuIWoBkM2jtJ8YBKL2jUHE8Zy3jmaOFSAX2uYAZDDkC9xS0ZH1DqQbF+TxpAawI6ZAl9YUYKyGrdDEsus3lHekqORnuMl2qhvaDeonu79Zi1vlpYp8dcMNemMiWm5jHZMiNEvHRAC38OLPWaFiUmIB3YMQ6Vf782mEF5Kqh9BU8p2fpzd71PCtRC7JZj1nJI9SdTQc2Zea5clOetBJrm7CUA2oGawbJlS80LtKWYtUOyDgd8VtpXTMKFJh3Qh2twVHxyKsCuI0q9ly1wgAGtE2PapdZVYx3Qxyvorf3e2pbMFoSv01CfAzo7H7pZRUZP3bYCpZficvPKRF9lK4279a4vzL3HPQdCSbrSopJLBvQUU3cB6xxYkwMMbO1+WwUyW8nWr8mz0NjVzsFudYKdru1zIJYky612u0SXO+p+b18MOoXnxgFfsiwH0JcOZshEt9Tnho4TnI8FaKuENeR2d0C/L3wH9QmC4JxI1tnv3Hr0DuZjaeigPieEnOlctIXuQA4vdAf1mQLh1KfVgVy+gh3U5bzrT3YObJIDHdSbXJZOVOdAOQc6qMt515/sHNgkB45AvdvdmjdQgPrX1+csRcD95TwbosPXT4x2mUMODZhzyhxSxtYSoGnJ6WPOs761nDO+xSufxJeswSbRs1GiDgB6c3N3AOiXlyf3ve/z2JxqPecbB/RZNIZo4+dqzUHPNdavpiGV99Jv7NnY2Cl9pIyR0iZl7VLo7W3SOTCB+vb2/gDQz8+PB4CPfa+H1O3le92nRWZoHF+fsbFi3/vYlfNcLn94zNiz/H0KD+fy1TdGztrE5CdVHtJFubcEBxxw7+4eDgD99PRgutil7TCYr198j/6tdnps3xKm0i7Ph+jxjZfaf2yuTH8qX0vFNtZ/7Hu9PtZ6ch8teFQ690t8zoH3/v7xANSPj/feuDnWVn/PTA31G2O+r9+UPnNpym2fy0M91xhPY7yJfR/r35qvxVdfP7H+QV9qu9h8+vdhDjjwPjw8HYD64eHOC+pWbUNk6jHRNkTne5vDucWe9Y2V+xzTZvUZ+l7PK4fn1npavI2Nse/nXQ5CNKTSl9qug3YeBxx4Hx+fD0B9f3/rBXWrtr5p6PH2VtGmz2p7bBXz5pY635SxfbTMeVb3mdqXxcPSZ1N4lLOO80S6P+3Ae3uzO0ySvbx6Qd2qrbUUeixp8xygbU4fvnmlzjeFVl+blGdz16lG+xA89DpYc4jBK3ctY/317/cc2CfKbm8OE2XPL15Qt2qrF0SPI98/BegKLWisL+v7mICU0OKjI5Wnqe1Ae077WNsYD1PkKDZGjOf9+zQO7BNld4cFJ49P/gKTVm2Z3Jwx0qZ5PEd5LjRP9Ktp4fFSng/NCzSkzje1nbWmofmm9pvazrcmc59PXetLb7dPlN0fFp08PO6LTqyfVm0xVk7/ObTrfqfxAnNN7T+VZl+7kudDa2TR7T7zzLVk/FB/NWTn0oE5Z/4TeB8fDotP7h8Oi08wSGk7Zz08ffr6nqxlwXMYS9N7YDln9KuZbo3D8w3xLfass7KJ6xPiZe01tfpjOkPzT5GHOYJ9yc8eWOSnx8MilLv7wyKU2Peakbq9fK/7xDNW29jCcF85z/tosMbz9Wv1kUrDnGdDPGT6c3gvz8XWNva91Udo/XLWICYH/ftDDhy52c9Ph4UoPobd3vkLVPgZ3Z/1XOqY3G9JP6k06zmnzAHPxOYSoiH2rIyROoccmlNpR7sS3sfWrgOzHgeyTlzVG7b31DnQOdCKAx3UrTjb++0cWIkDHdQrMb4P2znQigPJoA69mdAiznfV69yJyJWy8qZD/XoWPZ6+ehbjtqRL04QxhV75aTV2Ck/BD6FFv/xQ6F6TthT6e5t0DiSB2gK0T4BbCrLQ8fnzZ/eCcflhGvAZxg8BrLYAC13Wy9x8y7AUyAXImg949asAG3RLG/m8Nl/SxbC3rMmBYlAzeOT1owI266eWAGvgsLWWf/vGF5p025rCy3RZNFleBfOpNpjgyYT4wa+L5Xa1aakpqL2vdA4cgJotMlw0y0qzpYSW598+cJeCSdOAsWCtYX20gGprDoCX0mHNS1s7psnnTVjWc657rung9zhbdEDZaG+nJm/SxbC3rMmBCdTWmwfhorFQ+NzcmDteCijQJYAVC2ONE1MorSwjaNNKhsdL4QuHLLmg0uumeWGBV8YDL632uTTUFMje13wOREEtQ1hJJ3Yr2Srwvy23OMfFsxSNZeXkM21xfGD6z3/+4+aMOc0RYG0dQyFBi5hfezDgN3tSlhcDBesLW8Cj+eLVe1iDA0egZqszavQDEPjcSxbaUIxbAmpNE2jQn1tAZqCJdRLv459//pmOmubQwwvEVpotLRQM+GGBWVtPHXen0OR7p7N2tbUbDkAj4ThX8a4htH3MMAeClhqPChB8W0S5yaEUgZVxfVaarRDo01ZaWyz+27L0OdY6lS4LTAAcu76+5YnxKRXUPHeLD1qhsIKSf+fwpoNtGxzwghoxbCg+tBJW2lJYQhMTWAvUvsSPzzoz4H00cJ8x4Q2BSC8l0+RLilkhC6xojK5QHM1KL2V9tJdRul7bEOdOhXDAgbpEYHnxrUSRzwJAcGMgwtaMb5kg+D6LqMePJaxCiiZmFS0XW4NFKzvre+2F+GhKXS9Oglkuv0WT5QmlrlmH1DY44AoQQsBhwLJgcCY6NUnFghwCtc8SsRBaLraVyWXwhxSNT3BzAIQ+QKeVC9Dg0u6ujnF10iq2XqxgEDdbfNHg1W18SiemjLch1pdNhRfUepG1NUYBg8/V9Gn8FGBboGbXFLQwQPBvHpcF3LLolnuqhTYHRJbHYtHNIifP+GJsy1KHXG9LAXMYAloszyLmyXRrfTqK4gDULBRcjslAZO3PwLZAo60OsyXH3ZW+IfzaCqbEyz7LacW7liWKWWvLIltjamWENj4FaG0txZSMJXoa7Ax0iwdaEXGffbtr++AOWmpeXCtGlc9CsRqE1QJ3KqjZfdbegS80YEuEf/MWjk+oU2mKAUdbR22ZmZeWN4H2MVBrZRILgyyXW7v/WtHg7xBN2xfzy6LQTJRBWHRMZgmnT1Bi7rfPnfNtGWlLbdGCPvUSWrGlRZ8P1FaRh2Xh4FGwm6tjegZ0zOWNgZqVh+7XUmzsPVhgZiXus9bdUm9fQSRlvy0BRp01rLUWGMuKMzvwPR8DlO9zQK29Bx0rjv25YbWQM9hYwHNiasuq+fgSs4CWqJSC2md92epavNJAtkKbDuoTBLWVPGKB1LE2x4kMIg0k7RqKwGhAp4CaY3eMbbmhejyLHh0WWJY6FsPq+cNaa2WnXW6fUtF0pygZvWY8V2sc+R7JOQ6frByJFuEO6hMENZPMwqLPMWv3lYU4dOYZz1mA1qBmAWfwaHeaaeFn9LZbiveQAiJ2ey1lwYoHioNp1FYy5IaHtrQspaaVHv62eKGVgS/xyX32La0TAHXs0ERKckULMceW7ApqaxWz1Fro+G8NDH3sUltvvRQWkFJiat2PTsCxZdTWWrvFDEr+N48R26fWwPZZZp+7zQqKlR676qHwZPsifnkUmltaluuKRdZgAFD5N1snn7DmxNTaMmrrCLffJ7g+gGvaUkFtubva5bUUHc8DF0topRlzd33hAHtHHFaEwGx5OL6iIqGru96noSDMLa2UGE0nUViIWcvrdsyW3BhWhwYWuC0FYCmpGpY65A2wt6Ittn6OQchWUdrFLLWer0WTFc/71otdcE1XB/WZgVqEQB+sZwH0ub8WeELunM8SaUXDFigGLisGrg1qTYN2g60KPCglVgCllhqK1AKwdrG5rVaUPs/B58WchphfFpVHljrkqmrLCGHUSSBtGXMANLrSwXr0kJttWW+mM+Q659Sjp4KBgavB5POImF8p21rWmlnFNuxBaY/A+i7mVV0WVE5ntsF9ah/A9bFMbZVYkC33O0Xrx0ozLYBotlsxo29pYjSl0qPBElIiIS8GPPQpmhg97F6H1lErSP0c5tNd7zMANQRBW+OYleTntCsobMndEklxx7XV1BaGrRDTxwCM0WVVlbFb67PcPto4USh969s/Y0om5tGM309FN6GEGStIXyjQQX1ioI4JSCjms+qxtbVKEdAYy2KWyXrelwzSrmYqfTk0aCsMBWdZZwaMXLVUQo++oN/HDx0z4299saPOoMeUXmz9+vfLccB7RbAmwRJSreF1tpStUY0phfbUNWi0ZdJhALukqQKbcpWRZRF1FR74BJpSQRzjYY7S0Zbc8jTAo1T+xOjr3y/DgaPL/FMEV0hjDc/C2UpgY96EzxXWIQDH/yVgSgFOKNlouf/g5xzwhNYtlvzk9dRezByalhHhPormgPmGjhiwfQDS8bS0qy0UMVCxR6GTVNqKltIWowH80QUhVtKshjVMpSdH/IWuUv7kjNPb1udA8LU7qcKiXfMS1zZ1arEDFhwzapcbY9QQ1lTeaDdXx7RL08IhU4jnvtr81HXq7dbjQPa7tEKkanDXEFhrPA0ofpMIW0kUy7SiwxcShNxdBnVNunKUjMVTprkDej1A1hg5CdR6oJi1bOF2+2jwZX2XFsxcULWgL4WG2Pn1FnTVENTeRzoHikCd3n1v2TnQObA0B5JAfXNzN5Vtvrw8JT1TOpHd7vaoRPTq6mrq7tzHt/jW+b/c+pfK7ZaeOwKoBSoQ3BpcGPv19dnRpWk59/GtObOwnPv8117/LQFzDi0HoI4xVYO7ttWU8TWgLYBDuM9xfOGxxQNWcOc8/zXXfw6QtvTsEahzmCoT+f37t5sPnqs1OQa49Hl9ffMHwswW65zGDym1rc6/tmKF/KSsf6uxa8nwWv1442NmqgjUHljXJp0AVgtwA9CXNv6p8L+VUmVBC8nfEuOvBc7ScZOSXpyo4YGEoWI1397e3MewoLWtdh//PVG5Rf63VuqYc0gO0Ka27JUCa83nJlALw7Q7AybyogG8ADSIF2CzW5zL3D7++fA/d+1jAFhbqcfo29r3B5ZaM0+AqwENUAuAGdhWu9zF7eMfWuRT4v+pK/WtAXMOPQegRuwS65ATVgA2gxqf5YK6j7/PXcR+ts7/Uld4baUe4/upfB+NqX1ZSG2poam1W54LbM24Pv77Nh+ShsL7rfH/HJT6qYA2RmcU1NKBAAuLZlkJJMqseHsuqPv42+e/5GKw5XZuSj0GoC1+nwRquMUxQGOCbEVqgLqPv3fLt8h/ANpae/msxvqvbVS2CNwQTVFQa0Dx4sm/kTHndqyt5y5qH/8Q0FvjP3tp56rUzwrUFqB0/bFObtW00n38Y0Bvjf8Q+HNV6qcGaKHXa6k7oLYPqLUVKhJ3LPjnpNRPEdAmqC1B0Qkwy+XSbuEct5tpsOJIHcdpoZoby605/inzvwN6G2rAu0/NC8Quny+GwnTmgFlrfh6XE0UtabAArRVWq/H12MhNnAr/a+VS1lSq24DlPComUIcEStd4ayHXlrL09MzaQr3m+J3/eylaU6nOg9J2nk4CtZCrD23EppBrsdcW6i2Pfwn8twC9hqcSk+tT+P4I1LpSSbvAelJclMIWWleCxZgRs5JrKpUlQaX5z2GHxUOL/7m8TwHUmvxfylOMyeipfB+11DGhsiZa4n77tkRi49dWKjVAJTTnAsun1EKhjk/ITpn/WG9tpXOVivST6y2eCmhjdGYnymIdWsc0U4RsK0KthWopUIWsZUyx8ZqcOv9rKdWYnJ7z90f71CmJihhDSo9h1gB2qVDHQJUKrDnjWzQwr2OhENqeIv9rrD3mn2JEYjJ8yt8fgVqOv+kDGpZg6cJ9zYRagrWkUPtAZSVsQoteOnfp0+K/Nf458r8GsOcq1VMGM2g3L0ngw/mWO6Rd1JCAQWumxpghoWZr2UqoW44fi/P4phnOFfBceT3weQr/ZeyUNWg5/5QYd01P8RwALXM4AjUD2mclfUD3MSXVHUoRao5xawt1aHztflvgsuafOndYaR//efxz5X/MU1lCqZ8DsA/uKGPrwJceMJAsUMVcURHCFOEWUK0t1GuNj7lDcC3+lwAbiu9U+C9zbOEppnoqZwlqjkmQmLE+s4BuMYSfDblfLNRYWFgky2NItVapQr2V8bfAf+HtJSqVcwD05H5rgY6BU7ui1t/oQycufMC2rLSlVCw3OOYp4PsUpRIDVYvxc/nPWfBYRvzU+L+mp3JWoOZXuoSSLlZWVwuYfj4lG5kr1LWVytrjl/LfOsF2ivz35ROWVOrnAujJUmuh0hNk4KYAWz8fsxalQm1ZzRKh3tr4Ofz3nWTjPrbO/7WV6jkB2oGaGaoX/+3t5aCMNCXGlT7063li1nprSiUHVCnueAhUnf+Hbzddw1M8O1Cu/8NIAAAIWklEQVQDUBA8BrJ+laxlpTVDBNC+hZEMrH6zZkiotYfQQqmsPf6l81/kZ22lfpag1oBGkUKM2RYzBHjaJdQZaOvtjkyDHh/P11AqECL9ds81x4/xP2XeWItT4//aSvXcAO3cb1y/KhZ6DphDbqjOKOsjmvheBFLAZsW4qYKdItS8kPr62bXG93lIqfM+Zf4L7Wsp1bMENVuuEnebLQT/O5Sw0ltLUhoIpRJK8MQWwLfVE1Iq0ufa47MyZaUyB9Cnwv+1lWpMpk7x+6OXzrPWxIQkTtb3e/Nkrb1SywVn0FsVTjq+zGFoztaab796i+PD8zhn/q+tVHPk7BTaOlCHYmfLLbSy2Rrksa0lBlZo/CWEeu3xwTtLqVwC/0PzTwVRDaWeOtbW23lvPrHqtdlVstzukPWO7ZXq0zm+8S1PwtqrzVEqcMF5TkuOb+UQWvNf978m/7eiVLcO1lT6oq/d4Y50/MMJrpillu95S8sS2hjRNZXK1sZnULF1vhT+r6lUYnJ3at8ng9pyDbFvnBJTA9Ts7qecr92qUPOeeYqnMFepdf4fvv1zrqdYotRPBdxZoNZZZKvIJCTsfGGCMCgH1GsL9RbGr8V/KNZT4j9oZu9wjqeYK3+nAmihMwvUOp6NWWoGfagAJYVh2vX2jZ2iVEqF+tRAdW78z5U/LVdzjEqKjG6lTRaoU4TalyxjrYrYurWlqC3UuUJVe/xL53/K/Fsp9a0ANoWOLFDPFWoQlANmPJNqqVOVSgpzfPG8fB7yUqx4Tyu1kvEvnf9z589xNJcq567F1ttngdqqcPIlibTgx6q6YowqiWm1pZyrVOYKFYM95XqhkFKxFAfzPMT/UqVaa/6l46dY6lZKPSafW/o+C9SliyqLoQ9Q5C6stZ0FwdULqZMp7JLhmTVBJTSUzH8u/3k/uGT8c1Hq55z5FhnJAnXKovoABiHCqZwSoZor1PI8BPsUx6/B/3Ofv46p4a3Fip+2ZGnn0jIL1CkZaMvlLYlnUi11TKkA2CWgrgGqmuNfGv/XVOpzgbbk81mg1ky13F8f8QwisdY13N+1hXrp8Wvxv5ZSXXr+ayrVJUE5d6wsUGumpmSALUtdQrTvBJVVzWb1n2uZdR9bGP/S+Z86f51D0TmMEqVWIrNrPZMMariNqYzVE6oBqtKxSxJTFqjXHL/z//ZPLU9lLbAtNW42qJmxS1rqtYV6K+Nr/qcIylyFijH0gZ6UsWt6amsr1Zz5rtk2C9SWYKe4vzWFam2lsub4W+F/rsAKGH0nz3L68p3S43oEX3+1ZDCH3rXanhSofUIdW9SaC1pS2dZq/BSFWiP0YEudK6iwrrVAXeKp1FIquXNfq30RqHOJrSXUcubWSoLEhLvW+CEXPMST2uPn8L+WQHPhSur47C7XADXzP7bmTGNN/qfOfc122aAGY1OJrslQgDp17FrxnB4vV8Br8iCH/+cG6Jy5Y81q8SBX5tZsnw3qHIGuKcyhl5EvZSVlHNCRailq8iBVqGtbyJw1t/aSa1rpXLDU5n/u+Gu0bwbq2szcAqhLaKjNhxjA1gK0BWYIdA1Qx+Ztgcey0rqf2uuzBoj1mFmgzmFsbbdnbUDx+GBiirXWQqNfLl9SWRcSnJqJqRTPIARmeX5NQGs+WevVQb3bFwCkCFVNLY2+1nJ9LUALTSmgjvErV6hS8gq5fYZojCny1qCOje+z0CmAljY1eRVb66W+r2apW7tfHM+mAqrWgp0aqGsLawhYLUFdC9AheaklI0sBNmWcRUBdyw1bA9g+QOe44KGFyBWqHG8lt28fnTFwtQJ2bFymN0RDyKOqxaMUsC3VZjFQtwB2ivs7d9G2CuqlvZWlrXUqoGMKJcanufKxFFBzxskCtXRcurg1EiY8saUs1tZAvYa3Ar6Xrn2JQo+BmsEYWqOY4u+gjoBaFq/lPuUaoNYgYhqgqGICWNP9tuhZ0r0sAbbQlwueGE+t/jS4Y4CunXvIsaYt22Zb6lxrXdNCr6WRfePqucUE0VrIXGFHHykCXNp3SOBic7ROUqG/XHp8Y+X2w/Pp+9Se1U1d2JqAxkEKq/Y7JWk1RxBSQZ2ifWsJVWzffs589Txi663bM7DZWubS1EGdIlHHbYosdYq1rg1ouPYhULdKimwR1OyGazezZuEPimVifGfRAqjnFnu0ALWW3VxFUwazZZ9qAuo1Y5WYVUldxFiCrCT5g6UVGiHwuRVlsbxCzTJR0ImjrSmZZla+PlFOXYMO6jJlUAzqmLVOXbgyssNPzQF2CpjZ3S+ZJ9NX8ryOEWFFNehqeku561S6BrHnahkMjDOX/7l8WaJ9EahTGF+L+TlMmEtXStyu6SkFjri10leppRblc3197XYbBNRvb28mq0rpy+G7VjIpz2owpa4dQqxSvmlaLx7UOYxfEtQ16EIfua7mHNDImLlCpRNkMZd4Dn0p4OSQIqc9z7skbs/lWw5tp9422VJvlfFL0BWq/V5SuJb0JHIEO1epssIvjduX5HsOL7bQNgnUW2V8Kl3nIABreBIpApoK6JI18PUt4UYN9ztlfqfYJgnUpzixTnPnwKVyoIP6Ule+z/tsOdBBfbZL2yd2qRzooL7Ule/zPlsOdFCf7dL2iV0qBzqoL3Xl+7zPlgMd1Ge7tH1il8qBDupLXfk+77PlQAf12S5tn9ilcqCD+lJXvs/7bDnQQX22S9sndqkc6KC+1JXv8z5bDnRQn+3S9oldKgc6qC915fu8z5YDHdRnu7R9YpfKgQ7qS135Pu+z5UAH9dkubZ/YpXKgg/pSV77P+2w50EF9tkvbJ3apHOigvtSV7/M+Ww50UJ/t0vaJXSoHOqgvdeX7vM+WA/8fm0wWUKZ9yIAAAAAASUVORK5CYII="
        });
        return function (resource) {

            function getBgPane(res) {
                return new PatternPane(res, 'repeat-x');
            }

            this.audio.addAudioResources({
                sotb: resource.audio['sotb.mp3']
            });
            this.audio.addChannel('bgm');

            const audioFx = {
                'ouch': new Audio('audio/beast-ouch.wav'),
                'hit': new Audio('audio/beast-hit.wav'),
                'jump': new Audio('audio/beast-jump.wav')
            };

            const moon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA1CAYAAAAOJMhOAAADxklEQVRoQ8Wa4ZXiMAyEyVVACZS2JVACJWyJlEAFxz3lPXHDMJLsBDv82SU4wZ9HGikOy2nA63r7fZ7P5/LKj8fj9Hu7LuXAjgFfu1gPRAT7DcBdQBmETc4m7n9tkfF/XnQet1W5TUAMwpNX7xlgVEh2ASEITtoni4rw5/beXpfLZVXKXqxgpFpPKDYDOYxPBkPEJxaFlY11EAWRhSJC3q4/5XzLAXZBg2kxGgRjtVgRXxg/7ouB79V3VlAlEMNU+YITc1VYAc8fBeUQmWoZVArkMBVElE+4wtnk2SBaQjCCCoEyZaLwU86lco0nHOVjZRoKSgIhDDsSxzirg3mE7sfGYeFor/v9/rY+vCiVvTPUBxDDqAniDCIApaLDqxxCW0e3rAo0W7oEUjkRuZRyM1WXMNmxFrHVR9CoFEOiSm9Apk4Eoyo9xr7KiwjMF0GdjzWLIyGrc94qfQCh7fKEWmpRVFcwF321LX+yesVKZm7oKr2AXJ3WSUerz/asciDKIQ4rNw6uTcrWP4B+rrf1HgYn1Aunxkf9HbscQuI8fJxaGK5zFnYvhQzoGwCt1+DVt/DDY2phWVkOQVNpBdoabpFRqNyL3JDBsDaxauy0/P0voK3q9IYoj8+suMWQGHgF2grTGlpZXilbRmuOFiDq9ez44uH2fD5Py/+U2jPft3OzToLbqqpIt9SlKQohVPR/lB+sBkKrQjsEKFKFnUvVI1cB73Bx4mzfDDwEqCVeWSlebfscO3F7r87h7zoMKILm2hKVBuz58JxpQJHFq5wwCAs5V4jHqO7DwacBedJ7aKEJKBX8mCuR5RGePw0oczcFy8CsUlTDpgFVRlElvNp3UPl2OFBm8T5hdzzcFuMd2Ok55E3Is6OnV2aAOYj93nSgKuQ4J7AIZ7cVHHbr7cMRDWqU9FFYqQVhmLU5nQX0Z1lOfxviLTKHqHFFqN33Qz1hZDnkPC0dOCro43nThMdMBWqBj9qebIMSG9xD9xQqQO7EEVa1Pr6DetgmSZbkag+PWyY+X25jVas24vOoabXvUjmjWh7c337bOZ1t3y0duOoBMRzt/3BvezZQpHhl3dzM4k8APp4+zISKVl/t6kSQ5fOhmUCZQi1Na/MTvJFQPbcJqr/z/Ol+xjoSKnNLVVz52Oan4KOgsnDChFe3B7t+pzADiO95oltrO17B2JjyhxejunFWSbU22Hy2/jqrCWgElOrHuHv2dqcVplkhTuI9oZhVfswZbGd6Wq5mhdRFHSy6+ao6AeVoPWqo6+8CiiB7OoC9ADyHf29oIqTCmqk3AAAAAElFTkSuQmCC";
            const beastShipSmall = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAANCAYAAADISGwcAAAA2ElEQVQ4T52V0RGEIAxEpQSatAUsAUrQJilBJ84sEwIhAD96kLCPDebcYYwQ4ksh3vsj5zz9TOlyfGvsw+copgqiRR44EtW4OSRiANODKABS2HJmZp1grPEDcJtlwort5NhoSKC/BCQuE1dFrXiC6onTvIvxfrGImstTaPOI0+7KyA3cC3eeoXEAxJalVn2nAXon4cmwGHPy9w5I5YD1nVvCu0ClD1AZ+ClWm85sPHca76UPSAjrgq2KwmVZrqYTaiA7dUbO86Sq3/C9GgAptAMEQb6X9l/wAaR7/Ff/T0ugAAAAAElFTkSuQmCC";
            const beastShipBig = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAbCAYAAADMIInqAAACQklEQVRYR81Y0XWDMAyEEZilK2QFVsgK2aUrZIWs0FkYoX3mPVFZSDrJNnnJDwFsWXeSpTPzNE3Tbb3/lqv3ez2/ZzTGeh+xj2z3rO/Zni3nWhfU7C3LMm3bdviRvbcAtPrI7ZkERBe1CLRA0vPW6+gsTRPgORABRfNLRpTx8h49p/falfsWzY5hBGjgNbIsgHKsHKcRp9mSdhARTQREwaLCNvI9J4PXG1rDImKv7JkqzcFHAaC0traBTPPWLPFIgAREAXt7M1Ibeud7201mBM+Go7d71TwaIa8wZVufHE8+RMi0MpMTQSRU4oaTwCs0N8hBSqe0ewuI5aQ2HpHBbXkElXHc/0LCSd0VEiR4K7IoqpEakSUoQpynQYiEcj0RIMFTyoxyMkLI6DEaGZyEKgPW+2M/E0SAa31atiIrkyL6gKerpgFaiOJk0H+zBniFBAFDRCBArWIpOo9jqwj4uq17BlgFEPVh5IDV19FzqwtZRHp+yOCcCNDSxFN+SOQgcFb/R6235T0Fl6956gI8C3rFySfOly1T3QIy1a862kZETQ+JSJf8vJ7/OoAi71VXrx1eDcbTHChAGqYy59ABpAC1UxQSHp5yQ0IJkYYiyPe0/I8CWUlhLoEzJKCtogHIOuqdL7JagKJetUF5COohQBYYaQvpfJkRKIoZXzXwxT78IJJZJBuRd4y3gNPakABN/Ixw/OrzBQLeTAD/mFC2zydlSBS0WwPoJfqYqGXBuwlpASz9hp/Eegihub3EjABqbds/KLCt12ZGr3YAAAAASUVORK5CYII=";

            const patternBg = getBgPane(resource.image['clouds_0.png']);
            const patternBg2 = getBgPane(resource.image['clouds_1.png']);
            const patternBg3 = getBgPane(resource.image['clouds_2.png']);
            const patternBg4 = getBgPane(resource.image['clouds_3.png']);
            const patternBg5 = getBgPane(resource.image['clouds_4.png']);
            const patternBg6 = getBgPane(resource.image['mountains.png']);
            const patternBg7 = getBgPane(resource.image['greens_0.png']);
            const patternBg8 = getBgPane(resource.image['greens_1.png']);
            const patternBg9 = getBgPane(resource.image['greens_2.png']);
            const patternBg10 = getBgPane(resource.image['greens_3.png']);
            const patternBg11 = getBgPane(resource.image['greens_4.png']);
            const patternBg12 = getBgPane(resource.image['greens_5.png']);
            const patternFg = getBgPane(resource.image['fence.png']);

            const runningEvents = [];

            const beastBitmaps = new SpriteSheet(resource.image['bitmaps.png']);
            beastBitmaps.addSprite('tree-big', 0, 5, 180, 170);
            beastBitmaps.addTransformedSprite('tree-big-rev', 'tree-big', 'flip-x');
            beastBitmaps.addSprite('tree-small', 180, 35, 127, 140);
            beastBitmaps.addTransformedSprite('tree-small-rev', 'tree-small', 'flip-x');
            beastBitmaps.addSprite('well',307, 91, 91, 84);
            beastBitmaps.addSprite('statue', 398, 0, 86, 175);
            beastBitmaps.build();

            const MIN_POS = -800;
            const MAX_POS = 1500;
            const shadowWorldPane2 = new BitmapScrollPane(
                beastBitmaps,
                'X',
                [
                    {x: MIN_POS +88, y: -5, bitmap: 'statue'},
                    {x: -580, y: 27, bitmap: 'tree-small'},
                    {x: -500, y: -3, bitmap: 'tree-big-rev'},
                    {x: -490, y: 27, bitmap: 'tree-small'},
                    {x: -420, y: 27, bitmap: 'tree-small-rev'},
                    {x: -300, y: -3, bitmap: 'tree-big'},
                    {x: -200, y: 27, bitmap: 'tree-small'},
                    {x: 0, y: -3, bitmap: 'tree-big'},
                    {x: 200, y: 27, bitmap: 'tree-small'},
                    {x: 340, y: 85, bitmap: 'well'},
                    {x: 1675, y: -5, bitmap: 'statue'}
                ],
                MIN_POS,
                MAX_POS
            );

            const colorAndMoonPane = new ColorPane('#607080');
            colorAndMoonPane.addImage(beastShipSmall, 310, 55);
            colorAndMoonPane.addImage(beastShipBig, -10, 25);
            colorAndMoonPane.addImage(moon, 220, 18);

            const scolArea = new SplitArea('Y', [74, 93]);
            scolArea.addPane(colorAndMoonPane, 0);
            const sbgFadeBg = new LinearGradientPane('Y', ['#607080', 30, '#967b96', 40, '#ff7b96']);

            scolArea.addPane(sbgFadeBg, 1);
            scolArea.addPane(new EmptyPane(), 2);
            shadowScreen.addArea(scolArea);

            const sbgArea = new SplitArea('Y', [20, 40, 19, 9, 5, 72, 2, 2, 5, 8, 10, 5]);
            sbgArea.addPane(patternBg, 0);
            sbgArea.addPane(patternBg2, 1);
            sbgArea.addPane(patternBg3, 2);
            sbgArea.addPane(patternBg4, 3);
            sbgArea.addPane(patternBg5, 4);
            sbgArea.addPane(patternBg6, 5);
            sbgArea.addPane(patternBg7, 6);
            sbgArea.addPane(patternBg8, 7);
            sbgArea.addPane(patternBg9, 8);
            sbgArea.addPane(patternBg10, 9);
            sbgArea.addPane(patternBg11, 10);
            sbgArea.addPane(patternBg12, 11);
            shadowScreen.addArea(sbgArea);

            const sfgArea = new SplitArea('Y', [170, 6, 21]);
            const beastSpriteSheet = new SpriteSheet(resource.image['sprites.png']);

            beastSpriteSheet.addSprite('beast', 3, 2, 32, 52);
            beastSpriteSheet.addTransformedSprite('beast-rev', 'beast', 'flip-x');
            beastSpriteSheet.addSprite('beast-run1', 2, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-run2', 33, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-run3', 66, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-run4', 98, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-run5', 130, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-run6', 163, 66, 32, 52);
            beastSpriteSheet.addSprite('beast-down1', 133, 2, 32, 52);
            beastSpriteSheet.addSprite('beast-down2', 163, 2, 32, 52);
            beastSpriteSheet.addSprite('beast-turn1', 66, 2, 32, 52);
            beastSpriteSheet.addSprite('beast-turn2', 101, 2, 32, 52);
            beastSpriteSheet.addSprite('beast-jump', 35, 2, 32, 52);

            beastSpriteSheet.addSprite('bat1', 0, 226, 32, 64);
            beastSpriteSheet.addSprite('bat2', 40, 226, 32, 64);
            beastSpriteSheet.addSprite('bat3', 80, 226, 32, 64);
            beastSpriteSheet.addSprite('bat4', 120, 226, 32, 64);
            beastSpriteSheet.addSprite('bat5', 160, 226, 32, 64);

            beastSpriteSheet.addSprite('beast-kick1', 1, 120, 32, 52);
            beastSpriteSheet.addSprite('beast-kick-hold', 35, 120, 32, 52);
            beastSpriteSheet.addSprite('beast-feet', 67, 120, 12, 52);
            beastSpriteSheet.addSprite('beast-punch1', 81, 119, 32, 52);
            beastSpriteSheet.addSprite('beast-punch2', 113, 119, 32, 52);
            beastSpriteSheet.addSprite('beast-punch-hold', 151, 119, 32, 52);
            beastSpriteSheet.addSprite('beast-fist', 183, 119, 12, 52);
            beastSpriteSheet.addSprite('beast-down-punch1', 0, 171, 32, 52);
            beastSpriteSheet.addSprite('beast-down-punch2', 30, 171, 32, 52);
            beastSpriteSheet.addSprite('beast-down-punch-hold', 64, 171, 32, 52);
            beastSpriteSheet.addSprite('beast-down-fist', 96, 171, 12, 52);

            beastSpriteSheet.addAnimation(
                'bat',
                ['bat1', 'bat2', 'bat3', 'bat4', 'bat5'],
                ANIMATION.END.LOOP, ANIMATION.DIR.BACKWARD_FORWARD
            );
            beastSpriteSheet.addTransformedAnimation('bat-rev', 'bat', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-down-fist-rev', 'beast-down-fist', 'flip-x');

            beastSpriteSheet.addAnimation(
                'beast-punch',
                ['beast-punch1', 'beast-punch2']
            );
            beastSpriteSheet.addTransformedAnimation('beast-punch-rev', 'beast-punch', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-punch-hold-rev', 'beast-punch-hold', 'flip-x');
            beastSpriteSheet.addAnimation(
                'beast-down-punch',
                ['beast-down-punch1', 'beast-down-punch2']
            );
            beastSpriteSheet.addTransformedAnimation('beast-down-punch-rev', 'beast-down-punch', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-down-punch-hold-rev', 'beast-down-punch-hold', 'flip-x');
            beastSpriteSheet.addAnimation(
                'beast-kick',
                ['beast-kick1']
            );
            beastSpriteSheet.addTransformedAnimation('beast-kick-rev', 'beast-kick', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-kick-hold-rev', 'beast-kick-hold', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-fist-rev', 'beast-fist', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-feet-rev', 'beast-feet', 'flip-x');

            beastSpriteSheet.addTransformedSprite('beast-jump-rev', 'beast-jump', 'flip-x');
            beastSpriteSheet.addTransformedSprite('beast-down-rev', 'beast-down2', 'flip-x');
            beastSpriteSheet.addAnimation(
                'beast-run',
                ['beast-run1', 'beast-run2', 'beast-run3', 'beast-run4', 'beast-run5', 'beast-run6'],
                ANIMATION.END.LOOP
            );
            beastSpriteSheet.addTransformedAnimation('beast-run-rev', 'beast-run', 'flip-x');
            beastSpriteSheet.addAnimation(
                'beast-down',
                ['beast-down1', 'beast-down2']
            );
            beastSpriteSheet.addTransformedAnimation('beast-down-rev', 'beast-down', 'flip-x');
            beastSpriteSheet.addAnimation(
                'beast-turn',
                ['beast-turn1', 'beast-turn2']
            );
            beastSpriteSheet.addAnimation(
                'beast-turn2-rev',
                ['beast-turn2', 'beast-turn1']
            );
            beastSpriteSheet.addTransformedAnimation('beast-turn-rev', 'beast-turn', 'flip-x');
            beastSpriteSheet.addTransformedAnimation('beast-turn2', 'beast-turn2-rev', 'flip-x');

            beastSpriteSheet.addSprite('thorn', 197, 0, 48, 125);

            beastSpriteSheet.addSprite('ekg1', 116, 190, 16, 15);
            beastSpriteSheet.addSprite('ekg2', 132, 190, 16, 15);
            beastSpriteSheet.addSprite('ekg3', 148, 190, 16, 15);
            beastSpriteSheet.addSprite('ekg4', 164, 190, 16, 15);
            beastSpriteSheet.addSprite('ekg5', 116, 205, 16, 15);
            beastSpriteSheet.addSprite('ekg6', 132, 205, 16, 15);
            beastSpriteSheet.addSprite('ekg7', 148, 205, 16, 15);
            beastSpriteSheet.addSprite('ekg8', 164, 205, 16, 15);
            beastSpriteSheet.addAnimation(
                'ekg',
                ['ekg1', 'ekg2', 'ekg3', 'ekg4', 'ekg5', 'ekg6', 'ekg7', 'ekg8'],
                ANIMATION.END.LOOP
            );

            beastSpriteSheet.addSprite('0', 0, 293, 16, 14);
            beastSpriteSheet.addSprite('1', 16, 293, 16, 14);
            beastSpriteSheet.addSprite('2', 32, 293, 16, 14);
            beastSpriteSheet.addSprite('3', 48, 293, 16, 14);
            beastSpriteSheet.addSprite('4', 64, 293, 16, 14);
            beastSpriteSheet.addSprite('5', 80, 293, 16, 14);
            beastSpriteSheet.addSprite('6', 96, 293, 16, 14);
            beastSpriteSheet.addSprite('7', 112, 293, 16, 14);
            beastSpriteSheet.addSprite('8', 128, 293, 16, 14);
            beastSpriteSheet.addSprite('9', 144, 293, 16, 14);

            beastSpriteSheet.addSprite('demon1', 0, 343, 32, 75);
            beastSpriteSheet.addSprite('demon2', 32, 343, 32, 75);
            beastSpriteSheet.addSprite('demon3', 64, 343, 32, 75);
            beastSpriteSheet.addSprite('demon4', 96, 343, 32, 75);
            beastSpriteSheet.addSprite('demon5', 128, 343, 32, 75);
            beastSpriteSheet.addSprite('demon6', 160, 343, 32, 75);
            beastSpriteSheet.addAnimation(
                'demon',
                ['demon1', 'demon2', 'demon3', 'demon4', 'demon5', 'demon6'],
                ANIMATION.END.LOOP
            );
            beastSpriteSheet.addTransformedAnimation('demon-rev', 'demon', 'flip-x');

            beastSpriteSheet.addSprite('stone1', 0, 310, 32, 32);
            beastSpriteSheet.addSprite('stone2', 36, 310, 32, 32);
            beastSpriteSheet.addSprite('stone3', 72, 310, 32, 32);
            beastSpriteSheet.addSprite('stone4', 108, 310, 32, 32);
            beastSpriteSheet.addAnimation(
                'stone',
                ['stone1', 'stone2', 'stone3', 'stone4'],
                ANIMATION.END.LOOP
            );

            beastSpriteSheet.build();

            const beastSpritePane = new SpritePane(beastSpriteSheet);
            beastSpritePane.addSprite('ekg', 'ekg', 10, 4, 10);

            beastSpritePane.addSprite('num1', '1', 30, 4, 8);
            beastSpritePane.addSprite('num2', '2', 48, 4, 9);

            beastSpritePane.setAnimationSpeed('ekg', 0.12);
            beastSpritePane.addSprite('beast', 'beast', 144, 118);
            beastSpritePane.addSprite('hit', null, 0, 0);
            beastSpritePane.setAnimationSpeed('beast', 0.15);
            beastSpritePane.addGroup('beast', ['beast', 'hit']);
            beastSpritePane.setAttachDefault(shadowWorldPane2);

            sfgArea.addPane(shadowWorldPane2,0);
            sfgArea.addPane(beastSpritePane, 0);

            function drawRect(dim) {
                return dim;
            }

            sfgArea.addPane(patternFg, 2);

            shadowScreen.addArea(sfgArea);

            const beastScroller = new MasterSlavesScrollHandler(shadowWorldPane2);
            beastScroller.addSlave(patternBg, 0.5);
            beastScroller.addSlave(patternBg2, 0.3);
            beastScroller.addSlave(patternBg3, 0.2);
            beastScroller.addSlave(patternBg4, 0.15);
            beastScroller.addSlave(patternBg5, 0.1);
            beastScroller.addSlave(patternBg6, 0.25);
            beastScroller.addSlave(patternBg7, 1);
            beastScroller.addSlave(patternBg8, 1.2);
            beastScroller.addSlave(patternBg9, 1.5);
            beastScroller.addSlave(patternBg10, 1.8);
            beastScroller.addSlave(patternBg11, 2.2);
            beastScroller.addSlave(patternBg12, 3);
            beastScroller.addSlave(patternFg, 4);
            beastScroller.addSpriteSlave(beastSpritePane, -1);

            let shipTimer = 0;
            const iMax = 60;
            const degree90 = Math.PI/2;
            const bowStep = degree90/iMax;
            let last = null;
            let fallMoves = [];
            for (let i = (iMax >> 3) * bowStep; i >= -degree90 + 10 * bowStep; i -= bowStep) {
                const pos = {x: Math.round(120 * Math.cos(i)), y: 120 * Math.cos(i) - Math.round(130 * Math.sin(i))};
                if (last !== null) {
                    const move = {x: (last.x - pos.x), y: (last.y - pos.y)};
                    fallMoves.unshift(move);
                }
                last = pos;
            }

            const inputController = new InputController();
            inputController.setDirInputsKeyboard('w', 's', 'a', 'd');
            inputController.setDirInputsGamepad(12, 13, 14, 15);
            inputController.setDirInputsTouch('up', 'down', 'left', 'right');
            inputController.addInput('attack', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('attack', 'j');
            inputController.assignButtonToInput('attack', 0);
            inputController.assignTouchToInput('attack', '1');
            inputController.addInput('jump', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('jump', 'k');
            inputController.assignButtonToInput('jump', 2);
            inputController.assignTouchToInput('jump', '2');
            inputController.addInput('back');
            inputController.assignKeyToInput('back','Escape');
            inputController.assignButtonToInput('back', 8);
            inputController.assignTouchToInput('back', '3');

            this.audio.loop('sotb', 'bgm');

            shadowScreen.setFrameHandler(function() {
                beastSpritePane.updateFrames();

                let pos;
                if (shipTimer % 4 === 0) {
                    pos = colorAndMoonPane.getImagePosition(1);
                    if (pos.x === 320) {
                        pos.x = -150;
                    } else {
                        pos.x += 1;
                    }
                    colorAndMoonPane.setImagePosition(1, pos.x, pos.y);
                }
                if (shipTimer % 8 === 0) {
                    pos = colorAndMoonPane.getImagePosition(0);
                    if (pos.x === -30) {
                        pos.x = 320;
                    } else {
                        pos.x -= 1;
                    }
                    colorAndMoonPane.setImagePosition(0, pos.x, pos.y);
                }
                shipTimer++;
            });

            const beastStates = new States([
                'stand-right', 'stand-left', 'run-right', 'run-left', 'go-down-right', 'go-down-left', 'down-right', 'down-left',
                'go-up-right', 'go-up-left', 'turn-right', 'turn-right2', 'turn-left', 'turn-left2', 'jump-right-top', 'jump-left-top', 'jump-right', 'jump-left',
                'punch-right', 'punch-hold-right', 'punch-back-right', 'punch-left', 'punch-hold-left', 'punch-back-left',
                'down-punch-right', 'down-punch-hold-right', 'down-punch-back-right',
                'down-punch-left', 'down-punch-hold-left', 'down-punch-back-left',
                'kick-right', 'kick-hold-right', 'kick-left', 'kick-hold-left'
            ]);

            beastStates.addTransition('stand-right', 'move-right', 'run-right');
            beastStates.addTransition('stand-right', 'move-left', 'turn-left');
            beastStates.addTransition('stand-right', 'move-down', 'go-down-right');
            beastStates.addTransition('stand-right', 'move-up', 'jump-right-top');
            beastStates.addTransition('stand-right', 'move-up-right', 'jump-right');
            beastStates.addTransition('stand-right', 'move-up-left', 'jump-left');
            beastStates.addTransition('stand-right', 'button-pressed', 'punch-right');

            beastStates.addTransition('punch-right', 'eoa', 'punch-hold-right');
            beastStates.addTransition('punch-hold-right', 'button-released', 'punch-back-right');
            beastStates.addTransition('punch-back-right', 'eoa', 'stand-right');

            beastStates.addTransition('jump-right-top', 'landing', 'stand-right');
            beastStates.addTransition('jump-right-top', 'button-pressed', 'kick-right');
            beastStates.addTransition('jump-left-top', 'landing', 'stand-left');
            beastStates.addTransition('jump-left-top', 'button-pressed', 'kick-left');

            beastStates.addTransition('jump-right', 'landing', 'stand-right');
            beastStates.addTransition('jump-right', 'button-pressed', 'kick-right');
            beastStates.addTransition('kick-right', 'eoa', 'kick-hold-right');
            beastStates.addTransition('kick-hold-right', 'landing', 'stand-right');
            beastStates.addTransition('jump-left', 'landing', 'stand-left');
            beastStates.addTransition('jump-left', 'button-pressed', 'kick-left');
            beastStates.addTransition('kick-left', 'eoa', 'kick-hold-left');
            beastStates.addTransition('kick-hold-left', 'landing', 'stand-left');

            beastStates.addTransition('stand-left', 'move-right', 'turn-right');
            beastStates.addTransition('stand-left', 'move-left', 'run-left');
            beastStates.addTransition('stand-left', 'move-down', 'go-down-left');
            beastStates.addTransition('stand-left', 'move-up', 'jump-left-top');
            beastStates.addTransition('stand-left', 'move-up-right', 'jump-right');
            beastStates.addTransition('stand-left', 'move-up-left', 'jump-left');
            beastStates.addTransition('stand-left', 'button-pressed', 'punch-left');

            beastStates.addTransition('punch-left', 'eoa', 'punch-hold-left');
            beastStates.addTransition('punch-hold-left', 'button-released', 'punch-back-left');
            beastStates.addTransition('punch-back-left', 'eoa', 'stand-left');

            beastStates.addTransition('run-right', 'move-left', 'turn-left');
            beastStates.addTransition('run-right', 'stand', 'stand-right');
            beastStates.addTransition('run-right', 'move-down', 'go-down-right');
            beastStates.addTransition('run-right', 'move-down-right', 'go-down-right');
            beastStates.addTransition('run-right', 'move-up-right', 'jump-right');
            beastStates.addTransition('run-right', 'move-up-left', 'jump-left');
            beastStates.addTransition('run-right', 'button-pressed', 'punch-right');

            beastStates.addTransition('run-left', 'stand', 'stand-left');
            beastStates.addTransition('run-left', 'move-right', 'turn-right');
            beastStates.addTransition('run-left', 'move-down', 'go-down-left');
            beastStates.addTransition('run-left', 'move-down-left', 'go-down-left');
            beastStates.addTransition('run-left', 'move-up-right', 'jump-right');
            beastStates.addTransition('run-left', 'move-up-left', 'jump-left');
            beastStates.addTransition('run-left', 'button-pressed', 'punch-left');

            beastStates.addTransition('go-down-right', 'eoa', 'down-right');
            beastStates.addTransition('go-down-left', 'eoa', 'down-left');
            beastStates.addTransition('go-up-right', 'eoa', 'stand-right');
            beastStates.addTransition('go-up-left', 'eoa', 'stand-left');

            beastStates.addTransition('down-right', 'not-move-down', 'go-up-right');
            beastStates.addTransition('down-right', 'button-pressed', 'down-punch-right');

            beastStates.addTransition('down-punch-right', 'eoa', 'down-punch-hold-right');
            beastStates.addTransition('down-punch-hold-right', 'button-released', 'down-punch-back-right');
            beastStates.addTransition('down-punch-back-right', 'eoa', 'down-right');

            beastStates.addTransition('down-left', 'not-move-down', 'go-up-left');
            beastStates.addTransition('down-left', 'button-pressed', 'down-punch-left');

            beastStates.addTransition('down-punch-left', 'eoa', 'down-punch-hold-left');
            beastStates.addTransition('down-punch-hold-left', 'button-released', 'down-punch-back-left');
            beastStates.addTransition('down-punch-back-left', 'eoa', 'down-left');

            beastStates.addTransition('turn-left', 'eoa', 'turn-left2');
            beastStates.addTransition('turn-left2', 'eoa', 'stand-left');
            beastStates.addTransition('turn-right', 'eoa', 'turn-right2');
            beastStates.addTransition('turn-right2', 'eoa', 'stand-right');

            beastStates.setEventPrios(
                ['eoa', 'button-pressed', 'button-released', 'move-up-right', 'move-up-left', 'move-down', 'not-move-down', 'move-up', 'move-left', 'move-right', 'landing', 'stand']
            );

            let jumpIndex = null;
            let invisible = 0;
            let jumpMoveX = 0;
            const jumpPos = [-6,  -6, -5, -5, -4, -4, -3, -3, 0, -2, 0, -2, 0, -1, 0, -1, 0, -1,  0, 0, 1, 0, 1, 0,  1, 0,  2, 0,  2, 0,  3, 3, 4, 4, 5, 5, 6, 6];
            let isPunching = false;
            let isHitting = 0;
            let kills = 0;
            let health = 12;

            let storyPos = 0;

            let currEnemies = [];
            const enemies = {
                'bat': {
                    speed: 3,
                    damage: 2,
                    animSpeed: 0.34,
                    invincible: false,
                    variants: {
                        'left': {
                            sprite: 'bat',
                            moving: 'move-left-right'
                        },
                        'right': {
                            sprite: 'bat-rev',
                            moving: 'move-right-left'
                        }
                    }
                },
                'stone': {
                    speed: 2,
                    damage: 1,
                    animSpeed: 0.1,
                    invincible: false,
                    sprite: 'stone',
                    variants: {
                        'left': {
                            moving: 'bounce-left-right'
                        },
                        'right': {
                            moving: 'bounce-right-left'
                        }
                    }
                },
                'demon': {
                    speed: 2,
                    damage: 2,
                    animSpeed: 0.15,
                    invincible: false,
                    variants: {
                        'right': {
                            sprite: 'demon',
                            moving: 'move-right-left'
                        },
                        'left': {
                            sprite: 'demon-rev',
                            moving: 'move-left-right'
                        },
                        'bounce': {
                            sprite: 'demon-rev',
                            moving: 'bounce-left-right'
                        }
                    }
                },
                'thorn': {
                    speed: 0,
                    damage: 3,
                    animSpeed: 0,
                    moving: 'move-up-down-repeat',
                    invincible: true,
                    variants: {
                        'mid': {
                            sprite: 'thorn'
                        }
                    }
                }
            };

            const story = {
                '-380': {type: 'enemy', id: 'bat.right'},
                '-300': {type: 'enemy', id: 'bat.left'},
                '100': {type: 'enemy', id: 'bat.right'},
                '180': {type: 'enemy', id: 'demon.right'},
                '250': {type: 'enemy', id: 'thorn.mid'},
                '350': {type: 'enemy', id: 'demon.bounce'},
                '550': {type: 'enemy', id: 'demon.right'},
                '650': {type: 'enemy', id: 'stone.right'},
                '-100': {type: 'enemy', id: 'stone.left'}
            };

            const BASE = 170;

            function initEnemyMove(obj) {
                switch(obj.moving) {
                    case 'move-left-right':
                        obj.x = -obj.dim.x;
                        obj.y = BASE - obj.dim.y;
                        break;

                    case 'move-right-left':
                        obj.x = 320 + obj.dim.x;
                        obj.y = BASE - obj.dim.y;
                        break;

                    case 'bounce-left-right':
                        obj.x = -obj.dim.x;
                        obj.y = BASE - obj.dim.y;
                        break;

                    case 'bounce-right-left':
                        obj.x = 320 + obj.dim.x;
                        obj.y = BASE - obj.dim.y;
                        break;

                    case 'move-up-down-repeat':
                        obj.x = 290;
                        obj.y = BASE + obj.dim.y;
                        break;

                    default:
                        obj.x = 100;
                        obj.y = 100;
                        break;
                }
            }

            const xCosPos = [];
            const cosStep = degree90 / 20;
            for (let i = 0; i < degree90; i += cosStep) {
                const v = Math.sin(i);
                xCosPos.push(v);
                xCosPos.unshift(-v);
            }

            function getEnemyMove(enemy, x, y) {
                switch(enemy.moving) {
                    case 'move-left-right':
                        return {x: x + enemy.speed, y};

                    case 'move-right-left':
                        return {x: x - enemy.speed, y};

                    case 'bounce-left-right':
                        if (enemy.step === undefined) {
                            enemy.step = 0;
                            enemy.xPos = 0;
                        }
                        if (enemy.xPos < xCosPos.length) {
                            y += enemy.speed * xCosPos[enemy.xPos];
                            enemy.xPos++;
                        } else {
                            enemy.xPos = 0;
                        }
                        return {x: x + enemy.speed, y};

                    case 'bounce-right-left':
                        if (enemy.step === undefined) {
                            enemy.step = 0;
                            enemy.xPos = 0;
                        }
                        if (enemy.xPos < xCosPos.length) {
                            y += enemy.speed * xCosPos[enemy.xPos];
                            enemy.xPos++;
                        } else {
                            enemy.xPos = 0;
                        }
                        return {x: x - enemy.speed, y};

                    case 'move-up-down-repeat':

                        if (enemy.step === undefined) {
                            enemy.step = 0;
                        }
                        if (enemy.step === 0) {
                            y -= 3;
                            if (y <= BASE - enemy.dim.y) {
                                y = BASE - enemy.dim.y;
                                enemy.step = -200;
                            }
                        } else if (enemy.step === -1) {
                            y += 3;
                            if (y >=     BASE) {
                                y = BASE;
                                enemy.step = 200;
                            }
                        } else {
                            if (enemy.step > 0) {
                                enemy.step--;
                            } else {
                                enemy.step++;
                            }
                        }
                        return {x, y};
                }
                return null;
            }

            shadowScreen.setKeyHandler(() => {

                inputController.awaitInput('attack');
                inputController.awaitInput('jump');
                inputController.update();

                if (inputController.hasInput('back')) {
                    this.gotoScreen('demo');
                }

                let moveX = 0;
                const speed = 1.5;
                const allTransitions = beastStates.getPossibleEvents();
                const beastSprite = beastSpritePane.getSprite('beast');

                // key vars

                const vector = inputController.getDirVector();

                let dirX = vector.x;
                let dirY = vector.y;

                let buttonDown = inputController.isPressed('attack'); // (this.keysDown['Enter'] !== undefined);

                if (isPunching && !buttonDown) {
                    isPunching = false;
                }
                if (isHitting === 2) {
                    isHitting = 0;
                    hitRegion = null;
                }
                if (invisible > 0) {
                    invisible--;
                    if (invisible === 0) {
                        beastSpritePane.unhideSprite(':beast');
                    } else if (invisible % 5 === 0) {
                        beastSpritePane.toggleSpriteVisiblity(':beast');
                    }
                }

                // determine next event
                let nextEvent = null;
                for (let transition of allTransitions) {
                    switch(transition) {
                        case 'eoa':
                            if (beastSprite.animation.getState() !== ANIMATION.STATE.DONE) {
                                continue;
                            }
                            break;

                        case 'move-left':
                            if (dirX >= 0) {
                                continue;
                            }
                            moveX -= speed;
                            break;

                        case 'move-right':
                            if (dirX <= 0) {
                                continue;
                            }
                            moveX += speed;
                            break;

                        case 'move-down':
                            if (dirY <= 0) {
                                continue;
                            }
                            break;

                        case 'button-a':
                            if (!dirY >= 0) { //
                                continue;
                            }
                            break;

                        case 'move-up-right':
                            if (dirY >= 0 || dirX <= 0) {
                                continue;
                            }
                            moveX += speed;
                            break;

                        case 'move-up-left':
                            if (dirY >= 0 || dirX >= 0) {
                                continue;
                            }
                            moveX -= speed;
                            break;

                        case 'not-move-down':
                            if (dirY > 0) {
                                continue;
                            }
                            break;

                        case 'landing':
                            if (jumpIndex === null || jumpIndex < jumpPos.length) {
                                continue;
                            }
                            jumpIndex = null;
                            beastSpritePane.assignSprite('hit', null);
                            break;

                        case 'button-pressed':
                            if (!buttonDown) {
                                continue;
                            }
                            if (jumpIndex !== null && (jumpIndex < 12  || jumpIndex > 24)) {
                                continue;
                            }
                            break;

                        case 'button-released':
                            if (isPunching) {
                                continue;
                            }
                            break;

                        case 'stand':
                            if (!(dirX === 0 && dirY === 0)) {
                                continue;
                            }
                            break;

                        default:
                            continue;
                    }
                    nextEvent = transition;
                }

                // get next transition

                if (nextEvent !== null) {
                    beastStates.doEvent(nextEvent);
                }

                const transitions = beastStates.popTransitions();
                let hitRegion = null;
                for (let transition of transitions) {
                    let target = null;
                    let subTarget = null;
                    let doReverse = false;
                    switch(transition.to) {
                        case 'stand-left':
                            target = 'beast-rev';
                            break;
                        case 'stand-right':
                            target = 'beast';
                            break;
                        case 'run-left':
                            target = 'beast-run-rev';
                            beastSpritePane.setAnimationSpeed('beast', 0.15);
                            break;
                        case 'run-right':
                            target = 'beast-run';
                            beastSpritePane.setAnimationSpeed('beast', 0.15);
                            break;
                        case 'go-down-right':
                            target = 'beast-down';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            break;
                        case 'go-down-left':
                            target = 'beast-down-rev';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            break;
                        case 'go-up-right':
                            target = 'beast-down';
                            doReverse = true;
                            break;
                        case 'go-up-left':
                            target = 'beast-down-rev';
                            doReverse = true;
                            break;
                        case 'down-right':
                            target = 'beast-down2';
                            break;
                        case 'down-left':
                            target = 'beast-down-rev_1';
                            break;
                        case 'turn-left':
                            beastSpritePane.setAnimationSpeed('beast', 0.35);
                            target = 'beast-turn';
                            break;
                        case 'turn-right':
                            beastSpritePane.setAnimationSpeed('beast', 0.35);
                            target = 'beast-turn-rev';
                            break;
                        case 'turn-left2':
                            target = 'beast-turn2';
                            break;
                        case 'turn-right2':
                            target = 'beast-turn2-rev';
                            break;
                        case 'punch-right':
                            target = 'beast-punch';
                            beastSpritePane.setAnimationSpeed('beast', 0.35);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'punch-left':
                            target = 'beast-punch-rev';
                            beastSpritePane.setAnimationSpeed('beast', 0.35);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'down-punch-right':
                            target = 'beast-down-punch';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'down-punch-left':
                            target = 'beast-down-punch-rev';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'punch-hold-right':
                            target = 'beast-punch-hold';
                            subTarget = ['beast-fist', 176, 118];
                            hitRegion = drawRect({x1: 170, y1: 130, x2: 189, y2: 140});
                            break;
                        case 'punch-hold-left':
                            target = 'beast-punch-hold-rev';
                            subTarget = ['beast-fist-rev', 132, 118];
                            hitRegion = drawRect({x1: 132, y1: 130, x2: 148, y2: 140});
                            break;
                        case 'down-punch-hold-right':
                            target = 'beast-down-punch-hold';
                            subTarget = ['beast-down-fist', 176, 130];
                            hitRegion = drawRect({x1: 170, y1: 130, x2: 189, y2: 150});
                            break;
                        case 'down-punch-hold-left':
                            target = 'beast-down-punch-hold-rev';
                            subTarget = ['beast-down-fist-rev', 132, 130];
                            hitRegion = drawRect({x1: 132, y1: 130, x2: 148, y2: 150});
                            break;
                        case 'punch-back-right':
                            target = 'beast-punch';
                            beastSpritePane.assignSprite('hit', null);
                            doReverse = true;
                            break;
                        case 'punch-back-left':
                            target = 'beast-punch-rev';
                            beastSpritePane.assignSprite('hit', null);
                            doReverse = true;
                            break;
                        case 'down-punch-back-right':
                            target = 'beast-down-punch';
                            beastSpritePane.assignSprite('hit', null);
                            doReverse = true;
                            break;
                        case 'down-punch-back-left':
                            target = 'beast-down-punch-rev';
                            beastSpritePane.assignSprite('hit', null);
                            doReverse = true;
                            break;
                        case 'jump-right':
                        case 'jump-right-top':
                            target = 'beast-jump';
                            jumpIndex = 0;
                            jumpMoveX = moveX;
                            break;
                        case 'jump-left':
                        case 'jump-left-top':
                            target = 'beast-jump-rev';
                            jumpIndex = 0;
                            jumpMoveX = moveX;
                            break;
                        case 'kick-right':
                            target = 'beast-kick';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'kick-hold-right':
                            target = 'beast-kick-hold';
                            subTarget = ['beast-feet', 176, 130];
                            break;
                        case 'kick-left':
                            target = 'beast-kick-rev';
                            beastSpritePane.setAnimationSpeed('beast', 0.25);
                            isPunching = true;
                            isHitting = 1;
                            break;
                        case 'kick-hold-left':
                            target = 'beast-kick-hold-rev';
                            subTarget = ['beast-feet-rev', 134, 130];
                            break;
                    }
                    if (jumpIndex === 0) {
                        audioFx.jump.play();
                    }
                    if (target !== null) {
                        beastSpritePane.assignSprite('beast', target);
                        if (doReverse) {
                            beastSprite.animation.reverse();
                        }
                    }
                    if (subTarget !== null) {
                        beastSpritePane.assignSprite('hit', subTarget[0]);
                        beastSpritePane.setSpritePos('hit', subTarget[1], beastSprite.y);
                        isHitting = 2;
                    }
                }

                let scrolled = null;
                if (jumpIndex !== null) {
                    beastSpritePane.moveSprite(':beast', 0, jumpPos[jumpIndex]);
                    scrolled = beastScroller.scrollBy(jumpMoveX * 1.2, 0);
                    jumpIndex++;
                }
                const state = beastStates.getState();
                if (state === 'run-left') {
                    scrolled = beastScroller.scrollBy(-speed * 1.2, 0);
                } else if (state === 'run-right') {
                    scrolled = beastScroller.scrollBy(speed * 1.2, 0);
                }

                if (scrolled !== null && scrolled.x !== 0) {
                    if (scrolled.x < 0) {
                        storyPos--;
                    } else {
                        storyPos++;
                    }
                    const action = story[storyPos];
                    if (action !== undefined) {
                        switch(action.type) {

                            case 'enemy':
                                let found = false;
                                for (let runningEvent of runningEvents) {
                                    if (runningEvent.pos === storyPos && runningEvent.id === action.id) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (found) break;
                                const parts = action.id.split('.');
                                const enemyObj = {};

                                const props = [enemies[parts[0]], enemies[parts[0]].variants[parts[1]]];
                                for (let prop of props) {
                                    for (let k in prop) {
                                        if (k !== 'variants') {
                                            enemyObj[k] = prop[k];
                                        }
                                    }
                                }
                                const spriteId = beastSpritePane.getUid(parts[0]);
                                beastSpritePane.addSprite(spriteId, enemyObj.sprite, 0, 0);
                                enemyObj.dim = beastSpritePane.getSpritePos(spriteId).dim;
                                initEnemyMove(enemyObj);
                                beastSpritePane.setSpritePos(spriteId, enemyObj.x, enemyObj.y);
                                beastSpritePane.setAnimationSpeed(spriteId, enemyObj.animSpeed);
                                currEnemies.push({
                                    id: spriteId,
                                    moving: enemyObj.moving,
                                    fallIndex: -1,
                                    damage: enemyObj.damage,
                                    invincible: enemyObj.invincible,
                                    speed: enemyObj.speed,
                                    state: 0,
                                    dim: enemyObj.dim,
                                    pos: storyPos,
                                    action: action.id
                                });
                                runningEvents.push({pos: storyPos, id: action.id});
                                break;
                        }
                    }
                }

                if (isHitting === 1 && hitRegion === null) {
                    hitRegion = drawRect({x1: 144, y1: 118, x2: 176, y2: 150});
                }

                const activeEnemies = [];
                const beastPos = beastSpritePane.getSpritePos('beast');
                const beastBottom = beastPos.y + beastPos.dim.y;
                for (let enemy of currEnemies) {
                    let isHit = false;

                    let bat = beastSpritePane.getSpritePos(enemy.id);
                    if (enemy.state === 0 && hitRegion !== null && enemy.invincible === false) {
                        isHit = (bat.x > hitRegion.x1 && bat.x < hitRegion.x2);
                        if (!isHit) {
                            const batEnd = bat.x + bat.dim.x;
                            isHit = (batEnd > hitRegion.x1 && batEnd < hitRegion.x2) || (bat.x < hitRegion.x1 && batEnd > hitRegion.x2);
                        }
                        if (isHit) {
                            audioFx.hit.play();
                            enemy.fallIndex = 0;
                            enemy.state = 1;
                            const eneSprite = beastSpritePane.getSprite(enemy.id);
                            if (eneSprite.isAnimation) {
                                eneSprite.animation.pause();
                            }
                            kills++;
                        }
                    }

                    if (bat.x > 640 || bat.x < -32) {
                        enemy.state = -1;
                    } else if (enemy.state === 0) {
                        if (!invisible && bat.x >= 148 && bat.x <= 172 && bat.y < beastBottom) {
                            invisible = 200;
                            beastSpritePane.hideSprite(':beast');
                            beastSpritePane.setSpriteFilters(':beast', 'monochrome(#FFFFFF)', 10);
                            audioFx.ouch.play();
                            health -= enemy.damage;
                            if (health < 1) {
                                health = 1;
                            }
                            beastSpritePane.assignSprite('num1', Math.floor(health / 10));
                            beastSpritePane.assignSprite('num2', health % 10);

                            let ekgSpeed;
                            if (health > 10) {
                                ekgSpeed = 0.12;
                            } else if (health > 7) {
                                ekgSpeed = 0.15;
                            } else if (health > 4) {
                                ekgSpeed = 0.2;
                            } else if (health > 1) {
                                ekgSpeed = 0.25;
                            } else {
                                ekgSpeed = 0.34;
                            }
                            beastSpritePane.setAnimationSpeed('ekg', ekgSpeed);
                        }
                        const newPos = getEnemyMove(enemy, bat.x, bat.y);
                        if (newPos !== null) {
                            beastSpritePane.setSpritePos(bat.id, newPos.x, newPos.y);
                        }
                    } else if (enemy.state === 1) {
                        enemy.fallIndex++;
                        if (enemy.fallIndex === fallMoves.length) {
                            enemy.state = -1;
                        } else {
                            const move = fallMoves[enemy.fallIndex];
                            const moveX = (bat.x + (enemy.dim.x >> 1) < 160) ? -move.x : move.x;
                            beastSpritePane.moveSprite(bat.id, moveX, -move.y);
                        }
                    }

                    if (enemy.state === -1) {
                        for (let i = 0; i <  runningEvents.length; i++) {
                            const runningEvent = runningEvents[i];
                            if (runningEvent.id === enemy.action && runningEvent.pos === enemy.pos) {
                                runningEvents.splice(i, 1);
                                break;
                            }
                        }
                        beastSpritePane.removeSprite(enemy.id);
                    } else {
                        activeEnemies.push(enemy);
                    }
                }
                currEnemies = activeEnemies;
            });

        }
    });

    shadowScreen.addAudio('audio/sotb-ingame.mp3');

    this.addScreen(shadowScreen);

    // #################################
    //   Super Mario Bros
    // #################################

    const marioScreen = new Screen('mario');

    marioScreen.setInitHandler(function (globals) {
        this.addImageResources({
            'tiles.png': "data:image/png;base64,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"
        });
        return function (resource, globals) {
            const audio = this.audio;
            const vSplitArea = new SplitArea('X', [32, 256, 32]);
            const world = globals.worlds[globals.world];
            const themes = {
                overworld: {
                    bgColor: '#5c94fc',
                    bgm: 'overworld',
                    tileSet: 0,
                    baseBlock: 1
                },
                underworld: {
                    bgColor: '#000000',
                    bgm: 'underworld',
                    tileSet: 1,
                    baseBlock: 2
                },
                castle: {
                    bgColor: '#000000',
                    bgm: 'castle',
                    tileSet: 2,
                    baseBlock: 2
                }
            };
            const theme = themes[world.theme];
            if (globals.world === getMainWorld()) {
                if (globals.worldPos === null) {
                    const savePositions = [];
                    for (let y = 0; y < world.map.length; y++) {
                        for (let x = 0; x < world.map[y].length; x++) {
                            const item = world.map[y][x];
                            if (Array.isArray(item) && item.indexOf('object:store-position') !== -1) {
                                savePositions.push([x, y]);
                            }
                        }
                    }
                    savePositions.sort(function (a, b) {
                        if (a[0] < b[0]) {
                            return -1;
                        } else if (a[0] === b[0]) {
                            return 0;
                        }
                        return 1;
                    });
                    globals.savePositions = savePositions;
                    globals.activeSavePosition = null;
                } else {
                    let i = 0;
                    for (let savePos of globals.savePositions) {
                        if (savePos[0] <= globals.worldPos.x) {
                            globals.activeSavePosition = i;
                        }
                        i++;
                    }
                }
            }

            vSplitArea.addPane(new ColorPane(theme.bgColor), 1);
            marioScreen.addArea(vSplitArea);

            const gameArea = new SplitArea('Y', [24, 200]);
            if (globals.time === null || (!isSubWorld() && globals.pipingUp !== true)) {
                globals.time = world.cutscene !== undefined ? null : 400;
            }
            globals.updateStatusPane();

            function getTileFromSet(index) {
                if (index === 0) {
                    return 0;
                } else if (index === 28 && theme.tileSet > 0) {
                    return 66 + (theme.tileSet - 1) * 66;
                }
                return index + theme.tileSet * 66;
            }

            vSplitArea.addPane(globals.statusPane, 1);
            const questionMarkAnimation = {
                frames: [
                    {id: getTileFromSet(24), duration: 25},
                    {id: getTileFromSet(25), duration: 10},
                    {id: getTileFromSet(26), duration: 10}
                ],
                end: ANIMATION.END.LOOP,
                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            };
            const coinAnimation = {
                frames: [
                    {id: getTileFromSet(57), duration: 25},
                    {id: getTileFromSet(58), duration: 10},
                    {id: getTileFromSet(59), duration: 10}
                ],
                end: ANIMATION.END.LOOP,
                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            };
            const axeAnimation = {
                frames: [
                    {id: 192, duration: 25},
                    {id: 193, duration: 10},
                    {id: 194, duration: 10}
                ],
                end: ANIMATION.END.LOOP,
                dir: ANIMATION.DIR.FORWARD_BACKWARD,
                synchronous: true
            };

            const tiles = {
                237: {
                    collectEvent: 'glide'
                },
                796: {
                    block: true
                },
                'empty-blocker': {
                    index: 0,
                    block: true
                },
                'axe': {
                    animation: 'axeAnimation',
                    collectEvent: 'openBridge'
                },
                'coin-block': {
                    animation: 'questionMarkAnimation',
                    hitEvent: 'one-coin',
                    block: true
                },
                'star-block': {
                    index: getTileFromSet(theme.baseBlock),
                    hitEvent: 'bump-star',
                    block: true
                },
                'coin-cache': {
                    index: getTileFromSet(theme.baseBlock),
                    hitEvent: 'coin-cache',
                    block: true
                },
                'one-up-hidden': {
                    index: 0,
                    hitEvent: 'bump-one-up'
                },
                'coin-hidden': {
                    index: 0,
                    hitEvent: 'one-coin'
                },
                'power-up-hidden': {
                    index: getTileFromSet(theme.baseBlock),
                    block: true,
                    hitEvent: 'bump-power-up'
                },
                'one-up-block': {
                    index: getTileFromSet(theme.baseBlock),
                    block: true,
                    hitEvent: 'bump-one-up'
                },
                'tube-down.1-1.uw': {
                    index: getTileFromSet(264),
                    block: true,
                    downTarget: '1-1.uw'
                },
                'tube-down.1-2.sub': {
                    index: getTileFromSet(264),
                    block: true,
                    downTarget: '1-2.sub'
                },
                'tube-down.1-1.ow': {
                    index: getTileFromSet(264),
                    block: true,
                    downTarget: '1-1'
                },
                'tube-right.1-1.ow': {
                    index: 66,
                    block: true,
                    rightTarget: '1-1:164-8'
                },
                'tube-right.1-2.uw': {
                    index: 28,
                    block: true,
                    rightTarget: '1-2.uw'
                },
                'tube-right.1-2.uw#2': {
                    index: 66,
                    block: true,
                    rightTarget: '1-2.uw:115-8'
                },
                'tube-right.1-2.ow': {
                    index: 68,
                    block: true,
                    rightTarget: '1-2.ow:3-8'
                },
            };
            tiles[getTileFromSet(1)] = {block: true, hitEvent: 'breaking-block'};
            tiles[getTileFromSet(2)] = {block: true, hitEvent: 'breaking-block'};
            tiles[getTileFromSet(3)] = {block: true};
            tiles[getTileFromSet(28)] = {block: true};
            tiles[getTileFromSet(24)] = {
                block: true,
                hitEvent: 'bump-power-up',
                animation: 'questionMarkAnimation'
            };
            tiles[getTileFromSet(57)] = {
                collectEvent: 'coin',
                animation: 'coinAnimation'
            };
            const tileIds = [27, 33, 35, 48, 264, 265, 266, 267, 268, 297, 298, 299, 300, 301, 330, 331, 269, 270, 271];
            for (let tileId of tileIds) {
                tiles[getTileFromSet(tileId)] = {block: true};
            }

            let bgTilesMap = new TilesMap({
                id: 'mario-tiles',
                tileBits: TILE.DIM_16x16,
                image: resource.image['tiles.png'],
                tiles,
                map: world.map,
                defaultTile: {
                    block: false
                },
                animations: {
                    coinAnimation,
                    questionMarkAnimation,
                    axeAnimation
                }
            });
            const tilesPane = new BufferedTilesPane(bgTilesMap, {maxSpeed: 3});
            tilesPane.setEventBounds({right: 3});
            let mapX = -1;
            let playerX = world.startPos.x;
            let playerY = world.startPos.y;
            if (globals.worldPos !== null) {
                mapX = globals.worldPos.x - 2 - 1;

                playerX = 2;
                playerY = globals.worldPos.y;
            }

            tilesPane.setMapTilePos(mapX, -1);
            gameArea.addPane(tilesPane, 1);

            vSplitArea.addArea(gameArea, 1);

            const spritePane = new SpritePane(globals.spriteSheet);
            const marioPosition = new Position((playerX << 4) + (globals.pipingUp ? 8 : 0), (playerY << 4) + 24 + 16);
            spritePane.addSprite('player', (globals.marioLevel === 0 ? 'small-' : '') + 'mario');
            spritePane.setSpriteBottomPos('player', marioPosition.getX(), marioPosition.getY());
            spritePane.setAnimationSpeed('player', 0.2);
            if (globals.pipingUp === true) {
                spritePane.hideSprite('player');
            }
            spritePane.addSprite('minicoin', 'minicoin', 87, 16);
            spritePane.setNoCollision('minicoin', true);
            spritePane.setActorId('player');
            spritePane.setAttachDefault(tilesPane);
            vSplitArea.addPane(spritePane, 1);

            const masterSlaveScroller = new MasterSlavesScrollHandler(tilesPane);
            masterSlaveScroller.addSpriteSlave(spritePane, -1);
            const gameScrollBounds = new BoundsScrollHandler(spritePane, masterSlaveScroller, {right: 140}, {top: 33, bottom: 33});
            gameScrollBounds.setUsePushback(true);

            const actorYStates = new States([
                'standing', 'ducking', 'jumping', 'falling', 'dead', 'piping'
            ]);
            actorYStates.addTransition('standing', 'move-down', 'ducking');
            actorYStates.addTransition('standing', 'button-a', 'jumping');
            actorYStates.addTransition('standing', 'no-floor', 'falling');
            actorYStates.addTransition('standing', 'piping-down', 'piping');
            actorYStates.addTransition('standing', 'piping-right', 'piping');
            actorYStates.addTransition('ducking', 'not-move-down', 'standing');
            actorYStates.addTransition('ducking', 'piping-down', 'piping');
            actorYStates.addTransition('ducking', 'button-a', 'jumping');
            actorYStates.addTransition('ducking', 'no-floor', 'falling');

            actorYStates.addTransition('jumping', ['end-of-jump', 'not-move-up', 'hit-ceiling', 'hit-enemy'], 'falling');
            actorYStates.addTransition('falling', 'hit-bottom', 'standing');
            actorYStates.addTransition('falling', ['hit-enemy', 'hit-ceiling'], 'falling');
            actorYStates.addTransition('falling', 'disappear-bottom', 'dead');
            actorYStates.setEventPrios([
                'disappear-bottom', 'no-floor', 'hit-ceiling', 'hit-bottom', 'hit-enemy', 'not-move-up', 'not-move-down',
                'button-a', 'move-down', 'end-of-jump', 'piping-down', 'piping-right'
            ]);
            actorYStates.setState('standing');

            const actorXStates = new States([
                'still', 'accelerating', 'sliding', 'turning'
            ]);
            actorXStates.addTransition('still', 'move-dir', 'accelerating');
            actorXStates.addTransition('still', 'move-opp-dir', 'accelerating');
            actorXStates.addTransition('accelerating', 'not-move-dir', 'sliding');
            actorXStates.addTransition('sliding', ['blocked-dir', 'end-of-slide'], 'still');
            actorXStates.addTransition('sliding', 'move-dir', 'accelerating');
            actorXStates.addTransition('sliding', 'move-opp-dir', 'turning');
            actorXStates.addTransition('turning', 'move-dir', 'accelerating');
            actorXStates.addTransition('turning', ['blocked-dir', 'end-of-slide'], 'still');
            actorXStates.setEventPrios(
                ['not-move-dir', 'move-dir', 'move-opp-dir', 'blocked-dir', 'end-of-slide']
            );
            actorXStates.setState('still');

            const inputController = new InputController();
            inputController.setDirInputsKeyboard('w', 's', 'a', 'd');
            inputController.setDirInputsGamepad(12, 13, 14, 15);
            inputController.setDirInputsTouch('up', 'down', 'left', 'right');
            inputController.addInput('button-a', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('button-a', 'k');
            inputController.assignButtonToInput('button-a', 0);
            inputController.assignTouchToInput('button-a', '1');
            inputController.addInput('button-b', INPUT.TYPE.PRESS_AND_RELEASE);
            inputController.assignKeyToInput('button-b', 'j');
            inputController.assignButtonToInput('button-b', 2);
            inputController.assignTouchToInput('button-b', '2');
            inputController.addInput('back', INPUT.TYPE.PRESSED_DOWN);
            inputController.assignButtonToInput('back', 8);
            inputController.assignTouchToInput('back', '3');


            const collideCheck = function(tile) {
                return (tile.obj !== null && tile.obj.block);
            };
            const rightPipeTiles = [getTileFromSet(266), getTileFromSet(299)];
            const marioCollider = new SpriteAndTilesCollider('player', spritePane, tilesPane, {
                ceiling: {
                    dir: 'up',
                    lookahead: 5,
                    saveContacts: true,
                    check: function (tile) {
                        return (tile.obj !== null && (tile.obj.block || tile.obj.hitEvent !== undefined))
                    },
                    margin: {
                        start: 3,
                        end: 2,
                        dir: 2
                    }
                },
                floor: {
                    dir: 'down',
                    lookahead: 5,
                    saveContacts: true,
                    check: collideCheck,
                    margin: {
                        dir: 0,
                        start: 3,
                        end: 2
                    }
                },
                left: {
                    dir: 'left',
                    check: collideCheck,
                    lookahead: 5,
                    margin: {
                        dir: 2,
                        start: 3,
                        end: 0
                    }
                },
                right: {
                    dir: 'right',
                    check: collideCheck,
                    lookahead: 5,
                    margin: {
                        dir: 2,
                        start: 3,
                        end: 0
                    }
                },
                rightPipe: {
                    dir: 'right',
                    check: function (tile) {
                        return (tile.obj && rightPipeTiles.indexOf(tile.obj.index) !== -1);
                    },
                    lookahead: 5,
                    margin: {
                        dir: 0,
                        start: 3,
                        end: 0
                    }
                },
                center: {
                    dir: 'center',
                    check: function (tile) {
                        if (tile.obj !== null && tile.obj.collectEvent) {
                            switch (tile.obj.collectEvent) {
                                case 'glide':
                                    return (tile.touch > 7);
                                case 'coin':
                                    return true;
                                case 'openBridge':
                                    return true;
                            }
                        }
                        return false;
                    }
                }
            });

            let marioLeft = false;
            let hitEnemy = false;
            const marioLevels = ['small-', '', 'fire-'];
            let invincibleTimer = null;
            const bumpPath = AxisPath.new().addRelativePoints([-1, -2, -1, -1, -1, 0, -1, 1, 0, 1, 1, 2, 2, 2, -1]);
            const kickoutPath =
                new AxisPath()
                    .addTarget(-30, 20, PATH.TYPE.DAMPED)
                    .addTarget(280, 60, PATH.TYPE.ACCELERATED)
                    .round();
            const coinCaches = {};

            function isSubWorld() {
                return globals.world.indexOf('.') !== -1;
            }

            function getMainWorld() {
                const parts = globals.world.split('.', 2);
                const mainPart = parts[0];
                if (globals.worlds[mainPart].main !== undefined) {
                    return globals.worlds[mainPart].main;
                }
                return mainPart;
            }

            function incCoins() {
                globals.coins++;
                if (globals.coins === 100) {
                    globals.lifes++;
                    globals.coins = 0;
                    audio.play('oneup');
                }
                globals.updateCoins();
                audio.play('coin');
            }

            function coinUp(obj) {
                incCoins();
                const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                objectController.addObject('coin-jump', {x: pos.x, y: pos.y, points: 100});
            }

            function jumpRightOnBlocks(obj) {
                if (obj.collider === undefined) {
                    obj.yVector = [null, null];
                    obj.collider = new SpriteAndTilesCollider(obj.id, spritePane, tilesPane, {
                        floor: {
                            dir: 'down',
                            lookahead: 4,
                            margin: {
                                dir: 0
                            }
                        }

                    });
                    obj.collider.setSpriteOffset(0, -24);
                }
                const collides = obj.collider.getCollides(['floor']);
                if (collides.floor.dist > 0) {
                    if (obj.yVector[0] === null) {
                        obj.yVector[0] = jumpForce.getPeakTime();
                        obj.yVector[1] = 20;
                    }
                } else {
                    obj.yVector[0] = 0;
                    obj.yVector[1] = null;
                }
                moveObjectSprite(obj, 1, jumpForce.getMoveForTimeVector(obj.yVector, null, collides.floor.dist));
                jumpForce.incVector(obj.yVector);
                if (obj.yVector[0] === 10) {
                    obj.yVector[1] = 0;
                }
            }

            function moveAlongBlocks(obj, speed = 1, bounce = null) {
                if (obj.collider === undefined) {
                    obj.yVector = [null, null];
                    const pos = spritePane.getSpritePos(obj.id);
                    const start = pos.dim.y > 16 ? pos.dim.y - 16 : 0;
                    const collides = {
                        floor: {
                            dir: 'down',
                            lookahead: 2,
                            margin: {
                                dir: 0
                            }
                        },
                        right: {
                            dir: 'right',
                            lookahead: Math.max(speed, 1),
                            margin: {
                                start,
                                end: 1
                            }
                        },
                        left: {
                            dir: 'left',
                            lookahead: Math.max(speed, 1),
                            margin: {
                                start,
                                end: 1
                            }
                        },

                    };
                    if (obj.preventFall === true) {
                        collides.leftFloor = {
                            dir: 'down',
                            lookahead: 2,
                            margin: {
                                dir: -1,
                                start: -1,
                                end: 15,
                            }
                        };
                        collides.rightFloor = {
                            dir: 'down',
                            lookahead: 2,
                            margin: {
                                dir: -1,
                                start: 15,
                                end: -1,
                            }
                        };
                    }
                    obj.collideKeys = Object.keys(collides);
                    obj.collider = new SpriteAndTilesCollider(obj.id, spritePane, tilesPane, collides);
                    obj.collider.setSpriteOffset(0, -24);
                }

                const oldDir = obj.dir;
                const spriteCollides = spritePane.getLastSpriteCollisions(obj.id);
                let doBump = false;
                let changeDir = false;
                for (let collide of spriteCollides) {
                    const collideObj = objectController.getObjectWithSpriteId(collide.sprite.id);
                    if (collideObj === null) {
                        continue;
                    }
                    if (obj.enemy === true && collideObj.enemy === true) {
                        if (collideObj.killing === true) {
                            obj.kickout = -collideObj.dir;
                            return false;
                        } else if (collideObj.killing !== true && obj.killing !== true) {
                            changeDir = ((collide.x.type === 'left' && obj.dir === 1) || (collide.x.type === 'right' && obj.dir === -1));
                        }
                    }
                    if (['breaking-block', 'bumping-block'].indexOf(collideObj.class) !== -1) {
                        if (obj.enemy === true && globals.marioLevel > 0) {
                            obj.kickout = -oldDir;
                        } else {
                            if (obj.dir === -1 && collide.x.type === 'right' && collide.x.touch < 10) {
                                obj.dir = 1;
                            } else if (obj.dir === 1 && collide.x.type === 'left' && collide.x.touch < 10) {
                                obj.dir = -1;
                            }
                            doBump = true;
                        }
                    }
                }
                const collides = obj.collider.getCollides(obj.collideKeys);
                if (collides.floor.dist === 0 && !changeDir && obj.killing !== true) {
                    if (obj.dir === -1 && collides.leftFloor && collides.leftFloor.dist > 0) {
                        changeDir = true;
                    } else if (obj.dir === 1 && collides.rightFloor && collides.rightFloor.dist > 0) {
                        changeDir = true;
                    }
                }
                if (doBump || collides.floor.dist !== 0) {
                    if (obj.yVector[0] === null) {
                        obj.yVector[0] = doBump ? 2 : jumpForce.getPeakTime() + 20;
                        obj.yVector[1] = doBump ? 0 : 20;
                    }
                } else {
                    if (bounce !== null) {
                        obj.yVector[0] = 0;
                        obj.yVector[1] = bounce;
                    } else {
                        obj.yVector[0] = null;
                        obj.yVector[1] = null;
                    }
                }
                if (obj.dir === 1 && (changeDir || collides.right.dist === 0)) {
                    obj.dir = (collides.left.dist === 0 ? 0 : -1);
                } else if (changeDir || collides.left.dist === 0) {
                    obj.dir = (collides.right.dist === 0 ? 0 : 1);
                }
                moveObjectSprite(obj, obj.dir * speed, jumpForce.getMoveForTimeVector(obj.yVector, null, collides.floor.dist));
                jumpForce.incVector(obj.yVector);

                return oldDir !== obj.dir;
            }

            function initBump(obj) {
                const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                obj.bumpSprite = getEnemySprite(null, (obj.bumpTile === getTileFromSet(3)) ? 'bump-box' : 'bump-block' + theme.baseBlock);
                spritePane.addSprite(obj.id, obj.bumpSprite, pos.x, pos.y + 24 - 1);
                obj.bump = 0;
                obj.sprites.push(obj.id);
                audio.play('bump');
            }

            function moveBump(obj) {
                if (obj.bump === 0) {
                    tilesPane.replaceTile(obj.event.tile.x, obj.event.tile.y, 'empty-blocker');
                    const x = obj.event.tile.x;
                    const y = obj.event.tile.y;
                    objectController.addObject('collect-coin', {event: {tile: {x, y: y - 1}}});
                }
                const move = bumpPath.forwardFrom(obj.bump);
                if (move === null) {
                    const x = obj.event.tile.x;
                    const y = obj.event.tile.y;
                    tilesPane.replaceTile(x, y, obj.bumpTile);
                    if (obj.next !== undefined) {
                        objectController.addObject(obj.next, obj);
                    }
                    return false;
                } else {
                    moveObjectSprite(obj, 0, move);
                    obj.bump++;
                }
            }

            function handleKickout(obj, sprite) {
                if (obj.kickout !== undefined) {
                    spritePane.assignSprite(obj.id, sprite);
                    spritePane.setNoCollision(obj.id, true);
                    addScoreForSprite(100, obj.id);
                    obj.dir = obj.kickout;
                    obj.state = 1;
                    obj.yVector = [0, 0];
                    obj.kickout = undefined;
                    audio.play('kick');
                }
            }

            function moveObjectSprite(obj, x = 0, y = 0, id = null) {
                if (id === null) {
                    id = obj.id;
                }
                if (obj.realPos === undefined) {
                    obj.realPos = {};
                }
                if (obj.realPos[id] === undefined) {
                    const pos = spritePane.getSpritePos(id);
                    obj.realPos[id] = new Position(pos.x, pos.y);
                }
                const delta = obj.realPos[id].move(x, y);
                spritePane.moveSprite(id, delta.x, delta.y);
            }

            const eventTileIdParts = [['event', 'tile', 'x'], ['event', 'tile', 'y']];

            const obstacleController = new ObjectController(spritePane, 'obstacle');
            obstacleController.addClass(
                'bar',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite(obj.id, 'bar' + (obj.short === true ? '-short' : ''), pos.x, pos.y + 24, -1);
                        spritePane.setNoCollision(obj.id, true);
                        obj.pos = 0;
                        obj.sprites.push(obj.id);
                    } else {
                        const pos = spritePane.getSpritePos(obj.id);
                        let moveX = null;
                        let moveY = null;
                        switch(obj.dir) {
                            case 'up':
                                if (pos.y === 24) {
                                    spritePane.setSpritePos(obj.id, pos.x, 192 + 24);
                                } else {
                                    moveY = -1;
                                }
                                break;

                            case 'down':
                                if (pos.y > 192 + 24) {
                                    spritePane.setSpritePos(obj.id, pos.x, 24);
                                } else {
                                    moveY = 1;
                                }
                                break;

                            case 'leftright':
                                moveX = obj.leftRightPath.forwardFrom(obj.pos);
                                if (moveX === null) {
                                    obj.pos = 0;
                                } else {
                                    obj.pos++;
                                }
                                break;

                            case 'updown':
                                moveY = obj.upDownPath.forwardFrom(obj.pos);
                                if (moveY === null) {
                                    obj.pos = 0;
                                } else {
                                    obj.pos++;
                                }
                                break;

                        }
                        if (moveY !== null || moveX !== null) {
                            const actor = spritePane.getSpritePos('player', false, true);
                            if (moveX === null) {
                                moveX = 0;
                            }
                            if (moveY === null) {
                                moveY = 0;
                            }
                            if (moveY !== 0) {
                                if (spritePane.isAxisCollide(actor.x, actor.x + actor.dim.x, pos.x, pos.x + pos.dim.x)) {
                                    // check auto-move
                                    const delta = 4;
                                    let actorMoveY = 0;
                                    if (moveY > 0) {
                                        if ((pos.y - 1 <= actor.y) && (actor.y <= pos.y + delta)) {
                                            actorMoveY = pos.y + moveY - actor.y;
                                        }
                                    } else {
                                        if ((pos.y - moveY <= actor.y) && (actor.y <= pos.y + delta)) {
                                            actorMoveY = pos.y - 1 - moveY - actor.y;
                                        }
                                    }
                                    if (actorMoveY !== 0) {
                                        gameScrollBounds.moveActor(
                                            0, actorMoveY
                                        );
                                    }
                                }
                            }
                            if (moveX !== 0) {
                                if (floorObstacles.indexOf(obj.id) !== -1) {
                                    forceMoveX = moveX;
                                }
                            }
                            spritePane.moveSprite(obj.id, moveX, moveY);
                        }
                    }
                },
                {
                    upDownPath: new AxisPath()
                        .addTarget(64, 80, PATH.TYPE.DAMPED)
                        .addTarget(0, 80, PATH.TYPE.ACCELERATED)
                        .addTarget(-64, 80, PATH.TYPE.DAMPED)
                        .addTarget(0, 80, PATH.TYPE.ACCELERATED)
                        .round(),
                    leftRightPath: new AxisPath()
                        .addTarget(24, 80, PATH.TYPE.DAMPED)
                        .addTarget(0, 80, PATH.TYPE.ACCELERATED)
                        .addTarget(-24, 80, PATH.TYPE.DAMPED)
                        .addTarget(0, 80, PATH.TYPE.ACCELERATED)
                        .round(),
                    variants: {
                        'up': {
                            dir: 'up'
                        },
                        'down': {
                            dir: 'down'
                        },
                        'leftright': {
                            dir: 'leftright'
                        },
                        'short-leftright': {
                            dir: 'leftright',
                            short: true
                        },
                        'updown': {
                            dir: 'updown'
                        }
                    },
                    short: false,
                    autoRemove: false
                }
            );

            const objectController = new ObjectController(spritePane);
            objectController.setRemoveMargin('left', -16);
            objectController.setRemoveMargin('right', 80);

            objectController.addClass(
                'scrollstop',
                function (obj) {
                    tilesPane.setScrollLock(true);
                    return false;
                }
            );

            objectController.addClass(
                'warp-zone',
                function (obj) {
                    const pos = spritePane.getSpritePos('player');
                    if (pos.x >= 256 - 116) {
                        const plants = objectController.getObjectsForClass('plant');
                        for (let plant of plants) {
                            plant.state = 'die';
                        }
                        globals.statusPane.addTextBlock({
                            id: 'warp-msg',
                            x: 36,
                            y: 88,
                            text:
                                "WELCOME YOU CHEATER!\n\n\n\n\n" +
                                ' 1       1       1'
                        });
                        return false;
                    }
                }
            );

            objectController.addClass(
                'store-position',
                function (obj) {
                    if (tilesPane.getViewPortMapPos().start.x >= obj.event.tile.x) {
                        globals.activeSavePosition = 0;
                        for (let pos of globals.savePositions) {
                            if (pos[0] === obj.event.tile.x) {
                                break;
                            }
                            globals.activeSavePosition++;
                        }
                        return false;
                    }
                }
            );

            objectController.addClass(
                'collect-coin',
                function (obj) {
                    const x = obj.event.tile.x;
                    const y = obj.event.tile.y;
                    const topTile = tilesPane.getTileAt(x, y);
                    if (topTile !== null) {
                        if (topTile.index === getTileFromSet(57)) {
                            objectController.addObject('bump-coin', obj);
                        }
                    }
                    return false;
                }
            );

            objectController.addClass(
                'flag',
                function (obj) {
                    const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                    spritePane.addSprite('flag', 'flag', pos.x - 9, pos.y + 27, -1);
                    spritePane.setNoCollision('flag', true);
                    return false;
                }
            );

            objectController.addClass(
                'flag-up-fg',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite('flag-up-fg', 'flag-up-fg', pos.x - 1, pos.y + 24, 2);
                        spritePane.setNoCollision('flag-up-fg', true);
                        if (obj.hidden) {
                            spritePane.hideSprite('flag-up-fg');
                        }
                    }
                },
                {
                    hidden: false,
                    variants: {
                        hidden: {
                            hidden: true
                        }
                    }
                }
            );
            objectController.addClass(
                'bump-power-up',
                function (obj) {
                    obj.next = 'power-up';
                    obj.bumpTile = getTileFromSet(3);
                    objectController.addObject('bumping-block', obj);
                    audio.play('newpowerup');
                    return false;
                }
            );

            objectController.addClass(
                'bump-one-up',
                function (obj) {
                    obj.next = 'one-up';
                    obj.bumpTile = getTileFromSet(3);
                    objectController.addObject('bumping-block', obj);
                    audio.play('newpowerup');
                    return false;
                }
            );

            objectController.addClass(
                'one-up-score',
                function (obj) {
                    if (obj.frame === 0) {
                        spritePane.addSprite(obj.id, '1up', obj.x, obj.y);
                        spritePane.attachSpriteTo(obj.id, null);
                        obj.sprites.push(obj.id);
                    } else if (obj.frame === 50) {
                        return false;
                    }
                    moveObjectSprite(obj, 0, -1);
                }
            );

            objectController.addClass(
                'coin-jump',
                function (obj) {
                    if (obj.frame === 0) {
                        spritePane.addSprite(obj.id, 'coin-up', obj.x, obj.y);
                        spritePane.setNoCollision(obj.id, true);
                        spritePane.setAnimationSpeed(obj.id, 0.2);
                        obj.yVector = [6, null];
                        obj.sprites.push(obj.id);
                    } else if (obj.frame === 30) {
                        const pos = spritePane.getSpritePos(obj.id);
                        addScore(200, pos.x, pos.y);
                        return false;
                    }
                    jumpForce.incVector(obj.yVector);
                    if (obj.frame === 10) {
                        obj.yVector[1] = 0;
                    }
                    moveObjectSprite(obj, 0, jumpForce.getMoveForTimeVector(obj.yVector));
                }

            );

            objectController.addClass(
                'bump-star',
                function (obj) {
                    obj.next = 'star';
                    obj.bumpTile = getTileFromSet(3);
                    objectController.addObject('bumping-block', obj);
                    audio.play('newpowerup');
                    return false;
                }
            );

            const setSpriteDelta = function (obj, move = 0) {
                spritePane.setSpriteFilters(obj.id, 'clear-y(-' + obj.delta + ')');
                if (move !== 0) {
                    spritePane.moveSprite(obj.id, 0, move);
                }
            };

            objectController.addClass(
                'plant',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite(obj.id, getEnemySprite(null, 'plant'), pos.x + 8, 24 + pos.y + 16);
                        spritePane.setAnimationSpeed(obj.id, 0.1);
                        obj.sprites.push(obj.id);
                        obj.time = 0;
                        obj.dimY = spritePane.getSpritePos(obj.id).dim.y;
                        obj.state = 'wait';
                        obj.delta = obj.dimY;
                        setSpriteDelta(obj);
                        return;
                    }
                    const collision = spritePane.getActorCollision(obj.id);
                    const isColliding = collision !== null;
                    if (isColliding && hideCounter === 0) {
                        const pos = spritePane.getSpritePos(obj.id, false, true);
                        const actorPos = spritePane.getSpritePos('player', false, true);
                        if ((pos.y - 12) - actorPos.y  < 0) {
                            cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';
                        }
                    }
                    if (obj.frame % 4 > 0) {
                        return;
                    }
                    if (obj.kickout !== undefined) {
                        obj.state = 'kickout';
                    }
                    obj.time++;
                    let newState = null;
                    switch(obj.state) {
                        case 'kickout':
                            addScoreForSprite(200, obj.id);
                            return false;

                        case 'die':
                            return false;

                        case 'down':
                            if (obj.delta < obj.dimY) {
                                obj.delta++;
                                setSpriteDelta(obj, 1);
                            }
                            if (obj.time === obj.dimY + 25) {
                                newState = 'wait';
                            }
                            break;

                        case 'wait':
                            const pos = spritePane.getSpritePos(obj.id);
                            const actorPos = spritePane.getSpritePos('player');
                            if ((actorPos.x + actorPos.dim.x + 8 < pos.x) || (actorPos.x - 8 > pos.x + pos.dim.x)) {
                                newState = 'up';
                            }
                            break;

                        case 'up':
                            if (obj.delta > 0) {
                                obj.delta--;
                                setSpriteDelta(obj, -1);
                            }
                            if (obj.time === obj.dimY + 25) {
                                newState = 'down';
                            }
                            break;
                    }
                    if (newState !== null) {
                        obj.state = newState;
                        obj.time = 0;
                    }
                },
                {
                    enemy: true
                }
            );

            objectController.addClass(
                'turtle',
                function (obj) {
                    let newState = null;
                    if (obj.frame === 0) {
                        // initial state
                        obj.state = obj.flying ? 'flying' : 'running';
                        obj.pos = 0;
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite(obj.id, getEnemySprite(obj, obj.flying ? 'flying-turtle' : 'turtle'), pos.x, pos.y + 24 - 8);
                        spritePane.setAnimationSpeed(obj.id, 0.1);
                        obj.sprites.push(obj.id);
                        obj.hadCollision = false;
                        obj.checkDeath = () => {
                            if (invincibleTimer !== null) {
                                obj.kickout = marioLeft ? 1 : -1;
                            } else if (hideCounter === 0) {
                                cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';

                            }
                        };
                        return;
                    } else {
                        if (obj.kickout !== undefined) {
                            obj.doRev = false;
                            handleKickout(obj, getEnemySprite(obj, 'turtle-shell-flipped'));
                            obj.state = 'kickout';
                        }
                        if (obj.state === 'kickout') {
                            moveObjectSprite(
                                obj,
                                obj.dir * (obj.frame % 2 === 0 ? 1 : 0),
                                kickoutPath.forwardFrom(obj.yVector[0])
                            );
                            jumpForce.incVector(obj.yVector);
                            return;
                        }
                        const collision = spritePane.getActorCollision(obj.id);
                        let isColliding = collision !== null && !(collision.y.type === COLLISION.BOTTOM && collision.y.touch <= 8);
                        if (isColliding && obj.hadCollision) {
                            isColliding = false;
                            obj.hadCollision = true;
                        } else {
                            obj.hadCollision = isColliding;
                        }
                        const isActorOnTop = isColliding && actorYStates.getState() === 'falling' &&
                                (collision.y.type === COLLISION.BOTTOM && collision.y.touch > 0 && collision.y.touch < 16);

                        let speed;
                        switch(obj.state) {
                            case 'flying':
                                let move = obj.path.forwardFrom(obj.pos);
                                if (isColliding) {
                                    if (isActorOnTop) {
                                        obj.state = 'running';
                                        hitEnemy = true;
                                        spritePane.assignSprite(obj.id, getEnemySprite(obj, 'turtle'));
                                        obj.flying = false;
                                        move = null;
                                    } else {
                                        obj.checkDeath();
                                    }
                                }
                                if (move === null) {
                                    obj.pos = 0;
                                } else {
                                    obj.pos++;
                                    spritePane.moveSprite(obj.id, 0, move);
                                }
                                break;

                            case 'running':
                                speed = 1;
                                if (isColliding) {
                                    if (isActorOnTop) {
                                        hitEnemy = true;
                                        obj.state = 'hiding';
                                        obj.hideFrame = obj.frame;
                                        obj.doRev = false;
                                        obj.dir = -1;
                                        speed = 0;
                                        spritePane.assignSprite(obj.id, getEnemySprite(obj, 'turtle-shell'));
                                        addScoreForSprite(500, obj.id);
                                        audio.play('kick');
                                    } else {
                                        obj.checkDeath();
                                    }
                                }
                                if (speed > 0 && moveAlongBlocks(obj, obj.frame % 2 === 0 ? 0 : 1)) {
                                    spritePane.assignSprite(obj.id, getEnemySprite(obj, 'turtle'));
                                }
                                break;

                            case 'hiding':
                                if (isColliding) {
                                    switch (collision.x.type) {
                                        case COLLISION.LEFT:
                                            obj.dir = -1;
                                            break;

                                        case COLLISION.RIGHT:
                                            obj.dir = 1;
                                            break;

                                        default:
                                            obj.dir = marioLeft ? -1 : 1;
                                            break;
                                    }
                                    obj.state = 'gliding';
                                    obj.killing = true;
                                    spritePane.assignSprite(obj.id, getEnemySprite(obj, 'turtle-shell'));
                                    audio.play('kick');
                                }
                                const timer = obj.frame - obj.hideFrame;
                                if (timer >= 200) {
                                    if (timer === 200) {
                                        spritePane.assignSprite(obj.id, getEnemySprite(obj,'turtle-awake'));
                                    } else if (spritePane.getSprite(obj.id).animation.getState() === ANIMATION.STATE.DONE) {
                                        obj.state = 'running';
                                        obj.doRev = true;
                                        spritePane.assignSprite(obj.id, getEnemySprite(obj, 'turtle'));
                                    }
                                }
                                moveAlongBlocks(obj, 0);
                                break;

                            case 'gliding':
                                speed = 3;
                                if (isColliding) {
                                    if (isActorOnTop) {
                                        speed = 0;
                                        obj.state = 'hiding';
                                        obj.hideFrame = obj.frame;
                                        hitEnemy = true;
                                    } else {
                                        obj.checkDeath();
                                    }
                                }
                                if (moveAlongBlocks(obj, speed)) {
                                    audio.play('bump');
                                }
                                break;
                        }
                    }
                },
                {
                    enemy: true,
                    doRev: true,
                    path: new AxisPath()
                        .addTarget(28, 40, PATH.TYPE.DAMPED)
                        .addTarget(0, 40, PATH.TYPE.ACCELERATED)
                        .addTarget(-28, 40, PATH.TYPE.DAMPED)
                        .addTarget(0, 40, PATH.TYPE.ACCELERATED)
                        .round(),
                    flying: false,
                    variants: {
                        left: {dir: -1},
                        right: {dir: 1},
                        'red-left': {
                            dir: -1,
                            theme: 'red',
                            preventFall: true
                        },
                        'red-flying': {
                            dir: -1,
                            theme: 'red',
                            flying: true,
                            preventFall: true
                        }
                    },
                    idParts: eventTileIdParts,
                    dir: -1
                }
            );

            objectController.addClass(
                'evilmush',
                function (obj) {
                    if (obj.state === -1) {
                        obj.state = 0;
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite(obj.id, getEnemySprite(obj, 'evilmush'), pos.x + (obj.variant === 'right' ? 8 : 0), pos.y + 24);
                        spritePane.setAnimationSpeed(obj.id, 0.1);
                        obj.sprites.push(obj.id);
                        return;
                    } else if (obj.state < 0) {
                        obj.state++;
                        return (obj.state < -1);
                    } else if (obj.state === 1) {
                        moveObjectSprite(
                            obj,
                            obj.frame % 2 === 0 ? obj.dir : 0,
                            kickoutPath.forwardFrom(obj.yVector[0])
                        );
                        jumpForce.incVector(obj.yVector);
                        return;
                    }
                    const collision = spritePane.getActorCollision(obj.id);
                    let doMove = false;
                    if (collision !== null) {
                        if (jumpForce.getMoveForTimeVector(yAxisVector) > 0 && collision.y.type === COLLISION.BOTTOM
                            && collision.y.touch > 0 && collision.y.touch < 6) {
                            obj.state = -75;
                            spritePane.assignSprite(obj.id, getEnemySprite(obj, 'evilmush-dead'));
                            spritePane.moveSprite(obj.id, 0, 1);
                            audio.play('stomp');
                            hitEnemy = true;
                            addScoreForSprite(100, obj.id);
                        } else {
                            if (invincibleTimer !== null) {
                                obj.kickout = (marioLeft ? -1 : 1);
                            } else if (hideCounter === 0) {
                                cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';
                            } else {
                                doMove = true;
                            }
                        }
                    } else if (obj.state === 0) {
                        doMove = true;
                    }
                    if (doMove) {
                        moveAlongBlocks(obj, obj.frame % 2 === 0 ? 1 : 0);
                    }
                    handleKickout(obj, getEnemySprite(obj, 'evilmush-flip'));
                },
                {
                    enemy: true,
                    variants: {
                        left: {
                            dir: -1,
                        },
                        right: {
                            dir: -1,
                        }
                    },
                    idParts: eventTileIdParts,
                    state: -1,
                    dir: -1
                }
            );

            objectController.addClass(
                'bumping-block',
                function(obj) {
                    if (obj.frame === 0) {
                        obj.bumpTile = (obj.bumpTile === undefined ? getTileFromSet(theme.baseBlock) : obj.bumpTile);
                        initBump(obj);
                        return;
                    }
                    return moveBump(obj);
                },
                {
                    idParts: eventTileIdParts
                }
            );

            objectController.addClass(
                'breaking-block',
                function (obj) {
                    if (obj.frame === 0) {
                        if (globals.marioLevel === 0) {
                            obj.bumpTile = getTileFromSet(theme.baseBlock);
                            initBump(obj);
                        } else {
                            obj.moves = [
                                [0, 0, -2],
                                [6, 0, -1],
                                [6, 0,  1],
                                [0, 0, 2]
                            ];
                            const x = obj.event.tile.x;
                            const y = obj.event.tile.y;
                            objectController.addObject('collect-coin', {event: {tile: {x, y: y - 1}}});
                            const pos = tilesPane.getRelativePositionOfTile(x, y);
                            let i = 1;
                            for(let move of obj.moves) {
                                const subId = obj.id + '_' + i;
                                spritePane.addSprite(subId, getEnemySprite(null, 'mini-block1'), pos.x + move[2], pos.y + 19);
                                obj.sprites.push(subId);
                                i++;
                            }
                            tilesPane.replaceTile(x, y, 0);
                            audio.play('bump');
                            audio.play('breakblock');
                        }
                        return;
                    }
                    if (obj.bump === undefined) {
                        for (let i = 1; i <= 4; i++) {
                            const move = obj.moves[i - 1];
                            jumpForce.incVector(move);
                            const subId = obj.id + '_' + i;
                            moveObjectSprite(obj, move[2], jumpForce.getMoveForTimeVector(move), subId);
                            if (obj.frame === 1) {
                                const collides = spritePane.getLastSpriteCollisions(subId);
                                for (let collide of collides) {
                                    const obj = objectController.getObjectWithSpriteId(collide.sprite.id);
                                    if (obj !== null && obj.enemy === true) {
                                        obj.kickout = marioLeft ? 1 : -1;
                                    }
                                }
                                spritePane.setNoCollision(subId, true);
                            }
                        }
                    } else {
                        return moveBump(obj);
                    }
                },
                {
                    idParts: eventTileIdParts
                }
            );

            objectController.addClass(
                'coin-cache',
                function (obj) {
                        if (obj.frame === 0) {
                            if (coinCaches[obj.id] === undefined) {
                                coinCaches[obj.id] = {
                                    time: globals.time
                                }
                            }
                            const coinCache = coinCaches[obj.id];
                            if (coinCache.time - globals.time > 10) {

                                obj.bumpTile = getTileFromSet(3);
                                delete coinCaches[obj.id];
                            } else {
                                obj.bumpTile = 'coin-cache';
                            }
                            objectController.addObject('one-coin', obj)
                        } else {
                            return false;
                        }

                },
                {
                    idParts: eventTileIdParts
                }
            );

            objectController.addClass(
                'bump-coin',
                function (obj) {
                    tilesPane.replaceTile(obj.event.tile.x, obj.event.tile.y, 0);
                    coinUp(obj);
                    return false;
                }
            );

            objectController.addClass(
                'one-coin',
                function (obj) {
                    if (obj.frame === 0) {
                        coinUp(obj);
                        objectController.addObject('bumping-block', {event: obj.event, bumpTile: (obj.bumpTile === undefined ? getTileFromSet(3) : obj.bumpTile)});
                        return;
                    }
                    return (obj.frame < 2);
                },
                {
                    idParts: eventTileIdParts
                }
            );

            objectController.addClass(
                'score',
                function (obj) {
                    if (obj.frame === 0) {
                        globals.score += obj.points;
                        const points = '' + obj.points;
                        const ids = [];
                        globals.updateScore();
                        for (let i = 0; i < points.length; i++) {
                            const id = spritePane.getUid('score');
                            ids.push(id);
                            spritePane.addSprite(id, 'num_' + points[i], obj.startX + 4 * i, obj.startY);
                            if (obj.stopAtTop !== true) {
                                spritePane.attachSpriteTo(id, null);
                            }
                        }
                        const groupId = ':' + obj.id;
                        spritePane.addGroup(obj.id, ids);
                        spritePane.setNoCollision(groupId, true);
                        obj.subIds = ids;
                        obj.realPos = {
                            [groupId]: new Position(obj.startX + 4, obj.startY)
                        };
                        obj.sprites.push(groupId);
                        return;
                    } else if (obj.stopAtTop !== true && obj.frame === 40) {
                        return false;
                    } else {
                        if (obj.stopAtTop === true) {
                            const pos = spritePane.getSpritePos(obj.subIds[0]);
                            if (pos.y <= 50) {
                                return;
                            }
                        }
                    }
                    moveObjectSprite(obj, 0, -1, obj.sprites[0]);
                },
                {autoRemove: false}
            );

            function shiftUp(obj) {
                spritePane.setSpriteFilters(obj.id,'shift-y(' + Math.floor(obj.state / obj.speed) + ')');
                tilesPane.replaceTile(obj.event.tile.x, obj.event.tile.y, getTileFromSet(3));
            }

            objectController.addClass(
                'star',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y - 1);
                        const dim = globals.spriteSheet.getSpriteDim('star');
                        obj.state = dim.y * obj.speed;
                        spritePane.addSprite(obj.id, 'star', pos.x, pos.y + 24);
                        spritePane.setAnimationSpeed(obj.id, 0.5);
                        shiftUp(obj);
                        obj.sprites.push(obj.id);
                        return;
                    }

                    if (spritePane.isCollidingActor(obj.id)) {
                        invincibleTimer = 0;
                        addScoreForSprite(1000, obj.id);
                        audio.loop('invincible', 'bgm');
                        return false;
                    }
                    if (obj.state > 0) {
                        obj.state--;
                        if (obj.state % obj.speed === 0) {
                            shiftUp(obj);
                        }
                    } else if (obj.state === 0) {
                        spritePane.setSpriteFilters(obj.id, '');
                        obj.state--;
                    } else {
                        jumpRightOnBlocks(obj);
                    }
                },
                {
                    idParts: eventTileIdParts,
                    speed: 3,
                    dir: 1
                }
            );

            objectController.addClass(
                'one-up',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y - 1);
                        const dim = globals.spriteSheet.getSpriteDim('one-up');
                        obj.state = dim.y * obj.speed;
                        spritePane.addSprite(obj.id, getEnemySprite(null, 'one-up'), pos.x, pos.y + 24);
                        shiftUp(obj);
                        obj.sprites.push(obj.id);
                        return;
                    }
                    if (spritePane.isCollidingActor(obj.id)) {
                        const pos = spritePane.getSpritePos(obj.id);
                        objectController.addObject('one-up-score', {x: pos.x, y: pos.y - 7});
                        globals.lifes++;
                        audio.play('oneup');
                        return false;
                    }
                    if (obj.state > 0) {
                        obj.state--;
                        if (obj.state % obj.speed === 0) {
                            shiftUp(obj);
                        }
                    } else if (obj.state === 0) {
                        spritePane.setSpriteFilters(obj.id, '');
                        obj.state--;
                    } else {
                        moveAlongBlocks(obj, 1);
                    }
                },
                {
                    idParts: eventTileIdParts,
                    speed: 3,
                    dir: 1
                }
            );

            const radius = 40;
            const steps = 10;
            const iMax = 6;
            const fireCirclePathX = {};
            const fireCirclePathY = {};
            for (let i = 0; i < iMax; i++) {
                const currRadius = radius - i * 8;
                fireCirclePathX[currRadius] = new AxisPath(0)
                    .addTarget(currRadius, steps, PATH.TYPE.DAMPED)
                    .addTarget(0, steps, PATH.TYPE.ACCELERATED)
                    .addTarget(-currRadius, steps, PATH.TYPE.DAMPED)
                    .addTarget(0, steps, PATH.TYPE.ACCELERATED)
                    .round();
                fireCirclePathY[currRadius] = new AxisPath(currRadius)
                    .addTarget(0, steps, PATH.TYPE.ACCELERATED)
                    .addTarget(-currRadius, steps, PATH.TYPE.DAMPED)
                    .addTarget(0, steps, PATH.TYPE.ACCELERATED)
                    .addTarget(currRadius, steps, PATH.TYPE.DAMPED)
                    .round();
            }

            objectController.addClass(
                'toadhead',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite('toadhead', 'toadhead');
                        spritePane.setSpriteBottomPos('toadhead', pos.x, pos.y + 24 + 15);
                        obj.sprites.push('toadhead');
                    } else if (obj.waitForStanding === true) {
                        if (actorXStates.getState() === 'still') {
                            cutscene = 'thank-you';
                        }
                    } else {
                        const actorPos = spritePane.getSpritePos('player', true);
                        const pos = spritePane.getSpritePos('toadhead');
                        if (actorPos.x + 20 >= pos.x) {
                            const dirKeys = inputController.getDirKeys();
                            inputController.setForcedInputs([dirKeys['up']]);
                            obj.waitForStanding = true;
                        }

                    }
                }
            );

            objectController.addClass(
                'firezone',
                function (obj) {
                    if (obj.frame === 0) {
                        obj.baseY = obj.event.tile.y;
                        obj.skips = 0;
                        obj.lastFireFrame = 0;
                    }
                    if (obj.frame - obj.lastFireFrame === 50) {
                        const bowsers = objectController.getObjectsForClass('bowser');
                        for (let bowser of bowsers) {
                            bowser.firing = false;
                        }
                    }

                    if (obj.frame % 100 !== 0) return;

                    let randomY =  Math.round(Math.random() * 9);

                    if (obj.skips === 0) {
                        randomY %= 3;
                    } else if (randomY >= 3) {
                        obj.skips--;
                        return;
                    }
                    obj.lastFireFrame = obj.frame;
                    obj.skips = 5;
                    const state = {targetY: (obj.baseY + randomY - 1) * 16};
                    const bowsers = objectController.getObjectsForClass('bowser');
                    if (bowsers.length > 0) {
                        const pos = spritePane.getSpritePos('bowser');
                        bowsers[0].firing = true;
                        state.pos = pos;
                    };
                    objectController.addObject('firebreath', state);
                }
            );

            objectController.addClass(
                'bowser',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        spritePane.addSprite('bowser', 'bowser');
                        spritePane.setSpriteBottomPos('bowser', pos.x, pos.y + 24 + 15);
                        spritePane.setAnimationSpeed('bowser', 0.05);
                        obj.firing = false;
                        obj.sprites.push('bowser');
                        obj.lastFiring = false;
                        obj.dir = -1;
                        obj.pos = 0;
                        obj.stateFrame = 0;
                        obj.jumpPath = new AxisPath()
                            .addTarget(-40, 30, PATH.TYPE.DAMPED)
                            .addTarget(0, 30, PATH.TYPE.ACCELERATED)
                            .round();
                        obj.state = 'wait';
                    } else {
                        const collision = spritePane.getActorCollision('bowser');
                        if (collision !== null && hideCounter === 0 && (collision.x.touch > 2 && collision.y.touch > 2)) {
                            cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';
                        }
                        let moveX = 0;
                        let moveY = 0;
                        const pos = spritePane.getSpritePos('bowser');
                        let nextState = null;
                        switch(obj.state) {
                            case 'wait':
                                if (pos.x < 195) {
                                    nextState = 'walk';
                                }
                                break;

                            case 'walk':
                                if (obj.frame % 2 === 0) {
                                    if (pos.x < 80 || pos.x > 200) {
                                        obj.dir *= -1;
                                    }
                                    moveX = obj.dir;
                                }
                                if (obj.stateFrame === 60) {
                                    const next = Math.round(Math.random() * 9);
                                    if (next === 0) {
                                        obj.dir *= -1;
                                    }
                                    if (next < 4) {
                                        nextState = 'walk';
                                    } else if (next < 7) {
                                        obj.pos = 0;
                                        nextState = 'jump';
                                    } else {
                                        nextState = 'stand';
                                    }
                                }
                                break;

                            case 'stand':
                                if (obj.stateFrame === 60) {
                                    nextState = 'walk';
                                }
                                break;

                            case 'jump':
                                const move = obj.jumpPath.forwardFrom(obj.pos);
                                if (move === null) {
                                    nextState = 'walk';
                                } else {
                                    moveY = move;
                                    obj.pos++;
                                }
                                break;
                        }

                        if (nextState !== null) {
                            obj.state = nextState;
                            obj.stateFrame = 0;
                        } else {
                            obj.stateFrame++;
                        }

                        if (obj.firing !== obj.lastFiring) {
                            if (obj.firing) {
                                spritePane.assignSprite('bowser', 'bowser-fire');
                            } else {
                                spritePane.assignSprite('bowser', 'bowser');
                            }
                        }
                        obj.lastFiring = obj.firing;

                        if (moveX !== 0 || moveY !== 0) {
                            spritePane.moveSprite('bowser', moveX, moveY);
                        }
                    }
                },
                {enemy: true}
            );

            objectController.addClass(
                'firebreath',
                function (obj) {
                    if (obj.frame === 0) {
                        spritePane.addGroup(obj.id, [obj.id + '_1', obj.id + '_0']);
                        const x = obj.pos === undefined ? 256 : obj.pos.x - 20;
                        const y = obj.pos === undefined ? 24 + obj.targetY : obj.pos.y + 8;

                        spritePane.addSprite(obj.id + '_1', 'firebreath', x + 8, y, -1);
                        spritePane.setAnimationSpeed(obj.id + '_1', 0.5);
                        spritePane.addSprite(obj.id + '_0', 'firebreath0', x, y, -1);
                        obj.sprites = [obj.id + '_1', obj.id + '_0'];
                        audio.play('firebreath');
                    } else {
                        let moveY = 0;
                        if (obj.pos !== undefined) {
                            const pos = spritePane.getSpritePos(obj.id + '_0');
                            if (pos.y < 24 + obj.targetY) {
                                moveY = 1;
                            } else if (pos.y > 24 + obj.targetY) {
                                moveY = -1;
                            }
                        }
                        spritePane.moveSprite(':' + obj.id, -1, moveY);
                        const collision = spritePane.getActorCollision(obj.id + '_1');
                        if (collision !== null && hideCounter === 0) {
                            cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';
                        }
                    }
                },
                {enemy: true}
            );

            objectController.addClass(
                'firestick',
                function (obj) {
                    if (obj.frame === 0) {
                        const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                        obj.startX = pos.x + 4;
                        obj.startY = pos.y + 29;
                        obj.collideIds = [];
                        let i = 0;
                        for (let k in fireCirclePathX) {
                            const id = obj.id + '_' + k;
                            spritePane.addSprite(id, 'fireball', obj.startX, obj.startY + parseInt(k, 10));
                            obj.sprites.push(id);
                            if (i % 2 === 0) {
                                obj.collideIds.push(id);
                            }
                        }
                        obj.pos = obj.dir === 1 ? 0 : fireCirclePathX[radius].getCount() - 1;
                        return;
                    }
                    for (let id of obj.collideIds) {
                        const collision = spritePane.getActorCollision(id);
                        if (collision !== null && hideCounter === 0) {
                            cutscene = globals.marioLevel === 0 ? 'dead' : 'shrink';
                            break;
                        }
                    }
                    if (obj.frame % 6 === 0) {
                        let isEnd = false;
                        for (let k in fireCirclePathX) {
                            let moveX = obj.dir === 1 ? obj.pathX[k].forwardFrom(obj.pos) : obj.pathX[k].backwardFrom(obj.pos);
                            let moveY = obj.dir === 1 ? obj.pathY[k].forwardFrom(obj.pos) : obj.pathY[k].backwardFrom(obj.pos);
                            const id = obj.id + '_' + k;
                            if (moveX === null) {
                                isEnd = true;
                                const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y);
                                spritePane.setSpritePos(id, pos.x + 4, pos.y + 29 + parseInt(k, 10));
                            } else {
                                spritePane.moveSprite(id, moveX, moveY);
                            }
                        }

                        if (isEnd) {
                            obj.pos = obj.dir === 1 ? 0 : fireCirclePathX[radius].getCount() - 1;
                        } else {
                            if (obj.dir === 1) {
                                obj.pos++;
                            } else {
                                obj.pos--;
                            }
                        }
                    }
                },
                {
                    variants: {
                        left: {dir: 1},
                        right: {dir: -1}
                    },
                    pathX: fireCirclePathX,
                    pathY: fireCirclePathY
                }
            );

            objectController.addClass(
                'fireball',
                function (obj) {
                    if (obj.frame === 0) {
                        spritePane.addSprite(obj.id, 'fireball', obj.x, obj.y);
                        spritePane.setAnimationSpeed(obj.id, 0.25);
                        obj.sprites.push(obj.id);
                    } else {
                        const collides = spritePane.getLastSpriteCollisions(obj.id);
                        let hit = false;
                        if (collides.length > 0) {
                            for (let collide of collides) {
                                if (collide.sprite.id !== 'player') {
                                    const hitObj = objectController.getObjectWithSpriteId(collide.sprite.id);
                                    if (hitObj !== null && hitObj.enemy === true) {
                                        hit = true;
                                        hitObj.kickout = obj.dir;
                                    }
                                }
                            }
                        }
                        if (!hit) {
                            hit = moveAlongBlocks(obj, 4, 6);
                        }
                        if (hit) {
                            const pos = spritePane.getSpritePos(obj.id);
                            obj.x = pos.x - obj.dir * 8;
                            obj.y = pos.y;
                            objectController.addObject('fireball-hit', obj);
                            return false;
                        };
                    }
                }
            );

            objectController.addClass(
                'fireball-hit',
                function (obj) {
                    if (obj.frame === 0) {
                        spritePane.addSprite(obj.id, 'explode', obj.x, obj.y);
                        spritePane.setAnimationSpeed(obj.id, 0.5);
                        spritePane.setNoCollision(obj.id, true);
                        obj.sprites.push(obj.id);
                        audio.play('bump');
                    }
                    return (obj.frame < 6);
                }
            );

            objectController.addClass(
                'power-up',
                function (obj) {
                        if (obj.frame === 0) {
                            const pos = tilesPane.getRelativePositionOfTile(obj.event.tile.x, obj.event.tile.y - 1);
                            obj.type = obj.powerUps[globals.marioLevel === 2 ? 1 : globals.marioLevel];
                            const dim = globals.spriteSheet.getSpriteDim(obj.type);
                            obj.state = dim.y * obj.speed;
                            spritePane.addSprite(obj.id, getEnemySprite(null, obj.type), pos.x, pos.y + 24);
                            shiftUp(obj);
                            obj.sprites.push(obj.id);
                            return;
                        }
                        if (spritePane.isCollidingActor(obj.id)) {
                            switch (globals.marioLevel) {
                                case 0:
                                    cutscene = 'grow';
                                    break;
                                case 1:
                                    cutscene = 'fire';
                                    break;
                            }
                            addScoreForSprite(1000, obj.id);
                            audio.play('powerup');
                            return false;
                        }
                        if (obj.state > 0) {
                            obj.state--;
                            if (obj.state % obj.speed === 0) {
                                shiftUp(obj);
                            }
                        } else if (obj.state === 0) {
                            spritePane.setSpriteFilters(obj.id, '');
                            if (obj.type === 'mushroom') {
                                obj.state--;
                            }
                        } else {
                            moveAlongBlocks(obj, 1);
                        }
                },
                {
                    idParts: eventTileIdParts,
                    speed: 3,
                    dir: 1,
                    powerUps: {
                        0: 'mushroom',
                        1: 'fireflower'
                    }
                }
            );
            marioCollider.setSpriteOffset(0, -24);

            const marioBaseColors = [
                ['b13425', 'e39d25', '6a6b04'],
                ['b13425', 'e39d25', '6a6b04'],
                ['f7d6a4', 'e39d25', 'b53121'],
            ];

            const marioTempColors = [
                ['b13425', 'ffffff', 'e69c21'],
                ['000000', 'ffcec5', '9c4a00'],
                ['3a8400', 'ffffff', 'e69c21'],
                ['f7d6a4', 'e39d25', 'b53121']
            ];

            function getColorReplaceFilters(index) {
                if (index === null) {
                    return '';
                }
                const base = marioBaseColors[globals.marioLevel];
                const temp = marioTempColors[index];
                const filter = 'color-replace(#' + base[0] + ':#' + temp[0] + ';' +
                    '#' + base[1] + ':#' + temp[1] + ';' +
                    '#' + base[2] + ':#' + temp[2] + ')';
                return filter;
            }

            function addScore(points, startX, startY, stopAtTop = false) {
                return objectController.addObject('score', {points, startX, startY, stopAtTop});
            }

            function addScoreForSprite(score, spriteId) {
                const pos = spritePane.getSpritePos(spriteId);
                addScore(score, pos.x, pos.y);
            }

            const jumpForce = new Force(-4.35, -64, -0.22);
            const yAxisVector = [null, null];
            const deathPath =
                new AxisPath()
                    .addTarget(0, 16)
                    .addTarget(-54, 26, PATH.TYPE.DAMPED)
                    .addTarget(240, 66, PATH.TYPE.ACCELERATED)
                    .round();

            let frameCount = 0;
            let baseSprite = null;
            let hideCounter = 0;
            let forceMoveX = 0;
            let forceMoveY = 0;
            let cutscene = world.cutscene !== undefined ? world.cutscene : null;
            let cutsceneParams = {};
            let cutsceneFrame = 0;
            let flickerFrames = null;
            let fireBalls = [];
            let throwingTimer = 0;
            let runDist = 0;
            let currAcc = 0;
            let jumpAcc = 0;
            let constSpeed = null;
            let timerRunning = true;
            const invIndices = [null, 3, 1, 2];
            let invIndex = 0;
            let pipingFrame = null;
            let pipingTarget = null;
            let pipingDir = null;
            let isWarning = false;
            let lastFloorDist = 5;
            let floorObstacles = [];

            const fireworks = [
                {x: 117, y: 45}, {x: 85, y: 93}, {x: 181, y: 61}, {x: 181, y: 109}, {x: 133, y: 61}, {x: 85, y: 93}
            ];
            let fireworkIndex = null;
            let speedIndex = 0;

            const growAni = {
                9: 1, 13: 0, 17: 1, 21: 0, 25: 1, 29: 2, 33: 0, 37: 1, 41: 2, 42: 0, 43: null,
                frames: ['small-mario', 'mid-mario', 'mario'],
                level: 1
            };

            const shrinkAni = {
                0: 0, 16: 1, 18: 2, 22: 1, 26: 2, 30: 1, 34: 2, 38: 1, 42: 2, 46: 1, 50: 2, 54: 1, 56: null,
                frames: ['mario-jump', 'small-mario-swim1', 'mario-swim1'],
                level: 0
            };

            const fireAni = {
                0: 0, 3: 1, 7: 3, 11: 1, 12: 2, 15: 0, 19: 1, 23: 3, 27: 2, 31: 0, 35: 1, 39: 3, 43: 2, 45: 1, 47: 2,
                48: 0, 52: 1, 56: 3, 60: 2, 63: null,
                level: 2
            };

            function flickerCutScene(toLevel, fromLevel, ani) {
                if (cutsceneFrame === 0) {
                    const currSheetId = spritePane.getSpriteSheetId('player');
                    const newSheetId = marioLevels[toLevel] + currSheetId.substr(marioLevels[fromLevel].length);
                    flickerFrames = newSheetId;
                }
                let newId = ani[cutsceneFrame];
                if (newId !== undefined) {
                    const isLast = (newId === null);
                    if (ani.frames) {
                        const pos = spritePane.getSpritePos('player', false, true);
                        let target;
                        if (newId !== null && newId < ani.frames.length) {
                            target = ani.frames[newId] + (marioLeft ? '-rev' : '');
                        } else {
                            target = flickerFrames;
                        }
                        target = target.replace(/throwing\-/, '');
                        spritePane.assignSprite('player', target);
                        spritePane.setSpriteBottomPos('player', pos.x, pos.y);
                    } else {
                        const colorReplace = getColorReplaceFilters(newId === null ? 3 : newId);
                        spritePane.setSpriteFilters('player', colorReplace);
                    }

                    if (isLast) {
                        globals.marioLevel = toLevel;
                        spritePane.setSpriteFilters('player', '');
                        return true;
                    }
                }
                return false;
            }

            function setActorSprite(name, rev = false) {
                const doRev = rev ? !marioLeft : marioLeft;
                if (name === null) {
                    name = 'mario';
                }
                if (throwingTimer > 0) {
                    name = 'throwing-' + name;
                }
                if (doRev) {
                    name += '-rev';
                }
                if (globals.marioLevel === 0) {
                    name = name.replace(/throwing\-/, '');
                }
                spritePane.assignSprite('player', marioLevels[globals.marioLevel] + name, true);
            }

            function getEnemySprite(obj, name) {
                if (obj !== null && obj.doRev === true && obj.dir === 1) {
                    name += '-rev';
                }
                if (obj !== null && obj.theme !== undefined) {
                    name += '-' + obj.theme;
                } else if (theme.tileSet > 0) {
                    name += '-' + theme.tileSet;
                }
                return name;
            }

            audio.loop(theme.bgm, 'bgm');

            // ###################################################

            marioScreen.setFrameHandler(function () {

                bgTilesMap.updateFrames();
                // update animated tiles
                tilesPane.updateAnimatedTiles();

                // TODO: remove!
/*
                this.activeResource = 0;
                this.openEditorMode();
*/
                if (inputController.hasInput('back')) {
                    this.gotoScreen('demo');
                }

                if (cutscene !== null) {
                    let done = false;
                    let nextScene = null;
                    switch(cutscene) {
                        case 'bottom-death':
                            nextScene = 'die';
                            audio.play('die', 'bgm');
                            break;

                        case 'grow':
                            done = flickerCutScene(1, 0, growAni);
                            break;

                        case 'shrink':
                            if (cutsceneFrame === 0) {
                                audio.play('tubedown');
                            }
                            done = flickerCutScene(0, globals.marioLevel, shrinkAni);
                            hideCounter = 100;
                            break;

                        case 'fire':
                            done = flickerCutScene(2, 1, fireAni);
                            break;

                        case 'glide':
                            const pos = spritePane.getSpritePos('player', false, true);
                            if (pos.y < spritePane.viewPortDim.y - 42) {
                                spritePane.moveSprite('player', 0, 1);
                                spritePane.updateFrames();
                            }
                            const flagPos = spritePane.getSpritePos('flag', false, true);
                            if (flagPos.y < spritePane.viewPortDim.y - 49) {
                                spritePane.moveSprite('flag', 0, 1);
                            } else {
                                setActorSprite('mario-glide-rev');
                                spritePane.moveSprite('player', 12, 0);
                                nextScene = 'glide-rev';
                                audio.play('stageclear', 'bgm');
                            }
                            break;

                        case 'glide-rev':
                            if (cutsceneFrame === 60) {
                                nextScene = 'flagdown';
                            }
                            break;

                        case 'flagdown':
                            if (cutsceneFrame === 0) {
                                const dirKeys = inputController.getDirKeys();
                                currAcc = 0;
                                constSpeed = 1;
                                inputController.setForcedInputs([dirKeys.right]);
                            }
                            done = true;
                            break;

                        case 'run-to-pipe':
                            if (cutsceneFrame === 1) {
                                const dirKeys = inputController.getDirKeys();
                                inputController.setForcedInputs([dirKeys.right]);
                                constSpeed = 1;
                                done = true;
                            }
                            break;

                        case 'coinbonus':
                            if (globals.time === 0) {
                                nextScene = 'flag-up';
                                const playerPos = spritePane.getSpritePos('player');
                                spritePane.addSprite('flag-up', 'flag-up', playerPos.x, 120);
                                if (spritePane.isHidden('flag-up-fg')) {
                                    spritePane.hideSprite('flag-up');
                                }
                            } else {
                                globals.time--;
                                globals.score += 50;
                                audio.play('bonus');
                                globals.updateTime();
                                globals.updateScore();
                            }
                            break;

                        case 'firework':
                            if (fireworkIndex === null) {
                                nextScene = 'stage-cleared';
                            } else if (cutsceneFrame === 32) {
                                globals.score += 500;
                                globals.updateScore();
                                if (fireworkIndex > 0) {
                                    fireworkIndex--;
                                    nextScene = 'firework';
                                } else {
                                    fireworkIndex = null;
                                }
                                spritePane.removeSprite('firework');
                            }  else if (cutsceneFrame === 10) {
                                const pos = fireworks[fireworkIndex];
                                spritePane.addSprite('firework', 'explode1', pos.x, pos.y);
                                audio.play('fireworks');
                            } else if (cutsceneFrame === 17) {
                                spritePane.assignSprite('firework', 'explode2');
                            } else if (cutsceneFrame === 25) {
                                spritePane.assignSprite('firework', 'explode3');
                            }
                            break;

                        case 'stage-cleared':
                            if (!audio.isPlaying('stageclear') && cutsceneFrame >= 100) {
                                inputController.setForcedInputs(null);
                                this.gotoScreen('mario');
                                globals.worldPos = null;
                                if (world.next !== null) {
                                    globals.world = world.next;
                                }
                                this.gotoScreen(world.next !== null ? 'world' : 'demo');
                            }
                            break;

                        case 'flag-up':
                            if (cutsceneFrame < 17) {
                                spritePane.moveSprite('flag-up', 0, -1);
                            } else {
                                nextScene = 'firework';
                            }
                            break;

                        case 'dead':
                            if (cutsceneFrame === 0) {
                                let target = 'small-mario-duck';
                                if (globals.marioLevel === 2) {
                                    target = 'fire-' + target;
                                }
                                spritePane.assignSprite('player', target);
                                deathPath.rewind();
                                audio.play('die', 'bgm');
                            } else {
                                spritePane.moveSprite('player', 0, deathPath.forward());
                                if (deathPath.isEnd()) {
                                    nextScene = 'die';
                                }
                            }
                            break;

                        case 'openBridge':
                            if (cutsceneFrame === 0) {
                                tilesPane.replaceTile(cutsceneParams.x, cutsceneParams.y, 0);
                                cutsceneParams.x--;
                                cutsceneParams.y++;
                                tilesPane.replaceTile(cutsceneParams.x, cutsceneParams.y, 0);
                                tilesPane.replaceTile(cutsceneParams.x, cutsceneParams.y, 0);
                                cutsceneParams.y++;
                                for(let sprite of obstacleController.getSpriteIdsForClass('bar')) {
                                    spritePane.hideSprite(sprite);
                                }
                                spritePane.setAnimationSpeed('bowser', 0.2);
                                objectController.deleteObjectsOfClass(['firezone', 'firebreath']);
                                objectController.getObjectsForClass('firezone');
                                objectController.getObjectsForClass('firebreath');

                            } else if (cutsceneFrame % 5 === 0) {
                                tilesPane.replaceTile(cutsceneParams.x, cutsceneParams.y, 0);
                                cutsceneParams.x--;
                                if (tilesPane.getTileAt(cutsceneParams.x, cutsceneParams.y).index !== 796) {
                                    spritePane.assignSprite(cutsceneParams.bowser, 'bowser1');
                                    nextScene = 'bowserFall';
                                    audio.play('bowserfalls');
                                } else {
                                    audio.play('breakblock');
                                }
                            }
                            spritePane.updateFrames();
                            break;

                        case 'bowserFall':
                            spritePane.moveSprite(cutsceneParams.bowser, 0, jumpForce.getMoveForTimeVector([jumpForce.getPeakTime() + (cutsceneFrame >> 1), 0]));
                            if (spritePane.getSpritePos(cutsceneParams.bowser).y > 230) {
                                nextScene = 'runToToadstool';
                            }
                            break;

                        case 'runToToadstool':
                            if (cutsceneFrame === 0) {
                                tilesPane.setScrollLock(false);
                                const dirKeys = inputController.getDirKeys();
                                inputController.setForcedInputs([dirKeys.right]);
                                constSpeed = 1;
                                audio.play('worldclear', 'bgm');
                            }
                            done = true;
                            break;

                        case 'thank-you':
                            if (cutsceneFrame === 0) {
                                globals.statusPane.addTextBlock({
                                    id: 'thx',
                                    x: 40,
                                    y: 80,
                                    text: 'GO FUCK YOURSELF MARIO!',
                                    lineSpacing: 10
                                });
                            } else if (cutsceneFrame === 200) {
                                globals.statusPane.addTextBlock({
                                    id: 'thx2',
                                    x: 32,
                                    y: 100,
                                    text: 'YOU JUST KILLED MY LOVER!',
                                    lineSpacing: 10
                                });
                            } else if (cutsceneFrame === 500) {
                                this.gotoScreen('game-over', {msgParams: {
                                        msg: 'GAME OVER',
                                        bgm: 'gameover',
                                        time: 6 * 60,
                                        next: 'demo'
                                    }});
                            }
                            break;

                        case 'die':
                            if (audio.isPlaying('die')) {
                                break;
                            }
                            globals.lifes--;
                            globals.marioLevel = 0;
                            const mainWorld = getMainWorld();
                            if (globals.activeSavePosition !== null) {
                                globals.worldPos = {
                                    x: globals.savePositions[globals.activeSavePosition][0],
                                    y: globals.savePositions[globals.activeSavePosition][1]
                                };
                            } else {
                                globals.worldPos = null;
                            }
                            globals.world = mainWorld;
                            if (globals.time === 0) {
                                this.gotoScreen('game-over', {msgParams: {
                                        msg: 'TIME UP',
                                        time: 3 * 60,
                                        next: 'world'
                                    }});
                            } else {
                                this.gotoScreen('world', {world: mainWorld});
                            }
                            break;
                    }
                    objectController.handleObjects(['score']);

                    if (nextScene !== null) {
                        cutscene = nextScene;
                        nextScene = null;
                        cutsceneFrame = 0;
                        return true;
                    } else if (!done) {
                        cutsceneFrame++;
                        return true;
                    }
                    cutscene = null;
                    cutsceneFrame = 0;
                }

                if (globals.time > 0 && timerRunning) {
                    frameCount++;
                    if (frameCount % 25 === 0) {
                        globals.time--;
                        globals.updateTime();
                        if (globals.time === 0) {
                            cutscene = 'dead';
                        } else if (globals.time === 100) {
                            audio.pauseChannel('bgm');
                            audio.play('warning');
                            isWarning = true;
                        } else if (isWarning && !audio.isPlaying('warning')) {
                            audio.continueChannel('bgm', 2);
                            isWarning = false;
                        }
                    }
                }

                if (globals.pipingUp) {
                    pipingDir = '-y';
                    pipingFrame = 0;
                    inputController.setForcedInputs([]);
                    actorYStates.setState('piping');
                    globals.pipingUp = false;
                }

                obstacleController.handleObjects();
                const collides = marioCollider.getCollides(
                    ['floor', 'left', 'right', 'ceiling', 'center', 'rightPipe'],
                    obstacleController.getSpriteIdsForClass('bar')
                );
                floorObstacles = collides.floor.obstacles;
                if (collides.floor.dist < 0) {
                    collides.floor.dist = 0;
                }
                lastFloorDist = collides.floor.dist;

                spritePane.updateFrames();
                spritePane.updateCollisions();

                const collEvents = inputController.isForced() ? [] : this.getEvents('collide');
                let glideEvent = null;
                for (let event of collEvents) {
                    switch(event.obj.collectEvent) {

                        case 'coin':
                            tilesPane.replaceTile(event.x, event.y, 0);
                            incCoins();
                            break;

                        case 'openBridge':
                            cutscene = 'openBridge';
                            cutsceneParams = {
                                bowser: 'bowser',
                                x: event.x,
                                y: event.y
                            };
                            break;

                        case 'glide':
                            if (glideEvent === null || event.y > glideEvent.y) {
                                glideEvent = event;
                            }
                            break;
                    }

                }
                if (glideEvent !== null) {
                    cutscene = 'glide';
                    timerRunning = false;
                    setActorSprite('mario-glide');
                    const pos = tilesPane.getRelativePositionOfTile(glideEvent.x, glideEvent.y);
                    spritePane.setAnimationSpeed('player', 0.34);
                    const flagScore = [5000, 4000, 2000, 1000, 500, 200, 200, 100, 100];
                    switch(globals.time % 10) {
                        case 1:
                            fireworkIndex = 0;
                            break;
                        case 3:
                            fireworkIndex = 2;
                            break;
                        case 6:
                            fireworkIndex = 5;
                            break;
                    }
                    addScore(flagScore[glideEvent.y - 1], pos.x + 11, 165, true);
                    audio.play('flagpole', 'bgm');
                }

                let currEvent = null;
                const yEvents = actorYStates.getPossibleEvents();
                if (yEvents.indexOf('button-a') !== -1) {
                    inputController.awaitInput('button-a');
                }
                inputController.awaitInput('button-b');
                inputController.update();

                let updateSprite = (frameCount <= 1 && world.cutscene === undefined);
                if (throwingTimer > 0) {
                    throwingTimer--;
                    updateSprite = (throwingTimer === 0);
                }
                for (let i = 0; i < fireBalls.length; i++) {
                    if (!objectController.hasActiveObject(fireBalls[i])) {
                        fireBalls.splice(i, 1);
                    }
                }
                if (inputController.hasInput('button-b')) {
                    if (globals.marioLevel === 2 && fireBalls.length < 2 && throwingTimer === 0 && baseSprite !== 'mario-duck') {
                        const pos = spritePane.getSpritePos('player');
                        let dir = marioLeft ? -1 : 1;
                        if (!inputController.noXDir()) {
                            dir = inputController.isLeftDir() ? -1 : 1;
                        }
                        const obj = objectController.addObject('fireball', {x: pos.x, y: pos.y, dir});
                        updateSprite = true;
                        throwingTimer = 10;
                        fireBalls.push(obj.id);
                        audio.play('fireball');
                    }
                }

                for (let event of yEvents) {
                    switch (event) {

                        case 'piping-down':
                            if (!inputController.isDown() || (globals.marioLevel > 0 && actorYStates.getState() !== 'ducking')) {
                                continue;
                            }
                            let standingOnDownPipe = false;
                            const tiles = collides.floor.tiles;
                            if (Array.isArray(tiles) && tiles.length === 2 && tiles[0].obj.downTarget !== undefined && tiles[0].touch > 4) {
                                standingOnDownPipe = true;
                                pipingTarget = tiles[0].obj.downTarget;
                            }
                            if (!standingOnDownPipe) continue;
                            pipingDir = 'y';
                            pipingFrame = 0;
                            audio.play('tubedown');
                            inputController.setForcedInputs([inputController.getDirKeys().down]);
                            break;

                        case 'piping-right':
                            if (!inputController.isRight() || collides.rightPipe.dist !== 0 || collides.floor.dist !== 0) {
                                continue;
                            }
                            let hasRightPipe = false;
                            if (!Array.isArray(collides.floor.tiles) || collides.floor.tiles.length === 0) {
                                continue;
                            }
                            const tile = collides.floor.tiles[0];
                            if (tile.obj.rightTarget === undefined) {
                                continue;
                            }
                            pipingTarget = tile.obj.rightTarget;
                            pipingDir = 'x';
                            pipingFrame = 0;
                            audio.resetChannel('bgm');
                            audio.play('tubedown');
                            inputController.setForcedInputs([inputController.getDirKeys().right]);
                            break;

                        case 'disappear-bottom':
                            const pos = spritePane.getSpritePos('player');
                            if (pos.y < spritePane.viewPortDim.y) continue;
                            cutscene = 'bottom-death';
                            break;

                        case 'no-floor':
                            if (collides.floor.dist <= 0) continue;
                            break;

                        case 'hit-ceiling':
                            if (collides.ceiling.dist > 0 || (jumpForce.getMoveForTimeVector(yAxisVector) > 0)) continue;

                            let i = 0;
                            let fullHit = null;
                            let softHit = null;

                            for (let tile of collides.ceiling.tiles) {
                                if (tile.touch > 5 && (tile.obj.block || tile.obj.hitEvent)) {
                                    fullHit = i;
                                    if (tile.obj.hitEvent !== undefined) {
                                        Game.instance.addFrameEvent(
                                            'object', {
                                                object: tile.obj.hitEvent,
                                                tile
                                            });
                                    }
                                } else if (tile.obj.hitEvent !== undefined && tile.touch <= 4) {
                                    softHit = (i === 0 ? 1 : -1) * tile.touch;
                                }
                                i++;
                            }

                            if ((fullHit === null) && (softHit !== null)) {
                                forceMoveX = softHit;
                                continue;
                            }
                            break;

                        case 'hit-bottom':
                            if (collides.floor.dist > 0) continue;
                            break;

                        case 'hit-enemy':
                            if (!hitEnemy) continue;
                            break;

                        case 'not-move-up':
                            if (inputController.hasInput('button-a')) continue;
                            break;

                        case 'not-move-down':
                            if (globals.marioLevel > 0 && inputController.isDownDir()) continue;
                            break;

                        case 'button-a':
                            if (!inputController.hasInput('button-a')) continue;
                            break;

                        case 'move-down':
                            if (globals.marioLevel === 0 || !inputController.isDownDir()) continue;
                            break;

                        case 'end-of-jump':
                            if (!jumpForce.isTimeVectorAtPeak(yAxisVector)) {
                                continue;
                            }
                            break;
                    }
                    currEvent = event;
                }

                hitEnemy = false;
                if (currEvent !== null) {
                    actorYStates.doEvent(currEvent);
                    const transitions = actorYStates.popTransitions();
                    const oldBaseSprite = baseSprite;
                    for (let transition of transitions) {
                        switch(transition.to) {
                            case 'jumping':
                                yAxisVector[0] = 0;
                                jumpAcc = currAcc;
                                baseSprite = transition.from === 'ducking' ? 'mario-duck' : 'mario-jump';
                                audio.play('jump');
                                break;

                            case 'ducking':
                                baseSprite = 'mario-duck';
                                break;

                            case 'falling':
                                if (['standing', 'ducking'].indexOf(transition.from) !== -1) {
                                    baseSprite = 'mario-run1';
                                    yAxisVector[0] = jumpForce.getPeakTime();
                                }
                                if (transition.event === 'hit-ceiling') {
                                    yAxisVector[0] = jumpForce.getPeakTime() + 10;
                                } else if (transition.event === 'hit-enemy') {
                                    yAxisVector[0] = 0;

                                }
                                yAxisVector[1] = 0;
                                break;

                            case 'standing':
                                baseSprite = null;
                                yAxisVector[0] = null;
                                yAxisVector[1] = null;
                                break;
                        }
                    }
                    if (oldBaseSprite !== baseSprite) {
                        updateSprite = true;
                    }
                }

                const xEvents = actorXStates.getPossibleEvents();

                for (let event of xEvents) {
                    switch (event) {

                        case 'move-dir':
                            if (inputController.isDownDir() ||
                                (!marioLeft && !inputController.isRightDir()) ||
                                (marioLeft && !inputController.isLeftDir())) continue;
                            break;

                        case 'move-opp-dir':
                            if (inputController.isDownDir() ||
                                (marioLeft && !inputController.isRightDir()) ||
                                (!marioLeft && !inputController.isLeftDir())) continue;
                            marioLeft = !marioLeft;
                            break;

                        case 'not-move-dir':
                            if (!inputController.isDownDir() && !((marioLeft && !inputController.isLeftDir()) ||
                                (!marioLeft && !inputController.isRightDir()))) {
                                continue;
                            }
                            break;

                        case 'blocked-dir':
                            if ((marioLeft && collides.left.dist > 0) || (!marioLeft && collides.right.dist > 0 && collides.rightPipe.dist > 0)) continue;
                            break;

                        case 'end-of-slide':
                            if (currAcc > 0) continue;
                            break;
                    }
                    currEvent = event;
                }

                if (currEvent !== null) {
                    actorXStates.doEvent(currEvent);

                    const transitions = actorXStates.popTransitions();
                    for (let transition of transitions) {
                        let update = true;
                        switch (transition.to) {

                            case 'still':
                                speedIndex = 0;
                                runDist = 0;
                                currAcc = 0;
                                break;

                            case 'accelerating':
                                if (transition.from === 'turning') {
                                    marioLeft = !marioLeft;
                                }
                                break;

                            case 'turning':
                                marioLeft = !marioLeft;
                                break;

                            default:
                                update = false;
                                break;
                        }
                        if (update) {
                            updateSprite = true;
                        }
                    }
                }

                const yState = actorYStates.getState();

                const xState = actorXStates.getState();
                if (xState === 'accelerating') {
                    const pressed = inputController.isPressed('button-b');
                    let hasTurbo = ['jumping', 'standing'].indexOf(yState) !== -1 && pressed;
                    let max = 2.5;
                    if (yState === 'jump') {
                        max = Math.max(jumpAcc, 1.5);
                        if (jumpAcc < 1.5 || !pressed) {
                            hasTurbo = false;
                            jumpAcc = 0;
                        }
                    }

                        let target = hasTurbo ? max : 1.5;
                        if (constSpeed !== null) {
                            target = constSpeed;
                        }
                        const accFactor = hasTurbo ? 0.0538 : 0.0357;
                        if (currAcc > target) {
                            currAcc = Math.max(currAcc - accFactor, target);
                        } else {
                            currAcc = Math.min(currAcc + accFactor, target);
                        }
                } else if (xState === 'sliding') {
                    currAcc -= 0.06; // 0.0357;
                    currAcc = Math.max(currAcc, 0);
                } else if (xState === 'turning') {
                    currAcc -= 0.08; // 0.0538;
                    currAcc = Math.max(currAcc, 0);
                }
                const speed = currAcc;
                runDist += speed;

                if (!updateSprite && ['standing', 'piping'].indexOf(yState) !== -1 && currAcc > 0) {
                    const newBaseSprite = 'mario-run' + ((Math.round(runDist) >> 3) % 3 + 1);
                    if (newBaseSprite !== baseSprite) {
                        baseSprite = newBaseSprite;
                        updateSprite = true;
                    }
                }

                if (updateSprite) {
                    if (yState === 'standing') {
                        switch(xState) {
                            case 'still':
                                setActorSprite('mario');
                                break;

                            case 'accelerating':
                            case 'sliding':
                                setActorSprite(baseSprite === null ? 'mario-run1' : baseSprite);
                                break;

                            case 'turning':
                                setActorSprite('mario-slide', true);
                                break;
                        }
                    } else {
                        setActorSprite(baseSprite);
                    }
                }
                objectController.handleObjects();

                // move player
                const state = actorYStates.getState();
                let moveX = 0;
                let moveY = jumpForce.getMoveForTimeVector(yAxisVector, forceMoveX !== 0 ? 4 : collides.ceiling.dist, collides.floor.dist);

                jumpForce.incVector(yAxisVector);

                if (!marioLeft) {
                    moveX = Math.min(speed, collides.right.dist, collides.rightPipe.dist);
                } else {
                    moveX = -Math.min(speed, collides.left.dist);
                }
                if (['duck', 'duck_rev', 'piping'].indexOf(state) !== -1) {
                    moveX = 0;
                }

                moveX += forceMoveX;
                if (state === 'piping') {
                    const isPipingUp = pipingDir[0] === '-';
                    const pipeBegin = isPipingUp ? 60 : 0;
                    const moveFrame = pipingFrame - pipeBegin;
                    if (pipingFrame < pipeBegin) {
                        pipingFrame++;
                        if (pipingFrame === pipeBegin) {
                            spritePane.toggleSpriteVisiblity('player');
                            spritePane.setSpriteFilters('player', 'shift-y(32)');
                        }
                    } else if (moveFrame < 32 * 3) {
                        if (moveFrame % 3 === 0) {
                            let pixels =  Math.round(moveFrame / 3);
                            if (isPipingUp) {
                                pixels = 32 - pixels;
                            }
                            spritePane.setSpriteFilters('player', 'shift-' + pipingDir[pipingDir.length - 1] + '(' + pixels + ')')
                        }
                        pipingFrame++;
                    } else if (isPipingUp) {
                        pipingFrame = null;
                        actorYStates.setState('standing');
                        inputController.setForcedInputs(null);
                    } else {
                        let parts = pipingTarget.split(':', 2);
                        const params = {
                            world: parts[0]
                        };
                        if (parts.length === 2) {
                            parts = parts[1].split('-', 2);
                            params.worldPos = {x: parts[0], y: parts[1]};
                            params.pipingUp = true;
                            this.gotoScreen('mario', params);
                        } else {
                            this.gotoScreen(params.world.indexOf('.') !== -1 ? 'mario' : 'world', params);
                        }
                    }
                } else if (moveX !== 0 || moveY !== 0) {
                    if (state === 'piping') {
                        marioPosition.setMaxDist(0, 0, 0, 1);
                    } else {
                        marioPosition.setMaxDist(collides.left.dist, Math.min(collides.right.dist, collides.rightPipe.dist), collides.ceiling.dist, collides.floor.dist);
                    }
                    const delta = marioPosition.move(moveX, moveY);
                    gameScrollBounds.moveActor(delta.x, delta.y); // , inputController.isForced()
                }
                forceMoveX = 0;

                if (hideCounter > 0) {
                    hideCounter--;
                    if (hideCounter > 0) {
                        if (hideCounter % 2 === 0) {
                            spritePane.toggleSpriteVisiblity('player');
                        }
                    } else {
                        spritePane.unhideSprite('player');
                    }
                }
                if (invincibleTimer !== null) {
                    const fastFlickering = 496;
                    const lastFrame = fastFlickering + 4 + 5*16;
                    let nextColor = false;
                    if (invincibleTimer === 0) {
                        invIndex = 0;
                    } else if (invincibleTimer === lastFrame) {
                        invIndex = -1;
                        nextColor = true;
                        invincibleTimer = null;
                        audio.loop(theme.bgm, 'bgm');
                    } else if (invincibleTimer < fastFlickering) {
                        nextColor = (invincibleTimer % 2 === 0);
                    } else if (invincibleTimer < fastFlickering + 4) {
                        nextColor = invincibleTimer === fastFlickering;
                    } else {
                        nextColor = ((invincibleTimer - fastFlickering - 4) % 8 === 0);
                    }
                    if (nextColor) {
                        invIndex++;
                        invIndex = invIndex % 4;
                        spritePane.setSpriteFilters('player', getColorReplaceFilters(invIndices[invIndex]));
                    }
                    if (invincibleTimer !== null) {
                        invincibleTimer++;
                    }
                }

                if (inputController.isForced() && actorYStates.getState() !== 'piping') {
                    const playerPos = spritePane.getSpritePos('player');
                    if (spritePane.hasSprite('flag-up-fg')) {
                        const targetPos = spritePane.getSpritePos('flag-up-fg');
                        if (playerPos.x >= targetPos.x) {
                            spritePane.hideSprite('player');
                            cutscene = 'coinbonus';
                        }
                    }
                }
            });
        }
    });
    this.addScreen(marioScreen);

    const gameOverScreen = new Screen('game-over');
    gameOverScreen.setInitHandler(function () {
        return function (resource, globals) {
            const vSplitArea = new SplitArea('X', [32, 256, 32]);
            vSplitArea.addPane(new ColorPane('#000000'), 1);
            gameOverScreen.addArea(vSplitArea);

            globals.time = null;
            globals.updateStatusPane();

            vSplitArea.addPane(globals.statusPane, 1);

            const msg = globals.msgParams.msg;
            globals.statusPane.addTextBlock({
                id: 'screentext',
                x: 128 - (msg.length * 8 >> 1),
                y: 110,
                text: msg,
                lineSpacing: 4
            });

            const spritePane = new SpritePane(globals.spriteSheet);
            spritePane.addSprite('minicoin', 'minicoin', 87, 16, -1);
            spritePane.setNoCollision('minicoin', true);
            vSplitArea.addPane(spritePane, 1);

            let timer = 0;
            let waitForBgm = (globals.msgParams.bgm !== undefined);
            if (waitForBgm)  {
                this.audio.play(globals.msgParams.bgm, 'bgm');
            };

            gameOverScreen.setFrameHandler(function () {
                timer++;
                if (timer >= globals.msgParams.time && (!waitForBgm || (waitForBgm && !this.audio.isPlaying(globals.msgParams.bgm)))) {
                    this.gotoScreen(globals.msgParams.next);
                }
                spritePane.updateFrames();
            });
        }
    });
    this.addScreen(gameOverScreen);

    const worldScreen = new Screen('world');
    worldScreen.setInitHandler(function () {
        return function (resource, globals) {
            this.audio.resetChannels();
            const vSplitArea = new SplitArea('X', [32, 256, 32]);
            vSplitArea.addPane(new ColorPane('#000000'), 1);
            worldScreen.addArea(vSplitArea);

            globals.time = null;
            globals.lastSavePos = null;
            globals.updateStatusPane();

            let lifes = '' + globals.lifes;
            if (lifes.length === 1) {
                lifes = ' ' + lifes;
            }
            globals.statusPane.addTextBlock({
                id: 'screentext',
                x: 88,
                y: 64,
                text:
                    'WORLD ' + globals.world + "\n\n\n    * " + lifes,
                lineSpacing: 4
            });
            vSplitArea.addPane(globals.statusPane, 1);

            const spritePane = new SpritePane(globals.spriteSheet);
            spritePane.addSprite('minicoin', 'minicoin', 87, 16);
            spritePane.addSprite('player', 'small-mario', 96, 94);
            spritePane.setNoCollision('minicoin', true);
            vSplitArea.addPane(spritePane, 1);

            let timer = 0;
            worldScreen.setFrameHandler(function () {
                if (globals.lifes === 0) {
                    this.gotoScreen('game-over', {msgParams: {
                            msg: 'GAME OVER',
                            bgm: 'gameover',
                            time: 6 * 60,
                            next: 'demo'
                        }});
                }
                timer++;
                if (timer >= 60 * 3) {
                    this.gotoScreen('mario');
                }
                spritePane.updateFrames();
            });
        }
    });
    this.addScreen(worldScreen);

    /*
    // ##############################
    //   Turrican
    // ##############################

    var tb = TILE.DIM_16x16;
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

    let shadowTiles = new Image();
    shadowTiles.src = "data:image/png;base64,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";

    const worldTilesMap = new TilesMap(tb, spriteSheet, world);
    var levelPane = new BufferedTilesPane(worldTilesMap, {maxSpeed: 4, endless: {x: true, y: false}});
    var fadeBg = new LinearGradientPane(
        'Y',
        ['#000000', 100, '#400000', 100, '#000080', 40, '#F0F040'] //, 100, '#802050']
    );


    const bgTilesMap = new TilesMap(
        TILE.DIM_16x16,
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
    );
    const bgPane = new BufferedTilesPane(bgTilesMap, {maxSpeed: 4});

    const mySpriteSheet = new SpriteSheet("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA7ElEQVRYR9WX0Q6FIAxD2f9/NAYTDE5g7ZQFfbk+SHuAsnEl55xTSklEpPxGPZdvfYmEuHkW40gI7XUtewREz+O27yshRtqP4K2AmGl2k/8lhKU1PHrWQOS4IhrTs48IjEDQsWbxQYVaEGaMCcDWCcb8LH7IXqIQrDkFYEF4zGmAEYTX3AWgIdot9HRUOAM6K+2s33TSfwLo2dfVCdmCXuDCQjgz8kLAGUAMkG90mCEARpj5FqoDrKBVMakV8JhXA3TsnhcSlB7ppJbWXpdSixaZMXtF2+OPycqZz7po6R0Sad49ohXA08m+yMQB423wEY5FdSYAAAAASUVORK5CYII=");
    mySpriteSheet.addSprite('player', 0, 0, 0, 0);
    const playerPane = new SpritePane(mySpriteSheet);
    playerPane.addSprite('player', 'player', 30, 20);
    playerPane.setActorId('player');

    /*
        let gameArea = new Area();
        gameArea.addPane(fadeBg);
        gameArea.addPane(bgPane);
        gameArea.addPane(levelPane);
        gameArea.addPane(playerPane);

        let logoArea = new Area();
        logoArea.addPane(new ColorPane('#508050'));

        let textArea = new Area();
        textArea.addPane(new ColorPane('#A07070'));
        textArea.addPane(new ColorPane('#A0A040'));

        let statusArea = new SplitArea('X', [100, 220]);
        statusArea.addArea(textArea, 1);
        statusArea.addArea(logoArea);

        let mainArea = new SplitArea('Y', [240, 16]);
        mainArea.addArea(gameArea);
        mainArea.addArea(statusArea);

        gameScreen.addArea(mainArea);

        const gamePanesScroller = new MasterSlavesScrollHandler(levelPane);
        gamePanesScroller.addSlave(fadeBg, 0.75, 0.75);
        gamePanesScroller.addSlave(bgPane, 0.25, 0.25);

        const gameScrollBounds = new BoundsScrollHandler(playerPane, gamePanesScroller, {x: 130, y: 50});

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
            }

            if (moveX !== 0 || moveY !== 0) {
                gameScrollBounds.moveActor(moveX, moveY);
            }
        });

     */

/*
    // ################################
    const buffTilesMap = new TilesMap(
        TILE.DIM_32x32,
        shadowTiles,
        [
            [20, 20, 20, 20, 20,  20, 20, 20, 20, 20,  20, 20, 20, 20, 20,  20, 20, 20, 20, 20,   20, 20, 20, 20, 20,  20, 20, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 34,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 22,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,   0, 20,  0, 20,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],

            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 18, 19,  20,  0, 20,  0, 20,   20,  0,  0,  0, 20,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,  22, 20,  0, 20, 20,    0, 20,  0, 20,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,  22,  0, 20,  0, 20,    0,  0, 20,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,  22, 20,  0, 20, 20,    0, 20,  0, 20,  0,   0, 0, 20],
            [20,  0, 21,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20, 21,  22,  0, 20,  0, 20,   20,  0,  0,  0, 20,   0, 0, 20],

            [20,  0, 20, 20, 20,  20, 20, 20, 20, 20,  20, 20, 20, 20,  0,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20,  0,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20,  0,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0,  0,   0,  0,  0,  0,  0,   0,  0,  0, 20,  0,   0,  0,  0,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],

            [20,  0,  0, 20,  0,   0,  0, 26,  0,  0,   0,  0, 12, 13, 14,  15, 16, 17,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 20, 20, 20,  0,   0,  0, 27,  0,  0,   0,  0, 18, 19, 20,  21, 22, 23,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  0,  0, 20,   0, 28,  0,  0,  0,   0,  0, 24, 25, 26,  27, 28, 29,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 20, 20, 20, 20,   0,  0, 20,  0,  0,   0,  0, 30, 31, 32,  33, 34, 35,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 20,  0,  0, 20,   0,  0, 20,  0,  0,   0,  0,  0,  1,  2,   3,  4,  5,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],

            [20, 20,  0,  0, 20,   0,  0, 20,  0,  0,   0,  0,  6,  7,  8,   9, 10, 11,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 20,  0,  0, 20,   0,  0, 20,  0,  0,   0,  0, 12, 13, 14,  15, 16, 17,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  5,  6,  0,  0,   0,  0, 24,  0,  0,   0,  0, 18, 19, 20,  21, 22, 23,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0, 33,  0,  0,   0, 25,  0,  0,  0,   0,  0, 24, 25, 26,  27, 28, 29,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20,  0,  1,  2,  3,   4,  5,  0,  0,  0,   0,  0, 30, 31, 32,  33, 34, 35,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],

            [20,  6,  7,  8,  9,  10, 11,  0,  0,  0,   0,  0,  0,  1,  2,   3,  4,  5,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 12, 13, 14, 15,  16, 17,  0,  0,  0,   0,  0,  6,  7,  8,   9, 10, 11,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 18, 19, 20, 21,  22, 23,  0,  0,  0,   0,  0, 12, 13, 14,  15, 16, 17,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 24, 25, 26, 27,  28, 29,  0,  0,  0,   0,  0, 18, 19, 20,  21, 22, 23,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],
            [20, 30, 31, 32, 33,  34, 35,  0,  0,  0,   0,  0, 24, 25, 26,  27, 28, 29,  0,  0,    0,  0,  0,  0,  0,   0, 0, 20],

            [20, 20, 20, 20, 20,  20, 20, 20, 20, 20,  20, 20, 20, 20, 20,  20, 20, 20, 20, 20,   20, 20, 20, 20, 20,   20, 20, 20],
        ]
    );

    const testPane = new BufferedTilesPane(
        buffTilesMap,
        {
        maxSpeed: 6,
        endless: {
            x: true,
            y: true
        }
    });
    const testScreen = new Screen('test');
    testScreen.addPane(new ColorPane('#000000'));
    testScreen.addPane(testPane);
    testScreen.setKeyHandler(() => {
        let moveX = 0;
        let moveY = 0;
        const speed = 6;
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

      if (moveX !== 0 || moveY !== 0) {
            testPane.scrollBy(moveX, moveY);
      }
    });

    this.addScreen(testScreen);


    // ################################
*/
    const moveScreen = new Screen('move-it');
    moveScreen.addPane(new ColorPane('#D0D0D0'));
    const canPane = new CanvasPane();
    moveScreen.addPane(canPane);
    moveScreen.setInitHandler(function () {
        return function () {
        }
    });
    let frameCount = 0;
    let jumpX = 2;
    function drawPath(path, color, offset = 0) {
        const ctx = canPane.getCtx();
        ctx.fillStyle = color;
        let posX = jumpX;
        let posY = 100 + offset;
        ctx.fillRect(posX, posY, 2, 2);
        for (let point of path) {
            posX += 2;
            posY += point;
            ctx.fillRect(posX, posY, 2, 2);
        }
        return posX - jumpX;
    }

    const jumps = [
        [-4, -4, -4, -4, -3, -3, -2, -2, -1, -1, -1, 0, 0, 1, 1, 2, 2, 2, 3, 4, 4, 4, 4, 2],
        [-4, -4, -4, -3, -3, -3, -2, -1, -1, -1, 0, 0, 0, 2, 1, 2, 2, 3, 3, 4, 4, 4, 1],
        [-4, -4, -4, -4, -3, -4, -3 , -2, -2, -2, -1, -1, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 1],
        [-4, -4, -4, -4, -3, -4, -3, -3, -3, -3, -3, -2, -3, -2, -2, -2, -2, 0, -1, 0, 0, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 4, 4, 4, 5, 3],
        [-4, -4, -4, -4, -3, -4, -3, -3, -3, -3, -3, -2, -3, -2, -2, -2, -2, -2, -2,  -2, -1, -2, -1, -1, -1, 0, -1, -1, 0, -1, 0, 0,
            1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 4, 4, 4, 5, 3]
    ];

    const speedUp = [[
        0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 2, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 2, 2, 1, 1, 2, 0, 2, 1, 2, 1, 2
    ],
        [
            1, -1, 0, 0, 0,
            1, 0, 0, 0, 1,
            0, 1, 0, 1, 0,
            2, 0, 1, 1, 0,
            1, 1, 0, 2, 1,
            1, 1, 1, 1, 1,
            1, 1, 1, 2, 2,
            1, 1, 1, 1, 2,
            1, 2, 1, 2, 1,
            3, 1, 2, 1, 1,
            1, 2, 1, 2, 1,
            2, 1, 3, 1, 2,
            1, 1, 1, 2, 1,
            2, 1, 2, 1, 3,
            1, 2, 1, 1, 1,
            2, 1
        ],
        [
            1, -1, 0, 0, 0,
            0, 1, 0, 1, 0,
            1, 0, 1, 1, 0,
            2, 1, 1, 1, 1,
            1, 1, 1, 1, 1,
            1, 2, 1, 2, 2,
            2, 2, 2, 2, 0,
            2, 2, 2, 4, 2,
            1, 2, 2, 3, 3,
            3, 1, 3, 2, 3,
            3, 3, 1, 3, 2,
            3
        ]
    ];


    moveScreen.setFrameHandler(function () {



        if (frameCount === 0) {

            const runGrav =  [0.03571428571428571, 0.0538563829787234];
            let currAcc = 0;
            let maxAcc = [1.5, 2.5];
            let newPath = [];
            let gravIndex = 0;
            let i = 1;
            // beschleunigungsphase
            while (i < 80) {
                if (currAcc < maxAcc[gravIndex]) {
                    currAcc += runGrav[gravIndex];
                    currAcc = Math.min(maxAcc[gravIndex], currAcc);
                }
                newPath.push(currAcc);
                i++;
                if (i === 60) {
                    gravIndex++;
                }
            }
            // bremsphase
            const brakeFactor = 4;
            while (currAcc > 0) {
                currAcc -= brakeFactor * runGrav[gravIndex];
                currAcc = Math.max(0, currAcc);
                newPath.push(currAcc);
            }

            const jumpForce1 = new Force(-2.25, -47, -0.22);
            const jumpForce2 = new Force(-1.00, -14, -0.05);
            const vector1 = [jumpForce1.getPeakTime(), null];
            const vector2 = [jumpForce2.getPeakTime(), null];
            const path1 = [];
            const path2 = [];
            for (let i = 0; i < speedUp[1].length; i++) {
                const move = Math.min(jumpForce1.getMoveForTimeVector(vector1), 2.5);
                path1.push(move);
                path2.push(Math.min(move - i * 0.015, 1.5));

//                path2.push(jumpForce2.getMoveForTimeVector(vector2, null, 4));
                jumpForce1.incVector(vector1);
//                jumpForce2.incVector(vector2);
            }

            function drawJump(dragTime = null, color) {
                let height = 0;
                const path = [];
                let i = 0;
                let j = null;
                while (Math.abs(height) < 200) {
                    if (i === dragTime) {
                        j = 0;
                    }
                    const move = jumpForce.getMoveForTimeVector([i, j]);
                    height += move;
                    path.push(move);
                    i++;
                    if (j !== null) {
                        j++;
                    }
                }
                drawPath(path, color, 0);
            }
/*
            drawJump(jumpForce.getPeakTime(), '#00D000');
            drawJump(0, '#00D000');
            jumpX = 2;
    //        drawPath(jumps[0], '#000000');

 */


            drawPath(speedUp[1], '#6F006F');
            drawPath(speedUp[2], '#000000');
            //drawPath(path1, '#00FF00');
            //drawPath(path2, '#004F80');


            drawPath(newPath, '#FFFFFF');
            /*
            const vJump = [0, 0];





            const xGravity = new Gravity();
            let gravV0 = -4.35;
            xGravity.setGravityByHeightAndSpeed(gravV0, -64); // 24
            xGravity.setSpeed(gravV0);
            xGravity.setMaxHeight(100);
            console.log('STEPS', xGravity.gravity);

            const gravPath = [];
            const iMax = (xGravity.getTimeUntilMax() >> 1) - 2;
            for (let i = 0; i < iMax; i++) {
                gravPath.push(xGravity.move());
            }

            xGravity.setDrag(-0.22);

            while(true) {
                const move = xGravity.move();
                if (move === null) {
                    break;
                }
                gravPath.push(move);
            }
            console.log('GRAVITY', gravPath);

            jumpX = 2;
            jumpX += drawPath(jumps[3], '#000000');
            jumpX = 2;

            drawPath(gravPath, '#00FF00', 0);

             */
        }
        frameCount++;
    });
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

 */
            return true;
        } else if (this.keys['<']) {
            this.setDebug(!this.debug);
            console.log('Set Debug', this.debug);
        } else if (this.keys['+']) {
            this.setZoom(Math.floor(this.zoom + 1));
        } else if (this.keys['-']) {
            this.setZoom(Math.floor(this.zoom - 1));
        }
        if (this.keys['3']) {
            this.gotoScreen('tf4');
            //    this.gotoScreen('turrican-ingame');
            return true;
        } else if (this.keys['2']) {
            this.gotoScreen('shadow-ingame');
            return true;

        } else if (this.keys['1']) {
            this.gotoScreen('world', {lifes: 3, score: 0, coins: 0, world: '1-2', worldPos: null, marioLevel: 0});
            return true;

        }
    });

    return 'bootstrap';
});