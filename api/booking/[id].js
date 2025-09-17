import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      return res.status(200).json({ message: 'Booking deleted' });
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}