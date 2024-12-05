// components/MigrationHistoryLayer.tsx
import {CompositeLayer} from '@deck.gl/core';
import {PathLayer} from '@deck.gl/layers';
import {GeoJsonData, MigrationStep} from '../types/types';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {calculateArrowPath, getHexCenterpoint} from '../utils/utils';

interface MigrationHistoryLayerProps {
    id: string;
    data: MigrationStep[];
    hexagonData: GeoJsonData;
}

export default class MigrationHistoryLayer extends CompositeLayer<MigrationHistoryLayerProps> {
    static layerName = 'MigrationHistoryLayer';

    renderLayers() {
        const {data, hexagonData} = this.props;
        console.log('MigrationHistoryLayer data:', this.props.data);

        return new PathLayer({
            id: `${this.props.id}-arrows`,
            data: data.map(step => {
                const sourceCoords = getHexCenterpoint(hexagonData, step.sourceId);
                const targetCoords = getHexCenterpoint(hexagonData, step.targetId);

                if (!sourceCoords || !targetCoords) {
                    console.log('Missing coordinates for step:', step);
                    return null;
                }

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
