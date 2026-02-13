import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

function TabBarIcon({ name, focused }: { name: any; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={name} 
        size={22} 
        color={focused ? colors.yellow : colors.gray600} 
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.gray600,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Descobrir',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: 'Lugares',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'location' : 'location-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="date"
        options={{
          title: 'Date',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'heart' : 'heart-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.black,
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.black,
  },
});
