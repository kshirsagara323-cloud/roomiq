import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatINR } from '../lib/utils';

const pin = L.divIcon({ className: 'pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] });

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [points, map]);
  return null;
}

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center[0], center[1], zoom]); // eslint-disable-line
  return null;
}

function Picker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Shows listings on a free OpenStreetMap map.
export function ListingsMap({ items, height = 520 }) {
  const withGeo = items.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const points = withGeo.map((p) => [p.lat, p.lng]);
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={points[0] || [20.59, 78.96]} zoom={points.length ? 12 : 5} scrollWheelZoom style={{ height: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} />
        {withGeo.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pin}>
            <Popup>
              <Link to={`/property/${p.id}`} className="pop">
                <strong>{p.name}</strong>
                <span>{formatINR(p.price)}/month · {p.type}</span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// Single location, optionally clickable so owners can drop the pin on their building.
export function LocationMap({ lat, lng, onPick, height = 300, center, zoom = 15 }) {
  const c = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : center || [20.59, 78.96];
  const focus = center || c;
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={focus} zoom={zoom} scrollWheelZoom={!!onPick} style={{ height: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter center={focus} zoom={zoom} />
        {onPick && <Picker onPick={onPick} />}
        {Number.isFinite(lat) && Number.isFinite(lng) && <Marker position={[lat, lng]} icon={pin} />}
      </MapContainer>
    </div>
  );
}
