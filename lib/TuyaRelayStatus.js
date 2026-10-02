'use strict';

// Tuya's manufacturer-specific OnOff relayStatus (0x8002).
// This is NOT the standard Zigbee StartUpOnOff (0x4003), whose previous-state
// wire value is 0xFF rather than Tuya's 0x02. Opt in per known driver only.
const VALUES = Object.freeze({
  '0': 0, off: 0,
  '1': 1, on: 1,
  '2': 2, remember: 2, previous: 2, recover: 2,
  'remember last state': 2, 'remember last status': 2,
  'off/on': 2,
});

function normalizeTuyaRelayStatus(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new RangeError('Unsupported Tuya relayStatus value');
  }
  const key = String(value).trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(VALUES, key)) {
    throw new RangeError('Unknown Tuya relayStatus value: ' + String(value));
  }
  return VALUES[key];
}

// Read only on startup. A failed/unsupported read must not write a default to
// the hardware, overwrite an existing Homey preference or block OnOff setup.
async function syncTuyaRelayStatus(device, cluster) {
  if (!cluster || typeof cluster.readAttributes !== 'function') {
    device.log('Tuya relayStatus read skipped: OnOff cluster unavailable.');
    return false;
  }
  try {
    const response = await cluster.readAttributes(['relayStatus']);
    if (!response || response.relayStatus === undefined || response.relayStatus === null) {
      device.log('Tuya relayStatus not returned; retaining Homey setting.');
      return false;
    }
    const setting = String(normalizeTuyaRelayStatus(response.relayStatus));
    await device.setSettings({ relay_status: setting });
    return true;
  } catch (error) {
    device.log('Tuya relayStatus could not be synchronized; retaining Homey setting:', error.message);
    return false;
  }
}

// Homey setting IDs are numeric strings. Never accept partial numbers,
// unsupported enums or the standard ZCL 0xFF in a Tuya 0x8002 write.
function parseTuyaRelaySetting(value) {
  if ((typeof value !== 'string' && typeof value !== 'number')
    || !/^[012]$/.test(String(value))) {
    throw new RangeError('Invalid relay_status; expected 0, 1 or 2');
  }
  return Number(value);
}

async function writeTuyaRelayStatus(cluster, settingValue) {
  const code = parseTuyaRelaySetting(settingValue);
  if (!cluster || typeof cluster.writeAttributes !== 'function') {
    throw new Error('Tuya OnOff cluster unavailable for relay_status write');
  }
  return cluster.writeAttributes({ relayStatus: code });
}

module.exports = {
  normalizeTuyaRelayStatus,
  parseTuyaRelaySetting,
  syncTuyaRelayStatus,
  writeTuyaRelayStatus,
};
