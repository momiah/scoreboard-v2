import React, { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { AppEventsLogger } from "react-native-fbsdk-next";

import SignupIntroFlow from "../../components/signup/SignupIntroFlow";
import { UserContext } from "../../context/UserContext";

type LoginEventNames = {
  AppEvents: { Login: string };
  AppEventParams: { RegistrationMethod: string };
};

const SignupIntroScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getUserById, setCurrentUser } = useContext(UserContext);

  const exitToApp = () =>
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });

  const onSignedIn = (profile: Record<string, unknown>, method: string) => {
    const { AppEvents, AppEventParams } =
      AppEventsLogger as unknown as LoginEventNames;
    setCurrentUser(profile);
    AppEventsLogger.logEvent(AppEvents.Login, {
      [AppEventParams.RegistrationMethod]: method,
    });
    exitToApp();
  };

  const onCreateLeague = () => {
    const tabs = navigation.getParent();
    exitToApp();
    tabs?.navigate("Competitions");
  };

  return (
    <SignupIntroFlow
      getUserById={getUserById}
      setCurrentUser={setCurrentUser}
      onLogin={() => navigation.navigate("Login")}
      onSignedIn={onSignedIn}
      onExplore={exitToApp}
      onCreateLeague={onCreateLeague}
    />
  );
};

export default SignupIntroScreen;
