#!/bin/bash

# Script to clean up the copied results directory from public folder
# This removes the development copy of results from public folder

echo "Cleaning up development results directory from public folder..."

# Remove results directory from public folder if it exists
if [ -d "public/results" ]; then
    echo "Removing public/results directory..."
    rm -rf public/results
    echo "Development results directory cleaned up successfully!"
else
    echo "No public/results directory found to clean up."
fi
