/**
 * Copyright 2025 ogt11.com, llc
 */

import {ApplicationConfig, Certm3ApiApplication} from './application';
import {ConfigLoader} from './config-loader';
import {Logger} from './logger';

export * from './application';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const configPath = args.find((arg, index) => 
    arg === '--config' && args[index + 1]
  ) ? args[args.indexOf('--config') + 1] : null;
  
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  return { configPath, verbose };
}

export async function main(options: ApplicationConfig = {}) {
  const logger = Logger.getInstance();
  
  try {
    // Parse command line arguments
    const { configPath, verbose } = parseArgs();
    
    // Set config path if provided
    if (configPath) {
      ConfigLoader.getInstance().setConfigPath(configPath);
    }

    // Override verbose setting if provided via command line
    if (verbose) {
      const configLoader = ConfigLoader.getInstance();
      const config = configLoader.loadConfig();
      config.verbose = true;
      logger.info('Verbose logging enabled via command line flag');
    }

    // Load config once
    const configLoader = ConfigLoader.getInstance();
    const apiConfig = configLoader.getApiConfig();

    logger.info('Starting CertM3 API server', {
      port: apiConfig.port,
      host: apiConfig.host,
      prefix: apiConfig.prefix
    });

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
    logger.info('Server is running', {
      url: url,
      ping_url: `${url}/ping`
    });

    return app;
  } catch (error) {
    logger.error('Failed to start the application', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

if (require.main === module) {
  // Run the application
  main().catch(err => {
    const logger = Logger.getInstance();
    logger.error('Cannot start the application', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
}
