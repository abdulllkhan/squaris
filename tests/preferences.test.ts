import { parseDifficulty, parseMode3D } from '../src/lib/preferences';

describe('parseDifficulty', () => {
  it('returns valid difficulties unchanged', () => {
    expect(parseDifficulty('easy')).toBe('easy');
    expect(parseDifficulty('medium')).toBe('medium');
    expect(parseDifficulty('difficult')).toBe('difficult');
  });

  it("defaults to 'medium' on null (key not present in storage)", () => {
    expect(parseDifficulty(null)).toBe('medium');
  });

  it("defaults to 'medium' on empty string", () => {
    expect(parseDifficulty('')).toBe('medium');
  });

  it("defaults to 'medium' on garbage values (corrupted/manually edited storage)", () => {
    expect(parseDifficulty('hard')).toBe('medium');         // not a valid enum member
    expect(parseDifficulty('EASY')).toBe('medium');          // case-sensitive
    expect(parseDifficulty('{}')).toBe('medium');            // serialised noise
    expect(parseDifficulty('null')).toBe('medium');
    expect(parseDifficulty('undefined')).toBe('medium');
  });

  it('handles undefined the same as null', () => {
    expect(parseDifficulty(undefined)).toBe('medium');
  });
});

describe('parseMode3D', () => {
  it('returns valid modes unchanged', () => {
    expect(parseMode3D('cubes')).toBe('cubes');
    expect(parseMode3D('bent')).toBe('bent');
  });

  it("defaults to 'cubes' on null", () => {
    expect(parseMode3D(null)).toBe('cubes');
  });

  it("defaults to 'cubes' on empty string", () => {
    expect(parseMode3D('')).toBe('cubes');
  });

  it("defaults to 'cubes' on garbage values", () => {
    expect(parseMode3D('CUBES')).toBe('cubes');
    expect(parseMode3D('3d')).toBe('cubes');
    expect(parseMode3D('null')).toBe('cubes');
  });

  it('handles undefined the same as null', () => {
    expect(parseMode3D(undefined)).toBe('cubes');
  });
});
