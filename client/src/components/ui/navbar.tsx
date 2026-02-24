import { Link } from "wouter";
import { ChevronDown, Music, MapPin } from "lucide-react";
import { Button } from "./button";

interface NavbarProps {
  onMusicPortalToggle: () => void;
  onLocationPanelToggle: () => void;
}

export default function Navbar({ onMusicPortalToggle, onLocationPanelToggle }: NavbarProps) {
  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=120&h=40&fit=crop" 
              alt="Plan V4 Logo" 
              className="navbar-logo"
            />
            <span className="ml-3 text-xl font-bold text-gray-800">Plan V4</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-600 hover:text-primary transition-colors">
              Home
            </Link>
            
            {/* Entreprises Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center">
                Entreprises <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-2 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link href="/commerce" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Commerce
                </Link>
                <Link href="/hotellerie" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Hotellerie
                </Link>
                <Link href="/batiment" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Bâtiment
                </Link>
                <Link href="/automobile" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Automobile
                </Link>
                <Link href="/finances" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Finances
                </Link>
                <Link href="/divertissement" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  Divertissement
                </Link>
              </div>
            </div>

            <Link href="/reservations" className="text-gray-600 hover:text-primary transition-colors">
              Reservations
            </Link>
            <Link href="/logement" className="text-gray-600 hover:text-primary transition-colors">
              Logements
            </Link>

            {/* Assistance Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center">
                Assistance <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-2 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link href="/sav" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  SAV 24/7
                </Link>
                <Link href="/versoai" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
                  VersoAI
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Music Portal Toggle */}
            <Button
              onClick={onMusicPortalToggle}
              className="portal-toggle bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600"
            >
              <Music className="mr-2 h-4 w-4" />
              Verso Air
            </Button>
            
            {/* Location Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLocationPanelToggle}
              className="text-gray-600 hover:text-primary"
            >
              <MapPin className="h-5 w-5" />
            </Button>
            
            {/* Sign In Button */}
            <Link href="/signin">
              <Button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Sign In/Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
