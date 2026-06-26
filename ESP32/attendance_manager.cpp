#include "attendance_manager.h"
#include "fingerprint_manager.h"
#include "firebase_manager.h"

unsigned long lastAttendanceTime = 0;
const unsigned long ATTENDANCE_COOLDOWN = 5000; // 5 seconds between scans

void processAttendance() {
    int id = getFingerprintID();
    
    // Valid ID found and cooldown has passed
    if (id != -1 && (millis() - lastAttendanceTime > ATTENDANCE_COOLDOWN)) {
        logAttendance(id);
        lastAttendanceTime = millis();
    }
}
