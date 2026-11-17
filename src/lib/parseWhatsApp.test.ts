import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { normalizePhone, parseWhatsApp, phonesMatch } from './parseWhatsApp'

const parsePlayers = (...lines: string[]) =>
  parseWhatsApp(['Sunday football', ...lines].join('\n')).players

// The header lines, followed by one player so the header ends where the list starts
const parseHeader = (...lines: string[]) => parseWhatsApp([...lines, '1. Ahmed'].join('\n'))

describe('parseWhatsApp dates', () => {
  beforeAll(() => {
    // Pin the time zone and the clock (Wednesday 18 March 2026, midday) so year defaults
    // and "this Sunday" don't depend on when or where the tests run
    vi.stubEnv('TZ', 'Asia/Kolkata')
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0))
  })

  afterAll(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it.each([
    ['Football 22nd March', '2026-03-22'],
    ['Football 22 Mar 2026', '2026-03-22'],
    ['Football 22/3', '2026-03-22'],
    ['Football 22-03-2026', '2026-03-22'],
    ['Football this Sunday', '2026-03-22'],
  ])('reads the date in "%s"', (header, date) => {
    expect(parseHeader(header).date).toBe(date)
  })
})

describe('parseWhatsApp times', () => {
  it.each([
    ['6:30 PM', '18:30'],
    ['6:30pm', '18:30'],
    ['18:30', '18:30'],
    ['6 PM', '18:00'],
    ['12 AM', '00:00'],
  ])('reads the time in "%s"', (time, expected) => {
    expect(parseHeader(`Football ${time}`).time).toBe(expected)
  })
})

describe('parseWhatsApp venue', () => {
  it('reads a "Venue:" line', () => {
    expect(parseHeader('Football Sunday', 'Venue: XYZ Turf, Kondapur').venueName).toBe('XYZ Turf, Kondapur')
  })

  it('reads a line that mentions a turf', () => {
    expect(parseHeader('Football Sunday', 'Green Turf, Kondapur').venueName).toBe('Green Turf, Kondapur')
  })
})

// Synthetic numbers only. normalizePhone and phonesMatch are tested on their own: passing here
// says nothing about reading a number out of a message line, which is tested separately below.
describe('normalizePhone', () => {
  it.each([
    ['+91 90000 00001', '9000000001'],
    ['919000000001', '9000000001'],
    ['09000000001', '9000000001'],
    ['9000000001', '9000000001'],
  ])('normalizes the Indian mobile "%s"', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })

  it.each([
    ['5000000001'],        // 10 digits, but no Indian mobile starts with 5
    ['+1 202 555 0100'],   // a US number
    ['12345'],
  ])('rejects "%s", which is not an Indian mobile', raw => {
    expect(normalizePhone(raw)).toBeNull()
  })
})

describe('phonesMatch', () => {
  it('matches a stored number with country code against its 10 digits', () => {
    expect(phonesMatch('919000000001', '9000000001')).toBe(true)
  })

  it('does not match a different number', () => {
    expect(phonesMatch('919000000001', '9000000002')).toBe(false)
  })
})

describe('parseWhatsApp phone extraction from a player line', () => {
  it('takes a bare 10-digit number off the name', () => {
    expect(parsePlayers('1. Rahul 9000000001')[0]).toMatchObject({ name: 'Rahul', phone: '9000000001' })
  })

  it('takes a 0-prefixed number off the name', () => {
    expect(parsePlayers('1. Rahul 09000000001')[0]).toMatchObject({ name: 'Rahul', phone: '9000000001' })
  })

  it('leaves the phone empty when the line has none', () => {
    expect(parsePlayers('1. Rahul')[0].phone).toBeNull()
  })
})

describe('parseWhatsApp paid markers', () => {
  it.each(['Rahul ✅', 'Rahul paid', 'Rahul 💰', 'Rahul done'])('marks "%s" as paid', line => {
    expect(parsePlayers(`1. ${line}`)[0]).toMatchObject({ name: 'Rahul', isPaid: true })
  })

  it.each(['Rahul pending', 'Rahul unpaid', 'Rahul'])('marks "%s" as unpaid', line => {
    expect(parsePlayers(`1. ${line}`)[0]).toMatchObject({ name: 'Rahul', isPaid: false })
  })
})

describe('parseWhatsApp guests', () => {
  it.each([
    ['Guest - John', 'John'],
    ['G Amit', 'Amit'],
    ['External Amit', 'Amit'],
  ])('reads "%s" as a guest, not a +1', (line, name) => {
    expect(parsePlayers('1. Rahul', `2. ${line}`)[1]).toMatchObject({ name, isGuest: true, plusOneOf: null })
  })
})

describe('parseWhatsApp +1 attribution', () => {
  it('attributes a numbered "+1" line to the player above it', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. +1')

    expect(players.map(p => p.name)).toEqual(['Ahmed', 'Rahul', 'Guest'])
    expect(players[2].isGuest).toBe(true)
    expect(players[2].plusOneOf).toBe(1)
    expect(players[players[2].plusOneOf!].name).toBe('Rahul')
  })

  it('attributes a numbered "Plus one" line to the player above it', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. Plus one')

    expect(players[2].isGuest).toBe(true)
    expect(players[2].plusOneOf).toBe(1)
  })

  it('keeps the name of a named "+1"', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. +1 Amit')

    expect(players[2]).toMatchObject({ name: 'Amit', isGuest: true, plusOneOf: 1 })
  })

  it('attributes consecutive +1 lines to the same player', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. +1', '4. +1')

    expect(players.map(p => p.plusOneOf)).toEqual([null, null, 1, 1])
  })

  it('does not let a +1 become the parent of the next +1', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. +1', '4. Plus one')

    expect(players.map(p => p.plusOneOf)).toEqual([null, null, 1, 1])
  })

  it('does not treat a named guest as a +1', () => {
    const players = parsePlayers('1. Ahmed', '2. Rahul', '3. Guest Amit')

    expect(players[2]).toMatchObject({ name: 'Amit', isGuest: true, plusOneOf: null })
  })
})
