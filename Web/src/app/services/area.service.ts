import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AreasApiService } from '../api/services/areas.service';
import { AreaResponse } from '../api/models/area-response';
import { CreateAreaRequest } from '../api/models/create-area-request';

@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly areasApi = inject(AreasApiService);

  createArea(request: CreateAreaRequest): Observable<AreaResponse> {
    return this.areasApi.createArea({ body: request });
  }
}
