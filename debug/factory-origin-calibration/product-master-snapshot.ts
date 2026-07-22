/**
 * Frozen UA35001 Product Master snapshot for shadow runtime (sync, no PNG IO).
 * Updated by Phase 70.3 front factory-origin visual calibration.
 */

import type { ProductMasterGeometry } from "./product-master-profile";

export const UA35001_PRODUCT_MASTER_SNAPSHOT: ProductMasterGeometry = {
  "productCode": "UA35001",
  "version": 1,
  "derivation": "averaged-factory-cross-validation-calibrated",
  "front": {
    "productCode": "UA35001",
    "side": "front",
    "canvas": {
      "width": 1024,
      "height": 1536
    },
    "collarBottom": {
      "x": 512,
      "y": 416,
      "neckWidthPx": 286
    },
    "factoryOrigin": {
      "x": 512,
      "y": 416,
      "side": "front",
      "offsetCm": 7,
      "pxPerCm": 12.24
    },
    "artworkStage": {
      "left": 297.8,
      "top": 501.68,
      "width": 428.4,
      "height": 612
    },
    "safeArea": {
      "left": 316.16,
      "top": 501.68,
      "width": 391.68,
      "height": 563.04
    },
    "garmentWidthPx": 981.5,
    "garmentHeightPx": 998,
    "shoulderWidthPx": 578.9,
    "centerPoint": {
      "x": 511.95,
      "y": 772.9
    },
    "hem": {
      "x": 511.95,
      "y": 1270.9
    },
    "alphaBoundingBox": {
      "left": 21.2,
      "top": 273.9,
      "width": 981.5,
      "height": 998
    }
  },
  "back": {
    "productCode": "UA35001",
    "side": "back",
    "canvas": {
      "width": 1024,
      "height": 1536
    },
    "collarBottom": {
      "x": 513,
      "y": 388,
      "neckWidthPx": 286
    },
    "factoryOrigin": {
      "x": 513,
      "y": 388,
      "side": "back",
      "offsetCm": 5,
      "pxPerCm": 12.24
    },
    "artworkStage": {
      "left": 280.44,
      "top": 449.2,
      "width": 465.12,
      "height": 550.8
    },
    "safeArea": {
      "left": 317.16,
      "top": 449.2,
      "width": 391.68,
      "height": 514.08
    },
    "garmentWidthPx": 981.5,
    "garmentHeightPx": 1020.3,
    "shoulderWidthPx": 577.1,
    "centerPoint": {
      "x": 512.95,
      "y": 775.95
    },
    "hem": {
      "x": 512.95,
      "y": 1285.1
    },
    "alphaBoundingBox": {
      "left": 22.2,
      "top": 265.8,
      "width": 981.5,
      "height": 1020.3
    }
  }
};
