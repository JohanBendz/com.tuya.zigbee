#!/usr/bin/env python3
import json
import sys

"""Simple parser example converting Z2M definitions to Homey driver files."""

def convert(z2m_json):
    data = json.loads(z2m_json)
    return {
        "id": data.get("model", "unknown"),
        "name": {"en": data.get("description", "Unnamed")},
        "class": data.get("class", "other"),
        "capabilities": data.get("capabilities", [])
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: parse_z2m_to_homey.py <z2m_file.json>")
        sys.exit(1)
    with open(sys.argv[1]) as f:
        z2m = f.read()
    homey = convert(z2m)
    print(json.dumps(homey, indent=2))
