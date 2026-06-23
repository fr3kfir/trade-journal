import ExcelJS from 'exceljs';

const MONTH_NAMES_HE = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר',
];

export async function exportMonthlyExcel(trades, year, month, riskPerTrade = 400) {
  // Filter trades for the selected month with realized P&L
  const monthTrades = trades
    .filter(t => {
      if (t.pnl == null || !t.date) return false;
      // Parse date string directly to avoid timezone shifts
      const [y, m] = t.date.split('-').map(Number);
      return y === year && m === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`[Excel Export] ${year}-${String(month).padStart(2,'0')}: found ${monthTrades.length} trades`, monthTrades.map(t => t.date));

  if (monthTrades.length === 0) {
    throw new Error(`No closed trades found for ${MONTH_NAMES_HE[month - 1]} ${year}`);
  }

  // Load template from public folder
  const response = await fetch('/template.xlsx');
  if (!response.ok) throw new Error('Template not found');
  const buffer = await response.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  const monthLabel = `${MONTH_NAMES_HE[month - 1]} ${year}`;

  // Rename sheet to the month
  ws.name = monthLabel;

  // Title in row 1
  const titleCell = ws.getCell('A1');
  titleCell.value = `יומן מסחר — ${monthLabel}`;
  titleCell.font = { bold: true, size: 13 };

  // Update commission + notes headers
  ws.getCell('K3').value = 'עמלה ($)';
  ws.getCell('K3').font = { bold: true };
  ws.getCell('L3').value = 'הערות';
  ws.getCell('L3').font = { bold: true };

  // Set risk per trade in N4
  ws.getCell('N4').value = riskPerTrade;

  // Calculate statistics directly in JS — more reliable than Excel formulas
  const pnls     = monthTrades.map(t => parseFloat(t.pnl) || 0);
  const wins     = pnls.filter(p => p > 0).length;
  const losses   = pnls.filter(p => p < 0).length;
  const total    = monthTrades.length;
  const totalPnl = Math.round(pnls.reduce((s, p) => s + p, 0) * 100) / 100;
  const totalR   = riskPerTrade > 0 ? Math.round((totalPnl / riskPerTrade) * 100) / 100 : 0;
  const winRate  = total > 0 ? (wins / total * 100).toFixed(1) + '%' : '0%';

  ws.getCell('N5').value  = wins;
  ws.getCell('N6').value  = losses;
  ws.getCell('N7').value  = total;
  ws.getCell('N8').value  = totalPnl;
  ws.getCell('N9').value  = totalR;
  ws.getCell('N10').value = winRate;

  // Helper: force numeric or null
  const n = (v) => (v != null && v !== '') ? parseFloat(v) : null;

  // Fill trade rows starting at row 5
  monthTrades.forEach((trade, i) => {
    const rowNum = 5 + i;
    const row = ws.getRow(rowNum);

    row.getCell(1).value = i + 1;                                       // A: מספר עסקה
    row.getCell(2).value = trade.date;                                   // B: תאריך
    row.getCell(3).value = trade.ticker;                                 // C: טיקר
    row.getCell(4).value = trade.direction === 'L' ? 'Long' : 'Short';  // D: כיוון עסקה
    row.getCell(5).value = n(trade.entry);                              // E: מחיר כניסה
    row.getCell(6).value = n(trade.stop);                               // F: SL
    row.getCell(7).value = n(trade.quantity);                           // G: כמות מניות
    row.getCell(8).value = n(trade.exit);                               // H: מחיר סגירה
    row.getCell(9).value = n(trade.r_value);                            // I: סיכון (R)
    row.getCell(10).value = n(trade.pnl);                              // J: רווח/הפסד — must be number for SUM/COUNTIF
    row.getCell(11).value = n(trade.commission) || null;               // K: עמלה ($)
    row.getCell(12).value = [                                           // L: הערות
      trade.notes,
      trade.setup ? `Setup: ${trade.setup}` : null,
      trade.execution_score ? `Execution: ${'★'.repeat(trade.execution_score)}` : null,
      trade.followed_rules === false ? '⚠ Rules not followed' : null,
    ].filter(Boolean).join(' | ') || '';

    row.commit();
  });

  // Generate and download
  const outputBuffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([outputBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `יומן מסחר - ${monthLabel}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return monthTrades.length;
}
