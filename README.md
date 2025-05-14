# 🔮 Gemini Vision: Your Web-Based AI Vision Analysis Tool

**Gemini Vision** is a user-friendly, web-based interface for interacting with Google's Gemini 2.5 Flash vision model. Upload images and get AI-powered analysis based on various specialized prompts.

**Try it now:** [vision.safzan.tech](https://vision.safzan.tech) 🚀

## ✨ Features

Gemini Vision offers a comprehensive suite of AI vision analysis tools:

### Core Features

* **Multi-Image Upload:** 📁 Upload multiple images at once via drag-and-drop or file selection.
* **Prompt Presets:** 📝 Choose from several specialized analysis modes:
  * **Calorie Guesser:** 🍔 Estimate calories in food images with detailed nutritional breakdown.
  * **OCR:** 📄 Extract and process text from images with multi-language support.
  * **Technical Diagrams Analyzer:** 📊 Interpret and explain complex technical diagrams and schematics.
  * **Document Analyzer:** 📑 Extract key information from documents, forms, and IDs.
  * **Screenshot Explainer:** 🖥️ Break down UI/UX elements from application screenshots.
  * **Travel Consultant:** 🌍 Analyze travel destinations and provide recommendations.
  * **Tweet Explainer:** 🐦 Explain the content, context, and nuances of tweets.
* **Custom Prompts:** ✏️ Create, save, and reuse your own specialized prompts.
* **Conversation History:** 📚 Keep track of your previous interactions.
* **Follow-up Questions:** 💬 Continue the conversation with follow-up prompts.

### User Experience

* **Dark/Light Mode:** 🌓 Switch between themes for comfortable viewing.
* **Temperature Control:** 🌡️ Adjust the creativity level of the AI responses.
* **Responsive Design:** 📱 Works seamlessly on desktop and mobile devices.

## 🚀 Getting Started

### ✅ Prerequisites

* Cloudflare account
* Google Gemini API key

### 🛠️ Setup

1. Clone the repository
   ```
   git clone https://github.com/safzanpirani/gemini-view.git
   cd gemini-view
   ```

2. Create a `.dev.vars` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm run start-dev
   ```
   or
   ```
   ./start-dev.bat
   ```

## 📦 Deployment

The application can be deployed to Cloudflare Pages:

```
npx wrangler deploy
```

## 📝 Usage

Using Gemini Vision is simple:

1. **Open the Application:** Visit the web interface in your browser.
2. **Select a Prompt:** Choose one of the preset prompts or enter your own.
3. **Upload Images:** Drag and drop or use the file selector to upload one or more images.
4. **Get Analysis:** Click "Get Response" to receive detailed analysis from Gemini.
5. **Follow Up:** Optionally send follow-up prompts to refine the response.

## 📂 Project Structure

* `/public` - Frontend assets (HTML, CSS, JavaScript)
* `/functions` - Cloudflare Worker functions for API handling
* `wrangler.toml` - Cloudflare configuration

## 🙏 Acknowledgements

* Google Gemini API for the powerful vision model
* Cloudflare Workers for serverless backend functionality
* Marked.js for Markdown rendering
* DOMPurify for sanitizing HTML
* Font Awesome for icons 