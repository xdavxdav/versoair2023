import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, User, CreditCard, Truck, Package, Undo, Shield } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="video-container h-96 relative">
        <div className="absolute inset-0 gradient-bg"></div>
        <div className="video-overlay"></div>
        <div className="relative z-10 flex items-center justify-center h-full text-white text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-5xl font-bold mb-4">Business Intelligence Platform</h1>
            <p className="text-xl mb-8">Comprehensive analytics and insights for your business growth</p>
            <Link href="/signin">
              <Button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="custom-card p-8 shadow-lg">
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-800">Hi! How can we help You?</h3>
            
            {/* Search Bar */}
            <div className="flex justify-center mb-8">
              <div className="custom-search max-w-md">
                <input type="text" placeholder="Search for help..." className="search-input" />
                <button className="custom-search-icon">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Help Categories */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="custom-card-inner">
                <User className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Account</p>
              </div>
              <div className="custom-card-inner">
                <CreditCard className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Payments</p>
              </div>
              <div className="custom-card-inner">
                <Truck className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Delivery</p>
              </div>
              <div className="custom-card-inner">
                <Package className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Product</p>
              </div>
              <div className="custom-card-inner">
                <Undo className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Return</p>
              </div>
              <div className="custom-card-inner">
                <Shield className="text-3xl text-primary mb-3" size={48} />
                <p className="custom-mg-text">Guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-primary font-semibold">Our Services</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">Grow Your Business with Our Platform</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Comprehensive business intelligence solutions for every industry</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&w=400&h=250&fit=crop" 
                alt="Industrial safety analysis" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">Process Safety & Risk Management</h3>
                <p className="text-gray-600">Advanced analytics for industrial safety and risk assessment.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&w=400&h=250&fit=crop" 
                alt="Construction safety monitoring" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">Occupational Safety & Health</h3>
                <p className="text-gray-600">Comprehensive workplace safety monitoring and reporting.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&w=400&h=250&fit=crop" 
                alt="Security assessment logistics" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">Security Assessment</h3>
                <p className="text-gray-600">Strategic security planning and vulnerability analysis.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&w=400&h=250&fit=crop" 
                alt="Business analytics dashboard" 
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">Business Intelligence</h3>
                <p className="text-gray-600">Data-driven insights for informed decision making.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
