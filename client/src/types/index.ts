export interface Template {
  id: string;
  _id: string;
  title: string;
  slug: string;
  framework: string;
  category: string;
  price: number;
  isFree: boolean;
  thumbnail: string;
  zipFile: string;
  previewPath: string;
  previewUrl: string;
  downloadUrl: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}
