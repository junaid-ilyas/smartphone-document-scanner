import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppDispatch, useAppSelector } from '../store';
import { setActiveTab, setShowReferenceModal, setShowTradeoffModal, setShowDimensionsModal, reloadHopper, setScannerState, setPaperProgress, addApiLog, toggleTheme } from '../store/scannerSlice';
import { RotateCcw, Layers, Code, Cpu, Image as ImageIcon, Play, Sun, Moon, Scale, Ruler } from 'lucide-react';
export const Navigation = () => {
    const dispatch = useAppDispatch();
    const { activeTab, scannerState, hopperPaperCount, theme } = useAppSelector((state) => state.scanner);
    const isDark = theme === 'dark';
    const navItems = [
        { id: 'digital-twin', label: '3D Kinematics', icon: _jsx(Layers, { className: "w-4 h-4" }) },
        { id: 'cad-studio', label: 'CAD & 3D Print', icon: _jsx(Code, { className: "w-4 h-4" }) },
        { id: 'firmware', label: 'ESP32 Firmware & Wiring', icon: _jsx(Cpu, { className: "w-4 h-4" }) },
        
    ];
    const handleQuickFeed = () => {
        if (scannerState === 'IDLE') {
            dispatch(setScannerState('FEEDING'));
            dispatch(addApiLog({
                method: 'POST',
                endpoint: '/api/feed',
                statusCode: 200,
                payload: { action: 'FEED_INITIATED', sheetIndex: 12 - hopperPaperCount + 1 },
                latencyMs: 14,
                source: 'MobileApp'
            }));
        }
    };
    return (_jsxs("header", { className: `sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b backdrop-blur-md transition-colors duration-200 ${isDark
            ? 'border-white/10 bg-[#0B0F17]/90 text-white'
            : 'border-slate-200 bg-white/95 text-slate-900 shadow-xs'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("a", { href: "#kinematics", onClick: (e) => { e.preventDefault(); dispatch(setActiveTab('digital-twin')); }, className: `text-lg font-bold tracking-tight flex items-center gap-2 transition-colors ${isDark ? 'text-white hover:text-amber-400' : 'text-slate-900 hover:text-amber-600'}`, children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" }), "ScannerTwin 3D"] }), _jsx("span", { className: `hidden sm:inline text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`, children: "ESP32 \u00B7 OpenSCAD \u00B7 REST/WS" })] }), _jsx("nav", { className: "flex items-center gap-1 sm:gap-2", children: navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (_jsxs("button", { onClick: () => dispatch(setActiveTab(item.id)), className: `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${isActive
                            ? isDark
                                ? 'bg-slate-800 text-white shadow-sm border border-white/10'
                                : 'bg-slate-100 text-slate-900 shadow-xs border border-slate-300 font-semibold'
                            : isDark
                                ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`, children: [item.icon, _jsx("span", { children: item.label })] }, item.id));
                }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => dispatch(toggleTheme()), title: isDark ? "Switch to Light Mode" : "Switch to Dark Mode", className: `p-1.5 rounded-md border text-xs font-medium transition-colors ${isDark
                            ? 'bg-slate-800/80 text-amber-300 border-white/10 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`, children: isDark ? _jsx(Sun, { className: "w-4 h-4" }) : _jsx(Moon, { className: "w-4 h-4" }) }), _jsxs("button", { onClick: () => dispatch(setShowReferenceModal(true)), title: "Compare with Meshy.ai Reference Model", className: `flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-white/10'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'}`, children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5 text-amber-500" }), _jsx("span", { className: "hidden md:inline", children: "Reference Model" })] }), _jsxs("button", { onClick: () => dispatch(setShowDimensionsModal(true)), title: "3D Kinematics Dimensions Inspector & Hardware Matrix", className: `flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${isDark
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'}`, children: [_jsx(Ruler, { className: "w-3.5 h-3.5 text-emerald-500" }), _jsx("span", { className: "hidden lg:inline", children: "Dimensions & Specs" })] }), _jsxs("button", { onClick: () => dispatch(setShowTradeoffModal(true)), title: "BOM Cost Reduction & Actuator Trade-off Analysis", className: `flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${isDark
                            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'}`, children: [_jsx(Scale, { className: "w-3.5 h-3.5 text-cyan-500" }), _jsx("span", { className: "hidden lg:inline", children: "Cost & Kinematics Specs" })] }), _jsxs("button", { onClick: () => {
                            dispatch(reloadHopper(15));
                            dispatch(setPaperProgress(0));
                            dispatch(setScannerState('IDLE'));
                        }, title: "Reload Hopper Paper Tray", className: `flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-white/10'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'}`, children: [_jsx(RotateCcw, { className: "w-3.5 h-3.5 text-cyan-500" }), _jsxs("span", { className: "hidden md:inline", children: ["Reload Tray (", hopperPaperCount, ")"] })] }), _jsxs("button", { onClick: handleQuickFeed, disabled: scannerState !== 'IDLE', className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors whitespace-nowrap ${scannerState === 'IDLE'
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                            : isDark
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'}`, children: [_jsx(Play, { className: "w-3.5 h-3.5 fill-current" }), _jsx("span", { children: scannerState === 'IDLE' ? 'Feed Sheet' : scannerState })] })] })] }));
};
