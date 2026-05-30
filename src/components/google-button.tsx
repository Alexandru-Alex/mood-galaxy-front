import { Pressable, Text, type PressableProps } from 'react-native';

import { GoogleLogo } from '@/components/google-logo';
import { styles } from '@/components/google-button.styles';

type GoogleButtonProps = PressableProps & {
  label?: string;
};

export function GoogleButton({ label = 'Continue with Google', style, ...rest }: GoogleButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [styles.button, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
      {...rest}>
      <GoogleLogo size={20} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
