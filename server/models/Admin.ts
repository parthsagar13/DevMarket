import { db } from '../config/db.ts';

export interface IAdmin {
  id: string;
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export const Admin = db.admins;
