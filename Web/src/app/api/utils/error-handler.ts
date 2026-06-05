import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse, ValidationErrorResponse } from '../models';

/**
 * Classifies an HTTP error response into a typed error object.
 * Used by components to display user-friendly error messages.
 */
export function classifyApiError(error: HttpErrorResponse): ErrorResponse | ValidationErrorResponse {
  if (error.status === 0) {
    return { message: 'Server is unreachable. Check your connection.' };
  }
  if (error.status === 422 && error.error?.errors) {
    return error.error as ValidationErrorResponse;
  }
  if (error.error?.message) {
    return { message: error.error.message };
  }
  return { message: `Unexpected error (HTTP ${error.status}).` };
}
