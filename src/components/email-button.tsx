import { Pressable, Text, type PressableProps } from 'react-native';

import { MailIcon } from '@/components/mail-icon';
import { styles } from '@/components/email-button.styles';

type EmailButtonProps = PressableProps & {
  label?: string;
};

export function EmailButton({ label = 'Continue with Email', style, ...rest }: EmailButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [styles.button, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
      {...rest}>
      <MailIcon size={20} color="#ffffff" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
