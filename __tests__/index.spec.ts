import { mkdtempSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { describe, expect, test } from 'vitest';
import { KubeConfig } from '@kubernetes/client-node';

import { isMainModule, parseArgs, resolveNamespace, run } from '../src/index';

const testFilePath = fileURLToPath(import.meta.url);

describe('module export', () => {
  test('should export something', () => {
    expect(typeof run).toBe('function');
  });
});

describe('namespace', () => {
  function kubeConfig(namespace?: string) {
    const config = new KubeConfig();
    config.loadFromOptions({
      clusters: [],
      users: [],
      contexts: [{ name: 'test', cluster: '', user: '', namespace }],
      currentContext: 'test',
    });
    return config;
  }

  test('uses the namespace from the current context', () => {
    expect(resolveNamespace(kubeConfig('current-namespace'))).toBe('current-namespace');
  });

  test('uses default when the current context has no namespace', () => {
    expect(resolveNamespace(kubeConfig())).toBe('default');
  });

  test('allows the namespace to be overridden', () => {
    expect(resolveNamespace(kubeConfig('current-namespace'), 'override-namespace')).toBe(
      'override-namespace',
    );
  });

  test('parses -n as a namespace override', () => {
    expect(parseArgs(['-n', 'override-namespace']).namespace).toBe('override-namespace');
  });
});

describe('isMainModule', () => {
  test('returns the native import.meta.main value when available', () => {
    expect(isMainModule('file:///other.js', '/other.js', true)).toBe(true);
    expect(isMainModule(pathToFileURL(testFilePath).href, testFilePath, false)).toBe(false);
  });

  test('returns true when the module path is argv[1]', () => {
    const moduleUrl = pathToFileURL(testFilePath).href;

    expect(isMainModule(moduleUrl, testFilePath, null)).toBe(true);
  });

  test('returns true when argv[1] is a symlink to the module', () => {
    const dir = mkdtempSync(join(tmpdir(), 'k8s-run-'));
    const binPath = join(dir, 'k8s-run');
    symlinkSync(testFilePath, binPath);

    expect(isMainModule(pathToFileURL(testFilePath).href, binPath, null)).toBe(true);
  });

  test('returns false when argv[1] is missing', () => {
    expect(isMainModule(pathToFileURL(testFilePath).href, undefined, null)).toBe(false);
  });
});
