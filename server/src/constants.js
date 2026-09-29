export const SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Sinhala',
  'Tamil',
  'History',
  'Geography',
  'ICT',
  'Buddhism',
  'Hinduism',
  'Islam',
  'Christianity',
  'Commerce',
  'Health Science',
  'Art',
  'Music',
  'Combined Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Agriculture',
  'Accounting',
  'Business Studies',
  'Economics',
  'Engineering Technology',
  'Science for Technology',
  'Political Science',
  'Logic',
];

function levelFor(n) {
  if (n <= 5) return 'Primary (Grade 1-5)';
  if (n <= 9) return 'Junior Secondary (Grade 6-9)';
  if (n <= 11) return 'O/L (Grade 10-11)';
  return 'A/L (Grade 12-13)';
}

// In Sri Lanka a child starts Grade 1 at about age 6
export const GRADES = Array.from({ length: 13 }, (_, i) => ({
  value: `Grade ${i + 1}`,
  age: i + 6,
  level: levelFor(i + 1),
}));

export const GRADE_VALUES = GRADES.map((g) => g.value);

export const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

export const MEDIUMS = ['Sinhala', 'Tamil', 'English'];

export const ROLES = ['student', 'teacher'];
