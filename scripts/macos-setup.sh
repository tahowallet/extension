#!/bin/bash
set -e

echo "Installing jq..."
brew list jq &>/dev/null || brew install jq

echo "Installing pre-commit and specified hooks..."
brew list pre-commit &>/dev/null || brew install pre-commit
pre-commit install --install-hooks

echo "Installing nvm..."
brew list nvm &>/dev/null || brew install nvm

echo "Setting up nvm, yarn, and dependencies..."
nvm use
if ! [ -x "$(command -v yarn)" ]; then
  npm install -g yarn
fi
yarn install

echo "Ready to rock! See above for any extra environment-related instructions."
