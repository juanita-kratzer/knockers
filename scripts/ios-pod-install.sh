#!/usr/bin/env bash
# Run pod install in ios/App using Ruby 3.2.5 (rbenv).
# Use this if "npx cap sync ios" or plain "pod install" fails (e.g. wrong Ruby / ActiveSupport::Logger error).
# From project root: ./scripts/ios-pod-install.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_APP="$ROOT/ios/App"
RUBY_325="${RBENV_ROOT:-$HOME/.rbenv}/versions/3.2.5/bin"

if [[ ! -d "$RUBY_325" ]]; then
  echo "Ruby 3.2.5 not found at $RUBY_325. Install with: rbenv install 3.2.5"
  exit 1
fi

export PATH="$RUBY_325:/usr/bin:/bin"
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

cd "$IOS_APP"
"$RUBY_325/bundle" install --quiet 2>/dev/null || true
"$RUBY_325/bundle" exec pod install
echo "Pod install complete. Open ios/App/App.xcworkspace in Xcode to build and archive."
