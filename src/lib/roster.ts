import type { ParsedPlayer } from './parseWhatsApp'

// A player row on the New Match page: the parsed player, the community profile it matched and whether it is kept
export interface RosterInputPlayer extends ParsedPlayer {
  matchedProfile: { id: string } | null
  confirmed: boolean
}

// The match_roster rows to insert for the confirmed players
export function buildRosterRows(players: RosterInputPlayer[], matchId: string, hostId: string) {
  return players.filter(p => p.confirmed).map((p, idx) => {
    const isPlusOne = p.plusOneOf !== null
    // For +1s, attribute invited_by to the parent player's profile (if matched), else host
    const parentProfile = isPlusOne && p.plusOneOf !== null
      ? players[p.plusOneOf]?.matchedProfile ?? null
      : null
    // A +1 given a name ("+1 Amit") keeps it. The parser names an unnamed guest "Guest", and
    // "Guest plus one" leaves the marker itself as the name: both are saved as "+1"
    const plusOneName = p.name && !/^(guest|\+1|plus\s*one)$/i.test(p.name) ? p.name : '+1'
    return {
      match_id: matchId,
      profile_id: isPlusOne ? null : (p.matchedProfile?.id ?? null),
      guest_name: isPlusOne ? plusOneName : (p.matchedProfile ? null : (p.name || 'Guest')),
      guest_phone: isPlusOne ? null : (p.matchedProfile ? null : p.phone),
      source: isPlusOne ? 'guest_plus_one' : (p.matchedProfile ? 'community' : 'external'),
      status: 'confirmed',
      position: idx + 1,
      amount_collected: 0,
      paid_at: null,
      invited_by: parentProfile?.id ?? hostId,
    }
  })
}
