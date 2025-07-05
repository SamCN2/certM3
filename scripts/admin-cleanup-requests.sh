!/bin/bash

# Admin script to clean up hung requests
# Removes requests that are > 1 hour old and not verified

set -e

# Configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"certm3"}
DB_USER=${DB_USER:-"certm3"}
DB_PASSWORD=${DB_PASSWORD:-""}
DRY_RUN=${DRY_RUN:-"false"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

run_sql() {
    local query="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: $description"
        log_info "Query: $query"
        return 0
    fi
    
    if [ -n "$DB_PASSWORD" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query"
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Admin script to clean up hung requests that are > 1 hour old and not verified.

OPTIONS:
    -h, --host HOST        Database host (default: localhost)
    -p, --port PORT        Database port (default: 5432)
    -d, --database DB      Database name (default: certm3)
    -u, --user USER        Database user (default: certm3)
    -w, --password PASS    Database password
    --dry-run              Show what would be done without actually doing it
    --help                 Show this help message

EXAMPLES:
    $0 --dry-run
    $0 -h localhost -d certm3 -u certm3
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -w|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

cleanup_hung_requests() {
    log_info "Starting cleanup of hung requests..."
    log_info "Database: $DB_HOST:$DB_PORT/$DB_NAME (user: $DB_USER)"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN MODE - No changes will be made"
    fi
    
    # Find hung requests (> 1 hour old, status = 'pending')
    local hung_requests_query="
        SELECT 
            id,
            username,
            email,
            display_name,
            status,
            created_at,
            EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_old
        FROM requests 
        WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '1 hour'
        ORDER BY created_at ASC;
    "
    
    local hung_requests=$(run_sql "$hung_requests_query" "Finding hung requests")
    
    if [ -z "$hung_requests" ]; then
        log_success "No hung requests found!"
        return 0
    fi
    
    log_info "Found hung requests:"
    echo "$hung_requests" | while IFS='|' read -r id username email display_name status created_at hours_old; do
        id=$(echo "$id" | xargs)
        username=$(echo "$username" | xargs)
        email=$(echo "$email" | xargs)
        hours_old=$(echo "$hours_old" | xargs)
        
        if [ -n "$id" ]; then
            log_warn "  ID: $id, Username: $username, Email: $email, Age: ${hours_old}h"
        fi
    done
    
    # Count total hung requests
    local count_query="
        SELECT COUNT(*) 
        FROM requests 
        WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '1 hour';
    "
    
    local count=$(run_sql "$count_query" "Counting hung requests")
    count=$(echo "$count" | xargs)
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "Would delete $count hung requests"
        return 0
    fi
    
    # Ask for confirmation
    echo
    read -p "Delete $count hung requests? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        return 0
    fi
    
    # Delete hung requests
    local delete_query="
        DELETE FROM requests 
        WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '1 hour';
    "
    
    log_info "Deleting hung requests..."
    run_sql "$delete_query" "Deleting hung requests"
    
    # Verify deletion
    local verify_count=$(run_sql "$count_query" "Verifying deletion")
    verify_count=$(echo "$verify_count" | xargs)
    
    if [ "$verify_count" = "0" ]; then
        log_success "Successfully cleaned up $count hung requests!"
    else
        log_error "Cleanup may have failed. Remaining hung requests: $verify_count"
        return 1
    fi
}

show_statistics() {
    log_info "Current request statistics:"
    
    local stats_query="
        SELECT 
            status,
            COUNT(*) as count,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
        FROM requests 
        GROUP BY status
        ORDER BY status;
    "
    
    local stats=$(run_sql "$stats_query" "Getting request statistics")
    echo "$stats" | while IFS='|' read -r status count oldest newest; do
        status=$(echo "$status" | xargs)
        count=$(echo "$count" | xargs)
        oldest=$(echo "$oldest" | xargs)
        newest=$(echo "$newest" | xargs)
        
        if [ -n "$status" ]; then
            log_info "  $status: $count requests (oldest: $oldest, newest: $newest)"
        fi
    done
}

main() {
    log_info "CertM3 Admin Request Cleanup Script"
    log_info "=================================="
    
    show_statistics
    echo
    
    cleanup_hung_requests
    
    echo
    log_info "Final statistics:"
    show_statistics
}

main "$@" 
