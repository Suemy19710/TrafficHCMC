import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const API_URL = "http://localhost:8001/predict_route"; 

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) { onPick([e.latlng.lat, e.latlng.lng]); }
  });
  return null;
}

export default function App() {
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [when, setWhen] = useState("2025-09-30T17:00:00+07:00");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPoint = (latlng) => {
    if (!origin) setOrigin(latlng);
    else if (!dest) setDest(latlng);
    else { setOrigin(latlng); setDest(null); setResult(null); }
  };

  const predict = async () => {
    if (!origin || !dest) return;
    setLoading(true);
    try {
      const body = {
        origin: { lat: origin[0], lng: origin[1] },
        destination: { lat: dest[0], lng: dest[1] },
        iso_datetime: when
      };
      const { data } = await axios.post(API_URL, body);
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, height:"100vh", padding:16 }}>
      <div>
        <MapContainer center={[10.78,106.70]} zoom={12} style={{ height:"100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToPick onPick={pickPoint} />
          {origin && <Marker position={origin} />}
          {dest && <Marker position={dest} />}
          {origin && dest && <Polyline positions={[origin, dest]} />}
        </MapContainer>
      </div>

      <div>
        <h2>🚦 Predict Speed & Travel Time</h2>
        <p>Click map: first = Origin, second = Destination</p>
        <label>DateTime (ISO):</label>
        <input style={{ width:"100%" }} value={when} onChange={e=>setWhen(e.target.value)} />
        <div style={{ marginTop:12, display:"flex", gap:8 }}>
          <button onClick={predict} disabled={!origin || !dest || loading}>
            {loading ? "Predicting..." : "Predict"}
          </button>
          <button onClick={()=>{ setOrigin(null); setDest(null); setResult(null); }}>Reset</button>
        </div>

        {result && !result.error && (
          <div style={{ marginTop:16, padding:12, border:"1px solid #ddd", borderRadius:8 }}>
            <h3>Results</h3>
            <p><b>Origin nearest:</b> {result.origin.nearest_location.name}
              ({result.origin.nearest_location.distance_km} km)</p>
            <p><b>Destination nearest:</b> {result.destination.nearest_location.name}
              ({result.destination.nearest_location.distance_km} km)</p>
            <p><b>Route distance:</b> {result.distances.route_km} km</p>
            <p><b>Average speed:</b> {result.speeds.average_kmh} km/h</p>
            <p><b>ETA:</b> {result.eta_minutes} minutes</p>

            <details style={{ marginTop:8 }}>
              <summary>Features used (origin)</summary>
              <pre style={{ whiteSpace:"pre-wrap" }}>
                {JSON.stringify(result.features_used.origin, null, 2)}
              </pre>
            </details>

            <details style={{ marginTop:8 }}>
              <summary>Features used (destination)</summary>
              <pre style={{ whiteSpace:"pre-wrap" }}>
                {JSON.stringify(result.features_used.destination, null, 2)}
              </pre>
            </details>
          </div>
        )}

      </div>
    </div>
  );
}
