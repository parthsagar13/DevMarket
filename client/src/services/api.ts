import axios from 'axios';
import { LoginResponse, Template } from '../types/index.ts';

// Use relative URL since client and server share the same origin port 3000
const API = axios.create({
  baseURL: '/api',
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await API.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  // Templates
  async getTemplates(): Promise<Template[]> {
    const response = await API.get<Template[]>('/templates');
    return response.data;
  },

  async getTemplateBySlug(slug: string): Promise<Template> {
    const response = await API.get<Template>(`/templates/${slug}`);
    return response.data;
  },

  async uploadTemplate(formData: FormData): Promise<Template> {
    const response = await API.post<Template>('/templates/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateTemplate(id: string, data: FormData | any): Promise<Template> {
    const isFormData = data instanceof FormData;
    const response = await API.patch<Template>(`/templates/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  async deleteTemplate(id: string): Promise<{ message: string }> {
    const response = await API.delete<{ message: string }>(`/templates/${id}`);
    return response.data;
  },

  getDownloadUrl(slug: string): string {
    return `/api/templates/download/${slug}`;
  },
};
