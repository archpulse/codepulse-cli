export interface DeadExport {
	file: string;
	name: string;
}

export interface Hotspot {
	file: string;
	score: number;
	complexity: number;
	churn: number;
}

export interface TemporalCoupling {
	fileA: string;
	fileB: string;
	coChanges: number;
	totalA: number;
	totalB: number;
	couplingDegree: number;
}
