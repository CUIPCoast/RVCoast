[Unit]
Description=RV Control API Server
After=network.target can0.service

[Service]
ExecStart=/usr/bin/node /home/pi/rv-control/server.js
WorkingDirectory=/home/pi/rv-control
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
