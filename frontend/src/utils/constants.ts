// ============================================================================
// constants.ts
// Core color configuration for visualization elements
// ============================================================================

// Base color constants with semantic naming
export const COLORS = {
    // Region colors - using more muted, professional tones
    regions: {
        EU: [100, 149, 237] as [number, number, number],     // Cornflower blue
        AS_N: [205, 92, 92] as [number, number, number],     // Indian red
        AS_S: [147, 112, 219] as [number, number, number],   // Medium purple
        AF_N: [218, 165, 32] as [number, number, number],    // Goldenrod
        ME: [95, 158, 160] as [number, number, number],      // Cadet blue
        AF_S: [144, 238, 144] as [number, number, number],   // Light green
        default: [128, 128, 128] as [number, number, number] // Gray
    },

    // Point visualization - more unified with overall scheme
    points: {
        single: [135, 206, 235] as [number, number, number],   // Sky blue
        cluster: [255, 185, 15] as [number, number, number],   // Golden
        outline: [30, 41, 59] as [number, number, number],     // Dark slate
        aggregate: [220, 220, 220] as [number, number, number] // Light gray
    },

    // Flux visualization - much higher contrast
    flux: {
        low: [70, 130, 180] as [number, number, number],     // Steel blue
        mid: [255, 165, 0] as [number, number, number],      // Orange
        high: [220, 20, 60] as [number, number, number],     // Crimson
    },

    // Grid and structural elements - subtle but visible
    grid: {
        lines: [176, 196, 222] as [number, number, number],  // Light steel blue
        lineOpacity: 40,
        cellOpacity: 35
    }
};

// Sidebar Configuration
export const SIDEBAR = {
    DEFAULT_WIDTH: 320 as number,
    MIN_WIDTH: 200 as number,
    MAX_WIDTH: 600 as number,
} as const;

// Map Configuration
export const MAP = {
    INITIAL_VIEW: {
        longitude: 75,
        latitude: 30,
        zoom: 2.5,
        pitch: 45,
        bearing: 0,
    } as const,
    PROJECTION: {
        name: 'mercator' as const,
        center: [0, 30] as [number, number]  // Explicitly type as mutable tuple
    },
} as const;

// MapBox Configuration
export const MAPBOX = {
    STYLE: 'mapbox://styles/chtalbot/cm4ab05ie002601s6cepccpsu',
    STYLE_BORDERS: 'mapbox://styles/chtalbot/cm4af20hi006j01rwa6fih7g7',
} as const;

// Time Configuration
export const TIME = {
    FLUX_INTERVAL: 2500 as number,
} as const;

// Flux Arrow Configuration
export const FLUX_ARROW = {
    HEAD_SIZE: 0.3,
    PATH_OFFSET: 0.6,
    EXTENSION: 0.8,
    WIDTH: {
        MIN: 3,
        MAX: 20,
        SCALE: 20,
    },
    OPACITY: {
        MIN: 30,
        MAX: 255,
    }
} as const;