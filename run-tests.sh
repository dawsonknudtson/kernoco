#!/bin/bash

# Comprehensive Test Runner for Kernoco
# This script runs all tests for both backend and frontend

echo "🧪 Starting Kernoco Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Function to run backend tests
run_backend_tests() {
    print_status "🔧 Running Backend Tests..." $YELLOW
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "📦 Installing backend dependencies..." $YELLOW
        npm install
    fi
    
    # Run tests
    npm test
    backend_exit_code=$?
    
    if [ $backend_exit_code -eq 0 ]; then
        print_status "✅ Backend tests passed!" $GREEN
    else
        print_status "❌ Backend tests failed!" $RED
    fi
    
    cd ..
    return $backend_exit_code
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "⚛️  Running Frontend Tests..." $YELLOW
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "📦 Installing frontend dependencies..." $YELLOW
        npm install
    fi
    
    # Run tests
    npm test
    frontend_exit_code=$?
    
    if [ $frontend_exit_code -eq 0 ]; then
        print_status "✅ Frontend tests passed!" $GREEN
    else
        print_status "❌ Frontend tests failed!" $RED
    fi
    
    cd ..
    return $frontend_exit_code
}

# Function to run coverage reports
run_coverage() {
    print_status "📊 Generating Coverage Reports..." $YELLOW
    
    # Backend coverage
    cd backend
    npm run test:coverage
    cd ..
    
    # Frontend coverage
    cd frontend
    npm run test:coverage
    cd ..
    
    print_status "📈 Coverage reports generated in backend/coverage and frontend/coverage" $GREEN
}

# Main execution
main() {
    # Check if specific test suite is requested
    case "$1" in
        "backend")
            run_backend_tests
            exit $?
            ;;
        "frontend")
            run_frontend_tests
            exit $?
            ;;
        "coverage")
            run_coverage
            exit 0
            ;;
        *)
            # Run all tests
            run_backend_tests
            backend_result=$?
            
            run_frontend_tests
            frontend_result=$?
            
            echo ""
            print_status "📋 Test Summary:" $YELLOW
            print_status "================================" $YELLOW
            
            if [ $backend_result -eq 0 ]; then
                print_status "Backend: ✅ PASSED" $GREEN
            else
                print_status "Backend: ❌ FAILED" $RED
            fi
            
            if [ $frontend_result -eq 0 ]; then
                print_status "Frontend: ✅ PASSED" $GREEN
            else
                print_status "Frontend: ❌ FAILED" $RED
            fi
            
            if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
                print_status "🎉 All tests passed!" $GREEN
                exit 0
            else
                print_status "💥 Some tests failed!" $RED
                exit 1
            fi
            ;;
    esac
}

# Make sure we're in the project root
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_status "❌ Please run this script from the project root directory" $RED
    exit 1
fi

# Run main function with all arguments
main "$@"
