export interface Business {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviews: number;
  tags: string[];
  latitude: number;
  longitude: number;
  distance?: number;
}

export const mockBusinesses: Business[] = [
  {
    id: "1",
    title: "Abidjan Tech Solutions",
    description: "Leading technology solutions provider in Abidjan",
    category: "technology",
    location: "abidjan",
    address: "Plateau, Abidjan",
    phone: "+225 01 23 45 67 89",
    email: "contact@abidjantech.ci",
    rating: 4.8,
    reviews: 124,
    tags: ["IT", "Software", "Consulting"],
    latitude: 5.35995,
    longitude: -4.00824,
  },
  {
    id: "2",
    title: "Cocoa Excellence",
    description:
      "Premium cocoa bean exporter with sustainable farming practices",
    category: "agriculture",
    location: "gagnoa",
    address: "Gagnoa, Gôh-Djiboua",
    phone: "+225 07 89 12 34 56",
    email: "info@cocoaexcellence.ci",
    rating: 4.6,
    reviews: 89,
    tags: ["Agriculture", "Cocoa", "Export"],
    latitude: 6.12974,
    longitude: -5.95071,
  },
  {
    id: "3",
    title: "Hotel Ivoire Excellence",
    description: "Luxury hotel and hospitality services in Yamoussoukro",
    category: "hospitality",
    location: "yamoussoukro",
    address: "Yamoussoukro City Center",
    phone: "+225 05 67 89 12 34",
    email: "reservations@hotelivoire.ci",
    rating: 4.9,
    reviews: 256,
    tags: ["Hotel", "Luxury", "Accommodation"],
    latitude: 6.82762,
    longitude: -5.28934,
  },
  {
    id: "4",
    title: "SuperMarché Abidjan",
    description: "Modern supermarket chain serving Abidjan",
    category: "retail",
    location: "abidjan",
    address: "Cocody, Abidjan",
    phone: "+225 01 98 76 54 32",
    email: "client@supermarcheabidjan.ci",
    rating: 4.4,
    reviews: 167,
    tags: ["Retail", "Supermarket", "Grocery"],
    latitude: 5.35995,
    longitude: -4.00824,
  },
  {
    id: "5",
    title: "AutoCare Côte d'Ivoire",
    description: "Professional automotive services and maintenance",
    category: "service",
    location: "daloa",
    address: "Daloa City Center",
    phone: "+225 03 45 67 89 01",
    email: "service@autocareci.ci",
    rating: 4.7,
    reviews: 78,
    tags: ["Automotive", "Repair", "Maintenance"],
    latitude: 6.87757,
    longitude: -6.44761,
  },
];
