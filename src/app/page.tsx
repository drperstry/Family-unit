'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { Header, Footer } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Shield,
  Calendar,
  Image,
  TreePine,
  Heart,
  Lock,
  Globe,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  const features = [
    {
      icon: TreePine,
      title: 'Family Tree',
      description: 'Build and visualize your family tree with multiple generations, relationships, and export options.',
    },
    {
      icon: Image,
      title: 'Photo Gallery',
      description: 'Organize and share precious family photos in folders with tags and member tagging.',
    },
    {
      icon: Calendar,
      title: 'Events Calendar',
      description: 'Plan family gatherings, celebrate ceremonies, and never miss important dates.',
    },
    {
      icon: Shield,
      title: 'Moderated Content',
      description: 'All content is reviewed and approved, ensuring a safe space for your family.',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'Choose between private and public families. Control who sees what.',
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Admins, members, and guests each have appropriate access levels.',
    },
  ];

  const benefits = [
    'Preserve family history for future generations',
    'Stay connected with relatives worldwide',
    'Coordinate family events and celebrations',
    'Share and discover family achievements',
    'Secure, private platform with full data ownership',
    'Export your data anytime in multiple formats',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-6">
                <Heart className="w-4 h-4" />
                Family comes first
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Connect, Share, and{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                  Preserve
                </span>{' '}
                Your Family Heritage
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                A private, secure platform for families to build their family tree, share memories,
                coordinate events, and preserve their heritage for generations to come.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isLoading ? (
                  <div className="h-12 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : user ? (
                  <Link href={user.familyId ? '/family' : '/family/create'}>
                    <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                      {user.familyId ? 'Go to Family' : 'Create Your Family'}
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/register">
                      <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                        Get Started Free
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" size="lg">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Everything Your Family Needs
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                From preserving memories to planning events, we have all the tools your family needs
                to stay connected and organized.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} variant="bordered" hoverable className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Why Families Choose FamilyHub
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  We understand what matters most to families. Our platform is built with privacy,
                  security, and ease of use at its core.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8">
                  <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Your Family Space
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Private, secure, and always available
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Start Preserving Your Family Legacy Today
            </h2>
            <p className="text-lg text-amber-100 mb-8 max-w-2xl mx-auto">
              Join thousands of families who trust FamilyHub to keep their memories safe and their
              families connected.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-amber-600 hover:bg-gray-100"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Create Your Family
                </Button>
              </Link>
              <Link href="/explore">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  leftIcon={<Globe className="w-5 h-5" />}
                >
                  Explore Public Families
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
