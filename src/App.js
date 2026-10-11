import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store, useAppSelector } from './store';
import { Navigation } from './components/Navigation';
import { ScannerCanvas3D } from './components/DigitalTwin/ScannerCanvas3D';
import { ControlsPanel } from './components/DigitalTwin/ControlsPanel';
import { CadViewer } from './components/CadStudio/CadViewer';
import { OpenScadViewer } from './components/CadStudio/OpenScadViewer';
import { FirmwareViewer } from './components/FirmwareHub/FirmwareViewer';
import { ReferenceViewerModal } from './components/ReferenceViewerModal';
import { TradeoffModal } from './components/DigitalTwin/TradeoffModal';
import { KinematicsDimensionsModal } from './components/DigitalTwin/KinematicsDimensionsModal';
import { Box, Code } from 'lucide-react';
const MainLayout = () => {
    const { activeTab, theme } = useAppSelector((state) => state.scanner);
    const [cadSubView, setCadSubView] = useState('3d-stl');
    React.useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        }
        else {
            document.body.classList.remove('dark');
        }
    }, [theme]);
    const isDark = theme === 'dark';
    return (_jsxs("div", { className: `flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${isDark ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'}`, children: [_jsx(Navigation, {}), _jsxs("main", { className: "flex-1 flex overflow-hidden relative", children: [activeTab === 'digital-twin' && (_jsxs("div", { className: "flex-1 flex flex-col lg:flex-row h-full overflow-hidden", children: [_jsx("div", { className: "flex-1 h-full min-h-[350px] relative", children: _jsx(ScannerCanvas3D, {}) }), _jsx(ControlsPanel, {})] })), activeTab === 'cad-studio' && (_jsxs("div", { className: "flex-1 flex flex-col h-full overflow-hidden", children: [_jsxs("div", { className: `flex items-center justify-between px-6 py-2.5 border-b transition-colors ${isDark ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-200 shadow-2xs'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`, children: "CAD Engineering Studio" }), _jsx("span", { className: "text-slate-400 text-xs", children: "\u00B7" }), _jsx("span", { className: `text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`, children: "Parametric 3D printable models" })] }), _jsxs("div", { className: `flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-slate-100 border-slate-200'}`, children: [_jsxs("button", { onClick: () => setCadSubView('3d-stl'), className: `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${cadSubView === '3d-stl'
                                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(Box, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "3D Model & STL Export" })] }), _jsxs("button", { onClick: () => setCadSubView('openscad'), className: `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${cadSubView === 'openscad'
                                                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                                                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(Code, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "OpenSCAD Code Scripts" })] })] })] }), _jsx("div", { className: "flex-1 h-full overflow-hidden", children: cadSubView === '3d-stl' ? _jsx(CadViewer, {}) : _jsx(OpenScadViewer, {}) })] })), activeTab === 'firmware' && _jsx(FirmwareViewer, {})] }), _jsx(ReferenceViewerModal, {}), _jsx(TradeoffModal, {}), _jsx(KinematicsDimensionsModal, {})] }));
};
export default function App() {
    return (_jsx(Provider, { store: store, children: _jsx(MainLayout, {}) }));
}
