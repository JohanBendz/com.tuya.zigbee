/**
 * File: driver.js
 * Device: Zemismart Wall Switch 1 Gang Driver
 * Version: 5.1.0 - Production Release
 * Date: 2025-07-11
 * Author: Production driver with state verification
 * 
 * Description:
 * - Production driver for Zemismart TS0001 1-gang switches
 * - Supports both _TZ3000_ovyaisip and _TZ3000_pk8tgtdb models
 * - Automatic device discovery handled by Homey
 * - Clean and minimal driver implementation
 * - Single endpoint device (endpoint 1 only)
 */

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWallSwitch1GangDriver extends ZigBeeDriver {

    onInit() {
        this.log('Zemismart Wall Switch 1 Gang Driver v5.1.0 - Production Ready');
        this.log('Supporting TS0001 models: _TZ3000_ovyaisip, _TZ3000_pk8tgtdb');
    }

    /**
     * Device discovery handled automatically by Homey
     * No custom pairing logic needed for this device
     */
    async onPairListDevices() {
        // Return empty array - Homey will handle device discovery
        // based on fingerprints in driver.compose.json
        return [];
    }

}

module.exports = ZemismartWallSwitch1GangDriver;