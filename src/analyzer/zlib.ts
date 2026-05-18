import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";

export async function compressString(input: string): Promise<Buffer> {
	const chunks: Buffer[] = [];
	const gzip = createGzip({ level: 6 });
	const source = Readable.from([Buffer.from(input, "utf-8")]);
	const sink = new Writable({
		write(chunk, _encoding, callback) {
			chunks.push(chunk);
			callback();
		},
	});
	await pipeline(source, gzip, sink);
	return Buffer.concat(chunks);
}

export async function decompressBuffer(input: Buffer): Promise<string> {
	const chunks: Buffer[] = [];
	const gunzip = createGunzip();
	const source = Readable.from([input]);
	const sink = new Writable({
		write(chunk, _encoding, callback) {
			chunks.push(chunk);
			callback();
		},
	});
	await pipeline(source, gunzip, sink);
	return Buffer.concat(chunks).toString("utf-8");
}
