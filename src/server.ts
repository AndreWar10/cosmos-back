import { createApp } from './app.js';
import { env } from './config/env.js';
import { warmupCache } from './main/warmup.js';

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Cosmos API running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);

  void warmupCache();
});
