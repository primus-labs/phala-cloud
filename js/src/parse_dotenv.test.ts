import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEnv, parseEnvVars } from './parse_dotenv';
import type { EnvVar } from "@phala/dstack-sdk/encrypt-env-vars";

describe('parseEnv', () => {
  it('should return an object', () => {
    const result = parseEnv('TEST=value');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  describe('basic parsing', () => {
    const envContent = fs.readFileSync(path.join(__dirname, '../tests/env-basic'), { encoding: 'utf8' });
    const parsed = parseEnv(envContent);

    it('sets basic environment variable', () => {
      expect(parsed.BASIC).toBe('basic');
    });

    it('reads after a skipped line', () => {
      expect(parsed.AFTER_LINE).toBe('after_line');
    });

    it('defaults empty values to empty string', () => {
      expect(parsed.EMPTY).toBe('');
    });

    it('defaults empty single quoted values to empty string', () => {
      expect(parsed.EMPTY_SINGLE_QUOTES).toBe('');
    });

    it('defaults empty double quoted values to empty string', () => {
      expect(parsed.EMPTY_DOUBLE_QUOTES).toBe('');
    });

    it('defaults empty backtick values to empty string', () => {
      expect(parsed.EMPTY_BACKTICKS).toBe('');
    });

    it('escapes single quoted values', () => {
      expect(parsed.SINGLE_QUOTES).toBe('single_quotes');
    });

    it('respects surrounding spaces in single quotes', () => {
      expect(parsed.SINGLE_QUOTES_SPACED).toBe('    single quotes    ');
    });

    it('escapes double quoted values', () => {
      expect(parsed.DOUBLE_QUOTES).toBe('double_quotes');
    });

    it('respects surrounding spaces in double quotes', () => {
      expect(parsed.DOUBLE_QUOTES_SPACED).toBe('    double quotes    ');
    });

    it('respects double quotes inside single quotes', () => {
      expect(parsed.DOUBLE_QUOTES_INSIDE_SINGLE).toBe('double "quotes" work inside single quotes');
    });

    it('respects spacing for badly formed brackets', () => {
      expect(parsed.DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET).toBe('{ port: $MONGOLAB_PORT}');
    });

    it('respects single quotes inside double quotes', () => {
      expect(parsed.SINGLE_QUOTES_INSIDE_DOUBLE).toBe("single 'quotes' work inside double quotes");
    });

    it('respects backticks inside single quotes', () => {
      expect(parsed.BACKTICKS_INSIDE_SINGLE).toBe('`backticks` work inside single quotes');
    });

    it('respects backticks inside double quotes', () => {
      expect(parsed.BACKTICKS_INSIDE_DOUBLE).toBe('`backticks` work inside double quotes');
    });

    it('parses backticks', () => {
      expect(parsed.BACKTICKS).toBe('backticks');
    });

    it('respects surrounding spaces in backticks', () => {
      expect(parsed.BACKTICKS_SPACED).toBe('    backticks    ');
    });

    it('respects double quotes inside backticks', () => {
      expect(parsed.DOUBLE_QUOTES_INSIDE_BACKTICKS).toBe('double "quotes" work inside backticks');
    });

    it('respects single quotes inside backticks', () => {
      expect(parsed.SINGLE_QUOTES_INSIDE_BACKTICKS).toBe("single 'quotes' work inside backticks");
    });

    it('respects single quotes inside backticks', () => {
      expect(parsed.DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS).toBe("double \"quotes\" and single 'quotes' work inside backticks");
    });

    it('expands newlines but only if double quoted', () => {
      expect(parsed.EXPAND_NEWLINES).toBe('expand\nnew\nlines');
    });

    it('does not expand newlines if unquoted', () => {
      expect(parsed.DONT_EXPAND_UNQUOTED).toBe('dontexpand\\nnewlines');
    });

    it('does not expand newlines if single quoted', () => {
      expect(parsed.DONT_EXPAND_SQUOTED).toBe('dontexpand\\nnewlines');
    });

    it('ignores commented lines', () => {
      expect(parsed.COMMENTS).toBeUndefined();
    });

    it('ignores inline comments', () => {
      expect(parsed.INLINE_COMMENTS).toBe('inline comments');
    });

    it('ignores inline comments and respects # character inside of single quotes', () => {
      expect(parsed.INLINE_COMMENTS_SINGLE_QUOTES).toBe('inline comments outside of #singlequotes');
    });

    it('ignores inline comments and respects # character inside of double quotes', () => {
      expect(parsed.INLINE_COMMENTS_DOUBLE_QUOTES).toBe('inline comments outside of #doublequotes');
    });

    it('ignores inline comments and respects # character inside of backticks', () => {
      expect(parsed.INLINE_COMMENTS_BACKTICKS).toBe('inline comments outside of #backticks');
    });

    it('treats # character as start of comment', () => {
      expect(parsed.INLINE_COMMENTS_SPACE).toBe('inline comments start with a');
    });

    it('respects equals signs in values', () => {
      expect(parsed.EQUAL_SIGNS).toBe('equals==');
    });

    it('retains inner quotes', () => {
      expect(parsed.RETAIN_INNER_QUOTES).toBe('{"foo": "bar"}');
    });

    it('retains inner quotes as string', () => {
      expect(parsed.RETAIN_INNER_QUOTES_AS_STRING).toBe('{"foo": "bar"}');
    });

    it('retains inner quotes as backticks', () => {
      expect(parsed.RETAIN_INNER_QUOTES_AS_BACKTICKS).toBe('{"foo": "bar\'s"}');
    });

    it('retains spaces in string', () => {
      expect(parsed.TRIM_SPACE_FROM_UNQUOTED).toBe('some spaced out string');
    });

    it('parses email addresses completely', () => {
      expect(parsed.USERNAME).toBe('therealnerdybeast@example.tld');
    });

    it('parses keys and values surrounded by spaces', () => {
      expect(parsed.SPACED_KEY).toBe('parsed');
    });
  });

  describe('buffer parsing', () => {
    it('should parse a buffer into an object', () => {
      const result = parseEnv(Buffer.from('BUFFER=true'));
      expect(result.BUFFER).toBe('true');
    });
  });

  describe('line endings', () => {
    const expectedPayload = { SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' };

    it('can parse (\\r) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\rPASSWORD=password\rDB=tests\r'));
      expect(result).toEqual(expectedPayload);
    });

    it('can parse (\\n) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\nPASSWORD=password\nDB=tests\n'));
      expect(result).toEqual(expectedPayload);
    });

    it('can parse (\\r\\n) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n'));
      expect(result).toEqual(expectedPayload);
    });
  });
});

describe('parseEnvVars', () => {
  // Helper function to convert EnvVar array to object for easier testing
  function toObject(envVars: EnvVar[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const { key, value } of envVars) {
      result[key] = value;
    }
    return result;
  }

  it('should return an array', () => {
    const result = parseEnvVars('TEST=value');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should convert parse results to EnvVar array', () => {
    const envContent = fs.readFileSync(path.join(__dirname, '../tests/env-basic'), { encoding: 'utf8' });
    const parsed = toObject(parseEnvVars(envContent));
    
    expect(parsed.BASIC).toBe('basic');
    expect(parsed.AFTER_LINE).toBe('after_line');
  });

  describe('buffer parsing', () => {
    it('should parse a buffer into an array', () => {
      const result = toObject(parseEnvVars(Buffer.from('BUFFER=true')));
      expect(result.BUFFER).toBe('true');
    });
  });
});


describe('parseEnv multiline', () => {
  const envContent = fs.readFileSync(path.join(__dirname, '../tests/env-multiline'), { encoding: 'utf8' });
  const parsed = parseEnv(envContent);

  it('should return an object', () => {
    expect(typeof parsed).toBe('object');
    expect(parsed).not.toBeNull();
  });

  it('sets basic environment variable', () => {
    expect(parsed.BASIC).toBe('basic');
  });

  it('reads after a skipped line', () => {
    expect(parsed.AFTER_LINE).toBe('after_line');
  });

  it('defaults empty values to empty string', () => {
    expect(parsed.EMPTY).toBe('');
  });

  it('escapes single quoted values', () => {
    expect(parsed.SINGLE_QUOTES).toBe('single_quotes');
  });

  it('respects surrounding spaces in single quotes', () => {
    expect(parsed.SINGLE_QUOTES_SPACED).toBe('    single quotes    ');
  });

  it('escapes double quoted values', () => {
    expect(parsed.DOUBLE_QUOTES).toBe('double_quotes');
  });

  it('respects surrounding spaces in double quotes', () => {
    expect(parsed.DOUBLE_QUOTES_SPACED).toBe('    double quotes    ');
  });

  it('expands newlines but only if double quoted', () => {
    expect(parsed.EXPAND_NEWLINES).toBe('expand\nnew\nlines');
  });

  it('does not expand newlines if unquoted', () => {
    expect(parsed.DONT_EXPAND_UNQUOTED).toBe('dontexpand\\nnewlines');
  });

  it('does not expand newlines if single quoted', () => {
    expect(parsed.DONT_EXPAND_SQUOTED).toBe('dontexpand\\nnewlines');
  });

  it('ignores commented lines', () => {
    expect(parsed.COMMENTS).toBeUndefined();
  });

  it('respects equals signs in values', () => {
    expect(parsed.EQUAL_SIGNS).toBe('equals==');
  });

  it('retains inner quotes', () => {
    expect(parsed.RETAIN_INNER_QUOTES).toBe('{"foo": "bar"}');
  });

  it('retains inner quotes as string', () => {
    expect(parsed.RETAIN_INNER_QUOTES_AS_STRING).toBe('{"foo": "bar"}');
  });

  it('retains spaces in string', () => {
    expect(parsed.TRIM_SPACE_FROM_UNQUOTED).toBe('some spaced out string');
  });

  it('parses email addresses completely', () => {
    expect(parsed.USERNAME).toBe('therealnerdybeast@example.tld');
  });

  it('parses keys and values surrounded by spaces', () => {
    expect(parsed.SPACED_KEY).toBe('parsed');
  });

  it('parses multi-line strings when using double quotes', () => {
    expect(parsed.MULTI_DOUBLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
  });

  it('parses multi-line strings when using single quotes', () => {
    expect(parsed.MULTI_SINGLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
  });

  it('parses multi-line strings when using backticks', () => {
    expect(parsed.MULTI_BACKTICKED).toBe('THIS\nIS\nA\n"MULTILINE\'S"\nSTRING');
  });

  it('parses multi-line PEM certificates', () => {
    const multiPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNl1tL3QjKp3DZWM0T3u
LgGJQwu9WqyzHKZ6WIA5T+7zPjO1L8l3S8k8YzBrfH4mqWOD1GBI8Yjq2L1ac3Y/
bTdfHN8CmQr2iDJC0C6zY8YV93oZB3x0zC/LPbRYpF8f6OqX1lZj5vo2zJZy4fI/
kKcI5jHYc8VJq+KCuRZrvn+3V+KuL9tF9v8ZgjF2PZbU+LsCy5Yqg1M8f5Jp5f6V
u4QuUoobAgMBAAE=
-----END PUBLIC KEY-----`;
    expect(parsed.MULTI_PEM_DOUBLE_QUOTED).toBe(multiPem);
  });

  describe('buffer parsing', () => {
    it('should parse a buffer into an object', () => {
      const result = parseEnv(Buffer.from('BUFFER=true'));
      expect(result.BUFFER).toBe('true');
    });
  });

  describe('line endings', () => {
    const expectedPayload = { SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' };

    it('can parse (\\r) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\rPASSWORD=password\rDB=tests\r'));
      expect(result).toEqual(expectedPayload);
    });

    it('can parse (\\n) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\nPASSWORD=password\nDB=tests\n'));
      expect(result).toEqual(expectedPayload);
    });

    it('can parse (\\r\\n) line endings', () => {
      const result = parseEnv(Buffer.from('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n'));
      expect(result).toEqual(expectedPayload);
    });
  });

  describe('additional multiline tests', () => {
    // Helper function to convert EnvVar array to object for easier testing
    function toObject(envVars: EnvVar[]): Record<string, string> {
      const result: Record<string, string> = {};
      for (const { key, value } of envVars) {
        result[key] = value;
      }
      return result;
    }

    it('parseEnvVars should work with multiline content', () => {
      const result = toObject(parseEnvVars(envContent));
      expect(result.MULTI_DOUBLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
      expect(result.MULTI_SINGLE_QUOTED).toBe('THIS\nIS\nA\nMULTILINE\nSTRING');
    });
  });
});