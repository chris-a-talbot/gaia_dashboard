// utils/migration.ts
import Papa from 'papaparse';
import {GeorefEntry, MigrationPath, GeoJsonData, MigrationStep} from '../types/types';
import {calculateArrowPath, getHexCenterpoint} from "./utils";
import {PathLayer} from "@deck.gl/layers";
import {CompositeLayer, COORDINATE_SYSTEM} from "@deck.gl/core";

// Create a new interface for the layer props
export interface MigrationHistoryLayerProps {
    id: string;
    data: MigrationStep[];
    hexagonData: GeoJsonData;
}

export async function processGeorefData(filePath: string): Promise<GeorefEntry[]> {
    const response = await fetch(filePath);
    const csv = await response.text();

    const { data } = Papa.parse(csv, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    return data as GeorefEntry[];
}

export function getMigrationPaths(data: GeorefEntry[], targetStateId: number): MigrationPath[] {
    console.log('Input data:', data);
    console.log('Target state:', targetStateId);

    // Get all edge_ids that end at our target state
    const edgeEntries = data.filter(entry => entry.state_id === targetStateId);
    console.log('Edge entries for target state:', edgeEntries);

    const relevantEdges = new Set(edgeEntries.map(entry => entry.edge_id));
    console.log('Relevant edge IDs:', Array.from(relevantEdges));

    // Process each relevant edge
    const paths = Array.from(relevantEdges).map(edge_id => {
        // Get all entries for this edge, sorted by time (ascending)
        const edgePath = data
            .filter(entry => entry.edge_id === edge_id)
            .sort((a, b) => a.time - b.time);

        console.log(`Edge ${edge_id} path:`, edgePath);

        // Convert to migration steps - each step represents movement between states
        const steps: MigrationStep[] = [];
        for (let i = 0; i < edgePath.length - 1; i++) {
            const current = edgePath[i];
            const next = edgePath[i + 1];

            // Only create a step if there's actual movement between states
            if (current.state_id !== next.state_id) {
                steps.push({
                    sourceId: current.state_id,
                    targetId: next.state_id,
                    time: next.time
                });
            }
        }

        console.log(`Edge ${edge_id} steps:`, steps);

        return {
            edge_id,
            steps
        };
    });

    console.log('Final paths:', paths);
    return paths;
}


// Modified MigrationHistoryLayer
export default class MigrationHistoryLayer extends CompositeLayer<MigrationHistoryLayerProps> {
    static layerName = 'MigrationHistoryLayer';

    renderLayers() {
        const {data, hexagonData} = this.props;

        return new PathLayer({
            id: `${this.props.id}-arrows`,
            data: data.map(step => {
                const sourceCoords = getHexCenterpoint(hexagonData, step.sourceId);
                const targetCoords = getHexCenterpoint(hexagonData, step.targetId);

                if (!sourceCoords || !targetCoords) return null;

                return {
                    path: calculateArrowPath(sourceCoords, targetCoords),
                    time: step.time
                };
            }).filter((d): d is NonNullable<typeof d> => d !== null),
            pickable: true,
            widthScale: 20,
            widthMinPixels: 2,
            getPath: d => d.path,
            getColor: d => {
                // Interpolate color based on time (0 = light red, 1 = dark red)
                const intensity = Math.floor(255 * (1 - d.time));
                return [255, intensity, intensity, 200];
            },
            getWidth: 3,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        });
    }
}