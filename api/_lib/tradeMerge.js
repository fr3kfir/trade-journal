// Shared merge logic for the trades store.
//
// Trade IDs from IBKR changed format over time (symbol+datetime vs tradeID),
// so dedupe uses both the id and a content key of the execution itself.

export const isIbkr = (t) => typeof t?.id === 'string' && t.id.startsWith('ibkr-');

export const contentKey = (t) =>
  `${(t.ticker || '').toUpperCase()}|${t.date || ''}|${t.quantity ?? ''}|${t.entry ?? ''}`;

// Fields that IBKR is authoritative for. Everything else (setup, notes,
// thesis, r_value, chart_images, scores...) belongs to the user and is
// preserved across syncs.
const BROKER_FIELDS = ['ticker', 'date', 'direction', 'quantity', 'entry', 'pnl', 'commission', 'open_close'];

const TOMBSTONE_CAP = 2000;

export function emptyTombstones(raw) {
  return {
    ids:  Array.isArray(raw?.ids)  ? raw.ids  : [],
    keys: Array.isArray(raw?.keys) ? raw.keys : [],
  };
}

export function addTombstones(tombstones, ids = [], keys = []) {
  const t = emptyTombstones(tombstones);
  const idSet  = new Set([...t.ids, ...ids.filter(x => typeof x === 'string')]);
  const keySet = new Set([...t.keys, ...keys.filter(x => typeof x === 'string')]);
  return {
    ids:  [...idSet].slice(-TOMBSTONE_CAP),
    keys: [...keySet].slice(-TOMBSTONE_CAP),
  };
}

export function isDeleted(trade, tombstones) {
  const t = emptyTombstones(tombstones);
  return t.ids.includes(trade.id) || (isIbkr(trade) && t.keys.includes(contentKey(trade)));
}

// Merge freshly-imported IBKR trades into the existing store.
// - manual trades are never touched
// - an incoming trade that matches an existing ibkr trade (by id, or by
//   content when the id format differs) updates broker fields in place
// - tombstoned trades stay deleted
export function mergeIbkrTrades(existing, incoming, tombstones) {
  const safeExisting = Array.isArray(existing) ? existing.filter(t => t && t.id) : [];
  const manual       = safeExisting.filter(t => !isIbkr(t));
  const existingIbkr = safeExisting.filter(isIbkr);

  const byId = new Map(existingIbkr.map(t => [t.id, t]));
  const byKey = new Map();
  for (const t of existingIbkr) {
    const k = contentKey(t);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(t);
  }
  const claimed = new Set();

  let added = 0, updated = 0;
  const mergedIbkr = new Map(existingIbkr.map(t => [t.id, t]));

  for (const inc of incoming) {
    if (!inc?.id || isDeleted(inc, tombstones)) continue;

    let match = byId.get(inc.id);
    if (!match) {
      const candidates = byKey.get(contentKey(inc)) || [];
      match = candidates.find(c => !claimed.has(c.id));
    }

    if (match) {
      claimed.add(match.id);
      const next = { ...match };
      for (const f of BROKER_FIELDS) {
        if (inc[f] !== undefined && inc[f] !== null && inc[f] !== '') next[f] = inc[f];
      }
      // pnl may legitimately go from null (open) to a number (closed), incl. 0
      if (inc.pnl !== undefined) next.pnl = inc.pnl;
      if (JSON.stringify(next) !== JSON.stringify(match)) updated++;
      mergedIbkr.set(match.id, next);
    } else {
      mergedIbkr.set(inc.id, inc);
      added++;
    }
  }

  const merged = [...mergedIbkr.values(), ...manual]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return { merged, added, updated };
}

// Merge a full-state push from a client with the server copy: the client list
// wins, but ibkr trades the client has never seen (added by a background sync
// while the client was stale) are kept instead of silently wiped.
export function mergeClientPush(serverTrades, clientTrades, tombstones) {
  const client = Array.isArray(clientTrades) ? clientTrades.filter(t => t && t.id) : [];
  const server = Array.isArray(serverTrades) ? serverTrades.filter(t => t && t.id) : [];

  const clientIds  = new Set(client.map(t => t.id));
  const clientKeys = new Set(client.filter(isIbkr).map(contentKey));

  const serverOnly = server.filter(t =>
    isIbkr(t) &&
    !clientIds.has(t.id) &&
    !clientKeys.has(contentKey(t)) &&
    !isDeleted(t, tombstones)
  );

  const merged = [...client.filter(t => !isDeleted(t, tombstones)), ...serverOnly]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return { merged, serverOnly: serverOnly.length };
}
