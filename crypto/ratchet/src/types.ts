export type Header = {
  dhPub: string;   // base64url
  pn: number;      // prev chain length
  n: number;       // message number in current chain
  ad?: string;     // optional associated data (base64url)
};

export type Packet = {
  header: Header;
  nonce: string;   // base64url
  ciphertext: string; // base64url
};

