import { Pool } from 'pg';
import crypto from 'node:crypto';

export function createStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

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
    `);
  }

  function makeId() { return crypto.randomUUID ? crypto.randomUUID() : ('fav_' + Math.random().toString(36).slice(2, 10)); }

  async function addFavorite({ roomCode, playerId, text }) {
    const id = makeId();
    await pool.query(`INSERT INTO favorites (id, room_code, player_id, text) VALUES ($1,$2,$3,$4)`, [id, roomCode, playerId, text]);
    return { id, roomCode, playerId, text, createdAt: new Date().toISOString() };
  }

  async function listFavorites(roomCode, playerId, limit = 50) {
    const res = await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId", created_at AS "createdAt" FROM favorites WHERE room_code = $1 AND player_id = $2 ORDER BY created_at DESC LIMIT $3`, [roomCode, playerId, limit]);
    return res.rows || [];
  }

  async function deleteFavorite(id, playerId, roomCode) {
    await pool.query(`DELETE FROM favorites WHERE id = $1 AND player_id = $2 AND room_code = $3`, [id, playerId, roomCode]);
  }

  async function getFavoriteById(id, playerId, roomCode) {
    const res = await pool.query(`SELECT id, text, room_code AS "roomCode", player_id AS "playerId" FROM favorites WHERE id = $1 AND player_id = $2 AND room_code = $3`, [id, playerId, roomCode]);
    return res.rows?.[0] || null;
  }

  return { init, addFavorite, listFavorites, deleteFavorite, getFavoriteById };
}

