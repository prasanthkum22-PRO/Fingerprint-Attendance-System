#ifndef FINGERPRINT_MANAGER_H
#define FINGERPRINT_MANAGER_H

#include <Arduino.h>

void setupFingerprint();
int getFingerprintID();
void enrollFingerprint(int id = 0);
bool deleteFingerprint(int id);

#endif // FINGERPRINT_MANAGER_H
