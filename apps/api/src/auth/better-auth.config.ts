import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins/admin';
import { D1Dialect } from 'kysely-d1';
import { createSkerAuthPlugin } from '@sker/auth'
interface CreateAuthOptions {
  baseURL?: string;
  secret?: string;
}

export function createAuth(db: D1Database, options: CreateAuthOptions = {}) {
  return betterAuth({
    database: {
      dialect: new D1Dialect({ database: db }),
      type: 'sqlite',
    },
    basePath: '/api/auth',
    baseURL: options.baseURL,
    secret: options.secret,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      admin(),
      createSkerAuthPlugin([])
    ],
  });
}
