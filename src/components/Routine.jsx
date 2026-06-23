import { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const TIMES = ['pre_market', 'market_open', 'during_market', 'market_close', 'post_market'];
const TIME_LABELS = { pre_market: 'Pre-Market', market_open: 'Market Open', during_market: 'During Market', market_close: 'Market Close', post_market: 'Post-Market' };

const DEFAULT_TASKS = [
  { task_name: 'Review watchlist', task_category: 'pre_market', order_index: 1 },
  { task_name: 'Check pre-market movers', task_category: 'pre_market', order_index: 2 },
  { task_name: 'Write If/Then scenarios', task_category: 'pre_market', order_index: 3 },
  { task_name: 'Review open positions', task_category: 'market_open', order_index: 1 },
  { task_name: 'Check sector rotation', task_category: 'during_market', order_index: 1 },
  { task_name: 'Review all trades taken', task_category: 'market_close', order_index: 1 },
  { task_name: 'Update trading journal', task_category: 'post_market', order_index: 1 },
  { task_name: 'Daily check-in survey', task_category: 'post_market', order_index: 2 },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function Routine() {
  const { data: templates, add: addTemplate, remove: removeTemplate } = useLocalStore('apex_routine_templates',
    DEFAULT_TASKS.map((t, i) => ({ ...t, id: `default-${i}`, is_custom: false }))
  );
  const { data: completions, add: addCompletion, remove: removeCompletion } = useLocalStore('apex_routine_completions', []);
  const [newTask, setNewTask] = useState('');
  const [newCat, setNewCat] = useState('pre_market');

  const today = todayKey();
  const todayCompletions = new Set(completions.filter(c => c.date === today).map(c => c.task_id));

  const toggle = (taskId) => {
    if (todayCompletions.has(taskId)) {
      const comp = completions.find(c => c.date === today && c.task_id === taskId);
      if (comp) removeCompletion(comp.id);
    } else {
      addCompletion({ task_id: taskId, date: today });
    }
  };

  const addCustom = () => {
    if (!newTask.trim()) return;
    addTemplate({ task_name: newTask, task_category: newCat, order_index: 99, is_custom: true });
    setNewTask('');
  };

  const totalDone = TIMES.reduce((sum, t) => sum + templates.filter(t2 => t2.task_category === t && todayCompletions.has(t2.id)).length, 0);
  const totalTasks = templates.length;
  const pct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Daily Routine</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Today — {today}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--navy)' }}>{pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{totalDone}/{totalTasks} done</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--bg-card)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--navy)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      {/* Task groups */}
      {TIMES.map(time => {
        const tasks = templates.filter(t => t.task_category === time).sort((a, b) => a.order_index - b.order_index);
        if (!tasks.length) return null;
        const done = tasks.filter(t => todayCompletions.has(t.id)).length;
        return (
          <div key={time} className="panel" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{TIME_LABELS[time]}</span>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{done}/{tasks.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(t => {
                const done = todayCompletions.has(t.id);
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => toggle(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: done ? 'var(--green)' : 'var(--text-faint)' }}>
                      {done ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: done ? 'var(--text-faint)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                      {t.task_name}
                    </span>
                    {t.is_custom && (
                      <button onClick={() => removeTemplate(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-faint)' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add custom task */}
      <div className="panel" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>Add Custom Task</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Task name..." onKeyDown={e => e.key === 'Enter' && addCustom()} style={{ flex: 1 }} />
          <select className="input" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: 140 }}>
            {TIMES.map(t => <option key={t} value={t}>{TIME_LABELS[t]}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addCustom}><Plus size={14} /></button>
        </div>
      </div>
    </div>
  );
}
