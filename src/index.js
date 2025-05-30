// Cloudflare Worker for Google Docs to Markdown Server
const DEFAULT_DOC_ID = '1hfLONQb1TJdHQ5Sm044gvi9UJtzhjlOMiXVymwFQgmA';

// HTML content (index.html embedded)
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="pageTitle">Document Viewer</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📄</text></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500&family=Fira+Code:wght@400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/tokyo-night-dark.min.css">
    <style>
        :root {
            --bg-color: #1a1a1a;
            --text-color: #e4e4e4;
            --code-bg: #252525;
            --search-bg: rgba(255, 255, 255, 0.08);
            --border-color: #333;
            --link-color: #88aaff;
            --header-bg: #1f1f1f;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            scrollbar-gutter: stable;
        }

        body {
            font-family: 'Lexend', sans-serif;
            font-weight: 300;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--bg-color);
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 40px;
        }

        .header-wrap {
            position: sticky;
            top: 0;
            background-color: var(--header-bg);
            border-bottom: 1px solid var(--border-color);
            padding: 10px 0;
            z-index: 1000;
            margin-bottom: 32px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 40px;
        }

        .title {
            font-size: 20px;
            font-weight: 400;
            line-height: 40px;
            height: 40px;
            display: flex;
            align-items: center;
        }

        .controls {
            display: flex;
            gap: 8px;
            align-items: center;
            height: 40px;
            position: relative;
        }

        .search-container {
            position: relative;
            height: 40px;
            display: flex;
            align-items: center;
            overflow: visible;
            width: 240px;
        }

        #search {
            height: 40px;
            padding: 8px 12px 8px 36px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background-color: var(--search-bg);
            color: var(--text-color);
            width: 100%;
            font-size: 14px;
            font-family: 'Lexend', sans-serif;
        }

        .search-count {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            display: none;
            align-items: center;
            gap: 4px;
            color: #777;
            font-size: 13px;
            height: 24px;
            background-color: var(--header-bg);
            padding: 0 4px;
            border-radius: 4px;
            z-index: 10;
        }

        .search-nav {
            display: flex;
            gap: 2px;
            align-items: center;
        }

        .search-nav-button {
            background: none;
            border: none;
            color: #777;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #777;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            background-color: transparent;
        }

        .search-nav-button:hover {
            color: var(--text-color);
        }

        #search:focus {
            outline: none;
            border-color: var(--link-color);
            background-color: rgba(255, 255, 255, 0.12);
        }

        .menu-button {
            height: 40px;
            width: 40px;
            background: var(--search-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .menu-content {
            display: none;
            position: absolute;
            right: 0;
            top: calc(100% + 22px);
            background-color: var(--code-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            width: 400px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .menu-content.show {
            display: block;
        }

        .menu-section {
            margin-bottom: 16px;
        }

        .menu-section:last-child {
            margin-bottom: 0;
        }

        .menu-label {
            color: #777;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .timestamp-box {
            background: var(--search-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 8px 12px;
            font-family: 'Fira Code', monospace;
            font-size: 13px;
            height: 32px;
            display: flex;
            align-items: center;
        }

        .copy-box {
            display: flex;
            gap: 8px;
            margin-top: 6px;
            height: 32px;
        }

        .copy-field {
            flex: 1;
            background: var(--search-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0 12px;
            color: var(--text-color);
            font-family: 'Fira Code', monospace;
            font-size: 13px;
            white-space: nowrap;
            cursor: text;
            display: flex;
            align-items: center;
            margin-right: 8px;
            overflow-x: auto;
        }

        .copy-field::-webkit-scrollbar {
            height: 8px;
            width: 8px;
            background: transparent;
            display: block;
        }

        .copy-field::-webkit-scrollbar-track {
            background: transparent;
        }

        .copy-field::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 4px;
        }

        .copy-field[data-isdefault="true"]:empty::before {
            content: 'Paste Google Docs link or ID';
            color: #666;
            font-style: italic;
        }

        .copy-button,
        .reset-button {
            background: var(--search-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            width: 32px;
            height: 32px;
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: transform 0.2s;
        }

        .copy-button:hover,
        .reset-button:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .continue-button {
            transform: rotate(-90deg);
        }

        .content {
            background-color: var(--bg-color);
            padding: 0;
            font-size: 15px;
            max-width: 850px;
            line-height: 1.5;
        }

        .content pre {
            background-color: var(--code-bg);
            padding: 16px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            position: relative;
            margin: 1.2em 0;
            overflow-x: auto;
        }

        .content code {
            font-family: 'Fira Code', monospace;
            font-size: 14px;
            tab-size: 4;
        }

        .content p code {
            background-color: var(--code-bg);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
        }

        .content h1,
        .content h2,
        .content h3 {
            font-family: 'Lexend', sans-serif;
            font-weight: 500;
            color: var(--text-color);
            line-height: 1.3;
            position: relative;
            scroll-margin-top: 80px;
        }

        .content h1 { 
            font-size: 2em;
            margin: 1.4em 0 0.6em;
        }
        
        .content h2 { 
            font-size: 1.5em;
            margin: 1.2em 0 0.5em;
        }
        
        .content h3 { 
            font-size: 1.2em;
            margin: 1em 0 0.4em;
        }

        .content h1:first-child { 
            margin-top: 0; 
        }

        .content-header {
            scroll-margin-top: 80px;
        }

        .content p {
            margin: 0.5em 0;
            line-height: 1.5;
        }

        .content p + p {
            margin-top: 1.2em;
        }

        .content a {
            color: var(--link-color);
            text-decoration: none;
        }

        .content a:hover {
            text-decoration: underline;
        }

        .content mark {
            background-color: rgba(255, 255, 0, 0.25);
            border-radius: 3px;
            padding: 0;
            color: inherit;
        }

        .content mark.current-match {
            background-color: rgba(255, 255, 0, 0.5);
            box-shadow: 0 0 0 2px rgba(255, 255, 0, 0.5);
            border-radius: 3px;
        }

        .content ul,
        .content ol {
            margin: 0.4em 0;
            padding-left: 2em;
        }

        .content li {
            margin: 0.2em 0;
            padding: 0.1em 0;
        }

        .content ul {
            list-style: none;
        }

        .content ul li {
            position: relative;
        }

        .content ul li::before {
            content: "•";
            position: absolute;
            left: -1.2em;
            color: var(--text-color);
        }

        .content ul ul {
            margin: 0.2em 0 0.2em 0.4em;
        }

        .content ul ul li::before {
            content: "◦";
        }

        .content ol {
            list-style: decimal;
        }

        .content ol ol {
            list-style: lower-alpha;
            margin: 0.2em 0 0.2em 0.4em;
        }
    </style>
</head>
<body>
    <div class="header-wrap">
        <div class="container">
            <div class="header">
                <h1 class="title" id="headerTitle">Document Viewer</h1>
                <div class="controls">
                    <div class="search-container">
                        <span class="search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input type="text" id="search" placeholder="Search" autocomplete="off">
                        <span class="search-count" id="searchCount"></span>
                    </div>
                    <button class="menu-button" id="menuButton">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <circle cx="12" cy="12" r="2"></circle>
                            <circle cx="12" cy="5" r="2"></circle>
                            <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                    </button>
                    <div class="menu-content" id="menuContent">
                        <div class="menu-section">
                            <div class="menu-label">Last updated</div>
                            <div class="timestamp-box" id="update-time">...</div>
                        </div>
                        <div class="menu-section">
                            <div class="menu-label">Share with this email</div>
                            <div class="copy-box">
                                <div class="copy-field" id="serviceEmail">Loading...</div>
                                <button class="copy-button" onclick="copyText('serviceEmail')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="menu-section">
                            <div class="menu-label">Document ID / Link</div>
                            <div class="copy-box">
                                <div class="copy-field" id="currentDocId" contenteditable="true" spellcheck="false" data-isdefault="true"></div>
                                <button class="reset-button" id="resetButton">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                        <path d="M3 3v5h5"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="content" id="content">Loading...</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.2/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js"></script>
    <script>
        let contentHtml = '';
        let searchResults = [];
        let currentSearchIndex = -1;
        let currentDocId = '';
        const DEFAULT_DOC_ID = '${DEFAULT_DOC_ID}';
        
        // Elements
        const menuButton = document.getElementById('menuButton');
        const menuContent = document.getElementById('menuContent');
        const resetButton = document.getElementById('resetButton');
        const docIdField = document.getElementById('currentDocId');
        const searchInput = document.getElementById('search');

        // Configure marked
        marked.setOptions({
            gfm: true,
            breaks: true,
            headerIds: true,
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            }
        });

        // Custom renderer for markdown
        const renderer = {
            heading(text, level) {
                const escapedText = text
                    .toLowerCase()
                    .replace(/[^\\w]+/g, '-');
                return \`<h\${level} id="\${escapedText}" class="content-header">\${text}</h\${level}>\`;
            },
            code(code, language) {
                const validLanguage = hljs.getLanguage(language) ? language : '';
                const highlightedCode = validLanguage ? 
                    hljs.highlight(code, { language: validLanguage }).value : 
                    hljs.highlightAuto(code).value;
                return \`<pre><code class="hljs \${validLanguage}">\${highlightedCode}</code></pre>\`;
            },
            codespan(code) {
                return \`<code>\${code}</code>\`;
            }
        };

        marked.use({ renderer });

        // Fetch service email from server
        async function fetchServiceEmail() {
            try {
                console.log('Fetching service email');
                const response = await fetch('/api/service-email');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('serviceEmail').textContent = data.email;
                    console.log('Service email loaded');
                } else {
                    document.getElementById('serviceEmail').textContent = 'Failed to load service email';
                    console.log('Failed to load service email: ' + response.status);
                }
            } catch (error) {
                console.error('Error fetching service email:', error);
                document.getElementById('serviceEmail').textContent = 'Error loading service email';
            }
        }

        // Handle copy functionality
        function copyText(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const button = element.nextElementSibling;
                const originalIcon = button.innerHTML;
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                    button.innerHTML = originalIcon;
                }, 1000);
            });
        }

        // Extract document ID from Google Docs URL
        function extractDocId(input) {
            if (!input) return null;
            
            // Format: /document/d/ID or document/d/ID
            const urlMatch = input.match(/\\/document\\/d\\/([a-zA-Z0-9_-]+)/);
            if (urlMatch) return urlMatch[1];
            
            // Format: docs.google.com/document/d/ID
            const googleDocsMatch = input.match(/docs\\.google\\.com\\/document\\/d\\/([a-zA-Z0-9_-]+)/);
            if (googleDocsMatch) return googleDocsMatch[1];
            
            // Format: Already a document ID
            if (input.match(/^[a-zA-Z0-9_-]{25,}$/)) return input;
            
            return null;
        }

        // Cookie handling - we still keep cookies as fallback
        function saveDocIdToCookie(docId) {
            document.cookie = \`preferredDocId=\${docId};path=/;max-age=31536000\`; // 1 year
        }

        function getDocIdFromCookie() {
            const match = document.cookie.match(/preferredDocId=([^;]+)/);
            return match ? match[1] : DEFAULT_DOC_ID;
        }

        function updateDocIdDisplay() {
            if (currentDocId === DEFAULT_DOC_ID || !currentDocId) {
                docIdField.textContent = '';
                docIdField.setAttribute('data-isdefault', 'true');
            } else {
                docIdField.textContent = currentDocId;
                docIdField.removeAttribute('data-isdefault');
            }
            
            // Update the reset button state
            updateButtonState(docIdField.textContent.trim());
        }

        // Update button state
        function updateButtonState(input) {
            if (!input || input === currentDocId) {
                resetButton.innerHTML = \`
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                    </svg>\`;
                resetButton.classList.remove('continue-button');
            } else {
                resetButton.innerHTML = \`
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>\`;
                resetButton.classList.add('continue-button');
            }
        }

        // Parse URL parameters or path
        function getDocIdFromUrl() {
            console.log('Getting document ID from URL');
            
            // First check if URL has a path format like /documentid
            const pathMatch = window.location.pathname.match(/^\\/([^\\/]+)/);
            if (pathMatch && pathMatch[1] !== '') {
                const pathPart = pathMatch[1];
                console.log('Found path part:', pathPart);
                
                // Check various formats using our extractDocId function
                const docId = extractDocId(pathPart);
                if (docId) {
                    console.log('Extracted document ID from path:', docId);
                    // If the URL isn't already in the clean format, update it
                    if (pathPart !== docId) {
                        // We'll redirect to the clean URL on page load
                        setTimeout(() => {
                            history.replaceState({}, '', \`/\${docId}\`);
                        }, 0);
                    }
                    return docId;
                }
            } else if (window.location.pathname === '/' || window.location.pathname === '') {
                // If we're at the root path, explicitly return null to trigger reset to default
                console.log('At root path, returning null for document ID');
                return null;
            }
            
            // Check if URL has a query parameter
            const params = new URLSearchParams(window.location.search);
            const docId = params.get('docId');
            if (docId) {
                console.log('Found document ID in query parameter:', docId);
                // If we have a query parameter, also redirect to clean URL
                setTimeout(() => {
                    history.replaceState({}, '', \`/\${docId}\`);
                }, 0);
                return docId;
            }
            
            console.log('No document ID found in URL');
            return null;
        }

        // Document handling functions
        async function handleDocIdSubmit() {
            const input = docIdField.textContent.trim();
            if (!input) {
                updateDocIdDisplay();
                return;
            }

            const docId = extractDocId(input);
            console.log('Extracted document ID:', docId);
            
            if (docId && docId !== currentDocId) {
                console.log('Loading new document:', docId);
                try {
                    document.getElementById('content').innerHTML = 'Loading...';
                    const response = await fetch(\`/api/content?docId=\${encodeURIComponent(docId)}\`);
                    
                    if (response.ok) {
                        console.log('Document loaded successfully');
                        currentDocId = docId;
                        saveDocIdToCookie(docId);
                        
                        // Always update the URL to the clean format with just the document ID
                        if (window.location.pathname !== \`/\${docId}\`) {
                            history.pushState({}, '', \`/\${docId}\`);
                        }
                        
                        const data = await response.json();
                        displayContent(data);
                    } else {
                        console.error('Failed to load document:', response.status);
                        document.getElementById('content').innerHTML = \`
                            <div style="color: #ff6b6b; padding: 20px; border: 1px solid #ff6b6b; border-radius: 6px; margin-top: 20px;">
                                <h3>Error Loading Content</h3>
                                <p>Failed to load document. Status: \${response.status}</p>
                                <p>Please check the document ID and sharing permissions.</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('Error loading document:', error);
                    document.getElementById('content').innerHTML = \`
                        <div style="color: #ff6b6b; padding: 20px; border: 1px solid #ff6b6b; border-radius: 6px; margin-top: 20px;">
                            <h3>Error Loading Content</h3>
                            <p>\${error.message}</p>
                            <p>Please try refreshing the page or contact support if the issue persists.</p>
                        </div>
                    \`;
                }
            } else if (!docId && input !== '') {
                alert('Invalid document link or ID.');
            }
            
            updateDocIdDisplay();
        }

        // Reset or submit button handling
        function handleResetOrSubmit() {
            const input = docIdField.textContent.trim();
            
            if (!input || input === currentDocId) {
                // Reset functionality - go back to the default document
                console.log('Resetting to default document');
                currentDocId = DEFAULT_DOC_ID;
                saveDocIdToCookie(DEFAULT_DOC_ID);
                
                // Always reset the URL to root when using default document
                if (window.location.pathname !== '/') {
                    history.pushState({}, '', '/');
                }
                
                updateDocIdDisplay();
                fetchContent();
            } else {
                // Submit new ID functionality
                handleDocIdSubmit();
            }
        }

        // Main content fetching function
        async function fetchContent() {
            try {
                // Make sure we have a document ID - explicitly use DEFAULT_DOC_ID if no current ID
                const docId = currentDocId || DEFAULT_DOC_ID;
                console.log('Fetching content for document ID:', docId);
                
                // Show loading state
                document.getElementById('content').innerHTML = 'Loading...';
                
                const url = \`/api/content?docId=\${encodeURIComponent(docId)}\`;
                console.log('Fetching from URL:', url);
                
                const response = await fetch(url);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                console.log('Data received:', data ? 'yes' : 'no');

                displayContent(data);
            } catch (error) {
                console.error('Error fetching content:', error);
                document.getElementById('content').innerHTML = \`
                    <div style="color: #ff6b6b; padding: 20px; border: 1px solid #ff6b6b; border-radius: 6px; margin-top: 20px;">
                        <h3>Error Loading Content</h3>
                        <p>\${error.message}</p>
                        <p>Please try refreshing the page or contact support if the issue persists.</p>
                    </div>
                \`;
            }
        }

        // Display content from API
        function displayContent(data) {
            if (!data || !data.content) {
                document.getElementById('content').innerHTML = \`
                    <div style="color: #ff6b6b; padding: 20px; border: 1px solid #ff6b6b; border-radius: 6px; margin-top: 20px;">
                        <h3>Error Loading Content</h3>
                        <p>No content received from server</p>
                    </div>
                \`;
                return;
            }
            
            // Parse the markdown content
            contentHtml = marked.parse(data.content);
            contentHtml = processContent(contentHtml);
            document.getElementById('content').innerHTML = contentHtml;
            
            // Update timestamp
            const timestamp = new Date(data.lastUpdate);
            document.getElementById('update-time').textContent = 
                new Intl.DateTimeFormat(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }).format(timestamp);
            
            // Update document ID and display
            currentDocId = data.docId || DEFAULT_DOC_ID;
            updateDocIdDisplay();
            
            // Update page title
            const title = data.title || 'Document Viewer';
            document.title = title;
            document.getElementById('headerTitle').textContent = title;
            
            console.log('Content displayed successfully');
        }

        // Process content for display
        function processContent(content) {
            // Process any links in the content to open in new tabs
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            const links = tempDiv.getElementsByTagName('a');
            for (const link of links) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
            
            return tempDiv.innerHTML;
        }

        // Search functionality
        function updateSearchCount() {
            const count = searchResults.length;
            const countElement = document.getElementById('searchCount');
            if (count > 0) {
                countElement.innerHTML = \`
                    <span>\${currentSearchIndex + 1}/\${count}</span>
                    <div class="search-nav">
                        <button class="search-nav-button" onclick="navigateSearch(-1)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <button class="search-nav-button" onclick="navigateSearch(1)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    </div>
                \`;
                countElement.style.display = 'flex';
            } else {
                countElement.innerHTML = '';
                countElement.style.display = 'none';
            }
        }

        function highlightCurrentMatch(index) {
            searchResults.forEach(mark => mark.classList.remove('current-match'));
            if (searchResults[index]) {
                searchResults[index].classList.add('current-match');
                searchResults[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }

        function navigateSearch(direction) {
            if (searchResults.length === 0) return;
            
            currentSearchIndex = (currentSearchIndex + direction + searchResults.length) % searchResults.length;
            highlightCurrentMatch(currentSearchIndex);
            updateSearchCount();
        }

        // Set up all event listeners
        function setupEventListeners() {
            // Menu toggle
            menuButton.addEventListener('click', function(e) {
                e.stopPropagation();
                menuContent.classList.toggle('show');
                console.log('Menu toggled');
            });

            document.addEventListener('click', function(e) {
                if (!menuContent.contains(e.target) && e.target !== menuButton) {
                    menuContent.classList.remove('show');
                }
            });

            // Reset/Submit button
            resetButton.addEventListener('click', handleResetOrSubmit);

            // Document ID field events
            docIdField.addEventListener('input', function() {
                const input = this.textContent.trim();
                updateButtonState(input);
            });

            docIdField.addEventListener('focus', function() {
                if (this.getAttribute('data-isdefault') === 'true') {
                    this.textContent = '';
                    this.removeAttribute('data-isdefault');
                }
                window.getSelection().selectAllChildren(this);
            });

            docIdField.addEventListener('blur', function() {
                const input = this.textContent.trim();
                if (!input) {
                    updateDocIdDisplay();
                }
            });

            docIdField.addEventListener('paste', function(e) {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                this.textContent = text;
                updateButtonState(text.trim());
            });

            docIdField.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDocIdSubmit();
                }
            });

            // Search input handling
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.trim();
                if (!searchTerm) {
                    document.getElementById('content').innerHTML = contentHtml;
                    searchResults = [];
                    currentSearchIndex = -1;
                    updateSearchCount();
                    return;
                }

                const content = document.getElementById('content');
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = contentHtml;
                
                function searchNode(node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent;
                        if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                            const span = document.createElement('span');
                            const regex = new RegExp(\`(\${searchTerm})\`, 'gi');
                            span.innerHTML = text.replace(regex, '<mark>$1</mark>');
                            node.parentNode.replaceChild(span, node);
                        }
                    } else {
                        Array.from(node.childNodes).forEach(searchNode);
                    }
                }

                searchNode(tempDiv);
                content.innerHTML = tempDiv.innerHTML;
                
                searchResults = Array.from(content.getElementsByTagName('mark'));
                currentSearchIndex = searchResults.length > 0 ? 0 : -1;
                highlightCurrentMatch(currentSearchIndex);
                updateSearchCount();
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }
                
                if (searchResults.length > 0 && document.activeElement === searchInput) {
                    if (e.key === 'Enter') {
                        navigateSearch(e.shiftKey ? -1 : 1);
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        navigateSearch(-1);
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        navigateSearch(1);
                    }
                }
            });

            // Handle browser navigation
            window.addEventListener('popstate', function() {
                console.log('URL changed, updating state');
                // Check for document ID in the URL
                const urlDocId = getDocIdFromUrl();
                if (urlDocId) {
                    if (urlDocId !== currentDocId) {
                        currentDocId = urlDocId;
                        updateDocIdDisplay();
                        fetchContent();
                    }
                } else if (window.location.pathname === '/') {
                    // Reset to default document if we're at the root URL
                    currentDocId = DEFAULT_DOC_ID;
                    updateDocIdDisplay();
                    fetchContent();
                }
            });
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Document loaded, initializing...');
            
            // Set up all event listeners
            setupEventListeners();
            
            // Priority 1: Check URL first
            const urlDocId = getDocIdFromUrl();
            
            if (urlDocId) {
                console.log('Found document ID in URL:', urlDocId);
                currentDocId = urlDocId;
                // Set URL properly
                if (window.location.pathname !== \`/\${urlDocId}\`) {
                    history.replaceState({}, '', \`/\${urlDocId}\`);
                }
            } else {
                // Priority 2: No URL, use default document and make sure URL is empty
                console.log('No document ID in URL, using default');
                currentDocId = DEFAULT_DOC_ID;
                if (window.location.pathname !== '/') {
                    history.replaceState({}, '', '/');
                }
            }
            
            // Initialize UI and fetch content
            updateDocIdDisplay();
            fetchServiceEmail();
            fetchContent();
            
            // Refresh every 5 minutes
            setInterval(fetchContent, 5 * 60 * 1000);
        });
    </script>
</body>
</html>\`;

// Google Authentication and API functions
class GoogleAuth {
    constructor(credentials) {
        this.credentials = credentials;
        this.accessToken = null;
        this.tokenExpiry = null;
    }
    
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const jwtPayload = {
            iss: this.credentials.client_email,
            scope: 'https://www.googleapis.com/auth/documents.readonly',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };
        
        const jwtToken = await this.createJWT(jwtPayload);
        
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwtToken
            })
        });
        
        if (!response.ok) {
            throw new Error(\`Failed to get access token: \${response.status}\`);
        }
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
        
        return this.accessToken;
    }
    
    async createJWT(payload) {
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };
        
        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
        
        const message = \`\${encodedHeader}.\${encodedPayload}\`;
        const signature = await this.signMessage(message);
        
        return \`\${message}.\${signature}\`;
    }
    
    async signMessage(message) {
        // Import the private key
        const privateKeyPem = this.credentials.private_key
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\\s/g, '');
        
        const privateKeyBuffer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
        
        const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            privateKeyBuffer,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
            },
            false,
            ['sign']
        );
        
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
        
        return btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/=/g, '')
            .replace(/\\+/g, '-')
            .replace(/\\//g, '_');
    }
}

// Content cache
const contentCache = new Map();

// Function to convert Google Doc to Markdown
function convertToMarkdown(document) {
    const title = document.title;
    let markdown = '';
    let inCodeBlock = false;
    let codeBlockLang = '';
    let listLevel = 0;
    let currentListType = null;
    
    if (!document.body || !document.body.content) {
        return { title, content: 'No content available' };
    }
    
    document.body.content.forEach((element) => {
        if (element.paragraph) {
            const paragraph = element.paragraph;
            
            if (!paragraph.elements || paragraph.elements.length === 0) return;
            
            let paragraphText = '';
            const style = paragraph.paragraphStyle || {};
            
            // Handle headings
            if (style.namedStyleType?.includes('HEADING')) {
                const level = style.namedStyleType.match(/\\d+$/);
                if (level) {
                    paragraphText = '#'.repeat(parseInt(level[0])) + ' ';
                }
            }
            
            // Handle lists
            if (paragraph.bullet) {
                const nesting = paragraph.bullet.nestingLevel || 0;
                const indent = '  '.repeat(nesting);
                
                if (paragraph.bullet.listId !== currentListType) {
                    currentListType = paragraph.bullet.listId;
                    listLevel = 0;
                }
                
                if (paragraph.bullet.glyph && paragraph.bullet.glyph.includes('●')) {
                    paragraphText = \`\${indent}- \`;
                } else {
                    listLevel++;
                    paragraphText = \`\${indent}\${listLevel}. \`;
                }
            } else {
                currentListType = null;
                listLevel = 0;
            }
            
            // Process paragraph elements
            paragraph.elements.forEach((element) => {
                if (element.textRun) {
                    let content = element.textRun.content;
                    const textStyle = element.textRun.textStyle || {};
                    
                    // Handle text styles
                    if (textStyle.bold) content = \`**\${content}**\`;
                    if (textStyle.italic) content = \`*\${content}*\`;
                    if (textStyle.strikethrough) content = \`~~\${content}~~\`;
                    
                    // Detect code blocks
                    const isCode = textStyle.fontFamily === 'Consolas' || 
                                 textStyle.backgroundColor?.color?.rgbColor?.red > 0.9;
                    
                    if (isCode) {
                        if (content.toLowerCase().includes('powershell')) {
                            if (!inCodeBlock) {
                                inCodeBlock = true;
                                codeBlockLang = 'powershell';
                                content = 'powershell\\n' + content.trim();
                            }
                        } else if (content.includes('\\n') && !inCodeBlock) {
                            inCodeBlock = true;
                            content = '\\n' + content.trim();
                        } else if (!inCodeBlock && content.trim()) {
                            content = '\`' + content.trim() + '\`';
                        }
                    } else if (inCodeBlock && content.trim() === '') {
                        inCodeBlock = false;
                        content = '\\n\\n\\n';
                    }
                    
                    // Handle links
                    if (textStyle.link) {
                        content = \`[\${content.trim()}](\${textStyle.link.url})\`;
                    }
                    
                    paragraphText += content;
                }
            });

            if (paragraphText.trim()) {
                markdown += paragraphText;
                if (!inCodeBlock) {
                    markdown += currentListType ? '\\n' : '\\n\\n';
                }
            }
        }

        // Handle tables
        if (element.table) {
            const table = element.table;
            let tableContent = '\\n';
            
            table.tableRows.forEach((row, rowIndex) => {
                const cells = row.tableCells.map(cell => {
                    return cell.content.map(content => 
                        content.paragraph.elements.map(element => 
                            element.textRun?.content || ''
                        ).join('')
                    ).join('').trim() || ' ';
                });
                
                tableContent += '| ' + cells.join(' | ') + ' |\\n';
                
                if (rowIndex === 0) {
                    tableContent += '|' + cells.map(() => '---').join('|') + '|\\n';
                }
            });
            
            markdown += tableContent + '\\n';
        }
    });
    
    return {
        title,
        content: markdown.trim()
    };
}

// Update content from Google Docs
async function updateContent(docId, auth) {
    try {
        console.log(\`Fetching document from Google: \${docId}\`);
        const accessToken = await auth.getAccessToken();
        
        const response = await fetch(\`https://docs.googleapis.com/v1/documents/\${docId}\`, {
            headers: {
                'Authorization': \`Bearer \${accessToken}\`
            }
        });
        
        if (!response.ok) {
            throw new Error(\`Google API error: \${response.status} \${response.statusText}\`);
        }
        
        const document = await response.json();
        console.log(\`Received document from Google: \${document.title}\`);
        const content = convertToMarkdown(document);
        
        const cacheEntry = {
            title: content.title,
            content: content.content,
            docId,
            lastUpdate: new Date()
        };
        
        contentCache.set(docId, cacheEntry);
        return cacheEntry;
    } catch (error) {
        console.error('Error fetching document:', error);
        throw error;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Load credentials from environment
        const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
        const auth = new GoogleAuth(credentials);
        
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // API endpoint to get service email
            if (url.pathname === '/api/service-email') {
                console.log('Service email requested');
                return new Response(JSON.stringify({ 
                    email: credentials.client_email 
                }), {
                    headers: { 
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
            
            // API endpoint to get content
            if (url.pathname === '/api/content') {
                const docId = url.searchParams.get('docId') || DEFAULT_DOC_ID;
                console.log(\`Content requested for document: \${docId}\`);
                
                // Check cache first
                let content = contentCache.get(docId);
                const cacheHit = !!content;
                console.log(\`Cache hit: \${cacheHit}\`);
                
                // Refresh if content is older than 5 minutes or not in cache
                if (!content || (Date.now() - content.lastUpdate.getTime()) > 5 * 60 * 1000) {
                    console.log('Fetching fresh content');
                    content = await updateContent(docId, auth);
                }
                
                if (!content) {
                    throw new Error('No content received from Google Docs');
                }
                
                return new Response(JSON.stringify({
                    title: content.title,
                    content: content.content,
                    docId: docId,
                    lastUpdate: content.lastUpdate
                }), {
                    headers: { 
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            }
            
            // Handle document ID in URL path
            const pathMatch = url.pathname.match(/^\\/([^\\/]+)/);
            if (pathMatch && pathMatch[1] !== '') {
                const docIdOrPath = pathMatch[1];
                
                // Extract document ID from path if it contains a Google Docs URL pattern
                const urlMatch = docIdOrPath.match(/document\\/d\\/([a-zA-Z0-9_-]+)/);
                if (urlMatch) {
                    // Found a Google Docs URL pattern, redirect to clean URL
                    return Response.redirect(\`\${url.origin}/\${urlMatch[1]}\`, 302);
                } else if (docIdOrPath.match(/^[a-zA-Z0-9_-]{25,}$/)) {
                    // It's already a clean document ID, serve the HTML
                    return new Response(HTML_CONTENT, {
                        headers: { 
                            'Content-Type': 'text/html',
                            ...corsHeaders
                        }
                    });
                } else if (docIdOrPath.includes('docs.google.com')) {
                    // It's a full Google Docs URL
                    const fullUrlMatch = docIdOrPath.match(/docs\\.google\\.com\\/document\\/d\\/([a-zA-Z0-9_-]+)/);
                    if (fullUrlMatch) {
                        return Response.redirect(\`\${url.origin}/\${fullUrlMatch[1]}\`, 302);
                    }
                }
            }
            
            // Default: serve the index.html for root path or any unmatched paths
            return new Response(HTML_CONTENT, {
                headers: { 
                    'Content-Type': 'text/html',
                    ...corsHeaders
                }
            });
            
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
    }
};
