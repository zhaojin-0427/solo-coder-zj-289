import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statisticsApi } from '../api/client';
import type { Statistics, ColorFamily, StickerCategory, StickerSource } from '../types';
import { ColorFamilyLabels, CategoryLabels, SourceLabels } from '../types';
import './Statistics.css';

const ColorFamilyColors: Record<ColorFamily, string> = {
  red: '#FF6B6B',
  orange: '#FF9A76',
  yellow: '#FFD93D',
  green: '#6BCB77',
  cyan: '#4D96FF',
  blue: '#3B82F6',
  purple: '#A855F7',
  pink: '#FF6B9D',
  brown: '#92400E',
  gray: '#9CA3AF',
  monochrome: '#1F2937'
};

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await statisticsApi.getStatistics();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="statistics-page">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载统计数据中...</div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxTagCount = Math.max(...stats.topTags.map(t => t.count), 1);
  const maxMonthCount = Math.max(...stats.monthlyTrend.map(m => m.count), 1);
  const totalColorPercent = stats.colorFamilyDistribution.reduce((s, c) => s + c.count, 0);

  return (
    <div className="statistics-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">📊 数据统计</h2>
          <p className="page-subtitle">了解你的素材使用习惯与创作趋势</p>
        </div>
        <button className="btn btn-secondary" onClick={loadStats}>
          🔄 刷新数据
        </button>
      </div>

      <div className="stats-overview">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">🎨</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalStickers}</div>
            <div className="stat-label">素材总数</div>
          </div>
        </div>
        <div className="stat-card stat-card-secondary">
          <div className="stat-icon">✂️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalCollages}</div>
            <div className="stat-label">作品数量</div>
          </div>
        </div>
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.topTags.length}</div>
            <div className="stat-label">已使用标签</div>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.unusedStickers.length}</div>
            <div className="stat-label">待激活素材</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">🌈 色系分布</h3>
            <span className="section-badge">{stats.colorFamilyDistribution.length} 类</span>
          </div>
          {stats.colorFamilyDistribution.length === 0 ? (
            <div className="empty-mini">暂无数据</div>
          ) : (
            <>
              <div className="color-bar-chart">
                {stats.colorFamilyDistribution.map(item => (
                  <div key={item.family} className="color-bar-item">
                    <div className="color-bar-label">
                      <span className="color-swatch-sm" style={{ backgroundColor: ColorFamilyColors[item.family] }} />
                      <span>{ColorFamilyLabels[item.family]}</span>
                    </div>
                    <div className="color-bar-track">
                      <div className="color-bar-fill"
                        style={{
                          width: `${(item.count / totalColorPercent) * 100}%`,
                          backgroundColor: ColorFamilyColors[item.family]
                        }} />
                    </div>
                    <div className="color-bar-value">
                      <strong>{item.count}</strong>
                      <span className="percent">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="color-pie-grid">
                {stats.colorFamilyDistribution.slice(0, 6).map(item => (
                  <div key={item.family} className="pie-cell">
                    <div className="pie-dot" style={{ backgroundColor: ColorFamilyColors[item.family] }} />
                    <span className="pie-label">{ColorFamilyLabels[item.family]}</span>
                    <span className="pie-value">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">🔥 高频使用标签</h3>
            <span className="section-badge">TOP 10</span>
          </div>
          {stats.topTags.length === 0 ? (
            <div className="empty-mini">暂无标签使用记录</div>
          ) : (
            <div className="tag-ranking">
              {stats.topTags.map((tag, index) => (
                <div key={tag.tagId} className="tag-rank-item">
                  <div className={`rank-number ${index < 3 ? 'top' : ''}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="rank-bar-wrap">
                    <div className="rank-info">
                      <span className="rank-name">{tag.name}</span>
                      <span className="rank-count">{tag.count} 次</span>
                    </div>
                    <div className="rank-bar-bg">
                      <div className="rank-bar-fill"
                        style={{
                          width: `${(tag.count / maxTagCount) * 100}%`,
                          background: index < 3
                            ? 'linear-gradient(90deg, #FF6B9D, #FFD93D)'
                            : 'linear-gradient(90deg, #6EC6FF, #A855F7)'
                        }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">📈 创作月度趋势</h3>
            <span className="section-badge">近 {stats.monthlyTrend.length} 月</span>
          </div>
          {stats.monthlyTrend.length === 0 ? (
            <div className="empty-mini">暂无创作记录</div>
          ) : (
            <>
              <div className="month-chart">
                {stats.monthlyTrend.map(item => (
                  <div key={item.month} className="month-bar-col">
                    <div className="month-bar-wrap">
                      <div className="month-bar"
                        style={{ height: `${(item.count / maxMonthCount) * 100}%` }}
                        title={`${item.month}: ${item.count} 个作品`}>
                        <span className="month-bar-value">{item.count}</span>
                      </div>
                    </div>
                    <div className="month-label">{item.month.slice(5)}</div>
                  </div>
                ))}
              </div>
              <div className="month-summary">
                <div className="summary-item">
                  <span className="summary-label">累计作品</span>
                  <span className="summary-value">
                    {stats.monthlyTrend.reduce((s, m) => s + m.count, 0)} 个
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">最高月</span>
                  <span className="summary-value">
                    {stats.monthlyTrend.reduce((a, b) => a.count > b.count ? a : b).month} ({maxMonthCount}个)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">📦 分类与来源</h3>
            <span className="section-badge">概览</span>
          </div>
          <div className="two-col">
            <div>
              <h4 className="sub-title">素材分类</h4>
              <div className="mini-donut-wrap">
                <DonutChart
                  data={stats.categoryDistribution.map(d => ({
                    label: CategoryLabels[d.category as StickerCategory] || d.category,
                    value: d.count,
                    color: getCategoryColor(d.category as StickerCategory)
                  }))}
                />
              </div>
              <div className="legend-list">
                {stats.categoryDistribution.map(d => (
                  <div key={d.category} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: getCategoryColor(d.category as StickerCategory) }} />
                    <span className="legend-label">{CategoryLabels[d.category as StickerCategory] || d.category}</span>
                    <span className="legend-count">{d.count}</span>
                  </div>
                ))}
                {stats.categoryDistribution.length === 0 && (
                  <div className="empty-mini">暂无数据</div>
                )}
              </div>
            </div>
            <div>
              <h4 className="sub-title">素材来源</h4>
              <div className="mini-donut-wrap">
                <DonutChart
                  data={stats.sourceDistribution.map(d => ({
                    label: SourceLabels[d.source as StickerSource] || d.source,
                    value: d.count,
                    color: getSourceColor(d.source as StickerSource)
                  }))}
                />
              </div>
              <div className="legend-list">
                {stats.sourceDistribution.map(d => (
                  <div key={d.source} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: getSourceColor(d.source as StickerSource) }} />
                    <span className="legend-label">{SourceLabels[d.source as StickerSource] || d.source}</span>
                    <span className="legend-count">{d.count}</span>
                  </div>
                ))}
                {stats.sourceDistribution.length === 0 && (
                  <div className="empty-mini">暂无数据</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="stats-section card card-wide">
          <div className="section-header">
            <h3 className="section-title">⚠️ 长期未使用素材预警</h3>
            <span className="section-badge warning">{stats.unusedStickers.length} 张待激活</span>
          </div>
          {stats.unusedStickers.length === 0 ? (
            <div className="empty-state-sm">
              <div className="empty-sm-icon">🎉</div>
              <p>太棒了！所有素材都已充分利用</p>
            </div>
          ) : (
            <>
              <p className="warning-hint">
                💡 以下素材超过30天未使用或从未被使用，去拼贴台让它们焕发新生吧！
              </p>
              <div className="unused-grid">
                {stats.unusedStickers.map(sticker => (
                  <div key={sticker.id} className="unused-card" onClick={() => navigate('/stickers')}>
                    <div className="unused-img">
                      {sticker.imageData ? (
                        <img src={sticker.imageData} alt={sticker.name} />
                      ) : <div className="mini-placeholder">🖼️</div>}
                    </div>
                    <div className="unused-info">
                      <div className="unused-name" title={sticker.name}>{sticker.name}</div>
                      <div className="unused-status">
                        {sticker.usageCount === 0 ? (
                          <span className="status-new">🆕 从未使用</span>
                        ) : (
                          <span className="status-old">
                            ⌛ {getDaysAgo(sticker.lastUsedAt || sticker.createdAt)}天前
                          </span>
                        )}
                      </div>
                      <div className="unused-colors">
                        {sticker.primaryColors.slice(0, 3).map((c, i) => (
                          <span key={i} className="unused-color" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="donut-empty">
        <span className="empty-donut-ring" />
        <span className="empty-donut-text">0</span>
      </div>
    );
  }

  let cumulative = 0;
  const segments = data.map(d => {
    const startPct = cumulative / total;
    cumulative += d.value;
    const endPct = cumulative / total;
    return { ...d, startPct, endPct };
  });

  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 100 100" className="donut-svg">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#f0e6dc" strokeWidth="14" />
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const dashLength = (seg.endPct - seg.startPct) * circumference;
        const gapLength = circumference - dashLength;
        const startOffset = -seg.startPct * circumference;
        return (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${dashLength} ${gapLength}`}
            strokeDashoffset={startOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'all 0.5s' }}
          />
        );
      })}
      <text x="50" y="48" textAnchor="middle" className="donut-text-value">{total}</text>
      <text x="50" y="60" textAnchor="middle" className="donut-text-label">总计</text>
    </svg>
  );
}

function getDaysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function getCategoryColor(cat: StickerCategory): string {
  const colors: Record<StickerCategory, string> = {
    character: '#FF6B9D',
    text: '#4D96FF',
    decoration: '#6BCB77',
    tape: '#FF9A76'
  };
  return colors[cat] || '#999';
}

function getSourceColor(src: StickerSource): string {
  const colors: Record<StickerSource, string> = {
    purchased: '#A855F7',
    printed: '#FFD93D',
    gift: '#FF6B9D'
  };
  return colors[src] || '#999';
}
