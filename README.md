# Gaia Dashboard

An interactive visualization dashboard for exploring the geographic history of human genetic ancestry, based on *gaia*
by Grundler et al. (2024). This project includes data processing pipelines, a Rust backend API, and a React frontend 
visualization interface which can be found at https://chris-a-talbot.com/gaia_visualizer.

## Project Structure

```
gaia_dashboard/
├── frontend/          # React visualization interface
│   ├── src/          # React source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
├── backend/          # Rust API server
│   ├── src/          # Rust source code
│   └── Cargo.toml    # Backend dependencies
└── data_processing/  # R scripts for data preparation
    └── *.R           # Data processing pipelines
```

## Components

### Frontend Visualization
- Interactive map interface using DeckGL and Mapbox
- Real-time data visualization of genetic ancestry patterns
- Customizable visualization controls
- Built with React, TypeScript, and WebGL

### Backend API
- REST API for serving processed genetic data
- Efficient data querying and filtering
- Built with Rust and Axum framework
- PostgreSQL database for data storage

### Data Processing
- R scripts for processing raw genetic data
- Geographic coordinate transformation
- Flux calculations and data aggregation
- Migration path analysis

## Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- R (v4.0 or higher)
- PostgreSQL (v13 or higher)
- Mapbox API token

## Setup

### Frontend
```bash
cd frontend
npm install
# Create .env with your Mapbox token
echo "REACT_APP_MAPBOX_TOKEN=your_token_here" > .env
npm start
```

### Backend
```bash
cd backend
cargo build
cargo run
```

## Development

1. Start the backend server:
```bash
cd backend
cargo run
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The frontend will be available at http://localhost:3000

## Production Deployment

### Frontend
```bash
cd frontend
npm run build
```

### Backend
```bash
cd backend
cargo build --release
```

## Data Sources

- Human Genome Diversity Project data
- Grundler et al. (2024) *gaia* analysis
- Geographic reference data (landgrid)
- Mapbox Studio custom maps
  
## License

Research and code released under CC-BY 4.0 International license.

## Citation

If you use this visualization in your research, please cite:
```
Grundler, M. C., Terhorst, J., & Bradburd, G. S. (2024). A geographic history of human genetic ancestry. bioRxiv.
```
