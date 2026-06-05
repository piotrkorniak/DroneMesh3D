import { HttpResponse, HttpHeaders } from '@angular/common/http';
import { extractFilename, triggerBlobDownload } from './file-download';

describe('file-download utilities', () => {
  describe('extractFilename', () => {
    it('should extract quoted filename from Content-Disposition', () => {
      const result = extractFilename('attachment; filename="file.csv"');
      expect(result).toBe('file.csv');
    });

    it('should extract unquoted filename from Content-Disposition', () => {
      const result = extractFilename('attachment; filename=file.csv');
      expect(result).toBe('file.csv');
    });

    it('should return "download" when Content-Disposition is null', () => {
      const result = extractFilename(null);
      expect(result).toBe('download');
    });

    it('should return "download" when Content-Disposition is empty string', () => {
      const result = extractFilename('');
      expect(result).toBe('download');
    });

    it('should handle filename with spaces in quotes', () => {
      const result = extractFilename('attachment; filename="flight plan.kml"');
      expect(result).toBe('flight plan.kml');
    });

    it('should handle filename with special characters', () => {
      const result = extractFilename('attachment; filename="plan-2024_01.csv"');
      expect(result).toBe('plan-2024_01.csv');
    });
  });

  describe('triggerBlobDownload', () => {
    let createObjectURLSpy: jasmine.Spy;
    let revokeObjectURLSpy: jasmine.Spy;
    let createElementSpy: jasmine.Spy;
    let mockAnchor: { href: string; download: string; click: jasmine.Spy };

    beforeEach(() => {
      createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/fake-url');
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
      mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
      createElementSpy = spyOn(document, 'createElement').and.returnValue(mockAnchor as unknown as HTMLElement);
    });

    it('should create an object URL, trigger download via anchor click, and revoke URL', () => {
      const blob = new Blob(['test content'], { type: 'text/csv' });
      const headers = new HttpHeaders({ 'Content-Disposition': 'attachment; filename="export.csv"' });
      const response = new HttpResponse({ body: blob, headers });

      triggerBlobDownload(response);

      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('blob:http://localhost/fake-url');
      expect(mockAnchor.download).toBe('export.csv');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-url');
    });

    it('should not attempt download when response body is null', () => {
      const headers = new HttpHeaders({ 'Content-Disposition': 'attachment; filename="export.csv"' });
      const response = new HttpResponse<Blob>({ body: null, headers });

      triggerBlobDownload(response);

      expect(createObjectURLSpy).not.toHaveBeenCalled();
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });

    it('should use fallback filename when Content-Disposition is missing', () => {
      const blob = new Blob(['test'], { type: 'application/octet-stream' });
      const response = new HttpResponse({ body: blob });

      triggerBlobDownload(response);

      expect(mockAnchor.download).toBe('download');
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });
});
