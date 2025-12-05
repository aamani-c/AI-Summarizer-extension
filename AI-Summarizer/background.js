// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Summarizer extension installed!');
});

// Listen for messages (optional for future features)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
});
