import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { NumberField } from '@/components/NumberField';
import { Screen } from '@/components/Screen';
import { colors, font, radius, spacing } from '@/components/theme';
import { normalizeGtin, SCAN_BARCODE_TYPES } from '@/features/barcode/gtin';
import { initScanState, scanReducer, type ScanState } from '@/features/barcode/scanReducer';
import { parseDateParam, parseMealParam } from '@/features/diary/params';
import { useBarcodeLookup } from '@/features/foods/hooks';
import { encodeFoodParam } from '@/features/foods/validation';
import { errorMessage } from '@/lib/confirm';

// Spec 002 · Escáner de códigos de barras (diseño §6.1).
const isWeb = Platform.OS === 'web';

export default function ScanScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = parseDateParam(params.date);
  const meal = parseMealParam(params.meal);

  const headerHeight = useHeaderHeight();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, dispatch] = useReducer(scanReducer, { isWeb, permission }, initScanState);

  // Permiso: avanza solo cuando el permiso ya está concedido o negado para siempre (R2).
  useEffect(() => {
    if (state.status !== 'permission' || !permission) return;
    if (permission.granted) dispatch({ type: 'PERMISSION_GRANTED' });
    else if (!permission.canAskAgain) dispatch({ type: 'PERMISSION_DENIED' });
  }, [permission, state.status]);

  const askPermission = async () => {
    const result = await requestPermission();
    dispatch({ type: result.granted ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED' });
  };

  // Búsqueda (R3): el resultado se entrega a la máquina de estados.
  const gtin = state.status === 'looking_up' ? state.gtin : null;
  const lookup = useBarcodeLookup(gtin);
  const startedAt = useRef(0);
  useEffect(() => {
    if (gtin) startedAt.current = Date.now();
  }, [gtin]);
  useEffect(() => {
    if (!gtin || lookup.fetchStatus === 'fetching') return;
    if (lookup.isSuccess) dispatch({ type: 'LOOKUP_DONE', gtin, result: lookup.data });
    // Un error en caché de un intento anterior no cuenta: solo los posteriores al inicio.
    else if (lookup.isError && lookup.errorUpdatedAt >= startedAt.current) {
      dispatch({ type: 'LOOKUP_FAILED', gtin, message: errorMessage(lookup.error) });
    }
  }, [gtin, lookup.fetchStatus, lookup.isSuccess, lookup.isError, lookup.data, lookup.error, lookup.errorUpdatedAt]);

  const retry = () => {
    dispatch({ type: 'RETRY' });
    startedAt.current = Date.now();
    void lookup.refetch();
  };

  // Encontrado → Registrar, reemplazando el escáner para que "volver" lleve a Buscar.
  useEffect(() => {
    if (state.status !== 'found') return;
    router.replace({ pathname: '/log/new', params: { date, meal, food: encodeFoodParam(state.food) } });
  }, [state, date, meal]);

  // Una sola lectura por código (R1.3): bloqueo inmediato además del estado.
  const locked = useRef(false);
  useEffect(() => {
    if (state.status === 'scanning') locked.current = false;
  }, [state.status]);

  const onBarcodeScanned = ({ data, type }: BarcodeScanningResult) => {
    if (locked.current || !normalizeGtin(data, type)) return; // inválido: se ignora (R1.5)
    locked.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dispatch({ type: 'CODE_SCANNED', data, barcodeType: type });
  };

  const createFood = (s: Extract<ScanState, { status: 'missing' }>) => {
    const p = s.partial;
    const v = (n: number | undefined) => (n === undefined ? '' : String(n));
    router.push({
      pathname: '/food-new',
      params: {
        date,
        meal,
        barcode: s.gtin,
        name: p?.name ?? '',
        brand: p?.brand ?? '',
        kcal: v(p?.per100g.kcal),
        protein: v(p?.per100g.protein),
        carbs: v(p?.per100g.carbs),
        fat: v(p?.per100g.fat),
      },
    });
  };

  if (state.status === 'scanning') {
    return <CameraScanner onScanned={onBarcodeScanned} onManual={() => dispatch({ type: 'GO_MANUAL' })} />;
  }

  return (
    <Screen keyboardOffset={headerHeight}>
      {state.status === 'permission' ? (
        <Message icon="camera-outline" title="Escanear códigos de barras">
          <Text style={styles.body}>
            Usamos la cámara solo para leer el código del envase. Las imágenes no se guardan ni se envían: solo el
            número del código.
          </Text>
          <Button title="Permitir cámara" onPress={askPermission} />
          <Button title="Ingresar código a mano" variant="secondary" onPress={() => dispatch({ type: 'GO_MANUAL' })} />
        </Message>
      ) : null}

      {state.status === 'denied' ? (
        <Message icon="lock-closed-outline" title="Sin acceso a la cámara">
          <Text style={styles.body}>Puedes activarlo en los ajustes del teléfono o escribir el código.</Text>
          <Button title="Abrir ajustes" onPress={() => void Linking.openSettings()} />
          <Button title="Ingresar código a mano" variant="secondary" onPress={() => dispatch({ type: 'GO_MANUAL' })} />
        </Message>
      ) : null}

      {state.status === 'manual' ? (
        <ManualEntry
          invalid={state.invalid}
          onSubmit={(text) => dispatch({ type: 'MANUAL_SUBMIT', text })}
          onUseCamera={isWeb ? undefined : () => dispatch({ type: 'USE_CAMERA' })}
        />
      ) : null}

      {state.status === 'looking_up' || state.status === 'found' ? (
        <Message title={`Buscando ${state.gtin}…`}>
          <ActivityIndicator size="large" />
          {state.status === 'looking_up' ? (
            <Button title="Cancelar" variant="secondary" onPress={() => dispatch({ type: 'CANCEL' })} />
          ) : null}
        </Message>
      ) : null}

      {state.status === 'missing' ? (
        <Message
          icon="help-circle-outline"
          title={state.reason === 'not_found' ? 'No encontramos este producto' : 'Faltan datos nutricionales'}
        >
          <Text style={styles.body}>
            Código {state.gtin}. Puedes crearlo con los valores de la etiqueta; la próxima vez lo encontrarás al
            escanear.
          </Text>
          <Button title="Crear alimento" onPress={() => createFood(state)} />
          <Button title="Volver a escanear" variant="secondary" onPress={() => dispatch({ type: 'RESCAN' })} />
        </Message>
      ) : null}

      {state.status === 'error' ? (
        <Message icon="cloud-offline-outline" title="No se pudo buscar el producto">
          <Text style={styles.body}>Revisa tu conexión. Código {state.gtin}.</Text>
          <Button title="Reintentar" onPress={retry} />
          <Button title="Ingresar a mano" variant="secondary" onPress={() => dispatch({ type: 'GO_MANUAL' })} />
          <Button title="Buscar por nombre" variant="secondary" onPress={() => router.back()} />
        </Message>
      ) : null}
    </Screen>
  );
}

function CameraScanner({
  onScanned,
  onManual,
}: {
  onScanned: (result: BarcodeScanningResult) => void;
  onManual: () => void;
}) {
  const [torch, setTorch] = useState(false);
  return (
    <View style={styles.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...SCAN_BARCODE_TYPES] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.overlayText}>Apunta al código de barras del envase</Text>
        <View style={styles.frame} accessibilityLabel="Marco de lectura" />
        <View style={styles.cameraActions}>
          <Pressable
            onPress={() => setTorch((t) => !t)}
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
            accessibilityState={{ selected: torch }}
            style={styles.roundButton}
          >
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color={colors.onPrimary} />
          </Pressable>
          <Pressable onPress={onManual} accessibilityRole="button" style={styles.pill}>
            <Text style={styles.pillText}>Ingresar a mano</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ManualEntry({
  invalid,
  onSubmit,
  onUseCamera,
}: {
  invalid: boolean;
  onSubmit: (text: string) => void;
  onUseCamera?: () => void;
}) {
  const [text, setText] = useState('');
  const digits = text.replace(/\s+/g, '');
  const lengthOk = [8, 12, 13].includes(digits.length);
  // Error en línea antes de buscar (R5.2).
  const error =
    digits.length > 0 && /\D/.test(digits)
      ? 'Solo números.'
      : invalid || (lengthOk && !normalizeGtin(digits))
        ? 'Código no válido. Revisa los números (8, 12 o 13 dígitos).'
        : undefined;

  return (
    <View style={styles.manual}>
      <NumberField
        label="Código de barras"
        placeholder="Ej.: 7802800716500"
        value={text}
        onChangeText={setText}
        error={error}
        autoFocus
        maxLength={16}
        returnKeyType="search"
        onSubmitEditing={() => lengthOk && onSubmit(digits)}
      />
      <Button title="Buscar" onPress={() => onSubmit(digits)} disabled={!lengthOk || !!error} />
      {onUseCamera ? <Button title="Usar la cámara" variant="secondary" onPress={onUseCamera} /> : null}
    </View>
  );
}

function Message({
  icon,
  title,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.message}>
      {icon ? <Ionicons name={icon} size={40} color={colors.muted} style={styles.icon} /> : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl },
  overlayText: { color: colors.onPrimary, fontSize: font.body, fontWeight: '600', marginTop: spacing.lg },
  frame: {
    width: '85%',
    aspectRatio: 2,
    borderWidth: 3,
    borderColor: colors.onPrimary,
    borderRadius: radius.md,
  },
  cameraActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  roundButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pillText: { color: colors.onPrimary, fontWeight: '600', fontSize: font.body },
  manual: { gap: spacing.md },
  message: { alignItems: 'stretch', gap: spacing.md, paddingTop: spacing.xl },
  icon: { alignSelf: 'center' },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});
