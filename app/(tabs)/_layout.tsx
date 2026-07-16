import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { colors } from '@/ui';

/** Icônes provisoires du mermaid (Lot 2 : vraies icônes du design system). */
const TAB_ICONS = { home: '📊', plan: '🗓', sessions: '📚', profile: '👤' } as const;

function tabIcon(icon: string) {
  return function TabIcon({ size }: { size: number }) {
    return <Text style={{ fontSize: size - 4 }}>{icon}</Text>;
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon(TAB_ICONS.home) }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: t('tabs.plan'), tabBarIcon: tabIcon(TAB_ICONS.plan) }}
      />
      <Tabs.Screen
        name="seances"
        options={{ title: t('tabs.sessions'), tabBarIcon: tabIcon(TAB_ICONS.sessions) }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon(TAB_ICONS.profile) }}
      />
    </Tabs>
  );
}
