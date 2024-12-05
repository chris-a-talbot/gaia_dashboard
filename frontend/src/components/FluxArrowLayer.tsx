// ============================================================================
// FluxArrowLayer.tsx
// Custom DeckGL layer for rendering directional arrows showing flux between
// geographic regions. Handles arrow styling, positioning, and interaction.
// ============================================================================

import {CompositeLayer} from '@deck.gl/core';
import {PathLayer} from '@deck.gl/layers';
import {ArrowPathData, FluxArrowLayerProps} from "../types/types";
import {FLUX_ARROW} from "../utils/constants";
import {calculateArrowPath, getArrowColor, getArrowWidth, logNormalizeValues} from "../utils/utils";

// ============================================================================
// Layer Implementation
// ============================================================================
export default class FluxArrowLayer extends CompositeLayer<FluxArrowLayerProps> {
    static layerName = 'FluxArrowLayer';

    renderLayers() {
        const {data, onHover} = this.props;

        // Filter out zero-flux entries and normalize values
        const nonZeroData = data.filter(d => Math.abs(d.value) > 0.000001);
        const absValues = nonZeroData.map(d => Math.abs(d.value));
        const normalizedValues = logNormalizeValues(absValues);

        // Track parallel paths between same points
        const pathMap = new Map<string, number>();

        // Generate arrow paths with offsets for parallel flows
        const arrowPaths: ArrowPathData[] = nonZeroData.map((d, index) => {
            const key = [
                Math.min(d.sourceId, d.targetId),
                Math.max(d.sourceId, d.targetId)
            ].join('-');

            const count = pathMap.get(key) || 0;
            pathMap.set(key, count + 1);

            const offset = count === 0 ? 0 : (count % 2 === 0 ? FLUX_ARROW.PATH_OFFSET : -FLUX_ARROW.PATH_OFFSET);

            return {
                path: calculateArrowPath(d.sourcePosition, d.targetPosition, offset),
                sourceId: d.sourceId,
                targetId: d.targetId,
                value: d.value,
                normalizedValue: normalizedValues[index]
            };
        });

        // Render paths as arrows
        return new PathLayer({
            id: `${this.props.id}-arrows`,
            data: arrowPaths,
            pickable: true,
            widthScale: FLUX_ARROW.WIDTH.SCALE,
            widthMinPixels: FLUX_ARROW.WIDTH.MIN,
            widthMaxPixels: FLUX_ARROW.WIDTH.MAX * FLUX_ARROW.WIDTH.SCALE,
            getPath: (d: ArrowPathData) => d.path,
            getColor: (d: ArrowPathData) => getArrowColor(d.normalizedValue),
            getWidth: (d: ArrowPathData) => getArrowWidth(d.normalizedValue),
            updateTriggers: {
                getColor: [data],
                getWidth: [data]
            },
            onHover
        });
    }
}