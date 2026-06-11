import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { planApi, stickerApi, tagApi } from '../api/client';
import type { Plan, PlanStatus, ColorFamily, Sticker, Tag } from '../types';
import { ColorFamilyLabels } from '../types';
import './Calendar.css';

type ViewMode = 'month' | 'week';

const STATUS_FILTERS: { value: '' | PlanStatus; label: string; color: string; icon: string }[] = [
  { value: '', label: '全部', color: '#888', icon: '📋' },
  { value: 'pending', label: '待开始', color: '#FFA500', icon: '⏳' },
  { value: 'in_progress', label: '进行中', color: '#4D96FF', icon: '🔄' },
  { value: 'completed', label: '已完成', color: '#6BCB77', icon: '✅' },
  { value: 'overdue', label: '已逾期', color: '#FF6B6B', icon: '⚠️' }
];

const COLOR_FAMILY_OPTIONS: { value: '' | ColorFamily; label: string; color: string }[] = [
  { value: '', label: '全部', color: '#ccc' },
  { value: 'red', label: '红色系', color: '#e74c3c' },
  { value: 'orange', label: '橙色系', color: '#e67e22' },
  { value: 'yellow', label: '黄色系', color: '#f1c40f' },
  { value: 'green', label: '绿色系', color: '#2ecc71' },
  { value: 'cyan', label: '青色系', color: '#1abc9c' },
  { value: 'blue', label: '蓝色系', color: '#3498db' },
  { value: 'purple', label: '紫色系', color: '#9b59b6' },
  { value: 'pink', label: '粉色系', color: '#ff6b9d' },
  { value: 'brown', label: '棕色系', color: '#8b4513' },
  { value: 'gray', label: '灰色系', color: '#7f8c8d' },
  { value: 'monochrome', label: '黑白系', color: '#2c3e50' }
];

const DURATION_OPTIONS = [15, 30, 60, 90, 120];

export default function Calendar() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<'' | PlanStatus>('');
  const [themeFilter, setThemeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState<'' | ColorFamily>('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Sticker[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    themes: [] as string[],
    colorFamilies: [] as ColorFamily[],
    plannedStickerIds: [] as string[],
    referenceTagIds: [] as string[],
    estimatedDuration: 30
  });
  
  const [draggingPlan, setDraggingPlan] = useState<Plan | null>(null);
  const dragOverCell = useRef<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentDate, statusFilter, themeFilter, colorFilter]);

  useEffect(() => {
    planApi.getAvailableThemes().then(setAvailableThemes).catch(() => {});
    stickerApi.getAll().then(setStickers).catch(() => {});
    tagApi.getAll().then(setTags).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const start = getRangeStart();
      const end = getRangeEnd();
      const params: Record<string, string> = {
        startDate: start,
        endDate: end
      };
      if (statusFilter) params.status = statusFilter;
      if (themeFilter) params.theme = themeFilter;
      if (colorFilter) params.colorFamily = colorFilter;
      
      const data = await planApi.getAll(params);
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }

  function getRangeStart(): string {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setDate(1);
    } else {
      date.setDate(date.getDate() - date.getDay());
    }
    return date.toISOString().split('T')[0];
  }

  function getRangeEnd(): string {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
    } else {
      date.setDate(date.getDate() - date.getDay() + 6);
    }
    return date.toISOString().split('T')[0];
  }

  function getMonthDays(): Date[] {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    const startOffset = firstDay.getDay();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }

  function getWeekDays(): Date[] {
    const days: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  function getPlansForDate(dateStr: string): Plan[] {
    return plans.filter(p => p.date === dateStr);
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentDate.getMonth();
  }

  function openCreateModal(date: string) {
    setEditingPlan(null);
    setSelectedDate(date);
    setFormData({
      title: '',
      description: '',
      date,
      themes: [],
      colorFamilies: [],
      plannedStickerIds: [],
      referenceTagIds: [],
      estimatedDuration: 30
    });
    setRecommendations([]);
    setShowModal(true);
  }

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setSelectedDate(plan.date);
    setFormData({
      title: plan.title,
      description: plan.description,
      date: plan.date,
      themes: [...plan.themes],
      colorFamilies: [...plan.colorFamilies],
      plannedStickerIds: [...plan.plannedStickerIds],
      referenceTagIds: [...plan.referenceTagIds],
      estimatedDuration: plan.estimatedDuration
    });
    loadRecommendations(plan.id);
    setShowModal(true);
  }

  async function loadRecommendations(planId: string) {
    setLoadingRecommendations(true);
    try {
      const recs = await planApi.getRecommendations(planId);
      setRecommendations(recs);
    } finally {
      setLoadingRecommendations(false);
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

  function toggleColorFamily(cf: ColorFamily) {
    setFormData(prev => ({
      ...prev,
      colorFamilies: prev.colorFamilies.includes(cf)
        ? prev.colorFamilies.filter(c => c !== cf)
        : [...prev.colorFamilies, cf]
    }));
  }

  function toggleSticker(stickerId: string) {
    setFormData(prev => ({
      ...prev,
      plannedStickerIds: prev.plannedStickerIds.includes(stickerId)
        ? prev.plannedStickerIds.filter(id => id !== stickerId)
        : [...prev.plannedStickerIds, stickerId]
    }));
  }

  function toggleTag(tagId: string) {
    setFormData(prev => ({
      ...prev,
      referenceTagIds: prev.referenceTagIds.includes(tagId)
        ? prev.referenceTagIds.filter(id => id !== tagId)
        : [...prev.referenceTagIds, tagId]
    }));
  }

  function addRecommendedSticker(sticker: Sticker) {
    if (!formData.plannedStickerIds.includes(sticker.id)) {
      setFormData(prev => ({
        ...prev,
        plannedStickerIds: [...prev.plannedStickerIds, sticker.id]
      }));
    }
  }

  async function handleSubmit() {
    if (!formData.title.trim()) {
      alert('请输入计划标题');
      return;
    }
    try {
      if (editingPlan) {
        await planApi.update(editingPlan.id, formData);
      } else {
        await planApi.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert('保存失败: ' + (err as Error).message);
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm('确定删除此计划吗？')) return;
    try {
      await planApi.delete(planId);
      loadData();
    } catch (err) {
      alert('删除失败: ' + (err as Error).message);
    }
  }

  function navigateToCollage(plan: Plan) {
    if (plan.collageId) {
      navigate(`/collage/${plan.collageId}`);
    } else {
      navigate('/collage');
    }
  }

  function prevPeriod() {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  }

  function nextPeriod() {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleDragStart(e: React.DragEvent, plan: Plan) {
    setDraggingPlan(plan);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', plan.id);
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverCell.current = dateStr;
  }

  function handleDragLeave() {
    dragOverCell.current = null;
  }

  async function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    if (!draggingPlan) return;
    
    try {
      await planApi.update(draggingPlan.id, { date: dateStr });
      loadData();
    } catch (err) {
      alert('移动失败: ' + (err as Error).message);
    } finally {
      setDraggingPlan(null);
      dragOverCell.current = null;
    }
  }

  function getStatusStyle(status: PlanStatus): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      case 'overdue': return 'status-overdue';
    }
  }

  function getStatusIcon(status: PlanStatus): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      case 'overdue': return '⚠️';
    }
  }

  const formatPeriod = () => {
    if (viewMode === 'month') {
      return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
    } else {
      const days = getWeekDays();
      return `${days[0].getMonth() + 1}月${days[0].getDate()}日 - ${days[6].getMonth() + 1}月${days[6].getDate()}日`;
    }
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const allThemes = availableThemes.length > 0 ? availableThemes : ['旅行', '生活', '节日', '生日', '学习', '工作', '美食', '运动'];
  const plannedStickers = stickers.filter(s => formData.plannedStickerIds.includes(s.id));

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">📅 创作日历</h2>
          <p className="page-subtitle">规划你的手账创作灵感，追踪创作进度</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={goToToday}>📌 今天</button>
          <button className="btn btn-primary" onClick={() => openCreateModal(new Date().toISOString().split('T')[0])}>
            ➕ 新建计划
          </button>
        </div>
      </div>

      <div className="calendar-toolbar">
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            📆 月视图
          </button>
          <button 
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            📋 周视图
          </button>
        </div>

        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevPeriod}>◀</button>
          <span className="current-period">{formatPeriod()}</span>
          <button className="nav-btn" onClick={nextPeriod}>▶</button>
        </div>

        <div className="filter-group">
          <label>状态:</label>
          <div className="status-filters">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                className={`status-filter-btn ${statusFilter === f.value ? 'active' : ''}`}
                style={{ borderColor: statusFilter === f.value ? f.color : 'transparent' }}
                onClick={() => setStatusFilter(f.value)}
                title={f.label}
              >
                <span>{f.icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>主题:</label>
          <select 
            className="filter-select"
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
          >
            <option value="">全部主题</option>
            {allThemes.map(theme => (
              <option key={theme} value={theme}>{theme}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>色系:</label>
          <div className="color-family-row">
            {COLOR_FAMILY_OPTIONS.map(c => (
              <button
                key={c.value}
                className={`color-family-btn ${colorFilter === c.value ? 'active' : ''}`}
                style={{ backgroundColor: c.color }}
                title={c.label}
                onClick={() => setColorFilter(c.value)}
              />
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="calendar-loading">
          <div className="empty-icon">⏳</div>
          <p>加载中...</p>
        </div>
      ) : (
        <div className="calendar-container">
          {viewMode === 'month' ? (
            <div className="month-view">
              <div className="weekday-header">
                {weekDays.map(day => (
                  <div key={day} className="weekday-cell">{day}</div>
                ))}
              </div>
              <div className="month-grid">
                {getMonthDays().map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayPlans = getPlansForDate(dateStr);
                  const isOver = dragOverCell.current === dateStr;
                  
                  return (
                    <div
                      key={idx}
                      className={`day-cell ${!isCurrentMonth(date) ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isOver ? 'drag-over' : ''}`}
                      onDragOver={e => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, dateStr)}
                      onDoubleClick={() => openCreateModal(dateStr)}
                    >
                      <div className="day-header">
                        <span className={`day-number ${isToday(date) ? 'today-badge' : ''}`}>
                          {date.getDate()}
                        </span>
                        {dayPlans.some(p => p.status === 'overdue') && (
                          <span className="overdue-indicator" title="有逾期计划">⚠️</span>
                        )}
                      </div>
                      <div className="day-plans">
                        {dayPlans.slice(0, 3).map(plan => (
                          <div
                            key={plan.id}
                            className={`plan-item ${getStatusStyle(plan.status)} ${draggingPlan?.id === plan.id ? 'dragging' : ''}`}
                            draggable
                            onDragStart={e => handleDragStart(e, plan)}
                            onClick={e => { e.stopPropagation(); openEditModal(plan); }}
                            title={`${plan.title} - ${STATUS_FILTERS.find(s => s.value === plan.status)?.label}`}
                          >
                            <span className="plan-status-icon">{getStatusIcon(plan.status)}</span>
                            <span className="plan-title">{plan.title}</span>
                          </div>
                        ))}
                        {dayPlans.length > 3 && (
                          <div className="more-plans" onClick={() => openCreateModal(dateStr)}>
                            +{dayPlans.length - 3} 更多
                          </div>
                        )}
                      </div>
                      <button className="add-plan-btn" onClick={(e) => { e.stopPropagation(); openCreateModal(dateStr); }}>
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="week-view">
              <div className="week-header">
                <div className="time-label-column">
                  <span className="time-label">时间</span>
                </div>
                {getWeekDays().map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isOver = dragOverCell.current === dateStr;
                  return (
                    <div
                      key={idx}
                      className={`week-day-header ${isToday(date) ? 'today' : ''} ${isOver ? 'drag-over' : ''}`}
                      onDragOver={e => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, dateStr)}
                    >
                      <div className="weekday-name">{weekDays[idx]}</div>
                      <div className={`weekday-date ${isToday(date) ? 'today-badge' : ''}`}>
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                      <button className="add-plan-btn-sm" onClick={() => openCreateModal(dateStr)}>+</button>
                    </div>
                  );
                })}
              </div>
              <div className="week-body">
                <div className="time-column">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="time-slot">
                      <span>{String(i).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>
                {getWeekDays().map((date, dayIdx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayPlans = getPlansForDate(dateStr);
                  const isOver = dragOverCell.current === dateStr;
                  
                  return (
                    <div
                      key={dayIdx}
                      className={`day-column ${isToday(date) ? 'today' : ''} ${isOver ? 'drag-over' : ''}`}
                      onDragOver={e => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, dateStr)}
                      onDoubleClick={() => openCreateModal(dateStr)}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="grid-slot" />
                      ))}
                      <div className="day-plans-overlay">
                        {dayPlans.map((plan, idx) => (
                          <div
                            key={plan.id}
                            className={`plan-card ${getStatusStyle(plan.status)} ${draggingPlan?.id === plan.id ? 'dragging' : ''}`}
                            style={{ top: `${idx * 60}px`, height: '56px' }}
                            draggable
                            onDragStart={e => handleDragStart(e, plan)}
                            onClick={e => { e.stopPropagation(); openEditModal(plan); }}
                          >
                            <div className="plan-card-header">
                              <span className="plan-status-icon">{getStatusIcon(plan.status)}</span>
                              <span className="plan-card-title">{plan.title}</span>
                            </div>
                            <div className="plan-card-meta">
                              <span>⏱️ {plan.estimatedDuration}分钟</span>
                              {plan.collageId ? (
                                <button 
                                  className="link-btn"
                                  onClick={e => { e.stopPropagation(); navigateToCollage(plan); }}
                                >
                                  ✏️ 继续创作
                                </button>
                              ) : (
                                <button 
                                  className="link-btn"
                                  onClick={e => { e.stopPropagation(); navigateToCollage(plan); }}
                                >
                                  🎨 开始创作
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content modal-xl">
            <div className="modal-header">
              <h3 className="modal-title">{editingPlan ? '✏️ 编辑计划' : '➕ 新建创作计划'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">计划标题 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="给这个创作计划起个名字"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ width: '180px' }}>
                  <label className="form-label">计划日期 *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ width: '150px' }}>
                  <label className="form-label">预计时长</label>
                  <select
                    className="form-input"
                    value={formData.estimatedDuration}
                    onChange={e => setFormData(p => ({ ...p, estimatedDuration: Number(e.target.value) }))}
                  >
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d} 分钟</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">计划描述</label>
                <textarea
                  className="form-textarea"
                  placeholder="记录创作灵感或具体要求..."
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">适用主题</label>
                <div className="tag-selector">
                  {allThemes.map(theme => (
                    <span
                      key={theme}
                      className={`tag-select ${formData.themes.includes(theme) ? 'active' : ''}`}
                      onClick={() => toggleTheme(theme)}
                    >
                      🏷️ {theme}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">目标色系</label>
                <div className="color-family-row">
                  {COLOR_FAMILY_OPTIONS.filter(c => c.value !== '').map(c => (
                    <button
                      key={c.value}
                      className={`color-family-btn large ${formData.colorFamilies.includes(c.value as ColorFamily) ? 'active' : ''}`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                      onClick={() => toggleColorFamily(c.value as ColorFamily)}
                    >
                      {formData.colorFamilies.includes(c.value as ColorFamily) ? '✓' : ''}
                    </button>
                  ))}
                </div>
                {formData.colorFamilies.length > 0 && (
                  <div className="selected-colors">
                    已选: {formData.colorFamilies.map(cf => ColorFamilyLabels[cf]).join('、')}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">参考标签</label>
                <div className="tag-selector">
                  {tags.map(tag => (
                    <span
                      key={tag.id}
                      className={`tag-select ${formData.referenceTagIds.includes(tag.id) ? 'active' : ''}`}
                      style={{
                        borderColor: tag.color,
                        color: formData.referenceTagIds.includes(tag.id) ? '#fff' : tag.color,
                        backgroundColor: formData.referenceTagIds.includes(tag.id) ? tag.color : 'transparent'
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  待使用素材 ({formData.plannedStickerIds.length} 个)
                </label>
                {plannedStickers.length > 0 && (
                  <div className="selected-stickers">
                    {plannedStickers.map(s => (
                      <div key={s.id} className="selected-sticker">
                        {s.imageData ? <img src={s.imageData} alt={s.name} /> : <span>🖼️</span>}
                        <button className="remove-sticker" onClick={() => toggleSticker(s.id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="sticker-picker">
                  <div className="sticker-picker-header">
                    <span>从素材库选择</span>
                  </div>
                  <div className="sticker-grid-small">
                    {stickers.slice(0, 20).map(s => (
                      <div
                        key={s.id}
                        className={`mini-sticker ${formData.plannedStickerIds.includes(s.id) ? 'selected' : ''}`}
                        onClick={() => toggleSticker(s.id)}
                        title={s.name}
                      >
                        {s.imageData ? <img src={s.imageData} alt={s.name} /> : <span>🖼️</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {editingPlan && (
                <div className="form-group">
                  <div className="section-header">
                    <label className="form-label">💡 智能推荐 - 长期未用且符合主题/色系的素材</label>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => loadRecommendations(editingPlan.id)}
                      disabled={loadingRecommendations}
                    >
                      🔄 刷新推荐
                    </button>
                  </div>
                  {loadingRecommendations ? (
                    <div className="empty-mini">加载推荐中...</div>
                  ) : recommendations.length === 0 ? (
                    <div className="empty-mini">暂无符合条件的推荐素材</div>
                  ) : (
                    <div className="recommendation-grid">
                      {recommendations.map(s => (
                        <div
                          key={s.id}
                          className={`recommendation-card ${formData.plannedStickerIds.includes(s.id) ? 'added' : ''}`}
                          onClick={() => addRecommendedSticker(s)}
                        >
                          <div className="rec-sticker-img">
                            {s.imageData ? <img src={s.imageData} alt={s.name} /> : <span>🖼️</span>}
                          </div>
                          <div className="rec-sticker-info">
                            <div className="rec-name">{s.name}</div>
                            <div className="rec-meta">
                              <span className="rec-theme">{s.themes[0] || '通用'}</span>
                              <span className="rec-date">
                                {s.usageCount === 0 ? '🆕 从未使用' : `⌛ ${Math.floor((Date.now() - new Date(s.lastUsedAt || s.createdAt).getTime()) / (24 * 60 * 60 * 1000))}天未用`}
                              </span>
                            </div>
                          </div>
                          <div className="rec-add-btn">
                            {formData.plannedStickerIds.includes(s.id) ? '✓ 已添加' : '＋ 添加'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingPlan && (
                <div className="form-group">
                  <label className="form-label">当前状态</label>
                  <div className="status-buttons">
                    {STATUS_FILTERS.filter(f => f.value !== '').map(f => (
                      <button
                        key={f.value}
                        className={`status-btn ${editingPlan.status === f.value ? 'active' : ''}`}
                        style={{
                          backgroundColor: editingPlan.status === f.value ? f.color : 'transparent',
                          borderColor: f.color,
                          color: editingPlan.status === f.value ? '#fff' : f.color
                        }}
                        onClick={() => planApi.update(editingPlan.id, { status: f.value as PlanStatus }).then(() => loadData())}
                      >
                        {f.icon} {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {editingPlan && (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDelete(editingPlan.id).then(() => setShowModal(false))}
                >
                  🗑️ 删除计划
                </button>
              )}
              <div className="flex-spacer" />
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editingPlan ? '保存修改' : '创建计划'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
