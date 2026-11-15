import React from "react";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import LadderRulesView from "../../../components/ladder/LadderRulesView";

type RulesRoute = RouteProp<
  { LadderPreRegistrationRules: { ladderType?: string } },
  "LadderPreRegistrationRules"
>;

const LadderPreRegistrationRules: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute<RulesRoute>();
  return (
    <LadderRulesView
      ladderType={params?.ladderType}
      onBack={() => navigation.goBack()}
    />
  );
};

export default LadderPreRegistrationRules;
