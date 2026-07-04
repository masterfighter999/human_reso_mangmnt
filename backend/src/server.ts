import app from './app';
import { env } from './config/env';
import { pool } from './config/database';

// ─── Start Server ─────────────────────────────────────────────────────────────

const server = app.listen(env.PORT, () => {
  console.log(`\n🚀  HRMS API running`);
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Port        : ${env.PORT}`);
  console.log(`   Base URL    : http://localhost:${env.PORT}/api/v1`);
  console.log(`   Health      : http://localhost:${env.PORT}/api/v1/health\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// On SIGTERM / SIGINT: stop accepting new connections, drain the DB pool,
// then exit. This avoids dropping in-flight requests in production.

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n⚠️   ${signal} received — shutting down gracefully...`);

  server.close(async () => {
    console.log('   HTTP server closed.');
    await pool.end();
    console.log('   DB pool closed.\n');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('   Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

// ─── Unhandled Rejections ─────────────────────────────────────────────────────
// Log and exit so the process manager (PM2 / Docker) can restart cleanly.

process.on('unhandledRejection', (reason) => {
  console.error('❌  Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌  Uncaught Exception:', err);
  process.exit(1);
});
