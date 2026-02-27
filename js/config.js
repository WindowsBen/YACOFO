document.getElementById('generateBtn').onclick = () => {
    const channel = document.getElementById('channel').value.trim();
    const size = document.getElementById('fontSize').value;
    const shadow = document.getElementById('shadowColor').value;
    
    if (!channel) {
        alert("Please enter a Twitch channel name first!");
        return;
    }

    // This is the "Magic Link Finder"
    // It takes your current website address and points it to overlay.html
    const baseUrl = new URL('overlay.html', window.location.href).href;
    
    // Create the final link with your settings
    const finalUrl = `${baseUrl}?channel=${channel.toLowerCase()}&size=${size}&shadow=${encodeURIComponent(shadow)}`;
    
    // Show the box with the link
    document.getElementById('resultArea').style.display = 'block';
    const textArea = document.getElementById('finalUrl');
    textArea.value = finalUrl;
    
    console.log("Generated URL:", finalUrl);
};