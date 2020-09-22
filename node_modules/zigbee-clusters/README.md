# Zigbee Cluster Library for Node.js

This project implements the Zigbee Cluster Library (ZCL) based on the Zigbee Cluster Library
 Specification ([documentation](https://etc.athom.com/zigbee_cluster_specification.pdf)). It is designed to work with Homey's Zigbee stack and can be used in Homey Apps to implement drivers for Zigbee devices that work with Homey.

Note: if you are looking for the best way to implement Zigbee drivers for Homey take a look at [node-homey-zigbeedriver](https://github.com/athombv/node-homey-zigbeedriver).

The [node-homey-zigbeedriver](https://github.com/athombv/node-homey-zigbeedriver) library implements this project and does a lot of the heavy lifting that is required for most Zigbee drivers for Homey. In the case you need to divert from [node-homey-zigbeedriver](https://github.com/athombv/node-homey-zigbeedriver) it is possible to directly use the Zigbee Cluster Library for Node.js.

Make sure to take a look at the API documentation: [https://athombv.github.io/node-zigbee-clusters](https://athombv.github.io/node-zigbee-clusters).

## Installation

`$ npm install --save zigbee-clusters`

## About Zigbee Clusters

A Zigbee cluster is an abstraction on top of the Zigbee protocol which allows implementing functionality for many types of devices. A list of all available clusters can be found in the Zigbee Cluster Library Specification [section 2.2.](https://etc.athom.com/zigbee_cluster_specification.pdf). If you are familiar with Z-Wave Command Classes, Zigbee clusters are very similar.

### Cluster hierachy

It is important to understand the structure of a Zigbee node:
[![](https://mermaid.ink/img/eyJjb2RlIjoiZ3JhcGggVERcbiAgQVtOb2RlXSAtLT4gQihFbmRwb2ludCAxKVxuICBBIC0tPiBEKEVuZHBvaW50IC4uLilcbiAgQiAtLT4gRShDbHVzdGVyIE9uT2ZmKVxuICBCIC0tPiBGKENsdXN0ZXIgTGV2ZWxDb250cm9sKVxuICBCIC0tPiBHKENsdXN0ZXIgLi4uKVxuICBFIC0tPiBIKENvbW1hbmQgJ3RvZ2dsZScpXG4gIEUgLS0-IEkoQ29tbWFuZCAnc2V0T24nKVxuICBFIC0tPiBKKEF0dHJpYnV0ZSAnb25PZmYnKSIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6ZmFsc2V9)](https://mermaid-js.github.io/mermaid-live-editor/#/edit/eyJjb2RlIjoiZ3JhcGggVERcbiAgQVtOb2RlXSAtLT4gQihFbmRwb2ludCAxKVxuICBBIC0tPiBEKEVuZHBvaW50IC4uLilcbiAgQiAtLT4gRShDbHVzdGVyIE9uT2ZmKVxuICBCIC0tPiBGKENsdXN0ZXIgTGV2ZWxDb250cm9sKVxuICBCIC0tPiBHKENsdXN0ZXIgLi4uKVxuICBFIC0tPiBIKENvbW1hbmQgJ3RvZ2dsZScpXG4gIEUgLS0-IEkoQ29tbWFuZCAnc2V0T24nKVxuICBFIC0tPiBKKEF0dHJpYnV0ZSAnb25PZmYnKSIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6ZmFsc2V9)

### Client/Server clusters
A cluster can be implemented in two ways:
* As server
* As client

From the Zigbee Cluster Library Specification "Typically, the entity that stores the attributes of a cluster is referred to as the server of that cluster and an entity that affects or manipulates those attributes is referred to as the client of that cluster." More information on this can be found in the Zigbee Cluster Library Specification [section 2.2.2.](https://etc.athom.com/zigbee_cluster_specification.pdf).

### Bindings and bound clusters
The concept of server/client is important for the following reason. Nodes can be receivers of commands (i.e. servers), or senders of commands (i.e. clients), and sometimes both. An example on how to send a command to a node can be found [below](#basic-communication-with-node). Receiving commands from a node requires a binding to be made from the controller to the cluster on the node, and the implementation of a `BoundCluster` to receive and handle the incoming commands. For an example on implementing a `BoundCluster` see [below](#implementing-a-bound-cluster).

## Usage

In order to communicate with a Zigbee node retrieve a `node` instance from `ManagerZigBee` and create a `ZCLNode` instance using that node. This step encapsulates the `node` with the Zigbee Clusters functionality and allows sending and receiving ZCL commands.

### Basic communication with node
`/drivers/my-driver/device.js`
```js
const Homey = require('homey');
const { ZCLNode, CLUSTER } = require('zigbee-clusters');

class MyDevice extends Homey.Device {
    onInit() {
        // Get ZigBeeNode instance from ManagerZigBee
        this.homey.zigbee.getNode(this)
          .then(async node => {
            // Create ZCLNode instance
            const zclNode = new ZCLNode(node);
            await zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].toggle();
          });
    }
}
```

### Implementing a cluster

It is very easy to add support for a new cluster or add commands and/or attributes to an existing
 cluster. All implemented clusters are listed in [lib/clusters/index.js](https://github.com/athombv/node-zigbee-clusters/blob/production/lib/clusters/index.js). It also exports a constant `CLUSTER` object for easy reference to a specific cluster name and/or id (e.g. `CLUSTER.WINDOW_COVERING` -> `{NAME: "windowCovering", ID: 258})`.

This example shows in a simplified way how the OnOff cluster is implemented ([actual implementation](https://github.com/athombv/node-zigbee-clusters/blob/production/lib/clusters/onOff.js)). All the information with regard to the ids, names, available attributes and commands can be found in the Zigbee Cluster Library Specification [section 3.8.](https://etc.athom.com/zigbee_cluster_specification.pdf):

`zigbee-clusters/lib/clusters/onOff.js`
```js
// Define the cluster attributes
const ATTRIBUTES = {
  onOff: { id: 0, type: ZCLDataTypes.bool },
};

// Define the cluster commands (with potential required arguments)
const COMMANDS = {
  toggle: { id: 2 },
  onWithTimedOff: {
    id: 66,
    args: {
      onOffControl: ZCLDataTypes.uint8, // Use the `ZCLDataTypes` object to specifiy types
      onTime: ZCLDataTypes.uint16,
      offWaitTime: ZCLDataTypes.uint16,
    },
  },
};

// Implement the OnOff cluster by extending `Cluster`
class OnOffCluster extends Cluster {

  static get ID() {
    return 6; // The cluster id
  }

  static get NAME() {
    return 'onOff'; // The cluster name
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES; // Returns the defined attributes
  }

  static get COMMANDS() {
    return COMMANDS; // Returns the defined commands
  }

}

// Add the cluster to the clusters that will be available on the `ZCLNode`
Cluster.addCluster(OnOffCluster);

module.exports = OnOffCluster;

```

After a cluster is implemented it can be used on a `ZCLNode` instance like this:
```
await zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].toggle();
```
Note that `CLUSTER.ON_OFF.NAME` is just a string that refers to `onOff` in `zigbee-clusters/lib/clusters/onOff.js`


### Implementing a bound cluster
Zigbee nodes can send commands to Homey via bound clusters. This requires a binding to be created on a specific endpoint and cluster. Next, a `BoundCluster` implementation must be registered with the `ZCLNode` which implements handlers for the incomming commands:

`/lib/LevelControlBoundCluster.js`
```js
const { BoundCluster } = require('zigbee-clusters');

class LevelControlBoundCluster extends BoundCluster {

  constructor({ onMove }) {
    super();
    this._onMove = onMove;
  }

  // This function name is directly derived from the `move`
  // command in `zigbee-clusters/lib/clusters/levelControl.js`
  // the payload received is the payload specified in
  // `LevelControlCluster.COMMANDS.move.args`
  move(payload) {
    this._onMove(payload);
  }
}

module.exports = LevelControlBoundCluster;

```
`/drivers/my-driver/device.js`

```js
const LevelControlBoundCluster = require('../../lib/LevelControlBoundCluster');

// Register the `BoundCluster` implementation with the `ZCLNode`
zclNode.endpoints[1].bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster({
  onMove: (payload) => {
    // Do something with the received payload
  },
}));
```

### Implementing a custom cluster
There are cases where it is required to implement a custom cluster, for example to handle manufacturer specific cluster implementations. Often these manufacturer specific cluster implementations are extensions of existing clusters. An example is the `IkeaSpecificSceneCluster` ([complete implementation](https://github.com/athombv/com.ikea.tradfri/tree/master/lib/IkeaSpecificSceneCluster.js)):

`lib/IkeaSpecificSceneCluster.js`
```js
const { ScenesCluster, ZCLDataTypes } = require('zigbee-clusters');

class IkeaSpecificSceneCluster extends ScenesCluster {

  // Here we override the `COMMANDS` getter from the `ScenesClusters` by
  // extending it with the custom command we'd like to implement `ikeaSceneMove`.
  static get COMMANDS() {
    return {
      ...super.COMMANDS,
      ikeaSceneMove: {
        id: 0x08,
        manufacturerId: 0x117C,
        args: {
          mode: ZCLDataTypes.enum8({
            up: 0,
            down: 1,
          }),
          transitionTime: ZCLDataTypes.uint16,
        },
      },
    };
  }

  // It is also possible to implement manufacturer specific attributes, but beware, do not mix
  // these with regular attributes in one command (e.g. `Cluster#readAttributes` should be
  // called with only manufacturer specific attributes or only with regular attributes).
  static get ATTRIBUTES() {
    return {
      manufAttribute: {
        id: 0,
        type: ZCLDataTypes.uint8,
        manufacturerId: 0x1234,
      },
    };
  }

}

module.exports = IkeaSpecificSceneCluster;


```

`/drivers/my-driver/device.js`
```js
const IkeaSpecificSceneCluster = require('../../lib/IkeaSpecificSceneCluster');

// Important: we have created a new `Cluster` instance which needs to be added before
// it becomes available on any `ZCLNode` instance.
Cluster.addCluster(IkeaSpecificSceneCluster);

// Example invocation of custom cluster command
zclNode.endpoints[1].clusters['scenes'].ikeaSceneMove({mode: 0, transitionTime: 10});

```

This also works for `BoundClusters`, if a node sends commands to Homey using a custom cluster it is necessary to implement a custom `BoundCluster` and bind it to the `ZCLNode` instance. For an example check the implementation in the `com.ikea.tradfri` driver [remote_control](https://github.com/athombv/com.ikea.tradfri/tree/master/drivers/remote_control/device.js).

## Contributing
Great if you'd like to contribute to this project, a few things to take note of before submitting a PR:
* This project enforces ESLint, validate by running `npm run lint`.
* This project implements a basic test framework based on mocha, see [test](https://github.com/athombv/node-zigbee-clusters/blob/production/test) directory.
* This project uses several [GitHub Action workflows](https://github.com/athombv/node-zigbee-clusters/blob/production/.github/workflows) (e.g. ESLint, running test and versioning/publishing).


