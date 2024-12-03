//const cryptojs = require("crypto-js");

function caesarcipher(text, key) {
  return text
    .split("")
    .map((char) => String.fromCharCode(char.charCodeAt(0) + key))
    .join("");
}

function encryptQR(obj) {
  let str = "";

  for (const key in obj) {
    str += obj[key] + "#";
  }
  str = str.slice(0, -1);
  const key = CryptoJS.enc.Utf8.parse("mysecretaeskey16");
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(str, key, { iv: iv });

  const combined =
    iv.toString(CryptoJS.enc.Hex) +
    "#" +
    encrypted.ciphertext.toString(CryptoJS.enc.Hex);

  console.log(combined);
  return combined;
}

function decryptQR(qrcontent) {
  qrcontent = qrcontent.toString();
  const [hexIv, hexCiphertext] = qrcontent.split("#");

  const iv = CryptoJS.enc.Hex.parse(hexIv);
  const ciphertext = CryptoJS.enc.Hex.parse(hexCiphertext);

  const key = CryptoJS.enc.Utf8.parse("mysecretaeskey16");
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
    iv: iv,
  });

  const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
  console.log(decryptedStr);
  return decryptedStr;
}
const testObj = { name: "Mobasshir", roll: 22052727, year: 4 };

//encryptQR(testObj);
let encrypted = caesarcipher("13:12:48", 5);
console.log(encrypted);
console.log(caesarcipher(encrypted, -5));
