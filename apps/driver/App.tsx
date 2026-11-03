import './src/tracking';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { backend, command, workspace } from './src/backend';
import { config, validateConfig } from './src/config';
import { canTrack, navigationUrl, type Workspace } from './src/delivery';
import { startTracking, stopTracking, trackingStatus } from './src/tracking';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const labels: Record<string, string> = { ready_for_pickup: 'Listo para recoger', picked_up: 'Recogido', on_the_way: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado' };
function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.45 }]}><Text style={[styles.buttonText, secondary && { color: '#fff' }]}>{title}</Text></Pressable>;
}
export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<Workspace | null>(null);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [gps, setGps] = useState({ enabled: false, message: 'GPS aún no iniciado.' });
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    try {
      const current = await workspace();
      setData(current); setLastUpdated(Date.now());
      if (!canTrack(current.active)) await stopTracking();
      setGps(await trackingStatus());
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
  }, []);
  useEffect(() => {
    try { validateConfig(); } catch (e) { setError((e as Error).message); return; }
    const db = backend();
    void db.auth.getSession().then(({ data: result }) => setSignedIn(Boolean(result.session)));
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (!session) { setData(null); void stopTracking(); }
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { db.auth.startAutoRefresh(); void refresh(); }
      else db.auth.stopAutoRefresh();
    });
    return () => { listener.subscription.unsubscribe(); subscription.remove(); db.auth.stopAutoRefresh(); };
  }, [refresh]);
  useEffect(() => {
    if (!signedIn) return;
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [signedIn, refresh]);
  useEffect(() => { setCode(''); }, [data?.active?.id]);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar.'); }
    finally { setBusy(false); }
  }
  const act = (action: string, fields = {}) => void run(async () => {
    await command(action, fields);
    if (action === 'delivered') { await stopTracking(); setCode(''); }
    await refresh();
  });
  const active = data?.active;
  return <SafeAreaProvider><SafeAreaView style={styles.screen}><StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>CYBR / DELIVERY</Text>
      <Text style={styles.title}>Tu ruta. Tu turno.</Text>
      <Text style={styles.muted}>{config.restaurantName} · Repartidores</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {busy && <ActivityIndicator color="#1db954" />}
      {!signedIn ? <View style={styles.card}>
        <Text style={styles.heading}>Iniciar sesión</Text>
        <TextInput accessibilityLabel="Correo" placeholder="Correo electrónico" placeholderTextColor="#888" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" placeholderTextColor="#888" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} style={styles.input} />
        <Button title="Entrar" disabled={busy || !email.trim() || !password} onPress={() => void run(async () => {
          const { error: authError } = await backend().auth.signInWithPassword({ email: email.trim(), password });
          if (authError) throw new Error(authError.code === 'invalid_credentials' ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo nuevamente.');
          setPassword(''); await refresh();
        })} />
        <Text style={styles.muted}>Usa la cuenta de repartidor creada por el administrador. No se permite registro público.</Text>
      </View> : <>
        <View style={styles.card}>
          <Text style={styles.heading}>{data?.driver.full_name || 'Consultando turno…'}</Text>
          <View style={styles.row}><Text style={styles.text}>Disponible para recibir pedidos</Text><Switch accessibilityLabel="Disponible" disabled={busy || !data} value={data?.driver.is_available || false} onValueChange={available => act('availability', { available })} trackColor={{ true: '#1db954', false: '#444' }} /></View>
          <Text style={styles.muted}>{lastUpdated ? `Actualizado: ${new Date(lastUpdated).toLocaleTimeString('es-SV')}` : 'Sin datos de turno.'}</Text>
          <Button title="Actualizar" secondary disabled={busy} onPress={() => void run(refresh)} />
        </View>
        {active ? <View style={styles.card}>
          <Text style={styles.overline}>PEDIDO #{active.order_number}</Text>
          <Text style={styles.heading}>{labels[active.status] || active.status}</Text>
          <Text style={styles.text}>{active.customer_name} · {money(active.total_cents)} en efectivo</Text>
          <Text style={styles.muted}>{active.items.map(i => `${i.quantity} × ${i.name}`).join('\n')}</Text>
          <Text style={styles.overline}>RECOGIDA</Text><Text style={styles.text}>{active.pickup_address}</Text>
          <Text style={styles.overline}>ENTREGA</Text><Text style={styles.text}>{active.address}</Text>
          {active.instructions ? <Text style={styles.muted}>{active.instructions}</Text> : null}
          <Button title="Abrir navegación" secondary onPress={() => void run(async () => { await Linking.openURL(navigationUrl(active.status === 'ready_for_pickup' ? active.pickup : active.destination)); })} />
          <Button title="Llamar al cliente" secondary onPress={() => void run(async () => { await Linking.openURL(`tel:${active.customer_phone.replace(/[^+0-9]/g, '')}`); })} />
          {active.assignment_status === 'offered' ? <>
            <Button title="Aceptar entrega" disabled={busy} onPress={() => act('respond', { assignment_id: active.assignment_id, accept: true })} />
            <Button title="Rechazar" secondary disabled={busy} onPress={() => act('respond', { assignment_id: active.assignment_id, accept: false })} />
          </> : <>
            {active.status === 'ready_for_pickup' && <Button title="Ya recogí el pedido" disabled={busy} onPress={() => act('picked_up', { order_id: active.id })} />}
            {active.status === 'picked_up' && <Button title="Iniciar trayecto" disabled={busy} onPress={() => act('on_the_way', { order_id: active.id })} />}
            {active.status === 'on_the_way' && <>
              <View style={styles.gps}><Text style={styles.heading}>GPS {gps.enabled ? 'activo' : 'detenido'}</Text><Text style={styles.text}>{gps.message}</Text><Text style={styles.muted}>Comparte ubicación solo durante esta entrega. Requiere permiso preciso y en segundo plano; se muestra un aviso del sistema. El sistema puede detenerlo si cierras la app a la fuerza.</Text></View>
              <Button title={gps.enabled ? 'Detener GPS' : 'Compartir GPS de esta entrega'} disabled={busy} onPress={() => {
                if (gps.enabled) void run(async () => { await stopTracking(); setGps(await trackingStatus()); });
                else Alert.alert('Ubicación durante la entrega', 'La app compartirá tu ubicación con el cliente y el restaurante mientras haya una entrega activa, incluso al abrir navegación o bloquear la pantalla. Puedes detenerla aquí.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Permitir', onPress: () => void run(async () => { await startTracking(); setGps(await trackingStatus()); }) }]);
              }} />
              <Button title="Marcar llegada" secondary disabled={busy} onPress={() => act('arrived', { order_id: active.id })} />
              <TextInput accessibilityLabel="Código de entrega" placeholder="Código de 6 dígitos" placeholderTextColor="#888" keyboardType="number-pad" maxLength={6} value={code} onChangeText={v => setCode(v.replace(/\D/g, ''))} style={styles.input} />
              <Button title={`Confirmar cobro ${money(active.total_cents)} y entrega`} disabled={busy || !/^\d{6}$/.test(code)} onPress={() => Alert.alert('Confirmar entrega', `Confirma que recibiste ${money(active.total_cents)} en efectivo y entregaste el pedido.`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => act('delivered', { order_id: active.id, code }) }])} />
            </>}
          </>}
        </View> : data ? <View style={styles.card}><Text style={styles.heading}>Sin entrega activa</Text><Text style={styles.muted}>Activa tu disponibilidad. Las asignaciones del restaurante aparecerán aquí al actualizar.</Text></View> : null}
        {data && <View style={styles.card}><Text style={styles.heading}>Historial de asignaciones</Text>{data.history.length ? data.history.map((h, i) => <Text key={`${h.order_number}-${i}`} style={styles.text}>#{h.order_number} · {({ completed: 'Entregada', rejected: 'Rechazada', cancelled: 'Cancelada', expired: 'Vencida' } as Record<string, string>)[h.assignment_status] || h.assignment_status} · {money(h.total_cents)}</Text>) : <Text style={styles.muted}>Aún no hay asignaciones terminadas.</Text>}</View>}
        <Button title="Cerrar sesión" secondary disabled={busy} onPress={() => void run(async () => { await stopTracking(); const { error: logoutError } = await backend().auth.signOut(); if (logoutError) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.'); setData(null); setCode(''); })} />
      </>}
      <Text style={styles.footer}>CYBR DELIVERY · Motor propio de cada restaurante</Text>
    </ScrollView>
  </SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' }, content: { padding: 22, gap: 16, paddingBottom: 40 },
  brand: { color: '#1db954', fontWeight: '900', letterSpacing: 3, fontSize: 14 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  card: { backgroundColor: '#111', borderColor: '#292929', borderWidth: 1, padding: 18, gap: 14 },
  heading: { color: '#fff', fontSize: 21, fontWeight: '800' }, text: { color: '#eee', fontSize: 16, lineHeight: 24, flexShrink: 1 },
  muted: { color: '#a4a4a4', fontSize: 14, lineHeight: 21 }, overline: { color: '#1db954', fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#444', color: '#fff', padding: 15, fontSize: 16, backgroundColor: '#090909' },
  button: { backgroundColor: '#1db954', padding: 16, alignItems: 'center', minHeight: 52 }, buttonText: { color: '#050505', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  secondary: { backgroundColor: '#191919', borderWidth: 1, borderColor: '#444' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  error: { color: '#ffb8b8', backgroundColor: '#361717', padding: 16, fontSize: 15 }, gps: { borderLeftWidth: 3, borderColor: '#1db954', paddingLeft: 12, gap: 8 },
  footer: { color: '#777', fontSize: 12, textAlign: 'center' },
});
