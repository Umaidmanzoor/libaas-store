import { randomBytes } from 'node:crypto';

export function testEmail(role = 'customer') {
  const domain = process.env.TEST_EMAIL_DOMAIN || 'example.invalid';
  if (!/^[a-z0-9.-]+$/i.test(domain) || !/^[a-z0-9-]+$/i.test(role)) {
    throw new Error('Invalid test email configuration');
  }
  return `${role}@${domain}`;
}

export function testPhone() {
  const phone = process.env.TEST_PHONE || '9'.repeat(10);
  if (!/^[6-9][0-9]{9}$/.test(phone)) throw new Error('Invalid TEST_PHONE');
  return phone;
}

export function testSecret() {
  return randomBytes(32).toString('hex');
}

export function testCard(field) {
  const name = `TEST_CARD_${field.toUpperCase()}`;
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} for payment capture test`);
  return value;
}
