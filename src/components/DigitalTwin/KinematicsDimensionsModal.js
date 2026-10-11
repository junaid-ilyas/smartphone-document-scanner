import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setShowDimensionsModal, setCameraViewPreset, setSelectedCadPart, setActiveTab } from '../../store/scannerSlice';
import { X, Ruler, Search, Layers, Maximize2 } from 'lucide-react';
export const KINEMATIC_PARTS_CATALOG = [
    // 1. CHASSIS & BED
    {
        id: 'chassis-base',
        name: 'Modular Stepped Lap Platen Chassis & Bed',
        subassembly: 'Chassis & Bed',
        dimensionsMm: '335.0 × 245.0 × 16.0 mm (Split: 2x 168×245 mm)',
        dimensionsCm: '33.5 × 24.5 × 1.6 cm (Split: 2x 16.8×24.5 cm)',
        tolerances: '±0.15 mm (sub-50µm dowel alignment)',
        materials: 'PETG / Carbon-Fiber PETG (25% Gyroid infill)',
        fasteners: '8x M3 Ruthex Brass Heat-Set Inserts, 4x M3x20mm Draw-Bolts, 2x Ø4x20mm Ground Dowel Pins',
        kinematicRole: 'Fixed Ground Datum (Reference Frame X=0, Y=0, Z=0)',
        degreesOfFreedom: '0 DOF (Rigid Structural Datum)',
        description: 'Precision ISO 216 A4 scanning chassis engineered with a stepped scarf lap shear joint allowing printing on standard 220×220 / 256×256 mm beds, underside anti-warp pockets, and interchangeable document platen bed.',
        cadPartId: 'chassis_base',
        cameraPreset: 'perspective'
    },
    {
        id: 'scan-bed-plate',
        name: 'Matte White A4 Platen Document Scanning Bed',
        subassembly: 'Chassis & Bed',
        dimensionsMm: '310.0 × 220.0 × 1.5 mm',
        dimensionsCm: '31.0 × 22.0 × 0.15 cm',
        tolerances: '±0.05 mm flatness',
        materials: 'High-Transmission Anti-Glare Acrylic / Borosilicate Glass',
        fasteners: 'Adhesive perimeter gasket + chassis recess snap lip',
        kinematicRole: 'Scanning Reference Focal Plane (Y = 1.555 cm / 15.55 mm)',
        degreesOfFreedom: '0 DOF (Flush Bed Datum)',
        description: 'Precision document scanning platen bed sized for ISO 216 A4 (297×210 mm) with exactly 6.5 mm margins on each edge to prevent document jamming.',
        cameraPreset: 'overhead'
    },
    {
        id: 'a4-corner-brackets',
        name: 'ISO A4 Document Alignment Corner Marks (4x L-Guides)',
        subassembly: 'Chassis & Bed',
        dimensionsMm: '22.0 × 22.0 × 2.2 mm (Legs: 2.2 mm thickness)',
        dimensionsCm: '2.2 × 2.2 × 0.22 cm',
        tolerances: '±0.10 mm alignment',
        materials: 'High-contrast printed cyan alignment guides',
        fasteners: 'Molded surface relief / Laser-etched',
        kinematicRole: 'Visual and mechanical registration for 297×210 mm A4 paper',
        degreesOfFreedom: '0 DOF (Surface Markings)',
        description: 'Located at X = -15.75 ± 14.85 cm and Z = ±10.5 cm, demarcating exact ISO 216 A4 sheet boundaries under camera FOV.',
        cameraPreset: 'overhead'
    },
    {
        id: 'rubber-feet',
        name: 'Non-Slip Elastomer Chassis Dampening Feet (6x)',
        subassembly: 'Chassis & Bed',
        dimensionsMm: 'Ø16.0 mm (Base) / Ø18.0 mm (Top) × 4.0 mm Height',
        dimensionsCm: 'Ø1.6 / Ø1.8 × 0.4 cm',
        tolerances: '±0.20 mm',
        materials: 'Durometer 50A Neoprene / Silicone Rubber',
        fasteners: 'Countersunk self-adhesive / M3 push-in stud',
        kinematicRole: 'Vibration isolation and desktop anti-skid traction',
        degreesOfFreedom: '0 DOF (Elastic dampener)',
        description: '6-point footprint placed at corners and mid-span to eliminate stepper motor resonance harmonics during high-speed paper feed.',
        cameraPreset: 'side'
    },
    // 2. FEED POWERTRAIN
    {
        id: 'feed-pillow-blocks',
        name: 'Feed Throat Integrated Bearing Pillow Blocks (Front & Rear)',
        subassembly: 'Feed Powertrain',
        dimensionsMm: '18.0 × 22.0 × 12.0 mm each',
        dimensionsCm: '1.8 × 2.2 × 1.2 cm',
        tolerances: 'H7 (+0.015/-0.000 mm) bore for 608ZZ bearings',
        materials: 'PETG / Carbon-fiber reinforced filament',
        fasteners: 'Integrated into chassis monocoque, M3 clamping cross-bolt',
        kinematicRole: 'Bearing housings located at X = 0, Z = ±11.5 cm',
        degreesOfFreedom: '0 DOF (Ground fixture)',
        description: 'Houses the 608ZZ radial ball bearings that support the primary feed roller axle and the pivot shaft bushings for the servo ADF.',
        cameraPreset: 'feeder'
    },
    {
        id: 'bearing-pillow-caps',
        name: '608ZZ Split Bearing Pillow Block Clamp Caps (4x)',
        subassembly: 'Feed Powertrain',
        dimensionsMm: '26.0 × 14.0 × 12.0 mm each',
        dimensionsCm: '2.6 × 1.4 × 1.2 cm',
        tolerances: 'H7 (+0.018/-0.000 mm) inner arch for 608ZZ bearings',
        materials: 'PETG / ABS (50% Gyroid, 5 perimeters)',
        fasteners: '8x M3x14mm DIN 912 Cap Screws into Chassis Ruthex Inserts',
        kinematicRole: 'Bearing clamp fixture (Z = ±11.5 cm)',
        degreesOfFreedom: '0 DOF (Rigid Bearing Clamping)',
        description: 'Precision removable clamp caps enabling rapid maintenance and axle replacement without disassembling the scanner chassis or peeling layer lines.',
        cadPartId: 'bearing_pillow_cap',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-ball-bearings',
        name: 'Deep Groove Radial Ball Bearings 608ZZ (4x across chassis)',
        subassembly: 'Feed Powertrain',
        dimensionsMm: 'Outer: Ø22.0 mm, Bore: Ø8.0 mm, Width: 7.0 mm',
        dimensionsCm: 'OD: Ø2.2 cm, ID: Ø0.8 cm, W: 0.7 cm',
        tolerances: 'ABEC-5 / ISO Normal Class 0',
        materials: 'AISI 52100 Chrome Steel with dual steel dust shields',
        fasteners: 'Press-fit into pillow block bores',
        kinematicRole: 'Low-friction rotational support for 8mm roller shafts',
        degreesOfFreedom: '1 DOF (Continuous rotation around Z-axis)',
        description: 'Allows silky-smooth, zero-play rotation of the main feed and ejection roller axles under continuous duty.',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-nema17-motor',
        name: 'Feed Drive NEMA 17 Bipolar Stepper Motor',
        subassembly: 'Feed Powertrain',
        dimensionsMm: '42.3 × 42.3 × 38.0 mm (Motor Body) + 22.0 mm Shaft',
        dimensionsCm: '4.23 × 4.23 × 3.8 cm',
        tolerances: 'NEMA 17 Standard, ±0.2 mm',
        materials: 'Silicon steel stator, aluminum end bells, steel rotor',
        fasteners: '4x M3×8mm Socket Head Screws (31.0 mm bolt square)',
        kinematicRole: 'Primary feed rotational drive (X = 0, Y = 2.4, Z = -16.3 cm)',
        degreesOfFreedom: '1 DOF (Controlled step rotation around Z-axis, 1.8°/step)',
        description: 'Rated at 0.44 N·m holding torque, 1.5A/phase. Drives the primary roller with micro-stepping (1/16th) for smooth paper feeding.',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-motor-bracket',
        name: 'NEMA 17 Rear Cantilever Motor Mount Bracket',
        subassembly: 'Feed Powertrain',
        dimensionsMm: '42.0 × 42.0 × 4.0 mm plate + dual 18.0 × 6.0 × 26.0 mm gussets',
        dimensionsCm: '4.2 × 4.2 × 0.4 cm (faceplate), Gussets: 1.8 × 0.6 × 2.6 cm',
        tolerances: '±0.15 mm',
        materials: 'PETG / ABS (35% infill)',
        fasteners: '4x M3 Screws to motor, rigid gussets to rear pillow block',
        kinematicRole: 'Stiff motor mount spanning from Z = -11.5 to Z = -14.2 cm',
        degreesOfFreedom: '0 DOF (Rigid cantilever to pillow block)',
        description: 'Eliminates motor deflection and shaft misalignment under heavy paper pulling loads.',
        cadPartId: 'motor_mount_bracket',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-helical-coupler',
        name: 'CNC Helical Flexible Aluminum Shaft Coupler',
        subassembly: 'Feed Powertrain',
        dimensionsMm: 'Outer: Ø19.0 mm, Length: 22.0 mm (Bore: 5mm to 8mm)',
        dimensionsCm: 'OD: Ø1.9 cm, Length: 2.2 cm',
        tolerances: 'H8 bore, ±0.05 mm concentricity',
        materials: '6061-T6 Anodized Aluminum with CNC spiral flex cuts',
        fasteners: '2x M4 Brass Set Screws (90° offset)',
        kinematicRole: 'Mates NEMA 17 5mm D-shaft to 8mm roller axle at Z = -12.6 cm',
        degreesOfFreedom: 'Rotational torque transmission + angular/axial compliance',
        description: 'Absorbs micro-misalignments between the motor shaft and roller axle, preventing bearing binding and motor stall.',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-roller-axle',
        name: 'Primary Ground Steel Feed Roller Axle Shaft',
        subassembly: 'Feed Powertrain',
        dimensionsMm: 'Ø8.0 mm × 245.0 mm Overall Length',
        dimensionsCm: 'Ø0.8 cm × 24.5 cm',
        tolerances: 'h6 (+0.000/-0.009 mm) precision ground',
        materials: 'Precision Ground Case-Hardened Stainless Steel (SUS304/W316)',
        fasteners: '2x 8mm Shaft Retaining E-Clips / Collar clamps',
        kinematicRole: 'Main drive shaft spanning from front bearing to rear coupler',
        degreesOfFreedom: '1 DOF (Pure rotation around Z-axis)',
        description: 'Rigid axle supporting the primary EPDM high-traction roller sleeve and cyan silicone traction ribs.',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-roller-sleeve',
        name: 'High-Traction EPDM Rubber Feed Roller Body & Silicone Ribs',
        subassembly: 'Feed Powertrain',
        dimensionsMm: 'Roller: Ø16.0 mm × 210.0 mm Length; 4x Ribs: Ø17.6 mm × 16.0 mm',
        dimensionsCm: 'Roller: Ø1.6 × 21.0 cm, Ribs: Ø1.76 × 1.6 cm',
        tolerances: '±0.1 mm runout',
        materials: 'Durometer 45A Vulcanized EPDM Rubber + Orange Silicone Traction Strips',
        fasteners: 'Interference friction fit on 8mm knurled axle',
        kinematicRole: 'Paper drive interface exerting friction force F = μ · N',
        degreesOfFreedom: '1 DOF (Synchronized rotation with axle)',
        description: 'Directly contacts paper at the feed throat. 4 orange traction ribs at Z = ±75 mm and ±25 mm provide lateral paper alignment.',
        cadPartId: 'roller_spindle',
        cameraPreset: 'feeder'
    },
    {
        id: 'feed-idler-roller',
        name: 'Lower Opposing Idler Pinch Roller',
        subassembly: 'Feed Powertrain',
        dimensionsMm: 'Ø8.0 mm × 210.0 mm Length',
        dimensionsCm: 'Ø0.8 cm × 21.0 cm',
        tolerances: '±0.05 mm straightness',
        materials: 'Polished Anodized Aluminum 6061-T6',
        fasteners: 'Spring-loaded lower slide blocks in chassis bed',
        kinematicRole: 'Under-bed opposing pinch support at Y = 1.0 cm',
        degreesOfFreedom: '1 DOF (Free passive rotation around Z-axis)',
        description: 'Pinch paper against the upper drive roller with calibrated normal spring force to guarantee zero slip.',
        cameraPreset: 'feeder'
    },
    // 3. SERVO ACTIVE PICK-UP LINKAGE
    {
        id: 'servo-bracket-cradle',
        name: 'SG90 Micro-Servo 3D-Printed Mounting Bracket Cradle',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: '20.0 × 34.0 × 18.0 mm (Cavity: 23.0 × 12.5 × 22.5 mm)',
        dimensionsCm: '2.0 × 3.4 × 1.8 cm',
        tolerances: '±0.15 mm',
        materials: 'PETG (Reinforced sidewalls)',
        fasteners: '4x M2×8mm Thread-Forming Screws on top & bottom mounting ears',
        kinematicRole: 'Rigidly bolted to front pillow block at X = 0, Z = 12.8 cm',
        degreesOfFreedom: '0 DOF (Rigid mount to front pillow block)',
        description: 'Securely encloses the SG90 micro-servo and positions its brass output spline in exact coaxial plane with the driving linkage.',
        cadPartId: 'servo_mount',
        cameraPreset: 'feeder'
    },
    {
        id: 'sg90-servo-motor',
        name: 'TowerPro / Feetech SG90 Digital Micro-Servo Actuator',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: '22.5 × 12.0 × 22.7 mm (Body) + 4.5 mm Output Spline',
        dimensionsCm: '2.25 × 1.2 × 2.27 cm',
        tolerances: 'Standard 9g servo casing',
        materials: 'Translucent polycarbonate casing, brass/nylon geartrain',
        fasteners: '4x M2 screws through mounting flanges',
        kinematicRole: 'Active variable normal force generator (0° to 180° swing)',
        degreesOfFreedom: '1 DOF (Controlled angular position θ = -14° to +25°)',
        description: 'Exerts 1.8 kg·cm (0.176 N·m) torque. Controls the pick-up arm height to handle single sheets (0.1 mm) up to 50-sheet stacks (5.5 mm).',
        cameraPreset: 'feeder'
    },
    {
        id: 'servo-horn-clevis',
        name: 'Reinforced Nylon Servo Horn & Push-Rod Linkage',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: 'Horn: 16.0 × 2.5 × 4.0 mm, Push-Rod: Ø1.2 mm × 11.0 mm Length',
        dimensionsCm: 'Horn: 1.6 × 0.25 × 0.4 cm, Rod: Ø0.12 × 1.1 cm',
        tolerances: '±0.05 mm pin fit',
        materials: 'Nylon Horn + Stainless Steel Linkage Push-Rod',
        fasteners: 'M1.6 Servo Spline Retaining Screw + Brass Clevis Pin',
        kinematicRole: 'Translates servo rotary motion into pivot shaft rotation',
        degreesOfFreedom: 'Planar 4-bar kinematic linkage',
        description: 'Connects the servo horn directly to the driving clevis on the cross-shaft at Z = 12.4 cm with zero mechanical backlash.',
        cameraPreset: 'feeder'
    },
    {
        id: 'servo-cross-shaft',
        name: 'Continuous Stainless Steel Pick-Up Pivot Cross-Shaft',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: 'Ø4.0 mm × 245.0 mm Length (Z = -11.5 cm to Z = +12.6 cm)',
        dimensionsCm: 'Ø0.4 cm × 24.5 cm',
        tolerances: 'h7 (+0.000/-0.012 mm) ground shaft',
        materials: 'Precision Ground 304 Stainless Steel',
        fasteners: '2x M3 Shaft Clamping Split Collars at Z = ±85 mm',
        kinematicRole: 'Primary pivot axis for dual pick-up arms at Y = 2.4 cm',
        degreesOfFreedom: '1 DOF (Rotation around Z-axis: -14° feed to +22° retracted)',
        description: 'Continuous torsion bar spanning through bronze sleeve bushings in BOTH front and rear pillow blocks to guarantee parallel arm motion.',
        cameraPreset: 'feeder'
    },
    {
        id: 'bronze-bushings',
        name: 'Oil-Impregnated Sintered Bronze Sleeve Bushings (2x)',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: 'Outer: Ø8.4 mm, Bore: Ø4.0 mm, Length: 8.0 mm',
        dimensionsCm: 'OD: Ø0.84 cm, ID: Ø0.4 cm, L: 0.8 cm',
        tolerances: 'E7/h7 running fit',
        materials: 'SAE 841 Sintered Bronze (self-lubricating)',
        fasteners: 'Light press fit into pillow blocks at Z = ±11.5 cm',
        kinematicRole: 'Low-friction pivot sleeve bearings for 4mm cross-shaft',
        degreesOfFreedom: '1 DOF (Shaft rotational clearance)',
        description: 'Provides maintenance-free, silent pivoting of the servo arm under high cycle counts.',
        cameraPreset: 'feeder'
    },
    {
        id: 'dual-pickup-arms',
        name: 'Dual Cantilever Pick-Up Arms & Structural Bridge',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: 'Arms (2x): 45.0 × 4.0 × 8.0 mm each; Bridge: 5.0 × 3.5 × 39.0 mm',
        dimensionsCm: 'Arms: 4.5 × 0.4 × 0.8 cm, Bridge: 0.5 × 0.35 × 3.9 cm',
        tolerances: '±0.10 mm',
        materials: 'Anodized 6061 Aluminum / High-modulus PETG',
        fasteners: 'M3 clamping bolts onto 4mm cross-shaft',
        kinematicRole: 'Suspends pick-up roller over the feed hopper stack at X = 4.2 cm',
        degreesOfFreedom: '1 DOF (Pivots with cross-shaft)',
        description: 'Positioned at Z = +8.5 cm and Z = -8.5 cm. Sweeps down onto the top paper sheet with normal force F_N = 0.85 N.',
        cadPartId: 'pickup_linkage',
        cameraPreset: 'feeder'
    },
    {
        id: 'pickup-roller-tire',
        name: 'Feed Pick-Up Spindle & High-Traction Silicone Roller',
        subassembly: 'Servo ADF Linkage',
        dimensionsMm: 'Spindle: Ø4.0 mm × 182.0 mm; Tire: Ø13.0 mm × 170.0 mm',
        dimensionsCm: 'Spindle: Ø0.4 × 18.2 cm, Tire: Ø1.3 × 17.0 cm',
        tolerances: '±0.15 mm',
        materials: 'High-Friction Soft Silicone Rubber (35A durometer) on Aluminum Core',
        fasteners: 'Bronze sleeve bearings on arm ends + E-clip retainers',
        kinematicRole: 'Directly grabs top sheet of paper stack in hopper',
        degreesOfFreedom: '1 DOF (Freely rotating spindle on arm bearings)',
        description: 'High friction coefficient (μ ≥ 1.25) feeds only the top paper sheet while leaving lower sheets undisturbed.',
        cameraPreset: 'feeder'
    },
    // 4. FEED HOPPER TRAY
    {
        id: 'hopper-tray-body',
        name: '16° Gravity Feed Hopper Tray Bed Plate',
        subassembly: 'Chassis & Bed',
        dimensionsMm: '315.0 × 218.0 × 4.0 mm (Inner width: 218.0 mm for A4)',
        dimensionsCm: '31.5 × 21.8 × 0.4 cm',
        tolerances: '±0.20 mm',
        materials: 'PETG / PLA (Low surface friction)',
        fasteners: '2x Integrated Hinge Lugs (12 × 10 × 14 mm) to pillow blocks',
        kinematicRole: 'Supports input paper stack (1 to 50 sheets) at 16° pitch',
        degreesOfFreedom: 'Adjustable tilt angle (Nominal 16°)',
        description: 'Accommodates 297×210 mm A4 paper with 4 mm side margin. Tray bed surface is at local Y = 2.0 mm.',
        cadPartId: 'feed_hopper',
        cameraPreset: 'feeder'
    },
    {
        id: 'hopper-guide-walls',
        name: 'Feed Hopper Side Alignment Guide Walls & End Stop',
        subassembly: 'Chassis & Bed',
        dimensionsMm: 'Walls (2x): 315.0 × 5.0 × 24.0 mm; End Lip: 5.0 × 218.0 × 24.0 mm',
        dimensionsCm: 'Walls: 31.5 × 0.5 × 2.4 cm, End Lip: 0.5 × 21.8 × 2.4 cm',
        tolerances: '±0.15 mm',
        materials: 'Integrated molded walls on tray',
        fasteners: 'Monolithic printed geometry',
        kinematicRole: 'Prevents paper stack skewing and fanning during feeding',
        degreesOfFreedom: '0 DOF (Rigid with tray)',
        description: 'Keeps document edges perfectly orthogonal so paper enters the scanning throat with zero skew angle.',
        cameraPreset: 'feeder'
    },
    // 5. GANTRY TOWER & OPTICS
    {
        id: 'gantry-column',
        name: 'Vertical Structural Gantry Tower Pillar & Gusset',
        subassembly: 'Gantry & Optics',
        dimensionsMm: 'Pillar: Ø32.0 mm (Base Ø36.0 mm) × 300.0 mm Height; Gusset: 50 × 60 × 9 mm',
        dimensionsCm: 'Pillar: Ø3.2 / Ø3.6 × 30.0 cm, Gusset: 5.0 × 6.0 × 0.9 cm',
        tolerances: '±0.15 mm verticality',
        materials: 'High-Rigidity PETG (35% Gyroid infill) / Aluminum Extrusion',
        fasteners: 'M4×35mm Column Clamp Bolt + 2x M3 Heat-Set Inserts',
        kinematicRole: 'Primary optical gantry column centered at X = -15.75, Z = -13.5 cm',
        degreesOfFreedom: '0 DOF (Rigid mast clamped to chassis collar)',
        description: 'Elevates smartphone camera to exactly 245 mm optical focal height above platen bed center.',
        cadPartId: 'cantilever_arm',
        cameraPreset: 'perspective'
    },
    {
        id: 'gantry-cantilever-arm',
        name: 'Forward Horizontal Cantilever Arm Beam & Spine',
        subassembly: 'Gantry & Optics',
        dimensionsMm: 'Beam: 22.0 × 16.0 × 135.0 mm Reach; Spine: 8.0 × 5.0 × 120.0 mm',
        dimensionsCm: 'Beam: 2.2 × 1.6 × 13.5 cm, Spine: 0.8 × 0.5 × 12.0 cm',
        tolerances: '±0.10 mm deflection under 300g phone payload (< 0.25 mm)',
        materials: 'PETG with cyan reinforcing structural spine',
        fasteners: 'M4 Clamp onto gantry column top boss',
        kinematicRole: 'Extends forward from column (Z = -13.5) to platen center (Z = 0)',
        degreesOfFreedom: 'Adjustable reach / Swivel around column',
        description: 'Suspends the smartphone cradle precisely over the optical centroid of the ISO A4 document.',
        cameraPreset: 'perspective'
    },
    {
        id: 'gantry-swivel-knuckle',
        name: 'Vertical Drop Stem & Dual-Axis Swivel Knuckle',
        subassembly: 'Gantry & Optics',
        dimensionsMm: 'Drop Stem: 14.0 × 45.0 × 12.0 mm; Swivel: Ø18.0 mm × 18.0 mm',
        dimensionsCm: 'Stem: 1.4 × 4.5 × 1.2 cm, Swivel: Ø1.8 × 1.8 cm',
        tolerances: '±0.05 mm spherical/cylindrical fit',
        materials: 'CNC 6061-T6 Anodized Aluminum',
        fasteners: 'Knurled Brass Locking Thumbscrew (Ø14.0 mm × 6.0 mm)',
        kinematicRole: 'Connects cantilever arm tip to smartphone cradle backplate',
        degreesOfFreedom: '2 DOF (Pitch ±20° and Yaw ±15° for camera leveling)',
        description: 'Enables micro-leveling of the smartphone camera so sensor plane is 100% parallel to platen glass.',
        cadPartId: 'swivel_knuckle',
        cameraPreset: 'perspective'
    },
    {
        id: 'gantry-cable-clip',
        name: 'Gantry Column Snap-Fit Cable Organizer & Strain Relief (2x)',
        subassembly: 'Gantry & Optics',
        dimensionsMm: '38.0 × 34.0 × 16.0 mm (Snaps to Ø28.2 mm Column)',
        dimensionsCm: '3.8 × 3.4 × 1.6 cm',
        tolerances: 'Compliant snap-fit with 1.8 mm flexural displacement',
        materials: 'PETG (100% Solid Infill for flex fatigue resistance)',
        fasteners: 'Compliant C-clip + optional 1x M3x10mm pinch bolt',
        kinematicRole: 'Cable management & EMI isolation on vertical gantry pillar',
        degreesOfFreedom: '0 DOF (Clamped to Column)',
        description: 'Dual-conduit organizer isolating phone USB-C data cable from stepper motor EMI wiring, preventing wire snagging during automated scanning.',
        cadPartId: 'cable_strain_relief_clip',
        cameraPreset: 'perspective'
    },
    // 6. UNIVERSAL CAMERA CRADLE
    {
        id: 'cradle-universal-aperture',
        name: 'Universal Camera Island Aperture Window & Bevel Frame',
        subassembly: 'Universal Camera Cradle',
        dimensionsMm: 'Optical Window: 75.0 × 80.0 mm Clear Aperture; Frame: 85.0 × 5.0 × 92.0 mm',
        dimensionsCm: 'Window: 7.5 × 8.0 cm, Frame: 8.5 × 0.5 × 9.2 cm',
        tolerances: '±0.15 mm',
        materials: 'Engineered High-Temp PETG with Chamfered Optical Wells',
        fasteners: 'M5 Swivel Boss to gantry knuckle',
        kinematicRole: 'Accommodates all modern smartphone camera modules without vignetting',
        degreesOfFreedom: '0 DOF (Rigid cradle chassis)',
        description: 'Zero optical occlusion: Fits iPhone Pro triangle bump, Samsung Galaxy Ultra quad-lens, Google Pixel visor bar, and Xiaomi/OnePlus circular pucks.',
        cadPartId: 'phone_mount',
        cameraPreset: 'perspective'
    },
    {
        id: 'cradle-silicone-cushions',
        name: 'Camera Island Perimeter Silicone Bumper Cushions (2x)',
        subassembly: 'Universal Camera Cradle',
        dimensionsMm: '72.0 × 8.0 × 1.0 mm each',
        dimensionsCm: '7.2 × 0.8 × 0.1 cm',
        tolerances: '±0.1 mm',
        materials: 'Medical-grade Soft Silicone (40A Durometer)',
        fasteners: 'Recessed adhesive channel in cradle frame',
        kinematicRole: 'Protects phone camera sapphire glass and prevents scratching',
        degreesOfFreedom: '0 DOF (Static damper)',
        description: 'Provides a scratch-free, vibration-isolated seat around the camera perimeter.',
        cameraPreset: 'perspective'
    },
    {
        id: 'cradle-side-clamps',
        name: 'Low-Profile Lower Flank Clamping Jaws with Silicone Grips',
        subassembly: 'Universal Camera Cradle',
        dimensionsMm: 'Jaws (2x): 90.0 × 12.0 × 5.0 mm; Grip Span: 65.0 to 88.0 mm',
        dimensionsCm: 'Jaws: 9.0 × 1.2 × 0.5 cm, Clamp Span: 6.5 to 8.8 cm',
        tolerances: '±0.20 mm',
        materials: 'Aluminum core with co-molded ribbed silicone pads',
        fasteners: 'Brass Knurled Tensioning Thumbscrew (Ø13.0 mm × 12.0 mm, M5 thread)',
        kinematicRole: 'Securely clamps phone on lower half, leaving 100% of buttons & camera free',
        degreesOfFreedom: '1 DOF (Linear clamping along Z-axis)',
        description: 'Grips phones from 65 mm (iPhone mini) up to 88 mm (Pro Max / Ultra with rugged case) without touching volume or power buttons.',
        cameraPreset: 'perspective'
    },
    {
        id: 'smartphone-device-datum',
        name: 'Smartphone Body & Touchscreen Display Reference Datum',
        subassembly: 'Universal Camera Cradle',
        dimensionsMm: 'Nominal Body: 168.0 × 84.0 × 8.0 mm; Screen: 162.0 × 78.0 mm',
        dimensionsCm: 'Body: 16.8 × 8.4 × 0.8 cm, Screen: 16.2 × 7.8 cm',
        tolerances: 'Universal smartphone envelope (6.1" to 6.9" screens)',
        materials: 'Glass & Titanium / Aluminum phone body',
        fasteners: 'Secured via lower flank clamp jaws',
        kinematicRole: 'Touchscreen faces UP towards user; Camera points DOWN at platen',
        degreesOfFreedom: 'Fully constrained when locked',
        description: '100% unobstructed screen view allows user to monitor real-time crop framing, OCR confidence, and scan count.',
        cameraPreset: 'perspective'
    },
    // 7. EJECTION POWERTRAIN
    {
        id: 'ejection-roller-assembly',
        name: 'Ejection Roller Assembly & NEMA 17 Stepper Powertrain',
        subassembly: 'Ejection & Flattener',
        dimensionsMm: 'Axle: Ø8.0 mm × 245.0 mm; Roller: Ø16.0 mm × 210.0 mm; Motor: 42.3 × 42.3 × 38.0 mm',
        dimensionsCm: 'Axle: Ø0.8 × 24.5 cm, Roller: Ø1.6 × 21.0 cm, Motor: 4.23 × 4.23 × 3.8 cm',
        tolerances: 'h6 shaft fit, ABEC-5 bearings',
        materials: 'Ground Steel Axle, EPDM Rubber Roller, 6061-T6 Coupler, NEMA 17',
        fasteners: '4x M3 Motor Screws, Helical Coupler, 2x Pillow Block Clamps',
        kinematicRole: 'Ejects scanned paper out left side at X = -31.5 cm',
        degreesOfFreedom: '1 DOF (Synchronized rotation around Z-axis)',
        description: 'Pulls the scanned sheet off the platen at 60 mm/s and drives it into the catch tray or desk-drop zone.',
        cameraPreset: 'side'
    },
    {
        id: 'exit-catch-tray',
        name: '6° Downward Incline Exit Catch Tray (Optional Module)',
        subassembly: 'Ejection & Flattener',
        dimensionsMm: '320.0 × 222.0 × 14.0 mm (Bed thickness: 3.5 mm)',
        dimensionsCm: '32.0 × 22.2 × 1.4 cm',
        tolerances: '±0.20 mm',
        materials: 'PETG / PLA (165g filament)',
        fasteners: '2x Snap-in lugs into ejection pillow blocks',
        kinematicRole: 'Neatly stacks completed scans at X = -31.5 to X = -63.5 cm',
        degreesOfFreedom: 'Removable / Detachable (Desk-Drop Mode removes tray)',
        description: 'Can be removed to save $12.84 in BOM and shrink desk footprint by 320 mm in Desk-Drop Mode.',
        cadPartId: 'exit_tray',
        cameraPreset: 'side'
    },
    // 8. SENSORS & ELECTRONICS
    {
        id: 'sensor-tcrt5000',
        name: 'TCRT5000 Reflective Optical Infrared Paper Edge Sensor',
        subassembly: 'Sensors & Electronics',
        dimensionsMm: 'Housing: Ø14.0 mm × 2.0 mm; Sensor Cutout: 14.0 × 28.0 mm',
        dimensionsCm: 'Housing: Ø1.4 × 0.2 cm, Cutout: 1.4 × 2.8 cm',
        tolerances: '±0.2 mm optical center',
        materials: '950nm Infrared Emitter Phototransistor in Cyan Housing',
        fasteners: 'Snap-in chassis pocket under platen bed center (X = -15.75, Z = 0)',
        kinematicRole: 'Trips immediately when leading edge of paper reaches platen center',
        degreesOfFreedom: '0 DOF (Internal chassis sensor)',
        description: 'Connected to ESP32 GPIO 34. Emits PAPER_ARRIVED WebSocket event within 3 ms of detection.',
        cameraPreset: 'sensor'
    },
    {
        id: 'esp32-controller-box',
        name: 'ESP32 Mainboard Enclosure & Real-Time Electronics',
        subassembly: 'Sensors & Electronics',
        dimensionsMm: 'Box: 110.0 × 50.0 × 8.0 mm; PCB: 80.0 × 35.0 × 1.5 mm',
        dimensionsCm: 'Box: 11.0 × 5.0 × 0.8 cm, PCB: 8.0 × 3.5 × 0.15 cm',
        tolerances: '±0.20 mm',
        materials: 'Flame-retardant PETG with translucent tinted acrylic cover',
        fasteners: '4x M2.5 Screws to rear chassis edge (Z = -16.5 cm)',
        kinematicRole: 'Central microcontroller running WebSocket server and stepper motor ISRs',
        degreesOfFreedom: '0 DOF (Rigid electronics bay)',
        description: 'Hosts ESP32 Dual-Core 240MHz SoC, TMC2209 silent stepper drivers, and 12V-to-5V buck converter.',
        cameraPreset: 'side'
    }
];
export const KinematicsDimensionsModal = () => {
    const dispatch = useAppDispatch();
    const { showDimensionsModal, theme } = useAppSelector((state) => state.scanner);
    const isDark = theme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubassembly, setSelectedSubassembly] = useState('All');
    const [selectedPart, setSelectedPart] = useState(KINEMATIC_PARTS_CATALOG[0]);
    if (!showDimensionsModal)
        return null;
    const subassemblies = [
        'All',
        'Chassis & Bed',
        'Feed Powertrain',
        'Servo ADF Linkage',
        'Gantry & Optics',
        'Universal Camera Cradle',
        'Ejection & Flattener',
        'Sensors & Electronics'
    ];
    const filteredParts = KINEMATIC_PARTS_CATALOG.filter((part) => {
        const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.dimensionsMm.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.materials.toLowerCase().includes(searchQuery.toLowerCase()) ||
            part.kinematicRole.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedSubassembly === 'All' || part.subassembly === selectedSubassembly;
        return matchesSearch && matchesCategory;
    });
    const handleInspectIn3D = (part) => {
        if (part.cameraPreset) {
            dispatch(setCameraViewPreset(part.cameraPreset));
        }
        if (part.cadPartId) {
            dispatch(setSelectedCadPart(part.cadPartId));
        }
        dispatch(setShowDimensionsModal(false));
    };
    const handleOpenInCadStudio = (part) => {
        if (part.cadPartId) {
            dispatch(setSelectedCadPart(part.cadPartId));
            dispatch(setActiveTab('cad-studio'));
            dispatch(setShowDimensionsModal(false));
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200", children: _jsxs("div", { className: `relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${isDark ? 'bg-[#0B0F17] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`, children: [_jsxs("div", { className: `flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20", children: _jsx(Ruler, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-base font-bold tracking-tight", children: "3D Kinematics Dimension Inspector & Hardware Matrix" }), _jsxs("span", { className: "px-2 py-0.5 text-[11px] font-mono rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20", children: [KINEMATIC_PARTS_CATALOG.length, " Components Fully Dimensioned"] })] }), _jsx("p", { className: `text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`, children: "Itemized engineering specifications, metric dimensions (mm & cm), tolerances, kinematics, and attachment hardware." })] })] }), _jsx("button", { onClick: () => dispatch(setShowDimensionsModal(false)), className: `p-1.5 rounded-lg border transition-colors cursor-pointer ${isDark ? 'border-white/10 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`, children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: `flex flex-col sm:flex-row items-center gap-3 px-6 py-3 border-b text-xs ${isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'}`, children: [_jsxs("div", { className: "relative flex-1 w-full", children: [_jsx(Search, { className: "w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", placeholder: "Search by part name, dimension (e.g. \u00D88mm, 315mm, 42mm), material, or role...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: `w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isDark ? 'bg-slate-950 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}` })] }), _jsx("div", { className: "flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none", children: subassemblies.map((sub) => (_jsx("button", { onClick: () => setSelectedSubassembly(sub), className: `px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${selectedSubassembly === sub
                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                    : isDark
                                        ? 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'}`, children: sub }, sub))) })] }), _jsxs("div", { className: "flex-1 flex flex-col lg:flex-row overflow-hidden", children: [_jsx("div", { className: `w-full lg:w-1/2 overflow-y-auto border-r divide-y ${isDark ? 'border-white/10 divide-white/5' : 'border-slate-200 divide-slate-100'}`, children: filteredParts.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-slate-400 text-xs", children: ["No kinematic parts matching \"", searchQuery, "\" in \"", selectedSubassembly, "\"."] })) : (filteredParts.map((part) => {
                                const isSelected = selectedPart?.id === part.id;
                                return (_jsxs("div", { onClick: () => setSelectedPart(part), className: `p-3.5 flex flex-col gap-1.5 transition-all cursor-pointer ${isSelected
                                        ? isDark
                                            ? 'bg-cyan-950/30 border-l-4 border-cyan-500'
                                            : 'bg-cyan-50/80 border-l-4 border-cyan-600'
                                        : isDark
                                            ? 'hover:bg-slate-900/50'
                                            : 'hover:bg-slate-50'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2", children: part.name }), _jsx("span", { className: "px-2 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300", children: part.subassembly })] }), _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "font-mono text-cyan-600 dark:text-cyan-400 font-semibold", children: part.dimensionsMm }), _jsx("span", { className: "text-[11px] text-slate-500 font-mono", children: part.dimensionsCm })] }), _jsx("div", { className: "text-[11px] text-slate-500 line-clamp-1", children: part.kinematicRole })] }, part.id));
                            })) }), _jsx("div", { className: `w-full lg:w-1/2 p-6 overflow-y-auto flex flex-col gap-5 ${isDark ? 'bg-slate-950/50' : 'bg-slate-50/60'}`, children: selectedPart ? (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: "flex flex-col gap-1 border-b pb-3 dark:border-white/10 border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold", children: selectedPart.subassembly }), _jsxs("span", { className: "text-xs text-slate-400 font-mono", children: ["ID: ", selectedPart.id] })] }), _jsx("h3", { className: "text-lg font-bold text-slate-900 dark:text-white mt-1", children: selectedPart.name }), _jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400 leading-relaxed", children: selectedPart.description })] }), _jsxs("div", { className: `p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-[#0E1626] border-cyan-500/20 shadow-lg' : 'bg-white border-cyan-200 shadow-sm'}`, children: [_jsxs("div", { className: "text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5", children: [_jsx(Ruler, { className: "w-3.5 h-3.5" }), "Exact Engineering Dimensions"] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-xs", children: [_jsxs("div", { className: "flex flex-col p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5", children: [_jsx("span", { className: "text-[10px] text-slate-500 uppercase font-mono", children: "Metric (Millimeters)" }), _jsx("span", { className: "text-sm font-mono font-bold text-slate-900 dark:text-cyan-300 mt-0.5", children: selectedPart.dimensionsMm })] }), _jsxs("div", { className: "flex flex-col p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5", children: [_jsx("span", { className: "text-[10px] text-slate-500 uppercase font-mono", children: "Metric (Centimeters)" }), _jsx("span", { className: "text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 mt-0.5", children: selectedPart.dimensionsCm })] })] }), _jsxs("div", { className: "flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5 font-mono", children: [_jsx("span", { className: "text-slate-500", children: "Machining / Print Tolerances:" }), _jsx("span", { className: "font-semibold text-emerald-600 dark:text-emerald-400", children: selectedPart.tolerances })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs", children: [_jsxs("div", { className: "p-3 rounded-lg border bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] text-slate-400 uppercase font-mono font-bold", children: "Kinematic Function" }), _jsx("span", { className: "font-semibold text-slate-900 dark:text-slate-200", children: selectedPart.kinematicRole })] }), _jsxs("div", { className: "p-3 rounded-lg border bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] text-slate-400 uppercase font-mono font-bold", children: "Degrees of Freedom (DOF)" }), _jsx("span", { className: "font-mono text-indigo-600 dark:text-indigo-400 font-semibold", children: selectedPart.degreesOfFreedom })] }), _jsxs("div", { className: "p-3 rounded-lg border bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] text-slate-400 uppercase font-mono font-bold", children: "Material & Manufacturing" }), _jsx("span", { className: "text-slate-700 dark:text-slate-300", children: selectedPart.materials })] }), _jsxs("div", { className: "p-3 rounded-lg border bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] text-slate-400 uppercase font-mono font-bold", children: "Attachment & Fasteners" }), _jsx("span", { className: "text-slate-700 dark:text-slate-300", children: selectedPart.fasteners })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 pt-2", children: [_jsxs("button", { onClick: () => handleInspectIn3D(selectedPart), className: "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-sm cursor-pointer", children: [_jsx(Maximize2, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Locate in 3D Kinematics" })] }), selectedPart.cadPartId && (_jsxs("button", { onClick: () => handleOpenInCadStudio(selectedPart), className: "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-white/10 cursor-pointer", children: [_jsx(Layers, { className: "w-3.5 h-3.5 text-cyan-400" }), _jsx("span", { children: "Export STL in CAD Studio" })] }))] })] })) : (_jsx("div", { className: "flex flex-col items-center justify-center h-full text-slate-400 text-xs", children: "Select a component from the list to view its complete metric dimensions and attachment kinematics." })) })] }), _jsxs("div", { className: `flex items-center justify-between px-6 py-3 border-t text-xs ${isDark ? 'border-white/10 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }), _jsx("span", { className: "font-mono text-[11px]", children: "All measurements adhere to ISO 216 A4 (297\u00D7210 mm) standardized clearances." })] }), _jsx("button", { onClick: () => dispatch(setShowDimensionsModal(false)), className: "px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors cursor-pointer", children: "Close Inspector" })] })] }) }));
};
