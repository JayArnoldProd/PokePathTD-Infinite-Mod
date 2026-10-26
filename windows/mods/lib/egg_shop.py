"""Pure egg-pool helpers; never modify roster entries or the input save."""


def species_id(entry, ids):
    if isinstance(entry, str):
        return ids.get(entry)
    if not isinstance(entry, dict):
        return None
    for key in ('specieKey', 'key', 'species'):
        value = entry.get(key)
        if isinstance(value, str) and value in ids:
            return ids[value]
    if isinstance(entry.get('specie'), (dict, str)):
        result = species_id(entry['specie'], ids)
        if result is not None:
            return result
    value = entry.get('id')
    if isinstance(value, (str, int)):
        if str(value) in ids:
            return ids[str(value)]
        try:
            return int(value)
        except ValueError:
            pass
    return None


def remaining_eggs(data, catalog, egg_keys=None):
    save = data.get('save', data)
    ids = catalog['speciesIds']
    owned = {species_id(p, ids) for p in save.get('team', []) + save.get('box', [])}
    seen = set()
    result = []
    for key in catalog['eggKeys'] if egg_keys is None else egg_keys:
        pid = ids.get(key)
        if pid is None or pid in owned or pid in seen:
            continue
        seen.add(pid)
        result.append(key)
    return result
