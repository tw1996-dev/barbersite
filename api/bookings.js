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
    try {
      const { date, time, customer, phone, email, services, duration, price, status, notes } = req.body;
      
      const result = await pool.query(
        'INSERT INTO bookings (date, time, customer, phone, email, services, duration, price, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [date, time, customer, phone, email || '', services, duration, price, status || 'confirmed', notes || '']
      );
      
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}