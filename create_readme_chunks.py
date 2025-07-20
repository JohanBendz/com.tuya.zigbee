import json
import os
import re
import subprocess

def get_git_log():
    try:
        log = subprocess.check_output(['git', 'log', '--pretty=format:%h - %s (%ci)'], encoding='utf-8')
        return log
    except subprocess.CalledProcessError:
        return ''

def create_device_table(devices, lang='en'):
    if lang == 'fr':
        table = "| Nom de l'appareil | Fabricant / ID de produit |\n"
        table += '|---|---|\n'
    else:
        table = '| Device Name | Manufacturer / Product ID |\n'
        table += '|---|---|\n'

    for device in devices:
        device_name = device['device_name']

        ids = device['manufacturer_names'] + device['product_ids']
        ids_str = '<br>'.join([f'`{id}`' for id in ids])

        table += f'| {device_name} | {ids_str} |\n'
    return table

def main():
    with open('all_devices.json') as f:
        all_devices = json.load(f)

    devices_by_type = {
        'Sensors': {'en': 'Sensors', 'fr': 'Capteurs', 'devices': []},
        'Plugs, Sockets and Socket Strips': {'en': 'Plugs, Sockets and Socket Strips', 'fr': 'Prises, fiches et multiprises', 'devices': []},
        'In-Wall': {'en': 'In-Wall', 'fr': 'Encastré', 'devices': []},
        'On-Wall': {'en': 'On-Wall', 'fr': 'Mural', 'devices': []},
        'Lights': {'en': 'Lights', 'fr': 'Lumières', 'devices': []},
        'Remotes': {'en': 'Remotes', 'fr': 'Télécommandes', 'devices': []},
        'Curtains': {'en': 'Curtains', 'fr': 'Rideaux', 'devices': []},
        'Other': {'en': 'Other', 'fr': 'Autre', 'devices': []},
    }

    for device in all_devices:
        device_type = 'Other'
        if 'sensor' in device['device_name'].lower():
            device_type = 'Sensors'
        elif 'plug' in device['device_name'].lower() or 'socket' in device['device_name'].lower() or 'strip' in device['device_name'].lower():
            device_type = 'Plugs, Sockets and Socket Strips'
        elif 'switch' in device['device_name'].lower() or 'module' in device['device_name'].lower() or 'dimmer' in device['device_name'].lower():
            if 'wall' in device['device_name'].lower():
                device_type = 'On-Wall'
            else:
                device_type = 'In-Wall'
        elif 'light' in device['device_name'].lower() or 'bulb' in device['device_name'].lower() or 'spot' in device['device_name'].lower():
            device_type = 'Lights'
        elif 'remote' in device['device_name'].lower():
            device_type = 'Remotes'
        elif 'curtain' in device['device_name'].lower():
            device_type = 'Curtains'

        devices_by_type[device_type]['devices'].append(device)

    with open('README.md', 'w') as f:
        f.write("""### Tuya Zigbee
Ajoute la prise en charge des appareils Tuya Zigbee

Quelques-unes des marques de distributeurs prises en charge :
- Alecto
- Alice
- Avatto
- BSEED
- Blitzwolf
- eWeLight
- GiEX
- GIRIER
- Hangzlou
- Inmax
- Lidl
- Livarno LUX
- Lonsonho
- LoraTap
- Luminea
- Malmbergs
- Melinera
- MOES
- Nedis
- Neo
- Nous
- ONENUO
- Samotech
- Silvercrest
- Smart9
- Tenky
- Tongou
- UseeLink
- Woox
- YANDHI
- Zemismart
et bien d'autres encore...
""")

    for device_type in sorted(devices_by_type.keys()):
        if devices_by_type[device_type]['devices']:
            with open('README.md', 'a') as f:
                f.write(f'\n## {devices_by_type[device_type]["fr"]}\n\n')
                f.write(create_device_table(devices_by_type[device_type]['devices'], lang='fr'))

    with open('README.md', 'a') as f:
        f.write("""
---

### Tuya Zigbee
Adds support for Tuya Zigbee devices

Some of the supported White Label Brands:
- Alecto
- Alice
- Avatto
- BSEED
- Blitzwolf
- eWeLight
- GiEX
- GIRIER
- Hangzlou
- Inmax
- Lidl
- Livarno LUX
- Lonsonho
- LoraTap
- Luminea
- Malmbergs
- Melinera
- MOES
- Nedis
- Neo
- Nous
- ONENUO
- Samotech
- Silvercrest
- Smart9
- Tenky
- Tongou
- UseeLink
- Woox
- YANDHI
- Zemismart
and many more..
""")

    for device_type in sorted(devices_by_type.keys()):
        if devices_by_type[device_type]['devices']:
            with open('README.md', 'a') as f:
                f.write(f'\n## {devices_by_type[device_type]["en"]}\n\n')
                f.write(create_device_table(devices_by_type[device_type]['devices'], lang='en'))

    with open('README.md', 'a') as f:
        f.write("""
---

## Changelog

""")
        f.write(get_git_log())

if __name__ == '__main__':
    main()
