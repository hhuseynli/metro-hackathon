# Data Reference

## Available Datasets

### 1. total_data_15min.csv
**Columns:** `station`, `time_bin`, `passenger_count`  
**Coverage:** 27 stations, Jan 2025 – Mar 2026, 15-min bins, ~909K rows  
**Use for:** Historical baseline, load prediction, time-of-day patterns

```python
import pandas as pd
df = pd.read_csv('total_data_15min.csv')
df['time_bin'] = pd.to_datetime(df['time_bin'])
df['hour'] = df['time_bin'].dt.hour
df['dayofweek'] = df['time_bin'].dt.dayofweek
# Peak hours per station
peak = df.groupby(['station','hour'])['passenger_count'].mean()
print(peak['Nizami'].sort_values(ascending=False).head(5))
```

---

### 2. Clean_passenger_data_01012025-31032026.csv
**Columns:** `date`, `station`, `gate`, `sernishin_sayi`  
**Coverage:** 27 stations, 38 gates, daily  
**Use for:** Gate-level inflow proxy if entrance cam fails

---

### 3. NFC_16_02_2026.csv
**Columns:** `Pan Hash`, `Used Time`, `Station Name`, `Station Entry`, ...  
**~290K rows, Feb 16 2026**  
**Use for:** Inflow event timestamps (seed FlowEngine)

```python
df = pd.read_csv('NFC_16_02_2026.csv')
df['Used Time'] = pd.to_datetime(df['Used Time'])
nizami_inflow = df[df['Station Name'] == 'Nizami'].sort_values('Used Time')
```

---

### 4. QR_16_02_2026.csv
**Columns:** `Payment Type`, `Used Time`, `Station`, `Gate Info`  
**~90K rows**

---

### 5. SC_16_02_2026.csv
**Columns:** `Payment Type`, `Operation Timestamp`, `Station`, `Gate Info`, `Activity Type`  
**~425K rows**

---

### 6. Weight Sensor Data
**What:** Per-car, per-train-visit occupancy, timestamped  
**Critical for:** KEY STAT derivation, zone→car mapping validation  
**Adjust column names in correlate.py to match actual file**

---

### 7. Camera Footage (AVI)
**Folders:** Entrance, Escalator, Platform, Train, Turnstile  
**Format:** AVI, overhead slightly angled  
**Use for:** YOLO person detection per zone

---

## All 27 Stations
20 Yanvar, 28-May, 8 Noyabr, Akhmedli, Avtovaghzal, Azadlig Prospekti, Bakmil, Darnagul, Elmlar Akademiyasi, Ganjlik, Hazi Aslanov, İçərişəhər, Jafar Jabbarly, Koroghlu, Memar Ajami, Nariman Narimanov, Neftchilar, Nizami, Sahil, Ulduz, Khalglar Dostlughu + 6 others

---

## Key Stat Query (run on weight data)

```python
import pandas as pd

df = pd.read_csv('data/weight_data.csv')  # adjust path and column names

# Adjust these column names to match actual file:
# train_visit_id — unique ID per train arrival
# car_number     — which car (1-5)
# occupancy_pct  — load percentage

stats = df.groupby('train_visit_id').agg(
    max_load=('occupancy_pct', 'max'),
    min_load=('occupancy_pct', 'min'),
).assign(imbalance=lambda x: x['max_load'] - x['min_load'])

print(f"Train visits analyzed:   {len(stats)}")
print(f"Avg imbalance:           {stats['imbalance'].mean():.1f}%")
print(f"Most crowded car avg:    {stats['max_load'].mean():.1f}%")
print(f"Least crowded car avg:   {stats['min_load'].mean():.1f}%")
print(f"Ratio:                   {stats['max_load'].mean() / stats['min_load'].mean():.2f}x")
```

---

## Inflow Proxy (if entrance cam unavailable)

```python
# Use transaction timestamps as inflow events
import pandas as pd

nfc = pd.read_csv('NFC_16_02_2026.csv')
qr  = pd.read_csv('QR_16_02_2026.csv')
sc  = pd.read_csv('SC_16_02_2026.csv')

nfc = nfc.rename(columns={'Used Time': 'timestamp', 'Station Name': 'station'})
qr  = qr.rename(columns={'Used Time': 'timestamp', 'Station': 'station'})
sc  = sc.rename(columns={'Operation Timestamp': 'timestamp', 'Station': 'station'})

all_entries = pd.concat([
    nfc[['timestamp','station']],
    qr[['timestamp','station']],
    sc[['timestamp','station']]
])
all_entries['timestamp'] = pd.to_datetime(all_entries['timestamp'])

# Inflow per 15-min bin per station
all_entries['bin'] = all_entries['timestamp'].dt.floor('15min')
inflow = all_entries.groupby(['station','bin']).size().reset_index(name='entries')
print(inflow[inflow['station'] == 'Nizami'].sort_values('entries', ascending=False).head(10))
```
