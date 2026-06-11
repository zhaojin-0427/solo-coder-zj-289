import express from 'express';
import cors from 'cors';
import path from 'path';
import stickersRouter from './routes/stickers';
import tagsRouter from './routes/tags';
import collagesRouter from './routes/collages';
import statisticsRouter from './routes/statistics';
import templatesRouter from './routes/templates';

const app = express();
const PORT = 9602;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '手账贴纸素材管理平台 API 运行正常', timestamp: new Date().toISOString() });
});

app.use('/api/stickers', stickersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/collages', collagesRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/templates', templatesRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📁 API 基础路径: /api`);
});

export default app;
