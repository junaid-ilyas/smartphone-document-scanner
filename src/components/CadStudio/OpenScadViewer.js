import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSelectedCadPart } from '../../store/scannerSlice';
import { CAD_PARTS } from '../../utils/cadModels';
import { downloadTextFile } from '../../utils/stlExporter';
import { Copy, Download, Check, FileCode, Printer, ShieldCheck } from 'lucide-react';
export const OpenScadViewer = () => {
    const dispatch = useAppDispatch();
    const { selectedCadPart, theme } = useAppSelector((state) => state.scanner);
    const isDark = theme === 'dark';
    const [copied, setCopied] = useState(false);
    const partDef = CAD_PARTS[selectedCadPart];
    const handleCopy = () => {
        navigator.clipboard.writeText(partDef.openScadSource);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const handleDownloadScad = () => {
        downloadTextFile(partDef.openScadSource, `${selectedCadPart}.scad`, 'application/x-openscad');
    };
    const partsList = [
        { id: 'chassis_base', name: 'Platen Base (.scad)' },
        { id: 'bearing_pillow_cap', name: 'Bearing Cap (.scad)' },
        { id: 'feed_hopper', name: 'Feed Hopper (.scad)' },
        { id: 'cantilever_arm', name: 'Gantry Arm (.scad)' },
        { id: 'phone_mount', name: 'Phone Cradle (.scad)' },
        { id: 'roller_spindle', name: 'Roller Spindle (.scad)' },
        { id: 'servo_mount', name: 'Servo Mount (.scad)' },
        { id: 'hopper_hinge', name: 'Hopper Hinge (.scad)' },
        { id: 'swivel_knuckle', name: 'Swivel Knuckle (.scad)' },
        { id: 'motor_mount_bracket', name: 'Motor Bracket (.scad)' },
        { id: 'pickup_linkage', name: 'Pick-Up Arm (.scad)' },
        { id: 'cable_strain_relief_clip', name: 'Cable Clip (.scad)' },
    ];
    return (_jsxs("div", { className: `flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200 ${isDark ? 'bg-[#0B0F17]' : 'bg-slate-50'}`, children: [_jsxs("div", { className: `flex items-center justify-between p-3 border-b gap-3 overflow-x-auto ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-2xs'}`, children: [_jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: partsList.map((item) => (_jsx("button", { onClick: () => dispatch(setSelectedCadPart(item.id)), className: `px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${selectedCadPart === item.id
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs border-amber-500'
                                : isDark
                                    ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'}`, children: item.name }, item.id))) }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsxs("button", { onClick: handleCopy, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}`, children: [copied ? _jsx(Check, { className: "w-3.5 h-3.5 text-emerald-500" }) : _jsx(Copy, { className: "w-3.5 h-3.5 text-slate-400" }), _jsx("span", { children: copied ? 'Copied!' : 'Copy Code' })] }), _jsxs("button", { onClick: handleDownloadScad, className: "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-sm", children: [_jsx(Download, { className: "w-3.5 h-3.5 text-slate-950" }), _jsx("span", { children: "Download .scad" })] })] })] }), _jsxs("div", { className: "flex-1 flex flex-col lg:flex-row overflow-hidden", children: [_jsxs("div", { className: `flex-1 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r ${isDark
                            ? 'bg-[#070b12] border-white/10'
                            : 'bg-slate-900 border-slate-200'}`, children: [_jsxs("div", { className: `flex items-center justify-between px-4 py-2 border-b text-xs font-mono ${isDark ? 'bg-slate-950 border-white/5 text-slate-400' : 'bg-slate-950 border-slate-800 text-slate-300'}`, children: [_jsxs("span", { className: "flex items-center gap-2 text-cyan-400", children: [_jsx(FileCode, { className: "w-3.5 h-3.5" }), selectedCadPart, ".scad"] }), _jsx("span", { children: "OpenSCAD v2021.01+" })] }), _jsx("pre", { className: "flex-1 p-4 font-mono text-xs text-slate-200 overflow-auto leading-relaxed select-text whitespace-pre", children: _jsx("code", { children: partDef.openScadSource }) })] }), _jsxs("div", { className: `w-full lg:w-80 p-5 overflow-y-auto flex flex-col gap-4 transition-colors duration-200 ${isDark ? 'bg-[#0e1626] text-slate-100' : 'bg-white text-slate-900 border-l border-slate-200 shadow-sm'}`, children: [_jsxs("div", { className: `flex items-center gap-2 text-xs font-bold border-b pb-2 ${isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'}`, children: [_jsx(Printer, { className: "w-4 h-4 text-cyan-500" }), "Slicing & Print Orientation"] }), _jsxs("div", { className: "space-y-3 text-xs", children: [_jsxs("div", { className: `p-3 rounded-lg border ${isDark ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`, children: [_jsx("span", { className: `font-semibold block mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`, children: "Recommended Orientation:" }), _jsx("p", { className: `text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`, children: "Lay flat on build plate with platen recess pointing UP. This minimizes support material and ensures smooth paper gliding surfaces." })] }), _jsxs("div", { className: `p-3 rounded-lg border ${isDark ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`, children: [_jsx("span", { className: `font-semibold block mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`, children: "Tolerances & Clearance:" }), _jsx("p", { className: `text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`, children: "Designed with standard 0.35mm mechanical slip-fit clearances. M3 heat-set insert holes are sized at \u00D84.2mm with a 45\u00B0 lead-in chamfer." })] }), _jsxs("div", { className: `p-3 rounded-lg border ${isDark ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`, children: [_jsx("span", { className: `font-semibold block mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`, children: "Print Without Subscription:" }), _jsxs("p", { className: `text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`, children: ["Download the free OpenSCAD application from ", _jsx("span", { className: "text-cyan-600 dark:text-cyan-400 font-semibold", children: "openscad.org" }), " to open these scripts, tweak dimensions, or press ", _jsx("kbd", { className: "px-1 py-0.5 rounded font-mono text-[10px] bg-slate-200 dark:bg-slate-800", children: "F6" }), " to render and export STL/3MF files locally at zero cost."] })] })] }), _jsxs("div", { className: `p-3 rounded-lg flex items-start gap-2.5 text-xs border ${isDark
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`, children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-500 shrink-0 mt-0.5" }), _jsx("span", { children: "100% open-source parametric CAD geometry. No proprietary cloud subscriptions or mesh lock-in required." })] })] })] })] }));
};
