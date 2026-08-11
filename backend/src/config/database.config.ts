import dotenv from 'dotenv';
dotenv.config();

export type DatabaseType =
  | 'mssql'
  | 'postgres'
  | 'sqlite';

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export const databaseConfig: DatabaseConfig =
  {
    type:
      (process.env.DB_TYPE as DatabaseType) ||
      'mssql',

    host: process.env.DB_HOST,

    port: process.env.DB_PORT
      ? Number(process.env.DB_PORT)
      : undefined,

    username: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    database:
      process.env.DB_NAME || 'app',

    synchronize: false,

    logging: false,
  };