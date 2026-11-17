import { describe, expect, it } from 'vitest'
import { parseWhatsApp } from './parseWhatsApp'
import { buildRosterRows } from './roster'

const HOST_ID = 'host-profile'
const RAHUL_ID = 'rahul-profile'

// Parse the message as the New Match page does, with Rahul matched to a community profile
const rowsFor = (...lines: string[]) => {
  const players = parseWhatsApp(['Sunday football', ...lines].join('\n')).players.map(p => ({
    ...p,
    matchedProfile: p.name === 'Rahul' ? { id: RAHUL_ID } : null,
    confirmed: true,
  }))
  return buildRosterRows(players, 'match-1', HOST_ID)
}

describe('buildRosterRows +1 guests', () => {
  it('saves a named +1 under its name, invited by the player above it', () => {
    const rows = rowsFor('1. Ahmed', '2. Rahul', '3. +1 Amit')

    expect(rows[2]).toMatchObject({
      profile_id: null,
      guest_name: 'Amit',
      source: 'guest_plus_one',
      invited_by: RAHUL_ID,
    })
  })

  it('saves a named "Plus one" under its name, invited by the player above it', () => {
    const rows = rowsFor('1. Ahmed', '2. Rahul', '3. Plus one Amit')

    expect(rows[2]).toMatchObject({ guest_name: 'Amit', source: 'guest_plus_one', invited_by: RAHUL_ID })
  })

  it('saves "Guest plus one" as "+1", not under the marker text', () => {
    const rows = rowsFor('1. Ahmed', '2. Rahul', '3. Guest plus one')

    expect(rows[2]).toMatchObject({
      profile_id: null,
      guest_name: '+1',
      source: 'guest_plus_one',
      invited_by: RAHUL_ID,
    })
  })

  it('saves an unnamed +1 as "+1", invited by the player above it', () => {
    const rows = rowsFor('1. Ahmed', '2. Rahul', '3. +1')

    expect(rows[2]).toMatchObject({
      profile_id: null,
      guest_name: '+1',
      source: 'guest_plus_one',
      invited_by: RAHUL_ID,
    })
  })
})
