// Get DOM elements
const summaryTypeSelect = document.getElementById('summaryType');
const summarizeBtn = document.getElementById('summarizeBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const resultContent = document.getElementById('resultContent');
const errorDiv = document.getElementById('error');
const errorMsg = document.getElementById('errorMsg');
const noApiKeyDiv = document.getElementById('noApiKey');
const copyBtn = document.getElementById('copyBtn');
const newSummaryBtn = document.getElementById('newSummaryBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsBtn2 = document.getElementById('settingsBtn2');
const closeErrorBtn = document.getElementById('closeErrorBtn');

// Initialize
document.addEventListener('DOMContentLoaded', checkApiKey);

// Check if API key is set
function checkApiKey() {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (!result.geminiApiKey) {
            noApiKeyDiv.classList.remove('hidden');
            summarizeBtn.disabled = true;
        }
    });
}

// Summarize button click
summarizeBtn.addEventListener('click', async () => {
    console.log('Summarize button clicked');
    
    // Hide all divs first
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Active tab:', tab.url);

        // Inject content script if not already injected
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: extractArticleText
            });
        } catch (e) {
            console.log('Script already injected or not needed');
        }

        // Send message to content script to extract article text
        chrome.tabs.sendMessage(tab.id, { action: 'getArticleText' }, (response) => {
            console.log('Response received:', response);
            
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                showError('Could not access page content. Try refreshing the page.');
                return;
            }

            if (!response || !response.text) {
                console.error('No text in response:', response);
                showError('Could not extract article text from this page. Try a different website.');
                return;
            }

            const articleText = response.text;
            console.log('Article text length:', articleText.length);
            
            const summaryType = summaryTypeSelect.value;

            // Get API key
            chrome.storage.sync.get(['geminiApiKey'], async (result) => {
                if (!result.geminiApiKey) {
                    showError('API key not found. Please configure it in Settings.');
                    return;
                }

                try {
                    console.log('Starting summary generation...');
                    const summary = await generateSummary(articleText, summaryType, result.geminiApiKey);
                    console.log('Summary generated');
                    displayResult(summary);
                } catch (err) {
                    console.error('Summary generation error:', err);
                    showError(err.message);
                }
            });
        });
    } catch (err) {
        console.error('Main error:', err);
        showError(err.message);
    }
});

// Extract article text function (runs on the page)
function extractArticleText() {
    console.log('Content script extracting text...');
    
    let text = '';
    
    // Try multiple strategies
    const strategies = [
        () => {
            const article = document.querySelector('article');
            return article ? article.innerText : '';
        },
        () => {
            const main = document.querySelector('main');
            return main ? main.innerText : '';
        },
        () => {
            const mwParser = document.querySelector('.mw-parser-output');
            return mwParser ? mwParser.innerText : '';
        },
        () => {
            const allText = Array.from(document.querySelectorAll('p'))
                .map(p => p.innerText)
                .filter(t => t && t.length > 20)
                .join('\n\n');
            return allText;
        },
        () => document.body.innerText
    ];

    for (let strategy of strategies) {
        try {
            text = strategy();
            if (text && text.length > 150) {
                console.log(`Strategy successful, got ${text.length} chars`);
                break;
            }
        } catch (e) {
            console.log('Strategy failed:', e);
        }
    }

    // Clean text
    text = text
        .replace(/\n\n+/g, '\n\n')
        .trim()
        .substring(0, 8000);

    console.log('Final text length:', text.length);
    
    // Store in window so content.js can access it
    window.extractedArticleText = text;
}

// Generate summary using Gemini API
async function generateSummary(text, type, apiKey) {
    const prompts = {
        brief: `Summarize the following article in exactly 50 words or less:\n\n${text}`,
        detailed: `Summarize the following article in exactly 150 words:\n\n${text}`,
        bullet: `Summarize the following article as bullet points (5-7 key points):\n\n${text}`,
        mcq: `Based on the following article, create 3 multiple choice questions with 4 options each. Format as "Q1) Question?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\n\nCorrect Answer: A"\n\n${text}`
    };

    const prompt = prompts[type] || prompts.brief;

    console.log('Calling Gemini API...');
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        throw new Error(error.error?.message || 'Failed to generate summary');
    }

    const data = await response.json();
    console.log('API Response received');
    return data.candidates[0].content.parts[0].text;
}

// Display result
function displayResult(summary) {
    console.log('Displaying result');
    loadingDiv.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    resultContent.innerHTML = summary.replace(/\n/g, '<br>');
}

// Show error
function showError(message) {
    console.log('Showing error:', message);
    loadingDiv.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorMsg.textContent = message;
}

// Copy to clipboard
copyBtn.addEventListener('click', () => {
    const text = resultContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyBtn.textContent = '📋 Copy to Clipboard';
        }, 2000);
    });
});

// New summary
newSummaryBtn.addEventListener('click', () => {
    resultDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    summarizeBtn.click();
});

// Settings buttons
settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

settingsBtn2.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Close error
closeErrorBtn.addEventListener('click', () => {
    errorDiv.classList.add('hidden');
});
