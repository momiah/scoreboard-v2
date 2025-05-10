export const getLeagueLocationDetails = (courtData, selectedLocation) => {
  const locations = courtData.find(
    (court) => court.id === selectedLocation.key
  );

  return {
    ...locations.location,
    courtName: locations.courtName,
    courtId: locations.id,
  };
};
