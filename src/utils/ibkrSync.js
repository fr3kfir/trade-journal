// Server-side IBKR sync: the API fetches the Flex report and merges it into
// the store; on "pending" we keep polling the same report reference.
export async function runServerSync() {
  let params = 'step=sync';
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`/api/ibkr?${params}`);
    const d = await r.json();
    if (d.ok) return d;
    if (d.pending && d.refCode && d.dlUrl) {
      params = `step=sync&refCode=${encodeURIComponent(d.refCode)}&dlUrl=${encodeURIComponent(d.dlUrl)}`;
      await new Promise(res => setTimeout(res, 8000));
      continue;
    }
    throw new Error(d.error || 'Sync failed');
  }
  throw new Error('Report took too long — try again in a moment');
}
