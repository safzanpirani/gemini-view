# Project Architecture: Gemini Vision

This document outlines the architecture of the Gemini Vision application, a web-based tool for interacting with Google's Gemini 2.0 Flash vision model.

## Overview

The application consists of two main parts:

1.  **Frontend:** A static single-page application (SPA) built with HTML, CSS, and JavaScript, served directly by Cloudflare Pages. It allows users to upload images, PDFs, and video files for analysis.
2.  **Backend:** A Cloudflare Worker function that acts as a secure proxy to the Google Gemini API.

## Directory Structure

```
gemini-view/
├── .git/               # Git version control files
├── .wrangler/          # Cloudflare Wrangler temporary files and state
├── functions/
│   └── api/
│       └── gemini.js   # Cloudflare Worker: Backend API proxy
├── node_modules/       # Node.js project dependencies
├── public/             # Frontend static assets
│   ├── index.html      # Main HTML file for the SPA
│   ├── script.js       # Frontend JavaScript logic
│   └── style.css       # CSS styles for the frontend
├── .gitattributes      # Git attributes configuration
├── .gitignore          # Files and directories ignored by Git
├── README.md           # Project overview, setup, and usage instructions
├── start-dev.bat       # Batch script for starting local development (Windows)
└── wrangler.toml       # Cloudflare Workers configuration file
```

## File Descriptions and Connections

### Root Directory

*   **`.gitignore`**: Specifies intentionally untracked files that Git should ignore (e.g., `node_modules/`, `.wrangler/`, `.dev.vars`).
*   **`.gitattributes`**: Defines attributes for pathnames in Git.
*   **`README.md`**: Provides a comprehensive overview of the project, including its features, setup instructions for developers, deployment guide, and usage information. It's the primary source of information for understanding and using the project.
*   **`start-dev.bat`**: A Windows batch script used to simplify the local development startup process. It prompts the user for their Gemini API key, sets it as an environment variable (`GOOGLE_AI_API_KEY`), and then runs `npx wrangler dev` to start the Cloudflare Workers local development server. This script works in conjunction with `wrangler.toml` and `functions/api/gemini.js`.
*   **`wrangler.toml`**: The configuration file for Cloudflare Workers and Pages.
    *   `name = "gemini-worker"`: Defines the name of the worker.
    *   `type = "javascript"`: Specifies the worker is written in JavaScript.
    *   `compatibility_date`: Sets the runtime compatibility date for the worker.
    *   `[site] bucket = "./public"`: This crucial line tells Cloudflare Pages to serve static assets from the `public/` directory. This is how `index.html`, `script.js`, and `style.css` are delivered to the user's browser.
    *   It also implies that API requests (by convention, often to paths like `/api/*`) will be routed to the worker defined in `functions/`.

### `public/` Directory (Frontend)

This directory contains all the static assets for the client-side application.

*   **`index.html`**:
    *   **Purpose**: The main entry point for the web application. It defines the structure of the user interface.
    *   **Connections**:
        *   Links to `style.css` for styling.
        *   Includes `script.js` for all frontend logic.
        *   The file input element (`<input type="file">`) is configured via its `accept` attribute to allow image, PDF (`application/pdf`), and various video file types (e.g., `video/mp4`, `video/mpeg`).
        *   Includes external libraries like Font Awesome (for icons), `marked.js` (for rendering Markdown responses from the AI), and `DOMPurify` (for sanitizing HTML to prevent XSS attacks).
        *   Contains various HTML elements (buttons, text areas, divs) that `script.js` interacts with to create a dynamic user experience (e.g., file upload, prompt input, response display, theme toggle, history modal).
*   **`script.js`**:
    *   **Purpose**: Contains all the JavaScript logic for the frontend application. It handles user interactions, manages application state, and communicates with the backend API.
    *   **Connections**:
        *   Manipulates the DOM elements defined in `index.html` to update the UI.
        *   Handles file uploads, including validation for allowed image, PDF, and video MIME types.
        *   Converts uploaded files to base64 encoded strings.
        *   Image compression logic is applied selectively only to image files; PDF and video files are not compressed.
        *   Constructs the payload for the backend API. This involves creating a `contents` array for the Gemini API, where each file (image, PDF, or video) becomes an `inlineData` part (containing its base64 data and MIME type), and the user's prompt becomes a `text` part. This structured `parts` array is sent within the `contents` field.
        *   Makes HTTP `POST` requests to `/api/gemini` (which is handled by `functions/api/gemini.js`) to send the user prompt and file data for AI processing.
        *   Handles responses from the backend, parsing the JSON and displaying the AI's output.
        *   Implements features like prompt presets, conversation history (stored in `localStorage`), and temperature control.
*   **`style.css`**:
    *   **Purpose**: Provides all the CSS rules for styling the HTML elements in `index.html`, ensuring a consistent and responsive user interface.
    *   **Connections**: Linked directly by `index.html`.

### `functions/api/` Directory (Backend)

This directory contains the serverless function(s) that act as the backend.

*   **`gemini.js`**:
    *   **Purpose**: A Cloudflare Worker script that acts as a secure backend proxy between the frontend application and the Google Gemini API.
    *   **Connections**:
        *   Triggered by HTTP requests to the `/api/gemini` endpoint.
        *   Expects the incoming JSON payload from `public/script.js` to contain a `contents` field formatted according to Gemini API requirements. This `contents` field should include an array of `parts`, where files are represented as `inlineData` (with base64 `data` and `mimeType`) and prompts as `text`.
        *   Reads the `GEMINI_API_KEY` from environment variables.
        *   Handles CORS preflight requests.
        *   Validates that the request method is `POST`.
        *   Receives a JSON payload (containing the prompt and file data) from `public/script.js`.
        *   Forwards this payload in a `POST` request to the official Google Gemini API endpoint (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`), including the API key for authentication.
        *   Receives the JSON response from the Google Gemini API and forwards it back to the `public/script.js` on the frontend.
        *   Provides error handling and logging.

### Other Directories

*   **`.git/`**: Contains all the data for Git version control. Not directly part of the application's runtime architecture but essential for development.
*   **`.wrangler/`**: Used by the Cloudflare Wrangler CLI for local development, storing temporary files, cache, and state. Not part of the deployed application.
*   **`node_modules/`**: Contains downloaded Node.js packages (dependencies) listed in `package.json` (though `package.json` and `package-lock.json` were not explicitly listed in the initial file listing, their presence is implied by `node_modules/` and `npm install` in the README). These dependencies might include `wrangler` itself or other development tools.

## Data Flow Example (Image Analysis)

1.  **User Interaction (Frontend - `index.html`, `script.js`)**:
    *   User opens the web page (`index.html`).
    *   User selects images, PDFs, or video files and types a prompt in the UI.
    *   `script.js` captures this input, validates file types, converts files to base64 (compressing only images if applicable).
2.  **API Request (Frontend to Backend - `script.js` to `functions/api/gemini.js`)**:
    *   `script.js` constructs a JSON payload. The core of this is the `contents` array, containing a `parts` array. Each part is either `inlineData` for a file (with `mimeType` and base64 `data`) or `text` for the prompt.
    *   `script.js` sends an asynchronous `POST` request to `/api/gemini` with this payload.
3.  **Proxy to Google Gemini API (Backend - `functions/api/gemini.js`)**:
    *   The Cloudflare Worker (`gemini.js`) receives the request with the pre-formatted `contents`.
    *   It retrieves the `GEMINI_API_KEY`.
    *   It merges the client-provided `generationConfig` (like temperature) with the server-side `thinkingConfig` (to disable thinking) and forwards the payload (including the `contents` and final `generationConfig`) in a `POST` request to the Google Gemini API.
4.  **AI Processing (Google Gemini API)**:
    *   Google's Gemini model processes the images and prompt.
    *   It returns a JSON response to the Cloudflare Worker.
5.  **Response to Frontend (Backend to Frontend - `functions/api/gemini.js` to `script.js`)**:
    *   The Cloudflare Worker receives the response from Google.
    *   It forwards this JSON response back to the `script.js` in the user's browser.
6.  **Display Results (Frontend - `script.js`, `index.html`)**:
    *   `script.js` receives the JSON response.
    *   It parses the response, sanitizes any HTML content (using `DOMPurify`), renders Markdown (using `marked.js`), and updates the appropriate DOM elements in `index.html` to display the AI's analysis to the user.
    *   Conversation history is updated in `localStorage`.

This architecture leverages Cloudflare Pages for hosting the static frontend and Cloudflare Workers for a lightweight, serverless backend, providing a scalable and secure way to interact with the powerful Google Gemini API.

## Limitations

*   **File Size for PDF/Video (Inline Data):** Current support for PDF and video files relies on sending them as base64 encoded inline data. This approach is subject to the request size limits of Cloudflare Workers (e.g., 1MB on the free tier, potentially higher on paid plans but requires configuration) and practical limits for API request sizes. Very large PDF or video files might exceed these limits and fail to process. Future enhancements could involve integrating the Google Gemini File API for more robust handling of large files, which would require significant changes to the file upload and backend processing logic.
*   **Video Processing Details:** The Gemini API samples videos at 1 frame per second for visual analysis and processes audio at 1Kbps. This might affect the detail captured from fast-moving scenes or complex audio.
*   **Single Video per Prompt:** For optimal results with video, the Gemini API documentation suggests using only one video per prompt request. The current UI allows multiple file uploads, but users should be mindful of this when including videos. 