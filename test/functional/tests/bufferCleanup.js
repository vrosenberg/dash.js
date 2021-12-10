/**
PLAY:
- load test page
- load stream
- check playing state
- check if playback progressing
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const lodash = require('lodash');

// Suite name
const NAME = 'BUFFER_CLEANUP';

// Test constants
const BUFFER_TO_KEEP = 10;
const BUFFER_PRUNING_INTERVAL = 1;
const RELATIVE_ERROR = 0.1


/** Sets bufferToKeep and bufferPruningInterval */
function getSettings(defaultSettings){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.buffer.bufferToKeep = BUFFER_TO_KEEP;
    settings.streaming.buffer.bufferPruningInterval = BUFFER_PRUNING_INTERVAL;

    return settings;
};

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.dynamic) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
        });

        test('updateSettings', async () => {
            utils.log(NAME, 'updateSettings');

            // update dash.js player settings
            let updateSettings = getSettings(stream.settings);
            await command.execute(player.updateSettings,[updateSettings]);

            // check if settings have been applied
            let actualSettings = await command.execute(player.getSettings, []);     
            assert.deepEqual(actualSettings,updateSettings);

        });

        test('play', async () => {
            utils.log(NAME, 'Play');
            // load stream
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            assert.isTrue(playing);
        });

        test('progress', async () => {
            utils.log(NAME, 'Progress');
            var progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
            let rand = Math.random() * 10;
            await command.sleep( (BUFFER_TO_KEEP + rand)*1000);
            await command.execute(player.pause,[]);
        });

        test('Check BUffer', async () => {
            //compute actually pruned buffer
            let bufferStart  = await command.execute(player.getBufferRange,[]);
            let playerTime = await command.execute(player.getTime,[]);
            let actualBufferPruned = playerTime - bufferStart;

            //check against expected
            let delta = BUFFER_TO_KEEP * RELATIVE_ERROR + BUFFER_PRUNING_INTERVAL;
            assert.approximately(actualBufferPruned,BUFFER_TO_KEEP,delta);
        });

    });
}
