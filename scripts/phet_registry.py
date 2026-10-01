"""Register complete, byte-verified PhET additions without changing other activities."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_SCREENS = {'area-builder': 2, 'forces-and-motion-basics': 4,
                    'energy-skate-park-basics': 3, 'vector-addition': 4}


def verified_additions(root=ROOT):
    manifest = json.loads((root/'modules/phet/manifest.json').read_text(encoding='utf-8'))
    lock = json.loads((root/'modules/phet/lock.json').read_text(encoding='utf-8'))
    rows = {row['id']: row for row in lock['files']}
    activities = []
    for item in manifest['additions']:
        expected_path = f"vendor/phet/{item['id']}.html"
        if item['entry'] != expected_path or item['id'] not in rows:
            raise ValueError('Invalid or unlocked PhET entry: '+item['id'])
        row = rows[item['id']]
        raw = (root/expected_path).read_bytes()
        if len(raw) != row['bytes'] or hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError('PhET source does not match modules/phet/lock.json: '+item['id'])
        activities.append({
            'id': item['id'], 'title': item['title'], 'zone': item['zone'],
            'grades': item['grades'], 'kind': item['kind'], 'adapter': 'phet',
            'entry': expected_path+'?locale=zh_CN&webgl=false&allowLinks=false',
            'description': item['description'], 'playHint': item['playHint'],
            'content': item['content'], 'screenCount': item['screenCount'],
            'license': 'CC BY-NC 4.0 (official HTML; preserve embedded notices)',
            'source': item['source'], 'progressMode': 'visit-only', 'completeUpstream': True
        })
    return activities


def register_expansion(root=ROOT):
    additions = verified_additions(root)
    inventory_path = root/'config/inventory.json'
    inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
    lock_path = root/'config/upstream-lock.json'
    upstream = json.loads(lock_path.read_text(encoding='utf-8'))
    rows = json.loads((root/'modules/phet/lock.json').read_text(encoding='utf-8'))['files']
    for activity in additions:
        # Match by ID, even if a future downloader orders its lock differently.
        row = next(record for record in rows if record['id'] == activity['id'])
        name = activity['entry'].split('?')[0]
        old = inventory['files'].get(name)
        if old and old['sha256'] != row['sha256']:
            raise ValueError('Pinned PhET source changed; review before registering: '+name)
        inventory['files'][name] = {'bytes': row['bytes'], 'sha256': row['sha256']}
        upstream['files'][name] = {**inventory['files'][name], 'url': row['url'],
                                   'license': activity['license']}
    addition_ids = {activity['id'] for activity in additions}
    inventory['activities'] = [activity for activity in inventory['activities']
                               if activity['id'] not in addition_ids]+additions
    simulations = [activity for activity in inventory['activities'] if activity['adapter'] == 'phet']
    inventory['counts'].update({
        'phetSimulations': len(simulations),
        'phetScreens': sum(activity.get('screenCount', ORIGINAL_SCREENS.get(activity['id'], 0))
                           for activity in simulations),
        'launchableActivities': len(inventory['activities'])
    })
    for path, value in [(inventory_path, inventory), (lock_path, upstream)]:
        if json.loads(path.read_text(encoding='utf-8')) != value:
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return additions


if __name__ == '__main__':
    print(json.dumps({'registered': [item['id'] for item in register_expansion()]}))
