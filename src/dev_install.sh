#!/bin/sh

# This script tweaks the manifest to allow running both a production
# version of the system and a dev version from a cloned repo on
# the same installation of Foundry.

echo "Switching to dev mode for this installation."
echo "Warning - Do not check in system.json"

sed -i.bak "s/Cyberpunk RED - CORE/Cyberpunk RED - DEV/" system.json
sed -i.bak "s/\"cyberpunk-red-core\"/\"fvtt-cyberpunk-red-core\"/" system.json