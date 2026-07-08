// Shared UI constants — kept out of component files so React Fast Refresh
// can hot-reload components cleanly.

export const STAGES = [
  { key: 'setup', label: 'Setup', color: '#6366f1' },
  { key: 'entry', label: 'Entry', color: '#0ea5e9' },
  { key: 'add',   label: 'Add',   color: '#f59e0b' },
  { key: 'exit',  label: 'Exit',  color: '#ef4444' },
  { key: 'post',  label: 'Post',  color: '#8b5cf6' },
];

export const CLIP_COLORS = { long: '#34d399', short: '#f87171', universe: '#60a5fa' };
export const CLIP_BG     = { long: 'rgba(52,211,153,0.08)', short: 'rgba(248,113,113,0.08)', universe: 'rgba(96,165,250,0.08)' };
