import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from './theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Bottom sheet maison (charte : « Adapter ma semaine », déplacement de
 * séance). Fermeture par tap sur le fond ; le geste de drag viendra avec
 * les usages (Lot 8).
 */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropContainer}>
        <Pressable
          accessibilityRole="button"
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.screenGutter,
    paddingBottom: 32,
    gap: spacing.cardGap,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
