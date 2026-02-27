document.getElementById('generateBtn').onclick = () => {
    const channel = document.getElementById('channel').value.trim();
    const size = document.getElementById('fontSize').value;
    const shadow = document.getElementById('shadowColor').value;
    
    if (!channel) {
        alert("Please enter a Twitch channel name first!");
        return;
    }

    // This part finds the current folder and points to overlay.html
    const currentPath = window.location.pathname;
    const directory = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    const baseUrl = window.location.origin + directory + 'overlay.html';
    
    // The final URL with all your settings
    const url = `${baseUrl}?channel=${channel}&size=${size}&shadow=${encodeURIComponent(shadow)}`;
    
    // Show the result area and the link
    document.getElementById('resultArea').style.display = 'block';
    document.getElementById('finalUrl').value = url;
};