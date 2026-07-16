import type { KeyboardTypeOptions } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Label } from './Label';
import { colors, radii } from './theme';

type TextFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Unité affichée à droite (« km/h », « bpm ») — déjà traduite. */
  unit?: string;
  keyboardType?: KeyboardTypeOptions;
};

/** Input (charte §1 : fond `surface-2`, bordure discrète, rayon imbriqué). */
export function TextField({
  value,
  onChangeText,
  label,
  placeholder,
  unit,
  keyboardType,
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radii.cardNested,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingVertical: 12,
  },
  unit: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
