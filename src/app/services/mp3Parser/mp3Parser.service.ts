import { Injectable } from '@angular/core';

@Injectable()
export class Mp3ParserService {
    getId3V2Offset(ab: ArrayBuffer) {
        const fullDataView = new DataView(ab);
        const ID3V2_HEADER = 10;

        return (
            ID3V2_HEADER + this.unsynchsafe(fullDataView.getUint32(6, false))
        );
    }

    getFrameHeader(ab: ArrayBuffer) {
        const VERSIONS: Record<string, string> = {
            0: 'MPEG Version 2',
            1: 'MPEG Version 1'
        };
        const LAYERS: Record<string, string> = {
            '00': 'reserved',
            '01': 'Layer III',
            10: 'Layer II',
            11: 'Layer 1'
        };
        const ERROR_PROTECTIONS: Record<string, string> = {
            1: 'No',
            0: 'Yes'
        };
        const BITRATES: Record<
            string,
            Record<string, Record<string, number>>
        > = {
            'MPEG Version 1': {
                'Layer III': {
                    '0001': 32,
                    '0010': 40,
                    '0011': 48,
                    '0100': 56,
                    '0101': 64,
                    '0110': 80,
                    '0111': 96,
                    1000: 112,
                    1001: 128,
                    1010: 160,
                    1011: 192,
                    1100: 224,
                    1101: 256,
                    1110: 320
                }
            }
        };
        const FREQUENCIES: Record<string, Record<string, number | string>> = {
            'MPEG Version 1': {
                '00': 44.1,
                '01': 48,
                10: 32,
                11: 'reserved'
            }
        };
        const SAMPLES_PER_FRAME: Record<string, Record<string, number>> = {
            'MPEG Version 1': {
                'Layer III': 1152
            }
        };
        const dataView = new DataView(ab);
        const byte1Binary = this.byteToBinary(dataView.getUint8(1));
        const byte2Binary = this.byteToBinary(dataView.getUint8(2));
        const version = VERSIONS[byte1Binary.charAt(4)];
        const layer = LAYERS[byte1Binary.substring(5, 7)];

        return {
            version,
            layer,
            errorProtection: ERROR_PROTECTIONS[byte1Binary.charAt(7)],
            bitrate: BITRATES[version][layer][byte2Binary.substring(0, 4)],
            frequency: FREQUENCIES[version][byte2Binary.substring(4, 6)],
            padding: +byte2Binary.charAt(6),
            samplesPerFrame: SAMPLES_PER_FRAME[version][layer]
        };
    }

    getFrameSize(
        samplesPerFrame: number,
        bitrate: number,
        frequency: number,
        padding: number
    ) {
        return Math.floor(
            ((samplesPerFrame / 8) * bitrate) / frequency + padding
        );
    }

    getBytesPerSecond(kilobitRate: number) {
        const BYTES_PER_KILOBITS = 125;

        return kilobitRate * BYTES_PER_KILOBITS;
    }

    private unsynchsafe(input: number) {
        let out = 0;
        let mask = 0x7f000000;

        while (mask) {
            out >>= 1;
            out |= input & mask;
            mask >>= 8;
        }

        return out;
    }

    private byteToBinary(int: number) {
        return int.toString(2).padStart(8, '0');
    }
}