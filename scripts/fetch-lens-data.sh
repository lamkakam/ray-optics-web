#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$SCRIPT_DIR/../src/__tests__/data/photons-to-photos"

curl -o "$SCRIPT_DIR/../src/__tests__/data/photons-to-photos/prime-no-glass-type.txt" https://www.photonstophotos.net/GeneralTopics/Lenses/OpticalBench/Data/DE01096057_Example01P.txt
curl -o "$SCRIPT_DIR/../src/__tests__/data/photons-to-photos/prime-with-glass-type.txt" https://www.photonstophotos.net/GeneralTopics/Lenses/OpticalBench/Data/CN216526482_Example01P.txt
curl -o "$SCRIPT_DIR/../src/__tests__/data/photons-to-photos/zoom-wide-angle-aspherical-no-glass-type.txt" https://www.photonstophotos.net/GeneralTopics/Lenses/OpticalBench/Data/US20140354857_Example07P.txt
curl -o "$SCRIPT_DIR/../src/__tests__/data/photons-to-photos/prime-fisheye-aspherical-no-glass-type.txt" https://www.photonstophotos.net/GeneralTopics/Lenses/OpticalBench/Data/US003524697_Example02.txt
