'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import { Button, Card, Badge, PageLoading, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSettings, FeatureGate } from '@/context/SettingsContext';
import {
  Vote,
  Plus,
  Clock,
  Users,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface PollOption {
  _id: string;
  text: string;
  votes: string[];
}

interface Poll {
  _id: string;
  title: string;
  description?: string;
  category: string;
  options: PollOption[];
  allowMultipleVotes: boolean;
  isAnonymous: boolean;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  endsAt?: string;
  hasVoted: boolean;
  userVotes: string[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export default function PollsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isReady: settingsReady } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [voting, setVoting] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    if (!user?.familyId) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        familyId: user.familyId,
        status: statusFilter,
      });

      const res = await fetch(`/api/polls?${params}`);
      const data = await res.json();

      if (data.success) {
        setPolls(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.familyId, statusFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!authLoading && user && !user.familyId) {
      router.push('/family/create');
      return;
    }

    if (user?.familyId && settingsReady) {
      fetchPolls();
    }
  }, [user, authLoading, settingsReady, router, fetchPolls]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;

    setVoting(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        fetchPolls();
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(null);
    }
  };

  if (authLoading || isLoading || !settingsReady) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  };

  const getOptionPercentage = (poll: Poll, option: PollOption) => {
    const total = getTotalVotes(poll);
    if (total === 0) return 0;
    return Math.round((option.votes.length / total) * 100);
  };

  return (
    <FeatureGate feature="polls" fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Polls feature is not enabled for this family.</p>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header user={user} />

        <div className="flex">
          <Sidebar userRole={user.role} />

          <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Vote className="w-8 h-8 text-amber-500" />
                    Family Polls
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Vote on family decisions together
                  </p>
                </div>

                <Button
                  onClick={() => setShowAddModal(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Poll
                </Button>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2 mb-6">
                {['active', 'closed', 'draft'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Polls List */}
              {polls.length === 0 ? (
                <Card variant="bordered" className="p-12 text-center">
                  <Vote className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No {statusFilter} polls
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create a poll to get your family's opinion!
                  </p>
                  <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Create Poll
                  </Button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {polls.map((poll) => (
                    <Card key={poll._id} variant="bordered" className="p-6">
                      {/* Poll Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {poll.title}
                          </h3>
                          {poll.description && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              {poll.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={poll.status === 'active' ? 'success' : 'default'}>
                          {poll.status}
                        </Badge>
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        {poll.options.map((option) => {
                          const percentage = getOptionPercentage(poll, option);
                          const isSelected = poll.userVotes.includes(option._id);
                          const canVote = poll.status === 'active' && (!poll.hasVoted || poll.allowMultipleVotes);

                          return (
                            <button
                              key={option._id}
                              onClick={() => canVote && handleVote(poll._id, option._id)}
                              disabled={!canVote || voting === poll._id}
                              className={`w-full text-left relative overflow-hidden rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                              } ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              {/* Progress Bar Background */}
                              <div
                                className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                              {/* Content */}
                              <div className="relative px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isSelected ? (
                                    <CheckCircle className="w-5 h-5 text-amber-500" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400" />
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {option.text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{option.votes.length} votes</span>
                                  <span className="font-medium">{percentage}%</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Poll Footer */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getTotalVotes(poll)} votes
                          </span>
                          {poll.endsAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Ends {formatRelativeTime(poll.endsAt)}
                            </span>
                          )}
                        </div>
                        <span>
                          by {poll.createdBy.firstName} · {formatRelativeTime(poll.createdAt)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        <MobileNav />

        {/* Create Poll Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create Poll"
          description="Ask your family a question"
        >
          <p className="text-gray-500 dark:text-gray-400">
            Poll creation form coming soon...
          </p>
        </Modal>
      </div>
    </FeatureGate>
  );
}
