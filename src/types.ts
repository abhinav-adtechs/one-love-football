// ===========================================
// One Love Football — Database Types
// ===========================================
// These mirror the Supabase schema. For auto-generated types,
// run: supabase gen types typescript --local > src/types/database.ts

// ---- Enums ----

export type UserRole = "player" | "host" | "admin";

export type MatchType = "community" | "friendly" | "tournament";

export type MatchStatus =
  | "roster_open"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type GameStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type GameFormat =
  | "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10" | "11v11"
  | "6v6v6" | "7v7v7" | "8v8v8" | "9v9v9";

export type RosterStatus =
  | "confirmed"
  | "waitlisted"
  | "dropped"
  | "no_show"
  | "late_arrival";

export type PlayerSource = "community" | "playo" | "external" | "guest_plus_one";

export type PaymentMethod =
  | "cash"
  | "google_pay"
  | "phonepe"
  | "upi_id"
  | "bank_transfer"
  | "other";

export type LedgerApprovalStatus = "pending_approval" | "approved" | "rejected";

export type PaymentStatus = "pending" | "partial" | "paid" | "overdue" | "waived";

export type LedgerEntryType =
  | "game_fee"
  | "late_fee"
  | "no_show_fee"
  | "extension_fee"
  | "advance_payment"
  | "topup"
  | "refund"
  | "adjustment";

export type TurfPaymentTerms = "pre_full" | "pre_partial" | "post_game";

export type PlayerPosition =
  | "goalkeeper"
  | "center_back"
  | "left_back"
  | "right_back"
  | "defensive_mid"
  | "central_mid"
  | "attacking_mid"
  | "left_wing"
  | "right_wing"
  | "striker"
  | "any";

export type AttendanceMark = "on_time" | "late" | "no_show" | "absent_notified";

// ---- Table Row Types ----

export interface Profile {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  jersey_number: number | null;
  role: UserRole;
  default_positions: PlayerPosition[];
  bio: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  cost_per_hour: number;
  currency: string;
  surface_type: string | null;
  facilities: string[];
  supported_formats: GameFormat[];
  contact_phone: string | null;
  contact_name: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  title: string;
  match_type: MatchType;
  status: MatchStatus;
  format: GameFormat;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  actual_end_time: string | null;
  venue_id: string | null;
  max_players: number;
  min_players: number;
  fee_per_player: number;
  late_fee: number | null;
  no_show_fee: number | null;
  extension_fee_per_player: number | null;
  currency: string;
  payment_deadline: string | null;
  opponent_name: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  match_id: string;
  game_number: number;
  status: GameStatus;
  format: GameFormat | null;
  start_time: string | null;
  end_time: string | null;
  is_extension: boolean;
  extension_minutes: number | null;
  team_a_name: string;
  team_b_name: string;
  team_a_score: number;
  team_b_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchRoster {
  id: string;
  match_id: string;
  profile_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  invited_by: string | null;
  source: PlayerSource;
  status: RosterStatus;
  position: number | null;
  attendance: AttendanceMark | null;
  arrived_at: string | null;
  team: string | null;
  playing_position: PlayerPosition | null;
  signed_up_at: string;
  dropped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamePlayerStats {
  id: string;
  game_id: string;
  profile_id: string;
  goals: number;
  assists: number;
  own_goals: number;
  clean_sheet: boolean | null;
  hard_play: boolean;
  is_motm: boolean;
  position_played: PlayerPosition | null;
  team: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchBilling {
  id: string;
  match_id: string;
  turf_booking_cost: number;
  per_player_share: number;
  round_off: number;
  additional_charges: number;
  additional_charges_note: string | null;
  total_collected_target: number;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerMatchPayment {
  id: string;
  match_id: string;
  profile_id: string;
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date: string | null;
  marked_to_pay_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  profile_id: string;
  match_id: string | null;
  entry_type: LedgerEntryType;
  amount: number;
  running_balance: number | null;
  method: PaymentMethod | null;
  proof_url: string | null;
  transaction_ref: string | null;
  description: string | null;
  approval_status: LedgerApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  submitted_by: string;
  created_at: string;
}

export interface VenuePayment {
  id: string;
  match_id: string;
  venue_id: string | null;
  paid_by: string;
  amount: number;
  method: PaymentMethod | null;
  proof_url: string | null;
  transaction_ref: string | null;
  payment_terms: TurfPaymentTerms | null;
  notes: string | null;
  created_at: string;
}

export interface VenueBooking {
  id: string;
  match_id: string;
  venue_id: string;
  booked_by: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  currency: string;
  payment_terms: TurfPaymentTerms;
  extended_end_time: string | null;
  extension_cost: number | null;
  confirmation_ref: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  match_id: string | null;
  ledger_id: string | null;
  is_read: boolean;
  created_at: string;
}
