# ROBO-FEED: AI Robot News Summarizer Service

ROBO-FEED is a complete, self-updating service that aggregates daily news articles about AI, robotics, humanoids, and physical automation, processes and curates them using the Google Gemini API, and serves them on a modern, high-quality responsive dashboard.

## 🚀 Key Features

- **Automated Collection**: Aggregates raw news stories from multiple feeds (Google News and IEEE Spectrum Robotics).
- **AI-Powered Summaries**: Filters noise, categorizes articles, writes structured bullet summaries, and assigns impact scores using Gemini API (`gemini-1.5-flash`).
- **Git-Based Serverless CMS**: Data is committed back to the repository as a structured JSON file (`archive.json`), requiring **no database** and costing **zero host fees**.
- **Futuristic Glassmorphic UI**: High-fidelity dark mode dashboard with daily key trends panels, full-text search, category tags, and calendar date archives.
- **Serverless Automation**: Fully orchestrated via GitHub Actions (configured to run automatically at 9:00 AM JST daily).

---

## 🛠️ Architecture

```
[Robotics RSS Feeds] + [Google News Query]
          │
          ▼
┌───────────────────┐
│  GitHub Actions   │ ◄─── Triggered daily via Cron
│  (cron workflow)  │
└─────────┬─────────┘
          │
          ▼  (fetch & parse)
┌───────────────────┐
│ summarize.ts Script│ ◄─── Uses Gemini API (gemini-1.5-flash)
└─────────┬─────────┘
          │
          ▼  (updates)
┌───────────────────┐
│ src/data/         │
│   archive.json    │ ◄─── Git-committed JSON database
└─────────┬─────────┘
          │
          ▼  (build & deploy)
┌───────────────────┐
│ React Frontend    │ ◄─── Hosted free on Vercel, GitHub Pages, etc.
└───────────────────┘
```

---

## 💻 Local Setup & Development

### 1. Clone the project
If downloaded, navigate into the project directory:
```bash
cd ai-robot-news-summarizer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the Development Server
Launch the React web dashboard locally:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Fetch & Summarize Live News
To execute the aggregator script locally:
1. Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Run the summarizer command:
   ```bash
   npm run summarize
   ```
*If no `GEMINI_API_KEY` is provided, the script runs in **demo mode** using dynamic mock data to let you test the system safely without cost.*

---

## 🌐 Deployment & Automation Setup

Because this project commits data directly to git, you can host the website completely free.

### Step 1: Deploy Frontend
Import this repository into **Vercel**, **Netlify**, or configure it for **GitHub Pages**.
- Build Command: `npm run build`
- Output Directory: `dist`

### Step 2: Configure Auto-Update Workflow
1. Go to your repository settings on GitHub.
2. Select **Settings** > **Secrets and variables** > **Actions**.
3. Create a new repository secret:
   - Name: `GEMINI_API_KEY`
   - Value: *[Your Gemini API Key from Google AI Studio]*
4. The workflow in `.github/workflows/daily-summary.yml` will now execute automatically every morning, commit the new summaries to your repository, and trigger Vercel/GitHub Pages to rebuild and deploy the site.
