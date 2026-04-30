import express from "express";
import cors from "cors";
import Redis from "ioredis";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  setClient,
  get, set, del, ttl, type, rename,
  hset, hgetall, hdel,
  lrange, lpush, rpush,
  smembers, sadd, srem,
  zrem,
  dbsize, info, ping,
} from "./src/redis/redisHelper.js";

const app = express();
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
}


const registry = new Map(); // id -> { id, name, host, port, db, tls, username, url, client }
let activeId = null;

function buildUrl({ host, port = 6379, username = "", password = "", db = 0, tls = false }) {
  const proto = tls ? "rediss" : "redis";
  const auth = password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : username ? `${encodeURIComponent(username)}@` : "";
  return `${proto}://${auth}${host}:${port}/${db}`;
}

function clientStatus(client) {
  if (!client) return "error";
  const s = client.status;
  if (s === "ready") return "connected";
  if (s === "reconnecting" || s === "connecting" || s === "wait") return "connecting";
  return "error";
}

function serializeAll() {
  return [...registry.values()].map(({ id, name, host, port, db, tls, username, url, client }) => ({
    id, name, host, port, db, tls, username, url,
    active: id === activeId,
    status: clientStatus(client),
  }));
}

function getActiveClient() {
  const conn = registry.get(activeId);
  if (!conn) throw new Error("No active Redis connection");
  return conn.client;
}

function uniqueLabel(base) {
  const existing = new Set([...registry.values()].map((c) => c.name));
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

async function addConnection({ name, host, port = 6379, username = "", password = "", db = 0, tls = false }, activate = true) {
  const url = buildUrl({ host, port, username, password, db, tls });
  const client = new Redis(url, {
    maxRetriesPerRequest: 0,   // don't retry — fail fast
    connectTimeout: 10000,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  client.on("error", () => {}); // silence — status tracked via client.status

  try {
    await client.connect();
    await client.ping();
  } catch (err) {
    try { client.disconnect(false); } catch { /* ignore */ }
    // Surface clearer messages for common failures
    const msg = err.message ?? "";
    if (msg.includes("WRONGPASS") || msg.includes("invalid password"))
      throw new Error("Authentication failed — wrong password");
    if (msg.includes("NOAUTH"))
      throw new Error("Redis requires a password but none was provided");
    if (msg.includes("connect ECONNREFUSED") || msg.includes("connect ETIMEDOUT"))
      throw new Error(`Cannot reach Redis at ${host}:${port} — check firewall / security group and that Redis is bound to 0.0.0.0`);
    if (msg.includes("Connection is closed") || msg.includes("closed"))
      throw new Error(`Connection closed by ${host}:${port} — likely wrong password or Redis protected-mode is blocking external connections`);
    throw err;
  }

  const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  const baseLabel = name?.trim() || `${host}:${port}${Number(db) !== 0 ? `/db${db}` : ""}`;
  const label = uniqueLabel(baseLabel);
  registry.set(id, { id, name: label, host, port: Number(port), username, db: Number(db), tls, url, client });

  if (activate || registry.size === 1) {
    activeId = id;
    setClient(client); // plug into redisHelper singleton
  }

  return id;
}

// Boot with default local connection (non-fatal if Redis isn't up yet)
try {
  await addConnection({ name: "localhost", host: "localhost", port: 6379 });
  console.log("[Redis] Default connection ready");
} catch (err) {
  console.warn("[Redis] Default connection failed:", err.message, "— connect via UI");
}

app.get("/api/connections", (_req, res) => {
  res.json(serializeAll());
});

app.post("/api/connections", async (req, res) => {
  const { name, host, port = 6379, username = "", password = "", db = 0, tls = false, activate = true } = req.body;
  if (!host) return res.status(400).json({ error: "host is required" });
  try {
    const id = await addConnection({ name, host, port, username, password, db, tls }, activate);
    res.json({ ok: true, id, connections: serializeAll() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.put("/api/connections/:id/activate", (req, res) => {
  const conn = registry.get(req.params.id);
  if (!conn) return res.status(404).json({ error: "Connection not found" });
  activeId = req.params.id;
  setClient(conn.client);
  res.json({ ok: true, connections: serializeAll() });
});

app.delete("/api/connections/:id", async (req, res) => {
  const { id } = req.params;
  if (id === activeId) return res.status(400).json({ error: "Cannot remove the active connection. Switch first." });
  const conn = registry.get(id);
  if (!conn) return res.status(404).json({ error: "Connection not found" });
  try { await conn.client.quit(); } catch { /* ignore */ }
  registry.delete(id);
  res.json({ ok: true, connections: serializeAll() });
});

app.patch("/api/connections/:id", (req, res) => {
  const conn = registry.get(req.params.id);
  if (!conn) return res.status(404).json({ error: "Connection not found" });
  if (req.body.name) conn.name = req.body.name.trim();
  res.json({ ok: true, connections: serializeAll() });
});

app.post("/api/connect", async (req, res) => {
  const { host, port = 6379, username = "", password = "", db = 0, tls = false } = req.body;
  if (!host) return res.status(400).json({ error: "host is required" });
  try {
    await addConnection({ host, port, username, password, db, tls }, true);
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.get("/api/connection", (_req, res) => {
  const conn = registry.get(activeId);
  if (!conn) return res.json({});
  res.json({ host: conn.host, port: conn.port, username: conn.username, db: conn.db, tls: conn.tls, url: conn.url });
});

app.get("/api/ping", async (_req, res) => {
  try {
    const result = await ping();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.get("/api/info", async (_req, res) => {
  try {
    const [rawInfo, size] = await Promise.all([info("server"), dbsize()]);
    const parsed = {};
    for (const line of rawInfo.split("\r\n")) {
      if (line && !line.startsWith("#")) {
        const [k, v] = line.split(":");
        if (k && v !== undefined) parsed[k.trim()] = v.trim();
      }
    }
    const conn = registry.get(activeId);
    res.json({ dbsize: size, version: parsed.redis_version, uptime: parsed.uptime_in_seconds, url: conn?.url });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

app.get("/api/keys", async (req, res) => {
  try {
    const pattern = req.query.pattern || "*";
    const count   = parseInt(req.query.count) || 200;
    const r = getActiveClient();
    const [nextCursor, batch] = await r.scan(req.query.cursor || "0", "MATCH", pattern, "COUNT", count);
    const pipeline = r.pipeline();
    batch.forEach((k) => { pipeline.type(k); pipeline.ttl(k); });
    const results = await pipeline.exec();
    res.json({
      cursor: nextCursor,
      keys: batch.map((k, i) => ({ key: k, type: results[i * 2][1], ttl: results[i * 2 + 1][1] })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/keys", async (req, res) => {
  try {
    const { keys: ks } = req.body;
    if (!Array.isArray(ks) || ks.length === 0) return res.status(400).json({ error: "keys array required" });
    res.json({ deleted: await del(...ks) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/key/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const [keyType, keyTtl] = await Promise.all([type(key), ttl(key)]);
    if (keyType === "none") return res.status(404).json({ error: "Key not found" });
    let value;
    switch (keyType) {
      case "string": value = await get(key); break;
      case "hash":   value = await hgetall(key); break;
      case "list":   value = await lrange(key, 0, -1); break;
      case "set":    value = await smembers(key); break;
      case "zset": {
        const raw = await getActiveClient().zrange(key, 0, -1, "WITHSCORES");
        value = [];
        for (let i = 0; i < raw.length; i += 2) value.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
        break;
      }
      default: value = null;
    }
    res.json({ key, type: keyType, ttl: keyTtl, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/key", async (req, res) => {
  try {
    const { key, type: keyType, value, ttl: keyTtl } = req.body;
    if (!key || !keyType || value === undefined) return res.status(400).json({ error: "key, type and value required" });
    await del(key);
    const r = getActiveClient();
    switch (keyType) {
      case "string": await set(key, value, keyTtl || undefined); break;
      case "hash":   await hset(key, value); if (keyTtl) await r.expire(key, keyTtl); break;
      case "list":   if (Array.isArray(value) && value.length) await rpush(key, ...value); if (keyTtl) await r.expire(key, keyTtl); break;
      case "set":    if (Array.isArray(value) && value.length) await sadd(key, ...value); if (keyTtl) await r.expire(key, keyTtl); break;
      case "zset":   if (Array.isArray(value) && value.length) await r.zadd(key, ...value.flatMap(({ score, member }) => [score, member])); if (keyTtl) await r.expire(key, keyTtl); break;
      default: return res.status(400).json({ error: `Unsupported type: ${keyType}` });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/key/:key/ttl", async (req, res) => {
  try {
    const r = getActiveClient();
    req.body.ttl === -1 ? await r.persist(req.params.key) : await r.expire(req.params.key, req.body.ttl);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/key/:key", async (req, res) => {
  try { res.json({ deleted: await del(req.params.key) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/api/key/:key/rename", async (req, res) => {
  try {
    const { newKey } = req.body;
    if (!newKey) return res.status(400).json({ error: "newKey is required" });
    await rename(req.params.key, newKey);
    res.json({ ok: true, newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/key/:key/clone", async (req, res) => {
  try {
    const { newKey } = req.body;
    if (!newKey) return res.status(400).json({ error: "newKey is required" });
    const ok = await getActiveClient().copy(req.params.key, newKey, "REPLACE");
    if (!ok) throw new Error("Clone failed");
    res.json({ ok: true, newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/key/:key/hash", async (req, res) => {
  try { await hset(req.params.key, { [req.body.field]: req.body.value }); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/key/:key/hash/:field", async (req, res) => {
  try { await hdel(req.params.key, req.params.field); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/key/:key/list", async (req, res) => {
  try {
    const { value, position = "right" } = req.body;
    position === "left" ? await lpush(req.params.key, value) : await rpush(req.params.key, value);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/key/:key/list", async (req, res) => {
  try { await getActiveClient().lrem(req.params.key, 1, req.body.value); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/key/:key/set", async (req, res) => {
  try { await sadd(req.params.key, req.body.member); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/key/:key/set", async (req, res) => {
  try { await srem(req.params.key, req.body.member); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/key/:key/zset", async (req, res) => {
  try { await getActiveClient().zadd(req.params.key, req.body.score, req.body.member); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/key/:key/zset", async (req, res) => {
  try { await zrem(req.params.key, req.body.member); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Redis API server → http://localhost:${PORT}`));
