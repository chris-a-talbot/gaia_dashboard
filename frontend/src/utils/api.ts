import axios from 'axios';

// Import the TypeScript interfaces
import {
    Individual,
    Population,
    Hexagon,
    GeoArgPath,
    Flux,
    GeoArg,
    AverageFlux,
} from '../types/api-types'; // Assuming types are in a file named `types.ts`

// Backend API base URL
const API_BASE_URL = 'https://gaiadashboard-production.up.railway.app/api';

// Axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});

// API functions
export const getIndividuals = async (): Promise<Individual[]> => {
    const response = await api.get<Individual[]>('/individuals');
    console.log('Number of individuals received:', response.data.length);
    console.log('First few individuals:', response.data.slice(0, 3));
    return response.data;
};

export const getHexagons = async (): Promise<Hexagon[]> => {
    const response = await api.get<Hexagon[]>('/hexagons');
    return response.data;
};

export const getPopulations = async (): Promise<Population[]> => {
    const response = await api.get<Population[]>('/populations');
    return response.data;
};

export const getFlux = async (): Promise<Flux[]> => {
    const response = await api.get<Flux[]>('/flux');
    return response.data;
};

export const getAverageFlux = async (): Promise<AverageFlux[]> => {
    const response = await api.get<AverageFlux[]>('/average-flux');
    return response.data;
};

export const getGeoArgs = async (): Promise<GeoArg[]> => {
    const response = await api.get<GeoArg[]>('/geo-arg');
    return response.data;
};

export const getOriginPaths = async (stateId: number): Promise<GeoArgPath[]> => {
    const response = await api.get<GeoArgPath[]>(`/origin-paths/${stateId}`);
    return response.data;
};

export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
};

export const getIndividualPaths = async (individualId: number): Promise<GeoArgPath[]> => {
    const response = await api.get<GeoArgPath[]>(`/individual-paths/${individualId}`);
    return response.data;
};