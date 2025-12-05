// Get DOM elements
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');

// Load saved API key on page load
document.addEventListener('DOMContentLoaded', loadApiKey);

function loadApiKey() {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });
}

// Save API key
saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }

    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        showStatus('✅ Settings saved successfully!', 'success');
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    });
});

// Clear API key
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete the API key?')) {
        chrome.storage.sync.remove(['geminiApiKey'], () => {
            apiKeyInput.value = '';
            showStatus('🗑️ API key cleared', 'success');
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 3000);
        });
    }
});

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden', 'success', 'error');
    statusDiv.classList.add(type);
}
