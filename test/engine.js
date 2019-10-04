const engine = require('../src/app/engine');
const assert = require('assert');

describe('Engine', function() {
    describe('Animation', function() {
        describe('1 frame forward + delete animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.DELETE
                )
            }

            let ani1 = getAnimation();
            it('should return frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 1, duration: 1});
            });

            it('should return WAITING as state at start', function() {
                assert.equal(ani1.getState(), engine.ANIMATION.STATE.WAITING);
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return null in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), null);
            });

            it('should return DESTROYED as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.DESTROYED);
            });

        });

        describe('1 frame forward + stop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.STOP
                )
            }

            let ani1 = getAnimation();
            it('should return frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 1, duration: 1});
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 1, duration: 1});
            });

            it('should return DONE as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.DONE);
            });
        });

        describe('1 frame forward + loop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.LOOP
                )
            }
            let ani1 = getAnimation();
            it('should return frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 1, duration: 1});
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 1, duration: 1});
            });

            it('should return RUNNING as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.RUNNING);
            });
        });

        describe('2 frames forward + stop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.STOP
                )
            }

            let ani1 = getAnimation();
            it('should return first frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 1, duration: 1});
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return second frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 2, duration: 1});
            });

            it('should return RUNNING as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.RUNNING);
            });

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return second frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 2, duration: 1});
            });

            it('should return DONE as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.DONE);
            });
        });

        describe('2 frames forward + delete animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.DELETE
                )
            }

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return null in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), null);
            });

            it('should return DESTROYED as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.DESTROYED);
            });

        });

        describe('2 frames forward + loop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD,
                    engine.ANIMATION.END.LOOP
                )
            }

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return first frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 1, duration: 1});
            });

            it('should return RUNNING as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.RUNNING);
            });
        });

        describe('2 frames backward + loop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD,
                    engine.ANIMATION.END.LOOP
                )
            }

            let ani1 = getAnimation();
            it('should return second frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 2, duration: 1});
            });
            it('should return RUNNING as state at start', function() {
                assert.equal(ani1.getState(), engine.ANIMATION.STATE.WAITING);
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return first frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 1, duration: 1});
            });
            it('should return RUNNING as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.RUNNING);
            });

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return second frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 2, duration: 1});
            });
            it('should return RUNNING as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.RUNNING);
            });

        });

        describe('2 frames backward + stop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD,
                    engine.ANIMATION.END.STOP
                )
            }

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return first frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 1, duration: 1});
            });
            it('should return DONE as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.DONE);
            });

        });

        describe('2 frames backward + delete animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD,
                    engine.ANIMATION.END.DELETE
                )
            }

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return null in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), null);
            });
            it('should return DESTROYED as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.DESTROYED);
            });

        });

        describe('2 frames forward_backward + stop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD_BACKWARD,
                    engine.ANIMATION.END.STOP
                )
            }

            let ani1 = getAnimation();
            it('should return first frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 1, duration: 1});
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return second frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 2, duration: 1});
            });
            it('should return RUNNING as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.RUNNING);
            });

            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return first frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 1, duration: 1});
            });
            it('should return RUNNING as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.DONE);
            });

            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return first frame in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), {id: 1, duration: 1});
            });
            it('should return DONE as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.DONE);
            });

        });

        describe('2 frames forward_backward + delete animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD_BACKWARD,
                    engine.ANIMATION.END.DELETE
                )
            }

            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return null in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), null);
            });
            it('should return DESTROYED as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.DESTROYED);
            });

        });

        describe('2 frames forward_backward + loop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.FORWARD_BACKWARD,
                    engine.ANIMATION.END.LOOP
                )
            }

            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return second frame in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), {id: 2, duration: 1});
            });
            it('should return DONE as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.RUNNING);
            });

        });

        describe('2 frames backward-forward + delete animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD_FORWARD,
                    engine.ANIMATION.END.DELETE
                )
            }

            let ani1 = getAnimation();
            it('should return second frame in getFrame() at start', function() {
                assert.deepEqual(ani1.getFrame(), {id: 2, duration: 1});
            });

            let ani2 = getAnimation();
            ani2.nextFrame();
            it('should return first frame in getFrame() after first nextFrame()', function() {
                assert.deepEqual(ani2.getFrame(), {id: 1, duration: 1});
            });
            it('should return RUNNING as state after first nextFrame()', function() {
                assert.equal(ani2.getState(), engine.ANIMATION.STATE.RUNNING);
            });


            let ani3 = getAnimation();
            ani3.nextFrame();
            ani3.nextFrame();
            it('should return second frame in getFrame() after second nextFrame()', function() {
                assert.deepEqual(ani3.getFrame(), {id: 2, duration: 1});
            });
            it('should return RUNNING as state after second nextFrame()', function() {
                assert.equal(ani3.getState(), engine.ANIMATION.STATE.RUNNING);
            });


            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return null in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), null);
            });
            it('should return DESTROYED as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.DESTROYED);
            });

        });

        describe('2 frames backward-forward + stop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD_FORWARD,
                    engine.ANIMATION.END.STOP
                )
            }

            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return null in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), {id: 2, duration: 1});
            });
            it('should return DONE as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.DONE);
            });
        });

        describe('2 frames backward-forward + loop animation', function () {
            function getAnimation() {
                return new engine.Animation(
                    [{id: 1, duration: 1}, {id: 2, duration: 1}],
                    1,
                    engine.ANIMATION.DIR.BACKWARD_FORWARD,
                    engine.ANIMATION.END.LOOP
                )
            }

            let ani4 = getAnimation();
            ani4.nextFrame();
            ani4.nextFrame();
            ani4.nextFrame();
            it('should return first frame in getFrame() after third nextFrame()', function() {
                assert.deepEqual(ani4.getFrame(), {id: 1, duration: 1});
            });
            it('should return RUNNING as state after third nextFrame()', function() {
                assert.equal(ani4.getState(), engine.ANIMATION.STATE.RUNNING);
            });

        });

    });
});