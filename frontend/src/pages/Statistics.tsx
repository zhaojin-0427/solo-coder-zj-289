import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statisticsApi, planApi } from '../api/client';
import type { Statistics, ColorFamily, StickerCategory, StickerSource, PlanStatistics, ProcurementStats, ProcurementItemType } from '../types';
import { ColorFamilyLabels, CategoryLabels, SourceLabels, ProcurementItemTypeLabels } from '../types';
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
  const [planStats, setPlanStats] = useState<PlanStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [data, planData] = await Promise.all([
        statisticsApi.getStatistics(),
        planApi.getStatistics()
      ]);
      setStats(data);
      setPlanStats(planData);
    } catch {
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
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalTemplates || 0}</div>
            <div className="stat-label">模板数量</div>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.unusedStickers.length}</div>
            <div className="stat-label">待激活素材</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #6EC6FF 100%)', color: '#fff' }}>
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.templateUsageCount || 0}</div>
            <div className="stat-label">模板使用次数</div>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #4D96FF 100%)', color: '#fff' }}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.templateReuseRate || 0}%</div>
            <div className="stat-label">模板复用率</div>
          </div>
        </div>
        {planStats && (
          <>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #FF9A76 100%)', color: '#fff' }}>
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{planStats.completionRate || 0}%</div>
                <div className="stat-label">计划完成率</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #6BCB77 100%)', color: '#fff' }}>
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-value">{planStats.consecutiveDays || 0}</div>
                <div className="stat-label">连续创作天数</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF9A76 100%)', color: '#fff' }}>
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{planStats.overdueCount || 0}</div>
                <div className="stat-label">逾期计划数</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4D96FF 0%, #A855F7 100%)', color: '#fff' }}>
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-value">{planStats.materialReuseRate || 0}%</div>
                <div className="stat-label">计划带动素材复用率</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7 0%, #6EC6FF 100%)', color: '#fff' }}>
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{planStats.totalPlans || 0}</div>
                <div className="stat-label">计划总数</div>
              </div>
            </div>
          </>
        )}
        {stats.procurementStats && (
          <>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FF9A76 0%, #FFD93D 100%)', color: '#333' }}>
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <div className="stat-value">¥{stats.procurementStats.totalBudget.toFixed(0)}</div>
                <div className="stat-label">月度采购预算</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #A855F7 100%)', color: '#fff' }}>
              <div className="stat-icon">💳</div>
              <div className="stat-content">
                <div className="stat-value">¥{stats.procurementStats.totalSpent.toFixed(0)}</div>
                <div className="stat-label">采购已花费</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #4D96FF 100%)', color: '#fff' }}>
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-value">{stats.procurementStats.conversionRate}%</div>
                <div className="stat-label">采购转化率</div>
              </div>
            </div>
          </>
        )}
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

        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">📈 模板转化作品趋势</h3>
            <span className="section-badge">模板 vs 作品</span>
          </div>
          {!stats.templateConversionTrend || stats.templateConversionTrend.length === 0 ? (
            <div className="empty-mini">暂无模板使用记录</div>
          ) : (
            <>
              <div className="conv-chart">
                {stats.templateConversionTrend.map(item => {
                  const maxVal = Math.max(...stats.templateConversionTrend!.map(t => Math.max(t.templateCount, t.collageCount)), 1);
                  return (
                    <div key={item.month} className="conv-bar-col">
                      <div className="conv-bar-wrap">
                        <div className="conv-bar-group">
                          <div className="conv-bar conv-bar-template"
                            style={{ height: `${(item.templateCount / maxVal) * 100}%` }}
                            title={`模板创建: ${item.templateCount} 个`}>
                            <span className="conv-bar-value">{item.templateCount}</span>
                          </div>
                          <div className="conv-bar conv-bar-collage"
                            style={{ height: `${(item.collageCount / maxVal) * 100}%` }}
                            title={`模板衍生作品: ${item.collageCount} 个`}>
                            <span className="conv-bar-value">{item.collageCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="conv-label">{item.month.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="conv-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#A855F7' }} />
                  <span className="legend-label">新建模板数</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#6EC6FF' }} />
                  <span className="legend-label">模板衍生作品数</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="stats-section card">
          <div className="section-header">
            <h3 className="section-title">🔄 最常被替换的素材分类</h3>
            <span className="section-badge">智能替换分析</span>
          </div>
          {!stats.mostReplacedCategories || stats.mostReplacedCategories.length === 0 ? (
            <div className="empty-mini">暂无素材替换记录</div>
          ) : (
            <>
              <div className="replaced-cat-list">
                {(() => {
                  const maxReplaceCount = Math.max(...stats.mostReplacedCategories!.map(c => c.count), 1);
                  return stats.mostReplacedCategories!.map((item, idx) => (
                    <div key={item.category} className="replaced-cat-item">
                      <div className="replaced-rank">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </div>
                      <div className="replaced-info">
                        <div className="replaced-name-row">
                          <span className="replaced-name">{CategoryLabels[item.category] || item.category}</span>
                          <span className="replaced-count">{item.count} 次</span>
                        </div>
                        <div className="replaced-bar-bg">
                          <div className="replaced-bar-fill"
                            style={{
                              width: `${(item.count / maxReplaceCount) * 100}%`,
                              backgroundColor: getCategoryColor(item.category)
                            }} />
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <p className="template-hint">
                💡 以上分类的素材最常被智能替换，建议扩充该分类的素材库以提升模板复用效果
              </p>
            </>
          )}
        </div>

        <div className="stats-section card card-wide">
          <div className="section-header">
            <h3 className="section-title">🏆 热门模板排行榜</h3>
            <span className="section-badge">TOP 5</span>
          </div>
          {!stats.topTemplates || stats.topTemplates.length === 0 ? (
            <div className="empty-mini">暂无模板数据</div>
          ) : (
            <div className="top-templates-list">
              {stats.topTemplates.map((tpl, idx) => (
                <div key={tpl.templateId} className="top-template-item">
                  <div className={`top-tpl-rank ${idx < 3 ? 'top' : ''}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div className="top-tpl-info">
                    <div className="top-tpl-name">{tpl.name}</div>
                    <div className="top-tpl-bar-bg">
                      <div className="top-tpl-bar-fill"
                        style={{
                          width: `${(tpl.usageCount / Math.max(...stats.topTemplates!.map(t => t.usageCount), 1)) * 100}%`
                        }} />
                    </div>
                  </div>
                  <div className="top-tpl-count">
                    <strong>{tpl.usageCount}</strong>
                    <span>次使用</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {planStats && planStats.themeCompletionTrend && planStats.themeCompletionTrend.length > 0 && (
          <div className="stats-section card card-wide">
            <div className="section-header">
              <h3 className="section-title">📊 各主题计划完成趋势</h3>
              <span className="section-badge">{planStats.themeCompletionTrend.length} 个主题</span>
            </div>
            <div className="theme-trend-chart">
              {(() => {
                const maxTotal = Math.max(...planStats.themeCompletionTrend.map(t => t.total || 0), 1);
                return planStats.themeCompletionTrend.map((item, idx) => (
                  <div key={item.theme} className="theme-trend-item">
                    <div className="theme-trend-header">
                      <span className="theme-trend-name">{item.theme}</span>
                      <span className="theme-trend-stats">
                        <span className="stat-complete">✓ {item.completed || 0}</span>
                        <span className="stat-total">/ {item.total || 0}</span>
                        <span className="stat-rate">({item.total ? Math.round((item.completed || 0) / item.total * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="theme-trend-bars">
                      <div className="theme-trend-track">
                        <div 
                          className="theme-trend-fill completed" 
                          style={{ width: `${((item.completed || 0) / maxTotal) * 100}%` }}
                          title={`已完成: ${item.completed || 0}`}
                        />
                        <div 
                          className="theme-trend-fill pending" 
                          style={{ 
                            width: `${(((item.total || 0) - (item.completed || 0)) / maxTotal) * 100}%`,
                            marginLeft: `${((item.completed || 0) / maxTotal) * 100}%`
                          }}
                          title={`待完成: ${(item.total || 0) - (item.completed || 0)}`}
                        />
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="theme-trend-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#6BCB77' }} />
                <span className="legend-label">已完成</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#FFD93D' }} />
                <span className="legend-label">待完成</span>
              </div>
            </div>
          </div>
        )}

        {stats.procurementStats && stats.procurementStats.totalItems > 0 && (
          <>
            <div className="stats-section card">
              <div className="section-header">
                <h3 className="section-title">💰 月度采购预算</h3>
                <span className="section-badge">采购数据</span>
              </div>
              {stats.procurementStats.monthlyBudget.length === 0 ? (
                <div className="empty-mini">暂无采购数据</div>
              ) : (
                <>
                  <div className="conv-chart">
                    {(() => {
                      const maxVal = Math.max(...stats.procurementStats!.monthlyBudget!.map(m => Math.max(m.budget, m.spent)), 1);
                      return stats.procurementStats!.monthlyBudget!.map(item => (
                        <div key={item.month} className="conv-bar-col">
                          <div className="conv-bar-wrap">
                            <div className="conv-bar-group">
                              <div className="conv-bar conv-bar-template"
                                style={{ height: `${(item.budget / maxVal) * 100}%` }}
                                title={`预算: ¥${item.budget.toFixed(2)}`}>
                                <span className="conv-bar-value">¥{item.budget.toFixed(0)}</span>
                              </div>
                              <div className="conv-bar conv-bar-collage"
                                style={{ height: `${(item.spent / maxVal) * 100}%` }}
                                title={`花费: ¥${item.spent.toFixed(2)}`}>
                                <span className="conv-bar-value">¥{item.spent.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="conv-label">{item.month.slice(5)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="conv-legend">
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#A855F7' }} />
                      <span className="legend-label">预算</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#6EC6FF' }} />
                      <span className="legend-label">实际花费</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="stats-section card">
              <div className="section-header">
                <h3 className="section-title">📂 分类花费占比</h3>
                <span className="section-badge">{stats.procurementStats.categorySpending.length} 类</span>
              </div>
              {stats.procurementStats.categorySpending.length === 0 ? (
                <div className="empty-mini">暂无数据</div>
              ) : (
                <div className="tag-ranking">
                  {(() => {
                    const maxBudget = Math.max(...stats.procurementStats!.categorySpending!.map(c => c.budget), 1);
                    return stats.procurementStats!.categorySpending!.map((cat, idx) => (
                      <div key={cat.category} className="tag-rank-item">
                        <div className={`rank-number ${idx < 3 ? 'top' : ''}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>
                        <div className="rank-bar-wrap">
                          <div className="rank-info">
                            <span className="rank-name">{ProcurementItemTypeLabels[cat.category as ProcurementItemType] || cat.category}</span>
                            <span className="rank-count">¥{cat.spent.toFixed(0)} / ¥{cat.budget.toFixed(0)} ({cat.count}项)</span>
                          </div>
                          <div className="rank-bar-bg">
                            <div className="rank-bar-fill"
                              style={{
                                width: `${(cat.budget / maxBudget) * 100}%`,
                                background: cat.budget > 0 && cat.spent / cat.budget > 0.9
                                  ? 'linear-gradient(90deg, #FF6B6B, #FF9A76)'
                                  : 'linear-gradient(90deg, #A855F7, #6EC6FF)'
                              }} />
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {stats.procurementStats.themeGapChanges && stats.procurementStats.themeGapChanges.length > 0 && (
              <div className="stats-section card card-wide">
                <div className="section-header">
                  <h3 className="section-title">📈 主题缺口变化趋势</h3>
                  <span className="section-badge">{stats.procurementStats.themeGapChanges.length} 个主题</span>
                </div>
                <div className="theme-trend-chart">
                  {stats.procurementStats.themeGapChanges.map(item => {
                    const diff = item.previousGapScore - item.gapScore;
                    return (
                      <div key={item.theme} className="theme-trend-item">
                        <div className="theme-trend-header">
                          <span className="theme-trend-name">{item.theme}</span>
                          <span className="theme-trend-stats">
                            <span style={{ color: diff > 0 ? '#6BCB77' : diff < 0 ? '#FF6B6B' : '#9B9B9B', fontWeight: 600 }}>
                              {diff > 0 ? `↓${diff}%` : diff < 0 ? `↑${Math.abs(diff)}%` : '持平'}
                            </span>
                            <span className="stat-total">缺口 {item.gapScore}%</span>
                          </span>
                        </div>
                        <div className="theme-trend-bars">
                          <div className="theme-trend-track">
                            <div className="theme-trend-fill completed"
                              style={{ width: `${((100 - item.gapScore) / 100) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="theme-trend-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#6BCB77' }} />
                    <span className="legend-label">素材覆盖</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#FFD93D' }} />
                    <span className="legend-label">缺口空间</span>
                  </div>
                </div>
              </div>
            )}

            <div className="stats-section card">
              <div className="section-header">
                <h3 className="section-title">🔄 采购转化为实际素材比例</h3>
                <span className="section-badge">{stats.procurementStats.conversionRate}%</span>
              </div>
              <div className="conversion-rate-display">
                <div className="conv-rate-ring">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="36" fill="none" stroke="#f0e6dc" strokeWidth="14" />
                    <circle cx="50" cy="50" r="36" fill="none"
                      stroke={stats.procurementStats.conversionRate >= 70 ? '#6BCB77' : stats.procurementStats.conversionRate >= 40 ? '#FFD93D' : '#FF6B6B'}
                      strokeWidth="14"
                      strokeDasharray={`${(stats.procurementStats.conversionRate / 100) * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'all 0.5s' }} />
                    <text x="50" y="48" textAnchor="middle" className="donut-text-value">{stats.procurementStats.conversionRate}%</text>
                    <text x="50" y="60" textAnchor="middle" className="donut-text-label">转化率</text>
                  </svg>
                </div>
                <div className="conv-rate-details">
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">采购项总数</span>
                    <span className="conv-detail-value">{stats.procurementStats.totalItems}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">待采购</span>
                    <span className="conv-detail-value">{stats.procurementStats.pendingCount}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">已购买</span>
                    <span className="conv-detail-value">{stats.procurementStats.purchasedCount}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">已入库</span>
                    <span className="conv-detail-value">{stats.procurementStats.stockedCount}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">总预算</span>
                    <span className="conv-detail-value">¥{stats.procurementStats.totalBudget.toFixed(2)}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">已花费</span>
                    <span className="conv-detail-value">¥{stats.procurementStats.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="conv-detail-row">
                    <span className="conv-detail-label">剩余预算</span>
                    <span className="conv-detail-value">¥{stats.procurementStats.budgetRemaining.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
