import { data, type AccessSession, SafeError } from "./soxai";
import { definitions, definitionSource } from "./metric-definitions";
const DAY = 86400000;
const metric =
  /^(?:(?:sleep_|health_|activity_)[A-Za-z0-9_]{1,80}|hr|hrv|spo2|steps|heart_rate|respiratory_rate|skin_temperature|temperature)$/;
const sensitive =
  /(?:^|_)(?:id|uid|name|email|token|key|user|org|account)(?:_|$)/i;
export function number(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" ||
      !/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value))
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function date(value: string) {
  const n = Date.parse(value + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(n) ||
    new Date(n).toISOString().slice(0, 10) !== value ||
    value < "2000-01-01" ||
    value > "2100-12-31"
  )
    throw new SafeError("INVALID_DATE");
  return n;
}
export function instant(value: string) {
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,6})?)?(?:Z|[+-]\d\d:\d\d)$/.test(
      value,
    ) ||
    value.length > 40
  )
    throw new SafeError("INVALID_DATETIME");
  date(value.slice(0, 10));
  const n = Date.parse(value);
  if (
    !Number.isFinite(n) ||
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59
  )
    throw new SafeError("INVALID_DATETIME");
  return n;
}
const day = (n: number) => new Date(n).toISOString().slice(0, 10);
export function range(start?: string, end?: string, days = 7) {
  const hi =
    end === undefined ? date(day(Date.now() + 9 * 3600000)) - DAY : date(end);
  const lo = start === undefined ? hi - (days - 1) * DAY : date(start);
  if (hi < lo || hi - lo >= 90 * DAY) throw new SafeError("INVALID_RANGE");
  return [day(lo), day(hi)] as const;
}
export interface DailyRange {
  start_date?: string;
  end_date?: string;
  days?: number;
}
export interface IntradayRange {
  start_datetime?: string;
  end_datetime?: string;
  hours?: number;
}
export function dailyRange(args: DailyRange, defaultDays = 7) {
  if (args.days !== undefined &&
      (!Number.isInteger(args.days) || args.days < 1 || args.days > 90 || args.start_date !== undefined))
    throw new SafeError("INVALID_RANGE");
  return range(args.start_date, args.end_date, args.days ?? defaultDays);
}
export function intradayRange(args: IntradayRange, now = Date.now()) {
  const explicit = args.start_datetime !== undefined || args.end_datetime !== undefined;
  if (explicit) {
    if (args.start_datetime === undefined || args.end_datetime === undefined || args.hours !== undefined)
      throw new SafeError("INVALID_RANGE");
    const span = instant(args.end_datetime) - instant(args.start_datetime);
    if (span <= 0 || span > 2 * DAY) throw new SafeError("INVALID_RANGE");
    return [args.start_datetime, args.end_datetime] as const;
  }
  const hours = args.hours ?? 24;
  if (!Number.isInteger(hours) || hours < 1 || hours > 48) throw new SafeError("INVALID_RANGE");
  return [new Date(now - hours * 3600000).toISOString(), new Date(now).toISOString()] as const;
}
type Row = Record<string, string | number | null>;
export function normalize(
  source: Record<string, unknown>[],
  uid: string,
  kind: "daily" | "intraday",
  start: string,
  end: string,
) {
  const rows: Row[] = [];
  for (const item of source) {
    if (item.uid !== uid) throw new SafeError("UID_MISMATCH");
    let raw = item._time;
    if (typeof raw !== "string" || raw.length > 40)
      throw new SafeError("UNSUPPORTED_RESPONSE");
    if (!/(?:Z|[+-]\d\d:\d\d)$/.test(raw)) raw += "Z";
    const n = instant(raw),
      stamp = kind === "daily" ? day(n) : new Date(n).toISOString();
    if (
      kind === "daily"
        ? stamp < start || stamp > end
        : n < instant(start) || n >= instant(end)
    )
      continue;
    const row: Row = { [kind === "daily" ? "date" : "timestamp"]: stamp };
    for (const [k, v] of Object.entries(item))
      if (metric.test(k) && !sensitive.test(k)) row[k] = number(v);
    rows.push(row);
  }
  const key = kind === "daily" ? "date" : "timestamp";
  rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  if (kind === "daily" && new Set(rows.map((r) => r.date)).size !== rows.length)
    throw new SafeError("AMBIGUOUS_DAILY_DATA");
  return rows;
}
const observed = (rows: Row[]) =>
  [
    ...new Set(
      rows.flatMap((r) =>
        Object.keys(r).filter((k) => metric.test(k) && r[k] !== null),
      ),
    ),
  ].sort();
function select(rows: Row[], names?: string[]) {
  const available = observed(rows);
  if (
    names &&
    (names.length < 1 ||
      names.length > 32 ||
      names.some((m) => !metric.test(m) || sensitive.test(m)))
  )
    throw new SafeError("INVALID_METRICS");
  if (rows.length && names?.some((n) => !available.includes(n)))
    throw new SafeError("METRIC_UNAVAILABLE");
  return names ? [...new Set(names)] : available;
}
function meta(kind: "daily" | "intraday", start: string, end: string) {
  return {
    source: "SOXAI official API",
    kind,
    range: { start, end, end_inclusive: kind === "daily" },
    timezone: kind === "daily" ? "Asia/Tokyo" : "UTC",
    date_basis: kind === "daily" ? "API UTC date label" : "instant",
    units: "API-native; see available_metrics. Unknown units are null.",
    definition_source: definitionSource,
  };
}
function bounded<T>(value: T): T {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 100000)
    throw new SafeError("RESPONSE_TOO_LARGE");
  return value;
}
export async function dailyRows(s: AccessSession, start: string, end: string) {
  return normalize(
    await data(s, "daily", start, end),
    s.uid,
    "daily",
    start,
    end,
  );
}
async function intradayRows(s: AccessSession, start: string, end: string) {
  const rows: Row[] = [];
  let sourceRows = 0;
  let sourceBytes = 0;
  const endMs = instant(end);
  for (let cursor = instant(start); cursor < endMs; cursor += DAY) {
    const chunkStart = new Date(cursor).toISOString();
    const chunkEnd = new Date(Math.min(cursor + DAY, endMs)).toISOString();
    const source = await data(s, "intraday", chunkStart, chunkEnd);
    sourceRows += source.length;
    sourceBytes += new TextEncoder().encode(JSON.stringify(source)).length;
    if (sourceRows > 20000 || sourceBytes > 4_000_000)
      throw new SafeError("RESPONSE_TOO_LARGE");
    // Half-open chunks avoid counting an inclusive API end row twice.
    rows.push(...normalize(source, s.uid, "intraday", chunkStart, chunkEnd));
  }
  return rows;
}
export async function measurements(
  s: AccessSession,
  kind: "daily" | "intraday",
  args: DailyRange & IntradayRange & {
    metrics?: string[];
    offset?: number;
    limit?: number;
  },
) {
  const hasDates = args.start_date !== undefined || args.end_date !== undefined || args.days !== undefined;
  const hasTimes = args.start_datetime !== undefined || args.end_datetime !== undefined || args.hours !== undefined;
  if ((kind === "daily" && hasTimes) || (kind === "intraday" && hasDates))
    throw new SafeError("INVALID_RANGE");
  const [start, end] = kind === "daily" ? dailyRange(args) : intradayRange(args);
  const offset = args.offset ?? 0,
    limit = args.limit ?? 100;
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 20000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500
  )
    throw new SafeError("INVALID_PAGE");
  const rows = kind === "daily" ? await dailyRows(s, start, end) : await intradayRows(s, start, end);
  const names = select(rows, args.metrics),
    key = kind === "daily" ? "date" : "timestamp";
  const availableMetrics = observed(rows).map((name) => {
    const count = rows.filter((r) => r[name] != null).length;
    return {
      name, unit: definitions[kind][name]?.unit ?? null,
      description: definitions[kind][name]?.description ?? null,
      numeric_observations: count, missing_observations: rows.length - count,
    };
  });
  const expectedDays = kind === "daily" ? (date(end) - date(start)) / DAY + 1 : null;
  const dates = new Set(rows.map((r) => r.date));
  const today = day(Date.now() + 9 * 3600000);
  const coverage = {
    expected_days: expectedDays,
    missing_dates: expectedDays === null ? null : Array.from({length: expectedDays}, (_, i) => day(date(start) + i * DAY)).filter((d) => !dates.has(d)),
    first_record: rows[0]?.[key] ?? null, last_record: rows.at(-1)?.[key] ?? null,
    includes_today: kind === "daily" ? start <= today && end >= today
      : instant(start) < date(today) + DAY - 9 * 3600000 && instant(end) > date(today) - 9 * 3600000,
  };
  const records: Row[] = [];
  let bytes = 4000 + new TextEncoder().encode(JSON.stringify(availableMetrics)).length
    + new TextEncoder().encode(JSON.stringify(coverage)).length
    + 2 * new TextEncoder().encode(JSON.stringify(names)).length;
  for (const row of rows.slice(offset, offset + limit)) {
    const filtered: Row = { [key]: row[key] };
    for (const name of names) filtered[name] = row[name] ?? null;
    bytes += new TextEncoder().encode(JSON.stringify(filtered)).length + 1;
    if (bytes > 99000) break;
    records.push(filtered);
  }
  if (rows.length > offset && !records.length)
    throw new SafeError("RESPONSE_TOO_LARGE");
  const nextOffset = offset + records.length < rows.length ? offset + records.length : null;
  return bounded({
    ...meta(kind, start, end),
    status: rows.length ? "ok" : "no_data",
    metrics: names,
    available_metrics: availableMetrics,
    coverage,
    total_rows: rows.length,
    offset,
    next_offset: nextOffset,
    next_request: nextOffset === null ? null : {
      kind,
      ...(kind === "daily" ? { start_date: start, end_date: end } : { start_datetime: start, end_datetime: end }),
      ...(args.metrics ? { metrics: args.metrics } : {}),
      offset: nextOffset,
      limit,
    },
    returned_rows: records.length,
    records,
  });
}
