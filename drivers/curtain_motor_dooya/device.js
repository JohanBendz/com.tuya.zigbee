'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

/* =====================================================================
 * Dooya serial-to-Zigbee RJ11 module (DC1545R family) — TS0601 / EF00
 *
 * Verified datapoint map (live capture, _TZE200_3ylew7b4 / DC1545R):
 *   DP1  enum   command:  0 = open/up, 1 = stop, 2 = close/down
 *   DP2  value  position 0-100  (INVERTED vs Homey: device 0 = open, 100 = closed)
 *   DP3  value  current position 0-100 (reported, same inversion)
 *   DP5  enum   direction
 *
 * These modules pack SEVERAL datapoints into one report frame, which the
 * standard single-DP handlers mis-read (device paired but never moved and the
 * UI never updated — see issues #578, #1293, and zha-device-handlers #4291).
 * parseTuyaFrame() splits the whole payload so position feedback works.
 * ===================================================================== */

const DP = { COMMAND: 1, POSITION: 2, POSITION_STATE: 3 };
const CMD = { OPEN: 0, STOP: 1, CLOSE: 2 };

function parseTuyaFrame(frame) {
  const out = [];
  const firstLen = frame.length || 0;
  out.push({ dp: frame.dp, datatype: frame.datatype, data: frame.data.slice(0, firstLen) });
  let buf = frame.data.slice(firstLen);
  while (buf.length >= 4) {
    const dp = buf[0];
    const datatype = buf[1];
    const len = (buf[2] << 8) | buf[3];
    if (buf.length < 4 + len) break;
    out.push({ dp, datatype, data: buf.slice(4, 4 + len) });
    buf = buf.slice(4 + len);
  }
  return out;
}

function bytesToNumber(b) {
  let v = 0;
  for (let i = 0; i < b.length; i++) { v = (v << 8) + b[i]; }
  return v;
}

class CurtainMotorDooya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
    const tuya = zclNode.endpoints[1].clusters.tuya;

    tuya.on('reporting', (f) => this.onTuyaFrame(f));
    tuya.on('response',  (f) => this.onTuyaFrame(f));

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', (state) => this.sendCommand(state));
    }
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', (pos) => this.sendPosition(pos));
    }

    try { await tuya.dataQuery({}); } catch (e) { this.log('dataQuery skipped:', e.message); }
  }

  get reverseCommand() {
    const v = this.getSetting('reverse');
    return v === true || v === 1 || v === '1';
  }

  get maxOpen() {
    const m = this.getSetting('max_open_percentage');
    return (typeof m === 'number' && m >= 0 && m <= 100) ? m : 100;
  }

  async sendCommand(state) {
    let cmd = state === 'up' ? CMD.OPEN : state === 'down' ? CMD.CLOSE : CMD.STOP;
    if (this.reverseCommand && cmd !== CMD.STOP) cmd = cmd === CMD.OPEN ? CMD.CLOSE : CMD.OPEN;
    return this.writeEnum(DP.COMMAND, cmd);
  }

  async sendPosition(pos) {
    let homeyPct = Math.round(pos * 100);
    homeyPct = Math.max(0, Math.min(this.maxOpen, homeyPct));
    const devicePct = 100 - homeyPct; // intrinsic inversion on these modules
    return this.writeData32(DP.POSITION, devicePct);
  }

  onTuyaFrame(frame) {
    for (const dp of parseTuyaFrame(frame)) {
      if (dp.dp === DP.POSITION || dp.dp === DP.POSITION_STATE) {
        const raw = bytesToNumber(dp.data) & 0xFF;
        if (raw < 0 || raw > 100) continue;
        const homeyPct = 100 - raw;
        this.setCapabilityValue('windowcoverings_set', homeyPct / 100).catch(this.error);
      }
    }
  }

  onDeleted() { this.log('Dooya curtain motor removed'); }
}

module.exports = CurtainMotorDooya;
