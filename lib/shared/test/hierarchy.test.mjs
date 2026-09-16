import test from 'node:test';
import assert from 'node:assert/strict';
import { groupDecksByCourse } from '../src/hierarchy.ts';
import { textToProseMirrorDoc, proseMirrorDocToText } from '../src/content.ts';

test('groupDecksByCourse creates 4-tier hierarchy correctly', () => {
  const courses = [
    { id: 'c1', name: 'Computer Science', code: 'CS101', color: 'blue', targetHoursPerWeek: 10, createdAt: '' },
    { id: 'c2', name: 'Mathematics', code: 'MATH201', color: 'red', targetHoursPerWeek: 8, createdAt: '' }
  ];

  const decks = [
    { id: 'd1', courseId: 'c1', title: 'Data Structures', cardCount: 20, dueCount: 5, masteryPercentage: 80 },
    { id: 'd2', courseId: 'c1', title: 'Algorithms', cardCount: 15, dueCount: 0, masteryPercentage: 60 },
    { id: 'd3', courseId: null, title: 'General Trivia', cardCount: 10, dueCount: 2, masteryPercentage: 40 }
  ];

  const result = groupDecksByCourse(courses, decks);

  assert.equal(result.courses.length, 2);
  const cs = result.courses.find(c => c.course.id === 'c1');
  assert.equal(cs.decks.length, 2);
  assert.equal(cs.totalCards, 35);
  assert.equal(cs.dueCount, 5);
  assert.equal(cs.masteryPct, 70); // (80 + 60) / 2

  const math = result.courses.find(c => c.course.id === 'c2');
  assert.equal(math.decks.length, 0);
  assert.equal(math.totalCards, 0);

  assert.equal(result.uncategorized.length, 1);
  assert.equal(result.uncategorized[0].id, 'd3');
  assert.equal(result.totalCards, 45);
  assert.equal(result.totalDue, 7);
});

test('ProseMirror text AST helpers serialize and deserialize cleanly', () => {
  const text = 'Line 1: Term\nLine 2: Definition';
  const doc = textToProseMirrorDoc(text);
  assert.equal(doc.type, 'doc');
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].type, 'paragraph');
  assert.equal(doc.content[0].content[0].text, 'Line 1: Term');

  const back = proseMirrorDocToText(doc);
  assert.equal(back, text);
});
