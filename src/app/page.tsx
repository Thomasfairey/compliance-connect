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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
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
  },
  {
    icon: Shield,
    name: "Fire Alarm Testing",
    description: "Comprehensive fire alarm system testing and certification.",
  },
  {
    icon: FileCheck,
    name: "Emergency Lighting",
    description: "Ensure your emergency lighting meets all regulatory requirements.",
  },
  {
    icon: Building2,
    name: "Fixed Wire Testing",
    description: "Electrical installation condition reports for your premises.",
  },
];

const features = [
  {
    icon: Clock,
    title: "Book in Minutes",
    description: "Simple online booking with instant quotes. No phone calls needed.",
  },
  {
    icon: Shield,
    title: "Certified Engineers",
    description: "All our engineers are fully qualified and background checked.",
  },
  {
    icon: CheckCircle2,
    title: "Digital Certificates",
    description: "Receive your compliance certificates digitally, instantly.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">Compliance Connect</span>
            </Link>

            <div className="flex items-center gap-4">
              <SignedOut>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm">Get Started</Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button size="sm">Dashboard</Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeIn}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-600 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Now serving London & South East
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6"
            variants={fadeIn}
          >
            Compliance testing,{" "}
            <span className="text-gray-400">simplified.</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
            variants={fadeIn}
          >
            Book certified compliance testing for your business in minutes. PAT
            testing, fire alarms, emergency lighting, and more — all in one
            place.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeIn}
          >
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg" className="text-base px-8 h-12">
                  Book a Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">
                  Sign In
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/bookings/new">
                <Button size="lg" className="text-base px-8 h-12">
                  Book a Service
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">
                  View Dashboard
                </Button>
              </Link>
            </SignedIn>
          </motion.div>
        </motion.div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Services we offer
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive compliance testing services to keep your business
              safe and legally compliant.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {service.name}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why businesses choose us
              </h2>
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
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
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl font-bold text-gray-900 mb-2">
                    10k+
                  </div>
                  <div className="text-gray-600">Tests completed</div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-black text-white rounded-2xl p-6 shadow-xl">
                <div className="text-3xl font-bold mb-1">4.9★</div>
                <div className="text-gray-400 text-sm">Customer rating</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to get compliant?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses who trust Compliance Connect for their
            testing needs. Book your first service today.
          </p>
          <SignedOut>
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="text-base px-8 h-12"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/bookings/new">
              <Button
                size="lg"
                variant="secondary"
                className="text-base px-8 h-12"
              >
                Book a Service
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </SignedIn>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Compliance Connect</span>
          </div>
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Office Test Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
