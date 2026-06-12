// PDF export — Pro feature, V1 stub (requires expo-print and expo-sharing)
import { formatFoodCostPercent } from './format';

export function generateRecipePDFHTML({ recipe, ingredientCosts, metrics, currencySymbol = '$' }) {
  const rows = ingredientCosts
    .map(
      (ic) => `<tr>
        <td>${ic.name}</td>
        <td style="text-align:right">${currencySymbol}${ic.cost.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1A1A1A; }
        h1 { color: #2D6A4F; font-size: 24px; margin-bottom: 4px; }
        .meta { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #F5F5F0; padding: 10px; text-align: left; font-size: 13px; }
        td { padding: 10px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
        .summary { background: #F5F5F0; border-radius: 8px; padding: 16px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .summary-row.total { font-weight: bold; font-size: 16px; color: #2D6A4F; }
      </style>
    </head>
    <body>
      <h1>${recipe.name}</h1>
      <p class="meta">${recipe.category ?? ''} · Target food cost ${recipe.target_food_cost_percent ?? 30}%</p>
      <table>
        <thead><tr><th>Ingredient</th><th style="text-align:right">Cost</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">
        <div class="summary-row total"><span>Total Recipe Cost</span><span>${currencySymbol}${metrics.totalCost?.toFixed(2)}</span></div>
        ${metrics.costPerUnit != null ? `<div class="summary-row"><span>Cost per Unit</span><span>${currencySymbol}${metrics.costPerUnit?.toFixed(2)}</span></div>` : ''}
        ${metrics.recommendedPrice ? `<div class="summary-row"><span>Recommended Price / Unit</span><span>${currencySymbol}${metrics.recommendedPrice?.toFixed(2)}</span></div>` : ''}
        ${metrics.foodCostPercent != null ? `<div class="summary-row"><span>Food Cost %</span><span>${formatFoodCostPercent(metrics.foodCostPercent)}</span></div>` : ''}
        ${metrics.profit != null ? `<div class="summary-row"><span>Profit</span><span>${currencySymbol}${metrics.profit?.toFixed(2)}</span></div>` : ''}
      </div>
    </body>
    </html>
  `;
}
