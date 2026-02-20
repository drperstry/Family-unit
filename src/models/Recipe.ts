import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContentStatus, VisibilityStatus } from '@/types';

export interface RecipeDocument extends Document {
  familyId: Types.ObjectId;
  title: string;
  description?: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: string[];
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  servings?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  cuisine?: string;
  tags: string[];
  images: string[];
  video?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  origin?: string; // Who in the family this recipe came from
  story?: string; // The story behind the recipe
  tips?: string[];
  variations?: string[];
  status: ContentStatus;
  visibility: VisibilityStatus;
  likes: Types.ObjectId[];
  commentsCount: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema({
  name: { type: String, required: true },
  amount: { type: String, required: true },
  unit: String,
}, { _id: false });

const RecipeSchema = new Schema<RecipeDocument>({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Recipe title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  ingredients: {
    type: [IngredientSchema],
    required: true,
    validate: {
      validator: (v: unknown[]) => v.length > 0,
      message: 'At least one ingredient is required',
    },
  },
  instructions: {
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'At least one instruction is required',
    },
  },
  prepTime: {
    type: Number,
    min: 0,
  },
  cookTime: {
    type: Number,
    min: 0,
  },
  servings: {
    type: Number,
    min: 1,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  cuisine: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  images: [String],
  video: String,
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  },
  origin: {
    type: String,
    maxlength: 200,
  },
  story: {
    type: String,
    maxlength: 2000,
  },
  tips: [String],
  variations: [String],
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PENDING,
    index: true,
  },
  visibility: {
    type: String,
    enum: Object.values(VisibilityStatus),
    default: VisibilityStatus.FAMILY_ONLY,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  commentsCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
RecipeSchema.index({ familyId: 1, status: 1 });
RecipeSchema.index({ familyId: 1, category: 1 });
RecipeSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for total time
RecipeSchema.virtual('totalTime').get(function() {
  return (this.prepTime || 0) + (this.cookTime || 0);
});

// Virtual for like count
RecipeSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

export const Recipe: Model<RecipeDocument> =
  mongoose.models.Recipe || mongoose.model<RecipeDocument>('Recipe', RecipeSchema);

export default Recipe;
