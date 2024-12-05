// ============================================================================
// types.ts
// Core type definitions for the Gaia visualization application. Includes types
// for geographic data, point data, hover interactions, and flux calculations.
// ============================================================================

import { Feature, FeatureCollection } from 'geojson';

// Geographic Data Types
export interface GeoJsonData extends FeatureCollection {
    length?: number;
    type: 'FeatureCollection';
    features: Feature[];
}

// Base Point Types
export interface PointData {
    node_id: number;
    longitude: number;
    latitude: number;
}

// Hover Interaction Types
export interface HoverInfo {
    x: number;
    y: number;
    object: any;
}

export interface PointHoverInfo extends HoverInfo {
    object: PointData;
}

// Hexagon Grid Types
export interface Centerpoint {
    longitude: number;
    latitude: number;
}

export interface HexagonProperties {
    state_id: number;
    continent_id: string;
    centerpoint: Centerpoint;
}

export interface HexagonHoverInfo extends HoverInfo {
    object: {
        properties: HexagonProperties;
    };
}

// Flux Data Types
export interface FluxEntry {
    source_id: number;
    target_id: number;
    value: number;
}

export interface RawFluxData {
    time_series: FluxEntry[][];
    average_flux: FluxEntry[];
}

export interface FluxArcData {
    sourcePosition: [number, number];
    targetPosition: [number, number];
    value: number;
    sourceId: number;
    targetId: number;
    normalizedValue: number;
}

// Point Aggregation Types
export interface AggregatePointData {
    cellId: number;
    position: [number, number];
    pointCount: number;
    points: PointData[];
}

export interface HexagonFeature extends Feature {
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    properties: HexagonProperties;
}

export interface AggregatePointHoverInfo extends HoverInfo {
    object: {
        cellId: number;
        pointCount: number;
        position: [number, number];
    };
}

// Point Clustering Types
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

// Utility Types
export type Position = [number, number];

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

// Migration Types
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