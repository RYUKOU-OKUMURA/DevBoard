import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import type { TrackedRepoIssueItem } from '../../hooks/useTrackedRepoIssues';
import { focusRing } from '../../lib/focusRing';
import type { IssueLocalMeta } from '../../types';
import { getKanbanColumn, type KanbanColumn } from './kanbanColumn';

const COLUMNS: { id: KanbanColumn; title: string; hint: string }[] = [
  { id: 'todo', title: 'やる', hint: '未完了（Open）' },
  { id: 'doing', title: '作業中', hint: 'DevBoard内だけの目印' },
  { id: 'done', title: '完了', hint: '完了（Closed）' },
];

const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' } as const;

interface IssueKanbanProps {
  items: TrackedRepoIssueItem[];
  getMeta: (repoId: string, issueNumber: number) => IssueLocalMeta | null;
  onSelect: (item: TrackedRepoIssueItem) => void;
  onMove: (item: TrackedRepoIssueItem, to: KanbanColumn) => void;
}

const itemKey = ({ repo, issue }: TrackedRepoIssueItem) => `${repo.id}#${issue.number}`;

export function IssueKanban({ items, getMeta, onSelect, onMove }: IssueKanbanProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const item = items.find((candidate) => itemKey(candidate) === active.id);
    if (item && over) onMove(item, over.id as KanbanColumn);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-stack-md md:grid-cols-3">
        {COLUMNS.map((column, index) => (
          <KanbanColumnView
            key={column.id}
            column={column}
            prev={COLUMNS[index - 1]}
            next={COLUMNS[index + 1]}
            items={items.filter(({ repo, issue }) => getKanbanColumn(issue.state, getMeta(repo.id, issue.number)) === column.id)}
            getMeta={getMeta}
            onSelect={onSelect}
            onMove={onMove}
          />
        ))}
      </div>
    </DndContext>
  );
}

type ColumnDef = (typeof COLUMNS)[number];

function KanbanColumnView({
  column,
  prev,
  next,
  items,
  getMeta,
  onSelect,
  onMove,
}: Omit<IssueKanbanProps, 'items'> & { column: ColumnDef; prev?: ColumnDef; next?: ColumnDef; items: TrackedRepoIssueItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.title}の列`}
      className={`flex min-h-[200px] flex-col gap-stack-sm rounded-lg border p-inset-sm transition-colors motion-reduce:transition-none ${
        isOver ? 'border-[var(--accent-green-border)] bg-[var(--accent-green-muted)]' : 'border-[var(--border-subtle)] bg-surface-secondary'
      }`}
    >
      <h2 className="flex items-baseline gap-inline-sm px-inset-xs text-body font-semibold text-[var(--text-primary)]">
        {column.title}
        <span className="text-caption font-normal text-[var(--text-muted)]">{items.length} 件 · {column.hint}</span>
      </h2>
      <ul aria-label={`${column.title}のIssue一覧`} className="grid list-none gap-stack-sm p-0">
        {items.map((item) => (
          <KanbanCard key={itemKey(item)} item={item} meta={getMeta(item.repo.id, item.issue.number)} prev={prev} next={next} onSelect={onSelect} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

function KanbanCard({
  item,
  meta,
  prev,
  next,
  onSelect,
  onMove,
}: {
  item: TrackedRepoIssueItem;
  meta: IssueLocalMeta | null;
  prev?: ColumnDef;
  next?: ColumnDef;
  onSelect: IssueKanbanProps['onSelect'];
  onMove: IssueKanbanProps['onMove'];
}) {
  const { repo, issue } = item;
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({ id: itemKey(item) });
  const moveButtonClass = `rounded-md border border-[var(--border-subtle)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-green)]`;
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`rounded-lg border border-[var(--border-subtle)] bg-surface-primary shadow-sm ${isDragging ? 'relative z-10 opacity-80 shadow-lg' : ''}`}
    >
      <button
        type="button"
        aria-label={`${repo.nameWithOwner} #${issue.number}: ${issue.title} の詳細を開く`}
        onClick={() => onSelect(item)}
        className={`w-full rounded-t-lg p-inset-sm text-left transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
      >
        <p className="break-all text-caption text-[var(--text-muted)]">{repo.nameWithOwner} · #{issue.number}</p>
        <h3 className="mt-stack-xs break-words text-body-sm font-semibold text-[var(--text-primary)]">{issue.title}</h3>
        {(meta?.priority || meta?.dueDate) && (
          <p className="mt-stack-xs text-caption text-[var(--text-secondary)]">
            {meta.priority && `優先度: ${PRIORITY_LABEL[meta.priority]}`}
            {meta.priority && meta.dueDate && ' · '}
            {meta.dueDate && `期限: ${meta.dueDate}`}
          </p>
        )}
      </button>
      <div className="flex flex-wrap justify-between gap-inline-xs border-t border-[var(--border-subtle)] px-inset-sm py-inset-xs">
        {prev ? (
          <button type="button" aria-label={`#${issue.number} を「${prev.title}」へ移動`} onClick={() => onMove(item, prev.id)} className={moveButtonClass}>
            ← {prev.title}
          </button>
        ) : <span />}
        {next && (
          <button type="button" aria-label={`#${issue.number} を「${next.title}」へ移動`} onClick={() => onMove(item, next.id)} className={moveButtonClass}>
            {next.title} →
          </button>
        )}
      </div>
    </li>
  );
}
