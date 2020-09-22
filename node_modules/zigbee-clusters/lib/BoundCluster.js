'use strict';

const { ZCLDataType } = require('./zclTypes');
const { getPropertyDescriptor } = require('./util');
let { debug } = require('./util');

debug = debug.extend('bound-cluster');

/**
 * Class which represents a bound cluster, which is a cluster implementation on Homey's side. This
 * should be used for situations where remote nodes send commands to a cluster on Homey. In
 * order to use the bound cluster it must be bound the the node's endpoint (see:
 * {@link Endpoint.bind}).
 *
 * @example
 * const { BoundCluster } = require('zigbee-clusters');
 *
 * class MyBoundCluster extends BoundCluster {
 *   toggle() {
 *     // Do something when node sends `toggle` command to Homey
 *   }
 * }
 *
 * zclNode.endpoints[1].bind('onOff', new MyBoundCluster());
 */
class BoundCluster {

  /**
   * Create a new BoundCluster instance.
   */
  constructor() {
    this.clusterRevision = 1;
  }

  /**
   * This method handles an incoming `readAttributes` command send from the remote node
   * to the controller. It assembles attribute values by reading `this[attr.name]` for all
   * supported attributes of this cluster and sends the response to the remote node.
   * @param {object} options
   * @param {string[]} options.attributes
   * @returns {Promise<{attributes: Buffer}>}
   */
  async readAttributes({ attributes }) {
    debug(this.cluster.NAME, 'received read attributes command');
    const result = Buffer.alloc(255);
    const attributeMap = attributes
      .map(aId => {
        const attr = this.cluster.attributesById[aId];
        try {
          const value = this[attr.name];
          if (typeof value === 'undefined') {
            throw new Error('not_implemented');
          }
          attr.type.toBuffer(result, value, 0);
          return {
            id: aId,
            status: 'SUCCESS',
            value,
          };
        } catch (e) {
          debug('Failed to parse attribute:', attr ? attr.name || aId : aId, e.message);
        }

        return {
          id: aId,
          status: 'FAILURE',
        };
      });

    const len = this.cluster.attributeArrayStatusDataType.toBuffer(result, attributeMap, 0);
    const attributesResult = { attributes: result.slice(0, len) };
    debug(this.cluster.NAME, 'return read attributes response', attributesResult);
    return attributesResult;
  }

  /**
   * This method handles an incoming `writeAttributes` command send from the remote node
   * to the controller. It sets the received attribute values on `this[attr.name]` and returns a
   * response to the remote node.
   * @param {object} [options]
   * @param {object[]} options.attributes
   * @returns {Promise<{attributes}>}
   */
  async writeAttributes({ attributes } = {}) {
    debug(this.cluster.NAME, 'received write attributes command', attributes);
    attributes = this.cluster.attributeArrayDataType.fromBuffer(attributes, 0);

    const attributeMap = attributes
      .map(attrValue => {
        const attr = this.cluster.attributesById[attrValue.id];
        try {
          if (typeof attrValue.value === 'undefined') {
            throw new Error('not_parsable');
          }
          if (!(getPropertyDescriptor(this, attr.name) || {}).set) {
            throw new Error('not_settable');
          }

          this[attr.name] = attrValue.value;

          return {
            id: attrValue.id,
            status: 'SUCCESS',
          };
        } catch (e) {
          debug('Error: failed to parse attribute:', attr ? attr.name || attrValue.id : attrValue.id, e.message);
        }

        return {
          id: attrValue.id,
          status: 'FAILURE',
        };
      });

    return { attributes: attributeMap };
  }

  /**
   * This method handles an incoming `discoverCommandsReceived` command send from the remote node
   * to the controller. It assembles the cluster's commands which are implemented on this bound
   * cluster (i.e. commands it can receive) and returns a response to the remote node.
   * @param {object} [options]
   * @param {number} [options.startValue=0]
   * @param {number} [options.maxResults=250]
   * @returns {Promise<{commandIds: number[], lastResponse: boolean}>}
   */
  async discoverCommandsReceived({ startValue = 0, maxResults = 250 } = {}) {
    debug(this.cluster.NAME, 'received discover commands received command');

    const cmds = [].concat(...Object.values(this.cluster.commandsById))
      .filter(c => !c.global && !c.isResponse && this[c.name])
      .map(c => c.id)
      .sort()
      .filter(cId => cId >= startValue);

    const result = cmds.slice(0, maxResults);
    const response = {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    };
    debug(this.cluster.NAME, 'return discover commands received response', response);
    return response;
  }

  /**
   * This method handles an incoming `discoverCommandsGenerated` command send from the remote node
   * to the controller. It assembles the cluster's commands which are implemented on this bound
   * cluster (i.e. commands it can send).
   * @param {object} [options]
   * @param {number} [options.startValue=0]
   * @param {number} [options.maxResults=250]
   * @returns {Promise<{commandIds: number[], lastResponse: boolean}>}
   */
  async discoverCommandsGenerated({ startValue = 0, maxResults = 250 } = {}) {
    debug(this.cluster.NAME, 'received discover commands generated command');

    const cmds = [].concat(...Object.values(this.cluster.commandsById))
      .filter(c => !c.global && c.response && this[c.name])
      .map(c => c.response.id)
      .sort()
      .filter(cId => cId >= startValue);

    const result = cmds.slice(0, maxResults);
    const response = {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    };
    debug(this.cluster.NAME, 'return discover commands generated response', response);
    return response;
  }

  /**
   * @typedef {object} DiscoverAttributesResponse
   * @property {boolean} lastResponse
   * @property {DiscoverAttributeResponse[]} attributes
   */

  /**
   * @typedef {object} DiscoverAttributeResponse
   * @property {number} id - Attribute id
   * @property {number} dataTypeId - ZCLDataType id
   */

  /**
   * This method handles an incoming `discoverAttributes` command send from the remote node
   * to the controller. It assembles the cluster's attributes which are implemented on this bound
   * cluster and returns a response.
   * @param {object} [options]
   * @param {number} [options.startValue=0]
   * @param {number} [options.maxResults=250]
   * @returns {Promise<DiscoverAttributesResponse>}
   */
  async discoverAttributes({ startValue = 0, maxResults = 250 } = {}) {
    const attributes = Object.values(this.cluster.attributesById)
      .filter(attr => attr.type instanceof ZCLDataType && getPropertyDescriptor(this, attr.name));

    const response = {
      lastResponse: true,
      attributes: attributes.map(a => ({ id: a.id, dataTypeId: a.type.id })),
    };
    debug(this.cluster.NAME, 'received discover attributes command, response:', response);
    return response;
  }

  /**
   * @typedef {object} DiscoverAttributesExtendedResponse
   * @property {boolean} lastResponse
   * @property {DiscoverAttributeExtendedResponse[]} attributes
   */

  /**
   * @typedef {object} DiscoverAttributeExtendedResponse
   * @property {number} id - Attribute id
   * @property {number} dataTypeId - ZCLDataType id
   * @property {string[]} acl - Can hold values "readable"/"writable"/"reportable"
   */

  /**
   * This method handles an incoming `discoverAttributesExtended` command send from the remote node
   * to the controller. It assembles the cluster's attributes which are implemented on this bound
   * cluster and returns a response.
   * @param {object} [options]
   * @param {number} [options.startValue=0]
   * @param {number} [options.maxResults=250]
   * @returns {Promise<DiscoverAttributesExtendedResponse>}
   */
  async discoverAttributesExtended({ startValue = 0, maxResults = 250 } = {}) {
    const attributes = Object.values(this.cluster.attributesById)
      .filter(attr => attr.type instanceof ZCLDataType && getPropertyDescriptor(this, attr.name));

    let { REPORTABLE_ATTRIBUTES } = this;
    if (!Array.isArray(REPORTABLE_ATTRIBUTES)) REPORTABLE_ATTRIBUTES = [];

    const response = {
      lastResponse: true,
      attributes: attributes.map(a => {
        const acl = [];
        const prop = getPropertyDescriptor(this, a.name);

        // Report ACL based on available getters and setters
        if (prop.get) acl.push('readable');
        if (prop.set) acl.push('writable');

        if (REPORTABLE_ATTRIBUTES.includes(a.name)) acl.push('reportable');

        // property is a local value based property, allow it to be read
        if (!acl.length) acl.push('readable');

        return {
          id: a.id,
          dataTypeId: a.type.id,
          acl,
        };
      }),
    };
    debug(this.cluster.NAME, 'received discover attributes extended command, response:', response);
    return response;
  }

  /**
   * Handles an incoming frame on this bound cluster, it will invoke the respective command if
   * available.
   * @param {object} frame
   * @param {object} meta
   * @param {Buffer} rawFrame
   * @returns {Promise}
   * @private
   */
  async handleFrame(frame, meta, rawFrame) {
    const commands = this.cluster.commandsById[frame.cmdId] || [];

    const command = commands
      .filter(cmd => frame.frameControl.clusterSpecific === !cmd.global
        && (cmd.global || frame.frameControl.manufacturerSpecific === !!cmd.manufacturerId)
        && (cmd.global || !frame.frameControl.manufacturerSpecific
          || frame.manufacturerId === cmd.manufacturerId))
      .sort((a, b) => (a.isResponse ? 0 : 1) - (b.isResponse ? 0 : 1))
      .pop();

    if (command) {
      const args = command.args
        ? command.args.fromBuffer(frame.data, 0)
        : undefined;

      if (this[command.name]) {
        debug('received command', command.name, args);
        const result = await this[command.name](args, meta, frame, rawFrame);
        if (command.response && command.response.args) {
          // eslint-disable-next-line new-cap
          return [command.response.id, new command.response.args(result)];
        }
        // eslint-disable-next-line consistent-return
        return;
      }
    }

    throw new Error(`unknown_command_received:${(command || {}).name || frame.cmdId}`);
  }

  // TODO: implement when needed
  async writeAttributesAtomic(args) {
    throw new Error('not_implemented');
    // TODO: actually make atomic, capture current state of attrs, exec and restore upon failure
    // return writeAttributesAtomic(args);
  }

  // TODO: implement when needed
  async writeAttributesNoResponse(args) {
    throw new Error('not_implemented');
    // TODO: actually disable response
    // return writeAttributesAtomic(args);
  }

  // TODO: implement when needed
  async configureReporting(
    // {
    //   reports = {
    //     direction,
    //     attributeId,
    //     attributeDataType,
    //     minInterval,
    //     maxInterval,
    //     minChange,
    //   },
    // }
  ) {
    throw new Error('not_implemented');
    // return {
    //   reports,
    //   status,
    //   direction,
    //   attributeId,
    // };
  }

  // TODO: implement when needed
  async readReportingConfiguration({
    attributes = {
      // direction,
      // attributeId,
    },
  }) {
    throw new Error('not_implemented');
    // return reports;
  }

  // TODO: implement when needed
  async readAttributesStructured({
    attributes = [{
      // attributeId,
      // indexPath,
    }],
  }) {
    throw new Error('not_implemented');
    // return { attributes };
  }

  // TODO: implement when needed
  async writeAttributesStructured({
    attributes = [{
      // attributeId,
      // indexPath,
      // dataTypeId,
      // value,
    }],
  }) {
    throw new Error('not_implemented');
    // return { attributes };
  }

}

module.exports = BoundCluster;
