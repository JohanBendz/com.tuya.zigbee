'use strict';

// The cluster decodes the first record header and leaves the rest of the
// command in data. Validate all lengths before delivering a bundled report.
module.exports = function reportedDatapoints(frame) {
  if (!frame || !Buffer.isBuffer(frame.data)) return [];
  const records = [];
  const payload = frame.data;
  let { dp, datatype, length } = frame;
  let offset = 0;
  while (Number.isInteger(length) && length >= 0 && offset + length <= payload.length) {
    records.push({ dp, datatype, data: payload.subarray(offset, offset + length) });
    offset += length;
    if (offset === payload.length) return records;
    if (payload.length - offset < 4) break;
    dp = payload[offset];
    datatype = payload[offset + 1];
    length = payload.readUInt16BE(offset + 2);
    offset += 4;
  }
  return [];
};
