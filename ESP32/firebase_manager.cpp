#include "firebase_manager.h"
#include "config.h"
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

int buzzerDuration = 200;
bool buzzerEnabled = true;
int matchThreshold = 50;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setupFirebase() {
    Serial.println("Setting up Firebase...");
    
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    
    // Assign the user sign in credentials
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;

    // Assign the token status callback for detailed status output
    config.token_status_callback = tokenStatusCallback;

    // Initialize the library with the Firebase authen and config
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    Serial.println("Firebase initialized");
    sendSystemLog("Firebase Initialized Successfully");
}

bool logAttendance(int fingerprintID) {
    if (Firebase.ready()) {
        String path = String(ATTENDANCE_PATH) + "/" + String(fingerprintID);
        
        FirebaseJson json;
        FirebaseJson ts;
        ts.set(".sv", "timestamp");
        json.set("timestamp", ts);
        json.set("status", "present");

        Serial.printf("Logging attendance for ID: %d...\n", fingerprintID);
        if (Firebase.RTDB.pushJSON(&fbdo, path.c_str(), &json)) {
            Serial.println("Attendance logged successfully!");
            String logMsg = "Successfully marked student present (Fingerprint ID: " + String(fingerprintID) + ")";
            sendSystemLog(logMsg.c_str());
            // Audible feedback according to settings
            if (buzzerEnabled) {
                digitalWrite(BUZZER, HIGH);
            }
            digitalWrite(GREEN_LED, HIGH);
            delay(buzzerDuration);
            digitalWrite(BUZZER, LOW);
            digitalWrite(GREEN_LED, LOW);
            return true;
        } else {
            Serial.println("Failed to log attendance:");
            Serial.println(fbdo.errorReason());
            String logMsg = "Failed to mark attendance for ID " + String(fingerprintID) + " (Error: " + String(fbdo.errorReason().c_str()) + ")";
            sendSystemLog(logMsg.c_str());
            return false;
        }
    }
    return false;
}

int checkRemoteEnrollRequest() {
    if (Firebase.ready()) {
        if (Firebase.RTDB.getInt(&fbdo, "/settings/enroll_id")) {
            if (fbdo.dataType() == "int") {
                int enrollID = fbdo.intData();
                if (enrollID > 0) {
                    // Reset the value in database to 0 immediately so it doesn't trigger again
                    Firebase.RTDB.setInt(&fbdo, "/settings/enroll_id", 0);
                    return enrollID;
                }
            }
        }
    }
    return 0;
}

void setEnrollStatus(const char* status) {
    if (Firebase.ready()) {
        Firebase.RTDB.setString(&fbdo, "/settings/enroll_status", status);
    }
}

int checkRemoteDeleteRequest() {
    if (Firebase.ready()) {
        if (Firebase.RTDB.getInt(&fbdo, "/settings/delete_id")) {
            if (fbdo.dataType() == "int") {
                int deleteID = fbdo.intData();
                if (deleteID > 0) {
                    // Reset immediately in DB
                    Firebase.RTDB.setInt(&fbdo, "/settings/delete_id", 0);
                    return deleteID;
                }
            }
        }
    }
    return 0;
}

void sendSystemLog(const char* message) {
    if (Firebase.ready()) {
        FirebaseJson json;
        FirebaseJson ts;
        ts.set(".sv", "timestamp");
        json.set("timestamp", ts);
        json.set("message", message);
        
        // Push to /logs node
        Firebase.RTDB.pushJSON(&fbdo, "/logs", &json);
    }
}

void fetchSettings() {
    if (Firebase.ready()) {
        int val = 0;
        if (Firebase.RTDB.getInt(&fbdo, "/settings/match_threshold")) {
            if (fbdo.dataType() == "int") {
                matchThreshold = fbdo.intData();
            }
        }
        if (Firebase.RTDB.getInt(&fbdo, "/settings/buzzer_duration")) {
            if (fbdo.dataType() == "int") {
                buzzerDuration = fbdo.intData();
            }
        }
        if (Firebase.RTDB.getBool(&fbdo, "/settings/buzzer_enabled")) {
            if (fbdo.dataType() == "boolean") {
                buzzerEnabled = fbdo.boolData();
            }
        }
        Serial.printf("Settings Sync: Match Threshold: %d, Buzzer Duration: %d ms, Buzzer Enabled: %s\n",
                      matchThreshold, buzzerDuration, buzzerEnabled ? "True" : "False");
    }
}
