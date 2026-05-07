import client from './client';
import type { Rate } from '@/types';

export interface CreateRateRequest {
  costCenterId: string;
  billableTeamCode: string;
  monthlyRateK: number;
  effectiveFrom: string;
  billable: boolean;
}

export const ratesApi = {
  list: async (): Promise<Rate[]> => {
    const response = await client.get<Rate[]>('/api/v1/rates');
    return response.data;
  },

  getById: async (id: number): Promise<Rate> => {
    const response = await client.get<Rate>(`/api/v1/rates/${id}`);
    return response.data;
  },

  getActive: async (costCenterId: string, billableTeamCode: string): Promise<Rate | null> => {
    try {
      const response = await client.get<Rate>('/api/v1/rates/active', {
        params: { costCenterId, billableTeamCode },
      });
      return response.data;
    } catch {
      return null;
    }
  },

  create: async (request: CreateRateRequest): Promise<Rate> => {
    const response = await client.post<Rate>('/api/v1/rates', request);
    return response.data;
  },

  getForResource: async (resourceId: number): Promise<Rate[]> => {
    const resourceResponse = await client.get(`/api/v1/resources/${resourceId}`);
    const costCenterId = resourceResponse.data.costCenterId;
    const billableTeamCode = resourceResponse.data.billableTeamCode;

    // Get all rates for this cost center + team combination
    const allRates = await client.get<Rate[]>('/api/v1/rates');
    return allRates.data.filter(
      r => r.costCenterId === costCenterId && r.billableTeamCode === billableTeamCode
    );
  },
};