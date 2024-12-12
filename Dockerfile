FROM rust:1.75 as builder

# Install PostGIS dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev

WORKDIR /usr/src/app
COPY . .

# Rename cargo.toml to Cargo.toml
RUN mv backend/cargo.toml backend/Cargo.toml

# Enable offline mode for sqlx
ENV SQLX_OFFLINE=true

# Build the application
RUN cd backend && cargo build --release --bin gaia_backend

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/backend/target/release/gaia_backend /usr/local/bin/

CMD ["gaia_backend"]