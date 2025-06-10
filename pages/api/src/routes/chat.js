const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');

// Route to get a response from the chatbot
router.post('/message', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await chatService.getChatResponse(message, context);
    
    return res.json({ 
      response: response.content,
      // Include any metadata needed for HeyGen avatar
      metadata: {
        tone: response.tone || 'friendly',
        emotion: response.emotion || 'neutral'
      }
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({ error: 'Failed to get response from chatbot' });
  }
});

// Additional routes if needed, e.g. for feedback history, user management, etc.

module.exports = router;