const { createClient } = require("redis");

async function main() {
     const clientServer = createClient({
          url: process.env.NODE_ENV === "development"
               ? process.env.REDIS_CACHE_DEV
               : process.env.REDIS_CACHE_LIVE,
          socket: {
               connectTimeout: 30000,
               reconnectStrategy: (retries) =>
                    Math.min(retries * 100, 3000),
          },
     });

     try {
          console.log("🧹 Connecting to Redis...");

          await Promise.all([
               clientServer.connect(),
          ]);

          console.log("🔥 Flushing Redis...");

          await Promise.all([
               clientServer.flushAll(),
          ]);

          console.log("✅ Done flushing Redis");
     } catch (err) {
          console.error("❌ Redis error:", err);
          process.exitCode = 1;
     } finally {
          console.log("🔌 Disconnecting Redis...");

          await Promise.all([
               clientServer.quit(),
          ]);
     }
}

main();
