'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const Homey = require("homey");

class ThermostaticRadiatorValveDriver extends ZigBeeDriver {

    async onInit() {

        this.homey.flow.getActionCard("window_open_status_set")
            .registerRunListener(async ({ device, message }, state) => {
                await device.setWindowOpen(state.value);
            });

        this.homey.flow.getConditionCard("window_open_status_get")
            .registerRunListener(async ({ device, message }, state) => {
                return device.getWindowOpen();
            });
    }
}

module.exports = ThermostaticRadiatorValveDriver;
