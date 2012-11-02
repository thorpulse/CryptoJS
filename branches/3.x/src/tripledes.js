﻿(function () {
    /*global CryptoJS:true */

    'use strict';

    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var BlockCipher = C_lib.BlockCipher;
    var C_algo = C.algo;
    var C_err = C.err;

    // Permuted Choice 1 constants
    var PC1 = [
        57,  49,  41,  33,  25,  17,   9,   1,
        58,  50,  42,  34,  26,  18,  10,   2,
        59,  51,  43,  35,  27,  19,  11,   3,
        60,  52,  44,  36,  63,  55,  47,  39,
        31,  23,  15,   7,  62,  54,  46,  38,
        30,  22,  14,   6,  61,  53,  45,  37,
        29,  21,  13,   5,  28,  20,  12,   4
    ];

    // Permuted Choice 2 constants
    var PC2 = [
        14,  17,  11,  24,   1,   5,
         3,  28,  15,   6,  21,  10,
        23,  19,  12,   4,  26,   8,
        16,   7,  27,  20,  13,   2,
        41,  52,  31,  37,  47,  55,
        30,  40,  51,  45,  33,  48,
        44,  49,  39,  56,  34,  53,
        46,  42,  50,  36,  29,  32
    ];

    // Cumulative bit shift constants
    var BIT_SHIFTS = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

    // SBOXes and precomputed round permutation constants
    var SBOX_P = [
        {
            0x00000000: 0x00808200,  0x10000000: 0x00008000,  0x20000000: 0x00808002,  0x30000000: 0x00000002,
            0x40000000: 0x00000200,  0x50000000: 0x00808202,  0x60000000: 0x00800202,  0x70000000: 0x00800000,
            0x80000000: 0x00000202,  0x90000000: 0x00800200,  0xa0000000: 0x00008200,  0xb0000000: 0x00808000,
            0xc0000000: 0x00008002,  0xd0000000: 0x00800002,  0xe0000000: 0x00000000,  0xf0000000: 0x00008202,
            0x08000000: 0x00000000,  0x18000000: 0x00808202,  0x28000000: 0x00008202,  0x38000000: 0x00008000,
            0x48000000: 0x00808200,  0x58000000: 0x00000200,  0x68000000: 0x00808002,  0x78000000: 0x00000002,
            0x88000000: 0x00800200,  0x98000000: 0x00008200,  0xa8000000: 0x00808000,  0xb8000000: 0x00800202,
            0xc8000000: 0x00800002,  0xd8000000: 0x00008002,  0xe8000000: 0x00000202,  0xf8000000: 0x00800000,
            0x00000001: 0x00008000,  0x10000001: 0x00000002,  0x20000001: 0x00808200,  0x30000001: 0x00800000,
            0x40000001: 0x00808002,  0x50000001: 0x00008200,  0x60000001: 0x00000200,  0x70000001: 0x00800202,
            0x80000001: 0x00808202,  0x90000001: 0x00808000,  0xa0000001: 0x00800002,  0xb0000001: 0x00008202,
            0xc0000001: 0x00000202,  0xd0000001: 0x00800200,  0xe0000001: 0x00008002,  0xf0000001: 0x00000000,
            0x08000001: 0x00808202,  0x18000001: 0x00808000,  0x28000001: 0x00800000,  0x38000001: 0x00000200,
            0x48000001: 0x00008000,  0x58000001: 0x00800002,  0x68000001: 0x00000002,  0x78000001: 0x00008202,
            0x88000001: 0x00008002,  0x98000001: 0x00800202,  0xa8000001: 0x00000202,  0xb8000001: 0x00808200,
            0xc8000001: 0x00800200,  0xd8000001: 0x00000000,  0xe8000001: 0x00008200,  0xf8000001: 0x00808002
        },
        {
            0x00000000: 0x40084010,  0x01000000: 0x00004000,  0x02000000: 0x00080000,  0x03000000: 0x40080010,
            0x04000000: 0x40000010,  0x05000000: 0x40084000,  0x06000000: 0x40004000,  0x07000000: 0x00000010,
            0x08000000: 0x00084000,  0x09000000: 0x40004010,  0x0a000000: 0x40000000,  0x0b000000: 0x00084010,
            0x0c000000: 0x00080010,  0x0d000000: 0x00000000,  0x0e000000: 0x00004010,  0x0f000000: 0x40080000,
            0x00800000: 0x40004000,  0x01800000: 0x00084010,  0x02800000: 0x00000010,  0x03800000: 0x40004010,
            0x04800000: 0x40084010,  0x05800000: 0x40000000,  0x06800000: 0x00080000,  0x07800000: 0x40080010,
            0x08800000: 0x00080010,  0x09800000: 0x00000000,  0x0a800000: 0x00004000,  0x0b800000: 0x40080000,
            0x0c800000: 0x40000010,  0x0d800000: 0x00084000,  0x0e800000: 0x40084000,  0x0f800000: 0x00004010,
            0x10000000: 0x00000000,  0x11000000: 0x40080010,  0x12000000: 0x40004010,  0x13000000: 0x40084000,
            0x14000000: 0x40080000,  0x15000000: 0x00000010,  0x16000000: 0x00084010,  0x17000000: 0x00004000,
            0x18000000: 0x00004010,  0x19000000: 0x00080000,  0x1a000000: 0x00080010,  0x1b000000: 0x40000010,
            0x1c000000: 0x00084000,  0x1d000000: 0x40004000,  0x1e000000: 0x40000000,  0x1f000000: 0x40084010,
            0x10800000: 0x00084010,  0x11800000: 0x00080000,  0x12800000: 0x40080000,  0x13800000: 0x00004000,
            0x14800000: 0x40004000,  0x15800000: 0x40084010,  0x16800000: 0x00000010,  0x17800000: 0x40000000,
            0x18800000: 0x40084000,  0x19800000: 0x40000010,  0x1a800000: 0x40004010,  0x1b800000: 0x00080010,
            0x1c800000: 0x00000000,  0x1d800000: 0x00004010,  0x1e800000: 0x40080010,  0x1f800000: 0x00084000
        },
        {
            0x00000000: 0x00000104,  0x00100000: 0x00000000,  0x00200000: 0x04000100,  0x00300000: 0x00010104,
            0x00400000: 0x00010004,  0x00500000: 0x04000004,  0x00600000: 0x04010104,  0x00700000: 0x04010000,
            0x00800000: 0x04000000,  0x00900000: 0x04010100,  0x00a00000: 0x00010100,  0x00b00000: 0x04010004,
            0x00c00000: 0x04000104,  0x00d00000: 0x00010000,  0x00e00000: 0x00000004,  0x00f00000: 0x00000100,
            0x00080000: 0x04010100,  0x00180000: 0x04010004,  0x00280000: 0x00000000,  0x00380000: 0x04000100,
            0x00480000: 0x04000004,  0x00580000: 0x00010000,  0x00680000: 0x00010004,  0x00780000: 0x00000104,
            0x00880000: 0x00000004,  0x00980000: 0x00000100,  0x00a80000: 0x04010000,  0x00b80000: 0x00010104,
            0x00c80000: 0x00010100,  0x00d80000: 0x04000104,  0x00e80000: 0x04010104,  0x00f80000: 0x04000000,
            0x01000000: 0x04010100,  0x01100000: 0x00010004,  0x01200000: 0x00010000,  0x01300000: 0x04000100,
            0x01400000: 0x00000100,  0x01500000: 0x04010104,  0x01600000: 0x04000004,  0x01700000: 0x00000000,
            0x01800000: 0x04000104,  0x01900000: 0x04000000,  0x01a00000: 0x00000004,  0x01b00000: 0x00010100,
            0x01c00000: 0x04010000,  0x01d00000: 0x00000104,  0x01e00000: 0x00010104,  0x01f00000: 0x04010004,
            0x01080000: 0x04000000,  0x01180000: 0x00000104,  0x01280000: 0x04010100,  0x01380000: 0x00000000,
            0x01480000: 0x00010004,  0x01580000: 0x04000100,  0x01680000: 0x00000100,  0x01780000: 0x04010004,
            0x01880000: 0x00010000,  0x01980000: 0x04010104,  0x01a80000: 0x00010104,  0x01b80000: 0x04000004,
            0x01c80000: 0x04000104,  0x01d80000: 0x04010000,  0x01e80000: 0x00000004,  0x01f80000: 0x00010100
        },
        {
            0x00000000: 0x80401000,  0x00010000: 0x80001040,  0x00020000: 0x00401040,  0x00030000: 0x80400000,
            0x00040000: 0x00000000,  0x00050000: 0x00401000,  0x00060000: 0x80000040,  0x00070000: 0x00400040,
            0x00080000: 0x80000000,  0x00090000: 0x00400000,  0x000a0000: 0x00000040,  0x000b0000: 0x80001000,
            0x000c0000: 0x80400040,  0x000d0000: 0x00001040,  0x000e0000: 0x00001000,  0x000f0000: 0x80401040,
            0x00008000: 0x80001040,  0x00018000: 0x00000040,  0x00028000: 0x80400040,  0x00038000: 0x80001000,
            0x00048000: 0x00401000,  0x00058000: 0x80401040,  0x00068000: 0x00000000,  0x00078000: 0x80400000,
            0x00088000: 0x00001000,  0x00098000: 0x80401000,  0x000a8000: 0x00400000,  0x000b8000: 0x00001040,
            0x000c8000: 0x80000000,  0x000d8000: 0x00400040,  0x000e8000: 0x00401040,  0x000f8000: 0x80000040,
            0x00100000: 0x00400040,  0x00110000: 0x00401000,  0x00120000: 0x80000040,  0x00130000: 0x00000000,
            0x00140000: 0x00001040,  0x00150000: 0x80400040,  0x00160000: 0x80401000,  0x00170000: 0x80001040,
            0x00180000: 0x80401040,  0x00190000: 0x80000000,  0x001a0000: 0x80400000,  0x001b0000: 0x00401040,
            0x001c0000: 0x80001000,  0x001d0000: 0x00400000,  0x001e0000: 0x00000040,  0x001f0000: 0x00001000,
            0x00108000: 0x80400000,  0x00118000: 0x80401040,  0x00128000: 0x00000000,  0x00138000: 0x00401000,
            0x00148000: 0x00400040,  0x00158000: 0x80000000,  0x00168000: 0x80001040,  0x00178000: 0x00000040,
            0x00188000: 0x80000040,  0x00198000: 0x00001000,  0x001a8000: 0x80001000,  0x001b8000: 0x80400040,
            0x001c8000: 0x00001040,  0x001d8000: 0x80401000,  0x001e8000: 0x00400000,  0x001f8000: 0x00401040
        },
        {
            0x00000000: 0x00000080,  0x00001000: 0x01040000,  0x00002000: 0x00040000,  0x00003000: 0x20000000,
            0x00004000: 0x20040080,  0x00005000: 0x01000080,  0x00006000: 0x21000080,  0x00007000: 0x00040080,
            0x00008000: 0x01000000,  0x00009000: 0x20040000,  0x0000a000: 0x20000080,  0x0000b000: 0x21040080,
            0x0000c000: 0x21040000,  0x0000d000: 0x00000000,  0x0000e000: 0x01040080,  0x0000f000: 0x21000000,
            0x00000800: 0x01040080,  0x00001800: 0x21000080,  0x00002800: 0x00000080,  0x00003800: 0x01040000,
            0x00004800: 0x00040000,  0x00005800: 0x20040080,  0x00006800: 0x21040000,  0x00007800: 0x20000000,
            0x00008800: 0x20040000,  0x00009800: 0x00000000,  0x0000a800: 0x21040080,  0x0000b800: 0x01000080,
            0x0000c800: 0x20000080,  0x0000d800: 0x21000000,  0x0000e800: 0x01000000,  0x0000f800: 0x00040080,
            0x00010000: 0x00040000,  0x00011000: 0x00000080,  0x00012000: 0x20000000,  0x00013000: 0x21000080,
            0x00014000: 0x01000080,  0x00015000: 0x21040000,  0x00016000: 0x20040080,  0x00017000: 0x01000000,
            0x00018000: 0x21040080,  0x00019000: 0x21000000,  0x0001a000: 0x01040000,  0x0001b000: 0x20040000,
            0x0001c000: 0x00040080,  0x0001d000: 0x20000080,  0x0001e000: 0x00000000,  0x0001f000: 0x01040080,
            0x00010800: 0x21000080,  0x00011800: 0x01000000,  0x00012800: 0x01040000,  0x00013800: 0x20040080,
            0x00014800: 0x20000000,  0x00015800: 0x01040080,  0x00016800: 0x00000080,  0x00017800: 0x21040000,
            0x00018800: 0x00040080,  0x00019800: 0x21040080,  0x0001a800: 0x00000000,  0x0001b800: 0x21000000,
            0x0001c800: 0x01000080,  0x0001d800: 0x00040000,  0x0001e800: 0x20040000,  0x0001f800: 0x20000080
        },
        {
            0x00000000: 0x10000008,  0x00000100: 0x00002000,  0x00000200: 0x10200000,  0x00000300: 0x10202008,
            0x00000400: 0x10002000,  0x00000500: 0x00200000,  0x00000600: 0x00200008,  0x00000700: 0x10000000,
            0x00000800: 0x00000000,  0x00000900: 0x10002008,  0x00000a00: 0x00202000,  0x00000b00: 0x00000008,
            0x00000c00: 0x10200008,  0x00000d00: 0x00202008,  0x00000e00: 0x00002008,  0x00000f00: 0x10202000,
            0x00000080: 0x10200000,  0x00000180: 0x10202008,  0x00000280: 0x00000008,  0x00000380: 0x00200000,
            0x00000480: 0x00202008,  0x00000580: 0x10000008,  0x00000680: 0x10002000,  0x00000780: 0x00002008,
            0x00000880: 0x00200008,  0x00000980: 0x00002000,  0x00000a80: 0x10002008,  0x00000b80: 0x10200008,
            0x00000c80: 0x00000000,  0x00000d80: 0x10202000,  0x00000e80: 0x00202000,  0x00000f80: 0x10000000,
            0x00001000: 0x10002000,  0x00001100: 0x10200008,  0x00001200: 0x10202008,  0x00001300: 0x00002008,
            0x00001400: 0x00200000,  0x00001500: 0x10000000,  0x00001600: 0x10000008,  0x00001700: 0x00202000,
            0x00001800: 0x00202008,  0x00001900: 0x00000000,  0x00001a00: 0x00000008,  0x00001b00: 0x10200000,
            0x00001c00: 0x00002000,  0x00001d00: 0x10002008,  0x00001e00: 0x10202000,  0x00001f00: 0x00200008,
            0x00001080: 0x00000008,  0x00001180: 0x00202000,  0x00001280: 0x00200000,  0x00001380: 0x10000008,
            0x00001480: 0x10002000,  0x00001580: 0x00002008,  0x00001680: 0x10202008,  0x00001780: 0x10200000,
            0x00001880: 0x10202000,  0x00001980: 0x10200008,  0x00001a80: 0x00002000,  0x00001b80: 0x00202008,
            0x00001c80: 0x00200008,  0x00001d80: 0x00000000,  0x00001e80: 0x10000000,  0x00001f80: 0x10002008
        },
        {
            0x00000000: 0x00100000,  0x00000010: 0x02000401,  0x00000020: 0x00000400,  0x00000030: 0x00100401,
            0x00000040: 0x02100401,  0x00000050: 0x00000000,  0x00000060: 0x00000001,  0x00000070: 0x02100001,
            0x00000080: 0x02000400,  0x00000090: 0x00100001,  0x000000a0: 0x02000001,  0x000000b0: 0x02100400,
            0x000000c0: 0x02100000,  0x000000d0: 0x00000401,  0x000000e0: 0x00100400,  0x000000f0: 0x02000000,
            0x00000008: 0x02100001,  0x00000018: 0x00000000,  0x00000028: 0x02000401,  0x00000038: 0x02100400,
            0x00000048: 0x00100000,  0x00000058: 0x02000001,  0x00000068: 0x02000000,  0x00000078: 0x00000401,
            0x00000088: 0x00100401,  0x00000098: 0x02000400,  0x000000a8: 0x02100000,  0x000000b8: 0x00100001,
            0x000000c8: 0x00000400,  0x000000d8: 0x02100401,  0x000000e8: 0x00000001,  0x000000f8: 0x00100400,
            0x00000100: 0x02000000,  0x00000110: 0x00100000,  0x00000120: 0x02000401,  0x00000130: 0x02100001,
            0x00000140: 0x00100001,  0x00000150: 0x02000400,  0x00000160: 0x02100400,  0x00000170: 0x00100401,
            0x00000180: 0x00000401,  0x00000190: 0x02100401,  0x000001a0: 0x00100400,  0x000001b0: 0x00000001,
            0x000001c0: 0x00000000,  0x000001d0: 0x02100000,  0x000001e0: 0x02000001,  0x000001f0: 0x00000400,
            0x00000108: 0x00100400,  0x00000118: 0x02000401,  0x00000128: 0x02100001,  0x00000138: 0x00000001,
            0x00000148: 0x02000000,  0x00000158: 0x00100000,  0x00000168: 0x00000401,  0x00000178: 0x02100400,
            0x00000188: 0x02000001,  0x00000198: 0x02100000,  0x000001a8: 0x00000000,  0x000001b8: 0x02100401,
            0x000001c8: 0x00100401,  0x000001d8: 0x00000400,  0x000001e8: 0x02000400,  0x000001f8: 0x00100001
        },
        {
            0x00000000: 0x08000820,  0x00000001: 0x00020000,  0x00000002: 0x08000000,  0x00000003: 0x00000020,
            0x00000004: 0x00020020,  0x00000005: 0x08020820,  0x00000006: 0x08020800,  0x00000007: 0x00000800,
            0x00000008: 0x08020000,  0x00000009: 0x08000800,  0x0000000a: 0x00020800,  0x0000000b: 0x08020020,
            0x0000000c: 0x00000820,  0x0000000d: 0x00000000,  0x0000000e: 0x08000020,  0x0000000f: 0x00020820,
            0x80000000: 0x00000800,  0x80000001: 0x08020820,  0x80000002: 0x08000820,  0x80000003: 0x08000000,
            0x80000004: 0x08020000,  0x80000005: 0x00020800,  0x80000006: 0x00020820,  0x80000007: 0x00000020,
            0x80000008: 0x08000020,  0x80000009: 0x00000820,  0x8000000a: 0x00020020,  0x8000000b: 0x08020800,
            0x8000000c: 0x00000000,  0x8000000d: 0x08020020,  0x8000000e: 0x08000800,  0x8000000f: 0x00020000,
            0x00000010: 0x00020820,  0x00000011: 0x08020800,  0x00000012: 0x00000020,  0x00000013: 0x00000800,
            0x00000014: 0x08000800,  0x00000015: 0x08000020,  0x00000016: 0x08020020,  0x00000017: 0x00020000,
            0x00000018: 0x00000000,  0x00000019: 0x00020020,  0x0000001a: 0x08020000,  0x0000001b: 0x08000820,
            0x0000001c: 0x08020820,  0x0000001d: 0x00020800,  0x0000001e: 0x00000820,  0x0000001f: 0x08000000,
            0x80000010: 0x00020000,  0x80000011: 0x00000800,  0x80000012: 0x08020020,  0x80000013: 0x00020820,
            0x80000014: 0x00000020,  0x80000015: 0x08020000,  0x80000016: 0x08000000,  0x80000017: 0x08000820,
            0x80000018: 0x08020820,  0x80000019: 0x08000020,  0x8000001a: 0x08000800,  0x8000001b: 0x00000000,
            0x8000001c: 0x00020800,  0x8000001d: 0x00000820,  0x8000001e: 0x00020020,  0x8000001f: 0x08020800
        }
    ];

    // SBOX input masks
    var SBOX_MASKS = [
        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
    ];

    /**
     * DES block cipher algorithm.
     */
    var DES = C_algo.DES = BlockCipher.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;

            // Select 56 bits according to PC1
            var keyBits = [];
            for (var i = 0; i < 56; i++) {
                var keyBitPos = PC1[i] - 1;
                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
            }

            // Assemble 16 subkeys
            var subKeys = this._subKeys = [];
            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
                // Create subkey
                var subKey = subKeys[nSubKey] = [];

                // Shortcut
                var bitShift = BIT_SHIFTS[nSubKey];

                // Select 48 bits according to PC2
                for (var i = 0; i < 24; i++) {
                    // Select from the left 28 key bits
                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

                    // Select from the right 28 key bits
                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
                }

                // Since each subkey is applied to an expanded 32-bit input,
                // the subkey can be broken into 8 values scaled to 32-bits,
                // which allows the key to be used without expansion
                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
                for (var i = 1; i < 7; i++) {
                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
                }
                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
            }

            // Compute inverse subkeys
            var invSubKeys = this._invSubKeys = [];
            for (var i = 0; i < 16; i++) {
                invSubKeys[i] = subKeys[15 - i];
            }
        },

        encryptBlock: function (M, offset) {
            doCryptBlock.call(this, M, offset, this._subKeys);
        },

        decryptBlock: function (M, offset) {
            doCryptBlock.call(this, M, offset, this._invSubKeys);
        },

        keySize: 64/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    function doCryptBlock(M, offset, subKeys) {
        /*jshint validthis:true */

        // Get input
        this._lBlock = M[offset];
        this._rBlock = M[offset + 1];

        // Initial permutation
        exchangeLR.call(this,  4, 0x0f0f0f0f);
        exchangeLR.call(this, 16, 0x0000ffff);
        exchangeRL.call(this,  2, 0x33333333);
        exchangeRL.call(this,  8, 0x00ff00ff);
        exchangeLR.call(this,  1, 0x55555555);

        // Rounds
        for (var round = 0; round < 16; round++) {
            // Shortcuts
            var subKey = subKeys[round];
            var lBlock = this._lBlock;
            var rBlock = this._rBlock;

            // Feistel function
            var f = 0;
            for (var i = 0; i < 8; i++) {
                f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASKS[i]) >>> 0];
            }
            this._lBlock = rBlock;
            this._rBlock = lBlock ^ f;
        }

        // Undo swap from last round
        var t = this._lBlock;
        this._lBlock = this._rBlock;
        this._rBlock = t;

        // Final permutation
        exchangeLR.call(this, 1,  0x55555555);
        exchangeRL.call(this, 8,  0x00ff00ff);
        exchangeRL.call(this, 2,  0x33333333);
        exchangeLR.call(this, 16, 0x0000ffff);
        exchangeLR.call(this, 4,  0x0f0f0f0f);

        // Set output
        M[offset]     = this._lBlock;
        M[offset + 1] = this._rBlock;
    }

    // Swap bits across the left and right words
    function exchangeLR(offset, mask) {
        /*jshint validthis:true */

        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
        this._rBlock ^= t;
        this._lBlock ^= t << offset;
    }

    function exchangeRL(offset, mask) {
        /*jshint validthis:true */

        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
        this._lBlock ^= t;
        this._rBlock ^= t << offset;
    }

    /**
     * Shortcut functions to the cipher's object interface.
     *
     * @example
     *
     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
     */
    C.DES = BlockCipher._createHelper(DES);

    /**
     * Abstract base Triple DES block cipher algorithm.
     */
    var TripleDESBase = BlockCipher.extend({

        ivSize: 64/32,

        blockSize: 64/32
    });

    /**
     * Triple DES keying option 1: K1, K2 and K3 are independent keys.
     */
    var TripleDES1 = C_algo.TripleDES1 = TripleDESBase.extend({
        keySize: 192/32
    });

    /**
     * Triple DES keying option 2: K1 and K2 are independent keys, and K3 = K1.
     */
    var TripleDES2 = C_algo.TripleDES2 = TripleDESBase.extend({
        keySize: 128/32
    });

    /**
     * Triple DES keying option 3: K1 = K2 = K3.
     *
     * This cipher is backward compatible with DES.
     */
    var TripleDES3 = C_algo.TripleDES3 = DES;










    /**
     * Abstract base Triple DES block cipher algorithm.
     */
    var TripleDesBase = BlockCipher.extend({
    });

    /**
     * Triple DES keying option 1: K1, K2 and K3 are independent keys.
     */
    var TripleDes1 = C_algo.TripleDes1 = BlockCipher.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;

            // Create DES instances
            this._des1 = DES.createEncryptor(WordArray.create(keyWords.slice(0, 2)));
            this._des2 = DES.createEncryptor(WordArray.create(keyWords.slice(2, 4)));
            this._des3 = DES.createEncryptor(WordArray.create(keyWords.slice(4, 6)));
        },

        encryptBlock: function (M, offset) {
            this._des1.encryptBlock(M, offset);
            this._des2.decryptBlock(M, offset);
            this._des3.encryptBlock(M, offset);
        },

        decryptBlock: function (M, offset) {
            this._des3.decryptBlock(M, offset);
            this._des2.encryptBlock(M, offset);
            this._des1.decryptBlock(M, offset);
        },

        keySize: 192/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    /**
     * Triple DES keying option 2: K1 and K2 are independent keys; K3 = K1.
     */
    var TripleDes2 = C_algo.TripleDes2 = TripleDesBase.extend({
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;

        },

        keySize: 128/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    /**
     * Triple DES keying option 3 is backward compatible with DES.
     */
    var TripleDes3 = C_algo.TripleDes3 = DES;







    /**
     * Triple-DES block cipher algorithm.
     */
    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
        /**
         * @throws TripleDesKeySizeError
         */
        _doReset: function () {
            // Shortcuts
            var key = this._key;
            var keyWords = key.words;
            var keySigBytes = key.sigBytes;

            // Determine keying option
            var k1, k2, k3;
            if (keySigBytes == 64/8) {
                k1 = k2 = k3 = key;
            } else if (keySigBytes == 128/8) {
                k1 = WordArray.create(keyWords.slice(0, 2));
                k2 = WordArray.create(keyWords.slice(2, 4));
                k3 = k1;
            } else if (keySigBytes == 192/8) {
                k1 = WordArray.create(keyWords.slice(0, 2));
                k2 = WordArray.create(keyWords.slice(2, 4));
                k3 = WordArray.create(keyWords.slice(4, 6));
            } else {
                throw C_err.TripleDesKeySizeError;
            }

            // Create DES instances
            this._des1 = DES.createEncryptor(k1);
            this._des2 = DES.createEncryptor(k2);
            this._des3 = DES.createEncryptor(k3);
        },

        keySize: 192/32,

        ivSize: 64/32,

        blockSize: 64/32
    });

    /**
     * Shortcut functions to the cipher's object interface.
     *
     * @example
     *
     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
     */
    C.TripleDES = BlockCipher._createHelper(TripleDES);
}());
