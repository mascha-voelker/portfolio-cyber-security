// Fixed /pages/api/generate-script.js with debugging
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    externalResolver: true,
  },
  maxDuration: 30,
};

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    setCorsHeaders(res);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  try {
    setCorsHeaders(res);
    
    // DEBUG CODE - Add this to see what's happening with the API key
    console.log('Environment debug:', {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length,
      keyStart: process.env.OPENAI_API_KEY?.substring(0, 10),
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
    });
    
    const { userStrategies, userName } = req.body;
    
    if (!userStrategies || typeof userStrategies !== 'string' || userStrategies.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'userStrategies is required and must be a non-empty string' 
      });
    }

    console.log('Generating script for strategies:', userStrategies.substring(0, 100) + '...');

    // Create the prompt for analyzing strategies
const prompt = `You are Graham, an IT specialist from the IT department at St. Johns Medical Centre in Dublin, Ireland. You are recording a short AI avatar video for a colleague named ${userName} who has submitted some cybersecurity strategies.

Your task is to create a personalized video script (30–45 seconds long). Please follow these exact steps:

1. Start directly in role. Do not describe a scene or setting. Immediately say: "Hello ${userName}, I'm Graham, Cillian's colleague. Nice to meet you."

2. Acknowledge the specific text the user submitted ("${userStrategies}") and provide feedback on their strategies based on the 4 phishing red flags below.

3. Evaluate their strategies against these 4 phishing red flags they will learn in the training:
   - Unfamiliar sender addresses
   - Fake domains pretending to be ours
   - Suspicious or unexpected links and files
   - Urgent language pressuring quick action

4. Give specific feedback on their submitted strategies:
   - If they mentioned strategies that match one or more of these 4 red flags, acknowledge what they got right and say they already know something about identifying phishing attempts
   - If their strategies don't match these 4 red flags, gently redirect them toward these specific areas without criticizing their input
   - Only discuss additional cybersecurity tips if the user already mentioned them in their strategies

5. End with a short motivational closing such as: "Let's get started and work together to create a safe working environment."

Important style rules:
- Keep it conversational, professional, and friendly
- Do not describe Graham physically, his environment, or the video setting — only write what Graham says
- Focus feedback specifically on the 4 red flags listed above
- Keep the length within 30–45 seconds
`;

    // Call OpenAI API with better error handling
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Cillian, a helpful IT specialist who provides personalized cybersecurity feedback through video scripts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500, // Increased for longer script
      temperature: 0.7,
    });

    const generatedScript = completion.choices[0].message.content.trim();

    console.log('Script generated successfully, length:', generatedScript.length);

    return res.status(200).json({
      success: true,
      script: generatedScript
    });

  } catch (error) {
    console.error('Error generating script:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to generate script';
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
}