#!/usr/bin/env python3
import json
import os

z2m_file = os.path.join('data', 'manufacturer_ids_z2m.json')
ha_file = os.path.join('data', 'manufacturer_ids_ha.json')
output_file = os.path.join('data', 'manufacturer_ids.json')

with open(z2m_file) as f:
    z2m_data = json.load(f)
with open(ha_file) as f:
    ha_data = json.load(f)

merged = {}
for entry in z2m_data + ha_data:
    model = entry['modelId']
    if model not in merged:
        merged[model] = entry['manufacturer']

with open(output_file, 'w') as f:
    json.dump(merged, f, indent=2)
print(f"Merged manufacturers written to {output_file}")
