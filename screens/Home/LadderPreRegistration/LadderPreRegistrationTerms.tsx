import React from "react";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import LadderTermsView from "../../../components/ladder/LadderTermsView";

const LadderPreRegistrationTerms: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return <LadderTermsView onBack={() => navigation.goBack()} />;
};

export default LadderPreRegistrationTerms;
