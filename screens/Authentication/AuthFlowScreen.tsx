import React from "react";

import AuthFlow from "../../components/signup/AuthFlow";

/** The "Login" route: brand intro, log in, and sign up are all one flow. */
const AuthFlowScreen: React.FC = () => <AuthFlow initialStep="intro" />;

export const SignupEntry: React.FC = () => <AuthFlow initialStep="account" />;

export default AuthFlowScreen;
