import { TransactionIsolationLevel } from '../metadata/types.js'
import { DataSource } from '../data-source/DataSource.js'

export interface TransactionalOptions {
  isolationLevel?: TransactionIsolationLevel
  dataSourceKey?: string
}

export function Transactional(options?: TransactionalOptions): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const dataSource = resolveDataSource(this, options?.dataSourceKey)
      if (!dataSource) {
        throw new Error('No DataSource available for @Transactional method')
      }

      return dataSource.transaction(
        async () => original.apply(this, args),
        options?.isolationLevel
      )
    }

    return descriptor
  }
}

function resolveDataSource(instance: any, dataSourceKey = 'dataSource'): DataSource | undefined {
  if (instance?.[dataSourceKey] instanceof DataSource) {
    return instance[dataSourceKey]
  }

  return DataSource.getDefault()
}
