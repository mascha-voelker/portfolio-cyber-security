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

export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set CORS headers
    setCorsHeaders(res);
    const { script, username } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    // HeyGen API endpoint for creating videos
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
        }],
        dimension: {
          width: 1280,
          height: 720
        },
        aspect_ratio: "16:9",
        test: true // Set to true for testing without using credits
      })
    });

    const heygenData = await heygenResponse.json();

    if (!heygenResponse.ok) {
      console.error('HeyGen API Error:', heygenData);
      return res.status(400).json({ 
        error: 'HeyGen API error', 
        details: heygenData.message || 'Unknown error'
      });
    }

    // Return the video generation job ID
    res.status(200).json({
      success: true,
      video_id: heygenData.data.video_id,
      message: 'Video generation started',
      username: username
    });

  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
if (!heygenResponse.ok) {
  console.error('HeyGen API Error:', heygenData);
  console.error('Status:', heygenResponse.status);
  console.error('Full response:', JSON.stringify(heygenData, null, 2));
  return res.status(400).json({ 
    error: 'HeyGen API error', 
    details: heygenData.message || heygenData.error || 'Unknown error',
    status: heygenResponse.status
  });
}