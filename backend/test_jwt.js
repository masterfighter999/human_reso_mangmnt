require('dotenv').config();
const { signAccessToken, verifyAccessToken } = require('./src/utils/auth.util');

try {
  const token = signAccessToken('123', 'test@test.com', 'ADMIN');
  console.log("Token:", token);
  const decoded = verifyAccessToken(token);
  console.log("Decoded:", decoded);
} catch (e) {
  console.error(e);
}
