import React, {useEffect, useMemo, useState} from "react";
import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import {GeoJsonLayer, LineLayer, ScatterplotLayer} from "@deck.gl/layers";
import { COORDINATE_SYSTEM, MapView, MapViewState } from "@deck.gl/core";
import { Feature, FeatureCollection, Geometry } from "geojson";
import {
    GeoArgPath,
    Hexagon,
    HexagonHoverInfo,
    HexagonHoverProperties,
    Individual,
    PointCluster,
    PointHoverInfo,
    PointState
} from "../types/api-types";
import { COLORS, MAP, MAPBOX } from "../utils/constants";
import { booleanPointInPolygon, point } from '@turf/turf';
import { Polygon, MultiPolygon } from 'geojson';
import {getOriginPaths} from "../utils/api";
import MigrationHistoryLayer from "./MigrationHistoryLayer";

// MapBox configuration
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

interface EurasiaMapProps {
    showCells: boolean;
    showCountryBorders: boolean;
    showRegionColors: boolean;
    showIndividuals: boolean;
    showAggregatePoints: boolean;
    individuals: Individual[];
    hexagons: Hexagon[];
}

const EurasiaMap: React.FC<EurasiaMapProps> = ({
                                                   showCells,
                                                   showCountryBorders,
                                                   showRegionColors,
                                                   showIndividuals,
                                                   showAggregatePoints,
                                                   individuals,
                                                   hexagons
                                               }) => {
    const [viewState, setViewState] = useState<MapViewState>(MAP.INITIAL_VIEW);
    const [hexagonHoverInfo, setHexagonHoverInfo] = useState<HexagonHoverInfo | null>(null);
    const [pointHoverInfo, setPointHoverInfo] = useState<PointHoverInfo | null>(null);
    const [aggregateHoverInfo, setAggregateHoverInfo] = useState<{
        count: number;
        x: number;
        y: number;
    } | null>(null);

    const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
    const [migrationPaths, setMigrationPaths] = useState<GeoArgPath[]>([]);

    useEffect(() => {
        const fetchMigrationPaths = async () => {
            if (selectedStateId !== null) {
                try {
                    const paths = await getOriginPaths(selectedStateId);
                    setMigrationPaths(paths);
                } catch (error) {
                    console.error('Error fetching migration paths:', error);
                    setMigrationPaths([]);
                }
            } else {
                setMigrationPaths([]);
            }
        };

        fetchMigrationPaths();
    }, [selectedStateId]);

    const aggregatePoints = useMemo(() => {
        if (!showAggregatePoints || !hexagons || !individuals) return [];

        console.log('Sample hexagon:', hexagons[0]);

        // Create a map to store counts and coordinates for each hexagon
        const hexagonCounts = new Map<number, {
            count: number;
            center_lon: number;
            center_lat: number;
        }>();

        // Count individuals in each hexagon using proper geometry testing
        hexagons.forEach(hexagon => {
            // Log the center coordinates we're trying to access
            console.log('Processing hexagon:', {
                state_id: hexagon.state_id,
                center_lon: hexagon.center_lon,
                center_lat: hexagon.center_lat
            });

            // Only process if the geometry is a Polygon or MultiPolygon
            if (hexagon.geom.type !== 'Polygon' && hexagon.geom.type !== 'MultiPolygon') {
                return;
            }

            // Initialize count for this hexagon
            const matchingIndividuals = individuals.filter(individual => {
                const pt = point([
                    individual.location.coordinates[0],
                    individual.location.coordinates[1]
                ]);

                const polygonGeom = hexagon.geom as Polygon | MultiPolygon;
                return booleanPointInPolygon(pt, polygonGeom);
            });

            // Only add hexagons that contain points
            if (matchingIndividuals.length > 0) {
                const hexagonData = {
                    count: matchingIndividuals.length,
                    center_lon: hexagon.center_lon,
                    center_lat: hexagon.center_lat
                };

                console.log('Adding hexagon data:', hexagonData);
                hexagonCounts.set(hexagon.state_id, hexagonData);
            }
        });

        const result = Array.from(hexagonCounts.entries()).map(([state_id, data]) => ({
            state_id,
            count: data.count,
            center_lon: data.center_lon,
            center_lat: data.center_lat
        }));

        console.log('Final aggregate points with coordinates:', result);
        return result;
    }, [hexagons, individuals, showAggregatePoints]);

    useEffect(() => {
        if (!showAggregatePoints) {
            setSelectedStateId(null);
        }
    }, [showAggregatePoints]);

    // Dynamic map style based on border visibility
    const currentMapStyle = useMemo(() =>
            showCountryBorders ? MAPBOX.STYLE_BORDERS : MAPBOX.STYLE,
        [showCountryBorders]);

    // Convert hexagons to GeoJSON format
    const hexagonGeoJSON = useMemo((): FeatureCollection => ({
        type: 'FeatureCollection',
        features: hexagons.map(hexagon => ({
            type: 'Feature',
            geometry: hexagon.geom,
            properties: {
                state_id: hexagon.state_id,
                continent_id: hexagon.continent_id,
                center_lon: hexagon.center_lon,
                center_lat: hexagon.center_lat
            }
        }))
    }), [hexagons]);

    // Generate map layers based on current state
    const layers = useMemo(() => {
        const baseLayers = [];

        // Hexagonal grid layer
        if (showCells && hexagonGeoJSON) {
            baseLayers.push(
                new GeoJsonLayer({
                    id: 'hexagon-layer',
                    data: hexagonGeoJSON,
                    filled: true,
                    stroked: true,
                    getLineColor: [...COLORS.grid.lines, COLORS.grid.lineOpacity],
                    getFillColor: (feature: Feature) => {
                        if (!showRegionColors) {
                            return [...COLORS.regions.default, COLORS.grid.cellOpacity];
                        }

                        const continentId = feature.properties?.continent_id;
                        const regionColor = COLORS.regions[continentId as keyof typeof COLORS.regions]
                            || COLORS.regions.default;

                        return [...regionColor, COLORS.grid.cellOpacity];
                    },
                    lineWidthMinPixels: 1,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    wrapLongitude: true,
                    pickable: true,
                    onHover: info => {
                        const { object, x, y } = info;
                        if (object) {
                            setHexagonHoverInfo({
                                object,
                                x,
                                y
                            });
                        } else {
                            setHexagonHoverInfo(null);
                        }
                    },
                    updateTriggers: {
                        getFillColor: showRegionColors
                    }
                })
            );
        }

        // Individual points layer
        if (showIndividuals && individuals.length > 0) {
            baseLayers.push(
                new ScatterplotLayer({
                    id: 'individuals-layer',
                    data: individuals,
                    pickable: true,
                    opacity: 0.8,
                    stroked: true,
                    filled: true,
                    radiusScale: 6,
                    radiusMinPixels: 3,
                    radiusMaxPixels: 10,
                    lineWidthMinPixels: 1,
                    wrapLongitude: true,
                    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
                    getPosition: d => [
                        d.location.coordinates[0],  // Swap lat and lon
                        d.location.coordinates[1]   // Swap lat and lon
                    ],
                    getFillColor: [255, 140, 0],
                    getLineColor: [0, 0, 0],
                    onHover: info => {
                        const { object, x, y } = info;
                        if (object) {
                            setPointHoverInfo({ object, x, y });
                        } else {
                            setPointHoverInfo(null);
                        }
                    }
                })
            );
        }

        if (showAggregatePoints && aggregatePoints.length > 0) {
            const maxPointCount = Math.max(...aggregatePoints.map(p => p.count));
            console.log('Max count:', maxPointCount);

            baseLayers.push(
                new ScatterplotLayer({
                    id: 'aggregate-points-layer',
                    data: aggregatePoints,
                    pickable: true,
                    onClick: ({object}) => {
                        if (object) {
                            setSelectedStateId(prevId =>
                                prevId === object.state_id ? null : object.state_id
                            );
                        }
                    },
                    opacity: 1.0,
                    stroked: false,
                    filled: true,
                    radiusUnits: 'pixels',
                    radiusScale: 1,
                    radiusMinPixels: 6,
                    radiusMaxPixels: 50,
                    getPosition: d => [d.center_lon, d.center_lat],  // Updated to match data structure
                    getRadius: d => {
                        const normalizedRadius = Math.sqrt(d.count / maxPointCount);  // Using count instead of pointCount
                        return normalizedRadius * 25 + 6;
                    },
                    getFillColor: COLORS.points.aggregate,
                    getLineColor: COLORS.points.outline,
                    updateTriggers: {
                        getRadius: [aggregatePoints, maxPointCount]
                    },
                    onHover: info => {
                        const {object, x, y} = info;
                        if (object) {
                            setAggregateHoverInfo({
                                count: object.count,
                                x,
                                y
                            });
                        } else {
                            setAggregateHoverInfo(null);
                        }
                    }
                })
            );
        }

        if (migrationPaths.length > 0 && selectedStateId !== null) {
            baseLayers.push(
                new MigrationHistoryLayer({
                    id: 'migration-history',
                    paths: migrationPaths,
                    hexagons: hexagons
                })
            );
        }

        return baseLayers;
    }, [hexagonGeoJSON, showCells, showRegionColors, showIndividuals, showAggregatePoints, individuals, aggregatePoints, migrationPaths, selectedStateId]);

    // Render hover tooltip
    const renderTooltip = () => {
        if (hexagonHoverInfo) {
            const { object, x, y } = hexagonHoverInfo;
            const properties = object.properties as HexagonHoverProperties;

            return (
                <div className="tooltip" style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    padding: '8px',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    zIndex: 9
                }}>
                    <div><strong>State ID:</strong> {properties.state_id}</div>
                    <div><strong>Continent:</strong> {properties.continent_id}</div>
                    <div><strong>Coordinates:</strong> ({properties.center_lon.toFixed(2)}, {properties.center_lat.toFixed(2)})</div>
                </div>
            );
        }

        if (aggregateHoverInfo) {
            const { count, x, y } = aggregateHoverInfo;
            return (
                <div className="tooltip" style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    padding: '8px',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    zIndex: 9
                }}>
                    <div><strong>Individual Count:</strong> {count}</div>
                </div>
            );
        }

        if (pointHoverInfo) {
            const { object, x, y } = pointHoverInfo;
            const individual = object as Individual;

            return (
                <div className="tooltip" style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    padding: '8px',
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    maxWidth: '300px',
                    zIndex: 9
                }}>
                    <div><strong>ID:</strong> {individual.id}</div>
                    {individual.sample && <div><strong>Sample:</strong> {individual.sample}</div>}
                    {individual.region && <div><strong>Region:</strong> {individual.region}</div>}
                    {individual.source && <div><strong>Source:</strong> {individual.source}</div>}
                    {individual.sex && <div><strong>Sex:</strong> {individual.sex}</div>}
                </div>
            );
        }
        return null;
    };

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
                    isDragging ? 'grabbing' : (hexagonHoverInfo || pointHoverInfo ? 'pointer' : 'grab')
                }
            >
                <MapGL
                    mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                    mapStyle={currentMapStyle}
                    projection={MAP.PROJECTION}
                />
            </DeckGL>
            {renderTooltip()}
        </div>
    );
};

export default EurasiaMap;