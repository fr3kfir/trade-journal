export default function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}
