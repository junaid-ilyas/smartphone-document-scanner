import * as THREE from 'three';
/**
 * Export Three.js BufferGeometry or Mesh/Group to binary STL file
 * Compatible with Cura, PrusaSlicer, Bambu Studio, and FreeCAD
 */
export function exportToBinaryStl(object, fileName) {
    // Collect all geometries from the object or its children
    const geometries = [];
    object.updateMatrixWorld(true);
    object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            geometries.push(geom);
        }
    });
    if (geometries.length === 0) {
        console.warn('No mesh geometries found to export to STL');
        return;
    }
    // Count total triangles
    let totalTriangles = 0;
    const processedGeometries = [];
    for (const geom of geometries) {
        const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
        const posAttr = nonIndexed.getAttribute('position');
        if (posAttr) {
            const positions = posAttr.array;
            const triangles = positions.length / 9;
            totalTriangles += triangles;
            processedGeometries.push({ positions, indices: null });
        }
    }
    // Binary STL format: 80 bytes header + 4 bytes triangle count + 50 bytes per triangle
    const bufferSize = 84 + totalTriangles * 50;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(arrayBuffer);
    // Write 80-byte header
    const headerStr = 'DIY Scanner 3D Model STL Export - Open Architecture Standard';
    for (let i = 0; i < 80; i++) {
        dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
    }
    // Write triangle count (little endian)
    dataView.setUint32(80, totalTriangles, true);
    let offset = 84;
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();
    for (const item of processedGeometries) {
        const pos = item.positions;
        const count = pos.length / 9;
        for (let i = 0; i < count; i++) {
            const idx = i * 9;
            vA.set(pos[idx], pos[idx + 1], pos[idx + 2]);
            vB.set(pos[idx + 3], pos[idx + 4], pos[idx + 5]);
            vC.set(pos[idx + 6], pos[idx + 7], pos[idx + 8]);
            // Calculate normal
            edge1.subVectors(vB, vA);
            edge2.subVectors(vC, vA);
            normal.crossVectors(edge1, edge2).normalize();
            // Normal vector
            dataView.setFloat32(offset, normal.x, true);
            dataView.setFloat32(offset + 4, normal.y, true);
            dataView.setFloat32(offset + 8, normal.z, true);
            // Vertex 1
            dataView.setFloat32(offset + 12, vA.x, true);
            dataView.setFloat32(offset + 16, vA.y, true);
            dataView.setFloat32(offset + 20, vA.z, true);
            // Vertex 2
            dataView.setFloat32(offset + 24, vB.x, true);
            dataView.setFloat32(offset + 28, vB.y, true);
            dataView.setFloat32(offset + 32, vB.z, true);
            // Vertex 3
            dataView.setFloat32(offset + 36, vC.x, true);
            dataView.setFloat32(offset + 40, vC.y, true);
            dataView.setFloat32(offset + 44, vC.z, true);
            // Attribute byte count (2 bytes uint16, always 0)
            dataView.setUint16(offset + 48, 0, true);
            offset += 50;
        }
    }
    // Trigger browser download
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.stl') ? fileName : `${fileName}.stl`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
/**
 * Download text files (e.g. OpenSCAD .scad, C++ .ino, Python .py)
 */
export function downloadTextFile(content, fileName, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
/**
 * Export Three.js Object3D / Unified Assembly to Wavefront .OBJ format
 * Preserves separate named object groups (o, g), vertex coordinates, normals, and face indices.
 * Fully compatible with Blender, Fusion 360, FreeCAD, Bambu Studio, PrusaSlicer, and MeshLab.
 */
export function exportToWavefrontObj(object, fileName) {
    object.updateMatrixWorld(true);
    const lines = [
        '# ===============================================================',
        '# DIY SMART DOCUMENT SCANNER - UNIFIED 3D ASSEMBLY MODEL (.OBJ)',
        '# Open Hardware Architecture Standard',
        '# Compatible with Blender, Fusion 360, FreeCAD, Bambu Studio, Cura',
        '# Units: Millimeters (Scaled 10x from Three.js scene coordinates)',
        '# ===============================================================',
        ''
    ];
    let globalVertexOffset = 1;
    let globalNormalOffset = 1;
    let meshCount = 0;
    object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
            const posAttr = nonIndexed.getAttribute('position');
            const normAttr = nonIndexed.getAttribute('normal');
            if (!posAttr)
                return;
            meshCount++;
            const partName = child.name || child.parent?.name || `Component_${meshCount}`;
            lines.push(`o ${partName.replace(/\s+/g, '_')}`);
            lines.push(`g ${partName.replace(/\s+/g, '_')}`);
            const posArray = posAttr.array;
            const vertexCount = posAttr.count;
            // Scale factor: Three.js model is in cm (1 unit = 10mm). Slicers/CAD expect mm!
            const scale = 10.0;
            // 1. Write vertices: v x y z
            for (let i = 0; i < vertexCount; i++) {
                const x = (posArray[i * 3] * scale).toFixed(4);
                const y = (posArray[i * 3 + 1] * scale).toFixed(4);
                const z = (posArray[i * 3 + 2] * scale).toFixed(4);
                lines.push(`v ${x} ${y} ${z}`);
            }
            // 2. Write normals: vn nx ny nz
            if (normAttr) {
                const normArray = normAttr.array;
                for (let i = 0; i < vertexCount; i++) {
                    const nx = normArray[i * 3].toFixed(4);
                    const ny = normArray[i * 3 + 1].toFixed(4);
                    const nz = normArray[i * 3 + 2].toFixed(4);
                    lines.push(`vn ${nx} ${ny} ${nz}`);
                }
            }
            // 3. Write faces: f v1//vn1 v2//vn2 v3//vn3
            const triangleCount = vertexCount / 3;
            for (let i = 0; i < triangleCount; i++) {
                const v1 = globalVertexOffset + i * 3;
                const v2 = globalVertexOffset + i * 3 + 1;
                const v3 = globalVertexOffset + i * 3 + 2;
                if (normAttr) {
                    const n1 = globalNormalOffset + i * 3;
                    const n2 = globalNormalOffset + i * 3 + 1;
                    const n3 = globalNormalOffset + i * 3 + 2;
                    lines.push(`f ${v1}//${n1} ${v2}//${n2} ${v3}//${n3}`);
                }
                else {
                    lines.push(`f ${v1} ${v2} ${v3}`);
                }
            }
            globalVertexOffset += vertexCount;
            if (normAttr) {
                globalNormalOffset += vertexCount;
            }
            lines.push('');
        }
    });
    const objContent = lines.join('\n');
    const finalFileName = fileName.endsWith('.obj') ? fileName : `${fileName}.obj`;
    downloadTextFile(objContent, finalFileName, 'model/obj');
}
