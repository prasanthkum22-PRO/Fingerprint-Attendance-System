#include "fingerprint_manager.h"
#include "config.h"
#include "firebase_manager.h"
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>

HardwareSerial mySerial(2); // Use UART2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setupFingerprint() {
    Serial.println("\n\nAdafruit finger detect test");

    // set the data rate for the sensor serial port
    mySerial.begin(FINGER_BAUDRATE, SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
    finger.begin(FINGER_BAUDRATE);
    delay(5);
    if (finger.verifyPassword()) {
        Serial.println("Found fingerprint sensor!");
        sendSystemLog("Adafruit Fingerprint Sensor Connected & Verified");
    } else {
        Serial.println("Did not find fingerprint sensor :(");
        sendSystemLog("Error: Did not find fingerprint sensor!");
        while (1) { delay(1); } // Halt if not found
    }

    finger.getTemplateCount();
    if (finger.templateCount == 0) {
        Serial.print("Sensor doesn't contain any fingerprint data. Please run the 'enroll' program.");
        sendSystemLog("Sensor database initialized (0 templates)");
    } else {
        Serial.println("Waiting for valid finger...");
        Serial.print("Sensor contains "); Serial.print(finger.templateCount); Serial.println(" templates");
        String logMsg = "Sensor database initialized (contains " + String(finger.templateCount) + " templates)";
        sendSystemLog(logMsg.c_str());
    }
}

int getFingerprintID() {
    uint8_t p = finger.getImage();
    if (p != FINGERPRINT_OK) return -1; // No finger detected

    p = finger.image2Tz();
    if (p != FINGERPRINT_OK) return -1;

    p = finger.fingerSearch();
    if (p == FINGERPRINT_OK) {
        Serial.print("Found ID #"); Serial.print(finger.fingerID);
        Serial.print(" with confidence of "); Serial.println(finger.confidence);
        
        if (finger.confidence >= matchThreshold) {
            return finger.fingerID;
        } else {
            Serial.printf("Match rejected: confidence %d below threshold %d\n", finger.confidence, matchThreshold);
            String logMsg = "Scan rejected: Match confidence score (" + String(finger.confidence) + ") is below security threshold (" + String(matchThreshold) + ")";
            sendSystemLog(logMsg.c_str());
            return -1;
        }
    } else {
        Serial.println("Finger not found in database.");
        return -1;
    }
}

uint8_t getFreeID() {
    for (int page = 1; page < 127; page++) {
        uint8_t p = finger.loadModel(page);
        if (p != FINGERPRINT_OK) {
            return page; // Found a free spot
        }
    }
    return 0; // Database is full
}

void enrollFingerprint(int id) {
    if (id <= 0) {
        id = getFreeID();
    }
    
    if (id == 0 || id > 127) {
        Serial.println("Fingerprint database is full or invalid ID!");
        setEnrollStatus("failed_database_full");
        // Warning mismatch/error beeps
        for (int i = 0; i < 3; i++) {
            digitalWrite(BUZZER, HIGH);
            delay(100);
            digitalWrite(BUZZER, LOW);
            delay(100);
        }
        delay(2000);
        setEnrollStatus("idle");
        return;
    }

    Serial.print("Enrolling ID #"); Serial.println(id);
    Serial.println("Waiting for valid finger to enroll...");
    setEnrollStatus("waiting_first");
    String logMsg = "Starting fingerprint enrollment for ID #" + String(id);
    sendSystemLog(logMsg.c_str());

    // Prompt user to scan first print: Turn on Green LED
    digitalWrite(GREEN_LED, HIGH);

    // Wait for a finger
    uint8_t p = -1;
    unsigned long startTime = millis();
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        switch (p) {
            case FINGERPRINT_OK:
                Serial.println("Image taken");
                break;
            case FINGERPRINT_NOFINGER:
                Serial.print(".");
                delay(100);
                break;
            default:
                Serial.println("Error taking image");
                setEnrollStatus("failed_read_error");
                digitalWrite(GREEN_LED, LOW);
                digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
                delay(2000);
                setEnrollStatus("idle");
                return;
        }
        
        // Timeout after 30 seconds to prevent hanging
        if (millis() - startTime > 30000) {
            Serial.println("Enrollment Timed Out!");
            setEnrollStatus("failed_timeout");
            digitalWrite(GREEN_LED, LOW);
            digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
            delay(2000);
            setEnrollStatus("idle");
            return;
        }
    }

    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
        Serial.println("Error converting image");
        setEnrollStatus("failed_convert_error");
        digitalWrite(GREEN_LED, LOW);
        digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
        delay(2000);
        setEnrollStatus("idle");
        return;
    }

    // Success first scan: double beep, turn off LED to prompt removal
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(BUZZER, HIGH); delay(80); digitalWrite(BUZZER, LOW); delay(80);
    digitalWrite(BUZZER, HIGH); delay(80); digitalWrite(BUZZER, LOW);

    Serial.println("Remove finger");
    setEnrollStatus("image_taken");
    delay(2000); // Give user time to remove finger

    // Wait until finger is removed
    p = 0;
    while (p != FINGERPRINT_NOFINGER) {
        p = finger.getImage();
        delay(100);
    }

    // Prompt user to scan second print: short beep, double flash LED, keep LED on
    digitalWrite(BUZZER, HIGH); delay(100); digitalWrite(BUZZER, LOW);
    for (int i = 0; i < 2; i++) {
        digitalWrite(GREEN_LED, HIGH); delay(100);
        digitalWrite(GREEN_LED, LOW); delay(100);
    }
    digitalWrite(GREEN_LED, HIGH);

    Serial.println("Place same finger again");
    setEnrollStatus("waiting_second");
    
    p = -1;
    startTime = millis();
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        if (p == FINGERPRINT_NOFINGER) {
            delay(100);
        }
        
        // Timeout after 30 seconds
        if (millis() - startTime > 30000) {
            Serial.println("Enrollment Timed Out!");
            setEnrollStatus("failed_timeout");
            digitalWrite(GREEN_LED, LOW);
            digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
            delay(2000);
            setEnrollStatus("idle");
            return;
        }
    }

    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
        Serial.println("Error converting image");
        setEnrollStatus("failed_convert_error");
        digitalWrite(GREEN_LED, LOW);
        digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
        delay(2000);
        setEnrollStatus("idle");
        return;
    }

    Serial.println("Creating model...");
    setEnrollStatus("creating_model");
    
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
        Serial.println("Fingerprints did not match");
        setEnrollStatus("failed_not_matched");
        digitalWrite(GREEN_LED, LOW);
        // Error mismatch: 3 warning beeps
        for (int i = 0; i < 3; i++) {
            digitalWrite(BUZZER, HIGH); delay(150);
            digitalWrite(BUZZER, LOW); delay(150);
        }
        delay(2000);
        setEnrollStatus("idle");
        return;
    }

    p = finger.storeModel(id);
    if (p == FINGERPRINT_OK) {
        Serial.print("Stored successfully as ID: "); Serial.println(id);
        setEnrollStatus("success");
        String logMsg = "Successfully enrolled Fingerprint ID #" + String(id);
        sendSystemLog(logMsg.c_str());
        
        // Success cue: solid Green LED + long successful beep
        digitalWrite(GREEN_LED, HIGH);
        digitalWrite(BUZZER, HIGH);
        delay(500);
        digitalWrite(BUZZER, LOW);
        delay(1500);
        digitalWrite(GREEN_LED, LOW);
    } else {
        Serial.println("Error storing fingerprint");
        setEnrollStatus("failed_store_error");
        digitalWrite(GREEN_LED, LOW);
        digitalWrite(BUZZER, HIGH); delay(500); digitalWrite(BUZZER, LOW);
        String logMsg = "Failed to store fingerprint for ID #" + String(id);
        sendSystemLog(logMsg.c_str());
    }
    
    delay(1000);
    setEnrollStatus("idle");
    digitalWrite(GREEN_LED, LOW);
}

bool deleteFingerprint(int id) {
    if (id <= 0 || id > 127) {
        Serial.println("Invalid ID for deletion.");
        sendSystemLog("Error: Invalid deletion ID requested");
        return false;
    }
    
    uint8_t p = finger.deleteModel(id);
    if (p == FINGERPRINT_OK) {
        Serial.print("Deleted fingerprint ID #"); Serial.println(id);
        String logMsg = "Deleted fingerprint ID #" + String(id) + " from sensor memory";
        sendSystemLog(logMsg.c_str());
        return true;
    } else {
        Serial.print("Failed to delete fingerprint ID #"); Serial.println(id);
        String logMsg = "Failed to delete fingerprint ID #" + String(id) + " (Error: code " + String(p) + ")";
        sendSystemLog(logMsg.c_str());
        return false;
    }
}
