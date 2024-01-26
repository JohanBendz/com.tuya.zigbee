'use strict';

const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaOnOffCluster = require("../../lib/TuyaOnOffCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const {getDataValue} = require("./helpers");
const {Cluster} = require("zigbee-clusters");

Cluster.addCluster(TuyaOnOffCluster);
Cluster.addCluster(TuyaSpecificCluster);

/**
 * These are the "Data points" which the Tuya cluster exposes, and can be written against.
 *
 * At the time of writing this code, I could not find any documentation of Tuya cluster:
 * https://developer.tuya.com/en/docs/iot/categorywk?id=Kaiuz1m1xqnt6
 */
const THERMOSTAT_DATA_POINTS = {
    onOff: 1, targetTemperature: 16, currentTemperature: 24
}

/**
 * `WallThermostatDevice` makes the Tuya Wall Thermostat for Electric Floor heating (BHT-002-GCLZB) available in Homey.
 *  The device can be set to a target temperature, turned on and off, and will show current temperature.
 *
 * Most likely also works for the Water/Gas Boiler and Water heating version too.
 * https://smarthomescene.com/reviews/moes-zigbee-smart-thermostat-bht-002/
 *
 * Device manual:
 * https://manuals.plus/beca/bht-002-series-wifi-thermostat-manual.pdf
 *
 * Implementation details:
 * - The device does not implement cluster attributes for thermostat, deviceTemperature, and temperatureMeasurement clusters.
 * - This code is using the Tuya cluster to receive and send Tuya data points back and forth between Homey and the Wall Thermostat.
 */
class WallThermostatDevice extends TuyaSpecificClusterDevice {
    async onNodeInit({zclNode}) {
        this.printNode();
        this.enableDebug();

        this.registerCapabilityListener('target_temperature', async (targetTemperature) => {
            await this.writeData32(THERMOSTAT_DATA_POINTS.targetTemperature, targetTemperature)
            this.log('Target temperature set', targetTemperature)
        })

        this.registerCapabilityListener('onoff', async (onOff) => {
            await this.writeBool(THERMOSTAT_DATA_POINTS.onOff, onOff)
            this.log('device on/off set', onOff)
        })

        this.registerCapabilityListener('measure_temperature', async (currentTemperature) => {
            this.log('current temperature received', currentTemperature)
        })

        zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));

        this.log("🚀 Wall Thermostat booted up!")
    }

    async processResponse(data) {
        const dp = data.dp;
        const parsedValue = getDataValue(data);

        switch (dp) {
            case THERMOSTAT_DATA_POINTS.currentTemperature:
                this.log('Current temperature received', parsedValue);

                try {
                    await this.setCapabilityValue('measure_temperature', parsedValue / 10)
                } catch (e) {
                    this.log("Failed to set current temperature", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.targetTemperature:
                this.log('Target Temperature received', parsedValue);

                try {
                    await this.setCapabilityValue('target_temperature', parsedValue);
                } catch (e) {
                    this.log("Failed to set target temperature", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.onOff:
                this.log('Thermostat on/off received', parsedValue);

                try {
                    await this.setCapabilityValue('onoff', parsedValue);
                } catch (e) {
                    this.log("Failed to set on/off", e);
                }

                break;

            default:
                this.log('Data Point', dp, parsedValue)
        }
    }
}

module.exports = WallThermostatDevice;
