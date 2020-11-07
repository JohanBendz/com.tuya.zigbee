'use strict';

const _debug = require('debug');

const ZCLNode = require('./lib/Node');
const Cluster = require('./lib/Cluster');
const Clusters = require('./lib/clusters');
const BoundCluster = require('./lib/BoundCluster');
const zclTypes = require('./lib/zclTypes');
const zclFrames = require('./lib/zclFrames');

/**
 * Enables or disables debug logging.
 * @param {boolean} flag - Set to true to enable logging
 * @param {string} namespaces - As specified by [`debug`](https://www.npmjs.com/package/debug)
 * npm module (e.g.
 * `zigbee-clusters:bound-cluster:*`).
 *
 * @example
 *
 * const { debug } = require('zigbee-clusters');
 *
 * // Enables debug logging in zigbee-clusters
 * debug(true);
 */
function debug(flag = true, namespaces = '*') {
  // If arg is boolean and true, or string with length consider logging to be enabled
  if (flag) {
    // TODO: currently `debug.enable()` overrides all enabled namespaces, this is likely to be
    //  fixed in debug@5.0.0 (see: https://github.com/visionmedia/debug/issues/425). Until then
    //  enable all ('*') to prevent disabling others.
    _debug.enable(namespaces);
    return;
  }
  // Disable all, only thing we can do here
  // TODO: maybe from debug@5.0.0 we can disable specific namespaces, in that case only disable
  //  the `zigbee-clusters` namespace.
  _debug.disable();
}

const {
  ZCLDataTypes,
  ZCLDataType,
  ZCLStruct,
} = zclTypes;

module.exports = {
  Cluster,
  BoundCluster,
  ZCLNode,
  zclTypes,
  zclFrames,
  ZCLDataTypes,
  ZCLDataType,
  ZCLStruct,
  ...Clusters,
  debug,
};
