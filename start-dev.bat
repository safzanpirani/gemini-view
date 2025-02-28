@echo off
setlocal

echo Please enter your Gemini API key:
set /p GEMINI_API_KEY=

echo Setting up environment variables...
set GOOGLE_AI_API_KEY=%GEMINI_API_KEY%

echo Starting local development server...
npx wrangler dev

endlocal 