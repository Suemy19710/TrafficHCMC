from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import math
from pytz import timezone

MODEL_PATH = "model/dt_model.pkl"
DF_PATH = "model/merged_df.pkl"
FEAT_PATH = "model/feature_cols.pkl"

model = joblib.load(MODEL_PATH)
merged_df = joblib.load(DF_PATH)
feature_cols = joblib.load(FEAT_PATH)

hcmc_tz = timezone("Asia/Ho_Chi_Minh")
MIN_SPEED_KMH = 3.0           # floor to avoid division by zero
ROUTE_FACTOR = 1.30           # straight->road multiplier
TIME_CALIBRATION = 1.10       # add buffer for lights/junctions

hcmc_locations = {
    "District_1":   {"lat": 10.7757, "lon": 106.7009},
    "Thu_Thiem":    {"lat": 10.7835, "lon": 106.7215},
    "Tan_Son_Nhat": {"lat": 10.8181, "lon": 106.6519},
    "Binh_Thanh":   {"lat": 10.8106, "lon": 106.7091},
    "Phu_My_Hung":  {"lat": 10.7272, "lon": 106.7057},
}

def haversine_km(lat1, lon1, lat2, lon2):
    dLat = (lat2 - lat1) * math.pi / 180.0
    dLon = (lon2 - lon1) * math.pi / 180.0
    lat1 = lat1 * math.pi / 180.0
    lat2 = lat2 * math.pi / 180.0
    a = (math.sin(dLat/2) ** 2 +
         math.sin(dLon/2) ** 2 * math.cos(lat1) * math.cos(lat2))
    return 2 * math.asin(math.sqrt(a)) * 6371.0

def find_nearest_spots(address_lat, address_lon):
    best_name, best_des = None, float("inf")
    for name, p in hcmc_locations.items():
        des = haversine_km(address_lat, address_lon, p["lat"], p["lon"])
        if des < best_des:
            best_name, best_des = name, des
    return best_name, best_des  # (name, km)

def get_features_for(loc_name: str, requested_time: pd.Timestamp):
    df_loc = merged_df[merged_df["Location"] == loc_name]
    if df_loc.empty:
        raise ValueError(f"No data for location '{loc_name}'.")
    closest_index = (df_loc["Timestamp"] - requested_time).abs().sort_values().index[0]
    matched_row = df_loc.loc[closest_index]
    X=  pd.DataFrame([matched_row[feature_cols].to_dict()])
    return X, matched_row["Timestamp"]

def minutes_from_speed(distance_km, speed_kmh, min_speed_kmh=MIN_SPEED_KMH, calibration=TIME_CALIBRATION):
    best_speed = max(float(speed_kmh), min_speed_kmh)
    return (distance_km / best_speed) * 60.0 * calibration

app = FastAPI(title="Traffic in HCMC")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["content-type", "authorization"],
)

class Point(BaseModel):
    lat: float
    lng: float

class PredictRouteReq(BaseModel):
    origin: Point
    destination: Point
    iso_datetime: str
    route_factor: float | None = None
    time_calibration: float | None = None

@app.get("/health")
def health():
    return {"status": "ok", "features": feature_cols}
@app.post("/predict_route")
def predict_route(req: PredictRouteReq):
    # parse time
    requested_time = pd.Timestamp(req.iso_datetime)
    if requested_time.tzinfo is None: 
        requested_time = requested_time.tz_localize(hcmc_tz)  # assign timezone
    else:
        requested_time = requested_time.tz_convert(hcmc_tz)   # convert timezone

    # nearest named spots for both ends
    origin_name, origin_distance_km = find_nearest_spots(req.origin.lat, req.origin.lng)
    destination_name, destination_distance_km = find_nearest_spots(req.destination.lat, req.destination.lng)

    # features & predictions
    Xorigin, origin_matched_time = get_features_for(origin_name, requested_time)
    Xdestination, destination_matched_time = get_features_for(destination_name, requested_time)
    v_origin = max(float(model.predict(Xorigin)[0]), MIN_SPEED_KMH)
    v_destination = max(float(model.predict(Xdestination)[0]), MIN_SPEED_KMH)
    v_avg = (v_origin + v_destination) / 2.0

    # distance (straight * factor)
    straight_km = haversine_km(req.origin.lat, req.origin.lng,
                               req.destination.lat, req.destination.lng)
    route_factor = req.route_factor or ROUTE_FACTOR
    route_km = straight_km * route_factor

    # ETA estimate
    time_cal = req.time_calibration or TIME_CALIBRATION
    eta_minutes = minutes_from_speed(route_km, v_avg, calibration=time_cal)

    return {
        "iso_datetime_requested": str(requested_time),
        "origin": {
            "lat": req.origin.lat,
            "lng": req.origin.lng,
            "nearest_location": {"name": origin_name, "distance_km": round(origin_distance_km, 3)},
            "matched_time": str(origin_matched_time),
            "predicted_speed_kmh": round(v_origin, 2),
        },
        "destination": {
            "lat": req.destination.lat,
            "lng": req.destination.lng,
            "nearest_location": {"name": destination_name, "distance_km": round(destination_distance_km, 3)},
            "matched_time": str(destination_matched_time),
            "predicted_speed_kmh": round(v_destination, 2),
        },
        "distances": {
            "straight_km": round(straight_km, 3),
            "route_km": round(route_km, 3),
            "route_factor": route_factor
        },
        "speeds": {
            "average_kmh": round(v_avg, 2)
        },
        "eta_minutes": round(eta_minutes, 1),
        "features_used": {
            "origin": {k: (None if pd.isna(v) else float(v) if isinstance(v,(int,float)) else v)
                       for k, v in Xorigin.iloc[0].to_dict().items()},
            "destination": {k: (None if pd.isna(v) else float(v) if isinstance(v,(int,float)) else v)
                            for k, v in Xdestination.iloc[0].to_dict().items()},
        },
    }