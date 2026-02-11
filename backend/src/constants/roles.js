const ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
  PARENT: 'parent',
  ACCOUNTANT: 'accountant',
  LIBRARIAN: 'librarian',
  PLACEMENT_OFFICER: 'placement_officer',
};

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 80,
  [ROLES.PLACEMENT_OFFICER]: 60,
  [ROLES.ACCOUNTANT]: 60,
  [ROLES.LIBRARIAN]: 60,
  [ROLES.FACULTY]: 50,
  [ROLES.PARENT]: 30,
  [ROLES.STUDENT]: 20,
};

module.exports = { ROLES, ROLE_HIERARCHY };
