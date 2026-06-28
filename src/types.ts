export interface Article {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  impactScore: number; // 1 to 10 scale
  imageUrl?: string; // Optional URL to the article's actual thumbnail
}

export interface OtherArticle {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  trends: string[]; // Key takeaways or trend descriptions
  categories: {
    [category: string]: Article[];
  };
  otherArticles?: OtherArticle[]; // List of unsummarized articles fetched today
}
