import { useState, useEffect, useCallback } from 'react';
import { procurementApi } from '../api/client';
import type {
  ProcurementItem,
  ProcurementItemType,
  ProcurementPriority,
  ProcurementStatus,
  ProcurementStats,
  ColorFamily
} from '../types';
import {
  ProcurementItemTypeLabels,
  ProcurementPriorityLabels,
  ProcurementStatusLabels,
  ColorFamilyLabels
} from '../types';
import './Procurement.css';

const ColorFamilyColors: Record<ColorFamily, string> = {
  red: '#FF6B6B', orange: '#FF9A76', yellow: '#FFD93D', green: '#6BCB77',
  cyan: '#4D96FF', blue: '#3B82F6', purple: '#A855F7', pink: '#FF6B9D',
  brown: '#92400E', gray: '#9CA3AF', monochrome: '#1F2937'
};

const PriorityColors: Record<ProcurementPriority, string> = {
  high: '#FF6B6B', medium: '#FFD93D', low: '#6BCB77'
};

const StatusColors: Record<ProcurementStatus, string> = {
  pending: '#4D96FF', purchased: '#FFD93D', stocked: '#6BCB77'
};

type TabKey = 'list' | 'budget' | 'pending_stock' | 'archive' | 'stats';

interface GapAnalysis {
  overStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[];
  underStockedColorFamilies: { family: ColorFamily; count: number; percentage: number }[];
  overStockedCategories: { category: string; count: number }[];
  underStockedThemes: { theme: string; coverage: number; stickerCount: number; demandCount: number }[];
  unusedCount: number;
  suggestions: string[];
}

const allColorFamilies: ColorFamily[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray', 'monochrome'];
const allItemTypes: ProcurementItemType[] = ['sticker', 'tape', 'stamp', 'memo', 'other'];
const allPriorities: ProcurementPriority[] = ['high', 'medium', 'low'];

export default function Procurement() {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '', itemType: 'sticker' as ProcurementItemType, budget: 0,
    channel: '', priority: 'medium' as ProcurementPriority, themes: [] as string[],
    targetColorFamily: 'pink' as ColorFamily, expectedStockDate: '', notes: ''
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemData, statsData, gapData, themesData] = await Promise.all([
        procurementApi.getAll({ status: filterStatus || undefined, itemType: filterType || undefined }),
        procurementApi.getStatistics(),
        procurementApi.getGapAnalysis(),
        procurementApi.getAvailableThemes()
      ]);
      setItems(itemData);
      setStats(statsData);
      setGapAnalysis(gapData);
      setAvailableThemes(themesData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function resetForm() {
    setFormData({
      name: '', itemType: 'sticker', budget: 0, channel: '',
      priority: 'medium', themes: [], targetColorFamily: 'pink',
      expectedStockDate: '', notes: ''
    });
    setEditingItem(null);
    setShowForm(false);
  }

  function openEditForm(item: ProcurementItem) {
    setFormData({
      name: item.name, itemType: item.itemType, budget: item.budget,
      channel: item.channel, priority: item.priority, themes: item.themes,
      targetColorFamily: item.targetColorFamily, expectedStockDate: item.expectedStockDate,
      notes: item.notes
    });
    setEditingItem(item);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formData.name.trim()) return;
    try {
      if (editingItem) {
        await procurementApi.update(editingItem.id, formData);
      } else {
        await procurementApi.create(formData);
      }
      resetForm();
      loadAll();
    } catch (error) {
      console.error('保存失败:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此采购项？')) return;
    try {
      await procurementApi.delete(id);
      loadAll();
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  async function handleStatusChange(id: string, newStatus: ProcurementStatus) {
    try {
      const updates: Partial<ProcurementItem> = { status: newStatus };
      if (newStatus === 'purchased') updates.purchasedAt = new Date().toISOString();
      if (newStatus === 'stocked') updates.stockedAt = new Date().toISOString();
      await procurementApi.update(id, updates);
      loadAll();
    } catch (error) {
      console.error('状态更新失败:', error);
    }
  }

  async function handleConvertToDraft(id: string) {
    if (!confirm('将此采购项转为素材导入草稿？')) return;
    try {
      const result = await procurementApi.convertToDraft(id);
      alert(`已生成素材草稿: ${result.sticker.name}\n请前往素材库完善素材图片`);
      loadAll();
    } catch (error) {
      console.error('转换失败:', error);
    }
  }

  function toggleTheme(theme: string) {
    setFormData(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  }

  if (loading) {
    return (
      <div className="procurement-page">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载采购数据中...</div>
        </div>
      </div>
    );
  }

  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');
  const stockedItems = items.filter(i => i.status === 'stocked');

  const upcomingStock = items.filter(i =>
    (i.status === 'purchased' || i.status === 'pending') &&
    i.expectedStockDate &&
    new Date(i.expectedStockDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).sort((a, b) => a.expectedStockDate.localeCompare(b.expectedStockDate));

  return (
    <div className="procurement-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">🛒 素材采购清单与补货预算</h2>
          <p className="page-subtitle">智能缺口分析，避免重复购买，精准补货</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadAll}>🔄 刷新</button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>➕ 新增采购项</button>
        </div>
      </div>

      {gapAnalysis && gapAnalysis.suggestions.length > 0 && (
        <div className="suggestions-bar">
          {gapAnalysis.suggestions.map((s, i) => (
            <div key={i} className="suggestion-item">{s}</div>
          ))}
        </div>
      )}

      <div className="procurement-tabs">
        {([
          { key: 'list', label: '📋 采购清单', count: items.length },
          { key: 'budget', label: '💰 预算概览', count: 0 },
          { key: 'pending_stock', label: '📥 待入库提醒', count: upcomingStock.length },
          { key: 'archive', label: '🗄️ 已购归档', count: stockedItems.length },
          { key: 'stats', label: '📊 统计联动', count: 0 }
        ] as { key: TabKey; label: string; count: number }[]).map(tab => (
          <button
            key={tab.key}
            className={`procurement-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="tab-content">
          <div className="filter-bar">
            <select className="form-select filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="pending">待采购</option>
              <option value="purchased">已购买</option>
              <option value="stocked">已入库</option>
            </select>
            <select className="form-select filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">全部类型</option>
              {allItemTypes.map(t => <option key={t} value={t}>{ProcurementItemTypeLabels[t]}</option>)}
            </select>
          </div>
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <div className="empty-state-title">暂无采购项</div>
              <div className="empty-state-desc">点击"新增采购项"添加你想购买的素材</div>
            </div>
          ) : (
            <div className="procurement-list">
              {items.map(item => (
                <div key={item.id} className={`procurement-card status-${item.status}`}>
                  <div className="pc-header">
                    <div className="pc-title-row">
                      <span className={`pc-status-dot status-dot-${item.status}`} />
                      <span className="pc-name">{item.name}</span>
                      <span className="pc-type-badge" style={{ backgroundColor: getItemTypeColor(item.itemType) }}>
                        {ProcurementItemTypeLabels[item.itemType]}
                      </span>
                      <span className="pc-priority-badge" style={{ backgroundColor: PriorityColors[item.priority], color: item.priority === 'medium' ? '#333' : '#fff' }}>
                        {ProcurementPriorityLabels[item.priority]}
                      </span>
                    </div>
                  </div>
                  <div className="pc-body">
                    <div className="pc-info-grid">
                      <div className="pc-info-item">
                        <span className="pc-info-label">预算</span>
                        <span className="pc-info-value budget-value">¥{item.budget.toFixed(2)}</span>
                      </div>
                      {item.actualCost !== undefined && (
                        <div className="pc-info-item">
                          <span className="pc-info-label">实际花费</span>
                          <span className="pc-info-value">¥{item.actualCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pc-info-item">
                        <span className="pc-info-label">渠道</span>
                        <span className="pc-info-value">{item.channel || '-'}</span>
                      </div>
                      <div className="pc-info-item">
                        <span className="pc-info-label">目标色系</span>
                        <span className="pc-info-value">
                          <span className="color-swatch-sm" style={{ backgroundColor: ColorFamilyColors[item.targetColorFamily] }} />
                          {ColorFamilyLabels[item.targetColorFamily]}
                        </span>
                      </div>
                      <div className="pc-info-item">
                        <span className="pc-info-label">预计入库</span>
                        <span className="pc-info-value">{item.expectedStockDate || '-'}</span>
                      </div>
                      <div className="pc-info-item">
                        <span className="pc-info-label">状态</span>
                        <span className="pc-info-value" style={{ color: StatusColors[item.status] }}>
                          {ProcurementStatusLabels[item.status]}
                        </span>
                      </div>
                    </div>
                    {item.themes.length > 0 && (
                      <div className="pc-themes">
                        {item.themes.map(t => (
                          <span key={t} className="pc-theme-tag">{t}</span>
                        ))}
                      </div>
                    )}
                    {item.notes && <div className="pc-notes">{item.notes}</div>}
                  </div>
                  <div className="pc-actions">
                    {item.status === 'pending' && (
                      <button className="btn btn-sm btn-action" style={{ backgroundColor: StatusColors.purchased, color: '#333' }}
                        onClick={() => handleStatusChange(item.id, 'purchased')}>
                        ✅ 标记已购
                      </button>
                    )}
                    {item.status === 'purchased' && (
                      <>
                        <button className="btn btn-sm btn-action" style={{ backgroundColor: StatusColors.stocked, color: '#fff' }}
                          onClick={() => handleStatusChange(item.id, 'stocked')}>
                          📦 标记入库
                        </button>
                        <button className="btn btn-sm btn-primary"
                          onClick={() => handleConvertToDraft(item.id)}>
                          🔄 转为素材草稿
                        </button>
                      </>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditForm(item)}>✏️ 编辑</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'budget' && stats && (
        <div className="tab-content">
          <div className="budget-overview">
            <div className="budget-card budget-total">
              <div className="budget-card-icon">💰</div>
              <div className="budget-card-content">
                <div className="budget-card-value">¥{stats.totalBudget.toFixed(2)}</div>
                <div className="budget-card-label">总预算</div>
              </div>
            </div>
            <div className="budget-card budget-spent">
              <div className="budget-card-icon">💳</div>
              <div className="budget-card-content">
                <div className="budget-card-value">¥{stats.totalSpent.toFixed(2)}</div>
                <div className="budget-card-label">已花费</div>
              </div>
            </div>
            <div className="budget-card budget-remaining">
              <div className="budget-card-icon">📊</div>
              <div className="budget-card-content">
                <div className="budget-card-value">¥{stats.budgetRemaining.toFixed(2)}</div>
                <div className="budget-card-label">剩余预算</div>
              </div>
            </div>
          </div>

          <div className="budget-section card">
            <div className="section-header">
              <h3 className="section-title">📂 分类花费占比</h3>
            </div>
            {stats.categorySpending.length === 0 ? (
              <div className="empty-mini">暂无数据</div>
            ) : (
              <div className="category-spending">
                {stats.categorySpending.map(cat => {
                  const maxBudget = Math.max(...stats.categorySpending.map(c => c.budget), 1);
                  return (
                    <div key={cat.category} className="cat-spend-item">
                      <div className="cat-spend-header">
                        <span className="cat-spend-name">{ProcurementItemTypeLabels[cat.category as ProcurementItemType] || cat.category}</span>
                        <span className="cat-spend-stats">
                          ¥{cat.spent.toFixed(2)} / ¥{cat.budget.toFixed(2)} ({cat.count}项)
                        </span>
                      </div>
                      <div className="cat-spend-track">
                        <div className="cat-spend-fill budget-fill"
                          style={{ width: `${(cat.budget / maxBudget) * 100}%` }} />
                        <div className="cat-spend-fill spent-fill"
                          style={{ width: `${cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="budget-section card">
            <div className="section-header">
              <h3 className="section-title">📅 月度采购预算</h3>
            </div>
            {stats.monthlyBudget.length === 0 ? (
              <div className="empty-mini">暂无数据</div>
            ) : (
              <div className="monthly-budget-chart">
                {(() => {
                  const maxVal = Math.max(...stats.monthlyBudget.map(m => Math.max(m.budget, m.spent)), 1);
                  return stats.monthlyBudget.map(m => (
                    <div key={m.month} className="mb-chart-col">
                      <div className="mb-chart-wrap">
                        <div className="mb-bar-group">
                          <div className="mb-bar mb-bar-budget"
                            style={{ height: `${(m.budget / maxVal) * 100}%` }}
                            title={`预算: ¥${m.budget.toFixed(2)}`}>
                            <span className="mb-bar-value">¥{m.budget.toFixed(0)}</span>
                          </div>
                          <div className="mb-bar mb-bar-spent"
                            style={{ height: `${(m.spent / maxVal) * 100}%` }}
                            title={`花费: ¥${m.spent.toFixed(2)}`}>
                            <span className="mb-bar-value">¥{m.spent.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mb-label">{m.month.slice(5)}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
            <div className="budget-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#A855F7' }} />
                <span className="legend-label">预算</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#FF6B9D' }} />
                <span className="legend-label">实际花费</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending_stock' && (
        <div className="tab-content">
          {upcomingStock.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">暂无待入库提醒</div>
              <div className="empty-state-desc">已购买但尚未入库的素材将显示在这里</div>
            </div>
          ) : (
            <div className="pending-stock-list">
              {upcomingStock.map(item => {
                const daysUntil = Math.ceil((new Date(item.expectedStockDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                const isOverdue = daysUntil < 0;
                const isUrgent = daysUntil >= 0 && daysUntil <= 3;
                return (
                  <div key={item.id} className={`stock-reminder-card ${isOverdue ? 'overdue' : isUrgent ? 'urgent' : ''}`}>
                    <div className="stock-reminder-header">
                      <span className="stock-reminder-name">{item.name}</span>
                      {isOverdue ? (
                        <span className="stock-reminder-badge overdue-badge">⚠️ 已逾期 {Math.abs(daysUntil)} 天</span>
                      ) : isUrgent ? (
                        <span className="stock-reminder-badge urgent-badge">🔥 {daysUntil} 天后入库</span>
                      ) : (
                        <span className="stock-reminder-badge normal-badge">📅 {daysUntil} 天后入库</span>
                      )}
                    </div>
                    <div className="stock-reminder-info">
                      <span>{ProcurementItemTypeLabels[item.itemType]}</span>
                      <span>·</span>
                      <span>{ColorFamilyLabels[item.targetColorFamily]}</span>
                      <span>·</span>
                      <span>¥{item.budget.toFixed(2)}</span>
                    </div>
                    {item.status === 'purchased' && (
                      <div className="stock-reminder-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => handleConvertToDraft(item.id)}>
                          🔄 转为素材草稿
                        </button>
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => handleStatusChange(item.id, 'stocked')}>
                          📦 标记入库
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="tab-content">
          {stockedItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗄️</div>
              <div className="empty-state-title">暂无已购归档</div>
              <div className="empty-state-desc">已入库的采购项将归档在这里</div>
            </div>
          ) : (
            <div className="archive-list">
              {stockedItems.map(item => (
                <div key={item.id} className="archive-card">
                  <div className="archive-header">
                    <span className="archive-name">{item.name}</span>
                    <span className="archive-type-badge" style={{ backgroundColor: getItemTypeColor(item.itemType) }}>
                      {ProcurementItemTypeLabels[item.itemType]}
                    </span>
                    {item.convertedStickerId && (
                      <span className="archive-converted-badge">✅ 已转素材</span>
                    )}
                  </div>
                  <div className="archive-info">
                    <span>¥{(item.actualCost || item.budget).toFixed(2)}</span>
                    <span>·</span>
                    <span>{item.channel || '-'}</span>
                    <span>·</span>
                    <span>{ColorFamilyLabels[item.targetColorFamily]}</span>
                    <span>·</span>
                    <span>入库: {item.stockedAt ? new Date(item.stockedAt).toLocaleDateString() : '-'}</span>
                  </div>
                  {item.themes.length > 0 && (
                    <div className="pc-themes">
                      {item.themes.map(t => <span key={t} className="pc-theme-tag">{t}</span>)}
                    </div>
                  )}
                  {!item.convertedStickerId && (
                    <div className="archive-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleConvertToDraft(item.id)}>
                        🔄 转为素材草稿
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && gapAnalysis && (
        <div className="tab-content">
          <div className="stats-overview-grid">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FF6B9D, #FF9A76)', color: '#fff' }}>
              <div className="stat-icon">🛒</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalItems}</div>
                <div className="stat-label">采购项总数</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4D96FF, #6EC6FF)', color: '#fff' }}>
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingCount}</div>
                <div className="stat-label">待采购</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #FFD93D, #FF9A76)', color: '#333' }}>
              <div className="stat-icon">💳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.purchasedCount}</div>
                <div className="stat-label">已购买</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6BCB77, #4CAF50)', color: '#fff' }}>
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.stockedCount}</div>
                <div className="stat-label">已入库</div>
              </div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7, #6EC6FF)', color: '#fff' }}>
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-value">{stats.conversionRate}%</div>
                <div className="stat-label">采购转化率</div>
              </div>
            </div>
          </div>

          <div className="stats-detail-grid">
            <div className="stats-section card">
              <div className="section-header">
                <h3 className="section-title">⚠️ 过剩色系预警</h3>
                <span className="section-badge warning">{stats.overStockedColorFamilies.length} 类</span>
              </div>
              {stats.overStockedColorFamilies.length === 0 ? (
                <div className="empty-mini">暂无过剩色系</div>
              ) : (
                <div className="overstocked-list">
                  {stats.overStockedColorFamilies.map(item => (
                    <div key={item.family} className="overstocked-item">
                      <span className="color-swatch-sm" style={{ backgroundColor: ColorFamilyColors[item.family] }} />
                      <span className="overstocked-name">{ColorFamilyLabels[item.family]}</span>
                      <span className="overstocked-count">{item.count} 张</span>
                      <span className="overstocked-pct">{item.percentage}%</span>
                      <div className="overstocked-bar-bg">
                        <div className="overstocked-bar-fill" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-section card">
              <div className="section-header">
                <h3 className="section-title">📌 主题素材缺口</h3>
                <span className="section-badge">{stats.underStockedThemes.length} 个主题</span>
              </div>
              {stats.underStockedThemes.length === 0 ? (
                <div className="empty-mini">暂无缺口主题</div>
              ) : (
                <div className="gap-list">
                  {stats.underStockedThemes.map(item => (
                    <div key={item.theme} className="gap-item">
                      <span className="gap-name">{item.theme}</span>
                      <div className="gap-bar-bg">
                        <div className="gap-bar-fill" style={{ width: `${item.coverage}%` }} />
                      </div>
                      <span className="gap-pct">{item.coverage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-section card card-wide">
              <div className="section-header">
                <h3 className="section-title">📈 主题缺口变化趋势</h3>
              </div>
              {stats.themeGapChanges.length === 0 ? (
                <div className="empty-mini">暂无数据</div>
              ) : (
                <div className="theme-gap-chart">
                  {stats.themeGapChanges.map(item => {
                    const diff = item.previousGapScore - item.gapScore;
                    return (
                      <div key={item.theme} className="tgc-item">
                        <span className="tgc-name">{item.theme}</span>
                        <div className="tgc-bars">
                          <div className="tgc-bar-wrap">
                            <div className="tgc-bar tgc-bar-prev" style={{ width: `${item.previousGapScore}%` }}
                              title={`之前: ${item.previousGapScore}%`} />
                          </div>
                          <div className="tgc-bar-wrap">
                            <div className="tgc-bar tgc-bar-current" style={{ width: `${item.gapScore}%` }}
                              title={`当前: ${item.gapScore}%`} />
                          </div>
                        </div>
                        <span className={`tgc-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`}>
                          {diff > 0 ? `↓${diff}` : diff < 0 ? `↑${Math.abs(diff)}` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="budget-legend" style={{ marginTop: 12 }}>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#FF9A76' }} />
                  <span className="legend-label">上期缺口</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: '#FF6B9D' }} />
                  <span className="legend-label">当前缺口</span>
                </div>
              </div>
            </div>

            {gapAnalysis.suggestions.length > 0 && (
              <div className="stats-section card card-wide">
                <div className="section-header">
                  <h3 className="section-title">💡 智能采购建议</h3>
                </div>
                <div className="suggestions-list">
                  {gapAnalysis.suggestions.map((s, i) => (
                    <div key={i} className="suggestion-card">{s}</div>
                  ))}
                </div>
              </div>
            )}

            {gapAnalysis.underStockedColorFamilies && gapAnalysis.underStockedColorFamilies.length > 0 && (
              <div className="stats-section card">
                <div className="section-header">
                  <h3 className="section-title">🔵 不足色系</h3>
                  <span className="section-badge">{gapAnalysis.underStockedColorFamilies.length} 类</span>
                </div>
                <div className="understocked-list">
                  {gapAnalysis.underStockedColorFamilies.map(item => (
                    <div key={item.family} className="overstocked-item">
                      <span className="color-swatch-sm" style={{ backgroundColor: ColorFamilyColors[item.family] }} />
                      <span className="overstocked-name">{ColorFamilyLabels[item.family]}</span>
                      <span className="overstocked-count">{item.count} 张</span>
                      <span className="overstocked-pct">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content procurement-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? '编辑采购项' : '新增采购项'}</h3>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">物品名称 *</label>
                <input className="form-input" value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：樱花系列和纸胶带" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">物品类型 *</label>
                  <select className="form-select" value={formData.itemType}
                    onChange={e => setFormData(prev => ({ ...prev, itemType: e.target.value as ProcurementItemType }))}>
                    {allItemTypes.map(t => <option key={t} value={t}>{ProcurementItemTypeLabels[t]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">优先级</label>
                  <select className="form-select" value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as ProcurementPriority }))}>
                    {allPriorities.map(p => <option key={p} value={p}>{ProcurementPriorityLabels[p]}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">预算金额 (元) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={formData.budget}
                    onChange={e => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">购买渠道</label>
                  <input className="form-input" value={formData.channel}
                    onChange={e => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                    placeholder="如：淘宝、实体店" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">目标色系</label>
                  <select className="form-select" value={formData.targetColorFamily}
                    onChange={e => setFormData(prev => ({ ...prev, targetColorFamily: e.target.value as ColorFamily }))}>
                    {allColorFamilies.map(f => <option key={f} value={f}>{ColorFamilyLabels[f]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">预计入库日期</label>
                  <input className="form-input" type="date" value={formData.expectedStockDate}
                    onChange={e => setFormData(prev => ({ ...prev, expectedStockDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">关联主题</label>
                <div className="theme-selector">
                  {availableThemes.map(theme => (
                    <button key={theme}
                      className={`theme-chip ${formData.themes.includes(theme) ? 'selected' : ''}`}
                      onClick={() => toggleTheme(theme)}>
                      {theme}
                    </button>
                  ))}
                  {availableThemes.length === 0 && (
                    <span className="no-themes-hint">暂无主题，可先在素材库或计划页添加主题</span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea className="form-textarea" value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="记录购买链接、规格说明等" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={resetForm}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmit}
                disabled={!formData.name.trim()}>
                {editingItem ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getItemTypeColor(type: ProcurementItemType): string {
  const colors: Record<ProcurementItemType, string> = {
    sticker: '#FF6B9D',
    tape: '#FF9A76',
    stamp: '#A855F7',
    memo: '#4D96FF',
    other: '#9CA3AF'
  };
  return colors[type] || '#999';
}
