import { describe, expect, test } from 'vitest';

import { run } from '../src/index';

describe('module export', () => {
  test('should export something', () => {
    expect(typeof run).toBe('function');
  });
});
