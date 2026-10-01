'use strict';

// Candidate-only helper for a future isolated STANDARD CCT driver.
// No existing or published driver imports this module. Never assume a generic
// physical temperature range: require actual, confirmed ZCL device metadata.
function requireVerifiedRange(metadata) {
  if (!metadata || metadata.colorCapabilities?.colorTemperature !== true) {
    throw new RangeError('CCT support is not confirmed by Color Control colorCapabilities');
  }
  const min = metadata.colorTempPhysicalMinMireds;
  const max = metadata.colorTempPhysicalMaxMireds;
  if (!Number.isInteger(min) || !Number.isInteger(max)
      || min < 1 || max > 0xfffe || min >= max) {
    throw new RangeError('Usable physical CCT min/max mireds have not been verified');
  }
  return Object.freeze({ min, max });
}

function checkRange(range) {
  if (!range || !Number.isInteger(range.min) || !Number.isInteger(range.max)
      || range.min < 1 || range.max > 0xfffe || range.min >= range.max) {
    throw new RangeError('Verified CCT range is required');
  }
  return range;
}

// Pinned Athom ZigBeeLightDevice v2.1.4 orientation:
// Homey 0 -> minimum mireds (cool), Homey 1 -> maximum mireds (warm).
function homeyToMired(normalized, range) {
  const { min, max } = checkRange(range);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new RangeError('Homey light_temperature must be a finite 0–1 value');
  }
  return Math.round(min + (max - min) * normalized);
}

// Clamp valid outlying physical reports, reject missing/invalid ZCL sentinel.
function miredToHomey(value, range) {
  const { min, max } = checkRange(range);
  if (!Number.isInteger(value) || value < 1 || value > 0xfffe) {
    throw new RangeError('Received colorTemperatureMireds is invalid');
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

module.exports = { requireVerifiedRange, homeyToMired, miredToHomey };
