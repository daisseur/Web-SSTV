/*
MIT License

Copyright (c) 2024 Christian Kegel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

//---------- Encoding Constants ----------//

const PREFIX_PULSE_LENGTH = 0.1;  //100 ms
const HEADER_PULSE_LENGTH = 0.3;  //300 ms
const HEADER_BREAK_LENGTH = 0.01; //10 ms
const VIS_BIT_LENGTH = 0.03;      //30 ms
const SYNC_PULSE_FREQ = 1200;
const BLANKING_PULSE_FREQ = 1500;
const COLOR_FREQ_MULT = 3.1372549;
const VIS_BIT_FREQ = {
    ONE: 1100,
    ZERO: 1300,
};

export class Format {
    protected numScanLines: number;
    protected vertResolution: number;
    protected blankingInterval: number;
    protected scanLineLength: number;
    protected syncPulseLength: number;
    protected VISCode: boolean[];
    protected preparedImage: number[][][] = [];

    constructor(
        numScanLines: number,
        vertResolution: number,
        blankingInterval: number,
        scanLineLength: number,
        syncPulseLength: number,
        VISCode: boolean[]
    ) {
        this.numScanLines = numScanLines;
        this.vertResolution = vertResolution;
        this.blankingInterval = blankingInterval;
        this.scanLineLength = scanLineLength;
        this.syncPulseLength = syncPulseLength;
        this.VISCode = VISCode;
    }

    getGreyscaleFreq(data: number[], scanLine: number, vertPos: number): number {
        const index = scanLine * (this.vertResolution * 4) + vertPos * 4;
        const grey = data[index] * 0.299 + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        return grey * COLOR_FREQ_MULT + 1500;
    }

    getRGBValueAsFreq(data: number[], scanLine: number, vertPos: number): [number, number, number] {
        const index = scanLine * (this.vertResolution * 4) + vertPos * 4;
        const red = data[index] * COLOR_FREQ_MULT + 1500;
        const green = data[index + 1] * COLOR_FREQ_MULT + 1500;
        const blue = data[index + 2] * COLOR_FREQ_MULT + 1500;
        return [red, green, blue];
    }

    getYRYBYValueAsFreq(data: number[], scanLine: number, vertPos: number): [number, number, number] {
        const index = scanLine * (this.vertResolution * 4) + vertPos * 4;
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        const Y = 6.0 + (0.003906 * ((65.738 * red) + (129.057 * green) + (25.064 * blue)));
        const RY = 128.0 + (0.003906 * ((112.439 * red) + (-94.154 * green) + (-18.285 * blue)));
        const BY = 128.0 + (0.003906 * ((-37.945 * red) + (-74.494 * green) + (112.439 * blue)));
        return [1500 + Y * COLOR_FREQ_MULT, 1500 + RY * COLOR_FREQ_MULT, 1500 + BY * COLOR_FREQ_MULT];
    }

    encodePrefix(oscillator: OscillatorNode, startTime: number): number {
        let time = startTime;

        oscillator.frequency.setValueAtTime(1900, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(1500, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(1900, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(1500, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(2300, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(1500, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(2300, time);
        time += PREFIX_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(1500, time);
        time += PREFIX_PULSE_LENGTH;

        return time;
    }

	encodePrefixSync(oscillator: OscillatorNode, startTime: number): number {
		let time = startTime;
	
		const frequencies = [1900, 1500, 1900, 1500, 2300, 1500, 2300, 1500];
		for (const freq of frequencies) {
			oscillator.frequency.setValueAtTime(freq, time);
			time += PREFIX_PULSE_LENGTH;
		}
	
		return time;
	}
	
	encodeHeaderSync(oscillator: OscillatorNode, startTime: number): number {
		let time = startTime;
	
		// Définition de l'en-tête initial
		oscillator.frequency.setValueAtTime(1900, time);
		time += HEADER_PULSE_LENGTH;
	
		oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
		time += HEADER_BREAK_LENGTH;
	
		oscillator.frequency.setValueAtTime(1900, time);
		time += HEADER_PULSE_LENGTH;
	
		// Bit de synchronisation VIS
		oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
		time += VIS_BIT_LENGTH;
	
		// Codage VIS en bits et calcul de la parité
		let parity = 0;
		this.VISCode.reverse().forEach((bit) => {
			const bitFreq = bit ? VIS_BIT_FREQ.ONE : VIS_BIT_FREQ.ZERO;
			oscillator.frequency.setValueAtTime(bitFreq, time);
			time += VIS_BIT_LENGTH;
			if (bit) ++parity;
		});
	
		// Bit de parité VIS
		const parityBitFreq = parity % 2 === 0 ? VIS_BIT_FREQ.ZERO : VIS_BIT_FREQ.ONE;
		oscillator.frequency.setValueAtTime(parityBitFreq, time);
		time += VIS_BIT_LENGTH;
	
		// Bit de fin de synchronisation
		oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
		time += VIS_BIT_LENGTH;
	
		return time;
	}
	

    encodeHeader(oscillator: OscillatorNode, startTime: number): number {
        let time = startTime;

        oscillator.frequency.setValueAtTime(1900, time);
        time += HEADER_PULSE_LENGTH;
        oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
        time += HEADER_BREAK_LENGTH;
        oscillator.frequency.setValueAtTime(1900, time);
        time += HEADER_PULSE_LENGTH;

        oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
        time += VIS_BIT_LENGTH;
        
        let parity = 0;
        this.VISCode.reverse().forEach((bit) => {
            const bitFreq = bit ? VIS_BIT_FREQ.ONE : VIS_BIT_FREQ.ZERO;
            oscillator.frequency.setValueAtTime(bitFreq, time);
            time += VIS_BIT_LENGTH;
            if (bit) ++parity;
        });

        const parityBitFreq = parity % 2 === 0 ? VIS_BIT_FREQ.ZERO : VIS_BIT_FREQ.ONE;
        oscillator.frequency.setValueAtTime(parityBitFreq, time);
        time += VIS_BIT_LENGTH;

        oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
        time += VIS_BIT_LENGTH;

        return time;
    }

    prepareImage(data: number[][][]): void {
        this.preparedImage = data;
    }

    encodeSSTV(oscillator: OscillatorNode, startTime: number): void {
        throw new Error("Must be defined by a subclass");
    }

	encodeSSTVDataSync(): Float32Array {
		throw new Error("Must be defined by a subclass");
	}

    getNumScanLines(): number {
        return this.numScanLines;
    }

    getVertResolution(): number {
        return this.vertResolution;
    }

    getBlankingInterval(): number {
        return this.blankingInterval;
    }

    getScanLineLength(): number {
        return this.scanLineLength;
    }

    getSyncPulseLength(): number {
        return this.syncPulseLength;
    }

    getVISCode(): boolean[] {
        return this.VISCode;
    }

    getPreparedImage(): number[][][] {
        return this.preparedImage;
    }

	getDuration(): number {
		return (this.numScanLines * (this.scanLineLength + this.blankingInterval + this.syncPulseLength * 3));
	};
}

export class MartinBase extends Format {
	constructor(
		numScanLines: number,
		vertResolution: number,
		blankingInterval: number,
		scanLineLength: number,
		syncPulseLength: number,
		VISCode: boolean[]
	) {
		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}

	prepareImage(data: Uint8Array | number[][][]): void {
		// Préparation de l'image pour le format Martin
		const preparedImage: number[][][] = [];
		for (let scanLine = 0; scanLine < this.numScanLines; ++scanLine) {
			const red: number[] = [];
			const green: number[] = [];
			const blue: number[] = [];
			for (let vertPos = 0; vertPos < this.vertResolution; ++vertPos) {
				const freqs = this.getRGBValueAsFreq(data as unknown as number[], scanLine, vertPos);
				red.push(freqs[0]);
				green.push(freqs[1]);
				blue.push(freqs[2]);
			}
			preparedImage.push([green, blue, red]);
		}
		super.prepareImage(preparedImage);
	}

	encodeSSTV(oscillator: OscillatorNode, startTime: number): void {
		let time = startTime;
		time = super.encodePrefix(oscillator, time);
		time = super.encodeHeader(oscillator, time);

		for (let scanLine = 0; scanLine < super.getNumScanLines(); ++scanLine) {
			oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
			time += super.getSyncPulseLength();
			oscillator.frequency.setValueAtTime(BLANKING_PULSE_FREQ, time);
			time += super.getBlankingInterval();

			for (let dataLine = 0; dataLine < 3; ++dataLine) {
				oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][dataLine], time, super.getScanLineLength());
				time += super.getScanLineLength();
				oscillator.frequency.setValueAtTime(BLANKING_PULSE_FREQ, time);
				time += super.getBlankingInterval();
			}
		}

		oscillator.start(startTime);
		oscillator.stop(time);
	}
}

export class MartinMOne extends MartinBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.000572;
		const scanLineLength = 0.146432;
		const syncPulseLength = 0.004862;
		const VISCode = [false, true, false, true, true, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class MartinMTwo extends MartinBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.000572;
		const scanLineLength = 0.073216;
		const syncPulseLength = 0.004862;
		const VISCode = [false, true, false, true, false, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

class ScottieBase extends Format {
	constructor(
	  numScanLines: number,
	  vertResolution: number,
	  blankingInterval: number,
	  scanLineLength: number,
	  syncPulseLength: number,
	  VISCode: boolean[]
	) {
	  super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
  
	// Préparation de l'image
	prepareImage(data: Uint8Array | number[][][]): void {
	  const preparedImage: number[][][] = [];
	  for (let scanLine = 0; scanLine < this.numScanLines; ++scanLine) {
		const red: number[] = [];
		const green: number[] = [];
		const blue: number[] = [];
		for (let vertPos = 0; vertPos < this.vertResolution; ++vertPos) {
		  const freqs = this.getRGBValueAsFreq(data as unknown as number[], scanLine, vertPos); // Fonction à implémenter
		  red.push(freqs[0]);
		  green.push(freqs[1]);
		  blue.push(freqs[2]);
		}
		preparedImage.push([green, blue, red]);
	  }
	  super.prepareImage(preparedImage); // Appel de la méthode de la classe parente
	}
  
	// Encodage SSTV
	encodeSSTV(oscillator: OscillatorNode, startTime: number): void {
	  let time = startTime;
	  time = super.encodePrefix(oscillator, time); // Préfixe SSTV
	  time = super.encodeHeader(oscillator, time); // Entête SSTV
  
	  oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
	  time += super.getSyncPulseLength(); // Fréquence d'impulsion de synchronisation
  
	  for (let scanLine = 0; scanLine < super.getNumScanLines(); ++scanLine) {
		for (let dataLine = 0; dataLine < 3; ++dataLine) {
		  if (dataLine == 2) {
			oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
			time += super.getSyncPulseLength();
		  }
		  oscillator.frequency.setValueAtTime(BLANKING_PULSE_FREQ, time);
		  time += super.getBlankingInterval(); // Intervalle de synchronisation
		  oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][dataLine], time, super.getScanLineLength());
		  time += super.getScanLineLength(); // Durée de la ligne de balayage
		}
	  }
  
	  oscillator.start(startTime); // Démarrage de l'oscillateur
	  oscillator.stop(time); // Arrêt de l'oscillateur
	}
  

  encodeSSTVDataSync(sampleRate: number, startTime: number): Float32Array {
    let time = startTime;
    const duration = this.calculateTotalDuration(); // Durée totale nécessaire pour les échantillons
    const totalSamples = Math.floor(duration * sampleRate);
    const audioData = new Float32Array(totalSamples);

    let sampleIndex = 0;

    // Fonction pour ajouter une fréquence dans le tableau audio
    const addFrequency = (frequency: number, length: number) => {
        const samplesForLength = Math.floor(length * sampleRate);
        for (let i = 0; i < samplesForLength; i++) {
            const sampleTime = sampleIndex / sampleRate;
            audioData[sampleIndex] = Math.sin(2 * Math.PI * frequency * sampleTime);
            sampleIndex++;
        }
    };

    // Ajout du préfixe et de l'en-tête SSTV
    time = super.encodePrefixSync(addFrequency, time);
    time = super.encodeHeaderSync(addFrequency, time);

    // Fréquence d'impulsion de synchronisation initiale
    addFrequency(SYNC_PULSE_FREQ, super.getSyncPulseLength());
    time += super.getSyncPulseLength();

    // Balayage des lignes de données
    for (let scanLine = 0; scanLine < super.getNumScanLines(); ++scanLine) {
        for (let dataLine = 0; dataLine < 3; ++dataLine) {
            if (dataLine === 2) {
                addFrequency(SYNC_PULSE_FREQ, super.getSyncPulseLength());
                time += super.getSyncPulseLength();
            }
            addFrequency(BLANKING_PULSE_FREQ, super.getBlankingInterval());
            time += super.getBlankingInterval();

            // Ajout de la ligne de balayage en fonction de l'image préparée
            const frequencyData = super.getPreparedImage()[scanLine][dataLine];
            frequencyData.forEach((frequency, index) => {
                addFrequency(frequency, super.getScanLineLength() / frequencyData.length);
            });
            time += super.getScanLineLength();
        }
    }

    return audioData;
	}
}
  

export class ScottieOne extends ScottieBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.0015;
		const scanLineLength = 0.138240;
		const syncPulseLength = 0.009;
		const VISCode = [false, true, true, true, true, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class ScottieTwo extends ScottieBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.0015;
		const scanLineLength = 0.088064;
		const syncPulseLength = 0.009;
		const VISCode = [false, true, true, true, false, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}
export class ScottieDX extends ScottieBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.0015;
		const scanLineLength = 0.3456;
		const syncPulseLength = 0.009;
		const VISCode = [true, false, false, true, true, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

class PDBase extends Format {
	constructor(
	  numScanLines: number,
	  vertResolution: number,
	  blankingInterval: number,
	  scanLineLength: number,
	  syncPulseLength: number,
	  VISCode: boolean[]
	) {
	  super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
  
	// Préparation de l'image
	prepareImage(data: Uint8Array | number[][][]): void {
	  const preparedImage: number[][][] = [];
	  for (let scanLine = 0; scanLine < this.numScanLines; ++scanLine) {
		const Y: number[] = [];
		const RY: number[] = [];
		const BY: number[] = [];
		for (let vertPos = 0; vertPos < this.vertResolution; ++vertPos) {
		  const freqs = this.getYRYBYValueAsFreq(data as unknown as number[], scanLine, vertPos); // Fonction à implémenter
		  Y.push(freqs[0]);
		  RY.push(freqs[1]);
		  BY.push(freqs[2]);
		}
		preparedImage.push([Y, RY, BY]);
	  }
  
	  // Moyenne des lignes de balayage
	  for (let scanLine = 0; scanLine < this.numScanLines; scanLine += 2) {
		for (let vertPos = 0; vertPos < this.vertResolution; ++vertPos) {
		  const RY = preparedImage[scanLine][1][vertPos] + preparedImage[scanLine + 1][1][vertPos];
		  preparedImage[scanLine][1][vertPos] = RY / 2;
		  const BY = preparedImage[scanLine][2][vertPos] + preparedImage[scanLine + 1][2][vertPos];
		  preparedImage[scanLine][2][vertPos] = BY / 2;
		}
	  }
	  super.prepareImage(preparedImage); // Appel de la méthode de la classe parente
	}
  
	// Encodage SSTV
	encodeSSTV(oscillator: OscillatorNode, startTime: number): void {
	  let time = startTime;
	  time = super.encodePrefix(oscillator, time); // Préfixe SSTV
	  time = super.encodeHeader(oscillator, time); // Entête SSTV
  
	  for (let scanLine = 0; scanLine < this.numScanLines; scanLine += 2) {
		oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
		time += super.getSyncPulseLength();
		oscillator.frequency.setValueAtTime(BLANKING_PULSE_FREQ, time);
		time += super.getBlankingInterval();
  
		// Encodage des lignes de balayage
		oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][0], time, super.getScanLineLength());
		time += super.getScanLineLength();
		oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][1], time, super.getScanLineLength());
		time += super.getScanLineLength();
		oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][2], time, super.getScanLineLength());
		time += super.getScanLineLength();
  
		oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine + 1][0], time, super.getScanLineLength());
		time += super.getScanLineLength();
	  }
  
	  oscillator.start(startTime); // Démarrage de l'oscillateur
	  oscillator.stop(time); // Arrêt de l'oscillateur
	}
  }
  

export class PD50 extends PDBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.091520;
		const syncPulseLength = 0.02;
		const VISCode = [true, false, true, true, true, false, true];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class PD90 extends PDBase {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.170240;
		const syncPulseLength = 0.02;
		const VISCode = [true, true, false, false, false, true, true];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}
export class PD120 extends PDBase {
	constructor() {
		const numScanLines = 496;
		const vertResolution = 640;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.121600;
		const syncPulseLength = 0.02;
		const VISCode = [true, false, true, true, true, true, true];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class PD160 extends PDBase {
	constructor() {
		const numScanLines = 400;
		const vertResolution = 512;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.195584;
		const syncPulseLength = 0.02;
		const VISCode = [true, true, false, false, true, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class PD180 extends PDBase {
	constructor() {
		const numScanLines = 496;
		const vertResolution = 640;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.18304;
		const syncPulseLength = 0.02;
		const VISCode = [true, true, false, false, false, false, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class PD240 extends PDBase {
	constructor() {
		const numScanLines = 496;
		const vertResolution = 640;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.24448;
		const syncPulseLength = 0.02;
		const VISCode = [true, true, false, false, false, false, true];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export class PD290 extends PDBase {
	constructor() {
		const numScanLines = 616;
		const vertResolution = 800;
		const blankingInterval = 0.00208;
		const scanLineLength = 0.2288;
		const syncPulseLength = 0.02;
		const VISCode = [true, false, true, true, true, true, false];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

class WrasseSC2 extends Format {
	constructor(
	  numScanLines: number,
	  vertResolution: number,
	  blankingInterval: number,
	  scanLineLength: number,
	  syncPulseLength: number,
	  VISCode: boolean[]
	) {
	  super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
  
	// Préparation de l'image
	prepareImage(data: Uint8Array | number[][][]): void {
	  const preparedImage: number[][][] = [];
	  for (let scanLine = 0; scanLine < this.numScanLines; ++scanLine) {
		const red: number[] = [];
		const green: number[] = [];
		const blue: number[] = [];
		for (let vertPos = 0; vertPos < this.vertResolution; ++vertPos) {
		  const freqs = this.getRGBValueAsFreq(data as unknown as number[], scanLine, vertPos); // Fonction à implémenter
		  red.push(freqs[0]);
		  green.push(freqs[1]);
		  blue.push(freqs[2]);
		}
		preparedImage.push([red, green, blue]);
	  }
	  super.prepareImage(preparedImage); // Appel de la méthode de la classe parente
	}
  
	// Encodage SSTV
	encodeSSTV(oscillator: OscillatorNode, startTime: number): void {
	  let time = startTime;
	  time = super.encodePrefix(oscillator, time); // Préfixe SSTV
	  time = super.encodeHeader(oscillator, time); // Entête SSTV
  
	  for (let scanLine = 0; scanLine < this.numScanLines; ++scanLine) {
		oscillator.frequency.setValueAtTime(SYNC_PULSE_FREQ, time);
		time += super.getSyncPulseLength();
		oscillator.frequency.setValueAtTime(BLANKING_PULSE_FREQ, time);
		time += super.getBlankingInterval();
  
		for (let dataLine = 0; dataLine < 3; ++dataLine) {
		  oscillator.frequency.setValueCurveAtTime(super.getPreparedImage()[scanLine][dataLine], time, super.getScanLineLength());
		  time += super.getScanLineLength();
		}
	  }
  
	  oscillator.start(startTime); // Démarrage de l'oscillateur
	  oscillator.stop(time); // Arrêt de l'oscillateur
	}

	encodeSSTVDataSync() {
		const sampleRate = 44100; // Sample rate in Hz (use a standard rate)
		let time = 0;
		const audioData: number[] = [];

		// Fonction pour ajouter une fréquence pour une durée donnée
		const addFrequency = (frequency: number, duration: number) => {
			const numSamples = Math.floor(sampleRate * duration);
			for (let i = 0; i < numSamples; i++) {
				const sample = Math.sin(2 * Math.PI * frequency * (time / sampleRate));
				audioData.push(sample);
				time++;
			}
		};

		// Encodage des préfixes et de l'en-tête
		time = super.encodePrefixSync(addFrequency, time);
		time = super.encodeHeaderSync(addFrequency, time);

		// Encodage des lignes de balayage
		for (let scanLine = 0; scanLine < super.getNumScanLines(); ++scanLine) {
			addFrequency(SYNC_PULSE_FREQ, super.getSyncPulseLength());
			addFrequency(BLANKING_PULSE_FREQ, super.getBlankingInterval());

			for (let dataLine = 0; dataLine < 3; ++dataLine) {
				const imageLine = super.getPreparedImage()[scanLine][dataLine];
				const scanLineLength = super.getScanLineLength();

				// Ajout des données de l'image pour chaque ligne
				for (let j = 0; j < imageLine.length; j++) {
					const frequency = imageLine[j];
					addFrequency(frequency, scanLineLength / imageLine.length);
				}

				// Blanking interval après chaque ligne de données
				addFrequency(BLANKING_PULSE_FREQ, super.getBlankingInterval());
			}
		}

		// Conversion en Float32Array pour retour
		return new Float32Array(audioData);
	}
}

export class WrasseSC2180 extends WrasseSC2 {
	constructor() {
		const numScanLines = 256;
		const vertResolution = 320;
		const blankingInterval = 0.0005;
		const scanLineLength = 0.235;
		const syncPulseLength = 0.0055225;
		const VISCode = [false, true, true, false, true, true, true];

		super(numScanLines, vertResolution, blankingInterval, scanLineLength, syncPulseLength, VISCode);
	}
}

export function bufferToWave(abuffer: AudioBuffer, len: number) {
    const numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [];

	let i: number,
		sample: number,
		offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample * 0.5) * 0xffff; // scale to 16-bit unsigned
            sample = Math.floor(sample);
            view.setUint16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    return buffer;

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}
function encodeSSTVDataSync() {
	throw new Error("Function not implemented.");
}

