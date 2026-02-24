import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Verso Air</h3>
            <p className="text-gray-400 mb-4">
              Your comprehensive business intelligence platform for data-driven
              decisions.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit our Facebook page"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit our Twitter page"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit our LinkedIn page"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit our Instagram page"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/logement"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  🏠 Logement
                </Link>
              </li>
              <li>
                <Link
                  href="/businesses-directory"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Business Directory
                </Link>
              </li>
              <li>
                <Link
                  href="/reservations"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Reservations
                </Link>
              </li>
              <li>
                <Link
                  href="/geo-admin"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Geo Admin
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Request a Demo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Sectors</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/commerce"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Commerce
                </Link>
              </li>
              <li>
                <Link
                  href="/hotellerie"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Hôtellerie
                </Link>
              </li>
              <li>
                <Link
                  href="/batiment"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Bâtiment
                </Link>
              </li>
              <li>
                <Link
                  href="/automobile"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Automobile
                </Link>
              </li>
              <li>
                <Link
                  href="/finances"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Finances
                </Link>
              </li>
              <li>
                <Link
                  href="/sante"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Santé
                </Link>
              </li>
              <li>
                <Link
                  href="/divertissement"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Divertissement
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/sav"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  SAV 24/7
                </Link>
              </li>
              <li>
                <Link
                  href="/versoai"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  VersoAI
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  System Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/cookies"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="/gdpr"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  GDPR
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            &copy; 2014 Verso Air™. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
