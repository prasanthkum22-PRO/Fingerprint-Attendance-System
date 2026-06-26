#include <Arduino.h>
#include "config.h"
#include "wifi_manager.h"
#include "firebase_manager.h"
#include "fingerprint_manager.h"
#include "attendance_manager.h"

void setup() {
    Serial.begin(115200);
    
    // Setup Button and Peripherals
    pinMode(ENROLL_BUTTON_PIN, INPUT_PULLUP);
    pinMode(GREEN_LED, OUTPUT);
    pinMode(BUZZER, OUTPUT);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(BUZZER, LOW);
    
    // Initialize WiFi
    setupWiFi();
    
    // Initialize Firebase
    setupFirebase();
    
    // Fetch initial hardware sync settings
    fetchSettings();
    
    // Initialize Fingerprint Sensor
    setupFingerprint();
    
    Serial.println("System Ready. Scan your finger to log attendance.");
    Serial.println("Press the button to enroll a new fingerprint.");
    sendSystemLog("ESP32 System Boot: Ready for fingerprint scans");
}

unsigned long lastRemoteCheck = 0;
unsigned long lastSettingsCheck = 0;

void loop() {
    // Check if the enroll button is pressed
    if (digitalRead(ENROLL_BUTTON_PIN) == LOW) {
        delay(50); // Debounce
        if (digitalRead(ENROLL_BUTTON_PIN) == LOW) {
            Serial.println("Enroll Button Pressed! Entering Enrollment Mode...");
            enrollFingerprint();
            Serial.println("Exited Enrollment Mode. Ready for attendance.");
            delay(1000); // Wait a bit before resuming normal operations
        }
    }
    
    // Sync settings every 30 seconds
    if (millis() - lastSettingsCheck > 30000 || lastSettingsCheck == 0) {
        fetchSettings();
        lastSettingsCheck = millis();
    }
    
    // Check if there is a remote command request from Firebase
    if (millis() - lastRemoteCheck > 1500) {
        int remoteEnrollId = checkRemoteEnrollRequest();
        if (remoteEnrollId > 0) {
            Serial.print("Remote Enroll Triggered for ID: ");
            Serial.println(remoteEnrollId);
            enrollFingerprint(remoteEnrollId);
            Serial.println("Exited Remote Enrollment Mode. Ready for attendance.");
        }
        
        int remoteDeleteId = checkRemoteDeleteRequest();
        if (remoteDeleteId > 0) {
            Serial.print("Remote Delete Triggered for ID: ");
            Serial.println(remoteDeleteId);
            deleteFingerprint(remoteDeleteId);
            Serial.println("Exited Remote Deletion Mode. Ready for attendance.");
        }
        
        lastRemoteCheck = millis();
    }
    
    // Main attendance logic
    processAttendance();
    
    // Small delay for stability
    delay(50);
}
