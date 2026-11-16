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

function asManufacturerName(value) {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  return name.length > 0 ? name : undefined;
}

class lcdtemphumidsensor3 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode, node }) {
    this.zclNode = zclNode;
    this._identityNode = node || this.node;
    this.lastTuyaTimeSyncAt = 0;
    this._manufacturerResolved = false;
    this._tuyaTimeSyncAttached = false;
    this._basicReadInFlight = false;
    this._basicReadSettled = false;
    this._basicReadRetried = false;

    // A sleeping TS0601 does not answer Basic during startup (#1554). The
    // interviewed name is already stored at pairing, so never await that read.
    if (!this.adoptManufacturerName(this.resolveStoredManufacturerName(zclNode))) {
      this.manufacturerName = undefined;
      this.applyIdentityProfile();
      this.queueBasicManufacturerRead(zclNode);
    }

    const handleDatapoint = async data => {
      try {
        await this.processResponse(data);
      } catch (error) {
        this.error('Failed to process LCD temperature/humidity datapoint', error);
      }
    };

    const tuyaCluster = zclNode.endpoints[1].clusters.tuya;
    this._tuyaCluster = tuyaCluster;

    tuyaCluster.on('reporting', handleDatapoint);
    tuyaCluster.on('response', handleDatapoint);

    if (this.requiresTuyaTimeSync) {
      this.attachTuyaTimeSync(tuyaCluster);
    }
  }

  // Settings written by homey-zigbeedriver, then interview data already on the
  // device. A live Basic read is only the last resort and must not block init.
  resolveStoredManufacturerName(zclNode) {
    const fromSetting = this.readSettingManufacturerName();
    if (fromSetting) return fromSetting;

    const fromData = this.readDataManufacturerName();
    if (fromData) return fromData;

    const zigbeeNode = this._identityNode || this.node;
    const fromNode = asManufacturerName(zigbeeNode && zigbeeNode.manufacturerName)
      || asManufacturerName(zclNode && zclNode.manufacturerName);
    if (fromNode) return fromNode;

    const endpoint = zclNode && zclNode.endpoints && zclNode.endpoints[1];
    const basicCluster = endpoint && endpoint.clusters && endpoint.clusters.basic;
    if (!basicCluster) return undefined;

    return asManufacturerName(basicCluster.attributes && basicCluster.attributes.manufacturerName)
      || asManufacturerName(basicCluster.manufacturerName);
  }

  readSettingManufacturerName() {
    if (typeof this.getSetting !== 'function') return undefined;

    try {
      return asManufacturerName(this.getSetting('zb_manufacturer_name'));
    } catch (error) {
      this.error('Failed to read zb_manufacturer_name setting', error);
      return undefined;
    }
  }

  readDataManufacturerName() {
    if (typeof this.getData !== 'function') return undefined;

    try {
      const data = this.getData() || {};
      return asManufacturerName(data.manufacturerName)
        || asManufacturerName(data.zb_manufacturer_name);
    } catch (error) {
      this.error('Failed to read manufacturerName from device data', error);
      return undefined;
    }
  }

  adoptManufacturerName(name) {
    const manufacturerName = asManufacturerName(name);
    if (!manufacturerName || this._manufacturerResolved) return false;

    this.manufacturerName = manufacturerName;
    this._manufacturerResolved = true;
    this.applyIdentityProfile();
    if (this.requiresTuyaTimeSync && this._tuyaCluster) {
      this.attachTuyaTimeSync(this._tuyaCluster);
    }
    return true;
  }

  applyIdentityProfile() {
    this.humidityDivisor = tenthPercentHumidityManufacturers.has(this.manufacturerName) ? 10 : 1;
    this.requiresTuyaTimeSync = this.manufacturerName === '_TZE200_locansqn';

    this.log(
      'LCD Temperature & Humidity profile:',
      this.manufacturerName,
      'humidity divisor:',
      this.humidityDivisor
    );
  }

  attachTuyaTimeSync(tuyaCluster) {
    if (this._tuyaTimeSyncAttached || !tuyaCluster || typeof tuyaCluster.on !== 'function') {
      return;
    }

    this._tuyaTimeSyncAttached = true;
    tuyaCluster.on('timeSync', async () => {
      await this.syncTuyaTime(tuyaCluster);
    });
  }

  queueBasicManufacturerRead(zclNode) {
    if (this._manufacturerResolved || this._basicReadInFlight) return;

    const endpoint = zclNode && zclNode.endpoints && zclNode.endpoints[1];
    const basicCluster = endpoint && endpoint.clusters && endpoint.clusters.basic;
    if (!basicCluster || typeof basicCluster.readAttributes !== 'function') {
      this._basicReadSettled = true;
      return;
    }

    this._basicReadInFlight = true;
    Promise.resolve()
      .then(() => basicCluster.readAttributes(['manufacturerName']))
      .then(attributes => {
        this.adoptManufacturerName(attributes && attributes.manufacturerName);
      })
      .catch(error => {
        this.error('Failed to read manufacturerName; using default LCD sensor profile', error);
      })
      .then(() => {
        this._basicReadInFlight = false;
        this._basicReadSettled = true;
      });
  }

  // Missing names stay provisional. The first datapoint after the interviewed
  // name shows up recomputes the divisor and the locansqn time-sync gate, then
  // caches them. A failed init read is retried once, without delaying startup.
  ensureManufacturerProfile() {
    if (this._manufacturerResolved) return;
    if (this.adoptManufacturerName(this.resolveStoredManufacturerName(this.zclNode))) return;

    if (this._basicReadSettled && !this._basicReadInFlight && !this._basicReadRetried) {
      this._basicReadRetried = true;
      this.queueBasicManufacturerRead(this.zclNode);
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
    if (!this._manufacturerResolved) {
      this.ensureManufacturerProfile();
    }

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
