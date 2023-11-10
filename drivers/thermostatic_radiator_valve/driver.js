'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const Homey = require("homey");

class ThermostaticRadiatorValveDriver extends ZigBeeDriver {

    async onInit() {

        this.homey.flow.getActionCard("window_open_status_set")
            .registerRunListener(async ({ device, message }, state) => {
                await device.setWindowOpen(state.value);
            });
    }
}

module.exports = ThermostaticRadiatorValveDriver;
