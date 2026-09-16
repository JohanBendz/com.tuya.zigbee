'use strict';

function findBasicCluster(zclNode) {
    if (!zclNode || !zclNode.endpoints) return null;

    const endpointIds = Object.keys(zclNode.endpoints)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    for (const endpointId of endpointIds) {
        const endpoint = zclNode.endpoints[endpointId];

        if (endpoint && endpoint.clusters && endpoint.clusters.basic) {
            return {
                endpointId,
                cluster: endpoint.clusters.basic,
            };
        }
    }

    return null;
}

async function readZigbeeIdentity(zclNode) {
    const basic = findBasicCluster(zclNode);

    if (!basic) {
        throw new Error('Unable to resolve device profile: Basic cluster not found');
    }

    const attributes = await basic.cluster.readAttributes([
        'manufacturerName',
        'modelId',
    ]);

    if (!attributes || typeof attributes.manufacturerName !== 'string' || typeof attributes.modelId !== 'string') {
        throw new Error('Unable to resolve device profile: manufacturerName/modelId missing');
    }

    return {
        manufacturerName: attributes.manufacturerName,
        productId: attributes.modelId,
        basicClusterEndpoint: basic.endpointId,
    };
}

async function resolveZigbeeProfile({ zclNode, registry }) {
    if (!registry || typeof registry.resolve !== 'function') {
        throw new TypeError('A DeviceProfileRegistry is required');
    }

    const identity = await readZigbeeIdentity(zclNode);
    const profile = registry.resolve(identity);

    return {
        identity,
        profile,
    };
}

module.exports = {
    findBasicCluster,
    readZigbeeIdentity,
    resolveZigbeeProfile,
};
