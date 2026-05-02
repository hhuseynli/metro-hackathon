"""
Historical baseline lookups and load prediction from total_data_15min.csv.
The DataFrame is loaded once and cached in module scope.
"""

from __future__ import annotations
from pathlib import Path
import pandas as pd

_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "Data" / "total_data_15min.csv"
_df: pd.DataFrame | None = None
_peaks: dict[str, float] = {}


def _load() -> pd.DataFrame | None:
    global _df
    if _df is not None:
        return _df
    if not _DATA_PATH.exists():
        return None
    df = pd.read_csv(_DATA_PATH, parse_dates=["time_bin"])
    df["hour"]       = df["time_bin"].dt.hour
    df["minute_bin"] = (df["time_bin"].dt.minute // 15) * 15
    df["dayofweek"]  = df["time_bin"].dt.dayofweek
    _df = df
    return _df


def _demo_baseline(hour: int, dayofweek: int) -> float:
    """Synthetic time-of-day curve when CSV data is unavailable."""
    import math
    is_weekend = dayofweek >= 5
    # Two peaks: morning rush ~8-9h, evening rush ~17-18h
    morning = 180 * math.exp(-0.5 * ((hour - 8.5) / 1.2) ** 2)
    evening = 220 * math.exp(-0.5 * ((hour - 17.5) / 1.3) ** 2)
    midday  = 80  * math.exp(-0.5 * ((hour - 13.0) / 1.5) ** 2)
    base = morning + evening + midday + 20
    return base * (0.65 if is_weekend else 1.0)


def get_baseline(station: str, hour: int, minute: int, dayofweek: int) -> float:
    """Average passenger count for this station at this time-of-week."""
    df = _load()
    if df is None:
        return _demo_baseline(hour, dayofweek)
    mbin = (minute // 15) * 15
    mask = (
        (df["station"]    == station)  &
        (df["hour"]       == hour)     &
        (df["minute_bin"] == mbin)     &
        (df["dayofweek"]  == dayofweek)
    )
    subset = df.loc[mask, "passenger_count"]
    return float(subset.mean()) if len(subset) > 0 else 0.0


def get_station_peak(station: str) -> float:
    """Historical maximum passenger count in any 15-min bin for this station."""
    if station in _peaks:
        return _peaks[station]
    df = _load()
    if df is None:
        return 1000.0
    peak = float(df.loc[df["station"] == station, "passenger_count"].max() or 1000.0)
    _peaks[station] = peak
    return peak


def predict_load(
    current_inside: int,
    inflow_per_min: float,
    outflow_per_min: float,
    minutes_until_train: float,
) -> int:
    """Linear extrapolation of people on platform at next train arrival."""
    net = (inflow_per_min - outflow_per_min) * minutes_until_train
    return max(0, round(current_inside + net))
