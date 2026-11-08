/**
 * Complete first-level administrative divisions for every country in the app
 * (regions / states / provinces / districts / cantons ...). The UI label per
 * country already exists; this fills the data behind the region dropdown.
 *
 * Additive and idempotent: it only INSERTS missing rows, matched per country by
 * accent- and case-insensitive name. It never updates or deletes anything.
 *
 *   node scripts/seed-country-regions.cjs            dry run: prints what would be added
 *   node scripts/seed-country-regions.cjs --sql      prints the INSERT statements
 *   DATABASE_URL=... node scripts/seed-country-regions.cjs --apply
 */

const DIVISIONS = {
  DZ: "Adrar,Chlef,Laghouat,Oum El Bouaghi,Batna,Béjaïa,Biskra,Béchar,Blida,Bouira,Tamanrasset,Tébessa,Tlemcen,Tiaret,Tizi Ouzou,Alger,Djelfa,Jijel,Sétif,Saïda,Skikda,Sidi Bel Abbès,Annaba,Guelma,Constantine,Médéa,Mostaganem,M'Sila,Mascara,Ouargla,Oran,El Bayadh,Illizi,Bordj Bou Arréridj,Boumerdès,El Tarf,Tindouf,Tissemsilt,El Oued,Khenchela,Souk Ahras,Tipaza,Mila,Aïn Defla,Naâma,Aïn Témouchent,Ghardaïa,Relizane,Timimoun,Bordj Badji Mokhtar,Ouled Djellal,Béni Abbès,In Salah,In Guezzam,Touggourt,Djanet,El M'Ghair,El Meniaa",
  BE: "Flanders,Wallonia,Brussels-Capital Region",
  BJ: "Alibori,Atacora,Atlantique,Borgou,Collines,Couffo,Donga,Littoral,Mono,Ouémé,Plateau,Zou",
  BR: "Acre,Alagoas,Amapá,Amazonas,Bahia,Ceará,Distrito Federal,Espírito Santo,Goiás,Maranhão,Mato Grosso,Mato Grosso do Sul,Minas Gerais,Pará,Paraíba,Paraná,Pernambuco,Piauí,Rio de Janeiro,Rio Grande do Norte,Rio Grande do Sul,Rondônia,Roraima,Santa Catarina,São Paulo,Sergipe,Tocantins",
  BF: "Boucle du Mouhoun,Cascades,Centre,Centre-Est,Centre-Nord,Centre-Ouest,Centre-Sud,Est,Hauts-Bassins,Nord,Plateau-Central,Sahel,Sud-Ouest",
  CM: "Adamaoua,Centre,Est,Extrême-Nord,Littoral,Nord,Nord-Ouest,Ouest,Sud,Sud-Ouest",
  CA: "Alberta,British Columbia,Manitoba,New Brunswick,Newfoundland and Labrador,Nova Scotia,Ontario,Prince Edward Island,Quebec,Saskatchewan,Northwest Territories,Nunavut,Yukon",
  CN: "Anhui,Beijing,Chongqing,Fujian,Gansu,Guangdong,Guangxi,Guizhou,Hainan,Hebei,Heilongjiang,Henan,Hong Kong,Hubei,Hunan,Inner Mongolia,Jiangsu,Jiangxi,Jilin,Liaoning,Macau,Ningxia,Qinghai,Shaanxi,Shandong,Shanghai,Shanxi,Sichuan,Tianjin,Tibet,Xinjiang,Yunnan,Zhejiang",
  CG: "Bouenza,Brazzaville,Cuvette,Cuvette-Ouest,Kouilou,Lékoumou,Likouala,Niari,Plateaux,Pointe-Noire,Pool,Sangha",
  CI: "Abidjan,Bas-Sassandra,Comoé,Denguélé,Gôh-Djiboua,Lacs,Lagunes,Montagnes,Sassandra-Marahoué,Savanes,Vallée du Bandama,Woroba,Yamoussoukro,Zanzan",
  CD: "Bas-Uélé,Équateur,Haut-Katanga,Haut-Lomami,Haut-Uélé,Ituri,Kasaï,Kasaï-Central,Kasaï-Oriental,Kinshasa,Kongo Central,Kwango,Kwilu,Lomami,Lualaba,Mai-Ndombe,Maniema,Mongala,Nord-Kivu,Nord-Ubangi,Sankuru,Sud-Kivu,Sud-Ubangi,Tanganyika,Tshopo,Tshuapa",
  FR: "Auvergne-Rhône-Alpes,Bourgogne-Franche-Comté,Bretagne,Centre-Val de Loire,Corse,Grand Est,Hauts-de-France,Île-de-France,Normandie,Nouvelle-Aquitaine,Occitanie,Pays de la Loire,Provence-Alpes-Côte d'Azur,Guadeloupe,Martinique,Guyane,La Réunion,Mayotte",
  GA: "Estuaire,Haut-Ogooué,Moyen-Ogooué,Ngounié,Nyanga,Ogooué-Ivindo,Ogooué-Lolo,Ogooué-Maritime,Woleu-Ntem",
  DE: "Baden-Württemberg,Bavaria,Berlin,Brandenburg,Bremen,Hamburg,Hesse,Lower Saxony,Mecklenburg-Vorpommern,North Rhine-Westphalia,Rhineland-Palatinate,Saarland,Saxony,Saxony-Anhalt,Schleswig-Holstein,Thuringia",
  GN: "Boké,Conakry,Faranah,Kankan,Kindia,Labé,Mamou,Nzérékoré",
  HT: "Artibonite,Centre,Grand'Anse,Nippes,Nord,Nord-Est,Nord-Ouest,Ouest,Sud,Sud-Est",
  IN: "Andhra Pradesh,Arunachal Pradesh,Assam,Bihar,Chhattisgarh,Goa,Gujarat,Haryana,Himachal Pradesh,Jharkhand,Karnataka,Kerala,Madhya Pradesh,Maharashtra,Manipur,Meghalaya,Mizoram,Nagaland,Odisha,Punjab,Rajasthan,Sikkim,Tamil Nadu,Telangana,Tripura,Uttar Pradesh,Uttarakhand,West Bengal,Andaman and Nicobar Islands,Chandigarh,Dadra and Nagar Haveli and Daman and Diu,Delhi,Jammu and Kashmir,Ladakh,Lakshadweep,Puducherry",
  IT: "Abruzzo,Basilicata,Calabria,Campania,Emilia-Romagna,Friuli-Venezia Giulia,Lazio,Liguria,Lombardy,Marche,Molise,Piedmont,Puglia,Sardinia,Sicily,Trentino-Alto Adige,Tuscany,Umbria,Aosta Valley,Veneto",
  JP: "Hokkaido,Aomori,Iwate,Miyagi,Akita,Yamagata,Fukushima,Ibaraki,Tochigi,Gunma,Saitama,Chiba,Tokyo,Kanagawa,Niigata,Toyama,Ishikawa,Fukui,Yamanashi,Nagano,Gifu,Shizuoka,Aichi,Mie,Shiga,Kyoto,Osaka,Hyogo,Nara,Wakayama,Tottori,Shimane,Okayama,Hiroshima,Yamaguchi,Tokushima,Kagawa,Ehime,Kochi,Fukuoka,Saga,Nagasaki,Kumamoto,Oita,Miyazaki,Kagoshima,Okinawa",
  MG: "Alaotra-Mangoro,Amoron'i Mania,Analamanga,Analanjirofo,Androy,Anosy,Atsimo-Andrefana,Atsimo-Atsinanana,Atsinanana,Betsiboka,Boeny,Bongolava,Diana,Haute Matsiatra,Ihorombe,Itasy,Melaky,Menabe,Sava,Sofia,Vakinankaratra,Vatovavy",
  ML: "Bamako,Gao,Kayes,Kidal,Koulikoro,Ménaka,Mopti,Ségou,Sikasso,Taoudénit,Tombouctou",
  MX: "Aguascalientes,Baja California,Baja California Sur,Campeche,Chiapas,Chihuahua,Ciudad de México,Coahuila,Colima,Durango,Guanajuato,Guerrero,Hidalgo,Jalisco,México,Michoacán,Morelos,Nayarit,Nuevo León,Oaxaca,Puebla,Querétaro,Quintana Roo,San Luis Potosí,Sinaloa,Sonora,Tabasco,Tamaulipas,Tlaxcala,Veracruz,Yucatán,Zacatecas",
  MA: "Tanger-Tétouan-Al Hoceïma,L'Oriental,Fès-Meknès,Rabat-Salé-Kénitra,Béni Mellal-Khénifra,Casablanca-Settat,Marrakech-Safi,Drâa-Tafilalet,Souss-Massa,Guelmim-Oued Noun,Laâyoune-Sakia El Hamra,Dakhla-Oued Ed-Dahab",
  NE: "Agadez,Diffa,Dosso,Maradi,Niamey,Tahoua,Tillabéri,Zinder",
  NG: "Abia,Adamawa,Akwa Ibom,Anambra,Bauchi,Bayelsa,Benue,Borno,Cross River,Delta,Ebonyi,Edo,Ekiti,Enugu,Federal Capital Territory,Gombe,Imo,Jigawa,Kaduna,Kano,Katsina,Kebbi,Kogi,Kwara,Lagos,Nasarawa,Niger,Ogun,Ondo,Osun,Oyo,Plateau,Rivers,Sokoto,Taraba,Yobe,Zamfara",
  PT: "Aveiro,Beja,Braga,Bragança,Castelo Branco,Coimbra,Évora,Faro,Guarda,Leiria,Lisboa,Portalegre,Porto,Santarém,Setúbal,Viana do Castelo,Vila Real,Viseu,Açores,Madeira",
  SN: "Dakar,Diourbel,Fatick,Kaffrine,Kaolack,Kédougou,Kolda,Louga,Matam,Saint-Louis,Sédhiou,Tambacounda,Thiès,Ziguinchor",
  ZA: "Eastern Cape,Free State,Gauteng,KwaZulu-Natal,Limpopo,Mpumalanga,North West,Northern Cape,Western Cape",
  ES: "Andalucía,Aragón,Asturias,Illes Balears,Canarias,Cantabria,Castilla-La Mancha,Castilla y León,Cataluña,Comunidad Valenciana,Extremadura,Galicia,La Rioja,Comunidad de Madrid,Región de Murcia,Navarra,País Vasco,Ceuta,Melilla",
  CH: "Aargau,Appenzell Ausserrhoden,Appenzell Innerrhoden,Basel-Landschaft,Basel-Stadt,Bern,Fribourg,Genève,Glarus,Graubünden,Jura,Luzern,Neuchâtel,Nidwalden,Obwalden,Sankt Gallen,Schaffhausen,Schwyz,Solothurn,Thurgau,Ticino,Uri,Valais,Vaud,Zug,Zürich",
  TG: "Centrale,Kara,Maritime,Plateaux,Savanes",
  TN: "Ariana,Béja,Ben Arous,Bizerte,Gabès,Gafsa,Jendouba,Kairouan,Kasserine,Kébili,Kef,Mahdia,Manouba,Médenine,Monastir,Nabeul,Sfax,Sidi Bouzid,Siliana,Sousse,Tataouine,Tozeur,Tunis,Zaghouan",
  AE: "Abu Dhabi,Ajman,Dubai,Fujairah,Ras Al Khaimah,Sharjah,Umm Al Quwain",
  GB: "England,Scotland,Wales,Northern Ireland",
  US: "Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,District of Columbia,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming",
};

// Names already in the database under another spelling.
const ALIASES = {
  "brussels capital region": "brussels capital",
  "federal capital territory": "abuja fct",
};

const norm = (s) => {
  const key = String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-(CM|HT|BJ)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ALIASES[key] || key;
};

function parse() {
  const out = {};
  for (const [code, list] of Object.entries(DIVISIONS)) {
    out[code] = list.split(",").map((s) => s.trim());
  }
  return out;
}

module.exports = { DIVISIONS, norm, parse };

if (require.main === module) {
  const flags = new Set(process.argv.slice(2));
  const pg = require("pg");
  const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;

  (async () => {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const countries = (await pool.query("SELECT id, code FROM countries")).rows;
      const existing = (await pool.query("SELECT name, country_id FROM regions")).rows;
      const have = new Set(existing.map((r) => `${r.country_id}|${norm(r.name)}`));
      const todo = [];
      for (const c of countries) {
        for (const name of parse()[c.code] || []) {
          if (!have.has(`${c.id}|${norm(name)}`)) todo.push({ id: c.id, code: c.code, name });
        }
      }
      const perCountry = {};
      for (const t of todo) perCountry[t.code] = (perCountry[t.code] || 0) + 1;
      console.log(`Missing: ${todo.length} regions`, perCountry);

      if (flags.has("--sql")) {
        for (const t of todo) {
          console.log(
            `INSERT INTO regions (name, country_id) SELECT ${quote(t.name)}, ${t.id} WHERE NOT EXISTS (SELECT 1 FROM regions WHERE country_id = ${t.id} AND name = ${quote(t.name)});`,
          );
        }
      }
      if (flags.has("--apply")) {
        for (const t of todo) {
          await pool.query(
            `INSERT INTO regions (name, country_id)
             SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM regions WHERE country_id = $2 AND name = $1)`,
            [t.name, t.id],
          );
        }
        console.log("Applied.");
      } else if (!flags.has("--sql")) {
        console.log("Dry run. Re-run with --apply to insert.");
      }
    } finally {
      await pool.end();
    }
  })().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
