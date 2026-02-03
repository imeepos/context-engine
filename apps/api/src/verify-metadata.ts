import 'reflect-metadata';
import { GitController } from './controllers/git.controller';
import { GitService } from './services/git.service';
import { SyncService } from './services/git';
import { DataSource } from '@sker/typeorm';

console.log('=== Verifying Decorator Metadata ===\n');

// Check GitController
console.log('GitController constructor parameter types:');
const gitControllerParams = Reflect.getMetadata('design:paramtypes', GitController);
if (gitControllerParams) {
  console.log('  Found', gitControllerParams.length, 'parameters:');
  gitControllerParams.forEach((param: any, index: number) => {
    console.log(`  [${index}]:`, param?.name || 'undefined');
  });
} else {
  console.log('  ❌ NO METADATA FOUND');
}

console.log('\nGitService constructor parameter types:');
const gitServiceParams = Reflect.getMetadata('design:paramtypes', GitService);
if (gitServiceParams) {
  console.log('  Found', gitServiceParams.length, 'parameters:');
  gitServiceParams.forEach((param: any, index: number) => {
    console.log(`  [${index}]:`, param?.name || 'undefined');
  });
} else {
  console.log('  ❌ NO METADATA FOUND');
}

console.log('\nSyncService constructor parameter types:');
const syncServiceParams = Reflect.getMetadata('design:paramtypes', SyncService);
if (syncServiceParams) {
  console.log('  Found', syncServiceParams.length, 'parameters:');
  syncServiceParams.forEach((param: any, index: number) => {
    console.log(`  [${index}]:`, param?.name || 'undefined');
  });
} else {
  console.log('  ❌ NO METADATA FOUND');
}

console.log('\n=== Verification Complete ===');
