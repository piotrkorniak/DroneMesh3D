import * as fc from 'fast-check';
import { extractFilename } from '../utils/file-download';

/**
 * Property-Based Tests for Content-Disposition Filename Extraction
 *
 * **Validates: Requirements 5.2**
 *
 * Property 9: Content-Disposition filename extraction
 * - For any valid Content-Disposition header value containing a filename parameter
 *   (with or without quotes, with various filename characters),
 *   extractFilename shall correctly parse and return the filename string.
 */
describe('Feature: frontend-api-integration, Property 9: Content-Disposition filename extraction', () => {
  const FILENAME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._'.split('');
  const BASE_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.split('');
  const EXT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

  /**
   * Generates a valid filename string using characters commonly valid in filenames:
   * alphanumeric, dashes, dots, and underscores.
   */
  function arbFilename(): fc.Arbitrary<string> {
    return fc.array(fc.constantFrom(...FILENAME_CHARS), { minLength: 1, maxLength: 50 })
      .map(chars => chars.join(''));
  }

  /**
   * Generates a filename with an extension (e.g., "report.csv", "flight-plan.kml")
   */
  function arbFilenameWithExtension(): fc.Arbitrary<string> {
    const arbBaseName = fc.array(fc.constantFrom(...BASE_NAME_CHARS), { minLength: 1, maxLength: 30 })
      .map(chars => chars.join(''));
    const arbExtension = fc.array(fc.constantFrom(...EXT_CHARS), { minLength: 1, maxLength: 5 })
      .map(chars => chars.join(''));
    return fc.tuple(arbBaseName, arbExtension).map(([base, ext]) => `${base}.${ext}`);
  }

  // **Validates: Requirements 5.2**

  it('should extract filename from quoted Content-Disposition header', () => {
    const result = fc.check(
      fc.property(
        arbFilenameWithExtension(),
        (filename) => {
          const header = `attachment; filename="${filename}"`;
          const extracted = extractFilename(header);
          return extracted === filename;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should extract filename from unquoted Content-Disposition header', () => {
    const result = fc.check(
      fc.property(
        arbFilenameWithExtension(),
        (filename) => {
          const header = `attachment; filename=${filename}`;
          const extracted = extractFilename(header);
          return extracted === filename;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should extract filename with various valid characters (alphanumeric, dashes, dots, underscores)', () => {
    const result = fc.check(
      fc.property(
        arbFilename(),
        (filename) => {
          const quotedHeader = `attachment; filename="${filename}"`;
          const extracted = extractFilename(quotedHeader);
          return extracted === filename;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });

  it('should return default "download" when Content-Disposition is null', () => {
    const extracted = extractFilename(null);
    expect(extracted).toBe('download');
  });
});
