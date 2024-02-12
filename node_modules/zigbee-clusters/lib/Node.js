'use strict';

const EventEmitter = require('events');

let { debug } = require('./util');
const { getLogId } = require('./util');
const Endpoint = require('./Endpoint');
const Cluster = require('./Cluster');

debug = debug.extend('node');

// networkAddress: 1234,
// lqi: NaN,
// route: null,
// profileID: null,
// manufacturerID: null,
// deviceId: null,
// url: null,
// swVersion: null,
// endpoints: {
// }

/**
 * This class represents a ZCLNode, a node instance with Zigbee Cluster Library capabilities. It
 * can only be created from a node instance provided by `Homey.ManagerZigBee.getNode()`.
 * @alias ZCLNode
 */
class Node extends EventEmitter {

  /**
   * Create a new ZCLNode instance.
   * @param {Homey.ZigBeeNode} node - As provided by `Homey.ManagerZigBee.getNode()`.
   *
   * @example
   * const Homey = require('homey');
   * const { ZCLNode } = require('zigbee-clusters');
   *
   * // Get Homey.ZigBeeNode instance
   * const node = await Homey.ManagerZigBee.getNode(this);
   *
   * // Create ZCLNode instance from node
   * const zclNode = new ZCLNode(node);
   *
   * // Interact with remote node
   * await zclNode.endpoints[1].clusters['onOff'].toggle();
   */
  constructor(node) {
    super();

    // From ZigBeeNode to ZCLNode
    node.handleFrame = this.handleFrame.bind(this);

    // From ZCLNode to ZigBeeNode
    this.sendFrame = async (...args) => {
      return node.sendFrame(...args);
    };

    this.endpoints = {};

    if (Array.isArray(node.endpointDescriptors)) {
      node.endpointDescriptors.forEach(ep => {
        this.endpoints[ep.endpointId] = new Endpoint(this, ep);
      });
    }
  }

  /**
   * Returns log id string for this node.
   * @param {number} endpointId
   * @param {number} clusterId
   * @returns {string}
   * @private
   */
  getLogId(endpointId, clusterId) {
    const cluster = Cluster.getCluster(clusterId);
    return getLogId(endpointId, cluster ? cluster.NAME : 'unknown', clusterId);
  }

  /**
   * Forwards an incoming frame from the `Homey.ZigBeeNode` to the {@link Endpoint}.
   * @param endpointId
   * @param clusterId
   * @param frame
   * @param meta
   * @returns {Promise<void>}
   * @private
   */
  async handleFrame(endpointId, clusterId, frame, meta) {
    if (!Buffer.isBuffer(frame)) {
      // eslint-disable-next-line prefer-rest-params
      debug(`${this.getLogId(endpointId, clusterId)}, invalid frame received`, arguments, frame);
      return;
    }

    if (this.endpoints[endpointId]) {
      await this.endpoints[endpointId].handleFrame(clusterId, frame, meta);
    } else {
      debug(`${this.getLogId(endpointId, clusterId)}, error while handling frame, endpoint unavailable`, { meta, frame });
    }
  }

}

module.exports = Node;
