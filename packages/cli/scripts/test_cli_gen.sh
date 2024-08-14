#!/bin/bash

# Set the locale to avoid illegal byte sequence errors
export LC_ALL=C

# Get the current working directory
current_dir=$(pwd)

# Generate a random string of length 16
random_root=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16)

# Construct the full path
bridge_i_root="${current_dir}/.test_cli_gen/${random_root}/.bridge"
obsidian_valut_root="${current_dir}/.test_cli_gen/${random_root}/.obsidian_vault"
blog_root="${current_dir}/.test_cli_gen/${random_root}/.blog"

echo "| BridgeInstall root: ${bridge_i_root}"
echo "| Obsidian vault root: ${obsidian_valut_root}"
echo "| Blog root: ${blog_root}"

# Run help command
node dist/index.cjs -h

# Run create command
node dist/index.cjs create "${bridge_i_root}" "${obsidian_valut_root}" "${blog_root}/static/contents" "${blog_root}/static/assets"

# Run install command
# node dist/index.cjs install "${bridge_i_root}"

# Create obsidian vault and blog directories
mkdir "${obsidian_valut_root}"
mkdir "${blog_root}/static/contents"
mkdir "${blog_root}/static/assets"

# Run plugin generate command
# 1. Generate build plugin
node dist/index.cjs plugin:build "${bridge_i_root}" build:contents AwesomePluginBuildContents
node dist/index.cjs plugin:build "${bridge_i_root}" build:tree
node dist/index.cjs plugin:build "${bridge_i_root}" walk:tree

# 2. Generate publish plugin
node dist/index.cjs plugin:publish "${bridge_i_root}" build
node dist/index.cjs plugin:publish "${bridge_i_root}" repository
node dist/index.cjs plugin:publish "${bridge_i_root}" deploy