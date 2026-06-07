/**
 * DroneMesh3D API - Areas Service
 * Auto-generated stub — will be replaced by openapi-generator output.
 * Run `npm run api:generate` with the backend running to regenerate.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AreaResponse } from '../models/area-response';
import { CreateAreaRequest } from '../models/create-area-request';

export interface CreateAreaRequestParams {
  body: CreateAreaRequest;
}

@Injectable({ providedIn: 'root' })
export class AreasApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = '/api';

  createArea(params: CreateAreaRequestParams): Observable<AreaResponse> {
    return this.http.post<AreaResponse>(`${this.basePath}/areas`, params.body);
  }

  getArea(id: string): Observable<AreaResponse> {
    return this.http.get<AreaResponse>(`${this.basePath}/areas/${id}`);
  }

  listAreas(): Observable<AreaResponse[]> {
    return this.http.get<AreaResponse[]>(`${this.basePath}/areas`);
  }

  deleteArea(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/areas/${id}`);
  }
}
