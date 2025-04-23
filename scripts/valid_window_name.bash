#!/usr/bin/env bash
# sanitize-win-names.sh  – replace Windows-invalid characters with "_" via git mv

set -euo pipefail
shopt -s extglob   # enables extended patterns for parameter-expansion
IFS=$'\n\t'

ROOT="${1:-.}"

################################################################################
sanitize() {
  local s=$1

  # 1) replace any illegal character with _
  s=${s//[<>:\"\\\|\?*]/_}

  # 2) collapse *all* trailing dots/spaces into a single _
  while [[ $s =~ [[:space:].]$ ]]; do
    s=${s%?}       # drop last char
  done
  [[ $s == "" ]] && s="_"   # never emit empty name
  printf '%s' "$s"
}
export -f sanitize

################################################################################
# read the list in *this* shell so `set -e` will catch errors inside the loop
while IFS= read -r -d '' path; do
  name=${path##*/}                  # basename
  new=$(sanitize "$name")

  [[ $new == "$name" ]] && continue # already valid

  dir=${path%/*}
  target=$dir/$new

  if [[ -e $target ]]; then
    echo "❌  Skip: $target already exists" >&2
    continue
  fi

  echo "➔ git mv '$path' '$target'"
  git mv -- "$path" "$target"
done < <(find "$ROOT" -depth -print0)
