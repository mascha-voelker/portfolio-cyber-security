// Add the API configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    externalResolver: true,
  },
  maxDuration: 30, // 30 seconds timeout for the entire function
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

  // Set CORS headers early
  setCorsHeaders(res);

  try {
    const { script, username } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    try {
      // HeyGen API endpoint for creating videos with improved error handling
      const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.HEYGEN_API_KEY,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive', // Helps with connection stability
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
            }
          }],
          dimension: {
            width: 1280,
            height: 720
          },
          aspect_ratio: "16:9",
          test: true // Set to true for testing without using credits
        }),
        signal: controller.signal // Add abort signal for timeout
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      // Check if response is ok before trying to parse JSON
      if (!heygenResponse.ok) {
        let errorData;
        try {
          errorData = await heygenResponse.json();
        } catch (parseError) {
          errorData = { message: `HTTP ${heygenResponse.status}` };
        }

        console.error('HeyGen API Error:', {
          status: heygenResponse.status,
          statusText: heygenResponse.statusText,
          data: errorData
        });

        return res.status(400).json({ 
          error: 'HeyGen API error', 
          details: errorData.message || errorData.error || `HTTP ${heygenResponse.status}`,
          status: heygenResponse.status
        });
      }

      // Parse successful response
      const heygenData = await heygenResponse.json();

      // Return the video generation job ID
      return res.status(200).json({
        success: true,
        video_id: heygenData.data.video_id,
        message: 'Video generation started',
        username: username
      });

    } catch (fetchError) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);

      // Handle specific timeout errors
      if (fetchError.name === 'AbortError') {
        console.error('HeyGen API timeout:', fetchError);
        return res.status(504).json({ 
          error: 'Request timeout', 
          details: 'The HeyGen API request timed out. Please try again.' 
        });
      }

      // Handle connection timeout errors specifically
      if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.error('HeyGen API connection timeout:', fetchError);
        return res.status(504).json({ 
          error: 'Connection timeout', 
          details: 'Could not connect to HeyGen API. Please try again.' 
        });
      }

      // Re-throw for general error handling
      throw fetchError;
    }

  } catch (error) {
    console.error('Error creating video:', {
      message: error.message,
      code: error.code,
      cause: error.cause,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}