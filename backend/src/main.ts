import { Database } from './db/database';
import { startServer } from './server';

async function bootstrap() {
  try {
    await Database.connect();

    await startServer();

    console.log(
      'Application started'
    );
  } catch (err) {
    console.error(
      'Application failed to start',
      err
    );
    process.exit(1);
  }
}

bootstrap();

process.on(
  'SIGINT',
  async () => {
    await Database.disconnect();
    process.exit(0);
  }
);

process.on(
  'SIGTERM',
  async () => {
    await Database.disconnect();
    process.exit(0);
  }
);