import { collection, deleteDoc, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

/**
 * Prix de la pinte, renseigné par les joueurs.
 * prices/{barId}_{uid} = { barId, userId, pinte, happy, updatedAt }
 * Un seul signalement par joueur et par bar (il le met à jour quand le prix
 * change). Le prix affiché est la médiane des signalements récents : un
 * plaisantin ne peut pas la faire bouger tout seul.
 */
const PRICES = 'prices';
export const PRICE_MIN = 2;
export const PRICE_MAX = 20;
const FRESH_MS = 365 * 24 * 3600 * 1000; // au-delà d'un an, un prix n'est plus fiable

const priceId = (barId, uid) => `${barId}_${uid}`;

export const parsePrice = (raw) => {
  const n = Math.round(Number(String(raw).replace(',', '.')) * 100) / 100;
  return Number.isFinite(n) && n >= PRICE_MIN && n <= PRICE_MAX ? n : null;
};

export const formatPrice = (n) =>
  n == null ? '' : `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const median = (values) => {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 100) / 100;
};

/** Résumé des prix d'un bar à partir des signalements. */
export const summarizePrices = (reports, myUid) => {
  const now = Date.now();
  const fresh = reports.filter((r) => now - r.updatedAt < FRESH_MS);
  const used = fresh.length ? fresh : reports;
  return {
    pinte: median(used.map((r) => r.pinte).filter((n) => n != null)),
    happy: median(used.map((r) => r.happy).filter((n) => n != null)),
    count: used.length,
    lastUpdate: used.reduce((m, r) => Math.max(m, r.updatedAt), 0) || null,
    mine: reports.find((r) => r.userId === myUid) || null,
  };
};

export const subscribeToBarPrices = (barId, callback) => {
  if (!isFirebaseConfigured || !barId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, PRICES), where('barId', '==', String(barId)), limit(60)),
    (snap) =>
      callback(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            userId: data.userId,
            pinte: typeof data.pinte === 'number' ? data.pinte : null,
            happy: typeof data.happy === 'number' ? data.happy : null,
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
          };
        })
      ),
    (error) => {
      console.warn('Prix indisponibles :', error?.code || error);
      callback([]);
    }
  );
};

export const removeMyPrice = (user, barId) => deleteDoc(doc(db, PRICES, priceId(barId, user.id)));
