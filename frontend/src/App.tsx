// ============================================================================
// App.tsx
// Main application component that manages the visualization interface and user
// interactions. Handles sidebar states, point selection, and visualization
// controls for the Gaia data explorer.
// ============================================================================

import React, {useState, useCallback} from 'react';
import EurasiaMap from './components/EurasiaMap';
import './style/sidebar.css';
import {GeorefEntry, PointCluster, PointData, RawFluxData} from "./types/types";
import fluxData from './data/flux_transformed.json';
import {SIDEBAR} from "./utils/constants";
import {formatTimePoint} from "./utils/utils";
import georefData from './data/georef-arg-min.json';
// @ts-ignore
const rawFluxData: RawFluxData = fluxData;
// @ts-ignore
const rawGeorefData: GeorefEntry[] = georefData;

console.log('Georef data structure:', {
    totalEntries: rawGeorefData.length,
    sampleEntry: rawGeorefData[0],
    uniqueEdgeIds: new Set(rawGeorefData.map(d => d.edge_id)).size,
    uniqueStateIds: new Set(rawGeorefData.map(d => d.state_id)).size
});

const App = () => {
    // ========================================================================
    // State Management
    // ========================================================================

    // Sidebar visibility and dimensions
    const [showRightSidebar, setShowRightSidebar] = useState(true);
    const [showLeftSidebar, setShowLeftSidebar] = useState(false);
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(SIDEBAR.DEFAULT_WIDTH);
    const [rightSidebarWidth, setRightSidebarWidth] = useState(SIDEBAR.DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    // Data point selection and visualization
    const [selectedPoint, setSelectedPoint] = useState<PointData | null>(null);
    const [expandedCluster, setExpandedCluster] = useState<PointCluster | null>(null);
    const [selectedCell, setSelectedCell] = useState<number | null>(null);

    // Visualization controls
    const [showPoints, setShowPoints] = useState(false);
    const [showCells, setShowCells] = useState(true);
    const [showAverageFlux, setshowAverageFlux] = useState(false);
    const [showTimeSeriesFlux, setShowTimeSeriesFlux] = useState(false);
    const [timeSeriesIndex, setTimeSeriesIndex] = useState(rawFluxData.time_series.length - 1);
    const [showAggregatePoints, setShowAggregatePoints] = useState(true);
    const [showRegionColors, setShowRegionColors] = useState(false);
    const [showCountryBorders, setShowCountryBorders] = useState(false);
    const [showDominantFluxOnly, setShowDominantFluxOnly] = useState(false);



    // ========================================================================
    // Event Handlers
    // ========================================================================

    // Handles cluster expansion/collapse when clicking point groups
    const handleClusterClick = (cluster: PointCluster) => {
        if (expandedCluster?.latitude === cluster.latitude &&
            expandedCluster?.longitude === cluster.longitude) {
            setExpandedCluster(null);
            setSelectedPoint(null);
            setShowLeftSidebar(false);
        } else {
            setExpandedCluster(cluster);
            setSelectedPoint(null);
            setShowLeftSidebar(false);
        }
    };

    // Handles individual point selection and sidebar display
    const handlePointClick = (point: PointData) => {
        if (selectedPoint && selectedPoint.individual_id === point.individual_id) {
            setSelectedPoint(null);
            setShowLeftSidebar(false);
        } else {
            setSelectedPoint(point);
            setShowLeftSidebar(true);
        }
    };

    // Manages sidebar resizing interaction
    const startResizing = useCallback((side: 'left' | 'right') => {
        setIsResizing(true);

        const handleMouseMove = (e: MouseEvent) => {
            if (side === 'left') {
                const width = e.clientX;
                setLeftSidebarWidth(Math.min(Math.max(width, SIDEBAR.MIN_WIDTH), SIDEBAR.MAX_WIDTH));
            } else {
                const width = window.innerWidth - e.clientX;
                setRightSidebarWidth(Math.min(Math.max(width, SIDEBAR.MIN_WIDTH), SIDEBAR.MAX_WIDTH));
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    // ========================================================================
    // Component Render
    // ========================================================================

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            position: 'relative',
            overflow: 'hidden',
            cursor: isResizing ? 'ew-resize' : 'default'
        }}>
            {/* Main Map Container */}
            <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
                <EurasiaMap
                    showPoints={showPoints}
                    showCells={showCells}
                    showRegionColors={showRegionColors}
                    showAverageFlux={showAverageFlux}
                    showTimeSeriesFlux={showTimeSeriesFlux}
                    showAggregatePoints={showAggregatePoints}
                    timeSeriesIndex={timeSeriesIndex}
                    selectedPoint={selectedPoint}
                    onPointClick={handlePointClick}
                    expandedCluster={expandedCluster}
                    onClusterClick={handleClusterClick}
                    showCountryBorders={showCountryBorders}
                    showDominantFluxOnly={showDominantFluxOnly}
                    onCellSelect={(cellId: number | null) => {
                        console.log('Cell selected:', cellId, 'Previous selected cell:', selectedCell); // Add this
                        if (cellId === selectedCell) {
                            setSelectedCell(null);
                        } else {
                            setSelectedCell(cellId);
                            setshowAverageFlux(false);
                            setShowTimeSeriesFlux(false);
                        }
                    }}
                    selectedCell={selectedCell}
                    georefData={rawGeorefData}
                />
            </div>

            {/* Left Sidebar - Point Details */}
            {selectedPoint && (
                <div
                    className={`sidebar left ${showLeftSidebar ? 'open' : 'closed'}`}
                    style={{
                        zIndex: 10,
                        width: leftSidebarWidth,
                        minWidth: leftSidebarWidth,
                    }}
                >
                    <button
                        className="toggle-button"
                        onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                    >
                        {showLeftSidebar ? '←' : '→'}
                    </button>

                    <div className="sidebar-content">
                        <h2>Point Details {selectedPoint && `(${selectedPoint.individual_id})`}</h2>

                        <div className="info-panel">
                            <h3>Location</h3>
                            <p>Node ID: {selectedPoint?.individual_id || 'N/A'}</p>
                            <p>Latitude: {selectedPoint?.latitude?.toFixed(4)}°N</p>
                            <p>Longitude: {selectedPoint?.longitude?.toFixed(4)}°E</p>
                        </div>

                        <div className="info-panel">
                            <h3>Details</h3>
                        </div>
                    </div>

                    <div
                        className="resize-handle right"
                        onMouseDown={() => startResizing('left')}
                    />
                </div>
            )}

            {/* Right Sidebar - Controls and Information */}
            <div
                className={`sidebar right ${showRightSidebar ? 'open' : 'closed'}`}
                style={{
                    zIndex: 10,
                    width: rightSidebarWidth,
                    minWidth: rightSidebarWidth,
                }}
            >
                <button
                    className="toggle-button"
                    onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                    {showRightSidebar ? '→' : '←'}
                </button>

                <div className="sidebar-content">
                    <h2>Gaia Visualizer</h2>

                    <div className="info-panel">
                        <h3>Info</h3>
                        <p>Total Points: 2,139</p>
                        <p>Total Hexcells: 177</p>
                        <p>Gaia is a novel method by Grundler et al. (2024) which infers the geographic history of
                            ancestors of contemporary genomic samples. This interactive map visualizes the output of a
                            gaia analysis run on data from the Human Genome Diversity Project.</p>
                    </div>

                    <div className="info-panel">
                        <h3>Visualization</h3>

                        <div className="control-group">
                            <h4>Points</h4>
                            <label className="toggle-label">
                                Show Individual Points
                                <input
                                    type="checkbox"
                                    checked={showPoints}
                                    onChange={(e) => {
                                        setShowPoints(e.target.checked);
                                        if (e.target.checked && showAggregatePoints) {
                                            setShowAggregatePoints(false);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>

                            <label className="toggle-label">
                                Show Aggregate Points
                                <input
                                    type="checkbox"
                                    checked={showAggregatePoints}
                                    onChange={(e) => {
                                        setShowAggregatePoints(e.target.checked);
                                        if (e.target.checked && showPoints) {
                                            setShowPoints(false);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="control-group">
                            <h4>Cells</h4>
                            <label className="toggle-label">
                                Show Cells
                                <input
                                    type="checkbox"
                                    checked={showCells}
                                    onChange={(e) => setShowCells(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>

                            {showCells && (
                                <label className="toggle-label">
                                    Show Region Colors
                                    <input
                                        type="checkbox"
                                        checked={showRegionColors}
                                        onChange={(e) => setShowRegionColors(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            )}
                        </div>

                        <div className="control-group">
                            <h4>Map Layers</h4>
                            <label className="toggle-label">
                                Show Country Borders
                                <input
                                    type="checkbox"
                                    checked={showCountryBorders}
                                    onChange={(e) => setShowCountryBorders(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="control-group">
                            <h4>Flux</h4>
                            <label className="toggle-label">
                                Show Average Flux
                                <input
                                    type="checkbox"
                                    checked={showAverageFlux}
                                    onChange={(e) => {
                                        setshowAverageFlux(e.target.checked);
                                        if (e.target.checked && showTimeSeriesFlux) {
                                            setShowTimeSeriesFlux(false);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>

                            <label className="toggle-label">
                                Show Time Series Flux
                                <input
                                    type="checkbox"
                                    checked={showTimeSeriesFlux}
                                    onChange={(e) => {
                                        setShowTimeSeriesFlux(e.target.checked);
                                        if (e.target.checked && showAverageFlux) {
                                            setshowAverageFlux(false);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>

                            {(showAverageFlux || showTimeSeriesFlux) && (
                                <label className="toggle-label">
                                    Dominant Flux Only
                                    <input
                                        type="checkbox"
                                        checked={showDominantFluxOnly}
                                        onChange={(e) => setShowDominantFluxOnly(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            )}
                        </div>

                        {showTimeSeriesFlux && (
                            <div className="control-row" style={{marginTop: '1rem'}}>
                                <label className="slider-label">
                                    Time Period: {formatTimePoint(timeSeriesIndex)}
                                    <input
                                        type="range"
                                        min={0}
                                        max={rawFluxData.time_series.length - 1}
                                        value={timeSeriesIndex}
                                        onChange={(e) => setTimeSeriesIndex(parseInt(e.target.value))}
                                        className="time-slider"
                                        style={{direction: 'rtl'}}
                                    />
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        color: '#888'
                                    }}>
                                        <span>{formatTimePoint(rawFluxData.time_series.length - 1)}</span>
                                        <span>Present</span>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="resize-handle left"
                    onMouseDown={() => startResizing('right')}
                />
            </div>
        </div>
    );
};

export default App;