'use strict';

/**
 * seeders/seed.js
 * Populates the database with demo data for development and grading.
 * Run: npm run seed
 *
 * Demo credentials:
 *   alice@wsu.edu    / admin123       (Admin)
 *   oscar@wsu.edu    / organizer123   (Organizer)
 *   riley@wsu.edu    / organizer123   (Organizer)
 *   pat@wsu.edu      / participant123 (Participant)
 *   sam@wsu.edu      / participant123 (Participant)
 *   max@wsu.edu      / banned123      (Participant — banned)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, User, Group, JoinRequest, Comment } = require('../models');

async function seed() {
  console.log('Syncing database…');
  await db.sync({ force: true }); // drops & recreates all tables

  // ─── Users ────────────────────────────────────────────────────────────────
  console.log('Seeding users…');
  const [alice, oscar, riley, pat, sam, max] = await Promise.all([
    User.create({ name: 'Alice Admin',      email: 'alice@wsu.edu',  password: await bcrypt.hash('admin123',       10), role: 'Admin',       major: 'CS Administration',       bio: 'Platform administrator for WSU StudyGroup.',                              status: 'active' }),
    User.create({ name: 'Oscar Organizer',  email: 'oscar@wsu.edu',  password: await bcrypt.hash('organizer123',  10), role: 'Organizer',   major: 'Computer Science (Senior)',bio: 'Senior CS student. Running study groups for CS courses.',                 status: 'active' }),
    User.create({ name: 'Riley Researcher', email: 'riley@wsu.edu',  password: await bcrypt.hash('organizer123',  10), role: 'Organizer',   major: 'Computer Science (Grad)',  bio: 'Graduate research assistant. Organizes groups to help undergrads.',       status: 'active' }),
    User.create({ name: 'Pat Participant',  email: 'pat@wsu.edu',    password: await bcrypt.hash('participant123',10), role: 'Participant', major: 'Mathematics (Sophomore)',   bio: 'Looking for study groups to improve in CS and Math courses.',             status: 'active' }),
    User.create({ name: 'Sam Student',      email: 'sam@wsu.edu',    password: await bcrypt.hash('participant123',10), role: 'Participant', major: 'Biology (Junior)',          bio: 'Pre-med student seeking study partners for Biology and Chemistry.',        status: 'active' }),
    User.create({ name: 'Max Banned',       email: 'max@wsu.edu',    password: await bcrypt.hash('banned123',     10), role: 'Participant', major: 'Economics (Freshman)',      bio: 'Account suspended for community guideline violations.',                   status: 'banned' }),
  ]);

  // ─── Groups ───────────────────────────────────────────────────────────────
  console.log('Seeding groups…');
  const g1 = await Group.create({
    name: 'CPTS 489 Web Dev Study Group', course: 'CPTS 489',
    description: 'Weekly study sessions for CPTS 489 Web Development. We cover React, Node.js, RESTful APIs, and coordinate on the semester project milestones. All skill levels welcome!',
    visibility: 'public', format: 'in-person', location: 'Holland Library, Room 204',
    meetingLink: '', schedule: 'Tuesdays 5:00 PM – 7:00 PM', maxSize: 10,
    tags: ['Web Dev', 'React', 'Node.js', 'CPTS'], organizerId: oscar.id,
  });
  const g2 = await Group.create({
    name: 'MATH 315 Linear Algebra Help', course: 'MATH 315',
    description: 'Private group for focused linear algebra study. Submit a join request describing your math background. Structured sessions with problem sets and proof walkthroughs.',
    visibility: 'private', format: 'in-person', location: 'Neill Hall, Room 5',
    meetingLink: '', schedule: 'Mondays & Thursdays 3:00 PM – 4:30 PM', maxSize: 6,
    tags: ['Math', 'Linear Algebra', 'Proofs', 'MATH'], organizerId: oscar.id,
  });
  const g3 = await Group.create({
    name: 'CPTS 360 Systems Programming', course: 'CPTS 360',
    description: 'Virtual study group for Systems Programming. Weekly Zoom sessions with code reviews, assignment Q&A, and exam prep. Very active group!',
    visibility: 'public', format: 'virtual', location: '',
    meetingLink: 'https://zoom.us/j/99912345678',
    schedule: 'Wednesdays 6:00 PM – 8:00 PM', maxSize: 12,
    tags: ['C', 'Systems', 'Linux', 'OS', 'CPTS'], organizerId: riley.id,
  });
  const g4 = await Group.create({
    name: 'BIO 106 General Biology Review', course: 'BIO 106',
    description: 'A relaxed, friendly study group for Bio 106. We meet at the CUB, go through lecture slides, and quiz each other before exams. Everyone is welcome!',
    visibility: 'public', format: 'in-person', location: 'CUB Lounge, Room 214',
    meetingLink: '', schedule: 'Fridays 1:00 PM – 3:00 PM', maxSize: 8,
    tags: ['Biology', 'Pre-Med', 'BIO'], organizerId: riley.id,
  });
  const g5 = await Group.create({
    name: 'ECON 101 Micro Study Circle', course: 'ECON 101',
    description: 'Intensive private study group for Microeconomics. Very structured sessions — quizzes, flashcards, problem sets. Request to join with a note about your background.',
    visibility: 'private', format: 'virtual', location: '',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/study-econ101',
    schedule: 'Sundays 2:00 PM – 4:00 PM', maxSize: 5,
    tags: ['Economics', 'Microeconomics', 'ECON'], organizerId: oscar.id,
  });
  await Group.create({
    name: 'CHEM 105 Chemistry Study Hall', course: 'CHEM 105',
    description: 'General chemistry study group. Removed by administrator for violating community guidelines.',
    visibility: 'public', format: 'in-person', location: 'Fulmer Hall, Room 201',
    meetingLink: '', schedule: 'Saturdays 10:00 AM – 12:00 PM', maxSize: 15,
    tags: ['Chemistry', 'STEM', 'CHEM'], organizerId: riley.id, status: 'removed', reports: 3,
  });

  // ─── Members ──────────────────────────────────────────────────────────────
  console.log('Seeding memberships…');
  await g1.addGroupMembers([oscar.id, pat.id]);
  await g2.addGroupMembers([oscar.id]);
  await g3.addGroupMembers([riley.id, pat.id, sam.id]);
  await g4.addGroupMembers([riley.id, sam.id]);
  await g5.addGroupMembers([oscar.id, sam.id]);

  // ─── Join Requests ────────────────────────────────────────────────────────
  console.log('Seeding join requests…');
  await JoinRequest.create({
    groupId: g2.id, userId: pat.id, status: 'pending',
    message: "I'm enrolled in MATH 315 and struggling with eigenvalues. Looking for a structured group to work through problem sets together.",
  });
  await JoinRequest.create({
    groupId: g2.id, userId: sam.id, status: 'pending',
    message: 'Preparing for the upcoming midterm. Good foundation in matrices, need help with proofs.',
  });
  await JoinRequest.create({
    groupId: g5.id, userId: pat.id, status: 'approved',
    message: 'Want to improve my understanding of supply/demand and market equilibrium.',
  });
  await JoinRequest.create({
    groupId: g3.id, userId: max.id, status: 'rejected',
    message: 'Want to join this group.',
  });

  // ─── Comments ─────────────────────────────────────────────────────────────
  console.log('Seeding comments…');
  await Comment.bulkCreate([
    { groupId: g1.id, userId: oscar.id, text: 'Welcome everyone! Our first session is Tuesday. Bring your laptops and make sure Node.js v20+ is installed.' },
    { groupId: g1.id, userId: pat.id,   text: 'Looking forward to it! Should we start with project setup or review the assignment requirements first?' },
    { groupId: g1.id, userId: oscar.id, text: "We'll do project setup for the first 30 min, then walk through the mid-deliverable spec together. See you Tuesday!" },
    { groupId: g3.id, userId: riley.id, text: "This week we'll focus on Chapter 5 – Memory Management. Please review the lecture slides beforehand." },
    { groupId: g3.id, userId: pat.id,   text: "Can we also go over homework problem 3? I'm stuck on the buffer overflow question." },
    { groupId: g3.id, userId: sam.id,   text: "I'll prepare some extra practice questions and share them before the session." },
    { groupId: g4.id, userId: riley.id, text: "Reminder: meeting at CUB this Friday. Room may change — I'll confirm Thursday night." },
    { groupId: g4.id, userId: sam.id,   text: "Should we focus on Chapter 3 cell division or review for the upcoming quiz?" },
    { groupId: g4.id, userId: riley.id, text: "Let's do both — quiz review first (30 min), then Chapter 3 notes. Bring any questions!" },
  ]);

  console.log('\nSeed complete! Demo credentials:');
  console.log('  alice@wsu.edu    / admin123       (Admin)');
  console.log('  oscar@wsu.edu    / organizer123   (Organizer)');
  console.log('  riley@wsu.edu    / organizer123   (Organizer)');
  console.log('  pat@wsu.edu      / participant123 (Participant)');
  console.log('  sam@wsu.edu      / participant123 (Participant)');
  console.log('  max@wsu.edu      / banned123      (Participant — banned)\n');

  await db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
