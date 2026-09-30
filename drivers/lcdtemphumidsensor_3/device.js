'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  currentTemperature: 1,
  currentHumidity: 2,
  batteryLevel: 4,
};

const tenthPercentHumidityManufacturers = new Set([
  '_TZE200_bjawzodf',
  '_TZE200_zl1kmjqx',
]);

class lcdtemphumidsensor3 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.manufacturerName = await this.getManufacturerName(zclNode);
    this.humidityDivisor = tenthPercentHumidityManufacturers.has(this.manufacturerName) ? 10 : 1;
    this.requiresTuyaTimeSync = this.manufacturerName === '_TZE200_locansqn';
    this.lastTuyaTimeSyncAt = 0;

    this.log(
      'LCD Temperature & Humidity profile:',
      this.manufacturerName,
      'humidity divisor:',
      this.humidityDivisor
    );

    const handleDatapoint = async data => {
      try {
        await this.processResponse(data);
      } catch (error) {
        this.error('Failed to process LCD temperature/humidity datapoint', error);
      }
    };

    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;

    tuyaCluster.on('reporting', handleDatapoint);
    tuyaCluster.on('response', handleDatapoint);

    if (this.requiresTuyaTimeSync) {
      tuyaCluster.on('timeSync', async () => {
        await this.syncTuyaTime(tuyaCluster);
      });
    }
  }

  async getManufacturerName(zclNode) {
    const basicCluster = zclNode.endpoints[1].clusters.basic;
    const cachedManufacturerName = basicCluster?.attributes?.manufacturerName;

    if (cachedManufacturerName) {
      return cachedManufacturerName;
    }

    if (!basicCluster || typeof basicCluster.readAttributes !== 'function') {
      return undefined;
    }

    try {
      const { manufacturerName } = await basicCluster.readAttributes(['manufacturerName']);
      return manufacturerName;
    } catch (error) {
      this.error('Failed to read manufacturerName; using default LCD sensor profile', error);
      return undefined;
    }
  }

  async syncTuyaTime(tuyaCluster) {
    const utcTime = Math.floor(Date.now() / 1000);
    const localTime = utcTime - new Date().getTimezoneOffset() * 60;
    const payload = Buffer.alloc(8);

    payload.writeUInt32BE(utcTime >>> 0, 0);
    payload.writeUInt32BE(localTime >>> 0, 4);

    try {
      await tuyaCluster.timeSync({
        payloadSize: payload.length,
        payload,
      });
      this.lastTuyaTimeSyncAt = Date.now();
      this.log('Tuya TH01Z time synchronized');
    } catch (error) {
      this.error('Failed to synchronize Tuya TH01Z time', error);
    }
  }

  async processResponse(data) {
    if (
      this.requiresTuyaTimeSync
      && Date.now() - this.lastTuyaTimeSyncAt >= 3600000
    ) {
      await this.syncTuyaTime(this.zclNode.endpoints[1].clusters.tuya);
    }

    const measuredValue = getDataValue(data);

    if (typeof measuredValue !== 'number' || !Number.isFinite(measuredValue)) {
      this.log('Ignoring non-numeric LCD sensor datapoint:', data.dp, measuredValue);
      return;
    }

    switch (data.dp) {
      case dataPoints.batteryLevel: {
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        const battery = Math.max(0, Math.min(100, measuredValue));

        this.log('measure_battery | battery (%):', battery);
        await this.setCapabilityValue('measure_battery', battery);
        await this.setCapabilityValue('alarm_battery', battery < batteryThreshold);
        return;
      }

      case dataPoints.currentHumidity: {
        const humidityOffset = this.getSetting('humidity_offset') || 0;
        const humidity = measuredValue / this.humidityDivisor;

        this.log(
          'measure_humidity | humidity:',
          humidity,
          '+ humidity offset',
          humidityOffset
        );
        await this.setCapabilityValue('measure_humidity', humidity + humidityOffset);
        return;
      }

      case dataPoints.currentTemperature: {
        const temperatureOffset = this.getSetting('temperature_offset') || 0;
        const signedValue = measuredValue > 0x2000 ? measuredValue - 0xFFFF : measuredValue;
        const temperature = signedValue / 10;

        this.log(
          'measure_temperature | temperature:',
          temperature,
          '+ temperature offset',
          temperatureOffset
        );
        await this.setCapabilityValue('measure_temperature', temperature + temperatureOffset);
        return;
      }

      default:
        this.log('Unhandled LCD temperature/humidity datapoint:', data.dp, measuredValue);
    }
  }

  onDeleted() {
    this.log('LCD Temperature & Humidity sensor removed');
  }

}

module.exports = lcdtemphumidsensor3;
