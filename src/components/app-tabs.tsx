import { Tabs } from 'expo-router';
import { Image, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

type TabIconProps = {
  color: string;
  source: number;
};

function TabIcon({ color, source }: TabIconProps) {
  return <Image source={source} style={{ width: 24, height: 24, tintColor: color }} />;
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '지도',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} source={require('@/assets/images/tabIcons/home.png')} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '마커',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} source={require('@/assets/images/tabIcons/explore.png')} />
          ),
        }}
      />
    </Tabs>
  );
}

