import React from "react";

import Tag from "../../../components/Tag";

const LeagueRoleTag = ({ userRole, onInvitePress, onLoginPress, onRequestJoinPress }) => {
    switch (userRole) {
        case "participant":
            return (
                <Tag
                    name="Participant"
                    color="#16181B"
                    iconColor="green"
                    iconSize={15}
                    icon="checkmark-circle-outline"
                    iconPosition="right"
                    bold
                />
            );
        case "admin":
            return (
                <Tag
                    name="Invite Players"
                    color="#00A2FF"
                    icon="paper-plane-sharp"
                    onPress={onInvitePress}
                    bold
                />
            );
        case "hide":
            return (
                <Tag
                    name="Log in to join league"
                    color="#00A2FF"
                    iconColor="white"
                    iconSize={15}
                    icon="log-in-outline"
                    iconPosition="right"
                    onPress={onLoginPress}
                    bold
                />
            );
        case "user":
            return (
                <Tag
                    name="Request To Join"
                    color="#00A2FF"
                    iconColor="white"
                    iconSize={15}
                    icon="person-add-outline"
                    iconPosition="right"
                    onPress={onRequestJoinPress}
                    bold
                />
            );
        case "invitationPending":
            return (
                <Tag
                    name="Invitation Pending"
                    color="#4a4a4aff"
                    iconColor="white"
                    iconSize={15}
                    icon="time-outline"
                    iconPosition="right"
                    bold
                />
            );
        case "requestPending":
            return (
                <Tag
                    name="Request Pending"
                    color="#4a4a4aff"
                    iconColor="white"
                    iconSize={15}
                    icon="time-outline"
                    iconPosition="right"
                    bold
                />
            );
        default:
            return null;
    }
};



export default LeagueRoleTag;
