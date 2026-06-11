import { useState, useEffect, useRef } from 'react';
import { sharingApi, stickerApi, tagApi } from '../api/client';
import type { SharedWork, WorkComment, ColorFamily, Collage, Sticker, Tag } from '../types';
import { ColorFamilyLabels } from '../types';
import './SharingWall.css';

const SORT_OPTIONS = [
  { value: 'newest', label: '最新发布', icon: '🆕' },
  { value: 'popular', label: '最热', icon: '🔥' },
  { value: 'most_likes', label: '点赞最多', icon: '👍' },
  { value: 'most_favorites', label: '收藏最多', icon: '⭐' },
  { value: 'most_comments', label: '评论最多', icon: '💬' }
];

const COLOR_FAMILY_OPTIONS: { value: '' | ColorFamily; label: string; color: string }[] = [
  { value: '', label: '全部色系', color: '#ccc' },
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

export default function SharingWall() {
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [works, setWorks] = useState<SharedWork[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedColorFamily, setSelectedColorFamily] = useState<ColorFamily | ''>('');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedWork, setSelectedWork] = useState<(SharedWork & { collage: Collage | null }) | null>(null);
  const [comments, setComments] = useState<WorkComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likedWorks, setLikedWorks] = useState<Set<string>>(new Set());
  const [favoritedWorks, setFavoritedWorks] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadWorks();
  }, [search, selectedTheme, selectedTag, selectedColorFamily, sortBy, page]);

  useEffect(() => {
    if (stickers.length > 0 && works.length > 0) {
      renderThumbnails(works);
    }
  }, [stickers, works]);

  async function loadInitialData() {
    try {
      const [stickerData, tagData, themeData] = await Promise.all([
        stickerApi.getAll(),
        tagApi.getAll(),
        sharingApi.getThemes()
      ]);
      setStickers(stickerData);
      setTags(tagData);
      setThemes(themeData);
    } catch (err) {
      console.error('加载初始数据失败:', err);
    }
  }

  async function loadWorks() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (search) params.search = search;
      if (selectedTheme) params.theme = selectedTheme;
      if (selectedTag) params.tag = selectedTag;
      if (selectedColorFamily) params.colorFamily = selectedColorFamily;
      if (sortBy) params.sortBy = sortBy;
      params.page = page;
      params.pageSize = pageSize;

      const result = await sharingApi.getWorks(params);
      setWorks(result.works);
      setTotal(result.total);
    } catch (err) {
      console.error('加载作品失败:', err);
    } finally {
      setLoading(false);
    }
  }

  function renderThumbnails(workList: SharedWork[]) {
    workList.forEach(async work => {
      const canvas = canvasRefs.current[work.id];
      if (!canvas) return;

      try {
        const detail = await sharingApi.getWorkById(work.id);
        if (detail.collage) {
          renderCollageToCanvas(canvas, detail.collage, stickers, 0.3);
        }
      } catch {
      }
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

    sortedElements.forEach(elem => {
      const sticker = stickerList.find(s => s.id === elem.stickerId);
      if (!sticker?.imageData) {
        ctx.save();
        ctx.translate((elem.x + elem.width / 2) * scale, (elem.y + elem.height / 2) * scale);
        ctx.rotate((elem.rotation * Math.PI) / 180);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(-elem.width * scale / 2, -elem.height * scale / 2, elem.width * scale, elem.height * scale);
        ctx.restore();
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.translate((elem.x + elem.width / 2) * scale, (elem.y + elem.height / 2) * scale);
        ctx.rotate((elem.rotation * Math.PI) / 180);
        ctx.drawImage(img, -elem.width * scale / 2, -elem.height * scale / 2, elem.width * scale, elem.height * scale);
        ctx.restore();
      };
      img.src = sticker.imageData;
    });
  }

  async function openWorkDetail(work: SharedWork) {
    setLoadingDetail(true);
    try {
      const detail = await sharingApi.getWorkById(work.id);
      setSelectedWork(detail);

      const status = await sharingApi.getLikeStatus(work.id);
      if (status.liked) {
        setLikedWorks(prev => new Set(prev).add(work.id));
      }
      if (status.favorited) {
        setFavoritedWorks(prev => new Set(prev).add(work.id));
      }

      const commentList = await sharingApi.getComments(work.id);
      setComments(commentList);

      setTimeout(() => {
        if (previewCanvasRef.current && detail.collage) {
          renderCollageToCanvas(previewCanvasRef.current, detail.collage, stickers, 0.6);
        }
      }, 50);
    } catch (err) {
      console.error('加载作品详情失败:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleLike(workId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const result = await sharingApi.toggleLike(workId);
      if (result.liked) {
        setLikedWorks(prev => new Set(prev).add(workId));
      } else {
        setLikedWorks(prev => {
          const next = new Set(prev);
          next.delete(workId);
          return next;
        });
      }

      setWorks(prev => prev.map(w =>
        w.id === workId ? { ...w, likeCount: result.likeCount } : w
      ));

      if (selectedWork?.id === workId) {
        setSelectedWork(prev => prev ? { ...prev, likeCount: result.likeCount } : null);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  }

  async function handleFavorite(workId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const result = await sharingApi.toggleFavorite(workId);
      if (result.favorited) {
        setFavoritedWorks(prev => new Set(prev).add(workId));
      } else {
        setFavoritedWorks(prev => {
          const next = new Set(prev);
          next.delete(workId);
          return next;
        });
      }

      setWorks(prev => prev.map(w =>
        w.id === workId ? { ...w, favoriteCount: result.favoriteCount } : w
      ));

      if (selectedWork?.id === workId) {
        setSelectedWork(prev => prev ? { ...prev, favoriteCount: result.favoriteCount } : null);
      }
    } catch (err) {
      console.error('收藏失败:', err);
    }
  }

  async function handleSubmitComment() {
    if (!commentText.trim() || !selectedWork) return;

    setSubmittingComment(true);
    try {
      const newComment = await sharingApi.addComment(selectedWork.id, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText('');

      setWorks(prev => prev.map(w =>
        w.id === selectedWork.id ? { ...w, commentCount: w.commentCount + 1 } : w
      ));

      if (selectedWork) {
        setSelectedWork(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      }
    } catch (err) {
      alert('评论失败，请重试');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('确定删除这条评论吗？')) return;

    try {
      await sharingApi.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));

      if (selectedWork) {
        setWorks(prev => prev.map(w =>
          w.id === selectedWork.id ? { ...w, commentCount: Math.max(0, w.commentCount - 1) } : w
        ));
        setSelectedWork(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null);
      }
    } catch (err) {
      console.error('删除评论失败:', err);
    }
  }

  function getTagName(tagId: string): string {
    return tags.find(t => t.id === tagId)?.name || tagId;
  }

  function getTagColor(tagId: string): string {
    return tags.find(t => t.id === tagId)?.color || '#999';
  }

  const allTags = Array.from(new Set(works.flatMap(w => w.tags)));
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="sharing-wall-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">🌟 作品分享墙</h2>
          <p className="page-subtitle">发现精彩手账作品，分享你的创意灵感，共 {total} 个公开作品</p>
        </div>
      </div>

      <div className="filter-bar card">
        <div className="filter-row">
          <div className="filter-item flex-2">
            <label>搜索作品</label>
            <input type="text" className="form-input" placeholder="搜索标题、描述或作者..."
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>排序方式</label>
            <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          {themes.length > 0 && (
            <div className="filter-item flex-2">
              <label>主题筛选</label>
              <div className="tag-filter-row">
                <button className={`tag-filter-btn ${!selectedTheme ? 'active' : ''}`}
                  onClick={() => { setSelectedTheme(''); setPage(1); }}>
                  全部主题
                </button>
                {themes.map(theme => (
                  <button key={theme}
                    className={`tag-filter-btn ${selectedTheme === theme ? 'active' : ''}`}
                    onClick={() => { setSelectedTheme(theme === selectedTheme ? '' : theme); setPage(1); }}>
                    🎨 {theme}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="filter-row">
          <div className="filter-item flex-2">
            <label>色系筛选</label>
            <div className="color-filter-row">
              {COLOR_FAMILY_OPTIONS.map(opt => (
                <button key={opt.value}
                  className={`color-filter-btn ${selectedColorFamily === opt.value ? 'active' : ''}`}
                  style={{ borderColor: opt.color }}
                  onClick={() => { setSelectedColorFamily(opt.value); setPage(1); }}
                  title={opt.label}>
                  <span className="color-dot" style={{ backgroundColor: opt.color }} />
                  <span className="color-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="filter-row">
            <div className="filter-item flex-3">
              <label>标签筛选</label>
              <div className="tag-filter-row">
                <button className={`tag-filter-btn ${!selectedTag ? 'active' : ''}`}
                  onClick={() => { setSelectedTag(''); setPage(1); }}>
                  全部标签
                </button>
                {allTags.map(tagId => {
                  const tagName = getTagName(tagId);
                  const tagColor = getTagColor(tagId);
                  return (
                    <button key={tagId}
                      className={`tag-filter-btn ${selectedTag === tagId ? 'active' : ''}`}
                      style={selectedTag === tagId
                        ? { backgroundColor: tagColor, borderColor: tagColor }
                        : { borderColor: tagColor, color: tagColor }}
                      onClick={() => { setSelectedTag(tagId === selectedTag ? '' : tagId); setPage(1); }}>
                      🏷️ {tagName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">加载中...</div>
        </div>
      ) : works.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">暂无作品</div>
          <div className="empty-state-desc">还没有公开的分享作品，快去归档页发布你的作品吧！</div>
        </div>
      ) : (
        <>
          <div className="sharing-grid">
            {works.map(work => (
              <div key={work.id} className="sharing-card">
                <div className="sharing-thumb-wrap" onClick={() => openWorkDetail(work)}>
                  <canvas ref={el => { canvasRefs.current[work.id] = el; }} className="sharing-canvas" />
                  <div className="sharing-overlay">
                    <span className="overlay-btn">🔍 查看详情</span>
                  </div>
                  <div className="work-stats-badge">
                    <span className="stat-badge-item">👍 {work.likeCount}</span>
                    <span className="stat-badge-item">⭐ {work.favoriteCount}</span>
                    <span className="stat-badge-item">💬 {work.commentCount}</span>
                  </div>
                </div>
                <div className="sharing-info">
                  <div className="sharing-title-row">
                    <h3 className="sharing-title" title={work.title}>{work.title}</h3>
                  </div>
                  <div className="sharing-author">
                    <span className="author-avatar">👤</span>
                    <span className="author-name">{work.authorName}</span>
                  </div>
                  {work.description && (
                    <p className="sharing-desc">{work.description}</p>
                  )}
                  {work.tags.length > 0 && (
                    <div className="sharing-tags">
                      {work.tags.slice(0, 3).map(tid => (
                        <span key={tid} className="sharing-tag"
                          style={{ backgroundColor: getTagColor(tid) + '20', color: getTagColor(tid), borderColor: getTagColor(tid) }}>
                          🏷️ {getTagName(tid)}
                        </span>
                      ))}
                      {work.tags.length > 3 && (
                        <span className="sharing-tag-more">+{work.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="sharing-meta">
                    <span className="meta-date">📅 {new Date(work.publishedAt).toLocaleDateString('zh-CN')}</span>
                    <span className="meta-materials">🎨 {work.materialCount}素材</span>
                  </div>
                  <div className="sharing-actions">
                    <button
                      className={`action-btn ${likedWorks.has(work.id) ? 'active like' : ''}`}
                      onClick={e => handleLike(work.id, e)}>
                      👍 {work.likeCount}
                    </button>
                    <button
                      className={`action-btn ${favoritedWorks.has(work.id) ? 'active favorite' : ''}`}
                      onClick={e => handleFavorite(work.id, e)}>
                      ⭐ {work.favoriteCount}
                    </button>
                    <button className="action-btn" onClick={() => openWorkDetail(work)}>
                      💬 {work.commentCount}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                ← 上一页
              </button>
              <span className="page-info">第 {page} / {totalPages} 页</span>
              <button
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                下一页 →
              </button>
            </div>
          )}
        </>
      )}

      {selectedWork && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedWork(null)}>
          <div className="modal-content modal-xxl">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedWork.title}</h3>
                <p className="modal-subtitle">
                  作者：{selectedWork.authorName} · 发布于 {new Date(selectedWork.publishedAt).toLocaleDateString('zh-CN')}
                  · {selectedWork.materialCount} 个素材
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedWork(null)}>×</button>
            </div>
            <div className="modal-body detail-body">
              {loadingDetail ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⏳</div>
                  <div className="empty-state-title">加载中...</div>
                </div>
              ) : (
                <div className="detail-layout">
                  <div className="detail-preview-section">
                    <div className="detail-canvas-wrap">
                      <canvas ref={previewCanvasRef} className="detail-canvas" />
                    </div>
                    <div className="detail-actions-row">
                      <button
                        className={`action-btn-large ${likedWorks.has(selectedWork.id) ? 'active like' : ''}`}
                        onClick={() => handleLike(selectedWork.id)}>
                        👍 点赞 {selectedWork.likeCount}
                      </button>
                      <button
                        className={`action-btn-large ${favoritedWorks.has(selectedWork.id) ? 'active favorite' : ''}`}
                        onClick={() => handleFavorite(selectedWork.id)}>
                        ⭐ 收藏 {selectedWork.favoriteCount}
                      </button>
                    </div>
                  </div>

                  <div className="detail-info-section">
                    {selectedWork.description && (
                      <div className="detail-block">
                        <h4 className="detail-block-title">作品说明</h4>
                        <p className="detail-desc-text">{selectedWork.description}</p>
                      </div>
                    )}

                    {selectedWork.themes.length > 0 && (
                      <div className="detail-block">
                        <h4 className="detail-block-title">关联主题</h4>
                        <div className="detail-tags">
                          {selectedWork.themes.map(theme => (
                            <span key={theme} className="detail-theme-tag">🎨 {theme}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedWork.colorFamilies.length > 0 && (
                      <div className="detail-block">
                        <h4 className="detail-block-title">色系</h4>
                        <div className="detail-tags">
                          {selectedWork.colorFamilies.map(cf => (
                            <span key={cf} className="detail-color-tag">
                              {ColorFamilyLabels[cf]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedWork.tags.length > 0 && (
                      <div className="detail-block">
                        <h4 className="detail-block-title">标签</h4>
                        <div className="detail-tags">
                          {selectedWork.tags.map(tid => (
                            <span key={tid} className="detail-tag-item"
                              style={{ backgroundColor: getTagColor(tid) + '20', color: getTagColor(tid), borderColor: getTagColor(tid) }}>
                              🏷️ {getTagName(tid)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="detail-block">
                      <h4 className="detail-block-title">
                        💬 评论 ({selectedWork.commentCount})
                      </h4>
                      {selectedWork.allowComments ? (
                        <>
                          <div className="comment-input-row">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="写下你的评论..."
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                            />
                            <button
                              className="btn btn-primary"
                              onClick={handleSubmitComment}
                              disabled={submittingComment || !commentText.trim()}>
                              发送
                            </button>
                          </div>
                          <div className="comments-list">
                            {comments.length === 0 ? (
                              <div className="empty-comments">暂无评论，快来抢沙发吧！</div>
                            ) : (
                              comments.map(comment => (
                                <div key={comment.id} className="comment-item">
                                  <div className="comment-header">
                                    <span className="comment-author">👤 {comment.userName}</span>
                                    <span className="comment-date">
                                      {new Date(comment.createdAt).toLocaleString('zh-CN')}
                                    </span>
                                    <button
                                      className="comment-delete-btn"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      title="删除评论">
                                      🗑️
                                    </button>
                                  </div>
                                  <div className="comment-content">{comment.content}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="comments-disabled">作者已关闭评论</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
