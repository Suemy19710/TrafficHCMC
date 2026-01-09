import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Clock, MapPin, Zap, TrendingUp, Calendar } from "lucide-react";

const API_URL = "http://localhost:8001/predict_route"; 

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  mapSection: {
    flex: 1,
    padding: '16px'
  },
  mapContainer: {
    height: '100%',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  sidebar: {
    width: '384px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
    overflowY: 'auto',
    color: '#fff'
  },
  sidebarContent: {
    padding: '24px'
  },
  header: {
    marginBottom: '24px'
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  iconBox: {
    padding: '8px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0
  },
  card: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    marginBottom: '24px'
  },
  instructionCard: {
    display: 'flex',
    gap: '12px'
  },
  instructionText: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: '4px 0'
  },
  instructionSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '2px 0'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1'
  },
  clearBtn: {
    fontSize: '12px',
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    transition: 'color 0.2s'
  },
  pointCard: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '8px',
    transition: 'all 0.3s'
  },
  pointCardActive: {
    background: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)'
  },
  pointCardInactive: {
    background: 'rgba(30, 41, 59, 0.3)',
    borderColor: 'rgba(148, 163, 184, 0.2)'
  },
  pointCardRed: {
    background: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  pointHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  dotActive: {
    background: '#4ade80'
  },
  dotRed: {
    background: '#f87171'
  },
  dotInactive: {
    background: '#475569'
  },
  pointLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1'
  },
  coords: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
    marginLeft: '24px'
  },
  inputGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    background: 'linear-gradient(to right, #3b82f6, #2563eb)',
    color: '#fff',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
    marginBottom: '24px'
  },
  buttonDisabled: {
    background: 'linear-gradient(to right, #334155, #334155)',
    cursor: 'not-allowed',
    boxShadow: 'none',
    opacity: 0.7
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  },
  statCard: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid'
  },
  statCardBlue: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))',
    borderColor: 'rgba(59, 130, 246, 0.2)'
  },
  statCardPurple: {
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.1))',
    borderColor: 'rgba(168, 85, 247, 0.2)'
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff'
  },
  statUnit: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  detailsCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    marginBottom: '16px'
  },
  detailsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    fontSize: '14px',
    marginBottom: '8px'
  },
  detailLabel: {
    color: '#94a3b8'
  },
  detailValue: {
    color: '#fff',
    fontWeight: '500'
  },
  divider: {
    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
    paddingTop: '8px',
    marginTop: '8px'
  },
  detailSubtext: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px'
  },
  expandable: {
    background: 'rgba(30, 41, 59, 0.3)',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
    marginBottom: '16px'
  },
  summary: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#cbd5e1',
    listStyle: 'none',
    transition: 'background 0.2s'
  },
  expandableContent: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(148, 163, 184, 0.2)'
  },
  pre: {
    fontSize: '12px',
    color: '#94a3b8',
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
    margin: 0
  }
};

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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Prediction failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOrigin(null);
    setDest(null);
    setResult(null);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus {
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.3);
        }
        .clear-btn:hover {
          color: #fff;
        }
        .summary-hover:hover {
          background: rgba(51, 65, 85, 0.3);
        }
      `}</style>
      <div style={styles.container}>
        {/* Map Section */}
        <div style={styles.mapSection}>
          <div style={styles.mapContainer}>
            <MapContainer center={[10.78,106.70]} zoom={12} style={{ height:"100%", width:"100%" }}>
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <ClickToPick onPick={pickPoint} />
              {origin && <Marker position={origin} />}
              {dest && <Marker position={dest} />}
              {origin && dest && (
                <Polyline 
                  positions={[origin, dest]} 
                  pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Control Panel */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarContent}>
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerTop}>
                <div style={styles.iconBox}>
                  <Navigation size={24} color="#60a5fa" />
                </div>
                <h1 style={styles.title}>Route Predictor</h1>
              </div>
              <p style={styles.subtitle}>AI-powered traffic analysis and ETA prediction</p>
            </div>

            {/* Instructions */}
            <div style={styles.card}>
              <div style={styles.instructionCard}>
                <MapPin size={20} color="#60a5fa" style={{marginTop: '2px', flexShrink: 0}} />
                <div>
                  <p style={styles.instructionText}>
                    <strong style={{color: '#fff'}}>Click on map:</strong>
                  </p>
                  <p style={styles.instructionSubtext}>1st click → Origin</p>
                  <p style={styles.instructionSubtext}>2nd click → Destination</p>
                  <p style={styles.instructionSubtext}>3rd click → Reset & new origin</p>
                </div>
              </div>
            </div>

            {/* Selected Points */}
            <div style={{marginBottom: '24px'}}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Selected Points</span>
                {(origin || dest) && (
                  <button 
                    onClick={reset}
                    style={styles.clearBtn}
                    className="clear-btn"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div>
                <div style={{...styles.pointCard, ...(origin ? styles.pointCardActive : styles.pointCardInactive)}}>
                  <div style={styles.pointHeader}>
                    <div style={{...styles.dot, ...(origin ? styles.dotActive : styles.dotInactive)}}></div>
                    <span style={styles.pointLabel}>Origin</span>
                  </div>
                  {origin && (
                    <p style={styles.coords}>
                      {origin[0].toFixed(5)}, {origin[1].toFixed(5)}
                    </p>
                  )}
                </div>

                <div style={{...styles.pointCard, ...(dest ? styles.pointCardRed : styles.pointCardInactive)}}>
                  <div style={styles.pointHeader}>
                    <div style={{...styles.dot, ...(dest ? styles.dotRed : styles.dotInactive)}}></div>
                    <span style={styles.pointLabel}>Destination</span>
                  </div>
                  {dest && (
                    <p style={styles.coords}>
                      {dest[0].toFixed(5)}, {dest[1].toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* DateTime Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <Calendar size={16} color="#60a5fa" />
                Departure Time (ISO)
              </label>
              <input 
                type="text"
                value={when} 
                onChange={e=>setWhen(e.target.value)}
                style={styles.input}
                placeholder="2025-09-30T17:00:00+07:00"
              />
            </div>

            {/* Action Button */}
            <button 
              onClick={predict} 
              disabled={!origin || !dest || loading}
              style={{...styles.button, ...(!origin || !dest || loading ? styles.buttonDisabled : {})}}
            >
              {loading ? (
                <>
                  <div style={styles.spinner}></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  Predict Route
                </>
              )}
            </button>

            {/* Results */}
            {result && !result.error && (
              <div>
                {/* Quick Stats */}
                <div style={styles.statsGrid}>
                  <div style={{...styles.statCard, ...styles.statCardBlue}}>
                    <div style={styles.statHeader}>
                      <Clock size={16} color="#60a5fa" />
                      <span style={styles.statLabel}>ETA</span>
                    </div>
                    <p style={styles.statValue}>{result.eta_minutes}</p>
                    <p style={styles.statUnit}>minutes</p>
                  </div>

                  <div style={{...styles.statCard, ...styles.statCardPurple}}>
                    <div style={styles.statHeader}>
                      <TrendingUp size={16} color="#a78bfa" />
                      <span style={styles.statLabel}>Avg Speed</span>
                    </div>
                    <p style={styles.statValue}>{result.speeds.average_kmh}</p>
                    <p style={styles.statUnit}>km/h</p>
                  </div>
                </div>

                {/* Detailed Info */}
                <div style={styles.detailsCard}>
                  <h3 style={styles.detailsTitle}>Route Details</h3>
                  
                  <div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Distance</span>
                      <span style={styles.detailValue}>{result.distances.route_km} km</span>
                    </div>

                    <div style={styles.divider}>
                      <p style={{...styles.detailLabel, fontSize: '12px', marginBottom: '4px'}}>Origin nearest:</p>
                      <p style={{...styles.detailValue, fontSize: '12px'}}>{result.origin.nearest_location.name}</p>
                      <p style={styles.detailSubtext}>({result.origin.nearest_location.distance_km} km away)</p>
                    </div>

                    <div style={styles.divider}>
                      <p style={{...styles.detailLabel, fontSize: '12px', marginBottom: '4px'}}>Destination nearest:</p>
                      <p style={{...styles.detailValue, fontSize: '12px'}}>{result.destination.nearest_location.name}</p>
                      <p style={styles.detailSubtext}>({result.destination.nearest_location.distance_km} km away)</p>
                    </div>
                  </div>
                </div>

                {/* Expandable Features */}
                <details style={styles.expandable}>
                  <summary style={styles.summary} className="summary-hover">
                    Origin Features
                  </summary>
                  <div style={styles.expandableContent}>
                    <pre style={styles.pre}>
                      {JSON.stringify(result.features_used.origin, null, 2)}
                    </pre>
                  </div>
                </details>

                <details style={styles.expandable}>
                  <summary style={styles.summary} className="summary-hover">
                    Destination Features
                  </summary>
                  <div style={styles.expandableContent}>
                    <pre style={styles.pre}>
                      {JSON.stringify(result.features_used.destination, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}