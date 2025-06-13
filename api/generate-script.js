// This file should be saved at /pages/api/generate-script.js .
import OpenAI from 'openai';

// Add the API configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    externalResolver: true,
  },
};

// Set up CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

// Initialize OpenAI with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to create video with HeyGen
const createHeyGenVideo = async (script, username) => {
  try {
    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: "avatar",
            avatar_id: "Raul_expressive_2024112501", // Replace with your chosen avatar ID
            avatar_style: "normal"
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: "a426f8a763824ceaad3a2eb29c68e121", // Replace with your chosen voice ID
            speed: 1.0
          },
          background: {
            type: "color",
            value: "#ffffff" // White background, customize as needed
          }
        }],
        dimension: {
          width: 1280,
          height: 720
        },
        aspect_ratio: "16:9",
        test: false // Set to true for testing without using credits
      })
    });

    const heygenData = await heygenResponse.json();

    if (!heygenResponse.ok) {
      throw new Error(`HeyGen API error: ${heygenData.message || 'Unknown error'}`);
    }

    return {
      success: true,
      video_id: heygenData.data.video_id
    };

  } catch (error) {
    console.error('Error creating HeyGen video:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  
  // Ensure we're handling a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Get the username and optional createVideo flag from the request body
    const { username, createVideo = false } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Create the prompt for OpenAI
    const prompt = `'Generate a welcome video script for a user named ${username}. You act as Cilian, an IT specialist from the IT department of the St. Johns Medical Centre in Dublin, Ireland. Your script should be almost identical to this one. Please only change a word or two but stay in the context.   - Welcome ${username} - I'm Cillian from the IT department. As you might know, we've been getting a lot of phishing emails lately … I'm glad seeing you contributing to the company's cyber security. And who knows, maybe you learn a thing or two for your private digital security … - '`;

    // Call OpenAI API to generate the script using the chat completions endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a valid model
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates personalized welcome scripts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    // Extract the generated script
    const generatedScript = completion.choices[0].message.content.trim();

    // If createVideo is false, just return the script (your original functionality)
    if (!createVideo) {
      return res.status(200).json({
        success: true,
        script: generatedScript
      });
    }

    // If createVideo is true, also create the HeyGen video
    try {
      const videoResult = await createHeyGenVideo(generatedScript, username);
      
      return res.status(200).json({
        success: true,
        script: generatedScript,
        video_id: videoResult.video_id,
        message: 'Script generated and video creation started'
      });
      
    } catch (videoError) {
      // If video creation fails, still return the script
      console.error('Video creation failed:', videoError);
      return res.status(200).json({
        success: true,
        script: generatedScript,
        video_error: 'Video creation failed, but script was generated successfully',
        video_error_details: videoError.message
      });
    }

  } catch (error) {
    console.error('Error generating script:', error);
    
    // Determine the error status code and message
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to generate script';
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
}