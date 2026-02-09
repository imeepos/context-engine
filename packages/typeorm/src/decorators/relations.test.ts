import { beforeEach, describe, expect, it } from 'vitest'
import {
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn
} from './index.js'
import { MetadataStorage } from '../metadata/MetadataStorage.js'

describe('Relation decorators', () => {
  beforeEach(() => {
    ;(MetadataStorage.getInstance() as any).tables = new Map()
  })

  it('registers ManyToOne with JoinColumn metadata', () => {
    @Entity('profiles')
    class Profile {
      @PrimaryColumn()
      id!: number
    }

    @Entity('users')
    class User {
      @PrimaryColumn()
      id!: number

      @ManyToOne(() => Profile, 'users')
      @JoinColumn({ name: 'profile_id' })
      profile!: Profile
    }

    const metadata = MetadataStorage.getInstance().getTable(User)
    const relation = metadata?.relations.find(item => item.propertyName === 'profile')

    expect(relation?.type).toBe('many-to-one')
    expect(relation?.joinColumn?.name).toBe('profile_id')
  })

  it('registers OneToMany, OneToOne and ManyToMany metadata', () => {
    @Entity('roles')
    class Role {
      @PrimaryColumn()
      id!: number
    }

    @Entity('users')
    class User {
      @PrimaryColumn()
      id!: number

      @OneToOne(() => Role)
      leaderRole!: Role

      @OneToMany(() => Role, 'user')
      ownedRoles!: Role[]

      @ManyToMany(() => Role, 'users')
      @JoinTable({ name: 'user_roles' })
      roles!: Role[]
    }

    const metadata = MetadataStorage.getInstance().getTable(User)
    expect(metadata?.relations).toHaveLength(3)
    expect(metadata?.relations.find(item => item.propertyName === 'leaderRole')?.type).toBe('one-to-one')
    expect(metadata?.relations.find(item => item.propertyName === 'ownedRoles')?.type).toBe('one-to-many')
    expect(metadata?.relations.find(item => item.propertyName === 'roles')?.joinTable?.name).toBe('user_roles')
  })
})
