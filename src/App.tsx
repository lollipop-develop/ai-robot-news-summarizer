import { useState } from 'react';
import { 
  Cpu, 
  TrendingUp, 
  Calendar, 
  Search, 
  ExternalLink, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  BookOpen, 
  Filter, 
  Sparkles,
  Award
} from 'lucide-react';
import type { DailySummary } from './types';
import archiveData from './data/archive.json';

export default function App() {
  // Load archive data, cast to proper typing
  const [summaries, setSummaries] = useState<DailySummary[]>(archiveData as unknown as DailySummary[]);
  
  // Default to the most recent date available in archive, or fall back
  const [selectedDate, setSelectedDate] = useState<string>(
    summaries.length > 0 ? summaries[0].date : new Date().toISOString().split('T')[0]
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isAggregating, setIsAggregating] = useState(false);
  const [apiNoticeClosed, setApiNoticeClosed] = useState(false);

  // Find the active daily summary
  const activeSummary = summaries.find(s => s.date === selectedDate);

  // Extract all categories for the active summary
  const categoriesList = activeSummary 
    ? ['All', ...Object.keys(activeSummary.categories)]
    : ['All'];

  // Handle mock live updates (Aggregator simulator)
  const triggerMockAggregation = () => {
    setIsAggregating(true);
    
    // Simulate API fetch delay
    setTimeout(() => {
      setIsAggregating(false);
      
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Check if we already have today's date in summaries
      const exists = summaries.some(s => s.date === todayStr);
      if (exists) {
        alert("Today's news digest has already been generated and saved! Check the list for " + todayStr);
        return;
      }

      // Prepend a new simulated day
      const newDay: DailySummary = {
        date: todayStr,
        trends: [
          "Anthropic releases Claude 4.5 Robotics Orchestrator API for multi-agent hardware control.",
          "NVIDIA introduces Project GR00T upgrades with low-latency tactile sensory integration.",
          "Open-source robotics operating systems see an 80% spike in developer adoption."
        ],
        categories: {
          "Humanoids": [
            {
              "title": "Anthropic Partners with 1X to Deploy Claude 4.5 Orchestrators in Neo Humanoids",
              "link": "https://example.com/anthropic-1x-neo",
              "source": "TechCrunch",
              "publishedAt": new Date().toISOString(),
              "summary": "Anthropic and 1X Technologies have announced a joint partnership to integrate Anthropic's next-generation Claude models directly into the Neo humanoid robot. The integration provides advanced reasoning, enabling Neo to adapt to dynamically changing household chores without manual code updates. Pilot tests begin in Oslo next week.",
              "impactScore": 10
            }
          ],
          "Research & AI Models": [
            {
              "title": "NVIDIA Upgrades Project GR00T Humanoid Model with Tactile Vision-Language-Action Models",
              "link": "https://example.com/nvidia-gr00t-tactile",
              "source": "NVIDIA Developer Blog",
              "publishedAt": new Date().toISOString(),
              "summary": "NVIDIA announced major upgrades to Project GR00T, its foundation model for humanoid robots. The update enables robots to process tactile feedback and vision inputs concurrently through a unified transformer architecture. This reduces friction and enhances success rates in delicate manipulations like sorting screws or folding linen.",
              "impactScore": 9
            }
          ],
          "Business & Market": [
            {
              "title": "Collaborative Robot Shipments Expected to Double by 2027 Amid Labor Pressures",
              "link": "https://example.com/cobots-growth-2027",
              "source": "Financial Times",
              "publishedAt": new Date().toISOString(),
              "summary": "A market report from Interact Analysis indicates that global collaborative robot (cobot) shipments are projected to double over the next 18 months. Rising manufacturing labor costs and improved robotic safety sensors are encouraging mid-sized factories to invest in joint human-machine workspaces.",
              "impactScore": 8
            }
          ]
        }
      };

      setSummaries(prev => [newDay, ...prev]);
      setSelectedDate(todayStr);
      setActiveCategory('All');
    }, 1800);
  };

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
      {/* Top Banner Notice */}
      {!apiNoticeClosed && (
        <div className="overlay-banner">
          <div className="banner-text">
            <AlertCircle size={16} className="logo-icon" />
            <span>
              <strong>Note:</strong> Currently running in demo mode. The backend script aggregates feeds from Google News & IEEE Spectrum. To enable autonomous daily updates, configure <code>GEMINI_API_KEY</code> and set up the GitHub Actions daily workflow.
            </span>
          </div>
          <button 
            className="banner-action" 
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setApiNoticeClosed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="header glass-panel">
        <div className="logo-section">
          <Cpu className="logo-icon" size={32} />
          <div>
            <h1 className="logo-title">ROBO-FEED</h1>
            <p className="logo-subtitle">Daily AI & Robotics Curator</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            GitHub Repo
          </button>
          <button 
            className="btn btn-primary"
            onClick={triggerMockAggregation}
            disabled={isAggregating}
          >
            <RefreshCw size={16} className={isAggregating ? 'animate-spin' : ''} />
            {isAggregating ? 'Processing Feeds...' : 'Fetch & Summarize Now'}
          </button>
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
                              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{art.source}</span>
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
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}

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
