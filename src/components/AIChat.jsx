import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { buildTradesContext } from '../utils/aiContext';

const KEY = 'apex_ai_chat_v1';

const SUGGESTIONS = [
  'תן לי סיכום של 5 העסקאות הכי מוצלחות והכי גרועות שלי',
  'מה ממוצע ההפסד לעסקה — החודש, בחצי שנה ובשנה האחרונה?',
  'איך הביצועים שלי לפי חודשים בחצי השנה האחרונה?',
  'באיזה setup או סקטור אני הכי מרוויח?',
];

export default function AIChat({ trades, onOpenSettings }) {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const context = buildTradesContext(trades);
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-20), context }),
      });
      const d = await r.json();
      if (d.error === 'no-api-key') {
        setError('no-api-key');
      } else if (d.error) {
        setMessages(m => [...m, { role: 'assistant', content: `שגיאה: ${d.error}` }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: d.reply }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `שגיאת רשת: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    if (confirm('למחוק את כל השיחה?')) setMessages([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Sparkles size={16} color="var(--navy)" />
          שאל שאלות חופשיות על ביצועי המסחר שלך — התשובות מבוססות על היומן שלך.
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={clearChat} style={{ fontSize: 12, flexShrink: 0 }}>
            <Trash2 size={13} style={{ marginInlineEnd: 4 }} /> נקה שיחה
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-panel)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 480 }}>
            <Bot size={32} color="var(--text-faint)" style={{ marginBottom: 10 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>נסה לשאול משהו כמו:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="btn btn-ghost" style={{ fontSize: 12.5, textAlign: 'right' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: m.role === 'user' ? 'var(--navy)' : 'var(--bg-card)', color: m.role === 'user' ? '#fff' : 'var(--text-muted)',
            }}>
              {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div style={{
              background: m.role === 'user' ? 'var(--navy)' : 'var(--bg-card)',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              borderRadius: 12, padding: '10px 14px', fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Bot size={14} />
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--text-faint)' }}>
              חושב...
            </div>
          </div>
        )}

        {error === 'no-api-key' && (
          <div style={{ background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 10, padding: '12px 14px', fontSize: 12.5 }}>
            כדי להשתמש בצ'אט ה-AI צריך להגדיר מפתח API של Anthropic (Claude) בהגדרות.{' '}
            {onOpenSettings && (
              <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: 'var(--red)', textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5, padding: 0 }}>
                פתח הגדרות
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <textarea
          className="input"
          rows={1}
          placeholder="שאל אותי כל דבר על העסקאות שלך..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, resize: 'none', fontFamily: 'inherit' }}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
