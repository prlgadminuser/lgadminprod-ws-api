
const protobuf = require("protobufjs");
const LZString = require("lz-string");

async function compress(data) {
  // Define proto schema
  const protoDefinition = `
    syntax = "proto3";

    message Record {
      string t = 2;
      string p = 3;
      string m = 4;
      repeated string rl = 5;
    }

    message RecordList {
      repeated Record records = 1;
    }
  `;

  // Parse schema
  const root = protobuf.parse(protoDefinition).root;
  const RecordList = root.lookupType("RecordList");

  // Create payload
  const payload = { records: data };
  const errMsg = RecordList.verify(payload);
  if (errMsg) throw Error(errMsg);

  // Encode
  const message = RecordList.create(payload);
  const buffer = RecordList.encode(message).finish(); // Uint8Array

  // Compress
  const uint8Str = String.fromCharCode.apply(null, buffer);
  const compressed = LZString.compressToBase64(uint8Str);

  return compressed;
}

// Example usage:
const data = [
  { t: "1:29:59 AM", p: "Liquem", m: "4", rl: ["Admin", "Designer"] },
  { t: "4:08:26 PM", p: "Liquem", m: "zeze4ze", rl: [] },
  { t: "4:08:28 PM", p: "Liquem", m: "ezeze", rl: ["Admin", "Designer"] },
  { t: "4:08:39 PM", p: "Liquem", m: "6t", rl: ["Admin", "Designer"] }
];

module.export = { compress }