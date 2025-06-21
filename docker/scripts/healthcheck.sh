#!/bin/sh

# Basic health check for nginx
if ! pgrep nginx > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the application is responding
if ! wget --quiet --tries=1 --spider http://localhost:8080/health; then
    echo "Application health check failed"
    exit 1
fi

echo "Health check passed"
exit 0