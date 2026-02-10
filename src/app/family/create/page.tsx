'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Card, Select } from '@/components/ui';
import { Header } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Globe,
  Lock,
  Users,
  CheckCircle,
} from 'lucide-react';
import { VisibilityStatus } from '@/types';

export default function CreateFamilyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    description: '',
    motto: '',
    foundedYear: '',
    visibility: VisibilityStatus.PRIVATE,
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }

    if (!authLoading && user?.familyId) {
      router.push('/family');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          origin: formData.origin,
          description: formData.description,
          motto: formData.motto,
          foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
          visibility: formData.visibility,
          contactDetails: {
            email: formData.contactEmail,
            phone: formData.contactPhone,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh user to get updated familyId
        await refreshUser();
        router.push('/family');
      } else {
        setError(data.error || 'Failed to create family');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Details' },
    { number: 3, title: 'Privacy' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={user} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">👨‍👩‍👧‍👦</span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Create Your Family
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Set up your family space and start connecting
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, index) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors
                    ${step > s.number
                      ? 'bg-green-500 text-white'
                      : step === s.number
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {step > s.number ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    s.number
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
                  {s.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 rounded ${
                    step > s.number
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <Card variant="elevated" padding="lg">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>

              <Input
                label="Family Name"
                placeholder="e.g., The Smith Family"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                helperText="This will be the display name for your family"
              />

              <Input
                label="Origin / Location"
                placeholder="e.g., New York, USA"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                helperText="Where is your family from?"
              />

              <Input
                label="Founded Year (Optional)"
                type="number"
                placeholder="e.g., 1920"
                value={formData.foundedYear}
                onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                helperText="When was your family established?"
              />
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Family Details
              </h2>

              <Textarea
                label="Description"
                placeholder="Tell us about your family..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
                showCount
                helperText="A brief description of your family"
              />

              <Input
                label="Family Motto (Optional)"
                placeholder="e.g., Together we are stronger"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
              />

              <Input
                label="Contact Email (Optional)"
                type="email"
                placeholder="family@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />

              <Input
                label="Contact Phone (Optional)"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          )}

          {/* Step 3: Privacy */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Privacy Settings
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose who can see your family. You can change this later.
              </p>

              <div className="space-y-4">
                <label
                  className={`
                    flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${formData.visibility === VisibilityStatus.PRIVATE
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  onClick={() => setFormData({ ...formData, visibility: VisibilityStatus.PRIVATE })}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Private Family
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Only invited members can see your family. Your family will be active immediately.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.visibility === VisibilityStatus.PRIVATE}
                    onChange={() => {}}
                    className="w-5 h-5 text-amber-500 border-gray-300 focus:ring-amber-500"
                  />
                </label>

                <label
                  className={`
                    flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${formData.visibility === VisibilityStatus.PUBLIC
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  onClick={() => setFormData({ ...formData, visibility: VisibilityStatus.PUBLIC })}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Public Family
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Anyone can discover and view your public content. Requires admin approval before becoming active.
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.visibility === VisibilityStatus.PUBLIC}
                    onChange={() => {}}
                    className="w-5 h-5 text-amber-500 border-gray-300 focus:ring-amber-500"
                  />
                </label>
              </div>

              {formData.visibility === VisibilityStatus.PUBLIC && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Public families require approval from a system administrator before they become visible to others.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                leftIcon={<ArrowLeft className="w-5 h-5" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.name}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                rightIcon={<Users className="w-5 h-5" />}
              >
                Create Family
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
