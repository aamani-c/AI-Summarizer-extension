// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getArticleText') {
        try {
            const articleText = extractArticleText();
            if (!articleText || articleText.length < 50) {
                sendResponse({ 
                    error: 'Could not find sufficient article content',
                    text: '' 
                });
            } else {
                sendResponse({ text: articleText });
            }
        } catch (error) {
            sendResponse({ 
                error: error.message,
                text: '' 
            });
        }
    }
});

// Extract article text from webpage
function extractArticleText() {
    let text = '';

    // Primary selectors - Try these first
    const primarySelectors = [
        'article',
        'main article',
        '[role="main"]',
        '.mw-parser-output',           // Wikipedia specific
        '.page-content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.story-body',
        '.article-body',
        '.content-wrapper',
        '.article-wrapper',
        'main',
        '.main-content'
    ];

    // Try primary selectors
    for (let selector of primarySelectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                text = element.innerText;
                if (text && text.length > 200) {
                    console.log(`Found text using selector: ${selector}`);
                    break;
                }
            }
        } catch (e) {
            console.log(`Selector failed: ${selector}`);
        }
    }

    // If not enough text, try alternative method
    if (!text || text.length < 200) {
        text = extractFromAllParagraphs();
    }

    // If still no text, try getting body content
    if (!text || text.length < 200) {
        const bodyText = document.body.innerText;
        // Filter out navigation and footer text
        text = filterText(bodyText);
    }

    // Clean up text
    text = cleanText(text);

    console.log(`Extracted ${text.length} characters`);
    
    if (!text || text.length < 100) {
        throw new Error('Could not find sufficient article content on this page');
    }

    return text.substring(0, 8000); // Limit to 8000 characters for API
}

// Extract text from all paragraphs
function extractFromAllParagraphs() {
    const paragraphs = document.querySelectorAll('p, li');
    let text = '';
    
    paragraphs.forEach(p => {
        const pText = p.innerText?.trim();
        if (pText && pText.length > 10) {
            text += pText + '\n\n';
        }
    });
    
    return text;
}

// Filter out common non-content text
function filterText(text) {
    // Remove common nav/footer keywords
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
        const lower = line.toLowerCase();
        return !lower.includes('cookie') &&
               !lower.includes('sign in') &&
               !lower.includes('subscribe') &&
               !lower.includes('advertisement') &&
               !lower.includes('privacy') &&
               !lower.includes('terms') &&
               !lower.includes('contact') &&
               !lower.includes('more about') &&
               line.trim().length > 20;
    });
    
    return filtered.join('\n').substring(0, 8000);
}

// Clean up extracted text
function cleanText(text) {
    return text
        .replace(/\n\n+/g, '\n\n')      // Remove excessive line breaks
        .replace(/\t/g, ' ')             // Remove tabs
        .replace(/[ ]+/g, ' ')           // Remove excessive spaces
        .trim();
}
