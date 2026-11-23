import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { subscribeToMyPerformances } from '../services/performanceService';

/** Mes perfs en direct (compte en ligne ou journal du téléphone en visiteur). */
export default function useMyPerformances() {
  const { user } = useUser();
  const [perfs, setPerfs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    return subscribeToMyPerformances(user, (list) => {
      setPerfs(list);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.online]);
  return { perfs, loaded };
}
