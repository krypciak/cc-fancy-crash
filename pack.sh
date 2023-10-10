#!/bin/sh
BASE_NAME="$(jq '.id' ccmod.json | sed 's/^"//;s/"$//')"
NAME="${BASE_NAME}" #-$(jq '.version' ccmod.json | sed 's/^"//;s/"$//').zip"
rm -rf "$BASE_NAME"*
echo not running in build mode
npm install
# npm run build
npm run start
zip -r "$NAME" ./ -x "*.ccmod" "*.zip" "node_modules/*" ".git*" "*.ts" "README.md" "tsconfig.json" "pack.sh" "package-lock.json"
