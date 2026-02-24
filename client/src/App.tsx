import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

// Pages
import Home from "@/pages/home";
import Commerce from "@/pages/commerce";
import Hotellerie from "@/pages/hotellerie";
import Batiment from "@/pages/batiment";
import Automobile from "@/pages/automobile";
import Finances from "@/pages/finances";
import Divertissement from "@/pages/divertissement";
import Reservations from "@/pages/reservations";
import Logement from "@/pages/logement";
import SAV from "@/pages/sav";
import VersoAI from "@/pages/versoai";
import SignIn from "@/pages/signin";
import NotFound from "@/pages/not-found";

// Components
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import LocationPanel from "@/components/ui/location-panel";
import MusicPortal from "@/components/ui/music-portal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/commerce" component={Commerce} />
      <Route path="/hotellerie" component={Hotellerie} />
      <Route path="/batiment" component={Batiment} />
      <Route path="/automobile" component={Automobile} />
      <Route path="/finances" component={Finances} />
      <Route path="/divertissement" component={Divertissement} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/logement" component={Logement} />
      <Route path="/sav" component={SAV} />
      <Route path="/versoai" component={VersoAI} />
      <Route path="/signin" component={SignIn} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isMusicPortalOpen, setIsMusicPortalOpen] = useState(false);
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          {/* Banner */}
          <div className="bg-primary text-white text-center py-2 text-sm">
            <span>Welcome to Plan V4 - Your Complete Business Intelligence Platform</span>
          </div>

          {/* Navigation */}
          <Navbar 
            onMusicPortalToggle={() => setIsMusicPortalOpen(!isMusicPortalOpen)}
            onLocationPanelToggle={() => setIsLocationPanelOpen(!isLocationPanelOpen)}
          />

          {/* Side Panels */}
          <LocationPanel 
            isOpen={isLocationPanelOpen} 
            onClose={() => setIsLocationPanelOpen(false)} 
          />
          <MusicPortal 
            isOpen={isMusicPortalOpen} 
            onClose={() => setIsMusicPortalOpen(false)} 
          />

          {/* Main Content */}
          <main className="flex-1">
            <Router />
          </main>

          {/* Footer */}
          <Footer />
        </div>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
