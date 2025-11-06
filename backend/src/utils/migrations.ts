import { getDatabase } from '../config/database';
import fs from 'fs';
import path from 'path';

export class MigrationRunner {
  private db = getDatabase();
  private migrationsPath = path.join(__dirname, '../../migrations');

  public async runMigrations(): Promise<void> {
    console.log('🗄️  Running database migrations...');

    // Create migrations tracking table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get applied migrations
    const appliedMigrations = await this.db.all<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    // Get available migration files
    const migrationFiles = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const version = path.basename(file, '.sql');
      
      if (appliedVersions.has(version)) {
        console.log(`⏭️  Skipping migration ${version} (already applied)`);
        continue;
      }

      console.log(`🔄 Applying migration ${version}...`);
      
      const migrationPath = path.join(this.migrationsPath, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      await this.db.transaction(async () => {
        for (const statement of statements) {
          await this.db.run(statement);
        }
        
        // Record migration as applied
        await this.db.run(
          'INSERT INTO schema_migrations (version) VALUES (?)',
          [version]
        );
      });

      console.log(`✅ Migration ${version} applied successfully`);
    }

    console.log('✨ All migrations completed!');
  }

  public async createDefaultAdmin(): Promise<void> {
    console.log('👤 Checking for default admin user...');

    const existingAdmin = await this.db.get(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    if (existingAdmin) {
      console.log('⏭️  Admin user already exists, skipping creation');
      return;
    }

    const { AuthService } = await import('../middleware/auth');
    const { v4: uuidv4 } = await import('uuid');
    
    const authService = AuthService.getInstance();
    const adminId = uuidv4();
    const adminPassword = process.env['ADMIN_PASSWORD'] || 'admin123';
    const passwordHash = await authService.hashPassword(adminPassword);
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', 'Administrator', passwordHash, 'admin', now, now]
    );

    console.log('✅ Default admin user created');
    console.log(`📝 Username: admin`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('⚠️  Please change the admin password after first login!');
  }
}

// CLI runner
if (require.main === module) {
  const runner = new MigrationRunner();
  
  runner.runMigrations()
    .then(() => runner.createDefaultAdmin())
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}