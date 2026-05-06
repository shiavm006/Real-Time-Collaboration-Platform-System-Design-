import { api } from "./api";

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
  role?: "owner" | "editor" | "viewer";
}

/** Lightweight version returned by the list endpoint — no `content` field. */
export interface DocumentSummary {
  id: string;
  title: string;
  revision: number;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
  role?: "owner" | "editor" | "viewer";
}

export interface VersionInfo {
  id: string;
  revision: number;
  snapshot: string;
  created_at: string;
}

export const authService = {
  getMe: async (): Promise<User> => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export const documentService = {
  getDocuments: async (): Promise<DocumentSummary[]> => {
    const response = await api.get("/documents/");
    return response.data;
  },

  createDocument: async (title: string): Promise<DocumentInfo> => {
    const response = await api.post("/documents/", { title });
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

  restoreVersion: async (docId: string, versionId: string): Promise<void> => {
    await api.post(`/documents/${docId}/versions/${versionId}/restore`);
  },

  grantPermission: async (
    docId: string,
    userId: string,
    role: string,
  ): Promise<void> => {
    await api.post(`/documents/${docId}/permissions`, {
      user_id: userId,
      role,
    });
  },

  grantPermissionByEmail: async (
    docId: string,
    email: string,
    role: string,
  ): Promise<void> => {
    await api.post(`/documents/${docId}/permissions`, { email, role });
  },

  updateRole: async (
    docId: string,
    userId: string,
    role: string,
  ): Promise<void> => {
    await api.post(`/documents/${docId}/permissions`, { user_id: userId, role });
  },

  revokePermission: async (docId: string, userId: string): Promise<void> => {
    await api.delete(`/documents/${docId}/permissions/${userId}`);
  },

  getPermissions: async (docId: string): Promise<PermissionEntry[]> => {
    const response = await api.get(`/documents/${docId}/permissions`);
    return response.data;
  },
};

export interface PermissionEntry {
  user_id: string;
  email: string;
  full_name: string;
  role: "owner" | "editor" | "viewer";
}
