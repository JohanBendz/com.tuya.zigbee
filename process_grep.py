import re
import json

def get_device_info(line):
    driver_path = line.split(':')[0]
    driver_dir = '/'.join(driver_path.split('/')[:-1])

    try:
        with open(f'{driver_dir}/driver.compose.json') as f:
            driver_info = json.load(f)
        device_name = driver_info['name']['en']
    except FileNotFoundError:
        device_name = 'Unknown'

    manufacturer_id = ''
    match = re.search(r'"(.*?)"', line)
    if match:
        manufacturer_id = match.group(1)

    return device_name, manufacturer_id

with open('grep_output.txt') as f:
    lines = f.readlines()

with open('temp_device_list.txt', 'a') as f:
    f.write('| Device Name | Manufacturer ID | Product Link |\n')
    f.write('|---|---|---|\n')
    for line in lines:
        if 'manufacturerName' in line:
            device_name, manufacturer_id = get_device_info(line)
            if manufacturer_id:
                f.write(f'| {device_name} | `{manufacturer_id}` | |\n')
