#include "wifi_manager.h"
#include "config.h"
#include "firebase_manager.h"
#include <WiFi.h>
#include <time.h>

void setupWiFi() {
    Serial.println("Scanning for available WiFi networks...");
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);

    int n = WiFi.scanNetworks();
    if (n == 0) {
        Serial.println("No networks found.");
    } else {
        Serial.print(n);
        Serial.println(" networks found:");
        for (int i = 0; i < n; ++i) {
            Serial.print(i + 1);
            Serial.print(": ");
            Serial.print(WiFi.SSID(i));
            Serial.print(" (");
            Serial.print(WiFi.RSSI(i));
            Serial.println(")");
            delay(10);
        }
    }
    
    // Free memory allocated for scan results
    WiFi.scanDelete();
    
    Serial.println("------------------------------------");
    Serial.print("Attempting to connect to: ");
    Serial.println(WIFI_SSID);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 40) { // Timeout after 20 seconds
        delay(500);
        Serial.print(".");
        retries++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nConnected to WiFi!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        
        // Sync time via NTP for Firebase SSL validation
        Serial.print("Synchronizing time (NTP)...");
        configTime(19800, 0, "pool.ntp.org", "time.nist.gov"); // 19800 is GMT+5:30 offset for IST
        
        time_t now = time(nullptr);
        int timeoutCount = 0;
        while (now < 24 * 3600 && timeoutCount < 10) {
            delay(500);
            Serial.print(".");
            now = time(nullptr);
            timeoutCount++;
        }
        
        if (now < 24 * 3600) {
            Serial.println("\nWarning: Time synchronization timed out. Firebase might fail.");
            sendSystemLog("WiFi Connected (Time Sync Timeout)");
        } else {
            Serial.println("\nTime synced successfully!");
            sendSystemLog("WiFi Connected & Time Synced");
        }
    } else {
        Serial.println("\nFAILED to connect.");
        Serial.print("WiFi Status: ");
        switch (WiFi.status()) {
            case WL_NO_SSID_AVAIL:
                Serial.println("WL_NO_SSID_AVAIL (Network not found/SSID incorrect)");
                break;
            case WL_CONNECT_FAILED:
                Serial.println("WL_CONNECT_FAILED (Incorrect password)");
                break;
            case WL_DISCONNECTED:
                Serial.println("WL_DISCONNECTED (Could not connect)");
                break;
            case WL_IDLE_STATUS:
                Serial.println("WL_IDLE_STATUS (Idle/Connecting...)");
                break;
            default:
                Serial.printf("Unknown status code: %d\n", WiFi.status());
                break;
        }
        Serial.println("Please make sure your network is 2.4GHz (ESP32 does not support 5GHz).");
    }
}
