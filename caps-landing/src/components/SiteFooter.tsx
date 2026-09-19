"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

const FacebookIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const TwitterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

export function SiteFooter() {
  const footerLinks = [
    {
      title: "Platform",
      links: [
        { label: "Overview", href: "#overview" },
        { label: "Features", href: "#features" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Access", href: "#login" },
      ],
    },
    {
      title: "Helpful Links",
      links: [
        { label: "Documentation", href: "#" },
        { label: "System Status", href: "#" },
        {
          label: "Live Dashboard",
          href: "/analytics",
          pulse: true,
        },
      ],
    },
  ];

  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#CC1B2B]" />,
      text: "hello@sparc-parking.com",
      href: "mailto:hello@sparc-parking.com",
    },
    {
      icon: <Phone size={18} className="text-[#CC1B2B]" />,
      text: "+63 912 345 6789",
      href: "tel:+639123456789",
    },
    {
      icon: <MapPin size={18} className="text-[#CC1B2B]" />,
      text: "University of San Agustin, Iloilo",
    },
  ];

  const socialLinks = [
    { icon: <FacebookIcon size={20} />, label: "Facebook", href: "#" },
    { icon: <InstagramIcon size={20} />, label: "Instagram", href: "#" },
    { icon: <TwitterIcon size={20} />, label: "Twitter", href: "#" },
    { icon: <Globe size={20} />, label: "Globe", href: "#" },
  ];

  return (
    <footer className="bg-[#0F0F11]/10 relative h-fit rounded-t-3xl overflow-hidden mt-24 sm:m-8 sm:rounded-3xl">
      <div className="max-w-7xl mx-auto p-8 sm:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#CC1B2B] shadow-lg shadow-[#CC1B2B]/30">
                <ShieldCheck size={18} className="text-white" strokeWidth={2} />
              </span>
              <span className="text-white text-3xl font-bold">SPARC</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Smart Parking Access and Real-Time Count — an IoT-based parking management system.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative w-fit">
                    <a
                      href={link.href}
                      className="text-[var(--color-muted-foreground)] hover:text-[#CC1B2B] transition-colors"
                    >
                      {link.label}
                    </a>
                    {link.pulse && (
                      <span className="absolute top-1 right-[-14px] w-2 h-2 rounded-full bg-[#CC1B2B] animate-pulse"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-white text-lg font-semibold mb-6">
              Contact Us
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-[var(--color-muted-foreground)]">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-[#CC1B2B] transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-[#CC1B2B] transition-colors">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-white/[0.05] my-8" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-[var(--color-muted-foreground)]">
          {/* Social icons */}
          <div className="flex space-x-6">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-[#CC1B2B] transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-right">
            &copy; {new Date().getFullYear()} SPARC. All rights reserved.
          </p>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[30rem] -mt-52 -mb-36">
        <TextHoverEffect text="SPARC" className="z-50" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
