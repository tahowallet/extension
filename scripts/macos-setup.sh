#!/bin/bash
set -e

echo "Installing jq..."
brew list jq &>/dev/null || brew install jq

echo "Installing yq..."
brew list yq &>/dev/null || brew install yq

echo "Installing pre-commit and specified hooks..."
brew list pre-commit &>/dev/null || brew install pre-commit
pre-commit install --install-hooks

echo "Installing nvm..."
brew list nvm &>/dev/null || brew install nvm

echo "Installing bun..."
if ! [ -x "$(command -v bun)" ]; then
  brew install bun
fi

echo "Setting up nvm and dependencies..."
nvm use
bun install

echo "Ready to rock! See above for any extra environment-related instructions."
