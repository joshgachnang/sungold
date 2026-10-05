import FontAwesome from "@expo/vector-icons/FontAwesome";
import {useTheme} from "@terreno/ui";
import {type Href, router, Tabs, usePathname} from "expo-router";
import type React from "react";
import {useCallback, useState} from "react";
import type {ColorValue} from "react-native";
import {
  Text as NativeText,
  Pressable,
  useWindowDimensions,
  View,
  type ViewProps,
} from "react-native";
import {useGetMeQuery} from "@/store/sdk";

interface DashboardNavigationItem {
  testID: string;
  tabIconName: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  route: string;
}

const MAIN_NAV_ITEMS: DashboardNavigationItem[] = [
  {label: "Today", route: "today", tabIconName: "home", testID: "nav-today"},
  {
    label: "Focus",
    route: "focus",
    tabIconName: "bullseye",
    testID: "nav-focus",
  },
  {
    label: "History",
    route: "history",
    tabIconName: "bar-chart",
    testID: "nav-history",
  },
  {
    label: "Blocklists",
    route: "blocklists",
    tabIconName: "list",
    testID: "nav-blocklists",
  },
  {
    label: "Devices",
    route: "devices",
    tabIconName: "desktop",
    testID: "nav-devices",
  },
];

const PROFILE_NAV_ITEM: DashboardNavigationItem = {
  label: "Profile",
  route: "profile",
  tabIconName: "user",
  testID: "nav-profile",
};
const ADMIN_NAV_ITEM: DashboardNavigationItem = {
  label: "Admin",
  route: "admin",
  tabIconName: "cog",
  testID: "nav-admin",
};

const SIDEBAR_COLLAPSED_WIDTH = 65;
const SIDEBAR_EXPANDED_WIDTH = 220;
const SIDEBAR_MIN_WIDTH = 768;

const TabBarIcon: React.FC<{
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: ColorValue;
}> = ({name, color}) => {
  return <FontAwesome color={color} name={name} size={24} style={{marginBottom: -3}} />;
};

const hrefForRoute = (route: string): Href => `/${route}` as Href;

const SidebarNavigationRail: React.FC<{
  bottomItems: DashboardNavigationItem[];
  topItems: DashboardNavigationItem[];
}> = ({bottomItems, topItems}) => {
  const {theme} = useTheme();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const activeRoute = pathname.split("/").filter(Boolean)[0] ?? "today";
  const handleHoverIn = useCallback(() => setIsExpanded(true), []);
  const handleHoverOut = useCallback(() => setIsExpanded(false), []);

  const railWidth = isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
  const renderItem = useCallback(
    (item: DashboardNavigationItem): React.ReactNode => {
      const isActive = activeRoute === item.route;
      const itemColor = isActive ? theme.text.primary : theme.text.secondaryLight;
      return (
        <Pressable
          accessibilityLabel={item.label}
          accessibilityRole="button"
          key={item.route}
          onPress={() => router.push(hrefForRoute(item.route))}
          style={{
            alignItems: "center",
            backgroundColor: isActive ? theme.surface.neutralLight : "transparent",
            borderRadius: theme.radius.default,
            flexDirection: "row",
            gap: 12,
            height: 44,
            justifyContent: isExpanded ? undefined : "center",
            marginHorizontal: 8,
            paddingHorizontal: 12,
          }}
          testID={item.testID}
        >
          <View style={{alignItems: "center", justifyContent: "center", width: 20}}>
            <FontAwesome color={itemColor} name={item.tabIconName} size={20} />
          </View>
          {isExpanded ? (
            <NativeText
              style={{
                color: itemColor,
                fontSize: 16,
                fontWeight: isActive ? "700" : "400",
              }}
            >
              {item.label}
            </NativeText>
          ) : null}
        </Pressable>
      );
    },
    [activeRoute, isExpanded, theme]
  );

  return (
    <View
      {...({onMouseEnter: handleHoverIn, onMouseLeave: handleHoverOut} as unknown as ViewProps)}
      style={{
        backgroundColor: theme.surface.base,
        borderColor: theme.border.default,
        borderRightWidth: 1,
        bottom: 0,
        justifyContent: "space-between",
        left: 0,
        overflow: "hidden",
        paddingVertical: 12,
        position: "absolute",
        top: 0,
        width: railWidth,
        zIndex: 20,
      }}
    >
      <View style={{gap: 4}}>{topItems.map(renderItem)}</View>
      <View style={{gap: 4}}>{bottomItems.map(renderItem)}</View>
    </View>
  );
};

const TabLayout: React.FC = () => {
  const {theme} = useTheme();
  const {width} = useWindowDimensions();
  const {data: me} = useGetMeQuery();
  const includeAdmin = me?.admin === true;
  const bottomItems = includeAdmin ? [PROFILE_NAV_ITEM, ADMIN_NAV_ITEM] : [PROFILE_NAV_ITEM];
  const isWide = width >= SIDEBAR_MIN_WIDTH;

  if (isWide) {
    return (
      <View style={{flex: 1}}>
        <View style={{flex: 1, marginLeft: SIDEBAR_COLLAPSED_WIDTH}}>
          <Tabs initialRouteName="today" screenOptions={{headerShown: false}} tabBar={() => null}>
            <Tabs.Screen name="index" options={{href: null}} />
            <Tabs.Screen name="today" options={{title: "Today"}} />
            <Tabs.Screen name="focus" options={{title: "Focus"}} />
            <Tabs.Screen name="history" options={{title: "History"}} />
            <Tabs.Screen name="blocklists" options={{title: "Blocklists"}} />
            <Tabs.Screen name="devices" options={{title: "Devices"}} />
            <Tabs.Screen name="profile" options={{title: "Profile"}} />
            <Tabs.Screen
              name="admin"
              options={{href: includeAdmin ? "/admin" : null, title: "Admin"}}
            />
          </Tabs>
        </View>
        <SidebarNavigationRail bottomItems={bottomItems} topItems={MAIN_NAV_ITEMS} />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.surface.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          tabBarButtonTestID: MAIN_NAV_ITEMS[0].testID,
          tabBarIcon: ({color}) => (
            <TabBarIcon color={color} name={MAIN_NAV_ITEMS[0].tabIconName} />
          ),
          title: "Today",
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          tabBarButtonTestID: MAIN_NAV_ITEMS[1].testID,
          tabBarIcon: ({color}) => (
            <TabBarIcon color={color} name={MAIN_NAV_ITEMS[1].tabIconName} />
          ),
          title: "Focus",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarButtonTestID: MAIN_NAV_ITEMS[2].testID,
          tabBarIcon: ({color}) => (
            <TabBarIcon color={color} name={MAIN_NAV_ITEMS[2].tabIconName} />
          ),
          title: "History",
        }}
      />
      <Tabs.Screen
        name="blocklists"
        options={{
          tabBarButtonTestID: MAIN_NAV_ITEMS[3].testID,
          tabBarIcon: ({color}) => (
            <TabBarIcon color={color} name={MAIN_NAV_ITEMS[3].tabIconName} />
          ),
          title: "Blocklists",
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          tabBarButtonTestID: MAIN_NAV_ITEMS[4].testID,
          tabBarIcon: ({color}) => (
            <TabBarIcon color={color} name={MAIN_NAV_ITEMS[4].tabIconName} />
          ),
          title: "Devices",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButtonTestID: PROFILE_NAV_ITEM.testID,
          tabBarIcon: ({color}) => <TabBarIcon color={color} name={PROFILE_NAV_ITEM.tabIconName} />,
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: includeAdmin ? "/admin" : null,
          tabBarButtonTestID: ADMIN_NAV_ITEM.testID,
          tabBarIcon: ({color}) => <TabBarIcon color={color} name={ADMIN_NAV_ITEM.tabIconName} />,
          title: "Admin",
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
