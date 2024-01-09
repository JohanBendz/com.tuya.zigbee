'use strict';

const { WindowCoveringCluster, ZCLDataTypes} = require('zigbee-clusters');

class TuyaWindowCoveringCluster extends WindowCoveringCluster {

    static get ATTRIBUTES() {
        return {
            ...super.ATTRIBUTES,
            windowCoverStatus: {
                id: 61440,
                type: ZCLDataTypes.enum8 ({
                    Open: 0,
                    Close: 1,
                    Stop: 2
                }),
            },
            calibration: {
                id: 61441,
                type: ZCLDataTypes.enum8 ({
                    End: 0,
                    Start: 1,
                }),
            },
            motorReversal: {
                id: 61442,
                type: ZCLDataTypes.enum8 ({
                    Off: 0,
                    On: 1,
                }),
            },
            calibrationTime : {
                id: 61443,
                type: ZCLDataTypes.uint16,
            },
        };
    }

    static get COMMANDS() {
        return {
            ...super.COMMANDS,
        };
    }

}

module.exports = TuyaWindowCoveringCluster;

/* 
a) After the device receives the 0x00 (open) command, it will immediately report the 0 (open) state through Tuya’s private reporting attribute 0xF000, and control the curtain switch relay to keep it open; run to the curtain switch stroke position, stop the curtain switch relay, And report 1 (stop) status.

b) After the device receives the 0x01 (close) command, it immediately reports the 2 (close) state through Tuya’s private reporting attribute 0xF000, and controls the curtain switch relay to keep it off; it runs to the curtain switch stroke position and stops the curtain switch relay. And report 1 (stop) status.

c) After the device receives the 0x02 (stop) command, it immediately reports the 1 (stop) state through Tuya's private reporting attribute 0xF000.
 */