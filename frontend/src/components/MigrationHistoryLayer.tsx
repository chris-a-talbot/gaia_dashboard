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
    sourceLon: number;
    sourceLat: number;
    targetLon: number;
    targetLat: number;
    angle: number;
    midpoint: [number, number];
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

    processPathData(): ProcessedPathData {
        const { paths, hexagons } = this.props;
        if (!paths || !hexagons) return { segments: [], maxTime: 0 };

        // Debug output for the first path
        if (paths.length > 0) {
            console.log('Sample GeoArgPath:', {
                pathId: paths[0].edge_id,
                entries: paths[0].entries.map(entry => ({
                    stateId: entry.state_id,
                    time: entry.time
                }))
            });
        }

        const hexagonMap = new Map<number, HexagonCoords>(
            hexagons.map(h => [
                h.state_id,
                { lon: h.center_lon, lat: h.center_lat }
            ])
        );

        const segments: PathSegment[] = [];
        const maxTime = Math.max(...paths.flatMap(p => p.entries.map(e => e.time)));
        console.log('Max time:', maxTime);

        paths.forEach((path: GeoArgPath) => {
            for (let i = 0; i < path.entries.length - 1; i++) {
                const current = path.entries[i];
                const next = path.entries[i + 1];

                const sourceCoords = hexagonMap.get(current.state_id);
                const targetCoords = hexagonMap.get(next.state_id);

                if (sourceCoords && targetCoords) {
                    const { angle, midpoint } = this.calculateArrowProperties(
                        sourceCoords.lon,
                        sourceCoords.lat,
                        targetCoords.lon,
                        targetCoords.lat
                    );

                    segments.push({
                        sourceStateId: current.state_id,
                        targetStateId: next.state_id,
                        time: current.time,
                        sourceLon: sourceCoords.lon,
                        sourceLat: sourceCoords.lat,
                        targetLon: targetCoords.lon,
                        targetLat: targetCoords.lat,
                        angle,
                        midpoint
                    });
                }
            }
        });

        return { segments, maxTime };
    }

    renderLayers() {
        const { segments, maxTime } = this.processPathData();
        if (!segments || segments.length === 0) return [];

        return [
            new LineLayer({
                id: 'migration-paths',
                data: segments,
                getSourcePosition: d => [d.sourceLon, d.sourceLat],
                getTargetPosition: d => [d.targetLon, d.targetLat],
                getColor: (d: PathSegment) => {
                    const intensity = Math.max(0, Math.min(1, 1 - (d.time / maxTime)));
                    const color = new Uint8Array([
                        255,                            // R
                        Math.floor(intensity * 50),     // G
                        Math.floor(intensity * 50),     // B
                        Math.floor(255 * (0.3 + intensity * 0.7)) // A
                    ]);

                    console.log('Line segment color:', {
                        time: d.time,
                        maxTime,
                        intensity,
                        color: Array.from(color)
                    });

                    return color;
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