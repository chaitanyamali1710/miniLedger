import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type NewLoan } from '../api';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { showMessage } from '../dialogs';
import { isoDate } from '../format';
import { colors } from '../theme';
import { checkLoan } from '../validation';

type Props = {
  token: string;
  onDone: () => void;
  onCancel: () => void;
};

export function AddLoanScreen({ token, onDone, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(isoDate(7));
  const [receipt, setReceipt] = useState<NewLoan['receipt']>();
  const [errors, setErrors] = useState<ReturnType<typeof checkLoan>>({});
  const [saving, setSaving] = useState(false);

  async function pickReceipt(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showMessage('Permission needed', 'Allow access in Settings to attach a receipt.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) {
      const a = result.assets[0];
      setReceipt({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName });
    }
  }

  async function save() {
    const found = checkLoan(friendName, amount, dueDate);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.addLoan(token, { friendName: friendName.trim(), amount: amount.trim(), dueDate, receipt });
      onDone();
    } catch (e) {
      showMessage('Could not save', (e as Error).message);
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New entry</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Field label="Friend's name" placeholder="Asha" value={friendName} onChangeText={setFriendName} error={errors.friendName} />
        <Field
          label="Amount (₹)"
          placeholder="500"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          error={errors.amount}
        />
        <Field
          label="Due date (YYYY-MM-DD)"
          placeholder={isoDate(7)}
          value={dueDate}
          onChangeText={setDueDate}
          error={errors.dueDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Receipt photo (optional)</Text>
        {receipt ? (
          <View style={styles.preview}>
            <Image source={{ uri: receipt.uri }} style={styles.thumb} />
            <Button title="Remove photo" variant="plain" onPress={() => setReceipt(undefined)} />
          </View>
        ) : (
          <View style={styles.photoRow}>
            <View style={{ flex: 1 }}>
              <Button title="Take photo" variant="plain" onPress={() => pickReceipt('camera')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Choose photo" variant="plain" onPress={() => pickReceipt('library')} />
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />
        <Button title="Save entry" onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancel: { color: colors.primary, fontSize: 16, width: 64 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, color: colors.muted, marginBottom: 6 },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 10,
  },
  preview: { alignItems: 'center' },
  thumb: { width: '100%', height: 200, borderRadius: 10, backgroundColor: colors.border },
});
