import { AppDataSource } from './data-source';

export class Database {
  private static initialized = false;

  static async connect() {
    if (!this.initialized) {
      await AppDataSource.initialize();
      this.initialized = true;
      console.log('Database connected');
    }
  }

  static get dataSource() {
    if (!this.initialized) {
      throw new Error(
        'Database is not initialized'
      );
    }

    return AppDataSource;
  }

  static async disconnect() {
    if (this.initialized) {
      await AppDataSource.destroy();
      this.initialized = false;
      console.log(
        'Database disconnected'
      );
    }
  }
}