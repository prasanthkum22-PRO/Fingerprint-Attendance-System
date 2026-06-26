# ESP32 to R307 Fingerprint Sensor Connections

| R307 Sensor Wire Color | Function | ESP32 Pin |
| :--- | :--- | :--- |
| **Red** | Power (VCC) | 3.3V or 5V (Check your sensor's rating, usually 3.3V is safer for ESP32) |
| **Black** | Ground (GND) | GND |
| **Yellow / Green** | TX (Transmit) | **RX2 (Pin 16)** |
| **White** | RX (Receive) | **TX2 (Pin 17)** |

> **Note**: Wire colors can vary by manufacturer. Usually, the first wire (closest to the edge) is VCC, followed by GND, TX, RX. 

---

# Indicator LED (Green Status Light) & Buzzer Wiring

### 🟢 Status LED Connection (Pins 2 & GND)
The Status LED turns ON/flashes during scans and enrollment steps.
1. Connect the **Anode** (longer leg of the LED) to ESP32 **Pin 2 (GPIO 2)** through a current-limiting resistor (e.g. 220Ω or 330Ω).
2. Connect the **Cathode** (shorter leg of the LED) to ESP32 **GND**.
*(Note: Most ESP32 development boards have a built-in blue LED on Pin 2 which will also mirror this behavior).*

### 🔊 Buzzer Connection (Pins 4 & GND)
The buzzer provides audio confirmations during check-ins and enrollment stages.
1. Connect the **Positive (+)** wire of the buzzer to ESP32 **Pin 4 (GPIO 4)**.
2. Connect the **Negative (-)** wire of the buzzer to ESP32 **GND**.

---

# Push Button Connections (For Enrolling New Fingers)

To register a new fingerprint manually from the board, you will use a physical push button.

1. Connect **one side** of the push button to ESP32 **Pin 5 (GPIO 5)**.
2. Connect the **other side** of the push button to ESP32 **GND**.

The code configures `INPUT_PULLUP` on Pin 5, so no external resistor is needed. When you press the button, Pin 5 connects to GND, triggering the ESP32 to enter "Enrollment Mode".
