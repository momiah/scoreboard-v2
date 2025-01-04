export const transformDate = (dateString) => {
  // Parse the date string into its components
  const [day, month, year] = dateString.split("-").map(Number);

  // Define an array of month names
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Function to get the ordinal suffix for a day
  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th"; // All teens are 'th'
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  // Get the month name and the ordinal suffix
  const monthName = monthNames[month - 1];
  const ordinalSuffix = getOrdinalSuffix(day);

  // Construct and return the formatted date string
  return `${day}${ordinalSuffix} ${monthName} ${year}`;
};

export const capitalizeFirstLetter = (str) => {
  if (!str) return ''; // Handle empty or null strings
  return str.charAt(0).toUpperCase() + str.slice(1);
};