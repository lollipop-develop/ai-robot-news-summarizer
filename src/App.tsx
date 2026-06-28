import { useState } from 'react';
import { 
  Cpu, 
  TrendingUp, 
  Calendar, 
  Search, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  BookOpen, 
  Filter, 
  Sparkles,
  Award
} from 'lucide-react';
import type { DailySummary } from './types';
import archiveData from './data/archive.json';

// Helper to get a curated premium image based on category and index
const getCategoryImage = (category: string, index: number) => {
  const images: { [key: string]: string[] } = {
    "ヒューマノイド": [
      "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=600&q=80"
    ],
    "研究・AIモデル": [
      "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=600&q=80"
    ],
    "物流・サービス": [
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80"
    ],
    "ビジネス・市場": [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"
    ]
  };

  const defaultImages = [
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=600&q=80"
  ];

  const list = images[category] || defaultImages;
  return list[index % list.length];
};

export default function App() {
  // Load archive data, cast to proper typing
  const [summaries] = useState<DailySummary[]>(archiveData as unknown as DailySummary[]);
  
  // Default to the most recent date available in archive, or fall back
  const [selectedDate, setSelectedDate] = useState<string>(
    summaries.length > 0 ? summaries[0].date : new Date().toISOString().split('T')[0]
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  // Find the active daily summary
  const activeSummary = summaries.find(s => s.date === selectedDate);

  // Extract all categories for the active summary
  const categoriesList = activeSummary 
    ? ['All', ...Object.keys(activeSummary.categories)]
    : ['All'];

  // Helper for impact score styling class
  const getImpactClass = (score: number) => {
    if (score >= 9) return 'high';
    if (score >= 7) return 'med';
    return 'low';
  };

  // Format date display
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="app-container">
      {/* Main Header */}
      <header className="header glass-panel">
        <div className="logo-section">
          <Cpu className="logo-icon" size={32} />
          <div>
            <h1 className="logo-title">ROBO-FEED</h1>
            <p className="logo-subtitle">Daily AI & Robotics Curator</p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Calendar Selector */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 className="section-title">
              <Calendar size={14} />
              Daily Digests Archive
            </h2>
            <div className="date-selector-list">
              {summaries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                  No historical entries.
                </div>
              ) : (
                summaries.map(summary => (
                  <button
                    key={summary.date}
                    className={`date-item ${selectedDate === summary.date ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDate(summary.date);
                      setActiveCategory('All');
                    }}
                  >
                    <span>{formatDateLabel(summary.date)}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {Object.values(summary.categories).flat().length} articles
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Daily Trends Summary */}
          {activeSummary && (
            <div className="trends-card glass-panel">
              <h2 className="section-title">
                <TrendingUp size={14} />
                Key Trends of the Day
              </h2>
              <div className="trends-list">
                {activeSummary.trends.map((trend, idx) => (
                  <div key={idx} className="trend-bullet">
                    <Sparkles className="trend-icon" size={16} />
                    <span>{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* News Feed Content */}
        <main className="main-content">
          {/* Controls Bar */}
          <div className="filter-bar glass-panel">
            <div className="filter-group">
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                <Filter size={14} style={{ marginRight: '0.25rem' }} /> Filter:
              </span>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  className={`filter-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === 'All' ? 'All Feed' : cat}
                </button>
              ))}
            </div>

            <div className="search-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search articles & summaries..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* News Feed List */}
          {activeSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {Object.entries(activeSummary.categories).map(([categoryName, articles]) => {
                // Apply filters (category tab and search query)
                if (activeCategory !== 'All' && activeCategory !== categoryName) {
                  return null;
                }

                const filteredArticles = articles.filter(art => {
                  const matchSearch = searchQuery === '' || 
                    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    art.source.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchSearch;
                });

                if (filteredArticles.length === 0) {
                  return null;
                }

                return (
                  <div key={categoryName} className="category-block">
                    <h3 className="category-header">
                      <BookOpen size={18} style={{ color: 'var(--accent-cyan)' }} />
                      {categoryName}
                    </h3>
                    <div className="news-grid">
                      {filteredArticles.map((art, idx) => (
                        <article key={idx} className="news-card glass-panel">
                          <div className="news-card-inner">
                            <img 
                              src={art.imageUrl || getCategoryImage(categoryName, idx)} 
                              alt={art.title} 
                              className="news-card-image"
                              onError={(e) => {
                                e.currentTarget.src = getCategoryImage(categoryName, idx);
                              }}
                            />
                            <div className="news-card-content">
                              <div className="news-header">
                                <a 
                                  href={art.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="news-title"
                                >
                                  {art.title}
                                </a>
                                <span className={`impact-badge ${getImpactClass(art.impactScore)}`}>
                                  <Award size={12} style={{ marginRight: '0.15rem' }} />
                                  Impact: {art.impactScore}
                                </span>
                              </div>

                              <div className="news-meta">
                                <div className="meta-item">
                                  <span style={{ fontWeight: 600, color: 'var(--accent-crimson)' }}>{art.source}</span>
                                </div>
                                <div className="meta-item">
                                  <Clock size={12} />
                                  <span>{new Date(art.publishedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>

                              <p className="news-summary">
                                {art.summary}
                              </p>

                              <div className="news-footer">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Aggregated via Robotics Feeds
                                </span>
                                <a 
                                  href={art.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="read-more"
                                >
                                  Read Original Source
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Other news section (unsummarized) */}
              {activeCategory === 'All' && activeSummary.otherArticles && activeSummary.otherArticles.length > 0 && (
                <div className="other-articles-section">
                  <h3 className="other-articles-header">
                    <BookOpen size={18} style={{ marginRight: '0.35rem', color: 'var(--accent-crimson)' }} />
                    その他の関連ニュース（要約なし）
                  </h3>
                  <div className="other-articles-list">
                    {activeSummary.otherArticles.map((art, idx) => (
                      <div key={idx} className="other-article-item">
                        <a 
                          href={art.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="other-article-link"
                        >
                          {art.title}
                        </a>
                        <span className="other-article-meta">{art.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Check if anything matched filters overall */}
              {(() => {
                const totalVisible = Object.entries(activeSummary.categories)
                  .filter(([catName]) => activeCategory === 'All' || activeCategory === catName)
                  .flatMap(([, arts]) => arts.filter(art => 
                    searchQuery === '' || 
                    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    art.summary.toLowerCase().includes(searchQuery.toLowerCase())
                  )).length;

                if (totalVisible === 0) {
                  return (
                    <div className="empty-state glass-panel">
                      <Search size={48} className="empty-icon" />
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No results found</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        No articles match "{searchQuery}" in {activeCategory === 'All' ? 'all feed' : activeCategory} category.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="empty-state glass-panel">
              <AlertCircle size={48} className="empty-icon" />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No digest found</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Please select a date from the archive.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 ROBO-FEED Service. Powered by Google Gemini AI & GitHub Actions.</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Design utilizing React, TypeScript, Glassmorphism, and responsive CSS grids.
        </p>
      </footer>
    </div>
  );
}
