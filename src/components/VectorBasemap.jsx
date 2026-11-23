import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';

/**
 * Fond de carte OpenFreeMap (style sombre) : gratuit, sans clé ni quota,
 * utilisable dans une app publique. Données © OpenStreetMap.
 * https://openfreemap.org
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export default function VectorBasemap() {
  const map = useMap();
  useEffect(() => {
    const layer = L.maplibreGL({ style: STYLE_URL, interactive: false });
    layer.addTo(map);
    map.attributionControl?.setPrefix(false);
    map.attributionControl?.addAttribution(ATTRIBUTION);
    return () => {
      map.attributionControl?.removeAttribution(ATTRIBUTION);
      map.removeLayer(layer);
    };
  }, [map]);
  return null;
}
