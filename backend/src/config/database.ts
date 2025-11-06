import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Enable verbose mode for development
sqlite3.verbose();

export interface DatabaseConfig {
  path: string;
  verbose?: boolean;
}

export class Database {
  private db: sqlite3.Database;
  
  constructor(config: DatabaseConfig) {
    const dbPath = config.path || process.env['DATABASE_PATH'] || './data/kanbanx.db';
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(dbPath, (err: Error | null) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      }
      console.log(`Connected to SQLite database at ${dbPath}`);
    });
    
    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }
  
  // Promisified methods for async/await support
  public run(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }
  
  public get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }
  
  public all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }
  
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
  
  // Transaction support
  public async transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }
}

// Singleton database instance
let dbInstance: Database | null = null;

export const getDatabase = (): Database => {
  if (!dbInstance) {
    dbInstance = new Database({
      path: process.env['DATABASE_PATH'] || './data/kanbanx.db',
      verbose: process.env['NODE_ENV'] === 'development'
    });
  }
  return dbInstance;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};