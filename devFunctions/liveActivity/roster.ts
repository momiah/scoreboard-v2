export type SeedCity = "London" | "Manchester" | "Birmingham" | "Bristol";

export interface RosterEntry {
  firstName: string;
  lastName: string;
  username: string;
  city: SeedCity;
  handPreference: "Right" | "Left";
}

const parse = (city: SeedCity, rows: string): RosterEntry[] =>
  rows
    .trim()
    .split("\n")
    .map((row) => {
      const [name, username, hand] = row.trim().split("|");
      const [firstName, ...rest] = name.split(" ");
      return {
        firstName,
        lastName: rest.join(" "),
        username,
        city,
        handPreference: hand === "L" ? "Left" : "Right",
      };
    });

const LONDON = parse(
  "London",
  `
Arjun Patel|ArjunP|R
Sophie Clarke|sophclarke|R
Daniel Okafor|DanOk|R
Hannah Wright|hanwright|L
Imran Hussain|ImranH7|R
Chloe Bennett|chloeb|R
Kwame Mensah|KwameM|R
Priya Sharma|priyash|R
Tom Gallagher|TomG92|R
Mei Lin Chen|meilin|R
Rhys Edwards|rhysedw|R
Fatima Begum|FatBegum|R
Oliver Hughes|OllieH|L
Aisha Rahman|aisharah|R
Jamal Ahmed|Jamal-A|R
Grace Thompson|gracet|R
Wei Zhang|WeiZ|R
Ella Murphy|ellamurph|R
Samuel Adeyemi|SamAde|R
Ruby Palmer|rubyp|R
Nikhil Desai|NikD|R
Lucy Harrison|lucyhar|R
Kofi Asante|KofiA|R
Zara Malik|zaramalik|R
James Fletcher|jfletch|R
Hiroshi Tanaka|HiroT|R
Amelia Price|ameliap|L
Bilal Choudhury|BilalC|R
Freya Collins|freyac|R
Marcus Reid|MarcusR|R
Anjali Mehta|anjalim|R
Callum Ross|callumr|R
Yusuf Ali|YusufA|R
Isabel Moreno|isamoreno|R
Ethan Brooks|EthanB|R
Shreya Iyer|shreyai|R
Tobi Bakare|TobiB|R
Holly Jenkins|hollyj|R
Raj Kapoor|RajK88|R
Jessica Hall|jesshall|R
Kenji Watanabe|kenjiw|L
Sana Qureshi|sanaq|R
Luke Barnes|LukeB|R
Ngozi Eze|ngozie|R
Harvey Cole|HarvCole|R
Tasnim Islam|tasnimi|R
David Kowalski|DaveKow|R
Rosie Ward|rosiew|R
Aaron Fernandes|AaronF|R
Leah Morgan|leahm|R
Haris Mahmood|HarisM|R
Jade Robinson|jaderob|R
Vikram Singh|VikS|R
Maya Kaur|mayakaur|R
Connor Walsh|ConnorW|R
Eun-ji Park|eunjip|R
Ibrahim Sesay|IbbySesay|R
Phoebe Turner|phoebet|R
Andre Campbell|DreCamp|R
Nadia Hassan|nadiah|R
Josh Marshall|joshmarsh|R
Lily Nguyen|lilyng|R
Ravi Gupta|RaviG|L
Olivia Hart|livhart|R
Danny Liu|DannyL|R
Ayesha Siddiqui|ayeshas|R
Max Pearson|maxp|R
Chiamaka Obi|chiobi|R
Adam Novak|AdamN|R
Sienna Lewis|siennal|R
Farhan Uddin|FarhanU|R
Bethany King|bethk|R
`,
);

const MANCHESTER = parse(
  "Manchester",
  `
Ryan Doherty|RyanD|R
Amira Khan|amirak|R
Liam Fitzgerald|LiamFitz|R
Neha Joshi|nehaj|R
Owen Riley|OwenR|R
Saira Akhtar|sairaa|R
Jack Holden|JackH|R
Hui Min Tan|huimin|R
Adnan Rashid|AdnanR|R
Megan Price|megp|R
Chinedu Okeke|ChiOk|R
Laura Whitehead|lauraw|R
Zain Mirza|ZainM|R
Abbie Shaw|abbies|R
Matt Cooper|MattC|L
Rekha Patel|rekhap|R
Lewis Hartley|LewisH|R
Jasmine Lee|jaslee|R
Hamza Iqbal|HamzaI|R
Katie Brennan|katieb|R
Sean O'Brien|SeanOB|R
Mariam Ahmed|mariama|R
Ben Ashworth|BenAsh|R
Lan Pham|lanpham|R
Kieran Moss|KieranM|R
Shabnam Ali|shabnam|R
Tyler Grant|TylerG|R
Yasmin Hussain|yasminh|R
Joe Platt|JoePlatt|R
Ana Silva|anasilva|R
Usman Tariq|UsmanT|R
Georgia Hunt|georgiah|R
Kai Wong|KaiW|L
Rachel Byrne|rachb|R
Nathan Ellis|NathanE|R
Hina Butt|hinab|R
`,
);

const BIRMINGHAM = parse(
  "Birmingham",
  `
Sunil Rao|SunilR|R
Emily Carter|emcarter|R
Asif Hussain|AsifH|R
Charlotte Day|charday|R
Jordan Francis|JordanF|R
Manpreet Gill|ManpreetG|R
Harry Bolton|HarryB|R
Simran Bains|simranb|R
Dominic Ward|DomWard|R
Uzma Khan|uzmak|R
Kevin Tran|KevinT|L
Molly Evans|mollye|R
Tariq Mahmood|TariqM|R
Naomi Okonkwo|naomio|R
Gurdeep Sandhu|GurdeepS|R
Kirsty Holmes|kirstyh|R
Aman Dhillon|AmanD|R
Jonah Pryce|JonahP|R
`,
);

const BRISTOL = parse(
  "Bristol",
  `
Alex Sutton|AlexS|R
Poppy Fisher|poppyf|R
Rohan Nair|RohanN|R
Isla Grant|islag|R
Will Chapman|WillC|R
Seo-yeon Kim|seoyeon|R
Jamie Lawson|JamieL|L
Hana Yusuf|hanay|R
George Webb|GeorgeW|R
Tara Quinn|taraq|R
Ahmed Farah|AhmedF|R
Katy Moore|katym|R
Pete Dawson|PeteD|R
Divya Menon|divyam|R
Finn O'Connor|FinnOC|R
Lauren Baker|laurenb|R
Mohammed Saleh|MoSaleh|R
Esme Taylor|esmet|R
`,
);

export const ROSTER: RosterEntry[] = [
  ...LONDON,
  ...MANCHESTER,
  ...BIRMINGHAM,
  ...BRISTOL,
];

export const SEED_CITY_LOCATIONS: Record<
  SeedCity,
  { city: string; country: string; countryCode: string }
> = {
  London: { city: "London", country: "United Kingdom", countryCode: "GB" },
  Manchester: {
    city: "Manchester",
    country: "United Kingdom",
    countryCode: "GB",
  },
  Birmingham: {
    city: "Birmingham",
    country: "United Kingdom",
    countryCode: "GB",
  },
  Bristol: { city: "Bristol", country: "United Kingdom", countryCode: "GB" },
};
