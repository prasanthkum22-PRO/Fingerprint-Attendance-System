#ifndef CONFIG_H
#define CONFIG_H

/***************************************************
 * WiFi Configuration
 ***************************************************/
#define WIFI_SSID "prasan"
#define WIFI_PASSWORD "123456789"

/***************************************************
 * Firebase Configuration
 ***************************************************/
#define API_KEY "AIzaSyBF2wGjMcwagnvjLw6x8pOsvLJqA6F3r0Q"
#define DATABASE_URL "https://finger-attendance--esp-32-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define USER_EMAIL "businessdevelopment734@gmail.com"
#define USER_PASSWORD "fundamentalS" // ← Replace with your actual Firebase password

/***************************************************
 * Database Paths
 ***************************************************/
#define STUDENTS_PATH "/students"
#define ATTENDANCE_PATH "/attendance"
#define SETTINGS_PATH "/settings"

/***************************************************
 * ESP32 Pins
 ***************************************************/
#define FP_RX_PIN 16
#define FP_TX_PIN 17

#define GREEN_LED 2
#define BUZZER 4
#define ENROLL_BUTTON_PIN 5 // Moved button to Pin 5 because BUZZER uses Pin 4

/***************************************************
 * Fingerprint Sensor
 ***************************************************/
#define FINGER_BAUDRATE 57600

#endif
