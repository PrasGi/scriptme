# Logger

ScriptMinder uses a structured logger (`lib/logger.ts`) built on top of Node.js `process.stdout/stderr`. It requires no runtime dependencies and produces output that is compatible with Grafana Loki, Datadog, CloudWatch, and any log aggregator that consumes newline-delimited JSON (NDJSON).

---

## Behaviour by Environment

| `NODE_ENV`   | Output format | Destination |
|---|---|---|
| `development` | Human-readable coloured text | stdout / stderr |
| `production`  | Single-line JSON (NDJSON)    | stdout (errors → stderr) |

The switch is automatic — no configuration required. The check runs once at module load time:

```ts
const IS_DEV = process.env.NODE_ENV !== 'production';
```

---

## Import

```ts
import { logger } from '@/lib/logger';
```

For scripts outside the `app/` directory (e.g. `scripts/seed.ts`), use a relative import:

```ts
import { logger } from '../lib/logger';
```

---

## API

```ts
logger.debug(message, options?)
logger.info(message, options?)
logger.warn(message, options?)
logger.error(message, options?)
```

All four methods accept the same signature:

| Parameter | Type | Description |
|---|---|---|
| `message` | `string` | Human-readable summary of the event |
| `options` | `LogOptions` | Optional structured context (see below) |

---

## LogOptions

```ts
interface LogOptions {
  eventType?: EventType;             // categorised event identifier
  resource?:  string;                // domain being acted on, e.g. 'user'
  auth?:      LogAuth;               // user context
  data?:      LogData;               // CRUD payload
  metadata?:  Record<string, unknown>; // any extra structured fields
  error?:     unknown;               // raw Error or object — auto-serialised
}
```

### LogAuth

Attach when the action belongs to an authenticated user.

```ts
interface LogAuth {
  userId?:   string;
  email?:    string;
  roleName?: string;
  roleId?:   string;
}
```

### LogData

Use for CRUD operations. All fields are optional — include only what applies.

```ts
interface LogData {
  created?: unknown;   // newly created document
  fetched?: unknown;   // retrieved document(s)
  before?:  unknown;   // state before update/delete
  after?:   unknown;   // state after update
  [key: string]: unknown; // any additional freeform data
}
```

---

## Event Types

Event types are namespaced strings that categorise log entries for filtering in aggregators.

### Auth

| EventType | When to use |
|---|---|
| `auth.login` | Successful credential login |
| `auth.login.failed` | Failed login attempt |
| `auth.login.oauth` | Successful OAuth login |
| `auth.register` | Successful registration |
| `auth.register.failed` | Registration failure (e.g. duplicate email) |
| `auth.logout` | User signed out |
| `auth.session.build` | JWT session assembled |
| `auth.session.error` | Error during JWT/session callback |
| `auth.permission.check` | Permission lookup executed |
| `auth.permission.denied` | Access denied due to missing permission |

### Database

| EventType | When to use |
|---|---|
| `db.connected` | Mongoose connected to MongoDB |
| `db.error` | Mongoose connection error |
| `db.disconnected` | Mongoose disconnected |

### CRUD

| EventType | When to use |
|---|---|
| `crud.create` | Document created |
| `crud.read` | Document(s) fetched |
| `crud.update` | Document updated |
| `crud.delete` | Document deleted |

### Seed / Setup

| EventType | When to use |
|---|---|
| `seed.start` | Seed script started |
| `seed.step` | Individual seed step completed |
| `seed.complete` | Seed script finished |
| `seed.error` | Error during seeding |

### Generic

| EventType | When to use |
|---|---|
| `app.info` | General application information |
| `app.warn` | Non-critical warning |
| `app.error` | Unclassified application error |

Custom strings are also accepted — the `EventType` type extends `string`.

---

## Usage Examples

### Successful login

```ts
logger.info('User logged in', {
  eventType: 'auth.login',
  auth: { userId: user.id, email: user.email, roleName: 'admin' },
});
```

### Failed login

```ts
logger.error('Invalid credentials', {
  eventType: 'auth.login.failed',
  metadata: { email },
  error: err,
});
```

### User registration

```ts
logger.info('User registered', {
  eventType: 'auth.register',
  resource:  'user',
  auth: { email },
  data: { created: { id: newUser.id, email: newUser.email } },
});
```

### Database connection

```ts
logger.info('Database connected', {
  eventType: 'db.connected',
  metadata:  { uri: maskedUri },
});
```

### CRUD — create

```ts
logger.info('Project created', {
  eventType: 'crud.create',
  resource:  'project',
  auth: { userId },
  data: { created: project },
});
```

### CRUD — update (before/after)

```ts
logger.info('Project updated', {
  eventType: 'crud.update',
  resource:  'project',
  auth: { userId },
  data: { before: oldDoc, after: newDoc },
});
```

### CRUD — delete

```ts
logger.info('Project deleted', {
  eventType: 'crud.delete',
  resource:  'project',
  auth: { userId },
  data: { before: deletedDoc },
});
```

### Custom error

```ts
logger.error('Unexpected failure', {
  eventType: 'app.error',
  error: err,
});
```

---

## Output Formats

### Development (pretty)

```
2026-02-21 15:31:46.991 [INFO] Database connected (db.connected)
  {
    "metadata": { "uri": "mongodb://***@localhost:27017/script-minder" }
  }
```

```
2026-02-21 15:31:47.205 [ERROR] Invalid credentials (auth.login.failed)
  {
    "metadata": { "email": "user@example.com" },
    "error": { "message": "User not found" }
  }
```

Colours used:

| Level | Colour |
|---|---|
| `debug` | Cyan |
| `info` | Green |
| `warn` | Yellow |
| `error` | Red |

Error-level entries are written to **stderr**; all others to **stdout**.

### Production (JSON)

One JSON object per line:

```json
{"timestamp":"2026-02-21T15:31:46.991Z","level":"info","service":"script-minder","message":"Database connected","eventType":"db.connected","metadata":{"uri":"mongodb://***@localhost:27017/script-minder"}}
```

```json
{"timestamp":"2026-02-21T15:31:47.205Z","level":"error","service":"script-minder","message":"Invalid credentials","eventType":"auth.login.failed","metadata":{"email":"user@example.com"},"error":{"message":"User not found"}}
```

---

## Service Name

The `service` field in JSON output defaults to `"script-minder"`. Override it with an environment variable:

```env
LOGGER_SERVICE_NAME=my-custom-service
```

---

## Error Serialisation

The `error` field accepts any value — `Error` instances, plain objects, or primitives. It is always serialised to a safe object:

- **`Error` instance**: `{ message, stack (dev only), ...rest }`
- **Plain object**: `{ message: String(obj.message), ...rest }`
- **Primitive**: `{ message: String(value) }`

Stack traces are only included in `development` (`NODE_ENV !== 'production'`).

---

## Adding the Logger to a New API Route

```ts
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // ... business logic ...
    logger.info('Resource created', {
      eventType: 'crud.create',
      resource:  'resource-name',
      auth: { userId: session.user.id },
      data: { created: result },
    });
    return Response.json({ success: true });
  } catch (err) {
    logger.error('Failed to create resource', {
      eventType: 'app.error',
      error: err,
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## File Reference

| File | Purpose |
|---|---|
| [lib/logger.ts](../lib/logger.ts) | Logger implementation |
| [lib/db.ts](../lib/db.ts) | Uses `db.connected` / `db.error` |
| [auth.ts](../auth.ts) | Uses `auth.login.failed` / `auth.session.error` |
| [scripts/seed.ts](../scripts/seed.ts) | Uses `seed.step` / `seed.complete` |
