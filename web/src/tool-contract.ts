import { z } from "zod";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const datetime = z.string().max(40);
export const dailyInput = {
  start_date: date.optional().describe("First included date, YYYY-MM-DD. Do not combine with days."),
  end_date: date.optional().describe("Last included date, YYYY-MM-DD. Default: yesterday in Asia/Tokyo."),
  days: z.number().int().min(1).max(90).optional().describe("Number of dates ending at end_date. Use instead of start_date. Default: 7."),
};
export const intradayInput = {
  start_datetime: datetime.optional().describe("Included start, ISO 8601 with Z or offset. Supply both datetimes, without hours."),
  end_datetime: datetime.optional().describe("Excluded end, ISO 8601 with Z or offset. Supply both datetimes, at most 48 hours apart."),
  hours: z.number().int().min(1).max(48).optional().describe("Look back from now; do not combine with datetime arguments. Retrieval defaults to 24 hours."),
};
const metricInput = z.array(z.string()).min(1).max(32).describe("Exact names from get_health_data.available_metrics for the same range.");
export const pageInput = {
  metrics: metricInput.optional().describe("Up to 32 exact observed metric names. Omit for all observed numeric metrics."),
  offset: z.number().int().min(0).max(20000).optional().describe("Row offset, default 0. Continue with next_request unchanged to preserve the time range."),
  limit: z.number().int().min(1).max(500).optional().describe("Maximum rows, default 100. The 100 KB limit may return fewer rows."),
};
// Fixed messages only; never echo upstream responses or exception details.
export function toolError(code: string) {
  const actions: Record<string, string> = {
    INVALID_RANGE: "Use dates or days (1–90); for intraday use both datetimes or hours (1–48). Do not mix modes or leave a datetime boundary out.",
    INVALID_DATE: "Use a real calendar date in YYYY-MM-DD format.",
    INVALID_DATETIME: "Use ISO 8601 timestamps with Z or an offset such as +09:00.",
    INVALID_PAGE: "Copy next_request, or use offset 0–20000 and limit 1–500.",
    INVALID_METRICS: "Select 1–32 exact names from get_health_data.available_metrics.",
    METRIC_UNAVAILABLE: "Call get_health_data for the same range without metrics, then select names from available_metrics.",
    RESPONSE_TOO_LARGE: "Shorten the time range; select fewer metrics if the output is too large.",
    AUTHENTICATION_REQUIRED: "Connect SOXAI RING in your MCP client’s connector settings. Never send credentials in chat.",
    AUTHENTICATION_FAILED: "Reconnect SOXAI RING in your MCP client’s connector settings.",
    RATE_LIMITED: "Wait before retrying; do not repeatedly sign in.",
    UPSTREAM_UNAVAILABLE: "Try again later; SOXAI is temporarily unreachable. Reconnecting is not required.",
    UPSTREAM_ERROR: "Try again later. If it persists, contact the service operator.",
    UID_MISMATCH: "Stop and contact the service operator. Account ownership verification failed; no data was returned.",
    UNSUPPORTED_RESPONSE: "Contact the service operator. The API response could not be interpreted safely.",
    AMBIGUOUS_DAILY_DATA: "Contact the service operator. Do not sum duplicate daily records.",
  };
  return { error: { code: actions[code] ? code : "INTERNAL_ERROR", action: actions[code] ?? "Contact the service operator." } };
}

const metaOutput = {
  source: z.string(),
  kind: z.enum(["daily", "intraday"]),
  range: z.object({ start: z.string(), end: z.string(), end_inclusive: z.boolean() }),
  timezone: z.string(),
  date_basis: z.string(),
  units: z.string(),
  definition_source: z.string(),
  status: z.enum(["ok", "no_data"]),
};
const row = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
const count = z.number().int().nonnegative();
export const measurementsOutput = {
  ...metaOutput,
  metrics: z.array(z.string()),
  available_metrics: z.array(z.object({ name: z.string(), unit: z.string().nullable(), description: z.string().nullable(), numeric_observations: count, missing_observations: count }))
    .describe("All numeric metrics observed anywhere in the requested range, independent of the page and metrics filter."),
  coverage: z.object({
    expected_days: count.nullable(), missing_dates: z.array(z.string()).nullable(),
    first_record: z.string().nullable(), last_record: z.string().nullable(), includes_today: z.boolean(),
  }).describe("Whole-range coverage, independent of pagination. Intraday expected_days and missing_dates are null because sampling cadence is not assumed. includes_today warns of a potentially incomplete day."),
  total_rows: count,
  returned_rows: count,
  offset: count,
  next_offset: count.nullable(),
  next_request: z.object({
    kind: z.enum(["daily", "intraday"]),
    start_date: z.string().optional(), end_date: z.string().optional(),
    start_datetime: z.string().optional(), end_datetime: z.string().optional(),
    metrics: z.array(z.string()).optional(), offset: count, limit: count,
  }).nullable().describe("Arguments for the same tool's next page. Null means complete. The resolved range is pinned; underlying API data may still change."),
  records: z.array(row),
};
