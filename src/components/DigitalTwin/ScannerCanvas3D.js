import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAppDispatch, useAppSelector } from '../../store';
import { setPaperProgress, setScannerState, incrementCompletedScans, addApiLog, setFlattenerEngaged, setLastCaptureThumbnail, setShowDimensionsModal, setShowPartLabels } from '../../store/scannerSlice';
import { Ruler, Eye, EyeOff, Tag } from 'lucide-react';
const DIMENSION_ANCHORS = [
    {
        id: 'platen-bed',
        name: 'A4 Platen Glass Bed',
        sub: 'Chassis & Bed',
        dim: '315 × 225 × 1.5 mm (ISO A4)',
        pos: [-15.75, 1.6, 0],
        color: 'emerald'
    },
    {
        id: 'phone-cradle',
        name: 'Universal Camera Cradle',
        sub: 'Optics & Gantry',
        dim: '75 × 80 mm Bay · Clamp: 65-88 mm',
        pos: [-15.75, 24.5, 0],
        color: 'indigo'
    },
    {
        id: 'feed-motor',
        name: 'NEMA 17 Stepper & Bracket',
        sub: 'Feed Powertrain',
        dim: '42 × 42 × 38 mm (5mm D-Shaft)',
        pos: [0, 2.4, -16.3],
        color: 'cyan'
    },
    {
        id: 'feed-roller',
        name: 'EPDM Feed Drive Roller',
        sub: 'Feed Powertrain',
        dim: 'Ø16 × 210 mm · Axle: Ø8 × 245 mm',
        pos: [0, 2.4, 0],
        color: 'cyan'
    },
    {
        id: 'sg90-servo',
        name: 'SG90 Micro-Servo ADF',
        sub: 'Servo Linkage',
        dim: '22.5 × 12 × 22.7 mm · 1.8 kg·cm',
        pos: [0, 3.8, 12.8],
        color: 'blue'
    },
    {
        id: 'pickup-arm',
        name: 'Variable Stack Pick-Up Roller',
        sub: 'Servo ADF',
        dim: 'Ø13 × 170 mm · Arms: 45 × 8 mm',
        pos: [4.2, 2.4, 0],
        color: 'amber'
    },
    {
        id: 'feed-hopper',
        name: '16° Feed Hopper Tray',
        sub: 'Chassis & Bed',
        dim: '315 × 218 × 24 mm (1-50 Sheets)',
        pos: [15.5, 6.0, 0],
        color: 'slate'
    },
    {
        id: 'ejection-roller',
        name: 'Ejection Drive Roller',
        sub: 'Ejection System',
        dim: 'Ø16 × 210 mm · Coupler: Ø19 × 22 mm',
        pos: [-31.5, 2.4, 0],
        color: 'purple'
    },
    {
        id: 'gantry-tower',
        name: 'Overhead Gantry Column',
        sub: 'Optics & Gantry',
        dim: 'Height: 300 mm · Reach: 135 mm',
        pos: [-15.75, 18.0, -13.5],
        color: 'slate'
    }
];
export const ScannerCanvas3D = () => {
    const dispatch = useAppDispatch();
    const { scannerState, metrics, hopperPaperCount, autoLoopEnabled, cycleDelayMs, explodedProgress, cameraViewPreset, showWireframe, showSensorBeams, theme, removeExitTray, useServoPickup, phoneCameraType, showPartLabels } = useAppSelector((state) => state.scanner);
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const flashLightRef = useRef(null);
    // Mesh and group references for animated kinematics
    const partsRef = useRef(null);
    // Interactive camera orbit state
    const orbitRef = useRef({
        rotX: 0.44,
        rotY: -0.68,
        distance: 90,
        targetRotX: 0.44,
        targetRotY: -0.68,
        targetDistance: 90,
        panX: -8,
        panY: 7,
        isDragging: false,
        prevX: 0,
        prevY: 0,
    });
    // Track progress, explosion, and configuration references
    const progressRef = useRef(metrics.paperProgress);
    progressRef.current = metrics.paperProgress;
    const explodedRef = useRef(explodedProgress);
    explodedRef.current = explodedProgress;
    const removeExitTrayRef = useRef(removeExitTray);
    removeExitTrayRef.current = removeExitTray;
    const showPartLabelsRef = useRef(showPartLabels);
    showPartLabelsRef.current = showPartLabels;
    const [projectedTags, setProjectedTags] = useState([]);
    const [isFlashActive, setIsFlashActive] = useState(false);
    const isDark = theme === 'dark';
    // Standard ISO 216 A4 Dimensions (1 unit = 10mm = 1cm)
    // A4 paper: 210mm (Z axis across tray) x 297mm (X axis in feed direction)
    const A4_WIDTH = 21.0;
    const A4_LENGTH = 29.7;
    const HOPPER_ANGLE_RAD = (16 * Math.PI) / 180;
    const EXIT_ANGLE_RAD = (6 * Math.PI) / 180;
    // Platen geometry benchmarks
    const PLATEN_BED_LENGTH = 31.5; // X dimension: from X = -31.5 to X = 0
    const PLATEN_BED_WIDTH = 22.5; // Z dimension: from Z = -11.25 to Z = +11.25
    const PLATEN_CENTER_X = -PLATEN_BED_LENGTH / 2; // -15.75
    const PLATEN_BED_TOP_Y = 1.555; // Exact top glass platen height
    const PAPER_PLATEN_Y = PLATEN_BED_TOP_Y + 0.008; // 1.563 (Flush on platen glass!)
    // Hopper paper stack thickness computation (1 sheet = 0.04u, 25 sheets = 0.6u)
    const stackThickness = hopperPaperCount > 0
        ? Math.max(0.04, (hopperPaperCount / 25) * 0.6)
        : 0;
    // Local coordinates inside hopper tray bed:
    // Tray bed plate top surface is at local y = 0.20
    const HOPPER_PAPER_LOCAL_X = A4_LENGTH / 2 + 0.8; // 15.65
    const HOPPER_PAPER_LOCAL_Y = 0.20 + stackThickness + 0.005; // Resting FLUSH on top sheet!
    // Exact world coordinates of paper resting on hopper stack:
    const HOPPER_WORLD_X = 0.6 + HOPPER_PAPER_LOCAL_X * Math.cos(HOPPER_ANGLE_RAD) - HOPPER_PAPER_LOCAL_Y * Math.sin(HOPPER_ANGLE_RAD);
    const HOPPER_WORLD_Y = 1.6 + HOPPER_PAPER_LOCAL_X * Math.sin(HOPPER_ANGLE_RAD) + HOPPER_PAPER_LOCAL_Y * Math.cos(HOPPER_ANGLE_RAD);
    // Camera preset handler
    useEffect(() => {
        const orbit = orbitRef.current;
        switch (cameraViewPreset) {
            case 'overhead':
                orbit.targetRotX = 1.54;
                orbit.targetRotY = 0;
                orbit.targetDistance = 46;
                orbit.panX = PLATEN_CENTER_X;
                orbit.panY = 2;
                break;
            case 'feeder':
                orbit.targetRotX = 0.38;
                orbit.targetRotY = -1.25;
                orbit.targetDistance = 34;
                orbit.panX = 6;
                orbit.panY = 4;
                break;
            case 'sensor':
                orbit.targetRotX = 0.32;
                orbit.targetRotY = -0.3;
                orbit.targetDistance = 28;
                orbit.panX = PLATEN_CENTER_X;
                orbit.panY = 3;
                break;
            case 'side':
                orbit.targetRotX = 0.05;
                orbit.targetRotY = -1.57;
                orbit.targetDistance = 48;
                orbit.panX = -8;
                orbit.panY = 10;
                break;
            case 'perspective':
            default:
                orbit.targetRotX = 0.44;
                orbit.targetRotY = -0.68;
                orbit.targetDistance = 90;
                orbit.panX = -8;
                orbit.panY = 7;
                break;
        }
    }, [cameraViewPreset, PLATEN_CENTER_X]);
    // Handle flash effect & thumbnail capture
    const triggerCameraFlash = useCallback(() => {
        setIsFlashActive(true);
        if (flashLightRef.current) {
            flashLightRef.current.intensity = 15.0;
        }
        const scanNum = (metrics.completedScans + 1).toString().padStart(4, '0');
        const mockThumb = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="424" viewBox="0 0 300 424"><rect width="100%" height="100%" fill="%23ffffff"/><rect x="15" y="15" width="270" height="394" fill="none" stroke="%230284c7" stroke-width="2" rx="4"/><text x="25" y="45" font-family="monospace" font-size="13" fill="%230f172a" font-weight="bold">ISO 216 A4 SCAN #${scanNum}</text><text x="25" y="65" font-family="monospace" font-size="11" fill="%2310b981">297 x 210 mm · 300 DPI · HTTP 200</text><line x1="25" y1="78" x2="275" y2="78" stroke="%23e2e8f0" stroke-width="2"/><rect x="25" y="95" width="250" height="10" fill="%23cbd5e1" rx="2"/><rect x="25" y="115" width="220" height="10" fill="%23cbd5e1" rx="2"/><rect x="25" y="135" width="240" height="10" fill="%23cbd5e1" rx="2"/><rect x="25" y="165" width="120" height="140" fill="%23f1f5f9" stroke="%23cbd5e1" rx="4"/><text x="45" y="240" font-family="monospace" font-size="12" fill="%2364748b">A4 DOCUMENT</text><rect x="160" y="165" width="115" height="10" fill="%23cbd5e1" rx="2"/><rect x="160" y="185" width="105" height="10" fill="%23cbd5e1" rx="2"/><rect x="160" y="205" width="115" height="10" fill="%23cbd5e1" rx="2"/><rect x="160" y="225" width="95" height="10" fill="%23cbd5e1" rx="2"/><rect x="25" y="330" width="250" height="45" fill="%23ecfeff" stroke="%2306b6d4" rx="4"/><text x="35" y="355" font-family="monospace" font-size="11" fill="%230891b2">STATUS: A4 CAPTURE 200 OK</text></svg>`;
        dispatch(setLastCaptureThumbnail(mockThumb));
        setTimeout(() => {
            setIsFlashActive(false);
            if (flashLightRef.current) {
                flashLightRef.current.intensity = 0.0;
            }
        }, 180);
    }, [dispatch, metrics.completedScans]);
    // Main Scene Setup
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas)
            return;
        canvas.style.touchAction = 'none';
        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const bgColor = isDark ? 0x0b0f17 : 0xf8fafc;
        scene.background = new THREE.Color(bgColor);
        scene.fog = new THREE.FogExp2(bgColor, 0.007);
        // Camera
        const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 1000);
        cameraRef.current = camera;
        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;
        // Studio Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.9 : 1.25);
        scene.add(ambientLight);
        const keyLight = new THREE.DirectionalLight(0xfffbf0, isDark ? 1.5 : 1.75);
        keyLight.position.set(25, 50, 30);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 5;
        keyLight.shadow.camera.far = 130;
        keyLight.shadow.camera.left = -45;
        keyLight.shadow.camera.right = 45;
        keyLight.shadow.camera.top = 45;
        keyLight.shadow.camera.bottom = -45;
        keyLight.shadow.bias = -0.0004;
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x38bdf8, isDark ? 0.55 : 0.65);
        fillLight.position.set(-35, 25, -30);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0x818cf8, isDark ? 0.45 : 0.35);
        rimLight.position.set(0, -10, -35);
        scene.add(rimLight);
        // Camera Flash Point Light (mounted at smartphone camera lens)
        const flashLight = new THREE.PointLight(0xffffff, 0, 50);
        flashLight.position.set(PLATEN_CENTER_X, 24.5, 0);
        scene.add(flashLight);
        flashLightRef.current = flashLight;
        // Ground Grid Helper (Desk Surface)
        const gridHelper = new THREE.GridHelper(110, 55, isDark ? 0x334155 : 0x94a3b8, isDark ? 0x1e293b : 0xe2e8f0);
        gridHelper.position.y = 0;
        scene.add(gridHelper);
        // -------------------------------------------------------------
        // Mechanical Materials
        // -------------------------------------------------------------
        const chassisMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0x334155,
            roughness: 0.35,
            metalness: 0.2,
            wireframe: showWireframe,
        });
        const gantryMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0f172a : 0x1e293b,
            roughness: 0.3,
            metalness: 0.3,
            wireframe: showWireframe,
        });
        const platenGlassMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.95,
            wireframe: showWireframe,
        });
        const paperStackMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.85,
            metalness: 0.05,
            wireframe: showWireframe,
        });
        const cyanAccentMat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4, // Cyan engineering accent
            roughness: 0.3,
            metalness: 0.4,
            wireframe: showWireframe,
        });
        const rubberRollerMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a, // High-traction EPDM rubber
            roughness: 0.9,
            metalness: 0.05,
            wireframe: showWireframe,
        });
        const orangeTractionMat = new THREE.MeshStandardMaterial({
            color: 0xf97316, // Orange traction silicone tire
            roughness: 0.8,
            metalness: 0.1,
            wireframe: showWireframe,
        });
        const aluminumMetalMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // Precision CNC anodized aluminum
            roughness: 0.25,
            metalness: 0.85,
            wireframe: showWireframe,
        });
        const stepperBodyMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b, // NEMA 17 Stepper motor body
            roughness: 0.5,
            metalness: 0.5,
            wireframe: showWireframe,
        });
        const brassKnobMat = new THREE.MeshStandardMaterial({
            color: 0xd97706, // Knurled brass thumbscrew
            roughness: 0.3,
            metalness: 0.8,
            wireframe: showWireframe,
        });
        const sg90BlueMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb, // SG90 translucent blue casing
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9,
            wireframe: showWireframe,
        });
        // Helper to generate ergonomic 5-lobe star knobs with brass core & knurled rim
        const createTwinStarKnob = (radius, thickness, numLobes = 5) => {
            const knobGroup = new THREE.Group();
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, thickness, 24), gantryMat);
            knobGroup.add(hub);
            const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, thickness + 0.1, 16), brassKnobMat);
            knobGroup.add(core);
            for (let i = 0; i < numLobes; i++) {
                const angle = (i * 2 * Math.PI) / numLobes;
                const lobe = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, thickness, 16), gantryMat);
                lobe.position.set(Math.cos(angle) * radius * 0.75, 0, Math.sin(angle) * radius * 0.75);
                knobGroup.add(lobe);
            }
            return knobGroup;
        };
        // -------------------------------------------------------------
        // 1. BASE PLATEN CHASSIS GROUP (ISO A4: 315mm x 225mm)
        // -------------------------------------------------------------
        const baseGroup = new THREE.Group();
        // 6 Rubber non-slip feet
        const footGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.4, 16);
        [
            [-30, 0.2, 10.5],
            [-15.75, 0.2, 10.5],
            [-1.5, 0.2, 10.5],
            [-30, 0.2, -10.5],
            [-15.75, 0.2, -10.5],
            [-1.5, 0.2, -10.5],
        ].forEach(([fx, fy, fz]) => {
            const foot = new THREE.Mesh(footGeo, rubberRollerMat);
            foot.position.set(fx, fy, fz);
            baseGroup.add(foot);
        });
        // Main rigid chassis lower enclosure
        const chassisBaseSlab = new THREE.Mesh(new THREE.BoxGeometry(PLATEN_BED_LENGTH + 2, 1.2, PLATEN_BED_WIDTH + 2), chassisMat);
        chassisBaseSlab.position.set(PLATEN_CENTER_X, 0.9, 0);
        chassisBaseSlab.castShadow = true;
        chassisBaseSlab.receiveShadow = true;
        baseGroup.add(chassisBaseSlab);
        // Matte white document scanning platen bed plate
        const scanBedMesh = new THREE.Mesh(new THREE.BoxGeometry(PLATEN_BED_LENGTH - 0.5, 0.15, PLATEN_BED_WIDTH - 0.5), platenGlassMat);
        scanBedMesh.position.set(PLATEN_CENTER_X, 1.48, 0);
        scanBedMesh.receiveShadow = true;
        baseGroup.add(scanBedMesh);
        // A4 Precision Corner Markings (Printed L-brackets for 297mm x 210mm document)
        const markMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        const markLength = 2.2;
        const markThickness = 0.22;
        const createCornerMark = (cx, cz, dirX, dirZ) => {
            const legX = new THREE.Mesh(new THREE.BoxGeometry(markLength, 0.02, markThickness), markMat);
            legX.position.set(cx + (dirX * markLength) / 2, 1.57, cz);
            const legZ = new THREE.Mesh(new THREE.BoxGeometry(markThickness, 0.02, markLength), markMat);
            legZ.position.set(cx, 1.57, cz + (dirZ * markLength) / 2);
            baseGroup.add(legX, legZ);
        };
        createCornerMark(PLATEN_CENTER_X - 14.85, -10.5, 1, 1); // Rear Left
        createCornerMark(PLATEN_CENTER_X + 14.85, -10.5, -1, 1); // Rear Right
        createCornerMark(PLATEN_CENTER_X - 14.85, 10.5, 1, -1); // Front Left
        createCornerMark(PLATEN_CENTER_X + 14.85, 10.5, -1, -1); // Front Right
        // Front & rear side guide fences
        const fenceFront = new THREE.Mesh(new THREE.BoxGeometry(PLATEN_BED_LENGTH + 2, 0.8, 0.8), chassisMat);
        fenceFront.position.set(PLATEN_CENTER_X, 1.9, 11.5);
        const fenceRear = new THREE.Mesh(new THREE.BoxGeometry(PLATEN_BED_LENGTH + 2, 0.8, 0.8), chassisMat);
        fenceRear.position.set(PLATEN_CENTER_X, 1.9, -11.5);
        baseGroup.add(fenceFront, fenceRear);
        // Feed throat bearing pillow blocks (Front & Rear at X = 0)
        const pillowBlockGeo = new THREE.BoxGeometry(1.8, 2.2, 1.2);
        const pbFeedF = new THREE.Mesh(pillowBlockGeo, chassisMat);
        pbFeedF.position.set(0, 2.2, 11.5);
        const pbFeedR = new THREE.Mesh(pillowBlockGeo, chassisMat);
        pbFeedR.position.set(0, 2.2, -11.5);
        baseGroup.add(pbFeedF, pbFeedR);
        // Ejection bearing pillow blocks (Front & Rear at X = -31.5)
        const pbEjectF = new THREE.Mesh(pillowBlockGeo, chassisMat);
        pbEjectF.position.set(-PLATEN_BED_LENGTH, 2.2, 11.5);
        const pbEjectR = new THREE.Mesh(pillowBlockGeo, chassisMat);
        pbEjectR.position.set(-PLATEN_BED_LENGTH, 2.2, -11.5);
        baseGroup.add(pbEjectF, pbEjectR);
        // Ball bearing sleeves in all 4 pillow blocks
        const bearingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 16);
        bearingGeo.rotateX(Math.PI / 2);
        [
            [0, 2.4, 11.5],
            [0, 2.4, -11.5],
            [-PLATEN_BED_LENGTH, 2.4, 11.5],
            [-PLATEN_BED_LENGTH, 2.4, -11.5],
        ].forEach(([bx, by, bz]) => {
            const bRing = new THREE.Mesh(bearingGeo, aluminumMetalMat);
            bRing.position.set(bx, by, bz);
            baseGroup.add(bRing);
        });
        // Optical IR sensor window under platen center (100% clear aperture over scanning bed)
        const irHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.2, 24), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
        irHousing.position.set(PLATEN_CENTER_X, 1.5, 0);
        baseGroup.add(irHousing);
        const diodeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const diode1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), diodeMat);
        diode1.position.set(PLATEN_CENTER_X - 0.25, 1.58, 0);
        const diode2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), diodeMat);
        diode2.position.set(PLATEN_CENTER_X + 0.25, 1.58, 0);
        baseGroup.add(diode1, diode2);
        // Gantry tower mounting collar on rear chassis edge
        const collarGeo = new THREE.CylinderGeometry(2.0, 2.2, 1.6, 32);
        const collarMesh = new THREE.Mesh(collarGeo, gantryMat);
        collarMesh.position.set(PLATEN_CENTER_X, 2.0, -13.5);
        collarMesh.castShadow = true;
        baseGroup.add(collarMesh);
        // Rear electronics enclosure with ESP32 board
        const espBox = new THREE.Mesh(new THREE.BoxGeometry(11, 0.8, 5), chassisMat);
        espBox.position.set(PLATEN_CENTER_X, 1.0, -16.5);
        baseGroup.add(espBox);
        const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 3.5), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 }));
        pcbMesh.position.set(PLATEN_CENTER_X, 1.45, -16.5);
        baseGroup.add(pcbMesh);
        const ledBlue = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        ledBlue.position.set(PLATEN_CENTER_X - 2.5, 1.55, -16.5);
        const ledAmber = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        ledAmber.position.set(PLATEN_CENTER_X - 1.5, 1.55, -16.5);
        baseGroup.add(ledBlue, ledAmber);
        const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.1, 4.6), new THREE.MeshStandardMaterial({ color: 0x0f172a, transparent: true, opacity: 0.65 }));
        lidMesh.position.set(PLATEN_CENTER_X, 1.65, -16.5);
        baseGroup.add(lidMesh);
        scene.add(baseGroup);
        // -------------------------------------------------------------
        // 2. FEED ROLLER & SERVO PICK-UP MECHANISM (Variable Stack ADF)
        // -------------------------------------------------------------
        // 2. FEED ROLLER & SERVO PICK-UP MECHANISM (Variable Stack ADF)
        // Physically bolted and mechanically mated assembly!
        // -------------------------------------------------------------
        const feedRollerAssemblyGroup = new THREE.Group();
        feedRollerAssemblyGroup.position.set(0, 2.4, 0);
        // A. RIGID NEMA 17 MOTOR MOUNT BRACKET (Bolted to Rear Pillow Block)
        // Stiffened cantilever bracket extending from Z = -11.5 back to Z = -14.2
        const motorBracketFeed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), chassisMat);
        motorBracketFeed.position.set(0, 0, -14.2);
        feedRollerAssemblyGroup.add(motorBracketFeed);
        const gussetTopFeed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), chassisMat);
        gussetTopFeed.position.set(0, 1.8, -12.9);
        const gussetBtmFeed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), chassisMat);
        gussetBtmFeed.position.set(0, -1.8, -12.9);
        feedRollerAssemblyGroup.add(gussetTopFeed, gussetBtmFeed);
        // 4x M3 Socket Head Cap Screws securing NEMA 17 motor to bracket (31mm bolt pitch)
        const m3ScrewGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.6, 16);
        m3ScrewGeo.rotateX(Math.PI / 2);
        [
            [-1.55, 1.55, -14.0],
            [1.55, 1.55, -14.0],
            [-1.55, -1.55, -14.0],
            [1.55, -1.55, -14.0],
        ].forEach(([sx, sy, sz]) => {
            const screw = new THREE.Mesh(m3ScrewGeo, aluminumMetalMat);
            screw.position.set(sx, sy, sz);
            feedRollerAssemblyGroup.add(screw);
        });
        // NEMA 17 Stepper Motor Body (Flush mounted on bracket at Z = -14.4)
        const stepperMotorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 3.8), stepperBodyMat);
        stepperMotorMesh.position.set(0, 0, -16.3);
        stepperMotorMesh.castShadow = true;
        feedRollerAssemblyGroup.add(stepperMotorMesh);
        // Aluminum front bearing faceplate & rear end bell
        const motorFrontBell = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), aluminumMetalMat);
        motorFrontBell.position.set(0, 0, -14.6);
        const motorRearBell = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), aluminumMetalMat);
        motorRearBell.position.set(0, 0, -18.0);
        feedRollerAssemblyGroup.add(motorFrontBell, motorRearBell);
        // Motor 5mm D-Shaft protruding forward from motor face into coupler
        const motorShaftGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.2, 16);
        motorShaftGeo.rotateX(Math.PI / 2);
        const motorShaft = new THREE.Mesh(motorShaftGeo, aluminumMetalMat);
        motorShaft.position.set(0, 0, -13.3);
        feedRollerAssemblyGroup.add(motorShaft);
        // B. FEED ROLLER SPINNING GROUP (Central Z-Axis)
        const feedRollerSpinGroup = new THREE.Group();
        // 8mm precision ground roller axle shaft
        const shaftGeo = new THREE.CylinderGeometry(0.25, 0.25, 24.5, 24);
        shaftGeo.rotateX(Math.PI / 2);
        const shaftMesh = new THREE.Mesh(shaftGeo, aluminumMetalMat);
        shaftMesh.position.set(0, 0, -0.4);
        feedRollerSpinGroup.add(shaftMesh);
        // CNC Helical Flexible Aluminum Shaft Coupler (Connects 5mm motor shaft to 8mm roller shaft)
        const couplerGeo = new THREE.CylinderGeometry(0.95, 0.95, 2.2, 24);
        couplerGeo.rotateX(Math.PI / 2);
        const couplerMesh = new THREE.Mesh(couplerGeo, aluminumMetalMat);
        couplerMesh.position.set(0, 0, -12.6);
        feedRollerSpinGroup.add(couplerMesh);
        // Spiral flex grooves on coupler
        for (let i = -2; i <= 2; i++) {
            const cutRingGeo = new THREE.TorusGeometry(0.96, 0.035, 8, 24);
            cutRingGeo.rotateX(Math.PI / 2);
            const cutRing = new THREE.Mesh(cutRingGeo, new THREE.MeshBasicMaterial({ color: 0x334155 }));
            cutRing.position.set(0, 0, -12.6 + i * 0.3);
            feedRollerSpinGroup.add(cutRing);
        }
        // 2x M4 Set Screws on coupler
        const setScrewGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 12);
        const ss1 = new THREE.Mesh(setScrewGeo, brassKnobMat);
        ss1.position.set(0.9, 0, -13.2);
        const ss2 = new THREE.Mesh(setScrewGeo, brassKnobMat);
        ss2.position.set(0.9, 0, -12.0);
        feedRollerSpinGroup.add(ss1, ss2);
        // Primary High-Traction EPDM Rubber Roller Body
        const rollerLength = 21.0;
        const rollerBodyGeo = new THREE.CylinderGeometry(0.8, 0.8, rollerLength, 32);
        rollerBodyGeo.rotateX(Math.PI / 2);
        const rollerBodyMesh = new THREE.Mesh(rollerBodyGeo, rubberRollerMat);
        rollerBodyMesh.castShadow = true;
        feedRollerSpinGroup.add(rollerBodyMesh);
        const tireGeo = new THREE.CylinderGeometry(0.88, 0.88, 1.6, 24);
        tireGeo.rotateX(Math.PI / 2);
        [-7.5, -2.5, 2.5, 7.5].forEach((zPos) => {
            const tire = new THREE.Mesh(tireGeo, cyanAccentMat);
            tire.position.set(0, 0, zPos);
            feedRollerSpinGroup.add(tire);
        });
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const stripeGeo = new THREE.BoxGeometry(0.12, 0.12, rollerLength - 0.5);
            const stripe = new THREE.Mesh(stripeGeo, orangeTractionMat);
            stripe.position.set(Math.cos(angle) * 0.86, Math.sin(angle) * 0.86, 0);
            feedRollerSpinGroup.add(stripe);
        }
        feedRollerAssemblyGroup.add(feedRollerSpinGroup);
        // C. FRONT SG90 MICRO-SERVO CRADLE BRACKET & DRIVE LINKAGE
        // Integrated 3D-printed bracket extending rigidly from front pillow block (Z = 11.5 to 13.6)
        const servoCradle = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 1.8), chassisMat);
        servoCradle.position.set(0, 1.8, 12.8);
        feedRollerAssemblyGroup.add(servoCradle);
        // Top and bottom mounting flanges with 4x M2 clamping screws
        const servoEarT = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.5), chassisMat);
        servoEarT.position.set(0, 3.0, 12.8);
        const servoEarB = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.5), chassisMat);
        servoEarB.position.set(0, 0.6, 12.8);
        feedRollerAssemblyGroup.add(servoEarT, servoEarB);
        const m2Geo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 12);
        [
            [0.6, 3.15, 12.8],
            [-0.6, 3.15, 12.8],
            [0.6, 0.45, 12.8],
            [-0.6, 0.45, 12.8],
        ].forEach(([sx, sy, sz]) => {
            const m2 = new THREE.Mesh(m2Geo, brassKnobMat);
            m2.position.set(sx, sy, sz);
            feedRollerAssemblyGroup.add(m2);
        });
        // SG90 Micro-Servo Body (securely seated inside the bracket cradle)
        const servoBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 2.2), sg90BlueMat);
        servoBody.position.set(0, 1.8, 12.8);
        feedRollerAssemblyGroup.add(servoBody);
        // Brass output spline on servo
        const servoSpline = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 16), brassKnobMat);
        servoSpline.position.set(0.2, 2.7, 12.8);
        feedRollerAssemblyGroup.add(servoSpline);
        // White nylon servo horn arm
        const hornArm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.4), platenGlassMat);
        hornArm.position.set(0.8, 2.7, 12.8);
        feedRollerAssemblyGroup.add(hornArm);
        // D. PIVOTING PICK-UP ASSEMBLY (Connected via Continuous Cross-Shaft & Push-Rod)
        const servoPickUpGroup = new THREE.Group();
        servoPickUpGroup.position.set(0, 2.4, 0);
        // 1. Continuous stainless steel pivot cross-shaft (d = 4mm)
        // Spans through bronze sleeve bushings in BOTH pillow blocks from Z = -11.5 to Z = +12.6!
        const pivotShaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 24.5, 20);
        pivotShaftGeo.rotateX(Math.PI / 2);
        const pivotShaft = new THREE.Mesh(pivotShaftGeo, aluminumMetalMat);
        pivotShaft.position.set(0, 0, 0.5);
        servoPickUpGroup.add(pivotShaft);
        // 2. Bronze sleeve bushings in pillow blocks
        const bushingGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.8, 16);
        bushingGeo.rotateX(Math.PI / 2);
        const bF = new THREE.Mesh(bushingGeo, brassKnobMat);
        bF.position.set(0, 0, 11.5);
        const bR = new THREE.Mesh(bushingGeo, brassKnobMat);
        bR.position.set(0, 0, -11.5);
        servoPickUpGroup.add(bF, bR);
        // 3. Servo Linkage Driving Clevis & Mechanical Push-Rod Link
        // Clamped firmly to pivot shaft at Z = 12.4, directly adjacent to servo horn
        const clevisArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.6), cyanAccentMat);
        clevisArm.position.set(0.6, 0.35, 12.4);
        clevisArm.rotation.z = 0.45;
        servoPickUpGroup.add(clevisArm);
        // Solid linkage push-rod connecting white servo horn to clevis arm
        const linkRodGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12);
        const linkRod = new THREE.Mesh(linkRodGeo, aluminumMetalMat);
        linkRod.position.set(0.7, 0.05, 12.6);
        servoPickUpGroup.add(linkRod);
        // Structural bridge connecting driving clevis at Z = 12.4 to pick-up arm at Z = 8.5
        const lateralBridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 3.9), cyanAccentMat);
        lateralBridge.position.set(0.25, 0, 10.45);
        servoPickUpGroup.add(lateralBridge);
        // 4. Dual Pick-Up Extension Arms (Clamped to pivot shaft at Z = 8.5 and Z = -8.5)
        const pArmGeo = new THREE.BoxGeometry(4.5, 0.4, 0.8);
        const pArm1 = new THREE.Mesh(pArmGeo, cyanAccentMat);
        pArm1.position.set(2.2, 0, 8.5);
        const pArm2 = new THREE.Mesh(pArmGeo, cyanAccentMat);
        pArm2.position.set(2.2, 0, -8.5);
        servoPickUpGroup.add(pArm1, pArm2);
        // Shaft clamping collars with locking set screws
        const armClampCollarGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16);
        armClampCollarGeo.rotateX(Math.PI / 2);
        const colF = new THREE.Mesh(armClampCollarGeo, aluminumMetalMat);
        colF.position.set(0, 0, 8.5);
        const colR = new THREE.Mesh(armClampCollarGeo, aluminumMetalMat);
        colR.position.set(0, 0, -8.5);
        servoPickUpGroup.add(colF, colR);
        // 5. Pick-Up Roller & Stainless Spindle
        const pickAxleGeo = new THREE.CylinderGeometry(0.2, 0.2, 18.2, 20);
        pickAxleGeo.rotateX(Math.PI / 2);
        const pickAxle = new THREE.Mesh(pickAxleGeo, aluminumMetalMat);
        pickAxle.position.set(4.2, 0, 0);
        servoPickUpGroup.add(pickAxle);
        const pickRollerGeo = new THREE.CylinderGeometry(0.65, 0.65, 17.0, 24);
        pickRollerGeo.rotateX(Math.PI / 2);
        const pickRoller = new THREE.Mesh(pickRollerGeo, orangeTractionMat);
        pickRoller.position.set(4.2, 0, 0);
        servoPickUpGroup.add(pickRoller);
        // Initial resting raised angle for paper loading clearance
        servoPickUpGroup.rotation.z = 0.22;
        feedRollerAssemblyGroup.add(servoPickUpGroup);
        // Lower opposing idler pinch roller
        const idlerGeo = new THREE.CylinderGeometry(0.4, 0.4, rollerLength, 20);
        idlerGeo.rotateX(Math.PI / 2);
        const idlerMesh = new THREE.Mesh(idlerGeo, aluminumMetalMat);
        idlerMesh.position.set(0, -1.4, 0);
        feedRollerAssemblyGroup.add(idlerMesh);
        scene.add(feedRollerAssemblyGroup);
        // -------------------------------------------------------------
        // 3. FEED HOPPER TRAY (Right Side, Tilts UPWARDS along +X at 16°)
        // Sized for Full ISO A4: 315mm x 218mm
        // -------------------------------------------------------------
        const hopperGroup = new THREE.Group();
        const hopperTrayLength = 31.5;
        const hopperInnerWidth = 21.8;
        // Hinge arms connecting to chassis pillow blocks
        const hingeArmGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
        const hArmF = new THREE.Mesh(hingeArmGeo, chassisMat);
        hArmF.position.set(-0.2, 0, 11.5);
        const hArmR = new THREE.Mesh(hingeArmGeo, chassisMat);
        hArmR.position.set(-0.2, 0, -11.5);
        hopperGroup.add(hArmF, hArmR);
        // Angled tray bed plate (top surface is at local y = 0.20)
        const trayBedMesh = new THREE.Mesh(new THREE.BoxGeometry(hopperTrayLength, 0.4, hopperInnerWidth + 1.0), chassisMat);
        trayBedMesh.position.set(hopperTrayLength / 2, 0, 0);
        trayBedMesh.castShadow = true;
        trayBedMesh.receiveShadow = true;
        hopperGroup.add(trayBedMesh);
        // Tray side guide walls
        const trayWallGeo = new THREE.BoxGeometry(hopperTrayLength, 2.4, 0.5);
        const twF = new THREE.Mesh(trayWallGeo, chassisMat);
        twF.position.set(hopperTrayLength / 2, 1.2, hopperInnerWidth / 2 + 0.25);
        const twR = new THREE.Mesh(trayWallGeo, chassisMat);
        twR.position.set(hopperTrayLength / 2, 1.2, -hopperInnerWidth / 2 - 0.25);
        hopperGroup.add(twF, twR);
        // Rear end stop lip
        const endStop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, hopperInnerWidth + 1.0), chassisMat);
        endStop.position.set(hopperTrayLength, 1.2, 0);
        hopperGroup.add(endStop);
        // A4 paper stack dummy in tray (clean white paper stack with variable height!)
        // Bottom sits on tray bed (y = 0.20), top reaches y = 0.20 + stackThickness
        const dummyStackHeight = Math.max(0.04, stackThickness);
        const paperStackMesh = new THREE.Mesh(new THREE.BoxGeometry(A4_LENGTH, dummyStackHeight, A4_WIDTH), paperStackMat);
        paperStackMesh.position.set(HOPPER_PAPER_LOCAL_X, 0.20 + dummyStackHeight / 2, 0);
        paperStackMesh.receiveShadow = true;
        hopperGroup.add(paperStackMesh);
        // Subtle edge lines on the stack to clearly represent multiple sheets of paper
        for (let i = 1; i <= 3; i++) {
            const lineGeo = new THREE.BoxGeometry(A4_LENGTH + 0.05, 0.02, A4_WIDTH + 0.05);
            const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xcbd5e1 }));
            lineMesh.position.set(HOPPER_PAPER_LOCAL_X, 0.20 + (dummyStackHeight * i) / 4, 0);
            hopperGroup.add(lineMesh);
        }
        // Tilts UPWARDS along +X (away from platen at X = 0)
        hopperGroup.position.set(0.6, 1.6, 0);
        hopperGroup.rotation.z = HOPPER_ANGLE_RAD;
        scene.add(hopperGroup);
        // -------------------------------------------------------------
        // 4. EJECTION ROLLER & EXIT CATCH TRAY (Left Side at X = -31.5)
        // -------------------------------------------------------------
        const ejectRollerAssemblyGroup = new THREE.Group();
        ejectRollerAssemblyGroup.position.set(-PLATEN_BED_LENGTH, 2.4, 0);
        // A. Rigid NEMA 17 mounting bracket extending from rear pillow block (Z = -11.5 to -14.2)
        const ejectBracketPlate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), chassisMat);
        ejectBracketPlate.position.set(0, 0, -14.2);
        ejectRollerAssemblyGroup.add(ejectBracketPlate);
        const ejectGussetTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), chassisMat);
        ejectGussetTop.position.set(0, 1.8, -12.9);
        const ejectGussetBtm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.6), chassisMat);
        ejectGussetBtm.position.set(0, -1.8, -12.9);
        ejectRollerAssemblyGroup.add(ejectGussetTop, ejectGussetBtm);
        // 4x M3 Socket Head Cap Screws securing motor faceplate to bracket (31mm bolt pattern)
        [
            [-1.55, 1.55, -14.0],
            [1.55, 1.55, -14.0],
            [-1.55, -1.55, -14.0],
            [1.55, -1.55, -14.0],
        ].forEach(([sx, sy, sz]) => {
            const screw = new THREE.Mesh(m3ScrewGeo, aluminumMetalMat);
            screw.position.set(sx, sy, sz);
            ejectRollerAssemblyGroup.add(screw);
        });
        // NEMA 17 Stepper Motor Body
        const ejectMotorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 3.8), stepperBodyMat);
        ejectMotorMesh.position.set(0, 0, -16.3);
        ejectMotorMesh.castShadow = true;
        ejectRollerAssemblyGroup.add(ejectMotorMesh);
        const ejectFrontBell = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), aluminumMetalMat);
        ejectFrontBell.position.set(0, 0, -14.6);
        const ejectRearBell = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 0.4), aluminumMetalMat);
        ejectRearBell.position.set(0, 0, -18.0);
        ejectRollerAssemblyGroup.add(ejectFrontBell, ejectRearBell);
        // Motor 5mm D-Shaft protruding forward from motor face into coupler
        const ejectMotorShaft = new THREE.Mesh(motorShaftGeo, aluminumMetalMat);
        ejectMotorShaft.position.set(0, 0, -13.3);
        ejectRollerAssemblyGroup.add(ejectMotorShaft);
        // B. Ejection Roller Spinning Group
        const ejectRollerSpinGroup = new THREE.Group();
        // Roller axle shaft (d = 8mm)
        const ejectShaft = new THREE.Mesh(shaftGeo, aluminumMetalMat);
        ejectShaft.position.set(0, 0, -0.4);
        ejectRollerSpinGroup.add(ejectShaft);
        // CNC Helical Flexible Shaft Coupler
        const ejectCoupler = new THREE.Mesh(couplerGeo, aluminumMetalMat);
        ejectCoupler.position.set(0, 0, -12.6);
        ejectRollerSpinGroup.add(ejectCoupler);
        for (let i = -2; i <= 2; i++) {
            const cutRingGeo = new THREE.TorusGeometry(0.96, 0.035, 8, 24);
            cutRingGeo.rotateX(Math.PI / 2);
            const cutRing = new THREE.Mesh(cutRingGeo, new THREE.MeshBasicMaterial({ color: 0x334155 }));
            cutRing.position.set(0, 0, -12.6 + i * 0.3);
            ejectRollerSpinGroup.add(cutRing);
        }
        const ess1 = new THREE.Mesh(setScrewGeo, brassKnobMat);
        ess1.position.set(0.9, 0, -13.2);
        const ess2 = new THREE.Mesh(setScrewGeo, brassKnobMat);
        ess2.position.set(0.9, 0, -12.0);
        ejectRollerSpinGroup.add(ess1, ess2);
        const ejectRollerBody = new THREE.Mesh(rollerBodyGeo, rubberRollerMat);
        ejectRollerBody.castShadow = true;
        ejectRollerSpinGroup.add(ejectRollerBody);
        [-7.5, -2.5, 2.5, 7.5].forEach((zPos) => {
            const tire = new THREE.Mesh(tireGeo, cyanAccentMat);
            tire.position.set(0, 0, zPos);
            ejectRollerSpinGroup.add(tire);
        });
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const stripeGeo = new THREE.BoxGeometry(0.12, 0.12, rollerLength - 0.5);
            const stripe = new THREE.Mesh(stripeGeo, orangeTractionMat);
            stripe.position.set(Math.cos(angle) * 0.86, Math.sin(angle) * 0.86, 0);
            ejectRollerSpinGroup.add(stripe);
        }
        ejectRollerAssemblyGroup.add(ejectRollerSpinGroup);
        const ejectIdler = new THREE.Mesh(idlerGeo, aluminumMetalMat);
        ejectIdler.position.set(0, -1.4, 0);
        ejectRollerAssemblyGroup.add(ejectIdler);
        scene.add(ejectRollerAssemblyGroup);
        // Exit catch tray (Toggled via Desk Drop Mode)
        const exitTrayGroup = new THREE.Group();
        const exitTrayLength = 32.0;
        const exitInnerWidth = 22.2;
        const exitBed = new THREE.Mesh(new THREE.BoxGeometry(exitTrayLength, 0.35, exitInnerWidth), chassisMat);
        exitBed.position.set(-exitTrayLength / 2, 0, 0);
        exitBed.receiveShadow = true;
        exitTrayGroup.add(exitBed);
        const exwF = new THREE.Mesh(new THREE.BoxGeometry(exitTrayLength, 1.4, 0.4), chassisMat);
        exwF.position.set(-exitTrayLength / 2, 0.7, exitInnerWidth / 2 - 0.2);
        const exwR = new THREE.Mesh(new THREE.BoxGeometry(exitTrayLength, 1.4, 0.4), chassisMat);
        exwR.position.set(-exitTrayLength / 2, 0.7, -exitInnerWidth / 2 + 0.2);
        exitTrayGroup.add(exwF, exwR);
        const exitLip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, exitInnerWidth), chassisMat);
        exitLip.position.set(-exitTrayLength, 0.7, 0);
        exitTrayGroup.add(exitLip);
        exitTrayGroup.position.set(-PLATEN_BED_LENGTH - 0.5, 1.45, 0);
        exitTrayGroup.rotation.z = EXIT_ANGLE_RAD;
        exitTrayGroup.visible = !removeExitTray; // Respects Desk Drop mode!
        scene.add(exitTrayGroup);
        // -------------------------------------------------------------
        // 5. OVERHEAD GANTRY TOWER & CANTILEVER ARM
        // Gantry Pillar at X = -15.75, Z = -13.5 (Centered behind A4 bed)
        // -------------------------------------------------------------
        const columnGroup = new THREE.Group();
        const colHeight = 30.0;
        const colGeo = new THREE.CylinderGeometry(1.6, 1.8, colHeight, 32);
        const columnPillar = new THREE.Mesh(colGeo, gantryMat);
        columnPillar.position.set(0, colHeight / 2, 0);
        columnPillar.castShadow = true;
        columnGroup.add(columnPillar);
        const gussetShape = new THREE.Shape();
        gussetShape.moveTo(0, 0);
        gussetShape.lineTo(0, 6.0);
        gussetShape.lineTo(5.0, 0);
        gussetShape.closePath();
        const gussetGeo = new THREE.ExtrudeGeometry(gussetShape, { depth: 0.9, bevelEnabled: false });
        const gussetMesh = new THREE.Mesh(gussetGeo, gantryMat);
        gussetMesh.position.set(-0.45, 0.5, -0.45);
        gussetMesh.rotation.y = Math.PI / 2;
        columnGroup.add(gussetMesh);
        columnGroup.position.set(PLATEN_CENTER_X, 1.8, -13.5);
        scene.add(columnGroup);
        // Cantilever Arm
        const armGroup = new THREE.Group();
        const armReach = 13.5;
        const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 32), gantryMat);
        armGroup.add(topCollar);
        const armBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, armReach), gantryMat);
        armBeam.position.set(0, 0, armReach / 2);
        armBeam.castShadow = true;
        armGroup.add(armBeam);
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, armReach - 1.5), cyanAccentMat);
        spine.position.set(0, 1.05, armReach / 2);
        armGroup.add(spine);
        const tipBoss = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.8, 24), aluminumMetalMat);
        tipBoss.position.set(0, -0.6, armReach);
        armGroup.add(tipBoss);
        // Cantilever Arm Column Height Lock Clamp with 5-Lobe Star Knob
        const lockKnob = createTwinStarKnob(0.75, 0.5, 5);
        lockKnob.rotation.z = Math.PI / 2;
        lockKnob.position.set(1.4, -0.6, armReach);
        armGroup.add(lockKnob);
        // 2-AXIS MECHANICAL GIMBAL TILT HEAD (NO BALLS!)
        // Vertical suspension drop bracket & U-Clevis Fork Base
        const dropStem = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.8, 1.2), gantryMat);
        dropStem.position.set(0, -2.5, armReach);
        armGroup.add(dropStem);
        // Dual vertical clamping ears (stanchions)
        const clevisEar1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.35), gantryMat);
        clevisEar1.position.set(0, -4.8, armReach + 0.7);
        const clevisEar2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.35), gantryMat);
        clevisEar2.position.set(0, -4.8, armReach - 0.7);
        armGroup.add(clevisEar1, clevisEar2);
        // Central Tilt Trunnion Block (±45° document tilt angle)
        const trunnionBlock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.0), cyanAccentMat);
        trunnionBlock.position.set(0, -4.8, armReach);
        armGroup.add(trunnionBlock);
        // Transverse M5 Stainless Steel Pivot Bolt & Bronze Thrust Washers
        const pivotBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 16), aluminumMetalMat);
        pivotBolt.rotation.x = Math.PI / 2;
        pivotBolt.position.set(0, -4.8, armReach);
        armGroup.add(pivotBolt);
        // Ergonomic 5-Lobe Star Tilt Locking Knob
        const tiltKnob = createTwinStarKnob(0.8, 0.45, 5);
        tiltKnob.rotation.x = Math.PI / 2;
        tiltKnob.position.set(0, -4.8, armReach + 1.2);
        armGroup.add(tiltKnob);
        armGroup.position.set(PLATEN_CENTER_X, 1.8 + colHeight, -13.5);
        scene.add(armGroup);
        // -------------------------------------------------------------
        // 6. REDESIGNED UNIVERSAL CAMERA ISLAND CRADLE
        // - Massive 75mm x 80mm universal camera aperture window
        // - Accommodates iPhone Pro corner bump, Samsung Ultra vertical strip,
        //   Pixel horizontal visor bar, and centered circular pucks!
        // - Padded lower side clamps grip without touching camera bump or buttons
        // - 100% Clear touchscreen facing UP towards user with live viewfinder
        // -------------------------------------------------------------
        const phoneMountGroup = new THREE.Group();
        const phoneWidth = 8.4;
        const phoneLength = 16.8;
        // A. Cradle Lower Solid Backplate (supports bottom half of phone)
        const lowerBackplate = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, phoneWidth + 0.8), gantryMat);
        lowerBackplate.position.set(-4.2, -0.4, 0);
        phoneMountGroup.add(lowerBackplate);
        // Arca-Swiss mounting foot mating with gimbal tilt head
        const arcaFoot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3.2), aluminumMetalMat);
        arcaFoot.position.set(-4.2, -0.85, 0);
        phoneMountGroup.add(arcaFoot);
        // B. Universal Camera Aperture Perimeter Frame
        // Generates a massive open optical well (75mm x 80mm) in the upper half!
        const bayFrameTop = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 1.4), gantryMat);
        bayFrameTop.position.set(4.3, -0.4, phoneWidth / 2 - 0.3);
        const bayFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 1.4), gantryMat);
        bayFrameBottom.position.set(4.3, -0.4, -phoneWidth / 2 + 0.3);
        const bayFrameEnd = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, phoneWidth + 0.8), gantryMat);
        bayFrameEnd.position.set(8.0, -0.4, 0);
        phoneMountGroup.add(bayFrameTop, bayFrameBottom, bayFrameEnd);
        // Beveled optical rim around the universal camera window
        const rimMat = cyanAccentMat;
        const rim1 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 0.3), rimMat);
        rim1.position.set(4.4, -0.15, phoneWidth / 2 - 0.9);
        const rim2 = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 0.3), rimMat);
        rim2.position.set(4.4, -0.15, -phoneWidth / 2 + 0.9);
        phoneMountGroup.add(rim1, rim2);
        // Silicone bumper pads that cushion the camera bump perimeter
        const padMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const pad1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.1, 0.8), padMat);
        pad1.position.set(4.4, -0.1, phoneWidth / 2 - 0.4);
        const pad2 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.1, 0.8), padMat);
        pad2.position.set(4.4, -0.1, -phoneWidth / 2 + 0.4);
        phoneMountGroup.add(pad1, pad2);
        // -------------------------------------------------------------
        // DUAL-RAIL LEAD SCREW CLAMP MECHANISM
        // -------------------------------------------------------------
        // Dual stainless guide rods (2x Ø3.5mm rods)
        const gr1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9.2, 16), aluminumMetalMat);
        gr1.rotation.z = Math.PI / 2;
        gr1.position.set(-4.2, 0.2, phoneWidth / 2 - 1.6);
        const gr2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9.2, 16), aluminumMetalMat);
        gr2.rotation.z = Math.PI / 2;
        gr2.position.set(-4.2, 0.2, -phoneWidth / 2 + 1.6);
        phoneMountGroup.add(gr1, gr2);
        // Central M5 Threaded Lead Screw
        const ls = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 10.2, 16), brassKnobMat);
        ls.rotation.z = Math.PI / 2;
        ls.position.set(-4.8, 0.2, 0);
        phoneMountGroup.add(ls);
        // Fixed Jaw with Silicone Pad
        const fixedJaw = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.2, 0.5), cyanAccentMat);
        fixedJaw.position.set(-3.8, 0.2, -phoneWidth / 2 - 0.25);
        const fixedPad = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.0, 0.15), orangeTractionMat);
        fixedPad.position.set(-3.8, 0.2, -phoneWidth / 2);
        phoneMountGroup.add(fixedJaw, fixedPad);
        // Mobile Sliding Jaw Carriage with Silicone Pad & Brass Bushings
        const slidingJaw = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.2, 0.7), cyanAccentMat);
        slidingJaw.position.set(-3.8, 0.2, phoneWidth / 2 + 0.35);
        const slidingPad = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.0, 0.15), orangeTractionMat);
        slidingPad.position.set(-3.8, 0.2, phoneWidth / 2);
        phoneMountGroup.add(slidingJaw, slidingPad);
        // Ergonomic 5-Lobe Star Lead-Screw Clamp Knob
        const clampKnob = createTwinStarKnob(0.85, 0.55, 5);
        clampKnob.rotation.z = -Math.PI / 2;
        clampKnob.position.set(-9.8, 0.2, 0);
        phoneMountGroup.add(clampKnob);
        // Smartphone chassis (Titanium / matte glass body)
        const phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(phoneLength, 0.8, phoneWidth), chassisMat);
        phoneMesh.position.set(0, 0.35, 0);
        phoneMesh.castShadow = true;
        phoneMountGroup.add(phoneMesh);
        // 100% Clear, Unobstructed Screen Facing UP
        const screenGeo = new THREE.PlaneGeometry(phoneLength - 0.6, phoneWidth - 0.6);
        const phoneScreenMat = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            side: THREE.DoubleSide
        });
        const phoneScreen = new THREE.Mesh(screenGeo, phoneScreenMat);
        phoneScreen.rotation.x = -Math.PI / 2;
        phoneScreen.position.set(0, 0.76, 0);
        phoneMountGroup.add(phoneScreen);
        // In-Screen Viewfinder Overlay (Document frame & crosshairs)
        const screenFrameGeo = new THREE.PlaneGeometry(phoneLength - 2.0, phoneWidth - 2.0);
        const screenFrameMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            wireframe: true,
            side: THREE.DoubleSide
        });
        const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
        screenFrame.rotation.x = -Math.PI / 2;
        screenFrame.position.set(0, 0.78, 0);
        phoneMountGroup.add(screenFrame);
        // Dynamic Camera Modules Group (Protruding DOWN through the universal aperture window!)
        const cameraModulesGroup = new THREE.Group();
        if (phoneCameraType === 'iphone_pro') {
            // iPhone Pro: Square corner camera bump with triple triangle lenses
            const bump = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.0), gantryMat);
            bump.position.set(5.0, -0.2, 1.4);
            cameraModulesGroup.add(bump);
            const lensGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.4, 24);
            const l1 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l1.position.set(4.2, -0.4, 2.2);
            const l2 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l2.position.set(5.8, -0.4, 2.2);
            const l3 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l3.position.set(5.0, -0.4, 0.6);
            cameraModulesGroup.add(l1, l2, l3);
            const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            flash.position.set(3.8, -0.35, 0.6);
            cameraModulesGroup.add(flash);
        }
        else if (phoneCameraType === 'samsung_ultra') {
            // Samsung Ultra: Vertical line of 4 camera lenses
            const bump = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.35, 2.6), gantryMat);
            bump.position.set(4.2, -0.18, 2.2);
            cameraModulesGroup.add(bump);
            [-2.4, -0.8, 0.8, 2.4].forEach((xOff) => {
                const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20), aluminumMetalMat);
                lens.position.set(4.2 + xOff, -0.4, 2.2);
                cameraModulesGroup.add(lens);
            });
        }
        else if (phoneCameraType === 'pixel_visor') {
            // Pixel Pro: Signature full-width horizontal camera visor bar
            const visor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, phoneWidth - 0.2), aluminumMetalMat);
            visor.position.set(4.5, -0.22, 0);
            cameraModulesGroup.add(visor);
            const pillWindow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 5.0), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
            pillWindow.position.set(4.5, -0.46, 0.5);
            cameraModulesGroup.add(pillWindow);
            const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
            l1.position.set(4.5, -0.48, 1.8);
            const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
            l2.position.set(4.5, -0.48, -0.8);
            cameraModulesGroup.add(l1, l2);
        }
        else {
            // Universal: Standard wide camera island that fits all lenses
            const bump = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.4, 4.6), gantryMat);
            bump.position.set(4.5, -0.2, 0);
            cameraModulesGroup.add(bump);
            const lensGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.4, 24);
            const l1 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l1.position.set(3.6, -0.4, 1.1);
            const l2 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l2.position.set(5.4, -0.4, 1.1);
            const l3 = new THREE.Mesh(lensGeo, aluminumMetalMat);
            l3.position.set(4.5, -0.4, -1.1);
            cameraModulesGroup.add(l1, l2, l3);
            const flash = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            flash.position.set(3.4, -0.35, -1.1);
            cameraModulesGroup.add(flash);
        }
        phoneMountGroup.add(cameraModulesGroup);
        // Position phone mount centered directly above A4 platen center at X = -15.75, Z = 0
        phoneMountGroup.position.set(PLATEN_CENTER_X, 24.5, 0);
        scene.add(phoneMountGroup);
        // Optical Projection Cone
        const coneGeo = new THREE.CylinderGeometry(0.3, 16.0, 22.8, 4, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.12,
            wireframe: true,
            side: THREE.DoubleSide
        });
        const opticalConeMesh = new THREE.Mesh(coneGeo, coneMat);
        opticalConeMesh.position.set(PLATEN_CENTER_X, 13.0, 0);
        opticalConeMesh.rotation.y = Math.PI / 4;
        scene.add(opticalConeMesh);
        // Optical IR Sensor Beam Visualizer
        const beamGeo = new THREE.CylinderGeometry(0.08, 0.4, 22.8, 16);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const irSensorBeam = new THREE.Mesh(beamGeo, beamMat);
        irSensorBeam.position.set(PLATEN_CENTER_X, 13.0, 0);
        scene.add(irSensorBeam);
        // -------------------------------------------------------------
        // 7. ANIMATED A4 DOCUMENT SHEET (297mm x 210mm)
        // Sits 100% FLUSH with ZERO air gap on the paper stack in the hopper!
        // Optical bed is 100% clear with zero overhead flattener obstruction.
        // -------------------------------------------------------------
        const paperGeo = new THREE.PlaneGeometry(A4_LENGTH, A4_WIDTH, 16, 16);
        paperGeo.rotateX(-Math.PI / 2); // Flat in XZ plane with normal +Y
        const paperMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.05,
            side: THREE.DoubleSide,
        });
        const paperMesh = new THREE.Mesh(paperGeo, paperMat);
        paperMesh.castShadow = true;
        paperMesh.receiveShadow = true;
        // Flush resting position on the hopper paper stack!
        paperMesh.position.set(HOPPER_WORLD_X, HOPPER_WORLD_Y, 0);
        paperMesh.rotation.set(0, 0, HOPPER_ANGLE_RAD);
        scene.add(paperMesh);
        partsRef.current = {
            baseGroup,
            hopperGroup,
            exitTrayGroup,
            columnGroup,
            armGroup,
            phoneMountGroup,
            cameraModulesGroup,
            feedRollerSpinGroup,
            ejectRollerSpinGroup,
            servoPickUpGroup,
            paperMesh,
            paperStackMesh,
            opticalConeMesh,
            irSensorBeam,
            phoneScreenMat,
        };
        // -------------------------------------------------------------
        // Mouse Interaction Handlers
        // -------------------------------------------------------------
        const onMouseDown = (e) => {
            orbitRef.current.isDragging = true;
            orbitRef.current.prevX = e.clientX;
            orbitRef.current.prevY = e.clientY;
        };
        const onMouseMove = (e) => {
            if (!orbitRef.current.isDragging)
                return;
            const dx = e.clientX - orbitRef.current.prevX;
            const dy = e.clientY - orbitRef.current.prevY;
            orbitRef.current.prevX = e.clientX;
            orbitRef.current.prevY = e.clientY;
            if (e.buttons === 2 || e.shiftKey) {
                orbitRef.current.panX += dx * 0.035;
                orbitRef.current.panY -= dy * 0.035;
            }
            else {
                orbitRef.current.targetRotY += dx * 0.008;
                orbitRef.current.targetRotX += dy * 0.008;
                orbitRef.current.targetRotX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, orbitRef.current.targetRotX));
            }
        };
        const onMouseUp = () => {
            orbitRef.current.isDragging = false;
        };
        let lastTouchDistance = 0;
        let lastTouchCenterX = 0;
        let lastTouchCenterY = 0;
        const onTouchStart = (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                orbitRef.current.prevX = e.touches[0].clientX;
                orbitRef.current.prevY = e.touches[0].clientY;
                lastTouchDistance = 0;
            }
            else if (e.touches.length >= 2) {
                const first = e.touches[0];
                const second = e.touches[1];
                lastTouchDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
                lastTouchCenterX = (first.clientX + second.clientX) / 2;
                lastTouchCenterY = (first.clientY + second.clientY) / 2;
            }
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const dx = touch.clientX - orbitRef.current.prevX;
                const dy = touch.clientY - orbitRef.current.prevY;
                orbitRef.current.prevX = touch.clientX;
                orbitRef.current.prevY = touch.clientY;
                orbitRef.current.targetRotY += dx * 0.008;
                orbitRef.current.targetRotX += dy * 0.008;
                orbitRef.current.targetRotX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, orbitRef.current.targetRotX));
            }
            else if (e.touches.length >= 2) {
                const first = e.touches[0];
                const second = e.touches[1];
                const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
                const centerX = (first.clientX + second.clientX) / 2;
                const centerY = (first.clientY + second.clientY) / 2;
                if (lastTouchDistance > 0) {
                    orbitRef.current.targetDistance -= (distance - lastTouchDistance) * 0.08;
                    orbitRef.current.targetDistance = Math.max(15, Math.min(110, orbitRef.current.targetDistance));
                    orbitRef.current.panX += (centerX - lastTouchCenterX) * 0.035;
                    orbitRef.current.panY -= (centerY - lastTouchCenterY) * 0.035;
                }
                lastTouchDistance = distance;
                lastTouchCenterX = centerX;
                lastTouchCenterY = centerY;
            }
        };
        const onTouchEnd = (e) => {
            if (e.touches.length === 1) {
                orbitRef.current.prevX = e.touches[0].clientX;
                orbitRef.current.prevY = e.touches[0].clientY;
                lastTouchDistance = 0;
            }
            else if (e.touches.length === 0) {
                orbitRef.current.isDragging = false;
                lastTouchDistance = 0;
            }
        };
        const onWheel = (e) => {
            e.preventDefault();
            orbitRef.current.targetDistance += e.deltaY * 0.04;
            orbitRef.current.targetDistance = Math.max(15, Math.min(110, orbitRef.current.targetDistance));
        };
        const onContextMenu = (e) => e.preventDefault();
        const dom = container;
        dom.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        dom.addEventListener('wheel', onWheel, { passive: false });
        dom.addEventListener('contextmenu', onContextMenu);
        dom.addEventListener('touchstart', onTouchStart, { passive: false });
        dom.addEventListener('touchmove', onTouchMove, { passive: false });
        dom.addEventListener('touchend', onTouchEnd);
        dom.addEventListener('touchcancel', onTouchEnd);
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current)
                return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        // -------------------------------------------------------------
        // Animation Render Loop
        // -------------------------------------------------------------
        let animationFrameId;
        let frameCount = 0;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const orbit = orbitRef.current;
            orbit.rotX += (orbit.targetRotX - orbit.rotX) * 0.1;
            orbit.rotY += (orbit.targetRotY - orbit.rotY) * 0.1;
            orbit.distance += (orbit.targetDistance - orbit.distance) * 0.1;
            const cam = cameraRef.current;
            if (cam) {
                cam.position.x = orbit.panX + orbit.distance * Math.sin(orbit.rotY) * Math.cos(orbit.rotX);
                cam.position.y = orbit.panY + orbit.distance * Math.sin(orbit.rotX);
                cam.position.z = orbit.distance * Math.cos(orbit.rotY) * Math.cos(orbit.rotX);
                cam.lookAt(orbit.panX, orbit.panY, 0);
            }
            // Exploded View offsets: When exp == 0, parts are 100% physically connected!
            if (partsRef.current) {
                const exp = explodedRef.current;
                const { hopperGroup, exitTrayGroup, columnGroup, armGroup, phoneMountGroup, } = partsRef.current;
                hopperGroup.position.x = 0.6 + exp * 14;
                exitTrayGroup.position.x = -PLATEN_BED_LENGTH - 0.5 - exp * 12;
                columnGroup.position.y = 1.8 + exp * 6;
                armGroup.position.y = (1.8 + colHeight) + exp * 10;
                phoneMountGroup.position.y = 24.5 + exp * 16;
                // Dynamic visibility of exit tray based on Desk Drop setting
                exitTrayGroup.visible = !removeExitTrayRef.current;
            }
            renderer.render(scene, camera);
            // Screen-projected kinematic dimension badges
            if (showPartLabelsRef.current && cam && containerRef.current) {
                frameCount++;
                if (frameCount % 3 === 0) {
                    const w = containerRef.current.clientWidth;
                    const h = containerRef.current.clientHeight;
                    const temp = new THREE.Vector3();
                    const exp = explodedRef.current;
                    const tags = [];
                    for (const a of DIMENSION_ANCHORS) {
                        temp.set(a.pos[0], a.pos[1], a.pos[2]);
                        if (partsRef.current && exp > 0) {
                            if (a.id === 'phone-cradle')
                                temp.y += exp * 16;
                            if (a.id === 'feed-hopper')
                                temp.x += exp * 14;
                            if (a.id === 'gantry-tower')
                                temp.y += exp * 6;
                            if (a.id === 'ejection-roller')
                                temp.x -= exp * 12;
                        }
                        temp.project(cam);
                        const screenX = (temp.x * 0.5 + 0.5) * w;
                        const screenY = (-(temp.y * 0.5) + 0.5) * h;
                        const visible = temp.z < 1.0 && screenX >= 25 && screenX <= w - 25 && screenY >= 25 && screenY <= h - 25;
                        tags.push({ ...a, screenX, screenY, visible });
                    }
                    setProjectedTags(tags);
                }
            }
        };
        animate();
        return () => {
            cancelAnimationFrame(animationFrameId);
            dom.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            dom.removeEventListener('wheel', onWheel);
            dom.removeEventListener('contextmenu', onContextMenu);
            dom.removeEventListener('touchstart', onTouchStart);
            dom.removeEventListener('touchmove', onTouchMove);
            dom.removeEventListener('touchend', onTouchEnd);
            dom.removeEventListener('touchcancel', onTouchEnd);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, [showWireframe, isDark, removeExitTray, phoneCameraType, HOPPER_WORLD_X, HOPPER_WORLD_Y]);
    // Wireframe toggle effect
    useEffect(() => {
        if (!sceneRef.current)
            return;
        sceneRef.current.traverse((child) => {
            if (child.isMesh) {
                const mesh = child;
                if (mesh.material) {
                    const mat = mesh.material;
                    if ('wireframe' in mat) {
                        mat.wireframe = showWireframe;
                    }
                }
            }
        });
    }, [showWireframe]);
    // Sensor beams visibility effect
    useEffect(() => {
        if (partsRef.current) {
            partsRef.current.opticalConeMesh.visible = showSensorBeams;
            partsRef.current.irSensorBeam.visible = showSensorBeams;
        }
    }, [showSensorBeams]);
    // Exit Tray Visibility Synchronizer
    useEffect(() => {
        if (partsRef.current) {
            partsRef.current.exitTrayGroup.visible = !removeExitTray;
        }
    }, [removeExitTray]);
    // -----------------------------------------------------------------
    // Kinematics Simulation State Machine Runner (Pure A4 Contact Alignment)
    // -----------------------------------------------------------------
    useEffect(() => {
        let timer;
        if (scannerState === 'FEEDING') {
            const feedInterval = setInterval(() => {
                const nextProgress = progressRef.current + 0.032;
                if (partsRef.current) {
                    // Drive feed roller spins axially around Z
                    partsRef.current.feedRollerSpinGroup.rotation.z -= 0.22;
                    // SG90 Micro-Servo: Pivots pick-up roller DOWN onto stack with normal force!
                    if (useServoPickup) {
                        partsRef.current.servoPickUpGroup.rotation.z = -0.14;
                    }
                    const pMesh = partsRef.current.paperMesh;
                    const t = Math.min(nextProgress * 2, 1);
                    // Interpolation from feed hopper into platen bed
                    // Hopper start: X = HOPPER_WORLD_X, Y = HOPPER_WORLD_Y, rotZ = HOPPER_ANGLE_RAD
                    // Platen target: X = PLATEN_CENTER_X, Y = PAPER_PLATEN_Y (1.563), rotZ = 0
                    const startX = HOPPER_WORLD_X;
                    const targetX = PLATEN_CENTER_X;
                    pMesh.position.x = startX + (targetX - startX) * t;
                    if (pMesh.position.x > 0) {
                        // Trajectory sliding smoothly along 16° ramp into throat
                        const ratio = pMesh.position.x / HOPPER_WORLD_X;
                        pMesh.position.y = PAPER_PLATEN_Y + ratio * (HOPPER_WORLD_Y - PAPER_PLATEN_Y);
                        pMesh.rotation.set(0, 0, HOPPER_ANGLE_RAD * ratio);
                    }
                    else {
                        // Sits 100% FLUSH on platen glass surface with zero air gap!
                        pMesh.position.y = PAPER_PLATEN_Y;
                        pMesh.rotation.set(0, 0, 0);
                    }
                }
                dispatch(setPaperProgress(Math.min(nextProgress, 0.5)));
                // Arrived at platen bed: Trip sensor, stop feed, trigger mobile scan
                if (nextProgress >= 0.5) {
                    clearInterval(feedInterval);
                    dispatch(setScannerState('PAPER_ARRIVED'));
                    dispatch(setFlattenerEngaged(true));
                    if (partsRef.current) {
                        // Retract SG90 servo pick-up arm back UP to eliminate camera shadows and multi-feed!
                        if (useServoPickup) {
                            partsRef.current.servoPickUpGroup.rotation.z = 0.25;
                        }
                        // Trip optical sensor beam to emerald green
                        const beamMat = partsRef.current.irSensorBeam.material;
                        beamMat.color.setHex(0x10b981);
                        beamMat.opacity = 0.85;
                        // Viewfinder screen confirms A4 lock
                        partsRef.current.phoneScreenMat.color.setHex(0x10b981);
                    }
                    // Emit WebSocket Event from ESP32 to mobile phone app!
                    dispatch(addApiLog({
                        method: 'WS_EMIT',
                        endpoint: 'ws://192.168.4.1/ws',
                        statusCode: 200,
                        payload: {
                            event: 'PAPER_ARRIVED_SCAN_NOW',
                            format: 'ISO_216_A4',
                            dimensions: '297x210mm',
                            sensor: 'GPIO_34_TCRT5000',
                            servoState: 'RETRACTED_OPTICAL_CLEARANCE',
                            status: 'A4_ALIGNED_OK',
                            cycle: metrics.completedScans + 1
                        },
                        latencyMs: 3,
                        source: 'ESP32'
                    }));
                    // Automated high-res scan trigger
                    timer = setTimeout(() => {
                        dispatch(setScannerState('SCAN_IN_PROGRESS'));
                        triggerCameraFlash();
                        // Mobile App responds with POST /api/scan-complete handshake (200 OK)!
                        dispatch(addApiLog({
                            method: 'POST',
                            endpoint: '/api/scan-complete',
                            statusCode: 200,
                            payload: {
                                status: 'SCAN_SUCCESS',
                                format: 'A4_300DPI',
                                scanId: `A4_PAGE_${metrics.completedScans + 1}`,
                                ocrConfidence: 0.995
                            },
                            latencyMs: 14,
                            source: 'MobileApp'
                        }));
                        // Proceed to Ejection
                        setTimeout(() => {
                            dispatch(setScannerState('EJECTING'));
                            dispatch(setFlattenerEngaged(false));
                            if (partsRef.current) {
                                const beamMat = partsRef.current.irSensorBeam.material;
                                beamMat.color.setHex(0x06b6d4);
                                beamMat.opacity = 0.35;
                                partsRef.current.phoneScreenMat.color.setHex(0x0284c7);
                            }
                        }, 650);
                    }, 850);
                }
            }, 35);
            return () => {
                clearInterval(feedInterval);
                clearTimeout(timer);
            };
        }
        if (scannerState === 'EJECTING') {
            const ejectInterval = setInterval(() => {
                const nextProgress = progressRef.current + 0.038;
                if (partsRef.current) {
                    // Ejection roller spins axially around Z
                    partsRef.current.ejectRollerSpinGroup.rotation.z -= 0.24;
                    const pMesh = partsRef.current.paperMesh;
                    pMesh.position.x -= 1.8;
                    // As paper passes exit roller at -31.5:
                    if (pMesh.position.x < -PLATEN_BED_LENGTH) {
                        const exitDist = -PLATEN_BED_LENGTH - pMesh.position.x;
                        if (removeExitTray) {
                            // Desk Drop Mode: Lands flat on desktop surface at Y = 0.04 (No hovering in air!)
                            pMesh.position.y = Math.max(0.04, PAPER_PLATEN_Y - (exitDist / 12) * PAPER_PLATEN_Y);
                            pMesh.rotation.set(0, 0, (2 * Math.PI) / 180 * Math.max(0, 1 - exitDist / 12));
                        }
                        else {
                            // Attached Catch Tray Mode: Slides into tray ramp
                            pMesh.position.y = PAPER_PLATEN_Y - (exitDist / 14) * 1.0;
                            pMesh.rotation.set(0, 0, -EXIT_ANGLE_RAD * Math.min(exitDist / 10, 1));
                        }
                    }
                }
                dispatch(setPaperProgress(nextProgress));
                if (nextProgress >= 1.0) {
                    clearInterval(ejectInterval);
                    dispatch(incrementCompletedScans());
                    dispatch(setScannerState('COMPLETED'));
                    dispatch(addApiLog({
                        method: 'WS_EMIT',
                        endpoint: 'ws://192.168.4.1/ws',
                        statusCode: 200,
                        payload: {
                            event: 'EJECT_COMPLETE',
                            mode: removeExitTray ? 'DESK_DROP' : 'CATCH_TRAY',
                            message: removeExitTray
                                ? 'A4 document ejected directly to desk surface (minimalist mode).'
                                : 'A4 document successfully ejected to catch tray.',
                            remainingInHopper: hopperPaperCount - 1
                        },
                        latencyMs: 4,
                        source: 'ESP32'
                    }));
                    // Reset paper sheet back to feed hopper for next cycle (ZERO air gap on stack!)
                    if (partsRef.current) {
                        partsRef.current.paperMesh.position.set(HOPPER_WORLD_X, HOPPER_WORLD_Y, 0);
                        partsRef.current.paperMesh.rotation.set(0, 0, HOPPER_ANGLE_RAD);
                        if (useServoPickup) {
                            partsRef.current.servoPickUpGroup.rotation.z = 0.22;
                        }
                    }
                    if (autoLoopEnabled && hopperPaperCount > 1) {
                        timer = setTimeout(() => {
                            dispatch(setScannerState('FEEDING'));
                            dispatch(setPaperProgress(0));
                        }, cycleDelayMs);
                    }
                    else {
                        dispatch(setScannerState('IDLE'));
                        dispatch(setPaperProgress(0));
                    }
                }
            }, 35);
            return () => {
                clearInterval(ejectInterval);
                clearTimeout(timer);
            };
        }
    }, [
        scannerState,
        autoLoopEnabled,
        cycleDelayMs,
        hopperPaperCount,
        metrics.completedScans,
        dispatch,
        triggerCameraFlash,
        removeExitTray,
        useServoPickup,
        HOPPER_WORLD_X,
        HOPPER_WORLD_Y,
        PLATEN_CENTER_X,
        PAPER_PLATEN_Y
    ]);
    return (_jsxs("div", { className: "relative w-full h-full select-none overflow-hidden", ref: containerRef, children: [_jsx("canvas", { ref: canvasRef, className: "w-full h-full block cursor-grab active:cursor-grabbing" }), _jsx("div", { className: `pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${isFlashActive ? 'opacity-70' : 'opacity-0'}` }), _jsxs("div", { className: "absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-none", children: [_jsxs("div", { className: `px-3 py-1.5 rounded-full text-xs font-mono font-medium backdrop-blur-md border shadow-sm ${scannerState === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : scannerState === 'SCAN_IN_PROGRESS'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'}`, children: ["STATE: ", scannerState] }), _jsx("div", { className: `px-3 py-1.5 rounded-full text-xs font-mono font-medium backdrop-blur-md border shadow-sm ${isDark ? 'bg-slate-900/80 text-slate-300 border-white/10' : 'bg-white/90 text-slate-700 border-slate-200'}`, children: "FORMAT: ISO 216 A4 (297x210mm)" }), _jsx("div", { className: `px-3 py-1.5 rounded-full text-xs font-mono font-medium backdrop-blur-md border shadow-sm ${removeExitTray
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : isDark ? 'bg-slate-900/80 text-slate-300 border-white/10' : 'bg-white/90 text-slate-700 border-slate-200'}`, children: removeExitTray ? 'DESK-DROP MODE (-$12.84 BOM)' : 'ATTACHED CATCH TRAY' }), _jsx("div", { className: `px-3 py-1.5 rounded-full text-xs font-mono font-medium backdrop-blur-md border shadow-sm ${useServoPickup
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : isDark ? 'bg-slate-900/80 text-slate-300 border-white/10' : 'bg-white/90 text-slate-700 border-slate-200'}`, children: useServoPickup ? 'SG90 SERVO PICKUP (1-50 SHEETS)' : 'FIXED ROLLER' })] }), _jsxs("div", { className: `absolute bottom-4 left-4 z-10 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs font-mono shadow-md ${isDark ? 'bg-slate-950/80 border-white/10 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-800'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }), _jsxs("span", { className: "font-semibold text-emerald-600 dark:text-emerald-400 uppercase", children: ["Universal Camera Island: ", phoneCameraType.replace('_', ' ')] }), _jsx("span", { className: "text-slate-400", children: "|" }), _jsx("span", { className: "text-slate-500", children: "75x80mm Beveled Optical Bay" })] }), _jsxs("div", { className: "text-[10px] text-slate-400 mt-0.5", children: ["Paper contact: Y = ", PAPER_PLATEN_Y.toFixed(3), " (0.00mm air gap on platen) \u00B7 Stack: ", hopperPaperCount, " sheets"] })] }), _jsxs("div", { className: "absolute top-4 right-4 z-10 flex items-center gap-2", children: [_jsx("button", { onClick: () => dispatch(setShowPartLabels(!showPartLabels)), title: showPartLabels ? "Hide 3D Dimension Callout Labels" : "Show 3D Dimension Callout Labels", className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold shadow-sm transition-all cursor-pointer ${showPartLabels
                            ? 'bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-200 border-cyan-400/60 shadow-cyan-500/20'
                            : isDark
                                ? 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-white/20 hover:text-white'
                                : 'bg-white/90 hover:bg-white text-slate-700 border-slate-300 hover:text-slate-950 shadow-xs'}`, children: showPartLabels ? (_jsxs(_Fragment, { children: [_jsx(Eye, { className: "w-3.5 h-3.5 text-cyan-400" }), _jsx("span", { children: "Hide Labels" })] })) : (_jsxs(_Fragment, { children: [_jsx(EyeOff, { className: "w-3.5 h-3.5 text-slate-400" }), _jsx("span", { children: "Show Labels" })] })) }), _jsxs("button", { onClick: () => dispatch(setShowDimensionsModal(true)), title: "Open Complete 3D Kinematics Dimension Specs", className: "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold shadow-sm transition-all cursor-pointer bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40", children: [_jsx(Ruler, { className: "w-3.5 h-3.5 text-emerald-400" }), _jsx("span", { children: "Dimensions & Specs" })] })] }), showPartLabels && (_jsxs("div", { className: "pointer-events-none absolute inset-0 overflow-hidden z-10", children: [_jsx("div", { className: "absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto", children: _jsxs("button", { onClick: () => dispatch(setShowPartLabels(false)), className: "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border shadow-md transition-colors bg-slate-950/80 hover:bg-slate-900 text-slate-200 border-cyan-500/30 hover:border-cyan-400 cursor-pointer", children: [_jsx(Tag, { className: "w-3 h-3 text-cyan-400" }), _jsx("span", { children: "Dimension Labels Active" }), _jsx("span", { className: "text-slate-400 hover:text-white ml-1 font-bold", children: "\u2715 Hide" })] }) }), projectedTags.filter(t => t.visible).map(tag => (_jsxs("div", { style: {
                            left: `${tag.screenX}px`,
                            top: `${tag.screenY}px`,
                            transform: 'translate(-50%, -120%)'
                        }, onClick: () => dispatch(setShowDimensionsModal(true)), className: "pointer-events-auto absolute flex flex-col items-center group cursor-pointer transition-transform hover:scale-105", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-white/50 shadow-sm mb-1 animate-pulse" }), _jsxs("div", { className: `px-2.5 py-1 rounded-lg backdrop-blur-md border shadow-lg text-[10px] font-mono whitespace-nowrap transition-colors ${isDark
                                    ? 'bg-slate-950/90 border-cyan-500/30 text-slate-200 group-hover:border-cyan-400'
                                    : 'bg-white/95 border-cyan-400 text-slate-800 shadow-md group-hover:border-cyan-600'}`, children: [_jsx("div", { className: "flex items-center gap-1.5 font-bold text-cyan-600 dark:text-cyan-400", children: _jsx("span", { children: tag.name }) }), _jsx("div", { className: "text-[9px] text-slate-500 dark:text-slate-300 font-semibold", children: tag.dim })] })] }, tag.id)))] }))] }));
};
