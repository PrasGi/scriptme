/**
 * Next.js middleware: protect routes and redirect unauthenticated users to /login.
 * Uses the shared proxy logic so /dashboard and other app routes require a valid session.
 */
export { proxy as default, config } from './proxy';
