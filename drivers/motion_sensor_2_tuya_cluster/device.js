const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const { Cluster } = require('zigbee-clusters');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
    pir_state: 1,
    battery_percentage: 4,
    interval_time: 102,
    pir_sensitivity: 9,
    pir_time: 10,
    illuminance_value: 12
}

const dataTypes = {
    value: 2, // [ 4 byte value ]
    enum: 4, // [ 0-255 ]
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.value:
            return parseInt(dpValue.data.toString('hex'), 16);
        case dataTypes.enum:
            return dpValue.data[0];
    }
}

class motion_sensor_2 extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.enableDebug();
        this.printNode();

        zclNode.endpoints[1].clusters[TuyaSpecificCluster.NAME]
            .on('response', this.updateData.bind(this))
    }

    updateData(data) {
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
                this.log(`Unrecognized DP: ${data.dp}`);
        }
    }
}

module.exports = motion_sensor_2;
