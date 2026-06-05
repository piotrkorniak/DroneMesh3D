import * as fc from 'fast-check';
import { HttpErrorResponse } from '@angular/common/http';
import { classifyApiError } from './error-handler';
import { ValidationErrorResponse } from '../models/validation-error-response';

/**
 * Property-Based Tests for ValidationErrorResponse Parsing
 *
 * **Validates: Requirements 6.3**
 *
 * Feature: frontend-api-integration, Property 10: ValidationErrorResponse parsing preserves all fields
 *
 * For any JSON string that is a valid serialized ValidationErrorResponse (with any message string
 * and any array of error strings), parsing it shall produce an object with the same message and
 * the same list of errors in the same order.
 */
describe('Feature: frontend-api-integration, Property 10: ValidationErrorResponse parsing preserves all fields', () => {

  /**
   * Generates an arbitrary ValidationErrorResponse with a message string
   * and a non-empty array of error strings.
   */
  function arbValidationErrorResponse(): fc.Arbitrary<ValidationErrorResponse> {
    return fc.record({
      message: fc.string({ minLength: 1, maxLength: 200 }),
      errors: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 20 }),
    });
  }

  // **Validates: Requirements 6.3**

  it('should preserve message and errors array when classifying a 422 HttpErrorResponse', () => {
    const result = fc.check(
      fc.property(
        arbValidationErrorResponse(),
        (validationError) => {
          // Create an HttpErrorResponse with status 422 and the validation error body
          const httpError = new HttpErrorResponse({
            status: 422,
            statusText: 'Unprocessable Entity',
            error: validationError,
          });

          const classified = classifyApiError(httpError);

          // Assert message is preserved
          if (classified.message !== validationError.message) return false;

          // Assert errors array is present and preserved
          const classifiedAsValidation = classified as ValidationErrorResponse;
          if (!classifiedAsValidation.errors) return false;
          if (classifiedAsValidation.errors.length !== validationError.errors.length) return false;

          // Assert each error string is preserved in order
          for (let i = 0; i < validationError.errors.length; i++) {
            if (classifiedAsValidation.errors[i] !== validationError.errors[i]) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );

    expect(result.failed).toBeFalse();
  });
});
