import { Pool } from 'pg';
import crypto from 'node:crypto';

function createPool(databaseUrl) {
  // Use SSL only if explicitly requested (good for cloud DBs). Local PG usually needs ssl: false
  const wantSSL = /sslmode=require/i.test(databaseUrl) || process.env.PGSSL === '1' || process.env.PGSSLMODE === 'require';
  const ssl = wantSSL ? { rejectUnauthorized: false } : false;
  return new Pool({ connectionString: databaseUrl, ssl });
}

export function createStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = createPool(databaseUrl);

  async function init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        player_id TEXT,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_fav_room_player ON favorites(room_code, player_id);
      DO $$ BEGIN
        ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id TEXT;
      EXCEPTION WHEN others THEN NULL; END $$;
      CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id, created_at);

      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        player_id TEXT,
        round INTEGER,
        prompt TEXT,
        answer TEXT,
        score INTEGER,
        feedback TEXT,
        corrections TEXT,
        language TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_hist_room_player ON history(room_code, player_id, round);

      CREATE TABLE IF NOT EXISTS playground_logs (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        player_id TEXT,
        kind TEXT,
        prompt TEXT,
        answer TEXT,
        score INTEGER,
        feedback TEXT,
        corrections TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_pg_room_player ON playground_logs(room_code, player_id, created_at);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        name TEXT,
        picture TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  }

  function makeId() { return crypto.randomUUID ? crypto.randomUUID() : ('fav_' + Math.random().toString(36).slice(2, 10)); }

  async function addFavorite({ roomCode, playerId, userId, text }) {
    const id = makeId();
    await pool.query(`INSERT INTO favorites (id, room_code, player_id, user_id, text) VALUES ($1,$2,$3,$4,$5)`, [id, roomCode || null, playerId || null, userId || null, text]);
    return { id, roomCode, playerId, text, createdAt: new Date().toISOString() };
  }

  async function listFavorites({ roomCode, playerId, userId, limit = 50 }) {
    let res;
    if (userId) {
      res = await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId", user_id AS "userId", created_at AS "createdAt" FROM favorites WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    } else {
      res = await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId", user_id AS "userId", created_at AS "createdAt" FROM favorites WHERE room_code = $1 AND player_id = $2 ORDER BY created_at DESC LIMIT $3`, [roomCode, playerId, limit]);
    }
    return res.rows || [];
  }

  async function deleteFavorite(id, { playerId, roomCode, userId }) {
    if (userId) {
      await pool.query(`DELETE FROM favorites WHERE id = $1 AND user_id = $2`, [id, userId]);
    } else {
      await pool.query(`DELETE FROM favorites WHERE id = $1 AND player_id = $2 AND room_code = $3`, [id, playerId, roomCode]);
    }
  }

  async function getFavoriteById({ id, playerId, roomCode, userId }) {
    const res = userId
      ? await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId", user_id AS "userId" FROM favorites WHERE id = $1 AND user_id = $2`, [id, userId])
      : await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId", user_id AS "userId" FROM favorites WHERE id = $1 AND player_id = $2 AND room_code = $3`, [id, playerId, roomCode]);
    return res.rows?.[0] || null;
  }

  return { init, addFavorite, listFavorites, deleteFavorite, getFavoriteById };
}

export function historyStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = createPool(databaseUrl);
  function makeId() { return crypto.randomUUID ? crypto.randomUUID() : ('h_' + Math.random().toString(36).slice(2, 10)); }
  async function addHistoryBulk(items) {
    const text = `INSERT INTO history (id, room_code, player_id, round, prompt, answer, score, feedback, corrections, language)
                  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const it of items) {
        await client.query(text, [makeId(), it.roomCode, it.playerId, it.round, it.prompt, it.answer, it.score, it.feedback, it.corrections || null, it.language || null]);
      }
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally { client.release(); }
  }
  async function listRecent(roomCode, playerId, limit = 20) {
    const res = await pool.query(`SELECT round, prompt, answer, score, feedback, corrections, language, created_at AS "createdAt" FROM history WHERE room_code=$1 AND player_id=$2 ORDER BY created_at DESC LIMIT $3`, [roomCode, playerId, limit]);
    return res.rows || [];
  }
  return { addHistoryBulk, listRecent };
}

export function playgroundStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = createPool(databaseUrl);
  function makeId() { return crypto.randomUUID ? crypto.randomUUID() : ('pg_' + Math.random().toString(36).slice(2, 10)); }
  async function logResults(roomCode, playerId, items) {
    const text = `INSERT INTO playground_logs (id, room_code, player_id, kind, prompt, answer, score, feedback, corrections)
                  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const it of items) {
        await client.query(text, [makeId(), roomCode, playerId, it.kind || null, it.prompt || '', it.answer || '', it.score || 0, it.feedback || '', it.corrections || null]);
      }
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally { client.release(); }
  }
  async function listRecent(roomCode, playerId, limit = 20) {
    const res = await pool.query(`SELECT kind, prompt, answer, score, feedback, corrections, created_at AS "createdAt" FROM playground_logs WHERE room_code=$1 AND player_id=$2 ORDER BY created_at DESC LIMIT $3`, [roomCode, playerId, limit]);
    return res.rows || [];
  }
  return { logResults, listRecent };
}

// Optional user upsert used by Google login
export function userStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = createPool(databaseUrl);
  async function upsertUser({ id, email, name, picture }) {
    await pool.query(`
      INSERT INTO users (id, email, name, picture)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
    `, [id, email || null, name || null, picture || null]);
  }
  async function getUser(id) {
    const r = await pool.query(`SELECT id, email, name, picture FROM users WHERE id=$1`, [id]);
    return r.rows?.[0] || null;
  }
  return { upsertUser, getUser };
}
