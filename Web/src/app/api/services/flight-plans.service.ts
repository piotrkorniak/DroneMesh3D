import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalculateFlightPathRequest } from '../models/calculate-flight-path-request';
import { ExportFormat } from '../models/export-format';
import { FlightPlanResponse } from '../models/flight-plan-response';

@Injectable({ providedIn: 'root' })
export class FlightPlansApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/api/flight-plans';

  calculate(body: CalculateFlightPathRequest): Observable<FlightPlanResponse> {
    return this.http.post<FlightPlanResponse>(this.basePath, body);
  }

  getById(id: string): Observable<FlightPlanResponse> {
    return this.http.get<FlightPlanResponse>(`${this.basePath}/${id}`);
  }

  list(params?: { areaId?: string }): Observable<FlightPlanResponse[]> {
    let httpParams = new HttpParams();
    if (params?.areaId) {
      httpParams = httpParams.set('areaId', params.areaId);
    }
    return this.http.get<FlightPlanResponse[]>(this.basePath, { params: httpParams });
  }

  deleteFlightPlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }

  exportMissionFile(id: string, format: ExportFormat): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.basePath}/${id}/export`, {
      params: new HttpParams().set('format', format),
      responseType: 'blob',
      observe: 'response',
    });
  }
}
