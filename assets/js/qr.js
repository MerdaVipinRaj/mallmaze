// Minimal QR generator (client-side, offline-safe).
// Exposes: window.MM_QR.draw(canvasEl, text, size)
//
// This is a small wrapper around a tiny QR algorithm implementation (MIT-like).
// It supports QR Code Model 2, byte mode, error correction level M.
(function () {
  if (window.MM_QR) return;

  // --- Tiny QR implementation (based on public-domain/MIT style QR routines) ---
  // NOTE: This is intentionally minimal and not feature-complete; sufficient for short URLs/tokens.
  const QR_EC_LEVEL = { L: 1, M: 0, Q: 3, H: 2 };

  function QR8bitByte(data) {
    this.mode = 1 << 2;
    this.data = data;
  }
  QR8bitByte.prototype = {
    getLength: function () { return this.data.length; },
    write: function (buffer) {
      for (let i = 0; i < this.data.length; i++) buffer.put(this.data.charCodeAt(i), 8);
    }
  };

  function BitBuffer() { this.buffer = []; this.length = 0; }
  BitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    },
    putBit: function (bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  // Galois field / polynomial helpers (only what we need)
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;
  function gexp(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return EXP_TABLE[n]; }
  function glog(n) { if (n < 1) throw new Error("glog"); return LOG_TABLE[n]; }

  function Polynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  Polynomial.prototype = {
    get: function (i) { return this.num[i]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
        }
      }
      return new Polynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = glog(this.get(0)) - glog(e.get(0));
      const num = this.num.slice();
      for (let i = 0; i < e.getLength(); i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
      return new Polynomial(num, 0).mod(e);
    }
  };

  // Very small RS block table for versions 1-6 (byte mode, EC M). Enough for short URLs.
  // Each entry: [version, totalCodewords, dataCodewords, ecCodewords]
  const RS_TABLE_M = {
    1: [26, 16, 10],
    2: [44, 28, 16],
    3: [70, 44, 26],
    4: [100, 64, 36],
    5: [134, 86, 48],
    6: [172, 108, 64],
  };

  function getBCHDigit(data) {
    let digit = 0;
    while (data !== 0) { digit++; data >>>= 1; }
    return digit;
  }
  function getBCHTypeInfo(data) {
    let d = data << 10;
    const g = 0b10100110111;
    while (getBCHDigit(d) - getBCHDigit(g) >= 0) d ^= (g << (getBCHDigit(d) - getBCHDigit(g)));
    return ((data << 10) | d) ^ 0b101010000010010;
  }

  function QRCode(version, ecLevel) {
    this.typeNumber = version;
    this.errorCorrectLevel = ecLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataList = [];
  }
  QRCode.prototype = {
    addData: function (data) { this.dataList.push(new QR8bitByte(data)); },
    isDark: function (row, col) { return this.modules[row][col]; },
    getModuleCount: function () { return this.moduleCount; },
    make: function () {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let r = 0; r < this.moduleCount; r++) {
        this.modules[r] = new Array(this.moduleCount).fill(null);
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupTimingPattern();
      this.setupTypeInfo(false, 0);
      const data = this.createData();
      this.mapData(data, 0);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          const isBorder = (r === -1 || r === 7 || c === -1 || c === 7);
          const isInner = (0 <= r && r <= 6 && 0 <= c && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (2 <= r && r <= 4 && 2 <= c && c <= 4)));
          this.modules[row + r][col + c] = isBorder ? false : isInner;
        }
      }
    },
    setupTimingPattern: function () {
      for (let i = 8; i < this.moduleCount - 8; i++) {
        if (this.modules[i][6] === null) this.modules[i][6] = (i % 2 === 0);
        if (this.modules[6][i] === null) this.modules[6][i] = (i % 2 === 0);
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      const data = (QR_EC_LEVEL.M << 3) | maskPattern;
      const bits = getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = !test && ((bits >> i) & 1) === 1;
        // vertical
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
        // horizontal
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    createData: function () {
      const rs = RS_TABLE_M[this.typeNumber];
      if (!rs) throw new Error("QR version too large for minimal generator");
      const totalCount = rs[0];
      const dataCount = rs[1];
      const ecCount = rs[2];

      const buffer = new BitBuffer();
      for (const d of this.dataList) {
        buffer.put(d.mode, 4);
        buffer.put(d.getLength(), this.typeNumber < 10 ? 8 : 16);
        d.write(buffer);
      }
      // terminator
      if (buffer.length + 4 <= dataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 !== 0) buffer.putBit(false);

      // padding
      const PAD0 = 0xec, PAD1 = 0x11;
      while (buffer.buffer.length < dataCount) buffer.buffer.push((buffer.buffer.length % 2 === 0) ? PAD0 : PAD1);

      // RS encode
      const dc = buffer.buffer.slice(0, dataCount);
      const rsPoly = (function () {
        let p = new Polynomial([1], 0);
        for (let i = 0; i < ecCount; i++) p = p.multiply(new Polynomial([1, gexp(i)], 0));
        return p;
      })();
      const rawPoly = new Polynomial(dc, ecCount);
      const modPoly = rawPoly.mod(rsPoly);
      const ec = new Array(ecCount).fill(0);
      for (let i = 0; i < ecCount; i++) {
        const modIndex = i + modPoly.getLength() - ecCount;
        ec[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
      return dc.concat(ec);
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;

      const mask = function (r, c) { return ((r + c) % 2) === 0; };

      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] === null) {
              let dark = false;
              if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              const m = mask(row, col - c);
              this.modules[row][col - c] = m ? !dark : dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
  };

  function bestVersionForText(text) {
    const len = String(text || "").length;
    // Very rough byte-mode capacities for EC M, versions 1-6.
    if (len <= 14) return 1;
    if (len <= 26) return 2;
    if (len <= 42) return 3;
    if (len <= 62) return 4;
    if (len <= 84) return 5;
    return 6;
  }

  function draw(canvas, text, size) {
    const s = Math.max(160, Math.min(320, Number(size || 240)));
    const v = bestVersionForText(text);
    const qr = new QRCode(v, QR_EC_LEVEL.M);
    qr.addData(String(text || ""));
    qr.make();

    const cells = qr.getModuleCount();
    const scale = Math.floor(s / cells);
    const margin = Math.max(2, Math.floor((s - cells * scale) / 2));
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#0f172a";
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(margin + c * scale, margin + r * scale, scale, scale);
        }
      }
    }
  }

  window.MM_QR = { draw };
})();

