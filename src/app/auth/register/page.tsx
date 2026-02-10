'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Users } from 'lucide-react';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'guest' as 'guest' | 'family_admin',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const success = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role === 'family_admin' ? UserRole.FAMILY_ADMIN : UserRole.GUEST,
    });

    if (success) {
      // Redirect based on role
      if (formData.role === 'family_admin') {
        router.push('/family/create');
      } else {
        router.push('/explore');
      }
    } else {
      setError('Registration failed. Email may already be in use.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-4xl">👨‍👩‍👧‍👦</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                FamilyHub
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">
              Create your account
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Join FamilyHub and connect with your family
            </p>
          </div>

          {/* Register Form */}
          <Card variant="elevated" padding="lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  leftIcon={<User className="w-5 h-5" />}
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last Name"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  autoComplete="family-name"
                  required
                />
              </div>

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                leftIcon={<Mail className="w-5 h-5" />}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
                autoComplete="new-password"
                helperText="Must be at least 8 characters"
                required
              />

              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                leftIcon={<Lock className="w-5 h-5" />}
                autoComplete="new-password"
                required
              />

              <Select
                label="I want to..."
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'guest' | 'family_admin' })}
                options={[
                  { value: 'family_admin', label: 'Create a new family' },
                  { value: 'guest', label: 'Join an existing family' },
                ]}
              />

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    {formData.role === 'family_admin' ? (
                      <p>
                        As a <strong>Family Admin</strong>, you&apos;ll create your family space
                        and can invite members to join.
                      </p>
                    ) : (
                      <p>
                        You can explore public families and request to join them, or wait for
                        an invitation from a family admin.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
