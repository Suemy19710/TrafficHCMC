from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import math
from pytz import timezone 
from math import radians, sin, cos, asin, sqrt

MODEL_PATH = "model/dt_model.pkl"
DF_PATH = "model/merged_df.pkl"
FEAT_PATH = "model/feature_cols.pkl"

model = joblib.load(MODEL_PATH)
merged_df = joblib.load(DF_PATH)
feature_cols = joblib.load(FEAT_PATH)

hcmc_tz = timezone("Asia/Ho_Chi_Minh")
hcmc_locations = {
    "District_1":   {"lat": 10.7757, "lon": 106.7009},
    "Thu_Thiem":    {"lat": 10.7835, "lon": 106.7215},
    "Tan_Son_Nhat": {"lat": 10.8181, "lon": 106.6519},
    "Binh_Thanh":   {"lat": 10.8106, "lon": 106.7091},
    "Phu_My_Hung":  {"lat": 10.7272, "lon": 106.7057},
}

def haversine(lat1, lon1, lat2, lon2):
    dLat = (lat2 - lat1) * math.pi / 180.0
    dLon = (lon2 - lon2) * math.pi / 180.0

    lat1 = (lat1) * math.pi / 180.0
    lat2 = (lat2) * math.pi / 180.0

    a = (pow(math.sin(dLat / 2), 2) + 
         pow(math.sin(dLon / 2), 2) * 
             math.cos(lat1) * math.cos(lat2))
    r = 6371.0
    return  2 * math.asin(math.sqrt(a)) * r

def find_nearest_spots(address_lat, address_lon): 
    best_name = None
    best_d = 1e9 # 1,000,000,000 km (just a placeholder)
    for name, p in hcmc_locations.items():
        d = haversine(address_lat, address_lon, p["lat"], p["lon"])
        if d < best_d:
            best_name = name
            best_d = d
    return best_name, best_d

def get_features_for (loc_name: str, when_ts: pd.Timestamp):
    df_loc = merged_df[merged_df["Location"] == loc_name]
    if df_loc.empty:
        raise ValueError(f"No data for location '{loc_name}'.")
    idx = (df_loc["Timestamp"] - when_ts).abs().sort_values().index[0]
    row = df_loc.loc[idx]
    X = pd.DataFrame([row[feature_cols].to_dict()])
    return X

app = FastAPI(title="Traffic in HCMC")

class PredictPoint(BaseModel):
    lat: float
    lon: float
    iso_datetime: str 

@app.get("/health")
def health():
    return {"status": "ok", "features": feature_cols}

@app.post("/predict")
def predict(req: PredictPoint):
    loc_name = find_nearest_spots(req.lat, req.lon)

    when_ts = pd.Timestamp(req.iso_datetime)
    if when_ts.tzinfo is None:
        when_ts = when_ts.tz_localize(hcmc_tz)
    else:
        when_ts = when_ts.tz_convert(hcmc_tz)

    X = get_features_for(loc_name, when_ts)
    yhat = float(model.predict(X)[0])

    # optional: return DT importances if available
    try:
        fi = {c: float(v) for c, v in zip(feature_cols, model.feature_importances_)}
    except Exception:
        fi = None

    return {
        "loc_name": loc_name,
        "timestamp_used": str(when_ts),
        "speed_kmh": round(yhat, 2),
        "feature_importance": fi
    }
