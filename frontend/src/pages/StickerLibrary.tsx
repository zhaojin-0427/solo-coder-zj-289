import { useState, useEffect } from 'react';
import { stickerApi, tagApi, statisticsApi } from '../api/client';
import type { Sticker, Tag, ColorHarmonyResult, StickerCategory, StickerSource, ColorFamily } from '../types';
import { CategoryLabels, SourceLabels, ColorFamilyLabels, HarmonyTypeLabels } from '../types';
import './StickerLibrary.css';

const categories: { value: '' | StickerCategory; label: string }[] = [
  { value: '', label: '全部分类' },
  { value: 'character', label: '人物' },
  { value: 'text', label: '文字' },
  { value: 'decoration', label: '装饰' },
  { value: 'tape', label: '胶带' }
];

const sources: { value: '' | StickerSource; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'purchased', label: '自购' },
  { value: 'printed', label: '打印' },
  { value: 'gift', label: '朋友赠送' }
];

const colorFamilies: { value: '' | ColorFamily; label: string }[] = [
  { value: '', label: '全部色系' },
  { value: 'red', label: '红色系' },
  { value: 'orange', label: '橙色系' },
  { value: 'yellow', label: '黄色系' },
  { value: 'green', label: '绿色系' },
  { value: 'cyan', label: '青色系' },
  { value: 'blue', label: '蓝色系' },
  { value: 'purple', label: '紫色系' },
  { value: 'pink', label: '粉色系' },
  { value: 'gray', label: '灰色系' },
  { value: 'monochrome', label: '黑白系' }
];

export default function StickerLibrary() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [colorFamily, setColorFamily] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [harmonyResult, setHarmonyResult] = useState<ColorHarmonyResult | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'decoration' as StickerCategory,
    source: 'purchased' as StickerSource,
    themes: '',
    tagIds: [] as string[],
    imageFile: null as File | null
  });

  useEffect(() => {
    loadData();
  }, [category, source, colorFamily, search]);

  useEffect(() => {
    tagApi.getAll().then(setTags).catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (source) params.source = source;
      if (colorFamily) params.colorFamily = colorFamily;
      if (search) params.search = search;
      const data = await stickerApi.getAll(params);
      setStickers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadForm.imageFile && !uploadForm.name) return;

    try {
      const formData = new FormData();
      formData.append('name', uploadForm.name);
      formData.append('category', uploadForm.category);
      formData.append('source', uploadForm.source);
      formData.append('themes', JSON.stringify(uploadForm.themes.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('tagIds', JSON.stringify(uploadForm.tagIds));
      if (uploadForm.imageFile) {
        formData.append('image', uploadForm.imageFile);
      }

      await stickerApi.create(formData);
      setShowUpload(false);
      setUploadForm({ name: '', category: 'decoration', source: 'purchased', themes: '', tagIds: [], imageFile: null });
      loadData();
    } catch (err) {
      alert('上传失败: ' + (err as Error).message);
    }
  }

  async function handleStickerClick(sticker: Sticker) {
    setSelectedSticker(sticker);
    try {
      const result = await statisticsApi.getColorHarmony(sticker.primaryColors[0]);
      setHarmonyResult(result);
    } catch {
      setHarmonyResult(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此素材吗？')) return;
    await stickerApi.delete(id);
    setSelectedSticker(null);
    loadData();
  }

  function toggleTag(tagId: string) {
    setUploadForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  }

  return (
    <div className="sticker-library">
      <div className="page-header">
        <div>
          <h2 className="page-title">🎨 素材库</h2>
          <p className="page-subtitle">管理你的手账贴纸素材，共 {stickers.length} 张</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowUpload(true)}>
          <span>➕</span> 导入素材
        </button>
      </div>

      <div className="filter-bar card">
        <div className="filter-row">
          <div className="filter-item">
            <label>搜索</label>
            <input
              type="text"
              className="form-input"
              placeholder="搜索素材名称或主题..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label>分类</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>来源</label>
            <select className="form-select" value={source} onChange={e => setSource(e.target.value)}>
              {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>色系</label>
            <select className="form-select" value={colorFamily} onChange={e => setColorFamily(e.target.value)}>
              {colorFamilies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载中...</div>
        </div>
      ) : stickers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">暂无素材</div>
          <div className="empty-state-desc">点击右上角按钮导入你的第一张贴纸素材</div>
        </div>
      ) : (
        <div className="sticker-grid">
          {stickers.map(sticker => (
            <div key={sticker.id} className="sticker-card" onClick={() => handleStickerClick(sticker)}>
              <div className="sticker-image-wrap">
                {sticker.imageData ? (
                  <img src={sticker.imageData} alt={sticker.name} />
                ) : (
                  <div className="sticker-placeholder">🖼️</div>
                )}
                <div className="sticker-badge">{CategoryLabels[sticker.category]}</div>
              </div>
              <div className="sticker-info">
                <div className="sticker-name">{sticker.name}</div>
                <div className="sticker-meta">
                  <span className="meta-item">{SourceLabels[sticker.source]}</span>
                  <span className="meta-count">×{sticker.usageCount}</span>
                </div>
                <div className="color-dots">
                  {sticker.primaryColors.slice(0, 5).map((color, i) => (
                    <span key={i} className="color-dot" style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">导入素材</h3>
              <button className="modal-close" onClick={() => setShowUpload(false)}>×</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">素材名称 *</label>
                  <input type="text" className="form-input" required
                    value={uploadForm.name}
                    onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">分类 *</label>
                    <select className="form-select" value={uploadForm.category}
                      onChange={e => setUploadForm(p => ({ ...p, category: e.target.value as StickerCategory }))}>
                      {categories.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">来源 *</label>
                    <select className="form-select" value={uploadForm.source}
                      onChange={e => setUploadForm(p => ({ ...p, source: e.target.value as StickerSource }))}>
                      {sources.slice(1).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">适用主题（逗号分隔）</label>
                  <input type="text" className="form-input" placeholder="如：生日、旅行、日常"
                    value={uploadForm.themes}
                    onChange={e => setUploadForm(p => ({ ...p, themes: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">标签</label>
                  <div className="tag-selector">
                    {tags.map(tag => (
                      <span key={tag.id}
                        className={`tag-select ${uploadForm.tagIds.includes(tag.id) ? 'active' : ''}`}
                        style={{ borderColor: tag.color, color: uploadForm.tagIds.includes(tag.id) ? '#fff' : tag.color, backgroundColor: uploadForm.tagIds.includes(tag.id) ? tag.color : 'transparent' }}
                        onClick={() => toggleTag(tag.id)}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">图片文件 *</label>
                  <div className="file-upload">
                    <input type="file" accept="image/*" required
                      onChange={e => setUploadForm(p => ({ ...p, imageFile: e.target.files?.[0] || null }))} />
                    {uploadForm.imageFile && <p className="file-name">已选择: {uploadForm.imageFile.name}</p>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>取消</button>
                <button type="submit" className="btn btn-primary">导入</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSticker && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedSticker(null)}>
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">素材详情</h3>
              <button className="modal-close" onClick={() => setSelectedSticker(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-layout">
                <div className="detail-image">
                  {selectedSticker.imageData ? (
                    <img src={selectedSticker.imageData} alt={selectedSticker.name} />
                  ) : (
                    <div className="sticker-placeholder large">🖼️</div>
                  )}
                </div>
                <div className="detail-info">
                  <h4>{selectedSticker.name}</h4>
                  <div className="detail-meta">
                    <span className="tag">{CategoryLabels[selectedSticker.category]}</span>
                    <span className="tag">{SourceLabels[selectedSticker.source]}</span>
                    <span className="tag">{ColorFamilyLabels[selectedSticker.colorFamily]}</span>
                  </div>
                  {selectedSticker.themes.length > 0 && (
                    <div className="detail-section">
                      <div className="section-label">适用主题</div>
                      <div className="themes-list">
                        {selectedSticker.themes.map((t, i) => (
                          <span key={i} className="tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="detail-section">
                    <div className="section-label">主色调</div>
                    <div className="palette-row">
                      {selectedSticker.primaryColors.map((color, i) => (
                        <div key={i} className="palette-item" style={{ backgroundColor: color }} title={color}>
                          <span>{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="detail-section">
                    <div className="section-label">使用统计</div>
                    <p>使用次数：{selectedSticker.usageCount} 次</p>
                    <p>导入时间：{new Date(selectedSticker.createdAt).toLocaleDateString('zh-CN')}</p>
                    {selectedSticker.lastUsedAt && (
                      <p>最近使用：{new Date(selectedSticker.lastUsedAt).toLocaleDateString('zh-CN')}</p>
                    )}
                  </div>
                  {harmonyResult && (
                    <div className="detail-section">
                      <div className="section-label">🎨 色彩搭配建议</div>
                      <div className="harmony-list">
                        {harmonyResult.suggestions.slice(0, 4).map((s, i) => (
                          <div key={i} className="harmony-item">
                            <div className="harmony-colors">
                              <div className="harmony-color" style={{ backgroundColor: harmonyResult.baseColor }} />
                              <span>→</span>
                              <div className="harmony-color" style={{ backgroundColor: s.color }} />
                            </div>
                            <div className="harmony-info">
                              <span className="harmony-type">{HarmonyTypeLabels[s.type]}</span>
                              <span className="harmony-score">匹配度 {s.harmonyScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => handleDelete(selectedSticker.id)}>删除</button>
              <button className="btn btn-primary" onClick={() => setSelectedSticker(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
