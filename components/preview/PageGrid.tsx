'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { usePdfStore } from '@/lib/store/usePdfStore';
import { PageCard } from './PageCard';

export function PageGrid() {
  const { pages, sourceFiles, reorderPages, settings } = usePdfStore();

  const colorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const sf of sourceFiles) {
      map.set(sf.id, sf.colorCode);
    }
    return map;
  }, [sourceFiles]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderPages(active.id.toString(), over.id.toString());
    }
  };

  if (pages.length === 0) return null;

  // Adapt grid layout depending on user's preferred density
  let gridClasses = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5';

  if (settings.gridDensity === 'compact') {
    gridClasses = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5';
  } else if (settings.gridDensity === 'spacious') {
    gridClasses = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5';
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className={gridClasses}>
          {pages.map((page, index) => (
            <PageCard
              key={page.id}
              page={page}
              index={index}
              sourceColor={colorMap.get(page.fileId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
