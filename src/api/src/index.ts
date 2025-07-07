/**
 * Copyright 2025 ogt11.com, llc
 */

import {ApplicationConfig, Certm3ApiApplication} from './application';
import {ConfigLoader} from './config-loader';

export * from './application';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const configPath = args.find((arg, index) => 
    arg === '--config' && args[index + 1]
  ) ? args[args.indexOf('--config') + 1] : null;
  
  return { configPath };
}

export async function main(options: ApplicationConfig = {}) {
  // Parse command line arguments
  const { configPath } = parseArgs();
  
  // Set config path if provided
  if (configPath) {
    ConfigLoader.getInstance().setConfigPath(configPath);
  }

  // Load config once
  const configLoader = ConfigLoader.getInstance();
  const apiConfig = configLoader.getApiConfig();

  // Create application config with loaded values
  const appConfig: ApplicationConfig = {
    ...options,
    rest: {
      ...options.rest,
      port: apiConfig.port,
      host: apiConfig.host,
      basePath: apiConfig.prefix,
      // The `gracePeriodForClose` provides a graceful close for http/https
      // servers with keep-alive clients. The default value is `Infinity`
      // (don't force-close). If you want to immediately destroy all sockets
      // upon stop, set its value to `0`.
      // See https://www.npmjs.com/package/stoppable
      gracePeriodForClose: 5000, // 5 seconds
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
    },
  };

  const app = new Certm3ApiApplication(appConfig);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}

if (require.main === module) {
  // Run the application
  main().catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
