import { useState, useEffect } from 'react';

export default function useGeolocation(options = {}) {
  const [state, setState] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    timestamp: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, error: 'unsupported' }));
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setState({ lat, lng, accuracy, error: null, timestamp: pos.timestamp });
      },
      (err) => {
        const code = { 1: 'denied', 2: 'unavailable', 3: 'timeout' }[err.code] || 'unknown';
        setState((s) => ({ ...s, error: code }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
        ...options,
      }
    );

    return () => navigator.geolocation.clearWatch(watcher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
