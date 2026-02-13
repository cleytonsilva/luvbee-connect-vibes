import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, shadows, borders, borderRadius, typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface NeoInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function NeoInput({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
}: NeoInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [isSecure, setIsSecure] = React.useState(secureTextEntry);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.black}
            style={styles.iconLeft}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)}>
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.black}
              style={styles.iconRight}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: borders.normal,
    borderColor: colors.black,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  inputFocused: {
    borderColor: colors.yellow,
    borderWidth: borders.thick,
    ...shadows.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: typography.sizes.base,
    color: colors.black,
  },
  iconLeft: {
    marginLeft: 12,
  },
  iconRight: {
    marginRight: 12,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
