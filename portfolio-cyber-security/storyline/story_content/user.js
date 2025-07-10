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
window.Script1 = function()
{
  // Get the username from Storyline variable
var player = GetPlayer();
var username = player.GetVar("userName");

// Validate username
if (!username || username.trim() === "") {
    alert("Please enter a username first!");
    return;
}

// Store username in session for use on next slides
sessionStorage.setItem('storyline_username', username.trim());
console.log("Username captured:", username);

// Now jump to next slide
player.SetVar("JumpToNextSlide", true);
}

window.Script2 = function()
{
  // Get the username from previous slide
var username = sessionStorage.getItem('storyline_username');
var player = GetPlayer();

console.log("Retrieved username from sessionStorage:", username);
console.log("API endpoint:", "https://portfolio-cyber-security.vercel.app/api");

if (!username) {
    alert("No username found. Please go back and enter a username.");
    return;
}

console.log("Starting video generation for:", username);

// Show loading message
player.SetVar("LoadingMessage", "Generating your personalized video...");

// API base URL
var apiBase = "https://portfolio-cyber-security.vercel.app/api";

// Step 1: Generate script
fetch(apiBase + "/generate-script", {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        username: username
    })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log("Script generated successfully");
        player.SetVar("LoadingMessage", "Creating video with AI avatar...");
        
        // Step 2: Create video
        return fetch(apiBase + "/create-video", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: data.script,
                username: username
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
        
        // Store video ID for checking status
        sessionStorage.setItem('storyline_video_id', data.video_id);
        
        // Step 3: Check video status periodically
        checkVideoStatus(data.video_id);
    } else {
        throw new Error("Failed to create video");
    }
})
.catch(error => {
    console.error("Error:", error);
    player.SetVar("LoadingMessage", "Sorry, there was an error generating your video. Please try again.");
});

// Function to check video status
function checkVideoStatus(videoId) {
    var player = GetPlayer();
    
    fetch(apiBase + "/get-video?video_id=" + videoId)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Video status:", data.status);
            
            if (data.status === "completed") {
                // Video is ready!
                sessionStorage.setItem('storyline_video_url', data.video_url);
                player.SetVar("LoadingMessage", "Video ready! Loading...");
                
			// Go to next slide after short delay
			setTimeout(() => {
    			player.SetVar("VideoURL", data.video_url);
    			player.SetVar("JumpToNextSlide", true);
			}, 1000);
                
            } else if (data.status === "failed") {
                player.SetVar("LoadingMessage", "Video generation failed. Please try again.");
            } else {
                // Still processing, check again in 3 seconds
                setTimeout(() => checkVideoStatus(videoId), 3000);
            }
        }
    })
    .catch(error => {
        console.error("Error checking video status:", error);
        player.SetVar("LoadingMessage", "Error checking video status. Please try again.");
    });
}
}

window.Script3 = function()
{
  var player = GetPlayer();
var videoURL = player.GetVar("VideoURL");

if (videoURL && videoURL !== "") {
    // Create video element
    var videoHTML = '<video width="640" height="360" controls autoplay>' +
                   '<source src="' + videoURL + '" type="video/mp4">' +
                   'Your browser does not support the video tag.' +
                   '</video>';
    
    // Find a container to put the video in
    var container = document.createElement('div');
    container.innerHTML = videoHTML;
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '9999';
    
    document.body.appendChild(container);
    
    console.log("Video loaded:", videoURL);
} else {
    console.log("No video URL available, VideoURL:", videoURL);
}
}

};
