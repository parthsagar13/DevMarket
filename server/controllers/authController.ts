import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-developer-template-marketplace';

export const seedAdminIfNeeded = async () => {
  const adminEmail = 'admin@codemarket.ai';
  const existing = await Admin.findOne({ email: adminEmail });
  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Admin@123', salt);
    await Admin.create({
      email: adminEmail,
      passwordHash,
    });
    console.log('Admin user seeded successfully');
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Seed if database is initialized for the first time
    await seedAdminIfNeeded();

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: admin.id || admin._id, email: admin.email }, JWT_SECRET, {
      expiresIn: '24h',
    });

    return res.json({
      token,
      admin: {
        id: admin.id || admin._id,
        email: admin.email,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
};
