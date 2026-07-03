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

export const mockBusinesses: Business[] = [];
