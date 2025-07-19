/**
 * File: driver.js
 * Device: Zemismart Wall Switch 2 Gang Driver
 * Version: 5.1.0 - Production Release
 * Date: 2025-07-11
 * Author: Production driver with state verification
 * 
 * Description:
 * - Production driver for Zemismart TS0002 2-gang switches
 * - Supports both _TZ3000_ywubfuvt and _TZ3000_kgxej1dv models
 * - Automatic device discovery handled by Homey
 * - Clean and minimal driver implementation
 */

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWallSwitch2GangDriver extends ZigBeeDriver {

    onInit() {
        this.log('Zemismart Wall Switch 2 Gang Driver v5.1.0 - Production Ready');
        this.log('Supporting TS0002 models: _TZ3000_ywubfuvt, _TZ3000_kgxej1dv');
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

module.exports = ZemismartWallSwitch2GangDriver;