import { HttpErrorResponse } from '@angular/common/http';
import { classifyApiError } from './error-handler';
import { ValidationErrorResponse } from '../models';

describe('error-handler utility', () => {
  describe('classifyApiError', () => {
    it('should return "Server is unreachable" message for status 0 (network error)', () => {
      const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

      const result = classifyApiError(error);

      expect(result.message).toBe('Server is unreachable. Check your connection.');
    });

    it('should return ValidationErrorResponse for status 422 with errors array', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: {
          message: 'Validation failed',
          errors: ['Field X is required', 'Field Y must be positive'],
        },
      });

      const result = classifyApiError(error) as ValidationErrorResponse;

      expect(result.message).toBe('Validation failed');
      expect(result.errors).toEqual(['Field X is required', 'Field Y must be positive']);
    });

    it('should return message from body for status 500', () => {
      const error = new HttpErrorResponse({
        status: 500,
        error: { message: 'Internal server error occurred' },
      });

      const result = classifyApiError(error);

      expect(result.message).toBe('Internal server error occurred');
    });

    it('should return message from body for status 404', () => {
      const error = new HttpErrorResponse({
        status: 404,
        error: { message: 'Flight plan not found' },
      });

      const result = classifyApiError(error);

      expect(result.message).toBe('Flight plan not found');
    });

    it('should return fallback message with status code for unknown status without message', () => {
      const error = new HttpErrorResponse({
        status: 503,
        error: null,
      });

      const result = classifyApiError(error);

      expect(result.message).toBe('Unexpected error (HTTP 503).');
    });

    it('should return fallback message when error body has no message field', () => {
      const error = new HttpErrorResponse({
        status: 502,
        error: { detail: 'some other field' },
      });

      const result = classifyApiError(error);

      expect(result.message).toBe('Unexpected error (HTTP 502).');
    });

    it('should handle 422 without errors array by falling through to message check', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: { message: 'Unprocessable entity' },
      });

      const result = classifyApiError(error);

      expect(result.message).toBe('Unprocessable entity');
      expect((result as ValidationErrorResponse).errors).toBeUndefined();
    });
  });
});
