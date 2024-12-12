FROM rust:1.75 as builder

# Install PostGIS dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev

WORKDIR /usr/src/app
COPY . .

# Build the application
RUN cargo build --release --bin gaia_backend

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/gaia_backend /usr/local/bin/

CMD ["gaia_backend"]