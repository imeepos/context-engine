# @sker/typeorm-postgres

PostgreSQL driver for @sker/typeorm

## Installation

```bash
pnpm add @sker/typeorm-postgres pg
```

## Usage

### Basic Setup

```typescript
import { TypeOrmPostgresModule } from '@sker/typeorm-postgres'
import { Entity, Column, PrimaryColumn } from '@sker/typeorm'

@Entity()
class User {
  @PrimaryColumn()
  id!: number

  @Column()
  name!: string

  @Column()
  email!: string
}

// Using connection string
const module = await TypeOrmPostgresModule.forRoot({
  connection: 'postgresql://user:password@localhost:5432/mydb',
  entities: [User]
})

// Using configuration object
const module = await TypeOrmPostgresModule.forRoot({
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'password',
    database: 'mydb'
  },
  entities: [User]
})

// Using existing Pool instance
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://user:password@localhost:5432/mydb'
})

const module = await TypeOrmPostgresModule.forRoot({
  connection: pool,
  entities: [User]
})
```

### With Dependency Injection

```typescript
import { createPlatform } from '@sker/core'
import { TypeOrmPostgresModule } from '@sker/typeorm-postgres'

const platform = createPlatform()
const app = platform.bootstrapApplication()

await app.bootstrap(
  await TypeOrmPostgresModule.forRoot({
    connection: 'postgresql://localhost/mydb',
    entities: [User]
  })
)

// Use Repository
const userRepo = app.injector.get(Repository<User>)
const users = await userRepo.findAll()
```

## Features

- ✅ Full TypeORM API support
- ✅ Connection pooling with `pg.Pool`
- ✅ Automatic placeholder conversion (`?` → `$1, $2, ...`)
- ✅ PostgreSQL-specific dialect (UPSERT with `ON CONFLICT`)
- ✅ Transaction support
- ✅ Type-safe queries

## Configuration Options

### Connection String

```typescript
connection: 'postgresql://user:password@host:port/database'
```

### Configuration Object

```typescript
connection: {
  host: string
  port?: number
  user: string
  password: string
  database: string
  ssl?: boolean | object
  // ... other pg.PoolConfig options
}
```

### Existing Pool

```typescript
import { Pool } from 'pg'

const pool = new Pool({ ... })
connection: pool
```

## License

MIT
