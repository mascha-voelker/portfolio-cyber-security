// This should actually be moved to pages/api/chat.js (not in src/routes/)
import { chatService } from '../services/chatService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await chatService.getChatResponse(message, context);
    
    return res.json({ 
      response: response.content,
      metadata: {
        tone: response.tone || 'friendly',
        emotion: response.emotion || 'neutral'
      }
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({ error: 'Failed to get response from chatbot' });
  }
}