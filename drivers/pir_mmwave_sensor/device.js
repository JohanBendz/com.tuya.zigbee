'use strict';

const { Cluster } = require('zigbee-clusters');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
// const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice'); // Not needed - using ZigBeeDevice

Cluster.addCluster(TuyaSpecificCluster);

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.raw:
            return dpValue.data;
        case dataTypes.bool:
            return dpValue.data[0] === 1;
        case dataTypes.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        case dataTypes.string:
            let dataString = '';
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case dataTypes.enum:
            return dpValue.data[0];
        case dataTypes.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

class pir_mmwave_sensor extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialize transaction ID for Tuya commands
        this.transactionID = 0;

        this.printNode();

        if (this.isFirstInit()) {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    cluster: CLUSTER.IAS_ZONE,
                    attributeName: 'zoneStatus',
                    minInterval: 5,
                    maxInterval: 3600,
                    minChange: 0,
                }, {
                    endpointId: 1,
                    cluster: CLUSTER.POWER_CONFIGURATION,
                    attributeName: 'batteryPercentageRemaining',
                    minInterval: 60,
                    maxInterval: 21600,
                    minChange: 1,
                }, {
                    endpointId: 1,
                    cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
                    attributeName: 'measuredValue',
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 10,
                }
            ]).catch(this.error);
        }

        // alarm_motion handler
        zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
            .on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));

        // measure_battery and alarm_battery handler
        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
            .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

        // measure_luminance handler
        zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
            .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

        // Tuya specific cluster handlers
        zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("datapoint", value => this.processResponse(value));

        // Read battery level directly since reporting is "NOT_FOUND" per interview data
        this.log('🔋 Reading battery level directly (interview shows value: 200)...');
        try {
            const batteryData = await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
            this.log('🔋 Battery read result:', batteryData);
            
            if (batteryData && batteryData.batteryPercentageRemaining !== undefined) {
                this.log('🔋 Found batteryPercentageRemaining:', batteryData.batteryPercentageRemaining);
                this.onBatteryPercentageRemainingAttributeReport(batteryData.batteryPercentageRemaining);
            }
            
            // Set up periodic battery reading since automatic reporting doesn't work
            this.batteryInterval = setInterval(async () => {
                try {
                    const battery = await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
                    if (battery && battery.batteryPercentageRemaining !== undefined) {
                        this.onBatteryPercentageRemainingAttributeReport(battery.batteryPercentageRemaining);
                    }
                } catch (error) {
                    this.log('🔋 Periodic battery read failed:', error.message);
                }
            }, 30 * 60 * 1000); // Read every 30 minutes
            
        } catch (error) {
            this.log('🔋 Initial battery read failed:', error.message);
            // Fallback: set battery from interview data
            this.log('🔋 Using fallback battery value from interview data (200 -> 100%)');
            this.onBatteryPercentageRemainingAttributeReport(200);
        }
    }

    // Handle motion status attribute reports
    onZoneStatusAttributeReport(status) {
        this.log("Motion status: ", status.alarm1);
        this.setCapabilityValue('alarm_motion', status.alarm1).catch(this.error);
    }

    // Handle battery status attribute reports
    onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        const batteryLevel = batteryPercentageRemaining / 2; // Convert to percentage
        this.log('🔋 Battery handler called! Raw value:', batteryPercentageRemaining, 'Converted:', batteryLevel, '%');
        this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);
        this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
    }

    // Handle illuminance attribute reports
    onIlluminanceMeasuredAttributeReport(measuredValue) {
        const luxValue = Math.round(Math.pow(10, ((measuredValue - 1) / 10000))); // Convert measured value to lux
        this.log('measure_luminance | Illuminance (lux):', luxValue);
        this.setCapabilityValue('measure_luminance', luxValue).catch(this.error);
    }

    // Process Tuya-specific data points
    async processResponse(data) {
        const dp = data.dp;
        const measuredValue = getDataValue(data);
        this.log('Tuya data received - DP:', dp, 'Value:', measuredValue, 'Full data:', data);

        switch (dp) {
            case 1:
                // Presence/Motion detection - can be boolean or number (1/0)
                this.log('Motion detected via Tuya DP1:', measuredValue);
                if (typeof measuredValue === 'boolean') {
                    this.setCapabilityValue('alarm_motion', measuredValue).catch(this.error);
                } else if (typeof measuredValue === 'number') {
                    const motionDetected = measuredValue === 1;
                    this.log('Motion state:', motionDetected ? 'DETECTED' : 'CLEAR');
                    this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
                }
                break;

            case 2:
                // Motion detection sensitivity (0-19, higher = more sensitive)
                if (typeof measuredValue === 'number') {
                    this.log('Motion detection sensitivity:', measuredValue);
                    // Note: Don't call setSettings here - it will be set by onSettings or read on init
                }
                break;

            case 102:
                // Fading time / Motion keep time (0-28800 seconds)
                if (typeof measuredValue === 'number') {
                    this.log('Fading time (motion keep time):', measuredValue, 'seconds');
                    // Note: Don't call setSettings here - it will be set by onSettings or read on init
                }
                break;

            case 106:
                // Illuminance (matches standard cluster, just log)
                if (typeof measuredValue === 'number') {
                    this.log('Illuminance via Tuya DP106:', measuredValue, 'lux');
                    // Standard cluster handles the capability
                }
                break;

            case 107:
                // Illuminance interval (1-720 minutes)
                if (typeof measuredValue === 'number') {
                    this.log('Illuminance interval:', measuredValue, 'minutes');
                    // Note: Don't call setSettings here - it will be set by onSettings or read on init
                }
                break;

            case 108:
                // LED indicator on/off
                if (typeof measuredValue === 'boolean') {
                    this.log('LED indicator:', measuredValue ? 'ON' : 'OFF');
                    // Note: Don't call setSettings here - it will be set by onSettings or read on init
                } else if (typeof measuredValue === 'number') {
                    const indicatorOn = measuredValue === 1;
                    this.log('LED indicator:', indicatorOn ? 'ON' : 'OFF');
                    // Note: Don't call setSettings here - it will be set by onSettings or read on init
                }
                break;

            case 110:
                // Battery percentage
                if (typeof measuredValue === 'number') {
                    this.log('🔋 Battery via Tuya DP110:', measuredValue, '%');
                    this.setCapabilityValue('measure_battery', measuredValue).catch(this.error);
                    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
                    this.setCapabilityValue('alarm_battery', measuredValue < batteryThreshold).catch(this.error);
                }
                break;

            default:
                this.log(`Unknown Tuya DP: ${dp} = ${measuredValue}`);
                break;
        }
    }

    // Handle settings changes
    async onSettings({ newSettings, changedKeys }) {
        this.log('Settings changed:', changedKeys);

        for (const key of changedKeys) {
            const value = newSettings[key];

            switch (key) {
                case 'fading_time':
                    // DP102: Fading time (motion keep time) in seconds
                    this.log('Setting fading time to:', value, 'seconds');
                    await this.writeTuyaData(102, dataTypes.value, value);
                    break;

                case 'motion_detection_sensitivity':
                    // DP2: Motion detection sensitivity (0-19)
                    this.log('Setting motion detection sensitivity to:', value);
                    await this.writeTuyaData(2, dataTypes.value, value);
                    break;

                case 'illuminance_interval':
                    // DP107: Illuminance interval in minutes
                    this.log('Setting illuminance interval to:', value, 'minutes');
                    await this.writeTuyaData(107, dataTypes.value, value);
                    break;

                case 'indicator':
                    // DP108: LED indicator on/off
                    this.log('Setting LED indicator to:', value ? 'ON' : 'OFF');
                    await this.writeTuyaData(108, dataTypes.bool, value ? 1 : 0);
                    break;

                case 'batteryThreshold':
                    // This is a local setting, no need to send to device
                    this.log('Battery threshold changed to:', value, '%');
                    break;

                default:
                    this.log('Unknown setting changed:', key);
                    break;
            }
        }
    }

    // Write data to Tuya cluster
    async writeTuyaData(dp, dataType, value) {
        try {
            let data;
            let length;

            // Prepare data buffer based on data type
            switch (dataType) {
                case dataTypes.bool:
                    data = Buffer.alloc(1);
                    data.writeUInt8(value ? 0x01 : 0x00, 0);
                    length = 1;
                    break;

                case dataTypes.value:
                    data = Buffer.alloc(4);
                    data.writeUInt32BE(value, 0);
                    length = 4;
                    break;

                case dataTypes.enum:
                    data = Buffer.alloc(1);
                    data.writeUInt8(value, 0);
                    length = 1;
                    break;

                default:
                    throw new Error(`Unsupported data type: ${dataType}`);
            }

            await this.zclNode.endpoints[1].clusters.tuya.datapoint({
                status: 0,
                transid: this.transactionID++,
                dp,
                datatype: dataType,
                length,
                data
            });

            this.log(`✅ Successfully sent Tuya DP${dp} with value:`, value);
        } catch (error) {
            this.error(`❌ Failed to send Tuya DP${dp}:`, error);
            throw error;
        }
    }

    // Handle device removal
    onDeleted() {
        this.log('PIR MMWave Sensor removed');
        if (this.batteryInterval) {
            clearInterval(this.batteryInterval);
            this.batteryInterval = null;
        }
    }
}

module.exports = pir_mmwave_sensor;