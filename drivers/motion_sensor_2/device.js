const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue, dataPoints } = require('./utils');

Cluster.addCluster(TuyaSpecificCluster);

class motion_sensor_2 extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {

        this.printNode();

        try {
            const hasTuyaCluster = await this.hasTuyaCluster(zclNode);

            if (hasTuyaCluster) {
                this.log('Tuya Cluster present on device');
                zclNode.endpoints[1].clusters[TuyaSpecificCluster.NAME]
                    .on('response', this.updateTuyaDeviceData.bind(this));
            } else {
                this.log('Tuya Cluster not present on device');
                zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload =>
                    this.onIASZoneStatusChangeNotification(payload);
                zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
                    .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
                zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
                    .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));
            }
        } catch (error) {
            this.error('Error checking for Tuya Cluster', error);
        }
    }

    hasTuyaCluster(zclNode) {
        this.log('Checking for Tuya Cluster');
        return zclNode.endpoints[1].clusters.hasOwnProperty(TuyaSpecificCluster.NAME);
    }

    // Standard Cluster device handlers
    onIlluminanceMeasuredAttributeReport(measuredValue) {
        const parsedValue = Math.round(Math.pow(10, ((measuredValue - 1) / 10000)));
        this.log('measure_luminance | Luminance - measuredValue (lux):', parsedValue);
        this.setCapabilityValue('measure_luminance', parsedValue).catch(this.error);
    }

    onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
        this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
        this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
    }

    onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
        this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
        this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining / 2 < batteryThreshold) ? true : false).catch(this.error);
    }

    // Tuya Cluster device handlers
    updateTuyaDeviceData(data) {
        console.log(data)
        const value = getDataValue(data);
        this.log(`DP: ${data.dp} - Value: ${value}`)
        switch (data.dp) {
            case dataPoints.pir_state:
                const motion = value === 0
                this.log(`Motion status: ${motion}`);
                this.setCapabilityValue('alarm_motion', motion).catch(this.error);
                break;
            case dataPoints.illuminance_value:
                this.log(`Illuminance: ${value}`);
                this.setCapabilityValue('measure_luminance', value).catch(this.error);
                break;
            case dataPoints.battery_percentage:
                const batteryThreshold = this.getSetting('batteryThreshold') || 20;
                const batteryAlarm = value < batteryThreshold
                this.log(`Battery: ${value}`);
                this.setCapabilityValue('measure_battery', value).catch(this.error);
                this.setCapabilityValue('alarm_battery', batteryAlarm).catch(this.error);
                break;
            case dataPoints.pir_sensitivity:
                this.log(`PIR Sensitivity: ${value}`);
                break;
            case dataPoints.pir_time:
                this.log(`PIR Time: ${value}`);
                break;
            default:
                this.log(`Unrecognized DP: ${data.dp} `);
        }
    }


    onSettings({ newSettings, changedKeys }) { }
    // TODO: Implement settings
    // async onSettings({ newSettings, changedKeys }) {
    //     const hasTuyaCluster = await this.hasTuyaCluster();
    //     if (!hasTuyaCluster) return

    //     if (changedKeys.includes('batteryThreshold')) {
    //         const batteryThreshold = newSettings.batteryThreshold;
    //         this.setBatteryThreshold(batteryThreshold);
    //     }
    //     if (changedKeys.includes('pirSensitivity')) {
    //         const pirSensitivity = newSettings.pirSensitivity;
    //         this.setPIRSensitivity(pirSensitivity);
    //     }
    //     if (changedKeys.includes('keepTime')) {
    //         const keepTime = newSettings.keepTime;
    //         this.setKeepTime(keepTime);
    //     }
    //     if (changedKeys.includes('intervalTime')) {
    //         const intervalTime = newSettings.intervalTime;
    //         this.setIntervalTime(intervalTime);
    //     }
    // }

    // setBatteryThreshold(batteryThreshold) {
    //     this.log(`Setting Battery Threshold: ${batteryThreshold} `);
    //     const battery = this.getCapabilityValue('measure_battery');
    //     const batteryAlarm = battery < batteryThreshold;
    //     this.setCapabilityValue('alarm_battery', batteryAlarm).catch(this.error);
    // }

    // setPIRSensitivity(pirSensitivity) {
    //     this.log(`Setting PIR Sensitivity: ${pirSensitivity} `);
    //     this.writeEnum(dataPoints.pir_sensitivity, pirSensitivity).catch(this.error);
    // }

    // setKeepTime(keepTime) {
    //     this.log(`Setting Keep Time: ${keepTime} `);
    //     this.writeEnum(dataPoints.pir_time, keepTime).catch(this.error);
    // }

    // setIntervalTime(intervalTime) {
    //     this.log(`Setting Interval Time: ${intervalTime} `);
    //     this.writeEnum(dataPoints.interval_time, intervalTime).catch(this.error);
    // }

    onDeleted() {
        this.log("Motion Sensor removed")
    }

}

module.exports = motion_sensor_2;
