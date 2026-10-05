import {Redirect} from "expo-router";
import type React from "react";

const HomeScreen = (): React.ReactElement => <Redirect href="/today" />;

export default HomeScreen;
