import "server-only";

// Zanclus operator login for the file-based CMS. Only an scrypt hash of the
// password is stored here; the password itself was given to the owner and
// is never committed. ADMIN_EMAIL and ADMIN_PASSWORD in the server
// environment replace this account when they are set.
export const operatorAccount = {
  email: "operator@zanclusdive.com",
  salt: "B0o6EY3sdPfYhVyUQVHPIg",
  hash: "agv4oHf1jX7rbkw2hzs4GIKTZxWYoOR1DfpDeygHzi2QO4pkvkrENLqtjAG5fSIzQk_JPBr1BdeDalTrcMa_WA",
};
