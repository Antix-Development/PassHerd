// Butchered version of the code by Chris Veness found at https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a

/**
 * Encrypts (using AES-GCM) the given plaintext with the given password.
 * @param   {String} plaintext - Plaintext to be encrypted.
 * @param   {String} password - Password to use to encrypt plaintext.
 * @returns {String} Encrypted ciphertext.
 */
async function encrypt(plaintext, password) {
  const pwHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
  iv = crypto.getRandomValues(new Uint8Array(12)),
  alg = { name: 'AES-GCM', iv: iv },
  key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']),
  ctBuffer = await crypto.subtle.encrypt(alg, key, new TextEncoder().encode(plaintext));
  return btoa(`${Array.from(iv).map(b => String.fromCharCode(b)).join('')}${Array.from(new Uint8Array(ctBuffer)).map(byte => String.fromCharCode(byte)).join('')}`);             
}

/**
* Decrypts given ciphertext encrypted using the given password.
* @param   {String} ciphertext - Ciphertext to be decrypted.
* @param   {String} password - Password to use to decrypt ciphertext.
* @returns {String} Decrypted plaintext.
*/
async function decrypt(ciphertext, password) {
  const pwHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
  iv = new Uint8Array(Array.from(atob(ciphertext).slice(0,12)).map(ch => ch.charCodeAt(0))),
  alg = { name: 'AES-GCM', iv: iv },
  key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
  try {
      const plainBuffer = await crypto.subtle.decrypt(alg, key, new Uint8Array(Array.from(atob(ciphertext).slice(12)).map(ch => ch.charCodeAt(0))));
      return new TextDecoder().decode(plainBuffer);
    } catch (e) {
    return null;
  }
}
