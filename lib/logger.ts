/**
 * Structured JSON logger for ScriptMinder.
 *
 * Outputs one JSON line per log entry — compatible with
 * Grafana Loki, Datadog, CloudWatch, or any log aggregator.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.info('User logged in', { eventType: 'auth.login', auth: { userId, email, roleName } });
 *   logger.error('DB connection failed', { eventType: 'db.error', error: err });
 *   logger.info('Project created', {
 *     eventType: 'crud.create',
 *     resource: 'project',
 *     auth: { userId },
 *     data: { created: newProject },
 *   });
 *   logger.info('Project updated', {
 *     eventType: 'crud.update',
 *     resource: 'project',
 *     auth: { userId },
 *     data: { before: oldDoc, after: newDoc },
 *   });
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** All available event type categories */
export type EventType =
  // Auth events
  | 'auth.login'
  | 'auth.login.failed'
  | 'auth.login.oauth'
  | 'auth.register'
  | 'auth.register.failed'
  | 'auth.logout'
  | 'auth.session.build'
  | 'auth.session.error'
  | 'auth.permission.check'
  | 'auth.permission.denied'
  // Database events
  | 'db.connected'
  | 'db.error'
  | 'db.disconnected'
  // CRUD events
  | 'crud.create'
  | 'crud.read'
  | 'crud.update'
  | 'crud.delete'
  // Seed / setup events
  | 'seed.start'
  | 'seed.step'
  | 'seed.complete'
  | 'seed.error'
  // Generic
  | 'app.error'
  | 'app.warn'
  | 'app.info'
  | string; // allow custom event types

/** Auth user context — attach when the action belongs to a user */
export interface LogAuth {
  userId?:   string;
  email?:    string;
  roleName?: string;
  roleId?:   string;
}

/** CRUD data payload — supports create, update (before/after), and delete */
export interface LogData {
  /** Set on create — the newly created document */
  created?: unknown;
  /** Set on read — the retrieved document(s) */
  fetched?: unknown;
  /** Set on update/delete — the state before the change */
  before?: unknown;
  /** Set on update — the state after the change */
  after?: unknown;
  /** Any additional freeform data */
  [key: string]: unknown;
}

/** Full options for a single log entry */
export interface LogOptions {
  /** Categorised event identifier, e.g. "auth.login", "crud.create" */
  eventType?: EventType;
  /** The resource/domain being acted on, e.g. "user", "project" */
  resource?: string;
  /** Auth user context */
  auth?: LogAuth;
  /** CRUD / domain data */
  data?: LogData;
  /** Any extra structured fields */
  metadata?: Record<string, unknown>;
  /** Raw error object — serialised into the JSON */
  error?: unknown;
}

/** The final shape written to stdout */
interface LogEntry {
  timestamp: string;
  level:     LogLevel;
  service:   string;
  message:   string;
  eventType?: string;
  resource?:  string;
  auth?:      LogAuth;
  data?:      LogData;
  metadata?:  Record<string, unknown>;
  error?:     { message: string; stack?: string; [key: string]: unknown };
}

// ─── Serialise error safely ───────────────────────────────────────────────────

function serializeError(err: unknown): LogEntry['error'] {
  if (!err) return undefined;
  if (err instanceof Error) {
    // Spread first so explicit fields take priority
    const extras = { ...(err as Error & Record<string, unknown>) };
    return {
      ...extras,
      message: err.message,
      stack:   process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    return { message: String(obj['message'] ?? 'Unknown error'), ...obj };
  }
  return { message: String(err) };
}

// ─── Core write function ─────────────────────────────────────────────────────

const SERVICE_NAME = process.env.LOGGER_SERVICE_NAME ?? 'script-minder';
const IS_DEV       = process.env.NODE_ENV !== 'production';

// ─── Dev pretty-print colours ────────────────────────────────────────────────
const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';
const DIM   = '\x1b[2m';
const BOLD  = '\x1b[1m';

function prettyWrite(level: LogLevel, message: string, options: LogOptions = {}): void {
  const { eventType, resource, auth, data, metadata, error } = options;
  const color  = LEVEL_COLOR[level];
  const time   = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const tag    = `${color}${BOLD}[${level.toUpperCase()}]${RESET}`;
  const ts     = `${DIM}${time}${RESET}`;
  const event  = eventType ? `${DIM}(${eventType})${RESET}` : '';

  const out = error ? process.stderr : process.stdout;
  out.write(`${ts} ${tag} ${message} ${event}\n`);

  const extras: Record<string, unknown> = {};
  if (auth)     extras['auth']     = auth;
  if (resource) extras['resource'] = resource;
  if (data)     extras['data']     = data;
  if (metadata) extras['metadata'] = metadata;
  if (error)    extras['error']    = serializeError(error);

  if (Object.keys(extras).length) {
    const lines = JSON.stringify(extras, null, 2)
      .split('\n')
      .map((l) => `  ${DIM}${l}${RESET}`)
      .join('\n');
    out.write(lines + '\n');
  }
}

function jsonWrite(level: LogLevel, message: string, options: LogOptions = {}): void {
  const { eventType, resource, auth, data, metadata, error } = options;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service:   SERVICE_NAME,
    message,
    ...(eventType && { eventType }),
    ...(resource  && { resource }),
    ...(auth      && { auth }),
    ...(data      && { data }),
    ...(metadata  && { metadata }),
    ...(error !== undefined && { error: serializeError(error) }),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else                   process.stdout.write(line + '\n');
}

function write(level: LogLevel, message: string, options: LogOptions = {}): void {
  if (IS_DEV) {
    prettyWrite(level, message, options);
  } else {
    jsonWrite(level, message, options);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (message: string, options?: LogOptions) => write('debug', message, options),
  info:  (message: string, options?: LogOptions) => write('info',  message, options),
  warn:  (message: string, options?: LogOptions) => write('warn',  message, options),
  error: (message: string, options?: LogOptions) => write('error', message, options),
};
