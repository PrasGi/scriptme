/**
 * Load .env.local and .env before any other modules.
 * Import this first in worker scripts: import '../scripts/load-env';
 */
import { config } from 'dotenv';
import { resolve } from 'path';

const root = process.cwd();
config({ path: resolve(root, '.env.local') });
config({ path: resolve(root, '.env') });
