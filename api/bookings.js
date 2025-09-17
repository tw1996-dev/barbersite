module.exports = async function handler(req, res) {
 
  const envInfo = {
    hasDATABASE_URL: !!process.env.DATABASE_URL,
    hasPGUSER: !!process.env.PGUSER,
    hasPGPASSWORD: !!process.env.PGPASSWORD,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('PG') || key.includes('DATABASE')
    )
  };

  return res.status(200).json(envInfo);
};