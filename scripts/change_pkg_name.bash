#!/usr/bin/env bash
set -e

OLD="@obsidian_blogger/plugin"
NEW="@obsidian_blogger/plugin_api"


# 1) rename in the package you’re publishing
sed -i '' "s|\"name\": \"$OLD\"|\"name\": \"$NEW\"|" packages/plugin_api/package.json

# 2) update every other package.json under packages/*
for pkg in packages/*/package.json; do
  jq --arg old "$OLD" --arg new "$NEW" '
    ( .dependencies     |= (if has($old) then (. + {($new): .[$old]}) | del(.[$old]) else . end))
  | ( .devDependencies  |= (if has($old) then (. + {($new): .[$old]}) | del(.[$old]) else . end))
  ' "$pkg" > "$pkg.tmp" \
    && mv "$pkg.tmp" "$pkg"
done
