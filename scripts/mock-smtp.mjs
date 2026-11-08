import net from "node:net";

// A stand-in mail server for the password tests: it accepts AUTH PLAIN and
// keeps each message in memory. Set mock.refuseLogin = true to answer the
// login with 535, as a mail host does for a wrong password.
export function startMockSmtp({ port = 3525 } = {}) {
  const mock = { messages: [], refuseLogin: false };
  mock.server = net.createServer((socket) => {
    let buffer = "",
      reading = false,
      mail = { to: [], data: "" };
    const send = (line) => socket.write(line + "\r\n");
    send("220 mock-smtp ESMTP");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let end;
      while ((end = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (reading) {
          if (line === ".") {
            reading = false;
            const subject = /^Subject: (.*)$/m.exec(mail.data)?.[1] ?? "";
            mock.messages.push({ ...mail, subject });
            mail = { to: [], data: "" };
            send("250 2.0.0 queued");
          } else
            mail.data += (line.startsWith("..") ? line.slice(1) : line) + "\n";
          continue;
        }
        const command = line.split(" ")[0].toUpperCase();
        if (command === "EHLO")
          socket.write("250-mock-smtp\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
        else if (command === "HELO") send("250 mock-smtp");
        else if (command === "AUTH")
          send(
            mock.refuseLogin
              ? "535 5.7.8 Authentication failed"
              : "235 2.7.0 Authentication successful",
          );
        else if (command === "MAIL") {
          mail.from = /<(.*)>/.exec(line)?.[1];
          send("250 OK");
        } else if (command === "RCPT") {
          mail.to.push(/<(.*)>/.exec(line)?.[1]);
          send("250 OK");
        } else if (command === "DATA") {
          reading = true;
          send("354 End data with <CR><LF>.<CR><LF>");
        } else if (command === "QUIT") {
          send("221 Bye");
          socket.end();
        } else send("250 OK");
      }
    });
    socket.on("error", () => {});
  });
  mock.server.listen(port, "127.0.0.1");
  // The code from the latest message.
  mock.lastCode = () =>
    /\b(\d{6})\b/.exec(mock.messages.at(-1)?.subject ?? "")?.[1];
  return mock;
}
