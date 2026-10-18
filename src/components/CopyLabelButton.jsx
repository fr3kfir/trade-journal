import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without async clipboard access
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

// Copies a trade's buy/sell label for pasting onto a TradingView chart
export default function CopyLabelButton({ text, style }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-ghost"
      title={text}
      style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}
      onClick={async e => {
        e.stopPropagation();
        await copyText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
