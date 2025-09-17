const { Pool } = require('pg');

module.exports = async function handler(req, res) {
  // DEBUG: 
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not found' });
  }

  
  const dbUrl = process.env.DATABASE_URL;
  const safeUrl = dbUrl.substring(0, 50) + '...';
  
  return res.status(200).json({ 
    debug: 'DATABASE_URL found',
    url_start: safeUrl,
    length: dbUrl.length
  });
};