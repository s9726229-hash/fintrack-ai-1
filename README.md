<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FinTrack AI v5.9.2

This repository contains the complete source code for the FinTrack AI personal finance tracker application. It's a client-side web application built with React, TypeScript, and Vite, powered by the Google Gemini API.

## ✨ Features

- **AI-Powered Insights**: Voice-to-transaction, intelligent categorization, financial health reports, and more.
- **Comprehensive Tracking**: Manage assets, debts, transactions, and recurring payments.
- **Data Privacy**: All data is stored locally in your browser.
- **Cloud Sync**: Optional, secure backup and sync via your personal Google Drive.
- **PWA Ready**: Installable on mobile devices for an app-like experience.

## 🚀 Running Locally

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or higher recommended)

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    This command will also generate a `package-lock.json` file, which you should commit.
    ```bash
    npm install
    ```

3.  **Set up Environment Variable (Optional):**
    The app allows you to enter your Gemini API key directly in the settings. However, for local development, you can use an environment variable.
    -   Rename the `.env.example` file to `.env.local`.
    -   Open `.env.local` and add your Google Gemini API key:
        ```
        VITE_API_KEY="YOUR_GEMINI_API_KEY_HERE"
        ```
    -   You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 📦 Building for Production

To create a production-ready build:

```bash
npm run build
```

This will generate a `dist` directory with optimized, static files ready for deployment.

## 🚢 Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the application to GitHub Pages whenever you push to the `main` branch.