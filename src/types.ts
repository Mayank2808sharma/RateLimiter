export type LimitDecision = {
  allowed: boolean;
  reason?: string;
  retry_after_ms?: number;
  minute_used?: number;
  minute_limit?: number;
  day_used?: number;
  day_limit?: number;
  burst_allowed?: number;
};
