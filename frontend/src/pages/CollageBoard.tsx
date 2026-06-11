import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stickerApi, collageApi, statisticsApi, tagApi, templateApi, planApi } from '../api/client';
import type {
  Sticker,
  Collage,
  CollageElement,
  ColorHarmonyResult,
  StickerCategory,
  Tag,
  CollageTemplate,
  TemplateApplyMode,
  TemplateApplyResult,
  ReplacementInfo,
  ColorFamily,
  Plan
} from '../types';
import { CategoryLabels, HarmonyTypeLabels, ColorFamilyLabels } from '../types';
import './CollageBoard.css';

const CANVAS_PRESETS = [
  { name: 'A5手账', width: 600, height: 840 },
  { name: '方型', width: 700, height: 700 },
  { name: '长方型', width: 800, height: 500 },
  { name: '自定义', width: 800, height: 1100 }
];

const BG_COLORS = ['#FFFFFF', '#FFF9F0', '#F0FFF4', '#F0F7FF', '#FFF0F5', '#FFF8DC', '#F5F0FF', '#FFF5E6'];

const CATEGORY_FILTERS: { value: '' | StickerCategory; label: string; icon: string }[] = [
  { value: '', label: '全部', icon: '📦' },
  { value: 'character', label: '人物', icon: '👤' },
  { value: 'text', label: '文字', icon: '🔤' },
  { value: 'decoration', label: '装饰', icon: '✨' },
  { value: 'tape', label: '胶带', icon: '🎀' }
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

type LeftTab = 'stickers' | 'templates';
type RightTab = 'properties' | 'replacements';

export default function CollageBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [category, setCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [harmonyResult, setHarmonyResult] = useState<ColorHarmonyResult | null>(null);

  const [elements, setElements] = useState<CollageElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(840);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [saveForm, setSaveForm] = useState({ title: '', description: '', collageTags: [] as string[], planId: '' as string });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [panelDragging, setPanelDragging] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elem: CollageElement | null } | null>(null);
  const nextZIndex = useRef(10);

  const [leftTab, setLeftTab] = useState<LeftTab>('stickers');
  const [rightTab, setRightTab] = useState<RightTab>('properties');

  const [templates, setTemplates] = useState<CollageTemplate[]>([]);
  const [templateThemes, setTemplateThemes] = useState<string[]>([]);
  const [templateSizes, setTemplateSizes] = useState<{ width: number; height: number; label: string }[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateThemeFilter, setTemplateThemeFilter] = useState('');
  const [templateTagFilter, setTemplateTagFilter] = useState('');
  const [templateColorFilter, setTemplateColorFilter] = useState<ColorFamily | ''>('');
  const [templateSizeFilter, setTemplateSizeFilter] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateForm, setSaveTemplateForm] = useState({
    name: '',
    description: '',
    themes: [] as string[]
  });

  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState<CollageTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<TemplateApplyMode>('auto_replace');
  const [applyingTemplateLoading, setApplyingTemplateLoading] = useState(false);

  const [appliedTemplateId, setAppliedTemplateId] = useState<string | undefined>(undefined);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | undefined>(undefined);
  const [replacements, setReplacements] = useState<ReplacementInfo[]>([]);

  useEffect(() => {
    stickerApi.getAll().then(setStickers).catch(() => {});
    tagApi.getAll().then(setTags).catch(() => {});
    templateApi.getThemes().then(setTemplateThemes).catch(() => {});
    templateApi.getSizes().then(setTemplateSizes).catch(() => {});
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoadingPlans(true);
    try {
      const allPlans = await planApi.getAll();
      setPlans(allPlans.filter(p => p.status === 'pending' || p.status === 'in_progress'));
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }

  useEffect(() => {
    if (leftTab === 'templates') {
      loadTemplates();
    }
  }, [leftTab, templateSearch, templateThemeFilter, templateTagFilter, templateColorFilter, templateSizeFilter]);

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const params: Record<string, string | number> = {};
      if (templateSearch) params.search = templateSearch;
      if (templateThemeFilter) params.theme = templateThemeFilter;
      if (templateTagFilter) params.tag = templateTagFilter;
      if (templateColorFilter) params.colorFamily = templateColorFilter;
      if (templateSizeFilter) {
        const [w, h] = templateSizeFilter.split('x').map(Number);
        if (w && h) {
          params.canvasWidth = w;
          params.canvasHeight = h;
        }
      }
      const data = await templateApi.getAll(params);
      setTemplates(data);
    } finally {
      setLoadingTemplates(false);
    }
  }

  useEffect(() => {
    if (id) {
      collageApi.getById(id).then(collage => {
        setElements(collage.elements);
        setCanvasWidth(collage.canvasWidth);
        setCanvasHeight(collage.canvasHeight);
        setBackgroundColor(collage.backgroundColor);
        setSaveForm({ title: collage.title, description: collage.description, collageTags: collage.tags, planId: '' });
        setAppliedTemplateId(collage.templateId);
        setAppliedTemplateName(collage.templateName);
        if (collage.elements.length > 0) {
          nextZIndex.current = Math.max(...collage.elements.map(e => e.zIndex)) + 1;
        }
      }).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    updateColorSuggestions();
  }, [elements]);

  async function updateColorSuggestions() {
    if (elements.length === 0) {
      setHarmonyResult(null);
      return;
    }
    try {
      const stickerId = elements[elements.length - 1].stickerId;
      const sticker = stickers.find(s => s.id === stickerId);
      if (sticker) {
        const result = await statisticsApi.getColorHarmony(sticker.primaryColors[0]);
        setHarmonyResult(result);
      }
    } catch {}
  }

  const filteredStickers = stickers.filter(s => {
    if (category && s.category !== category) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  function addStickerToCanvas(sticker: Sticker, posX?: number, posY?: number) {
    const scale = 0.6;
    const baseW = Math.min(160, sticker.width || 160);
    const baseH = Math.min(160, sticker.height || 160);
    const w = baseW * scale;
    const h = baseH * scale;
    let x: number, y: number;
    if (posX !== undefined && posY !== undefined) {
      x = Math.max(0, Math.min(canvasWidth - w, posX - w / 2));
      y = Math.max(0, Math.min(canvasHeight - h, posY - h / 2));
    } else {
      x = (canvasWidth - w) / 2 + (Math.random() - 0.5) * 50;
      y = (canvasHeight - h) / 2 + (Math.random() - 0.5) * 50;
    }
    const newElement: CollageElement = {
      id: 'elem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      stickerId: sticker.id,
      x,
      y,
      width: w,
      height: h,
      rotation: (Math.random() - 0.5) * 10,
      zIndex: nextZIndex.current++
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
  }

  function handlePanelDragStart(e: React.DragEvent, stickerId: string) {
    setPanelDragging(stickerId);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/sticker-id', stickerId);
  }

  function handlePanelDragEnd() {
    setPanelDragging(null);
  }

  function handleCanvasDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    const stickerId = e.dataTransfer.getData('text/sticker-id');
    if (!stickerId || !canvasRef.current) return;

    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const posX = (e.clientX - rect.left) * scaleX;
    const posY = (e.clientY - rect.top) * scaleY;

    addStickerToCanvas(sticker, posX, posY);
    setPanelDragging(null);
  }

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, elem: CollageElement) => {
    e.stopPropagation();
    setSelectedId(elem.id);
    setElements(prev => prev.map(el =>
      el.id === elem.id ? { ...el, zIndex: nextZIndex.current++ } : el
    ));
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elem
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current?.elem) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setElements(prev => prev.map(el =>
        el.id === dragStartRef.current!.elem!.id
          ? { ...el, x: Math.max(0, Math.min(canvasWidth - el.width, el.x + dx)), y: Math.max(0, Math.min(canvasHeight - el.height, el.y + dy)) }
          : el
      ));
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        elem: dragStartRef.current.elem
      };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, canvasWidth, canvasHeight]);

  function removeElement(id: string) {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function rotateElement(id: string, delta: number) {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, rotation: el.rotation + delta } : el
    ));
  }

  function scaleElement(id: string, delta: number) {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      const newW = Math.max(40, Math.min(canvasWidth, el.width * (1 + delta)));
      const newH = Math.max(40, Math.min(canvasHeight, el.height * (1 + delta)));
      return { ...el, width: newW, height: newH };
    }));
  }

  function bringForward(id: string) {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, zIndex: nextZIndex.current++ } : el
    ));
  }

  function sendBackward(id: string) {
    const current = elements.find(e => e.id === id);
    if (!current) return;
    const minZ = Math.min(...elements.map(e => e.zIndex));
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, zIndex: minZ - 1 } : el
    ));
  }

  function clearCanvas() {
    if (elements.length === 0) return;
    if (!confirm('确定清空画布吗？')) return;
    setElements([]);
    setSelectedId(null);
    setAppliedTemplateId(undefined);
    setAppliedTemplateName(undefined);
    setReplacements([]);
  }

  function openSave() {
    if (elements.length === 0) {
      alert('画布为空，先添加一些素材吧！');
      return;
    }
    setShowSaveModal(true);
  }

  async function handleSave() {
    if (!saveForm.title.trim()) {
      alert('请输入作品标题');
      return;
    }
    try {
      const data: Partial<Collage> & { planId?: string } = {
        ...saveForm,
        tags: saveForm.collageTags,
        elements,
        backgroundColor,
        canvasWidth,
        canvasHeight
      };
      if (appliedTemplateId) {
        data.templateId = appliedTemplateId;
      }
      if (appliedTemplateName) {
        data.templateName = appliedTemplateName;
      }
      if (saveForm.planId) {
        data.planId = saveForm.planId;
      }
      if (id) {
        await collageApi.update(id, data);
      } else {
        await collageApi.create(data);
      }
      alert('保存成功！' + (saveForm.planId ? ' 已绑定到创作计划' : ''));
      setShowSaveModal(false);
      navigate('/archive');
    } catch (err) {
      alert('保存失败: ' + (err as Error).message);
    }
  }

  function openSaveTemplate() {
    if (elements.length === 0) {
      alert('画布为空，无法保存为模板！');
      return;
    }
    setSaveTemplateForm({ name: '', description: '', themes: [] });
    setShowSaveTemplateModal(true);
  }

  async function handleSaveTemplate() {
    if (!saveTemplateForm.name.trim()) {
      alert('请输入模板名称');
      return;
    }
    try {
      const baseData = {
        name: saveTemplateForm.name,
        description: saveTemplateForm.description,
        themes: saveTemplateForm.themes
      };
      let createData;
      if (id) {
        createData = { ...baseData, collageId: id };
      } else {
        createData = {
          ...baseData,
          elements,
          backgroundColor,
          canvasWidth,
          canvasHeight,
          tags: saveForm.collageTags
        };
      }
      await templateApi.create(createData);
      alert('模板保存成功！');
      setShowSaveTemplateModal(false);
      if (leftTab === 'templates') {
        loadTemplates();
      }
    } catch (err) {
      alert('保存模板失败: ' + (err as Error).message);
    }
  }

  function toggleTemplateTheme(theme: string) {
    setSaveTemplateForm(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  }

  function openApplyTemplate(template: CollageTemplate) {
    setApplyingTemplate(template);
    setApplyMode('auto_replace');
    setShowApplyTemplateModal(true);
  }

  async function handleApplyTemplate() {
    if (!applyingTemplate) return;
    setApplyingTemplateLoading(true);
    try {
      const result: TemplateApplyResult = await templateApi.apply(applyingTemplate.id, applyMode);
      setElements(result.elements);
      setCanvasWidth(result.canvasWidth);
      setCanvasHeight(result.canvasHeight);
      setBackgroundColor(result.backgroundColor);
      setAppliedTemplateId(result.templateId);
      setAppliedTemplateName(result.templateName);
      setReplacements(result.replacements || []);
      if (result.elements.length > 0) {
        nextZIndex.current = Math.max(...result.elements.map(e => e.zIndex)) + 1;
      }
      if (result.replacements && result.replacements.length > 0) {
        setRightTab('replacements');
      }
      setShowApplyTemplateModal(false);
      setApplyingTemplate(null);
    } catch (err) {
      alert('套用模板失败: ' + (err as Error).message);
    } finally {
      setApplyingTemplateLoading(false);
    }
  }

  function toggleCollageTag(tagId: string) {
    setSaveForm(prev => ({
      ...prev,
      collageTags: prev.collageTags.includes(tagId)
        ? prev.collageTags.filter(id => id !== tagId)
        : [...prev.collageTags, tagId]
    }));
  }

  const selectedElement = elements.find(e => e.id === selectedId);
  const selectedSticker = selectedElement ? stickers.find(s => s.id === selectedElement.stickerId) : null;

  function getTagName(tagId: string): string {
    return tags.find(t => t.id === tagId)?.name || tagId;
  }

  function getStickerById(stickerId: string): Sticker | undefined {
    return stickers.find(s => s.id === stickerId);
  }

  function renderTemplatePreview(template: CollageTemplate) {
    const scale = 120 / Math.max(template.canvasWidth, template.canvasHeight);
    const w = template.canvasWidth * scale;
    const h = template.canvasHeight * scale;
    return (
      <div className="template-preview" style={{ width: w, height: h, backgroundColor: template.backgroundColor }}>
        {template.elements.map((elem, idx) => {
          const elemW = elem.width * scale;
          const elemH = elem.height * scale;
          const elemX = elem.x * scale;
          const elemY = elem.y * scale;
          const colorFamily = elem.originalStickerColorFamily;
          const colorOpt = COLOR_FAMILY_OPTIONS.find(c => c.value === colorFamily);
          const bgColor = colorOpt?.color || '#ddd';
          return (
            <div
              key={idx}
              className="template-elem-placeholder"
              style={{
                left: elemX,
                top: elemY,
                width: elemW,
                height: elemH,
                transform: `rotate(${elem.rotation}deg)`,
                backgroundColor: bgColor,
                zIndex: elem.zIndex
              }}
            />
          );
        })}
      </div>
    );
  }

  const APPLY_MODES: { value: TemplateApplyMode; label: string; desc: string; recommended?: boolean }[] = [
    { value: 'keep_materials', label: '保留原素材', desc: '使用模板原有的素材，保持完整效果' },
    { value: 'placeholders_only', label: '仅保留布局占位', desc: '只保留布局位置，素材位置留空供自行填充' },
    { value: 'auto_replace', label: '自动替换相近色系素材', desc: '智能匹配色彩和谐、长期未用的素材', recommended: true }
  ];

  return (
    <div className="collage-board">
      <div className="page-header">
        <div>
          <h2 className="page-title">✂️ 虚拟拼贴台</h2>
          <p className="page-subtitle">拖拽素材到画布上，创造你的专属手账页面</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={clearCanvas}>🗑️ 清空</button>
          <button className="btn btn-secondary" onClick={openSaveTemplate}>💾 存为模板</button>
          <button className="btn btn-primary btn-lg" onClick={openSave}>💾 保存作品</button>
        </div>
      </div>

      <div className="workspace">
        <div className="sticker-panel">
          <div className="panel-tabs">
            <button className={`panel-tab ${leftTab === 'stickers' ? 'active' : ''}`} onClick={() => setLeftTab('stickers')}>
              📦 素材
            </button>
            <button className={`panel-tab ${leftTab === 'templates' ? 'active' : ''}`} onClick={() => setLeftTab('templates')}>
              📋 模板
            </button>
          </div>

          {leftTab === 'stickers' && (
            <>
              <div className="panel-header">
                <h3>素材面板</h3>
                <div className="search-wrap">
                  <input type="text" placeholder="搜索素材..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="category-tabs">
                {CATEGORY_FILTERS.map(c => (
                  <button key={c.value}
                    className={`cat-tab ${category === c.value ? 'active' : ''}`}
                    onClick={() => setCategory(c.value)}>
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="sticker-list">
                {filteredStickers.length === 0 ? (
                  <div className="empty-hint">
                    <div className="empty-icon">📭</div>
                    <p>暂无素材</p>
                    <p className="empty-sub">去素材库导入吧</p>
                  </div>
                ) : (
                  <div className="mini-sticker-grid">
                    {filteredStickers.map(s => (
                      <div key={s.id} className={`mini-sticker ${panelDragging === s.id ? 'dragging' : ''}`}
                        draggable={true}
                        title={`${s.name} - ${CategoryLabels[s.category]}（点击或拖拽到画布）`}
                        onClick={() => addStickerToCanvas(s)}
                        onDragStart={(e) => handlePanelDragStart(e, s.id)}
                        onDragEnd={handlePanelDragEnd}>
                        {s.imageData ? (
                          <img src={s.imageData} alt={s.name} draggable={false} />
                        ) : (
                          <div className="mini-placeholder">🖼️</div>
                        )}
                        <div className="mini-color-bar">
                          {s.primaryColors.slice(0, 4).map((c, i) => (
                            <span key={i} style={{ backgroundColor: c, flex: 1 }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {harmonyResult && (
                <div className="harmony-panel">
                  <h4>🎨 色彩搭配建议</h4>
                  <p className="harmony-base">基于主色 <span className="base-color" style={{ backgroundColor: harmonyResult.baseColor }} /> {harmonyResult.baseColor}</p>
                  <div className="harmony-suggestions">
                    {harmonyResult.suggestions.slice(0, 4).map((s, i) => {
                      const matchingStickers = stickers.filter(st =>
                        st.primaryColors.some(c => {
                          const diff = Math.abs(parseInt(c.slice(1), 16) - parseInt(s.color.slice(1), 16));
                          return diff < 0x222222;
                        })
                      ).slice(0, 2);
                      return (
                        <div key={i} className="harmony-suggest-item">
                          <div className="harmony-color-block">
                            <div className="color-block" style={{ backgroundColor: s.color }} />
                            <div className="color-info">
                              <span className="color-type">{HarmonyTypeLabels[s.type]}</span>
                              <span className="color-score">{s.harmonyScore}%</span>
                            </div>
                          </div>
                          {matchingStickers.length > 0 && (
                            <div className="matching-stickers">
                              {matchingStickers.map(ms => (
                                <div key={ms.id} className="match-sticker"
                                  title={ms.name}
                                  onClick={() => addStickerToCanvas(ms)}>
                                  {ms.imageData ? <img src={ms.imageData} /> : <span>🖼️</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {leftTab === 'templates' && (
            <>
              <div className="panel-header">
                <h3>模板面板</h3>
                <div className="search-wrap">
                  <input type="text" placeholder="搜索模板..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)} />
                </div>
              </div>
              <div className="template-filters">
                <div className="filter-group">
                  <label>主题</label>
                  <select className="filter-select"
                    value={templateThemeFilter}
                    onChange={e => setTemplateThemeFilter(e.target.value)}>
                    <option value="">全部主题</option>
                    {templateThemes.map(theme => (
                      <option key={theme} value={theme}>{theme}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>标签</label>
                  <select className="filter-select"
                    value={templateTagFilter}
                    onChange={e => setTemplateTagFilter(e.target.value)}>
                    <option value="">全部标签</option>
                    {tags.map(tag => (
                      <option key={tag.id} value={tag.id}>{tag.name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>色系</label>
                  <div className="color-family-row">
                    {COLOR_FAMILY_OPTIONS.map(c => (
                      <button key={c.value}
                        className={`color-family-btn ${templateColorFilter === c.value ? 'active' : ''}`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                        onClick={() => setTemplateColorFilter(c.value)} />
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <label>画布尺寸</label>
                  <select className="filter-select"
                    value={templateSizeFilter}
                    onChange={e => setTemplateSizeFilter(e.target.value)}>
                    <option value="">全部尺寸</option>
                    {templateSizes.map(size => (
                      <option key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sticker-list">
                {loadingTemplates ? (
                  <div className="empty-hint">
                    <div className="empty-icon">⏳</div>
                    <p>加载中...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="empty-hint">
                    <div className="empty-icon">📭</div>
                    <p>暂无模板</p>
                    <p className="empty-sub">点击上方"存为模板"创建</p>
                  </div>
                ) : (
                  <div className="template-grid">
                    {templates.map(tpl => (
                      <div key={tpl.id} className="template-card" onClick={() => openApplyTemplate(tpl)}>
                        <div className="template-card-preview">
                          {renderTemplatePreview(tpl)}
                        </div>
                        <div className="template-card-info">
                          <div className="template-card-name" title={tpl.name}>{tpl.name}</div>
                          <div className="template-card-meta">
                            <span className="template-usage-count">使用 {tpl.usageCount} 次</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="canvas-area">
          <div className="canvas-toolbar">
            <div className="tool-group">
              <span className="tool-label">画布尺寸:</span>
              {CANVAS_PRESETS.map(preset => (
                <button key={preset.name}
                  className={`tool-btn ${canvasWidth === preset.width && canvasHeight === preset.height ? 'active' : ''}`}
                  onClick={() => { setCanvasWidth(preset.width); setCanvasHeight(preset.height); }}>
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="tool-group">
              <span className="tool-label">背景色:</span>
              {BG_COLORS.map(c => (
                <button key={c}
                  className={`color-btn ${backgroundColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setBackgroundColor(c)} />
              ))}
              <input type="color" value={backgroundColor}
                onChange={e => setBackgroundColor(e.target.value)}
                className="color-input" />
            </div>
            {appliedTemplateName && (
              <div className="tool-group">
                <span className="tool-label">基于模板:</span>
                <span className="template-badge">📋 {appliedTemplateName}</span>
              </div>
            )}
          </div>

          <div className="canvas-container">
            <div
              ref={canvasRef}
              className={`canvas ${panelDragging ? 'drag-over' : ''}`}
              style={{ width: canvasWidth, height: canvasHeight, backgroundColor }}
              onClick={() => setSelectedId(null)}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
            >
              {elements.map(elem => {
                const sticker = stickers.find(s => s.id === elem.stickerId);
                const isPlaceholder = elem.isPlaceholder || elem.stickerId === '__placeholder__';
                const placeholderColor = COLOR_FAMILY_OPTIONS.find(c => c.value === elem.placeholderColorFamily)?.color || '#ddd';
                return (
                  <div
                    key={elem.id}
                    className={`canvas-element ${selectedId === elem.id ? 'selected' : ''} ${isPlaceholder ? 'placeholder-element' : ''}`}
                    style={{
                      left: elem.x,
                      top: elem.y,
                      width: elem.width,
                      height: elem.height,
                      transform: `rotate(${elem.rotation}deg)`,
                      zIndex: elem.zIndex,
                      ...(isPlaceholder ? { borderColor: placeholderColor } : {})
                    }}
                    onMouseDown={(e) => handleCanvasMouseDown(e, elem)}
                  >
                    {isPlaceholder ? (
                      <div className="placeholder-content" style={{ backgroundColor: `${placeholderColor}22` }}>
                        <div className="placeholder-icon" style={{ color: placeholderColor }}>📌</div>
                        <div className="placeholder-label">{elem.placeholderLabel || '布局占位'}</div>
                        <div className="placeholder-category">{elem.placeholderCategory ? CategoryLabels[elem.placeholderCategory] : ''}</div>
                      </div>
                    ) : sticker?.imageData ? (
                      <img src={sticker.imageData} draggable={false} />
                    ) : (
                      <div className="elem-placeholder">🖼️</div>
                    )}
                  </div>
                );
              })}
              {elements.length === 0 && (
                <div className="canvas-empty">
                  <div className="canvas-empty-icon">✨</div>
                  <p>从左侧素材面板<strong>拖拽</strong>或<strong>点击</strong>素材添加到画布</p>
                  <p className="canvas-empty-sub">拖拽移动 · 自由旋转 · 创意拼贴</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="property-panel">
          <div className="panel-tabs">
            <button className={`panel-tab ${rightTab === 'properties' ? 'active' : ''}`} onClick={() => setRightTab('properties')}>
              ⚙️ 属性
            </button>
            <button className={`panel-tab ${rightTab === 'replacements' ? 'active' : ''}`} onClick={() => setRightTab('replacements')} disabled={replacements.length === 0}>
              🔄 替换记录 {replacements.length > 0 && `(${replacements.length})`}
            </button>
          </div>

          {rightTab === 'properties' && (
            <>
              <div className="panel-header">
                <h3>属性面板</h3>
              </div>
              {!selectedElement ? (
                <div className="prop-empty">
                  <div className="empty-icon">👆</div>
                  <p>选中画布上的元素</p>
                  <p className="empty-sub">查看和编辑属性</p>
                </div>
              ) : (
                <div className="prop-content">
                  {selectedElement.isPlaceholder || selectedElement.stickerId === '__placeholder__' ? (
                    <>
                      <div className="prop-preview placeholder-preview"
                        style={{
                          backgroundColor: `${COLOR_FAMILY_OPTIONS.find(c => c.value === selectedElement.placeholderColorFamily)?.color || '#ddd'}22`,
                          borderColor: COLOR_FAMILY_OPTIONS.find(c => c.value === selectedElement.placeholderColorFamily)?.color || '#ddd'
                        }}>
                        <div className="placeholder-icon-lg" style={{ color: COLOR_FAMILY_OPTIONS.find(c => c.value === selectedElement.placeholderColorFamily)?.color }}>📌</div>
                      </div>
                      <div className="prop-name">布局占位符</div>
                      <div className="prop-palette">
                        {selectedElement.placeholderColorFamily && (
                          <span className="prop-color"
                            style={{
                              backgroundColor: COLOR_FAMILY_OPTIONS.find(c => c.value === selectedElement.placeholderColorFamily)?.color,
                              width: 60,
                              flex: 'none'
                            }}
                            title={ColorFamilyLabels[selectedElement.placeholderColorFamily]} />
                        )}
                      </div>
                      <div className="placeholder-meta-section">
                        <div className="meta-row">
                          <span className="meta-label">建议分类</span>
                          <span className="meta-value">
                            {selectedElement.placeholderCategory
                              ? CategoryLabels[selectedElement.placeholderCategory]
                              : '-'}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">建议色系</span>
                          <span className="meta-value">
                            {selectedElement.placeholderColorFamily
                              ? ColorFamilyLabels[selectedElement.placeholderColorFamily]
                              : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="prop-section">
                        <label>占位说明</label>
                        <div className="placeholder-desc">
                          {selectedElement.placeholderLabel || '在此位置放置对应分类和色系的素材'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="prop-preview">
                        {selectedSticker?.imageData ? (
                          <img src={selectedSticker.imageData} />
                        ) : <div className="mini-placeholder">🖼️</div>}
                      </div>
                      <div className="prop-name">{selectedSticker?.name || '素材'}</div>
                      <div className="prop-palette">
                        {(selectedSticker?.primaryColors || []).map((c, i) => (
                          <span key={i} className="prop-color" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                    </>
                  )}

                  <div className="prop-section">
                    <label>旋转角度</label>
                    <div className="prop-control">
                      <button className="prop-btn" onClick={() => rotateElement(selectedId!, -15)}>↺</button>
                      <span className="prop-value">{Math.round(selectedElement.rotation)}°</span>
                      <button className="prop-btn" onClick={() => rotateElement(selectedId!, 15)}>↻</button>
                    </div>
                  </div>

                  <div className="prop-section">
                    <label>缩放大小</label>
                    <div className="prop-control">
                      <button className="prop-btn" onClick={() => scaleElement(selectedId!, -0.1)}>−</button>
                      <span className="prop-value">{Math.round(selectedElement.width)}px</span>
                      <button className="prop-btn" onClick={() => scaleElement(selectedId!, 0.1)}>+</button>
                    </div>
                  </div>

                  <div className="prop-section">
                    <label>图层顺序</label>
                    <div className="prop-control-row">
                      <button className="prop-btn wide" onClick={() => bringForward(selectedId!)}>⬆️ 置顶</button>
                      <button className="prop-btn wide" onClick={() => sendBackward(selectedId!)}>⬇️ 置底</button>
                    </div>
                  </div>

                  <button className="btn btn-danger delete-btn" onClick={() => removeElement(selectedId!)}>
                    🗑️ 删除此元素
                  </button>

                  <div className="element-count">
                    当前画布: {elements.length} 个元素
                  </div>
                </div>
              )}
            </>
          )}

          {rightTab === 'replacements' && (
            <>
              <div className="panel-header">
                <h3>替换记录</h3>
              </div>
              {replacements.length === 0 ? (
                <div className="prop-empty">
                  <div className="empty-icon">🔄</div>
                  <p>暂无替换记录</p>
                  <p className="empty-sub">使用"自动替换"模式套用模板后显示</p>
                </div>
              ) : (
                <div className="replacement-list">
                  {replacements.map((rep, idx) => {
                    const newSticker = getStickerById(rep.newStickerId);
                    return (
                      <div key={idx} className="replacement-item">
                        <div className="replacement-header">
                          <div className="replacement-names">
                            <span className="rep-old-name" title={rep.originalStickerName}>{rep.originalStickerName}</span>
                            <span className="rep-arrow">→</span>
                            <span className="rep-new-name" title={rep.newStickerName}>{rep.newStickerName}</span>
                          </div>
                          <div className="replacement-score">
                            <span className="score-label">匹配分</span>
                            <span className="score-value">{rep.harmonyScore}</span>
                          </div>
                        </div>
                        <div className="replacement-body">
                          <div className="replacement-thumb">
                            {newSticker?.imageData ? (
                              <img src={newSticker.imageData} alt={rep.newStickerName} />
                            ) : (
                              <div className="mini-placeholder">🖼️</div>
                            )}
                          </div>
                          <div className="replacement-reasons">
                            {rep.reasons.map((reason, i) => (
                              <div key={i} className="rep-reason-tag">
                                {reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSaveModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{id ? '更新作品' : '保存作品'}</h3>
              <button className="modal-close" onClick={() => setShowSaveModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">作品标题 *</label>
                <input type="text" className="form-input" placeholder="给作品起个好听的名字"
                  value={saveForm.title}
                  onChange={e => setSaveForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">作品描述</label>
                <textarea className="form-textarea" placeholder="记录创作灵感或心情..."
                  value={saveForm.description}
                  onChange={e => setSaveForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">添加标签</label>
                <div className="tag-selector">
                  {tags.map(tag => (
                    <span key={tag.id}
                      className={`tag-select ${saveForm.collageTags.includes(tag.id) ? 'active' : ''}`}
                      style={{ borderColor: tag.color, color: saveForm.collageTags.includes(tag.id) ? '#fff' : tag.color, backgroundColor: saveForm.collageTags.includes(tag.id) ? tag.color : 'transparent' }}
                      onClick={() => toggleCollageTag(tag.id)}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">绑定创作计划（可选）</label>
                <select
                  className="form-input"
                  value={saveForm.planId}
                  onChange={e => setSaveForm(p => ({ ...p, planId: e.target.value }))}
                  disabled={loadingPlans}
                >
                  <option value="">不绑定计划</option>
                  {plans.filter(p => p.status === 'pending' || p.status === 'in_progress').map(plan => (
                    <option key={plan.id} value={plan.id}>
                      📅 {plan.date} - {plan.title}
                    </option>
                  ))}
                </select>
                {saveForm.planId && (
                  <div className="plan-bind-hint">
                    💡 保存后系统将自动标记该计划为完成，并记录实际使用的素材
                  </div>
                )}
              </div>
              {appliedTemplateName && (
                <div className="form-group">
                  <label className="form-label">来源模板</label>
                  <div className="template-source-info">
                    📋 {appliedTemplateName}
                    {appliedTemplateId && <span className="template-source-id">（ID: {appliedTemplateId}）</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>{id ? '更新' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {showSaveTemplateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSaveTemplateModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">💾 保存为模板</h3>
              <button className="modal-close" onClick={() => setShowSaveTemplateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">模板名称 *</label>
                <input type="text" className="form-input" placeholder="给模板起个名字"
                  value={saveTemplateForm.name}
                  onChange={e => setSaveTemplateForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">模板描述</label>
                <textarea className="form-textarea" placeholder="描述一下这个模板的风格或用途..."
                  value={saveTemplateForm.description}
                  onChange={e => setSaveTemplateForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">适用主题标签</label>
                <div className="tag-selector">
                  {templateThemes.map(theme => (
                    <span key={theme}
                      className={`tag-select ${saveTemplateForm.themes.includes(theme) ? 'active' : ''}`}
                      onClick={() => toggleTemplateTheme(theme)}>
                      🏷️ {theme}
                    </span>
                  ))}
                  {templateThemes.length === 0 && (
                    <span className="empty-hint-inline">暂无可选主题，可先保存模板</span>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSaveTemplateModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate}>保存模板</button>
            </div>
          </div>
        </div>
      )}

      {showApplyTemplateModal && applyingTemplate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !applyingTemplateLoading && setShowApplyTemplateModal(false)}>
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">📋 套用模板</h3>
                <p className="modal-subtitle">{applyingTemplate.name}</p>
              </div>
              <button className="modal-close" onClick={() => !applyingTemplateLoading && setShowApplyTemplateModal(false)} disabled={applyingTemplateLoading}>×</button>
            </div>
            <div className="modal-body">
              <div className="apply-preview-section">
                <div className="apply-preview-canvas-wrap">
                  <div className="apply-preview-canvas" style={{ width: Math.min(360, applyingTemplate.canvasWidth * 0.5), height: applyingTemplate.canvasHeight * 0.5 * Math.min(360 / applyingTemplate.canvasWidth, 1), backgroundColor: applyingTemplate.backgroundColor, maxWidth: 360, maxHeight: 400 }}>
                    {applyingTemplate.elements.map((elem, idx) => {
                      const scale = Math.min(360 / applyingTemplate.canvasWidth, 1) * 0.5;
                      const colorFamily = elem.originalStickerColorFamily;
                      const colorOpt = COLOR_FAMILY_OPTIONS.find(c => c.value === colorFamily);
                      const bgColor = colorOpt?.color || '#ddd';
                      return (
                        <div
                          key={idx}
                          className="template-elem-placeholder"
                          style={{
                            left: elem.x * scale,
                            top: elem.y * scale,
                            width: elem.width * scale,
                            height: elem.height * scale,
                            transform: `rotate(${elem.rotation}deg)`,
                            backgroundColor: bgColor,
                            zIndex: elem.zIndex
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="apply-preview-info">
                  <div className="apply-info-item">
                    <span className="apply-info-label">背景色</span>
                    <span className="apply-info-value">
                      <span className="color-preview" style={{ backgroundColor: applyingTemplate.backgroundColor }} />
                      {applyingTemplate.backgroundColor}
                    </span>
                  </div>
                  <div className="apply-info-item">
                    <span className="apply-info-label">画布尺寸</span>
                    <span className="apply-info-value">{applyingTemplate.canvasWidth} × {applyingTemplate.canvasHeight}</span>
                  </div>
                  <div className="apply-info-item">
                    <span className="apply-info-label">元素数量</span>
                    <span className="apply-info-value">{applyingTemplate.elements.length} 个</span>
                  </div>
                  <div className="apply-info-item">
                    <span className="apply-info-label">使用次数</span>
                    <span className="apply-info-value">{applyingTemplate.usageCount} 次</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">套用模式</label>
                <div className="apply-mode-list">
                  {APPLY_MODES.map(mode => (
                    <label key={mode.value}
                      className={`apply-mode-item ${applyMode === mode.value ? 'active' : ''}`}>
                      <input type="radio"
                        name="applyMode"
                        value={mode.value}
                        checked={applyMode === mode.value}
                        onChange={() => setApplyMode(mode.value)}
                        disabled={applyingTemplateLoading} />
                      <div className="apply-mode-content">
                        <div className="apply-mode-header">
                          <span className="apply-mode-label">{mode.label}</span>
                          {mode.recommended && <span className="apply-mode-badge">推荐</span>}
                        </div>
                        <div className="apply-mode-desc">{mode.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {applyMode === 'auto_replace' && (
                <div className="auto-replace-hint">
                  💡 系统将优先推荐长期未用且色彩和谐的素材
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApplyTemplateModal(false)} disabled={applyingTemplateLoading}>取消</button>
              <button className="btn btn-primary" onClick={handleApplyTemplate} disabled={applyingTemplateLoading}>
                {applyingTemplateLoading ? '套用中...' : '确认套用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
