// ============================================================================
// EurasiaMap.tsx
// Core map visualization component that renders geographic data using DeckGL.
// Handles map layers, interactions, and data visualization for points, regions,
// and flux data.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import {GeoJsonLayer, ScatterplotLayer, LineLayer} from "@deck.gl/layers";
import { COORDINATE_SYSTEM, MapView, MapViewState, Layer } from "@deck.gl/core";
import {
    GeoJsonData,
    PointData,
    PointHoverInfo,
    HexagonHoverInfo,
    RawFluxData,
    FluxArcData,
    AggregatePointHoverInfo,
    PointCluster,
    ExpandedClusterData, AggregatePointData, GeorefEntry, ExpandedPointData, Individual
} from '../types/types';
import { Feature, Geometry } from "geojson";
import FluxArrowLayer from "./FluxArrowLayer";
import {COLORS, MAP, MAPBOX} from "../utils/constants";
import {
    calculateAggregatePoints, filterDominantFlux,
    generateClusterPositions,
    getClusterRadius,
    getContinentColor, getHexCenterpoint,
    groupPointsByLocation, normalizeValues
} from "../utils/utils";
import { api } from '../services/api';

// ============================================================================
// Data Imports and Configuration
// ============================================================================
import fluxData from '../data/flux_transformed.json';
import MigrationHistoryLayer from "./MigrationHistoryLayer";
import {getMigrationPaths} from "../utils/migration";
// @ts-ignore
const rawFluxData: RawFluxData = fluxData;

// MapBox configuration
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// ============================================================================
// Component Interface
// ============================================================================
interface EurasiaMapProps {
    showPoints: boolean;
    showCells: boolean;
    showAverageFlux: boolean;
    showTimeSeriesFlux: boolean;
    showAggregatePoints: boolean;
    timeSeriesIndex: number;
    selectedPoint: PointData | null;
    onPointClick: (point: PointData) => void;
    expandedCluster: PointCluster | null;
    onClusterClick: (cluster: PointCluster) => void;
    showRegionColors: boolean;
    showCountryBorders: boolean;
    showDominantFluxOnly: boolean;
    selectedCell: number | null;
    onCellSelect: (cellId: number | null) => void;
    georefData: GeorefEntry[];
}

// ============================================================================
// Main Component Implementation
// ============================================================================
const EurasiaMap: React.FC<EurasiaMapProps> = ({
                                                   showPoints,
                                                   showCells,
                                                   showAverageFlux,
                                                   showAggregatePoints,
                                                   showTimeSeriesFlux,
                                                   timeSeriesIndex,
                                                   selectedPoint,
                                                   onPointClick,
                                                   expandedCluster,
                                                   showRegionColors,
                                                   showDominantFluxOnly,
                                                   showCountryBorders,
                                                   selectedCell,
                                                   onCellSelect,
                                                   georefData,
                                                   onClusterClick,
                                               }) => {
    // State for map view and interactions
    const [viewState, setViewState] = useState<MapViewState>(MAP.INITIAL_VIEW);
    const [pointHoverInfo, setPointHoverInfo] = useState<PointHoverInfo | null>(null);
    const [hexagonHoverInfo, setHexagonHoverInfo] = useState<HexagonHoverInfo | null>(null);
    const [hexagonData, setHexagonData] = useState<GeoJsonData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fluxHoverInfo, setFluxHoverInfo] = useState<{ object: FluxArcData; x: number; y: number; } | null>(null);
    const [aggregatePointHoverInfo, setAggregatePointHoverInfo] = useState<AggregatePointHoverInfo | null>(null);
    const [expandedClusterData, setExpandedClusterData] = useState<ExpandedClusterData | null>(null);

    const [pointData, setPointData] = useState<PointData[]>([]);
    const [pointDataError, setPointDataError] = useState<string | null>(null);

    console.log('Creating layers with:', {
        hexDataExists: !!hexagonData?.features,
        selectedCell,
        georefDataLength: georefData?.length,
    });

    // Dynamic map style based on border visibility
    const currentMapStyle = useMemo(() =>
            showCountryBorders ? MAPBOX.STYLE_BORDERS : MAPBOX.STYLE,
        [showCountryBorders]);

    // Load hexagon data on component mount
    useEffect(() => {
        const loadHexagonData = async () => {
            try {
                const data = await api.getAllHexagons();
                setHexagonData(data);
            } catch (error) {
                console.error('Error loading hexagon data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHexagonData();
    }, []);

    useEffect(() => {
        const loadPointData = async () => {
            try {
                const individuals = await api.getAllIndividuals();
                const points: PointData[] = individuals.map(individual => {
                    // First create an Individual object matching your interface
                    const fullIndividual: Individual = {
                        individual_id: individual.individual_id,
                        flags: individual.flags,
                        location: {
                            type: 'Point',
                            coordinates: individual.location.coordinates
                        },
                        parents: individual.parents,
                        nodes: individual.nodes,
                        array_non_reference_discordance: individual.array_non_reference_discordance,
                        capmq: individual.capmq,
                        coverage: individual.coverage,
                        freemix: individual.freemix,
                        insert_size_average: individual.insert_size_average,
                        library: individual.library,
                        library_type: individual.library_type,
                        region: individual.region,
                        sample: individual.sample,
                        sample_accession: individual.sample_accession,
                        sex: individual.sex,
                        source: individual.source
                    };

                    // Then construct the PointData object
                    return {
                        individual_id: individual.individual_id,
                        longitude: individual.location.coordinates[0],
                        latitude: individual.location.coordinates[1],
                        metadata: {
                            individual_id: individual.individual_id,
                            flags: individual.flags,
                            parents: individual.parents,
                            nodes: individual.nodes,
                            array_non_reference_discordance: individual.array_non_reference_discordance,
                            capmq: individual.capmq,
                            coverage: individual.coverage,
                            freemix: individual.freemix,
                            insert_size_average: individual.insert_size_average,
                            library: individual.library,
                            library_type: individual.library_type,
                            region: individual.region,
                            sample: individual.sample,
                            sample_accession: individual.sample_accession,
                            sex: individual.sex,
                            source: individual.source
                        }
                    };
                });
                setPointData(points);
            } catch (error) {
                console.error('Error loading point data:', error);
                setPointDataError(error instanceof Error ? error.message : 'Failed to load point data');
            }
        };

        loadPointData();
    }, []);


    // Handle cluster expansion state changes
    useEffect(() => {
        if (expandedCluster) {
            if (!expandedClusterData ||
                expandedClusterData.cluster.latitude !== expandedCluster.latitude ||
                expandedClusterData.cluster.longitude !== expandedCluster.longitude) {

                const radius = getClusterRadius(expandedCluster.points.length);
                const positions = generateClusterPositions(
                    expandedCluster.latitude,
                    expandedCluster.longitude,
                    radius,
                    expandedCluster.points.length
                );

                const expandedPoints = expandedCluster.points.map((point, i) => ({
                    ...point,
                    displayLon: positions[i][0],
                    displayLat: positions[i][1]
                }));

                setExpandedClusterData({
                    cluster: expandedCluster,
                    expandedPoints
                });
            }
        } else {
            setExpandedClusterData(null);
        }
    }, [expandedCluster, expandedClusterData]);

    // Generate map layers based on current state
    const layers = useMemo(() => {
        if (!hexagonData) {
            return [];
        }

        const baseLayers: Layer[] = [];

        // Hexagonal grid layer
        if (showCells) {
            baseLayers.push(
                new GeoJsonLayer({
                    id: 'hexagon-layer',
                    data: hexagonData,
                    filled: true,
                    stroked: true,
                    getLineColor: [...COLORS.grid.lines, COLORS.grid.lineOpacity],
                    getFillColor: (feature: Feature<Geometry>) =>
                        showRegionColors ? getContinentColor(feature) :
                            [...COLORS.regions.default, COLORS.grid.cellOpacity],
                    lineWidthMinPixels: 1,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    wrapLongitude: true,
                    pickable: true,
                    onHover: ({object, x, y}) => {
                        setHexagonHoverInfo(object ? {object, x, y} : null);
                    },
                    updateTriggers: {
                        getFillColor: showRegionColors
                    }
                })
            );
        }

        // Point visualization layers
        if (showPoints) {
            const clusters = groupPointsByLocation(pointData as PointData[]);

            baseLayers.push(
                new ScatterplotLayer({
                    id: 'cluster-layer',
                    data: clusters,
                    pickable: true,
                    opacity: 0.9,
                    stroked: true,
                    filled: true,
                    radiusMinPixels: 8,
                    getPosition: (d: PointCluster) => [d.longitude, d.latitude],
                    getFillColor: d => d.points.length > 1 ?
                        COLORS.points.cluster :
                        COLORS.points.single,
                    getLineColor: COLORS.points.outline,
                    lineWidthMinPixels: 1.5,
                    onClick: ({object}) => {
                        if (object && object.points.length > 1) {
                            onClusterClick(object);
                        } else if (object) {
                            onPointClick(object.points[0]);
                        }
                    },
                    onHover: ({object, x, y}) => {
                        if (!object) {
                            setPointHoverInfo(null);
                            return;
                        }

                        const hoverInfo = {
                            x,
                            y,
                            object: {
                                ...object.points[0],
                                pointCount: object.points.length
                            }
                        };
                        setPointHoverInfo(hoverInfo);
                    }
                })
            );

            // Expanded cluster visualization
            if (expandedCluster && expandedClusterData &&
                expandedCluster.latitude === expandedClusterData.cluster.latitude &&
                expandedCluster.longitude === expandedClusterData.cluster.longitude) {

                // Connection lines
                baseLayers.push(
                    new LineLayer({
                        id: 'cluster-lines-layer',
                        data: expandedClusterData.expandedPoints,
                        pickable: false,
                        getSourcePosition: (d: PointCluster) => [d.longitude, d.latitude],
                        getTargetPosition: d => [d.displayLon, d.displayLat],
                        getColor: [255, 255, 255, 255],
                        getWidth: 2
                    })
                );

                // Expanded points
                baseLayers.push(
                    new ScatterplotLayer({
                        id: 'expanded-points-layer',
                        data: expandedClusterData.expandedPoints,
                        pickable: true,
                        opacity: 0.9,
                        stroked: true,
                        filled: true,
                        radiusMinPixels: 8,
                        getPosition: (d: ExpandedPointData) => [d.displayLon, d.displayLat],
                        getFillColor: COLORS.points.single,
                        getLineColor: COLORS.points.outline,
                        lineWidthMinPixels: 1.5,
                        onClick: ({object}) => object && onPointClick(object),
                        onHover: ({object, x, y}) => {
                            setPointHoverInfo(object ? {object, x, y} : null);
                        }
                    })
                );
            }
        }

        if (selectedCell !== null && georefData && georefData.length > 0) {
            console.log('Creating migration history layer:', {
                selectedCell,
                georefDataLength: georefData.length,
            });

            const migrationPaths = getMigrationPaths(georefData, selectedCell);
            console.log('Generated migration paths:', migrationPaths);

            const allSteps = migrationPaths.flatMap(path => path.steps);
            console.log('All migration steps:', allSteps);

            if (allSteps.length > 0) {
                console.log('Adding migration layer to baseLayers');
                baseLayers.push(
                    new MigrationHistoryLayer({
                        id: 'migration-history',
                        data: allSteps,
                        hexagonData: hexagonData
                    })
                );
            } else {
                console.log('No steps to display for migration history');
            }
        }

        // Aggregate points layer
        if (showAggregatePoints) {
            const aggregatePoints = calculateAggregatePoints(pointData as PointData[], hexagonData);
            const maxPointCount = Math.max(...aggregatePoints.map(p => p.pointCount));

            baseLayers.push(
                new ScatterplotLayer({
                    id: 'aggregate-point-layer',
                    data: aggregatePoints,
                    pickable: true,
                    opacity: 1.0,
                    stroked: false,
                    filled: true,
                    radiusUnits: 'pixels',
                    radiusScale: 1,
                    radiusMinPixels: 6,
                    radiusMaxPixels: 50,
                    getPosition: (d: AggregatePointData) => d.position,
                    getRadius: (d: AggregatePointData) => {
                        const normalizedRadius = Math.sqrt(d.pointCount / maxPointCount);
                        return normalizedRadius * 25 + 6;
                    },
                    parameters: {
                        depthTest: false
                    },
                    onHover: ({object, x, y}) => {
                        if (object) {
                            setAggregatePointHoverInfo({
                                object: {
                                    cellId: object.cellId,
                                    pointCount: object.pointCount,
                                    position: object.position
                                },
                                x,
                                y
                            });
                        } else {
                            setAggregatePointHoverInfo(null);
                        }
                    },
                    onClick: ({object}) => {
                        console.log('Aggregate point clicked:', object);  // Add this
                        if (object) {
                            onCellSelect(object.cellId);
                        }
                    },
                    getFillColor: d =>
                        d.cellId === selectedCell ?
                            [255, 100, 100] : // Highlight selected cell
                            COLORS.points.aggregate,
                    updateTriggers: {
                        getFillColor: [selectedCell],
                        getRadius: aggregatePoints,
                    }
                })
            );
        }

        // Average flux visualization
        if (showAverageFlux) {
            let arcData = rawFluxData.average_flux.map(flux => {
                const sourceCoords = getHexCenterpoint(hexagonData, flux.source_id);
                const targetCoords = getHexCenterpoint(hexagonData, flux.target_id);

                if (!sourceCoords || !targetCoords) {
                    return null;
                }

                return {
                    sourcePosition: sourceCoords,
                    targetPosition: targetCoords,
                    value: flux.value,
                    sourceId: flux.source_id,
                    targetId: flux.target_id,
                    normalizedValue: normalizeValues([Math.abs(flux.value)])[0]
                };
            }).filter((arc): arc is NonNullable<typeof arc> => arc !== null);

            if (showDominantFluxOnly) {
                arcData = filterDominantFlux(arcData);
            }

            baseLayers.push(
                new FluxArrowLayer({
                    id: 'flux-arrow-layer',
                    data: arcData,
                    pickable: true,
                    onHover: ({object, x, y}) => {
                        setFluxHoverInfo(object ? {object, x, y} : null);
                    }
                })
            );
        }

        // Time series flux visualization
        if (showTimeSeriesFlux && rawFluxData.time_series[timeSeriesIndex]) {
            let timeSeriesArcData = rawFluxData.time_series[timeSeriesIndex]
                .map(flux => {
                    const sourceCoords = getHexCenterpoint(hexagonData, flux.source_id);
                    const targetCoords = getHexCenterpoint(hexagonData, flux.target_id);

                    if (!sourceCoords || !targetCoords) {
                        return null;
                    }

                    return {
                        sourcePosition: sourceCoords,
                        targetPosition: targetCoords,
                        value: flux.value,
                        sourceId: flux.source_id,
                        targetId: flux.target_id,
                        normalizedValue: normalizeValues([Math.abs(flux.value)])[0]
                    };
                })
                .filter((arc): arc is NonNullable<typeof arc> => arc !== null);

            if (showDominantFluxOnly) {
                timeSeriesArcData = filterDominantFlux(timeSeriesArcData);
            }

            baseLayers.push(
                new FluxArrowLayer({
                    id: 'time-series-flux-layer',
                    data: timeSeriesArcData,
                    pickable: true,
                    onHover: ({object, x, y}) => {
                        setFluxHoverInfo(object ? {object, x, y} : null);
                    }
                })
            );
        }


        return baseLayers;
    }, [hexagonData, showPoints, showCells, showAverageFlux, showAggregatePoints, showTimeSeriesFlux, timeSeriesIndex,
        onPointClick, expandedCluster, expandedClusterData, onClusterClick, showRegionColors, showDominantFluxOnly,
        onCellSelect, selectedCell, georefData]);

    if (pointDataError) {
        console.warn('Point data loading error:', pointDataError);
    }

    // Tooltip rendering
    const renderTooltip = () => {
        const tooltipStyle = {
            position: 'absolute' as const,
            zIndex: 1,
            pointerEvents: 'none' as const,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '8px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px',
            transform: 'translate(-50%, -100%)',
            marginTop: '-20px'
        };

        if (aggregatePointHoverInfo) {
            const { cellId, pointCount } = aggregatePointHoverInfo.object;
            return (
                <div style={{...tooltipStyle, left: aggregatePointHoverInfo.x, top: aggregatePointHoverInfo.y}}>
                    <div>Cell ID: {cellId}</div>
                    <div>Points: {pointCount}</div>
                </div>
            );
        }

        if (pointHoverInfo) {
            const pointCount = (pointHoverInfo.object as any).pointCount;
            return (
                <div style={{...tooltipStyle, left: pointHoverInfo.x, top: pointHoverInfo.y}}>
                    {pointCount > 1 ? (
                        <div>Points in stack: {pointCount}</div>
                    ) : (
                        <div>Node ID: {pointHoverInfo.object.individual_id}</div>
                    )}
                </div>
            );
        }

        if (hexagonHoverInfo) {
            const { state_id, continent_id, centerpoint } = hexagonHoverInfo.object.properties;
            return (
                <div style={{...tooltipStyle, left: hexagonHoverInfo.x, top: hexagonHoverInfo.y}}>
                    <div>State ID: {state_id}</div>
                    <div>Continent: {continent_id}</div>
                    <div>Center: ({centerpoint.longitude.toFixed(4)}, {centerpoint.latitude.toFixed(4)})</div>
                </div>
            );
        }

        if (fluxHoverInfo) {
            return (
                <div style={{...tooltipStyle, left: fluxHoverInfo.x, top: fluxHoverInfo.y}}>
                    <div>Source ID: {fluxHoverInfo.object.sourceId}</div>
                    <div>Target ID: {fluxHoverInfo.object.targetId}</div>
                    <div>Value: {fluxHoverInfo.object.value}</div>
                </div>
            );
        }

        return null;
    };

    if (isLoading) {
        return <div>Loading map data...</div>;
    }

    // Main render
    return (
        <div className="relative">
            <DeckGL
                initialViewState={MAP.INITIAL_VIEW}
                viewState={viewState}
                onViewStateChange={({viewState: newViewState}) => {
                    const safeViewState: MapViewState = {
                        longitude: newViewState.longitude ?? viewState.longitude,
                        latitude: newViewState.latitude ?? viewState.latitude,
                        zoom: newViewState.zoom ?? viewState.zoom,
                        pitch: newViewState.pitch ?? viewState.pitch,
                        bearing: newViewState.bearing ?? viewState.bearing
                    };
                    setViewState(safeViewState);
                }}
                controller={true}
                layers={layers}
                views={new MapView({repeat: true})}
                getCursor={({isDragging}) =>
                    isDragging ? 'grabbing' : ((pointHoverInfo || hexagonHoverInfo) ? 'pointer' : 'grab')
                }
            >
                <MapGL
                    mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                    mapStyle={currentMapStyle}
                    projection={MAP.PROJECTION}
                />
                {renderTooltip()}
            </DeckGL>
        </div>
    );
};

export default EurasiaMap;