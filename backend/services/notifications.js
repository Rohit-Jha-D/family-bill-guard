function calculateNotificationPhase(dueDateStr) {
  if (!dueDateStr) return 'NONE';
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0,0,0,0);
  
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays === 0 || diffDays === 1) return 'URGENT';
  if (diffDays <= 3) return 'ACTION';
  if (diffDays <= 7) return 'EARLY';
  
  return 'GENERATED';
}

module.exports = { calculateNotificationPhase };