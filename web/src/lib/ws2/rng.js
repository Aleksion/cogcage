export class Rng {
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }

  nextUint32() {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  next() {
    return this.nextUint32() / 0xffffffff;
  }

  nextRange(min, max) {
    return min + (max - min) * this.next();
  }

  pick(list) {
    const idx = Math.floor(this.next() * list.length);
    return list[Math.max(0, Math.min(list.length - 1, idx))];
  }
}
