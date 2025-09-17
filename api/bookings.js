import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM bookings ORDER BY date, time');
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  if (req.method === 'POST') {
    return res.status(405).json({ error: 'Method not implemented yet' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}