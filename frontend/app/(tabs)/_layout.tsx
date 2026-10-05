import FontAwesome from "@expo/vector-icons/FontAwesome";
import {useTheme} from "@terreno/ui";
import {Tabs} from "expo-router";
import type React from "react";
import type {ColorValue} from "react-native";

const TabBarIcon: React.FC<{
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: ColorValue;
}> = ({name, color}) => {
  return <FontAwesome color={color} name={name} size={24} style={{marginBottom: -3}} />;
};

const TabLayout: React.FC = () => {
  const {theme} = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.surface.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({color}) => <TabBarIcon color={color} name="home" />,
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          tabBarIcon: ({color}) => <TabBarIcon color={color} name="bullseye" />,
          title: "Focus",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({color}) => <TabBarIcon color={color} name="user" />,
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          headerShown: false,
          tabBarIcon: ({color}) => <TabBarIcon color={color} name="cog" />,
          title: "Admin",
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
