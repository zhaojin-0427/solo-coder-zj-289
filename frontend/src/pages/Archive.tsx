import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collageApi, stickerApi, tagApi, sharingApi, templateApi } from '../api/client';
import type { Collage, Sticker, Tag, ColorFamily, ShareVisibility } from '../types';
import { ColorFamilyLabels } from '../types';
import './Archive.css';

type SourceFilter = 'all' | 'original' | 'template';

export default function Archive() {
  const navigate = useNavigate();
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const [collages, setCollages] = useState<Collage[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [previewCollage, setPreviewCollage] = useState<Collage | null>(null);
  const [publishedMap, setPublishedMap] = useState<Record<string, boolean>>({});
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishingCollage, setPublishingCollage] = useState<Collage | null>(null);
  const [publishForm, setPublishForm] = useState({
    title: '',
    description: '',
    themes: [] as string[],
    newTheme: '',
    visibility: 'public' as ShareVisibility,
    allowComments: true,
    colorFamilies: [] as ColorFamily[]
  });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, [search, selectedTag, sourceFilter]);

  useEffect(() => {
    stickerApi.getAll().then(setStickers).catch(() => {});
    tagApi.getAll().then(setTags).catch(() => {});
  }, []);

  function getTagName(tagId: string): string {
    return tags.find(t => t.id === tagId)?.name || tagId;
  }

  function getTagColor(tagId: string): string {
    return tags.find(t => t.id === tagId)?.color || '#999';
  }

  async function loadData() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedTag) params.tag = selectedTag;
      const data = await collageApi.getAll(params);
      setCollages(data);
      setTimeout(() => renderThumbnails(data), 100);
    } finally {
      setLoading(false);
    }
  }

  function renderThumbnails(list: Collage[]) {
    list.forEach(collage => {
      const canvas = canvasRefs.current[collage.id];
      if (!canvas) return;
      renderCollageToCanvas(canvas, collage, stickers, 0.3);
    });
  }

  function renderCollageToCanvas(canvas: HTMLCanvasElement, collage: Collage, stickerList: Sticker[], scale = 1) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = collage.canvasWidth * scale;
    canvas.height = collage.canvasHeight * scale;

    ctx.fillStyle = collage.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedElements = [...collage.elements].sort((a, b) => a.zIndex - b.zIndex);
    let loadedCount = 0;

    sortedElements.forEach(elem => {
      const sticker = stickerList.find(s => s.id === elem.stickerId);
      if (!sticker?.imageData) {
        ctx.save();
        ctx.translate((elem.x + elem.width / 2) * scale, (elem.y + elem.height / 2) * scale);
        ctx.rotate((elem.rotation * Math.PI) / 180);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(-elem.width * scale / 2, -elem.height * scale / 2, elem.width * scale, elem.height * scale);
        ctx.restore();
        loadedCount++;
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.translate((elem.x + elem.width / 2) * scale, (elem.y + elem.height / 2) * scale);
        ctx.rotate((elem.rotation * Math.PI) / 180);
        ctx.drawImage(img, -elem.width * scale / 2, -elem.height * scale / 2, elem.width * scale, elem.height * scale);
        ctx.restore();
        loadedCount++;
      };
      img.src = sticker.imageData;
    });
  }

  function openPreview(collage: Collage) {
    setPreviewCollage(collage);
    setTimeout(() => {
      const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
      if (canvas) renderCollageToCanvas(canvas, collage, stickers, 0.7);
    }, 50);
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此作品吗？此操作无法撤销。')) return;
    try {
      await sharingApi.unpublishByCollageId(id).catch(() => {});
    } catch {}
    await collageApi.delete(id);
    loadData();
  }

  async function loadPublishStatuses() {
    const statusMap: Record<string, boolean> = {};
    for (const collage of collages) {
      try {
        const status = await sharingApi.getPublishStatus(collage.id);
        statusMap[collage.id] = status.isPublished;
      } catch {
        statusMap[collage.id] = false;
      }
    }
    setPublishedMap(statusMap);
  }

  useEffect(() => {
    if (collages.length > 0) {
      loadPublishStatuses();
    }
  }, [collages.length]);

  function openPublishModal(collage: Collage) {
    setPublishingCollage(collage);
    setPublishForm({
      title: collage.title,
      description: collage.description,
      themes: [],
      newTheme: '',
      visibility: 'public',
      allowComments: true,
      colorFamilies: []
    });
    setShowPublishModal(true);
  }

  function toggleTheme(theme: string) {
    setPublishForm(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  }

  function addNewTheme() {
    const theme = publishForm.newTheme.trim();
    if (theme && !publishForm.themes.includes(theme)) {
      setPublishForm(prev => ({
        ...prev,
        themes: [...prev.themes, theme],
        newTheme: ''
      }));
    }
  }

  function toggleColorFamily(cf: ColorFamily) {
    setPublishForm(prev => ({
      ...prev,
      colorFamilies: prev.colorFamilies.includes(cf)
        ? prev.colorFamilies.filter(c => c !== cf)
        : [...prev.colorFamilies, cf]
    }));
  }

  async function handlePublish() {
    if (!publishingCollage) return;

    setPublishing(true);
    try {
      await sharingApi.publishWork({
        collageId: publishingCollage.id,
        title: publishForm.title,
        description: publishForm.description,
        themes: publishForm.themes,
        colorFamilies: publishForm.colorFamilies,
        visibility: publishForm.visibility,
        allowComments: publishForm.allowComments
      });

      setPublishedMap(prev => ({ ...prev, [publishingCollage.id]: true }));
      setShowPublishModal(false);
      alert('发布成功！');
    } catch (err: any) {
      alert(err.message || '发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish(collageId: string) {
    if (!confirm('确定取消发布此作品吗？取消后其他用户将无法看到。')) return;

    try {
      await sharingApi.unpublishByCollageId(collageId);
      setPublishedMap(prev => ({ ...prev, [collageId]: false }));
    } catch (err: any) {
      alert(err.message || '取消发布失败');
    }
  }

  const publishedCount = Object.values(publishedMap).filter(Boolean).length;
  const allTags = Array.from(new Set(collages.flatMap(c => c.tags)));
  const templateCount = collages.filter(c => c.templateId).length;
  const originalCount = collages.filter(c => !c.templateId).length;

  const displayCollages = collages.filter(c => {
    if (sourceFilter === 'template') return !!c.templateId;
    if (sourceFilter === 'original') return !c.templateId;
    return true;
  });

  useEffect(() => {
    if (stickers.length > 0 && displayCollages.length > 0) {
      renderThumbnails(displayCollages);
    }
  }, [stickers, displayCollages]);

  return (
    <div className="archive-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">📁 作品归档</h2>
          <p className="page-subtitle">珍藏你的每一份创意手账作品，共 {collages.length} 个作品（原创 {originalCount} · 模板来源 {templateCount} · 已发布 {publishedCount}）</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/sharing')}>
            🌟 去分享墙
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/collage')}>
            <span>✨</span> 新建拼贴
          </button>
        </div>
      </div>

      <div className="filter-bar card">
        <div className="filter-row">
          <div className="filter-item flex-2">
            <label>搜索作品</label>
            <input type="text" className="form-input" placeholder="搜索标题或描述..."
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>作品来源</label>
            <div className="source-filter-row">
              <button className={`source-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSourceFilter('all')}>
                📚 全部 ({collages.length})
              </button>
              <button className={`source-filter-btn ${sourceFilter === 'original' ? 'active' : ''}`}
                onClick={() => setSourceFilter('original')}>
                ✏️ 原创 ({originalCount})
              </button>
              <button className={`source-filter-btn ${sourceFilter === 'template' ? 'active' : ''}`}
                onClick={() => setSourceFilter('template')}>
                📋 模板来源 ({templateCount})
              </button>
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="filter-item flex-3">
              <label>标签筛选</label>
              <div className="tag-filter-row">
                <button className={`tag-filter-btn ${!selectedTag ? 'active' : ''}`}
                  onClick={() => setSelectedTag('')}>全部</button>
                {allTags.map(tagId => {
                  const tagName = getTagName(tagId);
                  const tagColor = getTagColor(tagId);
                  return (
                    <button key={tagId}
                      className={`tag-filter-btn ${selectedTag === tagId ? 'active' : ''}`}
                      style={selectedTag === tagId ? { backgroundColor: tagColor, borderColor: tagColor } : { borderColor: tagColor, color: tagColor }}
                      onClick={() => setSelectedTag(tagId === selectedTag ? '' : tagId)}>
                      🏷️ {tagName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载中...</div>
        </div>
      ) : displayCollages.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">暂无作品</div>
          <div className="empty-state-desc">去虚拟拼贴台创造你的第一个手账作品吧！</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/collage')}>
            开始创作
          </button>
        </div>
      ) : (
        <div className="collage-grid">
          {displayCollages.map(collage => (
            <div key={collage.id} className={`collage-card ${collage.templateId ? 'template-derived' : ''}`}>
              <div className="collage-thumb-wrap" onClick={() => openPreview(collage)}>
                <canvas
                  ref={el => { canvasRefs.current[collage.id] = el; }}
                  className="collage-canvas"
                />
                {collage.templateId && (
                  <div className="template-badge" title={`基于模板「${collage.templateName}」创作`}>
                    📋 模板
                  </div>
                )}
                {publishedMap[collage.id] && (
                  <div className="published-badge" title="已发布到分享墙">
                    🌟 已发布
                  </div>
                )}
                <div className="collage-overlay">
                  <span className="overlay-btn">🔍 预览</span>
                </div>
              </div>
              <div className="collage-info">
                <div className="collage-title-row">
                  <h3 className="collage-title" title={collage.title}>{collage.title}</h3>
                  <span className="collage-count">{collage.elements.length}素材</span>
                </div>
                {collage.templateName && (
                  <div className="collage-template-source">
                    📋 来自模板：<span className="template-name">{collage.templateName}</span>
                  </div>
                )}
                {collage.description && (
                  <p className="collage-desc">{collage.description}</p>
                )}
                <div className="collage-meta">
                  <span className="meta-date">📅 {new Date(collage.createdAt).toLocaleDateString('zh-CN')}</span>
                  {collage.templateId && (
                    <span className="meta-source">📋 模板衍生</span>
                  )}
                </div>
                <div className="collage-actions">
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/collage/${collage.id}`)}>
                    ✏️ 编辑
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openPreview(collage)}>
                    👁️ 查看
                  </button>
                  {publishedMap[collage.id] ? (
                    <button className="btn btn-warning btn-sm" onClick={() => handleUnpublish(collage.id)} title="取消发布">
                      📤 取消发布
                    </button>
                  ) : (
                    <button className="btn btn-success btn-sm" onClick={() => openPublishModal(collage)} title="发布到分享墙">
                      🌟 发布
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(collage.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewCollage && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewCollage(null)}>
          <div className="modal-content modal-xl">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {previewCollage.title}
                  {previewCollage.templateId && (
                    <span className="preview-template-badge" title={`基于模板「${previewCollage.templateName}」创作`}>
                      📋 模板来源
                    </span>
                  )}
                </h3>
                <p className="modal-subtitle">
                  创建于 {new Date(previewCollage.createdAt).toLocaleDateString('zh-CN')} · {previewCollage.elements.length} 个素材
                  {previewCollage.templateName && (
                    <span className="preview-template-name"> · 来自模板：{previewCollage.templateName}</span>
                  )}
                </p>
              </div>
              <button className="modal-close" onClick={() => setPreviewCollage(null)}>×</button>
            </div>
            <div className="modal-body preview-body">
              {previewCollage.description && (
                <div className="preview-desc">
                  <strong>创作灵感：</strong>{previewCollage.description}
                </div>
              )}
              <div className="preview-canvas-wrap">
                <canvas id="preview-canvas" className="preview-canvas" />
              </div>
              <div className="preview-info-row">
                <div className="preview-stat">
                  <span className="stat-label">画布尺寸</span>
                  <span className="stat-value">{previewCollage.canvasWidth} × {previewCollage.canvasHeight}</span>
                </div>
                <div className="preview-stat">
                  <span className="stat-label">背景色</span>
                  <span className="stat-value">
                    <span className="color-preview" style={{ backgroundColor: previewCollage.backgroundColor }} />
                    {previewCollage.backgroundColor}
                  </span>
                </div>
                <div className="preview-stat">
                  <span className="stat-label">使用素材</span>
                  <span className="stat-value">{previewCollage.elements.length} 张</span>
                </div>
                {previewCollage.tags.length > 0 && (
                  <div className="preview-stat">
                    <span className="stat-label">标签</span>
                    <span className="stat-value preview-tags">
                      {previewCollage.tags.map(tid => (
                        <span key={tid} className="preview-tag"
                          style={{ backgroundColor: getTagColor(tid) + '20', color: getTagColor(tid), borderColor: getTagColor(tid) }}>
                          🏷️ {getTagName(tid)}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewCollage(null)}>关闭</button>
              <button className="btn btn-primary" onClick={() => navigate(`/collage/${previewCollage.id}`)}>
                编辑此作品
              </button>
            </div>
          </div>
        </div>
      )}

      {showPublishModal && publishingCollage && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPublishModal(false)}>
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🌟 发布作品到分享墙</h3>
                <p className="modal-subtitle">设置发布信息，让更多人看到你的创意</p>
              </div>
              <button className="modal-close" onClick={() => setShowPublishModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="publish-form">
                <div className="form-group">
                  <label>展示标题</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="输入作品标题"
                    value={publishForm.title}
                    onChange={e => setPublishForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>作品说明</label>
                  <textarea
                    className="form-textarea"
                    placeholder="介绍一下你的创作灵感..."
                    rows={3}
                    value={publishForm.description}
                    onChange={e => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>关联主题</label>
                  <div className="theme-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="输入新主题名称"
                      value={publishForm.newTheme}
                      onChange={e => setPublishForm(prev => ({ ...prev, newTheme: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNewTheme())}
                    />
                    <button className="btn btn-secondary" onClick={addNewTheme}>添加</button>
                  </div>
                  {publishForm.themes.length > 0 && (
                    <div className="selected-themes">
                      {publishForm.themes.map(theme => (
                        <span key={theme} className="theme-tag selected">
                          🎨 {theme}
                          <button className="tag-remove-btn" onClick={() => toggleTheme(theme)}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>色系</label>
                  <div className="color-family-selector">
                    {(['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'brown', 'gray', 'monochrome'] as ColorFamily[]).map(cf => (
                      <button
                        key={cf}
                        className={`color-family-btn ${publishForm.colorFamilies.includes(cf) ? 'selected' : ''}`}
                        onClick={() => toggleColorFamily(cf)}
                        title={ColorFamilyLabels[cf]}>
                        <span className={`color-dot-${cf}`} />
                        <span className="color-name">{ColorFamilyLabels[cf]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>可见性</label>
                    <div className="visibility-options">
                      <label className={`visibility-option ${publishForm.visibility === 'public' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          checked={publishForm.visibility === 'public'}
                          onChange={() => setPublishForm(prev => ({ ...prev, visibility: 'public' }))}
                        />
                        <span className="visibility-icon">🌍</span>
                        <span className="visibility-label">公开</span>
                        <span className="visibility-desc">所有人可见</span>
                      </label>
                      <label className={`visibility-option ${publishForm.visibility === 'private' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          checked={publishForm.visibility === 'private'}
                          onChange={() => setPublishForm(prev => ({ ...prev, visibility: 'private' }))}
                        />
                        <span className="visibility-icon">🔒</span>
                        <span className="visibility-label">私密</span>
                        <span className="visibility-desc">仅自己可见</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={publishForm.allowComments}
                      onChange={e => setPublishForm(prev => ({ ...prev, allowComments: e.target.checked }))}
                    />
                    <span>允许其他用户评论</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPublishModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={publishing || !publishForm.title.trim()}>
                {publishing ? '发布中...' : '🚀 确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
