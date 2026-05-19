#!/bin/bash

# CodePulse Benchmark Runner
# Measures performance against the generated test project

TARGET_DIR="./benchmark/test-project"
RESULTS_FILE="./benchmark/results.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}🚀 Starting CodePulse Benchmark${NC}"
echo "Project Size: $(find $TARGET_DIR -name "*.ts" | xargs wc -l | tail -n 1 | awk '{print $1}') lines of code"
echo "-----------------------------------------------"

# 1. Compilation check
if [ ! -f "./dist/index.js" ]; then
    echo -e "${BLUE}Compiling project for production-grade measurement...${NC}"
    npx tsc && cp -r src/locales dist/
fi

# 2. Precision Measurement & Comparison
node benchmark/precision_bench.js
