'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER, TimeCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster')
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue, parseSchedule } = require("./helpers");

// debug(true);

Cluster.addCluster(TuyaSpecificCluster);

const THERMOSTAT_DATA_POINTS = {
    preset: 2,
    openWindow: 8,
    frostProtection: 10,
    targetTemperature: 16,
    holidayTemperature: 21,
    currentTemperature: 24,
    localTemperatureCalibration: 27,
    batteryLevel: 35,
    openWindowTemperature: 102,
    comfortTemperature: 104,
    ecoTemperature: 105,
    schedule: 106
}

/**
* Sources:
* 
* - PR with simple impl.:  https://github.com/danielgajdos/com.tuya.zigbee/blob/SDK3/drivers/thermostatic_radiator_valve/device.js
* - Datapoint Zigbee2MQTT: https://github.com/Koenkk/zigbee-herdsman-converters/blob/v15.116.0/src/devices/tuya.ts#L2802-L2831
* - Zigbee2MQTT Device description: https://www.zigbee2mqtt.io/devices/TV02-Zigbee.html
* 
*/
class ThermostaticRadiatorValve extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {

        this.printNode();
        // this.enableDebug();

        this.registerCapabilityListener('window_open', async (value, opts) => {
            this.debug('window_open:', value);
            await this.writeBool(THERMOSTAT_DATA_POINTS.openWindow, value);
        });

        this.registerCapabilityListener("target_temperature", async (value, opts) => {
            this.debug("target_temperature:", value);
            await this.writeData32(THERMOSTAT_DATA_POINTS.targetTemperature, value * 10);
        });

        this.registerCapabilityListener("thermostat_preset", async (value, opts) => {
            this.debug("thermostat_preset:", value);
            await this.writeEnum(THERMOSTAT_DATA_POINTS.preset, value);
        });

        // binding to 61184 / tuya
        zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processReport(value));
        zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processDatapoint(value));

        const settings = this.getSettings();
        this.applySettings(settings);

        this.log("Thermostatic Radiator Valve initialized:", this.getName());
    }

    setWindowOpen(state) {
        this.debug("Window open action received on '" + this.getName() + "' Value:", state);
        this.writeBool(THERMOSTAT_DATA_POINTS.openWindow, state)
            .catch(this.log);
    }

    getWindowOpen() {
        var currentValue = this.getCapabilityValue('window_open');
        return currentValue;
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.applySettings(newSettings);
    }

    applySettings(settings) {
        this.writeData32(THERMOSTAT_DATA_POINTS.comfortTemperature, settings.comfortTemperature * 10);
        this.writeData32(THERMOSTAT_DATA_POINTS.ecoTemperature, settings.ecoTemperature * 10);
        this.writeData32(THERMOSTAT_DATA_POINTS.openWindowTemperature, settings.openWindowTemperature * 10);
        this.writeData32(THERMOSTAT_DATA_POINTS.holidayTemperature, settings.holidayTemperature * 10);
    }

    async setCapabilitySave(capName, capValue) {
        var currentValue = this.getCapabilityValue(capName);
        if (currentValue === capValue) {
            return; // not changed
        }
        this.debug("set capability '" + capName + "' to value:", capValue);
        try {
            await this.setCapabilityValue(capName, capValue);
        } catch (e) {
            this.log("Failed to set capability", e);
        }
    }

    async processReport(data) {
        const dp = data.dp;
        const parsedValue = getDataValue(data);

        switch (dp) {
            case THERMOSTAT_DATA_POINTS.currentTemperature:
                this.debug("local temperature:", parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.targetTemperature:
                await this.setCapabilitySave('target_temperature', parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.openWindow:
                await this.setCapabilitySave('window_open', parsedValue);
                var state = { window_open_status: parsedValue };
                break;

            case THERMOSTAT_DATA_POINTS.preset:
                await this.setCapabilitySave('thermostat_preset', parsedValue.toString());
                break;

            case THERMOSTAT_DATA_POINTS.batteryLevel:
                this.log("battery low:", parsedValue);
                await this.setCapabilitySave('alarm_battery', parsedValue === 0);
                break;

            case THERMOSTAT_DATA_POINTS.comfortTemperature:
                this.debug("comfort temperature:", parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.ecoTemperature:
                this.debug("eco temperature:", parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.openWindowTemperature:
                this.debug("open window temperature:", parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.localTemperatureCalibration:
                this.debug("local temperature calibration:", parsedValue);
                break;

            case THERMOSTAT_DATA_POINTS.holidayTemperature:
                this.debug("holiday temperature:", parsedValue / 10);
                break;

            case THERMOSTAT_DATA_POINTS.schedule:
                this.debug("schedule:", parsedValue);
                break;

            case THERMOSTAT_DATA_POINTS.frostProtection:
                this.debug("frost protection:", parsedValue);
                break;

            case 108: // monday
            case 109: // wednesday
            case 110: // friday
            case 111: // sunday
            case 112: // tuesday
            case 113: // thursday
            case 114: // saturday
                const schedule = parseSchedule(parsedValue);
                this.debug("schedule:", schedule);
                break;

            default:
                this.debug('Data Point', dp, parsedValue)
        }
    }

    async processResponse(data) {
        this.debug("report", data);
    }

    async processDatapoint(data) {
        this.debug("datapoint", data);
    }

    onDeleted() {
        this.log("Thermostatic Radiator Valve removed:", this.getName());
    }
}

module.exports = ThermostaticRadiatorValve;
