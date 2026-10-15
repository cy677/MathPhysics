// Keep upstream topic IDs stable while presenting three school subjects.
export const SUBJECTS = {
  math: {title: '数学', english: 'MATHEMATICS', description: '从数与计算，到图形、空间和逻辑。', zones: ['numbers', 'geometry', 'vectors', 'logic']},
  physics: {title: '物理', english: 'PHYSICS', description: '动手做实验，探索运动、能量和物质。', zones: ['physics', 'science']},
  chinese: {title: '语文', english: 'CHINESE', description: '练拼音、认汉字、找偏旁，在词语和成语配对中积累语言。', zones: ['language']}
};

export function activitySubject(activity) {
  return Object.keys(SUBJECTS).find(id => SUBJECTS[id].zones.includes(activity.zone));
}

export function filterActivities(activities, {subject = 'all', zone = 'all', grade = 'all', query = ''} = {}) {
  const search = query.trim().toLowerCase();
  return activities.filter(activity =>
    (subject === 'all' || activitySubject(activity) === subject) &&
    (zone === 'all' || activity.zone === zone) &&
    (grade === 'all' || activity.grades.includes(Number(grade))) &&
    (!search || [activity.title, activity.id, activity.description, ...activity.content].join(' ').toLowerCase().includes(search))
  );
}
