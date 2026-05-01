"""
Weight-Camera correlation analysis.
Run once to produce zone→car mapping and the key imbalance stat.
"""
import json
import sys
import pandas as pd
import numpy as np


def load_weight_data(path: str) -> pd.DataFrame:
    if path.endswith('.xlsx'):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df


def compute_key_stat(weight_df: pd.DataFrame, group_col: str = 'train_visit_id',
                     load_col: str = 'occupancy_pct') -> dict:
    if group_col not in weight_df.columns or load_col not in weight_df.columns:
        print(f"[WARN] Columns not found. Available: {list(weight_df.columns)}")
        print("Adjust group_col / load_col to match actual column names.")
        return {}

    stats = weight_df.groupby(group_col).agg(
        max_load=(load_col, 'max'),
        min_load=(load_col, 'min'),
        mean_load=(load_col, 'mean'),
    )
    stats['imbalance'] = stats['max_load'] - stats['min_load']

    result = {
        'avg_imbalance_pct': round(stats['imbalance'].mean(), 1),
        'most_crowded_car_avg': round(stats['max_load'].mean(), 1),
        'least_crowded_car_avg': round(stats['min_load'].mean(), 1),
        'ratio': round(stats['max_load'].mean() / max(stats['min_load'].mean(), 0.01), 2),
        'train_visits_analyzed': int(len(stats)),
    }

    print("=== KEY STAT ===")
    print(f"Average car load imbalance per train: {result['avg_imbalance_pct']}%")
    print(f"Most crowded car avg:   {result['most_crowded_car_avg']}%")
    print(f"Least crowded car avg:  {result['least_crowded_car_avg']}%")
    print(f"Ratio:                  {result['ratio']}x")
    print(f"Based on {result['train_visits_analyzed']} train visits")
    print("================")

    with open('key_stat.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("→ Saved to key_stat.json")
    return result


def correlate_zones_to_cars(zone_counts_json: str, weight_df: pd.DataFrame,
                             tolerance_seconds: int = 60) -> list:
    with open(zone_counts_json) as f:
        zone_data = json.load(f)

    correlations = []
    if 'train_visit_id' not in weight_df.columns:
        print("[WARN] train_visit_id column not found — skipping correlation")
        return correlations

    for visit_id, group in weight_df.groupby('train_visit_id'):
        car_loads = {}
        if 'car_number' in group.columns and 'occupancy_pct' in group.columns:
            car_loads = group.set_index('car_number')['occupancy_pct'].to_dict()
        correlations.append({
            'visit_id': visit_id,
            'car_loads': car_loads,
        })

    return correlations


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python correlate.py <weight_data_path>")
        sys.exit(1)
    weight_path = sys.argv[1]
    df = load_weight_data(weight_path)
    print(f"Loaded {len(df)} rows. Columns: {list(df.columns)}")
    compute_key_stat(df)
