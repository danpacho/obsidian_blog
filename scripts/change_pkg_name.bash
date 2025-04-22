#!/usr/bin/env bash
set -e

OLD="@obsidian_blogger/plugin"
NEW="@obsidian_blogger/plugin_api"

# 1) Rename the package itself
sed -i '' "s|\"name\": \"$OLD\"|\"name\": \"$NEW\"|" packages/plugin_api/package.json

# 2) Update import/require lines in all source files under packages/
grep -RIl --exclude-dir=node_modules --include=\*.{js,jsx,ts,tsx} "$OLD" packages/ | while read -r file; do
  sed -i '' "s|$OLD|$NEW|g" "$file"
done

# 3) Update dependencies in each package.json, skipping devDependencies if absent
for pkg in packages/*/package.json; do
  jq --arg old "$OLD" --arg new "$NEW" '
    # update normal dependencies
    .dependencies     |= (if has($old) then (. + {($new): .[$old]}) | del(.[$old]) else . end)
    |
    # only update devDependencies if it exists
    (if has("devDependencies")
     then .devDependencies |= (if has($old) then (. + {($new): .[$old]}) | del(.[$old]) else . end)
     else . end)
  ' "$pkg" > "$pkg.tmp" \
    && mv "$pkg.tmp" "$pkg"
done

echo "✅ Renamed $OLD → $NEW in package.json deps and in all source imports."
