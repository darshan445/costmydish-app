// CSV import — Pro feature, V1 stub
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );
  return { headers, rows };
}

export function mapCSVToIngredients(headers, rows, mapping) {
  return rows
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = row[i] ?? ''; });
      return {
        name: obj[mapping.name] ?? '',
        purchase_price: parseFloat(obj[mapping.purchase_price]) || 0,
        purchase_quantity: parseFloat(obj[mapping.purchase_quantity]) || 1,
        purchase_unit: obj[mapping.purchase_unit] ?? 'g',
        waste_percent: parseFloat(obj[mapping.waste_percent]) || 0,
        notes: obj[mapping.notes] ?? '',
      };
    })
    .filter((i) => i.name !== '');
}
