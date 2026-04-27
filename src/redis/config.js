// Redis connection configuration
// Replace REDIS_URL with your actual Redis connection URL
// Formats:
//   redis://localhost:6379
//   redis://:password@localhost:6379
//   redis://username:password@host:6379/0
//   rediss://... (TLS)

export const redisConfig = {
  url: "redis://localhost:6379",

  // Optional: connection options (override per-field if not using a URL)
  options: {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: false,
  },
};
