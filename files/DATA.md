# Data Reference

## Available Datasets

### 1. total_data_15min.csv
**What:** 15-minute passenger count bins per station  
**Coverage:** 27 stations, Jan 1 2025 – Mar 31 2026 (15 months)  
**Rows:** ~909,000  
**Columns:** `station`, `time_bin`, `passenger_count`  
**Use for:** Time-of-day and day-of-week pattern analysis, peak hour identification, predictive layer

```python
import pandas as pd
df = pd.read_csv('total_data_15min.csv')
df['time_bin'] = pd.to_datetime(df['time_bin'])
df['hour'] = df['time_bin'].dt.hour
df['dayofweek'] = df['time_bin'].dt.dayofweek
```

---

### 2. Clean_passenger_data_01012025-31032026.csv
**What:** Gate-level daily passenger counts  
**Coverage:** 27 stations, 38 gates, Jan 2025 – Mar 2026  
**Rows:** ~157,000  
**Columns:** `date`, `station`, `gate`, `sernishin_sayi`  
**Use for:** Which gates are busiest, entry point bottleneck analysis

---

### 3. NFC_16_02_2026.csv
**What:** Individual NFC card transactions, Feb 16 2026  
**Rows:** ~290,000  
**Columns:** `Pan Hash`, `Used Time`, `Processing Finish Timestamp`, `Used Amount`, `Payment Type`, `Payment Token Type`, `Route Code`, `Station Name`, `Station Entry`, `Organization Name`  
**Use for:** Ground truth of passenger entry times at specific gates on a real day

---

### 4. QR_16_02_2026.csv
**What:** QR payment transactions, Feb 16 2026  
**Rows:** ~90,000  
**Columns:** `Payment Type`, `Used Time`, `Server Timestamp`, `Used Amount`, `Route Name`, `Operator Name`, `Station`, `Gate Info`

---

### 5. SC_16_02_2026.csv
**What:** Smart Card transactions, Feb 16 2026  
**Rows:** ~425,000  
**Columns:** `Payment Type`, `Operation Timestamp`, `Server Timestamp`, `Cumulative Fare Or Product Price`, `Activity Type`, `Validation Status`, `Route Name`, `Station`, `Operator Name`, `Gate Info`

---

### 6. Passenger_density_16_02_2026.xlsx
**What:** Passenger density data for Feb 16 2026  
**Use for:** Validation against transaction data

---

### 7. Weight Sensor Data (separate folder)
**What:** Per-car, per-train-visit passenger counts derived from weight, timestamped  
**Critical for:** Zone→car mapping correlation  
**Format:** Per-car occupancy % or passenger count, with train arrival timestamp and station

---

### 8. Camera Footage (separate folder — not uploaded)
**What:** AVI format, overhead slightly angled, platform coverage  
**Folders:** Entrance, Escalator, Platform, Train, Turnstile  
**Use for:** YOLO person detection, zone segmentation

---

## Key Data Relationships

```
Camera timestamp ──────────────────────┐
                                       ▼
Weight timestamp ──────────► CORRELATE → zone_X → car_Y mapping

Station entry time (NFC/QR/SC) ──────► how many entered before this train
total_data_15min ────────────────────► expected load at this time of day
```

---

## Zone→Car Mapping (to be derived by Person 4)

The platform frame should be divided into N horizontal zones where N = number of cars per train.

**Steps:**
1. Load a sample AVI frame
2. Identify platform boundaries in frame
3. Divide width into equal zones (or use visual markers if visible)
4. For each train visit: count persons per zone at T-minus-2min (before train arrives)
5. Match with weight data at same timestamp: which car had what load
6. Derive: zone_1 → car_1 correlation coefficient, etc.

**Expected finding:** Zone 1 (near main entrance) → Car 1-2 consistently overloaded

---

## Stations Available in Data
20 Yanvar, 28-May, 8 Noyabr, Akhmedli, Avtovaghzal, Azadlig Prospekti, Bakmil, Darnagul, Elmlar Akademiyasi, Ganjlik, Hazi Aslanov, İçərişəhər, Jafar Jabbarly, Koroghlu, Memar Ajami, Nariman Narimanov, Neftchilar, Nizami, Sahil, Ulduz, Khalglar Dostlughu, and others (27 total)

---

## Quick Analysis Snippets

### Peak hours by station
```python
df = pd.read_csv('total_data_15min.csv')
df['time_bin'] = pd.to_datetime(df['time_bin'])
df['hour'] = df['time_bin'].dt.hour
peak = df.groupby(['station', 'hour'])['passenger_count'].mean().reset_index()
print(peak[peak['station'] == 'Nizami'].sort_values('passenger_count', ascending=False).head(5))
```

### Imbalance stat from weight data
```python
# After loading weight data
imbalance = weight_df.groupby('train_visit_id').apply(
    lambda x: x['occupancy_pct'].max() - x['occupancy_pct'].min()
).mean()
print(f"Average car imbalance per train: {imbalance:.1f}%")
```
