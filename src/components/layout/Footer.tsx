'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Security', href: '/security' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Help Center', href: '/help' },
        { name: 'Documentation', href: '/docs' },
        { name: 'API', href: '/api-docs' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '/about' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy', href: '/privacy' },
        { name: 'Terms', href: '/terms' },
        { name: 'GDPR', href: '/gdpr' },
      ],
    },
  ];

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                FamilyHub
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              &copy; {currentYear} FamilyHub. All rights reserved. Connecting families, preserving memories.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Minimal Footer for authenticated pages
export function MinimalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
      <p>
        &copy; {currentYear} FamilyHub.{' '}
        <Link href="/privacy" className="hover:text-amber-600 dark:hover:text-amber-400">
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" className="hover:text-amber-600 dark:hover:text-amber-400">
          Terms
        </Link>
        {' · '}
        <Link href="/help" className="hover:text-amber-600 dark:hover:text-amber-400">
          Help
        </Link>
      </p>
    </footer>
  );
}
