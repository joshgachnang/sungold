import {createServer, type RequestListener, type Server} from "node:http";
import supertest from "supertest";

// supertest(app) starts a server with listen(0), which under Bun binds the IPv6 wildcard
// only, then sends the request to 127.0.0.1:<port>. On macOS another process can hold that
// same port on 127.0.0.1 at the same time, so the request reaches that app instead and the
// test sees its 404 or 401. Binding loopback explicitly keeps the port ours. supertest still
// starts and closes the server around each request.
export const request = (app: RequestListener): ReturnType<typeof supertest> => {
  const server: Server = createServer(app);
  const listen = server.listen.bind(server);
  server.listen = ((port?: number, ...rest: unknown[]): Server =>
    listen(port, "127.0.0.1", ...(rest as []))) as Server["listen"];
  return supertest(server);
};
