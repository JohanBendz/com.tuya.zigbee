'use strict';

const EventEmitter = require('events');

const Cluster = require('./Cluster');
const BoundCluster = require('./BoundCluster');
const { ZCLStandardHeader, ZCLMfgSpecificHeader } = require('./zclFrames');

let { debug } = require('./util');

debug = debug.extend('endpoint');

/**
 * Class representing an endpoint on a node. It contains a reference to its clusters and bindings.
 */
class Endpoint extends EventEmitter {

  /**
   * Creates a new Endpoint instance.
   * @param {ZCLNode} node
   * @param {object} descriptor
   * @param {number} descriptor.endpointId
   * @param {number[]} descriptor.inputClusters
   */
  constructor(node, descriptor) {
    super();
    this.clusters = {};
    this.bindings = {};
    this._node = node;
    this._descriptor = descriptor;
    this._endpointId = descriptor.endpointId;

    // Iterate all the input clusters and instantiate a Cluster for each
    descriptor.inputClusters.forEach(cId => {
      const InputCluster = Cluster.getCluster(cId);
      if (InputCluster) {
        this.clusters[InputCluster.NAME] = new InputCluster(this);
      }
    });
  }

  /**
   * Bind a {@link BoundCluster} instance to this endpoint. This is needed for handling incoming
   * commands on the Cluster instance.
   * @param {string} clusterName
   * @param {BoundCluster} clusterImpl - New BoundCluster instance.
   */
  bind(clusterName, clusterImpl) {
    const OutputCluster = Cluster.getCluster(clusterName);
    if (!OutputCluster) {
      throw new TypeError(`${clusterName} is not a valid cluster`);
    }

    if (!(clusterImpl instanceof BoundCluster)) {
      throw new TypeError('Binding implementation must be an instance of BoundCluster');
    }

    clusterImpl.endpoint = this._endpointId;
    clusterImpl.cluster = OutputCluster;

    this.bindings[OutputCluster.NAME] = clusterImpl;
  }

  /**
   * Unbind a {@link BoundCluster} instance from this endpoint which was previously bound using
   * {@link bind}.
   * @param {string} clusterName
   */
  unbind(clusterName) {
    const OutputCluster = Cluster.getCluster(clusterName);
    this.bindings[OutputCluster.NAME] = new OutputCluster(this, OutputCluster);
  }

  /**
   * Forward the frame to be sent from the {@link Cluster} to the {@link ZCLNode}.
   * @param {number} clusterId
   * @param {object} data
   * @returns {Promise<*>}
   * @private
   */
  async sendFrame(clusterId, data) {
    return this._node.sendFrame(this._endpointId, clusterId, data);
  }

  /**
   * Handles an incoming frame and passes it from the {@link ZCLNode} to the {@link Cluster}.
   * @param {number} clusterId
   * @param {Buffer} frame
   * @param {object} meta
   * @returns {Promise<void>}
   * @private
   */
  async handleFrame(clusterId, frame, meta) {
    const rawFrame = frame;

    if (rawFrame[0] & 0x4) {
      frame = ZCLMfgSpecificHeader.fromBuffer(rawFrame);
    } else frame = ZCLStandardHeader.fromBuffer(rawFrame);

    const response = (frame.frameControl.disableDefaultResponse || (meta && meta.groupId))
      ? null
      : this._makeErrorResponse(frame);

    try {
      const result = await this.handleZCLFrame(clusterId, frame, meta, rawFrame);
      if (!response) return;
      if (result) {
        const [cmdId, data] = result;
        response.data = data.toBuffer();
        response.cmdId = cmdId;
      } else {
        // Set status to success
        response.data[1] = 0;
      }
    } catch (e) {
      debug('error while handling frame', e.message, {
        endpointId: this._endpointId, clusterId, meta, frame,
      });
    }
    if (response) {
      // If desired (disableDefaultResponse: false) try to respond to the incoming frame
      try {
        await this.sendFrame(clusterId, response.toBuffer());
      } catch (err) {
        debug('error while responding with `send frame` to `handle frame`', err, {
          endpointId: this._endpointId, clusterId, response,
        });
      }
    }
  }

  /**
   * Handles forwarding a ZCL frame to the respective cluster or binding.
   * @param {number} clusterId
   * @param {Buffer} frame
   * @param {object} meta
   * @param {Buffer} rawFrame
   * @returns {Promise}
   * @private
   */
  async handleZCLFrame(clusterId, frame, meta, rawFrame) {
    const ClusterClass = Cluster.getCluster(clusterId);
    const clusterName = ClusterClass ? ClusterClass.NAME : clusterId;

    let response;
    if (!frame.frameControl.directionToClient) {
      if (this.bindings[clusterName]) {
        response = await this.bindings[clusterName].handleFrame(frame, meta, rawFrame);
      } else {
        throw new Error('binding_unavailable');
      }
    } else if (this.clusters[clusterName]) {
      response = await this.clusters[clusterName].handleFrame(frame, meta, rawFrame);
    } else {
      throw new Error('cluster_unavailable');
    }

    return response;
  }

  _makeErrorResponse(frame) {
    let result;
    if (frame instanceof ZCLStandardHeader) {
      result = new ZCLStandardHeader();
    } else {
      result = new ZCLMfgSpecificHeader();
      result.manufacturerId = frame.manufacturerId;
    }
    // TODO: flip proper bits
    result.frameControl = frame.frameControl.copy();

    result.frameControl.disableDefaultResponse = true;
    result.frameControl.clusterSpecific = false;
    result.frameControl.directionToClient = !frame.frameControl.directionToClient;

    result.trxSequenceNumber = frame.trxSequenceNumber;
    result.cmdId = 0x0B;
    result.data = Buffer.from([frame.cmdId, 0x01]);
    return result;
  }

}

module.exports = Endpoint;
