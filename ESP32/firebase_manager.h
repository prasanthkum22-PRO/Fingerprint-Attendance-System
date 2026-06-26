#ifndef FIREBASE_MANAGER_H
#define FIREBASE_MANAGER_H

#include <Arduino.h>

extern int buzzerDuration;
extern bool buzzerEnabled;
extern int matchThreshold;

void setupFirebase();
bool logAttendance(int fingerprintID);
int checkRemoteEnrollRequest();
void setEnrollStatus(const char* status);
int checkRemoteDeleteRequest();
void sendSystemLog(const char* message);
void fetchSettings();

#endif // FIREBASE_MANAGER_H
