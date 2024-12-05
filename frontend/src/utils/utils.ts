// Convert values to logarithmic scale for better visualization
import {COLORS, FLUX_ARROW, TIME} from "./constants";
import {AggregatePointData, GeoJsonData, PointCluster, PointData, Position} from "../types/types";
import {Feature, Geometry} from "geojson";

// ============================================================================
// App utils
// ============================================================================

// Formats time points for display in the timeline
export const formatTimePoint = (index: number): string => {
    const yearsAgo = index * TIME.FLUX_INTERVAL;
    if (index === 0) return 'Present';
    return `${(yearsAgo / 1000).toFixed(1)} kya`;
};

// ============================================================================
// EurasiaMap utils
// ============================================================================

// Filters flux data to keep only the dominant direction between any two points
export function filterDominantFlux<T extends { sourceId: number; targetId: number; value: number }>(
    fluxData: T[]
): T[] {
    const fluxMap = new Map<string, { value: number; data: T }>();

    // First pass: record the highest flux value between each pair
    fluxData.forEach(flux => {
        // Create consistent key regardless of direction
        const key = [
            Math.min(flux.sourceId, flux.targetId),
            Math.max(flux.sourceId, flux.targetId)
        ].join('-');

        // Track if this is forward or reverse direction
        const isForward = flux.sourceId < flux.targetId;
        const existingEntry = fluxMap.get(key);

        if (!existingEntry || Math.abs(flux.value) > Math.abs(existingEntry.value)) {
            fluxMap.set(key, {
                value: isForward ? flux.value : -flux.value,
                data: flux
            });
        }
    });

    // Return only the dominant flux entries
    return Array.from(fluxMap.values()).map(entry => entry.data);
}


// Returns color values for geographic regions based on continent
export function getContinentColor(feature: Feature<Geometry>): [number, number, number, number] {
    const continentId = feature.properties?.continent_id;
    const opacity = COLORS.grid.cellOpacity;

    const getColorWithOpacity = (color: number[]): [number, number, number, number] => [
        color[0],
        color[1],
        color[2],
        opacity
    ];

    switch (continentId) {
        case 'EU':
            return getColorWithOpacity(COLORS.regions.EU);
        case 'AS_N':
            return getColorWithOpacity(COLORS.regions.AS_N);
        case 'AS_S':
            return getColorWithOpacity(COLORS.regions.AS_S);
        case 'AF_N':
            return getColorWithOpacity(COLORS.regions.AF_N);
        case 'AF_S':
            return getColorWithOpacity(COLORS.regions.AF_S);
        case 'ME':
            return getColorWithOpacity(COLORS.regions.ME);
        default:
            return getColorWithOpacity(COLORS.regions.default);
    }
}
// Retrieves centerpoint coordinates for a given hexagon cell
export function getHexCenterpoint(hexData: GeoJsonData, cellId: number): [number, number] | null {
    const feature = hexData.features.find(
        feature => feature.properties?.state_id === cellId
    );

    if (!feature?.properties?.centerpoint) {
        return null;
    }

    const { longitude, latitude } = feature.properties.centerpoint;
    return [longitude, latitude];
}

// Normalizes array values to a 0.1-1 range
export const normalizeValues = (values: number[]): number[] => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return values.map(v => {
        const normalized = range === 0 ? 0.5 : (v - min) / range;
        return 0.1 + (normalized * 0.9);
    });
};

// Aggregates individual points into cell-based clusters
export const calculateAggregatePoints = (
    points: PointData[],
    hexData: GeoJsonData
): AggregatePointData[] => {
    const pointsByCell = new Map<number, PointData[]>();

    // Initialize cells
    hexData.features.forEach(feature => {
        const cellId = feature.properties?.state_id;
        if (cellId !== undefined) {
            pointsByCell.set(cellId, []);
        }
    });

    // Assign points to nearest cell
    points.forEach(point => {
        let minDistance = Infinity;
        let nearestCellId: number | null = null;

        hexData.features.forEach(feature => {
            const cellId = feature.properties?.state_id;
            const centerpoint = feature.properties?.centerpoint;

            if (cellId !== undefined && centerpoint) {
                const distance = Math.sqrt(
                    Math.pow(point.longitude - centerpoint.longitude, 2) +
                    Math.pow(point.latitude - centerpoint.latitude, 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCellId = cellId;
                }
            }
        });

        if (nearestCellId !== null) {
            const cellPoints = pointsByCell.get(nearestCellId) || [];
            cellPoints.push(point);
            pointsByCell.set(nearestCellId, cellPoints);
        }
    });

    // Convert to array and filter empty cells
    return Array.from(pointsByCell.entries())
        .map(([cellId, cellPoints]) => {
            const cell = hexData.features.find(
                feature => feature.properties?.state_id === cellId
            );
            const centerpoint = cell?.properties?.centerpoint;

            if (!centerpoint) {
                return null;
            }

            return {
                cellId,
                position: [centerpoint.longitude, centerpoint.latitude] as [number, number],
                pointCount: cellPoints.length,
                points: cellPoints
            };
        })
        .filter((point): point is AggregatePointData => point !== null && point.pointCount > 0);
};

// Groups points by location for cluster visualization
export const groupPointsByLocation = (points: PointData[]): PointCluster[] => {
    const clusters = new Map<string, PointCluster>();

    points.forEach(point => {
        const key = `${point.latitude},${point.longitude}`;
        if (!clusters.has(key)) {
            clusters.set(key, {
                latitude: point.latitude,
                longitude: point.longitude,
                points: []
            });
        }
        clusters.get(key)!.points.push(point);
    });

    return Array.from(clusters.values());
};

// Calculates radius for cluster visualization based on point count
export const getClusterRadius = (pointCount: number): number => {
    return Math.max(3, Math.sqrt(pointCount) * 1.5);
};

// Generates distinct distances for expanded cluster visualization
export const generateDistinctDistances = (count: number, radius: number): number[] => {
    const segments = Array.from({ length: count * 2 }, (_, i) => i / (count * 2));

    // Fisher-Yates shuffle
    for (let i = segments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [segments[i], segments[j]] = [segments[j], segments[i]];
    }

    return segments
        .slice(0, count)
        .map(d => (0.3 + d * 0.7) * radius);
};

// Generates positions for expanded cluster points
export const generateClusterPositions = (
    centerLat: number,
    centerLon: number,
    radius: number,
    pointCount: number
): Array<[number, number]> => {
    const angles = Array.from({ length: pointCount }, (_, i) =>
        (2 * Math.PI * i) / pointCount + (Math.random() * 0.2 - 0.1)
    );

    const distances = generateDistinctDistances(pointCount, radius);

    return angles.map((angle, i) => {
        const distance = distances[i];
        return [
            centerLon + distance * Math.cos(angle),
            centerLat + distance * Math.sin(angle)
        ];
    });
};


// ============================================================================
// FluxArrowLayer utils
// ============================================================================

export function logNormalizeValues(values: number[]): number[] {
    const nonZeroValues = values.filter(v => v !== 0);
    if (nonZeroValues.length === 0) return values.map(() => 0);

    const logValues = nonZeroValues.map(v => Math.log10(v));
    const minLog = Math.min(...logValues);
    const maxLog = Math.max(...logValues);
    const logRange = maxLog - minLog;

    return values.map(v => {
        if (v === 0) return 0;
        const logVal = Math.log10(v);
        return logRange === 0 ? 0.5 : (logVal - minLog) / logRange;
    });
}

// Interpolate between three colors based on normalized value
export function interpolateColor(
    value: number,
    color1: [number, number, number],
    color2: [number, number, number],
    color3: [number, number, number]
): [number, number, number] {
    if (value <= 0.5) {
        // Interpolate between low and mid colors
        const t = value * 2;
        return [
            Math.round(color1[0] + (color2[0] - color1[0]) * t),
            Math.round(color1[1] + (color2[1] - color1[1]) * t),
            Math.round(color1[2] + (color2[2] - color1[2]) * t)
        ];
    } else {
        // Interpolate between mid and high colors
        const t = (value - 0.5) * 2;
        return [
            Math.round(color2[0] + (color3[0] - color2[0]) * t),
            Math.round(color2[1] + (color3[1] - color2[1]) * t),
            Math.round(color2[2] + (color3[2] - color2[2]) * t)
        ];
    }
}

// Calculate arrow color based on value (green → yellow → red)
export function getArrowColor(normalizedValue: number): [number, number, number, number] {
    const [r, g, b] = interpolateColor(
        normalizedValue,
        COLORS.flux.low,
        COLORS.flux.mid,
        COLORS.flux.high
    );
    const opacity = FLUX_ARROW.OPACITY.MIN + (FLUX_ARROW.OPACITY.MAX - FLUX_ARROW.OPACITY.MIN) * normalizedValue;
    return [r, g, b, opacity];
}

// Calculate arrow width based on normalized value
export function getArrowWidth(normalizedValue: number): number {
    return FLUX_ARROW.WIDTH.MIN + (FLUX_ARROW.WIDTH.MAX - FLUX_ARROW.WIDTH.MIN) * normalizedValue;
}

// Generate path coordinates for arrow visualization
export function calculateArrowPath(
    source: Position,
    target: Position,
    offset: number = 0
): Position[] {
    // Calculate direction vector
    const dx = target[0] - source[0];
    const dy = target[1] - source[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction vector
    const nx = dx / length;
    const ny = dy / length;

    // Calculate perpendicular vector for offset
    const px = -ny;
    const py = nx;

    // Apply offset
    const offsetX = px * offset;
    const offsetY = py * offset;

    // Calculate start and end points with extension
    const startX = source[0] + nx * FLUX_ARROW.EXTENSION + offsetX;
    const startY = source[1] + ny * FLUX_ARROW.EXTENSION + offsetY;
    const endX = target[0] - nx * FLUX_ARROW.EXTENSION + offsetX;
    const endY = target[1] - ny * FLUX_ARROW.EXTENSION + offsetY;

    // Calculate arrow head points
    const headLength = FLUX_ARROW.HEAD_SIZE;
    const headWidth = FLUX_ARROW.HEAD_SIZE * 0.5;
    const head1X = endX - nx * headLength + px * headWidth;
    const head1Y = endY - ny * headLength + py * headWidth;
    const head2X = endX - nx * headLength - px * headWidth;
    const head2Y = endY - ny * headLength - py * headWidth;

    return [
        [startX, startY],
        [endX, endY],
        [head1X, head1Y],
        [endX, endY],
        [head2X, head2Y]
    ];
}
