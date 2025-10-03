import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";

function ClickToSet({ onPick }) {
  useMapEvents({
    click(e) { onPick([e.latlng.lat, e.latlng.lng]); }
  });
  return null;
}

export default function App() {
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [when, setWhen] = useState("2025-09-30T17:00:00+07:00");
  const [res, setRes] = useState(null);

  const pickPoint = (latlng) => {
    if (!origin) setOrigin(latlng);
    else if (!dest) setDest(latlng);
    else { setOrigin(latlng); setDest(null); setRes(null); }
  };

  const predict = async () => {
    const body = {
      origin: { lat: origin[0], lng: origin[1] },
      destination: { lat: dest[0], lng: dest[1] },
      iso_datetime: when,
      time_calibration: 1.10
    };
    const r = await fetch("http://localhost:8000/predict", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setRes(await r.json());
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, padding:16 }}>
      <div>
        <MapContainer center={[10.78,106.70]} zoom={12} style={{ height:"80vh" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickToSet onPick={pickPoint} />
          {origin && <Marker position={origin} />}
          {dest && <Marker position={dest} />}
          {res?.route_polyline && <Polyline positions={res.route_polyline} />}
        </MapContainer>
      </div>

      <div>
        <h2>🚦 Predict Speed & ETA</h2>
        <label>DateTime (ISO):</label>
        <input style={{ width:"100%" }} value={when} onChange={e=>setWhen(e.target.value)} />
        <div style={{ marginTop:12, display:"flex", gap:8 }}>
          <button onClick={predict} disabled={!origin || !dest}>Predict</button>
          <button onClick={()=>{ setOrigin(null); setDest(null); setRes(null); }}>Reset</button>
        </div>

        {res && !res.error && (
          <div style={{ marginTop:16, padding:12, border:"1px solid #ddd", borderRadius:8 }}>
            <h3>Results</h3>
            <p><b>Route distance:</b> {res.distances.route_km} km</p>
            <p><b>Avg speed:</b> {res.speeds.average_kmh} km/h</p>
            <p><b>ETA:</b> {res.eta_minutes} minutes</p>
            <details style={{ marginTop:8 }}>
              <summary>Details</summary>
              <pre style={{ whiteSpace:"pre-wrap" }}>{JSON.stringify(res, null, 2)}</pre>
            </details>
          </div>
        )}

        {res?.error && (
          <div style={{ marginTop:16, color:"#b00020" }}>
            <b>Error:</b> {res.detail || "Prediction failed"}
          </div>
        )}
      </div>
    </div>
  );
}
