import { db } from '../config/db.ts';

export interface ITemplate {
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

export const Template = db.templates;
