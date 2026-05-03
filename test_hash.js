const bcrypt = require("bcryptjs");

async function testHash() {
  const pass = "admin123";
  const hash = await bcrypt.hash(pass, 10);
  console.log("Password: ", pass);
  console.log("Hash: ", hash);
  const match = await bcrypt.compare(pass, hash);
  console.log("Match: ", match);
}

testHash();
