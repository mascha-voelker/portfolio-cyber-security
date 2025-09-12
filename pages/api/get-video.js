// Fixed /pages/api/get-video.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    externalResolver: true,
  },
  maxDuration: 15,
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    setCorsHeaders(res);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Please use GET.' 
    });
  }

  try {
    setCorsHeaders(res);
    const { video_id } = req.query;
    
    if (!video_id || typeof video_id !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'video_id is required and must be a string' 
      });
    }

    console.log('Checking status for video ID:', video_id);

    // FIXED: Use v2 API to match create-video.js
    const heygenResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      }
    });

    if (!heygenResponse.ok) {
      let errorData;
      try {
        errorData = await heygenResponse.json();
      } catch (parseError) {
        errorData = { message: `HTTP ${heygenResponse.status}` };
      }

      console.error('HeyGen Status Check Error:', {
        status: heygenResponse.status,
        statusText: heygenResponse.statusText,
        data: errorData
      });

      return res.status(400).json({ 
        success: false,
        error: 'HeyGen API error', 
        details: errorData.message || errorData.error || `HTTP ${heygenResponse.status}`
      });
    }

    const heygenData = await heygenResponse.json();
    console.log('HeyGen response:', heygenData);

    // Handle the v2 API response structure
    const status = heygenData.data?.status || 'unknown';
    const videoUrl = heygenData.data?.video_url || null;
    const progress = heygenData.data?.progress || 0;

    return res.status(200).json({
      success: true,
      status: status,
      video_url: videoUrl,
      progress: progress,
      message: getStatusMessage(status)
    });

  } catch (error) {
    console.error('Error checking video status:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      success: false,
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
    case 'error': return 'An error occurred during video generation';
    default: return `Status: ${status}`;
  }
}