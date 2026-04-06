import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItemScale,
  defaultViewport,
} from "@/lib/animations";
import {
  BarChart3,
  MapPin,
  Cog,
  Shield,
  Headphones,
  Rocket,
  Database,
  Cloud,
  Wifi,
  Cpu,
  Users,
  Globe,
  Target,
  Zap,
  Lock,
  Server,
  Code,
  Palette,
  TrendingUp,
  FileText,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  BarChart,
  Network,
  Building,
  Car,
  CreditCard,
  Film,
  Package,
  Coffee,
  HardHat,
  DollarSign,
  Music,
  Award,
  CheckCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export default function Services() {
  const services = [
    {
      category: "Business Intelligence Platform",
      icon: <BarChart3 className="h-8 w-8" />,
      description: "Comprehensive analytics and data visualization platform",
      features: [
        "Multi-industry dashboard templates",
        "Real-time data processing",
        "Custom KPI configuration",
        "Predictive analytics",
        "Automated reporting",
      ],
      solutions: [
        { name: "Commerce Analytics", path: "/commerce", icon: <Package /> },
        { name: "Hospitality Suite", path: "/hotellerie", icon: <Coffee /> },
        { name: "Construction Hub", path: "/batiment", icon: <HardHat /> },
        { name: "Automotive Insights", path: "/automobile", icon: <Car /> },
        { name: "Finance Dashboard", path: "/finances", icon: <DollarSign /> },
        {
          name: "Entertainment Analytics",
          path: "/divertissement",
          icon: <Music />,
        },
      ],
    },
    {
      category: "Location Intelligence Services",
      icon: <MapPin className="h-8 w-8" />,
      description: "Advanced geospatial analytics and location-based insights",
      features: [
        "GPS mapping and tracking",
        "WiFi network analysis",
        "Location-based customer insights",
        "Territory management",
        "Route optimization",
      ],
      useCases: [
        "Retail site selection",
        "Delivery route planning",
        "Network coverage analysis",
        "Competitive positioning",
      ],
    },
    {
      category: "Data Integration & API",
      icon: <Cog className="h-8 w-8" />,
      description: "Seamless integration with your existing systems",
      features: [
        "RESTful API access",
        "Custom connector development",
        "ETL pipeline configuration",
        "Real-time data sync",
        "Third-party platform integration",
      ],
      integrations: [
        "CRM systems (Salesforce, HubSpot)",
        "ERP solutions (SAP, Oracle)",
        "Payment processors",
        "Marketing automation tools",
        "IoT device networks",
      ],
    },
    {
      category: "Security & Compliance",
      icon: <Shield className="h-8 w-8" />,
      description: "Enterprise-grade security and regulatory compliance",
      features: [
        "GDPR/CCPA compliance",
        "End-to-end encryption",
        "SOC 2 Type II certified",
        "Regular security audits",
        "Role-based access control",
      ],
      certifications: [
        "ISO 27001 certified",
        "HIPAA compliant options",
        "PCI DSS Level 1",
        "GDPR data processing agreements",
      ],
    },
    {
      category: "Technical Support & Services",
      icon: <Headphones className="h-8 w-8" />,
      description: "24/7 support and professional services",
      features: [
        "Dedicated success managers",
        "Implementation support",
        "Training programs",
        "Performance optimization",
        "Proactive monitoring",
      ],
      serviceLevels: [
        "Basic: Business hours support",
        "Professional: 24/7 email & chat",
        "Enterprise: Dedicated account manager",
        "Premier: On-site training available",
      ],
    },
    {
      category: "Growth & Consulting",
      icon: <Rocket className="h-8 w-8" />,
      description: "Strategic consulting and optimization services",
      features: [
        "Business intelligence strategy",
        "Data maturity assessment",
        "ROI optimization",
        "Team training & enablement",
        "Custom solution design",
      ],
      offerings: [
        "Executive workshops",
        "Team training sessions",
        "Implementation planning",
        "Performance reviews",
      ],
    },
  ];

  const industries = [
    {
      name: "Commerce & Retail",
      icon: <Package className="h-6 w-6" />,
      path: "/commerce",
      description: "Optimize sales, inventory, and customer experience",
      metrics: [
        "Sales Performance",
        "Inventory Turnover",
        "Customer LTV",
        "Conversion Rates",
      ],
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Hospitality",
      icon: <Coffee className="h-6 w-6" />,
      path: "/hotellerie",
      description: "Maximize occupancy and guest satisfaction",
      metrics: [
        "Occupancy Rates",
        "Revenue per Room",
        "Guest Satisfaction",
        "Staff Efficiency",
      ],
      color: "from-green-500 to-green-600",
    },
    {
      name: "Construction",
      icon: <HardHat className="h-6 w-6" />,
      path: "/batiment",
      description: "Streamline projects and ensure safety compliance",
      metrics: [
        "Project Timelines",
        "Safety Incidents",
        "Resource Allocation",
        "Budget Compliance",
      ],
      color: "from-orange-500 to-orange-600",
    },
    {
      name: "Automotive",
      icon: <Car className="h-6 w-6" />,
      path: "/automobile",
      description: "Enhance fleet management and sales performance",
      metrics: [
        "Fleet Utilization",
        "Maintenance Costs",
        "Sales Volume",
        "Customer Retention",
      ],
      color: "from-red-500 to-red-600",
    },
    {
      name: "Finance",
      icon: <DollarSign className="h-6 w-6" />,
      path: "/finances",
      description: "Improve risk assessment and investment decisions",
      metrics: [
        "Risk Exposure",
        "Portfolio Performance",
        "Compliance Rate",
        "Transaction Volume",
      ],
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Entertainment",
      icon: <Music className="h-6 w-6" />,
      path: "/divertissement",
      description: "Analyze audience behavior and content performance",
      metrics: [
        "Audience Engagement",
        "Content Performance",
        "Event Attendance",
        "Revenue Streams",
      ],
      color: "from-pink-500 to-pink-600",
    },
  ];

  const technicalCapabilities = [
    {
      title: "Data Processing",
      icon: <Cpu className="h-6 w-6" />,
      details:
        "Process millions of data points in real-time with our scalable infrastructure",
    },
    {
      title: "Cloud Infrastructure",
      icon: <Cloud className="h-6 w-6" />,
      details:
        "AWS-based secure cloud infrastructure with 99.9% uptime guarantee",
    },
    {
      title: "API Ecosystem",
      icon: <Code className="h-6 w-6" />,
      details:
        "Comprehensive REST API with SDKs for all major programming languages",
    },
    {
      title: "Mobile Access",
      icon: <Smartphone className="h-6 w-6" />,
      details: "Native iOS and Android apps for on-the-go analytics access",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-secondary py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        <div className="relative max-w-[95vw] mx-auto px-6 text-center">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Award className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white">
                Trusted by 500+ Enterprises
              </span>
            </div>
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6"
          >
            Verso Air Services
            <br />
            <span className="text-yellow-300">
              Business Intelligence Solutions
            </span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-xl text-white/90 max-w-3xl mx-auto mb-10"
          >
            Comprehensive analytics platform serving multiple industries with
            enterprise-grade security, real-time insights, and scalable
            solutions.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signin">
              <Button className="bg-white text-primary px-8 py-6 text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="outline"
                className="border-2 border-white bg-white/10 text-white px-8 py-6 text-lg hover:bg-white/20 backdrop-blur-sm"
              >
                Request Demo
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Platform Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Verso Air Platform Overview
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A unified platform delivering actionable insights across all
              business functions
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid lg:grid-cols-3 gap-8 mb-16"
          >
            {technicalCapabilities.map((capability, index) => (
              <motion.div
                key={index}
                variants={staggerItemScale}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                  {capability.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">
                  {capability.title}
                </h3>
                <p className="text-gray-600">{capability.details}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Core Services Grid */}
          <div className="space-y-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-8 hover:border-primary/30 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-8">
                  <div className="md:w-1/4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-6 text-white">
                      {service.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {service.category}
                    </h3>
                    <p className="text-gray-600">{service.description}</p>
                  </div>

                  <div className="md:w-3/4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          Key Features
                        </h4>
                        <ul className="space-y-3">
                          {service.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-3 text-gray-600"
                            >
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        {service.solutions && (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Target className="h-5 w-5 text-blue-500" />
                              Industry Solutions
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {service.solutions.map((solution, idx) => (
                                <Link key={idx} href={solution.path}>
                                  <div className="bg-gray-50 hover:bg-primary/5 rounded-lg p-3 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-2">
                                      <div className="text-gray-600">
                                        {solution.icon}
                                      </div>
                                      <span className="text-sm font-medium">
                                        {solution.name}
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </>
                        )}

                        {service.useCases && (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-4 mt-6 flex items-center gap-2">
                              <Zap className="h-5 w-5 text-orange-500" />
                              Use Cases
                            </h4>
                            <ul className="space-y-2">
                              {service.useCases.map((useCase, idx) => (
                                <li key={idx} className="text-sm text-gray-600">
                                  • {useCase}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {service.integrations && (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-4 mt-6 flex items-center gap-2">
                              <Network className="h-5 w-5 text-purple-500" />
                              Supported Integrations
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {service.integrations.map((integration, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                                >
                                  {integration}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Industry-Specific Solutions
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Tailored analytics for your specific industry challenges and
              opportunities
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {industries.map((industry, index) => (
              <Link key={index} href={industry.path}>
                <motion.div
                  variants={staggerItemScale}
                  whileHover={{ y: -8, scale: 1.03 }}
                  className={`bg-gradient-to-br ${industry.color} rounded-2xl p-8 text-white hover:shadow-2xl transition-all duration-300 cursor-pointer`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      {industry.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{industry.name}</h3>
                      <p className="text-white/80 text-sm mt-1">
                        {industry.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-white/90">
                      Key Metrics Tracked:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {industry.metrics.map((metric, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white/10 rounded-full text-sm backdrop-blur-sm"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">
                        View solution details
                      </span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-20 bg-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Service Packages
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Choose the package that fits your business needs and scale as you
              grow
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5 }}
              className="border-2 border-gray-200 rounded-2xl p-8 hover:border-primary/30 transition-all"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Starter
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $499<span className="text-lg text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">Perfect for small businesses</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Up to 5 users</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Basic analytics dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Email support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Monthly data updates</span>
                </li>
              </ul>
              <Link href="/auth/signin?plan=starter">
                <Button className="w-full">Get Started</Button>
              </Link>
            </motion.div>

            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5 }}
              className="border-2 border-primary rounded-2xl p-8 bg-gradient-to-b from-primary/5 to-white relative"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Professional
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $1,499<span className="text-lg text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">For growing businesses</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Up to 25 users</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Advanced analytics & reporting</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Real-time data updates</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Custom dashboard creation</span>
                </li>
              </ul>
              <Link href="/auth/signin?plan=professional">
                <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Start Free Trial
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5 }}
              className="border-2 border-gray-200 rounded-2xl p-8 hover:border-gray-800 transition-all"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Enterprise
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  Custom<span className="text-lg text-gray-600">/pricing</span>
                </div>
                <p className="text-gray-600">For large organizations</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Full platform customization</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>On-premise deployment options</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>White-label solutions</span>
                </li>
              </ul>
              <Link href="/contact">
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Service Links & Resources */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Additional Resources
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need to succeed with Verso Air
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-8"
          >
            <Link href="/services/news">
              <motion.div
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-primary hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">News & Updates</h3>
                <p className="text-gray-600 mb-6">
                  Platform updates, industry insights, and company announcements
                </p>
                <div className="flex items-center text-primary font-medium">
                  Read Latest Updates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </motion.div>
            </Link>

            <Link href="/services/careers">
              <motion.div
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-green-500 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-100 transition-colors">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Careers</h3>
                <p className="text-gray-600 mb-6">
                  Join our team of data experts, engineers, and business
                  professionals
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  View Open Positions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </motion.div>
            </Link>

            <Link href="/services/contractors">
              <motion.div
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-purple-500 hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Partner Program</h3>
                <p className="text-gray-600 mb-6">
                  Become a certified partner, consultant, or implementation
                  specialist
                </p>
                <div className="flex items-center text-purple-600 font-medium">
                  Join Partner Network
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-secondary">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Schedule a personalized demo to see how Verso Air can solve your
              specific business challenges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <Button className="bg-white text-primary px-10 py-6 text-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                  Request Personalized Demo
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/sav">
                <Button
                  variant="outline"
                  className="border-2 border-white bg-white/10 text-white px-10 py-6 text-lg hover:bg-white/20"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
