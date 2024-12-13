import React, {useEffect, useMemo, useState} from "react";
import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import {GeoJsonLayer, LineLayer, ScatterplotLayer} from "@deck.gl/layers";
import { COORDINATE_SYSTEM, MapView, MapViewState } from "@deck.gl/core";
import { Feature, FeatureCollection, Geometry } from "geojson";
import {
    Hexagon,
    HexagonHoverInfo,
    HexagonHoverProperties,
    Individual,
    PointCluster,
    PointHoverInfo,
    PointState
} from "../types/api-types";
import { COLORS, MAP, MAPBOX } from "../utils/constants";

// MapBox configuration
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

interface EurasiaMapProps {
    showCells: boolean;
    showCountryBorders: boolean;
    showRegionColors: boolean;
    showIndividuals: boolean;
    individuals: Individual[];
    hexagons: Hexagon[];
}

const EurasiaMap: React.FC<EurasiaMapProps> = ({
                                                   showCells,
                                                   showCountryBorders,
                                                   showRegionColors,
                                                   showIndividuals,
                                                   individuals,
                                                   hexagons
                                               }) => {
    const [viewState, setViewState] = useState<MapViewState>(MAP.INITIAL_VIEW);
    const [hexagonHoverInfo, setHexagonHoverInfo] = useState<HexagonHoverInfo | null>(null);
    const [pointHoverInfo, setPointHoverInfo] = useState<PointHoverInfo | null>(null);

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

        return baseLayers;
    }, [hexagonGeoJSON, showCells, showRegionColors, showIndividuals, individuals]);

    // Render hover tooltip
    const renderTooltip = () => {
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