/**
 * Date utilities — single source of truth.
 * Replaces the duplicate formatTime() in chat.tsx and conversations.tsx,
 * and the separate formatRelativeTime() in notification.tsx.
 */

/**
 * Returns a human-readable relative time string.
 * e.g. "Just now", "5m", "3h", "2d", "Jan 5"
 *
 * Used by: ConversationItem, ChatMessage, NotificationRow
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (mins < 1) return "Just now";
  if (hours < 1) return `${mins}m`;
  if (days < 1) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

/**
 * Returns a verbose relative time string.
 * e.g. "just now", "3 minutes ago", "2 days ago"
 *
 * Used by: ReviewItem, CommentItem
 */
export function formatDistanceToNow(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (secs < 60) return "just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  if (weeks < 4) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/**
 * Returns HH:MM formatted time string.
 * Used in chat message timestamps.
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns true if the given date string falls on today's date.
 */
export function isToday(dateString: string): boolean {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
