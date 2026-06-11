import axios, { AxiosInstance } from 'axios';
import type {
  Sticker,
  Tag,
  Collage,
  CollageTemplate,
  Statistics,
  ColorHarmonyResult,
  ApiResponse,
  TemplateApplyMode,
  TemplateApplyResult
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.error || '请求失败');
  }
  return response.data.data as T;
}

export const stickerApi = {
  async getAll(params?: {
    category?: string;
    source?: string;
    theme?: string;
    tagId?: string;
    colorFamily?: string;
    search?: string;
  }): Promise<Sticker[]> {
    const response = await api.get('/stickers', { params });
    return handleResponse<Sticker[]>(response);
  },

  async getById(id: string): Promise<Sticker> {
    const response = await api.get(`/stickers/${id}`);
    return handleResponse<Sticker>(response);
  },

  async create(formData: FormData): Promise<Sticker> {
    const response = await api.post('/stickers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return handleResponse<Sticker>(response);
  },

  async update(id: string, data: Partial<Sticker>): Promise<Sticker> {
    const response = await api.put(`/stickers/${id}`, data);
    return handleResponse<Sticker>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await api.delete(`/stickers/${id}`);
    handleResponse<void>(response);
  }
};

export const tagApi = {
  async getAll(): Promise<Tag[]> {
    const response = await api.get('/tags');
    return handleResponse<Tag[]>(response);
  },

  async create(data: { name: string; color?: string }): Promise<Tag> {
    const response = await api.post('/tags', data);
    return handleResponse<Tag>(response);
  },

  async update(id: string, data: Partial<Tag>): Promise<Tag> {
    const response = await api.put(`/tags/${id}`, data);
    return handleResponse<Tag>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await api.delete(`/tags/${id}`);
    handleResponse<void>(response);
  }
};

export const collageApi = {
  async getAll(params?: { tag?: string; search?: string }): Promise<Collage[]> {
    const response = await api.get('/collages', { params });
    return handleResponse<Collage[]>(response);
  },

  async getById(id: string): Promise<Collage> {
    const response = await api.get(`/collages/${id}`);
    return handleResponse<Collage>(response);
  },

  async create(data: Partial<Collage>): Promise<Collage> {
    const response = await api.post('/collages', data);
    return handleResponse<Collage>(response);
  },

  async update(id: string, data: Partial<Collage>): Promise<Collage> {
    const response = await api.put(`/collages/${id}`, data);
    return handleResponse<Collage>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await api.delete(`/collages/${id}`);
    handleResponse<void>(response);
  }
};

export const templateApi = {
  async getAll(params?: {
    theme?: string;
    tag?: string;
    colorFamily?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    search?: string;
  }): Promise<CollageTemplate[]> {
    const response = await api.get('/templates', { params });
    return handleResponse<CollageTemplate[]>(response);
  },

  async getThemes(): Promise<string[]> {
    const response = await api.get('/templates/themes');
    return handleResponse<string[]>(response);
  },

  async getSizes(): Promise<{ width: number; height: number; label: string }[]> {
    const response = await api.get('/templates/sizes');
    return handleResponse<{ width: number; height: number; label: string }[]>(response);
  },

  async getById(id: string): Promise<CollageTemplate> {
    const response = await api.get(`/templates/${id}`);
    return handleResponse<CollageTemplate>(response);
  },

  async create(data: {
    name: string;
    description?: string;
    collageId?: string;
    themes?: string[];
  }): Promise<CollageTemplate> {
    const response = await api.post('/templates', data);
    return handleResponse<CollageTemplate>(response);
  },

  async apply(id: string, mode: TemplateApplyMode): Promise<TemplateApplyResult> {
    const response = await api.post(`/templates/${id}/apply`, { mode });
    return handleResponse<TemplateApplyResult>(response);
  },

  async update(id: string, data: Partial<CollageTemplate>): Promise<CollageTemplate> {
    const response = await api.put(`/templates/${id}`, data);
    return handleResponse<CollageTemplate>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await api.delete(`/templates/${id}`);
    handleResponse<void>(response);
  }
};

export const statisticsApi = {
  async getStatistics(): Promise<Statistics> {
    const response = await api.get('/statistics');
    return handleResponse<Statistics>(response);
  },

  async getColorHarmony(color: string): Promise<ColorHarmonyResult> {
    const response = await api.get('/statistics/color-harmony', { params: { color } });
    return handleResponse<ColorHarmonyResult>(response);
  }
};

export default api;
