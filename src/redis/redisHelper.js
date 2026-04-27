import Redis from "ioredis";
import { redisConfig } from "./config.js";

// ─── Connection ────────────────────────────────────────────────────────────────

let client = null;

/**
 * Swap in a new client (used by multi-connection support in server.js).
 * @param {Redis} c
 */
export function setClient(c) {
  client = c;
}

/**
 * Get (or lazily create) the shared Redis client.
 * @returns {Redis}
 */
export function getClient() {
  if (!client) {
    client = new Redis(redisConfig.url, redisConfig.options);
    client.on("connect", () => console.log("[Redis] connected"));
    client.on("error", (err) => console.error("[Redis] error:", err.message));
    client.on("close", () => console.warn("[Redis] connection closed"));
  }
  return client;
}

/**
 * Destroy the current client and reconnect with a new URL / options.
 * @param {string} url
 * @param {object} [options]
 */
export async function reconnect(url, options = {}) {
  if (client) {
    try { await client.quit(); } catch { /* ignore */ }
    client = null;
  }
  client = new Redis(url, { ...redisConfig.options, ...options, lazyConnect: true });
  client.on("error", (err) => console.error("[Redis] error:", err.message));
  await client.connect();
  await client.ping(); // throws if unreachable
  redisConfig.url = url;
}

/**
 * Disconnect and destroy the shared client.
 */
export async function disconnect() {
  if (client) {
    await client.quit();
    client = null;
  }
}

// ─── String ────────────────────────────────────────────────────────────────────

/**
 * Set a key to a value, with an optional TTL in seconds.
 * @param {string} key
 * @param {string|number} value
 * @param {number} [ttl]  seconds
 */
export async function set(key, value, ttl) {
  const r = getClient();
  if (ttl) return r.set(key, value, "EX", ttl);
  return r.set(key, value);
}

/**
 * Get the value of a key. Returns null if not found.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function get(key) {
  return getClient().get(key);
}

/**
 * Delete one or more keys.
 * @param {...string} keys
 * @returns {Promise<number>} number of keys removed
 */
export async function del(...keys) {
  return getClient().del(...keys);
}

/**
 * Check if a key exists.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function exists(key) {
  return (await getClient().exists(key)) === 1;
}

/**
 * Set a TTL (in seconds) on an existing key.
 * @param {string} key
 * @param {number} seconds
 */
export async function expire(key, seconds) {
  return getClient().expire(key, seconds);
}

/**
 * Get the remaining TTL of a key in seconds. Returns -1 if no TTL, -2 if missing.
 * @param {string} key
 * @returns {Promise<number>}
 */
export async function ttl(key) {
  return getClient().ttl(key);
}

/**
 * Increment a numeric key by 1 (or by `by`).
 */
export async function incr(key, by = 1) {
  if (by === 1) return getClient().incr(key);
  return getClient().incrby(key, by);
}

/**
 * Decrement a numeric key by 1 (or by `by`).
 */
export async function decr(key, by = 1) {
  if (by === 1) return getClient().decr(key);
  return getClient().decrby(key, by);
}

// ─── Hash ──────────────────────────────────────────────────────────────────────

/**
 * Set one or more hash fields.
 * @param {string} key
 * @param {Record<string, string|number>} fields
 */
export async function hset(key, fields) {
  return getClient().hset(key, fields);
}

/**
 * Get a single hash field.
 * @param {string} key
 * @param {string} field
 * @returns {Promise<string|null>}
 */
export async function hget(key, field) {
  return getClient().hget(key, field);
}

/**
 * Get all fields and values of a hash.
 * @param {string} key
 * @returns {Promise<Record<string, string>>}
 */
export async function hgetall(key) {
  return getClient().hgetall(key);
}

/**
 * Delete one or more hash fields.
 * @param {string} key
 * @param {...string} fields
 */
export async function hdel(key, ...fields) {
  return getClient().hdel(key, ...fields);
}

/**
 * Get all hash field names.
 * @param {string} key
 */
export async function hkeys(key) {
  return getClient().hkeys(key);
}

/**
 * Get all hash values.
 * @param {string} key
 */
export async function hvals(key) {
  return getClient().hvals(key);
}

// ─── List ──────────────────────────────────────────────────────────────────────

/**
 * Push one or more values to the left (head) of a list.
 */
export async function lpush(key, ...values) {
  return getClient().lpush(key, ...values);
}

/**
 * Push one or more values to the right (tail) of a list.
 */
export async function rpush(key, ...values) {
  return getClient().rpush(key, ...values);
}

/**
 * Pop a value from the left (head) of a list.
 * @returns {Promise<string|null>}
 */
export async function lpop(key) {
  return getClient().lpop(key);
}

/**
 * Pop a value from the right (tail) of a list.
 * @returns {Promise<string|null>}
 */
export async function rpop(key) {
  return getClient().rpop(key);
}

/**
 * Get elements from a list (0-indexed; use 0, -1 for the entire list).
 * @param {string} key
 * @param {number} start
 * @param {number} stop
 */
export async function lrange(key, start = 0, stop = -1) {
  return getClient().lrange(key, start, stop);
}

/**
 * Get the length of a list.
 */
export async function llen(key) {
  return getClient().llen(key);
}

// ─── Set ───────────────────────────────────────────────────────────────────────

/**
 * Add one or more members to a set.
 */
export async function sadd(key, ...members) {
  return getClient().sadd(key, ...members);
}

/**
 * Remove one or more members from a set.
 */
export async function srem(key, ...members) {
  return getClient().srem(key, ...members);
}

/**
 * Get all members of a set.
 */
export async function smembers(key) {
  return getClient().smembers(key);
}

/**
 * Check if a value is a member of a set.
 * @returns {Promise<boolean>}
 */
export async function sismember(key, member) {
  return (await getClient().sismember(key, member)) === 1;
}

/**
 * Get the number of members in a set.
 */
export async function scard(key) {
  return getClient().scard(key);
}

// ─── Sorted Set ────────────────────────────────────────────────────────────────

/**
 * Add one or more members with scores to a sorted set.
 * @param {string} key
 * @param {Array<{score: number, member: string}>} items
 */
export async function zadd(key, items) {
  const args = items.flatMap(({ score, member }) => [score, member]);
  return getClient().zadd(key, ...args);
}

/**
 * Get members of a sorted set by rank (ascending).
 * @param {string} key
 * @param {number} start
 * @param {number} stop
 * @param {boolean} [withScores]
 */
export async function zrange(key, start = 0, stop = -1, withScores = false) {
  if (withScores) return getClient().zrange(key, start, stop, "WITHSCORES");
  return getClient().zrange(key, start, stop);
}

/**
 * Get the score of a member in a sorted set.
 */
export async function zscore(key, member) {
  return getClient().zscore(key, member);
}

/**
 * Remove one or more members from a sorted set.
 */
export async function zrem(key, ...members) {
  return getClient().zrem(key, ...members);
}

/**
 * Get the rank of a member (0-indexed, ascending).
 */
export async function zrank(key, member) {
  return getClient().zrank(key, member);
}

/**
 * Get the number of members in a sorted set.
 */
export async function zcard(key) {
  return getClient().zcard(key);
}

// ─── Key Utilities ─────────────────────────────────────────────────────────────

/**
 * Find keys matching a pattern (use carefully in production — blocks server).
 * @param {string} pattern  e.g. "user:*"
 */
export async function keys(pattern = "*") {
  return getClient().keys(pattern);
}

/**
 * Scan keys matching a pattern without blocking (cursor-based iteration).
 * Returns all matching keys across all pages.
 * @param {string} pattern
 * @param {number} [count]  hint per batch
 * @returns {Promise<string[]>}
 */
export async function scan(pattern = "*", count = 100) {
  const r = getClient();
  const results = [];
  let cursor = "0";
  do {
    const [next, batch] = await r.scan(cursor, "MATCH", pattern, "COUNT", count);
    cursor = next;
    results.push(...batch);
  } while (cursor !== "0");
  return results;
}

/**
 * Get the type of a key: string | list | set | zset | hash | none
 */
export async function type(key) {
  return getClient().type(key);
}

/**
 * Rename a key.
 */
export async function rename(key, newKey) {
  return getClient().rename(key, newKey);
}

// ─── Pub / Sub ─────────────────────────────────────────────────────────────────

/**
 * Publish a message to a channel.
 * @returns {Promise<number>} number of subscribers that received the message
 */
export async function publish(channel, message) {
  return getClient().publish(channel, message);
}

/**
 * Subscribe to one or more channels.
 * Creates a dedicated subscriber client (required by Redis protocol).
 * @param {string[]} channels
 * @param {(channel: string, message: string) => void} onMessage
 * @returns {Redis} the subscriber client (call .quit() to unsubscribe)
 */
export function subscribe(channels, onMessage) {
  const sub = new Redis(redisConfig.url, redisConfig.options);
  sub.subscribe(...channels);
  sub.on("message", onMessage);
  return sub;
}

// ─── Pipeline / Transaction ────────────────────────────────────────────────────

/**
 * Run multiple commands in a pipeline (batched, not atomic).
 * @param {(pipeline: import("ioredis").Pipeline) => void} fn
 * @returns {Promise<Array>}
 */
export async function pipeline(fn) {
  const p = getClient().pipeline();
  fn(p);
  return p.exec();
}

/**
 * Run multiple commands in an atomic MULTI/EXEC transaction.
 * @param {(multi: import("ioredis").Pipeline) => void} fn
 * @returns {Promise<Array>}
 */
export async function multi(fn) {
  const m = getClient().multi();
  fn(m);
  return m.exec();
}

// ─── Server ────────────────────────────────────────────────────────────────────

/**
 * Ping the server. Returns "PONG".
 */
export async function ping() {
  return getClient().ping();
}

/**
 * Flush the current database (FLUSHDB). Use with caution.
 */
export async function flushdb() {
  return getClient().flushdb();
}

/**
 * Get server info.
 */
export async function info(section) {
  if (section) return getClient().info(section);
  return getClient().info();
}

/**
 * Get the number of keys in the current database.
 */
export async function dbsize() {
  return getClient().dbsize();
}
