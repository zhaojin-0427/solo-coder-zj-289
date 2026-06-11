import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stickerApi, collageApi, statisticsApi, tagApi } from '../api/client';
import type { Sticker, Collage, CollageElement, ColorHarmonyResult, StickerCategory, Tag } from '../types';
import { CategoryLabels, HarmonyTypeLabels } from '../types';
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
  const [saveForm, setSaveForm] = useState({ title: '', description: '', collageTags: [] as string[] });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; elem: CollageElement | null } | null>(null);
  const nextZIndex = useRef(10);

  useEffect(() => {
    stickerApi.getAll().then(setStickers).catch(() => {});
    tagApi.getAll().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) {
      collageApi.getById(id).then(collage => {
        setElements(collage.elements);
        setCanvasWidth(collage.canvasWidth);
        setCanvasHeight(collage.canvasHeight);
        setBackgroundColor(collage.backgroundColor);
        setSaveForm({ title: collage.title, description: collage.description, collageTags: collage.tags });
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

  function addStickerToCanvas(sticker: Sticker) {
    const scale = 0.6;
    const baseW = Math.min(160, sticker.width || 160);
    const baseH = Math.min(160, sticker.height || 160);
    const newElement: CollageElement = {
      id: 'elem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      stickerId: sticker.id,
      x: (canvasWidth - baseW * scale) / 2 + (Math.random() - 0.5) * 50,
      y: (canvasHeight - baseH * scale) / 2 + (Math.random() - 0.5) * 50,
      width: baseW * scale,
      height: baseH * scale,
      rotation: (Math.random() - 0.5) * 10,
      zIndex: nextZIndex.current++
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
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
      const data = {
        ...saveForm,
        tags: saveForm.collageTags,
        elements,
        backgroundColor,
        canvasWidth,
        canvasHeight
      };
      if (id) {
        await collageApi.update(id, data);
      } else {
        await collageApi.create(data);
      }
      alert('保存成功！');
      setShowSaveModal(false);
      navigate('/archive');
    } catch (err) {
      alert('保存失败: ' + (err as Error).message);
    }
  }

  const selectedElement = elements.find(e => e.id === selectedId);
  const selectedSticker = selectedElement ? stickers.find(s => s.id === selectedElement.stickerId) : null;

  function toggleCollageTag(tagId: string) {
    setSaveForm(prev => ({
      ...prev,
      collageTags: prev.collageTags.includes(tagId)
        ? prev.collageTags.filter(id => id !== tagId)
        : [...prev.collageTags, tagId]
    }));
  }

  return (
    <div className="collage-board">
      <div className="page-header">
        <div>
          <h2 className="page-title">✂️ 虚拟拼贴台</h2>
          <p className="page-subtitle">拖拽素材到画布上，创造你的专属手账页面</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={clearCanvas}>🗑️ 清空</button>
          <button className="btn btn-primary btn-lg" onClick={openSave}>💾 保存作品</button>
        </div>
      </div>

      <div className="workspace">
        <div className="sticker-panel">
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
                  <div key={s.id} className="mini-sticker"
                    title={`${s.name} - ${CategoryLabels[s.category]}`}
                    onClick={() => addStickerToCanvas(s)}>
                    {s.imageData ? (
                      <img src={s.imageData} alt={s.name} />
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
          </div>

          <div className="canvas-container">
            <div
              ref={canvasRef}
              className="canvas"
              style={{ width: canvasWidth, height: canvasHeight, backgroundColor }}
              onClick={() => setSelectedId(null)}
            >
              {elements.map(elem => {
                const sticker = stickers.find(s => s.id === elem.stickerId);
                return (
                  <div
                    key={elem.id}
                    className={`canvas-element ${selectedId === elem.id ? 'selected' : ''}`}
                    style={{
                      left: elem.x,
                      top: elem.y,
                      width: elem.width,
                      height: elem.height,
                      transform: `rotate(${elem.rotation}deg)`,
                      zIndex: elem.zIndex
                    }}
                    onMouseDown={(e) => handleCanvasMouseDown(e, elem)}
                  >
                    {sticker?.imageData ? (
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
                  <p>从左侧素材面板点击素材添加到画布</p>
                  <p className="canvas-empty-sub">拖拽移动 · 自由旋转 · 创意拼贴</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="property-panel">
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
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>{id ? '更新' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
