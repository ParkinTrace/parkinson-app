/** Canonical session contract (mirrors backend Pydantic schema).
 *  External JSON: camelCase. All timing: MILLISECONDS.
 */

export type SessionType = "structured" | "free" | "motor_task";

export interface KeystrokeEventWire {
  pressTimestamp: number; // ms, monotonic (event.timeStamp basis)
  releaseTimestamp: number; // ms
  hand: "left" | "right";
  row: number;
  keyType: "character" | "backspace" | "control";
}

export interface MotorTapWire {
  timestampMs: number;
  key: string;
}

export interface SessionPayload {
  sessionId: string;
  userId: string;
  sessionType: SessionType;
  deviceId: string;
  startedAt: string; // ISO-8601
  endedAt: string; // ISO-8601
  durationMs: number;
  keystrokeCount: number;
  qualityFlags: string[];
  events: KeystrokeEventWire[];
  taps: MotorTapWire[];
  features: Record<string, number>;
}

export interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  session_type: SessionType;
  device_id: string;
  valid: boolean;
  quality_flags: string[];
  features?: Record<string, number | null>;
}

export interface SessionMetricsRow {
  session_id: string;
  user_id: string;
  features: Record<string, number | null>;
  quality_metrics: Record<string, unknown>;
  layer1_result: Record<string, unknown> | null;
  layer2_result: Record<string, unknown> | null;
  within_session_series: {
    elapsed_ms: number[];
    rolling_ht_ms: number[];
    rolling_ft_ms: number[];
    rolling_ikl_ms: number[];
  } | null;
  created_at: string;
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}

export interface TreatmentEvent {
  id: string;
  userId: string;
  eventDate: string;
  eventType: string;
  description: string;
  notes?: string | null;
  createdAt: string;
}

export interface FeatureComparison {
  feature: string;
  human_name: string;
  pre_median: number | null;
  post_median: number | null;
  difference: number | null;
  percent_change: number | null;
}

export interface TreatmentComparison {
  event_id: string;
  event_date: string;
  event_type: string;
  description: string;
  pre_session_count: number;
  post_session_count: number;
  pre_date_range: [string, string] | null;
  post_date_range: [string, string] | null;
  feature_comparisons: FeatureComparison[];
  disclaimer: string;
}

export interface ClinicianReport {
  report_id: string;
  generated_at: string;
  user_id: string;
  compliance: {
    total_sessions: number;
    valid_sessions: number;
    invalid_sessions: number;
    distinct_days: number;
    monitoring_span_days: number;
    earliest_session: string | null;
    latest_session: string | null;
  };
  baseline: {
    status: string;
    anchor_device_id: string | null;
    reference_intervals: Record<string, { median: number | null; mad: number | null; p25: number | null; p75: number | null }>;
  };
  persistent_motor_pattern_changes: Array<{
    feature: string;
    human_name: string;
    recurrent_sessions: number;
    status: string;
    clinical_note: string;
  }>;
  treatment_timeline: TreatmentComparison[];
  clinical_governance_disclaimer: string;
}
