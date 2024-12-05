# Human Genetic Ancestry Visualization

An interactive visualization tool for exploring the geographic history of human genetic ancestry, based on *gaia* by Grundler et al. (2024). Note that this tool is still in early stages.

Try it out here: https://chris-a-talbot.com/gaia_visualizer/

## Overview

This application provides an interactive map interface for visualizing the movement and distribution of human genetic ancestry across Eurasia and Africa. 

## Technical Stack

- React
- DeckGL for WebGL-powered data visualization
- Mapbox GL JS for base map rendering
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Mapbox API token
- Access to genetic data files:
    - `landgrid_wgs84.geojson` - Hexagonal grid data
    - `coords_wgs84.json` - Point coordinate data

## Environment Setup

1. Clone the repository
2. Create a `.env` file in the root directory with your Mapbox token:
```
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

## Data Structure

The application expects two main data files:

### Point Data (`coords_wgs84.json`)
```typescript
interface PointData {
  node_id: string;
  latitude: number;
  longitude: number;
}
```

### Hexagon Grid Data (`landgrid_wgs84.geojson`)
GeoJSON file containing the hexagonal grid overlay for the map.


## Features

1. **Interactive Map**
    - Pan, zoom, and rotate controls
    - Point selection
    - Hover tooltips

2. **Data Visualization**
    - Geographic point distribution
    - Hexagonal grid overlay
    - Color-coded data representation

3. **UI Controls**
    - Resizable sidebars
    - Detailed point information
    - Map statistics

## License

Research and code released under CC-BY 4.0 International license.

## Citation

If you use this visualization in your research, please cite:
```
Grundler, M. C., Terhorst, J., & Bradburd, G. S. (2024). A geographic history of human genetic ancestry. bioRxiv.
```
