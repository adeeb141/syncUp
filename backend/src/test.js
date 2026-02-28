// test-dns.js
import dns from "dns";

dns.lookup("empty-dream-a1c2esyp.ap-southeast-1.aws.neon.tech", (err, address) => {
  console.log(err || address);
});