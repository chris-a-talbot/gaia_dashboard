import React, { useState, useCallback, useEffect } from 'react';
import EurasiaMap from './components/EurasiaMap';
import './style/sidebar.css';
import { SIDEBAR } from "./utils/constants";
import {Hexagon, Individual} from "./types/api-types";
import {getHexagons, getIndividuals} from "./utils/api";

const App = () => {
    // ========================================================================
    // State Management
    // ========================================================================

    // Sidebar visibility and dimensions
    const [showRightSidebar, setShowRightSidebar] = useState(true);
    const [rightSidebarWidth, setRightSidebarWidth] = useState(SIDEBAR.DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    // Visualization controls
    const [showCells, setShowCells] = useState(true);
    const [showRegionColors, setShowRegionColors] = useState(false);
    const [showCountryBorders, setShowCountryBorders] = useState(false);
    const [showIndividuals, setShowIndividuals] = useState(false);
    const [showAggregatePoints, setShowAggregatePoints] = useState(false);

    // Data
    const [hexagons, setHexagons] = useState<Hexagon[]>([]);
    const [individuals, setIndividuals] = useState<Individual[]>([]);

    // ========================================================================
    // Event Handlers
    // ========================================================================

    useEffect(() => {
        const fetchHexagons = async () => {
            try {
                const data = await getHexagons();
                setHexagons(data);
            } catch (error) {
                console.error('Error fetching hexagons:', error);
            }
        };

        const fetchIndividuals = async () => {
            try {
                const data = await getIndividuals();
                setIndividuals(data);
            } catch (error) {
                console.error('Error fetching individuals:', error);
            }
        }

        fetchIndividuals();
        fetchHexagons();
    }, []);

    useEffect(() => {
        if (showAggregatePoints && showIndividuals) {
            setShowIndividuals(false);
        }
    }, [showAggregatePoints]);

    // Manages sidebar resizing interaction
    const startResizing = useCallback((side: 'right') => {
        setIsResizing(true);

        const handleMouseMove = (e: MouseEvent) => {
            const width = window.innerWidth - e.clientX;
            setRightSidebarWidth(Math.min(Math.max(width, SIDEBAR.MIN_WIDTH), SIDEBAR.MAX_WIDTH));
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
                    showCells={showCells}
                    showRegionColors={showRegionColors}
                    showCountryBorders={showCountryBorders}
                    showIndividuals={showIndividuals}
                    showAggregatePoints={showAggregatePoints}
                    individuals={individuals}
                    hexagons={hexagons}
                />
            </div>

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
                        <p>Total Hexcells: 177</p>
                        <p>Gaia is a novel method by Grundler et al. (2024) which infers the geographic history of
                            ancestors of contemporary genomic samples. This interactive map visualizes the output of a
                            gaia analysis run on data from the Human Genome Diversity Project.</p>
                    </div>

                    <div className="info-panel">
                        <h3>Visualization</h3>

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
                            <h4>Visualization</h4>
                            <label className="toggle-label">
                                Show Individual Points
                                <input
                                    type="checkbox"
                                    checked={showIndividuals}
                                    onChange={(e) => {
                                        setShowIndividuals(e.target.checked);
                                        if (e.target.checked) {
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
                                        if (e.target.checked) {
                                            setShowIndividuals(false);
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
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