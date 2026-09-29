'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

class TuyaWaterLeakSensor extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {
        let manufacturerName;

        try {
            ({ manufacturerName } = await zclNode.endpoints[1].clusters.basic.readAttributes([
                'manufacturerName',
                'zclVersion',
                'appVersion',
                'modelId',
                'powerSource',
                'attributeReportingStatus',
            ]));
        } catch (err) {
            this.error('Error when reading device attributes ', err);
        }

        // _TZE200_jthf7vb6 is a distinct WLS-100z profile:
        // DP1 water state (0 = wet) and DP4 battery percentage.
        // Keep this branch for devices paired before the manifest split.
        this.isJthf7vb6 = manufacturerName === '_TZE200_jthf7vb6';

        this.log('Setting up listeners for endpoint 1, tuya cluster...');
        const handleReport = data => {
            try {
                this.onReport(data);
            } catch (err) {
                this.error('Failed to process Tuya water leak report', err);
            }
        };

        zclNode.endpoints[1].clusters.tuya.on('response', handleReport);
        zclNode.endpoints[1].clusters.tuya.on('reporting', handleReport);
        this.log('Listeners have been set up.');

        // The generic qq9mpfhw profile historically polls DP14/15.
        // Do not send those reads to jthf7vb6; it reports battery on DP4.
        if (!this.isJthf7vb6) {
            this.batteryInterval = this.homey.setInterval(async () => {
                try {
                    await zclNode.endpoints[1].clusters.tuya.read({ dp: 14 });
                    await zclNode.endpoints[1].clusters.tuya.read({ dp: 15 });
                } catch (err) {
                    this.error('Error when reading battery status', err);
                }
            }, 3600000);
        }
    }

    // Handle datapoint events
    onReport(data) {
        this.log('Received a response or report:', data);

        if (this.isJthf7vb6) {
            const value = getDataValue(data);

            if (data.dp === 1) {
                const isWet = Number(value) === 0;
                this.log('WLS-100z water state:', value, 'wet:', isWet);
                this.setCapabilityValue('alarm_water', isWet).catch(this.error);
            } else if (data.dp === 4) {
                const battery = Number(value);
                if (Number.isFinite(battery)) {
                    this.log('WLS-100z battery:', battery, '%');
                    this.setCapabilityValue('measure_battery', battery).catch(this.error);
                    if (this.hasCapability('alarm_battery')) {
                        this.setCapabilityValue('alarm_battery', battery < 20).catch(this.error);
                    }
                }
            } else {
                this.log('Unhandled WLS-100z datapoint:', data.dp, 'value:', value);
            }
            return;
        }

        if (data.dp === 15) {
            this.setCapabilityValue('measure_battery', data.data.readUInt32BE(0)).catch(this.error);
        } else if (data.dp === 14) {
            this.setCapabilityValue('alarm_battery', data.data.readUInt8(0) !== 0).catch(this.error);
        }

        if (data.dp === 101) {
            this.log('Received a response or report for dp 101, updating capability...');
            this.setCapabilityValue('alarm_water', data.data.readUInt8(0) === 1).catch(this.error);
            this.log('Capability has been updated.');
        }
    }

    onDeleted() {
        this.log("Water Leak Sensor removed");
    }

    onUninit() {
        if (this.batteryInterval) {
            this.homey.clearInterval(this.batteryInterval);
        }
    }

}

module.exports = TuyaWaterLeakSensor;

