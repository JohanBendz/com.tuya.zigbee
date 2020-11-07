'use strict';

// eslint-disable-next-line node/no-unpublished-require
const Homey = require('homey');
const { ZCLNode } = require('zigbee-clusters');

const ZigBeeDriver = require('./ZigBeeDriver');

const {
  __,
  assertClusterSpecification,
  assertCapabilityId,
  assertZCLNode,
  wrapAsyncWithRetry,
  recursiveDeepCopy,
} = require('./util');

const CAPABILITIES_DEBOUNCE = 500; // ms
const CONFIGURED_ATTRIBUTE_REPORTING_STORE_KEY = 'configuredAttributeReporting';

/**
 * Every {@link ClusterCapabilityConfiguration} will be extended from this defaults object to
 * ensure properties have expected defaults.
 * @type {{endpoint: number, set: null, getOpts: {}, get: null, report: null}}
 * @private
 */
const CLUSTER_CAPABILITY_CONFIGURATION_DEFAULTS = {
  get: null,
  getOpts: {},
  set: null,
  report: null,
  endpoint: 1,
};

/**
 * Every {@link AttributeReportingConfiguration} will be extended from this defaults object to
 * ensure properties have expected defaults.
 * @type {{minInterval: number, minChange: number}}
 * @private
 */
const ATTRIBUTE_REPORTING_CONFIGURATION_DEFAULTS = {
  minInterval: 0,
  minChange: 1,
};

/**
 * Store value key used for determining if node is just paired or has been initialized before.
 * @constant
 * @type {string}
 * @private
 */
const FIRST_INIT = 'zb_first_init';

/**
 * End device announce event key.
 * @constant
 * @type {string}
 * @private
 */
const END_DEVICE_ANNOUNCE_EVENT = 'endDeviceAnnounce';

/**
 * @typedef {string} CapabilityId - Homey.Device capability id (e.g. `onoff`)
 */

/**
 * @typedef {object} ClusterSpecification - Object containing the cluster name and id.
 * @property {string} NAME - Cluster name (e.g. 'onOff')
 * @property {number} ID - Cluster id (e.g. 4)
 */

/**
 * @typedef {number} EndpointId - Zigbee {@link Endpoint.ID} (e.g. 1)
 */

/**
 * @extends Homey.Device
 * @example
 * const { ZigBeeDevice } = require('homey-zigbeedriver');
 *
 * class ZigBeeBulb extends ZigBeeDevice {
 *   onNodeInit({ zclNode }) {
 *     await zclNode.endpoints[1].clusters.onOff.toggle();
 *   }
 * }
 */
class ZigBeeDevice extends Homey.Device {

  /**
   * This method can be overridden. It will be called when the {@link ZigBeeDevice} instance is
   * ready and did initialize a {@link ZCLNode}.
   * @param {ZCLNode} zclNode
   * @param {Homey.ZigBeeNode} node
   * @abstract
   *
   * @example
   * const { ZigBeeDevice } = require('homey-zigbeedriver');
   *
   * class ZigBeeBulb extends ZigBeeDevice {
   *   onNodeInit({ zclNode }) {
   *     await zclNode.endpoints[1].clusters.onOff.toggle();
   *   }
   * }
   */
  onNodeInit({ zclNode, node }) {

  }

  /**
   * @deprecated since v1.0.0 - Legacy from homey-meshdriver, use {@link onNodeInit} instead.
   * This method can be overridden. It will be called when the {@link ZigBeeDevice} instance is
   * ready and did initialize a {@link Homey.ZigBeeNode}.
   * @abstract
   */
  onMeshInit() {

  }

  /**
   * This method can be overridden. It will be called when the {@link Homey.ZigBeeNode}
   * instance received a end device announce indication from the node itself. For sleepy devices
   * this means that the node is temporarily `online` to handle some requests. For powered
   * devices this usually means that they have been re-powered. Note: behaviour may differ between
   * devices.
   * @abstract
   */
  onEndDeviceAnnounce() {
    this.log('Received end device announce indication');
  }

  /**
   * This method can be overridden to use different energy objects per Zigbee device `productId`.
   * @abstract
   * @returns {object.<{string}, {object}>}
   *
   * @example
   * class ZigBeeBulb extends ZigBeeDevice {
   *    get energyMap() {
   *      return {
   *        'TRADFRI bulb E14 W op/ch 400lm': {
   *          approximation: {
   *            usageOff: 0,
   *            usageOn: 10
   *          }
   *        },
   *        'TRADFRI bulb E27 RGB 1000lm': {
   *          approximation: {
   *            usageOff: 0,
   *            usageOn: 18
   *          }
   *        }
   *      }
   *    }
   *  }
   */
  get energyMap() {
    return {};
  }

  /**
   * Overrides {@link Homey.Device.getEnergy} to enable zigbee devices to expose a {@link energyMap}
   * object with different energy objects `productId` (as specified in the driver manifest). If
   * the `energyMap` object is available and has an entry for the `productId` of this device
   * this entry will be returned instead of the energy object in the drivers' manifest.
   * @since Homey v3.0.0
   * @returns {object} - Energy object
   */
  getEnergy() {
    const zigbeeProductId = this.getSetting('zb_product_id');
    if (zigbeeProductId && this.energyMap[zigbeeProductId]) {
      return this.energyMap[zigbeeProductId];
    }
    return super.getEnergy();
  }

  /**
   * Triggers a flow.
   * @param {string} id - Flow id
   * @param {object} tokens
   * @param {object} state
   * @returns {Promise<T>}
   */
  async triggerFlow({ id, tokens = {}, state = {} }) {
    if (typeof id !== 'string') throw new TypeError('expected_flow_id_string');
    // Get device trigger card instance
    const deviceTriggerCard = this.homey.flow.getDeviceTriggerCard(id);
    if (!deviceTriggerCard) {
      this.error('Error: failed to get device trigger flow card', { id });
      throw new Error('failed_to_get_device_trigger_card');
    }

    this.debug('trigger flow', { id, tokens, state });

    // Return trigger promise
    return deviceTriggerCard
      .trigger(this, tokens, state)
      .catch(err => {
        this.error('Error: flow trigger device failed', { id, tokens, state }, err);
        throw err;
      });
  }

  /**
   * @typedef {function} SetParserFunction
   *
   * This method is given a `setValue` and will use that to generate an object with the needed
   * command attributes as specified in {@link Cluster.COMMANDS}. This object will be provided
   * to the Cluster command as parameters when executed.
   *
   * @param {any} setValue
   * @returns {Promise<object|null>} - If return value is `null` the command will not be executed.
   */

  /**
   * @typedef {function} ReportParserFunction
   *
   * This method is called when a report is received for the `report` attribute. In this method the
   * `reportValue` can be parsed and mapped to become a valid Homey.Device capability value.
   *
   * @param {any} reportValue
   * @returns {any|null|Promise} - If return value is `null` the Homey.Device capability value
   * will not be changed.
   */

  /**
   * @typedef {object} ClusterCapabilityConfiguration
   *
   * @property {string} [get] - Cluster attribute as specified in {@link Cluster.ATTRIBUTES}. This
   * attribute will be fetched by {@link Cluster.readAttributes} when the capability value needs
   * to be fetched.
   *
   * @property {string} [set] - Cluster command as specified in {@link Cluster.COMMANDS}, this
   * command will be executed when the capability is set.
   * @property {SetParserFunction} [setParser] - Method that will be called before `set` is
   * called, to generate the parameters for the Cluster command execution.
   *
   * @property {string} [report] - Cluster attribute as specified in {@link Cluster.ATTRIBUTES}.
   * When a report is received for this attribute the respective `reportParser` will be called.
   * @property {ReportParserFunction} [reportParser]
   *
   * @property {EndpointId} [endpoint=1] - The {@link ZCLNode}'s endpoint to use for this
   * configuration.
   *
   * @property {object} [getOpts] - Options object specific for `get`.
   * @property {boolean} [getOpts.getOnStart=false] - Fetches the `get` attribute when the
   * {@link ZCLNode} is first initialized and the capability value is unknown (i.e. `null`).
   * Note: this only works for non-sleepy devices.
   * @property {boolean} [getOpts.getOnOnline=false] - Fetches the `get` attribute when the
   * {@link ZCLNode} comes online (i.e. Homey received an end device announce indication,
   * directly after receiving this a sleepy node should be able to respond to any request).
   * @property {number|string} [getOpts.pollInterval] - Number: interval (in ms) to poll `get`.
   * String: the Homey.Device's setting key which represents a user configurable poll interval
   * value.
   */

  /**
   * Map a Zigbee cluster to a Homey.Device capability. Using the provided cluster configuration
   * a mapping will be made between the device's capability and the Zigbee cluster.
   * @param {CapabilityId} capabilityId - Homey.Device capability id (e.g. `onoff`)
   * @param {ClusterSpecification} cluster - Cluster specification (id and name)
   * @param {ClusterCapabilityConfiguration} [clusterCapabilityConfiguration] - User provided
   * ClusterCapabilityMapConfiguration, these will override and extend the system cluster
   * capability map configuration if available (e.g. ./system/capabilities/onoff).
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * this.registerCapability('onoff', CLUSTER.ON_OFF, {
   *  // This is often just a string, but can be a function as well
   *  set: value => (value ? 'setOn' : 'setOff'),
   *    function setParser(setValue) {
   *      return setValue ? 'setOn' : 'setOff'; // This could also be an object for more complex
   *      // commands
   *    },
   *    get: 'onOff'
   *    report: 'onOff'
   *    function reportParser(report) {
   *      if (report && report.onOff === true) return true;
   *      return false;
   *    },
   *    reportOpts: {
   *      configureAttributeReporting: {
   *        minInterval: 3600, // Minimally once every hour
   *        maxInterval: 60000, // Maximally once every ~16 hours
   *        minChange: 1,
   *      }
   *    },
   *    endpoint: 1, // Default is 1
   *    getOpts: {
   *      getOnStart: true,
   *      getOnOnline: true,
   *      pollInterval: 30000, // in ms
   *    }
   * })
   */
  registerCapability(capabilityId, cluster, clusterCapabilityConfiguration) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    this.debug(`register capability ${capabilityId} with cluster ${cluster.NAME}`);

    // Merge system and user clusterCapabilityConfiguration
    this._mergeSystemAndUserClusterCapabilityConfigurations(
      capabilityId, cluster, clusterCapabilityConfiguration,
    );

    this.debug(`registered capability ${capabilityId} with cluster ${cluster.NAME}, configuration:`, this._getClusterCapabilityConfiguration(capabilityId, cluster));

    // Register get/set/report
    this._registerCapabilitySet(capabilityId, cluster);

    // Register reporting before getting
    this._registerCapabilityReport(capabilityId, cluster);
    this._registerCapabilityGet(capabilityId, cluster);
  }

  /**
   * @typedef {object} MultipleCapabilitiesConfiguration
   * @property {CapabilityId} capabilityId
   * @property {ClusterSpecification} cluster
   * @property {ClusterCapabilityConfiguration} userOpts
   */

  /**
   * Register multiple Homey.Device capabilities with a {@link ClusterCapabilityConfiguration}.
   * When a capability is changed (or multiple in quick succession), the event will be debounced
   * with the other capabilities in the multipleCapabilitiesConfiguration array.
   * @param {MultipleCapabilitiesConfiguration[]} multipleCapabilitiesConfiguration -
   * Configuration options for multiple capability cluster mappings.
   * @param {function} multipleCapabilitiesListener - Called after debounce of
   * {@link CAPABILITIES_DEBOUNCE}. As fallback, if this function returns a falsy value or an Error
   * each changed capability will be processed individually instead of together.
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * this.registerMultipleCapabilities([
   *  {
   *    // This one will extend the system capability and override the `setParser`
   *    capabilityId: 'onoff',
   *    cluster: CLUSTER.ON_OFF,
   *    userOpts: {
   *      function setParser(setValue) {
   *        // do something different here
   *      }
   *    }
   *  },
   *  {
   *    // This one will extend the system capability
   *    capabilityId: 'dim',
   *    cluster: CLUSTER.LEVEL_CONTROL,
   *  }
   * ], event => {
   *    // Debounced event when one or more capabilities have changed
   * })
   */
  registerMultipleCapabilities(
    multipleCapabilitiesConfiguration = [], multipleCapabilitiesListener,
  ) {
    this.debug(`register multiple capabilities [${multipleCapabilitiesConfiguration.map(x => x.capabilityId || x.capability).join(', ')}]`);

    // Loop all provided capability configurations
    multipleCapabilitiesConfiguration.forEach(capabilityConfiguration => {
      // TODO: `capability` and `opts` are legacy properties, remove with next major update
      const capabilityId = capabilityConfiguration.capabilityId
        || capabilityConfiguration.capability;
      const { cluster } = capabilityConfiguration;

      assertClusterSpecification(cluster);
      assertCapabilityId(capabilityId, this.hasCapability.bind(this));

      const userClusterCapabilityConfiguration = capabilityConfiguration.userOpts
        || capabilityConfiguration.opts || {};

      // Override default system opts with user opts
      this._mergeSystemAndUserClusterCapabilityConfigurations(
        capabilityId, cluster, userClusterCapabilityConfiguration,
      );

      this.debug(`register multiple capabilities → registered ${capabilityId}, with configuration:`, this._getClusterCapabilityConfiguration(capabilityId, cluster));

      // Register capability getter
      this._registerCapabilityGet(capabilityId, cluster);
    });

    // Register multiple capabilities with a debounce
    this.registerMultipleCapabilityListener(
      // TODO: `capability` is legacy property, remove with next major update
      multipleCapabilitiesConfiguration.map(x => x.capabilityId || x.capability),
      async (valueObj, optsObj) => {
        this.debug(`multiple capabilities listener [${multipleCapabilitiesConfiguration.map(x => x.capabilityId || x.capability).join(', ')}]`, valueObj, optsObj);

        // Call the provided `multipleCapabilitiesListener` method to let the device handle the
        // multiple capability changes, this often returns a promise, do not await but return it
        // instead
        const result = multipleCapabilitiesListener(valueObj, optsObj);

        // If it did not handle it for some reason, we will process each capability value one by one
        if (!result || result instanceof Error) {
          this.debug(`multiple capabilities listener [${multipleCapabilitiesConfiguration.map(x => x.capabilityId || x.capability).join(', ')}] → fallback`);

          // Loop all changed capabilities
          const setClusterCapabilityValuePromises = [];
          for (const capabilityId of Object.keys(valueObj)) {
            // Find capability object from configuration
            const capabilityObj = multipleCapabilitiesConfiguration
              .find(x => x.capabilityId === capabilityId || x.capability === capabilityId);

            const value = valueObj[capabilityId];
            const opts = optsObj[capabilityId];

            // Try to handle executing the capability change event
            setClusterCapabilityValuePromises.push(this.setClusterCapabilityValue(
              capabilityId,
              capabilityObj.cluster,
              value,
              opts,
            ));
          }
          // Return all set cluster capability value promises
          return Promise.all(setClusterCapabilityValuePromises);
        }

        // Return result (promise)
        return result;
      }, CAPABILITIES_DEBOUNCE,
    );
  }

  /**
   * Method that searches for the first occurrence of a given cluster in a device's endpoints and
   * returns the endpoint id. Note: this method only finds clusters that act as `inputCluster`
   * on the node, `outputClusters` are not discoverable with this method.
   * @param {ClusterSpecification} cluster
   * @returns {EndpointId|null} endpointId - Returns `null` if cluster could not be found on any
   * endpoint.
   */
  getClusterEndpoint(cluster) {
    assertClusterSpecification(cluster);
    assertZCLNode(this.zclNode);

    // Loop all endpoints for first occurrence of cluster
    // eslint-disable-next-line no-restricted-syntax
    for (const [endpointId, endpoint] of Object.entries(this.zclNode.endpoints)) {
      if (endpoint.clusters && endpoint.clusters[cluster.NAME]) {
        return Number(endpointId);
      }
    }

    this.debug(`Error: could not find cluster ${cluster.NAME} on any of the node's endpoints`);

    // Not found, probably something wrong, return default
    return null;
  }

  /**
   * @deprecated since v1.0.0 - Use a {@link BoundCluster} instead (see example below).
   * @example
   * class CustomBoundCluster extends BoundCluster {
   *  function setOn() {
   *    // This method will be called when the `setOn` command is received
   *  }
   * }
   * zclNode.endpoints[1].clusters.bind('onOff', new CustomBoundCluster());
   */
  registerReportListener() {
    throw new Error('You are using a deprecated function, please refactor'
      + ' registerReportListener to a `BoundCluster` implementation (see example in'
      + ' documentation)');
  }

  /**
   * @deprecated since v1.0.0 - Use {@link configureAttributeReporting} instead.
   */
  async registerAttrReportListener() {
    throw new Error('You are using a deprecated function, please refactor'
      + ' registerAttrReportListener to configureAttributeReporting');
  }

  /**
   * @typedef {object} AttributeReportingConfiguration
   * @property {ClusterSpecification} cluster
   * @property {string} attributeName - The name of the attribute (e.g. `onOff`)
   * @property {number} [minInterval=0] - The minimum reporting interval in seconds (e.g. 10), the
   * default value is 0 which imposes no minimum limit (unless one is imposed by the
   * specification of the cluster using this reporting mechanism). Range: 0 - 65535.
   * @property {number} maxInterval - The maximum reporting interval in seconds (e.g. 300), this
   * value must be larger than 60 and larger than `minInterval`. When this parameter is set to
   * 65535 the device shall not issue reports for the specified attribute. When this parameter
   * is set to 0 and the `minInterval` is set to 65535 the device will revert back to its
   * default reporting configuration. Range: 0 - 65535.
   * @property {number} [minChange=1] - The minimum value the attribute has to change in order to
   * trigger a report. For attributes with 'discrete' data type this field is irrelevant. If
   * `minInterval` is set to 65535, and `maxInterval` to 0, this value will be set to 0. See
   * section 2.5.7.1.7 of the Zigbee Cluster Library specification version 1.0, revision 6.
   * @property {EndpointId} [endpointId=1] - The endpoint index (e.g. 1)
   */

  /**
   * Configure the node to send attribute reports. After successful configuration the device's
   * store value {@link CONFIGURED_ATTRIBUTE_REPORTING_STORE_KEY} will be updated to reflect the
   * configured attribute reporting configuration with an additional `lastUpdated` value.
   *
   * Note: not all devices support this, and not all attributes are reportable, check the Zigbee
   * Cluster Library specification for more information. Additionally, many devices require a
   * binding to be configured before attribute reporting can be configured, include the cluster id
   * in the `bindings` array in the `zigbee.endpoints` object in the driver's manifest.
   * @param {AttributeReportingConfiguration[]} attributeReportingConfigurations
   * @returns {Promise}
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * await this.configureAttributeReporting([{
   *   cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
   *   attributeName: 'measuredValue',
   *   minInterval: 0,
   *   maxInterval: 300,
   *   minChange: 10,
   * }]);
   *
   * // When setting multiple attribute reporting configurations combine them into one call,
   * // multiple attribute configurations for a single cluster on a single endpoint will need only
   * // one remote call to the node. This especially important for sleepy (battery) devices.
   * await this.configureAttributeReporting([
   *   {
   *     endpointId: 2,
   *     cluster: CLUSTER.COLOR_CONTROL,
   *     attributeName: 'currentHue',
   *     minInterval: 0,
   *     maxInterval: 300,
   *     minChange: 10,
   *   },
   *   {
   *     endpointId: 2,
   *     cluster: CLUSTER.COLOR_CONTROL,
   *     attributeName: 'currentSaturation',
   *     minInterval: 0,
   *     maxInterval: 300,
   *     minChange: 10,
   *   },
   * ]);
   *
   * // In order to handle the attribute reports, bind a listener
   * zclNode.endpoints[1].clusters[CLUSTER.COLOR_CONTROL.NAME]
   *  .on('attr.currentSaturation', (currentSaturation) => {
   *      // handle reported attribute value
   *  });
   */
  async configureAttributeReporting(attributeReportingConfigurations) {
    // Convert input object to an object sorted by endpoint and cluster, this is needed because
    // we need to group `configureReporting` calls by cluster per endpoint (i.e. for each
    // cluster only one `configureReporting` call is necessary per endpoint)
    const sortedConfig = {};
    for (const attributeReportingConfiguration of attributeReportingConfigurations) {
      const endpointId = typeof attributeReportingConfiguration.endpointId === 'number'
        ? attributeReportingConfiguration.endpointId
        : 1;

      assertClusterSpecification(attributeReportingConfiguration.cluster);
      assertZCLNode(this.zclNode, endpointId, attributeReportingConfiguration.cluster);

      // This creates an object of the following structure
      // {
      //  <endpointId>: {
      //    <clusterName>: {
      //      <attributeName>: {
      //        cluster: <clusterName>
      //        attributeName: <attributeName>
      //        minInterval: <minInterval>
      //        maxInterval: <maxInterval>
      //        minChange: <minChange>
      //      }
      //    }
      //  }
      // }
      sortedConfig[endpointId] = {
        ...(sortedConfig[endpointId] || {}),
        [attributeReportingConfiguration.cluster.NAME]: {
          ...((sortedConfig[endpointId] || {})[attributeReportingConfiguration.cluster.NAME] || {}),
          [attributeReportingConfiguration.attributeName]: {
            ...attributeReportingConfiguration,
          },
        },
      };
    }

    // Store all individual promises (per endpoint/cluster combination)
    const configurationPromises = [];

    // Loop all individual endpoint configurations
    for (const [endpointId, endpointConfig] of Object.entries(sortedConfig)) {
      // Loop all individual cluster configurations
      for (const [clusterName, clusterConfig] of Object.entries(endpointConfig)) {
        const configureAttributeReportingOptions = {};
        // Loop all individual attribute configurations
        for (const [attributeName, attributeConfig] of Object.entries(clusterConfig)) {
          // Expand attribute config with defaults
          let { minChange } = { ...ATTRIBUTE_REPORTING_CONFIGURATION_DEFAULTS, ...attributeConfig };
          const { minInterval, maxInterval } = {
            ...ATTRIBUTE_REPORTING_CONFIGURATION_DEFAULTS,
            ...attributeConfig,
          };
          if (minInterval < 0) throw new RangeError('invalid_min_interval_value');

          // Max interval must be larger than 60 and larger than minInterval or 0
          if (maxInterval !== 0 && (maxInterval < 60 || maxInterval < minInterval)) {
            throw new Error('invalid_max_interval_value');
          }

          // See: section 2.5.7.1.7 of the Zigbee Cluster Library specification version 1.0,
          // revision 6.
          if (maxInterval === 0 && minInterval === 65535) {
            minChange = 0;
          }

          // Store config for later use
          configureAttributeReportingOptions[attributeName] = {
            minInterval,
            maxInterval,
            minChange,
          };

          this.debug(`configure attribute reporting (endpoint: ${endpointId}, cluster: ${clusterName}, attribute: ${attributeName})`, configureAttributeReportingOptions[attributeName]);
        }

        // Make the configure reporting call with the cluster configuration (all attribute
        // configurations for this cluster) and push it to the promises array so it can be
        // resolved once all configurations are set

        configurationPromises.push(
          wrapAsyncWithRetry( // Wrap with retry (2-time, directly)
            this.zclNode.endpoints[endpointId]
              .clusters[clusterName]
              .configureReporting.bind(
                this.zclNode.endpoints[endpointId].clusters[clusterName],
                configureAttributeReportingOptions,
              ),
            2,
          )
            .then(async () => {
              this.debug(`configured attribute reporting (endpoint: ${endpointId}, cluster: ${clusterName})`, configureAttributeReportingOptions);

              // Add last updated property to attribute reporting configuration object and restore
              // previously removed attributes
              for (const [attributeName, obj] of Object.entries(
                configureAttributeReportingOptions,
              )) {
                obj.lastUpdated = Date.now();
                obj.clusterName = clusterName;
                obj.attributeName = attributeName;
                obj.endpointId = endpointId;
              }

              // Store configuration for later reference
              const currentValue = this.getStoreValue(CONFIGURED_ATTRIBUTE_REPORTING_STORE_KEY);

              await this.setStoreValue(CONFIGURED_ATTRIBUTE_REPORTING_STORE_KEY, [{
                ...(currentValue || {}),
                ...configureAttributeReportingOptions,
              }]);

              this.debug(`stored attribute reporting configuration (endpoint: ${endpointId}, cluster: ${clusterName})`, this.getStoreValue(CONFIGURED_ATTRIBUTE_REPORTING_STORE_KEY));
            })
            .catch(err => {
              this.error(`Error: configuring attribute reporting (endpoint: ${endpointId}, cluster: ${clusterName})`, configureAttributeReportingOptions, err);
              throw err;
            }),
        );
      }
    }

    return Promise.all(configurationPromises);
  }

  /**
   * Method that handles an incoming attribute report. It parses the result using the
   * {@link ReportParserFunction}, if this is not available it returns `null`. If the parsing
   * succeeded the capability value will be updated and the parsed payload will be returned.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @param {*} payload
   * @returns {Promise<null|*>} - Returns `null` if parsing failed or yielded no result.
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * zclNode.endpoints[1].clusters.onOff.on('attr.onOff', value => {
   *   return this.parseAttributeReport('onoff', CLUSTER.ON_OFF, {onOff: value});
   * });
   */
  async parseAttributeReport(capabilityId, cluster, payload) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    const { report, reportParser } = this._getClusterCapabilityConfiguration(capabilityId, cluster);
    if (typeof reportParser !== 'function') return null;
    if (!(report in payload)) return null; // Expected property is not available in report

    this.debug(`handle report (cluster: ${cluster.NAME}, capability: ${capabilityId}), raw payload:`, payload);

    const parsedPayload = await reportParser.call(this, payload[report]);
    if (parsedPayload instanceof Error) return null;
    if (parsedPayload === null) return null;

    this.log(`handle report (cluster: ${cluster.NAME}, capability: ${capabilityId}), parsed payload:`, parsedPayload);

    // Update capability value in Homey
    this.setCapabilityValue(capabilityId, parsedPayload);

    return parsedPayload;
  }

  /**
   * This method reads the `get` part of the {@link ClusterCapabilityConfiguration} and based on
   * that performs a `readAttributes` call on the cluster. It will trigger
   * {@link parseAttributeReport} once the new value is received which will parse the result and
   * update the capability value.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @returns {Promise<*>}
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * const measureLuminance = await this.getClusterCapabilityValue('measure_luminance',
   * CLUSTER.ILLUMINANCE_MEASUREMENT);
   */
  async getClusterCapabilityValue(capabilityId, cluster) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    const { endpoint, get } = this._getClusterCapabilityConfiguration(capabilityId, cluster);

    assertZCLNode(this.zclNode, endpoint, cluster);
    if (typeof endpoint !== 'number') throw new TypeError('expected_endpoint_number');
    if (typeof get !== 'string') throw new TypeError('expected_get_string');

    this.log(`get → ${capabilityId} → read attribute (cluster: ${cluster.NAME}, attributeId: ${get}, endpoint: ${endpoint})`);

    // Read attribute from ZCLNode with retry (1-time, directly)
    const result = await wrapAsyncWithRetry(
      this.zclNode.endpoints[endpoint].clusters[cluster.NAME].readAttributes
        .bind(this.zclNode.endpoints[endpoint].clusters[cluster.NAME], get),
    ).catch(err => {
      this.error(`Error: get → ${capabilityId} → read attribute (cluster: ${cluster.NAME}, attributeId: ${get}, endpoint: ${endpoint})`, err);
      throw err;
    });

    this.debug(`get → ${capabilityId} → read attribute (cluster: ${cluster.NAME}, attributeId: ${get}, endpoint: ${endpoint}) → raw result:`, result);

    // Parse the raw result
    const parsedResult = await this.parseAttributeReport(capabilityId, cluster, result);
    this.log(`get → ${capabilityId} → read attribute (cluster: ${cluster.NAME}, attributeId: ${get}, endpoint: ${endpoint}) → parsed result`, parsedResult);
    return parsedResult;
  }

  /**
   * This method retrieves the `set` part of the {@link ClusterCapabilityConfiguration}, parses the
   * payload by calling the {@link ClusterCapabilityConfiguration.setParser}, and finally
   * executes the cluster command as configured by {@link ClusterCapabilityConfiguration.set}.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @param {*} value - The desired capability value.
   * @param {Homey.Device.registerCapabilityListener.listener.opts} [opts={}]
   * @returns {Promise<*|null>} - Returns the set capability value or `null` if the
   * {@link ClusterCapabilityConfiguration.setParser} returned `null` (i.e. command set should
   * not be executed).
   *
   * @example
   * const { CLUSTER } = require('zigbee-clusters');
   *
   * await this.setClusterCapabilityValue('dim', CLUSTER.LEVEL_CONTROL, 0.6, {duration: 500});
   */
  async setClusterCapabilityValue(capabilityId, cluster, value, opts = {}) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    const { setParser, endpoint } = this._getClusterCapabilityConfiguration(capabilityId, cluster);
    let { set } = this._getClusterCapabilityConfiguration(capabilityId, cluster);

    assertZCLNode(this.zclNode, endpoint, cluster);
    if (typeof setParser !== 'function') throw new TypeError('set_parser_is_not_a_function');
    if (typeof endpoint !== 'number') throw new TypeError('expected_endpoint_number');
    if (typeof set !== 'function' && typeof set !== 'string') throw new TypeError('expected_set_function_or_string');

    this.log(`set ${capabilityId} → ${value} (cluster: ${cluster.NAME}, endpoint: ${endpoint})`);

    // `set` can be a function, in that case call the function to convert to a string value
    if (typeof set === 'function') set = set(value, opts);

    // Call the `setParser` to generate the command properties which will be passed when
    // executing the cluster command
    const parsedPayload = await setParser.call(this, value, opts);
    if (parsedPayload instanceof Error) throw parsedPayload;

    // In the case that the parser returns `null` do not continue executing the command
    if (parsedPayload === null) {
      this.debug(`WARNING: set ${capabilityId} → ${value} (command: ${set}, cluster: ${cluster.NAME}, endpoint: ${endpoint}) returned \`null\`, ignoring command set`);
      return null;
    }

    this.debug(`set ${capabilityId} → ${value} (command: ${set}, cluster: ${cluster.NAME}, endpoint: ${endpoint}), parsed payload:`, parsedPayload);

    // Execute the cluster command with retry (1-time, directly)
    return wrapAsyncWithRetry(
      this.zclNode.endpoints[endpoint].clusters[cluster.NAME][set]
        .bind(this.zclNode.endpoints[endpoint].clusters[cluster.NAME], parsedPayload),
    ).catch(err => {
      this.error(`Error: could not perform ${set} on cluster: ${cluster.NAME}, endpoint: ${endpoint} for capability ${capabilityId}`, err);
      throw new Error(this.zigbeedriverI18n('error.command_failed'));
    });
  }

  /**
   * Schedule execution of an async method for the next end device announce event.
   * @param {AsyncFunction} method
   * @returns {Promise<unknown>}
   * @private
   */
  async scheduleForNextEndDeviceAnnounce(method) {
    return new Promise((resolve, reject) => {
      this.node.once(END_DEVICE_ANNOUNCE_EVENT, () => {
        method().then(resolve).catch(reject);
      });
    });
  }

  /**
   * Print the current node information, this contains information on the node's endpoints and
   * clusters (and if it is a sleepy device or not).
   */
  printNode() {
    this.log('------------------------------------------');

    // log the entire Node
    this.log('Node:', this.getData().token);
    this.log('- Receive when idle:', this.node.receiveWhenIdle);

    Object.keys(this.zclNode.endpoints)
      .forEach(endpoint => {
        this.log('- Endpoints:', endpoint);
        this.log('-- Clusters:');
        Object.keys(this.zclNode.endpoints[endpoint].clusters)
          .forEach(key => {
            this.log('---', key);
          });
      });

    this.log('------------------------------------------');
  }

  /**
   * Debug logging method. Will only log to stdout if enabled via {@link enableDebug}.
   * @param {*} args
   */
  debug(...args) {
    if (this._debugEnabled) {
      this.log.bind(this, '[dbg]').apply(this, args);
    }
  }

  /**
   * Enable {@link ZigBeeDevice.debug} statements.
   */
  enableDebug() {
    this._debugEnabled = true;

    // Attach unhandled promise rejection handler
    process.on('unhandledRejection', error => {
      this.error('unhandledRejection', error);
    });
  }

  /**
   * Disable {@link ZigBeeDevice.debug} statements.
   */
  disableDebug() {
    this._debugEnabled = false;
  }

  /**
   * Method is called by the Homey Apps SDK when the {@link Homey.Device} instance is
   * initialized. It will configure this {@link ZigBeeDevice} instance and retrieve a
   * {@link Homey.ZigBeeNode} instance from {@link Homey.ManagerZigBee}. This ZigBeeNode instance
   * will then be used to create a {@link ZCLNode} instance.
   * @private
   */
  async onInit() {
    super.onInit();

    this._debugEnabled = false;
    this._pollIntervals = {};
    this._clusterCapabilityConfigurations = new Map();
    this._flowTriggers = {};

    // Bind __ with current language
    this.zigbeedriverI18n = __.bind(this, this.homey.i18n.getLanguage());

    const { token } = this.getData();

    // Throw error if this device is a Zigbee sub device but its driver does not extend ZigBeeDriver
    if (this.isSubDevice() && !(this.driver instanceof ZigBeeDriver)) {
      this.error(`Error: Driver ${this.driver.id} must extend ZigBeeDriver when using Zigbee sub devices`);
      throw new Error(`Driver ${this.driver.id} must extend ZigBeeDriver when using Zigbee sub devices`);
    }

    // Get ZigBeeNode instance from ManagerZigBee
    this.homey.zigbee.getNode(this)
      .then(async node => {
        this.node = node;

        // Bind end device announce listener
        this.node.on(END_DEVICE_ANNOUNCE_EVENT, this.onEndDeviceAnnounce.bind(this));

        // Check if `getEnergy` method is available (Homey >=v3.0.0)
        if (typeof this.getEnergy === 'function') {
          const energyObject = this.getEnergy();
          await this.setEnergy(energyObject);
        }

        // If this is a Zigbee sub device
        if (this.isSubDevice()) {
          // And a ZCLNode instance is already available on the driver
          if (this.driver._zclNodes.has(token)) {
            // Re-use ZCLNode instance, this is needed for Zigbee sub devices which share a
            // single ZCLNode instance
            this.zclNode = this.driver._zclNodes.get(token);
          }
        }

        // If no ZCLNode could be re-used, create a new one
        if (!this.zclNode) this.zclNode = new ZCLNode(this.node);

        // If possible, register it with the driver for future re-use
        if (this.driver._zclNodes instanceof Map && !this.driver._zclNodes.has(token)) {
          this.driver._zclNodes.set(token, this.zclNode);
        }

        this.log('ZigBeeDevice has been initialize', { firstInit: this.isFirstInit(), isSubDevice: this.isSubDevice() });

        // Mark device as available
        await this.setAvailable();

        // Legacy from homey-meshdriver
        this.onMeshInit();

        // Call overridable method with initialized ZCLNode
        await this.onNodeInit({ zclNode: this.zclNode, node });

        // Mark this node as initialized
        await this.setStoreValue(FIRST_INIT, false);
      })
      .catch(err => {
        this.error('Error: could not initialize node', err);

        this.setUnavailable(this.zigbeedriverI18n('error.node_initialization'))
          .catch(unavailableErr => this.error('could not set device unavailable', unavailableErr));
      });
  }

  /**
   * Returns true if this device is a Zigbee sub device.
   * @returns {boolean}
   */
  isSubDevice() {
    return typeof this.getData().subDeviceId === 'string';
  }

  /**
   * Returns true if node has just been initialized for the first time (after awaiting
   * {@link onNodeInit} this value will be updated.
   * @returns {boolean}
   */
  isFirstInit() {
    return this.getStoreValue(FIRST_INIT) !== false;
  }

  /**
   * Remove all listeners and intervals from node. This method can be overridden if additional
   * clean up actions are required, but be sure to call `super.onDeleted()` at some point.
   * @abstract
   */
  onDeleted() {
    // Remove listeners on node
    if (this.node) this.node.removeAllListeners();

    // Remove listeners on zclNode
    if (this.zclNode) {
      for (const endpoint of Object.values(this.zclNode.endpoints)) {
        for (const cluster of Object.values(endpoint.clusters)) {
          cluster.removeAllListeners();
        }
        endpoint.removeAllListeners();
      }
      this.zclNode.removeAllListeners();
    }

    // Clear all pollIntervals
    if (this._pollIntervals) { // Sometimes it is null/undefined for some reason
      Object.keys(this._pollIntervals)
        .forEach(capabilityId => {
          Object.values(this._pollIntervals[capabilityId])
            .forEach(interval => {
              clearInterval(interval);
            });
        });
    }
    this.debug('deleted ZigBeeDevice instance');
  }

  /**
   * Method that handles registering the `get` part of the
   * {@link ClusterCapabilityConfiguration}. If
   * {@link ClusterCapabilityConfiguration.getOpts.getOnStart} is set, the node is a non-sleepy
   * device and the capability value is currently unknown, execute the cluster command that will
   * retrieve the capability value from the device. Additionally, if
   * {@link ClusterCapabilityConfiguration.getOpts.getOnOnline} is set the cluster command will
   * be executed to retrieve the capability value when the device sends an end device announce
   * indication. Also, if {@link ClusterCapabilityConfiguration.getOpts.pollInterval} is set
   * to either a number or a string (setting key) a poll interval will be registered which
   * executes the cluster command to retrieve the capability value. Finally, if this is the
   * first init of the device (directly after pairing) it will attempt to read the attribute
   * value specified by `get`.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @private
   */
  _registerCapabilityGet(capabilityId, cluster) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    this.debug(`register capability get, capability ${capabilityId}, cluster: ${cluster.NAME}`);

    const {
      get,
      endpoint,
      getOpts,
      report,
    } = this._getClusterCapabilityConfiguration(capabilityId, cluster);

    assertZCLNode(this.zclNode, endpoint, cluster);

    const { getOnStart, getOnOnline, pollInterval } = getOpts;

    // Make sure that attribute reports are parsed and handled
    if (typeof report === 'string') {
      this.zclNode.endpoints[endpoint].clusters[cluster.NAME]
        .on(`attr.${report}`, value => {
          return this.parseAttributeReport(capabilityId, cluster, { [report]: value })
            .catch(err => {
              this.error('Error: failed to parse attribute report', { [report]: value }, err);
            });
        });
    }

    // Get initial value on start if null, unless it's an offline battery device and the
    // getOnOnline flag is also set

    // Only continue if a `get` attribute is configured
    if (typeof get === 'string') {
      // If the `getOnStart` option is set and the node is not a sleepy device and the capability
      // value is unknown go execute getClusterCapabilityValue. This situation is almost always
      // only after the first init of a device after pairing.
      if (getOnStart
        && this.getCapabilityValue(capabilityId) === null
        && this.node.receiveWhenIdle !== true) {
        this.getClusterCapabilityValue(capabilityId, cluster)
          .catch(err => {
            this.error(`Error: could not get value for capability (\`getOnStart\`): ${capabilityId} on cluster: ${cluster.NAME}`, err);
          });
      }

      // When node comes online (i.e. sends an end device announce indication) execute
      // getClusterCapabilityValue when `getOnOnline` is set to true.
      if (getOnOnline) {
        this.node.on('endDeviceAnnounce', () => {
          this.debug('Received end device announce indication and `getOnOnline` is configured');
          this.getClusterCapabilityValue(capabilityId, cluster)
            .catch(err => {
              this.error(`Error: could not get value for capability (\`getOnOnline\`): ${capabilityId} on cluster: ${cluster.NAME}`, err);
            });
        });
      }

      // Configure poll intervals if needed
      if (pollInterval) {
        // If poll interval is a number treat it as the interval in ms
        if (typeof pollInterval === 'number') {
          this._setPollInterval(capabilityId, cluster, pollInterval);

          // Else if poll interval is a string treat it as a settings key on the device instance,
          // this setting should return a number value representing the interval in ms
        } else if (typeof pollInterval === 'string') {
          this._setPollInterval(capabilityId, cluster, this.getSetting(pollInterval));
        }
      }

      // If this is the first init of the node (directly after pairing) fetch the values for which
      // a `get` is specified.
      if (this.isFirstInit()) {
        this.getClusterCapabilityValue(capabilityId, cluster).catch(err => {
          this.error(`Error: could not fetch initial value for ${capabilityId}`, err);

          // When failed even after retry, re-schedule for next end device announce event
          this.scheduleForNextEndDeviceAnnounce(
            this.getClusterCapabilityValue.bind(this, capabilityId, cluster),
          ).catch(retryErr => {
            this.error(`[retry on end device announce] Error: could not fetch initial value for ${capabilityId}`, retryErr);
          });
        });
      }
    }
  }

  /**
   * Method that handles registering the `set` part of the
   * {@link ClusterCapabilityConfiguration}. When a capability value is changed (i.e. the
   * capability listener is called {@link Homey.Device.registerCapabilityListener}) the
   * {@link setClusterCapabilityValue} will be called which handles converting the
   * capability value change to a Zigbee command in order to actually change the device's state.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @private
   */
  _registerCapabilitySet(capabilityId, cluster) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    this.debug(`register capability set, capability ${capabilityId}, cluster: ${cluster.NAME}`);

    // Register the capability and attach a listener to act on a capability change by the user
    this.registerCapabilityListener(capabilityId, async (value, opts) => {
      return this.setClusterCapabilityValue(capabilityId, cluster, value, opts)
        .catch(err => {
          this.error(`Error: failed to set cluster capability value (capability: ${capabilityId}, cluster: ${cluster.NAME}, value: ${value})`, err);
        });
    });
  }

  /**
   * Method that handles registering the `report` part of the
   * {@link ClusterCapabilityConfiguration}. On first initialization it will try to configure
   * attribute reporting if provided an `reportOpts.configureAttributeReporting` configuration.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @private
   */
  _registerCapabilityReport(capabilityId, cluster) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    this.debug(`register capability report, capability ${capabilityId}, cluster: ${cluster.NAME}`);

    const {
      report,
      reportParser,
      reportOpts,
      endpoint,
    } = this._getClusterCapabilityConfiguration(capabilityId, cluster);

    assertZCLNode(this.zclNode, endpoint, cluster);

    // Check if attribute reporting needs to be configured
    if (
      this.isFirstInit() // Only on first init after join
      && typeof report === 'string'
      && typeof reportParser === 'function'
      && reportOpts
      && 'configureAttributeReporting' in reportOpts
      && 'minInterval' in reportOpts.configureAttributeReporting
      && 'maxInterval' in reportOpts.configureAttributeReporting
      && 'minChange' in reportOpts.configureAttributeReporting
    ) {
      const attributeReportingConfiguration = [{
        cluster,
        attributeName: report,
        minInterval: reportOpts.configureAttributeReporting.minInterval,
        maxInterval: reportOpts.configureAttributeReporting.maxInterval,
        minChange: reportOpts.configureAttributeReporting.minChange,
        endpointId: endpoint,
      }];
      this.configureAttributeReporting(attributeReportingConfiguration)
        .then(() => {
          this.log(`configured attribute reporting for capability ${capabilityId} and cluster ${cluster.NAME}, attribute: ${report}`);
        })
        .catch(err => {
          this.error(`Error: failed to configure reporting for ${capabilityId} and ${cluster.NAME}`, err);

          // When failed even after retry, re-schedule for next end device announce event
          this.scheduleForNextEndDeviceAnnounce(
            this.configureAttributeReporting.bind(this, attributeReportingConfiguration),
          ).then(() => {
            this.log(`[retry on end device announce] configured attribute reporting for capability ${capabilityId} and cluster ${cluster.NAME}, attribute: ${report}`);
          }).catch(retryErr => {
            this.error(`[retry on end device announce] Error: failed to configure reporting for ${capabilityId} and ${cluster.NAME}`, retryErr);
          });
        });
    }
  }

  /**
   * Starts the poll interval (and clears it if it was already running). On each interval
   * {@link getClusterCapabilityValue} will be called to fetch the capability value from the
   * device by doing a `readAttributes`.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @param {number} pollInterval - interval in ms (min. 1)
   * @private
   */
  _setPollInterval(capabilityId, cluster, pollInterval) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    if (this._pollIntervals[capabilityId] && this._pollIntervals[capabilityId][cluster.ID]) {
      clearInterval(this._pollIntervals[capabilityId][cluster.ID]);
    }

    // Values 1 are rejected
    if (pollInterval < 1) return;

    this.debug(`set poll interval for capability: ${capabilityId}, cluster: ${cluster.NAME} to ${pollInterval}ms`);

    // Set interval
    this._pollIntervals[capabilityId] = this._pollIntervals[capabilityId] || {};
    this._pollIntervals[capabilityId][cluster.ID] = setInterval(() => {
      this.debug(`polling cluster ${cluster.NAME} for capability ${capabilityId}`);
      this.getClusterCapabilityValue(capabilityId, cluster).catch(err => {
        this.error(`Error: polling cluster ${cluster.NAME} for capability ${capabilityId}`, err);
      });
    }, pollInterval);
  }

  /**
   * Method that merges two {@link ClusterCapabilityConfiguration} objects. There are system
   * ClusterCapabilityConfigurations (see ./lib/system/capabilities) and user
   * ClusterCapabilityConfigurations. When registering a capability by default the system
   * configuration will be applied, if desired a user configuration can be provided
   * {@link registerCapability.userOpts} which will extend the system configuration (i.e. user
   * configuration overrules system configuration).
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @param {ClusterCapabilityConfiguration} [userClusterCapabilityConfiguration={}]
   * @private
   */
  _mergeSystemAndUserClusterCapabilityConfigurations(
    capabilityId, cluster, userClusterCapabilityConfiguration = {},
  ) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    // Merge systemConfiguration & userOpts
    let systemConfiguration = {};
    try {
      // Get the system configuration
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const systemConfigurationFile = require(`./system/capabilities/${capabilityId}/${cluster.NAME}.js`);
      systemConfiguration = recursiveDeepCopy(systemConfigurationFile);

      // Bind correct scope on functions
      // eslint-disable-next-line no-restricted-syntax
      for (const i in systemConfiguration) {
        if (typeof systemConfiguration[i] === 'function') {
          systemConfiguration[i] = systemConfiguration[i].bind(this);
        }
      }
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || err.message.indexOf(`/system/capabilities/${capabilityId}/${cluster.NAME}.js`) < 0) {
        process.nextTick(() => {
          throw err;
        });
      }
    }

    // Determine endpoint, search for it based on the cluster
    let { endpoint } = userClusterCapabilityConfiguration;
    if (typeof endpoint !== 'number') {
      endpoint = this.getClusterEndpoint(cluster);
      if (endpoint === null) {
        this.error(`Error: expected cluster ${cluster.NAME} on node`);
        throw new Error('missing_cluster');
      }
    }

    // Store cluster capability configuration
    this._setClusterCapabilityConfiguration(capabilityId, cluster, {
      ...systemConfiguration || {},
      ...userClusterCapabilityConfiguration,
      endpoint,
    });
  }

  /**
   * Method that returns the cluster capability configuration for a registered capability
   * (see {@link registerCapability}).
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @returns {ClusterCapabilityConfiguration}
   * @private
   */
  _getClusterCapabilityConfiguration(capabilityId, cluster) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    // Get capability configuration object if available, if not throw error
    const capabilityConfiguration = this._clusterCapabilityConfigurations.get(capabilityId) || null;
    if (capabilityConfiguration) {
      const clusterCapabilityConfiguration = capabilityConfiguration
        .get(cluster.ID.toString()) || null;

      if (!capabilityConfiguration) {
        this.error(`Error: missing cluster capability configuration (capabilityId: ${capabilityId}, cluster: ${cluster.NAME})`);
        throw new Error('missing_cluster_capability_configuration');
      }
      return {
        ...clusterCapabilityConfiguration,
      };
    }
    this.error(`Error: missing capability configuration (capabilityId: ${capabilityId}, cluster: ${cluster.NAME})`);
    throw new Error('missing_capability_configuration');
  }

  /**
   * Method that stores a cluster capability configuration object in a Map.
   * @param {CapabilityId} capabilityId
   * @param {ClusterSpecification} cluster
   * @param {ClusterCapabilityConfiguration} clusterCapabilityConfiguration
   * @private
   */
  _setClusterCapabilityConfiguration(capabilityId, cluster, clusterCapabilityConfiguration = {}) {
    assertClusterSpecification(cluster);
    assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    if (clusterCapabilityConfiguration) {
      // Creat new map based on current configurations
      const clusterCapabilityConfigurationMap = new Map(
        Object.entries(this._clusterCapabilityConfigurations.get(capabilityId) || {}),
      );

      // Add new configuration to map by extending the defaults
      clusterCapabilityConfigurationMap
        .set(cluster.ID.toString(), Object.freeze({
          ...CLUSTER_CAPABILITY_CONFIGURATION_DEFAULTS,
          ...clusterCapabilityConfiguration,
        }));

      // Store the new cluster capability configuration map
      this._clusterCapabilityConfigurations.set(capabilityId, clusterCapabilityConfigurationMap);
    }
  }

}

module.exports = ZigBeeDevice;
