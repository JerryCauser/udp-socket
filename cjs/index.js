var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var udp_socket_exports = {};
__export(udp_socket_exports, {
  DEFAULT_PORT: () => DEFAULT_PORT,
  UDPClient: () => client_default,
  UDPSocket: () => socket_default
});
module.exports = __toCommonJS(udp_socket_exports);

// src/socket.js
var import_node_events = __toESM(require("node:events"), 1);
var import_node_dgram = __toESM(require("node:dgram"), 1);
var import_node_stream = require("node:stream");

// src/constants.js
var DEFAULT_PORT = 44002;

// src/socket.js
var UDPSocket = class extends import_node_stream.Readable {
  #port;
  #address;
  #type;
  #socket;
  #allowPush = false;
  #handleSocketMessage = (data, head) => this.handleMessage(data, head);
  #handleSocketError = (error) => this.destroy(error);
  constructor(options) {
    const {
      type = "udp4",
      address = type === "udp4" ? "127.0.0.1" : "::1",
      port = DEFAULT_PORT,
      objectMode = true,
      ...readableOptions
    } = options ?? {};
    super({ ...readableOptions, objectMode });
    this.#type = type;
    this.#address = address;
    this.#port = port;
  }
  _construct(callback) {
    this.#start().then(() => callback(null)).catch(callback);
  }
  _destroy(error, callback) {
    if (error) {
      this.emit("error", error);
    }
    this.#stop().then(() => callback(error)).catch(callback);
  }
  _read(size) {
    this.#allowPush = true;
  }
  get origin() {
    return this.#socket;
  }
  get address() {
    return this.origin.address().address;
  }
  get port() {
    return this.origin.address().port;
  }
  get family() {
    return this.origin.address().family;
  }
  get allowPush() {
    return this.#allowPush;
  }
  async #start() {
    await this.#initSocket();
    this.#attachHandlers();
    this.emit("ready");
  }
  async #stop() {
    if (!this.#socket)
      return;
    this.#detachHandlers();
    this.#socket.close();
    await import_node_events.default.once(this.#socket, "close");
  }
  async #initSocket() {
    this.#socket = import_node_dgram.default.createSocket({ type: this.#type });
    this.#socket.bind(this.#port, this.#address);
    const error = await Promise.race([
      import_node_events.default.once(this.#socket, "listening"),
      import_node_events.default.once(this.#socket, "error")
    ]);
    if (error instanceof Error) {
      this.destroy(error);
    }
  }
  #attachHandlers() {
    this.#socket.on("error", this.#handleSocketError);
    this.#socket.on("message", this.#handleSocketMessage);
  }
  #detachHandlers() {
    this.#socket.off("error", this.#handleSocketError);
    this.#socket.off("message", this.#handleSocketMessage);
  }
  handleMessage(body, head) {
    if (this.#allowPush) {
      this.#allowPush = this.push(body);
    }
    return this.#allowPush;
  }
};
var socket_default = UDPSocket;

// src/client.js
var import_node_dgram2 = __toESM(require("node:dgram"), 1);
var import_node_stream2 = require("node:stream");
var import_node_events2 = __toESM(require("node:events"), 1);
var UDPClient = class extends import_node_stream2.Writable {
  #port;
  #address;
  #type;
  #socket;
  constructor(options) {
    const {
      type = "udp4",
      port = 44002,
      address = type === "udp4" ? "127.0.0.1" : "::1",
      objectMode = true,
      ...readableOptions
    } = options ?? {};
    super({ ...readableOptions, objectMode });
    this.#port = port;
    this.#address = address;
    this.#type = type;
  }
  _construct(callback) {
    this.#start().then(() => callback(null)).catch(callback);
  }
  _write(chunk, encoding, callback) {
    this.#send(chunk, callback);
  }
  _destroy(error, callback) {
    if (error) {
      this.emit("error", error);
    }
    this.#stop().then(() => callback(error)).catch(callback);
  }
  async #start() {
    this.#socket = import_node_dgram2.default.createSocket(this.#type);
    this.#socket.connect(this.#port, this.#address);
    await import_node_events2.default.once(this.#socket, "connect");
    this.emit("ready");
  }
  async #stop() {
    if (!this.#socket)
      return;
    this.#socket.close();
    await import_node_events2.default.once(this.#socket, "close");
  }
  get origin() {
    return this.#socket;
  }
  get address() {
    return this.origin.address().address;
  }
  get port() {
    return this.origin.address().port;
  }
  get family() {
    return this.origin.address().family;
  }
  #send(buffer, callback) {
    this.#socket.send(buffer, callback);
  }
};
var client_default = UDPClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_PORT,
  UDPClient,
  UDPSocket
});
