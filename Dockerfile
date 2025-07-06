# CertM3 All-in-One Container
# Ubuntu-based container with API, middleware, signer, PostgreSQL, and nginx

FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV CERTM3_VERSION=1.6.1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg2 \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Add Node.js repository and install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install PostgreSQL
RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

# Install nginx
RUN apt-get update && apt-get install -y \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install -g pm2

# Install OpenSSL for CA operations
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create certM3 user and group
RUN groupadd -r certm3 && useradd -r -g certm3 -m -d /home/certm3 certm3

# Create necessary directories
RUN mkdir -p /opt/certm3 \
    /var/spool/certM3/logs \
    /var/spool/certM3/certs \
    /var/spool/certM3/private \
    /var/log/certM3 \
    /etc/certM3 \
    /var/run/certM3

# Set ownership
RUN chown -R certm3:certm3 /opt/certm3 \
    /var/spool/certM3 \
    /var/log/certM3 \
    /etc/certM3 \
    /var/run/certM3

# Set proper permissions
RUN chmod 755 /opt/certm3 \
    && chmod 755 /var/spool/certM3 \
    && chmod 755 /var/log/certM3 \
    && chmod 755 /etc/certM3 \
    && chmod 755 /var/run/certM3

# Copy packaged application files
COPY --chown=certm3:certm3 pkg/ /opt/certm3/

# Copy startup scripts
COPY --chown=certm3:certm3 docker/setup-database.sh /opt/certm3/
COPY --chown=certm3:certm3 docker/setup-ca.sh /opt/certm3/
COPY --chown=certm3:certm3 docker/init.sh /opt/certm3/

# Make scripts executable
RUN chmod +x /opt/certm3/setup-database.sh \
    && chmod +x /opt/certm3/setup-ca.sh \
    && chmod +x /opt/certm3/init.sh

# Copy configuration files
COPY --chown=certm3:certm3 docker/nginx.conf /etc/nginx/sites-available/certm3
COPY --chown=certm3:certm3 docker/postgresql.conf /etc/postgresql/14/main/postgresql.conf
COPY --chown=certm3:certm3 docker/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf

# Enable nginx site
RUN ln -sf /etc/nginx/sites-available/certm3 /etc/nginx/sites-enabled/ \
    && rm -f /etc/nginx/sites-enabled/default

# Expose ports
EXPOSE 80 443

# Set entrypoint to pass arguments to init.sh
ENTRYPOINT ["/opt/certm3/init.sh"] 