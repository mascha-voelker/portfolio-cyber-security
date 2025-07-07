// This file should be saved at /pages/api/get-video.js

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set CORS headers
    setCorsHeaders(res);
    const { video_id } = req.query;
    
    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    // Check video generation status
    const heygenResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.HEYGEN_API_KEY,
      }
    });

    const heygenData = await heygenResponse.json();

    if (!heygenResponse.ok) {
      console.error('HeyGen Status Check Error:', heygenData);
      return res.status(400).json({ 
        error: 'HeyGen API error', 
        details: heygenData.message || 'Unknown error'
      });
    }

    // Return status and video URL if completed
    res.status(200).json({
      success: true,
      status: heygenData.data.status,
      video_url: heygenData.data.video_url || null,
      progress: heygenData.data.progress || 0,
      message: getStatusMessage(heygenData.data.status)
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

function getStatusMessage(status) {
  switch (status) {
    case 'pending': return 'Video generation is queued';
    case 'processing': return 'Video is being generated';
    case 'completed': return 'Video is ready';
    case 'failed': return 'Video generation failed';
    default: return 'Unknown status';
  }
}