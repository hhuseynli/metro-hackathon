ZONE_TO_CAR = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5}

NUDGE_MESSAGES = {
    'az': "Arxaya doğru irəliləyin — boş vaqonlar sizi gözləyir",
    'en': "Move toward the rear — less crowded cars ahead",
    'ru': "Пройдите в хвост поезда — там свободнее",
}


def decide_nudge(zone_counts: dict, threshold_ratio: float = 1.5) -> dict:
    if not zone_counts:
        return {'active': False, 'reason': 'No data'}

    counts = {int(k): v for k, v in zone_counts.items()}
    total = sum(counts.values())

    if total == 0:
        return {'active': False, 'reason': 'Platform empty'}

    max_zone = max(counts, key=counts.get)
    min_zone = min(counts, key=counts.get)
    max_count = counts[max_zone]
    min_count = counts[min_zone]

    ratio = max_count / max(min_count, 1)

    if ratio >= threshold_ratio:
        return {
            'active': True,
            'target_zone': min_zone,
            'target_car': ZONE_TO_CAR.get(min_zone, min_zone + 1),
            'overcrowded_zone': max_zone,
            'overcrowded_car': ZONE_TO_CAR.get(max_zone, max_zone + 1),
            'nudge_type': 'lighting+sound',
            'intensity': 'subtle' if ratio < 2.5 else 'moderate',
            'ratio': round(ratio, 2),
            'reason': f'Zone {max_zone} ({max_count}p) vs Zone {min_zone} ({min_count}p)',
            'messages': NUDGE_MESSAGES,
        }

    return {
        'active': False,
        'ratio': round(ratio, 2),
        'reason': f'Distribution balanced (ratio {ratio:.2f})',
    }
