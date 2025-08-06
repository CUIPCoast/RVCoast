#!/bin/bash

# auto-wifi-connect.sh
# Automatically connects to RV wifi when it becomes available
# Place this script in /home/pi/rv-control/

RV_WIFI_SSID="GL-X750-d59"
RV_WIFI_PASSWORD="goodlife"  # Replace with actual password
INTERFACE="wlan0"
LOG_FILE="/var/log/auto-wifi-connect.log"
CHECK_INTERVAL=10  # Check every 10 seconds
MAX_RETRIES=3

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if we're connected to internet
check_internet() {
    ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1
    return $?
}

# Function to check if RV wifi is available
check_rv_wifi_available() {
    iwlist "$INTERFACE" scan 2>/dev/null | grep -q "ESSID:\"$RV_WIFI_SSID\""
    return $?
}

# Function to get current connected SSID
get_current_ssid() {
    iwgetid -r 2>/dev/null
}

# Function to connect to RV wifi
connect_to_rv_wifi() {
    local retry_count=0
    
    log_message "Attempting to connect to RV wifi: $RV_WIFI_SSID"
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        # Use wpa_supplicant configuration method
        sudo wpa_cli -i "$INTERFACE" disconnect >/dev/null 2>&1
        sleep 2
        
        # Add network if it doesn't exist
        network_id=$(sudo wpa_cli -i "$INTERFACE" add_network 2>/dev/null)
        
        if [ -n "$network_id" ]; then
            sudo wpa_cli -i "$INTERFACE" set_network "$network_id" ssid "\"$RV_WIFI_SSID\"" >/dev/null 2>&1
            sudo wpa_cli -i "$INTERFACE" set_network "$network_id" psk "\"$RV_WIFI_PASSWORD\"" >/dev/null 2>&1
            sudo wpa_cli -i "$INTERFACE" set_network "$network_id" priority 100 >/dev/null 2>&1  # High priority
            sudo wpa_cli -i "$INTERFACE" enable_network "$network_id" >/dev/null 2>&1
            sudo wpa_cli -i "$INTERFACE" select_network "$network_id" >/dev/null 2>&1
            sudo wpa_cli -i "$INTERFACE" reconnect >/dev/null 2>&1
            
            # Wait for connection
            sleep 15
            
            # Check if connected
            current_ssid=$(get_current_ssid)
            if [ "$current_ssid" = "$RV_WIFI_SSID" ]; then
                log_message "Successfully connected to RV wifi: $RV_WIFI_SSID"
                
                # Wait for DHCP and test internet
                sleep 10
                if check_internet; then
                    log_message "Internet connectivity confirmed via RV wifi"
                    return 0
                else
                    log_message "Connected to RV wifi but no internet access yet, continuing..."
                    return 0  # Still consider this a success
                fi
            fi
        fi
        
        retry_count=$((retry_count + 1))
        log_message "Connection attempt $retry_count failed, retrying..."
        sleep 5
    done
    
    log_message "Failed to connect to RV wifi after $MAX_RETRIES attempts"
    return 1
}

# Function to save current network configuration
save_network_config() {
    sudo wpa_cli -i "$INTERFACE" save_config >/dev/null 2>&1
}

# Main monitoring loop
main() {
    log_message "Starting auto WiFi connection monitor for RV network: $RV_WIFI_SSID"
    log_message "Check interval: ${CHECK_INTERVAL}s, Interface: $INTERFACE"
    
    while true; do
        current_ssid=$(get_current_ssid)
        
        # Check if we're already connected to RV wifi
        if [ "$current_ssid" = "$RV_WIFI_SSID" ]; then
            log_message "Already connected to RV wifi: $RV_WIFI_SSID"
        else
            log_message "Current connection: ${current_ssid:-"Not connected"}"
            
            # Check if RV wifi is available
            if check_rv_wifi_available; then
                log_message "RV wifi detected: $RV_WIFI_SSID"
                
                # Try to connect
                if connect_to_rv_wifi; then
                    save_network_config
                    log_message "Successfully switched to RV wifi"
                    
                    # Restart services that depend on network
                    log_message "Restarting network-dependent services..."
                    sudo systemctl restart rv-control >/dev/null 2>&1 || true
                else
                    log_message "Failed to connect to RV wifi, will retry on next cycle"
                fi
            else
                log_message "RV wifi not detected, continuing to monitor..."
            fi
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Handle script termination gracefully
trap 'log_message "Auto WiFi monitor stopped"; exit 0' SIGTERM SIGINT

# Check if running as root or with sudo capabilities
if [ "$EUID" -eq 0 ]; then
    log_message "Warning: Running as root. Consider running as pi user with sudo access."
fi

# Ensure log file exists and is writable
sudo touch "$LOG_FILE"
sudo chmod 666 "$LOG_FILE"

# Start main function
main

