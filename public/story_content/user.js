window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
window.Script15 = function()
{
  var player = GetPlayer();
var userName = player.GetVar("userName"); // Check if this variable name is correct

console.log("DEBUG NAME: Raw userName value:", userName);
console.log("DEBUG NAME: Variable type:", typeof userName);

if (userName && userName.trim() !== '') {
    sessionStorage.setItem('storyline_userName', userName);
    console.log("DEBUG NAME: Saved to sessionStorage:", userName);
} else {
    console.log("DEBUG NAME: userName is empty or null, not saving");
}

// Test retrieval
var saved = sessionStorage.getItem('storyline_userName');
console.log("DEBUG NAME: Retrieved from sessionStorage:", saved);
}

window.Script16 = function()
{
  setTimeout(function() {
    var player = GetPlayer();
    var strategies = player.GetVar("userStrategies");
    console.log("DEBUG: Raw variable value:", strategies);
    console.log("DEBUG: Variable type:", typeof strategies);
    console.log("DEBUG: Variable length:", strategies ? strategies.length : "null/undefined");

    if (strategies && strategies.trim() !== '') {
        sessionStorage.setItem('storyline_strategies', strategies);
        console.log("DEBUG: Saved to sessionStorage:", strategies);
    } else {
        console.log("DEBUG: Variable is empty or null, not saving");
    }

    // Test what's actually in sessionStorage
    var saved = sessionStorage.getItem('storyline_strategies');
    console.log("DEBUG: Retrieved from sessionStorage:", saved);
}, 500);

}

window.Script17 = function()
{
  console.log("Script starting...");

var userStrategies = sessionStorage.getItem('storyline_strategies');
var player = GetPlayer();
var storylineStrategies = player.GetVar("userStrategies");
var finalStrategies = userStrategies || storylineStrategies;

// Add these lines for userName handling:
var userName = sessionStorage.getItem('storyline_userName');
var displayName = userName && userName.trim() !== '' ? userName : "colleague";

console.log("Final strategies to use:", finalStrategies);
console.log("DEBUG VIDEO: Retrieved userName from sessionStorage:", userName);
console.log("DEBUG VIDEO: Final displayName:", displayName);

if (!finalStrategies || finalStrategies.trim() === '') {
    console.log("No strategies found");
    alert("No strategies found. Make sure you entered strategies on the previous slide.");
    return;
}

console.log("Starting video generation for strategies:", finalStrategies.substring(0, 100) + "...");
player.SetVar("LoadingMessage", "Analyzing your strategies and generating feedback video...");

var apiBase = "https://cyber-security-learning-khaki.vercel.app/api";
var maxRetries = 3;
var currentRetry = 0;
var pollingAttempts = 0;
var maxPollingAttempts = 240;

function checkVideoStatus(videoId) {
    console.log(`Checking video status for ID: ${videoId} (attempt ${pollingAttempts + 1}/${maxPollingAttempts})`);
    
    if (pollingAttempts >= maxPollingAttempts) {
        console.error("Maximum polling attempts reached after 12 minutes");
        player.SetVar("LoadingMessage", "Video processing took longer than expected but may have completed.");
        return;
    }

    pollingAttempts++;
    
    fetch(apiBase + "/get-video?video_id=" + encodeURIComponent(videoId))
    .then(response => response.json())
    .then(data => {
        console.log("Video status response:", data);
        
        if (data.success) {
            console.log("Video status:", data.status);
            
            if (data.status === "completed" && data.video_url) {
                console.log("Video URL received:", data.video_url);
                player.SetVar("LoadingMessage", "Video ready! Loading...");
                player.SetVar("VideoURL", data.video_url);
                
                try {
                    createVideoElement(data.video_url);
                } catch(e) {
                    console.warn("createVideoElement failed:", e);
                }
                
            } else if (data.status === "failed") {
                console.log("Video generation failed");
                player.SetVar("LoadingMessage", "Video generation failed. Please try again.");
            } else {
                console.log("Video still processing, checking again in 3 seconds");
                setTimeout(() => checkVideoStatus(videoId), 3000);
            }
        } else {
            console.error("API returned success: false", data);
            player.SetVar("LoadingMessage", "Error checking video status: " + (data.error || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error checking video status:", error);
        player.SetVar("LoadingMessage", "Error checking video status. Please try again.");
    });
}

function makeAPICall() {
    currentRetry++;
    console.log(`Making API call attempt ${currentRetry}/${maxRetries}`);

    console.log("DEBUG API: Sending data:", {
        userStrategies: finalStrategies,
        userName: displayName
    });

    fetch(apiBase + "/generate-script", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userStrategies: finalStrategies,
            userName: displayName
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.script) {
            console.log("Script generated successfully");
            player.SetVar("LoadingMessage", "Creating video with AI avatar...");
            
            return fetch(apiBase + "/create-video", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: data.script,
                    userStrategies: finalStrategies
                })
            });
        } else {
            throw new Error("Failed to generate script: " + (data.error || "No script returned"));
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.video_id) {
            console.log("Video creation started, ID:", data.video_id);
            player.SetVar("LoadingMessage", "Processing video... This may take a moment.");
            sessionStorage.setItem('storyline_video_id', data.video_id);
            
            pollingAttempts = 0;
            checkVideoStatus(data.video_id);
        } else {
            throw new Error("Failed to create video: " + (data.error || "No video ID returned"));
        }
    })
    .catch(error => {
        console.error(`Error on attempt ${currentRetry}:`, error);
        
        if (currentRetry < maxRetries) {
            console.log(`Retrying in 2 seconds... (${currentRetry}/${maxRetries})`);
            player.SetVar("LoadingMessage", `Error occurred. Retrying... (${currentRetry}/${maxRetries})`);
            setTimeout(() => makeAPICall(), 2000);
        } else {
            player.SetVar("LoadingMessage", "Sorry, there was an error generating your video after multiple attempts. Please try again.");
        }
    });
}

makeAPICall();

function createVideoElement(videoUrl) {
    try {
        console.log("Creating video element for URL:", videoUrl);
        
        var existingContainer = document.getElementById('video-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        var container = document.createElement('div');
        container.id = 'video-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 640px;
            height: 360px;
            border: 2px solid #333;
            border-radius: 8px;
            overflow: hidden;
            background: #000;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        var videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.controls = true;
        videoElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        
        var closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            z-index: 1001;
        `;
        closeButton.onclick = function() {
            container.remove();
        };
        
        container.appendChild(videoElement);
        container.appendChild(closeButton);
        document.body.appendChild(container);
        
        console.log("Video element created successfully");
        
        videoElement.play().catch(function(error) {
            console.log("Auto-play failed, user interaction required:", error);
        });
        
    } catch (error) {
        console.error("Error creating video element:", error);
    }
}
}

window.Script18 = function()
{
  // SCRIPT 2: Strategies video generation
window.Script2 = function()
{
  var userStrategies = sessionStorage.getItem('storyline_strategies');
  var player = GetPlayer();

  console.log("Retrieved strategies from sessionStorage:", userStrategies);
  console.log("API endpoint:", "https://cyber-security-sage.vercel.app/api");

  if (!userStrategies) {
      alert("No strategies found. Please go back and enter your strategies.");
      return;
  }

  console.log("Starting video generation for strategies:", userStrategies.substring(0, 100) + "...");
  player.SetVar("LoadingMessage", "Analyzing your strategies and generating feedback video...");

  var apiBase = "https://cyber-security-sage.vercel.app/api";

  function checkVideoStatus(videoId) {
      console.log("Checking video status for ID:", videoId);
      
      fetch(apiBase + "/get-video?video_id=" + videoId)
      .then(response => response.json())
      .then(data => {
          console.log("Video status response:", data);
          
          if (data.success) {
              console.log("Video status:", data.status);
              
              if (data.status === "completed") {
                  console.log("Video URL received:", data.video_url);
                  sessionStorage.setItem('storyline_video_url', data.video_url);
                  player.SetVar("LoadingMessage", "Video ready! Loading...");
                  player.SetVar("VideoURL", data.video_url);
                  createVideoElement(data.video_url);
                  
                  setTimeout(() => {
                      console.log("Jumping to next slide with video URL:", data.video_url);
                      player.SetVar("JumpToNextSlide", true);
                  }, 2000);
                  
              } else if (data.status === "failed") {
                  console.log("Video generation failed");
                  player.SetVar("LoadingMessage", "Video generation failed. Please try again.");
              } else {
                  console.log("Video still processing, checking again in 3 seconds");
                  setTimeout(() => checkVideoStatus(videoId), 3000);
              }
          } else {
              console.error("API returned success: false", data);
              player.SetVar("LoadingMessage", "Error checking video status. Please try again.");
          }
      })
      .catch(error => {
          console.error("Error checking video status:", error);
          player.SetVar("LoadingMessage", "Error checking video status. Please try again.");
      });
  }

  // Step 1: Generate script for strategies
  fetch(apiBase + "/generate-script", {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          userStrategies: userStrategies
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          console.log("Script generated successfully");
          player.SetVar("LoadingMessage", "Creating video with AI avatar...");
          
          return fetch(apiBase + "/create-video", {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  script: data.script,
                  userStrategies: userStrategies
              })
          });
      } else {
          throw new Error("Failed to generate script");
      }
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          console.log("Video creation started, ID:", data.video_id);
          player.SetVar("LoadingMessage", "Processing video... This may take a moment.");
          sessionStorage.setItem('storyline_video_id', data.video_id);
          checkVideoStatus(data.video_id);
      } else {
          throw new Error("Failed to create video");
      }
  })
  .catch(error => {
      console.error("Error:", error);
      player.SetVar("LoadingMessage", "Sorry, there was an error generating your video. Please try again.");
  });
}
}

window.Script19 = function()
{
  // Storyline Image Shake Animation
// Add this to a "Execute JavaScript" trigger when timeline starts

// Find the specific image element by its exact characteristics
// Look for the image with the exact transform scale values from your original image
let imageElement = document.querySelector('image[transform*="scale(0.6250624060630798, 0.6247464418411255)"]');

// If that doesn't work, try finding by the combination of data-original-image and dimensions
if (!imageElement) {
    imageElement = document.querySelector('image[data-original-image="01"][width="2003"][height="986"]');
}

// Alternative: Find by the exact href path (if the filename is still the same)
if (!imageElement) {
    imageElement = document.querySelector('image[href$="5qkBTJNcLTc_P_44_0_2003_985.png"]');
}

// Last resort: Find all images and log them so you can identify the right one
if (!imageElement) {
    console.log('Could not find the target image. Here are all images on the slide:');
    const allImages = document.querySelectorAll('image');
    allImages.forEach((img, index) => {
        console.log(`Image ${index}:`, {
            id: img.getAttribute('id'),
            dataOriginal: img.getAttribute('data-original-image'),
            width: img.getAttribute('width'),
            height: img.getAttribute('height'),
            transform: img.getAttribute('transform'),
            href: img.getAttribute('href') || img.getAttribute('xlink:href')
        });
    });
    // For now, let's not shake anything if we can't find the right image
    console.log('Please check the console and identify your target image.');
}

if (imageElement) {
    // Store original transform to restore later
    const originalTransform = imageElement.getAttribute('transform') || 'scale(0.6250624060630798, 0.6247464418411255)';
    
    // Shake animation function
    function shakeImage() {
        let shakeCount = 0;
        const maxShakes = 20; // Number of shake movements
        const shakeDuration = 30; // Duration of each shake in milliseconds
        const shakeIntensity = 15; // Shake distance in pixels
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                // Reset to original position
                imageElement.setAttribute('transform', originalTransform);
                clearInterval(shakeInterval);
                return;
            }
            
            // Generate random shake offset
            const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
            
            // Apply shake with original scale
            const shakeTransform = `${originalTransform} translate(${offsetX}, ${offsetY})`;
            imageElement.setAttribute('transform', shakeTransform);
            
            shakeCount++;
        }, shakeDuration);
    }
    
    // Start the shake animation
    shakeImage();
    
} else {
    console.log('Image element not found. Check if the ID is correct.');
}


}

window.Script20 = function()
{
  // Storyline Shake All Elements Animation
// Add this to a "Execute JavaScript" trigger when timeline starts

// Find ALL elements with transform attributes
const allElements = Array.from(document.querySelectorAll("*[transform]"));

// Store elements and their original transforms
const elements = allElements.map(el => {
    return {
        element: el,
        originalTransform: el.getAttribute("transform") || "translate(0, 0)"
    };
});

console.log(`Found ${elements.length} elements to shake.`);

// Only proceed if we have elements to animate
if (elements.length > 0) {
    // Shake animation function
    function shakeElements() {
        let shakeCount = 0;
        const maxShakes = 20;
        const shakeDuration = 30;
        const shakeIntensity = 15;
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                // Reset all elements to original transform
                elements.forEach(({ element, originalTransform }) => {
                    element.setAttribute("transform", originalTransform);
                });
                clearInterval(shakeInterval);
                console.log("Shake animation completed.");
                return;
            }
            
            // Apply shake transform to all elements
            elements.forEach(({ element, originalTransform }) => {
                const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
                const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
                const shakeTransform = `${originalTransform} translate(${offsetX}, ${offsetY})`;
                element.setAttribute("transform", shakeTransform);
            });
            
            shakeCount++;
        }, shakeDuration);
    }
    
    // Start shaking
    shakeElements();
} else {
    console.log("No elements with transform attributes found.");
}
}

window.Script21 = function()
{
  // Storyline Shake All Elements Animation
// Add this to a "Execute JavaScript" trigger when timeline starts

// Find ALL elements with transform attributes
const allElements = Array.from(document.querySelectorAll("*[transform]"));

// Store elements and their original transforms
const elements = allElements.map(el => {
    return {
        element: el,
        originalTransform: el.getAttribute("transform") || "translate(0, 0)"
    };
});

console.log(`Found ${elements.length} elements to shake.`);

// Only proceed if we have elements to animate
if (elements.length > 0) {
    // Shake animation function
    function shakeElements() {
        let shakeCount = 0;
        const maxShakes = 20;
        const shakeDuration = 30;
        const shakeIntensity = 15;
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                // Reset all elements to original transform
                elements.forEach(({ element, originalTransform }) => {
                    element.setAttribute("transform", originalTransform);
                });
                clearInterval(shakeInterval);
                console.log("Shake animation completed.");
                return;
            }
            
            // Apply shake transform to all elements
            elements.forEach(({ element, originalTransform }) => {
                const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
                const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
                const shakeTransform = `${originalTransform} translate(${offsetX}, ${offsetY})`;
                element.setAttribute("transform", shakeTransform);
            });
            
            shakeCount++;
        }, shakeDuration);
    }
    
    // Start shaking
    shakeElements();
} else {
    console.log("No elements with transform attributes found.");
}
}

window.Script22 = function()
{
  // Storyline Shake All Elements Animation
// Add this to a "Execute JavaScript" trigger when timeline starts

// Find ALL elements with transform attributes
const allElements = Array.from(document.querySelectorAll("*[transform]"));

// Store elements and their original transforms
const elements = allElements.map(el => {
    return {
        element: el,
        originalTransform: el.getAttribute("transform") || "translate(0, 0)"
    };
});

console.log(`Found ${elements.length} elements to shake.`);

// Only proceed if we have elements to animate
if (elements.length > 0) {
    // Shake animation function
    function shakeElements() {
        let shakeCount = 0;
        const maxShakes = 20;
        const shakeDuration = 30;
        const shakeIntensity = 15;
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                // Reset all elements to original transform
                elements.forEach(({ element, originalTransform }) => {
                    element.setAttribute("transform", originalTransform);
                });
                clearInterval(shakeInterval);
                console.log("Shake animation completed.");
                return;
            }
            
            // Apply shake transform to all elements
            elements.forEach(({ element, originalTransform }) => {
                const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
                const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
                const shakeTransform = `${originalTransform} translate(${offsetX}, ${offsetY})`;
                element.setAttribute("transform", shakeTransform);
            });
            
            shakeCount++;
        }, shakeDuration);
    }
    
    // Start shaking
    shakeElements();
} else {
    console.log("No elements with transform attributes found.");
}
}

window.Script23 = function()
{
  // Storyline Shake All Elements Animation
// Add this to a "Execute JavaScript" trigger when timeline starts

// Find ALL elements with transform attributes
const allElements = Array.from(document.querySelectorAll("*[transform]"));

// Store elements and their original transforms
const elements = allElements.map(el => {
    return {
        element: el,
        originalTransform: el.getAttribute("transform") || "translate(0, 0)"
    };
});

console.log(`Found ${elements.length} elements to shake.`);

// Only proceed if we have elements to animate
if (elements.length > 0) {
    // Shake animation function
    function shakeElements() {
        let shakeCount = 0;
        const maxShakes = 20;
        const shakeDuration = 30;
        const shakeIntensity = 15;
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                // Reset all elements to original transform
                elements.forEach(({ element, originalTransform }) => {
                    element.setAttribute("transform", originalTransform);
                });
                clearInterval(shakeInterval);
                console.log("Shake animation completed.");
                return;
            }
            
            // Apply shake transform to all elements
            elements.forEach(({ element, originalTransform }) => {
                const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
                const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
                const shakeTransform = `${originalTransform} translate(${offsetX}, ${offsetY})`;
                element.setAttribute("transform", shakeTransform);
            });
            
            shakeCount++;
        }, shakeDuration);
    }
    
    // Start shaking
    shakeElements();
} else {
    console.log("No elements with transform attributes found.");
}
}

};
