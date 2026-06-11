import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collageApi, stickerApi } from '../api/client';
import type { Collage, Sticker } from '../types';
import './Archive.css';

export default function Archive() {
  const navigate = useNavigate();
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const [collages, setCollages] = useState<Collage[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [previewCollage, setPreviewCollage] = useState<Collage | null>(null);

  useEffect(() => {
    loadData();
  }, [search, selectedTag]);

  useEffect(() => {
    stickerApi.getAll().then(setStickers).catch(() => {});
  }, []);

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

  useEffect(() => {
    if (stickers.length > 0 && collages.length > 0) {
      renderThumbnails(collages);
    }
  }, [stickers]);

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
    await collageApi.delete(id);
    loadData();
  }

  const allTags = Array.from(new Set(collages.flatMap(c => c.tags)));

  return (
    <div className="archive-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">📁 作品归档</h2>
          <p className="page-subtitle">珍藏你的每一份创意手账作品，共 {collages.length} 个作品</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/collage')}>
          <span>✨</span> 新建拼贴
        </button>
      </div>

      <div className="filter-bar card">
        <div className="filter-row">
          <div className="filter-item flex-2">
            <label>搜索作品</label>
            <input type="text" className="form-input" placeholder="搜索标题或描述..."
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          {allTags.length > 0 && (
            <div className="filter-item flex-3">
              <label>标签筛选</label>
              <div className="tag-filter-row">
                <button className={`tag-filter-btn ${!selectedTag ? 'active' : ''}`}
                  onClick={() => setSelectedTag('')}>全部</button>
                {allTags.map(tagId => (
                  <button key={tagId}
                    className={`tag-filter-btn ${selectedTag === tagId ? 'active' : ''}`}
                    onClick={() => setSelectedTag(tagId === selectedTag ? '' : tagId)}>
                    🏷️ {tagId}
                  </button>
                ))}
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
      ) : collages.length === 0 ? (
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
          {collages.map(collage => (
            <div key={collage.id} className="collage-card">
              <div className="collage-thumb-wrap" onClick={() => openPreview(collage)}>
                <canvas
                  ref={el => { canvasRefs.current[collage.id] = el; }}
                  className="collage-canvas"
                />
                <div className="collage-overlay">
                  <span className="overlay-btn">🔍 预览</span>
                </div>
              </div>
              <div className="collage-info">
                <div className="collage-title-row">
                  <h3 className="collage-title" title={collage.title}>{collage.title}</h3>
                  <span className="collage-count">{collage.elements.length}素材</span>
                </div>
                {collage.description && (
                  <p className="collage-desc">{collage.description}</p>
                )}
                <div className="collage-meta">
                  <span className="meta-date">📅 {new Date(collage.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="collage-actions">
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/collage/${collage.id}`)}>
                    ✏️ 编辑
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openPreview(collage)}>
                    👁️ 查看
                  </button>
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
                <h3 className="modal-title">{previewCollage.title}</h3>
                <p className="modal-subtitle">
                  创建于 {new Date(previewCollage.createdAt).toLocaleDateString('zh-CN')} · {previewCollage.elements.length} 个素材
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
                    <span className="stat-value">{previewCollage.tags.join('、')}</span>
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
    </div>
  );
}
