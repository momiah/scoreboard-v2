import React, { useContext } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import LadderRulesView from "../../../components/ladder/LadderRulesView";
import { LadderContext } from "../../../context/LadderContext";

const LadderRules: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, { ladderId?: string }>, string>>();
  const { ladderById } = useContext(LadderContext);
  const ladderType =
    ladderById && ladderById.ladderId === route.params?.ladderId
      ? ladderById.ladderType
      : undefined;

  return (
    <LadderRulesView
      ladderType={ladderType}
      onBack={() => navigation.goBack()}
    />
  );
};

export default LadderRules;
