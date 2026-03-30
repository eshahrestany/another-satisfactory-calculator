FROM rust:1-bookworm AS builder
WORKDIR /app

# Cache dependencies separately from source
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY src ./src
# Force rebuild of the real binary
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/satisfactory-calculator .
COPY data.json .

ENV DATA_PATH=/app/data.json
ENV DB_PATH=/data/factories.db

EXPOSE 3000
VOLUME ["/data"]

CMD ["./satisfactory-calculator"]
