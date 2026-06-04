import { Router, type IRouter } from "express";
import { SearchAirportsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// Static airport list for autocomplete — extended with major airports.
// When the RapidAPI key is wired in, this can be replaced with a live lookup.
const AIRPORTS = [
  { iata: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom" },
  { iata: "LGW", name: "Gatwick Airport", city: "London", country: "United Kingdom" },
  { iata: "STN", name: "Stansted Airport", city: "London", country: "United Kingdom" },
  { iata: "LTN", name: "Luton Airport", city: "London", country: "United Kingdom" },
  { iata: "LCY", name: "London City Airport", city: "London", country: "United Kingdom" },
  { iata: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom" },
  { iata: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom" },
  { iata: "BHX", name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom" },
  { iata: "GLA", name: "Glasgow Airport", city: "Glasgow", country: "United Kingdom" },
  { iata: "BRS", name: "Bristol Airport", city: "Bristol", country: "United Kingdom" },
  { iata: "NCL", name: "Newcastle Airport", city: "Newcastle", country: "United Kingdom" },
  { iata: "LPL", name: "Liverpool John Lennon Airport", city: "Liverpool", country: "United Kingdom" },
  { iata: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { iata: "ORY", name: "Orly Airport", city: "Paris", country: "France" },
  { iata: "AMS", name: "Amsterdam Schiphol Airport", city: "Amsterdam", country: "Netherlands" },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { iata: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },
  { iata: "BER", name: "Berlin Brandenburg Airport", city: "Berlin", country: "Germany" },
  { iata: "MAD", name: "Adolfo Suárez Madrid–Barajas Airport", city: "Madrid", country: "Spain" },
  { iata: "BCN", name: "Barcelona–El Prat Airport", city: "Barcelona", country: "Spain" },
  { iata: "AGP", name: "Málaga–Costa del Sol Airport", city: "Málaga", country: "Spain" },
  { iata: "PMI", name: "Palma de Mallorca Airport", city: "Palma", country: "Spain" },
  { iata: "FCO", name: "Leonardo da Vinci–Fiumicino Airport", city: "Rome", country: "Italy" },
  { iata: "MXP", name: "Milan Malpensa Airport", city: "Milan", country: "Italy" },
  { iata: "VCE", name: "Venice Marco Polo Airport", city: "Venice", country: "Italy" },
  { iata: "NAP", name: "Naples International Airport", city: "Naples", country: "Italy" },
  { iata: "ATH", name: "Athens International Airport", city: "Athens", country: "Greece" },
  { iata: "HER", name: "Heraklion International Airport", city: "Heraklion", country: "Greece" },
  { iata: "RHO", name: "Rhodes International Airport", city: "Rhodes", country: "Greece" },
  { iata: "SKG", name: "Thessaloniki Airport", city: "Thessaloniki", country: "Greece" },
  { iata: "LIS", name: "Humberto Delgado Airport", city: "Lisbon", country: "Portugal" },
  { iata: "OPO", name: "Francisco Sá Carneiro Airport", city: "Porto", country: "Portugal" },
  { iata: "FAO", name: "Faro Airport", city: "Faro", country: "Portugal" },
  { iata: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland" },
  { iata: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },
  { iata: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland" },
  { iata: "VIE", name: "Vienna International Airport", city: "Vienna", country: "Austria" },
  { iata: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic" },
  { iata: "BUD", name: "Budapest Ferenc Liszt International Airport", city: "Budapest", country: "Hungary" },
  { iata: "WAW", name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland" },
  { iata: "KRK", name: "Kraków John Paul II Airport", city: "Kraków", country: "Poland" },
  { iata: "SVO", name: "Sheremetyevo International Airport", city: "Moscow", country: "Russia" },
  { iata: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
  { iata: "LGA", name: "LaGuardia Airport", city: "New York", country: "United States" },
  { iata: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "United States" },
  { iata: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States" },
  { iata: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "United States" },
  { iata: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States" },
  { iata: "MIA", name: "Miami International Airport", city: "Miami", country: "United States" },
  { iata: "BOS", name: "Boston Logan International Airport", city: "Boston", country: "United States" },
  { iata: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "United States" },
  { iata: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", country: "United States" },
  { iata: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada" },
  { iata: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada" },
  { iata: "YUL", name: "Montréal-Trudeau International Airport", city: "Montreal", country: "Canada" },
  { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE" },
  { iata: "AUH", name: "Abu Dhabi International Airport", city: "Abu Dhabi", country: "UAE" },
  { iata: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar" },
  { iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
  { iata: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },
  { iata: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
  { iata: "HND", name: "Haneda Airport", city: "Tokyo", country: "Japan" },
  { iata: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
  { iata: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China" },
  { iata: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China" },
  { iata: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "CGK", name: "Soekarno–Hatta International Airport", city: "Jakarta", country: "Indonesia" },
  { iata: "DEL", name: "Indira Gandhi International Airport", city: "Delhi", country: "India" },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },
  { iata: "GRU", name: "São Paulo–Guarulhos International Airport", city: "São Paulo", country: "Brazil" },
  { iata: "GIG", name: "Rio de Janeiro–Galeão International Airport", city: "Rio de Janeiro", country: "Brazil" },
  { iata: "EZE", name: "Ministro Pistarini International Airport", city: "Buenos Aires", country: "Argentina" },
  { iata: "MEX", name: "Mexico City International Airport", city: "Mexico City", country: "Mexico" },
  { iata: "JNB", name: "O.R. Tambo International Airport", city: "Johannesburg", country: "South Africa" },
  { iata: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa" },
  { iata: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt" },
  { iata: "HRG", name: "Hurghada International Airport", city: "Hurghada", country: "Egypt" },
  { iata: "SSH", name: "Sharm el-Sheikh International Airport", city: "Sharm el-Sheikh", country: "Egypt" },
  { iata: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },
  { iata: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia" },
  { iata: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },
  { iata: "TFS", name: "Tenerife South Airport", city: "Tenerife", country: "Spain" },
  { iata: "LPA", name: "Gran Canaria Airport", city: "Las Palmas", country: "Spain" },
  { iata: "IBZ", name: "Ibiza Airport", city: "Ibiza", country: "Spain" },
  { iata: "ALC", name: "Alicante–Elche Miguel Hernández Airport", city: "Alicante", country: "Spain" },
  { iata: "SVQ", name: "Seville Airport", city: "Seville", country: "Spain" },
  { iata: "ZTH", name: "Zakynthos International Airport", city: "Zakynthos", country: "Greece" },
  { iata: "CFU", name: "Corfu International Airport", city: "Corfu", country: "Greece" },
  { iata: "KGS", name: "Kos Island International Airport", city: "Kos", country: "Greece" },
  { iata: "CHQ", name: "Chania International Airport", city: "Chania", country: "Greece" },
  { iata: "OLB", name: "Olbia Costa Smeralda Airport", city: "Olbia", country: "Italy" },
  { iata: "CTA", name: "Catania–Fontanarossa Airport", city: "Catania", country: "Italy" },
  { iata: "REK", name: "Keflavik International Airport", city: "Reykjavik", country: "Iceland" },
  { iata: "KEF", name: "Keflavik International Airport", city: "Reykjavik", country: "Iceland" },
];

router.get("/airports/search", async (req, res): Promise<void> => {
  const parsed = SearchAirportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const q = parsed.data.q.toLowerCase().trim();

  if (q.length < 1) {
    res.json([]);
    return;
  }

  const matches = AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q),
  ).slice(0, 10);

  req.log.info({ q, count: matches.length }, "Airport search");
  res.json(matches);
});

export default router;
