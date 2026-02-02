import {
	makeCancelSignal,
	renderMedia,
	selectComposition,
} from "@remotion/renderer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import GofileUploader from "./storage/gofile";
import fs from 'fs/promises'
import { uploadHexToR2 } from "./storage/s3";

export enum TrackType {
	Audio = "audio",
	Video = "video",
	Image = "image",
	Text = "text",
}

export interface TrackItem {
	id: string;
	trackId: number; // Row index
	type: TrackType;
	name: string;
	startFrame: number;
	durationInFrames: number;
	src?: string; // For images/video/audio
	color?: string;
	properties?: Record<string, any>;
}

export interface JobData {
	tracks: TrackItem[];
	durationInFrames: number;
	fps: number
	width: number
	height: number
}

type JobState =
	| {
		status: "queued";
		data: JobData;
		cancel: () => void;
	}
	| {
		status: "in-progress";
		progress: number;
		data: JobData;
		cancel: () => void;
	}
	| {
		status: "completed";
		videoUrl: string;
		data: JobData;
	}
	| {
		status: "failed";
		error: Error;
		data: JobData;
	};

const compositionId = "RenderComposition";

function convertUrl(url: string) {
	try {
		const match = url.match(/^https?:\/\/(?:www\.)?gofile\.io\/d\/([a-zA-Z0-9]+)/)
		return `https://gf.1drv.eu.org/${match![1]}`
	} catch (error) {
		return url
	}
}

export const makeRenderQueue = ({
	port,
	serveUrl,
	rendersDir,
}: {
	port: number;
	serveUrl: string;
	rendersDir: string;
}) => {
	const jobs = new Map<string, JobState>();
	let queue: Promise<unknown> = Promise.resolve();

	const processRender = async (jobId: string) => {
		const job = jobs.get(jobId);
		if (!job) {
			throw new Error(`Render job ${jobId} not found`);
		}

		const { cancel, cancelSignal } = makeCancelSignal();

		jobs.set(jobId, {
			progress: 0,
			status: "in-progress",
			cancel: cancel,
			data: job.data,
		});

		try {
			const inputProps = {
				tracks: job.data.tracks,
				durationInFrames: job.data.durationInFrames,
				fps: job.data.fps,
				width: job.data.width,
				height: job.data.height,
			};

			const composition = await selectComposition({
				serveUrl,
				id: compositionId,
				inputProps,
			});

			const renderResult = await renderMedia({
				cancelSignal,
				serveUrl,
				composition,
				inputProps,
				codec: "h264",
				onProgress: (progress) => {
					console.info(`${jobId} render progress:`, progress.progress);
					jobs.set(jobId, {
						progress: progress.progress,
						status: "in-progress",
						cancel: cancel,
						data: job.data,
					});
				},
				outputLocation: path.join(rendersDir, `${jobId}.mp4`),
			});

			try {
				console.log("Uploading to Gofile")
				const result = await GofileUploader.uploadFromPath(`./renders/${jobId}.mp4`);
				if(result.downloadPage)
				jobs.set(jobId, {
					status: "completed",
					videoUrl: convertUrl(result.downloadPage!),
					data: job.data,
				}); else {
					throw new Error("Upload failed to Gofile")
				}
			} catch (error) {
				console.log("Error uploading to Gofile")
				console.log("Start uploading to S3")
				const url = await uploadHexToR2({
					bucket: 'key4u',
					contentType: 'video/mp4',
					key: `${jobId}.mp4`,
					hex: Buffer.from(await fs.readFile(`./renders/${jobId}.mp4`)).toString('hex'),
				})
				console.log("Url: ": url)
				jobs.set(jobId, {
					status: "completed",
					videoUrl: url!,
					data: job.data,
				});
			}

			// remove the file
			await fs.unlink(`./renders/${jobId}.mp4`)

		} catch (error) {
			console.error(error);
			jobs.set(jobId, {
				status: "failed",
				error: error as Error,
				data: job.data,
			});
		}
	};

	const queueRender = async ({
		jobId,
		data,
	}: {
		jobId: string;
		data: JobData;
	}) => {
		jobs.set(jobId, {
			status: "queued",
			data,
			cancel: () => {
				jobs.delete(jobId);
			},
		});

		queue = queue.then(() => processRender(jobId));
	};

	function createJob(data: JobData) {
		const jobId = randomUUID();

		queueRender({ jobId, data });

		return jobId;
	}

	return {
		createJob,
		jobs,
	};
};
