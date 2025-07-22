'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER, TimeCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster')
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue, parseSchedule, marshalSchedule, THERMOSTAT_DATA_POINTS } = require("./helpers");


Cluster.addCluster(TuyaSpecificCluster);

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
/*     debug(true);
    this.enableDebug(); */

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
        this.applySettings(newSettings, changedKeys);
    }

    applySettings(settings, keys) {
        if (keys.includes('comfortTemperature')) {
            this.writeData32(THERMOSTAT_DATA_POINTS.comfortTemperature, settings.comfortTemperature * 10);
        }
        if (keys.includes('ecoTemperature')) {
            this.writeData32(THERMOSTAT_DATA_POINTS.ecoTemperature, settings.ecoTemperature * 10);
        }
        if (keys.includes('openWindowTemperature')) {
            this.writeData32(THERMOSTAT_DATA_POINTS.openWindowTemperature, settings.openWindowTemperature * 10);
        }
        if (keys.includes('holidayTemperature')) {
            this.writeData32(THERMOSTAT_DATA_POINTS.holidayTemperature, settings.holidayTemperature * 10);
        }
        if (keys.includes('scheduleMonday') || keys.includes('scheduleTuesday') || keys.includes('scheduleWednesday') || keys.includes('scheduleThursday')
            || keys.includes('scheduleFriday') || keys.includes('scheduleSaturday') || keys.includes('scheduleSunday') || keys.includes('workingDay')) {
            this.updateSchedule(settings);
        }
    }

    updateSchedule(settings) {
        switch (settings.workingDay) {
            case '2': // separate
                // send all days (individual schedule per day)
                var tuesdayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleTuesday, settings.scheduleTuesday);
                var wednesdayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleWednesday, settings.scheduleWednesday);
                var thursdayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleThursday, settings.scheduleThursday);
                var fridayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleFriday, settings.scheduleFriday);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, tuesdayBytes);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, wednesdayBytes);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, thursdayBytes);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, fridayBytes);
            case '1': // Mon-Fri, Sat+Sun
                // send saturday, sunday & monday schedule
                var saturdayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleSaturday, settings.scheduleSaturday);
                var sundaybytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleSunday, settings.scheduleSunday);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, saturdayBytes);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, sundaybytes);
            case '0': // Mon-Sun -> send monday schedule, used for all days
                var mondayBytes = marshalSchedule(settings.workingDay, THERMOSTAT_DATA_POINTS.scheduleMonday, settings.scheduleMonday);
                this.writeRaw(THERMOSTAT_DATA_POINTS.schedule, mondayBytes);
        }
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
        this.log("report", data);
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
                this.setSettings({ "comfortTemperature": parsedValue / 10 });
                break;
            case THERMOSTAT_DATA_POINTS.ecoTemperature:
                this.debug("eco temperature:", parsedValue / 10);
                this.setSettings({ "ecoTemperature": parsedValue / 10 });
                break;
            case THERMOSTAT_DATA_POINTS.openWindowTemperature:
                this.debug("open window temperature:", parsedValue / 10);
                this.setSettings({ "openWindowTemperature": parsedValue / 10 });
                break;
            case THERMOSTAT_DATA_POINTS.localTemperatureCalibration:
                this.debug("local temperature calibration:", parsedValue);
                break;
            case THERMOSTAT_DATA_POINTS.holidayTemperature:
                this.debug("holiday temperature:", parsedValue / 10);
                this.setSettings({ "holidayTemperature": parsedValue / 10 });
                break;
            case THERMOSTAT_DATA_POINTS.frostProtection:
                this.debug("frost protection:", parsedValue);
                break;
            case THERMOSTAT_DATA_POINTS.workingDay:
                this.setSettings({ "workingDay": parsedValue.toString() });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleMonday:
                const scheduleMonday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleMonday": scheduleMonday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleTuesday:
                const scheduleTuesday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleTuesday": scheduleTuesday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleWednesday:
                const scheduleWednesday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleWednesday": scheduleWednesday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleThursday:
                const scheduleThursday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleThursday": scheduleThursday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleFriday:
                const scheduleFriday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleFriday": scheduleFriday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleSaturday:
                const scheduleSaturday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleSaturday": scheduleSaturday });
                break;
            case THERMOSTAT_DATA_POINTS.scheduleSunday:
                const scheduleSunday = parseSchedule(parsedValue);
                this.setSettings({ "scheduleSunday": scheduleSunday });
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
