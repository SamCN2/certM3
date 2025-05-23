/**
 * Copyright 2025 ogt11.com, llc
 */

import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {UserRepository, CertificateRepository, RequestRepository, GroupRepository, UserGroupRepository} from './repositories';
import {config} from './config';

export {ApplicationConfig};

export class Certm3ApiApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    // Configure base path for all routes using the config file
    const restOptions = {
      ...options,
      rest: {
        ...options.rest,
        basePath: config.api.prefix,
      },
    };

    super(restOptions);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js', '.controller.ts'],
        nested: true,
      },
    };

    // Bind repositories
    this.repository(UserRepository);
    this.repository(CertificateRepository);
    this.repository(RequestRepository);
    this.repository(GroupRepository);
    this.repository(UserGroupRepository);
  }
}
