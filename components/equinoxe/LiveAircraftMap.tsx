"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import styles from "./LiveAircraftMap.module.css";

interface Aircraft {
  icao24: string;
  callsign: string | null;
  country: string | null;
  longitude: number;
  latitude: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
}

const POLL_INTERVAL_MS = 45000;
const WORLD_CENTER: [number, number] = [20, 15];

export default function LiveAircraftMap() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/tracking/aircraft");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { aircraft?: Aircraft[] };
        if (!cancelled) {
          setAircraft(data.aircraft ?? []);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Positions indisponibles pour le moment.");
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={styles.container}>
      <MapContainer
        center={WORLD_CENTER}
        zoom={3}
        scrollWheelZoom
        preferCanvas
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          className={styles.darkTiles}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — positions : <a href="https://opensky-network.org">OpenSky Network</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {aircraft.map((a) => (
          <CircleMarker
            key={a.icao24}
            center={[a.latitude, a.longitude]}
            radius={2.5}
            pathOptions={{ color: "#43a047", fillColor: "#43a047", fillOpacity: 0.85, weight: 1 }}
          >
            <Popup>
              <strong>{a.callsign ?? a.icao24}</strong>
              <br />
              {a.country}
              <br />
              Altitude : {a.altitude != null ? `${Math.round(a.altitude)} m` : "n/a"}
              <br />
              Vitesse : {a.velocity != null ? `${Math.round(a.velocity * 3.6)} km/h` : "n/a"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className={styles.status}>
        {aircraft.length} appareil(s) en vol
        {lastUpdated ? ` · mis à jour ${lastUpdated.toLocaleTimeString("fr-FR")}` : ""}
        {error ? <span className={styles.statusError}> · {error}</span> : null}
      </div>
    </div>
  );
}
