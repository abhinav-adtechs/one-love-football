// WhatsApp match message parser
// Extracts match details and player list from a pasted WhatsApp message

export interface ParsedPlayer {
  raw: string
  name: string
  phone: string | null   // normalized 10-digit Indian mobile
  isPaid: boolean
  isGuest: boolean
  plusOneOf: number | null  // index of parent player in the parsed array, if this is a +1
}

export interface ParsedMatch {
  title: string
  date: string | null    // YYYY-MM-DD
  time: string | null    // HH:MM (24h)
  venueName: string | null
  players: ParsedPlayer[]
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Normalize phone to 10-digit Indian mobile (without country code)
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) return digits.slice(1)
  return null
}

// Supabase stores phones as "91XXXXXXXXXX" — match last 10 digits
export function phonesMatch(stored: string, normalized10: string): boolean {
  return stored.endsWith(normalized10)
}

function extractPhone(text: string): { phone: string | null; rest: string } {
  // Indian mobile patterns: +91, 91, 0 prefix or bare 10-digit
  const pattern = /(?:\+91|91|0)?\s*[6-9]\d{2}\s*\d{3}\s*\d{4}/g
  const match = pattern.exec(text)
  if (match) {
    const phone = normalizePhone(match[0])
    if (phone) {
      const rest = text.slice(0, match.index) + text.slice(match.index + match[0].length)
      return { phone, rest: rest.trim() }
    }
  }
  return { phone: null, rest: text }
}

function extractPaid(text: string): { isPaid: boolean; rest: string } {
  // Paid markers: emoji or text
  if (/[✅✓☑✔]|💰|\bpaid\b|\bdone\b|\bcleared\b|\bconfirmed\b|\breceived\b/i.test(text)) {
    const rest = text
      .replace(/[✅✓☑✔💰]/g, '')
      .replace(/\b(paid|done|cleared|confirmed|received)\b/gi, '')
      .trim()
    return { isPaid: true, rest }
  }
  if (/\b(pending|due|unpaid|not paid)\b/i.test(text)) {
    const rest = text.replace(/\b(pending|due|unpaid|not paid)\b/gi, '').trim()
    return { isPaid: false, rest }
  }
  return { isPaid: false, rest: text }
}

function extractDate(text: string): string | null {
  const today = new Date()
  const year = today.getFullYear()

  // "22nd March", "22 March", "22 Mar 2024"
  const dmMatch = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?/i.exec(text)
  if (dmMatch) {
    const day = parseInt(dmMatch[1])
    const month = MONTH_MAP[dmMatch[2].toLowerCase()]
    const yr = dmMatch[3] ? parseInt(dmMatch[3]) : year
    if (month && day >= 1 && day <= 31) {
      return `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // "22/3", "22-03", "22.03", optionally /YYYY
  const slashMatch = /(\d{1,2})[\/\-.:](\d{1,2})(?:[\/\-.](\d{4}))?/.exec(text)
  if (slashMatch) {
    const day = parseInt(slashMatch[1])
    const month = parseInt(slashMatch[2])
    const yr = slashMatch[3] ? parseInt(slashMatch[3]) : year
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // Day name: "Sunday", "this Sunday", "coming Monday"
  const dayPattern = new RegExp(`(?:this|coming|next)?\\s*(${DAY_NAMES.join('|')})`, 'i')
  const dayMatch = dayPattern.exec(text)
  if (dayMatch) {
    const targetDay = DAY_NAMES.indexOf(dayMatch[1].toLowerCase())
    const currentDay = today.getDay()
    let diff = targetDay - currentDay
    if (diff <= 0) diff += 7
    const d = new Date(today)
    d.setDate(today.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  return null
}

function extractTime(text: string): string | null {
  // "6:30 PM", "18:30", "6:30pm"
  const withMinutes = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i.exec(text)
  if (withMinutes) {
    let h = parseInt(withMinutes[1])
    const m = parseInt(withMinutes[2])
    const ap = withMinutes[3]?.toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // "6 PM", "6PM", "6pm"
  const simple = /\b(\d{1,2})\s*(am|pm)\b/i.exec(text)
  if (simple) {
    let h = parseInt(simple[1])
    const ap = simple[2].toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:00`
  }

  return null
}

function extractVenue(lines: string[]): string | null {
  for (const line of lines) {
    if (/^(venue|at|ground|turf|location|place)\s*[:–\-]\s*/i.test(line)) {
      return line.replace(/^(venue|at|ground|turf|location|place)\s*[:–\-]\s*/i, '').trim()
    }
  }
  for (const line of lines) {
    if (/turf|ground|arena|court|sports|stadium|futsal/i.test(line) && line.length < 80) {
      return line.trim()
    }
  }
  return null
}

const PLAYER_LINE_RE = /^(\d+)[.):\s\-]+(.+)/

function parsePlayerLine(line: string): ParsedPlayer | null {
  const match = PLAYER_LINE_RE.exec(line.trim())
  if (!match) return null

  let text = match[2].trim()

  // Detect guest / +1 markers
  const isGuest = /^(guest|g\b|external|\+1|plus\s*one)/i.test(text)
  if (isGuest) {
    text = text.replace(/^(guest|g\b|external|\+1|plus\s*one)\s*[-:–\s]*/i, '').trim()
  }

  const { phone, rest: afterPhone } = extractPhone(text)
  const { isPaid, rest: rawName } = extractPaid(afterPhone)

  const name = rawName
    .replace(/[-–,|\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    raw: line,
    name: name || (isGuest ? 'Guest' : ''),
    phone,
    isPaid,
    isGuest,
    plusOneOf: null,  // filled in by the caller
  }
}

export function parseWhatsApp(text: string): ParsedMatch {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Find where numbered player list starts
  const firstPlayerIdx = lines.findIndex(l => PLAYER_LINE_RE.test(l))

  const headerLines = firstPlayerIdx > 0
    ? lines.slice(0, firstPlayerIdx)
    : lines.slice(0, Math.min(4, lines.length))

  const playerLines = firstPlayerIdx >= 0 ? lines.slice(firstPlayerIdx) : []

  const headerText = headerLines.join(' ')

  const title = headerLines[0]
    ?.replace(/[⚽🏆🎮⭐🔥💪👊]/gu, '')
    .replace(/[-–|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Football Match'

  const date = extractDate(headerText)
  const time = extractTime(headerText)
  const venueName = extractVenue(headerLines)

  const players: ParsedPlayer[] = []
  let lastMainPlayerIdx: number | null = null
  for (const line of playerLines) {
    const player = parsePlayerLine(line)
    if (!player) continue
    if (player.isGuest && /^\+1|plus\s*one/i.test(player.raw)) {
      // Pure +1 with no meaningful name — attribute to previous main player
      player.plusOneOf = lastMainPlayerIdx
    } else {
      lastMainPlayerIdx = players.length
    }
    players.push(player)
  }

  return { title, date, time, venueName, players }
}
