export default async function handler(req, res) {
  const { token } = req.query;

  const validTokens = ['abc123', 'alice2025'];

  if (!token || !validTokens.includes(token)) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  return res.status(200).json({ message: 'Token is valid' });
}
