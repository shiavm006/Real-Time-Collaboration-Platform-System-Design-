import { api } from './api';

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const authService = {
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const documentService = {
  getDocuments: async (): Promise<DocumentInfo[]> => {
    const response = await api.get('/documents/');
    return response.data;
  },
  createDocument: async (title: string): Promise<DocumentInfo> => {
    const response = await api.post('/documents/', { title });
    return response.data;
  },
  getDocument: async (id: string): Promise<any> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  }
};
