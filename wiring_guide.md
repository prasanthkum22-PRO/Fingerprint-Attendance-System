# BioSync Hardware Wiring Reference Guide

This guide details the complete hardware connection schema for the Fingerprint Attendance System. Refer to the diagram below to hook up all components correctly.

---

## 🗺️ Wiring Connection Diagram

![ESP32 Fingerprint System Wiring Schematic](/C:/Users/prasanth/.gemini/antigravity-ide/brain/c4e76d9f-1c87-4e21-b2e6-c8cf93542b56/esp32_wiring_diagram_1782484373173.png)

---

## 🔌 Pin-Out Connections Table

| Component | Component pin | ESP32 GPIO Pin | Connection Notes |
| :--- | :--- | :--- | :--- |
| **R307 Sensor** | VCC | **3.3V** or **5V** | Power supply pin (check sensor rating; usually 3.3V is safe). |
| **R307 Sensor** | GND | **GND** | Ground reference connection. |
| **R307 Sensor** | TX (Green/Yellow) | **RX2 (GPIO 16)** | UART Serial Transmit line (crosses to RX). |
| **R307 Sensor** | RX (White) | **TX2 (GPIO 17)** | UART Serial Receive line (crosses to TX). |
| **Status LED** | Anode (+) | **GPIO 2** | Connect with an inline 220Ω resistor to protect the LED. |
| **Status LED** | Cathode (-) | **GND** | Negative return leg. |
| **Buzzer** | Positive (+) | **GPIO 4** | Active buzzer positive feed pin. |
| **Buzzer** | Negative (-) | **GND** | Ground connection. |
| **Push Button** | Terminal A | **GPIO 5** | Manually triggers the local enrollment mode. |
| **Push Button** | Terminal B | **GND** | Connects pin 5 to ground when pressed. |

---

## 💡 Quick Hardware Assembly Tips
1. **LED Resistor:** Do not omit the current-limiting resistor on the LED. Otherwise, the GPIO pin might draw too much current and get damaged.
2. **Serial Cross Connection:** Ensure TX on the R307 goes to RX2 (16) on the ESP32, and RX on the R307 goes to TX2 (17) on the ESP32.
3. **Internal Pull-up:** The push button does not need any pull-up resistor because the ESP32 code enables the internal pull-up resistor on GPIO 5 via `INPUT_PULLUP`.
