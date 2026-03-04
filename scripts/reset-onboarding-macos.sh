#!/usr/bin/env bash

set -euo pipefail

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "This script only supports macOS."
  exit 1
fi

FORCE=false
SKIP_TCC=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      FORCE=true
      shift
      ;;
    --skip-tcc-reset)
      SKIP_TCC=true
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: scripts/reset-onboarding-macos.sh [options]

Reset Mantle onboarding state on macOS:
- stop/remove Mantle launch daemons + sudoers entry
- remove VirtualHID driver artifacts
- clear Mantle app config/profiles
- reset Input Monitoring + Accessibility permissions (global)

Options:
  -y, --yes           Skip confirmation prompt
  --skip-tcc-reset    Do not run `tccutil reset`
  -h, --help          Show this help
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help to see valid options."
      exit 1
      ;;
  esac
done

KANATA_DAEMON_LABEL="com.mantle.kanata"
VHID_DAEMON_LABEL="com.mantle.vhid-daemon"

KANATA_DAEMON_PLIST="/Library/LaunchDaemons/com.mantle.kanata.plist"
VHID_DAEMON_PLIST="/Library/LaunchDaemons/com.mantle.vhid-daemon.plist"
MANTLE_SUDOERS="/etc/sudoers.d/mantle"
MANTLE_LOG_DIR="/var/log/mantle"

DRIVER_INSTALL_DIR="/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice"
VHID_MANAGER_APP="/Applications/.Karabiner-VirtualHIDDevice-Manager.app"
DRIVER_UNINSTALL_SCRIPT="$DRIVER_INSTALL_DIR/scripts/uninstall.sh"
DRIVER_PKG_RECEIPT_ID="org.pqrs.Karabiner-DriverKit-VirtualHIDDevice"

HOMEBREW_CASKROOM_ARM64="/opt/homebrew/Caskroom/karabiner-elements"
HOMEBREW_CASKROOM_X64="/usr/local/Caskroom/karabiner-elements"

APP_SUPPORT_ROOT="$HOME/Library/Application Support"

log() {
  printf "==> %s\n" "$1"
}

warn() {
  printf "WARNING: %s\n" "$1"
}

run_maybe() {
  local description="$1"
  shift

  if "$@"; then
    log "$description"
  else
    warn "$description (continuing)"
  fi
}

remove_path_if_exists() {
  local target="$1"
  if [[ -e "$target" ]]; then
    sudo rm -rf "$target"
    log "Removed $target"
  fi
}

if [[ "$FORCE" != true ]]; then
  cat <<'EOF'
This will reset local onboarding state for Mantle on this Mac.

Actions:
  - Stop/unload Mantle launch daemons
  - Remove Mantle daemon plists + sudoers + logs
  - Remove Karabiner VirtualHID driver files
  - Delete Mantle app config/profiles in ~/Library/Application Support
  - Reset Input Monitoring + Accessibility permissions via tccutil (global reset)
EOF
  printf "\nContinue? [y/N]: "
  read -r reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

log "Requesting sudo access..."
sudo -v

run_maybe "Booted out $KANATA_DAEMON_LABEL" sudo launchctl bootout "system/$KANATA_DAEMON_LABEL"
run_maybe "Booted out $VHID_DAEMON_LABEL" sudo launchctl bootout "system/$VHID_DAEMON_LABEL"

run_maybe "Killed kanata process if running" sudo pkill -f "kanata_(macos|linux|windows)"
run_maybe "Killed VirtualHID daemon process if running" sudo pkill -f "Karabiner-VirtualHIDDevice-Daemon"

if [[ -x "$DRIVER_UNINSTALL_SCRIPT" ]]; then
  run_maybe "Ran VirtualHID uninstall script" sudo "$DRIVER_UNINSTALL_SCRIPT"
fi

remove_path_if_exists "$KANATA_DAEMON_PLIST"
remove_path_if_exists "$VHID_DAEMON_PLIST"
remove_path_if_exists "$MANTLE_SUDOERS"
remove_path_if_exists "$MANTLE_LOG_DIR"
remove_path_if_exists "$DRIVER_INSTALL_DIR"
remove_path_if_exists "$VHID_MANAGER_APP"

if pkgutil --pkgs | /usr/bin/grep -q "^${DRIVER_PKG_RECEIPT_ID}$"; then
  run_maybe "Forgot pkg receipt $DRIVER_PKG_RECEIPT_ID" sudo pkgutil --forget "$DRIVER_PKG_RECEIPT_ID"
fi

if [[ -d "$HOMEBREW_CASKROOM_ARM64" ]]; then
  remove_path_if_exists "$HOMEBREW_CASKROOM_ARM64"
fi
if [[ -d "$HOMEBREW_CASKROOM_X64" ]]; then
  remove_path_if_exists "$HOMEBREW_CASKROOM_X64"
fi

if [[ -d "$APP_SUPPORT_ROOT" ]]; then
  shopt -s nullglob
  for mantle_dir in "$APP_SUPPORT_ROOT"/com.mantle*; do
    if [[ -d "$mantle_dir/kanata" ]]; then
      rm -rf "$mantle_dir/kanata"
      log "Removed $mantle_dir/kanata"
    fi
  done
  shopt -u nullglob
fi

if [[ "$SKIP_TCC" == true ]]; then
  warn "Skipped TCC permission reset (--skip-tcc-reset)."
else
  run_maybe "Reset Input Monitoring for Mantle" tccutil reset ListenEvent com.mantle.app
  run_maybe "Reset Accessibility for Mantle" tccutil reset Accessibility com.mantle.app
fi

cat <<'EOF'

Reset complete.
Next launch should trigger:
  1) first-run profile wizard (if no profiles exist)
  2) driver install + extension approval onboarding
  3) Input Monitoring permission onboarding
EOF
