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
  imageUrl?: string;
}

interface Article {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  impactScore: number;
  imageUrl?: string;
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
    name: 'Google News AI & Robotics (Global)',
    url: 'https://news.google.com/rss/search?q=robot+OR+robotics+OR+humanoid+when:24h&hl=en-US&gl=US&ceid=US:en'
  },
  {
    name: 'Google News (Target Sites)',
    url: 'https://news.google.com/rss/search?q=(robot+OR+robotics+OR+humanoid)+(site:ifr.org+OR+site:science.org/journal/scirobotics+OR+site:rsj.or.jp+OR+site:robot-digest.com+OR+site:bostondynamics.com)+when:7d&hl=ja&gl=JP&ceid=JP:ja'
  },
  {
    name: 'IEEE Spectrum Robotics',
    url: 'https://spectrum.ieee.org/feeds/robotics.rss'
  },
  {
    name: 'ScienceDaily Robotics',
    url: 'https://www.sciencedaily.com/rss/computers_math/robotics.xml'
  },
  {
    name: 'Robohub',
    url: 'https://robohub.org/feed/'
  },
  {
    name: 'NVIDIA Autonomous Machines',
    url: 'https://blogs.nvidia.com/blog/category/autonomous-machines/feed/'
  },
  {
    name: 'The Robot Report',
    url: 'https://www.therobotreport.com/feed/'
  },
  {
    name: 'ロボスタ (Robostart)',
    url: 'https://robotstart.info/feed'
  },
  {
    name: 'MONOist',
    url: 'https://rss.itmedia.co.jp/rss/2.0/monoist.xml'
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

        // Try to extract image URL from enclosures or description html
        let imageUrl = '';
        if (item.enclosure && item.enclosure.url) {
          imageUrl = item.enclosure.url;
        } else {
          const htmlContent = item.content || item.contentSnippet || '';
          const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        allArticles.push({
          title,
          link: item.link,
          source,
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          snippet: item.contentSnippet || item.content || '',
          imageUrl: imageUrl || undefined
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
  return uniqueArticles.slice(0, 40); // Limit to top 40 articles to give Gemini more choice
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
Your task is to analyze the following list of raw news articles fetched today (${todayStr}), filter out irrelevant news (ensure they are strictly about robotics, humanoids, physical AI, or automation), and produce a structured daily digest in Japanese.

Rules for output:
1. Translate the title into natural and professional Japanese.
2. Translate and summarize each selected article in Japanese in 2-3 concise sentences (80-150 Japanese characters), highlighting the core technical breakthrough or commercial impact.
3. Group the articles into Japanese categories: choose from "ヒューマノイド", "研究・AIモデル", "物流・サービス", "ビジネス・市場", "家庭用・コンシューマー". Do not create categories with no articles.
4. Keep the most impactful 10-15 articles overall. Filter out duplicate topics or lower-priority press releases.
5. Assign an "impactScore" (integer 1-10) reflecting how much this news shapes the future of robotics.
6. Create a list of 3 key "trends" (summary points) observed in today's news, written in natural Japanese.
7. Include the "imageUrl" property in the output JSON for each article, setting it to the exact imageUrl string passed in the input (or an empty string if none was provided). Do not modify or invent image URLs.
8. Provide the output in the JSON format matching the schema below.

Input Articles:
${JSON.stringify(articles, null, 2)}

Expected JSON Output Schema:
{
  "date": "${todayStr}",
  "trends": ["日本語のトレンド動向1", "日本語のトレンド動向2", "日本語のトレンド動向3"],
  "categories": {
    "日本語のカテゴリ名": [
      {
        "title": "日本語に翻訳された記事タイトル",
        "link": "Article URL",
        "source": "Source Name",
        "publishedAt": "ISO date",
        "summary": "日本語で2〜3文で書かれた要約",
        "impactScore": 9,
        "imageUrl": "The exact imageUrl passed in input, or empty string"
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
      title: "Agility Robotics、Digit人型ロボットをSpanx物流センターに配備開始",
      link: "https://example.com/agility-digit-spanx",
      source: "Retail Wire",
      publishedAt: new Date().toISOString(),
      summary: "Agility Roboticsは、Spanxの配送倉庫に人型ロボット「Digit」を導入する複数年契約を締結しました。Digitはトートバッグの運搬や在庫の仕分け作業を行い、既存の倉庫管理ソフトウェアと直接連携します。これは、アパレル物流部門における人型ロボットフリートの大規模な商用導入事例の1つとなります。",
      impactScore: 8,
      category: "物流・サービス",
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "スタンフォード大学、500ドル未満で製作できるオープンソースの多指ロボットハンドを開発",
      link: "https://example.com/stanford-dexterous-hand",
      source: "Stanford News",
      publishedAt: new Date().toISOString(),
      summary: "スタンフォード大学の研究チームは、部品代が500ドル未満で済む高精度な3Dプリント製ロボットハンドの設計図をオープンソースとして公開しました。標準的なホビー用サーボと compliant 構造によって駆動し、物をつまむ、掴む、キーボードを入力するなどの作業が可能です。資金の限られた研究室でのロボティクス研究の民主化を目指します。",
      impactScore: 9,
      category: "研究・AIモデル",
      imageUrl: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=600&q=80"
    },
    {
      title: "テスラ、一部の工場で人型ロボットOptimus向けに『FSDベータ』相当の歩行システムを導入",
      link: "https://example.com/tesla-optimus-fsd",
      source: "Electrek",
      publishedAt: new Date().toISOString(),
      summary: "テスラは、自社工場内のOptimusロボットに対して大規模なソフトウェアアップデートの配信を開始しました。この更新により、ロボットは事前に定義された経路なしで混雑した工場内を自律走行できるようになり、テスラ車と同一の占有グリッドネットワークモデルを使用しています。テキサス等の工場で検証中です。",
      impactScore: 9,
      category: "ヒューマノイド",
      imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80"
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
      impactScore: story.impactScore,
      imageUrl: story.imageUrl
    });
  }

  return {
    date: dateStr,
    trends: [
      "低コストでオープンソースな多指ロボットハンド設計が研究現場でのロボット導入を民主化しています。",
      "テスラは自動運転技術（FSD）の知見をそのまま人型ロボットの自律歩行技術に転用し、進化を加速させています。",
      "物流やアパレル企業の倉庫において、人型ロボットフリートの商用配備契約が実証段階から本配備へと拡大しつつあります。"
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
