import { CompositeLayer } from '@deck.gl/core';
import { LineLayer, IconLayer } from '@deck.gl/layers';
import { GeoArgPath, Hexagon } from '../types/api-types';

// Define the props interface for the layer
interface MigrationHistoryLayerProps {
    paths: GeoArgPath[];
    hexagons: Hexagon[];
}

// Define types for the path data
interface PathSegment {
    sourceStateId: number;
    targetStateId: number;
    time: number;
    sourcePosition: [number, number];
    targetPosition: [number, number];
    midpoint: [number, number];
    angle: number;
}

interface HexagonCoords {
    lon: number;
    lat: number;
}

interface ProcessedPathData {
    segments: PathSegment[];
    maxTime: number;
}

export default class MigrationHistoryLayer extends CompositeLayer<MigrationHistoryLayerProps> {
    static layerName = 'MigrationHistoryLayer';

    initializeState(): void {
        this.state = {
            paths: []
        };
    }

    calculateArrowProperties(sourceLon: number, sourceLat: number, targetLon: number, targetLat: number) {
        const angle = Math.atan2(targetLat - sourceLat, targetLon - sourceLon);
        const midpoint: [number, number] = [
            (sourceLon + targetLon) / 2,
            (sourceLat + targetLat) / 2
        ];
        return { angle: (angle * 180) / Math.PI, midpoint };
    }

    hasTimeDuplicates(path: GeoArgPath): boolean {
        const timeFrequency = new Map<number, number>();
        path.entries.forEach(entry => {
            const count = timeFrequency.get(entry.time) || 0;
            timeFrequency.set(entry.time, count + 1);
        });
        return Array.from(timeFrequency.values()).some(count => count > 1);
    }

    processPathData(): ProcessedPathData {
        const { paths, hexagons } = this.props;
        if (!paths || !hexagons) return { segments: [], maxTime: 0 };

        const validPaths = paths.filter(path => !this.hasTimeDuplicates(path));

        const hexagonMap = new Map<number, HexagonCoords>(
            hexagons.map(h => [
                h.state_id,
                { lon: h.center_lon, lat: h.center_lat }
            ])
        );

        // Map to store the oldest transition between each state pair
        const oldestTransitions = new Map<string, PathSegment>();

        validPaths.forEach((path: GeoArgPath) => {
            const sortedEntries = [...path.entries].sort((a, b) => a.time - b.time);

            for (let i = 0; i < sortedEntries.length - 1; i++) {
                const current = sortedEntries[i];
                const next = sortedEntries[i + 1];

                const sourceCoords = hexagonMap.get(current.state_id);
                const targetCoords = hexagonMap.get(next.state_id);

                if (sourceCoords && targetCoords) {
                    const { angle, midpoint } = this.calculateArrowProperties(
                        sourceCoords.lon,
                        sourceCoords.lat,
                        targetCoords.lon,
                        targetCoords.lat
                    );

                    // Create unique key for this state transition (order-independent)
                    const stateIds = [current.state_id, next.state_id].sort();
                    const transitionKey = stateIds.join('-');

                    const newSegment: PathSegment = {
                        sourceStateId: current.state_id,
                        targetStateId: next.state_id,
                        time: current.time,
                        sourcePosition: [sourceCoords.lon, sourceCoords.lat],
                        targetPosition: [targetCoords.lon, targetCoords.lat],
                        midpoint,
                        angle
                    };

                    // Only keep this transition if it's older than the existing one
                    const existingTransition = oldestTransitions.get(transitionKey);
                    if (!existingTransition || current.time < existingTransition.time) {
                        oldestTransitions.set(transitionKey, newSegment);
                    }
                }
            }
        });

        const segments = Array.from(oldestTransitions.values());
        const maxTime = Math.max(...segments.map(s => s.time));

        return { segments, maxTime };
    }

    renderLayers() {
        const { segments, maxTime } = this.processPathData();
        if (!segments || segments.length === 0) return [];

        return [
            new LineLayer({
                id: 'migration-paths',
                data: segments,
                getSourcePosition: d => d.sourcePosition,
                getTargetPosition: d => d.targetPosition,
                getColor: d => {
                    const intensity = 1 - Math.max(0, Math.min(1, d.time / maxTime));
                    return [
                        255,
                        Math.floor(intensity * 180),
                        Math.floor(intensity * 180),
                        255
                    ];
                },
                getWidth: 2,
                widthMinPixels: 2,
                widthMaxPixels: 4,
                opacity: 0.8
            }),
            new IconLayer({
                id: 'arrow-layer',
                data: segments,
                getIcon: () => ({
                    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="red" d="M12 0 L24 12 L12 24 L0 12 Z"/></svg>',
                    width: 24,
                    height: 24,
                    anchorX: 12,
                    anchorY: 12
                }),
                getPosition: d => d.midpoint,
                getSize: 16,
                getAngle: d => d.angle,
                sizeScale: 1,
                sizeMinPixels: 8,
                sizeMaxPixels: 24,
                opacity: 0.8
            })
        ];
    }
}