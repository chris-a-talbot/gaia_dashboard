// ============================================================================
// types.ts
// Core type definitions for the Gaia visualization application.
// ============================================================================

import { Feature, FeatureCollection } from 'geojson';

// ============================================================================
// Base Types
// ============================================================================

export type Position = [number, number];

export interface HoverInfo {
    x: number;
    y: number;
    object: any;
}

// ============================================================================
// Individual & Point Data
// ============================================================================

export interface Individual {
    individual_id: number;
    flags: number;
    location: {
        type: string;
        coordinates: [number, number];
    };
    parents: number[];
    nodes: number[];
    array_non_reference_discordance?: number;
    capmq?: number;
    coverage?: number;
    freemix?: number;
    insert_size_average?: number;
    library?: string;
    library_type?: string;
    region?: string;
    sample?: string;
    sample_accession?: string;
    sex?: string;
    source?: string;
}

export interface PointData {
    individual_id: number;  // This will be the individual's id
    longitude: number;
    latitude: number;
    metadata: Omit<Individual, 'id' | 'location'>;
}

export interface PointHoverInfo extends HoverInfo {
    object: PointData;
}

// ============================================================================
// Clustering Types
// ============================================================================

export interface PointCluster {
    latitude: number;
    longitude: number;
    points: PointData[];
}

export interface ExpandedPointData extends PointData {
    displayLat: number;
    displayLon: number;
}

export interface ExpandedClusterData {
    cluster: PointCluster;
    expandedPoints: ExpandedPointData[];
}

// ============================================================================
// Geographic Data
// ============================================================================

export interface GeoJsonData extends FeatureCollection {
    length?: number;
    type: 'FeatureCollection';
    features: Feature[];
}

export interface HexagonProperties {
    state_id: number;
    continent_id: string;
    center_lat: number;
    center_lon: number;
}

export interface HexagonFeature extends Feature {
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    properties: HexagonProperties;
}

export interface HexagonHoverInfo extends HoverInfo {
    object: {
        properties: HexagonProperties;
    };
}

// ============================================================================
// Aggregation Types
// ============================================================================

export interface AggregatePointData {
    cellId: number;
    position: [number, number];
    pointCount: number;
    points: PointData[];
}

export interface AggregatePointHoverInfo extends HoverInfo {
    object: {
        cellId: number;
        pointCount: number;
        position: [number, number];
    };
}

// ============================================================================
// Flux & Migration Types
// ============================================================================

export interface FluxEntry {
    source_id: number;
    target_id: number;
    value: number;
}

export interface RawFluxData {
    time_series: FluxEntry[][];
}

export interface FluxArcData {
    sourcePosition: Position;
    targetPosition: Position;
    value: number;
    sourceId: number;
    targetId: number;
    normalizedValue: number;
}

export interface ArrowPathData {
    path: Position[];
    sourceId: number;
    targetId: number;
    value: number;
    normalizedValue: number;
}

export interface FluxArrowLayerProps {
    id: string;
    data: {
        sourcePosition: Position;
        targetPosition: Position;
        sourceId: number;
        targetId: number;
        value: number;
        normalizedValue: number;
    }[];
    pickable?: boolean;
    onHover?: (info: { object: ArrowPathData | null; x: number; y: number }) => void;
}

export interface GeorefEntry {
    edge_id: number;
    state_id: number;
    time: number;
}

export interface MigrationStep {
    sourceId: number;
    targetId: number;
    time: number;
}

export interface MigrationPath {
    edge_id: number;
    steps: MigrationStep[];
}