export default function handler(req, res) {
  if (req.method === 'POST') {
    const { userMessage } = req.body;
    res.status(200).json({ replyText: `You said: ${userMessage}` });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
