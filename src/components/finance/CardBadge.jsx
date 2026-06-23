import { CreditCard } from 'lucide-react';

export default function CardBadge({ card }) {
  if (!card) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: card.color || '#6366f1' }}
    >
      <CreditCard size={10} />
      {card.name}
      {card.lastFour ? ` ****${card.lastFour}` : ''}
    </span>
  );
}
