/**
 * gltf_read.mjs
 * 
 * Shared glTF accessor reading utilities.
 * Honors accessor.byteOffset, bufferView.byteOffset, byteStride, componentType,
 * normalized flag, and count per glTF 2.0 spec.
 */

const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENT_READER = {
  5120: (dv, o) => dv.getInt8(o),
  5121: (dv, o) => dv.getUint8(o),
  5122: (dv, o) => dv.getInt16(o, true),
  5123: (dv, o) => dv.getUint16(o, true),
  5125: (dv, o) => dv.getUint32(o, true),
  5126: (dv, o) => dv.getFloat32(o, true),
};
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

/**
 * Read a glTF accessor into a flat array.
 * 
 * @param {object} gltf - The parsed glTF JSON
 * @param {Buffer} binBuffer - The GLB binary chunk
 * @param {number} accessorIndex - Index into gltf.accessors
 * @returns {{data: number[], components: number, count: number, componentType: number, type: string}}
 */
export function readAccessor(gltf, binBuffer, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`accessor ${accessorIndex} does not exist`);
  if (accessor.bufferView === undefined) {
    throw new Error(`accessor ${accessorIndex} has no bufferView (sparse accessors unsupported)`);
  }

  const bufferView = gltf.bufferViews?.[accessor.bufferView];
  if (!bufferView) throw new Error(`bufferView ${accessor.bufferView} does not exist`);

  const componentType = accessor.componentType;
  const read = COMPONENT_READER[componentType];
  if (!read) throw new Error(`unsupported componentType ${componentType}`);
  const componentSize = COMPONENT_SIZE[componentType];

  const components = TYPE_COMPONENTS[accessor.type];
  if (!components) throw new Error(`unsupported accessor type ${accessor.type}`);
  const elementSize = componentSize * components;
  const stride = bufferView.byteStride ?? elementSize;

  const viewStart = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const count = accessor.count;
  const out = new Array(count * components);

  const dv = new DataView(binBuffer.buffer, binBuffer.byteOffset + viewStart, binBuffer.byteLength - viewStart);
  for (let e = 0; e < count; e++) {
    for (let c = 0; c < components; c++) {
      out[e * components + c] = read(dv, e * stride + c * componentSize);
    }
  }
  
  return { data: out, components, count, componentType, type: accessor.type };
}

/**
 * Read POSITION accessor (VEC3 FLOAT) into array of [x, y, z] tuples.
 */
export function readPositions(gltf, binBuffer, accessorIndex) {
  const result = readAccessor(gltf, binBuffer, accessorIndex);
  if (result.type !== 'VEC3' || result.componentType !== 5126) {
    throw new Error(`Expected VEC3 FLOAT for POSITION, got ${result.type} with componentType ${result.componentType}`);
  }
  
  const positions = [];
  for (let i = 0; i < result.count; i++) {
    positions.push([
      result.data[i * 3],
      result.data[i * 3 + 1],
      result.data[i * 3 + 2],
    ]);
  }
  return positions;
}

/**
 * Read JOINTS_0 accessor (VEC4 UNSIGNED_BYTE or UNSIGNED_SHORT) into array of [j0, j1, j2, j3] tuples.
 */
export function readJoints(gltf, binBuffer, accessorIndex) {
  const result = readAccessor(gltf, binBuffer, accessorIndex);
  if (result.type !== 'VEC4') {
    throw new Error(`Expected VEC4 for JOINTS_0, got ${result.type}`);
  }
  if (result.componentType !== 5121 && result.componentType !== 5123) {
    throw new Error(`Expected UNSIGNED_BYTE or UNSIGNED_SHORT for JOINTS_0, got componentType ${result.componentType}`);
  }
  
  const joints = [];
  for (let i = 0; i < result.count; i++) {
    joints.push([
      result.data[i * 4],
      result.data[i * 4 + 1],
      result.data[i * 4 + 2],
      result.data[i * 4 + 3],
    ]);
  }
  return joints;
}

/**
 * Read WEIGHTS_0 accessor (VEC4 FLOAT or UNSIGNED_BYTE/UNSIGNED_SHORT normalized) into array of [w0, w1, w2, w3] tuples.
 */
export function readWeights(gltf, binBuffer, accessorIndex) {
  const result = readAccessor(gltf, binBuffer, accessorIndex);
  if (result.type !== 'VEC4') {
    throw new Error(`Expected VEC4 for WEIGHTS_0, got ${result.type}`);
  }
  
  const weights = [];
  const accessor = gltf.accessors[accessorIndex];
  const isNormalized = accessor.normalized === true;
  
  // If normalized integer types, scale to [0, 1]
  let scale = 1.0;
  if (isNormalized) {
    if (result.componentType === 5121) scale = 1.0 / 255.0; // UNSIGNED_BYTE
    else if (result.componentType === 5123) scale = 1.0 / 65535.0; // UNSIGNED_SHORT
  }
  
  for (let i = 0; i < result.count; i++) {
    weights.push([
      result.data[i * 4] * scale,
      result.data[i * 4 + 1] * scale,
      result.data[i * 4 + 2] * scale,
      result.data[i * 4 + 3] * scale,
    ]);
  }
  return weights;
}
