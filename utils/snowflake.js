// snowflake-single.js

const EPOCH = 1288834974657n;  // Twitter epoch (ms) – you can use Date.now() - some years if you want smaller numbers

let lastTimestamp = -1n;
let sequence = 0n;

function snowflake() {
  let timestamp = BigInt(Date.now());

  if (timestamp < lastTimestamp) {
    throw new Error("Clock moved backwards – cannot generate ID");
  }

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & 4095n; // 12 bits = 0..4095
    if (sequence === 0n) {
     
      // Wait until next millisecond
      do {
        timestamp = BigInt(Date.now());
      } while (timestamp <= lastTimestamp);
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  // Layout: 41 bit time + 0 bits node + 12 bit sequence + 1 bit unused (or sign bit)
  // → total 54 bits used → safe in JS BigInt, sortable by time
  const id = ((timestamp - EPOCH) << 12n) + sequence;
 // console.log(id.toString())
  return id
}

// Returns string (most common / safe usage)
function createSnowFlakeId() {
  return snowflake().toString();
}

module.exports = createSnowFlakeId