import {AppDataSource} from './typeorm.config';

AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.runMigrations();
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during migration:', error);
    process.exit(1);
  }); 