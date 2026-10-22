import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'plain';
};

export function Button({ title, onPress, loading, variant = 'primary' }: Props) {
  const plain = variant === 'plain';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.button, plain && styles.plain, pressed && { opacity: 0.7 }]}
    >
      {loading ? (
        <ActivityIndicator color={plain ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, plain && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  plain: { backgroundColor: 'transparent' },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
