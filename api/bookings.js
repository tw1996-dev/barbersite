export default function handler(req, res) {
  // testing
  const hasDB = !!process.env.DATABASE_URL;
  const hasUnpooled = !!process.env.DATABASE_URL_UNPOOLED;
  const hasPGHost = !!process.env.PGHOST;
  
  return res.status(200).json({ 
    message: "Function works!",
    neon_integration: {
      DATABASE_URL: hasDB,
      DATABASE_URL_UNPOOLED: hasUnpooled, 
      PGHOST: hasPGHost
    }
  });
}