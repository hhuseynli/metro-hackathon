import time
from collections import deque


class FlowEngine:
    """
    Sliding-window inflow/outflow tracker for a single station.
    Feed it entry/exit events; it returns rates and a running inside count.
    """

    def __init__(self, window_seconds: int = 60):
        self.window = window_seconds
        self.inflow_events: deque[float] = deque()
        self.outflow_events: deque[float] = deque()
        self.inside_count: int = 0

    def record_inflow(self, count: int = 1) -> None:
        now = time.time()
        for _ in range(count):
            self.inflow_events.append(now)
        self.inside_count += count
        self._trim()

    def record_outflow(self, count: int = 1) -> None:
        now = time.time()
        for _ in range(count):
            self.outflow_events.append(now)
        self.inside_count = max(0, self.inside_count - count)
        self._trim()

    def _trim(self) -> None:
        cutoff = time.time() - self.window
        while self.inflow_events and self.inflow_events[0] < cutoff:
            self.inflow_events.popleft()
        while self.outflow_events and self.outflow_events[0] < cutoff:
            self.outflow_events.popleft()

    def _rate(self, events: deque) -> float:
        self._trim()
        return len(events) / (self.window / 60)

    def get_metrics(self) -> dict:
        return {
            "inflow_per_min":  round(self._rate(self.inflow_events),  1),
            "outflow_per_min": round(self._rate(self.outflow_events), 1),
            "inside_count":    self.inside_count,
        }


def seed_from_transactions(engine: FlowEngine, csv_path: str, station_name: str) -> int:
    """Seed a FlowEngine from NFC/QR/SC transaction CSV for a given station."""
    import pandas as pd
    df = pd.read_csv(csv_path)
    col_map = {
        "Station Name": "station",
        "Station": "station",
        "Used Time": "ts",
        "Operation Timestamp": "ts",
    }
    df = df.rename(columns={c: v for c, v in col_map.items() if c in df.columns})
    if "station" not in df.columns or "ts" not in df.columns:
        return 0
    df = df[df["station"] == station_name].copy()
    df["ts"] = pd.to_datetime(df["ts"], errors="coerce")
    df = df.dropna(subset=["ts"]).sort_values("ts").tail(200)
    for _ in df.itertuples():
        engine.record_inflow(1)
    return len(df)
