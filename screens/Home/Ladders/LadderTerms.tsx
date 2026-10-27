import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

import LadderTermsView from "../../../components/ladder/LadderTermsView";

const LadderTerms: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  return <LadderTermsView onBack={() => navigation.goBack()} />;
};

export default LadderTerms;
