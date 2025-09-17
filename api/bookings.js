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
      
      const result = await pool.query('SELECT NOW() as current_time');
      
     
      const bookings = await pool.query('SELECT * FROM bookings ORDER BY date, time');
      
      return res.status(200).json({
        success: true,
        connection_time: result.rows[0].current_time,
        bookings: bookings.rows,
        total_bookings: bookings.rows.length
      });
      
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}