import { useState, useEffect } from 'react';
import { tagApi } from '../api/client';
import type { Tag } from '../types';
import './TagManager.css';

const presetColors = [
  '#FF6B9D', '#FF9A76', '#FFD93D', '#6BCB77', '#6EC6FF',
  '#A855F7', '#F472B6', '#FB923C', '#4ADE80', '#38BDF8',
  '#E879F9', '#A78BFA', '#FBBF24', '#34D399', '#60A5FA'
];

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form, setForm] = useState({ name: '', color: presetColors[0] });

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const data = await tagApi.getAll();
      setTags(data.sort((a, b) => b.usageCount - a.usageCount));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingTag(null);
    setForm({ name: '', color: presetColors[Math.floor(Math.random() * presetColors.length)] });
    setShowModal(true);
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag);
    setForm({ name: tag.name, color: tag.color });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      if (editingTag) {
        await tagApi.update(editingTag.id, form);
      } else {
        await tagApi.create(form);
      }
      setShowModal(false);
      loadTags();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此标签吗？')) return;
    await tagApi.delete(id);
    loadTags();
  }

  return (
    <div className="tag-manager">
      <div className="page-header">
        <div>
          <h2 className="page-title">🏷️ 标签管理</h2>
          <p className="page-subtitle">为你的素材和作品添加个性化标签，共 {tags.length} 个</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={openCreate}>
          <span>➕</span> 新建标签
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载中...</div>
        </div>
      ) : tags.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏷️</div>
          <div className="empty-state-title">暂无标签</div>
          <div className="empty-state-desc">创建标签来更好地分类管理你的素材和作品</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={openCreate}>
            创建第一个标签
          </button>
        </div>
      ) : (
        <div className="tags-grid">
          {tags.map(tag => (
            <div key={tag.id} className="tag-card" style={{ borderColor: tag.color }}>
              <div className="tag-card-header">
                <div className="tag-preview" style={{ backgroundColor: tag.color }}>
                  <span className="tag-preview-name">{tag.name}</span>
                </div>
                <span className="usage-badge" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                  使用 {tag.usageCount} 次
                </span>
              </div>
              <div className="tag-card-info">
                <h3 className="tag-name">{tag.name}</h3>
                <p className="tag-color">{tag.color}</p>
                <p className="tag-date">创建于 {new Date(tag.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
              <div className="tag-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(tag)}>编辑</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tag.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingTag ? '编辑标签' : '新建标签'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">标签名称 *</label>
                  <input type="text" className="form-input" required maxLength={20}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="输入标签名称（最多20字）" />
                </div>
                <div className="form-group">
                  <label className="form-label">标签颜色</label>
                  <div className="color-picker">
                    <div className="color-grid">
                      {presetColors.map(color => (
                        <button type="button" key={color}
                          className={`color-swatch ${form.color === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setForm(p => ({ ...p, color }))} />
                      ))}
                    </div>
                    <div className="color-custom">
                      <label>自定义</label>
                      <input type="color" value={form.color}
                        onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">预览</label>
                  <div className="tag-preview-large" style={{ backgroundColor: form.color }}>
                    {form.name || '标签预览'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingTag ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
