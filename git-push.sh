#!/bin/bash

# Git Push Script - Push to dev or main branch with commit message
# Usage: ./git-push.sh dev "commit message"
#        ./git-push.sh main "commit message"

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VALID_BRANCHES=("dev" "main")

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to display usage
show_usage() {
    echo -e "${BLUE}Git Push Script${NC}"
    echo ""
    echo "Usage: $0 <branch> <commit-message>"
    echo ""
    echo "Arguments:"
    echo "  <branch>           Target branch (dev or main)"
    echo "  <commit-message>   Commit message (use quotes for messages with spaces)"
    echo ""
    echo "Examples:"
    echo "  $0 dev 'Add new feature'"
    echo "  $0 main 'Fix: critical bug'"
    echo ""
}

# Validate arguments
if [[ $# -lt 2 ]]; then
    print_error "Missing arguments"
    show_usage
    exit 1
fi

BRANCH="$1"
COMMIT_MSG="$2"

# Validate branch name
if [[ ! " ${VALID_BRANCHES[@]} " =~ " ${BRANCH} " ]]; then
    print_error "Invalid branch: '$BRANCH'"
    print_warning "Valid branches are: ${VALID_BRANCHES[*]}"
    exit 1
fi

# Validate commit message
if [[ -z "$COMMIT_MSG" ]]; then
    print_error "Commit message cannot be empty"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

print_status "Starting git push to '$BRANCH' branch..."

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_status "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_status "Staging all changes..."
    git add -A
    print_success "Changes staged"
else
    print_status "No unstaged changes"
fi

# Commit changes
print_status "Creating commit: '$COMMIT_MSG'"
if git commit -m "$COMMIT_MSG" 2>/dev/null; then
    print_success "Commit created"
else
    print_warning "Nothing to commit (working tree clean or already committed)"
fi

# Check if branch exists remotely
if git rev-parse --verify origin/"$BRANCH" >/dev/null 2>&1; then
    print_status "Remote branch 'origin/$BRANCH' exists"
else
    print_warning "Remote branch 'origin/$BRANCH' does not exist, creating..."
fi

# Push to remote branch
print_status "Pushing to 'origin/$BRANCH'..."
if git push -u origin "$BRANCH"; then
    print_success "Successfully pushed to 'origin/$BRANCH'"
else
    print_error "Failed to push to 'origin/$BRANCH'"
    exit 1
fi

print_success "All done! Pushed to $BRANCH branch"

# Display summary
echo ""
echo -e "${GREEN}=== Push Summary ===${NC}"
echo "Branch:  $BRANCH"
echo "Message: $COMMIT_MSG"
echo "Remote:  origin/$BRANCH"
echo ""

