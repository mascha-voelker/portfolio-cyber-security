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
  // Get the username that was entered on the previous slide
var username = player.GetVar("Username");

// Check if username exists
if (!username || username.trim() === "") {
    player.SetVar("StatusMessage", "No username provided. Please go back and enter your name.");
    return;
}

// Get the username from Storyline variable
var apiBaseUrl = "https://portfolio-cyber-security-git-main-mascha-voelkers-projects.vercel.app/api";
player.SetVar("StatusMessage", "Generating your personalized video...");

// Update status
player.SetVar("StatusMessage", "Generating your personalized video...");

// Single API call that handles both script generation AND video creation
fetch(apiBaseUrl + "/generate-script", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        username: username,
        createVideo: true  // This tells your API to also create the video
    })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        if (data.video_id) {
            // Video creation started, now check status
            player.SetVar("StatusMessage", "Video is being generated, please wait...");
            checkVideoStatus(data.video_id);
        } else if (data.video_error) {
            // Script was generated but video failed
            player.SetVar("StatusMessage", "Script generated but video creation failed: " + data.video_error);
        }
    } else {
        player.SetVar("StatusMessage", "Error: " + data.error);
    }
})
.catch(error => {
    console.error("Error:", error);
    player.SetVar("StatusMessage", "Connection error. Please try again.");
});

function checkVideoStatus(videoId) {
    fetch(apiBaseUrl + "/get-video?id=" + videoId)
    .then(response => response.json())
    .then(data => {
        if (data.status === "completed" && data.video_url) {
            // Video is ready!
            player.SetVar("VideoURL", data.video_url);
            player.SetVar("ShowVideo", true);
            player.SetVar("StatusMessage", "Video ready!");
        } else if (data.status === "failed") {
            player.SetVar("StatusMessage", "Video generation failed. Please try again.");
        } else {
            // Still processing
            player.SetVar("StatusMessage", "Video still processing... please wait");
            setTimeout(() => checkVideoStatus(videoId), 15000); // Check every 15 seconds
        }
    })
    .catch(error => {
        console.error("Status check error:", error);
        setTimeout(() => checkVideoStatus(videoId), 15000); // Retry on error
    });
}
}

};
