export const normalizeLoginEmail = (value = '') => String(value || '').trim().toLowerCase();

export const normalizeAccessCode = (value = '') => String(value || '').trim().toLowerCase();

export const findUserByCredentials = (users = [], credentials = {}) => {
  const email = normalizeLoginEmail(typeof credentials === 'string' ? credentials : credentials?.email);
  const password = normalizeAccessCode(typeof credentials === 'string' ? '' : credentials?.password);
  const foundUser = users.find(user => normalizeLoginEmail(user.email) === email);

  if (!foundUser) return null;
  if (foundUser.accessCode && normalizeAccessCode(foundUser.accessCode) !== password) return null;
  return foundUser;
};
