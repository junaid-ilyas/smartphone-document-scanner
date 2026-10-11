import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSelectedCadPart } from '../../store/scannerSlice';
import { CAD_PARTS, createPartGeometry } from '../../utils/cadModels';
import { exportToBinaryStl, exportToWavefrontObj } from '../../utils/stlExporter';
import { buildUnifiedAssembly, ASSEMBLY_PARTS_INFO } from '../../utils/assemblyModel';
import { Download, RotateCw, Box, Layers, Clock, Weight, Check, Wrench, Navigation, Compass, Sliders, Info, ChevronLeft, ChevronRight, Crosshair, Grid } from 'lucide-react';
export const CadViewer = () => {
    const dispatch = useAppDispatch();
    const { selectedCadPart, parametricSettings, theme } = useAppSelector((state) => state.scanner);
    const isDark = theme === 'dark';
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const currentMeshGroupRef = useRef(null);
    const trajectoryLinesRef = useRef(null);
    const socketIndicatorsRef = useRef(null);
    // Modes: Unified Full Assembly vs Individual CAD Parts
    const [viewMode, setViewMode] = useState('assembly');
    const [assemblyExploded, setAssemblyExploded] = useState(0); // 0.0 (assembled) to 1.0 (exploded)
    const [selectedAssemblyPartId, setSelectedAssemblyPartId] = useState('servo_mount');
    // Un-cluster controls:
    const [ghostNonSelected, setGhostNonSelected] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [trajectoryMode, setTrajectoryMode] = useState('selected');
    const [stepLimit, setStepLimit] = useState(null); // null = all steps shown
    const [showFloorGrid, setShowFloorGrid] = useState(false);
    const floorGridRef = useRef(null);
    const [isWireframe, setIsWireframe] = useState(false);
    const [isAutoRotating, setIsAutoRotating] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(null);
    // Orbit state with generous framing to prevent crowding/clustering
    const orbitRef = useRef({
        isDragging: false,
        prevX: 0,
        prevY: 0,
        panX: 0,
        panY: 0,
        rotX: 0.38,
        rotY: -0.65,
        distance: 58,
        targetDistance: 58,
    });
    const partDef = CAD_PARTS[selectedCadPart];
    const selectedPartInfo = ASSEMBLY_PARTS_INFO.find(p => p.id === selectedAssemblyPartId) || ASSEMBLY_PARTS_INFO[0];
    // Camera preset handler
    const setCameraView = useCallback((preset) => {
        const orbit = orbitRef.current;
        orbit.panX = 0;
        orbit.panY = 0;
        switch (preset) {
            case 'top':
                orbit.rotX = 1.54;
                orbit.rotY = 0;
                orbit.targetDistance = 58;
                break;
            case 'front':
                orbit.rotX = 0.08;
                orbit.rotY = 0;
                orbit.targetDistance = 60;
                break;
            case 'side':
                orbit.rotX = 0.08;
                orbit.rotY = -Math.PI / 2;
                orbit.targetDistance = 60;
                break;
            case 'reset':
            case 'iso':
            default:
                orbit.rotX = 0.42;
                orbit.rotY = -0.68;
                orbit.targetDistance = 58;
                break;
        }
    }, []);
    // Initialize Three.js scene
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas)
            return;
        canvas.style.touchAction = 'none';
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(isDark ? 0x090e17 : 0xf8fafc);
        const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 800);
        cameraRef.current = camera;
        camera.position.set(32, 28, 48);
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
        // High quality balanced studio lighting
        const amb = new THREE.AmbientLight(0xffffff, isDark ? 0.95 : 1.15);
        scene.add(amb);
        const key = new THREE.DirectionalLight(0xfff8ee, isDark ? 1.5 : 1.6);
        key.position.set(30, 45, 35);
        key.castShadow = true;
        key.shadow.mapSize.width = 1024;
        key.shadow.mapSize.height = 1024;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x38bdf8, isDark ? 0.65 : 0.5);
        fill.position.set(-35, 20, -25);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0x818cf8, isDark ? 0.45 : 0.3);
        rim.position.set(0, -10, -40);
        scene.add(rim);
        // Subtle Ground Reference Grid - positioned well below the machine to prevent intersecting
        const floorGrid = new THREE.GridHelper(90, 45, isDark ? 0x1e293b : 0xcbd5e1, isDark ? 0x0f172a : 0xf1f5f9);
        floorGrid.position.y = -18;
        floorGrid.visible = false;
        scene.add(floorGrid);
        floorGridRef.current = floorGrid;
        // Orbit Drag Handlers
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
            orbitRef.current.rotY += dx * 0.008;
            orbitRef.current.rotX += dy * 0.008;
            orbitRef.current.rotX = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, orbitRef.current.rotX));
        };
        const onMouseUp = () => {
            orbitRef.current.isDragging = false;
        };
        let lastTouchDistance = 0;
        let lastTouchCenterX = 0;
        let lastTouchCenterY = 0;
        const onTouchStart = (e) => {
            orbitRef.current.isDragging = true;
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
                orbitRef.current.rotY += dx * 0.008;
                orbitRef.current.rotX += dy * 0.008;
                orbitRef.current.rotX = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, orbitRef.current.rotX));
            }
            else if (e.touches.length >= 2) {
                const first = e.touches[0];
                const second = e.touches[1];
                const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
                const centerX = (first.clientX + second.clientX) / 2;
                const centerY = (first.clientY + second.clientY) / 2;
                if (lastTouchDistance > 0) {
                    orbitRef.current.targetDistance -= (distance - lastTouchDistance) * 0.08;
                    orbitRef.current.targetDistance = Math.max(16, Math.min(120, orbitRef.current.targetDistance));
                    orbitRef.current.panX -= (centerX - lastTouchCenterX) * 0.035;
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
            orbitRef.current.targetDistance += e.deltaY * 0.045;
            orbitRef.current.targetDistance = Math.max(16, Math.min(120, orbitRef.current.targetDistance));
        };
        // Raycast click to select assembly part
        const onClick = (e) => {
            if (!containerRef.current || !cameraRef.current || !currentMeshGroupRef.current)
                return;
            const rect = containerRef.current.getBoundingClientRect();
            const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(currentMeshGroupRef.current.children, true);
            if (intersects.length > 0) {
                let hitObj = intersects[0].object;
                while (hitObj && hitObj !== currentMeshGroupRef.current) {
                    if (hitObj.userData && hitObj.userData.partId) {
                        setSelectedAssemblyPartId(hitObj.userData.partId);
                        break;
                    }
                    hitObj = hitObj.parent;
                }
            }
        };
        const dom = container;
        dom.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        dom.addEventListener('wheel', onWheel, { passive: false });
        dom.addEventListener('click', onClick);
        dom.addEventListener('touchstart', onTouchStart, { passive: true });
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
        let animId;
        const animate = () => {
            animId = requestAnimationFrame(animate);
            const orbit = orbitRef.current;
            if (isAutoRotating && !orbit.isDragging) {
                orbit.rotY += 0.0035;
            }
            orbit.distance += (orbit.targetDistance - orbit.distance) * 0.1;
            camera.position.x = orbit.panX + orbit.distance * Math.sin(orbit.rotY) * Math.cos(orbit.rotX);
            camera.position.y = orbit.panY + orbit.distance * Math.sin(orbit.rotX);
            camera.position.z = orbit.distance * Math.cos(orbit.rotY) * Math.cos(orbit.rotX);
            camera.lookAt(orbit.panX, orbit.panY, 0);
            renderer.render(scene, camera);
        };
        animate();
        return () => {
            cancelAnimationFrame(animId);
            dom.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            dom.removeEventListener('wheel', onWheel);
            dom.removeEventListener('click', onClick);
            dom.removeEventListener('touchstart', onTouchStart);
            dom.removeEventListener('touchmove', onTouchMove);
            dom.removeEventListener('touchend', onTouchEnd);
            dom.removeEventListener('touchcancel', onTouchEnd);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, [isAutoRotating, isDark]);
    // Re-build 3D Meshes whenever mode, explosion slider, selection, or parameters change
    useEffect(() => {
        if (!sceneRef.current)
            return;
        // Remove existing meshes, trajectory lines & sockets
        if (currentMeshGroupRef.current) {
            sceneRef.current.remove(currentMeshGroupRef.current);
        }
        if (trajectoryLinesRef.current) {
            sceneRef.current.remove(trajectoryLinesRef.current);
        }
        if (socketIndicatorsRef.current) {
            sceneRef.current.remove(socketIndicatorsRef.current);
        }
        if (viewMode === 'assembly') {
            // Build Clean Unified Assembly
            const { rootGroup, trajectoryLinesGroup, socketIndicatorsGroup } = buildUnifiedAssembly(parametricSettings, assemblyExploded, selectedAssemblyPartId, isDark, {
                ghostNonSelected,
                activeCategory,
                showAllTrajectories: trajectoryMode === 'all',
                stepLimit
            });
            // Stable vertical centering offset so model does NOT jerk/jump while sliding
            const FIXED_Y_OFFSET = -8.0;
            rootGroup.position.set(0, FIXED_Y_OFFSET, 0);
            trajectoryLinesGroup.position.set(0, FIXED_Y_OFFSET, 0);
            socketIndicatorsGroup.position.set(0, FIXED_Y_OFFSET, 0);
            if (floorGridRef.current) {
                floorGridRef.current.position.y = FIXED_Y_OFFSET - 2.5;
                floorGridRef.current.visible = showFloorGrid;
            }
            // Apply wireframe if active
            if (isWireframe) {
                rootGroup.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((m) => { if ('wireframe' in m)
                                m.wireframe = true; });
                        }
                        else if ('wireframe' in child.material) {
                            child.material.wireframe = true;
                        }
                    }
                });
            }
            sceneRef.current.add(rootGroup);
            currentMeshGroupRef.current = rootGroup;
            if (trajectoryMode !== 'off') {
                sceneRef.current.add(trajectoryLinesGroup);
                trajectoryLinesRef.current = trajectoryLinesGroup;
            }
            // Add socket indicator beacons
            sceneRef.current.add(socketIndicatorsGroup);
            socketIndicatorsRef.current = socketIndicatorsGroup;
        }
        else {
            // Single Part Mode
            const group = createPartGeometry(selectedCadPart, parametricSettings);
            const box = new THREE.Box3().setFromObject(group);
            const center = box.getCenter(new THREE.Vector3());
            group.position.sub(center);
            if (floorGridRef.current) {
                floorGridRef.current.position.y = box.min.y - center.y - 0.5;
                floorGridRef.current.visible = showFloorGrid;
            }
            if (isWireframe) {
                group.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((m) => { if ('wireframe' in m)
                                m.wireframe = true; });
                        }
                        else if ('wireframe' in child.material) {
                            child.material.wireframe = true;
                        }
                    }
                });
            }
            sceneRef.current.add(group);
            currentMeshGroupRef.current = group;
        }
    }, [
        viewMode,
        selectedCadPart,
        assemblyExploded,
        selectedAssemblyPartId,
        parametricSettings,
        isWireframe,
        trajectoryMode,
        ghostNonSelected,
        activeCategory,
        stepLimit,
        showFloorGrid,
        isDark
    ]);
    // Export handlers
    const handleExportUnifiedObj = () => {
        if (!currentMeshGroupRef.current)
            return;
        exportToWavefrontObj(currentMeshGroupRef.current, 'diy_scanner_unified_assembly.obj');
        setDownloadSuccess('OBJ');
        setTimeout(() => setDownloadSuccess(null), 3000);
    };
    const handleExportUnifiedStl = () => {
        if (!currentMeshGroupRef.current)
            return;
        exportToBinaryStl(currentMeshGroupRef.current, 'diy_scanner_unified_assembly.stl');
        setDownloadSuccess('STL');
        setTimeout(() => setDownloadSuccess(null), 3000);
    };
    const handleExportSingleStl = () => {
        if (!currentMeshGroupRef.current)
            return;
        exportToBinaryStl(currentMeshGroupRef.current, `${selectedCadPart}.stl`);
        setDownloadSuccess(selectedCadPart);
        setTimeout(() => setDownloadSuccess(null), 3000);
    };
    const partTabs = [
        { id: 'chassis_base', name: 'Platen Base' },
        { id: 'bearing_pillow_cap', name: 'Bearing Cap' },
        { id: 'feed_hopper', name: 'Feed Hopper' },
        { id: 'cantilever_arm', name: 'Gantry Column' },
        { id: 'phone_mount', name: 'Phone Cradle' },
        { id: 'roller_spindle', name: 'Roller Spindle' },
        { id: 'servo_mount', name: 'Servo Mount' },
        { id: 'hopper_hinge', name: 'Hopper Hinge' },
        { id: 'swivel_knuckle', name: 'Swivel Knuckle' },
        { id: 'motor_mount_bracket', name: 'Motor Bracket' },
        { id: 'pickup_linkage', name: 'Pick-Up Arm' },
        { id: 'cable_strain_relief_clip', name: 'Cable Clip' },
    ];
    const categories = [
        { id: 'ALL', label: 'All Components', count: 12 },
        { id: 'Structural Base', label: 'Base & Bed', count: 1 },
        { id: 'Powertrain & Rollers', label: 'Drive & Rollers', count: 3 },
        { id: 'ADF & Actuation', label: 'ADF & Hopper', count: 4 },
        { id: 'Optics & Gantry', label: 'Optics & Gantry', count: 4 },
    ];
    return (_jsxs("div", { className: `flex-1 flex flex-col lg:flex-row h-full overflow-hidden transition-colors duration-200 ${isDark ? 'bg-[#0B0F17]' : 'bg-slate-50'}`, children: [_jsxs("div", { className: `flex-1 flex flex-col min-h-[420px] relative border-b lg:border-b-0 lg:border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`, children: [_jsxs("div", { className: `flex items-center justify-between p-2.5 border-b gap-3 flex-wrap ${isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white border-slate-200 shadow-2xs'}`, children: [_jsxs("div", { className: "flex items-center gap-1.5 p-1 rounded-lg bg-slate-800/50 dark:bg-slate-950/60 border border-white/10", children: [_jsxs("button", { onClick: () => setViewMode('assembly'), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === 'assembly'
                                            ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`, children: [_jsx(Layers, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Unified Assembly (.OBJ / Exploded)" })] }), _jsxs("button", { onClick: () => setViewMode('single_part'), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === 'single_part'
                                            ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`, children: [_jsx(Box, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Individual CAD Parts (13)" })] })] }), viewMode === 'assembly' && (_jsx("div", { className: "flex items-center gap-1 overflow-x-auto py-0.5", children: categories.map((cat) => (_jsxs("button", { onClick: () => setActiveCategory(cat.id), className: `px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors border cursor-pointer ${activeCategory === cat.id
                                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-2xs'
                                        : isDark
                                            ? 'text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
                                            : 'text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'}`, children: [cat.label, " (", cat.count, ")"] }, cat.id))) }))] }), viewMode === 'single_part' && (_jsx("div", { className: `flex items-center gap-1.5 p-2.5 border-b overflow-x-auto ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-100 border-slate-200'}`, children: partTabs.map((tab) => (_jsx("button", { onClick: () => dispatch(setSelectedCadPart(tab.id)), className: `px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${selectedCadPart === tab.id
                                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-2xs'
                                : isDark
                                    ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-transparent'}`, children: tab.name }, tab.id))) })), _jsxs("div", { ref: containerRef, className: "flex-1 w-full h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden", children: [_jsx("canvas", { ref: canvasRef, className: "w-full h-full block" }), _jsx("div", { className: "absolute top-4 left-4 flex items-center gap-1.5 z-10", children: _jsxs("div", { className: `p-1 rounded-lg backdrop-blur-md border flex items-center gap-1 shadow-md ${isDark ? 'bg-slate-950/80 border-white/10 text-slate-300' : 'bg-white/90 border-slate-300 text-slate-700'}`, children: [_jsx("button", { onClick: () => setCameraView('iso'), title: "Isometric 3D Perspective", className: "px-2 py-1 rounded text-[11px] font-semibold hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer", children: "Iso 3D" }), _jsx("button", { onClick: () => setCameraView('top'), title: "Top Plan View", className: "px-2 py-1 rounded text-[11px] font-semibold hover:bg-cyan-500 hover:text-slate-950 transition-colors cursor-pointer", children: "Top" }), _jsx("button", { onClick: () => setCameraView('front'), title: "Front Elevation View", className: "px-2 py-1 rounded text-[11px] font-semibold hover:bg-cyan-500 hover:text-slate-950 transition-colors cursor-pointer", children: "Front" }), _jsx("button", { onClick: () => setCameraView('side'), title: "Side Profile View", className: "px-2 py-1 rounded text-[11px] font-semibold hover:bg-cyan-500 hover:text-slate-950 transition-colors cursor-pointer", children: "Side" }), _jsx("button", { onClick: () => setCameraView('reset'), title: "Reset Camera Framing", className: "px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer", children: "Reset" })] }) }), _jsxs("div", { className: "absolute top-4 right-4 flex items-center gap-2 z-10 flex-wrap justify-end", children: [viewMode === 'assembly' && (_jsxs("button", { onClick: () => setGhostNonSelected(!ghostNonSelected), title: ghostNonSelected ? "Show All Parts Solid" : "Ghost / X-Ray Non-Selected Parts", className: `px-3 py-1.5 rounded-md border text-xs flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer ${ghostNonSelected
                                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: [_jsx(Crosshair, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["Focus Part: ", ghostNonSelected ? 'ON' : 'OFF'] })] })), viewMode === 'assembly' && (_jsxs("button", { onClick: () => {
                                            if (assemblyExploded > 0.05) {
                                                setAssemblyExploded(0);
                                            }
                                            else {
                                                setAssemblyExploded(0.5);
                                            }
                                        }, title: "Toggle Exploded Assembly Breakdown", className: `px-3 py-1.5 rounded-md border text-xs flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer ${assemblyExploded > 0.05
                                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: [_jsx(Layers, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["Exploded View: ", assemblyExploded > 0.05 ? 'ON' : 'OFF'] })] })), viewMode === 'assembly' && (_jsxs("button", { onClick: () => {
                                            if (trajectoryMode === 'selected')
                                                setTrajectoryMode('all');
                                            else if (trajectoryMode === 'all')
                                                setTrajectoryMode('off');
                                            else
                                                setTrajectoryMode('selected');
                                        }, title: "Cycle Trajectory Guide Lines: Selected Only -> All Lines -> Off", className: `px-2.5 py-1.5 rounded-md border text-xs flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer ${trajectoryMode !== 'off'
                                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 font-semibold'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-600 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: [_jsx(Navigation, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["Guide Lines: ", trajectoryMode === 'selected' ? 'Focus' : trajectoryMode === 'all' ? 'All' : 'Off'] })] })), _jsx("button", { onClick: () => {
                                            const next = !showFloorGrid;
                                            setShowFloorGrid(next);
                                            if (floorGridRef.current)
                                                floorGridRef.current.visible = next;
                                        }, title: "Toggle Ground Datum Grid", className: `p-2 rounded-md border text-xs flex items-center backdrop-blur-md transition-colors cursor-pointer ${showFloorGrid
                                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-semibold'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-400 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-600 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: _jsx(Grid, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => setIsWireframe(!isWireframe), className: `p-2 rounded-md border text-xs flex items-center backdrop-blur-md transition-colors cursor-pointer ${isWireframe
                                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 font-semibold'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: _jsx(Box, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => setIsAutoRotating(!isAutoRotating), className: `p-2 rounded-md border text-xs flex items-center backdrop-blur-md transition-colors cursor-pointer ${isAutoRotating
                                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 font-semibold'
                                            : isDark
                                                ? 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
                                                : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-100 shadow-xs'}`, children: _jsx(RotateCw, { className: "w-3.5 h-3.5" }) })] }), viewMode === 'assembly' && (_jsx("div", { className: "absolute bottom-4 left-4 right-4 max-w-xl mx-auto z-10 pointer-events-auto", children: _jsxs("div", { className: `p-3.5 rounded-xl backdrop-blur-md border shadow-xl flex flex-col gap-2.5 ${isDark ? 'bg-slate-950/90 border-white/15 text-slate-200' : 'bg-white/95 border-slate-300 text-slate-800'}`, children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-semibold", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-amber-500 dark:text-amber-400", children: [_jsx(Sliders, { className: "w-4 h-4" }), _jsx("span", { children: "Explode / Separate Assembly Slider" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm", children: [Math.round(assemblyExploded * 100), "%"] }), _jsx("span", { className: "text-[10px] text-slate-400", children: assemblyExploded === 0 ? '(Assembled)' : assemblyExploded >= 0.9 ? '(Full Separation)' : '(Exploded)' })] })] }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.01, value: assemblyExploded, onChange: (e) => setAssemblyExploded(parseFloat(e.target.value)), className: "w-full accent-amber-500 h-2 bg-slate-300 dark:bg-slate-700 rounded-lg cursor-pointer" }), _jsxs("div", { className: "flex items-center justify-between gap-1 text-[10px] flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setAssemblyExploded(0), className: `px-2 py-1 rounded border transition-colors cursor-pointer ${assemblyExploded === 0
                                                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                                                                : isDark ? 'border-white/10 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: "0% Assembled" }), _jsx("button", { onClick: () => setAssemblyExploded(0.25), className: `px-2 py-1 rounded border transition-colors cursor-pointer ${assemblyExploded >= 0.23 && assemblyExploded <= 0.27
                                                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                                                                : isDark ? 'border-white/10 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: "25% Fasteners" }), _jsx("button", { onClick: () => setAssemblyExploded(0.5), className: `px-2 py-1 rounded border transition-colors cursor-pointer ${assemblyExploded >= 0.48 && assemblyExploded <= 0.52
                                                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                                                                : isDark ? 'border-white/10 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: "50% Subassemblies" }), _jsx("button", { onClick: () => setAssemblyExploded(1.0), className: `px-2 py-1 rounded border transition-colors cursor-pointer ${assemblyExploded >= 0.98
                                                                ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                                                                : isDark ? 'border-white/10 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: "100% Full Breakdown" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-slate-400", children: "Step:" }), _jsx("button", { onClick: () => {
                                                                const cur = stepLimit ?? 12;
                                                                setStepLimit(Math.max(1, cur - 1));
                                                            }, disabled: stepLimit === 1, className: "p-1 rounded border border-white/10 hover:bg-slate-800 disabled:opacity-30 cursor-pointer", children: _jsx(ChevronLeft, { className: "w-3 h-3" }) }), _jsx("span", { className: "font-mono text-cyan-400 font-bold", children: stepLimit === null ? 'All (12)' : `${stepLimit}/12` }), _jsx("button", { onClick: () => {
                                                                if (stepLimit === null)
                                                                    return;
                                                                if (stepLimit >= 12)
                                                                    setStepLimit(null);
                                                                else
                                                                    setStepLimit(stepLimit + 1);
                                                            }, className: "p-1 rounded border border-white/10 hover:bg-slate-800 cursor-pointer", children: _jsx(ChevronRight, { className: "w-3 h-3" }) }), stepLimit !== null && (_jsx("button", { onClick: () => setStepLimit(null), className: "text-[9px] text-amber-400 hover:underline cursor-pointer", children: "Reset" }))] })] })] }) })), viewMode === 'single_part' && (_jsx("div", { className: "absolute bottom-4 left-4 z-10", children: _jsx("button", { onClick: handleExportSingleStl, className: "flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer", children: downloadSuccess === selectedCadPart ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 text-emerald-950 stroke-[3]" }), _jsx("span", { children: "STL Downloaded!" })] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "w-4 h-4 text-slate-950" }), _jsxs("span", { children: ["Export ", partDef.name, " (Binary .STL)"] })] })) }) }))] })] }), _jsx("div", { className: `w-full lg:w-[410px] p-5 overflow-y-auto flex flex-col gap-5 border-l transition-colors duration-200 ${isDark ? 'bg-[#0e1626] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`, children: viewMode === 'assembly' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: `p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-slate-900/90 border-amber-500/30' : 'bg-amber-500/10 border-amber-500/40'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5", children: [_jsx(Download, { className: "w-4 h-4" }), "Unified 3D Assembly Exporter"] }), _jsx("span", { className: "text-[10px] font-mono text-slate-500", children: "All 12 Parts" })] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 leading-relaxed", children: "Download the complete multi-body scanner assembly. Wavefront .OBJ preserves separate named mesh groups for Blender, Fusion 360, and FreeCAD." }), _jsxs("div", { className: "grid grid-cols-2 gap-2 pt-1", children: [_jsx("button", { onClick: handleExportUnifiedObj, className: "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer", children: downloadSuccess === 'OBJ' ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 stroke-[3]" }), _jsx("span", { children: "OBJ Downloaded!" })] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { children: "Export Unified (.OBJ)" })] })) }), _jsx("button", { onClick: handleExportUnifiedStl, className: "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10 font-bold text-xs transition-all cursor-pointer", children: downloadSuccess === 'STL' ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 text-emerald-400 stroke-[3]" }), _jsx("span", { children: "STL Downloaded!" })] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "w-4 h-4" }), _jsx("span", { children: "Export Unified (.STL)" })] })) })] })] }), _jsxs("div", { className: `p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-slate-900/80 border-cyan-500/30' : 'bg-slate-50 border-slate-300'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/40", children: ["Step ", selectedPartInfo.stepNumber, " of 12"] }), _jsx("span", { className: "text-[10px] font-mono text-slate-500", children: selectedPartInfo.category })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5", children: _jsx("span", { children: selectedPartInfo.name }) }), _jsxs("span", { className: "text-xs font-mono text-slate-500 dark:text-slate-400", children: ["Dimensions: ", selectedPartInfo.dimensionsMm] })] }), _jsxs("div", { className: `p-2.5 rounded-lg border flex flex-col gap-1 text-xs ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsxs("span", { className: "text-[10px] uppercase font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1", children: [_jsx(Compass, { className: "w-3.5 h-3.5" }), " Where It Goes (Mounting Socket):"] }), _jsx("span", { className: "font-semibold text-slate-800 dark:text-slate-200 leading-snug", children: selectedPartInfo.mountsTo })] }), _jsxs("div", { className: `p-2.5 rounded-lg border flex flex-col gap-1 text-xs ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsxs("span", { className: "text-[10px] uppercase font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1", children: [_jsx(Wrench, { className: "w-3.5 h-3.5" }), " Fasteners & Hardware Needed:"] }), _jsx("span", { className: "text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-snug", children: selectedPartInfo.hardware })] }), _jsxs("div", { className: `p-2.5 rounded-lg border flex flex-col gap-1 text-xs ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsxs("span", { className: "text-[10px] uppercase font-bold text-cyan-500 dark:text-cyan-400 flex items-center gap-1", children: [_jsx(Info, { className: "w-3.5 h-3.5" }), " Step-by-Step Directions:"] }), _jsx("p", { className: "text-slate-600 dark:text-slate-300 leading-relaxed text-xs", children: selectedPartInfo.assemblyInstructions })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5", children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-amber-500" }), "Assembly Sequence (Click to locate)"] }), _jsx("span", { className: "text-[10px] text-slate-400", children: "12 Parts" })] }), _jsx("div", { className: "flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1", children: ASSEMBLY_PARTS_INFO.map((item) => (_jsxs("button", { onClick: () => {
                                            setSelectedAssemblyPartId(item.id);
                                            if (stepLimit !== null && item.stepNumber > stepLimit) {
                                                setStepLimit(item.stepNumber);
                                            }
                                        }, className: `w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${selectedAssemblyPartId === item.id
                                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold shadow-xs'
                                            : isDark
                                                ? 'bg-slate-900/50 border-white/5 text-slate-300 hover:bg-slate-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedAssemblyPartId === item.id
                                                            ? 'bg-amber-500 text-slate-950'
                                                            : 'bg-slate-700 text-slate-300'}`, children: item.stepNumber }), _jsx("span", { children: item.name })] }), _jsx("span", { className: "text-[10px] font-mono text-slate-400", children: item.category.split(' ')[0] })] }, item.id))) })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("span", { className: "text-[11px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-semibold", children: [partDef.category, " Component"] }), _jsx("h2", { className: `text-base font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`, children: partDef.name }), _jsx("p", { className: `text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`, children: partDef.description })] }), _jsxs("div", { className: `p-3.5 rounded-lg border flex flex-col gap-2.5 ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200 shadow-2xs'}`, children: [_jsxs("span", { className: `text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`, children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-amber-500" }), "3D Slicing & Print Profile"] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsxs("div", { className: `p-2 rounded border flex flex-col ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsxs("span", { className: "text-slate-500 text-[10px] flex items-center gap-1", children: [_jsx(Clock, { className: "w-3 h-3 text-cyan-500" }), " Print Time"] }), _jsxs("span", { className: `font-mono mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`, children: ["~", partDef.estimatedPrintTimeHours, " hours"] })] }), _jsxs("div", { className: `p-2 rounded border flex flex-col ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsxs("span", { className: "text-slate-500 text-[10px] flex items-center gap-1", children: [_jsx(Weight, { className: "w-3 h-3 text-amber-500" }), " Material"] }), _jsxs("span", { className: `font-mono mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`, children: [partDef.filamentWeightGrams, "g PLA/PETG"] })] }), _jsxs("div", { className: `p-2 rounded border flex flex-col ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsx("span", { className: "text-slate-500 text-[10px]", children: "Infill Pattern" }), _jsx("span", { className: `font-mono mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`, children: partDef.recommendedInfill })] }), _jsxs("div", { className: `p-2 rounded border flex flex-col ${isDark ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'}`, children: [_jsx("span", { className: "text-slate-500 text-[10px]", children: "Layer Height" }), _jsx("span", { className: `font-mono mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800 font-semibold'}`, children: partDef.recommendedLayerHeight })] })] })] }), _jsxs("div", { className: `p-3.5 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200'}`, children: [_jsxs("span", { className: `text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`, children: [_jsx(Wrench, { className: "w-3.5 h-3.5 text-cyan-500" }), "Required Fasteners & Hardware"] }), _jsx("ul", { className: "flex flex-col gap-1 text-xs", children: partDef.hardwareRequirements.map((req, i) => (_jsxs("li", { className: "flex items-center gap-1.5 text-slate-400 font-mono text-[11px]", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-cyan-400" }), _jsx("span", { children: req })] }, i))) })] })] })) })] }));
};
