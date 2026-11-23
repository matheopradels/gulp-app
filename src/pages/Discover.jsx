import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, List, MapPin } from 'lucide-react';
import { MapContainer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ensureBarsNear, formatDistance, nearestBars, subscribeToAllBars } from '../services/barService';
import BarSheet from '../components/BarSheet';
import VectorBasemap from '../components/VectorBasemap';
import useGeolocation from '../hooks/useGeolocation';

const PARIS = [48.8566, 2.3522];
const MAX_LIST = 60;
const MAX_PINS = 250; // pins détaillés (zoom proche)
const MAX_DOTS = 4000; // points néon (zoom large), dessinés en canvas : léger même par milliers
const PIN_ZOOM = 15;

// Suit la zone visible de la carte (et charge la base de bars de la ville qu'on regarde).
function ViewportWatcher({ onChange }) {
  const map = useMap();
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const fire = () => cb.current(map.getBounds(), map.getZoom());
    map.on('moveend zoomend resize', fire);
    fire();
    return () => map.off('moveend zoomend resize', fire);
  }, [map]);
  return null;
}

// Recentre la carte une fois, quand la position arrive (pas à chaque mise à
// jour GPS : sinon impossible de se promener sur la carte).
function CenterOnce({ lat, lng }) {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done && lat != null && lng != null) {
      map.setView([lat, lng], 15);
      setDone(true);
    }
  }, [lat, lng, done, map]);
  return null;
}

const pin = (fill, stroke, dot, size) =>
  L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.25}" viewBox="0 0 32 40"><path d="M16 2C9.37 2 4 7.37 4 14c0 9 12 24 12 24s12-15 12-24C28 7.37 22.63 2 16 2z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><circle cx="16" cy="14" r="5" fill="${dot}"/></svg>`,
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25],
    popupAnchor: [0, -size * 1.25],
    className: 'marker-standard',
  });
const ICON_BAR = pin('#CEFF00', '#000', '#000', 30);
const ICON_PARTNER = pin('#CEFF00', '#fff', '#000', 38);
const ICON_ME = L.divIcon({
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 0 4px rgba(56,189,248,.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: 'marker-standard',
});

const openDirections = (bar) =>
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}&travelmode=walking`,
    '_blank',
    'noopener'
  );

export default function Discover() {
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [bars, setBars] = useState([]);
  const [openBar, setOpenBar] = useState(null);
  const geo = useGeolocation();

  useEffect(() => subscribeToAllBars(setBars), []);

  // Charge la base de bars du coin (dès que la position est connue, ou Paris par défaut après 3 s).
  const hasPosition = geo.lat != null && geo.lng != null;
  useEffect(() => {
    if (hasPosition) {
      ensureBarsNear(geo.lat, geo.lng);
      return undefined;
    }
    const timer = setTimeout(() => ensureBarsNear(null, null), geo.error ? 0 : 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosition, geo.error]);

  const near = useMemo(() => nearestBars(bars, geo.lat, geo.lng, MAX_LIST), [bars, geo.lat, geo.lng]);

  const [viewport, setViewport] = useState(null); // { bounds, zoom }
  const onViewport = (bounds, zoom) => {
    setViewport({ bounds, zoom });
    const c = bounds.getCenter();
    ensureBarsNear(c.lat, c.lng);
  };
  const visible = useMemo(() => {
    if (!viewport) return [];
    const b = viewport.bounds.pad(0.15);
    const inView = bars.filter((bar) => b.contains([bar.lat, bar.lng]));
    const max = viewport.zoom >= PIN_ZOOM ? MAX_PINS : MAX_DOTS;
    if (inView.length <= max) return inView;
    const c = viewport.bounds.getCenter();
    return nearestBars(inView, c.lat, c.lng, max);
  }, [bars, viewport]);
  const showPins = viewport?.zoom >= PIN_ZOOM;

  const toolbar = (
    <div className="flex items-center justify-between pt-4 pb-3">
      <div className="flex items-center gap-2">
        <MapPin size={24} className="text-[#CEFF00]" />
        <h2 className="text-2xl font-black italic uppercase">Bars</h2>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setView(view === 'map' ? 'list' : 'map')}
          className="h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-1.5 text-sm font-bold"
        >
          {view === 'map' ? <List size={18} /> : <MapPin size={18} />}
          {view === 'map' ? 'Liste' : 'Carte'}
        </button>
      </div>
    </div>
  );

  const emptyHint = (
    <p className="text-sm text-zinc-400 text-center px-6">
      Aucun bar dans le coin pour l'instant.
    </p>
  );

  return (
    <div className="flex-1 flex flex-col animate-in">
      {toolbar}

      {view === 'list' ? (
        near.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">{emptyHint}</div>
        ) : (
          <div className="space-y-2">
            {near.slice(0, 60).map((bar) => (
              <button
                key={bar.id}
                onClick={() => setOpenBar(bar)}
                className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-center gap-3 active:border-[#CEFF00]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate">
                    {bar.name}
                    {bar.isPartner && <span className="ml-2 text-[10px] bg-[#CEFF00] text-black font-black px-1.5 py-0.5 rounded">PARTENAIRE</span>}
                  </span>
                  <span className="block text-xs text-zinc-500 truncate">
                    {[bar.address, bar.city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
                  </span>
                  {bar.offer && <span className="block text-xs text-[#CEFF00] font-semibold mt-0.5 truncate">{bar.offer}</span>}
                </span>
                {Number.isFinite(bar.distance) && <span className="text-xs text-zinc-400 shrink-0">{formatDistance(bar.distance)}</span>}
                <ChevronRight size={18} className="text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex-1 relative min-h-[420px] rounded-2xl overflow-hidden border border-zinc-800">
          <MapContainer center={PARIS} zoom={13} className="absolute inset-0 z-0" zoomControl={false} preferCanvas>
            <CenterOnce lat={geo.lat} lng={geo.lng} />
            <VectorBasemap />
            <ViewportWatcher onChange={onViewport} />
            {geo.lat != null && geo.lng != null && (
              <Marker position={[geo.lat, geo.lng]} icon={ICON_ME}>
                <Popup>Tu es ici</Popup>
              </Marker>
            )}
            {showPins
              ? visible.map((bar) => (
                  <Marker
                    key={bar.id}
                    position={[bar.lat, bar.lng]}
                    icon={bar.isPartner ? ICON_PARTNER : ICON_BAR}
                    title={bar.name}
                    eventHandlers={{ click: () => setOpenBar(bar) }}
                  />
                ))
              : visible.map((bar) => (
                  <CircleMarker
                    key={bar.id}
                    center={[bar.lat, bar.lng]}
                    radius={5}
                    pathOptions={{ color: '#000', weight: 1, fillColor: '#CEFF00', fillOpacity: 0.9 }}
                    eventHandlers={{ click: () => setOpenBar(bar) }}
                  />
                ))}
          </MapContainer>
          {visible.length === 0 && viewport && (
            <div className="absolute inset-x-3 bottom-3 z-10 bg-black/85 border border-zinc-800 rounded-xl py-3">{emptyHint}</div>
          )}
        </div>
      )}

      {view === 'list' && near.length > 0 && (
        <p className="text-[10px] text-zinc-600 text-center mt-3">Données des bars © contributeurs OpenStreetMap</p>
      )}
      <BarSheet bar={openBar} onClose={() => setOpenBar(null)} />
    </div>
  );
}
