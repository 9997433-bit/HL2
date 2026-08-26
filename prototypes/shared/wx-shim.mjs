/**
 * ES module entry point for the shim. `wx-shim.js` is a UMD file so it can be
 * dropped into a plain <script> tag, required from Node and loaded into a vm
 * sandbox; importing it here for its side effect gives ESM consumers named
 * exports without a second copy of the implementation.
 */
import './wx-shim.js';

const shim = globalThis.WxShim;

export const {
  VERSION,
  MOCK_FLAG,
  AD_ERRORS,
  SCENE,
  SURFACE,
  EVENTS,
  createWxShim,
  installWxShim,
  isRealWx,
  mulberry32,
} = shim;

export default shim;
