import { HttpResponse } from '@angular/common/http';

/**
 * Parse the filename from a Content-Disposition header value.
 * Handles both quoted and unquoted filenames, e.g.:
 *   attachment; filename="flight-plan-abc.csv"
 *   attachment; filename=flight-plan-abc.csv
 *
 * Returns a fallback value ('download') if no valid filename is found.
 */
export function extractFilename(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return 'download';
  }

  const match = contentDisposition.match(/filename\s*=\s*"?([^";\n]+)"?/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return 'download';
}

/**
 * Trigger a browser file download from an HttpResponse containing a Blob body.
 * Extracts the filename from the Content-Disposition header, creates an Object URL,
 * triggers a click on a temporary anchor element, then revokes the URL.
 */
export function triggerBlobDownload(response: HttpResponse<Blob>): void {
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = extractFilename(contentDisposition);
  const blob = response.body;

  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
