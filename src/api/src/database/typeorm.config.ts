import {DataSource} from 'typeorm';
import {CreateTables20240320000000} from '../migrations/20240320000000-create-tables';
import {AddAuditColumns20240320000001} from '../migrations/20240320000001-add-audit-columns';
import {AddDisplayName20240320000002} from '../migrations/20240320000002-add-display-name';
import {Certificate} from '../models/certificate.model';
import {Group} from '../models/group.model';
import {Request} from '../models/request.model';
import {Users} from '../models/user.model';
import {UserGroup} from '../models/user-group.model';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: '/var/run/postgresql',
  port: 5432,
  username: 'samcn2',
  database: 'certm3',
  synchronize: false,
  logging: true,
  entities: [Certificate, Group, Request, Users, UserGroup],
  migrations: [
    CreateTables20240320000000,
    AddAuditColumns20240320000001,
    AddDisplayName20240320000002,
  ],
  subscribers: [],
}); 