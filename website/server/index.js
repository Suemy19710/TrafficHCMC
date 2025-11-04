// server/index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TOMTOM_KEY = process.env.TOMTOM_API_KEY;
const PY_SERVICE_URL = process.env.PY_SERVICE_URL || "http://localhost:8001";

const minSpeedKmh = 3.0;

async function getTomTomRoute(origin, destination) {
  const start = `${origin.lat},${origin.lng}`;
  const end = `${destination.lat},${destination.lng}`;
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${TOMTOM_KEY}&traffic=false&computeBestOrder=false`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`TomTom error ${r.status}`);
  const data = await r.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");

  const lengthMeters = route.summary?.lengthInMeters ?? 0;
  // gather polyline points from legs -> points
  const points = [];
  (route.legs || []).forEach(leg => {
    (leg.points || []).forEach(p => points.push([p.latitude, p.longitude]));
  });

  return {
    route_km: Number((lengthMeters / 1000).toFixed(3)),
    polyline: points,
    summary: route.summary || null,
  };
}

async function predictPointSpeed(lat, lng, iso) {
  const r = await fetch(`${PY_SERVICE_URL}/predict_point`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, iso_datetime: iso }),
  });
  if (!r.ok) throw new Error(`Python service error ${r.status}`);
  const j = await r.json();
  return j; // { speed_kmh, feature_importance? }
}

app.post("/predict", async (req, res) => {
  try {
    const {
      origin,            // {lat, lng}
      destination,       // {lat, lng}
      iso_datetime,      // "2025-09-30T17:00:00+07:00"
      time_calibration = 1.10,
    } = req.body;

    // 1) Get route from TomTom (distance + polyline)
    const route = await getTomTomRoute(origin, destination);

    // 2) Predict speed at both ends (via Python model)
    const p1 = await predictPointSpeed(origin.lat, origin.lng, iso_datetime);
    const p2 = await predictPointSpeed(destination.lat, destination.lng, iso_datetime);

    const v1 = Math.max(p1.speed_kmh, minSpeedKmh);
    const v2 = Math.max(p2.speed_kmh, minSpeedKmh);
    const avgKmh = (v1 + v2) / 2.0;

    // 3) ETA (minutes)
    const etaMin = (route.route_km / avgKmh) * 60 * time_calibration;

    res.json({
      iso_datetime,
      origin,
      destination,
      distances: {
        route_km: route.route_km,
        straight_km_est: null, // optional to add your haversine if you want
      },
      speeds: {
        origin_kmh: Number(v1.toFixed(2)),
        destination_kmh: Number(v2.toFixed(2)),
        average_kmh: Number(avgKmh.toFixed(2)),
      },
      eta_minutes: Number(etaMin.toFixed(1)),
      route_polyline: route.polyline,
      tomtom_summary: route.summary,
      origin_feature_importance: p1.feature_importance ?? null, // optional
      destination_feature_importance: p2.feature_importance ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Prediction failed", detail: err.message });
  }
});

app.listen(8000, () => console.log("API running on http://localhost:8000"));