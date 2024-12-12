// services/api.ts

import { Individual, FluxEntry, GeorefEntry } from '../types/types';

const API_BASE_URL = 'https://gaiadashboard-production.up.railway.app/api';

// Error handling utility
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// API service object
export const api = {
    // Health check
    async checkHealth() {
        const response = await fetch(`${API_BASE_URL}/health`);
        return handleResponse<{ status: string; timestamp: string }>(response);
    },

    // Individuals
    async getAllIndividuals() {
        const response = await fetch(`${API_BASE_URL}/individuals`);
        return handleResponse<Individual[]>(response);
    },

    // Hexagons with geometry
    async getAllHexagons() {
        const response = await fetch(`${API_BASE_URL}/hexagons`);
        return handleResponse<GeoJSON.FeatureCollection>(response);
    },

    // Population metadata
    async getAllPopulations() {
        const response = await fetch(`${API_BASE_URL}/populations`);
        return handleResponse<Array<{
            id: number;
            name: string;
            region: string;
        }>>(response);
    },

    // Flux data
    async getAllFlux() {
        const response = await fetch(`${API_BASE_URL}/flux`);
        return handleResponse<FluxEntry[]>(response);
    },

    // Geographic argument paths
    async getAllGeoArg() {
        const response = await fetch(`${API_BASE_URL}/geo-arg`);
        return handleResponse<GeorefEntry[]>(response);
    },

    // Origin paths for a specific state
    async getOriginPaths(stateId: number) {
        const response = await fetch(`${API_BASE_URL}/origin-paths/${stateId}`);
        return handleResponse<Array<{
            edge_id: number;
            entries: GeorefEntry[];
        }>>(response);
    }
};