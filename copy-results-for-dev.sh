#!/bin/bash

# Script to copy results directory to public folder for development
# This ensures the results directory is accessible during development

echo "Copying results directory to public folder for development..."

# Remove existing results directory in public if it exists
if [ -d "public/results" ]; then
    echo "Removing existing public/results directory..."
    rm -rf public/results
fi

# Copy results directory to public folder
echo "Copying results directory to public folder..."
cp -r results public/

echo "Results directory copied successfully!"
echo "You can now run 'npm run dev' and the results should be accessible."
