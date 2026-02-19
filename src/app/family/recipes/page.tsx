'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Sidebar, MobileNav } from '@/components/layout';
import { Button, Card, Badge, PageLoading, Modal, Input, Textarea, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSettings, FeatureGate } from '@/context/SettingsContext';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Users,
  ChefHat,
  Heart,
  MessageCircle,
  Filter,
} from 'lucide-react';
import { UserRole } from '@/types';

interface Recipe {
  _id: string;
  title: string;
  description?: string;
  category: string;
  cuisine?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  images: string[];
  origin?: string;
  likes: string[];
  commentsCount: number;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

export default function RecipesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { settings, isReady: settingsReady } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchRecipes = useCallback(async () => {
    if (!user?.familyId) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({ familyId: user.familyId });
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (difficultyFilter) params.append('difficulty', difficultyFilter);

      const res = await fetch(`/api/recipes?${params}`);
      const data = await res.json();

      if (data.success) {
        setRecipes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.familyId, searchQuery, categoryFilter, difficultyFilter]);

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
      fetchRecipes();
    }
  }, [user, authLoading, settingsReady, router, fetchRecipes]);

  if (authLoading || isLoading || !settingsReady) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <FeatureGate feature="recipes" fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Recipes feature is not enabled for this family.</p>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header user={user} />

        <div className="flex">
          <Sidebar userRole={user.role} />

          <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-8 h-8 text-amber-500" />
                    Family Recipes
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Treasured recipes passed down through generations
                  </p>
                </div>

                <Button
                  onClick={() => setShowAddModal(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Recipe
                </Button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Categories' },
                      { value: 'appetizer', label: 'Appetizers' },
                      { value: 'main', label: 'Main Dishes' },
                      { value: 'side', label: 'Side Dishes' },
                      { value: 'dessert', label: 'Desserts' },
                      { value: 'beverage', label: 'Beverages' },
                      { value: 'breakfast', label: 'Breakfast' },
                      { value: 'soup', label: 'Soups' },
                      { value: 'salad', label: 'Salads' },
                    ]}
                  />
                  <Select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    options={[
                      { value: '', label: 'Any Difficulty' },
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'hard', label: 'Hard' },
                    ]}
                  />
                </div>
              </div>

              {/* Recipes Grid */}
              {recipes.length === 0 ? (
                <Card variant="bordered" className="p-12 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No recipes yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Be the first to share a family recipe!
                  </p>
                  <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Add Recipe
                  </Button>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map((recipe) => (
                    <Card
                      key={recipe._id}
                      variant="bordered"
                      hoverable
                      className="overflow-hidden cursor-pointer"
                      onClick={() => router.push(`/family/recipes/${recipe._id}`)}
                    >
                      {recipe.images[0] ? (
                        <img
                          src={recipe.images[0]}
                          alt={recipe.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center">
                          <ChefHat className="w-16 h-16 text-amber-300 dark:text-amber-700" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {recipe.title}
                          </h3>
                          <Badge className={difficultyColors[recipe.difficulty]}>
                            {recipe.difficulty}
                          </Badge>
                        </div>
                        {recipe.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {(recipe.prepTime || recipe.cookTime) && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                            </span>
                          )}
                          {recipe.servings && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {recipe.servings}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">
                              {recipe.createdBy.firstName[0]}
                            </div>
                            <span className="text-sm text-gray-500">
                              {recipe.createdBy.firstName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-400">
                            <span className="flex items-center gap-1 text-sm">
                              <Heart className="w-4 h-4" />
                              {recipe.likes.length}
                            </span>
                            <span className="flex items-center gap-1 text-sm">
                              <MessageCircle className="w-4 h-4" />
                              {recipe.commentsCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        <MobileNav />

        {/* Add Recipe Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Recipe"
          description="Share a treasured family recipe"
        >
          <p className="text-gray-500 dark:text-gray-400">
            Recipe creation form coming soon...
          </p>
        </Modal>
      </div>
    </FeatureGate>
  );
}
