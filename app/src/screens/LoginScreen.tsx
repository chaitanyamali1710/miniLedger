import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { colors } from '../theme';
import { checkOtp, checkPhone } from '../validation';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string) => void }) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  async function sendOtp() {
    const problem = checkPhone(phone);
    if (problem) return setError(problem);
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone);
      setDemoOtp(res.demoOtp ?? null);
      setOtp(res.demoOtp ?? '');
      setStep('otp');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const problem = checkOtp(otp);
    if (problem) return setError(problem);
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.verifyOtp(phone, otp.trim());
      onLoggedIn(token);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.box}>
        <Text style={styles.title}>MiniLedger</Text>
        <Text style={styles.subtitle}>Keep track of money you lend to friends.</Text>

        {step === 'phone' ? (
          <>
            <Field
              label="Phone number"
              placeholder="+919876543210"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              error={error}
              onSubmitEditing={sendOtp}
            />
            <Button title="Send OTP" onPress={sendOtp} loading={loading} />
          </>
        ) : (
          <>
            {demoOtp ? (
              <View style={styles.demo}>
                <Text style={styles.demoLabel}>Demo mode: your OTP is</Text>
                <Text style={styles.demoCode}>{demoOtp}</Text>
              </View>
            ) : (
              <Text style={styles.hint}>We sent a 6 digit code to {phone}. (For now it is printed in the server log.)</Text>
            )}
            <Field
              label="OTP"
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              error={error}
              onSubmitEditing={verify}
              autoFocus
            />
            <Button title="Log in" onPress={verify} loading={loading} />
            <Button
              title="Use a different number"
              variant="plain"
              onPress={() => {
                setStep('phone');
                setOtp('');
                setDemoOtp(null);
                setError(null);
              }}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  box: { padding: 24 },
  title: { fontSize: 34, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 4, marginBottom: 32 },
  hint: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  demo: { backgroundColor: '#EAF1FE', borderRadius: 10, padding: 14, marginBottom: 16, alignItems: 'center' },
  demoLabel: { fontSize: 14, color: colors.muted },
  demoCode: { fontSize: 30, fontWeight: '800', letterSpacing: 6, color: colors.primary, marginTop: 4 },
});
