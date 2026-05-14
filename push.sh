#!/bin/bash
# Run this once to upload your app to GitHub.
# Usage: bash push.sh

set -e

echo ""
echo "Uploading your Mage app to GitHub..."
echo ""

git push -u origin claude/html-to-android-app-t3M09

echo ""
echo "Done! Your code is now on GitHub."
echo ""
