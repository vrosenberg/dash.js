/**
PLAY:
- load test page
- set settings
- load stream
- check playing state
- check if playback progressing
- check live delay
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const lodash = require('lodash');

// Suite name
const NAME = 'LIVE_DELAY';

// Test constants
const LIVE_DELAY_IN_SEGMENTS = 3; // Live delay =  Segment duration * live delay in segments
const LIVE_DELAY_DELTA = 0.2; // Defines interval in which actual live delay is tolerable in fractions
const INITIALBITRATE_VIDEO = 0;
const AUTOSWITCHBITRATE_VIDEO = false;

/** Live Delay is being set and lowest quality will be chosen in dash.js settings object */
function getSettings(defaultSettings, liveDelay){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.delay.liveDelay = liveDelay;
    settings.streaming.abr.initialBitrate.video = INITIALBITRATE_VIDEO;
    settings.streaming.abr.autoSwitchBitrate.video = AUTOSWITCHBITRATE_VIDEO;

    return settings;
};
exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || !stream.dynamic || stream.SegmentLength === undefined || stream.SegmentLength === null) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
        });

        test('updateSettings', async () => {
            utils.log(NAME, 'updateSettings');

            // update dash.js player settings
            let updateSettings = getSettings(stream.settings, LIVE_DELAY_IN_SEGMENTS * stream.SegmentLength );
            await command.execute(player.updateSettings,[updateSettings]);

            // check if settings have been applied
            let actualSettings = await command.execute(player.getSettings, []);     
            assert.deepEqual(actualSettings,updateSettings);
            // load stream
            await command.execute(player.loadStream, [stream]);
        });

        test('play', async () => {
            utils.log(NAME, 'Play');

            // check if playing
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
        });

        test('checkLiveDelay', async () => {
            utils.log(NAME, 'Check live delay');

            // check if live delay is approx. correct
            var timestampStream = await command.execute(player.timeAsUTC,[]);
            var timestampClient = new Date().getTime()/1000;
            let actualLiveDelay = Math.round(timestampClient - timestampStream);
            assert.approximately(actualLiveDelay,LIVE_DELAY_IN_SEGMENTS * stream.SegmentLength, LIVE_DELAY_IN_SEGMENTS * stream.SegmentLength * LIVE_DELAY_DELTA);
        });
    });
}
