#!/usr/bin/env bash
# Font-parity smoke test for bf-gotenberg (Phase 5, STEP 7).
# Converts the 3 known font-risk forms through the live Gotenberg and saves PDFs to eyeball.
# No secrets baked in — reads them from the environment:
#   export GOTENBERG_URL="https://bf-gotenberg.fly.dev"
#   export GOTENBERG_USER="bfpacket"
#   export GOTENBERG_PASS="<the secret you set with fly secrets>"
#   ./smoke-test.sh
set -euo pipefail

: "${GOTENBERG_URL:?set GOTENBERG_URL}"
: "${GOTENBERG_USER:?set GOTENBERG_USER}"
: "${GOTENBERG_PASS:?set GOTENBERG_PASS}"

FORMS="/c/Users/smins/OneDrive/Documents/Claude Co Work Root/Outfitter and Guide Policy Packet Builder/Forms"
OUT="${OUT:-$HOME/gotenberg-smoke}"
mkdir -p "$OUT"

FILES=(
  "$FORMS/Dynamic/BFOG 01 08 01 26 Hired and Nonowned Auto Endorsement.docx"   # font-embedded
  "$FORMS/Dynamic/SLC-3 USA NMA2868 Lloyds Common Policy Declarations.docx"    # font-embedded
  "$FORMS/Dynamic/CG 20 12 04 13 ADDITIONAL INSURED – STATE OR GOVERNMENTAL AGENCY OR SUBDIVISION OR POLITICAL SUBDIVISION – PERMITS OR AUTHORIZATIONS.docx"  # Times New Roman (drift case)
)

for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "MISSING: $f"; continue; }
  name="$(basename "$f" .docx)"
  code=$(curl -s -w "%{http_code}" -u "$GOTENBERG_USER:$GOTENBERG_PASS" \
    -F "files=@$f" "$GOTENBERG_URL/forms/libreoffice/convert" -o "$OUT/$name.pdf")
  size=$(wc -c < "$OUT/$name.pdf" 2>/dev/null || echo 0)
  echo "[$code] $name.pdf  ($size bytes)"
done

echo "Saved to $OUT — open each and confirm: correct fonts, no tofu/boxes, layout intact."
