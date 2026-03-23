export function formatPaise(paise: number): string {
  const rupees = paise / 100
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
