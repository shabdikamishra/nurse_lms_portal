export type CourseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PUBLISHED'
  | 'REJECTED';

export const courseStatusLabel: Record<CourseStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
};

export const courseStatusClass: Record<CourseStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function normalizeCourseStatus(status?: string): CourseStatus {
  if (status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (status === 'PUBLISHED') return 'PUBLISHED';
  if (status === 'REJECTED') return 'REJECTED';
  return 'DRAFT';
}
