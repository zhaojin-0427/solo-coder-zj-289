import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  sharedWorkStore,
  workLikeStore,
  workFavoriteStore,
  workCommentStore,
  sensitiveWordStore,
  collageStore,
  stickerStore,
  tagStore
} from '../storage/store';
import { SharedWork, ColorFamily, ShareVisibility } from '../types';

const router = Router();

const DEFAULT_USER_ID = 'user_001';
const DEFAULT_USER_NAME = '手账创作者';

router.get('/', (req: Request, res: Response) => {
  try {
    const { theme, tag, colorFamily, sortBy, search, visibility, page, pageSize } = req.query;
    let works = sharedWorkStore.getAll();

    if (visibility === 'public') {
      works = works.filter(w => w.visibility === 'public');
    } else if (visibility === 'private') {
      works = works.filter(w => w.visibility === 'private');
    } else {
      works = works.filter(w => w.visibility === 'public');
    }

    if (theme) {
      works = works.filter(w => w.themes.includes(theme as string));
    }

    if (tag) {
      works = works.filter(w => w.tags.includes(tag as string));
    }

    if (colorFamily) {
      works = works.filter(w => w.colorFamilies.includes(colorFamily as ColorFamily));
    }

    if (search) {
      const searchStr = (search as string).toLowerCase();
      works = works.filter(w =>
        w.title.toLowerCase().includes(searchStr) ||
        w.description.toLowerCase().includes(searchStr) ||
        w.authorName.toLowerCase().includes(searchStr)
      );
    }

    const sortField = sortBy as string || 'newest';
    works.sort((a, b) => {
      switch (sortField) {
        case 'newest':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'oldest':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case 'popular':
          const scoreA = a.likeCount * 3 + a.favoriteCount * 2 + a.commentCount * 5 + a.viewCount;
          const scoreB = b.likeCount * 3 + b.favoriteCount * 2 + b.commentCount * 5 + b.viewCount;
          return scoreB - scoreA;
        case 'most_likes':
          return b.likeCount - a.likeCount;
        case 'most_favorites':
          return b.favoriteCount - a.favoriteCount;
        case 'most_comments':
          return b.commentCount - a.commentCount;
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 20;
    const start = (pageNum - 1) * size;
    const paginatedWorks = works.slice(start, start + size);

    res.json({
      success: true,
      data: {
        works: paginatedWorks,
        total: works.length,
        page: pageNum,
        pageSize: size,
        totalPages: Math.ceil(works.length / size)
      }
    });
  } catch (error) {
    console.error('获取分享作品列表错误:', error);
    res.status(500).json({ success: false, error: '获取分享作品列表失败' });
  }
});

router.get('/themes', (req: Request, res: Response) => {
  try {
    const works = sharedWorkStore.getPublicWorks();
    const themeSet = new Set<string>();
    for (const work of works) {
      for (const theme of work.themes) {
        themeSet.add(theme);
      }
    }
    res.json({ success: true, data: Array.from(themeSet).sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取主题列表失败' });
  }
});

router.get('/my', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || DEFAULT_USER_ID;
    const works = sharedWorkStore.getByAuthor(userId).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    res.json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取我的发布失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    sharedWorkStore.incrementView(req.params.id);

    const collage = collageStore.getById(work.collageId);

    res.json({
      success: true,
      data: {
        ...work,
        collage: collage || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作品详情失败' });
  }
});

router.post('/publish', (req: Request, res: Response) => {
  try {
    const {
      collageId,
      title,
      description,
      themes,
      tags,
      colorFamilies,
      visibility,
      allowComments,
      userId,
      userName,
      previewImage
    } = req.body;

    if (!collageId) {
      return res.status(400).json({ success: false, error: '缺少作品ID' });
    }

    const collage = collageStore.getById(collageId);
    if (!collage) {
      return res.status(404).json({ success: false, error: '拼贴作品不存在' });
    }

    const existing = sharedWorkStore.getByCollageId(collageId);
    if (existing) {
      return res.status(400).json({ success: false, error: '该作品已发布' });
    }

    const materialCount = new Set(collage.elements.map(e => e.stickerId)).size;

    const work: SharedWork = {
      id: uuidv4(),
      collageId,
      title: title || collage.title,
      description: description || collage.description,
      themes: themes || [],
      tags: tags || collage.tags,
      colorFamilies: colorFamilies || [],
      visibility: (visibility as ShareVisibility) || 'public',
      allowComments: allowComments !== false,
      authorId: userId || DEFAULT_USER_ID,
      authorName: userName || DEFAULT_USER_NAME,
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      viewCount: 0,
      materialCount,
      previewImage,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = sharedWorkStore.create(work);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('发布作品错误:', error);
    res.status(500).json({ success: false, error: '发布作品失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, description, themes, tags, colorFamilies, visibility, allowComments } = req.body;
    const updates: Partial<SharedWork> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (themes !== undefined) updates.themes = themes;
    if (tags !== undefined) updates.tags = tags;
    if (colorFamilies !== undefined) updates.colorFamilies = colorFamilies;
    if (visibility !== undefined) updates.visibility = visibility;
    if (allowComments !== undefined) updates.allowComments = allowComments;

    const updated = sharedWorkStore.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新作品失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    workLikeStore.deleteByWorkId(req.params.id);
    workFavoriteStore.deleteByWorkId(req.params.id);
    workCommentStore.deleteByWorkId(req.params.id);

    sharedWorkStore.delete(req.params.id);

    res.json({ success: true, message: '取消发布成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '取消发布失败' });
  }
});

router.delete('/collage/:collageId', (req: Request, res: Response) => {
  try {
    const work = sharedWorkStore.getByCollageId(req.params.collageId);
    if (!work) {
      return res.status(404).json({ success: false, error: '该作品未发布' });
    }

    workLikeStore.deleteByWorkId(work.id);
    workFavoriteStore.deleteByWorkId(work.id);
    workCommentStore.deleteByWorkId(work.id);

    sharedWorkStore.deleteByCollageId(req.params.collageId);

    res.json({ success: true, message: '取消发布成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '取消发布失败' });
  }
});

router.post('/:id/like', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;
    const uid = userId || DEFAULT_USER_ID;
    const uname = userName || DEFAULT_USER_NAME;

    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const existingLike = workLikeStore.getByUserAndWork(uid, req.params.id);
    if (existingLike) {
      workLikeStore.delete(existingLike.id);
      sharedWorkStore.incrementLike(req.params.id, -1);
      return res.json({ success: true, data: { liked: false, likeCount: work.likeCount - 1 } });
    }

    workLikeStore.create({
      id: uuidv4(),
      workId: req.params.id,
      userId: uid,
      userName: uname,
      createdAt: new Date().toISOString()
    });
    sharedWorkStore.incrementLike(req.params.id, 1);

    res.json({ success: true, data: { liked: true, likeCount: work.likeCount + 1 } });
  } catch (error) {
    res.status(500).json({ success: false, error: '点赞操作失败' });
  }
});

router.get('/:id/like-status', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || DEFAULT_USER_ID;
    const existingLike = workLikeStore.getByUserAndWork(userId, req.params.id);
    const existingFavorite = workFavoriteStore.getByUserAndWork(userId, req.params.id);

    res.json({
      success: true,
      data: {
        liked: !!existingLike,
        favorited: !!existingFavorite
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取状态失败' });
  }
});

router.post('/:id/favorite', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;
    const uid = userId || DEFAULT_USER_ID;
    const uname = userName || DEFAULT_USER_NAME;

    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const existingFavorite = workFavoriteStore.getByUserAndWork(uid, req.params.id);
    if (existingFavorite) {
      workFavoriteStore.delete(existingFavorite.id);
      sharedWorkStore.incrementFavorite(req.params.id, -1);
      return res.json({ success: true, data: { favorited: false, favoriteCount: work.favoriteCount - 1 } });
    }

    workFavoriteStore.create({
      id: uuidv4(),
      workId: req.params.id,
      userId: uid,
      userName: uname,
      createdAt: new Date().toISOString()
    });
    sharedWorkStore.incrementFavorite(req.params.id, 1);

    res.json({ success: true, data: { favorited: true, favoriteCount: work.favoriteCount + 1 } });
  } catch (error) {
    res.status(500).json({ success: false, error: '收藏操作失败' });
  }
});

router.get('/:id/comments', (req: Request, res: Response) => {
  try {
    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const comments = workCommentStore.getByWorkId(req.params.id);
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评论失败' });
  }
});

router.post('/:id/comments', (req: Request, res: Response) => {
  try {
    const { content, userId, userName } = req.body;
    const uid = userId || DEFAULT_USER_ID;
    const uname = userName || DEFAULT_USER_NAME;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '评论内容不能为空' });
    }

    const work = sharedWorkStore.getById(req.params.id);
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    if (!work.allowComments) {
      return res.status(403).json({ success: false, error: '该作品不允许评论' });
    }

    const { hasSensitive, filteredText, matchedWords } = sensitiveWordStore.checkText(content.trim());

    const comment = workCommentStore.create({
      id: uuidv4(),
      workId: req.params.id,
      userId: uid,
      userName: uname,
      content: filteredText,
      isBlocked: false,
      createdAt: new Date().toISOString()
    });

    sharedWorkStore.incrementComment(req.params.id, 1);

    res.json({
      success: true,
      data: comment,
      sensitiveFiltered: hasSensitive,
      matchedWords
    });
  } catch (error) {
    console.error('发表评论错误:', error);
    res.status(500).json({ success: false, error: '发表评论失败' });
  }
});

router.delete('/comments/:commentId', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const uid = userId || DEFAULT_USER_ID;

    const comment = workCommentStore.getById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: '评论不存在' });
    }

    if (comment.userId !== uid) {
      return res.status(403).json({ success: false, error: '无权删除他人评论' });
    }

    workCommentStore.delete(req.params.commentId);
    sharedWorkStore.incrementComment(comment.workId, -1);

    res.json({ success: true, message: '删除评论成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除评论失败' });
  }
});

router.get('/check/publish-status/:collageId', (req: Request, res: Response) => {
  try {
    const work = sharedWorkStore.getByCollageId(req.params.collageId);
    res.json({
      success: true,
      data: {
        isPublished: !!work,
        work: work || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取发布状态失败' });
  }
});

router.get('/stats/favorites', (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || DEFAULT_USER_ID;
    const favorites = workFavoriteStore.getByUser(userId);
    const workIds = favorites.map(f => f.workId);
    const works = sharedWorkStore.getAll().filter(w => workIds.includes(w.id));
    
    res.json({
      success: true,
      data: {
        total: favorites.length,
        works
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取收藏列表失败' });
  }
});

export default router;
