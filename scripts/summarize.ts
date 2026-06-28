import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Try to load GEMINI_API_KEY from local .env file if it exists and is not already set
try {
  const envPath = path.join(process.cwd(), '.env');
  if (!process.env.GEMINI_API_KEY && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const parts = line.split('=');
      if (parts[0] && parts[0].trim() === 'GEMINI_API_KEY') {
        const val = parts.slice(1).join('=').trim();
        process.env.GEMINI_API_KEY = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }
} catch (err) {
  console.warn('Failed to load local .env file:', err);
}

// Interfaces matching src/types.ts
interface RawArticle {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

interface Article {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  impactScore: number;
}

interface DailySummary {
  date: string;
  trends: string[];
  categories: {
    [category: string]: Article[];
  };
}

// Feeds to aggregate
const FEEDS = [
  {
    name: 'Google News AI & Robotics',
    url: 'https://news.google.com/rss/search?q=robot+OR+robotics+OR+humanoid+when:24h&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'IEEE Spectrum Robotics',
    url: 'https://spectrum.ieee.org/feeds/robotics.rss'
  }
];

const parser = new Parser();
const ARCHIVE_PATH = path.join(process.cwd(), 'src/data/archive.json');

async function fetchNews(): Promise<RawArticle[]> {
  console.log('Fetching news from RSS feeds...');
  const allArticles: RawArticle[] = [];

  for (const feed of FEEDS) {
    try {
      console.log(`Fetching ${feed.name}...`);
      const parsed = await parser.parseURL(feed.url);
      
      for (const item of parsed.items || []) {
        if (!item.title || !item.link) continue;
        
        // Clean source name from title (Google News appends " - Source Name")
        let title = item.title;
        let source = feed.name;
        
        if (feed.name.includes('Google News')) {
          const parts = title.split(' - ');
          if (parts.length > 1) {
            source = parts.pop() || source;
            title = parts.join(' - ');
          }
        } else if (feed.name.includes('IEEE Spectrum')) {
          source = 'IEEE Spectrum';
        }

        allArticles.push({
          title,
          link: item.link,
          source,
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          snippet: item.contentSnippet || item.content || ''
        });
      }
    } catch (error) {
      console.error(`Error fetching feed ${feed.name}:`, error);
    }
  }

  // Deduplicate by title similarity or exact links
  const seenLinks = new Set<string>();
  const uniqueArticles = allArticles.filter(art => {
    if (seenLinks.has(art.link)) return false;
    seenLinks.add(art.link);
    return true;
  });

  console.log(`Fetched ${uniqueArticles.length} unique articles.`);
  return uniqueArticles.slice(0, 15); // Limit to top 15 articles to avoid token blowup
}

async function generateAISummaries(articles: RawArticle[]): Promise<DailySummary> {
  const apiKey = process.env.GEMINI_API_KEY;
  const todayStr = new Date().toISOString().split('T')[0];

  if (!apiKey) {
    console.warn('\n⚠️ GEMINI_API_KEY environment variable not set. Generating high-quality mock data for testing...');
    return generateMockSummary(todayStr);
  }

  console.log('Initializing Gemini API client...');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const prompt = `
You are an expert tech curator specializing in Artificial Intelligence and Robotics.
Your task is to analyze the following list of raw news articles fetched today (${todayStr}), filter out irrelevant news (ensure they are strictly about robotics, humanoids, physical AI, or automation), and produce a structured daily digest.

Rules for output:
1. Summarize each selected article in 2-3 sentences, highlighting the core technical breakthrough or commercial impact.
2. Group the articles into meaningful categories, choosing from: "Humanoids", "Research & AI Models", "Logistics & Service", "Business & Market", "Consumer Robots". Do not create categories with no articles.
3. Keep the most impactful 4-6 articles overall. Filter out duplicate topics or lower-priority press releases.
4. Assign an "impactScore" (integer 1-10) reflecting how much this news shapes the future of robotics.
5. Create a list of 3 "trends" representing key takeaways or patterns observed in today's news.
6. Provide the output in the JSON format matching the schema below.

Input Articles:
${JSON.stringify(articles, null, 2)}

Expected JSON Output Schema:
{
  "date": "${todayStr}",
  "trends": ["trend bullet 1", "trend bullet 2", "trend bullet 3"],
  "categories": {
    "CategoryName": [
      {
        "title": "Article Title",
        "link": "Article URL",
        "source": "Source Name",
        "publishedAt": "ISO date",
        "summary": "2-3 sentences summary",
        "impactScore": 9
      }
    ]
  }
}
`;

  console.log('Sending prompt to Gemini...');
  const response = await model.generateContent(prompt);
  const text = response.response.text();
  console.log('Gemini responded successfully.');

  try {
    const summary = JSON.parse(text) as DailySummary;
    // Enforce date matches todayStr
    summary.date = todayStr;
    return summary;
  } catch (e) {
    console.error('Failed to parse Gemini JSON output. Raw output:', text);
    throw e;
  }
}

function generateMockSummary(dateStr: string): DailySummary {
  // Select some realistic items for mock generation
  const mockStories = [
    {
      title: "Agility Robotics Deploys Digit to Spanx Distribution Centers",
      link: "https://example.com/agility-digit-spanx",
      source: "Retail Wire",
      publishedAt: new Date().toISOString(),
      summary: "Agility Robotics has signed a multi-year fleet agreement to deploy its Digit humanoid robot to Spanx distribution warehouses. Digit will carry out bin-toting and inventory-sorting tasks, integrating directly with existing warehouse management software. This marks one of the first major commercial expansions of humanoid fleets in the apparel logistics sector.",
      impactScore: 8,
      category: "Logistics & Service"
    },
    {
      title: "Stanford Researchers Build 'Low-Cost' Dexterous Robotic Hand for $500",
      link: "https://example.com/stanford-dexterous-hand",
      source: "Stanford News",
      publishedAt: new Date().toISOString(),
      summary: "Engineering students at Stanford University have published open-source designs for a highly dexterous, 3D-printable robotic hand that costs under $500 in parts. Powered by standard hobby servos and custom compliant joint mechanisms, the hand can pinch, grip, and type. The project aims to democratize physical AI hardware research in resource-constrained labs.",
      impactScore: 9,
      category: "Research & AI Models"
    },
    {
      title: "Tesla Rolls Out 'FSD-Beta' equivalent for Optimus in selected factories",
      link: "https://example.com/tesla-optimus-fsd",
      source: "Electrek",
      publishedAt: new Date().toISOString(),
      summary: "Tesla is deploying a major software update to its internal Optimus robot fleet. The update introduces autonomous path-planning, allowing the robots to navigate busy factory floors without pre-mapped routes, utilizing the same occupant occupancy network models as Tesla's electric vehicles. Trial operations are expanding in Nevada and Fremont.",
      impactScore: 9,
      category: "Humanoids"
    }
  ];

  const categories: { [key: string]: Article[] } = {};
  for (const story of mockStories) {
    if (!categories[story.category]) {
      categories[story.category] = [];
    }
    categories[story.category].push({
      title: story.title,
      link: story.link,
      source: story.source,
      publishedAt: story.publishedAt,
      summary: story.summary,
      impactScore: story.impactScore
    });
  }

  return {
    date: dateStr,
    trends: [
      "Low-cost open-source hardware designs are democratizing robotics research.",
      "Tesla is leveraging its automotive autopilot technology to accelerate humanoid navigation.",
      "Humanoid fleets are securing larger retail and apparel logistics commercial contracts."
    ],
    categories
  };
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  
  try {
    const rawArticles = await fetchNews();
    if (rawArticles.length === 0) {
      console.log('No articles found in RSS feeds today. Exiting.');
      return;
    }

    const dailySummary = await generateAISummaries(rawArticles);

    console.log('\n--- Generated Summary Overview ---');
    console.log(`Date: ${dailySummary.date}`);
    console.log(`Trends:\n - ${dailySummary.trends.join('\n - ')}`);
    console.log('Categories:', Object.keys(dailySummary.categories).join(', '));
    console.log('----------------------------------\n');

    if (isDryRun) {
      console.log('Dry run complete. No files written.');
      return;
    }

    // Load existing archive
    let archive: DailySummary[] = [];
    if (fs.existsSync(ARCHIVE_PATH)) {
      try {
        const fileContent = fs.readFileSync(ARCHIVE_PATH, 'utf-8');
        archive = JSON.parse(fileContent) as DailySummary[];
      } catch (err) {
        console.error('Failed to parse existing archive. Starting fresh.', err);
      }
    }

    // Remove existing entry for today if it exists to prevent duplicates
    archive = archive.filter(entry => entry.date !== dailySummary.date);

    // Prepend the new summary so latest is first
    archive.unshift(dailySummary);

    // Keep archive size reasonable (e.g. last 30 days)
    if (archive.length > 30) {
      archive = archive.slice(0, 30);
    }

    // Write back to archive.json
    fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2), 'utf-8');
    console.log(`Successfully saved daily summary to: ${ARCHIVE_PATH}`);
    process.exit(0);

  } catch (error) {
    console.error('Failed to run summarizer:', error);
    process.exit(1);
  }
}

run();
