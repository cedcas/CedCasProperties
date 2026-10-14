// Test-only stand-in for the `server-only` package.
//
// `server-only`'s real implementation unconditionally throws on import — it relies on
// webpack/Next.js replacing it with a no-op in server bundles and leaving the throw intact
// only in client bundles. Vitest runs under plain Node with no such bundler substitution, so
// importing the real package here would throw in every test, server or not. vitest.config.ts
// aliases "server-only" to this empty module so files that correctly import it for production
// (keeping API keys and other secrets out of any client bundle) stay unit-testable.
export {};
