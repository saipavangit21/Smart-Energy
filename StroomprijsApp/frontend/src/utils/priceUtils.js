// utils/priceUtils.js

export const SUPPLIERS = [
  { name: 'Bolt Energy',     color: '#00C896', margin: 1.08, fixed: 0.031 },
  { name: 'Engie',           color: '#0066CC', margin: 1.12, fixed: 0.038 },
  { name: 'TotalEnergies',   color: '#CC2200', margin: 1.10, fixed: 0.035 },
  { name: 'EDF Luminus',     color: '#FF6B00', margin: 1.09, fixed: 0.029 },
  { name: 'Lampiris',        color: '#9B59B6', margin: 1.11, fixed: 0.033 },
]

export function getSupplierPrice(spotKwh, supplier) {
  return +(spotKwh * supplier.margin + supplier.fixed).toFixed(4)
}

export function getPriceColor(priceMwh) {
  if (priceMwh < 0)    return '#00E5FF'
  if (priceMwh < 50)   return '#00C896'
  if (priceMwh < 90)   return '#84CC16'
  if (priceMwh < 130)  return '#F59E0B'
  if (priceMwh < 160)  return '#F97316'
  return '#EF4444'
}

export function getPriceLabel(priceMwh, labels) {
  const L = labels || {};
  if (priceMwh < 0)    return { text: L.negative   || 'Negative price!', emoji: '🤑', tip: 'Grid is overloaded — run everything now!' }
  if (priceMwh < 50)   return { text: L.very_cheap || 'Very cheap',       emoji: '💚', tip: 'Great time for high consumption' }
  if (priceMwh < 90)   return { text: L.cheap      || 'Cheap',            emoji: '🟡', tip: 'Good time for laundry, EV charging' }
  if (priceMwh < 130)  return { text: L.moderate   || 'Moderate',         emoji: '🟠', tip: 'Avoid high loads if possible' }
  if (priceMwh < 160)  return { text: L.expensive  || 'Expensive',        emoji: '🔴', tip: 'Postpone high consumption' }
  return                        { text: L.peak      || 'Peak price',       emoji: '⛔', tip: 'Avoid using large appliances!' }
}

export function formatPrice(priceMwh, unit = 'MWh') {
  if (unit === 'MWh') return `€${priceMwh?.toFixed(1) ?? '--'}/MWh`
  return `€${(priceMwh / 1000)?.toFixed(4) ?? '--'}/kWh`
}