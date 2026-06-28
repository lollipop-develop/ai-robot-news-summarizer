export interface Article {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  impactScore: number; // 1 to 10 scale
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  trends: string[]; // Key takeaways or trend descriptions
  categories: {
    [category: string]: Article[];
  };
}
