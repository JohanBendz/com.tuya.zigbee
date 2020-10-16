'use strict';

const EventEmitter = require('events');

let { debug } = require('./util');
const { getLogId } = require('./util');

debug = debug.extend('cluster');

const {
  ZCLStandardHeader, ZCLMfgSpecificHeader, ZCLAttributeDataRecord, ZCLConfigureReportingRecords,
} = require('./zclFrames');
const { ZCLStruct, ZCLDataTypes } = require('./zclTypes');

const GLOBAL_ATTRIBUTES = {
  clusterRevision: { id: 0xfffd, type: ZCLDataTypes.uint16 },
  attributeReportingStatus: {
    id: 0xfffe,
    type: ZCLDataTypes.enum8({
      PENDING: 0,
      COMPLETE: 1,
    }),
  },
};

const GLOBAL_COMMANDS = {
  readAttributes: {
    id: 0x00,
    args: {
      attributes: ZCLDataTypes.Array0(ZCLDataTypes.uint16),
    },
    response: {
      id: 0x01,
      args: {
        attributes: ZCLDataTypes.buffer,
      },
    },
    global: true,
  },

  writeAttributes: {
    id: 0x02,
    args: {
      attributes: ZCLDataTypes.buffer,
    },
    response: {
      id: 0x04,
      args: {
        attributes: ZCLDataTypes.Array0(ZCLStruct('AttributeResponse', {
          status: ZCLDataTypes.enum8Status,
          id: ZCLDataTypes.uint16,
        })),
      },
    },
    global: true,
  },

  writeAttributesAtomic: {
    id: 0x03,
    args: {
      attributes: ZCLDataTypes.buffer,
    },
    response: {
      id: 0x04,
      args: {
        attributes: ZCLDataTypes.Array0(ZCLStruct('AttributeResponse', {
          status: ZCLDataTypes.enum8Status,
          id: ZCLDataTypes.uint16,
        })),
      },
    },
    global: true,
  },

  writeAttributesNoResponse: {
    id: 0x05,
    args: {
      attributes: ZCLDataTypes.buffer,
    },
    global: true,
  },

  configureReporting: {
    id: 0x06,
    args: {
      reports: ZCLConfigureReportingRecords(),
    },
    response: {
      id: 0x07,
      args: {
        reports: ZCLDataTypes.Array0(ZCLStruct('ConfigureReportingResponse', {
          status: ZCLDataTypes.enum8Status,
          direction: ZCLDataTypes.enum8({
            reported: 0,
            received: 1,
          }),
          attributeId: ZCLDataTypes.uint16,
        })),
      },
    },
    global: true,
  },

  readReportingConfiguration: {
    id: 0x08,
    args: {
      attributes: ZCLDataTypes.Array0(ZCLStruct('ReadReportingConfiguration', {
        direction: ZCLDataTypes.enum8({
          reported: 0,
          received: 1,
        }),
        attributeId: ZCLDataTypes.uint16,
      })),
    },
    response: {
      id: 0x09,
      args: {
        reports: ZCLConfigureReportingRecords({ withStatus: true }),
      },
    },
    global: true,
  },

  reportAttributes: {
    id: 0x0A,
    args: {
      attributes: ZCLDataTypes.buffer,
    },
    global: true,
  },

  defaultResponse: {
    id: 0x0B,
    args: {
      cmdId: ZCLDataTypes.uint8,
      status: ZCLDataTypes.enum8Status,
    },
    global: true,
  },

  discoverAttributes: {
    id: 0x0C,
    args: {
      startValue: ZCLDataTypes.uint16,
      maxResults: ZCLDataTypes.uint8,
    },
    response: {
      id: 0x0D,
      args: {
        lastResponse: ZCLDataTypes.bool,
        attributes: ZCLDataTypes.Array0(ZCLStruct('DiscoveredAttribute', {
          id: ZCLDataTypes.uint16,
          dataTypeId: ZCLDataTypes.uint8,
        })),
      },
    },
    global: true,
  },

  readAttributesStructured: {
    id: 0x0E,
    args: {
      attributes: ZCLDataTypes.Array0(ZCLStruct('AttributeSelector', {
        attributeId: ZCLDataTypes.uint16,
        indexPath: ZCLDataTypes.Array8(ZCLDataTypes.uint16),
      })),
    },
    response: {
      id: 0x01,
      args: {
        attributes: ZCLDataTypes.buffer,
      },
    },
    global: true,
  },

  writeAttributesStructured: {
    id: 0x0F,
    args: {
      attributes: ZCLDataTypes.Array0(ZCLStruct('AttributeSelector', {
        attributeId: ZCLDataTypes.uint16,
        indexPath: ZCLDataTypes.Array8(ZCLDataTypes.uint16),
        dataTypeId: ZCLDataTypes.uint8,
        value: ZCLDataTypes.buffer,
      })),
    },
    response: {
      id: 0x10,
      args: {
        attributes: ZCLDataTypes.buffer,
      },
    },
    global: true,
  },

  discoverCommandsReceived: {
    id: 0x11,
    args: {
      startValue: ZCLDataTypes.uint8,
      maxResults: ZCLDataTypes.uint8,
    },
    response: {
      id: 0x12,
      args: {
        lastResponse: ZCLDataTypes.bool,
        commandIds: ZCLDataTypes.Array0(ZCLDataTypes.uint8),
      },
    },
    global: true,
  },

  discoverCommandsGenerated: {
    id: 0x13,
    args: {
      startValue: ZCLDataTypes.uint8,
      maxResults: ZCLDataTypes.uint8,
    },
    response: {
      id: 0x14,
      args: {
        lastResponse: ZCLDataTypes.bool,
        commandIds: ZCLDataTypes.Array0(ZCLDataTypes.uint8),
      },
    },
    global: true,
  },

  discoverAttributesExtended: {
    id: 0x15,
    args: {
      startValue: ZCLDataTypes.uint16,
      maxResults: ZCLDataTypes.uint8,
    },
    response: {
      id: 0x16,
      args: {
        lastResponse: ZCLDataTypes.bool,
        attributes: ZCLDataTypes.Array0(ZCLStruct('DiscoveredAttributeExtended', {
          id: ZCLDataTypes.uint16,
          dataTypeId: ZCLDataTypes.uint8,
          acl: ZCLDataTypes.map8('readable', 'writable', 'reportable'),
        })),
      },
    },
    global: true,
  },
};

/**
 * The base cluster class every other cluster implementation must extend from.
 */
class Cluster extends EventEmitter {

  /**
   * Create a new cluster instance.
   * @param {Endpoint} endpoint - A node {@link Endpoint} instance
   */
  constructor(endpoint) {
    super();

    this._endpoint = endpoint;
    this._nextTrxSeqNr = 0;
    this.name = this.constructor.NAME;
    this._trxHandlers = {};
  }

  /**
   * Stub for ID property.
   * @constructor
   * @abstract
   * @private
   */
  static get ID() {
    throw new Error('cluster_id_unspecified');
  }

  /**
   * Stub for NAME property.
   * @constructor
   * @abstract
   * @private
   */
  static get NAME() {
    return new Error('cluster_name_unspecified');
  }

  /**
   * Stub for ATTRIBUTES property.
   * @constructor
   * @abstract
   * @private
   */
  static get ATTRIBUTES() {
    return {};
  }

  /**
   * Stub for COMMANDS property.
   * @constructor
   * @abstract
   * @private
   */
  static get COMMANDS() {
    return this.prototype === Cluster.prototype ? GLOBAL_COMMANDS : {};
  }

  /**
   * Returns log id string for this cluster.
   * @returns {string}
   */
  get logId() {
    let endpointId;
    if (this._endpoint && typeof this._endpoint._endpointId === 'number') {
      endpointId = this._endpoint._endpointId;
    }
    return getLogId(endpointId, this.constructor.NAME, this.constructor.ID);
  }

  /**
   * Command which requests the remote cluster to report its generated commands. Generated
   * commands are commands which may be sent by the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard commands
   *  in a ZigBee cluster or 1 to discover manufacturer-specific commands in either a standard or
   *  a manufacturer-specific cluster. A manufacturer ID in this field of 0xffff (wildcard) will
   *  discover any manufacture- specific
   *  commands.
   *
   * @param {number} [startValue=0]
   * @param {number} [maxResults=250]
   * @returns {Promise<number[]>}
   */
  async discoverCommandsGenerated({ startValue = 0, maxResults = 250 } = {}) {
    const { commandIds } = await super.discoverCommandsGenerated({
      startValue,
      maxResults,
    });

    const res = commandIds.map(cId => ((this.constructor.commandsById[cId] || [])
      .filter(c => !c.global)
      .sort((a, b) => (a.isResponse ? 1 : 0) - (b.isResponse ? 1 : 0)) // TODO
      .pop() || {})
      .name || cId);

    debug(this.logId, 'discoverCommandsGenerated', res);
    return res;
  }

  /**
   * Command which requests the remote cluster to report its received commands. Received
   * commands are commands which may be received by the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard commands
   *  in a ZigBee cluster or 1 to discover manufacturer-specific commands in either a standard or
   *  a manufacturer-specific cluster. A manufacturer ID in this field of 0xffff (wildcard) will
   *  discover any manufacture- specific commands.
   *
   * @param {number} [startValue=0]
   * @param {number} [maxResults=250]
   * @returns {Promise<number[]>}
   */
  async discoverCommandsReceived({ startValue = 0, maxResults = 255 } = {}) {
    const { commandIds } = await super.discoverCommandsReceived({
      startValue,
      maxResults,
    });

    const res = commandIds.map(cId => ((this.constructor.commandsById[cId] || [])
      .filter(c => !c.global)
      .sort((a, b) => (a.isResponse ? 0 : 1) - (b.isResponse ? 0 : 1)) // TODO
      .pop() || {})
      .name || cId);

    debug(this.logId, 'discoverCommandsReceived', res);
    return res;
  }

  /**
   * Command which reads a given set of attributes from the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {string[]} attributeNames
   * @returns {Promise<{}>} - Object with attribute values (e.g. `{ onOff: true }`)
   */
  async readAttributes(...attributeNames) {
    if (!attributeNames.length) {
      attributeNames = Object.keys(this.constructor.attributes);
    }
    const mismatch = attributeNames.find(n => !this.constructor.attributes[n]);
    if (mismatch) {
      throw new TypeError(`${mismatch} is not a valid attribute of ${this.name}`);
    }

    const idToName = {};
    const attrIds = new Set(attributeNames.map(a => {
      idToName[this.constructor.attributes[a].id] = a;
      return this.constructor.attributes[a].id;
    }));

    const resultObj = {};
    while (attrIds.size) {
      // Check if command should get manufacturerSpecific flag
      const manufacturerId = this._checkForManufacturerSpecificAttributes(Array.from(attrIds));
      debug(this.logId, 'read attributes', [...attrIds], manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

      const { attributes } = await super.readAttributes({
        attributes: [...attrIds],
        manufacturerId,
      });

      debug(this.logId, 'read attributes result', { attributes });
      const result = this.constructor.attributeArrayStatusDataType.fromBuffer(attributes, 0);
      if (!result.length) break;

      result.forEach(a => {
        attrIds.delete(a.id);
        if (a.status === 'SUCCESS') {
          resultObj[idToName[a.id]] = a.value;
        }
      });
    }

    return resultObj;
  }

  /**
   * Command which writes a given set of attribute key-value pairs to the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {object} attributes - Object with attribute names as keys and their values (e.g. `{
   * onOff: true, fakeAttributeName: 10 }`.
   * @returns {Promise<*|{attributes: *}>}
   */
  async writeAttributes(attributes = {}) {
    const arr = Object.keys(attributes).map(n => {
      const attr = this.constructor.attributes[n];
      if (!attr) {
        throw new TypeError(`${n} is not a valid attribute of ${this.name}`);
      }
      return {
        id: attr.id,
        value: attributes[n],
      };
    });

    // Check if command should get manufacturerSpecific flag
    const manufacturerId = this._checkForManufacturerSpecificAttributes(
      Object.keys(attributes).map(n => this.constructor.attributes[n].id),
    );

    let data = Buffer.alloc(1024);
    data = data.slice(0, this.constructor.attributeArrayDataType.toBuffer(data, arr, 0));

    debug(this.logId, 'write attributes', attributes, manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

    return super.writeAttributes({ attributes: data, manufacturerId });
  }

  /**
   * Command which configures attribute reporting for the given `attributes` on the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {object} attributes - Attribute reporting configuration (e.g. `{ onOff: {
   * minInterval: 0, maxInterval: 300, minChange: 1 } }`)
   * @returns {Promise<void>}
   */
  async configureReporting(attributes = {}) {
    const req = [];
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const attributeName in attributes) {
      const attr = this.constructor.attributes[attributeName];
      if (!attr) throw new TypeError(`${attributeName} Does not exist (${this.constructor.name})`);

      const config = {
        direction: 'reported',
        attributeId: attr.id,
        attributeDataType: attr.type.id,
        minInterval: 0,
        maxInterval: 0xffff,
        minChange: 1,
        ...attributes[attributeName],
      };

      // Set minChange to zero when this condition is true (see ZCL spec 2.5.7.1.7.)
      if (config.maxInterval === 0x0000 && config.minInterval === 0xffff) {
        config.minChange = 0;
      }

      // Strip the `minChange` attribute for non-analog attributes (see ZCL spec 2.5.7.1.7.)
      if (!attr.type.isAnalog) {
        delete config.minChange;
      }

      req.push(config);
    }
    if (req.length) {
      // Check if command should get manufacturerSpecific flag
      const manufacturerId = this._checkForManufacturerSpecificAttributes(
        Object.keys(attributes).map(n => this.constructor.attributes[n].id),
      );

      debug(this.logId, 'configure reporting', req, manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

      const { reports } = await super.configureReporting({ reports: req, manufacturerId });

      debug(this.logId, 'configured reporting', reports);
      for (const result of reports) {
        if (result.status !== 'SUCCESS') {
          throw new Error(result.status);
        }
      }
    }
  }

  /**
   * @typedef {object} ReadReportingConfiguration
   * @property {ZCLDataTypes.enum8Status} status
   * @property {'reported'|'received'} direction
   * @property {number} attributeId
   * @property {ZCLDataType.id} [attributeDataType]
   * @property {number} [minInterval]
   * @property {number} [maxInterval]
   * @property {number} [minChange]
   * @property {number} [timeoutPeriod]
   */

  /**
   * Command which retrieves the reporting configurations for the given `attributes` from the
   * remote cluster. Currently this only takes the 'reported' into account, this represents the
   * reports the remote cluster would sent out, instead of receive (which is likely the most
   * interesting).
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {Array} attributes - Array with number/strings (either attribute id, or attribute name).
   * @returns {Promise<ReadReportingConfiguration[]>} - Returns array with
   * ReadReportingConfiguration objects per attribute.
   */
  async readReportingConfiguration(attributes = []) {
    const req = [];

    // Loop all the provided attributes
    for (const attribute of attributes) {
      let attrId;
      if (typeof attribute === 'number') {
        attrId = attribute;
      } else if (typeof attribute === 'string' && this.constructor.attributes[attribute]) {
        attrId = this.constructor.attributes[attribute].id;
      }

      // Check for valid attribute id
      if (typeof attrId !== 'number') {
        throw new Error(`Could not find attrId ${attrId} on cluster ${this.constructor.NAME}`);
      }

      // Push configuration
      req.push({
        direction: 'reported', // We are only interested in the reported direction, this
        // property acts a filter and will only retrieve the reporting configuration for
        // attributes which are being reported by the remote cluster (as opposed to being
        // 'received' by the remote cluster)
        attributeId: attrId,
      });
    }

    // Check if command should get manufacturerSpecific flag
    const manufacturerId = this._checkForManufacturerSpecificAttributes(
      attributes
        .map(attributeNameOrId => {
          if (typeof attributeNameOrId === 'number') return attributeNameOrId;
          return this.constructor.attributes[attributeNameOrId].id;
        }),
    );

    debug(this.logId, 'read reporting configuration', req, manufacturerId ? `manufacturer specific id ${manufacturerId}` : '');

    // If a request has been constructed execute it
    if (req.length) {
      // Perform request, it returns a buffer that needs to be parsed
      const { reports } = await super.readReportingConfiguration({
        attributes: req,
        manufacturerId,
      });
      debug(this.logId, 'read reporting configuration result', reports);

      // Return the parsed reports
      return reports;
    }

    // Return empty array
    return [];
  }

  /**
   * Command which discovers the implemented attributes on the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer specific sub-field SHALL be set to 0 to discover standard attributes
   *  in a ZigBee cluster or 1 to discover manufacturer specific attributes in either a standard
   *  or a manufacturer specific cluster.
   *
   * @returns {Promise<Array>} - Array with string or number values (depending on if the
   * attribute
   * is implemented in zigbee-clusters or not).
   */
  async discoverAttributes() {
    const { attributes } = await super.discoverAttributes({
      startValue: 0,
      maxResults: 255,
    });

    const result = [];
    for (const attr of attributes) {
      // Push the name if attribute is implemented in zigbee-clusters otherwise push attribute id
      result.push(this.constructor.attributesById[attr.id]
        ? this.constructor.attributesById[attr.id].name
        : attr.id);
    }
    debug(this.logId, 'discover attributes', result);
    return result;
  }

  /**
   * Command which discovers the implemented attributes on the remote cluster, the difference with
   * `discoverAttributes` is that this command also reports the access control field of the
   * attribute (whether it is readable/writable/reportable).
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard attributes
   *  in a ZigBee cluster or 1 to discover manufacturer-specific attributes in either a standard
   *  or a manufacturer- specific cluster. A manufacturer ID in this field of 0xffff (wildcard)
   *  will discover any manufacture-specific attributes.
   *
   * @returns {Promise<Array>} - Returns an array with objects with attribute names as keys and
   * following object as values: `{name: string, id: number, acl: { readable: boolean, writable:
   * boolean, reportable: boolean } }`. Note that `name` is optional based on whether the
   * attribute is implemented in zigbee-clusters.
   */
  async discoverAttributesExtended() {
    const { attributes } = await super.discoverAttributesExtended({
      startValue: 0,
      maxResults: 250,
    });

    const result = [];
    for (const attr of attributes) {
      const attribute = this.constructor.attributesById[attr.id];
      const discoveredAttribute = {
        acl: attr.acl,
        id: attr.id,
      };

      // If the attribute is implemented in zigbee-clusters add name
      if (attribute) {
        discoveredAttribute.name = attribute.name;
      }
      result.push(discoveredAttribute);
    }
    debug(this.logId, 'discover attributes extended', result);
    return result;
  }

  /**
   * Handles an incoming frame on this specific cluster instance. It will be matched against the
   * known commands, only known commands are handled. If the command is known AND it is not a
   * direct response on a previously send frame AND a handler for this command is registered on
   * this cluster instance, this will be called.
   * @param frame
   * @param meta
   * @param rawFrame
   * @returns {Promise}
   * @private
   *
   * @example
   * // This handler will be called when the `toggle` command is received.
   * cluster.onToggle = payload => console.log('received toggle command', payload);
   */
  async handleFrame(frame, meta, rawFrame) {
    const commands = this.constructor.commandsById[frame.cmdId] || [];

    // Determine correct command
    const command = commands.filter(cmd => frame.frameControl.clusterSpecific === !cmd.global
      && (cmd.global || frame.frameControl.manufacturerSpecific === !!cmd.manufacturerId)
      && (cmd.global || !frame.frameControl.manufacturerSpecific
        || frame.manufacturerId === cmd.manufacturerId))
      .sort((a, b) => (a.isResponse ? 1 : 0) - (b.isResponse ? 1 : 0))
      .pop();

    if (command) {
      const handlerName = `on${command.name.charAt(0).toUpperCase()}${command.name.slice(1)}`;

      // Parse the command arguments
      const args = command.args
        ? command.args.fromBuffer(frame.data, 0)
        : undefined;

      debug(this.logId, 'received frame', command.name, args);

      // Invoke the right handler
      const handler = this._trxHandlers[frame.trxSequenceNumber] || this[handlerName];
      delete this._trxHandlers[frame.trxSequenceNumber];
      if (handler) {
        const response = await handler.call(this, args, meta, frame, rawFrame);
        if (command.response && command.response.args) {
          // eslint-disable-next-line new-cap
          return [command.response.id, new command.response.args(response)];
        }
        // eslint-disable-next-line consistent-return
        return;
      }
    }

    debug(this.logId, 'unknown command received:', frame, meta);

    throw new Error('unknown_command_received');
  }

  /**
   * Handles sending a frame to the remote cluster.
   * @param {object} data
   * @returns {Promise<*>}
   * @private
   */
  async sendFrame(data) {
    data = {
      frameControl: ['clusterSpecific'],
      data: Buffer.alloc(0),
      ...data,
    };

    if (!data.frameControl.includes('manufacturerSpecific')) {
      data = new ZCLStandardHeader(data);
    } else {
      data = new ZCLMfgSpecificHeader(data);
    }
    debug(this.logId, 'send frame', data);
    return this._endpoint.sendFrame(this.constructor.ID, data.toBuffer());
  }

  /**
   * START MESSAGE HANDLERS:
   */

  /**
   * Message handler which is called from `handleFrame` when the incoming frame is a attribute
   * report. This handler will emit the received attribute properties.
   * @param {object} attributes - The received report object.
   * @returns {Promise<void>}
   * @private
   */
  async onReportAttributes({ attributes } = {}) {
    attributes = this.constructor.attributeArrayDataType.fromBuffer(attributes, 0);
    attributes.forEach(attr => this.emit(`attr.${attr.name}`, attr.value));
  }

  /**
   * Message handler which is called from `handleFrame` when the incoming frame is a discover
   * commands generated response. Generated commands are commands which may be sent by this cluster.
   * @param {number} [startValue=0]
   * @param {number} [maxResults=250]
   * @returns {Promise<{commandIds: number[], lastResponse: boolean}>}
   * @private
   */
  async onDiscoverCommandsGenerated({ startValue = 0, maxResults = 250 } = {}) {
    const cmds = [].concat(...Object.values(this.constructor.commandsById))
      .filter(c => !c.global && !c.isResponse && this[c.name])
      .map(c => c.id)
      .sort()
      .filter(cId => cId >= startValue);

    const result = cmds.slice(0, maxResults);
    debug(this.logId, 'onDiscoverCommandsGenerated', {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    });
    return {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    };
  }

  /**
   * Message handler which is called from `handleFrame` when the incoming frame is a discover
   * commands received response. Received commands are commands which may be received by
   * this cluster.
   * @param {number} [startValue=0]
   * @param {number} [maxResults=250]
   * @returns {Promise<{commandIds: number[], lastResponse: boolean}>}
   * @private
   */
  async onDiscoverCommandsReceived({ startValue = 0, maxResults = 250 } = {}) {
    const cmds = [].concat(...Object.values(this.constructor.commandsById))
      .filter(c => !c.global && c.response
        && (this[c.name] || this[`on${c.name.charAt(0).toUpperCase()}${c.name.slice(1)}`]))
      .map(c => c.response.id)
      .sort()
      .filter(cId => cId >= startValue);

    const result = cmds.slice(0, maxResults);
    debug(this.logId, 'onDiscoverCommandsReceived', {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    });
    return {
      lastResponse: result.length === cmds.length,
      commandIds: result,
    };
  }

  // TODO: implement if needed
  // async writeAttributesAtomic(attributes = {}) {
  //   const arr = Object.keys(attributes).map(n => {
  //     const attr = this.constructor.attributes[n];
  //     if (!attr) {
  //       throw new TypeError(`${n} is not a valid attribute of ${this.name}`);
  //     }
  //     return {
  //       id: attr.id,
  //       data: attributes[n],
  //     };
  //   });
  //
  //   let data = Buffer.alloc(1024);
  //   data = data.slice(0, this.constructor.attributeArrayDataType.toBuffer(data, arr, 0));
  //
  //   return super.writeAttributesAtomic({ attributes: data });
  // }

  // TODO: implement if needed
  // async writeAttributesNoResponse(attributes = {}) {
  //   const arr = Object.keys(attributes).map(n => {
  //     const attr = this.constructor.attributes[n];
  //     if (!attr) {
  //       throw new TypeError(`${n} is not a valid attribute of ${this.name}`);
  //     }
  //     return {
  //       id: attr.id,
  //       data: attributes[n],
  //     };
  //   });
  //
  //   let data = Buffer.alloc(1024);
  //   data = data.slice(0, this.constructor.attributeArrayDataType.toBuffer(data, arr, 0));
  //
  //   return super.writeAttributesNoResponse({ attributes: data });
  // }

  /**
   * Add a cluster class. This should be called whenever a custom Cluster implementation has
   * been created before it will be available on the node.
   * @param {Cluster} clusterClass - The class, not an instance.
   *
   * @example
   *
   * const { Cluster } = require('zigbee-clusters');
   *
   * const MyCluster extends Cluster {
   *  // Implement custom cluster logic here
   *  get NAME() {
   *    return 'myClusterName';
   *  }
   * }
   *
   * Cluster.addCluster(MyCluster);
   *
   * // Now it will be available
   * zclNode.endpoints[1].clusters['myClusterName'].doSomething();
   */
  static addCluster(clusterClass) {
    this._addPrototypeMethods(clusterClass);
    this.clusters[clusterClass.ID] = clusterClass;
    this.clusters[clusterClass.NAME] = clusterClass;
  }

  /**
   * Remove cluster by ID or NAME.
   * @param {string|number} clusterIdOrName
   */
  static removeCluster(clusterIdOrName) {
    if (this.clusters[clusterIdOrName]) {
      // eslint-disable-next-line no-shadow
      const Cluster = this.clusters[clusterIdOrName];
      delete this.clusters[Cluster.NAME];
      delete this.clusters[Cluster.ID];
    }
  }

  /**
   * Get a cluster instance by ID or NAME.
   * @param {string|number} clusterIdOrName
   * @returns {Cluster}
   */
  static getCluster(clusterIdOrName) {
    return this.clusters[clusterIdOrName];
  }

  /**
   * Generates next transaction sequence number.
   * @returns {number} - Transaction sequence number.
   * @private
   */
  nextSeqNr() {
    this._nextTrxSeqNr = (this._nextTrxSeqNr + 1) % 256;
    return this._nextTrxSeqNr;
  }

  async _awaitPacket(trxSequenceNumber, timeout = 25000) {
    if (this._trxHandlers[trxSequenceNumber]) {
      throw new TypeError(`already waiting for this trx: ${trxSequenceNumber}`);
    }
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        delete this._trxHandlers[trxSequenceNumber];
        reject(new Error('timeout'));
      }, timeout);
      this._trxHandlers[trxSequenceNumber] = async frame => {
        delete this._trxHandlers[trxSequenceNumber];
        resolve(frame);
        clearTimeout(t);
      };
    });
  }

  // / START STATIC METHODS

  // Adds command proxy stubs to a proto object which is one level higher.
  // this way you can 'override' the commands and still use `super.` to access the default
  // implementation
  static _addPrototypeMethods(clusterClass) {
    const firstProto = Object.getPrototypeOf(clusterClass.prototype);
    const proto = Object.create(firstProto);
    Object.setPrototypeOf(clusterClass.prototype, proto);

    const commands = clusterClass.COMMANDS;

    clusterClass.attributes = {
      ...GLOBAL_ATTRIBUTES,
      ...clusterClass.ATTRIBUTES,
    };

    clusterClass.commands = {
      ...GLOBAL_COMMANDS,
      ...clusterClass.COMMANDS,
    };

    clusterClass.attributesById = Object.entries(clusterClass.attributes).reduce((r, [name, a]) => {
      r[a.id] = { ...a, name };
      return r;
    }, {});
    clusterClass.attributeArrayStatusDataType = ZCLDataTypes.Array0(
      ZCLAttributeDataRecord(true, clusterClass.attributesById),
    );
    clusterClass.attributeArrayDataType = ZCLDataTypes.Array0(
      ZCLAttributeDataRecord(false, clusterClass.attributesById),
    );

    // Ids are not unique
    clusterClass.commandsById = Object.entries(clusterClass.commands).reduce((r, [name, _cmd]) => {
      const cmd = { ..._cmd, name };
      if (cmd.args) {
        cmd.args = ZCLStruct(`${clusterClass.NAME}.${name}`, cmd.args);
        if (_cmd === GLOBAL_COMMANDS.defaultResponse) {
          clusterClass.defaultResponseArgsType = cmd.args;
        }
      }
      if (r[cmd.id]) {
        r[cmd.id].push(cmd);
      } else {
        r[cmd.id] = [cmd];
      }

      if (cmd.response) {
        const res = { ...cmd.response, name: `${name}.response`, isResponse: true };
        cmd.response = res;
        if (typeof res.id !== 'number') {
          res.id = cmd.id;
        }
        if (res.args) {
          res.args = ZCLStruct(`${clusterClass.NAME}.${res.name}`, res.args);
        }
        if (cmd.global) res.global = true;
        if (cmd.manufacturerSpecific) res.manufacturerSpecific = true;
        if (r[res.id]) {
          r[res.id].push(res);
        } else {
          r[res.id] = [res];
        }
      }

      return r;
    }, {});

    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const cmdName in commands) {
      Object.defineProperty(proto, cmdName, {
        value: {
          async [cmdName](args, opts = {}) {
            const cmd = commands[cmdName];
            const payload = {
              cmdId: cmd.id,
              trxSequenceNumber: this.nextSeqNr(),
            };

            if (cmd.global) {
              payload.frameControl = [];

              // Some global commands can also be manufacturerSpecific (e.g. read/write manuf
              // specific attributes), in that case the manuf id needs to be parsed from the
              // args as it is a dynamic property which can not be defined on the command.
              if (args.manufacturerId !== undefined) {
                if (typeof args.manufacturerId === 'number') {
                  payload.frameControl.push('manufacturerSpecific');
                  payload.manufacturerId = args.manufacturerId;
                }
                // Always delete it as it is not part of the command args
                delete args.manufacturerId;
              }
            }

            if (cmd.manufacturerId) {
              payload.frameControl = ['clusterSpecific', 'manufacturerSpecific'];
              payload.manufacturerId = cmd.manufacturerId;
            }

            if (cmd.frameControl) {
              payload.frameControl = cmd.frameControl;
            }

            if (cmd.args) {
              const CommandArgs = ZCLStruct(`${this.name}.${cmdName}`, cmd.args);
              payload.data = new CommandArgs(args);
            }

            if (payload.frameControl && payload.frameControl.includes('disableDefaultResponse')) {
              return this.sendFrame(payload);
            }

            if (opts.waitForResponse === false) {
              return this.sendFrame(payload);
            }

            const [response] = await Promise.all([
              this._awaitPacket(payload.trxSequenceNumber),
              this.sendFrame(payload),
            ]);

            if (response instanceof this.constructor.defaultResponseArgsType) {
              if (response.status !== 'SUCCESS') {
                throw new Error(response.status);
              }
              // eslint-disable-next-line consistent-return
              return;
            }

            return response;
          },
        }[cmdName],
      });
    }
  }

  /**
   * Given an array of attribute ids it checks if all of the attributes are manufacturer
   * specific attributes. If that is the case it will return the manufacturerId so that the
   * command can set the manufacturerSpecific flag.
   * @param {number[]} attributeIds
   * @returns {null|number}
   * @private
   */
  _checkForManufacturerSpecificAttributes(attributeIds) {
    // Convert to set
    const attrIdsSet = new Set(attributeIds);

    // Filter attributeIds for manufacturer specific attributes
    const manufacturerIds = [];
    for (const attribute of Object.values(this.constructor.attributes)) {
      if (attrIdsSet.has(attribute.id) && typeof attribute.manufacturerId === 'number') {
        manufacturerIds.push(attribute.manufacturerId);
      }
    }

    // Do not allow different manufacturer ids in one command
    if (new Set(manufacturerIds).size > 1) {
      throw new Error('Error: detected multiple manufacturer ids, can only read from one at a time');
    }

    // Show warning if a manufacturer specific attribute was found amongst non-manufacturer
    // specific attributes
    if (manufacturerIds.length > 0 && attrIdsSet.size !== manufacturerIds.length) {
      debug(this.logId, 'WARNING expected only manufacturer specific attributes got:', manufacturerIds);
    }

    // Return the manufacturerId that was found in the attributes
    if (attrIdsSet.size === manufacturerIds.length) return manufacturerIds[0];
    return null;
  }

}

Cluster.clusters = {};
Cluster._addPrototypeMethods(Cluster);

module.exports = Cluster;
