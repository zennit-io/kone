import {useColorScheme} from "@zenncore/hooks/native";
import {DrawerRootProvider} from "@zennui/native/drawer";
import {PortalHost} from "@zennui/native/portal";
import {StatusBar} from "expo-status-bar";
import type {PropsWithChildren} from "react";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {ThemeProvider} from "./theme-provider";
import {ConvexProvider} from "@/components/providers/convex-provider";

export const Providers = ({ children }: PropsWithChildren) => {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ConvexProvider>
      <ThemeProvider>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DrawerRootProvider>{children}</DrawerRootProvider>
          {/*<Toaster />*/}
          <PortalHost />
        </GestureHandlerRootView>
      </ThemeProvider>
    </ConvexProvider>
  );
};
