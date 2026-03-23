import {
  LayoutDashboard, TrendingUp, Briefcase, BarChart2,
  BookOpen, ClipboardCheck, Zap, GraduationCap, CheckSquare, ChevronRight, X, Receipt
} from 'lucide-react';

const SECTIONS = [
  {
    group: 'TRADING',
    items: [
      { key: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
      { key: 'trades',     label: 'Trade Log',     icon: TrendingUp },
      { key: 'portfolio',  label: 'Portfolio',     icon: Briefcase },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      { key: 'stats',      label: 'Statistics',    icon: BarChart2 },
    ],
  },
  {
    group: 'MINDSET',
    items: [
      { key: 'journal',    label: 'Journal',       icon: BookOpen },
      { key: 'survey',     label: 'Daily Check-in',icon: ClipboardCheck },
      { key: 'scenarios',  label: 'If / Then',     icon: Zap },
    ],
  },
  {
    group: 'TOOLS',
    items: [
      { key: 'learning',   label: 'Learning',      icon: GraduationCap },
      { key: 'routine',    label: 'Daily Routine',  icon: CheckSquare },
      { key: 'tax',        label: 'Tax Report',     icon: Receipt },
    ],
  },
];

export default function Sidebar({ active, onSelect, mobileOpen, onMobileClose }) {
  const handleSelect = (key) => {
    onSelect(key);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
            zIndex: 49, display: 'none',
          }}
          className="mobile-backdrop"
        />
      )}

      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/logo.svg" alt="ApexJournal" style={{ height: 32, display: 'block' }} />
          {/* Close button — mobile only */}
          <button
            onClick={onMobileClose}
            className="sidebar-close-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {SECTIONS.map(section => (
            <div key={section.group} style={{ marginBottom: 6 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-faint)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '8px 10px 4px',
              }}>
                {section.group}
              </div>
              {section.items.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 8, border: 'none',
                      cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                      background: isActive ? '#EFF6FF' : 'transparent',
                      color: isActive ? 'var(--navy)' : 'var(--text-muted)',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 13.5,
                      transition: 'all 0.12s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {isActive && <ChevronRight size={13} strokeWidth={2} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
