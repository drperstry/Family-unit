'use client';

import React, { useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, Button, Badge, Card } from '@/components/ui';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Plus,
  User,
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Gender } from '@/types';

interface TreeMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  gender: Gender;
  photo?: string;
  dateOfBirth?: Date;
  dateOfDeath?: Date;
  isDeceased?: boolean;
  generation: number;
  spouse?: {
    id: string;
    firstName: string;
    lastName: string;
    photo?: string;
    gender: Gender;
  } | null;
  children: TreeMember[];
}

interface FamilyTreeProps {
  tree: TreeMember[];
  showFemales?: boolean;
  onMemberClick?: (memberId: string) => void;
  onAddChild?: (parentId: string) => void;
  canEdit?: boolean;
}

export function FamilyTree({
  tree,
  showFemales = false,
  onMemberClick,
  onAddChild,
  canEdit = false,
}: FamilyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `family-tree-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const renderMemberCard = (member: TreeMember, isRoot: boolean = false) => {
    const hasChildren = member.children && member.children.length > 0;
    const isExpanded = expandedNodes.has(member.id) || isRoot;

    const getAge = () => {
      if (!member.dateOfBirth) return null;
      const endDate = member.dateOfDeath ? new Date(member.dateOfDeath) : new Date();
      const birthDate = new Date(member.dateOfBirth);
      return Math.floor((endDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    };

    const age = getAge();

    return (
      <div key={member.id} className="flex flex-col items-center">
        {/* Member Card */}
        <div className="flex items-center gap-2">
          <Card
            variant="bordered"
            padding="sm"
            className={cn(
              'min-w-[160px] cursor-pointer transition-all hover:shadow-lg',
              member.isDeceased && 'opacity-75',
              member.gender === Gender.MALE
                ? 'border-l-4 border-l-blue-500'
                : 'border-l-4 border-l-pink-500'
            )}
            onClick={() => onMemberClick?.(member.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={member.photo}
                name={member.displayName || `${member.firstName} ${member.lastName}`}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {member.displayName || `${member.firstName} ${member.lastName}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {age !== null && (
                    <Badge variant="default" size="sm">
                      {member.isDeceased ? `${age}†` : age}
                    </Badge>
                  )}
                  <Badge
                    variant={member.gender === Gender.MALE ? 'info' : 'primary'}
                    size="sm"
                  >
                    Gen {member.generation}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Spouse */}
          {member.spouse && showFemales && (
            <>
              <div className="w-8 h-0.5 bg-pink-400" />
              <Card
                variant="bordered"
                padding="sm"
                className="min-w-[140px] cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-pink-500"
                onClick={() => onMemberClick?.(member.spouse!.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.spouse.photo}
                    name={`${member.spouse.firstName} ${member.spouse.lastName}`}
                    size="sm"
                  />
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {member.spouse.firstName} {member.spouse.lastName}
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => toggleNode(member.id)}
            className="mt-2 p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}

        {/* Add Child Button */}
        {canEdit && (
          <button
            onClick={() => onAddChild?.(member.id)}
            className="mt-2 p-1 rounded-full bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            title="Add child"
          >
            <Plus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-4">
            {/* Vertical line */}
            <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600 mx-auto" />

            {/* Horizontal line connecting children */}
            {member.children.length > 1 && (
              <div className="h-0.5 bg-gray-300 dark:bg-gray-600" style={{
                width: `${Math.max((member.children.length - 1) * 200, 100)}px`,
                margin: '0 auto'
              }} />
            )}

            {/* Children nodes */}
            <div className="flex gap-8 mt-2">
              {member.children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  {member.children.length > 1 && (
                    <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
                  )}
                  {renderMemberCard(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <Button variant="ghost" size="icon" onClick={handleReset} title="Reset">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleExport} title="Export as image">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Male</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-pink-500" />
          <span className="text-gray-600 dark:text-gray-400">Female</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">† = Deceased</span>
        </div>
      </div>

      {/* Tree Container */}
      <div className="w-full h-full overflow-auto p-8">
        <div
          ref={containerRef}
          className="inline-flex flex-col items-center min-w-max transition-transform duration-200"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          {tree.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No family tree yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Start building your family tree by adding members
              </p>
              {canEdit && (
                <Button onClick={() => onAddChild?.('')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            tree.map((root) => renderMemberCard(root, true))
          )}
        </div>
      </div>
    </div>
  );
}
