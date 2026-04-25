import { api } from './api';

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface DocumentInfo {
  id: string;
  title: string;
  content: string;
  revision: number;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface VersionInfo {
  id: string;
  revision: number;
  snapshot: string;
  created_at: string;
}

export const authService = {
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
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

  getDocument: async (id: string): Promise<DocumentInfo> => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  getVersions: async (id: string): Promise<VersionInfo[]> => {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data;
  },

  grantPermission: async (docId: string, userId: string, role: string): Promise<void> => {
    await api.post(`/documents/${docId}/permissions`, { user_id: userId, role });
  },
};
