import type { PartialOffFood } from '@/features/foods/openFoodFacts';
import type { FoodRef } from '@/features/foods/types';

import { normalizeGtin } from './gtin';
import type { BarcodeLookupResult } from './lookup';

// Spec 002 · Máquina de estados del escáner (diseño §6.1).

/** Modo de captura al que se vuelve tras cancelar o reescanear. */
export type CaptureMode = 'camera' | 'manual';

export type ScanState =
  | { status: 'permission'; mode: 'camera' }
  | { status: 'denied'; mode: 'camera' }
  | { status: 'scanning'; mode: 'camera' }
  | { status: 'manual'; mode: 'manual'; invalid: boolean }
  | { status: 'looking_up'; mode: CaptureMode; gtin: string }
  | { status: 'found'; mode: CaptureMode; gtin: string; food: FoodRef }
  | { status: 'missing'; mode: CaptureMode; gtin: string; reason: 'not_found' | 'incomplete'; partial?: PartialOffFood }
  | { status: 'error'; mode: CaptureMode; gtin: string; message: string };

export type ScanEvent =
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'CODE_SCANNED'; data: string; barcodeType?: string }
  | { type: 'MANUAL_SUBMIT'; text: string }
  | { type: 'GO_MANUAL' }
  | { type: 'LOOKUP_DONE'; gtin: string; result: BarcodeLookupResult }
  | { type: 'LOOKUP_FAILED'; gtin: string; message: string }
  | { type: 'CANCEL' }
  | { type: 'RESCAN' }
  | { type: 'RETRY' };

export type InitOptions = {
  isWeb: boolean;
  /** Estado del permiso de cámara, si ya se conoce. */
  permission?: { granted: boolean; canAskAgain: boolean } | null;
};

const MANUAL = { status: 'manual', mode: 'manual', invalid: false } as const satisfies ScanState;

/** Estado inicial: en web solo hay ingreso manual (R7.2); en móvil depende del permiso (R2). */
export function initScanState({ isWeb, permission }: InitOptions): ScanState {
  if (isWeb) return MANUAL;
  if (permission?.granted) return { status: 'scanning', mode: 'camera' };
  if (permission && !permission.canAskAgain) return { status: 'denied', mode: 'camera' };
  return { status: 'permission', mode: 'camera' };
}

const backToCapture = (mode: CaptureMode): ScanState =>
  mode === 'camera' ? { status: 'scanning', mode: 'camera' } : MANUAL;

export function scanReducer(state: ScanState, event: ScanEvent): ScanState {
  switch (event.type) {
    case 'PERMISSION_GRANTED':
      return state.status === 'permission' || state.status === 'denied'
        ? { status: 'scanning', mode: 'camera' }
        : state;

    case 'PERMISSION_DENIED':
      return state.status === 'permission' ? { status: 'denied', mode: 'camera' } : state;

    case 'CODE_SCANNED': {
      // Solo se procesa una lectura mientras se escanea (R1.3); las inválidas se ignoran (R1.5).
      if (state.status !== 'scanning') return state;
      const gtin = normalizeGtin(event.data, event.barcodeType);
      return gtin ? { status: 'looking_up', mode: 'camera', gtin } : state;
    }

    case 'MANUAL_SUBMIT': {
      if (state.status !== 'manual') return state;
      const gtin = normalizeGtin(event.text);
      return gtin ? { status: 'looking_up', mode: 'manual', gtin } : { ...MANUAL, invalid: true };
    }

    case 'GO_MANUAL':
      return state.status === 'looking_up' || state.status === 'found' ? state : MANUAL;

    case 'LOOKUP_DONE': {
      if (state.status !== 'looking_up' || state.gtin !== event.gtin) return state; // respuesta vieja
      const { result } = event;
      const base = { mode: state.mode, gtin: state.gtin };
      if (result.kind === 'found') return { status: 'found', ...base, food: result.food };
      if (result.kind === 'incomplete') return { status: 'missing', ...base, reason: 'incomplete', partial: result.partial };
      return { status: 'missing', ...base, reason: 'not_found' };
    }

    case 'LOOKUP_FAILED':
      return state.status === 'looking_up' && state.gtin === event.gtin
        ? { status: 'error', mode: state.mode, gtin: state.gtin, message: event.message }
        : state;

    case 'CANCEL':
      return state.status === 'looking_up' ? backToCapture(state.mode) : state;

    case 'RESCAN':
      return state.status === 'missing' || state.status === 'error' ? backToCapture(state.mode) : state;

    case 'RETRY':
      return state.status === 'error' ? { status: 'looking_up', mode: state.mode, gtin: state.gtin } : state;
  }
}
