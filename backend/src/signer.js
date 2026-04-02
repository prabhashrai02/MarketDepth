const crypto = require('crypto');

const privateKey = process.env.KALSHI_PRIVATE_KEY.replace(/\\n/g, '\n')
  .replace(/\r/g, '')
  .trim();

function signWs(timestamp) {
  const path = '/trade-api/ws/v2';
  const message = `${timestamp}GET${path}`;

  // Kalshi requires RSA-PSS, NOT RSA-SHA256 (PKCS1v15)
  const signature = crypto.sign('sha256', Buffer.from(message), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST, // salt length = digest length (32)
  });

  return signature.toString('base64');
}

module.exports = { signWs };
