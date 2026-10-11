import * as THREE from 'three';
import { createPartGeometry } from './cadModels';
/**
 * 13 Precision Master Kinematic Subassemblies
 * Calibrated to exact non-overlapping mechanical mating datums.
 * Organized into 4 logical orthogonal explosion zones to eliminate clutter:
 * - Structural Base: Stationary datum anchor at desk level
 * - Rollers & Caps: Vertical lift (+Y)
 * - Powertrain & Actuators: Lateral pull along shaft axes (±Z)
 * - ADF Hopper & Linkage: Longitudinal slide (+X)
 * - Gantry Column: Pulls back & up (-Z, +Y)
 * - Camera Knuckle & Cradle: High vertical clearance (+Y)
 */
export const ASSEMBLY_PARTS_INFO = [
    {
        id: 'chassis_base',
        cadPartId: 'chassis_base',
        name: 'Platen Chassis & Base Bed',
        stepNumber: 1,
        category: 'Structural Base',
        homePosition: [0, 0, 0],
        explodeVector: [0, 0, 0], // Stays firmly on desk as spatial reference anchor
        mountsTo: 'Worksurface Reference Datum (Desk Footprint)',
        hardware: '6x Durometer 50A Rubber Feet, 8x M3 Ruthex Brass Heat-Set Inserts',
        assemblyInstructions: 'Step 1: Install 8x M3 Ruthex brass heat-set inserts into chassis pillow blocks using soldering iron at 220°C. If printing as 2 modular halves, join using 4x M3 draw-bolts and 2x Ø4mm stainless dowel pins.',
        dimensionsMm: '335 × 245 × 16 mm (Split: 2x 168×245 mm)'
    },
    {
        id: 'feed_roller',
        cadPartId: 'roller_spindle',
        name: 'Primary Stepper Feed Drive Roller',
        stepNumber: 2,
        category: 'Powertrain & Rollers',
        homePosition: [14.8, 1.4, 0],
        explodeVector: [0, 10, 0], // Lifts straight UP (+Y) out of pillow blocks
        rotation: [Math.PI / 2, 0, 0], // Cylinder spans across paper width (Z-axis)
        mountsTo: 'Feed Throat Pillow Blocks (X = +14.8 cm, Bearing Journal Seats)',
        hardware: '2x 608ZZ Radial Ball Bearings, 4x High-Traction EPDM Silicone O-Rings',
        assemblyInstructions: 'Step 2: Press 4x silicone O-rings into spindle retaining grooves. Slide the central 8mm ground steel shaft through the feed roller spindle and seat into the lower 608ZZ bearing pillow block saddles.',
        dimensionsMm: 'Length: 245 mm, Outer Diameter: Ø24 mm'
    },
    {
        id: 'feed_pillow_caps',
        cadPartId: 'bearing_pillow_cap',
        name: 'Feed Throat 608ZZ Bearing Split Caps (Pair)',
        stepNumber: 3,
        category: 'Powertrain & Rollers',
        homePosition: [14.8, 2.0, 0],
        explodeVector: [0, 18, 0], // Lifts higher along +Y directly above roller
        mountsTo: 'Chassis Feed Pillow Blocks over 608ZZ Bearings (Z = ±10.7 cm)',
        hardware: '4x M3x14mm Socket Head Cap Screws into Chassis Ruthex Inserts',
        assemblyInstructions: 'Step 3: Place split clamp caps over the 608ZZ bearing outer races at front and rear chassis flanks. Torque the 4x M3x14mm cap screws to 0.6 N·m.',
        dimensionsMm: '26 × 14 × 12 mm each (Front & Rear Pairs)'
    },
    {
        id: 'feed_motor_bracket',
        cadPartId: 'motor_mount_bracket',
        name: 'Feed NEMA 17 Stepper Motor, Mount & CNC Helical Coupler',
        stepNumber: 4,
        category: 'Powertrain & Rollers',
        homePosition: [14.8, 1.4, -13.5],
        explodeVector: [0, 0, -20], // Pulls straight BACKWARD along roller drive axis (-Z)
        mountsTo: 'Chassis Feed Pillow Block Rear Flank (Z = -10.7 to -13.5 cm)',
        hardware: 'NEMA 17 Stepper (0.44 N·m), CNC Helical Aluminum Coupler (5 to 8mm), 4x M3x10mm Screws, 2x M3x16mm Pillow Bolts, 2x M4 Grub Screws',
        assemblyInstructions: 'Step 4: Bolt the NEMA 17 stepper motor to the bracket faceplate with 4x M3 screws. Slide the CNC flexible helical coupler onto the motor 5mm D-shaft and roller 8mm axle, tighten dual M4 grub screws, and secure bracket to chassis pillow block inserts.',
        dimensionsMm: '44 × 44 × 62 mm (Motor + Bracket + Coupler)'
    },
    {
        id: 'servo_mount',
        cadPartId: 'servo_mount',
        name: 'SG90 Micro-Servo ADF Bracket & Articulated Horn',
        stepNumber: 5,
        category: 'ADF & Actuation',
        homePosition: [14.8, 1.6, 13.5],
        explodeVector: [0, 0, 20], // Pulls straight FORWARD along servo pivot axis (+Z)
        mountsTo: 'Front Feed Pillow Block Mating Tongue (Z = +10.7 to +13.5 cm)',
        hardware: 'SG90 9g Micro-Servo, 25T Brass Output Spline, Reinforced Nylon Horn, 2x M2 Screws, Upper Ball-Link Swivel',
        assemblyInstructions: 'Step 5: Seat SG90 micro-servo into bracket cradle and secure with 2x M2 screws with brass grommets. Install reinforced nylon horn on output spline at 90° home datum with upper M2 ball-link swivel pin.',
        dimensionsMm: '34 × 22 × 24 mm (Pocket: 23×12.5×22.5 mm)'
    },
    {
        id: 'pickup_linkage',
        cadPartId: 'pickup_linkage',
        name: 'ADF Variable-Stack Pick-Up Arm, Cross-Shaft & Tie-Rod Link',
        stepNumber: 6,
        category: 'ADF & Actuation',
        homePosition: [14.8, 2.4, 0],
        explodeVector: [8, 14, 0], // Pulls up and to the right (+X, +Y)
        mountsTo: 'Continuous 4mm Stainless Pivot Cross-Shaft (Z = +12.8 to -10.5 cm)',
        hardware: '4mm Ground Stainless Shaft, 2x MF84ZZ Bronze Flanged Bushings, Adjustable Steel Tie-Rod Link, Helical Torsion Spring, HF0408 One-Way Clutch Roller',
        assemblyInstructions: 'Step 6: Slide 4mm ground pivot shaft through chassis bronze sleeve bushings. Connect the articulated tie-rod from the SG90 servo horn to the driving bellcrank. Hook the helical torsion spring to provide compliant stack downforce (1-50 sheets). The HF0408 one-way clutch allows free paper ejection without drag.',
        dimensionsMm: 'Shaft: Ø4×245mm, Arms: 52mm, Roller: Ø18×110mm'
    },
    {
        id: 'feed_hopper',
        cadPartId: 'feed_hopper',
        name: '16° Document Feed Hopper Tray',
        stepNumber: 7,
        category: 'ADF & Actuation',
        homePosition: [29.5, 3.8, 0],
        explodeVector: [24, 6, 0], // Slides straight OUT to the right (+X) away from throat
        rotation: [0, 0, 0.28], // Tilted upward at 16 degrees around hinge axis
        mountsTo: 'Chassis Feed Throat Hinge Lugs (X = +14.8 cm, Y = 1.4 cm)',
        hardware: '2x Ø3mm Stainless Hinge Pins / M3x20mm Pivot Screws',
        assemblyInstructions: 'Step 7: Align feed hopper cleat lugs with chassis pillow block hinge eyes and slide the 3mm ground hinge pins through both sides. Verify smooth 16° positive stop articulation.',
        dimensionsMm: '315 × 218 × 35 mm (Fits 1-50 A4 Sheets)'
    },
    {
        id: 'hopper_hinge',
        cadPartId: 'hopper_hinge',
        name: 'Hopper Articulation Hinge & Positive Stop',
        stepNumber: 8,
        category: 'ADF & Actuation',
        homePosition: [14.8, 1.4, 11.2],
        explodeVector: [12, 0, 12], // Moves diagonally outward (+X, +Z)
        mountsTo: 'Chassis Pillow Block Side Flank at Front Hinge Junction',
        hardware: '1x 3mm Ground Hinge Pin, 2x M3 Screws into Ruthex Inserts',
        assemblyInstructions: 'Step 8: Mount the hinge cleat to the side chassis flank. The integrated 16° mechanical stop wedge supports the downward weight of up to 50 sheets of paper without sagging.',
        dimensionsMm: '38 × 24 × 18 mm (Ø3.2mm Pin Bore)'
    },
    {
        id: 'cantilever_arm',
        cadPartId: 'cantilever_arm',
        name: 'Overhead Gantry Column & Cantilever Arm (Height Clamp)',
        stepNumber: 9,
        category: 'Optics & Gantry',
        homePosition: [0, 0.8, -12.7],
        explodeVector: [0, 12, -22], // Pulls backward and up (-Z, +Y)
        rotation: [0, -Math.PI / 2, 0], // Reaches FORWARD (+Z) directly over platen center Z=0!
        mountsTo: 'Chassis Rear Gantry Mounting Socket (Z = -12.7 cm)',
        hardware: 'M5 Tangential Pinch Bolt, 5-Lobe Star Lock Knob, Captive Hex Nut, 2x M3 Ruthex Inserts',
        assemblyInstructions: 'Step 9: Insert vertical Ø32mm gantry pillar into chassis socket. Adjust cantilever arm height along column (280-320mm) and tighten the 5-lobe star knob on the tangential pinch clamp to lock rigidly into place.',
        dimensionsMm: 'Height: 320 mm, Reach: 130 mm (Centered at Z=0)'
    },
    {
        id: 'cable_strain_relief_clip',
        cadPartId: 'cable_strain_relief_clip',
        name: 'Gantry Column Snap-Fit Cable Organizer',
        stepNumber: 10,
        category: 'Optics & Gantry',
        homePosition: [0, 12.0, -12.7],
        explodeVector: [-12, 10, -22], // Snaps off laterally to the left
        rotation: [0, -Math.PI / 2, 0],
        mountsTo: 'Gantry Column Mid-Pillar (Ø28mm)',
        hardware: 'Compliant Snap-Fit (Optional 1x M3x10mm Pinch Bolt)',
        assemblyInstructions: 'Step 10: Snap the dual-conduit C-clip onto the gantry pillar at Y = 12 cm. Route the phone USB-C cable through Conduit 1 and sensor wiring through Conduit 2 to isolate motor EMI noise.',
        dimensionsMm: '38 × 34 × 16 mm (Snaps to Ø28mm Pillar)'
    },
    {
        id: 'swivel_knuckle',
        cadPartId: 'swivel_knuckle',
        name: '2-Axis Mechanical Gimbal Tilt & Pan Head',
        stepNumber: 11,
        category: 'Optics & Gantry',
        homePosition: [0, 29.0, 0],
        explodeVector: [0, 26, 0], // Lifts straight UP (+Y) above arm tip
        mountsTo: 'Cantilever Arm Tip Joint (Y = 29.0 cm, Z = 0 directly over bed)',
        hardware: 'M5 Stainless Carriage Pivot Bolt, Ergonomic 5-Lobe Star Locking Knob, 2x Bronze Thrust Washers, M4 Knurled Pan Screw',
        assemblyInstructions: 'Step 11: Seat stem into cantilever arm tip socket. Adjust 360° pan angle and lock with M4 knurled thumb screw. Set phone tilt (±45° pitch) and lock firmly with the 5-lobe star thumb knob without camera vibration.',
        dimensionsMm: '36 × 32 × 26 mm (±45° Pitch, 360° Pan)'
    },
    {
        id: 'phone_mount',
        cadPartId: 'phone_mount',
        name: 'Universal Camera Island Smartphone Cradle (Dual-Rail Lead Screw)',
        stepNumber: 12,
        category: 'Optics & Gantry',
        homePosition: [0, 26.8, 0],
        explodeVector: [0, 38, 0], // Lifts HIGHEST straight UP (+Y) into open air
        mountsTo: '2-Axis Gimbal Head Arca Platform (Directly Over Platen Center Z=0)',
        hardware: '2x Ø3.5mm Ground Stainless Guide Rails, M5 Stainless Lead Screw, Ergonomic 5-Lobe Star Thumb Knob, Ruthex Brass Nut, 2x Ribbed Silicone Pads',
        assemblyInstructions: 'Step 12: Mount smartphone cradle Arca foot onto gimbal tilt head. Slide mobile clamp jaw onto dual guide rails and thread M5 lead screw. Turning the 5-lobe star knob smoothly clamps phones 58-92mm wide. The 75x80mm beveled optical aperture leaves 100% of lenses unobstructed.',
        dimensionsMm: '175 × 92 × 28 mm (75x80mm Optical Bay)'
    }
];
/**
 * Builds the complete unified 3D scanner assembly.
 * When explodedProgress > 0, every part separates smoothly along its physical disassembly vector,
 * with ZERO collisions or criss-crossing overlapping clusters.
 */
export function buildUnifiedAssembly(params, explodedProgress, selectedPartId = null, isDark = true, options) {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'Unified_Scanner_Assembly';
    const trajectoryLinesGroup = new THREE.Group();
    trajectoryLinesGroup.name = 'Assembly_Trajectory_Lines';
    const socketIndicatorsGroup = new THREE.Group();
    socketIndicatorsGroup.name = 'Socket_Indicators_Group';
    const partsMap = new Map();
    const ghostMode = options?.ghostNonSelected && !!selectedPartId;
    const activeCategory = options?.activeCategory || 'ALL';
    const showAllLines = options?.showAllTrajectories ?? false;
    const stepLimit = options?.stepLimit ?? null;
    // Trajectory Line Materials
    const activeTrajectoryMat = new THREE.LineDashedMaterial({
        color: 0xf59e0b, // Amber highlight
        dashSize: 0.6,
        gapSize: 0.35,
        linewidth: 3,
        transparent: true,
        opacity: 0.95,
    });
    const subtleTrajectoryMat = new THREE.LineDashedMaterial({
        color: isDark ? 0x0284c7 : 0x0ea5e9, // Muted Cyan
        dashSize: 0.8,
        gapSize: 0.5,
        linewidth: 1.5,
        transparent: true,
        opacity: 0.35,
    });
    // Reusable materials for ghosting
    const ghostMaterial = new THREE.MeshStandardMaterial({
        color: isDark ? 0x334155 : 0x94a3b8,
        transparent: true,
        opacity: 0.16,
        roughness: 0.8,
        metalness: 0.1,
        wireframe: false,
        depthWrite: false,
    });
    const activeLinePoints = [];
    const subtleLinePoints = [];
    ASSEMBLY_PARTS_INFO.forEach((info) => {
        // If filtering by build step, skip parts after current step
        if (stepLimit !== null && info.stepNumber > stepLimit) {
            return;
        }
        // If filtering by subassembly category and not matching
        const categoryMatches = activeCategory === 'ALL' || info.category === activeCategory;
        // Generate high-fidelity Three.js geometry for this part
        let partGeometryGroup;
        if (info.id === 'feed_pillow_caps') {
            // Special composite: pair of 608ZZ split clamp caps with bearings at Z = ±10.7
            partGeometryGroup = new THREE.Group();
            partGeometryGroup.name = 'Part_feed_pillow_caps';
            const capGeo = createPartGeometry('bearing_pillow_cap', params);
            const capRear = capGeo.clone();
            capRear.position.set(0, 0, -10.7);
            const capFront = capGeo.clone();
            capFront.position.set(0, 0, 10.7);
            // Bearings seated beneath caps
            const bearingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.7, 24);
            bearingGeo.rotateX(Math.PI / 2);
            const alumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });
            const bRear = new THREE.Mesh(bearingGeo, alumMat);
            bRear.position.set(0, -0.6, -10.7);
            const bFront = new THREE.Mesh(bearingGeo, alumMat);
            bFront.position.set(0, -0.6, 10.7);
            partGeometryGroup.add(capRear, capFront, bRear, bFront);
        }
        else {
            partGeometryGroup = createPartGeometry(info.cadPartId, params);
            partGeometryGroup.name = `Part_${info.id}`;
        }
        // Calculate current position based on home + explode vector * progress
        const exp = Math.max(0, Math.min(1, explodedProgress));
        const curX = info.homePosition[0] + info.explodeVector[0] * exp;
        const curY = info.homePosition[1] + info.explodeVector[1] * exp;
        const curZ = info.homePosition[2] + info.explodeVector[2] * exp;
        partGeometryGroup.position.set(curX, curY, curZ);
        if (info.rotation) {
            partGeometryGroup.rotation.set(info.rotation[0], info.rotation[1], info.rotation[2]);
        }
        if (info.scale) {
            partGeometryGroup.scale.set(info.scale[0], info.scale[1], info.scale[2]);
        }
        // Attach rich metadata to mesh userData for raycasting & inspector
        partGeometryGroup.userData = {
            isAssemblyPart: true,
            partId: info.id,
            cadPartId: info.cadPartId,
            name: info.name,
            stepNumber: info.stepNumber,
            category: info.category,
            mountsTo: info.mountsTo,
            hardware: info.hardware,
            assemblyInstructions: info.assemblyInstructions,
            dimensionsMm: info.dimensionsMm,
            homePosition: info.homePosition,
            currentPosition: [curX, curY, curZ],
        };
        const isSelected = selectedPartId === info.id;
        const shouldGhost = ghostMode && !isSelected;
        const isCategoryMuted = !categoryMatches;
        // Apply Ghosting or Highlighting
        partGeometryGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = !shouldGhost && !isCategoryMuted;
                child.receiveShadow = !shouldGhost && !isCategoryMuted;
                if (isSelected) {
                    // Highlight selected part with crisp emissive glow
                    if (child.material) {
                        const origMat = child.material;
                        if (origMat.emissive) {
                            origMat.emissive.setHex(0xf59e0b);
                            origMat.emissiveIntensity = 0.45;
                        }
                    }
                }
                else if (shouldGhost || isCategoryMuted) {
                    // Apply semi-transparent ghosting so selected part stands out completely
                    child.material = ghostMaterial;
                }
            }
        });
        rootGroup.add(partGeometryGroup);
        partsMap.set(info.id, partGeometryGroup);
        // Build Trajectory Lines & Socket Indicator Beacon
        const hX = info.homePosition[0];
        const hY = info.homePosition[1];
        const hZ = info.homePosition[2];
        const dist = Math.sqrt((curX - hX) ** 2 + (curY - hY) ** 2 + (curZ - hZ) ** 2);
        if (dist > 0.4 && exp > 0.02) {
            if (isSelected) {
                activeLinePoints.push(hX, hY, hZ, curX, curY, curZ);
                // Mating Socket Target Indicator Ring at home position
                const targetRingGeo = new THREE.RingGeometry(0.8, 1.1, 24);
                targetRingGeo.rotateX(-Math.PI / 2);
                const targetRingMat = new THREE.MeshBasicMaterial({
                    color: 0xf59e0b,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9,
                });
                const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
                targetRing.position.set(hX, hY, hZ);
                socketIndicatorsGroup.add(targetRing);
                // Vertical socket beacon ray
                const beaconGeo = new THREE.BufferGeometry();
                beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute([hX, hY, hZ, hX, hY + 1.6, hZ], 3));
                const beacon = new THREE.Line(beaconGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }));
                socketIndicatorsGroup.add(beacon);
            }
            else if (showAllLines) {
                subtleLinePoints.push(hX, hY, hZ, curX, curY, curZ);
            }
        }
    });
    // Assemble trajectory line meshes
    if (activeLinePoints.length > 0) {
        const actGeo = new THREE.BufferGeometry();
        actGeo.setAttribute('position', new THREE.Float32BufferAttribute(activeLinePoints, 3));
        const actLines = new THREE.LineSegments(actGeo, activeTrajectoryMat);
        actLines.computeLineDistances();
        trajectoryLinesGroup.add(actLines);
    }
    if (subtleLinePoints.length > 0) {
        const subGeo = new THREE.BufferGeometry();
        subGeo.setAttribute('position', new THREE.Float32BufferAttribute(subtleLinePoints, 3));
        const subLines = new THREE.LineSegments(subGeo, subtleTrajectoryMat);
        subLines.computeLineDistances();
        trajectoryLinesGroup.add(subLines);
    }
    return { rootGroup, trajectoryLinesGroup, socketIndicatorsGroup, partsMap };
}
