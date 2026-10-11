import { createSlice } from '@reduxjs/toolkit';
const initialParametricSettings = {
    platenWidthMm: 230,
    platenLengthMm: 320,
    phoneClampWidthMm: 82,
    phoneThicknessMm: 9.5,
    armHeightMm: 300,
    armAngleDeg: 14,
    hopperAngleDeg: 16,
    rollerDiameterMm: 24,
};
const initialMetrics = {
    feedSpeedMmS: 45,
    ejectSpeedMmS: 60,
    irThreshold: 520,
    sensorPlatenTripped: false,
    sensorHopperTripped: true,
    flattenerEngaged: false,
    paperProgress: 0,
    completedScans: 0,
    paperJamError: false,
};
const initialState = {
    activeTab: 'digital-twin',
    scannerState: 'IDLE',
    metrics: initialMetrics,
    hopperPaperCount: 12,
    isExplodedView: false,
    explodedProgress: 0,
    cameraViewPreset: 'perspective',
    showWireframe: false,
    showSensorBeams: true,
    selectedCadPart: 'chassis_base',
    parametricSettings: initialParametricSettings,
    apiLogs: [
        {
            id: 'log-init-1',
            timestamp: new Date().toLocaleTimeString(),
            method: 'GET',
            endpoint: '/api/status',
            statusCode: 200,
            payload: { status: 'ONLINE', state: 'IDLE', firmwareVersion: 'v1.4.2-ESP32', hopperReady: true },
            latencyMs: 12,
            source: 'ESP32'
        },
        {
            id: 'log-init-2',
            timestamp: new Date().toLocaleTimeString(),
            method: 'WS_EMIT',
            endpoint: 'ws://192.168.4.1/ws',
            statusCode: 101,
            payload: { event: 'WEBSOCKET_CONNECTED', clientId: 'MobileScanner-iOS-Client' },
            latencyMs: 4,
            source: 'ESP32'
        }
    ],
    virtualAppConnected: true,
    mobileAutoCapture: true,
    lastCaptureThumbnail: null,
    showReferenceModal: false,
    theme: 'light',
    removeExitTray: false,
    useServoPickup: true,
    phoneCameraType: 'universal',
    showTradeoffModal: false,
    showPartLabels: false,
    showDimensionsModal: false,
};
export const scannerSlice = createSlice({
    name: 'scanner',
    initialState,
    reducers: {
        setShowDimensionsModal: (state, action) => {
            state.showDimensionsModal = action.payload;
        },
        setShowPartLabels: (state, action) => {
            state.showPartLabels = action.payload;
        },
        setRemoveExitTray: (state, action) => {
            state.removeExitTray = action.payload;
        },
        setUseServoPickup: (state, action) => {
            state.useServoPickup = action.payload;
        },
        setPhoneCameraType: (state, action) => {
            state.phoneCameraType = action.payload;
        },
        setShowTradeoffModal: (state, action) => {
            state.showTradeoffModal = action.payload;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
        },
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        setScannerState: (state, action) => {
            state.scannerState = action.payload;
        },
        setPaperProgress: (state, action) => {
            state.metrics.paperProgress = action.payload;
            // Auto-trip sensors based on paper physical coordinates
            if (action.payload >= 0.48 && action.payload <= 0.88) {
                state.metrics.sensorPlatenTripped = true;
            }
            else {
                state.metrics.sensorPlatenTripped = false;
            }
        },
        setSensorPlatenTripped: (state, action) => {
            state.metrics.sensorPlatenTripped = action.payload;
        },
        setFlattenerEngaged: (state, action) => {
            state.metrics.flattenerEngaged = action.payload;
        },
        incrementCompletedScans: (state) => {
            state.metrics.completedScans += 1;
            if (state.hopperPaperCount > 0) {
                state.hopperPaperCount -= 1;
            }
            state.metrics.sensorHopperTripped = state.hopperPaperCount > 0;
        },
        reloadHopper: (state, action) => {
            state.hopperPaperCount = action.payload;
            state.metrics.sensorHopperTripped = action.payload > 0;
            state.metrics.paperJamError = false;
        },
        setExplodedView: (state, action) => {
            state.isExplodedView = action.payload;
            state.explodedProgress = action.payload ? 1 : 0;
        },
        setExplodedProgress: (state, action) => {
            state.explodedProgress = action.payload;
            state.isExplodedView = action.payload > 0.05;
        },
        setCameraViewPreset: (state, action) => {
            state.cameraViewPreset = action.payload;
        },
        setShowWireframe: (state, action) => {
            state.showWireframe = action.payload;
        },
        setShowSensorBeams: (state, action) => {
            state.showSensorBeams = action.payload;
        },
        setSelectedCadPart: (state, action) => {
            state.selectedCadPart = action.payload;
        },
        updateParametricSettings: (state, action) => {
            state.parametricSettings = { ...state.parametricSettings, ...action.payload };
        },
        resetParametricSettings: (state) => {
            state.parametricSettings = initialParametricSettings;
        },
        addApiLog: (state, action) => {
            const newEntry = {
                ...action.payload,
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                timestamp: new Date().toLocaleTimeString(),
            };
            state.apiLogs.unshift(newEntry);
            if (state.apiLogs.length > 50) {
                state.apiLogs.pop();
            }
        },
        clearApiLogs: (state) => {
            state.apiLogs = [];
        },
        setVirtualAppConnected: (state, action) => {
            state.virtualAppConnected = action.payload;
        },
        setMobileAutoCapture: (state, action) => {
            state.mobileAutoCapture = action.payload;
        },
        setLastCaptureThumbnail: (state, action) => {
            state.lastCaptureThumbnail = action.payload;
        },
        setShowReferenceModal: (state, action) => {
            state.showReferenceModal = action.payload;
        },
        triggerPaperJam: (state) => {
            state.scannerState = 'ERROR';
            state.metrics.paperJamError = true;
        },
        clearPaperJam: (state) => {
            state.scannerState = 'IDLE';
            state.metrics.paperJamError = false;
            state.metrics.paperProgress = 0;
            state.metrics.flattenerEngaged = false;
        }
    },
});
export const { setShowDimensionsModal, setShowPartLabels, setRemoveExitTray, setUseServoPickup, setPhoneCameraType, setShowTradeoffModal, setTheme, toggleTheme, setActiveTab, setScannerState, setPaperProgress, setSensorPlatenTripped, setFlattenerEngaged, incrementCompletedScans, reloadHopper, setExplodedView, setExplodedProgress, setCameraViewPreset, setShowWireframe, setShowSensorBeams, setSelectedCadPart, updateParametricSettings, resetParametricSettings, addApiLog, clearApiLogs, setVirtualAppConnected, setMobileAutoCapture, setLastCaptureThumbnail, setShowReferenceModal, triggerPaperJam, clearPaperJam, } = scannerSlice.actions;
export default scannerSlice.reducer;
