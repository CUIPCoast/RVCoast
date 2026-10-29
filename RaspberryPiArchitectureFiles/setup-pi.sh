#!/bin/bash
# setup-pi.sh - one-time setup for a freshly flashed Raspberry Pi (Pi OS Bookworm or newer)
# Copy this folder to the Pi, then run from inside it:
#   bash setup-pi.sh
# Optional: CAN_OSCILLATOR=8000000 bash setup-pi.sh   (match the crystal printed on your CAN HAT)

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_USER="$(whoami)"
CAN_OSCILLATOR="${CAN_OSCILLATOR:-12000000}"

echo "==> Installing system packages"
sudo apt update
sudo apt upgrade -y
sudo apt install -y can-utils net-tools git curl

# NodeSource 22 LTS - Debian's packaged node is too old on some releases
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "==> Installing server dependencies in $APP_DIR"
cd "$APP_DIR"
[ -f package.json ] || npm init -y >/dev/null
npm install express body-parser cors ws modbus-serial

echo "==> Enabling SPI and the MCP2515 CAN overlay"
BOOT_CONFIG=/boot/firmware/config.txt
[ -f "$BOOT_CONFIG" ] || BOOT_CONFIG=/boot/config.txt
sudo raspi-config nonint do_spi 0
if ! grep -q "mcp2515-can0" "$BOOT_CONFIG"; then
  echo "dtoverlay=mcp2515-can0,oscillator=${CAN_OSCILLATOR},interrupt=25,spimaxfrequency=2000000" | sudo tee -a "$BOOT_CONFIG"
fi

echo "==> Creating can0 service (250 kbps RV-C)"
sudo tee /etc/systemd/system/can0.service >/dev/null <<EOF
[Unit]
Description=Bring up can0 at 250 kbps (RV-C)
BindsTo=sys-subsystem-net-devices-can0.device
After=sys-subsystem-net-devices-can0.device

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/sbin/ip link set can0 type can bitrate 250000 restart-ms 100
ExecStart=/sbin/ip link set can0 up
ExecStop=/sbin/ip link set can0 down

[Install]
WantedBy=sys-subsystem-net-devices-can0.device
EOF

echo "==> Creating rv-control service"
sudo tee /etc/systemd/system/rv-control.service >/dev/null <<EOF
[Unit]
Description=RV Control API Server
After=network-online.target can0.service
Wants=network-online.target

[Service]
ExecStart=/usr/bin/node ${APP_DIR}/server.js
WorkingDirectory=${APP_DIR}
Restart=always
RestartSec=3
User=${RUN_USER}

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable can0.service rv-control.service

echo
echo "Done. Reboot to load the CAN overlay:  sudo reboot"
echo "After reboot check:  ip -details link show can0   and   systemctl status rv-control"
