import json
import os
import re

def get_device_info(driver_dir):
    try:
        with open(f'{driver_dir}/driver.compose.json') as f:
            driver_info = json.load(f)
    except FileNotFoundError:
        return None

    device_name = driver_info.get('name', {}).get('en', 'Unknown')
    manufacturer_names = driver_info.get('zigbee', {}).get('manufacturerName', [])
    product_ids = driver_info.get('zigbee', {}).get('productId', [])

    return {
        'device_name': device_name,
        'manufacturer_names': manufacturer_names,
        'product_ids': product_ids,
    }

def main():
    all_devices = []
    for driver in os.listdir('drivers'):
        driver_dir = os.path.join('drivers', driver)
        if os.path.isdir(driver_dir):
            device_info = get_device_info(driver_dir)
            if device_info:
                all_devices.append(device_info)

    with open('all_devices.json', 'w') as f:
        json.dump(all_devices, f, indent=2)

if __name__ == '__main__':
    main()
