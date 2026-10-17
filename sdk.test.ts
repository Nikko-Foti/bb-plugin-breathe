import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_scanPublicSdkOnly } from '@get-bb/plugin-sdk/testing';
it('uses only public SDK and declared package imports', () => {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  const allow = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map(name => new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(/.*)?$'));
  // Claude's native test runner supplies this public host module; it is not an npm dependency.
  allow.push(/^claude-code\/testing$/);
  const result = experimental_scanPublicSdkOnly(new URL('.', import.meta.url).pathname, { allow });
  // Claude writes editor declaration files at runtime; these are ignored by Git
  // and are not plugin source. The scanner also matches imports inside their docs.
  expect(result.violations.filter(item => !item.file.startsWith('claude/.claude-plugin/types/'))).toEqual([]);
  expect(result.privateDependencies).toEqual([]);
});
