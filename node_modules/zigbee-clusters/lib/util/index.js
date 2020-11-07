'use strict';

const debug = require('debug')('zigbee-clusters');

function getPropertyDescriptor(obj, name) {
  if (!obj) return;

  // eslint-disable-next-line consistent-return
  return Object.getOwnPropertyDescriptor(obj, name)
    || getPropertyDescriptor(Object.getPrototypeOf(obj), name);
}

/**
 * Return a log string for debugging purposes.
 * @param {number} endpointId
 * @param {string} clusterName
 * @param {number} clusterId
 * @returns {string}
 */
function getLogId(endpointId, clusterName, clusterId) {
  return `ep: ${endpointId}, cl: ${clusterName} (${clusterId})`;
}

module.exports = {
  debug,
  getLogId,
  getPropertyDescriptor,
};
