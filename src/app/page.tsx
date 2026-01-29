"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  Zap,
  FileCheck,
  Building2,
  Star,
  Award,
  Wrench,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const services = [
  {
    icon: Zap,
    name: "PAT Testing",
    description: "Portable appliance testing to keep your equipment safe and compliant.",
    price: "From £1.50/item",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Shield,
    name: "Fire Alarm Testing",
    description: "Comprehensive fire alarm system testing and certification.",
    price: "From £85",
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: FileCheck,
    name: "Emergency Lighting",
    description: "Ensure your emergency lighting meets all regulatory requirements.",
    price: "From £4/fitting",
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Building2,
    name: "Fixed Wire Testing",
    description: "Electrical installation condition reports for your premises.",
    price: "From £150",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

const stats = [
  { value: "10,000+", label: "Tests Completed" },
  { value: "500+", label: "Happy Clients" },
  { value: "50+", label: "Certified Engineers" },
  { value: "4.9★", label: "Average Rating" },
];

const features = [
  {
    icon: Clock,
    title: "Book in 60 Seconds",
    description: "Simple online booking with instant quotes. No phone calls, no waiting.",
  },
  {
    icon: Award,
    title: "Certified Engineers",
    description: "All engineers are NICEIC/NAPIT certified with full DBS checks.",
  },
  {
    icon: CheckCircle2,
    title: "Digital Certificates",
    description: "Receive your compliance certificates instantly via email.",
  },
  {
    icon: Sparkles,
    title: "Smart Pricing",
    description: "Dynamic pricing that rewards you for flexible scheduling.",
  },
];

const testimonials = [
  {
    quote: "OfficeTest On Demand made our annual PAT testing a breeze. Booked online, engineer arrived on time, certificates delivered same day.",
    author: "Sarah Mitchell",
    role: "Office Manager, TechCorp Ltd",
    rating: 5,
  },
  {
    quote: "Finally, a modern solution for compliance testing. The online booking system is exactly what our industry needed.",
    author: "James Wright",
    role: "Facilities Director, Retail Group",
    rating: 5,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">OfficeTest On Demand</span>
            </Link>

            <div className="flex items-center gap-3">
              <SignedOut>
                <Link href="/engineer/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Wrench className="w-4 h-4 mr-2" />
                    Engineer Login
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="gradient-primary text-white border-0 shadow-lg hover:opacity-90">
                    Get Started
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button size="sm" className="gradient-primary text-white border-0 shadow-lg hover:opacity-90">
                    Dashboard
                  </Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        {/* Animated Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

        <motion.div
          className="relative max-w-5xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeIn} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-white/90">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Trusted by 500+ UK businesses
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6"
            variants={fadeIn}
          >
            Compliance testing,{" "}
            <span className="text-gradient-accent">reimagined.</span>
          </motion.h1>

          <motion.p
            className="text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed"
            variants={fadeIn}
          >
            Book certified compliance testing for your business in under 60 seconds.
            Smart scheduling, instant quotes, digital certificates.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeIn}
          >
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg" className="gradient-accent text-white border-0 shadow-xl hover:opacity-90 text-base px-8 h-14 rounded-xl">
                  Book Your First Test
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#services">
                <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-base px-8 h-14 rounded-xl">
                  View Services
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/bookings/new">
                <Button size="lg" className="gradient-accent text-white border-0 shadow-xl hover:opacity-90 text-base px-8 h-14 rounded-xl">
                  Book a Service
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-base px-8 h-14 rounded-xl">
                  View Dashboard
                </Button>
              </Link>
            </SignedIn>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={fadeIn}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Our Services
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Everything you need to{" "}
              <span className="text-gradient-primary">stay compliant</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive compliance testing services delivered by certified engineers.
              Book online, get tested, receive certificates — it&apos;s that simple.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                className="group relative bg-card rounded-2xl p-6 border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`w-14 h-14 ${service.bgColor} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <service.icon className={`w-7 h-7 ${service.iconColor}`} />
                </div>
                <h3 className="font-bold text-xl text-foreground mb-2">
                  {service.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {service.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    {service.price}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg" className="gradient-primary text-white border-0 shadow-lg hover:opacity-90">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/bookings/new">
                <Button size="lg" className="gradient-primary text-white border-0 shadow-lg hover:opacity-90">
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium mb-4">
                Why Choose Us
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                The smart way to{" "}
                <span className="text-gradient-accent">manage compliance</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We&apos;ve rebuilt compliance testing from the ground up. No more phone tag,
                no more paperwork, no more waiting weeks for certificates.
              </p>

              <div className="space-y-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="flex gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden">
                <div className="absolute inset-0 gradient-primary opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <div className="text-7xl font-bold mb-4 animate-float">
                      60<span className="text-4xl">sec</span>
                    </div>
                    <div className="text-xl opacity-90 mb-2">Average booking time</div>
                    <div className="text-sm opacity-70">From start to confirmation</div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-5 shadow-2xl border border-border"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Certificate Sent</div>
                    <div className="text-xs text-muted-foreground">Just now</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -top-6 -right-6 bg-card rounded-2xl p-5 shadow-2xl border border-border"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">JW</div>
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-foreground">SM</div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">50+ engineers</div>
                    <div className="text-xs text-muted-foreground">Ready to help</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Testimonials
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Loved by businesses{" "}
              <span className="text-gradient-primary">like yours</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                className="bg-card rounded-2xl p-8 border border-border"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg text-foreground mb-6 leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                    {testimonial.author.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to simplify your{" "}
            <span className="text-gradient-accent">compliance?</span>
          </h2>
          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Join thousands of businesses who trust OfficeTest On Demand.
            Book your first test today — it takes less than a minute.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg" className="gradient-accent text-white border-0 shadow-xl hover:opacity-90 text-base px-8 h-14 rounded-xl">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/bookings/new">
                <Button size="lg" className="gradient-accent text-white border-0 shadow-xl hover:opacity-90 text-base px-8 h-14 rounded-xl">
                  Book a Service
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </SignedIn>
            <Link href="/engineer/login">
              <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-base px-8 h-14 rounded-xl">
                <Wrench className="mr-2 h-5 w-5" />
                Join as Engineer
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg">OfficeTest On Demand</span>
                <p className="text-sm text-muted-foreground">Smart compliance testing</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/engineer/login" className="hover:text-foreground transition-colors">
                Engineer Portal
              </Link>
              <Link href="/sign-in" className="hover:text-foreground transition-colors">
                Customer Login
              </Link>
            </div>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} OfficeTest On Demand. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
