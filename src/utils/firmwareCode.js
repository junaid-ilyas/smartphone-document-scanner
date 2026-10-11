/**
 * DIY Automated Smartphone Document Scanner
 * Production ESP32 C++ Firmware & Python Companion Scripts
 */
export const ESP32_FIRMWARE_SOURCE = `/*
  ==============================================================================
  Project: DIY Automated Smartphone Document Scanner Controller
  Target Microcontroller: ESP32 DevKit v1 (or NodeMCU-32S)
  Language: C++ (Arduino Framework)
  Dependencies:
    - ESPAsyncWebServer (by me-no-dev / Hristo Gochkov)
    - AsyncTCP (by me-no-dev)
    - AccelStepper (by Mike McCauley)
    - ArduinoJson (by Benoit Blanchon, v6.x or v7.x)
  ==============================================================================
*/

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>

// -----------------------------------------------------------------------------
// WiFi & Network Configuration
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Optional: Set to true if you want the ESP32 to broadcast its own SoftAP
const bool  ENABLE_ACCESS_POINT = false;
const char* AP_SSID             = "ESP32-DocScanner";
const char* AP_PASS             = "scanner1234";

// -----------------------------------------------------------------------------
// Hardware Pin Definitions (ESP32 GPIO)
// -----------------------------------------------------------------------------
// Stepper 1: Document Feeder (Hopper -> Platen)
#define PIN_FEED_STEP      18
#define PIN_FEED_DIR       19
#define PIN_FEED_ENABLE    21

// Stepper 2: Document Ejector (Platen -> Output Tray)
#define PIN_EJECT_STEP     22
#define PIN_EJECT_DIR      23
#define PIN_EJECT_ENABLE   25

// Optical Sensors (TCRT5000 IR Reflectance / Beam Break)
#define PIN_IR_PLATEN_BED  34  // Active LOW when paper covers sensor
#define PIN_IR_HOPPER_TRAY 35  // Active LOW when paper stack present

// Actuators & Indicators
#define PIN_FLATTENER_SERVO 26 // Micro-servo signal for hold-down arm
#define PIN_STATUS_LED      2  // Built-in blue LED for optical status

// -----------------------------------------------------------------------------
// State Machine Definitions
// -----------------------------------------------------------------------------
enum ScannerState {
  STATE_IDLE,
  STATE_FEEDING,
  STATE_PAPER_ARRIVED,
  STATE_WAITING_FOR_APP_SCAN,
  STATE_EJECTING,
  STATE_COMPLETED,
  STATE_ERROR_JAM
};

volatile ScannerState currentState = STATE_IDLE;
volatile bool irPlatenTriggered    = false;
unsigned long stateEnteredTimestamp = 0;
unsigned long scanCycleCount        = 0;
const unsigned long FEED_TIMEOUT_MS = 4000; // Watchdog: Jam detected if paper doesn't arrive in 4s

// -----------------------------------------------------------------------------
// Stepper Driver Instances
// -----------------------------------------------------------------------------
AccelStepper stepperFeed(AccelStepper::DRIVER, PIN_FEED_STEP, PIN_FEED_DIR);
AccelStepper stepperEject(AccelStepper::DRIVER, PIN_EJECT_STEP, PIN_EJECT_DIR);

// -----------------------------------------------------------------------------
// Async Web Server & WebSocket
// -----------------------------------------------------------------------------
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// -----------------------------------------------------------------------------
// Helper: Broadcast WebSocket Event to Mobile App
// -----------------------------------------------------------------------------
void broadcastWsEvent(const char* eventType, const char* message) {
  StaticJsonDocument<256> doc;
  doc["event"]       = eventType;
  doc["state"]       = (int)currentState;
  doc["message"]     = message;
  doc["timestamp"]   = millis();
  doc["cycleCount"]  = scanCycleCount;

  String output;
  serializeJson(doc, output);
  ws.textAll(output);
  Serial.printf("[WS Broadcast] %s: %s\\n", eventType, message);
}

// -----------------------------------------------------------------------------
// Hardware Interrupt Service Routine (Debounced)
// -----------------------------------------------------------------------------
void IRAM_ATTR isrPlatenSensor() {
  static unsigned long lastInterruptTime = 0;
  unsigned long now = millis();
  if (now - lastInterruptTime > 80) { // 80ms software debounce
    irPlatenTriggered = true;
    lastInterruptTime = now;
  }
}

// -----------------------------------------------------------------------------
// Motion Subroutines
// -----------------------------------------------------------------------------
void startFeedingPaper() {
  Serial.println("[Motion] Engaging Feed Stepper...");
  digitalWrite(PIN_FEED_ENABLE, LOW); // Enable driver
  stepperFeed.setCurrentPosition(0);
  stepperFeed.moveTo(4200); // Nominal steps to reach platen bed
  stepperFeed.setSpeed(750);
  
  currentState = STATE_FEEDING;
  stateEnteredTimestamp = millis();
  irPlatenTriggered = false;
  broadcastWsEvent("FEED_STARTED", "Pulling document from hopper");
}

void startEjectingPaper() {
  Serial.println("[Motion] Engaging Ejection Stepper...");
  digitalWrite(PIN_EJECT_ENABLE, LOW);
  stepperEject.setCurrentPosition(0);
  stepperEject.moveTo(5600); // Steps to eject clear of bed
  stepperEject.setSpeed(900);

  currentState = STATE_EJECTING;
  stateEnteredTimestamp = millis();
  broadcastWsEvent("EJECT_STARTED", "Ejecting document to output tray");
}

void disengageMotors() {
  digitalWrite(PIN_FEED_ENABLE, HIGH);  // Disable to prevent motor heating
  digitalWrite(PIN_EJECT_ENABLE, HIGH);
}

// -----------------------------------------------------------------------------
// WebSocket Event Handler
// -----------------------------------------------------------------------------
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, 
               AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("[WS] Mobile app connected: #%u from %s\\n", client->id(), client->remoteIP().toString().c_str());
    StaticJsonDocument<128> doc;
    doc["event"] = "READY";
    doc["device"] = "DIY-DocScanner-ESP32";
    String res;
    serializeJson(doc, res);
    client->text(res);
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("[WS] Mobile client #%u disconnected\\n", client->id());
  }
}

// -----------------------------------------------------------------------------
// REST API Route Handlers
// -----------------------------------------------------------------------------
void setupApiRoutes() {
  // CORS Headers for browser & app testing
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

  // GET /api/status - Query current state & sensor readings
  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    StaticJsonDocument<256> doc;
    doc["state"]               = currentState;
    doc["stateName"]           = (currentState == STATE_IDLE) ? "IDLE" :
                                 (currentState == STATE_FEEDING) ? "FEEDING" :
                                 (currentState == STATE_WAITING_FOR_APP_SCAN) ? "WAITING_FOR_APP_SCAN" :
                                 (currentState == STATE_EJECTING) ? "EJECTING" : "ERROR";
    doc["platenSensorTripped"] = (digitalRead(PIN_IR_PLATEN_BED) == LOW);
    doc["hopperHasPaper"]      = (digitalRead(PIN_IR_HOPPER_TRAY) == LOW);
    doc["completedScans"]      = scanCycleCount;
    doc["uptimeSeconds"]       = millis() / 1000;

    String jsonResponse;
    serializeJson(doc, jsonResponse);
    request->send(200, "application/json", jsonResponse);
  });

  // POST /api/feed - Manually or programmatically trigger paper feed
  server.on("/api/feed", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (currentState == STATE_IDLE || currentState == STATE_COMPLETED) {
      startFeedingPaper();
      request->send(200, "application/json", "{\\"status\\":\\"SUCCESS\\",\\"message\\":\\"Feeding initiated\\"}");
    } else {
      request->send(409, "application/json", "{\\"status\\":\\"BUSY\\",\\"message\\":\\"Scanner currently busy\\"}");
    }
  });

  // POST /api/scan-complete - Handshake from mobile app after camera captures document!
  server.on("/api/scan-complete", HTTP_POST, [](AsyncWebServerRequest *request) {
    Serial.println("[API] Received scan completion handshake from mobile app!");
    
    if (currentState == STATE_WAITING_FOR_APP_SCAN || currentState == STATE_PAPER_ARRIVED) {
      scanCycleCount++;
      startEjectingPaper();
      request->send(200, "application/json", "{\\"status\\":\\"SUCCESS\\",\\"action\\":\\"EJECTING\\",\\"cycle\\":" + String(scanCycleCount) + "}");
    } else {
      request->send(400, "application/json", "{\\"status\\":\\"INVALID_STATE\\",\\"message\\":\\"No paper awaiting scan\\"}");
    }
  });

  // POST /api/eject - Manual document eject override
  server.on("/api/eject", HTTP_POST, [](AsyncWebServerRequest *request) {
    startEjectingPaper();
    request->send(200, "application/json", "{\\"status\\":\\"SUCCESS\\",\\"message\\":\\"Manual eject initiated\\"}");
  });

  // POST /api/reset - Reset errors and re-home state machine
  server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest *request) {
    currentState = STATE_IDLE;
    disengageMotors();
    broadcastWsEvent("SYSTEM_RESET", "State machine reset to IDLE");
    request->send(200, "application/json", "{\\"status\\":\\"SUCCESS\\",\\"message\\":\\"State reset\\"}");
  });
}

// -----------------------------------------------------------------------------
// Arduino Setup Entry Point
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\\n=== DIY Automated Document Scanner Starting ===");

  // Pin Modes
  pinMode(PIN_FEED_ENABLE, OUTPUT);
  pinMode(PIN_EJECT_ENABLE, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_IR_PLATEN_BED, INPUT_PULLUP);
  pinMode(PIN_IR_HOPPER_TRAY, INPUT_PULLUP);

  disengageMotors();

  // Configure Stepper Profiles
  stepperFeed.setMaxSpeed(1000);
  stepperFeed.setAcceleration(1400);
  stepperEject.setMaxSpeed(1200);
  stepperEject.setAcceleration(1800);

  // Attach Hardware Interrupt for Optical Sensor
  attachInterrupt(digitalPinToInterrupt(PIN_IR_PLATEN_BED), isrPlatenSensor, FALLING);

  // Network Initialization
  if (ENABLE_ACCESS_POINT) {
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.printf("[WiFi] SoftAP initialized: %s (IP: %s)\\n", AP_SSID, WiFi.softAPIP().toString().c_str());
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("[WiFi] Connecting to WiFi");
    unsigned long startAttempt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
      delay(300);
      Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\\n[WiFi] Connected! IP Address: %s\\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\\n[WiFi] Connection timeout. Falling back to SoftAP...");
      WiFi.softAP(AP_SSID, AP_PASS);
      Serial.printf("[WiFi] SoftAP IP: %s\\n", WiFi.softAPIP().toString().c_str());
    }
  }

  // Start Web Server & WebSocket bus
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  setupApiRoutes();
  server.begin();
  Serial.println("[HTTP] AsyncWebServer listening on port 80");
}

// -----------------------------------------------------------------------------
// Main Real-Time Control Loop
// -----------------------------------------------------------------------------
void loop() {
  ws.cleanupClients();

  switch (currentState) {
    case STATE_IDLE:
      digitalWrite(PIN_STATUS_LED, LOW);
      break;

    case STATE_FEEDING:
      digitalWrite(PIN_STATUS_LED, HIGH);
      stepperFeed.run();

      // Check if optical sensor triggered leading edge of paper
      if (irPlatenTriggered || digitalRead(PIN_IR_PLATEN_BED) == LOW) {
        Serial.println("[Sensor] Paper arrived at platen bed!");
        stepperFeed.stop();
        digitalWrite(PIN_FEED_ENABLE, HIGH); // Disengage feeder
        currentState = STATE_WAITING_FOR_APP_SCAN;
        stateEnteredTimestamp = millis();
        irPlatenTriggered = false;

        // Push immediate event to mobile phone app!
        broadcastWsEvent("PAPER_ARRIVED_SCAN_NOW", "Paper seated on platen bed. Camera capture armed.");
      } 
      // Safety Jam Timeout
      else if (millis() - stateEnteredTimestamp > FEED_TIMEOUT_MS) {
        Serial.println("[ERROR] Paper feed timeout! Paper jam or empty hopper.");
        stepperFeed.stop();
        disengageMotors();
        currentState = STATE_ERROR_JAM;
        broadcastWsEvent("ERROR_JAM", "Paper failed to reach platen within timeout window");
      }
      break;

    case STATE_WAITING_FOR_APP_SCAN:
      // Phone is currently focusing and capturing the document.
      // Scanner waits for the POST /api/scan-complete handshake.
      break;

    case STATE_EJECTING:
      stepperEject.run();
      if (stepperEject.distanceToGo() == 0) {
        Serial.println("[Motion] Paper ejection complete!");
        disengageMotors();
        currentState = STATE_IDLE;
        broadcastWsEvent("EJECT_COMPLETE", "Document ready in output tray. Ready for next.");
      }
      break;

    case STATE_ERROR_JAM:
      // Blink status LED to alert user of physical jam
      digitalWrite(PIN_STATUS_LED, (millis() / 250) % 2);
      break;

    default:
      break;
  }
}
`;
export const PYTHON_TEST_SCRIPT = `#!/usr/bin/env python3
"""
==============================================================================
DIY Automated Smartphone Document Scanner - Python Automation Companion
Runs batch scanning cycles, logs latency, and verifies HTTP/WebSocket handshake
==============================================================================
"""

import sys
import time
import json
import requests
import websocket
import threading

ESP32_IP = "192.168.4.1" # Replace with your ESP32 IP
BASE_URL = f"http://{ESP32_IP}"
WS_URL   = f"ws://{ESP32_IP}/ws"

def on_ws_message(ws, message):
    data = json.loads(message)
    event = data.get("event")
    print(f"\\n[WS EVENT RECEIVED] >>> {event}: {data.get('message', '')}")
    
    # When paper arrives, simulate smartphone camera scanning and send 200 OK!
    if event == "PAPER_ARRIVED_SCAN_NOW":
        print("[Mobile Emulation] Simulating camera capture & image alignment (800ms)...")
        time.sleep(0.8)
        send_scan_complete_handshake()

def on_ws_error(ws, error):
    print(f"[WS ERROR] {error}")

def on_ws_close(ws, close_status_code, close_msg):
    print("[WS CLOSED]")

def send_scan_complete_handshake():
    url = f"{BASE_URL}/api/scan-complete"
    payload = {
        "status": "COMPLETED",
        "scanId": f"DOC_{int(time.time())}",
        "resolution": "4032x3024",
        "format": "PDF"
    }
    t0 = time.time()
    try:
        res = requests.post(url, json=payload, timeout=2.0)
        dt = (time.time() - t0) * 1000
        print(f"[API RESPONSE] Handshake sent in {dt:.1f}ms! Status: {res.status_code} -> {res.text}")
    except Exception as e:
        print(f"[API ERROR] Failed to send scan complete: {e}")

def trigger_feed():
    url = f"{BASE_URL}/api/feed"
    print(f"\\n[User Action] Sending feed trigger to {url}...")
    try:
        res = requests.post(url, timeout=2.0)
        print(f"[API RESPONSE] {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[API ERROR] Feed request failed: {e}")

def main():
    print("==================================================")
    print("  DIY Scanner Python Controller & Test Bench      ")
    print(f"  Target: {BASE_URL}                            ")
    print("==================================================")

    # Start WebSocket client in background daemon thread
    ws = websocket.WebSocketApp(WS_URL,
                                on_message=on_ws_message,
                                on_error=on_ws_error,
                                on_close=on_ws_close)
    wst = threading.Thread(target=ws.run_forever)
    wst.daemon = True
    wst.start()

    time.sleep(1.0)
    print("\\nPress [ENTER] to feed a sheet, or 'q' to quit:")
    while True:
        try:
            cmd = input("> ")
            if cmd.strip().lower() == 'q':
                break
            trigger_feed()
        except KeyboardInterrupt:
            break

    print("\\nExiting scanner controller.")

if __name__ == "__main__":
    main()
`;
export const WIRING_PINOUT_GUIDE = [
    { pin: 'GPIO 18', component: 'A4988 / TMC2209 (Driver 1)', function: 'STEP (Feeder Stepper Motor)', notes: 'Drives hopper pickup roller' },
    { pin: 'GPIO 19', component: 'A4988 / TMC2209 (Driver 1)', function: 'DIR (Feeder Direction)', notes: 'Forward feed rotation' },
    { pin: 'GPIO 21', component: 'A4988 / TMC2209 (Driver 1)', function: 'ENABLE (Feeder Enable)', notes: 'Active LOW, sleep when idle' },
    { pin: 'GPIO 22', component: 'A4988 / TMC2209 (Driver 2)', function: 'STEP (Ejector Stepper Motor)', notes: 'Drives platen exit rollers' },
    { pin: 'GPIO 23', component: 'A4988 / TMC2209 (Driver 2)', function: 'DIR (Ejector Direction)', notes: 'Forward ejection rotation' },
    { pin: 'GPIO 25', component: 'A4988 / TMC2209 (Driver 2)', function: 'ENABLE (Ejector Enable)', notes: 'Active LOW, sleep when idle' },
    { pin: 'GPIO 34', component: 'TCRT5000 IR Sensor', function: 'Platen Bed Optical Interrupt', notes: 'Digital Out -> GPIO 34 (Hardware ISR)' },
    { pin: 'GPIO 35', component: 'TCRT5000 IR Sensor', function: 'Hopper Paper Level Detector', notes: 'Detects if paper stack is empty' },
    { pin: 'GPIO 26', component: 'SG90 Micro Servo', function: 'PWM Signal (Flattener Press Arm)', notes: '0° = Raised, 65° = Down hold' },
    { pin: 'GPIO 2', component: 'Onboard LED', function: 'Status / Alignment Indicator', notes: 'Solid blue when paper seated' },
    { pin: '5V / GND', component: 'Power Supply / Step-Down', function: 'Logic Voltage Rail', notes: 'Step down from 12V 2A stepper PSU' }
];
