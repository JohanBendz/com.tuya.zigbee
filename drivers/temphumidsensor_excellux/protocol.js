'use strict';
// NTCHT02 protocol from Zigbee2MQTT, verified against physical firmware 2026062212.
// https://www.zigbee2mqtt.io/devices/ZG-106NTH.html
function inspect(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 3) return { error: 'short ZCL frame' };
  const control = frame[0];
  const headerLength = (control & 4) ? 5 : 3;
  if (frame.length < headerLength) return { error: 'short manufacturer-specific ZCL header' };
  const command = frame[headerLength - 1];
  const result = { control, command, sequence: frame[headerLength - 2],
    direction: (control >> 3) & 1, payloadHex: frame.subarray(headerLength).toString('hex') };
  if ((control & 3) !== 1 || ![1, 2, 5, 6, 10].includes(command)) return result;
  const payload = frame.subarray(headerLength);
  if (payload.length < 2) return { ...result, error: 'short candidate Tuya transaction' };
  result.interpretation = 'Tuya datapoints; NTCHT02 mapping from upstream Zigbee2MQTT';
  result.transaction = payload.readUInt16LE(0);
  result.datapoints = [];
  for (let offset = 2; offset < payload.length;) {
    if (payload.length - offset < 4) return { ...result, error: 'truncated datapoint header' };
    const id = payload[offset]; const type = payload[offset + 1];
    const length = payload.readUInt16BE(offset + 2); offset += 4;
    if (length > payload.length - offset) return { ...result, error: 'truncated datapoint value' };
    const data = payload.subarray(offset, offset + length); offset += length;
    const dp = { id, type, length, hex: data.toString('hex') };
    if (type === 2 && length === 4) {
      dp.uint32 = data.readUInt32BE(0); dp.int32 = data.readInt32BE(0);
    }
    if ([1, 4].includes(type) && length === 1) dp.byte = data[0];
    result.datapoints.push(dp);
  }
  return result;
}
function measurements(decoded) {
  if (decoded.error || !decoded.datapoints || decoded.direction !== 1) return {};
  const result = {};
  for (const dp of decoded.datapoints) {
    if (dp.type !== 2 || dp.length !== 4) continue;
    const signed = dp.int32;
    if (dp.id === 1 && signed >= -400 && signed <= 1200) result.probe = signed / 10;
    if (dp.id === 5 && signed >= -4000 && signed <= 8500) result.internal = signed / 100;
    if (dp.id === 4 && dp.uint32 <= 100) result.battery = dp.uint32;
    if (dp.id === 118 && dp.uint32 <= 10000) result.humidity = dp.uint32 / 100;
    if (dp.id === 101 && dp.uint32 >= 5 && dp.uint32 <= 1200) result.sampling = dp.uint32;
  }
  return result;
}
function samplingFrame(seconds, sequence = 1) {
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 1200 || seconds % 5) {
    throw new Error('Sampling interval must be 5–1200 seconds in steps of 5');
  }
  const frame = Buffer.alloc(13);
  frame[0] = 0x11; // cluster-specific, client to server, disable default response
  frame[1] = sequence & 255; frame[2] = 0; // Tuya dataRequest
  frame.writeUInt16LE(sequence & 65535, 3);
  frame[5] = 101; frame[6] = 2; frame.writeUInt16BE(4, 7);
  frame.writeUInt32BE(seconds, 9);
  return frame;
}
module.exports = { inspect, measurements, samplingFrame };
