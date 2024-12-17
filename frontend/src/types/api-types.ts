import { Geometry } from 'geojson';

// GeoJSON Point type
interface GeoJSONPoint {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

// Updated Individual type with proper location typing
export interface Individual {
    id: number;
    flags: number;
    location: GeoJSONPoint;  // Now properly typed as GeoJSON Point
    parents: number[];
    nodes: number[];
    array_non_reference_discordance?: number | null;
    capmq?: number | null;
    coverage?: number | null;
    freemix?: number | null;
    insert_size_average?: number | null;
    library?: string | null;
    library_type?: string | null;
    region?: string | null;
    sample?: string | null;
    sample_accession?: string | null;
    sex?: string | null;
    source?: string | null;
}

// Updated Hexagon type with proper geometry typing
export interface Hexagon {
    state_id: number;
    geom: Geometry;  // Now properly typed as GeoJSON Geometry
    continent_id: string;
    center_lon: number;
    center_lat: number;
}

// Rest of your types remain the same
export interface Population {
    id: number;
    name: string;
    region: string;
}

export interface GeoArgPath {
    edge_id: number;
    entries: GeoArg[];
}

export interface Flux {
    id: number;
    source_state_id: number;
    target_state_id: number;
    time: number;
    migration_rate: number;
}

export interface GeoArg {
    edge_id: number;
    state_id: number;
    time: number;
}

export interface AverageFlux {
    source_state_id: number;
    target_state_id: number;
    average_migration_rate: number;
}

export interface HexagonHoverProperties {
    state_id: number;
    continent_id: string;
    center_lon: number;
    center_lat: number;
}

export interface HexagonHoverInfo {
    x: number;
    y: number;
    object: {
        properties: HexagonHoverProperties;
    };
}

export interface PointCluster {
    longitude: number;
    latitude: number;
    individuals: Individual[];
    expanded: boolean;
}

export interface PointState {
    clusters: Map<string, PointCluster>;
    expandedCluster: string | null;
}

export interface PointHoverInfo {
    object: PointCluster | Individual;
    x: number;
    y: number;
}

export interface MigrationHoverInfo {
    edgeId: number;
    sourceStateId: number;
    targetStateId: number;
    time: number;
    x: number;
    y: number;
}