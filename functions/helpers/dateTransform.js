const transformDate = (dateString) => {
  try {
    // Validate input
    if (!dateString || typeof dateString !== 'string') {
      console.error('Invalid date string provided to transformDate:', dateString);
      return 'Invalid Date';
    }

    // Parse the date string into its components
    const parts = dateString.split("-");
    if (parts.length !== 3) {
      console.error('Date string must be in DD-MM-YYYY format:', dateString);
      return dateString; // Return original string if format is wrong
    }

    const [day, month, year] = parts.map(Number);

    // Validate parsed values
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      console.error('Date parts are not valid numbers:', dateString);
      return dateString;
    }

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
      console.error('Date values out of valid range:', dateString);
      return dateString;
    }

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
  } catch (error) {
    console.error('Error in transformDate:', error);
    return dateString || 'Invalid Date';
  }
};

module.exports = { transformDate };
