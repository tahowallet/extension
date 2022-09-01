#!/usr/bin/env bash

# Meant to be run as an package.json `version` script using `yarn version`.
# Expects $npm_package_version to be set.

set -e # exit on any errored command

# Check for the correct branch name structure, otherwise attempt to switch to
# a new release branch off of latest origin/main.
if [[ "$(git branch --show-current)" != "release-$npm_package_version" ]]; then
	echo "Incorrect branch name, attempting to check out main into release-$npm_package_version for release."
	git stash -- package.json # stash version bump
	git fetch origin || echo "Failed to pull latest, release branch may be behind latest main. Continuing..."
	git checkout origin/main -b release-$npm_package_version
	git stash pop
fi

# Update manifest version and stage for version bump commit.
echo "$(jq ".version=\"$npm_package_version\"" manifest/manifest.json | yarn -s prettier --stdin-filepath=manifest.json)" > manifest/manifest.json
git add manifest/manifest.json

# Add version to bug template and stage for version bump commit.
yq e -i '.body[] |= select(has("id")) |= select(.id == "version").attributes.options = ["v'$npm_package_version'"] + select(.id == "version").attributes.options' .github/ISSUE_TEMPLATE/BUG.yml
git add .github/ISSUE_TEMPLATE/BUG.yml
