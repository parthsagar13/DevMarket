import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'server', 'storage');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class Collection<T extends { id?: string; _id?: string; createdAt?: string | Date; updatedAt?: string | Date }> {
  private filePath: string;
  private data: T[] = [];

  constructor(collectionName: string) {
    this.filePath = path.join(STORAGE_DIR, `${collectionName}.json`);
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = [];
      }
    } else {
      this.save();
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public async find(query: Partial<T> = {}): Promise<T[]> {
    this.load();
    return this.data.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  public async findOne(query: Partial<T> = {}): Promise<T | null> {
    this.load();
    const found = this.data.find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    return found || null;
  }

  public async findById(id: string): Promise<T | null> {
    this.load();
    const found = this.data.find(item => item.id === id || item._id === id);
    return found || null;
  }

  public async create(item: Omit<T, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    this.load();
    const id = Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id,
      _id: id,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;
    this.data.push(newItem);
    this.save();
    return newItem;
  }

  public async findByIdAndUpdate(id: string, update: Partial<T>): Promise<T | null> {
    this.load();
    const index = this.data.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.data[index] = {
      ...this.data[index],
      ...update,
      updatedAt: now,
    };
    this.save();
    return this.data[index];
  }

  public async findByIdAndDelete(id: string): Promise<T | null> {
    this.load();
    const index = this.data.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;
    const deleted = this.data[index];
    this.data.splice(index, 1);
    this.save();
    return deleted;
  }

  public async countDocuments(query: Partial<T> = {}): Promise<number> {
    this.load();
    const items = await this.find(query);
    return items.length;
  }
}

export const db = {
  admins: new Collection<any>('admins'),
  templates: new Collection<any>('templates'),
};
